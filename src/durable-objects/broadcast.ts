/**
 * BroadcastDO — Singleton Public Event Relay
 *
 * Single global instance (keyed by "global") that broadcasts public events
 * to ALL connected WebSocket clients. No auth required — payloads contain
 * only public data (group slugs, aggregate counts).
 *
 * Uses the Hibernation API for cost efficiency.
 * Stateless relay: no DO storage reads/writes.
 */

import type { WSMessage } from '../lib/ws-types.js';

export class BroadcastDO implements DurableObject {
  private ctx: DurableObjectState;

  constructor(ctx: DurableObjectState, _env: unknown) {
    this.ctx = ctx;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/websocket') {
      return this.handleWebSocketUpgrade(request);
    }

    if (url.pathname === '/broadcast' && request.method === 'POST') {
      return this.handleBroadcast(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * Accept WebSocket upgrade — no auth required for broadcast.
   */
  private handleWebSocketUpgrade(request: Request): Response {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);
    this.schedulePingAlarm();

    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Receive a broadcast payload from the notification handler and send
   * to ALL connected WebSocket clients.
   */
  private async handleBroadcast(request: Request): Promise<Response> {
    const message = await request.json() as WSMessage;
    const payload = JSON.stringify(message);

    const sockets = this.ctx.getWebSockets();
    for (const ws of sockets) {
      try {
        ws.send(payload);
      } catch {
        try { ws.close(1011, 'Send failed'); } catch { /* already closed */ }
      }
    }

    return new Response('OK', { status: 200 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message === 'string') {
      try {
        const parsed = JSON.parse(message);
        if (parsed.type === 'pong') return;
      } catch { /* ignore */ }
    }
  }

  async webSocketClose(): Promise<void> {
    // Auto-removed from getWebSockets()
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    try { ws.close(1011, 'WebSocket error'); } catch { /* already closed */ }
  }

  async alarm(): Promise<void> {
    const sockets = this.ctx.getWebSockets();
    if (sockets.length === 0) return;

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

    this.schedulePingAlarm();
  }

  private schedulePingAlarm(): void {
    this.ctx.storage.setAlarm(Date.now() + 30_000).catch(() => {});
  }
}
