import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { tsImport } from 'tsx/esm/api';
import { canonicalSvg, svgPrecisionVersion } from './helpers/canonical-svg.mjs';
const root = new URL('../', import.meta.url);
const { StoryScene } = await tsImport(new URL('app/components/blog/motion/StoryScene.tsx', root).href, import.meta.url);
const { motionStories } = await tsImport(new URL('app/data/article-motion.ts', root).href, import.meta.url);
const baseline = JSON.parse(await readFile(new URL('tests/fixtures/article-forward-geometry.json', root), 'utf8'));
const portable = JSON.parse(await readFile(new URL('tests/fixtures/article-forward-geometry-portable.json', root), 'utf8'));

test('every accepted forward frame retains geometry to nine decimal places and exact palette, text, and accessible meaning', async () => {
  assert.equal(baseline.sourceTreeSha256, 'eaaeca221a864b132015cbe50b3c8e8e5a7d71c9cd12bfb28ee385c6f42bdb5e');
  const hashFile = async path => createHash('sha256').update(await readFile(new URL(path, root))).digest('hex');
  assert.equal(portable.originalFixtureSha256, await hashFile('tests/fixtures/article-forward-geometry.json'));
  assert.equal(portable.generator.packageLockSha256, await hashFile('package-lock.json'));
  assert.equal(portable.generator.normalizerSha256, await hashFile('tests/helpers/canonical-svg.mjs'));
  assert.equal(portable.algorithm, svgPrecisionVersion);
  assert.equal(portable.precisionDecimalPlaces, 9);
  assert.equal(baseline.chapters.length, 29);
  assert.deepEqual(portable.chapters.map(record => Object.fromEntries(Object.entries(record).filter(([key]) => key !== 'canonicalSha256'))), baseline.chapters);
  for (const record of portable.chapters) {
    const beat = motionStories[record.story].chapters.find(chapter => chapter.moment === record.moment);
    assert.equal(beat.frame, record.from); assert.equal(beat.end, record.to);
    const hash = createHash('sha256');
    for (let frame = record.from; frame <= record.to; frame++) {
      hash.update(frame + '\0' + canonicalSvg(renderToStaticMarkup(React.createElement(StoryScene, { story: record.story, frame, id: 'forward-contract', accessible: true }))) + '\0');
    }
    assert.equal(hash.digest('hex'), record.canonicalSha256, record.story + '/' + record.moment);
  }
});
