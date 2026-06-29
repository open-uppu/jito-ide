#!/usr/bin/env node
import { randomUUID } from 'node:crypto'
import process from 'node:process'

const args = process.argv.slice(2)
const slowdown = numberFlag('--slowdown', Number(process.env.MOCK_SLOWDOWN ?? 30))
const deltaChunks = numberFlag('--delta-chunks', Number(process.env.MOCK_DELTA_CHUNKS ?? 5))
const inFlight = new Map()
const finished = new Set()
let stdinBuffer = Buffer.alloc(0)
let droppingOversizedLine = false
let faultInjected = false

const MAX_LINE_BYTES = 1024 * 1024

console.error('[mock-jito] v0.4.1 listening (jsonrpc)')

if (process.env.MOCK_LINE_OVERFLOW === '1') {
  process.stdout.write('x'.repeat(2 * 1024 * 1024) + '\n')
}

process.stdin.on('data', (chunk) => handleStdin(chunk))
process.stdin.on('end', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))

function numberFlag(name, fallback) {
  const value = args.find((arg) => arg.startsWith(`${name}=`))
  if (!value) return fallback
  const parsed = Number(value.slice(name.length + 1))
  return Number.isFinite(parsed) ? parsed : fallback
}

function handleStdin(data) {
  let offset = 0

  while (offset < data.length) {
    if (droppingOversizedLine) {
      const newline = data.indexOf(10, offset)
      if (newline === -1) return
      droppingOversizedLine = false
      offset = newline + 1
      continue
    }

    const newline = data.indexOf(10, offset)
    const end = newline === -1 ? data.length : newline
    const piece = data.subarray(offset, end)

    if (stdinBuffer.length + piece.length > MAX_LINE_BYTES) {
      stdinBuffer = Buffer.alloc(0)
      droppingOversizedLine = newline === -1
      console.error('[mock-jito] dropping oversized stdin line')
      if (newline === -1) return
      offset = newline + 1
      continue
    }

    stdinBuffer = Buffer.concat([stdinBuffer, piece])
    if (newline === -1) return

    const line = stdinBuffer.toString('utf8')
    stdinBuffer = Buffer.alloc(0)
    offset = newline + 1

    if (line.trim()) {
      handleLine(line)
    }
  }
}

function handleLine(line) {
  let frame
  try {
    frame = JSON.parse(line)
  } catch {
    console.error('[mock-jito] malformed json skipped')
    return
  }

  if (!validFrame(frame)) {
    console.error('[mock-jito] invalid jsonrpc frame skipped')
    return
  }

  if (!frame.method) return

  if (frame.method === 'chat') {
    handleChat(frame)
  } else if (frame.method === 'setMode') {
    setTimeout(() => write({ jsonrpc: '2.0', id: frame.id, result: { mode: frame.params?.mode, sticky: true } }), 5)
  } else if (frame.method === 'cancel') {
    handleCancel(frame)
  } else {
    write({
      jsonrpc: '2.0',
      id: frame.id,
      error: { code: -32601, message: 'method not found' },
    })
  }
}

function validFrame(frame) {
  if (!frame || frame.jsonrpc !== '2.0') return false
  const hasRequest = frame.id !== undefined && typeof frame.method === 'string'
  const hasNotification = frame.id === undefined && typeof frame.method === 'string'
  const hasResponse = frame.id !== undefined && (frame.result !== undefined || frame.error !== undefined)
  return hasRequest || hasNotification || hasResponse
}

