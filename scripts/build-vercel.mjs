import { mkdir, cp, writeFile } from 'node:fs/promises';
import { legalPages } from '../pages.mjs';
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
for (const [route, html] of Object.entries(legalPages)) await writeFile(`dist${route}.html`, html);
await writeFile('dist/health', 'ok');
