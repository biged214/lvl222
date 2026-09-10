import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { join, resolve } from 'node:path';

export const origin = 'https://lvl222.com';
const repo = 'biged214/sccompanion';
const headers = { 'User-Agent': 'lvl222-release-mirror', Accept: 'application/vnd.github+json' };
const safeName = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(value);
const fileUrl = (tag, name) => `${origin}/downloads/sc-companion/${tag}/${name}`;
export function rewriteUpdater(manifest, assets, tag) {
  if (manifest.version !== tag.slice(1) || !manifest.platforms?.['windows-x86_64'] || !manifest.platforms?.['linux-x86_64']) throw new Error('Release platforms are not complete');
  const result = structuredClone(manifest);
  for (const entry of Object.values(result.platforms)) {
    const asset = assets.find(a => a.browser_download_url === entry.url || `https://api.github.com/repos/${repo}/releases/assets/${a.id}` === entry.url);
    if (!asset || typeof entry.signature !== 'string' || !entry.signature.length) throw new Error('Updater asset is missing or unsigned');
    entry.url = fileUrl(tag, asset.name);
  }
  return result;
}

export function createReleaseStore(directory, fetcher = fetch) {
  const root = resolve(directory);
  let catalog = { latest: null, releases: [] };
  let pending;
  async function load() {
    await mkdir(root, { recursive: true });
    try { catalog = JSON.parse(await readFile(join(root, 'catalog.json'), 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  async function json(url) {
    const response = await fetcher(url, { headers, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Release metadata returned ${response.status}`);
    return response.json();
  }
  async function download(url, path, expectedSize, digest) {
    const expectedHash = digest?.startsWith('sha256:') ? digest.slice(7) : null;
    try {
      const info = await stat(path);
      const hash = createHash('sha256');
      for await (const chunk of createReadStream(path)) hash.update(chunk);
      const sha256 = hash.digest('hex');
      if ((expectedSize !== undefined && info.size !== expectedSize) || (expectedHash && sha256 !== expectedHash)) throw new Error('Published asset changed in place; publish a new version');
      return { size: info.size, sha256 };
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const response = await fetcher(url, { headers: { 'User-Agent': headers['User-Agent'] }, signal: AbortSignal.timeout(600_000) });
    if (!response.ok || !response.body) throw new Error(`Download returned ${response.status}`);
    let size = 0;
    const hash = createHash('sha256');
    const meter = new Transform({ transform(chunk, encoding, callback) {
      size += chunk.length;
      if (size > 1024 ** 3) return callback(new Error('Asset exceeds 1 GiB limit'));
      hash.update(chunk); callback(null, chunk);
    } });
    const temp = `${path}.${randomUUID()}.part`;
    try {
      await pipeline(Readable.fromWeb(response.body), meter, createWriteStream(temp, { flags: 'wx' }));
      const sha256 = hash.digest('hex');
      if ((expectedSize !== undefined && size !== expectedSize) || (expectedHash && sha256 !== expectedHash)) throw new Error('Downloaded file failed integrity check');
      await rename(temp, path);
      return { size, sha256 };
    } finally { await rm(temp, { force: true }); }
  }
  async function sync() {
    if (pending) return pending;
    pending = (async () => {
      const release = await json(`https://api.github.com/repos/${repo}/releases/latest`);
      const tag = release.tag_name;
      if (!/^v\d+\.\d+\.\d+$/.test(tag) || release.draft || release.prerelease || !Array.isArray(release.assets)) throw new Error('Not a stable release');
      const assets = release.assets;
      if (assets.some(a => !safeName(a.name) || !Number.isSafeInteger(a.size) || a.size <= 0 || a.size > 1024 ** 3 || !a.browser_download_url?.startsWith(`https://github.com/${repo}/releases/download/${tag}/`))) throw new Error('Invalid release assets');
      if (assets.reduce((sum, a) => sum + a.size, 0) > 3 * 1024 ** 3) throw new Error('Release exceeds 3 GiB limit');
      for (const suffix of ['.exe', '.msi', '.AppImage', '.deb', '.rpm']) if (!assets.some(a => a.name.endsWith(suffix))) throw new Error('Waiting for all installer builds');
      const updaterAsset = assets.find(a => a.name === 'latest.json');
      if (!updaterAsset) throw new Error('Waiting for updater manifest');
      const manifest = await json(updaterAsset.browser_download_url);
      const updater = rewriteUpdater(manifest, assets, tag);
      const folder = join(root, tag);
      await mkdir(folder, { recursive: true });
      const files = [];
      for (const asset of assets.filter(a => a.name !== 'latest.json')) {
        const metadata = await download(asset.browser_download_url, join(folder, asset.name), asset.size, asset.digest);
        files.push({ name: asset.name, url: fileUrl(tag, asset.name), ...metadata });
      }
      const sourceName = `SC-Companion-${tag}-source.zip`;
      const source = await download(`https://codeload.github.com/${repo}/zip/refs/tags/${tag}`, join(folder, sourceName));
      files.push({ name: sourceName, url: fileUrl(tag, sourceName), ...source });
      if (tag === 'v0.31.2') {
        const storeSourceName = 'SC-Companion-Store-0.31.2.0-source.zip';
        const storeSource = await download(`https://codeload.github.com/${repo}/zip/a948f32e86cc8bf7e243a5acdc0344f231b6ae78`, join(folder, storeSourceName));
        files.push({ name: storeSourceName, url: fileUrl(tag, storeSourceName), ...storeSource });
      }
      const entry = { tag, version: release.tag_name, notes: release.body || '', publishedAt: release.published_at, files, updater };
      const next = { latest: tag, releases: [entry, ...catalog.releases.filter(r => r.tag !== tag)] };
      const temp = join(root, `catalog-${randomUUID()}.tmp`);
      await writeFile(temp, JSON.stringify(next, null, 2));
      await rename(temp, join(root, 'catalog.json'));
      catalog = next;
      return entry;
    })().finally(() => { pending = null; });
    return pending;
  }
  function latest() { return catalog.releases.find(r => r.tag === catalog.latest); }
  function file(tag, name) {
    if (!safeName(tag) || !safeName(name)) return null;
    const item = catalog.releases.find(r => r.tag === tag)?.files.find(f => f.name === name);
    return item ? { ...item, path: join(root, tag, name) } : null;
  }
  return { load, sync, latest, file, list: () => catalog.releases };
}
