import { readFile, writeFile } from 'node:fs/promises';
const catalog = JSON.parse(await readFile(new URL('../data/releases/catalog.json', import.meta.url), 'utf8'));
for (const release of catalog.releases) {
  if (!/^v\d+\.\d+\.\d+$/.test(release.tag)) throw new Error('Invalid release tag');
  for (const file of release.files) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]+$/.test(file.name)) throw new Error('Invalid filename');
    file.downloadUrl = file.name === 'SC-Companion-Store-0.31.2.0-source.zip'
      ? 'https://codeload.github.com/biged214/sccompanion/zip/a948f32e86cc8bf7e243a5acdc0344f231b6ae78'
      : file.name.endsWith('-source.zip')
        ? `https://codeload.github.com/biged214/sccompanion/zip/refs/tags/${release.tag}`
        : `https://github.com/biged214/sccompanion/releases/download/${release.tag}/${file.name}`;
  }
}
await writeFile(new URL('../release-catalog.mjs', import.meta.url), '// Verified public release metadata. Regenerate with npm run publish:catalog.\nexport default '+JSON.stringify(catalog,null,2)+';\n');
console.log(`Prepared website catalog: ${catalog.latest}, ${catalog.releases.length} releases`);
