import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { createReleaseStore } from './releases.mjs';
import { legalPages, downloadsPage, sourcePage } from './pages.mjs';

const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/pages.css', ['pages.css', 'text/css; charset=utf-8']],
  ['/site.js', ['site.js', 'text/javascript; charset=utf-8']],
  ['/images/home.png', ['images/home.png', 'image/png']],
  ['/images/ships.png', ['images/ships.png', 'image/png']],
  ['/images/news.png', ['images/news.png', 'image/png']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
  ['/licenses/gpl-3.0.txt', ['licenses/gpl-3.0.txt', 'text/plain; charset=utf-8']],
  ['/robots.txt', ['robots.txt', 'text/plain']],
  ['/sitemap.xml', ['sitemap.xml', 'application/xml']]
]);
export const store = createReleaseStore(process.env.DOWNLOAD_DIR || fileURLToPath(new URL('./data/releases/', import.meta.url)));
const patterns = { windows: /x64.*setup\.exe$/i, msi: /x64.*\.msi$/i, appimage: /amd64\.AppImage$/i, deb: /amd64\.deb$/i, rpm: /x86_64\.rpm$/i };
export function createWebsite(releases = store) {
  return createServer(async (req, res) => {
    const send = (status, body, type = 'text/plain; charset=utf-8') => {
      res.writeHead(status, { 'Content-Type': type }); res.end(req.method === 'HEAD' ? undefined : body);
    };
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'");
    if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); send(405, 'Method not allowed'); return; }
    let path;
    try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { send(400, 'Invalid path'); return; }
    try {
      if (path === '/health') { send(200, 'ok'); return; }
      if (legalPages[path]) { send(200, legalPages[path], 'text/html; charset=utf-8'); return; }
      if (path === '/downloads') { send(200, downloadsPage(releases.list()), 'text/html; charset=utf-8'); return; }
      if (path === '/source') { send(200, sourcePage(releases.list()), 'text/html; charset=utf-8'); return; }
      if (path === '/api/release') {
        const latest = releases.latest();
        const downloads = {};
        for (const [platform, pattern] of Object.entries(patterns)) {
          const asset = latest?.files.find(f => pattern.test(f.name));
          if (asset) downloads[platform] = asset.url;
        }
        res.setHeader('Cache-Control', 'public, max-age=60');
        send(200, JSON.stringify({ version: latest?.tag || null, page: '/downloads', downloads }), 'application/json'); return;
      }
      if (path === '/updates/sc-companion/latest.json') {
        const latest = releases.latest();
        if (!latest) { res.setHeader('Retry-After', '60'); send(503, 'No complete release available'); return; }
        res.setHeader('Cache-Control', 'no-cache');
        send(200, JSON.stringify(latest.updater), 'application/json'); return;
      }
      if (path.startsWith('/downloads/sc-companion/')) {
        const segments = path.split('/');
        const asset = segments.length === 5 ? releases.file(segments[3], segments[4]) : null;
        if (!asset) { send(404, 'File not found'); return; }
        const info = await stat(asset.path);
        if (info.size !== asset.size) throw new Error('File integrity mismatch');
        const etag = `"${asset.sha256}"`;
        res.setHeader('ETag', etag);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Content-Disposition', `attachment; filename="${asset.name}"`);
        if (req.headers['if-none-match'] === etag) { res.writeHead(304); res.end(); return; }
        let start = 0, end = asset.size - 1, status = 200;
        if (req.headers.range && (!req.headers['if-range'] || req.headers['if-range'] === etag)) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
          if (!match || (!match[1] && !match[2])) { res.setHeader('Content-Range', `bytes */${asset.size}`); send(416, 'Invalid range'); return; }
          start = match[1] ? Number(match[1]) : Math.max(0, asset.size - Number(match[2]));
          end = match[1] && match[2] ? Math.min(Number(match[2]), asset.size - 1) : asset.size - 1;
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= asset.size) { res.setHeader('Content-Range', `bytes */${asset.size}`); send(416, 'Invalid range'); return; }
          status = 206; res.setHeader('Content-Range', `bytes ${start}-${end}/${asset.size}`);
        }
        res.writeHead(status, { 'Content-Type': 'application/octet-stream', 'Content-Length': end - start + 1 });
        if (req.method === 'HEAD') res.end();
        else await pipeline(createReadStream(asset.path, { start, end }), res);
        return;
      }
      const file = files.get(path);
      if (!file) { send(404, 'Page not found'); return; }
      const data = await readFile(new URL(`./public/${file[0]}`, import.meta.url));
      res.setHeader('Content-Length', data.length);
      res.setHeader('Cache-Control', path.startsWith('/images/') ? 'public, max-age=3600' : 'no-cache');
      send(200, data, file[1]);
    } catch (error) {
      if (res.headersSent) res.destroy();
      else { res.setHeader('Retry-After', '60'); send(503, 'Temporarily unavailable. Please try again shortly.'); }
      if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') console.error('Request failed:', error.message);
    }
  });
}
export const server = createWebsite();
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await store.load();
  server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log(`lvl222 listening on port ${server.address().port}`));
  const refresh = () => store.sync().then(r => console.log(`Release mirror ready: ${r.tag}`)).catch(e => console.error('Release mirror:', e.message));
  if (process.env.SYNC_RELEASES !== 'false') { void refresh(); setInterval(refresh, 15 * 60_000).unref(); }
}
