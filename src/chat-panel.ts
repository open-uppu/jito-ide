/**
 * chat-panel.ts — Right-side chat webview
 *
 * Hosts the React chat UI. Communicates with extension host via postMessage.
 * Streams responses from jito subprocess to the webview.
 */

import * as vscode from 'vscode';
import { JitoClient, JitoEvent, JitoMode } from './jito-client';
import { Settings } from './settings';
import { ContextLoader } from './context-loader';
import { FileContextProvider } from './file-context';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  mode?: JitoMode;
  timestamp: number;
  streaming?: boolean;
}

export class ChatPanel {
  private panel: vscode.WebviewPanel | null = null;
  private messages: ChatMessage[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly jito: JitoClient,
    private readonly settings: Settings,
    private readonly contextLoader: ContextLoader,
    private readonly fileContext: FileContextProvider
  ) {
    this.jito.onEvent((event) => this.handleJitoEvent(event));
  }

  open(): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'jito-ide.chat',
      'jito ⚡ Chat',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'webview', 'dist')],
      }
    );

    this.panel.webview.html = this.getHtml();
    this.panel.webview.onDidReceiveMessage((msg) => this.handleWebviewMessage(msg));
    this.panel.onDidDispose(() => (this.panel = null));
  }

  private async handleWebviewMessage(msg: { type: string; payload: unknown }): Promise<void> {
    switch (msg.type) {
      case 'send':
        await this.sendMessage(msg.payload as { text: string; mode: JitoMode });
        break;
      case 'cancel':
        this.jito.cancel((msg.payload as { id: string }).id);
        break;
      case 'clear':
        this.messages = [];
        this.postToWebview({ type: 'history', payload: this.messages });
        break;
      case 'loadContext':
        const ctx = await this.contextLoader.loadAll();
        this.postToWebview({ type: 'context', payload: ctx });
        break;
    }
  }

  private async sendMessage(payload: { text: string; mode: JitoMode }): Promise<void> {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: payload.text,
      mode: payload.mode,
      timestamp: Date.now(),
    };
    this.messages.push(userMsg);
    this.postToWebview({ type: 'message', payload: userMsg });

    // Resolve @file mentions
    const files = this.fileContext.getFiles();
    const contextFiles = files.map((f) => f.path);

    const assistantMsg: ChatMessage = {
      id: `asst-${Date.now()}`,
      role: 'assistant',
      content: '',
      mode: payload.mode,
      timestamp: Date.now(),
      streaming: true,
    };
    this.messages.push(assistantMsg);
    this.postToWebview({ type: 'message', payload: assistantMsg });

    const jitoMsgId = await this.jito.chat(payload.text, {
      mode: payload.mode,
      contextFiles,
    });

    assistantMsg.id = jitoMsgId;
  }

  private handleJitoEvent(event: JitoEvent): void {
    const lastMsg = this.messages[this.messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant') return;

    switch (event.type) {
      case 'start':
        lastMsg.id = event.id;
        this.postToWebview({ type: 'messageUpdate', payload: { id: event.id, streaming: true } });
        break;
      case 'delta':
        lastMsg.content += event.text ?? '';
        this.postToWebview({
          type: 'messageUpdate',
          payload: { id: event.id, content: lastMsg.content, append: false },
        });
        break;
      case 'end':
        lastMsg.streaming = false;
        this.postToWebview({
          type: 'messageUpdate',
          payload: { id: event.id, content: lastMsg.content, streaming: false, usage: event.usage },
        });
        break;
      case 'error':
        lastMsg.content += `\n\n⚠️ Error: ${event.error?.message ?? 'unknown'}`;
        lastMsg.streaming = false;
        this.postToWebview({
          type: 'messageUpdate',
          payload: { id: event.id, content: lastMsg.content, streaming: false, error: true },
        });
        break;
    }
  }

  private postToWebview(msg: { type: string; payload: unknown }): void {
    this.panel?.webview.postMessage(msg);
  }

  private getHtml(): string {
    // Webview loads bundled React app from webview/dist/
    const scriptUri = this.panel!.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'webview', 'dist', 'assets', 'index.js')
    );
    const styleUri = this.panel!.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'webview', 'dist', 'assets', 'index.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${this.panel!.webview.cspSource}; style-src ${this.panel!.webview.cspSource} 'unsafe-inline';">
  <link rel="stylesheet" href="${styleUri}">
  <title>jito ⚡ Chat</title>
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
