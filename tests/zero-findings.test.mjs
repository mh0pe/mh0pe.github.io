import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { tsImport } from "tsx/esm/api";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = new URL("../", import.meta.url);
const load = path => tsImport(new URL(path, root).href, import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const { motionStories } = await load("app/data/article-motion.ts");
const { StoryScene } = await load("app/components/blog/motion/StoryScene.tsx");
const story = "zero-findings";
const { chapters } = motionStories[story];
const draw = frame => renderToStaticMarkup(React.createElement(StoryScene, { story, frame, id: "receipts" }));

test("the findings count stays the same while coverage, data age, and the decision diverge", () => {
  const [opening, coverage, freshness, decision] = chapters.map(beat => draw(beat.frame));
  for (const html of [opening, coverage, freshness, decision]) {
    assert.equal((html.match(/>0 findings<\/text>/g) ?? []).length, 2);
    assert.match(html, /data-scan-receipt="A"/);
    assert.match(html, /data-scan-receipt="B"/);
  }
  assert.doesNotMatch(opening, /data-scan-layer=/);
  assert.match(coverage, /3 of 3 ran.*2 of 3 ran.*Infrastructure: not run/);
  assert.doesNotMatch(coverage, /Past age limit|Follow up/);
  assert.match(freshness, /Within age limit.*Past age limit/);
  assert.doesNotMatch(freshness, /Follow up/);
  assert.match(decision, /Review within scope.*Follow up/);

  const gap = html => html.match(/stroke-width="([\d.]+)" stroke-dasharray="7 5"/)?.[1];
  assert.equal(gap(coverage), "2");
  assert.equal(gap(draw(chapters[1].end)), "5");
  assert.match(draw(chapters[2].end), /M29 427h205/);
});

test("the public article carries all four stills, source links, and a share card", async () => {
  const page = await read("pages-dist/blog/zero-findings/index.html");
  assert.equal((page.match(/\sdata-story-stage=/g) ?? []).length, 4);
  for (const id of ["same-count", "coverage", "freshness", "decision"]) assert.match(page, new RegExp('id="' + id + '"'));
  for (const item of ["pull/640", "pull/696", "releases/tag/v3.8.0"]) {
    assert.ok(page.includes('href="https://github.com/awslabs/automated-security-helper/' + item + '"'));
  }
  assert.match(page, /https:\/\/mh0pe.github.io\/social\/zero-findings.jpg/);
  const journal = await read("pages-dist/blog/index.html");
  assert.match(journal, /Start here[\s\S]{0,800}href="\/blog\/zero-findings\/"/);
});
