# jito-ide Design System

> Phase 1.1 — Design Tokens (colors, typography, spacing)
> jito-ide v0.2.0 · Dark-mode-first · Sharp / electric / geometric

---

## 0. North Star

**Visual feel:** dark navy canvas (`#0A0E14`) with an electric cyan
accent (`#00E5FF`). Geometric. Sharp corners (max radius 4px on cards,
2px on buttons). Tight type. No rounded blue gradients. We are not
Cursor; we are a control surface for a CLI backend.

**Why these choices:**
- Cyan = lightning bolt (⚡) — the "jito" product metaphor.
- Magenta = critical / active / error — the only second hue.
- Navy-black canvas = readable for long sessions, less retinal fatigue
  than pure black, distinct from VS Code default so users always know
  which pane they're in.

---

## 1. File map

| File | Concern | Tokens |
|---|---|---|
| `webview/src/styles/tokens.css` | All raw design tokens (colors, radii, motion, z-index) | `--color-*`, `--bg-*`, `--fg-*`, `--accent-*`, `--mode-*` |
| `webview/src/styles/typography.css` | Font stack, scale, weights, line heights | `--text-*`, `--font-*`, `--weight-*`, `--leading-*` |
| `webview/src/styles/spacing.css` | 4px grid + layout primitives | `--space-*`, `--layout-*`, `--button-*`, `--card-*` |

All three are imported in this order from `webview/src/index.css`:

```css
@import "./styles/tokens.css";     /* 1 — primitives, semantic, mode */
@import "./styles/spacing.css";    /* 2 — geometry */
@import "./styles/typography.css"; /* 3 — type */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Order matters: tokens must resolve before utility classes are evaluated,
and the Tailwind layers can then safely reference our `--bg-canvas` etc.

---

## 2. Token architecture

### 2.1 Three-layer model

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3 — MODE-SPECIFIC                                    │
│  --color-mode-{dev|reason|create|audit|universal}-{p,fg,bg} │
│  ──► consumed via [data-mode="dev"] attribute selectors     │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2 — SEMANTIC                                         │
│  --bg-canvas, --bg-surface, --bg-card                       │
│  --fg-primary, --fg-secondary, --fg-tertiary                │
│  --accent-primary, --accent-critical                        │
│  --border-{subtle,default,strong,accent}                    │
├─────────────────────────────────────────────────────────────┤
│  LAYER 1 — PRIMITIVES (raw palette)                         │
│  --color-jito-cyan, --color-jito-magenta                    │
│  --color-ink-{0..6}, --color-fg-{1..4}                      │
│  --color-{success,warning,danger,info}                      │
└─────────────────────────────────────────────────────────────┘
```

**Rule of thumb:** components MUST consume layer 2 (`--bg-*`, `--fg-*`,
`--accent-*`) and MUST NOT reach into layer 1 directly. Layer 1 exists
so we can re-skin layer 2 without touching components.

### 2.2 Five-mode palette

Each chat mode gets three stops: `primary`, `fg` (text on the primary),
`bg` (10%-alpha primary for chips/hovers).

| Mode | Primary | FG | BG | Semantics |
|---|---|---|---|---|
| `dev` | `#00A3FF` | `#E0F2FE` | `#00A3FF1A` | code, blue (precision) |
| `reason` | `#A855F7` | `#F5F3FF` | `#A855F71A` | violet (deep thought) |
| `create` | `#FF1B6B` | `#FFF1F2` | `#FF1B6B1A` | magenta (generation) |
| `audit` | `#F97316` | `#FFF7ED` | `#F973161A` | orange (review) |
| `universal` | `#00E5FF` | `#ECFEFF` | `#00E5FF1A` | cyan (default, lightning) |

`create` reuses the brand magenta intentionally — it IS the magenta mode.
`universal` reuses brand cyan — that's the "everything" mode.

The `App.tsx` root sets `data-mode="dev"` (or whatever the user picks)
on `<html>`, and the `:root[data-mode='…']` blocks in `tokens.css`
rebind `--mode-active-{primary,fg,bg}`. Any component can then reference
`var(--mode-active-primary)` and recolor automatically.

---

## 3. Color tokens — full reference

