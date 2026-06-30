// assets/smoke-phase-5.2.mjs
// Phase 5.2 LAUNCH ASSETS — headless puppeteer harness that drives the
// multi-scene preview-phase-5.2.html and captures the six deliverables the
// launch depends on:
//
//   assets/screenshots/chat.png         — empty chat panel + hero header
//   assets/screenshots/modes.png        — mode switcher in active state (3 modes cropped)
//   assets/screenshots/slash.png        — slash palette open with /test selected
//   assets/screenshots/settings.png     — SettingsPage (all 6 sections)
//   assets/demo.gif                     — 12-frame animated demo (≤ 5 MB)
//   assets/og-banner.png                — social card 1200x630 (jito ⚡ + tagline + 5 modes)
//
// Usage: NODE_PATH=$(npm root -g) node assets/smoke-phase-5.2.mjs
//
// Exit code 0 on success, non-zero on any console errors or assertion failure.

import { createRequire } from 'node:module';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let puppeteer;
try {
  puppeteer = await import('puppeteer');
} catch {
  const globalRoot = require('child_process')
    .execSync('npm root -g')
    .toString()
    .trim();
  puppeteer = require(path.join(globalRoot, 'puppeteer'));
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webviewRoot = '/home/up-ubuntu/wokrspace/open-uppu/jito-ide/webview';
const previewPath = path.join(webviewRoot, 'preview-phase-5.2.html');
const repoRoot = path.resolve(__dirname, '..');
const screenshotsDir = path.join(repoRoot, 'assets', 'screenshots');
const artifactsDir = path.join(repoRoot, 'artifacts');
const framesDir = path.join(artifactsDir, 'phase-5.2-frames');

if (!existsSync(previewPath)) {
  console.error(`Preview not found at ${previewPath}`);
  process.exit(1);
}
if (!existsSync(screenshotsDir)) await mkdir(screenshotsDir, { recursive: true });
if (!existsSync(artifactsDir)) await mkdir(artifactsDir, { recursive: true });
if (!existsSync(framesDir)) await mkdir(framesDir, { recursive: true });

const previewUrl = (scene, extra = '') =>
  'file://' + previewPath + '?scene=' + encodeURIComponent(scene) + (extra ? '&' + extra : '');

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

async function newChatPage() {
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 900, deviceScaleFactor: 2 });
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(`[pageerror] ${err.message}`);
  });
  return page;
}

async function loadScene(page, scene, extra = '') {
  await page.goto(previewUrl(scene, extra), { waitUntil: 'networkidle0', timeout: 20000 });
  await page.evaluate(() => document.fonts.ready);
  // Give React a tick to mount.
  await new Promise((r) => setTimeout(r, 200));
}

