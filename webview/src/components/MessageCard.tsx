import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { ChatMessage } from '../App'
import { ModeIcons } from './icons'
import type { JitoMode } from '../types'

interface TokenUsage {
  input_tokens: number
  output_tokens: number
}

interface Props {
  msg: ChatMessage
  onCancel: (id: string) => void
}

const modeLabels: Record<JitoMode, string> = {
  dev: 'Dev',
  reason: 'Reason',
  create: 'Create',
  audit: 'Audit',
  universal: 'Universal',
}

function modeVar(mode: JitoMode | undefined, token: 'primary' | 'fg' | 'bg') {
  return mode ? `var(--color-mode-${mode}-${token})` : 'var(--accent-primary)'
}

function formatClock(timestamp: number) {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function formatTokens(tokens: number) {
  if (tokens < 1000) return String(tokens)

  const value = tokens / 1000
  return `${value.toFixed(1).replace(/\.0$/, '')}k`
}

function formatLatency(ms: number) {
  if (ms < 1000) return `${ms}ms`

  const seconds = ms / 1000
  return `${seconds.toFixed(1).replace(/\.0$/, '')}s`
}

function isTokenUsage(value: unknown): value is TokenUsage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'input_tokens' in value &&
    'output_tokens' in value &&
    typeof value.input_tokens === 'number' &&
    typeof value.output_tokens === 'number'
  )
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function buildFooterItems(msg: ChatMessage) {
  const fileCount =
    'contextFiles' in msg && isStringArray(msg.contextFiles)
      ? msg.contextFiles.length
      : 0
  const usage = 'usage' in msg && isTokenUsage(msg.usage) ? msg.usage : null
  const tokenCount = usage
    ? usage.input_tokens + usage.output_tokens
    : null
  const latencyMs =
    'startedAt' in msg &&
    'endedAt' in msg &&
    typeof msg.startedAt === 'number' &&
    typeof msg.endedAt === 'number' &&
    msg.endedAt >= msg.startedAt
      ? msg.endedAt - msg.startedAt
      : null

  return [
    fileCount > 0 ? `📎 ${fileCount} ${fileCount === 1 ? 'file' : 'files'}` : null,
    tokenCount !== null ? `${formatTokens(tokenCount)} tokens` : null,
    latencyMs !== null ? formatLatency(latencyMs) : null,
  ].filter((item): item is string => item !== null)
}

/**
 * Renders a single chat message with mode metadata, streaming controls, and
 * finished-message Markdown formatting.
 */
