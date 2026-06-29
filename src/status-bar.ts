/**
 * status-bar.ts — Branded VS Code StatusBar item for jito-ide
 *
 * Phase 3.3 — replaces the v0.1.0 text-only status bar with an animated,
 * mode-aware item that mirrors the webview's design tokens.
 *
 * Visual states (matches the Phase 3.3 spec):
 *   idle        gray bolt icon, mode name as caption, theme-default bg
 *   streaming   pulsing bolt (animated), mode-tinted prominent background
 *   error       magenta bolt + error glyph, error background
 *   mode-flash  200ms foreground-color flash when mode changes
 *
 * Animation strategy
 * ──────────────────
 * VS Code's native `StatusBarItem` does NOT render CSS or arbitrary HTML —
 * the icon is a `$(codicon)` reference and the text is a plain string.
 * There is no DOM, no `@keyframes`, no stylesheet.
 *
 * We get animation through two native mechanisms:
 *   1. `$(loading~spin)` codicon — VS Code spins this natively (one of the
 *      few built-in animated codicons). Used while a message is streaming.
 *   2. A `setInterval` ticker that alternates the foreground icon and
 *      a softer "halo" backgroundColor to *fake* a pulse. The 600ms
 *      cadence (300ms on / 300ms off) is slow enough to read as a
 *      "breathing" pulse, not a strobe.
 *   3. A 200ms `setTimeout` after a mode change that paints the icon in
 *      the new mode color and then clears it. Reads as a "flash".
 *
 * Cross-platform safety
 * ─────────────────────
 * The StatusBarItem API is identical on macOS, Windows, and Linux —
 * VS Code abstracts the native status bar. Theme-dependent behavior is
 * limited to ThemeColor resolution, which we handle by contributing
 * five light/dark/high-contrast defaults via `package.json` so the mode
 * tints render correctly regardless of the user's theme.
 */

import * as vscode from 'vscode';
import { JitoEvent, JitoMode } from './jito-client';

/**
 * Mode-to-theme-color-id mapping. The IDs are registered in
 * `package.json` `contributes.colors` with light/dark/high-contrast
 * defaults that match the webview's `--color-mode-<m>-primary` tokens.
 */
const MODE_BG_COLOR_ID: Record<JitoMode, string> = {
  dev:       'jitoStatusBar.devBackground',
  reason:    'jitoStatusBar.reasonBackground',
  create:    'jitoStatusBar.createBackground',
  audit:     'jitoStatusBar.auditBackground',
  universal: 'jitoStatusBar.universalBackground',
};

const MODE_FG_COLOR_ID: Record<JitoMode, string> = {
  dev:       'jitoStatusBar.devForeground',
  reason:    'jitoStatusBar.reasonForeground',
  create:    'jitoStatusBar.createForeground',
  audit:     'jitoStatusBar.auditForeground',
  universal: 'jitoStatusBar.universalForeground',
};

/** Display label per mode (matches the webview's ModeSelector labels). */
const MODE_LABEL: Record<JitoMode, string> = {
  dev: 'dev',
  reason: 'reason',
  create: 'create',
  audit: 'audit',
  universal: 'universal',
};

const NEUTRAL_FG = new vscode.ThemeColor('statusBarItem.foreground');
const MAGENTA_FG = new vscode.ThemeColor('editorError.foreground');
const ERROR_BG = new vscode.ThemeColor('statusBarItem.errorBackground');
const PROMINENT_BG = new vscode.ThemeColor('statusBarItem.prominentBackground');

const PULSE_INTERVAL_MS = 300;     // half-cycle of the streaming pulse
const MODE_FLASH_MS = 200;         // how long the mode-change flash lasts

export type StatusBarState = 'idle' | 'streaming' | 'error';

export class StatusBar {
  private item: vscode.StatusBarItem;
  private mode: JitoMode = 'dev';
  private state: StatusBarState = 'idle';
  private errorMessage: string | null = null;

  /** Streaming pulse animation handle. Null when no pulse is active. */
  private pulseTimer: NodeJS.Timeout | null = null;
  /** Mode-flash transient handle. Null when no flash is active. */
  private flashTimer: NodeJS.Timeout | null = null;
  /** Pulse alternation phase (even = halo on, odd = halo off). */
  private pulsePhase = 0;
  /** The mode that was active when we last entered a steady state. */
  private lastRenderedMode: JitoMode = 'dev';

