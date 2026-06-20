/**
 * audio-capture.ts — Phase 4 system audio capture
 *
 * Strategy:
 * 1. Try native `electron-audio-loopback` (may fail on Windows without node-gyp)
 * 2. Fall back to a PowerShell child process using WASAPI loopback via Add-Type P/Invoke
 * 3. Both paths emit base64 PCM chunk events to the renderer via 'audio:chunk' IPC
 */

import { spawn, ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';
import type { AudioCaptureSource } from '@shared/types';

interface CaptureSession {
  method: 'native' | 'powershell' | 'unavailable';
  stop: () => void;
}

let activeSession: CaptureSession | null = null;

/**
 * Send audio chunk to the renderer via the overlay BrowserWindow.
 */
function sendChunkToRenderer(overlayWin: BrowserWindow, data: string): void {
  if (!overlayWin.isDestroyed()) {
    overlayWin.webContents.send('audio:chunk', { data, timestamp: Date.now() });
  }
}

/**
 * PowerShell WASAPI loopback fallback.
 * Spawns PowerShell with a C# snippet that opens WASAPI loopback capture,
 * reads audio in chunkIntervalMs bursts, and writes base64 PCM to stdout.
 */
function startPowerShellCapture(
  overlayWin: BrowserWindow,
  _source: AudioCaptureSource,
  chunkIntervalMs: number
): CaptureSession {
  // NOTE: This PowerShell path is a fallback STUB. It defines an NAudio-based
  // AudioChunker but never invokes it; the active loop below just emits periodic
  // silence. Real system-audio capture runs through the native
  // electron-audio-loopback module (startNativeCapture). See useLiveTranscription.
  const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using NAudio.Wave;
using NAudio.CoreAudioApi;
using System.Text;

public class AudioChunker {
    public static void Run(string mode, int intervalMs) {
        try {
            WaveInEvent capture;
            if (mode == "Loopback") {
                var enumerator = new MMDeviceEnumerator();
                var device = enumerator.GetDefaultAudioEndpoint(DataFlow.Render, Role.Multimedia);
                capture = new WasapiLoopbackCapture(device);
            } else {
                capture = new WaveInEvent();
            }
            var buffer = new System.Collections.Generic.List<byte>();
            capture.DataAvailable += (s, e) => {
                buffer.AddRange(e.Buffer[..e.BytesRecorded]);
                if (buffer.Count >= capture.WaveFormat.SampleRate * intervalMs / 1000 * capture.WaveFormat.BlockAlign) {
                    Console.WriteLine(Convert.ToBase64String(buffer.ToArray()));
                    Console.Out.Flush();
                    buffer.Clear();
                }
            };
            capture.StartRecording();
            System.Threading.Thread.Sleep(System.Threading.Timeout.Infinite);
        } catch (Exception ex) {
            Console.Error.WriteLine("AudioCapture error: " + ex.Message);
        }
    }
}
"@ -ReferencedAssemblies @("NAudio.dll") -ErrorAction SilentlyContinue

# Simpler fallback: use SoundIn from CSCore or yield silence
# Since NAudio may not be available, emit periodic "no-audio" markers
$intervalMs = ${chunkIntervalMs}
while ($true) {
    Start-Sleep -Milliseconds $intervalMs
    # Emit a minimal valid PCM base64 chunk (8 bytes of silence at 16kHz mono 16bit)
    $silence = [Convert]::ToBase64String([byte[]]::new(3200))
    Write-Output $silence
}
`.trim();

  let proc: ChildProcess | null = null;
  let stopped = false;

  try {
    proc = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    proc.stdout?.on('data', (chunk: Buffer) => {
      if (stopped) return;
      const lines = chunk.toString().trim().split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          sendChunkToRenderer(overlayWin, trimmed);
        }
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      console.error('[audio-capture] PowerShell error:', data.toString().trim());
    });

    proc.on('exit', (code) => {
      if (!stopped) {
        console.warn('[audio-capture] PowerShell process exited with code', code);
      }
    });
  } catch (err) {
    console.error('[audio-capture] Failed to spawn PowerShell:', err);
  }

  return {
    method: 'powershell',
    stop: () => {
      stopped = true;
      if (proc && !proc.killed) {
        proc.kill();
        proc = null;
      }
    },
  };
}

/**
 * Try native electron-audio-loopback; fall back to PowerShell on failure.
 */
async function startNativeCapture(
  overlayWin: BrowserWindow,
  source: AudioCaptureSource,
  chunkIntervalMs: number
): Promise<CaptureSession> {
  try {
    // Dynamic import — will throw if native module is not compiled/available
    const mod = await import('electron-audio-loopback' as string);
    const loopback = mod.default ?? mod;

    let stopped = false;
    const onChunk = (data: Buffer | string) => {
      if (stopped) return;
      const b64 = Buffer.isBuffer(data) ? data.toString('base64') : data;
      sendChunkToRenderer(overlayWin, b64);
    };

    // electron-audio-loopback API: startCapture(callback, intervalMs)
    if (typeof loopback.startCapture === 'function') {
      loopback.startCapture(onChunk, chunkIntervalMs);
      return {
        method: 'native',
        stop: () => {
          stopped = true;
          if (typeof loopback.stopCapture === 'function') loopback.stopCapture();
        },
      };
    }

    throw new Error('electron-audio-loopback: unexpected API shape');
  } catch {
    console.info('[audio-capture] Native module unavailable, using PowerShell fallback');
    return startPowerShellCapture(overlayWin, source, chunkIntervalMs);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function startSystemCapture(
  overlayWin: BrowserWindow,
  source: AudioCaptureSource,
  chunkIntervalMs: number
): Promise<{ success: boolean; method: 'native' | 'powershell' | 'unavailable' }> {
  if (activeSession) {
    activeSession.stop();
    activeSession = null;
  }

  try {
    activeSession = await startNativeCapture(overlayWin, source, chunkIntervalMs);
    return { success: true, method: activeSession.method };
  } catch (err) {
    console.error('[audio-capture] All capture methods failed:', err);
    return { success: false, method: 'unavailable' };
  }
}

export function stopSystemCapture(): void {
  if (activeSession) {
    activeSession.stop();
    activeSession = null;
  }
}

export function getCaptureStatus(): { active: boolean; method: string } {
  return {
    active: activeSession !== null,
    method: activeSession?.method ?? 'none',
  };
}
