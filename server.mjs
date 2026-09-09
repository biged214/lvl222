import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/site.js', ['site.js', 'text/javascript; charset=utf-8']],
  ['/images/home.png', ['images/home.png', 'image/png']],
  ['/images/ships.png', ['images/ships.png', 'image/png']],
  ['/images/news.png', ['images/news.png', 'image/png']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
  ['/robots.txt', ['robots.txt', 'text/plain']],
  ['/sitemap.xml', ['sitemap.xml', 'application/xml']]
]);
const releasePage = 'https://github.com/biged214/sccompanion/releases/latest';
let cached;
let pending;
async function latestRelease() {
  if (cached && Date.now() - cached.time < 15 * 60_000) return cached.data;
  if (pending) return pending;
  pending = (async () => {
    try {
      const response = await fetch('https://api.github.com/repos/biged214/sccompanion/releases/latest', {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'lvl222-website' }, signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) throw new Error('Release unavailable');
      const release = await response.json();
      if (!Array.isArray(release.assets) || typeof release.tag_name !== 'string') throw new Error('Invalid release');
      const data = { version: release.tag_name, page: releasePage, downloads: {} };
      for (const [platform, pattern] of Object.entries({ windows: /x64.*setup\.exe$/i, appimage: /amd64\.AppImage$/i, deb: /amd64\.deb$/i, rpm: /x86_64\.rpm$/i })) {
        const asset = release.assets.find((item) => pattern.test(item.name));
        if (asset?.browser_download_url?.startsWith('https://github.com/biged214/sccompanion/releases/download/')) data.downloads[platform] = asset.browser_download_url;
      }
      cached = { time: Date.now(), data }; return data;
    } catch { return cached?.data ?? { version: null, page: releasePage, downloads: {} }; }
    finally { pending = null; }
  })();
  return pending;
}
export const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'");
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
  let path;
  try { path = new URL(req.url, 'http://localhost').pathname; } catch { res.writeHead(400); res.end(); return; }
  if (path === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end(req.method === 'HEAD' ? undefined : 'ok'); return; }
  if (path === '/api/release') {
    const data = await latestRelease(); res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }); res.end(req.method === 'HEAD' ? undefined : JSON.stringify(data)); return;
  }
  const file = files.get(path);
  if (!file) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end(req.method === 'HEAD' ? undefined : 'Page not found'); return; }
  try {
    const data = await readFile(new URL(`./public/${file[0]}`, import.meta.url));
    res.writeHead(200, { 'Content-Type': file[1], 'Content-Length': data.length, 'Cache-Control': path.startsWith('/images/') ? 'public, max-age=3600' : 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(500); res.end('Unable to load page'); }
});
if (process.argv[1] === fileURLToPath(import.meta.url)) server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log(`lvl222 listening on port ${server.address().port}`));
