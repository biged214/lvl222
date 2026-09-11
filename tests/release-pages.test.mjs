import { test } from 'node:test';
import assert from 'node:assert/strict';
import { downloadsPage, checksumsPage } from '../pages.mjs';
import { releaseNotes } from '../release-notes.mjs';
test('release notes are version-specific and checksums have a separate page', () => {
  const releases = Object.keys(releaseNotes).map(tag => ({ tag, notes: 'Generic installer instructions', files: [{ name: 'setup.exe', url: '/setup.exe', size: 1024, sha256: 'a'.repeat(64) }, { name: 'setup.exe.sig', url: '/setup.exe.sig', size: 128, sha256: 'b'.repeat(64) }] }));
  const html = downloadsPage(releases);
  for (const notes of Object.values(releaseNotes)) for (const note of notes) assert.ok(html.includes(note));
  assert.ok(!html.includes('Generic installer instructions'));
  assert.ok(!html.includes('a'.repeat(64)));
  assert.ok(!html.includes('href="/setup.exe.sig"'));
  assert.ok(html.includes('/checksums#v0.32.1'));
  const verification = checksumsPage(releases);
  assert.ok(verification.includes('a'.repeat(64)));
  assert.ok(verification.includes('href="/setup.exe.sig"'));
  assert.ok(verification.includes('id="v0.32.1"'));
});
