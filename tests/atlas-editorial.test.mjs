import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { tsImport } from "tsx/esm/api";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const load = path => tsImport(new URL(path, root).href, import.meta.url);
const { architectureAreas } = await load("app/data/architecture-atlas.ts");
const { StoryScene } = await load("app/components/blog/motion/StoryScene.tsx");
const draw = (story, frame) => renderToStaticMarkup(React.createElement(StoryScene, { story, frame, id: "editorial" }));

test("the native stack offers four uniquely marked layers, outcomes and valid case destinations", async () => {
  const home = await read("pages-dist/index.html");
  assert.equal((home.match(/name="architecture-layer"/g) ?? []).length, 4);
  assert.equal(new Set(architectureAreas.map(area => area.mark)).size, 4);
  for (const area of architectureAreas) {
    assert.ok(home.includes(area.outcome));
    const page = await read(`pages-dist/work/${area.caseId}/index.html`);
    assert.ok(page.includes(`class="case-study" data-area="${area.id}"`));
    assert.ok(page.includes('class="case-hero__code"'));
    assert.ok(page.includes('class="case-path__mechanism"'));
  }
  assert.ok(home.indexOf("Explore my work") < home.indexOf("landing-opening__examples"));
});

test("the sharding illustration moves the same uniquely identified tiles", () => {
  const placement = html => new Map([...html.matchAll(/data-test-tile="(\d)" transform="([^"]+)"/g)].map(([, id, transform]) => [id, transform]));
  const opening = placement(draw("slowest-shard", 70));
  const middle = placement(draw("slowest-shard", 430));
  const ending = placement(draw("slowest-shard", 820));
  assert.equal(opening.size, 9);
  assert.deepEqual([...opening.keys()], [...middle.keys()]);
  assert.notEqual(opening.get("1"), middle.get("1"));
  assert.notEqual(middle.get("1"), ending.get("1"), "the tile settles during forward reading");
  assert.deepEqual(placement(draw("slowest-shard", 600)), ending);
});

test("the matrix preserves a labeled not-checked state instead of implying failure", () => {
  const result = draw("support-is-a-matrix", 820);
  assert.equal((result.match(/data-compat-cell=/g) ?? []).length, 12);
  assert.match(result, /No CSI check/);
  assert.match(result, /stroke-dasharray="7 6"/);
  assert.match(result, />Included<\/text>/);
});

test("new public-source essays are discoverable and still readable before animation", async () => {
  const journal = await read("pages-dist/blog/index.html");
  for (const [slug, source] of [["slowest-shard", "awslabs/automated-security-helper/pull/965"], ["support-is-a-matrix", "esp-rs/esp-idf-sys/pull/409"]]) {
    assert.ok(journal.includes(`href="/blog/${slug}/"`));
    const article = await read(`pages-dist/blog/${slug}/index.html`);
    assert.ok(article.includes(`href="https://github.com/${source}"`));
    assert.equal((article.match(/data-story-stage="/g) ?? []).length, 3);
    assert.equal((article.match(/article-story__still"/g) ?? []).length, 3);
    assert.ok(article.includes(`https://mh0pe.github.io/social/${slug}.jpg`));
  }
});
