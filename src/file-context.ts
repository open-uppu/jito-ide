/**
 * file-context.ts — Track files added to chat context via @file mentions
 */

import * as vscode from 'vscode';

interface ContextFile {
  path: string;
  displayName: string;
  addedAt: number;
}

export class FileContextProvider implements vscode.WebviewViewProvider {
  private files: ContextFile[] = [];
  private view: vscode.WebviewView | null = null;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtml();
    webviewView.webview.onDidReceiveMessage((msg) => this.handleMessage(msg));
    this.refresh();
  }

  addFile(uri: vscode.Uri): void {
    if (this.files.find((f) => f.path === uri.fsPath)) return;
    this.files.push({
      path: uri.fsPath,
      displayName: uri.fsPath.split('/').pop() ?? uri.fsPath,
      addedAt: Date.now(),
    });
    this.refresh();
  }

  getFiles(): ContextFile[] {
    return this.files;
  }

  clear(): void {
    this.files = [];
    this.refresh();
  }

  private handleMessage(msg: { type: string; payload?: { path: string } }): void {
    if (msg.type === 'remove' && msg.payload) {
      this.files = this.files.filter((f) => f.path !== msg.payload!.path);
      this.refresh();
    } else if (msg.type === 'clear') {
      this.clear();
    }
  }

  private refresh(): void {
    this.view?.webview.postMessage({ type: 'files', payload: this.files });
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <style>
    body { font-family: var(--vscode-font-family); padding: 8px; color: var(--vscode-foreground); font-size: 12px; }
    .empty { opacity: 0.5; font-style: italic; }
    .file { display: flex; align-items: center; padding: 4px 6px; border-radius: 4px; }
    .file:hover { background: var(--vscode-list-hoverBackground); }
    .file-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-remove { opacity: 0.5; cursor: pointer; padding: 0 4px; }
    .file-remove:hover { opacity: 1; }
    .actions { margin-top: 8px; text-align: right; }
    .btn { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px; }
  </style>
</head>
<body>
  <h3 style="margin: 0 0 8px 0; font-size: 13px; opacity: 0.8;">File Context</h3>
  <div id="files"></div>
  <div class="actions"><button class="btn" id="clear">Clear all</button></div>
  <script>
    const vscode = acquireVsCodeApi();
    const list = document.getElementById('files');
    function render(files) {
      if (!files.length) {
        list.innerHTML = '<div class="empty">No files. Right-click in editor → "jito: Add File to Context"</div>';
        return;
      }
      list.innerHTML = files.map(f =>
        '<div class="file" data-path="' + f.path + '"><div class="file-name">' + f.displayName + '</div><div class="file-remove" data-action="remove">×</div></div>'
      ).join('');
    }
    list.addEventListener('click', (e) => {
      const t = e.target;
      if (t.dataset.action === 'remove') {
        vscode.postMessage({ type: 'remove', payload: { path: t.parentElement.dataset.path } });
      }
    });
    document.getElementById('clear').addEventListener('click', () => vscode.postMessage({ type: 'clear' }));
    window.addEventListener('message', (e) => { if (e.data.type === 'files') render(e.data.payload); });
  </script>
</body>
</html>`;
  }
}
