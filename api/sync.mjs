import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readCatalog } from '../blob-store.mjs';
import { createReleaseStore } from '../releases.mjs';
import { publishMirror } from '../scripts/publish-blob.mjs';
export default async function handler(req, res) {
  if (req.method !== 'GET' || !process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) { res.statusCode = 401; return res.end('Unauthorized'); }
  let directory;
  try {
    const current = await readCatalog();
    const response = await fetch('https://api.github.com/repos/biged214/sccompanion/releases/latest', { headers: { 'User-Agent': 'lvl222' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('GitHub metadata unavailable');
    const release = await response.json();
    if (release.tag_name === current.latest) return res.end('Already current');
    directory = await mkdtemp(join(tmpdir(), 'lvl222-sync-'));
    const store = createReleaseStore(directory);
    await store.load(); await store.sync();
    await publishMirror(directory);
    res.end('Release synchronized');
  } catch (error) { console.error('Release sync failed:', error.message); res.statusCode = 503; res.end('Sync failed; existing release retained'); }
  finally { if (directory) await rm(directory, { recursive: true, force: true }); }
}
