/**
 * jito-client.ts — Subprocess client for jito v0.2.0
 *
 * Spawns `jito` binary as child process, communicates via JSON-RPC over stdin/stdout.
 * Streams responses back to webview via callbacks.
 *
 * Protocol (jito v0.2.0 must support):
 *   Input:  {"jsonrpc":"2.0","id":1,"method":"chat","params":{"message":"...","mode":"dev"}}
 *   Output (streamed):
 *     {"jsonrpc":"2.0","method":"message.start","params":{"id":"..."}}
 *     {"jsonrpc":"2.0","method":"message.delta","params":{"id":"...","text":"Hello"}}
 *     {"jsonrpc":"2.0","method":"message.end","params":{"id":"...","usage":{...}}}
 *     {"jsonrpc":"2.0","method":"error","params":{"code":...,"message":"..."}}
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export type JitoMode = 'dev' | 'reason' | 'create' | 'audit' | 'universal';

export interface JitoEvent {
  type: 'start' | 'delta' | 'end' | 'error' | 'tool_call' | 'checkpoint';
  id: string;
  text?: string;
  error?: { code: number; message: string };
  tool?: { name: string; args: Record<string, unknown> };
  checkpoint?: { id: string };
  usage?: { inputTokens: number; outputTokens: number };
}

export interface JitoClientOptions {
  binaryPath: string;
  apiKey: string | undefined;
  onError: (err: Error) => void;
  onEvent: (event: JitoEvent) => void;
}

export class JitoClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private buffer = '';
  private requestId = 0;
  private pendingRequests = new Map<number, (response: unknown) => void>();
  private currentMode: JitoMode = 'dev';

  constructor(private readonly options: JitoClientOptions) {
    super();
  }

  /**
   * Verify jito binary is reachable and matches v0.2.0.
   */
  async verify(): Promise<{ version: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.options.binaryPath, ['version']);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => (stdout += data.toString()));
      proc.stderr.on('data', (data) => (stderr += data.toString()));

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`jito version failed: ${stderr}`));
          return;
        }
        // Expected: "jito version 0.2.0"
        const match = stdout.match(/(\d+\.\d+\.\d+)/);
        if (!match || !match[1].startsWith('0.2.')) {
          reject(new Error(`jito v0.2.0 required, got: ${stdout.trim()}`));
          return;
        }
        resolve({ version: match[1] });
      });

      proc.on('error', (err) => reject(err));
    });
  }

  /**
   * Ensure the subprocess is running. Idempotent.
   */
  private ensureProcess(): ChildProcess {
    if (this.process && !this.process.killed) {
      return this.process;
    }

    this.process = spawn(this.options.binaryPath, ['serve', '--format=jsonrpc', '--stream'], {
      env: {
        ...process.env,
        JITO_API_KEY: this.options.apiKey ?? '',
        JITO_MODE_DEFAULT: this.currentMode,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.process.stdout?.on('data', (data) => this.handleStdout(data));
    this.process.stderr?.on('data', (data) => {
      console.error('[jito stderr]', data.toString());
    });

    this.process.on('exit', (code) => {
      console.warn(`[jito] process exited with code ${code}`);
      this.process = null;
      if (code !== 0) {
        this.options.onError(new Error(`jito exited with code ${code}`));
      }
    });

    this.process.on('error', (err) => {
      this.options.onError(err);
      this.process = null;
    });

    return this.process;
  }

  private handleStdout(data: Buffer): void {
    this.buffer += data.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        this.handleMessage(msg);
      } catch (err) {
        console.warn('[jito] invalid JSON:', line);
      }
    }
  }

  private handleMessage(msg: {
    jsonrpc: string;
    id?: number;
    method?: string;
    params?: unknown;
    result?: unknown;
    error?: { code: number; message: string };
  }): void {
    // Response to a request
    if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
      const cb = this.pendingRequests.get(msg.id)!;
      this.pendingRequests.delete(msg.id);
      if (msg.error) {
        this.options.onError(new Error(msg.error.message));
      } else {
        cb(msg.result);
      }
      return;
    }

    // Streamed event
    if (msg.method && msg.params) {
      const event = msg.params as JitoEvent;
      this.options.onEvent(event);
      this.emit(msg.method, event);
    }
  }

  /**
   * Send a chat message. Returns the message id for tracking.
   */
  async chat(message: string, options: { mode?: JitoMode; contextFiles?: string[] } = {}): Promise<string> {
    if (options.mode) this.currentMode = options.mode;

    const id = `msg-${Date.now()}-${this.requestId++}`;
    const proc = this.ensureProcess();

    const request = {
      jsonrpc: '2.0',
      id: this.requestId,
      method: 'chat',
      params: {
        id,
        message,
        mode: this.currentMode,
        contextFiles: options.contextFiles ?? [],
      },
    };

    proc.stdin?.write(JSON.stringify(request) + '\n');
    return id;
  }

  /**
   * Switch mode (server-side default for next message).
   */
  setMode(mode: JitoMode): void {
    this.currentMode = mode;
    const proc = this.ensureProcess();
    proc.stdin?.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: ++this.requestId,
        method: 'setMode',
        params: { mode },
      }) + '\n'
    );
  }

  getMode(): JitoMode {
    return this.currentMode;
  }

  /**
   * Cancel a running chat by id.
   */
  cancel(messageId: string): void {
    if (!this.process) return;
    this.process.stdin?.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: ++this.requestId,
        method: 'cancel',
        params: { id: messageId },
      }) + '\n'
    );
  }

  dispose(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.removeAllListeners();
  }
}
