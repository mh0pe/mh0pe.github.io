import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { tsImport } from "tsx/esm/api";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import postcss from "postcss";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const { motionStorySlugs, motionStories } = await tsImport(new URL("app/data/article-motion.ts", root).href, import.meta.url);
const { articleMobileLabels } = await tsImport(new URL("app/data/article-mobile-labels.ts", root).href, import.meta.url);
const { StoryStage } = await tsImport(new URL("app/components/blog/StoryStage.tsx", root).href, import.meta.url);

test("all twelve stories have an object-specific reading guide for every authored beat", () => {
  assert.deepEqual(Object.keys(articleMobileLabels), [...motionStorySlugs]);
  for (const [story, guides] of Object.entries(articleMobileLabels)) {
    assert.equal(guides.length, motionStories[story].chapters.length, story);
    for (const guide of guides) {
      assert.ok(guide.orientation.length > 30, story + " explains the relationship");
      assert.ok(guide.parts.length >= 2, story + " identifies multiple visible objects");
      assert.equal(new Set(guide.parts.map(part => part.label)).size, guide.parts.length, story);
      for (const part of guide.parts) {
        assert.ok(part.location.length > 0, story + " supplies a visual locator");
        assert.ok(part.meaning.length > 8, story + " explains more than a label");
      }
    }
  }
  assert.doesNotMatch(JSON.stringify(articleMobileLabels), /—/u);
});

test("feedback includes all five authored alternatives in the pictured order", async () => {
  const expected = ["Complete", "No findings", "Incomplete", "Cancelled", "Unavailable"];
  const parts = articleMobileLabels["security-feedback-where-you-work"][2].parts;
  assert.deepEqual(parts.map(part => part.label), expected);
  assert.ok(expected.every(label => parts.find(part => part.label === label)?.meaning));
  assert.match(await read("app/components/blog/motion/StoryScene.tsx"), /\["Complete", "No findings", "Incomplete", "Cancelled", "Unavailable"\]/);
  assert.match(articleMobileLabels["security-feedback-where-you-work"][2].orientation, /not steps in a sequence/);
});

test("SVG opens with all seven layers and later guides explain each transformation", async () => {
  const expected = ["Prototypes", "Live values", "Collections", "Geometry", "Structure", "Resources", "Text metrics"];
  const [opening, middle, ending] = articleMobileLabels["typed-svg-dom"];
  assert.deepEqual(opening.parts.map(part => part.label), expected);
  assert.equal(opening.layout, "compact");
  assert.match(opening.orientation, /first three foundations are highlighted/);
  assert.deepEqual(middle.parts.map(part => part.label), ["Live values", "Collections", "Geometry"]);
  assert.deepEqual(middle.parts.map(part => part.location), ["Second marker and curved connector", "Third marker", "Middle marker"]);
  assert.match(middle.orientation, /spread apart/);
  assert.deepEqual(ending.parts.map(part => part.label), ["Geometry", "Text metrics"]);
  assert.match(ending.parts[0].location, /Dashed outline/);
  assert.match(ending.parts[1].location, /lower-right strip/);
  assert.match(ending.parts[1].meaning, /not a complete rendering system/);
  assert.match(await read("app/components/blog/motion/StoryScene.tsx"), /\["Prototypes", "Live values", "Collections", "Geometry", "Structure", "Resources", "Text metrics"\]/);
});

test("only the SVG opening uses aligned label and meaning rows without repeated locator lines", () => {
  for (const [story, guides] of Object.entries(articleMobileLabels)) {
    assert.equal(guides.filter(guide => guide.layout === "compact").length, story === "typed-svg-dom" ? 1 : 0);
  }
  const html = renderToStaticMarkup(React.createElement(StoryStage, { story: "typed-svg-dom", moment: "opening" }));
  const opening = html.split('data-mobile-story-chapter="0"')[1].split('data-mobile-story-chapter="1"')[0];
  assert.ok(opening.includes("article-story__mobile-parts--compact"));
  assert.equal((opening.match(/<dt>/g) ?? []).length, 7);
  assert.equal((opening.match(/<dd>/g) ?? []).length, 7);
  assert.doesNotMatch(opening, /<span>|Top marker|Second marker|Bottom marker/);
});

