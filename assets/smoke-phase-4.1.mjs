// assets/smoke-phase-4.1.mjs
// Phase 4.1 visual smoke test — render preview-phase-4.1.html via headless
// Chrome (puppeteer) and capture screenshots of the redesigned Composer in
// multiple states. Validates:
//   ① Empty placeholder + send button disabled
//   ② Send button enabled (cyan + glow) once text is typed
//   ③ Multi-line auto-expansion (4 lines of text)
//   ④ Max-line cap (14 lines → internal scroll kicks in at 12)
//   ⑤ Slash-command palette open from toolbar
//   ⑥ Disabled (host busy) state
//   ⑦ Char counter > 8000 chars → warning colour
//
// Usage: NODE_PATH=$(npm root -g) node assets/smoke-phase-4.1.mjs
//
// Output (all in repo-root artifacts/):
//   phase-4.1-smoke-test.png       — full preview screenshot
//   phase-4.1-empty.png            — ① empty state
//   phase-4.1-with-text.png        — ② with-text state
//   phase-4.1-multi-line.png       — ③ multi-line state
//   phase-4.1-max-cap.png          — ④ max-cap state
//   phase-4.1-palette.png          — ⑤ slash palette open
//   phase-4.1-disabled.png         — ⑥ disabled state
//   phase-4.1-counter-warn.png     — ⑦ char-counter warn colour
//
// Exit code 0 on success, non-zero on any console errors or assertion fail.

