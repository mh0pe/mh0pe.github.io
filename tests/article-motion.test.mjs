import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { gzipSync } from "node:zlib";
import { tsImport } from "tsx/esm/api";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = new URL("../", import.meta.url);
const read = name => readFile(new URL(name, root), "utf8");
const { motionStories, motionStorySlugs } = await tsImport(new URL("app/data/article-motion.ts", root).href, import.meta.url);
const { StoryScene } = await tsImport(new URL("app/components/blog/motion/StoryScene.tsx", root).href, import.meta.url);
const { blogArticles } = await tsImport(new URL("app/data/blog.ts", root).href, import.meta.url);

test("all nine opening scenes actually change inside the opening scroll range", () => {
  for (const story of motionStorySlugs) {
    const render = frame => renderToStaticMarkup(React.createElement(StoryScene, { story, frame, id: "test" }));
    assert.notEqual(render(70), render(230), story);
    assert.notEqual(render(430), render(820), story);
    assert.equal(render(430), render(430), story + " is deterministic");
  }
});

test("article motion remains a local progressive enhancement with bounded cost", async () => {
  const bundle = await read("public/article-motion.js");
  assert.ok(Buffer.byteLength(bundle) < 550_000);
  assert.ok(gzipSync(bundle).length < 175_000);
  const entry = await read("app/components/blog/motion/player-entry.tsx");
  assert.match(entry, /useCurrentFrame|StoryComposition/);
  assert.match(entry, /autoPlay=\{false\}/);
  assert.match(entry, /numberOfSharedAudioTags=\{0\}/);
  assert.match(entry, /initiallyMuted/);
  assert.doesNotMatch(bundle, /vite-rsc|client-in-server-package-proxy|codex-remote\.invalid/);
  for (const article of blogArticles) {
    const html = await read("pages-dist/blog/" + article.slug + "/index.html");
    assert.equal((html.match(/data-static-runtime="article-scroll"/g) ?? []).length, 1);
    assert.equal((html.match(/data-story-description="true"/g) ?? []).length, 4);
    assert.ok(html.includes('/living-feature.css?'));
    for (const p of [...article.intro, ...article.sections.flatMap(section => section.paragraphs)]) {
      const escaped = p.replaceAll("&", "&amp;").replaceAll("'", "&#x27;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      assert.ok(html.includes(escaped), article.slug + " preserves prose");
    }
  }
  for (const name of ["index.html", "blog/index.html", "work/index.html", "models/index.html"]) {
    assert.doesNotMatch(await read("pages-dist/" + name), /article-scroll\.js|article-motion\.js|living-feature\.css/);
  }
  const css = await read("public/living-feature.css");
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /@media print/);
  assert.match(css, /article-story__keys/);
  assert.doesNotMatch(css, /\binfinite\b|backdrop-filter/);
  for (const story of Object.values(motionStories)) assert.doesNotMatch(JSON.stringify(story), /—/u);
});

