/**
 * jito-ide v0.2.0 — Slash command definitions
 * File: webview/src/lib/commands.ts
 *
 * Single source of truth for every slash command that can be inserted
 * into the composer. Used by:
 *   - `<SlashPalette />`  → renders the searchable list + preview pane
 *   - `Composer.tsx`      → toolbar shows the same set of labels
 *   - future `/help` and `/commands` UI flows
 *
 * Design notes:
 *   - 9 built-in commands across 5 categories (Code, Review, Doc, Git, Custom).
 *   - `preview` is a ReactNode so each command can render its own example
 *     layout (code chip, before/after diff, prompt template, etc.).
 *   - Categories are stable identifiers — palette renders them as section
 *     headers in this order. Ordering here is therefore also visual order.
 *   - `fuzzyScore()` powers the search filter (case-insensitive substring,
 *     ranked: label-prefix > label-substring > description-substring > 0).
 */

import type { ReactNode } from 'react';

/** All categories supported by the palette. Order = visual order. */
export type CommandCategory = 'Code' | 'Review' | 'Doc' | 'Git' | 'Custom';

/** One slash command. */
export interface SlashCommand {
  /** Stable kebab-case identifier (e.g. "review", "commit"). */
  id: string;
  /** Slash-prefixed label, what the user types. Always starts with "/". */
  label: string;
  /** Visual category (also drives section grouping in the palette). */
  category: CommandCategory;
  /** One-line description shown in the list row. */
  description: string;
  /** Single glyph (emoji) shown left of the label. */
  icon: string;
  /** Short sample invocation, shown inside the preview pane. */
  example: string;
  /** Body of the preview pane — code chips, before/after, prompt, etc. */
  preview: ReactNode;
}

/* ──────────────────────────────────────────────────────────────────────
 * Reusable preview fragments
 * ──────────────────────────────────────────────────────────────────── */

/** Small inline `<code>` chip used inside previews. */
function CodeChip({ children }: { children: ReactNode }) {
  return <code className="palette__preview-chip">{children}</code>;
}

