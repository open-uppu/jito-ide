/**
 * inline-edit.ts — Ctrl+K inline edit (placeholder for v0.2.0)
 */

import * as vscode from 'vscode';
import { JitoClient, JitoMode } from './jito-client';
import { Settings } from './settings';

export class InlineEdit {
  constructor(
    private readonly jito: JitoClient,
    private readonly settings: Settings
  ) {}

  async trigger(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor');
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    if (!selectedText) {
      vscode.window.showInformationMessage('Select code first');
      return;
    }

    const prompt = await vscode.window.showInputBox({
      prompt: 'What do you want to do with the selected code?',
      placeHolder: 'e.g. refactor to use async/await',
    });
    if (!prompt) return;

    const mode: JitoMode = this.settings.getDefaultMode();
    const fullPrompt = `Inline edit task:\n\`\`\`\n${selectedText}\n\`\`\`\n\nInstruction: ${prompt}\n\nReturn the edited code in a single fenced block.`;

    const msg = await vscode.window.showInformationMessage(
      `Inline edit in ${mode} mode…`,
      { modal: false }
    );

    const collected: string[] = [];
    const listener = (event: { type: string; id: string; text?: string }) => {
      if (event.type === 'delta' && event.text) collected.push(event.text);
    };
    this.jito.on('message.delta', listener);

    try {
      await this.jito.chat(fullPrompt, { mode });
      // Wait for end event — in real impl use a Promise
      await new Promise((r) => setTimeout(r, 5000));
    } finally {
      this.jito.off('message.delta', listener);
    }

    // For now, show output in new doc (TODO: diff preview in v0.2.0)
    const doc = await vscode.workspace.openTextDocument({
      content: collected.join(''),
      language: editor.document.languageId,
    });
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
  }
}
