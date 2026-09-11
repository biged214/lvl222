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
    for (const path of ['/', '/downloads', '/privacy', '/terms', '/license', '/source', '/support', '/checksums']) {
      const response = await page.goto(base + path);
      assert.equal(response.status(), 200);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://lvl222.com${path}`);
      assert.ok(await page.locator('meta[name="description"]').getAttribute('content'));
      if (path === '/' || path === '/downloads') {
        const store = page.getByRole('link', { name: 'Get it from Microsoft Store' });
        assert.equal(await store.getAttribute('href'), 'https://apps.microsoft.com/store/detail/9P7MQG0CTW65?cid=DevShareMCLPCS');
        assert.ok(await store.isVisible());
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} overflows at ${width}`);
      if (path === '/') {
        await page.locator('.hero-image').evaluate(img => img.decode());
        assert.equal(await page.locator('[itemtype="https://schema.org/SoftwareApplication"] [itemprop="name"]').first().getAttribute('content'), 'SC Companion');
        await page.screenshot({ path: `test-results/seo-${width}.png`, fullPage: true });
        for (const key of ['home', 'ships', 'news', 'trade-routes', 'blueprints', 'market']) {
          await page.locator(`[data-screen="${key}"]`).click();
          await page.locator('#screenshot').evaluate(img => img.decode());
          assert.ok((await page.locator('#screenshot').getAttribute('src')).endsWith(`/${key}.png`));
          assert.equal(await page.locator(`#tab-${key}`).getAttribute('aria-selected'), 'true');
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        }
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
