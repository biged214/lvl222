import { readCatalog } from '../catalog.mjs';
export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) { res.statusCode = 405; return res.end(); }
  const path = new URL(req.url, 'https://lvl222.com').searchParams.get('path') || '';
  const catalog = await readCatalog();
  const file = catalog.releases.flatMap(r => r.files.map(f => ({...f, path: `${r.tag}/${f.name}`}))).find(f => f.path === path);
  if (!file?.downloadUrl) { res.statusCode = 404; return res.end('Download not found'); }
  const target = new URL(file.downloadUrl);
  if (target.protocol !== 'https:' || !['github.com','codeload.github.com'].includes(target.hostname) || !target.pathname.startsWith('/biged214/sccompanion/')) {
    res.statusCode = 503; return res.end('Download unavailable');
  }
  res.statusCode = 307;
  res.setHeader('Location', target.href);
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.end();
}
