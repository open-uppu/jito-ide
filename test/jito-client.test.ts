import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { ChildProcess } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'
import { JitoClient, JitoEvent, StreamEnvelope } from '../src/jito-client'

const root = process.cwd()
const runMock = path.join(root, 'scripts', 'run-mock.sh')
const overflowThenMock = path.join(root, 'test', 'fixtures', 'overflow-then-mock.sh')

interface SpawnedMock {
  client: JitoClient
  processes: ChildProcess[]
  kill: () => void
}

const fixtures: SpawnedMock[] = []

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    fixture.kill()
  }
})

describe('JitoClient JSON-RPC protocol conformance', () => {
  it('basic chat receives start, ordered deltas, and end', async () => {
    const { client } = spawnMockWith()
    const starts: StreamEnvelope[] = []
    const deltas: StreamEnvelope[] = []
    const ends: StreamEnvelope[] = []

    client.on('message.start', (event) => starts.push(event))
    client.on('message.delta', (event) => deltas.push(event))
    client.on('message.end', (event) => ends.push(event))

    const id = await client.chat('hello basic', { session_id: randomUUID() })
    await waitForResult(client, id)

    expect(starts).toHaveLength(1)
    expect(starts[0].params.id).toBe(id)
    expect(deltas.length).toBeGreaterThanOrEqual(5)
    expect(ends).toHaveLength(1)
    expect(ends[0].params.id).toBe(id)

    const rebuilt = deltas
      .sort((a, b) => a.params.index - b.params.index)
      .map((event) => event.params.text)
      .join('')
    expect(rebuilt).toBe('mock response: hello basic')
  })

  it('uses the server-assigned message id', async () => {
    const { client } = spawnMockWith()
    const start = once<StreamEnvelope>(client, 'message.start')
    const id = await client.chat('server id only', { session_id: randomUUID() })
    const startEvent = await start

    expect(id).toBe(startEvent.params.id)
    expect(id).toMatch(/^msg-/)
  })

  it('captures finish_reason from the final chat result', async () => {
    const { client } = spawnMockWith()
    const id = await client.chat('finish reason', { session_id: randomUUID() })
    const result = await waitForResult(client, id)

    expect(result.finish_reason).toBe('stop')
    expect(client.getLastResult(id)?.finish_reason).toBe('stop')
  })

  it('keeps one long-lived subprocess across sequential chats', async () => {
    const { client } = spawnMockWith()

    const first = await client.chat('first', { session_id: randomUUID() })
    await waitForResult(client, first)
    const second = await client.chat('second', { session_id: randomUUID() })
    await waitForResult(client, second)

    expect(client.getSpawnCount()).toBe(1)
  })

  it('setMode updates sticky mode for future chats', async () => {
    const { client } = spawnMockWith()

    const result = await client.setMode('reason')
    const start = once<StreamEnvelope>(client, 'message.start')
    const id = await client.chat('sticky mode', { session_id: randomUUID() })
    await waitForResult(client, id)

    expect(result).toEqual({ mode: 'reason', sticky: true })
    expect(client.getMode()).toBe('reason')
    expect((await start).params.mode).toBe('reason')
  })

  it('per-call mode override does not mutate sticky mode', async () => {
    const { client } = spawnMockWith()

    await client.setMode('dev')
    const start = once<StreamEnvelope>(client, 'message.start')
    const id = await client.chat('override mode', { mode: 'audit', session_id: randomUUID() })
    await waitForResult(client, id)

    expect((await start).params.mode).toBe('audit')
    expect(client.getMode()).toBe('dev')
  })

  it('cancels mid-stream and stops additional deltas', async () => {
    const { client } = spawnMockWith({ env: { MOCK_SLOWDOWN: '60', MOCK_DELTA_CHUNKS: '8' } })
    const deltas: StreamEnvelope[] = []
    client.on('message.delta', (event) => deltas.push(event))

    const id = await client.chat('cancel me', { session_id: randomUUID() })
    await once<StreamEnvelope>(client, 'message.delta', (event) => event.params.id === id)
    const deltaCountAtCancel = deltas.length

    const cancel = await client.cancel(id)
    const result = await waitForResult(client, id)
    await delay(180)

    expect(cancel).toEqual({ cancelled: true })
    expect(result.finish_reason).toBe('cancelled')
    expect(deltas.length).toBe(deltaCountAtCancel)
  })

  it('cancel is idempotent and emits nothing on the second cancel', async () => {
    const { client } = spawnMockWith({ env: { MOCK_SLOWDOWN: '60', MOCK_DELTA_CHUNKS: '8' } })
    const events: JitoEvent[] = []
    client.on('event', (event) => events.push(event))

    const id = await client.chat('cancel twice', { session_id: randomUUID() })
    await once<StreamEnvelope>(client, 'message.delta', (event) => event.params.id === id)
    await client.cancel(id)
    await waitForResult(client, id)

    const eventCount = events.length
    const second = await client.cancel(id)
    await delay(80)

    expect(second.cancelled).toBe(false)
    expect(second.reason).toBe('already_finished')
    expect(events).toHaveLength(eventCount)
  })

  it('survives a tier-1 non-JSON stdout fault', async () => {
    const { client } = spawnMockWith({ env: { MOCK_FORCE_TIER1_FAULT: 'nonjson-occasional' } })

    const id = await client.chat('fault then recover', { session_id: randomUUID() })
    const result = await waitForResult(client, id)

    expect(result.finish_reason).toBe('stop')
    expect(client.getSpawnCount()).toBe(1)
  })

  it('respawns after three MAX_LINE_BYTES violations and completes on the new process', async () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'jito-overflow-'))
    const marker = path.join(tmp, 'first-run')
    const { client } = spawnMockWith({
      binaryPath: overflowThenMock,
      env: { MOCK_OVERFLOW_MARKER: marker },
    })

    const id = await client.chat('after overflow', { session_id: randomUUID() })
    const result = await waitForResult(client, id)

    expect(result.finish_reason).toBe('stop')
    expect(client.getSpawnCount()).toBeGreaterThanOrEqual(2)
    rmSync(tmp, { recursive: true, force: true })
  })

  it('emits both exact protocol events and the legacy unified event payload', async () => {
    const { client } = spawnMockWith()
    const exactStart = once<StreamEnvelope>(client, 'message.start')
    const unifiedStart = once<JitoEvent>(client, 'event', (event) => event.type === 'start')

    const id = await client.chat('event channels', { session_id: randomUUID() })
    await waitForResult(client, id)

    expect((await exactStart).method).toBe('message.start')
    expect((await unifiedStart).id).toBe(id)
  })

  it('dispose sends stdin EOF and lets the mock exit cleanly', async () => {
    const { client, processes } = spawnMockWith()
    await client.spawn()
    const proc = processes[0]
    const closed = onceClose(proc)

    client.dispose()
    const code = await closed

    expect(code).toBe(0)
  })

  it('surfaces message.error as a terminated error event', async () => {
    const { client } = spawnMockWith()
    const errorEvent = once<JitoEvent>(client, 'event', (event) => event.type === 'error')
    const ends: StreamEnvelope[] = []
    client.on('message.end', (event) => ends.push(event))

    const id = await client.chat('mock:error', { session_id: randomUUID() })
    const event = await errorEvent
    const result = await waitForResult(client, id)

    expect(event.id).toBe(id)
    expect(event.error).toEqual({ code: 4001, message: 'rate limited', recoverable: false })
    expect(result.finish_reason).toBe('error')
    expect(ends.filter((end) => end.params.id === id)).toHaveLength(0)
  })

  it('emits typed tool_call and checkpoint payloads on the event channel', async () => {
    const { client } = spawnMockWith()
    const tool = once<JitoEvent>(client, 'event', (event) => event.type === 'tool_call')
    const checkpoint = once<JitoEvent>(client, 'event', (event) => event.type === 'checkpoint')

    const id = await client.chat('mock:tool-checkpoint', { session_id: randomUUID() })
    await waitForResult(client, id)

    expect(await tool).toMatchObject({
      id,
      tool: { name: 'bash', args: { cmd: 'pwd' } },
    })
    expect(await checkpoint).toMatchObject({
      id,
      checkpoint: { id, label: 'after_tool_bash' },
    })
  })
})

