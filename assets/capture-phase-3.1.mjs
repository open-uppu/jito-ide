// assets/capture-phase-3.1.mjs
// Phase 3.1 — HeroHeader visual smoke test (jito-ide v0.2.0)
//
// Renders preview-phase-3.1.html in headless Chrome and saves three
// screenshots to artifacts/. Used for the Phase 3.1 workboard proof.
//
// Run: node assets/capture-phase-3.1.mjs

import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const puppeteer = require('/home/up-ubuntu/.nvm/versions/node/v24.13.1/lib/node_modules/puppeteer');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webviewRoot = path.resolve(__dirname, '..', 'webview');
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'artifacts');

if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const errs = [];
function logErr(prefix, msg) {
  errs.push(`[${prefix}] ${msg}`);
  console.log(`  ⚠ [${prefix}] ${msg}`);
}

const NAV_TIMEOUT = 30000;
const RENDER_WAIT = 1800;

async function newPage(w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  page.on('console', (m) => { if (m.type() === 'error') logErr('console', m.text()); });
  page.on('pageerror', (e) => logErr('pageerror', e.message));
  return page;
}

async function loadFile(page, rel) {
  const url = 'file://' + path.join(webviewRoot, rel);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: NAV_TIMEOUT });
  await new Promise((r) => setTimeout(r, RENDER_WAIT));
}

async function shotPreview() {
  console.log('[1/3] phase-3.1-preview.png — preview at 1080px');
  const page = await newPage(1080, 1800);
  await loadFile(page, 'preview-phase-3.1.html');
  const out = path.join(outDir, 'phase-3.1-preview.png');
  await page.screenshot({ path: out, fullPage: true });
  console.log('  ✓', out);
  await page.close();
}

async function shotNarrow() {
  console.log('[2/3] phase-3.1-narrow.png — preview at 280px (responsive)');
  const page = await newPage(280, 1200);
  await loadFile(page, 'preview-phase-3.1.html');
  const out = path.join(outDir, 'phase-3.1-narrow.png');
  await page.screenshot({ path: out, fullPage: true });
  console.log('  ✓', out);
  await page.close();
}

async function shotZoom() {
  console.log('[3/3] phase-3.1-zoom.png — first .hero-header zoom');
  const page = await newPage(800, 240);
  await loadFile(page, 'preview-phase-3.1.html');
  const clip = await page.evaluate(() => {
    const h = document.querySelector('.hero-header');
    if (!h) return null;
    const r = h.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  if (!clip) {
    logErr('zoom', 'no .hero-header found');
    await page.close();
    return;
  }
  const out = path.join(outDir, 'phase-3.1-zoom.png');
  await page.screenshot({ path: out, clip });
  console.log('  ✓', out);
  await page.close();
}

try {
  await shotPreview();
  await shotNarrow();
  await shotZoom();
  console.log(`\n✓ Phase 3.1 smoke screenshots → ${outDir}`);
  if (errs.length) {
    console.log(`\n⚠ ${errs.length} console/page errors during run:`);
    errs.forEach((e) => console.log('   ' + e));
  }
} finally {
  await browser.close();
}