import { createRequire } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let puppeteer;
try {
  puppeteer = await import('puppeteer');
} catch {
  const globalRoot = require('child_process')
    .execSync('npm root -g').toString().trim();
  puppeteer = require(path.join(globalRoot, 'puppeteer'));
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webviewRoot = '/home/up-ubuntu/wokrspace/open-uppu/jito-ide/webview';
const previewPath = path.join(webviewRoot, 'preview-phase-4.1.html');
// The artifact dir lives at the workspace agent root, not the repo root.
const repoRoot = path.resolve(__dirname, '..', '..');
const artifactsDir = path.join(repoRoot, 'artifacts');

if (!existsSync(previewPath)) {
  console.error(`Preview not found at ${previewPath}`);
  process.exit(1);
}
if (!existsSync(artifactsDir)) await mkdir(artifactsDir, { recursive: true });

const fileUrl = 'file://' + previewPath;
console.log(`[smoke-phase-4.1] Loading ${fileUrl}`);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const consoleErrors = [];
const assertions = [];

function assert(name, ok, detail = '') {
  assertions.push({ name, ok, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 900, deviceScaleFactor: 2 });

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(`[pageerror] ${err.message}`);
  });

  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 20000 });
  await page.evaluate(() => document.fonts.ready);
  // Wait for React to mount + the Composer to be in the DOM.
  await page.waitForSelector('.composer', { timeout: 10000 });
  console.log('[smoke-phase-4.1] App mounted.');

  // -- Helper: snapshot a single Composer surface clipped to its bounding box.
  async function snapComposer(outName) {
    const handle = await page.$('.composer');
    if (!handle) throw new Error('.composer not found');
    const outPath = path.join(artifactsDir, outName);
    await handle.screenshot({ path: outPath });
    console.log(`[smoke-phase-4.1] Saved ${outPath}`);
    return outPath;
  }

  // -- Helper: clear the textarea and reset state.
  async function resetComposer() {
    await page.evaluate(() => {
      const ta = document.querySelector('.composer__textarea');
      if (ta) {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        ).set;
        setter.call(ta, '');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // Close the palette if it's open.
      const slashBtn = document.querySelector('.composer__tool-btn[aria-label="Open slash commands"]');
      if (slashBtn && slashBtn.getAttribute('aria-expanded') === 'true') {
        slashBtn.click();
      }
    });
    await new Promise((r) => setTimeout(r, 50));
  }

  // ===================================================================
  // ① Empty state
  // ===================================================================
  console.log('\n[① Empty state]');
  await resetComposer();

  let info = await page.evaluate(() => {
    const sendBtn = document.querySelector('.composer__send');
    const textarea = document.querySelector('.composer__textarea');
    const counter = document.querySelector('.composer__counter');
    const miniPill = document.querySelector('.composer__mini-pill');
    const slashBtn = document.querySelector('.composer__tool-btn[aria-label="Open slash commands"]');
    const attachBtn = document.querySelector('.composer__tool-btn[aria-label="Attach file"]');
    return {
      sendDisabled: sendBtn ? sendBtn.disabled : null,
      sendGlow: sendBtn ? getComputedStyle(sendBtn).boxShadow !== 'none' : false,
      placeholder: textarea ? textarea.placeholder.slice(0, 60) : null,
      counterText: counter ? counter.textContent.trim() : null,
      counterWarn: counter ? counter.classList.contains('composer__counter--warn') : false,
      miniPillText: miniPill ? miniPill.textContent.replace(/\s+/g, ' ').trim() : null,
      hasSlashBtn: !!slashBtn,
      hasAttachBtn: !!attachBtn,
      composerBorderTop: (() => {
        const c = document.querySelector('.composer');
        if (!c) return null;
        return getComputedStyle(c).borderTopColor;
      })(),
      composerBg: (() => {
        const c = document.querySelector('.composer');
        if (!c) return null;
        return getComputedStyle(c).backgroundColor;
      })(),
    };
  });
  console.log('  Composer snapshot:', JSON.stringify(info, null, 2));
  assert('send button is disabled when empty', info.sendDisabled === true);
  assert('placeholder includes "Cmd+Enter" hint', /Cmd\+Enter/.test(info.placeholder || ''));
  assert('char counter shows "0 chars"', info.counterText === '0 chars');
  assert('char counter is not in warn state', info.counterWarn === false);
  assert('MiniModePill visible with Dev mode', /Dev/.test(info.miniPillText || ''));
  assert('slash toolbar button present', info.hasSlashBtn === true);
  assert('attach toolbar button present', info.hasAttachBtn === true);
  await snapComposer('phase-4.1-empty.png');

  // ===================================================================
  // ② With text — single line, send enabled with cyan glow.
  // ===================================================================
  console.log('\n[② With text — single line]');
  await resetComposer();
  await page.focus('.composer__textarea');
  await page.keyboard.type('Refactor the auth middleware to use JWT.');
  await new Promise((r) => setTimeout(r, 80));

  info = await page.evaluate(() => {
    const sendBtn = document.querySelector('.composer__send');
    const counter = document.querySelector('.composer__counter');
    const textarea = document.querySelector('.composer__textarea');
    return {
      sendDisabled: sendBtn ? sendBtn.disabled : null,
      sendGlow: sendBtn ? getComputedStyle(sendBtn).boxShadow.includes('rgb') : false,
      counterText: counter ? counter.textContent.trim() : null,
      textareaHeight: textarea ? textarea.getBoundingClientRect().height : 0,
    };
  });
  console.log('  Composer snapshot:', JSON.stringify(info, null, 2));
  assert('send button enabled when text present', info.sendDisabled === false);
  assert('send button has cyan glow', info.sendGlow === true);
  assert('char counter updated to typed length', /^\d+ chars$/.test(info.counterText || '') && info.counterText !== '0 chars');
  assert('textarea is single-line height (~30-40px incl. padding)', info.textareaHeight >= 28 && info.textareaHeight <= 45);
  await snapComposer('phase-4.1-with-text.png');

  // ===================================================================
  // ③ Multi-line — 4 lines, auto-expanded.
  // ===================================================================
  console.log('\n[③ Multi-line (4 lines)]');
  await resetComposer();
  const multilineText = [
    'Line 1: refactor the auth middleware',
    'Line 2: introduce JWT verification',
    'Line 3: keep the legacy fallback path',
    'Line 4: write unit tests for both branches',
  ].join('\n');
  await page.focus('.composer__textarea');
  await page.keyboard.type(multilineText);
  await new Promise((r) => setTimeout(r, 100));

  info = await page.evaluate(() => {
    const textarea = document.querySelector('.composer__textarea');
    const counter = document.querySelector('.composer__counter');
    return {
      textareaHeight: textarea ? textarea.getBoundingClientRect().height : 0,
      lineCount: textarea ? textarea.value.split('\n').length : 0,
      counterText: counter ? counter.textContent.trim() : null,
    };
  });
  console.log('  Composer snapshot:', JSON.stringify(info, null, 2));
  assert('textarea has 4 lines', info.lineCount === 4);
  assert(
    'textarea height grew beyond single-line (~60-90px)',
    info.textareaHeight >= 60 && info.textareaHeight <= 100,
    `got ${info.textareaHeight}px`,
  );
  await snapComposer('phase-4.1-multi-line.png');

  // ===================================================================
  // ④ Max line cap — 14 lines, internal scroll kicks in past 12.
  // ===================================================================
  console.log('\n[④ Max line cap (14 lines)]');
  await resetComposer();
  const fourteenLines = Array.from({ length: 14 }, (_, i) => `Line ${i + 1}: lorem ipsum dolor sit amet`).join('\n');
  await page.evaluate((text) => {
    const ta = document.querySelector('.composer__textarea');
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    ).set;
    setter.call(ta, text);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }, fourteenLines);
  await new Promise((r) => setTimeout(r, 100));

  info = await page.evaluate(() => {
    const textarea = document.querySelector('.composer__textarea');
    const computed = getComputedStyle(textarea);
    return {
      textareaHeight: textarea.getBoundingClientRect().height,
      overflowY: computed.overflowY,
      lineCount: textarea.value.split('\n').length,
    };
  });
  console.log('  Composer snapshot:', JSON.stringify(info, null, 2));
  // Cap is MAX_LINES=12 lines × 20px = 240px.
  assert(
    'textarea height capped at ~240px (12 lines × 20px)',
    info.overflowY === 'auto' && info.textareaHeight >= 235 && info.textareaHeight <= 250,
    `overflowY=${info.overflowY}, height=${info.textareaHeight}`,
  );
  await snapComposer('phase-4.1-max-cap.png');

  // ===================================================================
  // ⑤ Slash palette open
  // ===================================================================
  console.log('\n[⑤ Slash palette open]');
  await resetComposer();
  await page.click('.composer__tool-btn[aria-label="Open slash commands"]');
  await new Promise((r) => setTimeout(r, 80));

  info = await page.evaluate(() => {
    const palette = document.querySelector('.composer__palette');
    const items = document.querySelectorAll('.composer__palette-item');
    const slashBtn = document.querySelector('.composer__tool-btn[aria-label="Open slash commands"]');
    return {
      paletteVisible: !!palette && palette.getBoundingClientRect().height > 0,
      paletteItems: items.length,
      firstItemCmd: items[0] ? items[0].querySelector('.composer__palette-cmd').textContent.trim() : null,
      slashBtnExpanded: slashBtn ? slashBtn.getAttribute('aria-expanded') : null,
    };
  });
  console.log('  Composer snapshot:', JSON.stringify(info, null, 2));
  assert('palette visible after toolbar click', info.paletteVisible === true);
  assert('palette has 5 slash commands', info.paletteItems === 5);
  assert('first palette item is /review', info.firstItemCmd === '/review');
  assert('slash button aria-expanded=true', info.slashBtnExpanded === 'true');
  // Take a focused clip on the palette itself (it floats above the toolbar).
  const paletteBox = await page.evaluate(() => {
    const p = document.querySelector('.composer__palette');
    if (!p) return null;
    const r = p.getBoundingClientRect();
    return { x: r.x - 4, y: r.y - 4, width: r.width + 8, height: r.height + 8 };
  });
  const palettePath = path.join(artifactsDir, 'phase-4.1-palette.png');
  if (paletteBox) {
    await page.screenshot({ path: palettePath, clip: paletteBox });
  } else {
    // Fallback to a wide clip.
    const composerBox = await page.evaluate(() => {
      const c = document.querySelector('.composer');
      const r = c.getBoundingClientRect();
      return { x: r.x - 8, y: r.y - 280, width: r.width + 16, height: r.height + 280 };
    });
    await page.screenshot({ path: palettePath, clip: composerBox });
  }
  console.log(`[smoke-phase-4.1] Saved ${palettePath}`);

  // ===================================================================
  // ⑤b Keyboard shortcut: Cmd+Enter sends (observable side-effects only —
  // postToHost is captured at module-load so we can't swap the mock API
  // mid-session. Instead we verify the textarea clears + send button re-
  // disables after the keypress, both of which only happen inside the
  // Composer's handleSend callback.)
  // ===================================================================
  console.log('\n[⑤b Cmd+Enter keyboard shortcut]');
  await resetComposer();
  await page.focus('.composer__textarea');
  await page.keyboard.type('hello via keyboard');
  await new Promise((r) => setTimeout(r, 60));

  let before = await page.evaluate(() => ({
    text: document.querySelector('.composer__textarea').value,
    sendDisabled: document.querySelector('.composer__send').disabled,
    counter: document.querySelector('.composer__counter').textContent.trim(),
  }));
  console.log('  Before Cmd+Enter:', JSON.stringify(before));
  assert('textarea has typed text before send', before.text === 'hello via keyboard');
  assert('send button enabled before send', before.sendDisabled === false);

  // Trigger Cmd+Enter.
  await page.keyboard.down('Meta');
  await page.keyboard.press('Enter');
  await page.keyboard.up('Meta');
  await new Promise((r) => setTimeout(r, 120));

  const after = await page.evaluate(() => ({
    text: document.querySelector('.composer__textarea').value,
    sendDisabled: document.querySelector('.composer__send').disabled,
    counter: document.querySelector('.composer__counter').textContent.trim(),
  }));
  console.log('  After Cmd+Enter:', JSON.stringify(after));
  assert('Cmd+Enter cleared the textarea', after.text === '');
  assert('Cmd+Enter re-disabled send button (text empty)', after.sendDisabled === true);
  assert('Cmd+Enter reset char counter to 0', after.counter === '0 chars');
  // Also screenshot this state for the artifact set.
  await snapComposer('phase-4.1-cmd-enter.png');

  // ===================================================================
  // ⑥ Disabled (host busy) — real busy state via the mock host echo.
  // ===================================================================
  console.log('\n[⑥ Disabled (host busy)]');
  await resetComposer();
  await page.focus('.composer__textarea');
  await page.keyboard.type('hi');
  await new Promise((r) => setTimeout(r, 60));
  // Click the send button — the mock host echoes it back as a user message,
  // which flips App.busy=true and the Composer's `disabled` prop on.
  await page.click('.composer__send');
  await new Promise((r) => setTimeout(r, 150));

  info = await page.evaluate(() => {
    const textarea = document.querySelector('.composer__textarea');
    const sendBtn = document.querySelector('.composer__send');
    const hint = document.querySelector('.composer__hint');
    return {
      textareaDisabled: textarea ? textarea.disabled : null,
      sendDisabled: sendBtn ? sendBtn.disabled : null,
      hintText: hint ? hint.textContent.trim() : null,
    };
  });
  console.log('  Composer snapshot:', JSON.stringify(info, null, 2));
  assert('textarea disabled when host busy', info.textareaDisabled === true);
  assert('send button disabled when host busy', info.sendDisabled === true);
  assert('hint reads "jito is replying…" while busy', info.hintText === 'jito is replying…');
  await snapComposer('phase-4.1-disabled.png');

  // ===================================================================
  // ⑦ Char counter warning threshold (>8000)
  // ===================================================================
  console.log('\n[⑦ Char counter warn (>8000)]');
  await resetComposer();
  // Reload to undo the manual disabled attribute above.
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.composer', { timeout: 10000 });

  const longText = 'x'.repeat(8500);
  await page.evaluate((text) => {
    const ta = document.querySelector('.composer__textarea');
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    ).set;
    setter.call(ta, text);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }, longText);
  await new Promise((r) => setTimeout(r, 100));

  info = await page.evaluate(() => {
    const counter = document.querySelector('.composer__counter');
    return {
      counterText: counter ? counter.textContent.trim() : null,
      counterWarn: counter ? counter.classList.contains('composer__counter--warn') : false,
    };
  });
  console.log('  Composer snapshot:', JSON.stringify(info, null, 2));
  assert('char counter shows 8,500 chars', info.counterText === '8,500 chars');
  assert('char counter is in warn state', info.counterWarn === true);
  await snapComposer('phase-4.1-counter-warn.png');

  // ===================================================================
  // Full preview screenshot (the empty initial render).
  // ===================================================================
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.composer', { timeout: 10000 });
  const fullPath = path.join(artifactsDir, 'phase-4.1-smoke-test.png');
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`[smoke-phase-4.1] Saved ${fullPath}`);

  // ===================================================================
  // Final summary
  // ===================================================================
  const failed = assertions.filter((a) => !a.ok);
  console.log(`\n[smoke-phase-4.1] Assertions: ${assertions.length - failed.length}/${assertions.length} passed`);
  if (consoleErrors.length > 0) {
    console.warn('[smoke-phase-4.1] Console errors:');
    consoleErrors.forEach((e) => console.warn('  ' + e));
  }

  await browser.close();
  if (failed.length > 0) {
    console.error('[smoke-phase-4.1] FAILED');
    process.exit(1);
  }
  if (consoleErrors.length > 0) {
    console.error('[smoke-phase-4.1] FAILED (console errors)');
    process.exit(2);
  }
  console.log('[smoke-phase-4.1] GREEN ✅');
  process.exit(0);
} catch (err) {
  console.error('[smoke-phase-4.1] Fatal:', err);
  await browser.close().catch(() => {});
  process.exit(3);
}