import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { tsImport } from "tsx/esm/api";

const root = new URL("../", import.meta.url);
const load = (path) => tsImport(new URL(path, root).href, import.meta.url);
const { capabilityProjects, stackLayers } = await load("app/data/capability-bricks.ts");
const { default: Exhibit, CapabilityHero } = await load("app/components/v3/CapabilityBricks.tsx");
const { capabilityGeometry } = await load("app/components/v3/capability-geometry.ts");
const { getContributionGraph } = await load("app/components/contribution-story/graph-loaders.ts");
const html = renderToStaticMarkup(createElement(Exhibit));

test("nine capability pieces retain exact source URLs and dates", () => {
  assert.equal(capabilityProjects.length, 3);
  for (const project of capabilityProjects) {
    assert.equal(project.changes.length, 3);
    const graph = getContributionGraph(project.id);
    for (const change of project.changes) {
      const beat = graph.beats.find((beat) => beat.id === change.id);
      assert.equal(change.href, beat.href);
      assert.equal(change.date, beat.date);
      assert.ok(change.layers.every((id) => stackLayers.some((layer) => layer.id === id)));
      assert.ok(html.includes(change.href));
    }
    assert.deepEqual(project.changes.map((change) => change.date), project.changes.map((change) => change.date).sort());
  }
});

test("static first frame has native selection, explanations and no data loader", () => {
  assert.equal((html.match(/type="radio"/g) ?? []).length, 12);
  assert.equal((html.match(/checked=""/g) ?? []).length, 4);
  assert.equal((html.match(/data-cap-replay="true" hidden=""/g) ?? []).length, 3);
  assert.equal((html.match(/class="cap-scene"/g) ?? []).length, 9);
  assert.doesNotMatch(html, /data-layer=|Where it fits|Layers show areas/);
  assert.match(html, /not a release date/);
  assert.doesNotMatch(html, /<canvas|<script|<iframe|Loading|NaN|Infinity|undefined/);
  assert.equal(html, renderToStaticMarkup(createElement(Exhibit)));
  const hero = renderToStaticMarkup(createElement(CapabilityHero));
  assert.match(hero, /One definition. Fifteen coding tools/);
  assert.equal((hero.match(/data-output-tile="true"/g) ?? []).length, 15);
  assert.match(hero, /My contribution/);
});

test("preserved polycube geometry remains recoverable without being used as a category chart", () => {
  for (const project of capabilityProjects) {
    const geometry = capabilityGeometry(project);
    assert.equal(geometry.cells.length, 48);
    assert.equal(new Set(geometry.cells.map((c) => `${c.x},${c.y},${c.z}`)).size, 48);
    assert.ok(geometry.faces.length < 45, "Surfaces are merged, not individual cube grids");
    for (const [index, change] of project.changes.entries()) {
      const cells = geometry.cells.filter((c) => c.owner === String(index));
      const layers = [...new Set(cells.map((c) => stackLayers[Math.floor(c.y / 2)].id))].sort();
      assert.deepEqual(layers, [...change.layers].sort());
      assert.ok(cells.some((c) => c.z === 0), "Every contribution has a visible front face");
      assert.ok(cells.some((c) => c.z === 1), "Every contribution has three-dimensional depth");
      const visited = new Set([cells[0]]);
      for (const a of visited) for (const b of cells) {
        if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z) === 1) visited.add(b);
      }
      assert.equal(visited.size, cells.length, "Each contribution is one connected solid");
    }
    for (const face of geometry.faces) {
      assert.match(face.d, /^M.*Z$/);
      assert.doesNotMatch(face.d, /NaN|undefined/);
      for (const [, x, y] of face.d.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)) assert.ok(+x >= 28 && +x <= 272 && +y >= 0 && +y <= 315);
    }
  }
  assert.doesNotMatch(html, /cap-tower/);
});

