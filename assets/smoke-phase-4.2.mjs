// assets/smoke-phase-4.2.mjs
// Phase 4.2 visual smoke test — render preview-phase-4.2.html via headless
// Chrome (puppeteer) and capture screenshots of the SlashPalette in its
// 6 canonical states. Validates:
//   ① Palette opens, shows all 9 commands grouped by category
//   ② Default active row is /review with preview pane populated
//   ③ Typing in the search box filters the list (e.g. "sec" → /security)
//   ④ Hover on /commit changes the preview pane
//   ⑤ Empty result state when no commands match
//   ⑥ Click outside / Escape closes the palette
//
// Usage: node assets/smoke-phase-4.2.mjs
//
// Output (all in repo-root artifacts/):
//   phase-4.2-smoke-test.png   — full preview screenshot
//   phase-4.2-default.png      — ① palette just opened
//   phase-4.2-preview.png      — ② active row + preview populated
//   phase-4.2-filtered.png     — ③ filter narrows to /security
//   phase-4.2-hover.png        — ④ hovering /commit
//   phase-4.2-empty.png        — ⑤ no match
//   phase-4.2-closed.png       — ⑥ palette closed
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
const webviewRoot = path.resolve(__dirname, '..', 'webview');
const previewPath = path.join(webviewRoot, 'preview-phase-4.2.html');
const repoRoot = path.resolve(__dirname, '..');
const artifactsDir = path.join(repoRoot, 'artifacts');

if (!existsSync(previewPath)) {
  console.error(`Preview not found at ${previewPath}`);
  process.exit(1);
}
if (!existsSync(artifactsDir)) await mkdir(artifactsDir, { recursive: true });

const fileUrl = 'file://' + previewPath;
console.log(`[smoke-phase-4.2] Loading ${fileUrl}`);

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

