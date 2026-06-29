/**
 * status-bar.ts — Status bar item showing current mode + jito status
 */

import * as vscode from 'vscode';
import { JitoEvent, JitoMode } from './jito-client';

export class StatusBar {
  private item: vscode.StatusBarItem;
  private mode: JitoMode = 'dev';
  private busy = false;
  private error: string | null = null;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'jito-ide.switchMode';
    this.item.text = '$(zap) jito: ' + this.mode;
    this.item.tooltip = 'jito-ide — click to switch mode';
    this.item.show();
  }

  setMode(mode: JitoMode): void {
    this.mode = mode;
    this.render();
  }

  setReady(): void {
    this.busy = false;
    this.error = null;
    this.render();
  }

  setError(message: string): void {
    this.error = message;
    this.render();
  }

  handleEvent(event: JitoEvent): void {
    if (event.type === 'start') {
      this.busy = true;
    } else if (event.type === 'end' || event.type === 'error') {
      this.busy = false;
    }
    this.render();
  }

  private render(): void {
    const icon = this.error ? '$(error)' : this.busy ? '$(loading~spin)' : '$(zap)';
    const state = this.error ? 'error' : this.busy ? 'busy' : this.mode;
    this.item.text = `${icon} jito: ${state}`;
    this.item.tooltip = this.error ?? `Mode: ${this.mode} — click to switch`;
    this.item.backgroundColor = this.error
      ? new vscode.ThemeColor('statusBarItem.errorBackground')
      : undefined;
  }

  dispose(): void {
    this.item.dispose();
  }
}
