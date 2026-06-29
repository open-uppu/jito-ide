/**
 * settings-ui.ts — Extension host wrapper for the SettingsPage webview (Phase 3.5)
 *
 * Opens a new editor tab (vscode.WebviewPanel) hosting the React SettingsPage.
 * Two-way IPC with the webview:
 *
 *   ← host:    { type: 'load' }                               — initial fetch
 *   ← host:    { type: 'submit', payload: FormPayload }       — save
 *   ← host:    { type: 'reset' }                              — restore defaults
 *   ← host:    { type: 'openExternal', payload: { url } }     — open link in browser
 *
 *   → webview: { type: 'state', payload: SettingsState }      — load response
 *   → webview: { type: 'saveResult', payload: { ok, error? } } — save feedback
 *
 * SECURITY: The API key never crosses IPC unless the user explicitly submits a
 * new value (webview → host). The host → webview direction only carries
 * `apiKeySet: boolean`. This preserves SecretStorage as the source of truth.
 */

import * as vscode from 'vscode';
import { JitoMode } from './jito-client';
import { Settings, ThemeChoice } from './settings';

// Mirrors the webview type but kept here to avoid pulling React into the host.
interface FormPayload {
  apiKey?: string;          // undefined = no change
  model: string;
  defaultMode: JitoMode;
  telemetry: boolean;
  theme: ThemeChoice;
}

interface SettingsState {
  apiKeySet: boolean;
  model: string;
  defaultMode: JitoMode;
  telemetry: boolean;
  theme: ThemeChoice;
}

const DEFAULTS = {
  model: 'minimax/MiniMax-M3',
  defaultMode: 'dev' as JitoMode,
  telemetry: false,
  theme: 'dark' as ThemeChoice,
};

export class SettingsUiPanel {
  private panel: vscode.WebviewPanel | null = null;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly settings: Settings
  ) {}

  /** Open (or reveal if already open) the settings panel. */
  open(): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'jito-ide.settings',
      'jito ⚡ Settings',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'webview', 'dist')],
      }
    );

    this.panel.iconPath = vscode.Uri.joinPath(this.extensionUri, 'assets', 'logo-mark.svg');
    this.panel.webview.html = this.getHtml();
    this.panel.webview.onDidReceiveMessage((msg) => this.handleMessage(msg));
    this.panel.onDidDispose(() => {
      this.panel = null;
    });
  }

  private async handleMessage(msg: { type: string; payload?: unknown }): Promise<void> {
    if (!this.panel) return;
    try {
      switch (msg.type) {
        case 'load':
          await this.sendState();
          break;
        case 'submit':
          await this.save(msg.payload as FormPayload);
          break;
        case 'reset':
          await this.restoreDefaults();
          break;
        case 'openExternal': {
          const { url } = (msg.payload as { url: string }) || {};
          if (url && /^https?:\/\//.test(url)) {
            await vscode.env.openExternal(vscode.Uri.parse(url));
          }
          break;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[jito-ide settings-ui] handler error:', message);
      this.post({ type: 'saveResult', payload: { ok: false, error: message } });
    }
  }

  private async sendState(): Promise<void> {
    const apiKeySet = await this.settings.hasApiKey();
    const state: SettingsState = {
      apiKeySet,
      model: this.settings.getModel(),
      defaultMode: this.settings.getDefaultMode(),
      telemetry: this.settings.getTelemetry(),
      theme: this.settings.getTheme(),
    };
    this.post({ type: 'state', payload: state });
  }

  private async save(payload: FormPayload): Promise<void> {
    // Validate inputs
    if (!payload || typeof payload !== 'object') {
      this.post({ type: 'saveResult', payload: { ok: false, error: 'Invalid payload' } });
      return;
    }
    const validModes: JitoMode[] = ['dev', 'reason', 'create', 'audit', 'universal'];
    if (!validModes.includes(payload.defaultMode)) {
      this.post({ type: 'saveResult', payload: { ok: false, error: `Invalid mode: ${payload.defaultMode}` } });
      return;
    }
    const validThemes: ThemeChoice[] = ['dark', 'light', 'system'];
    if (!validThemes.includes(payload.theme)) {
      this.post({ type: 'saveResult', payload: { ok: false, error: `Invalid theme: ${payload.theme}` } });
      return;
    }
    if (typeof payload.model !== 'string' || payload.model.trim().length === 0) {
      this.post({ type: 'saveResult', payload: { ok: false, error: 'Model cannot be empty' } });
      return;
    }

    // API key → SecretStorage (only if user typed one)
    if (payload.apiKey !== undefined && payload.apiKey !== null && payload.apiKey !== '') {
      await this.settings.setApiKey(payload.apiKey);
    }

    // Other settings → VS Code configuration
    await this.settings.setModel(payload.model.trim());
    await this.settings.setDefaultMode(payload.defaultMode);
    await this.settings.setTelemetry(Boolean(payload.telemetry));
    await this.settings.setTheme(payload.theme);

    this.post({ type: 'saveResult', payload: { ok: true } });
    // Re-broadcast so apiKeySet reflects the new state.
    await this.sendState();
  }

  private async restoreDefaults(): Promise<void> {
    await this.settings.setModel(DEFAULTS.model);
    await this.settings.setDefaultMode(DEFAULTS.defaultMode);
    await this.settings.setTelemetry(DEFAULTS.telemetry);
    await this.settings.setTheme(DEFAULTS.theme);
    // NOTE: we do NOT delete the API key — too destructive.
    await this.sendState();
  }

  private post(msg: { type: string; payload: unknown }): void {
    this.panel?.webview.postMessage(msg);
  }

  private getHtml(): string {
    const webview = this.panel!.webview;
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'webview', 'dist', 'assets', 'index.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'webview', 'dist', 'assets', 'index.css')
    );

    // The view-flag tells main.tsx to render SettingsPage instead of App.
    // We set it on `window` BEFORE loading the bundle so the script sees it.
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource} https://fonts.gstatic.com;">
  <link rel="stylesheet" href="${styleUri}">
  <title>jito ⚡ Settings</title>
  <script>
    // Tag this webview so the bundled main.tsx renders SettingsPage instead of App.
    window.__JITO_VIEW__ = 'settings';
  </script>
</head>
<body>
  <div id="root"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }

  dispose(): void {
    this.panel?.dispose();
    this.panel = null;
  }
}