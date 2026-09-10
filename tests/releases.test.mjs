import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createReleaseStore, rewriteUpdater } from '../releases.mjs';
import { createWebsite } from '../server.mjs';

test('mirror verifies bytes, serves ranges without redirects, and keeps last release offline', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'lvl222-test-'));
  const bytes = Buffer.from('installer-test-contents');
  const tag = 'v1.2.3';
  const assetBase = `https://github.com/biged214/sccompanion/releases/download/${tag}/`;
  const names = ['SC_1.2.3_x64-setup.exe', 'SC_1.2.3_x64.msi', 'SC_1.2.3_amd64.AppImage', 'SC_1.2.3_amd64.deb', 'SC_1.2.3_x86_64.rpm', 'latest.json'];
  const assets = names.map((name, i) => ({ id: i + 1, name, size: bytes.length, digest: 'sha256:' + createHash('sha256').update(bytes).digest('hex'), browser_download_url: assetBase + name }));
  const manifest = { version: '1.2.3', platforms: { 'windows-x86_64': { url: 'https://api.github.com/repos/biged214/sccompanion/releases/assets/1', signature: 'keep-me' }, 'linux-x86_64': { url: assets[2].browser_download_url, signature: 'keep-linux' } } };
  let offline = false;
  const fakeFetch = async url => {
    if (offline) throw new Error('offline');
    if (url.endsWith('/releases/latest')) return Response.json({ tag_name: tag, assets, body: '<script>alert(1)</script>' });
    if (url.endsWith('/latest.json')) return Response.json(manifest);
    return new Response(bytes);
  };
  const store = createReleaseStore(folder, fakeFetch);
  const server = createWebsite(store);
  try {
    await store.load(); await store.sync();
    assert.equal(store.latest().updater.platforms['windows-x86_64'].signature, 'keep-me');
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const url = base + new URL(store.latest().files[0].url).pathname;
    const response = await fetch(url, { redirect: 'manual' });
    assert.equal(response.status, 200); assert.equal(response.headers.get('location'), null);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    const range = await fetch(url, { headers: { Range: 'bytes=0-3' } });
    assert.equal(range.status, 206); assert.equal(await range.text(), 'inst');
    assert.equal((await fetch(url, { headers: { Range: 'bytes=99999-' } })).status, 416);
    assert.equal((await fetch(url, { method: 'HEAD' })).headers.get('content-length'), String(bytes.length));
    assert.equal((await fetch(url, { headers: { 'If-None-Match': response.headers.get('etag') } })).status, 304);
    assert.equal((await fetch(base + '/downloads/sc-companion/v1.2.3/%2e%2e%2fcatalog.json')).status, 404);
    const downloadsHtml = await (await fetch(base + '/downloads')).text();
    assert.match(downloadsHtml, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/); // release notes should be escaped
    assert.doesNotMatch(downloadsHtml, /<pre class="release-notes"><script>/); // no unescaped script in release notes
    offline = true;
    await assert.rejects(store.sync(), /offline/);
    assert.equal(store.latest().tag, tag);
    const restored = createReleaseStore(folder, fakeFetch); await restored.load();
    assert.equal(restored.latest().tag, tag);
    offline = false;
    assets[0].digest = 'sha256:' + '0'.repeat(64);
    await assert.rejects(store.sync(), /Published asset changed/);
    assert.equal(store.latest().files[0].sha256, createHash('sha256').update(bytes).digest('hex'));
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(folder, { recursive: true, force: true }); }
});
test('rejects updater URLs outside the known release', () => {
  assert.throws(() => rewriteUpdater({ version: '1.2.3', platforms: { 'windows-x86_64': { url: 'https://evil.invalid/app.exe', signature: 'x' }, 'linux-x86_64': {} } }, [], 'v1.2.3'), /missing or unsigned/);
});
