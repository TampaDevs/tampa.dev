/**
 * UserNotificationDO — Per-User WebSocket Relay
 *
 * Each user gets their own Durable Object instance (keyed by userId).
 * Uses the Hibernation API for cost efficiency — the DO hibernates when
 * no messages are being sent and wakes on alarm or incoming request.
 *
 * Stateless relay: no DO storage reads/writes, only in-memory WebSocket refs.
 */

import type { WSMessage } from '../lib/ws-types.js';

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
   */
  private handleWebSocketUpgrade(request: Request): Response {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept using Hibernation API — DO can sleep between messages
    this.ctx.acceptWebSocket(server);

    // Schedule ping alarm if not already set
    this.schedulePingAlarm();

    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Receive a notification payload from the queue handler and broadcast
   * to all connected WebSockets for this user.
   */
  private async handleNotify(request: Request): Promise<Response> {
    const message = await request.json() as WSMessage;
    const payload = JSON.stringify(message);

    const sockets = this.ctx.getWebSockets();
    for (const ws of sockets) {
      try {
        ws.send(payload);
      } catch {
        // Socket closed/errored — close it so getWebSockets() stops returning it
        try { ws.close(1011, 'Send failed'); } catch { /* already closed */ }
      }
    }

    return new Response('OK', { status: 200 });
  }

  /**
   * Hibernation API callback — called when a connected client sends a message.
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
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

    // Reschedule for 30 seconds from now
    this.schedulePingAlarm();
  }

  private schedulePingAlarm(): void {
    this.ctx.storage.setAlarm(Date.now() + 30_000).catch(() => {});
  }
}