async function harness({ reduced = false, saved = false } = {}) {
  const events = new Map(), frames = new Map(); let nextId = 0;
  const scripts = [], mounts = [], destroyed = [], seeks = [];
  const targets = () => ({ events: {}, addEventListener(name, fn) { this.events[name] = fn; } });
  const media = Object.assign(targets(), { matches: reduced });
  const forced = Object.assign(targets(), { matches: false });
  const connection = Object.assign(targets(), { saveData: saved });
  const stages = ["opening", "middle", "ending", "rail"].map((name, i) => {
    const nodes = Object.fromEntries(["title", "caption", "description"].map(key => ["[data-story-" + key + "]", { textContent: name + key }]));
    return { dataset: { storyStage: name, storySlug: motionStorySlugs[0] }, top: i * 900, width: name === "rail" ? 0 : 600,
      attrs: new Set(), querySelector(selector) { return nodes[selector] ?? {}; },
      getBoundingClientRect() { return { top: this.top - context.scrollY, bottom: this.top - context.scrollY + 600, height: 600, width: this.width }; },
      setAttribute(name) { this.attrs.add(name); }, removeAttribute(name) { this.attrs.delete(name); },
    };
  });
  const buttons = stages.map(() => Object.assign(targets(), { hidden: true, textContent: "Still view", setAttribute() {} }));
  const article = Object.assign(targets(), { dataset: { storyFocus: "focus", storyResolve: "resolve" },
    querySelectorAll: selector => selector === "[data-story-stage]" ? stages : buttons,
    toggleAttribute(name, value) { this[name] = value; },
  });
  const document = Object.assign(targets(), { hidden: false, documentElement: {},
    querySelector: () => article, head: { append: script => scripts.push(script) }, createElement: () => ({}),
    getElementById: name => ({ getBoundingClientRect: () => ({ top: ({ overview: 100, focus: 1100, resolve: 2200, takeaway: 3300 }[name]) - context.scrollY }) }),
  });
  let callback;
  const context = vm.createContext({ document, navigator: { connection }, innerHeight: 900, scrollY: 0,
    matchMedia: query => query.includes("reduced") ? media : forced,
    getComputedStyle: () => ({ fontSize: "16px" }),
    IntersectionObserver: class { constructor(fn) { callback = fn; } observe() {} disconnect() {} },
    ResizeObserver: class { observe() {} },
    requestAnimationFrame: fn => { const id = ++nextId; frames.set(id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id),
    addEventListener: (name, fn) => events.set(name, fn),
    window: { mountArticleStory: (element, slug, frame, ready) => {
      const id = mounts.length; mounts.push({ id, slug, frame }); ready();
      return { seek: f => seeks.push(f), destroy: () => destroyed.push(id) };
    } },
  });
  context.window.IntersectionObserver = context.IntersectionObserver;
  context.window.ResizeObserver = context.ResizeObserver;
  vm.runInContext(await read("public/article-scroll.js"), context);
  const flush = () => { const entries = [...frames]; frames.clear(); for (const [, fn] of entries) fn(); };
  return { context, document, article, stages, buttons, media, connection, events, frames, scripts, mounts, destroyed, seeks, flush,
    enter: stage => callback([{ target: stage, isIntersecting: true }]), exit: stage => callback([{ target: stage, isIntersecting: false }]),
    loaded() { scripts.at(-1).onload(); flush(); },
  };
}

test("scroll controller lazily loads one player and coalesces rapid native scroll", async () => {
  const h = await harness(); h.enter(h.stages[0]); h.flush();
  assert.equal(h.scripts.length, 1); assert.equal(h.mounts.length, 0);
  h.loaded(); assert.equal(h.mounts.length, 1);
  h.context.scrollY = 200;
  for (let i = 0; i < 50; i++) h.events.get("scroll")();
  assert.equal(h.frames.size, 1); h.flush(); assert.equal(h.seeks.length, 1);
  h.flush(); assert.equal(h.frames.size, 0);
  h.exit(h.stages[0]); h.context.scrollY = 900; h.enter(h.stages[1]); h.flush();
  assert.equal(h.destroyed.length, 1); assert.equal(h.mounts.length, 2);
});

test("static preferences avoid the bundle and preference changes during loading avoid mounting", async () => {
  for (const prefs of [{ reduced: true }, { saved: true }]) {
    const h = await harness(prefs); h.enter(h.stages[0]); h.flush(); assert.equal(h.scripts.length, 0);
  }
  const h = await harness(); h.enter(h.stages[0]); h.flush(); h.media.matches = true; h.media.events.change(); h.loaded();
  assert.equal(h.mounts.length, 0); assert.equal(h.article["data-story-inline"], true);
  h.media.matches = false; h.media.events.change(); h.flush(); assert.equal(h.mounts.length, 1);
});

test("hidden tabs, failure, still-view and restored pages retain readable fallback", async () => {
  const h = await harness(); h.enter(h.stages[0]); h.flush(); h.loaded();
  h.buttons[0].events.click(); assert.equal(h.destroyed.length, 1); assert.equal(h.stages[0].attrs.size, 0);
  h.buttons[0].events.click(); h.flush(); assert.equal(h.mounts.length, 2);
  h.document.hidden = true; h.document.events.visibilitychange(); assert.equal(h.destroyed.length, 2);
  h.document.hidden = false; h.document.events.visibilitychange(); h.flush(); assert.equal(h.mounts.length, 3);
  h.events.get("pagehide")(); assert.equal(h.destroyed.length, 3);
  h.events.get("pageshow")(); h.flush(); assert.equal(h.mounts.length, 4);
  const failure = await harness(); failure.enter(failure.stages[0]); failure.flush(); failure.scripts[0].onerror();
  assert.equal(failure.mounts.length, 0); assert.equal(failure.stages[0].attrs.size, 0);
});
