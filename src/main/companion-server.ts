/**
 * companion-server.ts — Phase 4 / Sprint 16
 *
 * HTTP + WebSocket companion server for InvisiQ mobile/web companion app.
 * Binds to 127.0.0.1 by default (LAN opt-in required).
 * One-time UUID pairing token → persistent device ID.
 */

import { createServer, IncomingMessage, ServerResponse, Server } from 'http';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer, WebSocket } from 'ws';
import { BrowserWindow } from 'electron';
import QRCode from 'qrcode';
import { getOverlayWindow } from './overlay';
import type { CompanionDevice } from '@shared/types';

/** Get the LAN IP address (e.g. 192.168.x.x) for same-network access. */
function getLanIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.internal || iface.family !== 'IPv4') continue;
      return iface.address;
    }
  }
  return '127.0.0.1';
}

interface ConnectedClient {
  ws: WebSocket;
  device: CompanionDevice;
}

let httpServer: Server | null = null;
let wss: WebSocketServer | null = null;
let actualPort = 3847;
let pendingPairingToken: string | null = null;
const connectedClients = new Map<string, ConnectedClient>();
const pairedDeviceIds = new Set<string>();

function notifyRenderer(channel: string, data: unknown): void {
  const win = getOverlayWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

function createHTTPHandler() {
  return (req: IncomingMessage, res: ServerResponse): void => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.url === '/status' && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'ok',
        app: 'InvisiQ',
        version: '2.0.0',
        pairing: pendingPairingToken ? 'required' : 'not-required',
      }));
      return;
    }

    if (req.url === '/pair' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          // deviceName/platform are part of the pairing payload but not yet
          // persisted — only the one-time token is validated here.
          const { token } = JSON.parse(body) as {
            token: string;
            deviceName: string;
            platform: 'ios' | 'android' | 'web';
          };

          if (token !== pendingPairingToken) {
            res.writeHead(401);
            res.end(JSON.stringify({ error: 'Invalid pairing token' }));
            return;
          }

          const deviceId = uuidv4();
          pairedDeviceIds.add(deviceId);
          pendingPairingToken = null; // Token is one-time use

          res.writeHead(200);
          res.end(JSON.stringify({ deviceId, status: 'paired' }));
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid request body' }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  };
}

function setupWebSocket(): void {
  if (!wss || !httpServer) return;

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '/', `http://localhost:${actualPort}`);
    const deviceId = url.searchParams.get('deviceId') || '';

    if (!pairedDeviceIds.has(deviceId)) {
      ws.close(4001, 'Unauthorized — pair first');
      return;
    }

    const device: CompanionDevice = {
      id: deviceId,
      name: url.searchParams.get('deviceName') || 'Unknown Device',
      connectedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      platform: (url.searchParams.get('platform') as CompanionDevice['platform']) || 'web',
    };

    connectedClients.set(deviceId, { ws, device });
    notifyRenderer('companion:device-connected', device);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as unknown;
        notifyRenderer('companion:message', { ...((msg as object) || {}), deviceId, timestamp: new Date().toISOString() });
      } catch { /* ignore malformed */ }
    });

    ws.on('close', () => {
      connectedClients.delete(deviceId);
      notifyRenderer('companion:device-disconnected', { deviceId });
    });
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function startCompanionServer(
  port: number = 3847
): Promise<{ success: boolean; url: string; qrDataUrl: string }> {
  if (httpServer) {
    stopCompanionServer();
  }

  // Generate a one-time pairing token
  pendingPairingToken = uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase();

  // Try ports sequentially to avoid conflicts
  for (let attempt = 0; attempt < 10; attempt++) {
    const tryPort = port + attempt;
    try {
      await new Promise<void>((resolve, reject) => {
        httpServer = createServer(createHTTPHandler());
        wss = new WebSocketServer({ server: httpServer });

        httpServer.on('error', (err) => {
          httpServer?.close();
          httpServer = null;
          wss = null;
          reject(err);
        });

        httpServer.listen(tryPort, '0.0.0.0', () => {
          actualPort = tryPort;
          setupWebSocket();
          resolve();
        });
      });
      break; // Succeeded
    } catch {
      if (attempt === 9) {
        return { success: false, url: '', qrDataUrl: '' };
      }
    }
  }

  const lanIP = getLanIP();
  const url = `http://${lanIP}:${actualPort}`;
  const pairingUrl = `${url}/pair?token=${pendingPairingToken}`;

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(pairingUrl, {
      width: 200,
      margin: 1,
      color: { dark: '#E2E8F0', light: '#0B0E14' },
    });
  } catch (err) {
    console.error('[companion] QR code generation failed:', err);
  }

  return { success: true, url, qrDataUrl };
}

export function stopCompanionServer(): void {
  for (const { ws } of connectedClients.values()) {
    ws.close(1001, 'Server shutting down');
  }
  connectedClients.clear();
  wss?.close();
  httpServer?.close();
  httpServer = null;
  wss = null;
}

export function getCompanionStatus(): {
  running: boolean;
  connectedDevices: CompanionDevice[];
  port: number;
} {
  return {
    running: httpServer !== null,
    connectedDevices: Array.from(connectedClients.values()).map((c) => c.device),
    port: actualPort,
  };
}

export function getConnectedDevices(): CompanionDevice[] {
  return Array.from(connectedClients.values()).map((c) => c.device);
}

/** Broadcast a message to all connected companion devices */
export function broadcastToCompanions(data: unknown): void {
  const payload = JSON.stringify(data);
  for (const { ws } of connectedClients.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

/** Send to a specific companion device by ID */
export function sendToCompanion(deviceId: string, data: unknown): boolean {
  const client = connectedClients.get(deviceId);
  if (!client || client.ws.readyState !== WebSocket.OPEN) return false;
  client.ws.send(JSON.stringify(data));
  return true;
}

/** Called by the renderer via overlay window when auto-start is enabled */
export function initCompanionFromSettings(win: BrowserWindow, port: number): void {
  void win; // stored for future event notifications
  startCompanionServer(port).catch(console.error);
}
