/**
 * context-loader.ts — Load JITO.md hierarchy (workspace + folders)
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

const CONTEXT_FILES = ['JITO.md', 'jito.md', '.jito/CONTEXT.md'];

export interface ContextFile {
  path: string;
  content: string;
  scope: 'workspace' | 'folder' | 'user';
}

export class ContextLoader {
  async loadAll(): Promise<ContextFile[]> {
    const files: ContextFile[] = [];

    // User-level (~/.jito/CONTEXT.md)
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
    if (home) {
      const userPath = path.join(home, '.jito', 'CONTEXT.md');
      const content = await this.tryRead(userPath);
      if (content) files.push({ path: userPath, content, scope: 'user' });
    }

    // Workspace + folder JITO.md files
    const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
    for (const folder of workspaceFolders) {
      for (const name of CONTEXT_FILES) {
        const filePath = path.join(folder.uri.fsPath, name);
        const content = await this.tryRead(filePath);
        if (content) {
          const scope = name.includes('/') ? 'folder' : 'workspace';
          files.push({ path: filePath, content, scope });
        }
      }
    }

    return files;
  }

  private async tryRead(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }
}