### Brand
```css
--color-jito-cyan:        #00E5FF;  /* primary accent */
--color-jito-cyan-dim:    #00B8CC;  /* pressed */
--color-jito-cyan-glow:   #00E5FF33;/* 20% — halos, focus rings */
--color-jito-magenta:     #FF1B6B;  /* critical / active */
--color-jito-magenta-dim: #CC1556;
--color-jito-magenta-glow:#FF1B6B33;
```

### Neutrals (deep navy-black ladder)
```
ink-0  #05080C   ┐ deepest
ink-1  #0A0E14   ┘ canvas (default)
ink-2  #0F141A     surface (panels)
ink-3  #1A1F26     card (message bubbles)
ink-4  #242A33     raised (hover/focus)
ink-5  #2E3540     border-strong
ink-6  #3D4654     divider-strong
```

### Semantic role aliases (the only ones components should consume)
```css
--bg-canvas:    var(--color-ink-1);
--bg-surface:   var(--color-ink-2);
--bg-card:      var(--color-ink-3);
--bg-raised:    var(--color-ink-4);

--fg-primary:   var(--color-fg-1);
--fg-secondary: var(--color-fg-2);
--fg-tertiary:  var(--color-fg-3);
--fg-disabled:  var(--color-fg-4);

--accent-primary:    var(--color-jito-cyan);
--accent-critical:   var(--color-jito-magenta);

--border-subtle:  rgba(255,255,255,0.06);
--border-default: rgba(255,255,255,0.10);
--border-strong:  var(--color-ink-5);
--border-accent:  var(--color-jito-cyan);
```

---

## 4. Typography

### Scale (px)
```
text-xs    12   metadata, timestamps, footer
text-sm    13   secondary UI, slash-command list
text-base  14   default body, chat messages  ← baseline
text-md    16   input, buttons
text-lg    20   mode selector label
text-xl    24   section headers
text-2xl   32   empty-state hero
```

### Families
```css
--font-sans:    var(--vscode-font-family, ...) /* inherits editor font */
--font-mono:    var(--vscode-editor-font-family, ...) /* code blocks */
--font-display: same as sans (display weight comes from --weight-bold)
```

We inherit VS Code's `--vscode-font-family` so chat text matches the
editor the user is staring at. Falls back to system UI fonts on the
web.

### Weights
```
regular   400   default
medium    500   buttons, labels
semibold  600   headings, active nav
bold      700   empty-state hero, brand mark
```

### Line heights
```
1.0  none     icons, badges
1.2  tight    display, headings
1.35 snug     UI labels, chips
1.45 normal   body, chat  ← default
1.6  relaxed long-form explanations
```

---

## 5. Spacing (4px grid)

```
space-1    4px   inner-chip padding, dot-to-text
space-2    8px   button py, gap inside button group
space-3   12px   panel padding, card gap, gutter  ← default
space-4   16px   section padding, message-to-message
space-6   24px   between regions (header → list)
space-8   32px   page insets, footer height
space-12  48px   header height, hero padding
```

### Off-grid exception
`--space-5: 20px` is the **only** off-grid value. It exists to set the
minimum input row height (`text-md 16 + py-2 8×2 = 32`, plus icon space).
Do not introduce other off-grid values without a written justification
in code review.

### Semantic shortcuts
```css
--space-gutter:  var(--space-3);  /* message-to-message */
--space-padding: var(--space-3);  /* default panel */
--space-section: var(--space-6);  /* between regions */
--space-page:    var(--space-8);  /* outer page insets */
```

---

## 6. Radii

| Token | Value | Use |
|---|---|---|
| `--radius-none` | 0 | dividers, full-bleed bars |
| `--radius-xs` | 1px | sub-pixel hairlines |
| `--radius-sm` | 2px | **buttons, inputs** ← default |
| `--radius-md` | 4px | **cards** |
| `--radius-lg` | 6px | modals |
| `--radius-pill` | 999px | tiny mode-indicator dots only |

Anything rounder than 6px feels like a toy. Stay sharp.

---

## 7. Elevation

```css
--shadow-sm:        0 1px 0 rgba(0,0,0,0.5);
--shadow-md:        0 4px 12px rgba(0,0,0,0.55);
--shadow-lg:        0 12px 32px rgba(0,0,0,0.65);
--shadow-glow-cyan:    0 0 12px var(--color-jito-cyan-glow);
--shadow-glow-magenta: 0 0 12px var(--color-jito-magenta-glow);
```

Use `--shadow-glow-cyan` on the **active mode chip** and **send button
hover**. Don't sprinkle it everywhere — glow is a privilege.

