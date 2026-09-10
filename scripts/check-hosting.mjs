import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const base = 'http://127.0.0.1:3001';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ['/privacy', '/terms', '/license', '/source', '/support', '/downloads']) {
      const response = await page.goto(base + path);
      assert.equal(response.status(), 200);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${path} overflow at ${width}`);
      if (path === '/downloads' || path === '/privacy') await page.screenshot({ path: `test-results/${path.slice(1)}-${width}.png`, fullPage: true });
    }
  }
  assert.deepEqual(errors, []);
  const catalog = JSON.parse(await readFile(new URL('../data/releases/catalog.json', import.meta.url)));
  for (const asset of catalog.releases[0].files) {
    const url = base + new URL(asset.url).pathname;
    const head = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    assert.equal(head.status, 200); assert.equal(head.headers.get('location'), null);
    assert.equal(Number(head.headers.get('content-length')), asset.size);
    const range = await fetch(url, { headers: { Range: 'bytes=0-3' } });
    assert.equal(range.status, 206); assert.equal((await range.arrayBuffer()).byteLength, 4);
  }
  const exe = catalog.releases[0].files.find(f => f.name.endsWith('.exe'));
  const full = await fetch(base + new URL(exe.url).pathname);
  const hash = createHash('sha256');
  for await (const chunk of full.body) hash.update(chunk);
  assert.equal(hash.digest('hex'), exe.sha256);
  const updater = await (await fetch(base + '/updates/sc-companion/latest.json')).json();
  for (const entry of Object.values(updater.platforms)) assert.ok(entry.url.startsWith('https://lvl222.com/downloads/sc-companion/'));
  console.log(`Verified legal pages, mobile layout, ${catalog.releases[0].files.length} direct files, ranges, full EXE SHA-256, and updater URLs.`);
} finally { await browser.close(); }
