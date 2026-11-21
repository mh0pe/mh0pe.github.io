import assert from 'node:assert/strict';
import test from 'node:test';
import {canonicalSvg} from './helpers/canonical-svg.mjs';

test('SVG fingerprints tolerate numeric tail digits without merging compact path tokens', () => {
  assert.equal(canonicalSvg('<g transform="translate(422.1234567890123 -2e-14)"/>'), canonicalSvg('<g transform="translate(422.123456789 0)"/>'));
  assert.equal(canonicalSvg('<path d="M10-1e-14"/>'), canonicalSvg('<path d="M10+0"/>'));
  assert.notEqual(canonicalSvg('<path d="M10-1e-14"/>'), canonicalSvg('<path d="M100"/>'));
  assert.notEqual(canonicalSvg('<g transform="translate(1 2)"/>'), canonicalSvg('<g transform="translate(1.000001 2)"/>'));
});

test('SVG fingerprints preserve exact meaning, palette, commands and structure', () => {
  const markup = '<svg aria-labelledby="title-1.0000000001"><title id="title-1.0000000001">Version 1.0000000001</title><g fill="#123456" data-artifact="item-1.0000000001"><text font-weight="550">1.0000000001</text></g></svg>';
  assert.equal(canonicalSvg(markup), JSON.stringify([markup]));
  for (const changed of [markup.replace('#123456', '#123457'), markup.replace('Version', 'Release'), markup.replace('title-1', 'name-1'), markup.replace('<g ', '<g role="img" ')]) assert.notEqual(canonicalSvg(changed), canonicalSvg(markup));
  assert.notEqual(canonicalSvg('<g x="1" y="2"/>'), canonicalSvg('<g y="2" x="1"/>'));
  assert.notEqual(canonicalSvg('<path d="M10-2"/>'), canonicalSvg('<path d="L10-2"/>'));
  assert.notEqual(canonicalSvg('<path d="M0 0 A10 10 0 0 0 20 20"/>'), canonicalSvg('<path d="M0 0 A10 10 0 0.00000000001 0 20 20"/>'));
  for (const attr of ['width', 'height', 'r', 'rx', 'ry', 'opacity', 'stroke-width']) assert.notEqual(canonicalSvg(`<g ${attr}="0"/>`), canonicalSvg(`<g ${attr}="-1e-11"/>`));
});

test('SVG fingerprints reject invalid and nonfinite drawing values', () => {
  for (const markup of ['<g transform="translate(NaN 2)"/>', '<g transform="translate(Infinity 2)"/>', '<path d="M1e999 0"/>', '<polygon points="hello1"/>']) assert.throws(() => canonicalSvg(markup));
});
