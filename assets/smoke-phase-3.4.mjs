// assets/smoke-phase-3.4.mjs
// Phase 3.4 visual smoke test — render preview-phase-3.4.html via headless
// Chrome (puppeteer) and save screenshots. The preview exercises the new
// MessageCard component with curated mock messages covering every render
// branch (user / assistant / streaming / error / per-mode colors / markdown
// body / code-block highlighting / footer metadata).
//
// Usage: NODE_PATH=$(npm root -g) node assets/smoke-phase-3.4.mjs
//
// Output:
//   artifacts/phase-3.4-smoke-test.png       — full chat timeline
//   artifacts/phase-3.4-card-zoom.png        — zoom on the dev-mode assistant card
//   artifacts/phase-3.4-streaming-zoom.png   — zoom on the streaming card with Stop button
//   artifacts/phase-3.4-error-zoom.png       — zoom on the error card

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
// The preview lives in the actual repo under /home/up-ubuntu/wokrspace/...
const webviewRoot = '/home/up-ubuntu/wokrspace/open-uppu/jito-ide/webview';
const previewPath = path.join(webviewRoot, 'preview-phase-3.4.html');
const repoRoot = path.resolve(__dirname, '..', '..');
const artifactsDir = path.join(repoRoot, 'artifacts');

if (!existsSync(previewPath)) {
  console.error(`Preview not found at ${previewPath}`);
  process.exit(1);
}
if (!existsSync(artifactsDir)) await mkdir(artifactsDir, { recursive: true });

const fileUrl = 'file://' + previewPath;
console.log(`[smoke-phase-3.4] Loading ${fileUrl}`);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 2400, deviceScaleFactor: 2 });

  const consoleErrors = [];
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

  // Give React a moment to dispatch the mocked history event after bundle
  // load (the preview sets a 30ms setTimeout for the dispatch).
  await new Promise((r) => setTimeout(r, 250));

  // ---- Count MessageCards and capture per-card data ----
  const cardStats = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-testid="message-card"]')];
    return cards.map((c) => ({
      role: c.getAttribute('data-role'),
      mode: c.getAttribute('data-mode'),
      streaming: c.getAttribute('data-streaming'),
      hasFooter: !!c.querySelector('footer'),
      hasStop: !!c.querySelector('button'),
    }));
  });
  console.log(
    `[smoke-phase-3.4] MessageCard inventory:`,
    JSON.stringify(cardStats, null, 2)
  );

  // ---- Full preview screenshot ----
  const fullPath = path.join(artifactsDir, 'phase-3.4-smoke-test.png');
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`[smoke-phase-3.4] Saved ${fullPath}`);

  // ---- Zoom on the dev-mode assistant card (the canonical target) ----
  const cardPath = path.join(artifactsDir, 'phase-3.4-card-zoom.png');
  const cardHandle = await page.$('[data-testid="message-card"][data-mode="dev"]');
  if (cardHandle) {
    await cardHandle.screenshot({ path: cardPath });
    console.log(`[smoke-phase-3.4] Saved ${cardPath}`);
  } else {
    console.warn(`[smoke-phase-3.4] Dev-mode card not found, skipping zoom`);
  }

  // ---- Zoom on the streaming card (Stop button visible) ----
  const streamPath = path.join(artifactsDir, 'phase-3.4-streaming-zoom.png');
  const streamHandle = await page.$(
    '[data-testid="message-card"][data-streaming="true"]'
  );
  if (streamHandle) {
    await streamHandle.screenshot({ path: streamPath });
    console.log(`[smoke-phase-3.4] Saved ${streamPath}`);
  } else {
    console.warn(`[smoke-phase-3.4] Streaming card not found, skipping zoom`);
  }

  // ---- Zoom on the error card ----
  const errPath = path.join(artifactsDir, 'phase-3.4-error-zoom.png');
  const errBoxes = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-testid="message-card"]')];
    const idx = cards.findIndex((c) => c.classList.contains('message-card--error'));
    if (idx < 0) return null;
    const r = cards[idx].getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  if (errBoxes) {
    await page.screenshot({ path: errPath, clip: errBoxes });
    console.log(`[smoke-phase-3.4] Saved ${errPath}`);
  } else {
    console.warn(`[smoke-phase-3.4] Error card not found, skipping zoom`);
  }

  // ---- Per-mode palette zoom (one card per mode, side by side) ----
  // Helps the CEO compare mode-color stripes at a glance.
  const palettePath = path.join(artifactsDir, 'phase-3.4-palette.png');
  const paletteBoxes = await page.evaluate(() => {
    const wanted = ['dev', 'reason', 'create', 'audit'];
    const cards = [...document.querySelectorAll('[data-testid="message-card"]')];
    return wanted
      .map((m) => cards.find((c) => c.getAttribute('data-mode') === m))
      .filter((c) => !!c)
      .map((c) => {
        const r = c.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
  });
  if (paletteBoxes.length > 0) {
    const minX = Math.min(...paletteBoxes.map((b) => b.x));
    const minY = Math.min(...paletteBoxes.map((b) => b.y));
    const maxX = Math.max(...paletteBoxes.map((b) => b.x + b.width));
    const maxY = Math.max(...paletteBoxes.map((b) => b.y + b.height));
    // Include some surrounding padding so the stripes read clearly.
    const pad = 16;
    await page.screenshot({
      path: palettePath,
      clip: {
        x: Math.max(0, minX - pad),
        y: Math.max(0, minY - pad),
        width: Math.min(1100 - minX, maxX - minX + pad * 2),
        height: maxY - minY + pad * 2,
      },
    });
    console.log(`[smoke-phase-3.4] Saved ${palettePath}`);
  }

  if (consoleErrors.length > 0) {
    console.warn(`[smoke-phase-3.4] Console issues:\n${consoleErrors.join('\n')}`);
  } else {
    console.log(`[smoke-phase-3.4] No console errors.`);
  }

  // ---- Sanity assertions ----
  const fail = [];
  if (cardStats.length < 5) fail.push(`Expected ≥5 cards, got ${cardStats.length}`);
  const devCard = cardStats.find((c) => c.mode === 'dev' && c.role === 'assistant');
  if (!devCard) fail.push(`Missing dev-mode assistant card`);
  else if (!devCard.hasFooter) fail.push(`Dev-mode card missing footer metadata`);
  const streaming = cardStats.find((c) => c.streaming === 'true');
  if (!streaming) fail.push(`Missing streaming card`);
  else if (!streaming.hasStop) fail.push(`Streaming card missing Stop button`);
  const errorCard = cardStats.find((c) => c.role === 'assistant' && c.hasFooter !== undefined && cardStats.findIndex(c2 => c2.mode === 'audit') >= 0);
  const auditCard = cardStats.find((c) => c.mode === 'audit');
  if (!auditCard) fail.push(`Missing audit-mode card (for error state)`);

  if (fail.length > 0) {
    console.error(`[smoke-phase-3.4] FAILED:\n  - ${fail.join('\n  - ')}`);
    process.exitCode = 1;
  } else {
    console.log(`[smoke-phase-3.4] All assertions passed.`);
  }
} finally {
  await browser.close();
}