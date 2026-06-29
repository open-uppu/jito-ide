/**
 * jito-ide — Extension entry point
 *
 * Multi-mode AI agent for VS Code. Thin client that wraps jito v0.2.0 CLI
 * as backend subprocess. 5 first-class modes (dev/reason/create/audit/universal).
 *
 * Architecture:
 *   Extension host (this file) → jito subprocess → Minimax-M3 API
 *                          ↘ webview (React UI for chat + mode switcher)
 */

import * as vscode from 'vscode';
import { JitoClient } from './jito-client';
import { ChatPanel } from './chat-panel';
import { ModeSwitcherProvider } from './mode-switcher';
import { FileContextProvider } from './file-context';
import { StatusBar } from './status-bar';
import { ContextLoader } from './context-loader';
import { InlineEdit } from './inline-edit';
import { Settings } from './settings';
import { SettingsUiPanel } from './settings-ui';

let jitoClient: JitoClient;
let chatPanel: ChatPanel;
let modeSwitcher: ModeSwitcherProvider;
let fileContext: FileContextProvider;
let statusBar: StatusBar;
let contextLoader: ContextLoader;
let inlineEdit: InlineEdit;
let settings: Settings;
let settingsUi: SettingsUiPanel;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('[jito-ide] activating…');

  settings = new Settings(context);

  // Verify jito v0.2.0 is available
  const jitoPath = settings.getJitoPath();
  jitoClient = new JitoClient({
    binaryPath: jitoPath,
    apiKey: await settings.getApiKey(),
    onError: (err) => {
      vscode.window.showErrorMessage(`[jito] ${err.message}`);
      statusBar.setError(err.message);
    },
    onEvent: (event) => {
      statusBar.handleEvent(event);
    },
  });

  try {
    await jitoClient.verify();
    console.log('[jito-ide] jito binary verified');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showWarningMessage(
      `[jito-ide] jito binary not found at "${jitoPath}". ` +
        `Install jito v0.2.0 or set "jito-ide.jitoPath" in settings. ` +
        `Extension will run in degraded mode.`
    );
    console.warn(`[jito-ide] jito verification failed: ${msg}`);
  }

  // Initialize components
  contextLoader = new ContextLoader();
  statusBar = new StatusBar();
  modeSwitcher = new ModeSwitcherProvider(context.extensionUri, settings, jitoClient);
  fileContext = new FileContextProvider(context.extensionUri);
  chatPanel = new ChatPanel(
    context.extensionUri,
    jitoClient,
    settings,
    contextLoader,
    fileContext
  );
  inlineEdit = new InlineEdit(jitoClient, settings);
  // Phase 3.5 — full settings UI in a webview tab (replaces native settings).
  settingsUi = new SettingsUiPanel(context.extensionUri, settings);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('jito-ide.openChat', () => chatPanel.open()),
    vscode.commands.registerCommand('jito-ide.switchMode', () => modeSwitcher.show()),
    vscode.commands.registerCommand('jito-ide.inlineEdit', () => inlineEdit.trigger()),
    vscode.commands.registerCommand('jito-ide.addFileContext', (uri: vscode.Uri) =>
      fileContext.addFile(uri)
    ),
    vscode.commands.registerCommand('jito-ide.openSettings', () => settingsUi.open())
  );

  // Register webview providers
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('jito-ide.modeSwitcher', modeSwitcher),
    vscode.window.registerWebviewViewProvider('jito-ide.fileContext', fileContext)
  );

  statusBar.setReady();
  console.log('[jito-ide] activated ✅');
}

export function deactivate(): void {
  console.log('[jito-ide] deactivating…');
  jitoClient?.dispose();
  chatPanel?.dispose();
  statusBar?.dispose();
}
