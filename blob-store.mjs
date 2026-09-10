export const blobStoreId = 'store_TscULTkR7B7RGWSW';
export const blobOrigin = 'https://tscultkr7b7rgwsw.public.blob.vercel-storage.com';
export const catalogUrl = `${blobOrigin}/releases/catalog.json`;
export async function readCatalog() {
  const response = await fetch(catalogUrl, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
  if (response.status === 404) return { latest: null, releases: [] };
  if (!response.ok) throw new Error('Release catalog unavailable');
  const catalog = await response.json();
  if (!Array.isArray(catalog.releases)) throw new Error('Invalid release catalog');
  return catalog;
}
