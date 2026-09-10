import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createWebsite } from '../server.mjs';

const server = createWebsite();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = process.env.CHECK_URL || `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  await mkdir('test-results', { recursive: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ['/', '/downloads', '/privacy', '/terms', '/license', '/source', '/support']) {
      const response = await page.goto(base + path);
      assert.equal(response.status(), 200);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://lvl222.com${path}`);
      assert.ok(await page.locator('meta[name="description"]').getAttribute('content'));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} overflows at ${width}`);
      if (path === '/') {
        await page.locator('.hero-image').evaluate(img => img.decode());
        assert.equal(await page.locator('[itemtype="https://schema.org/SoftwareApplication"] [itemprop="name"]').first().getAttribute('content'), 'SC Companion');
        await page.screenshot({ path: `test-results/seo-${width}.png`, fullPage: true });
      }
    }
  }
  assert.deepEqual(errors, []);
  const api = await fetch(`${base}/api/release`);
  assert.equal(api.headers.get('x-robots-tag'), 'noindex');
  console.log(`SEO/browser checks passed for ${base} at 1440, 390 and 320px.`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