test("the still's initial chapter and its guides agree for every story and moment", () => {
  for (const story of motionStorySlugs) {
    for (const [chapter, { moment, frame }] of motionStories[story].chapters.entries()) {
      const html = renderToStaticMarkup(React.createElement(StoryStage, { story, moment }));
      assert.ok(html.includes('data-story-chapter="' + chapter + '"'), story + " " + moment);
      assert.ok(html.includes('data-story-frame="' + frame + '"'));
      assert.equal((html.match(/data-mobile-story-chapter=/g) ?? []).length, 1);
      assert.ok(html.includes('data-mobile-story-chapter="' + chapter + '"'));
      assert.equal((html.match(/<dl /g) ?? []).length, 1);
      assert.equal((html.match(/data-story-description=/g) ?? []).length, 1);
      assert.ok(html.includes('aria-describedby="' + story + "-" + moment + '-description"'));
      assert.ok(html.includes('class="article-story__still"'));
      assert.ok(html.includes('class="article-story__live" data-story-mount="true" aria-hidden="true"'));
      assert.doesNotMatch(html, /aria-live|article-story__keys|tabindex=/);
    }
  }
  const rail = renderToStaticMarkup(React.createElement(StoryStage, { story: motionStorySlugs[0], moment: "opening", rail: true }));
  assert.ok(rail.includes('data-story-chapter="0"'));
  assert.equal((rail.match(/data-mobile-story-chapter=/g) ?? []).length, 3);
  assert.ok(rail.includes('aria-describedby="workspace-security-rail-description"'));
});

test("one committed chapter controls mobile visibility without animations or a second runtime", async () => {
  const css = postcss.parse(await read("public/article-mobile-labels.css"));
  const rules = [];
  css.walkRules(rule => rules.push(rule));
  for (const chapter of [0, 1, 2, 3]) {
    const selector = '.article-story[data-story-chapter="' + chapter + '"] [data-mobile-story-chapter="' + chapter + '"]';
    const match = rules.find(rule => rule.selectors.includes(selector));
    assert.ok(match, "Chapter " + chapter + " has its own matching selector");
    assert.equal(match.parent.params, "(max-width: 700px)");
    assert.ok(match.nodes.some(node => node.prop === "display" && node.value === "block"));
  }
  const initial = rules.find(rule => rule.selectors.includes(".article-story__mobile-guide") && rule.parent.type === "root");
  assert.ok(initial.nodes.some(node => node.prop === "display" && node.value === "none"));
  assert.ok(rules.some(rule => rule.selector === ".article-story__mobile-parts" && rule.nodes.some(node => node.prop === "grid-template-columns" && node.value === "minmax(0,1fr)")));
  css.walkDecls(declaration => assert.ok(!["animation", "transition", "height", "max-height"].includes(declaration.prop), "No motion or fixed-height clipping in the guide"));
  const compact = rules.find(rule => rule.selector === ".article-story__mobile-parts--compact > div" && rule.parent.params === "(max-width: 700px)");
  assert.ok(compact.nodes.some(node => node.prop === "grid-template-columns" && node.value === "7rem minmax(0,1fr)"));
  const narrow = rules.find(rule => rule.selector === ".article-story__mobile-parts--compact > div" && rule.parent.params === "(max-width: 359px)");
  assert.ok(narrow.nodes.some(node => node.prop === "grid-template-columns" && node.value === "6rem minmax(0,1fr)"));
  const stage = await read("app/components/blog/StoryStage.tsx");
  assert.doesNotMatch(stage, /useEffect|useState|aria-live|dangerouslySetInnerHTML/);
});
