/**
 * settings.ts — VS Code configuration wrapper + SecretStorage for API key
 */

import * as vscode from 'vscode';
import { JitoMode } from './jito-client';

const SECRET_KEY = 'jito-ide.apiKey';

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
    await vscode.commands.executeCommand('workbench.action.openSettings', 'jito-ide');
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
