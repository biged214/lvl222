import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const catalog = JSON.parse(await readFile(new URL('../data/releases/catalog.json', import.meta.url)));
const release = catalog.releases.find(r => r.tag === catalog.latest);
const base = 'https://lvl222.com';
const advertised = await (await fetch(`${base}/api/release`)).json();
assert.equal(advertised.version, release.tag);
for (const [platform, url] of Object.entries(advertised.downloads)) {
  const asset = release.files.find(f => f.url === url);
  assert.ok(asset);
  const partial = await fetch(url, { headers: { Range: 'bytes=0-31' }, redirect: 'manual' });
  assert.equal(partial.status, 206);
  assert.equal((await partial.arrayBuffer()).byteLength, 32);
  // A range request must never poison the subsequent full-download cache entry.
  const full = await fetch(url, { redirect: 'manual' });
  assert.equal(full.status, 200);
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of full.body) { hash.update(chunk); bytes += chunk.length; }
  assert.equal(bytes, asset.size);
  assert.equal(hash.digest('hex'), asset.sha256);
  console.log(`${platform}: range, full download and SHA-256 verified`);
}
const updater = await (await fetch(`${base}/updates/sc-companion/latest.json`)).json();
assert.deepEqual(updater, release.updater);
console.log(`${release.tag}: website updater URLs and signatures verified`);
