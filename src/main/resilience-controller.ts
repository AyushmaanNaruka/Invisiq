/**
 * resilience-controller.ts — Phase 5 Resilience Mode
 *
 * Manages the lifecycle of the ghostai_helper.exe C++ process
 * and communicates with it via a Windows named pipe (\\.\pipe\InvisiQ).
 *
 * Architecture:
 * - ghostai_helper.exe is the named pipe SERVER (creates the pipe)
 * - This module is the named pipe CLIENT (connects after spawning the helper)
 * - Communication: newline-delimited JSON over the pipe
 */

import { spawn, ChildProcess } from 'child_process';
import { Socket } from 'net';
import { accessSync } from 'fs';
import path from 'path';
import { app } from 'electron';
import { getOverlayWindow } from './overlay';
import { logger } from '@shared/logger';
import type { ResilienceAgentState, ResilienceStatus, ResilienceCommand, ResilienceResponse } from '@shared/types';

// ══════════════════════════════════════
//  MODULE STATE
// ══════════════════════════════════════

let helperProcess: ChildProcess | null = null;
let pipeClient: Socket | null = null;
let agentState: ResilienceAgentState = 'stopped';
let lastError: string | null = null;
let startedAt = 0;
let incomingBuffer = '';

const MAX_PIPE_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 300;

// Response listeners — the capture-controller subscribes here to consume
// key/proctor/capture_failed/pong/ready messages from the helper. The renderer
// still receives the raw stream via 'resilience:agent-response' for diagnostics.
type ResponseListener = (response: ResilienceResponse) => void;
const responseListeners: ResponseListener[] = [];

export function onHelperResponse(listener: ResponseListener): () => void {
  responseListeners.push(listener);
  return () => {
    const i = responseListeners.indexOf(listener);
    if (i !== -1) responseListeners.splice(i, 1);
  };
}

/** True when the helper process is running and the pipe is connected. */
export function isHelperConnected(): boolean {
  return pipeClient !== null && !pipeClient.destroyed && agentState === 'running';
}

// ══════════════════════════════════════
//  INTERNAL HELPERS
// ══════════════════════════════════════

function notifyRenderer(channel: string, data: unknown): void {
  const win = getOverlayWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

function emitStatusChange(): void {
  notifyRenderer('resilience:agent-status-changed', getStatus());
}

function resolveHelperPath(customPath: string): string {
  if (customPath.length > 0) {
    return customPath;
  }
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'ghostai_helper.exe');
  }
  // Dev mode: check both MinGW (build/) and MSVC (build/Release/) output paths
  const baseBuildDir = path.join(app.getAppPath(), 'native', 'ghostai-helper', 'build');
  const mingwPath = path.join(baseBuildDir, 'ghostai_helper.exe');
  const msvcPath = path.join(baseBuildDir, 'Release', 'ghostai_helper.exe');
  try {
    accessSync(mingwPath);
    return mingwPath;
  } catch {
    return msvcPath;
  }
}

function connectToPipe(pipeName: string, attempt = 0): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const pipePath = `\\\\.\\pipe\\${pipeName}`;
    const client = new Socket();

    client.connect(pipePath, () => {
      logger.log(`[resilience] Connected to pipe ${pipePath}`);
      resolve(client);
    });

    client.on('error', (err) => {
      client.destroy();
      if (attempt < MAX_PIPE_RETRIES) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        logger.log(
          `[resilience] Pipe connect attempt ${attempt + 1} failed, retrying in ${delay}ms`,
        );
        setTimeout(() => {
          connectToPipe(pipeName, attempt + 1)
            .then(resolve)
            .catch(reject);
        }, delay);
      } else {
        reject(
          new Error(
            `Failed to connect to pipe after ${MAX_PIPE_RETRIES} attempts: ${err.message}`,
          ),
        );
      }
    });
  });
}

function handlePipeData(data: Buffer): void {
  incomingBuffer += data.toString('utf-8');

  let newlineIndex: number;
  while ((newlineIndex = incomingBuffer.indexOf('\n')) !== -1) {
    const line = incomingBuffer.slice(0, newlineIndex).trim();
    incomingBuffer = incomingBuffer.slice(newlineIndex + 1);

    if (line.length === 0) continue;

    try {
      const response: ResilienceResponse = JSON.parse(line);
      // Don't log 'key' responses — they would put captured characters in logs.
      if (response.type !== 'key') {
        logger.log('[resilience] Received:', response.type);
      }
      // Fan out to capture-controller listeners first (hot path: key events).
      for (const listener of responseListeners) {
        try {
          listener(response);
        } catch (err) {
          logger.warn('[resilience] response listener threw:', err);
        }
      }
      // Diagnostics stream to renderer (skip 'key' — high volume + sensitive).
      if (response.type !== 'key') {
        notifyRenderer('resilience:agent-response', response);
      }
    } catch {
      logger.warn('[resilience] Failed to parse pipe message:', line);
    }
  }
}

