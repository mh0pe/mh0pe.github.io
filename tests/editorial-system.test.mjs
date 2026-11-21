import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { sharedStylesheets } from '../tools/export-stylesheets.mjs';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('editorial system ships semantic themes and nonblocking motion', async () => {
  const css = await read('public/editorial-system.css');
  assert.ok(sharedStylesheets.includes('editorial-system.css'));
  for (const role of ['surface', 'text', 'muted', 'action', 'line']) assert.ok(css.includes('--edition-' + role));
  assert.match(css, /data-theme="dark"/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /forced-colors: active/);
  assert.doesNotMatch(css, /\binfinite\b|opacity:\s*0[;}]/);
  assert.match(css, /\.hope-brand \.landing-hope\s*\{[^}]*display:\s*inline-block/);
  assert.match(css, /\.hope-brand \.site-identity\s*\{[^}]*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.hope-brand \.site-identity__name\s*\{[^}]*overflow-wrap:\s*anywhere/);
});

test('writing covers are linked and the catalog is usable without animation', async () => {
  const html = await read('pages-dist/blog/index.html');
  assert.equal((html.match(/class="journal-entry__art" href=/g) ?? []).length, 10);
  assert.equal((html.match(/data-journal-entry="true"/g) ?? []).length, 10);
  assert.ok(html.includes('journal-masthead'));
  assert.doesNotMatch(html, /data-route-motif=/);
});

test('the page directory and credential learning areas remain direct links', async () => {
  const html = await read('pages-dist/credentials/index.html');
  assert.ok(html.includes('site-catalog-title'));
  assert.ok(html.includes('credential-learning__areas'));
  assert.doesNotMatch(html, /credential-constellation__art/);
  for (const href of ['/work/', '/blog/', '/method/', '/about/', '/credentials/', '/proof/']) assert.ok(html.includes(`href="${href}"`));
});
