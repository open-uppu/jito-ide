/**
 * jito-client.ts — JSON-RPC/NDJSON subprocess client for jito v0.2.0
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export type JitoMode = 'dev' | 'reason' | 'create' | 'audit' | 'universal';

export interface StreamEnvelope {
  id: string;
  method: 'message.start' | 'message.delta' | 'message.end' | 'tool_call' | 'checkpoint' | 'message.error';
  params: any;
  ts: number;
}

export interface ChatResult {
  message_id: string;
  mode: JitoMode;
  model: string;
  session_id?: string;
  finish_reason: 'stop' | 'length' | 'cancelled' | 'error' | 'tool_use';
  usage: { input_tokens: number; output_tokens: number };
  started_at: string;
  ended_at: string;
}

export interface JitoEvent {
  type: 'start' | 'delta' | 'end' | 'error' | 'tool_call' | 'checkpoint' | 'message.error';
  id: string;
  text?: string;
  index?: number;
  mode?: JitoMode;
  model?: string;
  usage?: { input_tokens: number; output_tokens: number };
  tool?: { name: string; args: Record<string, unknown> };
  checkpoint?: { id: string; label: string };
  error?: { code: number; message: string; recoverable: boolean };
}

export interface JitoClientOptions {
  binaryPath: string;
  apiKey: string | undefined;
  onError: (err: Error) => void;
  onEvent: (event: JitoEvent) => void;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

type JsonRpcId = number | string;
type RequestType = 'chat' | 'setMode' | 'cancel';

interface PendingRequest {
  id: JsonRpcId;
  type: RequestType;
  payload: Record<string, unknown>;
  resolve: (value: any) => void;
  reject: (err: Error) => void;
  messageId?: string;
  started?: boolean;
  terminated?: boolean;
}

const MAX_LINE_BYTES = 1024 * 1024;
const TIER1_RESPAWN_THRESHOLD = 3;
const DISPOSE_KILL_MS = 2000;

const STREAM_METHODS = new Set([
  'message.start',
  'message.delta',
  'message.end',
  'tool_call',
  'checkpoint',
  'message.error',
]);

export class JitoClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private stdoutBuffer = Buffer.alloc(0);
  private droppingOversizedLine = false;
  private requestId = 0;
  private consecutiveTier1Faults = 0;
  private pendingRequests = new Map<JsonRpcId, PendingRequest>();
  private pendingChatStarts: JsonRpcId[] = [];
  private messageToRequest = new Map<string, JsonRpcId>();
  private currentMode: JitoMode = 'universal';
  private lastResult: ChatResult | null = null;
  private results = new Map<string, ChatResult>();
  private disposed = false;
  private disposing = false;
  private disposeKillTimer: NodeJS.Timeout | null = null;
  private spawnCount = 0;

  constructor(private readonly options: JitoClientOptions) {
    super();
  }

  async verify(): Promise<{ version: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.options.binaryPath, ['version'], {
        env: this.buildEnv(),
        cwd: this.options.cwd,
      });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => (stdout += data.toString()));
      proc.stderr.on('data', (data) => (stderr += data.toString()));

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`jito version failed: ${stderr.trim()}`));
          return;
        }

        const match = stdout.match(/(\d+\.\d+\.\d+)/);
        if (!match || !match[1].startsWith('0.2.')) {
          reject(new Error(`jito v0.2.x required, got: ${stdout.trim()}`));
          return;
        }

        resolve({ version: match[1] });
      });

      proc.on('error', (err) => reject(err));
    });
  }

  async spawn(): Promise<void> {
    if (this.process && !this.process.killed) {
      return;
    }

    this.disposed = false;
    this.disposing = false;
    this.stdoutBuffer = Buffer.alloc(0);
    this.droppingOversizedLine = false;

    const child = spawn(this.options.binaryPath, ['serve', '--format=jsonrpc', '--stream'], {
      env: this.buildEnv(),
      cwd: this.options.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.process = child;
    this.spawnCount += 1;
    this.emit('spawn', child);

    child.stdout?.on('data', (data: Buffer) => this.handleStdout(child, data));
    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString().trimEnd();
      if (text) {
        console.warn(`[jito stderr] ${text}`);
      }
    });

    child.on('close', (code) => {
      if (this.process === child) {
        this.process = null;
      }
      if (this.disposeKillTimer) {
        clearTimeout(this.disposeKillTimer);
        this.disposeKillTimer = null;
      }
      this.emit('close', code);

      if (!this.disposing && !this.disposed && code !== 0 && code !== null) {
        this.options.onError(new Error(`jito exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      if (this.process === child) {
        this.process = null;
      }
      this.options.onError(err);
    });
  }

  async chat(
    message: string,
    opts: {
      mode?: JitoMode;
      contextFiles?: string[];
      context_files?: string[];
      session_id?: string;
      model?: string;
    } = {}
  ): Promise<string> {
    await this.spawn();

    const id = this.nextRequestId();
    const params = {
      message,
      mode: opts.mode || this.currentMode || 'universal',
      context_files: opts.context_files ?? opts.contextFiles ?? [],
      session_id: opts.session_id,
      model: opts.model,
    };
    const payload = { jsonrpc: '2.0', id, method: 'chat', params };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        id,
        type: 'chat',
        payload,
        resolve,
        reject,
      });
      this.pendingChatStarts.push(id);
      this.writeRequest(payload, reject);
    });
  }

  async setMode(mode: JitoMode): Promise<{ mode: JitoMode; sticky: true }> {
    await this.spawn();

    const id = this.nextRequestId();
    const payload = {
      jsonrpc: '2.0',
      id,
      method: 'setMode',
      params: { mode },
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        id,
        type: 'setMode',
        payload,
        resolve: (result) => {
          this.currentMode = result.mode;
          this.emit('mode', result);
          resolve(result);
        },
        reject,
      });
      this.writeRequest(payload, reject);
    });
  }

  getMode(): JitoMode {
    return this.currentMode;
  }

  async cancel(messageId: string): Promise<{ cancelled: boolean; reason?: string }> {
    await this.spawn();

    const id = this.nextRequestId();
    const payload = {
      jsonrpc: '2.0',
      id,
      method: 'cancel',
      params: { id: messageId },
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        id,
        type: 'cancel',
        payload,
        resolve,
        reject,
      });
      this.writeRequest(payload, reject);
    });
  }

  getLastResult(messageId?: string): ChatResult | null {
    if (messageId) {
      return this.results.get(messageId) ?? null;
    }
    return this.lastResult;
  }

  getSpawnCount(): number {
    return this.spawnCount;
  }

  getProcess(): ChildProcess | null {
    return this.process;
  }

  dispose(): void {
    this.disposing = true;
    this.disposed = true;

    const child = this.process;
    if (!child) {
      this.removeAllListeners();
      return;
    }

    if (child.stdin && !child.stdin.destroyed) {
      child.stdin.end();
    }

    this.disposeKillTimer = setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }, DISPOSE_KILL_MS);

    child.once('close', () => {
      this.removeAllListeners();
    });
  }

  private buildEnv(): NodeJS.ProcessEnv {
    return {
      ...process.env,
      ...this.options.env,
      JITO_API_KEY: this.options.apiKey ?? '',
      JITO_MODE_DEFAULT: this.currentMode,
    };
  }

  private nextRequestId(): number {
    this.requestId += 1;
    return this.requestId;
  }

  private writeRequest(payload: Record<string, unknown>, reject: (err: Error) => void): void {
    const child = this.process;
    if (!child?.stdin || child.stdin.destroyed) {
      reject(new Error('jito process stdin is not available'));
      return;
    }

    child.stdin.write(JSON.stringify(payload) + '\n');
  }

  private handleStdout(child: ChildProcess, data: Buffer): void {
    if (child !== this.process) {
      return;
    }

    let offset = 0;

    while (offset < data.length) {
      if (this.droppingOversizedLine) {
        const newline = data.indexOf(10, offset);
        if (newline === -1) {
          return;
        }
        this.droppingOversizedLine = false;
        offset = newline + 1;
        continue;
      }

      const newline = data.indexOf(10, offset);
      const end = newline === -1 ? data.length : newline;
      const piece = data.subarray(offset, end);

      if (this.stdoutBuffer.length + piece.length > MAX_LINE_BYTES) {
        this.stdoutBuffer = Buffer.alloc(0);
        this.droppingOversizedLine = newline === -1;
        this.recordTier1Fault('line_overflow');
        if (newline === -1) {
          return;
        }
        offset = newline + 1;
        continue;
      }

      this.stdoutBuffer = Buffer.concat([this.stdoutBuffer, piece]);

      if (newline === -1) {
        return;
      }

      const line = this.stdoutBuffer.toString('utf8');
      this.stdoutBuffer = Buffer.alloc(0);
      offset = newline + 1;

      if (!line.trim()) {
        continue;
      }

      try {
        const message = JSON.parse(line);
        this.handleMessage(message);
      } catch {
        this.recordTier1Fault('invalid_json');
      }
    }
  }

  private handleMessage(message: any): void {
    if (!message || message.jsonrpc !== '2.0') {
      this.recordTier1Fault('invalid_envelope');
      return;
    }

    if (message.id !== undefined && (message.result !== undefined || message.error)) {
      this.handleResponse(message);
      return;
    }

    if (message.id === undefined && message.method && STREAM_METHODS.has(message.method)) {
      this.consecutiveTier1Faults = 0;
      this.handleStreamEvent(message.method, message.params ?? {});
      return;
    }

    this.recordTier1Fault('unknown_frame');
  }

  private handleResponse(message: any): void {
    const pending = this.pendingRequests.get(message.id);
    if (!pending) {
      this.recordTier1Fault('orphan_response');
      return;
    }

    if (message.error) {
      this.pendingRequests.delete(message.id);
      this.removePendingChatStart(message.id);
      pending.reject(new Error(message.error.message));
      this.consecutiveTier1Faults = 0;
      return;
    }

    if (pending.type === 'chat') {
      const result = message.result as ChatResult;
      if (!pending.terminated) {
        this.recordTier1Fault('chat_response_without_terminal_event');
        return;
      }
      this.pendingRequests.delete(message.id);
      if (pending.messageId) {
        this.messageToRequest.delete(pending.messageId);
      }
      this.lastResult = result;
      this.results.set(result.message_id, result);
      this.emit('chat.result', result);
      this.consecutiveTier1Faults = 0;
      return;
    }

    this.pendingRequests.delete(message.id);
    pending.resolve(message.result);
    this.consecutiveTier1Faults = 0;
  }

  private handleStreamEvent(method: StreamEnvelope['method'], params: any): void {
    const id = typeof params.id === 'string' ? params.id : '';
    const envelope: StreamEnvelope = {
      id,
      method,
      params,
      ts: Date.now(),
    };

    if (method === 'message.start') {
      this.attachStartToPendingChat(id);
    } else if (method === 'message.end') {
      this.markMessageTerminated(id);
    } else if (method === 'message.error' && params.recoverable === false) {
      this.markMessageTerminated(id);
    }

    this.emit(method, envelope);

    const event = this.translateEvent(method, params);
    this.options.onEvent(event);
    this.emit('event', event);
  }

  private attachStartToPendingChat(messageId: string): void {
    const requestId = this.pendingChatStarts.shift();
    if (requestId === undefined) {
      return;
    }

    const pending = this.pendingRequests.get(requestId);
    if (!pending || pending.type !== 'chat') {
      return;
    }

    pending.messageId = messageId;
    pending.started = true;
    this.messageToRequest.set(messageId, requestId);
    pending.resolve(messageId);
  }

  private markMessageTerminated(messageId: string): void {
    const requestId = this.messageToRequest.get(messageId);
    if (requestId === undefined) {
      return;
    }

    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      pending.terminated = true;
    }
  }

  private removePendingChatStart(id: JsonRpcId): void {
    this.pendingChatStarts = this.pendingChatStarts.filter((pendingId) => pendingId !== id);
  }

  private translateEvent(method: StreamEnvelope['method'], params: any): JitoEvent {
    if (method === 'message.start') {
      return {
        type: 'start',
        id: params.id,
        mode: params.mode,
        model: params.model,
      };
    }

    if (method === 'message.delta') {
      return {
        type: 'delta',
        id: params.id,
        index: params.index,
        text: params.text,
      };
    }

    if (method === 'message.end') {
      return {
        type: 'end',
        id: params.id,
        usage: params.usage,
      };
    }

    if (method === 'tool_call') {
      return {
        type: 'tool_call',
        id: params.id,
        index: params.index,
        tool: { name: params.name, args: params.args ?? {} },
      };
    }

    if (method === 'checkpoint') {
      return {
        type: 'checkpoint',
        id: params.id,
        index: params.index,
        checkpoint: { id: params.id, label: params.label },
      };
    }

    return {
      type: 'error',
      id: params.id ?? '',
      error: {
        code: params.code,
        message: params.message,
        recoverable: params.recoverable,
      },
    };
  }

  private recordTier1Fault(reason: string): void {
    this.consecutiveTier1Faults += 1;
    console.warn(`[jsonrpc-fault] reason=${reason}`);

    if (this.consecutiveTier1Faults >= TIER1_RESPAWN_THRESHOLD) {
      this.respawnAfterFaults();
    }
  }

  private respawnAfterFaults(): void {
    const child = this.process;
    this.process = null;
    this.stdoutBuffer = Buffer.alloc(0);
    this.droppingOversizedLine = false;
    this.consecutiveTier1Faults = 0;

    if (child && !child.killed) {
      child.kill('SIGKILL');
    }

    void this.spawn().then(() => {
      void this.reissueStateAfterRespawn();
    });
  }

  private async reissueStateAfterRespawn(): Promise<void> {
    if (this.currentMode) {
      const id = this.nextRequestId();
      const payload = {
        jsonrpc: '2.0',
        id,
        method: 'setMode',
        params: { mode: this.currentMode },
      };
      this.pendingRequests.set(id, {
        id,
        type: 'setMode',
        payload,
        resolve: () => undefined,
        reject: () => undefined,
      });
      this.writeRequest(payload, () => undefined);
    }

    const pendingChats = [...this.pendingRequests.values()].filter(
      (pending) => pending.type === 'chat' && !pending.started
    );

    for (const pending of pendingChats) {
      this.writeRequest(pending.payload, pending.reject);
      if (!this.pendingChatStarts.includes(pending.id)) {
        this.pendingChatStarts.push(pending.id);
      }
    }
  }
}
