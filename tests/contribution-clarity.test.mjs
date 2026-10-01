import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { tsImport } from "tsx/esm/api";
const load = (path) => tsImport(new URL(`../${path}`, import.meta.url).href, import.meta.url);
const { capabilityProjects } = await load("app/data/capability-bricks.ts");
const { default: Exhibit, CapabilityScene } = await load("app/components/v3/CapabilityBricks.tsx");

test("every contribution has an immediate, named starting point, addition and use", () => {
  for (const project of capabilityProjects) for (const change of project.changes) {
    const html = renderToStaticMarkup(createElement(CapabilityScene, { change }));
    for (const role of ["Starting point", "My contribution", "Enables"]) assert.ok(html.includes(role));
    for (const part of [change.scene.start, change.scene.addition, change.scene.result]) {
      assert.ok(part.label.length > 3 && part.detail.length > 8);
      assert.ok(html.includes(`<strong>${part.label}</strong>`));
      assert.ok(html.includes(`<small>${part.detail}</small>`));
    }
    assert.equal((html.match(/data-output-tile="true"/g) ?? []).length, change.id === "ash-transpiler" ? 15 : 0);
    assert.doesNotMatch(html, /<title|<text|tabindex|data-layer=|data-lineage/);
  }
});

test("outcome precedes artwork in document order and no labels depend on motion or hover", () => {
  const html = renderToStaticMarkup(createElement(Exhibit));
  for (const [section] of html.matchAll(/<section class="cap-change"[\s\S]*?<\/section>/g)) {
    assert.ok(section.indexOf("<h3") < section.indexOf('class="cap-scene"'));
    assert.match(section, /Read this contribution on GitHub/);
  }
  const css = readFileSync(new URL("../public/living-systems.css", import.meta.url), "utf8");
  assert.match(css, /\.cap-scene__label small, \.cap-hero \.cap-scene__label small \{ display: block/);
  assert.doesNotMatch(css, /\.cap-scene[^{}]*\{[^}]*display:\s*none/);
  assert.match(css, /\.cap-change__intro, \.living-feature \{ grid-template-columns: 1fr/);
  const js = readFileSync(new URL("../public/interactions.js", import.meta.url), "utf8");
  assert.match(js, /\(currentView \|\| stack\)\.querySelectorAll\("\.cap-piece"\)/);
});

test("scene text retains contrast at the brightest gradient endpoint in each theme", () => {
  const rgb = (hex) => hex.match(/[a-f\d]{2}/gi).map((s) => parseInt(s, 16));
  const luminance = (channels) => channels.map((n) => {
    const value = n / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  }).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
  const variants = [
    ["#203f35", "#54665c", "#f4f4eb", "#ffffff"],
    ["#e2e9d8", "#b6c1b0", "#14231d", "#243d2c"],
    ["#f3efe6", "#c3d1b8", "#17372b", "#355743"],
  ];
  for (const [ink, muted, paper, highlight] of variants) {
    const surface = rgb(paper).map((n, i) => n * .75 + rgb(highlight)[i] * .25);
    for (const foreground of [ink, muted]) for (const background of [rgb(paper), surface]) {
      const [high, low] = [luminance(rgb(foreground)), luminance(background)].sort((a, b) => b - a);
      assert.ok((high + .05) / (low + .05) >= 4.5, `${foreground} should remain readable on ${paper}`);
    }
  }
});

test("selection animates only the active scene and cancels on motion preference changes", async () => {
  const { runInNewContext } = await import("node:vm");
  const source = readFileSync(new URL("../public/interactions.js", import.meta.url), "utf8");
  const body = source.slice(source.indexOf("function connectCapabilityStories()"), source.indexOf("function observeLivingArt()"));
  let selection = "0", change, intersect, preferenceChanged, cancelled = 0;
  const animated = [];
  const button = { hidden: true, addEventListener() {} };
  const story = { querySelector: (s) => s.includes("replay") ? button : { value: selection }, addEventListener: (_, fn) => { change = fn; } };
  const stack = {
    closest: () => story,
    querySelector: (s) => ({ querySelectorAll: () => [0, 1, 2].map((order) => ({
      style: { getPropertyValue: (prop) => prop === "--assemble-order" ? String(order) : "12" },
      hasAttribute: () => false,
      animate: () => { animated.push(s); return { cancel: () => { cancelled++; } }; },
    })) }),
  };
  class Observer { constructor(fn) { intersect = fn; } observe() {} }
  const reduceMotion = { matches: false, addEventListener: (_, fn) => { preferenceChanged = fn; } };
  runInNewContext(`${body};connectCapabilityStories()`, {
    Element: { prototype: { animate() {} } },
    document: { hidden: false, querySelectorAll: () => [stack], querySelector: () => ({ addEventListener() {} }), addEventListener() {} },
    window: { IntersectionObserver: Observer }, IntersectionObserver: Observer, navigator: {}, reduceMotion,
  });
  intersect([{ isIntersecting: true, intersectionRatio: 1 }]);
  assert.deepEqual(animated, Array(3).fill('[data-change="0"]'));
  selection = "2"; change();
  assert.equal(cancelled, 3);
  assert.deepEqual(animated.slice(3), Array(3).fill('[data-change="2"]'));
  reduceMotion.matches = true; preferenceChanged();
  assert.equal(cancelled, 6);
  assert.equal(button.hidden, true);
});
