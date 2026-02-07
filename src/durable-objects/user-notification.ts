/**
 * UserNotificationDO — Per-User WebSocket Relay
 *
 * Each user gets their own Durable Object instance (keyed by userId).
 * Uses the Hibernation API for cost efficiency — the DO hibernates when
 * no messages are being sent and wakes on alarm or incoming request.
 *
 * Features:
 * - Per-user WebSocket connections tagged with userId for validation
 * - Message buffering for delivery during brief disconnections
 * - 15-second ping interval for faster dead connection detection
 */

import type { WSMessage } from '../lib/ws-types.js';

const PING_INTERVAL_MS = 15_000; // 15 seconds
const MAX_BUFFERED_MESSAGES = 20;
const BUFFER_KEY = 'pendingMessages';

export class UserNotificationDO implements DurableObject {
  private ctx: DurableObjectState;

  constructor(ctx: DurableObjectState, _env: unknown) {
    this.ctx = ctx;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/websocket') {
      return this.handleWebSocketUpgrade(request);
    }

    if (url.pathname === '/notify' && request.method === 'POST') {
      return this.handleNotify(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * Accept WebSocket upgrade and schedule keep-alive ping.
   * Tags the WebSocket with the userId from the X-User-Id header for validation.
   */
  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // Extract userId from header set by the route handler
    // This header is required — its absence indicates a programming error
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      console.error('[UserNotificationDO] Missing X-User-Id header — rejecting upgrade');
      return new Response('Missing X-User-Id header', { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept using Hibernation API with userId tag for validation
    this.ctx.acceptWebSocket(server, [userId]);

    // Schedule ping alarm if not already set
    this.schedulePingAlarm();

    // Deliver any buffered messages to the new connection
    await this.flushBufferedMessages(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Receive a notification payload from the queue handler and broadcast
   * to all connected WebSockets for this user.
   * Buffers messages if no clients are connected.
   */
  private async handleNotify(request: Request): Promise<Response> {
    const message = await request.json() as WSMessage;
    const payload = JSON.stringify(message);

    const sockets = this.ctx.getWebSockets();

    // No connected clients — buffer for redelivery when they reconnect
    if (sockets.length === 0) {
      await this.bufferMessage(payload);
      return new Response('Buffered', { status: 202 });
    }

    let delivered = 0;
    for (const ws of sockets) {
      try {
        ws.send(payload);
        delivered++;
      } catch {
        // Socket closed/errored — close it so getWebSockets() stops returning it
        try { ws.close(1011, 'Send failed'); } catch { /* already closed */ }
      }
    }

    // If all sends failed, buffer the message for when client reconnects
    if (delivered === 0) {
      await this.bufferMessage(payload);
      return new Response('Buffered', { status: 202 });
    }

    return new Response('OK', { status: 200 });
  }

  /**
   * Buffer a message for later delivery.
   * Keeps at most MAX_BUFFERED_MESSAGES to prevent memory bloat.
   */
  private async bufferMessage(payload: string): Promise<void> {
    const buffered = (await this.ctx.storage.get<string[]>(BUFFER_KEY)) ?? [];
    buffered.push(payload);

    // Trim to max size (FIFO — oldest messages dropped first)
    while (buffered.length > MAX_BUFFERED_MESSAGES) {
      buffered.shift();
    }

    await this.ctx.storage.put(BUFFER_KEY, buffered);
  }

  /**
   * Flush buffered messages to a newly connected WebSocket.
   */
  private async flushBufferedMessages(ws: WebSocket): Promise<void> {
    const buffered = (await this.ctx.storage.get<string[]>(BUFFER_KEY)) ?? [];
    if (buffered.length === 0) return;

    for (const msg of buffered) {
      try {
        ws.send(msg);
      } catch {
        // Connection failed immediately — leave messages buffered for next attempt
        return;
      }
    }

    // Successfully delivered all buffered messages
    await this.ctx.storage.delete(BUFFER_KEY);
  }

  /**
   * Hibernation API callback — called when a connected client sends a message.
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // Defense-in-depth: validate that the WebSocket's userId tag is present.
    // Each user gets their own DO instance, so a missing tag indicates a
    // programming error (WebSocket accepted without userId tagging).
    const tags = this.ctx.getTags(ws);
    if (tags.length === 0) {
      console.error('[UserNotificationDO] WebSocket missing userId tag — closing');
      ws.close(1008, 'Unauthorized');
      return;
    }

    // Only expect 'pong' from clients — ignore everything else
    if (typeof message === 'string') {
      try {
        const parsed = JSON.parse(message);
        if (parsed.type === 'pong') return;
      } catch { /* ignore malformed */ }
    }
  }

  /**
   * Hibernation API callback — called when a client disconnects.
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    // WebSocket is auto-removed from getWebSockets() — nothing to do
  }

  /**
   * Hibernation API callback — called on WebSocket error.
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    try { ws.close(1011, 'WebSocket error'); } catch { /* already closed */ }
  }

  /**
   * Alarm handler — sends ping to all connected WebSockets.
   * Reschedules itself while connections exist.
   */
  async alarm(): Promise<void> {
    const sockets = this.ctx.getWebSockets();
    if (sockets.length === 0) return; // No connections — don't reschedule

    const ping: WSMessage<'ping'> = {
      type: 'ping',
      data: {},
      timestamp: new Date().toISOString(),
    };
    const payload = JSON.stringify(ping);

    for (const ws of sockets) {
      try {
        ws.send(payload);
      } catch {
        try { ws.close(1011, 'Ping failed'); } catch { /* already closed */ }
      }
    }

    // Reschedule for 15 seconds from now
    this.schedulePingAlarm();
  }

  private schedulePingAlarm(): void {
    this.ctx.storage.setAlarm(Date.now() + PING_INTERVAL_MS).catch(() => {});
  }
}