test("replay is bounded, optional, and respects motion and visibility", async () => {
  const source = await readFile(new URL("public/interactions.js", root), "utf8");
  const body = source.slice(source.indexOf("function connectCapabilityStories()"), source.indexOf("function observeLivingArt()"));
  assert.match(body, /duration: 850/);
  assert.match(body, /delay: selectionOnly \? 0 : order \* 65/);
  assert.match(body, /transform: "translate\(0px,0px\)", opacity: 1/);
  assert.match(body, /fill: "backwards"/);
  assert.match(body, /else if \(!entered\)/);
  assert.match(body, /reduceMotion\.matches/);
  assert.match(body, /document\.hidden/);
  assert.match(body, /saveData/);
  assert.match(body, /animation\.cancel\(\)/);
  assert.doesNotMatch(body, /requestAnimationFrame|setInterval|fetch\(|addEventListener\("scroll"/);
  const css = await readFile(new URL("public/living-systems.css", root), "utf8");
  for (const project of capabilityProjects) assert.ok(css.includes(`input[value="${project.id}"]:checked`));
  assert.match(css, /\.cap-history input:focus-visible \+ span/);
  assert.match(css, /@supports not selector\(:has\(\*\)\)/);
  assert.match(css, /\.cap-project, \.cap-fallback-name, \.cap-change \{ display: block; \}/);
  assert.match(html, /Replay illustration/);
  assert.doesNotMatch(css, /transform: translate\(var\(--piece/);
  assert.match(css, /\.cap-piece \{ transform: translate\(0, 0\);/);
  assert.match(css, /\.cap-piece\[data-internal\] \{ visibility: hidden; \}/);
  const notice = await readFile(new URL("THIRD_PARTY_NOTICES.md", root), "utf8");
  assert.match(notice, /OriginKit Plate Stack/);
});

test("replay survives rapid project revisits without observer callbacks", async () => {
  const { runInNewContext } = await import("node:vm");
  const source = await readFile(new URL("public/interactions.js", root), "utf8");
  const body = source.slice(source.indexOf("function connectCapabilityStories()"), source.indexOf("function observeLivingArt()"));
  for (const withObserver of [false, true]) {
    let selected = 0;
    const listeners = [], observers = [], buttons = [], counts = [0, 0];
    const stacks = counts.map((_, id) => {
      const button = { hidden: true, addEventListener: (_, fn) => { button.click = fn; } };
      buttons.push(button);
      const story = { querySelector: (s) => s.includes("replay") ? button : { value: "2" }, addEventListener() {} };
      const piece = {
        style: { getPropertyValue: () => "0" }, hasAttribute: () => false,
        animate: (frames, options) => {
          assert.equal(frames.at(-1).transform, "translate(0px,0px)");
          assert.equal(options.fill, "backwards");
          counts[id]++;
          return { cancel() {} };
        },
      };
      return {
        closest: () => story, querySelector: () => ({ querySelectorAll: () => [piece] }), querySelectorAll: () => [piece],
        getBoundingClientRect: () => selected === id
          ? { width: 300, height: 300, top: 100, bottom: 400 }
          : { width: 0, height: 0, top: 0, bottom: 0 },
      };
    });
    class Observer { constructor(fn) { observers.push(fn); } observe() {} }
    runInNewContext(`${body};connectCapabilityStories()`, {
      Element: { prototype: { animate() {} } },
      window: { innerHeight: 800, ...(withObserver ? { IntersectionObserver: Observer } : {}) },
      IntersectionObserver: Observer,
      document: {
        hidden: false, querySelectorAll: () => stacks,
        querySelector: () => ({ addEventListener: (_, fn) => listeners.push(fn) }), addEventListener() {},
      },
      reduceMotion: { matches: false, addEventListener() {} }, navigator: {},
    });
    observers.forEach((fn, id) => fn([{ isIntersecting: id === 0, intersectionRatio: id === 0 ? 1 : 0 }]));
    counts.fill(0);
    buttons[0].click();
    selected = 1; listeners.forEach((fn) => fn()); buttons[1].click();
    selected = 0; listeners.forEach((fn) => fn()); buttons[0].click();
    assert.deepEqual(counts, [2, 1]);
    assert.ok(buttons.every((button) => !button.hidden));
  }
});