---

## 8. Motion

```css
--duration-fast:   80ms;   /* hover bg, button press */
--duration-base:  140ms;   /* focus ring, chip swap */
--duration-slow:  260ms;   /* panel expand/collapse */
--ease-standard:    cubic-bezier(0.2, 0, 0, 1);
--ease-emphasized:  cubic-bezier(0.2, 0, 0.1, 1);
```

Anything longer than 300ms in a chat surface feels laggy.

---

## 9. Usage examples

### 9.1 Primary "Send" button (cyan, sharp)
```tsx
<button className="
  inline-flex items-center justify-center
  px-3 py-2                          /* spacing tokens */
  text-md font-medium                 /* typography tokens */
  bg-jito-cyan text-jito-fg-on-accent
  border border-transparent
  rounded-sm                          /* --radius-sm = 2px */
  hover:bg-jito-cyan-dim
  focus:outline-none focus:ring-2 focus:ring-jito-cyan
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-colors duration-fast
">
  Send
</button>
```

### 9.2 Message card (assistant)
```tsx
<article className="
  max-w-[85%]
  bg-jito-card                         /* --bg-card */
  text-fg-primary
  rounded-md                           /* --radius-md = 4px */
  border border-border-subtle
  px-3 py-2                            /* --card-px, --card-py */
  leading-normal
">
  {content}
</article>
```

### 9.3 Active mode chip (uses mode palette)
```tsx
<button
  data-mode={mode}                    /* set on <html> by App.tsx */
  className="
    px-2 py-1
    text-xs font-medium uppercase tracking-wide
    rounded-sm
    bg-[var(--mode-active-bg)]
    text-[var(--mode-active-fg)]
    border border-[var(--mode-active-primary)]
  "
>
  {mode}
</button>
```

### 9.4 Streaming indicator with cyan glow
```tsx
<span
  className="
    inline-block w-2 h-2
    bg-jito-cyan rounded-pill
    animate-pulse
    shadow-[0_0_12px_var(--color-jito-cyan-glow)]
  "
/>
```

---

## 10. Migration rules (for v0.1.0 → v0.2.0)

1. **Replace** `bg-blue-600 text-white` → `bg-jito-cyan text-jito-fg-on-accent`
2. **Replace** `bg-white/5` (translucent white) → `bg-jito-card` or `bg-jito-surface`
3. **Replace** `border-white/10` → `border-border-default`
4. **Replace** arbitrary `rounded-lg` (8px) → `rounded-sm` (2px) or `rounded-md` (4px)
5. **Add** `data-mode="..."` to `<html>` root in `App.tsx` so mode colors activate
6. **Import** `./styles/{tokens,typography,spacing}.css` at the top of `index.css`

A mechanical codemod can run in Phase 1.3 once the Tailwind config
bridge is in place.

---

## 11. What we explicitly did NOT do

- **No light theme.** v0.2.0 ships dark-only. Light theme is v0.3.0+
  and will require re-balancing all `fg-*` contrast pairs.
- **No fluid type.** Sizes are fixed px. Viewport-relative sizing breaks
  inside VS Code's variable-density webview.
- **No CSS-in-JS.** Tokens live in CSS files. The webview is tiny; the
  ceremony isn't worth it.
- **No per-component token files.** All three concerns (color/type/space)
  live in three files. Components import nothing; they just consume the
  `:root` custom properties.

---

## 12. Phase roadmap (where this leads)

| Phase | Concern | Depends on |
|---|---|---|
| **1.1 ✅ this card** | tokens.css / typography.css / spacing.css / DESIGN.md | — |
| 1.2 | Font stack decision (self-host Inter / JetBrains Mono) | 1.1 |
| 1.3 | Tailwind theme bridge + Tailwind config migration | 1.1, 1.2 |
| 3.1 | Inline edit color tokens (`--diff-add`, `--diff-remove`) | 1.1 |
| 3.2 | Streaming states (typing dots, cancellable spinner) | 1.1, 1.3 |
| 3.4 | Mode-specific accent borders | 1.1 |
| 4.1 | Settings UI token previews | 1.1, 1.3 |
| 5.1 | Status bar tokens (`--status-bar-fg`, project mode) | 1.1 |
| 5.3 | Marketplace screenshot pipeline | 1.1, 1.3 |

---

_Built by jito-ide · Phase 1.1 of v0.2.0 redesign · 2026-06-29_