/** A simple two-line "before / after" rendered as parallel `<pre>` rows. */
function DiffPreview({
  before,
  after,
}: {
  before: string;
  after: string;
}) {
  return (
    <div className="palette__preview-diff">
      <pre className="palette__preview-diff-line palette__preview-diff-line--del">
        <span className="palette__preview-diff-sigil">−</span>
        {before}
      </pre>
      <pre className="palette__preview-diff-line palette__preview-diff-line--add">
        <span className="palette__preview-diff-sigil">+</span>
        {after}
      </pre>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * 9 built-in commands
 * ──────────────────────────────────────────────────────────────────── */

export const commands: SlashCommand[] = [
  /* ---------- Code ---------- */
  {
    id: 'review',
    label: '/review',
    category: 'Code',
    description: 'Review code for bugs, quality, and security smells',
    icon: '🔍',
    example: '/review src/auth/login.ts',
    preview: (
      <div className="palette__preview-stack">
        <p className="palette__preview-line">
          Walks the file (or selected range), surfaces bugs, race conditions,
          error-handling gaps, and risky patterns. Emits findings as a numbered
          list with severity tags.
        </p>
        <p className="palette__preview-example">
          <span className="palette__preview-label">Try</span>
          <CodeChip>/review src/auth/login.ts</CodeChip>
        </p>
        <DiffPreview
          before="if (user.token) return next();"
          after="if (user?.token && !tokenExpired(user)) return next();"
        />
      </div>
    ),
  },
  {
    id: 'test',
    label: '/test',
    category: 'Code',
    description: 'Generate unit tests for the selected code or file',
    icon: '🧪',
    example: '/test src/utils/slug.ts',
    preview: (
      <div className="palette__preview-stack">
        <p className="palette__preview-line">
          Writes Vitest / Jest specs covering the public surface of the target.
          Skips already-tested functions unless <CodeChip>--force</CodeChip> is
          passed.
        </p>
        <p className="palette__preview-example">
          <span className="palette__preview-label">Try</span>
          <CodeChip>/test src/utils/slug.ts</CodeChip>
        </p>
        <pre className="palette__preview-block">
{`describe('slug', () => {
  it('lowercases', () => expect(slug('Hello')).toBe('hello'));
  it('replaces spaces', () => expect(slug('a b')).toBe('a-b'));
});`}
        </pre>
      </div>
    ),
  },
  {
    id: 'refactor',
    label: '/refactor',
    category: 'Code',
    description: 'Refactor for readability, naming, or structure',
    icon: '♻️',
    example: '/refactor src/api/client.ts --goal=naming',
    preview: (
      <div className="palette__preview-stack">
        <p className="palette__preview-line">
          Produces a rename / extract / inline plan and returns the rewritten
          function bodies. Pass <CodeChip>--goal</CodeChip> to bias the
          strategy (<CodeChip>naming</CodeChip>, <CodeChip>structure</CodeChip>,
          <CodeChip> perf</CodeChip>).
        </p>
        <p className="palette__preview-example">
          <span className="palette__preview-label">Try</span>
          <CodeChip>/refactor src/api/client.ts --goal=naming</CodeChip>
        </p>
      </div>
    ),
  },
  {
    id: 'optimize',
    label: '/optimize',
    category: 'Code',
    description: 'Optimize hot paths and reduce complexity',
    icon: '⚡',
    example: '/optimize src/worker/parse.ts',
    preview: (
      <div className="palette__preview-stack">
        <p className="palette__preview-line">
          Profiles the file and proposes algorithmic wins (memoization,
          batching, generator hoisting) plus micro-opts (avoiding
          re-allocations, swap <CodeChip>Array.from</CodeChip> for loops).
        </p>
        <p className="palette__preview-example">
          <span className="palette__preview-label">Try</span>
          <CodeChip>/optimize src/worker/parse.ts</CodeChip>
        </p>
      </div>
    ),
  },

  /* ---------- Review ---------- */
  {
    id: 'security',
    label: '/security',
    category: 'Review',
    description: 'Security audit (OWASP top-10, secrets, injection)',
    icon: '🛡️',
    example: '/security src/api/',
    preview: (
      <div className="palette__preview-stack">
        <p className="palette__preview-line">
          Scans for SQLi / XSS / SSRF / path-traversal, hard-coded secrets, and
          unsafe deserialisation. Groups findings by CWE id and severity.
        </p>
        <p className="palette__preview-example">
          <span className="palette__preview-label">Try</span>
          <CodeChip>/security src/api/</CodeChip>
        </p>
        <ul className="palette__preview-list">
          <li>
            <span className="palette__preview-sev palette__preview-sev--high">
              HIGH
            </span>{' '}
            CWE-89: SQL injection via <CodeChip>query</CodeChip> in{' '}
            <CodeChip>users/search.ts:42</CodeChip>
          </li>
          <li>
            <span className="palette__preview-sev palette__preview-sev--med">
              MED
            </span>{' '}
            CWE-798: hard-coded token in <CodeChip>.env.example</CodeChip>
          </li>
        </ul>
      </div>
    ),
  },

  /* ---------- Doc ---------- */
  {
    id: 'doc',
    label: '/doc',
    category: 'Doc',
    description: 'Generate TSDoc / JSDoc for the selected code',
    icon: '📝',
    example: '/doc src/lib/commands.ts',
    preview: (
      <div className="palette__preview-stack">
        <p className="palette__preview-line">
          Adds parameter / return / throws blocks following the project&apos;s
          doc-comment style. Skips private members unless{' '}
          <CodeChip>--all</CodeChip>.
        </p>
        <p className="palette__preview-example">
          <span className="palette__preview-label">Try</span>
          <CodeChip>/doc src/lib/commands.ts</CodeChip>
        </p>
        <pre className="palette__preview-block">
{`/**
 * Convert a slug-ish string to lowercase, hyphenated form.
 * @param input  raw text (e.g. "Hello World")
 * @returns      hyphenated lowercased text (e.g. "hello-world")
 */`}
        </pre>
      </div>
    ),
  },
  {
    id: 'explain',
    label: '/explain',
    category: 'Doc',
    description: 'Explain code in plain English',
    icon: '💬',
    example: '/explain src/lib/commands.ts:1-40',
    preview: (
      <div className="palette__preview-stack">
        <p className="palette__preview-line">
          Reads the target range and walks through it section by section,
          explaining intent, control flow, and any non-obvious tricks.
        </p>
        <p className="palette__preview-example">
          <span className="palette__preview-label">Try</span>
          <CodeChip>/explain src/lib/commands.ts:1-40</CodeChip>
        </p>
      </div>
    ),
  },

  /* ---------- Git ---------- */
  {
    id: 'commit',
    label: '/commit',
    category: 'Git',
    description: 'Generate a Conventional Commit message from the diff',
    icon: '📦',
    example: '/commit',
    preview: (
      <div className="palette__preview-stack">
        <p className="palette__preview-line">
          Reads <CodeChip>git diff --staged</CodeChip> and proposes a
          Conventional Commit message (subject ≤ 72 chars, body wraps the
          &quot;why&quot;). Use <CodeChip>--no-verify</CodeChip> to skip pre-commit.
        </p>
        <p className="palette__preview-example">
          <span className="palette__preview-label">Try</span>
          <CodeChip>/commit</CodeChip>
        </p>
        <pre className="palette__preview-block">
{`feat(palette): add SlashPalette with 9 commands

- floating panel above composer
- substring search + keyboard nav
- preview pane shows example + diff`}
        </pre>
      </div>
    ),
  },
  {
    id: 'pr',
    label: '/pr',
    category: 'Git',
    description: 'Open a pull request with summary + test plan',
    icon: '🚀',
    example: '/pr --base=main',
    preview: (
      <div className="palette__preview-stack">
        <p className="palette__preview-line">
          Pushes the branch, opens a PR with a structured body: Summary,
          Changes (bulleted), Test plan. Defaults to the repo&apos;s default base
          branch.
        </p>
        <p className="palette__preview-example">
          <span className="palette__preview-label">Try</span>
          <CodeChip>/pr --base=main</CodeChip>
        </p>
        <pre className="palette__preview-block">
{`## Summary
- Adds floating slash palette
## Changes
- webview/src/components/SlashPalette.tsx
- webview/src/lib/commands.ts
## Test plan
- [ ] open palette with /
- [ ] arrow + Enter inserts`}
        </pre>
      </div>
    ),
  },
];

/* ──────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────── */

/** Category order used to render section headers. */
export const CATEGORY_ORDER: CommandCategory[] = [
  'Code',
  'Review',
  'Doc',
  'Git',
  'Custom',
];

/**
 * Fuzzy-ish filter. Returns a copy of `commands` ordered by best match.
 * Ranking tiers:
 *   0  → label-prefix   ("/rev" matches "/review" instantly)
 *   1  → label-substring
 *   2  → description-substring
 *   3  → no match (dropped)
 * Empty query → original order.
 */
export function filterCommands(query: string): SlashCommand[] {
  const q = query.trim().toLowerCase().replace(/^\//, '');
  if (!q) return commands.slice();

  const scored: { cmd: SlashCommand; tier: number }[] = [];
  for (const cmd of commands) {
    const label = cmd.label.toLowerCase().replace(/^\//, '');
    const desc = cmd.description.toLowerCase();
    let tier = 3;
    if (label.startsWith(q)) tier = 0;
    else if (label.includes(q)) tier = 1;
    else if (desc.includes(q)) tier = 2;
    if (tier < 3) scored.push({ cmd, tier });
  }
  // Stable sort by tier, preserving original order inside a tier.
  return scored
    .sort((a, b) => a.tier - b.tier)
    .map((entry) => entry.cmd);
}