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
test('release failure retains a usable fallback', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith('https://api.github.com/')) throw new Error('offline');
    return original(url, options);
  };
  try {
    const data = await (await fetch(`${base}/api/release`)).json();
    assert.equal(data.page, 'https://github.com/biged214/sccompanion/releases/latest');
    assert.deepEqual(data.downloads, {});
  } finally { globalThis.fetch = original; }
});