try {
  // =====================================================================
  // 1) assets/screenshots/chat.png — empty chat panel with hero header
  // =====================================================================
  console.log('\n[① chat.png]');
  {
    const page = await newChatPage();
    await loadScene(page, 'chat', 'skipOnboarding=1');
    await page.waitForSelector('.brand-mark', { timeout: 8000 });
    await page.waitForSelector('.composer', { timeout: 8000 });
    // Expand the page width a touch so the hero header has air to breathe.
    await page.setViewport({ width: 1100, height: 800, deviceScaleFactor: 2 });
    await new Promise((r) => setTimeout(r, 150));
    const out = path.join(screenshotsDir, 'chat.png');
    await page.screenshot({ path: out });
    const stat = require('node:fs').statSync(out);
    console.log(`  → ${path.relative(repoRoot, out)} (${(stat.size / 1024).toFixed(1)} KB)`);
    assert('chat.png has .brand-mark', !!(await page.$('.brand-mark')));
    assert('chat.png has .composer (empty state placeholder visible)',
      !!(await page.$('.message-list')) ||
        // fallback: composer at minimum
        !!(await page.$('.composer')),
    );
    assert('chat.png file > 30 KB', stat.size > 30 * 1024,
      `actual=${(stat.size / 1024).toFixed(1)} KB`);
    await page.close();
  }

  // =====================================================================
  // 2) assets/screenshots/modes.png — mode switcher active state (3 modes)
  // =====================================================================
  // Interpretation: crop a tight 3-mode-wide slice of the .mode-selector
  // (Dev | Reason | Create), with "Dev" in the active-state treatment.
  console.log('\n[② modes.png]');
  {
    const page = await newChatPage();
    await loadScene(page, 'modes', 'mode=dev&skipOnboarding=1');
    await page.waitForSelector('.mode-selector', { timeout: 8000 });
    // Find the .mode-selector rect and clip to the first 3 buttons.
    const clip = await page.evaluate(() => {
      const selector = document.querySelector('.mode-selector');
      const buttons = selector ? Array.from(selector.querySelectorAll('.mode-selector__btn')) : [];
      if (buttons.length < 3) throw new Error('Expected >=3 mode buttons, got ' + buttons.length);
      const firstThree = buttons.slice(0, 3);
      const leftRect = firstThree[0].getBoundingClientRect();
      const rightRect = firstThree[2].getBoundingClientRect();
      const pad = 24;
      const top = Math.max(0, leftRect.top - pad);
      const height = (rightRect.bottom - leftRect.top) + pad * 2;
      return {
        x: Math.max(0, leftRect.left - pad),
        y: top,
        width: (rightRect.right - leftRect.left) + pad * 2,
        height,
      };
    });
    const out = path.join(screenshotsDir, 'modes.png');
    await page.screenshot({ path: out, clip });
    const stat = require('node:fs').statSync(out);
    console.log(`  → ${path.relative(repoRoot, out)} (${(stat.size / 1024).toFixed(1)} KB, ${clip.width}x${clip.height})`);
    const activeCount = await page.evaluate(() =>
      document.querySelectorAll('.mode-selector__btn--active').length,
    );
    assert('modes.png has exactly 1 active mode button', activeCount === 1,
      `activeCount=${activeCount}`);
    assert('modes.png file > 6 KB', stat.size > 6 * 1024,
      `actual=${(stat.size / 1024).toFixed(1)} KB`);
    await page.close();
  }

  // =====================================================================
  // 3) assets/screenshots/slash.png — slash palette open with /test selected
  // =====================================================================
  console.log('\n[③ slash.png]');
  {
    const page = await newChatPage();
    await loadScene(page, 'slash', 'palette=1&focusIdx=1&skipOnboarding=1');
    await page.waitForSelector('.composer', { timeout: 8000 });
    // Programmatically click the slash button + highlight /test as selected.
    await page.evaluate(() => {
      const btn = document.querySelector('.composer__tool-btn[aria-label="Open slash commands"]');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 120));
    // Patch DOM to mark /test as visually selected (the bundle only adds
    // aria-selected on actual click in the React tree; for screenshot we
    // set both aria-selected + a class).
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.composer__palette-item'));
      items.forEach((el) => {
        const cmd = el.querySelector('.composer__palette-cmd');
        if (cmd && cmd.textContent.trim() === '/test') {
          el.setAttribute('aria-selected', 'true');
          el.classList.add('composer__palette-item--selected');
        }
      });
    });
    await new Promise((r) => setTimeout(r, 80));
    // Snapshot the composer surface + the overlaid slash palette above it.
    // The palette is position:absolute; bottom:calc(100% + var(--space-1)),
    // so it floats above the composer — we need a wider clip.
    const slashClip = await page.evaluate(() => {
      const palette = document.querySelector('.composer__palette');
      const composer = document.querySelector('.composer');
      if (!palette || !composer) throw new Error('palette or composer missing');
      const pr = palette.getBoundingClientRect();
      const cr = composer.getBoundingClientRect();
      const pad = 16;
      return {
        x: Math.max(0, Math.min(pr.left, cr.left) - pad),
        y: Math.max(0, pr.top - pad),
        width: Math.max(pr.right, cr.right) - Math.min(pr.left, cr.left) + pad * 2,
        height: (cr.bottom - pr.top) + pad * 2,
      };
    });
    const out = path.join(screenshotsDir, 'slash.png');
    await page.screenshot({ path: out, clip: slashClip });
    const stat = require('node:fs').statSync(out);
    console.log(`  → ${path.relative(repoRoot, out)} (${(stat.size / 1024).toFixed(1)} KB)`);
    const paletteCount = await page.evaluate(() =>
      document.querySelectorAll('.composer__palette-item').length,
    );
    assert('slash.png palette has 5 commands', paletteCount === 5,
      `paletteCount=${paletteCount}`);
    assert('slash.png file > 10 KB', stat.size > 10 * 1024,
      `actual=${(stat.size / 1024).toFixed(1)} KB`);
    await page.close();
  }

  // =====================================================================
  // 4) assets/screenshots/settings.png — SettingsPage with all sections
  // =====================================================================
  console.log('\n[④ settings.png]');
  {
    const page = await newChatPage();
    await page.setViewport({ width: 1000, height: 1300, deviceScaleFactor: 2 });
    await loadScene(page, 'settings');
    await page.waitForSelector('.settings-card', { timeout: 8000 });
    // Give the page a beat for entrance animations + footer.
    await new Promise((r) => setTimeout(r, 250));
    // Full-page screenshot so the entire settings page is captured.
    const out = path.join(screenshotsDir, 'settings.png');
    await page.screenshot({ path: out, fullPage: true });
    const stat = require('node:fs').statSync(out);
    console.log(`  → ${path.relative(repoRoot, out)} (${(stat.size / 1024).toFixed(1)} KB)`);
    const sectionCount = await page.evaluate(() =>
      document.querySelectorAll('.settings-card').length,
    );
    assert('settings.png has all 6 sections', sectionCount === 6,
      `sectionCount=${sectionCount}`);
    assert('settings.png file > 30 KB', stat.size > 30 * 1024,
      `actual=${(stat.size / 1024).toFixed(1)} KB`);
    await page.close();
  }

  // =====================================================================
  // 5) assets/og-banner.png — 1200x630 social card (jito ⚡ + tagline + 5
  //    modes) — captures the standalone og-stage via the same preview.
  // =====================================================================
  console.log('\n[⑤ og-banner.png]');
  {
    const page = await newChatPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
    await loadScene(page, 'og-banner');
    // Wait for the og-stage layout to be ready.
    await page.waitForSelector('#og-stage', { timeout: 5000 });
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 200));
    const stage = await page.$('#og-stage');
    if (!stage) throw new Error('#og-stage missing for og-banner');
    const out = path.join(repoRoot, 'assets', 'og-banner.png');
    await stage.screenshot({ path: out });
    const stat = require('node:fs').statSync(out);
    console.log(`  → ${path.relative(repoRoot, out)} (${(stat.size / 1024).toFixed(1)} KB)`);
    const sizes = await page.evaluate(() => {
      const el = document.getElementById('og-stage');
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });
    assert('og-banner.png is 1200x630 (CSS pixels @ 2x)',
      sizes.w === 1200 && sizes.h === 630, `actual=${sizes.w}x${sizes.h}`);
    const chipCount = await page.evaluate(() =>
      document.querySelectorAll('#og-stage__modes .og-chip').length,
    );
    assert('og-banner.png shows all 5 mode chips', chipCount === 5,
      `chipCount=${chipCount}`);
    assert('og-banner.png file > 60 KB', stat.size > 60 * 1024,
      `actual=${(stat.size / 1024).toFixed(1)} KB`);
    await page.close();
  }

  // =====================================================================
  // 6) assets/demo.gif — animated 12-frame demo (chat → mode → slash →
  //    stream). Frames are captured via the chat page, then ffmpeg stitches.
  // =====================================================================
  console.log('\n[⑥ demo.gif]');
  {
    const page = await newChatPage();
    await page.setViewport({ width: 1100, height: 800, deviceScaleFactor: 1 });
    await loadScene(page, 'chat', 'mode=reason&skipOnboarding=1');
    await page.waitForSelector('.composer', { timeout: 8000 });

    const FRAMES = 12;
    const FPS = 8; // 12 frames @ 8fps ≈ 1.5s per loop cycle.
    const LOOPS = 20; // 1.5s × 20 ≈ 30s total (matches card deliverable spec).

    // Helper: capture the chat viewport region.
    async function snap(n) {
      const out = path.join(framesDir, `frame-${String(n).padStart(2, '0')}.png`);
      await page.screenshot({ path: out });
      return out;
    }

    // -- Frame 1: empty chat panel hero header.
    await page.evaluate(() => {
      // Reset messages via the same mock bus the App listens to.
      window.__MOCK__.fire({ type: 'history', payload: [] });
    });
    await new Promise((r) => setTimeout(r, 80));
    await snap(1);

    // -- Frame 2: type a question into the composer.
    await page.focus('.composer__textarea');
    await page.keyboard.type(
      'Refactor loader.ts into 3 pure functions and add inline docs.',
      { delay: 6 },
    );
    await new Promise((r) => setTimeout(r, 100));
    await snap(2);

    // -- Frame 3: switch to dev mode (open the mode pill cycle via clicks).
    await page.evaluate(() => {
      const root = document.documentElement;
      root.setAttribute('data-mode', 'dev');
      const modeBtns = Array.from(document.querySelectorAll('.mode-selector__btn'));
      const dev = modeBtns.find((b) => b.textContent.includes('Dev'));
      if (dev) dev.click();
    });
    await new Promise((r) => setTimeout(r, 120));
    await snap(3);

    // -- Frame 4: open the slash palette via toolbar button.
    await page.evaluate(() => {
      const btn = document.querySelector('.composer__tool-btn[aria-label="Open slash commands"]');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 120));
    await snap(4);

    // -- Frame 5: select /refactor (highlight as chosen) and close palette.
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.composer__palette-item'));
      items.forEach((el) => {
        const cmd = el.querySelector('.composer__palette-cmd');
        if (cmd && cmd.textContent.trim() === '/refactor') {
          el.setAttribute('aria-selected', 'true');
          el.classList.add('composer__palette-item--selected');
        }
      });
      window.__MOCK__.fire({
        type: 'message',
        payload: {
          id: 'u1',
          role: 'user',
          content: '/refactor loader.ts',
          mode: 'dev',
          timestamp: Date.now(),
        },
      });
    });
    await new Promise((r) => setTimeout(r, 200));
    await snap(5);

    // -- Frame 6: assistant streaming begins (first half of reply).
    await page.evaluate(() => {
      window.__MOCK__.fire({
        type: 'messageUpdate',
        payload: {
          id: 'a1',
          content: 'Splitting loader.ts into 3 pure functions (parseConfig, ' +
            'resolveData, mount). Hoisting the threshold constant and adding a ' +
            'typed Options interface…',
          streaming: true,
          startedAt: Date.now(),
        },
      });
    });
    await new Promise((r) => setTimeout(r, 200));
    await snap(6);

    // -- Frame 7: streaming middle (~70% of reply).
    await page.evaluate(() => {
      window.__MOCK__.fire({
        type: 'messageUpdate',
        payload: {
          id: 'a1',
          content:
            'Splitting loader.ts into 3 pure functions (parseConfig, resolveData, mount). ' +
            'Hoisting the threshold constant and adding a typed Options interface so ' +
            'callers stop reaching into the module-level cache. The retry/backoff ' +
            'contract is also being documented inline at the top of each function —',
          streaming: true,
        },
      });
    });
    await new Promise((r) => setTimeout(r, 200));
    await snap(7);

    // -- Frame 8: reply complete + token + latency footer.
    await page.evaluate(() => {
      window.__MOCK__.fire({
        type: 'messageUpdate',
        payload: {
          id: 'a1',
          content:
            'Splitting loader.ts into 3 pure functions (parseConfig, resolveData, mount).\n\n' +
            '1. **parseConfig** — raw input → typed `Options`.\n' +
            '2. **resolveData** — typed `Options` → fetched/derived dataset.\n' +
            '3. **mount** — dataset → bound view-models.\n\n' +
            'Each step throws a typed error and is unit-testable in isolation. Want me to ship the patch?',
          streaming: false,
          endedAt: Date.now(),
          usage: { input_tokens: 87, output_tokens: 142 },
        },
      });
    });
    await new Promise((r) => setTimeout(r, 220));
    await snap(8);

    // -- Frame 9: switch mode to audit (showcases the switcher again).
    await page.evaluate(() => {
      const modeBtns = Array.from(document.querySelectorAll('.mode-selector__btn'));
      const audit = modeBtns.find((b) => b.textContent.includes('Audit'));
      if (audit) audit.click();
    });
    await new Promise((r) => setTimeout(r, 120));
    await snap(9);

    // -- Frame 10: user sends a follow-up; first reply streams.
    await page.evaluate(() => {
      window.__MOCK__.fire({
        type: 'message',
        payload: {
          id: 'u2',
          role: 'user',
          content: 'Audit it for security regressions.',
          mode: 'audit',
          timestamp: Date.now(),
        },
      });
    });
    await page.evaluate(() => {
      window.__MOCK__.fire({
        type: 'messageUpdate',
        payload: {
          id: 'a2',
          content: 'Scanning for untrusted input paths, eval/new Function, prototype ' +
            'polls, and shell-out sinks…',
          streaming: true,
          startedAt: Date.now(),
        },
      });
    });
    await new Promise((r) => setTimeout(r, 200));
    await snap(10);

    // -- Frame 11: complete audit reply with verdict chip.
    await page.evaluate(() => {
      window.__MOCK__.fire({
        type: 'messageUpdate',
        payload: {
          id: 'a2',
          content:
            'Scanning for untrusted input paths, eval/new Function, prototype polls, and ' +
            'shell-out sinks…\n\n**Verdict:** ✅ clean. 2 minor docs-only suggestions ' +
            'flagged inline. No security regressions detected.',
          streaming: false,
          endedAt: Date.now(),
          usage: { input_tokens: 64, output_tokens: 91 },
        },
      });
    });
    await new Promise((r) => setTimeout(r, 220));
    await snap(11);

    // -- Frame 12: idle conversation (clear active state, show new prompt).
    await page.evaluate(() => {
      window.__MOCK__.fire({
        type: 'message',
        payload: {
          id: 'u3',
          role: 'user',
          content: 'Ship the patch.',
          mode: 'dev',
          timestamp: Date.now(),
        },
      });
    });
    await new Promise((r) => setTimeout(r, 180));
    await snap(12);
    await page.close();

    // ---- Stitch the frames into a GIF with ffmpeg.
    const outGif = path.join(repoRoot, 'assets', 'demo.gif');
    // Two-pass palette + scale for best quality + size constraint.
    // -stream_loop N repeats the input N extra times (so each frame plays N+1 times).
    // Targeting ~30s total: 12 frames @ 8fps = 1.5s per cycle × 20 cycles = 30s.
    const palettePng = path.join(framesDir, '_palette.png');
    try {
      execSync(
        `ffmpeg -y -framerate ${FPS} -i "${framesDir}/frame-%02d.png" ` +
          `-vf "fps=${FPS},scale=1100:-1:flags=lanczos,palettegen=max_colors=128" ` +
          `-frames:v 1 "${palettePng}"`,
        { stdio: 'pipe' },
      );
      execSync(
        `ffmpeg -y -framerate ${FPS} -stream_loop ${LOOPS - 1} -i "${framesDir}/frame-%02d.png" -i "${palettePng}" ` +
          `-lavfi "fps=${FPS},scale=1100:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5" ` +
          `-loop 0 "${outGif}"`,
        { stdio: 'pipe' },
      );
    } catch (err) {
      console.error('[demo.gif] ffmpeg failed:', err.message);
      throw err;
    }
    const gifStat = require('node:fs').statSync(outGif);
    const sizeMb = gifStat.size / (1024 * 1024);
    console.log(`  → ${path.relative(repoRoot, outGif)} (${sizeMb.toFixed(2)} MB)`);
    assert('demo.gif exists', existsSync(outGif));
    assert('demo.gif ≤ 5 MB', sizeMb <= 5, `actual=${sizeMb.toFixed(2)} MB`);
    assert('demo.gif ≥ 50 KB (sanity)', gifStat.size > 50 * 1024,
      `actual=${(gifStat.size / 1024).toFixed(1)} KB`);
  }

  // =====================================================================
  // Summary
  // =====================================================================
  const failed = assertions.filter((a) => !a.ok);
  console.log('\n========================================');
  console.log(`Assertions: ${assertions.length - failed.length}/${assertions.length} passed`);
  if (consoleErrors.length) {
    console.log(`Console errors: ${consoleErrors.length}`);
    consoleErrors.slice(0, 5).forEach((e) => console.log('  ' + e));
  }
  if (failed.length) {
    console.log('\nFailures:');
    failed.forEach((f) => console.log(`  ❌ ${f.name} ${f.detail}`));
  }
  console.log('========================================');

  // Always list the deliverables and their sizes.
  console.log('\nDeliverables in assets/:');
  for (const f of [
    'screenshots/chat.png',
    'screenshots/modes.png',
    'screenshots/slash.png',
    'screenshots/settings.png',
    'og-banner.png',
    'demo.gif',
  ]) {
    const p = path.join(repoRoot, 'assets', f);
    if (existsSync(p)) {
      const s = require('node:fs').statSync(p);
      console.log(`  ${f.padEnd(28)} ${(s.size / 1024).toFixed(1).padStart(8)} KB`);
    } else {
      console.log(`  ${f.padEnd(28)} MISSING`);
    }
  }

  process.exit(failed.length || consoleErrors.length ? 1 : 0);
} finally {
  await browser.close();
}
