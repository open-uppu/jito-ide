/**
 * mode-switcher.ts — Sidebar webview for switching 5 modes
 */

import * as vscode from 'vscode';
import { JitoClient, JitoMode } from './jito-client';
import { Settings } from './settings';

const MODES: { id: JitoMode; label: string; icon: string; description: string }[] = [
  { id: 'dev', label: 'Dev', icon: '⚙️', description: 'Senior SWE — coding, refactor, debug' },
  { id: 'reason', label: 'Reason', icon: '🧠', description: 'Strategic planner — architecture, decisions' },
  { id: 'create', label: 'Create', icon: '🎨', description: 'Creative writer — marketing, copy' },
  { id: 'audit', label: 'Audit', icon: '🛡️', description: 'Security reviewer — OWASP, secrets, compliance' },
  { id: 'universal', label: 'Universal', icon: '🌐', description: 'Catch-all default' },
];

export class ModeSwitcherProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | null = null;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly settings: Settings,
    private readonly jito: JitoClient
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'webview', 'dist')],
    };
    webviewView.webview.html = this.getHtml();
    webviewView.webview.onDidReceiveMessage((msg) => this.handleMessage(msg));
  }

  show(): void {
    this.view?.show();
  }

  private handleMessage(msg: { type: string; payload?: { mode: JitoMode } }): void {
    if (msg.type === 'selectMode' && msg.payload) {
      this.jito.setMode(msg.payload.mode);
      this.settings.setDefaultMode(msg.payload.mode);
      this.view?.webview.postMessage({ type: 'modeChanged', payload: { mode: msg.payload.mode } });
    }
  }

  private getHtml(): string {
    const current = this.settings.getDefaultMode();
    const rows = MODES.map(
      (m) => `
      <div class="mode-row ${m.id === current ? 'active' : ''}" data-mode="${m.id}">
        <div class="mode-icon">${m.icon}</div>
        <div class="mode-info">
          <div class="mode-label">${m.label}</div>
          <div class="mode-desc">${m.description}</div>
        </div>
      </div>`
    ).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <style>
    body { font-family: var(--vscode-font-family); padding: 8px; color: var(--vscode-foreground); }
    .mode-row { display: flex; padding: 10px 8px; border-radius: 6px; cursor: pointer; margin: 4px 0; }
    .mode-row:hover { background: var(--vscode-list-hoverBackground); }
    .mode-row.active { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
    .mode-icon { font-size: 20px; margin-right: 10px; }
    .mode-label { font-weight: 600; font-size: 13px; }
    .mode-desc { font-size: 11px; opacity: 0.7; margin-top: 2px; }
  </style>
</head>
<body>
  <h3 style="margin: 0 0 8px 0; font-size: 13px; opacity: 0.8;">Mode</h3>
  ${rows}
  <script>
    const vscode = acquireVsCodeApi();
    document.querySelectorAll('.mode-row').forEach((row) => {
      row.addEventListener('click', () => {
        const mode = row.dataset.mode;
        vscode.postMessage({ type: 'selectMode', payload: { mode } });
      });
    });
    window.addEventListener('message', (e) => {
      if (e.data.type === 'modeChanged') {
        document.querySelectorAll('.mode-row').forEach((r) => r.classList.remove('active'));
        document.querySelector('[data-mode="' + e.data.payload.mode + '"]')?.classList.add('active');
      }
    });
  </script>
</body>
</html>`;
  }
}
