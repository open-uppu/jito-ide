# jito-ide design

The jito-ide visual language.

jito-ide is a VS Code extension wrapped around the `jito` v0.2.0 CLI.
The UI should feel like a focused command surface for a backend process:
dark, sharp, fast, and mode-aware.

This document is for users and contributors.
It names the visible system and points to the internal token source.
It does not replace the full implementation spec.

## Principles

- Sharp geometry. Corners are tight, panels are crisp, and control edges
  should feel engineered rather than soft.
- Mode-first interaction. Every major state starts from the active mode:
  dev, reason, create, audit, or universal.
- Dark canvas by default. The experience is built for long sessions inside
  VS Code, not a light marketing page.
- No rounded blue gradients. jito-ide is not a generic assistant skin; it
  uses navy, cyan, magenta, and deliberate mode color.

## Canvas & brand

The base canvas is deep navy: `#0A0E14`.
It is close to black, but not pure black.
That keeps the webview readable during long coding sessions while still
making the jito panel visibly distinct from the editor around it.

The two brand colors are:

- Electric cyan: `#00E5FF`
- Magenta: `#FF1B6B`

Cyan is the primary jito accent.
It carries the lightning metaphor, active focus, and default brand energy.
Magenta is the second brand hue.
It is used for critical emphasis, active contrast, creation, and error-adjacent
states.

Use the shipped logo assets when the brand needs to appear outside the live
webview:

- [`assets/logo@2x.png`](../assets/logo@2x.png)
- [`assets/logo-mark.svg`](../assets/logo-mark.svg)

Do not redraw the logo in product surfaces unless the asset format is the
reason the original cannot be used.

## The 5-mode palette

The interface has five modes.
Each mode has a primary color and its own icon component.
Mode color should be treated as state, not decoration.

| Mode | Hex | Feeling |
|---|---:|---|
| dev | `#00A3FF` | Precise, technical, implementation-focused. |
| reason | `#A855F7` | Deliberate, analytical, deeper thinking. |
| create | `#FF1B6B` | Generative, active, high-energy. |
| audit | `#F97316` | Alert, evaluative, review-oriented. |
| universal | `#00E5FF` | Default, flexible, brand-forward. |

Mode icons live in:

- [`webview/src/components/icons/Dev.tsx`](../webview/src/components/icons/Dev.tsx)
- [`webview/src/components/icons/Reason.tsx`](../webview/src/components/icons/Reason.tsx)
- [`webview/src/components/icons/Create.tsx`](../webview/src/components/icons/Create.tsx)
- [`webview/src/components/icons/Audit.tsx`](../webview/src/components/icons/Audit.tsx)
- [`webview/src/components/icons/Universal.tsx`](../webview/src/components/icons/Universal.tsx)

For mode-by-mode behavior and visual reference, see
[`docs/modes.md`](./modes.md).

## Tokens at a glance

The token system uses a three-layer model: primitive to semantic to component.
Primitive tokens hold raw palette values such as brand cyan, brand magenta,
neutral ink, and status colors.
Semantic tokens assign those values to product roles such as canvas, surface,
card, primary foreground, secondary foreground, border, and accent.
Component tokens consume semantic roles so components can be reskinned without
rewriting the UI.
Contributors should normally use semantic or component tokens, not raw color
values.

Typography inherits VS Code's font stack through `--vscode-font-family`.
That makes the webview feel attached to the editor instead of floating beside
it.
The visible type scale is intentionally small and controlled:
`12`, `13`, `14`, `16`, `20`, `24`, and `32` pixels.
Use `14px` as the default message/body baseline.
Use larger sizes only for true hierarchy: mode labels, section headers, and
empty-state hero text.

Spacing sits on a 4px grid.
The common steps are `4`, `8`, `12`, `16`, `24`, `32`, and `48` pixels.
The single off-grid exception is `--space-5: 20px`.
It exists for the input row minimum and should not become a general-purpose
spacing value.
When adding layout, prefer the semantic spacing shortcuts from the internal
spec before inventing local constants.

Radii stay sharp.
Cards should not exceed `4px`.
Buttons should use `2px`.
Modals may use `6px`.
The product should never drift into large rounded cards, pill-heavy layouts,
or soft blue gradient surfaces.
The default shape language is geometric and compact.

## Components shipped in v0.2.0

The v0.2.0 UI is small by design.
These are the contributor-facing component anchors:

- Hero header:
  [`webview/src/App.tsx`](../webview/src/App.tsx), the `app-header` region.
- Mode pill:
  [`webview/src/components/ModeSelector.tsx`](../webview/src/components/ModeSelector.tsx).
- Message card:
  [`webview/src/components/MessageList.tsx`](../webview/src/components/MessageList.tsx).
- Composer:
  [`webview/src/components/Composer.tsx`](../webview/src/components/Composer.tsx).
- Status bar:
  [`src/status-bar.ts`](../src/status-bar.ts).

When changing a shipped component, check that it still reads correctly on the
navy canvas, responds to the active mode, and keeps the sharp-radius language.
The mode palette should move through the product as a system, not as isolated
one-off color choices.

## Go deeper

- Full internal token reference:
  [`webview/DESIGN.md`](../webview/DESIGN.md)
- Mode-by-mode visual reference:
  [`docs/modes.md`](./modes.md)
