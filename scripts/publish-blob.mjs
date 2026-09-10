import { put, head } from '@vercel/blob';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { blobStoreId, blobOrigin, readCatalog } from '../blob-store.mjs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
export async function publishMirror(directory) {
process.env.BLOB_STORE_ID ||= blobStoreId;
const catalog = JSON.parse(await readFile(join(directory, 'catalog.json')));
const previous = await readCatalog();
for (const release of catalog.releases) {
  for (const file of release.files) {
    const path = new URL(file.url).pathname.slice(1);
    const old = previous.releases.find(r => r.tag === release.tag)?.files.find(f => f.name === file.name);
    if (old) {
      if (old.sha256 !== file.sha256 || old.size !== file.size) throw new Error(`Immutable file changed: ${file.name}`);
      const remote = await head(`${blobOrigin}/${path}`);
      if (remote.size !== file.size) throw new Error(`Stored file size mismatch: ${file.name}`);
      continue;
    }
    const existing = await fetch(`${blobOrigin}/${path}`);
    if (existing.ok) {
      const hash = createHash('sha256');
      for await (const chunk of existing.body) hash.update(chunk);
      if (hash.digest('hex') !== file.sha256) throw new Error('An existing Blob has different bytes');
      continue;
    }
    if (existing.status !== 404) throw new Error('Could not check existing Blob');
    const uploaded = await put(path, createReadStream(join(directory, release.tag, file.name)), { access: 'public', addRandomSuffix: false, allowOverwrite: false, multipart: file.size > 40 * 1024 ** 2, contentType: 'application/octet-stream', cacheControlMaxAge: 31536000 });
    if (new URL(uploaded.url).origin !== blobOrigin) throw new Error('Unexpected storage origin');
    console.log(`Uploaded ${file.name}`);
  }
}
const merged = { latest: catalog.latest, releases: [...catalog.releases, ...previous.releases.filter(r => !catalog.releases.some(n => n.tag === r.tag))] };
await put('releases/catalog.json', JSON.stringify(merged), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 });
console.log('Published complete catalog to persistent Blob storage.');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await publishMirror(fileURLToPath(new URL('../data/releases/', import.meta.url)));