async function snapPalette(page, outName) {
  // The palette floats ABOVE the composer (outside the composer's bounding
  // box), so we screenshot a region that includes both: the palette's top
  // edge up through the composer's bottom edge.
  const paletteBox = await page.evaluate(() => {
    const p = document.querySelector('.palette');
    const c = document.querySelector('.composer');
    if (!p || !c) return null;
    const pr = p.getBoundingClientRect();
    const cr = c.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(pr.left, cr.left) - 8),
      y: Math.max(0, pr.top - 8),
      width: Math.max(pr.right, cr.right) - Math.min(pr.left, cr.left) + 16,
      height: (cr.bottom - pr.top) + 16,
      devicePixelRatio: window.devicePixelRatio || 1,
    };
  });
  if (!paletteBox) throw new Error('palette/composer not found');
  const outPath = path.join(artifactsDir, outName);
  await page.screenshot({
    path: outPath,
    clip: {
      x: paletteBox.x,
      y: paletteBox.y,
      width: paletteBox.width,
      height: paletteBox.height,
    },
  });
  console.log(`[smoke-phase-4.2] Saved ${outPath}`);
  return outPath;
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

  // Wait for React to mount + the palette to appear (auto-opened by the HTML).
  await page.waitForSelector('.palette', { timeout: 10000 });
  console.log('[smoke-phase-4.2] SlashPalette mounted.');
  await new Promise((r) => setTimeout(r, 200));

  // ===================================================================
  // ① Palette just opened — show all 9 commands.
  // ===================================================================
  console.log('\n[① Palette default — all 9 commands grouped]');
  let info = await page.evaluate(() => {
    const root = document.querySelector('.palette');
    const rows = Array.from(document.querySelectorAll('.palette__row'));
    const groups = Array.from(document.querySelectorAll('.palette__group-header'));
    const active = document.querySelector('.palette__row--active');
    const search = document.querySelector('.palette__search-input');
    const meta = document.querySelector('.palette__search-meta');
    const previewCmd = document.querySelector('.palette__preview-cmd');
    return {
      palettePresent: !!root,
      paletteRect: root ? {
        width: root.getBoundingClientRect().width,
        height: root.getBoundingClientRect().height,
        top: root.getBoundingClientRect().top,
        bottom: root.getBoundingClientRect().bottom,
      } : null,
      rowCount: rows.length,
      groupHeaders: groups.map((g) => g.textContent.trim()),
      activeId: active ? active.getAttribute('data-cmd-id') : null,
      activeLabel: active ? active.querySelector('.palette__row-cmd').textContent.trim() : null,
      searchFocused: document.activeElement === search,
      searchPlaceholder: search ? search.placeholder : null,
      metaText: meta ? meta.textContent.trim() : null,
      previewCmdText: previewCmd ? previewCmd.textContent.trim() : null,
      badges: Array.from(document.querySelectorAll('.palette__row-badge')).map((b) => b.textContent.trim()),
      computedBg: root ? getComputedStyle(root).backgroundColor : null,
      computedBorder: root ? getComputedStyle(root).borderColor : null,
    };
  });
  console.log('  Palette snapshot:', JSON.stringify(info, null, 2));
  assert('palette is in the DOM', info.palettePresent === true);
  assert('palette width is ~400px', info.paletteRect && info.paletteRect.width >= 380 && info.paletteRect.width <= 440,
    `width=${info.paletteRect && info.paletteRect.width}`);
  assert('palette has 9 rows (all built-ins visible)', info.rowCount === 9,
    `got ${info.rowCount}`);
  assert('4 category group headers (Code, Review, Doc, Git)', info.groupHeaders.length === 4,
    `got [${info.groupHeaders.join(', ')}]`);
  assert('Code category header is first', info.groupHeaders[0] === 'Code');
  assert('active row defaults to /review', info.activeId === 'review');
  assert('search input is auto-focused', info.searchFocused === true);
  assert('search placeholder mentions "9 commands"', /9 commands/.test(info.searchPlaceholder || ''));
  assert('meta counter shows "9/9"', info.metaText === '9/9');
  assert('preview pane shows /review label', info.previewCmdText === '/review');
  assert('palette has dark navy background', /rgb\(26,\s*31,\s*38\)/.test(info.computedBg || ''),
    `bg=${info.computedBg}`);
  await snapPalette(page, 'phase-4.2-default.png');

  // ===================================================================
  // ② Preview pane populated for active row.
  // ===================================================================
  console.log('\n[② Preview pane — /review with diff + chip]');
  info = await page.evaluate(() => {
    const desc = document.querySelector('.palette__preview-desc');
    const chip = document.querySelector('.palette__preview-chip');
    const block = document.querySelector('.palette__preview-block, .palette__preview-diff-line');
    const diffLine = document.querySelector('.palette__preview-diff-line--add');
    return {
      descText: desc ? desc.textContent.trim() : null,
      chipText: chip ? chip.textContent.trim() : null,
      blockPresent: !!block,
      diffAddPresent: !!diffLine,
    };
  });
  console.log('  Preview snapshot:', JSON.stringify(info, null, 2));
  assert('preview description present', /review/i.test(info.descText || ''));
  assert('preview has a code chip', info.chipText !== null);
  assert('preview has a code block', info.blockPresent === true);
  assert('preview has an add diff line', info.diffAddPresent === true);
  await snapPalette(page, 'phase-4.2-preview.png');

  // ===================================================================
  // ③ Filter — typing "sec" narrows the list to /security.
  // ===================================================================
  console.log('\n[③ Filter — "sec" narrows to /security]');
  await page.focus('.palette__search-input');
  // Clear any existing text first.
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('sec');
  await new Promise((r) => setTimeout(r, 150));
  info = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.palette__row'));
    const active = document.querySelector('.palette__row--active');
    const meta = document.querySelector('.palette__search-meta');
    return {
      rowCount: rows.length,
      rowIds: rows.map((r) => r.getAttribute('data-cmd-id')),
      activeId: active ? active.getAttribute('data-cmd-id') : null,
      metaText: meta ? meta.textContent.trim() : null,
    };
  });
  console.log('  Filter snapshot:', JSON.stringify(info, null, 2));
  assert('filter narrows to /security (and /review via description match)', info.rowCount === 2 && info.rowIds.includes('security') && info.rowIds.includes('review'),
    `got ${JSON.stringify(info.rowIds)}`);
  assert('meta counter shows "2/9"', info.metaText === '2/9');
  assert('active row stays /review (first in flat order)', info.activeId === 'review');
  await snapPalette(page, 'phase-4.2-filtered.png');

  // ===================================================================
  // ④ Hover on a different row changes the preview pane.
  // ===================================================================
  console.log('\n[④ Hover — click /commit and check preview changes]');
  // Clear search
  await page.focus('.palette__search-input');
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await new Promise((r) => setTimeout(r, 100));
  // Hover /commit row using real puppeteer hover (don't click — clicking