function spawnMockWith(opts: {
  binaryPath?: string
  env?: NodeJS.ProcessEnv
} = {}): SpawnedMock {
  const processes: ChildProcess[] = []
  const client = new JitoClient({
    binaryPath: opts.binaryPath ?? runMock,
    apiKey: undefined,
    env: opts.env,
    onError: (err) => {
      throw err
    },
    onEvent: () => undefined,
  })

  client.on('spawn', (proc) => processes.push(proc))

  const fixture = {
    client,
    processes,
    kill: () => {
      client.dispose()
      for (const proc of processes) {
        if (!proc.killed) {
          proc.kill('SIGKILL')
        }
      }
    },
  }
  fixtures.push(fixture)
  return fixture
}

function once<T>(client: JitoClient, event: string, predicate: (value: T) => boolean = () => true): Promise<T> {
  return new Promise((resolve) => {
    const listener = (value: T) => {
      if (!predicate(value)) return
      client.off(event, listener)
      resolve(value)
    }
    client.on(event, listener)
  })
}

function onceClose(proc: ChildProcess): Promise<number | null> {
  return new Promise((resolve) => {
    proc.once('close', (code) => resolve(code))
  })
}

function waitForResult(client: JitoClient, messageId: string): Promise<ReturnType<JitoClient['getLastResult']> extends infer T ? NonNullable<T> : never> {
  const existing = client.getLastResult(messageId)
  if (existing) {
    return Promise.resolve(existing as never)
  }

  return new Promise((resolve) => {
    const listener = () => {
      const result = client.getLastResult(messageId)
      if (!result) return
      client.off('chat.result', listener)
      resolve(result as never)
    }
    client.on('chat.result', listener)
  })
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
