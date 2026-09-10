import { store } from '../server.mjs';
await store.load();
const release = await store.sync();
console.log(`Mirrored ${release.tag}: ${release.files.length} files`);
