import { readCatalog } from '../blob-store.mjs';
import { downloadsPage, sourcePage } from '../pages.mjs';
export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) { res.statusCode = 405; return res.end(); }
  try {
    const catalog = await readCatalog();
    const url = new URL(req.url, 'https://lvl222.com');
    const kind = url.searchParams.get('kind');
    const latest = catalog.releases.find(r => r.tag === catalog.latest);
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (kind === 'downloads' || kind === 'source') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(req.method === 'HEAD' ? undefined : (kind === 'downloads' ? downloadsPage(catalog.releases) : sourcePage(catalog.releases)));
    }
    res.setHeader('Content-Type', 'application/json');
    if (kind === 'updater') {
      if (!latest) { res.statusCode = 503; return res.end(); }
      return res.end(req.method === 'HEAD' ? undefined : JSON.stringify(latest.updater));
    }
    const downloads = {};
    for (const [key, pattern] of Object.entries({ windows: /x64.*setup\.exe$/i, msi: /x64.*\.msi$/i, appimage: /amd64\.AppImage$/i, deb: /amd64\.deb$/i, rpm: /x86_64\.rpm$/i })) {
      const file = latest?.files.find(f => pattern.test(f.name));
      if (file) downloads[key] = file.url;
    }
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ version: latest?.tag || null, page: '/downloads', downloads }));
  } catch { res.statusCode = 503; res.setHeader('Retry-After', '60'); res.end('Temporarily unavailable'); }
}
