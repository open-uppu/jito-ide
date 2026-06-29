/**
 * settings.ts — VS Code configuration wrapper + SecretStorage for API key
 *
 * Phase 3.5 extension: adds getModel/setModel, getTheme/setTheme,
 * hasApiKey, setTelemetry, restoreDefaults for the SettingsPage webview.
 * The API key remains in SecretStorage (encrypted) — never written to
 * VS Code configuration.
 */

import * as vscode from 'vscode';
import { JitoMode } from './jito-client';

const SECRET_KEY = 'jito-ide.apiKey';

export type ThemeChoice = 'dark' | 'light' | 'system';

export class Settings {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async getApiKey(): Promise<string | undefined> {
    // Try SecretStorage first
    const secret = await this.context.secrets.get(SECRET_KEY);
    if (secret) return secret;
    // Fallback to settings (less secure but works in dev)
    return this.get<string>('apiKey') || undefined;
  }

  async setApiKey(key: string): Promise<void> {
    await this.context.secrets.store(SECRET_KEY, key);
  }

  /** True iff a non-empty API key is stored in SecretStorage (or config fallback). */
  async hasApiKey(): Promise<boolean> {
    const k = await this.getApiKey();
    return typeof k === 'string' && k.length > 0;
  }

  /** LLM model identifier passed to the jito subprocess. */
  getModel(): string {
    return this.get<string>('model') || 'minimax/MiniMax-M3';
  }

  async setModel(model: string): Promise<void> {
    await this.set('model', model);
  }

  /** Visual theme (dark-first brand). */
  getTheme(): ThemeChoice {
    const t = this.get<string>('theme') || 'dark';
    if (t === 'dark' || t === 'light' || t === 'system') return t;
    return 'dark';
  }

  async setTheme(theme: ThemeChoice): Promise<void> {
    await this.set('theme', theme);
  }

  async setTelemetry(enabled: boolean): Promise<void> {
    await this.set('telemetry', enabled);
  }

  getJitoPath(): string {
    return this.get<string>('jitoPath') ?? 'jito';
  }

  getDefaultMode(): JitoMode {
    const mode = this.get<string>('defaultMode') ?? 'dev';
    if (['dev', 'reason', 'create', 'audit', 'universal'].includes(mode)) {
      return mode as JitoMode;
    }
    return 'dev';
  }

  async setDefaultMode(mode: JitoMode): Promise<void> {
    await this.set('defaultMode', mode);
  }

  getTelemetry(): boolean {
    return this.get<boolean>('telemetry') ?? false;
  }

  getMaxContextFiles(): number {
    return this.get<number>('maxContextFiles') ?? 20;
  }

  async openSettingsUi(): Promise<void> {
    // Kept for backward compatibility — delegates to the webview panel
    // opened via the SettingsUiPanel registered by extension.ts.
    await vscode.commands.executeCommand('jito-ide.openSettings');
  }

  /** Restore all non-secret settings to their defaults (does NOT touch API key). */
  async restoreDefaults(): Promise<void> {
    await this.setModel('minimax/MiniMax-M3');
    await this.setDefaultMode('dev');
    await this.setTelemetry(false);
    await this.setTheme('dark');
  }

  private get<T>(key: string): T | undefined {
    return vscode.workspace.getConfiguration('jito-ide').get<T>(key);
  }

  private async set(key: string, value: unknown): Promise<void> {
    await vscode.workspace
      .getConfiguration('jito-ide')
      .update(key, value, vscode.ConfigurationTarget.Global);
  }
}
