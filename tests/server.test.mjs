import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { server } from '../server.mjs';
let base;
before(async () => { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); base = `http://127.0.0.1:${server.address().port}`; });
after(() => new Promise(resolve => server.close(resolve)));
test('serves company page and security headers', async () => {
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /SC Companion/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});
test('blocks private paths and writes', async () => {
  assert.equal((await fetch(`${base}/server.mjs`)).status, 404);
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
  assert.equal(await (await fetch(base, { method: 'HEAD' })).text(), '');
});
test('empty mirror stays on our domain and has no fake update', async () => {
  const data = await (await fetch(`${base}/api/release`)).json();
  assert.equal(data.page, '/downloads');
  assert.deepEqual(data.downloads, {});
  assert.equal((await fetch(`${base}/updates/sc-companion/latest.json`)).status, 503);
});
test('legal pages, local GPL, support and downloads are available', async () => {
  for (const path of ['/privacy', '/terms', '/license', '/support', '/downloads', '/source', '/licenses/gpl-3.0.txt']) assert.equal((await fetch(base + path)).status, 200);
  assert.match(await (await fetch(base + '/privacy')).text(), /support@lvl222.com/);
  assert.equal((await fetch(base + '/data/catalog.json')).status, 404);
});
