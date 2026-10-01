import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import vm from "node:vm";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { tsImport } from "tsx/esm/api";

const root = new URL("../", import.meta.url);
const { default: Sculpture, buildSculpture } = await tsImport(new URL("app/components/v3/ContributionSculpture.tsx", root).href, import.meta.url);
const script = await readFile(new URL("public/interactions.js", root), "utf8");

test("sculpture preserves selected graph relationships without invented cross-project edges", () => {
  const fields = buildSculpture();
  assert.equal(fields.length, 8);
  for (const field of fields) {
    assert.deepEqual(field.connections.map((edge) => edge.id), field.project.edges.map((edge) => edge.id));
    assert.ok(field.connections.every((edge) => /^M[\d.-]+ [\d.-]+L[\d.-]+ [\d.-]+$/.test(edge.d)));
    assert.equal((field.nodes.match(/M/g) ?? []).length, field.project.nodes.length);
  }
  const first = renderToStaticMarkup(createElement(Sculpture));
  assert.equal(first, renderToStaticMarkup(createElement(Sculpture)));
  assert.equal((first.match(/data-graph-id=/g) ?? []).length, 8);
  assert.doesNotMatch(first, /NaN|undefined|<canvas|<script|<image|foreignObject/);
  assert.match(first, /surrounding orbits are decorative/);
  assert.ok((first.match(/<(?!\/)[a-z][^>]*>/g) ?? []).length <= 55);
  assert.ok(gzipSync(first).byteLength <= 3 * 1024);
});

test("OriginKit enhancements retain bounded CSS and static readable animation states", async () => {
  const [foundation, brand, enhancement] = await Promise.all(["portfolio-v2.css", "portfolio-v3.css", "interactions.css"].map((name) => readFile(new URL(`public/${name}`, root), "utf8")));
  assert.ok(gzipSync(enhancement).byteLength <= 5 * 1024);
  assert.ok([foundation, brand, enhancement].reduce((sum, css) => sum + gzipSync(css).byteLength, 0) <= 47 * 1024);
  assert.match(enhancement, /contribution-arrive[^;]+backwards;/);
  assert.doesNotMatch(enhancement, /contribution-arrive[^;]+(?:infinite|both|forwards);/);
  assert.match(enhancement, /\[data-art-static\][\s\S]*?animation: none !important/);
  assert.match(enhancement, /\[data-art-suspended\][\s\S]*?animation-play-state: paused/);
  assert.match(enhancement, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(brand, /\.hope-line:has\(/);
  assert.match(brand, /\.hope-line:not\(\[data-contribution-focus\]\):has\(/);
  assert.match(enhancement, /@media \(min-width: 96rem\)[\s\S]*?\.journey-rail/);
  assert.match(enhancement, /left: max\(0\.35rem, calc\(\(100vw - 86rem\) \/ 2 - 4rem\)\)/);
});

class Target {
  attrs = new Set();
  listeners = new Map();
  dataset = {};
  children = [];
  addEventListener(type, callback) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), callback]);
  }
  emit(type, event = {}) { for (const callback of this.listeners.get(type) ?? []) callback(event); }
  toggleAttribute(name, enabled) { if (enabled) this.attrs.add(name); else this.attrs.delete(name); }
  contains(target) { return target === this || this.children.includes(target); }
  querySelectorAll(selector) { return selector === "[data-graph-id]" ? this.children : []; }
}

function harness({ reduced = false, saved = false, withArt = true } = {}) {
  const document = new Target();
  const rootElement = new Target();
  document.documentElement = rootElement;
  document.hidden = false;
  document.querySelector = () => null;
  const scene = new Target();
  const items = ["a", "b"].map((id) => { const item = new Target(); item.dataset.graphId = id; return item; });
  scene.children = items.map((item) => { const cluster = new Target(); cluster.dataset.graphId = item.dataset.graphId; return cluster; });
  document.querySelectorAll = (selector) => {
    if (!withArt) return [];
    if (selector === ".hope-line__index-item") return items;
    if (selector.includes("[data-contribution-sculpture]") || selector.includes("[data-motion-once]")) return [scene];
    return [];
  };
  const media = new Target(); media.matches = reduced;
  const connection = new Target(); connection.saveData = saved;
  const observers = [];
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  const window = new Target(); window.IntersectionObserver = Observer;
  vm.runInNewContext(script, {
    document, window, navigator: { connection }, IntersectionObserver: Observer,
    Element: Target,
    matchMedia: (query) => query.includes("prefers-reduced-motion") ? media : { matches: false },
  });
  return { document, rootElement, scene, items, media, connection, observers, window };
}

test("keyboard and pointer project focus restore each other without losing the selected cluster", () => {
  const h = harness();
  const active = () => h.scene.children.filter((node) => node.attrs.has("data-active-project")).map((node) => node.dataset.graphId);
  h.items[0].emit("focusin"); assert.deepEqual(active(), ["a"]);
  h.items[1].emit("pointerenter"); assert.deepEqual(active(), ["b"]);
  h.items[1].emit("pointerleave"); assert.deepEqual(active(), ["a"]);
  h.items[1].emit("pointerenter");
  h.items[0].emit("focusout", { relatedTarget: null }); assert.deepEqual(active(), ["b"]);
  h.items[1].emit("pointerleave"); assert.deepEqual(active(), []);
  assert.equal(h.scene.attrs.has("data-contribution-focus"), false);
});

test("art suspends outside the viewport and hidden pages, with live reduced-motion and data-saving preferences", () => {
  const h = harness();
  const observer = h.observers.find((item) => !item.options);
  observer.callback([{ target: h.scene, isIntersecting: false }]);
  assert.ok(h.scene.attrs.has("data-art-suspended"));
  observer.callback([{ target: h.scene, isIntersecting: true }]);
  assert.ok(!h.scene.attrs.has("data-art-suspended"));
  h.document.hidden = true; h.document.emit("visibilitychange");
  assert.ok(h.rootElement.attrs.has("data-page-hidden"));
  h.media.matches = true; h.media.emit("change");
  assert.ok(h.rootElement.attrs.has("data-art-static"));
  h.media.matches = false; h.media.emit("change");
  assert.ok(!h.rootElement.attrs.has("data-art-static"));
  h.connection.saveData = true; h.connection.emit("change");
  assert.ok(h.rootElement.attrs.has("data-art-static"));
  assert.ok(harness({ reduced: true }).rootElement.attrs.has("data-art-static"));
  assert.ok(harness({ saved: true }).rootElement.attrs.has("data-art-static"));
  assert.equal(h.window.listeners.has("scroll"), false);
  assert.equal(harness({ withArt: false }).observers.length, 0);
});
