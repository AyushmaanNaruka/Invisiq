import { spawn } from 'child_process';
import { join } from 'path';

export class GhostAIController {
  private agentProcess?: any;
  private pipeName = '\\\\.\\pipe\\GhostAI';
  private isConnected = false;

  async startAgent(): Promise<boolean> {
    if (this.agentProcess) return true;

    const helperPath = join(process.resourcesPath, 'ghostai_helper.exe');
    this.agentProcess = spawn(helperPath, [], { detached: false });

    this.agentProcess.on('error', (err) => {
      console.error('[GhostAIController] Failed to start agent:', err);
    });

    // Simple ping to verify pipe is up
    await new Promise(r => setTimeout(r, 2000));
    this.isConnected = true;
    return true;
  }

  async sendCommand(cmd: object): Promise<any> {
    if (!this.isConnected) throw new Error('Agent not running');

    const net = require('net');
    return new Promise((resolve, reject) => {
      const client = net.createConnection(this.pipeName, () => {
        client.write(JSON.stringify(cmd));
      });

      client.on('data', (data: Buffer) => {
        try {
          const resp = JSON.parse(data.toString());
          resolve(resp);
        } catch (e) {
          reject(e);
        }
        client.end();
      });

      client.on('error', reject);
    });
  }

  async stopAgent() {
    if (this.agentProcess) {
      this.agentProcess.kill();
      this.agentProcess