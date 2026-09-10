import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { legalPages, downloadsPage, sourcePage } from '../pages.mjs';

test('every indexable page has unique server-rendered metadata and a sitemap entry', async () => {
  const home = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const sitemap = await readFile(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
  const pages = { '/': home, ...legalPages, '/downloads': downloadsPage([]), '/source': sourcePage([]) };
  const descriptions = new Set();
  for (const [path, html] of Object.entries(pages)) {
    assert.equal((html.match(/<title>/g) || []).length, 1);
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
    assert.ok(html.includes(`rel="canonical" href="https://lvl222.com${path}"`), path);
    assert.ok(sitemap.includes(`<loc>https://lvl222.com${path}</loc>`), path);
    const description = html.match(/name="description" content="([^"]+)"/)?.[1];
    assert.ok(description?.length > 50, path);
    assert.ok(!descriptions.has(description), path);
    descriptions.add(description);
    assert.ok(html.includes('name="twitter:card"'), path);
    assert.ok(html.includes(`property="og:url" content="https://lvl222.com${path}"`), path);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  }
  assert.ok(home.includes('itemtype="https://schema.org/SoftwareApplication"'));
  assert.ok(home.includes('itemprop="price" content="0"'));
  assert.ok(!home.includes('aggregateRating'));
});