// would invoke onSelect and close the palette). Real mouse hover triggers
// React's onMouseEnter reliably.
  const commitRow = await page.$('.palette__row[data-cmd-id="commit"]');
  if (commitRow) {
    const box = await commitRow.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  info = await page.evaluate(() => {
    const previewCmd = document.querySelector('.palette__preview-cmd');
    const block = document.querySelector('.palette__preview-block');
    return {
      previewCmd: previewCmd ? previewCmd.textContent.trim() : null,
      blockText: block ? block.textContent.slice(0, 80) : null,
    };
  });
  console.log('  Hover snapshot:', JSON.stringify(info, null, 2));
  assert('hovering /commit changes preview to /commit', info.previewCmd === '/commit',
    `got ${info.previewCmd}`);
  assert('preview shows Conventional Commit example', /feat\(/.test(info.blockText || ''),
    `block=${info.blockText}`);
  await snapPalette(page, 'phase-4.2-hover.png');

  // ===================================================================
  // ⑤ Empty result — type something that matches nothing.
  // ===================================================================
  console.log('\n[⑤ Empty result — "zzz"]');
  await page.focus('.palette__search-input');
  await page.keyboard.type('zzz');
  await new Promise((r) => setTimeout(r, 150));
  info = await page.evaluate(() => {
    const empty = document.querySelector('.palette__empty');
    const meta = document.querySelector('.palette__search-meta');
    return {
      emptyPresent: !!empty,
      emptyText: empty ? empty.textContent.trim() : null,
      metaText: meta ? meta.textContent.trim() : null,
    };
  });
  console.log('  Empty snapshot:', JSON.stringify(info, null, 2));
  assert('empty state is shown for "zzz"', info.emptyPresent === true);
  assert('meta counter shows "0/9"', info.metaText === '0/9');
  await snapPalette(page, 'phase-4.2-empty.png');

  // ===================================================================
  // ⑥ Escape closes the palette.
  // ===================================================================
  console.log('\n[⑥ Escape closes palette]');
  await page.focus('.palette__search-input');
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 200));
  const paletteStillThere = await page.evaluate(() => !!document.querySelector('.palette'));
  assert('palette is closed after Escape', paletteStillThere === false);
  // Snap a "composer with no palette" for documentation.
  // Snap a "composer with no palette" for documentation.
  const composerHandle = await page.$('.composer');
  const composerBox = await composerHandle.boundingBox();
  await page.screenshot({
    path: path.join(artifactsDir, 'phase-4.2-closed.png'),
    clip: composerBox,
  });

  // ===================================================================
  // Final — full preview screenshot for the README.
  // ===================================================================
  console.log('\n[Final — reopen + snap full preview]');
  await page.evaluate(() => {
    const btn = document.querySelector('.composer__tool-btn[aria-label="Open slash commands"]');
    if (btn) btn.click();
  });
  await page.waitForSelector('.palette', { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: path.join(artifactsDir, 'phase-4.2-smoke-test.png'), fullPage: false });

  // ---- Summary -------------------------------------------------------
  const failed = assertions.filter((a) => !a.ok);
  console.log(`\n[smoke-phase-4.2] ${assertions.length - failed.length}/${assertions.length} assertions passed.`);
  if (consoleErrors.length > 0) {
    console.log('Console errors/warnings:');
    for (const err of consoleErrors) console.log('  ' + err);
  }
  if (failed.length > 0 || consoleErrors.length > 0) {
    console.log('\n[smoke-phase-4.2] ❌ FAILED');
    process.exit(1);
  } else {
    console.log('\n[smoke-phase-4.2] ✅ PASSED');
  }
} finally {
  await browser.close();
}