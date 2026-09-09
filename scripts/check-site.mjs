import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
for (const width of [1440, 390, 320]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('http://127.0.0.1:3001/');
  await expect(page.locator('#screenshot')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SC Companion', exact: true })).toBeVisible();
  for (const tab of await page.getByRole('tab').all()) {
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => page.locator('#screenshot').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (overflow) throw new Error(`Horizontal overflow at ${width}`);
  await page.getByRole('tab').first().click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `test-results/site-${width}.png`, fullPage: true });
}
const release = await (await page.request.get('http://127.0.0.1:3001/api/release')).json();
console.log(JSON.stringify({ errors, release }));
if (errors.length) throw new Error(errors.join('\n'));
await browser.close();
