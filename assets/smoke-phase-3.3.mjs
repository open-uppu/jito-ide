// assets/smoke-phase-3.3.mjs
// Phase 3.3 visual smoke test — render preview-phase-3.3.html via headless
// Chrome (puppeteer) and save screenshots. The preview exercises the new
// webview-side status-bar styles (idle, streaming, error, mode-flash,
// app-footer retrofitted) so a clean render here validates the CSS.
//
// Usage: NODE_PATH=$(npm root -g) node assets/smoke-phase-3.3.mjs
//
// Output:
//   artifacts/phase-3.3-smoke-test.png    — full preview screenshot
//   artifacts/phase-3.3-states-zoom.png   — zoom on idle vs streaming states
//   artifacts/phase-3.3-flash-zoom.png    — zoom on the mode-flash timeline

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
// The preview lives in the actual repo under home/up-ubuntu/wokrspace/...
const webviewRoot = '/home/up-ubuntu/wokrspace/open-uppu/jito-ide/webview';
const previewPath = path.join(webviewRoot, 'preview-phase-3.3.html');
const repoRoot = path.resolve(__dirname, '..', '..');
const artifactsDir = path.join(repoRoot, 'artifacts');

if (!existsSync(previewPath)) {
  console.error(`Preview not found at ${previewPath}`);
  process.exit(1);
}
if (!existsSync(artifactsDir)) await mkdir(artifactsDir, { recursive: true });

const fileUrl = 'file://' + previewPath;
console.log(`[smoke-phase-3.3] Loading ${fileUrl}`);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 2200, deviceScaleFactor: 2 });

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

  // Full preview screenshot.
  const fullPath = path.join(artifactsDir, 'phase-3.3-smoke-test.png');
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`[smoke-phase-3.3] Saved ${fullPath}`);

  // Idle + streaming zoom — section 1 + 2 (the two big mode grids).
  const statesPath = path.join(artifactsDir, 'phase-3.3-states-zoom.png');
  const statesBoxes = await page.evaluate(() => {
    const sections = [...document.querySelectorAll('.section')].slice(0, 2);
    return sections.map((s) => {
      const r = s.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
  });
  if (statesBoxes.length > 0) {
    const minX = Math.min(...statesBoxes.map((b) => b.x));
    const minY = Math.min(...statesBoxes.map((b) => b.y));
    const maxX = Math.max(...statesBoxes.map((b) => b.x + b.width));
    const maxY = Math.max(...statesBoxes.map((b) => b.y + b.height));
    await page.screenshot({
      path: statesPath,
      clip: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    });
    console.log(`[smoke-phase-3.3] Saved ${statesPath}`);
  }

  // Mode-flash timeline zoom — section 4.
  const flashPath = path.join(artifactsDir, 'phase-3.3-flash-zoom.png');
  const flashHandle = await page.$('.timeline');
  if (flashHandle) {
    await flashHandle.screenshot({ path: flashPath });
    console.log(`[smoke-phase-3.3] Saved ${flashPath}`);
  }

  // App-footer zoom — section 5 (the retrofitted footer).
  const footerPath = path.join(artifactsDir, 'phase-3.3-footer-zoom.png');
  const footerSection = await page.evaluateHandle(() => {
    const h = [...document.querySelectorAll('h2')].find((e) =>
      e.textContent.includes('App footer'),
    );
    return h ? h.parentElement : null;
  });
  if (footerSection) {
    const el = footerSection.asElement();
    if (el) {
      await el.screenshot({ path: footerPath });
      console.log(`[smoke-phase-3.3] Saved ${footerPath}`);
    }
  }

  // Per-mode streaming zoom — capture each of the 5 mode streaming cards.
  const perModeDir = path.join(artifactsDir, 'phase-3.3-per-mode');
  await mkdir(perModeDir, { recursive: true });
  const cells = await page.$$('#grid-streaming .cell');
  for (let i = 0; i < cells.length; i++) {
    const modeLabel = await cells[i].$eval('h3', (h) => h.textContent.trim());
    const cellPath = path.join(perModeDir, `streaming-${i}-${modeLabel}.png`);
    await cells[i].screenshot({ path: cellPath });
    console.log(`[smoke-phase-3.3] Saved ${cellPath}`);
  }

  if (consoleErrors.length > 0) {
    console.warn(`[smoke-phase-3.3] ${consoleErrors.length} console message(s):`);
    consoleErrors.forEach((e) => console.warn('  ' + e));
  } else {
    console.log(`[smoke-phase-3.3] Clean — no console errors or warnings.`);
  }
} finally {
  await browser.close();
}