export function MessageCard({ msg, onCancel }: Props) {
  const streaming = !!msg.streaming
  const mode = msg.mode
  const Icon = mode ? ModeIcons[mode] : null
  const modeColor = msg.error ? 'var(--accent-critical)' : modeVar(mode, 'primary')
  const modeBg = mode ? modeVar(mode, 'bg') : 'var(--accent-glow)'
  const modeFg = mode ? modeVar(mode, 'fg') : 'var(--fg-primary)'
  const label = mode ? modeLabels[mode] : msg.role
  const className = [
    'message-card',
    msg.role === 'user' ? 'message-card--user' : 'message-card--assistant',
    msg.error ? 'message-card--error' : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' ')

  const timestamp = useMemo(() => formatClock(msg.timestamp), [msg.timestamp])
  const footerItems = useMemo(() => buildFooterItems(msg), [msg])
  const markdownComponents = useMemo<Components>(
    () => ({
      p({ children, node: _node, ...props }) {
        return (
          <p
            {...props}
            style={{
              margin: '0 0 var(--space-3)',
            }}
          >
            {children}
          </p>
        )
      },
      a({ children, node: _node, ...props }) {
        return (
          <a
            {...props}
            style={{
              color: 'var(--accent-primary)',
              textDecorationColor: 'var(--accent-glow)',
            }}
          >
            {children}
          </a>
        )
      },
      ul({ children, node: _node, ...props }) {
        return (
          <ul
            {...props}
            style={{
              margin: '0 0 var(--space-3)',
              paddingLeft: 'var(--space-3)',
            }}
          >
            {children}
          </ul>
        )
      },
      ol({ children, node: _node, ...props }) {
        return (
          <ol
            {...props}
            style={{
              margin: '0 0 var(--space-3)',
              paddingLeft: 'var(--space-3)',
            }}
          >
            {children}
          </ol>
        )
      },
      li({ children, node: _node, ...props }) {
        return (
          <li
            {...props}
            style={{
              marginBottom: 'var(--space-2)',
            }}
          >
            {children}
          </li>
        )
      },
      blockquote({ children, node: _node, ...props }) {
        return (
          <blockquote
            {...props}
            style={{
              margin: '0 0 var(--space-3)',
              paddingLeft: 'var(--space-3)',
              borderLeft: '2px solid var(--border-default)',
              color: 'var(--fg-tertiary)',
            }}
          >
            {children}
          </blockquote>
        )
      },
      pre({ children, node: _node, ...props }) {
        return (
          <pre
            {...props}
            style={{
              margin: '0 0 var(--space-3)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {children}
          </pre>
        )
      },
      code({ className, children, node: _node, ...props }) {
        const language = /language-(\w+)/.exec(className ?? '')?.[1]
        const code = String(children).replace(/\n$/, '')

        if (language) {
          return (
            <SyntaxHighlighter
              PreTag="div"
              language={language}
              style={oneDark}
              customStyle={{
                margin: 0,
                padding: 'var(--space-3)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.6,
              }}
              codeTagProps={{
                style: {
                  fontFamily: 'var(--font-mono)',
                },
              }}
              wrapLongLines
            >
              {code}
            </SyntaxHighlighter>
          )
        }

        return (
          <code
            {...props}
            className={className}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.95em',
              padding: '1px var(--space-1)',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {children}
          </code>
        )
      },
      table({ children, node: _node, ...props }) {
        return (
          <div
            style={{
              overflowX: 'auto',
              marginBottom: 'var(--space-3)',
            }}
          >
            <table
              {...props}
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 'var(--text-sm)',
              }}
            >
              {children}
            </table>
          </div>
        )
      },
      th({ children, node: _node, ...props }) {
        return (
          <th
            {...props}
            style={{
              padding: 'var(--space-2)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-primary)',
              background: 'var(--bg-surface)',
              textAlign: 'left',
            }}
          >
            {children}
          </th>
        )
      },
      td({ children, node: _node, ...props }) {
        return (
          <td
            {...props}
            style={{
              padding: 'var(--space-2)',
              border: '1px solid var(--border-default)',
            }}
          >
            {children}
          </td>
        )
      },
    }),
    []
  )

  if (msg.content === '' && !streaming) return null

  return (
    <article
      className={className}
      role="article"
      aria-label={`Chat message from ${msg.role}`}
      data-testid="message-card"
      data-role={msg.role}
      data-mode={mode ?? 'none'}
      data-streaming={String(streaming)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: 'fit-content',
        maxWidth: 'min(100%, 760px)',
        marginLeft: msg.role === 'user' ? 'auto' : undefined,
        marginRight: msg.role === 'user' ? undefined : 'auto',
        background: 'var(--bg-card)',
        color: 'var(--fg-primary)',
        border: `1px solid ${msg.error ? 'var(--accent-critical)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-sm)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 4,
          background: modeColor,
        }}
      />
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-3) var(--space-3) var(--space-2)',
          paddingLeft: 'calc(var(--space-3) + 4px)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 24,
            height: 24,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: '0 0 24px',
            color: modeColor,
            background: modeBg,
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {Icon ? (
            <Icon width={14} height={14} />
          ) : (
            <span
              style={{
                color: modeFg,
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-semibold)',
              }}
            >
              {msg.role.charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        <span
          style={{
            color: modeFg,
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-semibold)',
            letterSpacing: 'var(--tracking-wide)',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        <span
          style={{
            color: 'var(--fg-tertiary)',
            fontSize: 'var(--text-xs)',
          }}
        >
          · {timestamp}
        </span>
        {streaming && (
          <button
            type="button"
            onClick={() => onCancel(msg.id)}
            style={{
              marginLeft: 'auto',
              padding: '2px var(--space-2)',
              color: 'var(--fg-primary)',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
            }}
          >
            Stop
          </button>
        )}
      </header>
      <div
        style={{
          padding: 'var(--space-3)',
          paddingLeft: 'calc(var(--space-3) + 4px)',
          fontSize: 'var(--text-base)',
          lineHeight: 1.6,
        }}
      >
        {streaming ? (
          <pre
            style={{
              margin: 0,
              color: 'var(--fg-primary)',
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--text-base)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {msg.content}
          </pre>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
      {!streaming && footerItems.length > 0 && (
        <footer
          style={{
            padding: 'var(--space-2) var(--space-3) var(--space-3)',
            paddingLeft: 'calc(var(--space-3) + 4px)',
            color: 'var(--fg-tertiary)',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: 'var(--text-xs)',
          }}
        >
          {footerItems.join(' · ')}
        </footer>
      )}
    </article>
  )
}