function handleChat(frame) {
  maybeInjectNonJson()

  const now = new Date()
  const id = `msg-${randomUUID()}`
  const mode = frame.params?.mode ?? process.env.JITO_MODE_DEFAULT ?? 'universal'
  const model = frame.params?.model ?? 'mock/minimax-m3'
  const sessionId = frame.params?.session_id
  const text = `mock response: ${frame.params?.message ?? ''}`
  const startedAt = now.toISOString()
  const state = {
    id,
    requestId: frame.id,
    mode,
    model,
    sessionId,
    text,
    startedAt,
    timers: [],
    finished: false,
    cancelled: false,
  }

  inFlight.set(id, state)
  write({
    jsonrpc: '2.0',
    method: 'message.start',
    params: { id, mode, model, ts: startedAt },
  })

  if (String(frame.params?.message ?? '').includes('mock:error')) {
    const timer = setTimeout(() => {
      if (state.finished || state.cancelled) return
      state.finished = true
      finished.add(id)
      inFlight.delete(id)
      write({
        jsonrpc: '2.0',
        method: 'message.error',
        params: { id, code: 4001, message: 'rate limited', recoverable: false },
      })
      writeChatResponse(state, 'error')
    }, slowdown)
    state.timers.push(timer)
    return
  }

  if (String(frame.params?.message ?? '').includes('mock:tool-checkpoint')) {
    state.timers.push(setTimeout(() => {
      if (state.finished || state.cancelled) return
      write({
        jsonrpc: '2.0',
        method: 'tool_call',
        params: { id, index: 0, name: 'bash', args: { cmd: 'pwd' } },
      })
    }, slowdown))
    state.timers.push(setTimeout(() => {
      if (state.finished || state.cancelled) return
      write({
        jsonrpc: '2.0',
        method: 'checkpoint',
        params: { id, index: 1, label: 'after_tool_bash', ts: new Date().toISOString() },
      })
    }, slowdown * 2))
  }

  const chunks = chunkText(text, deltaChunks)
  chunks.forEach((chunk, index) => {
    const timer = setTimeout(() => {
      if (state.finished || state.cancelled) return
      write({
        jsonrpc: '2.0',
        method: 'message.delta',
        params: { id, index: index + (String(frame.params?.message ?? '').includes('mock:tool-checkpoint') ? 2 : 0), text: chunk },
      })
    }, slowdown * (index + 1))
    state.timers.push(timer)
  })

  state.timers.push(setTimeout(() => {
    if (state.finished || state.cancelled) return
    state.finished = true
    finished.add(id)
    inFlight.delete(id)
    writeEnd(state, 'stop')
    writeChatResponse(state, 'stop')
  }, slowdown * (chunks.length + 2)))
}

function handleCancel(frame) {
  const id = frame.params?.id
  const state = inFlight.get(id)

  if (!state || state.finished || state.cancelled || finished.has(id)) {
    write({ jsonrpc: '2.0', id: frame.id, result: { cancelled: false, reason: 'already_finished' } })
    return
  }

  state.cancelled = true
  state.finished = true
  state.timers.forEach((timer) => clearTimeout(timer))
  state.timers = []
  finished.add(id)
  inFlight.delete(id)

  writeEnd(state, 'cancelled')
  setTimeout(() => {
    writeChatResponse(state, 'cancelled')
    write({ jsonrpc: '2.0', id: frame.id, result: { cancelled: true } })
  }, 5)
}

function writeEnd(state, finishReason) {
  write({
    jsonrpc: '2.0',
    method: 'message.end',
    params: {
      id: state.id,
      usage: { input_tokens: 11, output_tokens: state.text.length },
      finish_reason: finishReason,
    },
  })
}

function writeChatResponse(state, finishReason) {
  write({
    jsonrpc: '2.0',
    id: state.requestId,
    result: {
      message_id: state.id,
      mode: state.mode,
      model: state.model,
      session_id: state.sessionId,
      finish_reason: finishReason,
      usage: { input_tokens: 11, output_tokens: state.text.length },
      started_at: state.startedAt,
      ended_at: new Date().toISOString(),
    },
  })
}

function chunkText(text, count) {
  if (count <= 1) return [text]
  const size = Math.ceil(text.length / count)
  const chunks = []
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size))
  }
  return chunks
}

function maybeInjectNonJson() {
  if (process.env.MOCK_FORCE_TIER1_FAULT !== 'nonjson-occasional' || faultInjected) return
  faultInjected = true
  process.stdout.write('NOT JSON\n')
}

function write(frame) {
  process.stdout.write(`${JSON.stringify(frame)}\n`)
}