  constructor() {
    // High priority (100) so jito's status bar pins to the right edge
    // near GitLens / Copilot. The explicit id makes the item addressable
    // for the workbench context menu and our own diagnostics.
    this.item = vscode.window.createStatusBarItem(
      'jito-ide.statusBar',
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.item.name = 'jito ⚡ — mode & activity';
    this.item.command = 'jito-ide.switchMode';
    this.item.tooltip = this.buildTooltip();
    this.render();
    this.item.show();
  }

  // ──────────────────────────────────────────────────────────────────────
  //  Public API
  // ──────────────────────────────────────────────────────────────────────

  setMode(mode: JitoMode): void {
    if (this.mode === mode) return;
    const previous = this.mode;
    this.mode = mode;
    // Flash only when mode actually changes (not on the first render).
    if (this.lastRenderedMode !== mode) {
      this.flashMode(previous, mode);
    }
    this.render();
  }

  setReady(): void {
    this.stopPulse();
    this.state = 'idle';
    this.errorMessage = null;
    this.render();
  }

  setError(message: string): void {
    this.stopPulse();
    this.state = 'error';
    this.errorMessage = message;
    this.render();
  }

  handleEvent(event: JitoEvent): void {
    if (event.type === 'start') {
      this.state = 'streaming';
      this.errorMessage = null;
      this.startPulse();
      this.render();
    } else if (event.type === 'end') {
      this.state = 'idle';
      this.stopPulse();
      this.render();
    } else if (event.type === 'error') {
      this.state = 'error';
      this.errorMessage = event.error?.message ?? 'Unknown jito error';
      this.stopPulse();
      this.render();
    }
  }

  dispose(): void {
    this.stopPulse();
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
      this.flashTimer = null;
    }
    this.item.dispose();
  }

  // ──────────────────────────────────────────────────────────────────────
  //  Internals
  // ──────────────────────────────────────────────────────────────────────

  private startPulse(): void {
    if (this.pulseTimer) return;
    this.pulsePhase = 0;
    this.pulseTimer = setInterval(() => {
      this.pulsePhase = (this.pulsePhase + 1) % 2;
      this.render();
    }, PULSE_INTERVAL_MS);
  }

  private stopPulse(): void {
    if (this.pulseTimer) {
      clearInterval(this.pulseTimer);
      this.pulseTimer = null;
    }
    this.pulsePhase = 0;
  }

  /**
   * Briefly recolor the foreground to the NEW mode color so the user
   * sees the mode they just switched to. After MODE_FLASH_MS we
   * re-render to the steady state.
   *
   * Note: VS Code may override `color` when `backgroundColor` is set
   * (per the StatusBarItem docs). To make the flash visible in all
   * themes we momentarily set a prominent background as well.
   */
  private flashMode(_previous: JitoMode, next: JitoMode): void {
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
      this.flashTimer = null;
    }
    this.item.color = new vscode.ThemeColor(MODE_FG_COLOR_ID[next]);
    this.item.backgroundColor = PROMINENT_BG;
    this.render();
    this.flashTimer = setTimeout(() => {
      this.flashTimer = null;
      this.item.color = NEUTRAL_FG;
      this.render();
    }, MODE_FLASH_MS);
  }

  private render(): void {
    const { icon, caption } = this.composeIconAndCaption();
    this.item.text = `${icon} ${caption}`;
    this.item.tooltip = this.buildTooltip();
    this.item.backgroundColor = this.composeBackground();
    this.item.color = this.composeForeground();
    this.lastRenderedMode = this.mode;
  }

  private composeIconAndCaption(): { icon: string; caption: string } {
    if (this.state === 'error') {
      const glyph = '$(zap) $(error)';
      const msg = this.errorMessage ?? 'jito error';
      // Truncate to keep the bar tidy on narrow windows.
      const trimmed = msg.length > 40 ? msg.slice(0, 39) + '…' : msg;
      return { icon: glyph, caption: `jito: ${trimmed}` };
    }
    const label = MODE_LABEL[this.mode];
    let icon: string;
    if (this.state === 'streaming') {
      // VS Code's built-in spin for the streaming pulse; on the off-phase
      // we swap to a static zap so the alternation reads as a glow halo.
      icon = this.pulsePhase === 0 ? '$(loading~spin)' : '$(zap)';
    } else {
      icon = '$(zap)';
    }
    const caption =
      this.state === 'streaming'
        ? `jito: ${label} · streaming`
        : `jito: ${label}`;
    return { icon, caption };
  }

  private composeBackground(): vscode.ThemeColor | undefined {
    if (this.state === 'error') return ERROR_BG;
    if (this.state === 'streaming') {
      // Halo alternation: even = mode-tinted bg, odd = transparent.
      return this.pulsePhase === 0
        ? new vscode.ThemeColor(MODE_BG_COLOR_ID[this.mode])
        : undefined;
    }
    // During a mode-flash, keep the prominent bg so the foreground tint
    // remains readable. Steady-state idle leaves bg undefined (theme-default).
    if (this.flashTimer) return PROMINENT_BG;
    return undefined;
  }

  private composeForeground(): vscode.ThemeColor {
    if (this.state === 'error') return MAGENTA_FG;
    if (this.flashTimer) return new vscode.ThemeColor(MODE_FG_COLOR_ID[this.mode]);
    return NEUTRAL_FG;
  }

  private buildTooltip(): vscode.MarkdownString {
    const label = MODE_LABEL[this.mode];
    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportHtml = true;
    md.appendMarkdown(`**jito — ${label} mode**\n\n`);
    if (this.errorMessage) {
      md.appendMarkdown(`⚠️ ${this.errorMessage}\n\n`);
    } else if (this.state === 'streaming') {
      md.appendMarkdown(`_Streaming response…_\n\n`);
    } else {
      md.appendMarkdown(
        `Click to switch mode · 5 modes: dev · reason · create · audit · universal\n\n`,
      );
    }
    md.appendMarkdown(`---\n`);
    md.appendMarkdown(
      `$(zap) jito · $(loading~spin) streaming · $(error) error\n`,
    );
    return md;
  }
}