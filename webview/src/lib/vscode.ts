/**
 * vscode.ts — thin wrapper around the VS Code webview API
 */

declare const acquireVsCodeApi: () => {
  postMessage: (msg: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

export const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : null;

export function postToHost(type: string, payload?: unknown): void {
  vscode?.postMessage({ type, payload });
}
