/**
 * main.tsx — Webview entry point (Phase 3.5 view-routing)
 *
 * Hosts two views via the same bundle:
 *   - 'chat' (default): the chat panel (App.tsx)
 *   - 'settings': the SettingsPage webview (SettingsPage.tsx)
 *
 * The active view is set by the host panel's HTML before the bundle loads
 * (see src/settings-ui.ts getHtml()) via window.__JITO_VIEW__.
 * The chat panel does not set the flag, so it defaults to 'chat'.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { SettingsPage } from './SettingsPage';
import './index.css';

type View = 'chat' | 'settings';

const view: View =
  (typeof window !== 'undefined' && (window as unknown as { __JITO_VIEW__?: View }).__JITO_VIEW__) ||
  'chat';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>{view === 'settings' ? <SettingsPage /> : <App />}</React.StrictMode>
  );
}