// ══════════════════════════════════════
//  PUBLIC API
// ══════════════════════════════════════

export async function startAgent(
  helperPath = '',
  pipeName = 'InvisiQ',
): Promise<{ success: boolean; error?: string }> {
  if (agentState !== 'stopped') {
    await stopAgent();
  }

  agentState = 'starting';
  lastError = null;
  emitStatusChange();

  const resolvedPath = resolveHelperPath(helperPath);

  try {
    // 1. Spawn the helper process. argv[2] = parent PID so the helper's watchdog
    //    can self-terminate (removing the LL hook) if this process dies — never
    //    leaving an orphaned hook that would freeze the user's keyboard.
    helperProcess = spawn(resolvedPath, [pipeName, String(process.pid)], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      detached: false,
    });

    helperProcess.stdout?.on('data', (chunk: Buffer) => {
      logger.log('[resilience] helper stdout:', chunk.toString().trim());
    });

    helperProcess.stderr?.on('data', (chunk: Buffer) => {
      logger.warn('[resilience] helper stderr:', chunk.toString().trim());
    });

    helperProcess.on('exit', (code, signal) => {
      logger.log(`[resilience] Helper exited: code=${code}, signal=${signal}`);
      if (pipeClient) {
        pipeClient.destroy();
        pipeClient = null;
      }
      helperProcess = null;
      incomingBuffer = '';

      if (agentState !== 'stopped') {
        agentState = 'error';
        lastError = `Helper process exited unexpectedly (code ${code})`;
        emitStatusChange();
      }
    });

    helperProcess.on('error', (err) => {
      logger.error('[resilience] Helper spawn error:', err.message);
      agentState = 'error';
      lastError = `Failed to start helper: ${err.message}`;
      helperProcess = null;
      emitStatusChange();
    });

    // 2. Wait for the helper to create the pipe, then connect
    await new Promise((r) => setTimeout(r, 500));

    pipeClient = await connectToPipe(pipeName);

    // 3. Wire up pipe event handlers
    pipeClient.on('data', handlePipeData);

    pipeClient.on('close', () => {
      logger.log('[resilience] Pipe connection closed');
      pipeClient = null;
      incomingBuffer = '';
      if (agentState === 'running') {
        agentState = 'error';
        lastError = 'Pipe connection lost';
        emitStatusChange();
      }
    });

    pipeClient.on('error', (err) => {
      logger.error('[resilience] Pipe error:', err.message);
      lastError = err.message;
    });

    // 4. Mark as running
    agentState = 'running';
    startedAt = Date.now();
    emitStatusChange();

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error starting agent';
    agentState = 'error';
    lastError = msg;
    emitStatusChange();

    if (helperProcess && !helperProcess.killed) {
      helperProcess.kill();
      helperProcess = null;
    }

    return { success: false, error: msg };
  }
}

export async function stopAgent(): Promise<void> {
  // Send graceful shutdown command
  if (pipeClient && !pipeClient.destroyed) {
    try {
      sendCommand({ type: 'shutdown' });
      await new Promise((r) => setTimeout(r, 200));
    } catch {
      // Best effort
    }
  }

  if (pipeClient) {
    pipeClient.destroy();
    pipeClient = null;
  }
  incomingBuffer = '';

  if (helperProcess && !helperProcess.killed) {
    helperProcess.kill();
    helperProcess = null;
  }

  agentState = 'stopped';
  lastError = null;
  startedAt = 0;
  emitStatusChange();
}

export function sendCommand(
  command: ResilienceCommand,
): { success: boolean; error?: string } {
  if (!pipeClient || pipeClient.destroyed) {
    return { success: false, error: 'Pipe not connected' };
  }

  try {
    const json = JSON.stringify(command) + '\n';
    pipeClient.write(json);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Write failed';
    return { success: false, error: msg };
  }
}

export function getStatus(): ResilienceStatus {
  return {
    agentState,
    pipeConnected: pipeClient !== null && !pipeClient.destroyed,
    helperPid: helperProcess?.pid ?? null,
    lastError,
    uptime: agentState === 'running' ? Date.now() - startedAt : 0,
  };
}

export function cleanupResilience(): void {
  if (pipeClient && !pipeClient.destroyed) {
    try {
      pipeClient.write(JSON.stringify({ type: 'shutdown' }) + '\n');
    } catch {
      // Best effort during shutdown
    }
    pipeClient.destroy();
    pipeClient = null;
  }
  if (helperProcess && !helperProcess.killed) {
    helperProcess.kill();
    helperProcess = null;
  }
  agentState = 'stopped';
}
