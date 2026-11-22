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
const { chapterAt, storyState } = await tsImport(new URL("app/components/blog/motion/story-timing.ts", root).href, import.meta.url);
const { blogArticles } = await tsImport(new URL("app/data/blog.ts", root).href, import.meta.url);

test("every authored scene has finite visible geometry changes within its own scroll range", () => {
  for (const story of motionStorySlugs) {
    const render = frame => renderToStaticMarkup(React.createElement(StoryScene, { story, frame, id: "test" }));
    const geometry = frame => render(frame).replace(/data-story-scene-frame="[^"]+"/g, "");
    for (const beat of motionStories[story].chapters) {
      assert.notEqual(geometry(beat.frame), geometry(beat.end), story + " " + beat.moment + " changes after its authored pose, not just its diagnostics");
      assert.equal(chapterAt(beat.frame, story), motionStories[story].chapters.indexOf(beat));
      assert.equal(chapterAt(beat.end, story), motionStories[story].chapters.indexOf(beat));
    }
    assert.notEqual(render(430), render(820), story);
    assert.equal(render(430), render(430), story + " is deterministic");
    assert.match(render(430), /data-story-scene-frame="430"/, story + " exposes the rendered, not requested, frame");
  }
});

test("visual focus and resolution begin with their matching semantic chapter", () => {
  for (const frame of [250, 299]) { assert.equal(chapterAt(frame), 0); assert.equal(storyState(frame).focus, 0); }
  assert.equal(chapterAt(300), 1); assert.equal(storyState(300).focus, 0);
  assert.ok(storyState(301).focus > 0);
  for (const frame of [610, 649]) { assert.equal(chapterAt(frame), 1); assert.equal(storyState(frame).resolve, 0); }
  assert.equal(chapterAt(650), 2); assert.equal(storyState(650).resolve, 0);
  assert.ok(storyState(651).resolve > 0);
  for (const frame of [-50, 0, 70, 430, 820, 900, 1500]) {
    for (const value of Object.values(storyState(frame))) assert.ok(value >= 0 && value <= 1);
  }
});

test("article motion remains a local progressive enhancement with bounded cost", async () => {
  const bundle = await read("public/article-motion.js");
  assert.ok(Buffer.byteLength(bundle) < 555_000);
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
    assert.equal((html.match(/data-story-description="true"/g) ?? []).length, motionStories[article.slug].chapters.length);
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

async function harness({ reduced = false, saved = false, deferredReady = false, deferredCommit = false, observers = true, desktop = false, runtime = "/article-motion.js?v=bound-byte-hash" } = {}) {
  const events = new Map(), frames = new Map(); let nextId = 0;
  const scripts = [], mounts = [], destroyed = [], seeks = [];
  const targets = () => ({ events: {}, addEventListener(name, fn) { this.events[name] = fn; }, removeEventListener(name, fn) { if (this.events[name] === fn) delete this.events[name]; } });
  const media = Object.assign(targets(), { matches: reduced });
  const forced = Object.assign(targets(), { matches: false });
  const connection = Object.assign(targets(), { saveData: saved });
  const stages = ["opening", "middle", "ending", "rail"].map((name, i) => {
    const nodes = Object.fromEntries(["title", "caption", "description"].map(key => ["[data-story-" + key + "]", { textContent: name + key }]));
    const still = { firstElementChild: { authored: true }, replaceChildren(node) { this.firstElementChild = node; } };
    return { dataset: { storyStage: name, storySlug: motionStorySlugs[0], storyFrame: String(name === "middle" ? 430 : name === "ending" ? 820 : 70), storyChapter: String(name === "middle" ? 1 : name === "ending" ? 2 : 0) }, top: i * 900, height: 600, artHeight: null, width: name === "rail" && !desktop ? 0 : 600,
      isConnected: true, attrs: new Set(), closest() { return this; }, querySelector(selector) {
        if (selector === ".article-story__still") return still;
        if (selector === ".article-story__viewport") return this.artHeight === null ? null : { getBoundingClientRect: () => ({ ...this.getBoundingClientRect(), bottom: this.top - context.scrollY + this.artHeight, height: this.artHeight }) };
        return selector === "[data-story-quiet]" ? buttons[i] : nodes[selector] ?? {};
      },
      getBoundingClientRect() {
        const inline = !!article["data-story-inline"] || !!context.narrowScreen;
        const hidden = desktop && (name === "rail" ? inline : name !== "opening" && !inline);
        return { top: this.top - context.scrollY, bottom: this.top - context.scrollY + this.height, height: hidden ? 0 : this.height, width: hidden ? 0 : this.width };
      },
      setAttribute(name) { this.attrs.add(name); }, removeAttribute(name) { this.attrs.delete(name); },
    };
  });
  const buttons = stages.map(stage => Object.assign(targets(), { isConnected: true, hidden: true, textContent: "Still view", setAttribute() {}, closest: () => stage,
    getBoundingClientRect() {
      const box = stage.getBoundingClientRect();
      return this.hidden || box.width === 0 ? { width: 0, height: 0 } : { top: box.bottom - 44, bottom: box.bottom, width: 100, height: 44 };
    },
    focus() { document.activeElement = this; document.events.focusin?.({ target: this }); },
  }));
  const readingNode = { isConnected: true, closest: () => null, setAttribute() {}, focus() { document.activeElement = this; document.events.focusin?.({ target: this }); }, getBoundingClientRect: () => ({ top: 1050 + (article["data-story-inline"] ? 240 : 0) - context.scrollY, bottom: 1130 + (article["data-story-inline"] ? 240 : 0) - context.scrollY, width: 500, height: 80 }) };
  const readingLink = { ...readingNode };
  const article = Object.assign(targets(), { isConnected: true, dataset: { storyFocus: "focus", storyResolve: "resolve", ...(runtime ? { storyRuntime: runtime } : {}) },
    querySelectorAll: selector => selector === "[data-story-stage]" ? stages : selector === "[data-story-quiet]" ? buttons : selector.includes("a[href]") ? [readingLink] : [readingNode],
    toggleAttribute(name, value) { this[name] = value; }, hasAttribute(name) { return !!this[name]; },
  });
  const body = { closest: () => null };
  const document = Object.assign(targets(), { hidden: false, body, activeElement: body, documentElement: {},
    querySelector: () => article, head: { append: script => scripts.push(script) }, createElement: () => ({}),
    getElementById: name => ({ getBoundingClientRect: () => ({ top: ({ overview: 100, focus: 1100, resolve: 2200, takeaway: 3300 }[name]) - context.scrollY }) }),
  });
  let callback;
  const context = vm.createContext({ document, navigator: { connection }, innerHeight: 900, scrollY: 0, fontSize: "16px", narrowScreen: false,
    matchMedia: query => query.includes("reduced") ? media : forced,
    getComputedStyle: node => ({ fontSize: context.fontSize, display: node.hidden ? "none" : "block", visibility: "visible" }),
    IntersectionObserver: class { constructor(fn) { callback = fn; } observe() {} disconnect() {} },
    ResizeObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame: fn => { const id = ++nextId; frames.set(id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id),
    addEventListener: (name, fn) => events.set(name, fn),
    window: { scrollBy: ({ top }) => { context.scrollY += top; }, mountArticleStory: (element, slug, frame, ready, failed) => {
      const id = mounts.length; const record = { id, slug, frame, committedFrame: frame, ready, failed };
      mounts.push(record); if (!deferredReady) ready();
      return { seek: f => { seeks.push(f); if (!deferredCommit) record.committedFrame = f; }, checkpoint: () => ({ frame: record.committedFrame, svg: { committedFrame: record.committedFrame } }), destroy: () => destroyed.push(id) };
    } },
  });
  if (observers) context.window.IntersectionObserver = context.IntersectionObserver;
  context.window.ResizeObserver = context.ResizeObserver;
  vm.runInContext(await read("public/article-scroll.js"), context);
  const flush = () => { const entries = [...frames]; frames.clear(); for (const [, fn] of entries) fn(); };
  return { context, document, article, stages, buttons, media, forced, connection, events, frames, scripts, mounts, destroyed, seeks, readingNode, readingLink, flush,
    enter: stage => callback([{ target: stage, isIntersecting: true }]), exit: stage => callback([{ target: stage, isIntersecting: false }]),
    loaded() { scripts.at(-1).onload(); flush(); },
  };
}

function reverseStage(h, data = {}) {
  const stage = h.stages[1];
  Object.assign(stage.dataset, { storyStartFrame: "300", storyReverseFloor: "350", storyEndFrame: "600", ...data });
  // Keep a test stage visible independently of scroll so both clamp limits can
  // be exercised without an offscreen disposal masking the clock assertions.
  stage.getBoundingClientRect = () => ({ top: 150, bottom: 750, width: 600, height: 600 });
  h.context.scrollY = 1500;
  return stage;
}
function scrollBy(h, pixels, flush = true) {
  h.context.scrollY += pixels; h.events.get("scroll")(); if (flush) h.flush();
}

test("a first-ever upward arrival moves below its authored pose without a prior downward seek or checkpoint", async () => {
  const h = await harness(); const stage = reverseStage(h);
  h.enter(stage); h.flush(); h.loaded();
  assert.equal(h.mounts[0].frame, 430);
  assert.equal(h.seeks.length, 0);
  scrollBy(h, -100);
  assert.equal(h.seeks.at(-1), 398);
  scrollBy(h, 200);
  assert.equal(h.seeks.at(-1), 462, "forward pacing remains 170 frames per 525px, not 250");
  assert.equal(h.mounts.length - h.destroyed.length, 1);
});

test("all 39 chapters opt into first-upward motion without changing their authored arrival or forward rate", async () => {
  let count = 0;
  for (const story of motionStorySlugs) for (const beat of motionStories[story].chapters) {
    const data = { storySlug: story, storyStage: beat.moment, storyFrame: String(beat.frame),
      storyStartFrame: String(beat.start), storyReverseFloor: String(beat.reverseFloor), storyEndFrame: String(beat.end) };
    const reverse = await harness(); const stage = reverseStage(reverse, data);
    reverse.enter(stage); reverse.flush(); reverse.loaded();
    assert.equal(reverse.mounts[0].frame, beat.frame);
    scrollBy(reverse, -100);
    assert.equal(reverse.seeks.at(-1), Math.round(Math.max(beat.reverseFloor, beat.frame - (beat.end - beat.frame) * 100 / 525)));
    assert.ok(reverse.seeks.at(-1) < beat.frame, story + "/" + beat.moment + " responds on its first direction");
    const forward = await harness(); const other = reverseStage(forward, data);
    forward.enter(other); forward.flush(); forward.loaded(); scrollBy(forward, 100);
    assert.equal(forward.seeks.at(-1), Math.round(beat.frame + (beat.end - beat.frame) * 100 / 525));
    count++;
  }
  assert.equal(count, 39);
});

test("missing or malformed reverse metadata preserves the exact legacy clamp; zero is valid", async () => {
  for (const data of [
    { storyReverseFloor: undefined }, { storyReverseFloor: "" }, { storyReverseFloor: " " },
    { storyReverseFloor: "NaN" }, { storyReverseFloor: "Infinity" }, { storyReverseFloor: "350.5" },
    { storyReverseFloor: "299" }, { storyReverseFloor: "430" }, { storyReverseFloor: "450" },
    { storyStartFrame: "" }, { storyStartFrame: "-1" }, { storyStartFrame: "300.5" },
    { storyEndFrame: "430" }, { storyEndFrame: "901" },
    { storyFrame: "bad" }, { storyFrame: undefined }, { storyFrame: "429.5" },
  ]) {
    const h = await harness(); const stage = reverseStage(h, data);
    h.enter(stage); h.flush(); h.loaded(); scrollBy(h, -100);
    assert.equal(h.seeks.at(-1) ?? h.mounts[0].frame, 430, JSON.stringify(data));
  }
  const h = await harness(); const stage = reverseStage(h, { storyStartFrame: "0", storyReverseFloor: "0" });
  h.enter(stage); h.flush(); h.loaded(); scrollBy(h, -2000);
  assert.equal(h.seeks.at(-1), 0);
});

test("upward displacement during loading and readiness is not mistaken for reading progress", async () => {
  const h = await harness({ deferredReady: true }); const stage = reverseStage(h);
  h.enter(stage); h.flush(); scrollBy(h, -100);
  h.loaded(); assert.equal(h.mounts[0].frame, 430);
  scrollBy(h, -100); h.events.get("resize")(); h.flush();
  assert.equal(h.seeks.length, 0);
  h.mounts[0].ready(); h.flush();
  assert.equal(h.seeks.length, 0);
  scrollBy(h, -100); assert.equal(h.seeks.at(-1), 398);
});

test("resize preserves the requested reverse clock while parking preserves only the committed drawing", async () => {
  const h = await harness({ deferredCommit: true }); const stage = reverseStage(h);
  h.enter(stage); h.flush(); h.loaded();
  scrollBy(h, -100, false); h.events.get("resize")(); h.flush();
  assert.equal(h.seeks.at(-1), 398);
  h.mounts[0].committedFrame = 410;
  scrollBy(h, -50); assert.equal(h.seeks.at(-1), 382);
  h.events.get("resize")(); h.flush();
  assert.equal(h.seeks.at(-1), 382, "resize does not seek back to the older acknowledged 410");
  h.exit(stage);
  assert.equal(stage.querySelector(".article-story__still").firstElementChild.committedFrame, 410);
  h.context.scrollY = 1700; h.enter(stage); h.flush();
  assert.equal(h.mounts[1].frame, 410);
  scrollBy(h, -100); assert.equal(h.seeks.at(-1), 378);
  assert.equal(h.mounts.length - h.destroyed.length, 1);
});

test("semantic floors saturate without changing the signed clock, and reversal responds after resize rebase", async () => {
  const h = await harness(); const stage = reverseStage(h);
  h.enter(stage); h.flush(); h.loaded();
  scrollBy(h, -300); assert.equal(h.seeks.at(-1), 350);
  const count = h.seeks.length;
  scrollBy(h, 20); assert.equal(h.seeks.length, count, "unrebased overshoot is preserved, as before");
  scrollBy(h, 80); assert.equal(h.seeks.at(-1), 365, "direction reversal retraces the signed displacement");
  scrollBy(h, -500); assert.equal(h.seeks.at(-1), 350);
  h.events.get("resize")(); h.flush(); scrollBy(h, 100);
  assert.equal(h.seeks.at(-1), 382);
  scrollBy(h, 2000); assert.equal(h.seeks.at(-1), 600);
  h.events.get("resize")(); h.flush(); scrollBy(h, -100);
  assert.equal(h.seeks.at(-1), 568);
});

test("a real geometry resize applies pending displacement with the old slope before using the new slope", async () => {
  const h = await harness({ deferredCommit: true }); const stage = reverseStage(h);
  h.enter(stage); h.flush(); h.loaded();
  scrollBy(h, -100, false);
  stage.getBoundingClientRect = () => ({ top: 150, bottom: 550, width: 640, height: 400 });
  h.context.innerHeight = 700;
  h.events.get("resize")(); h.flush();
  assert.equal(h.seeks.at(-1), 398, "pending scroll uses the original 525px span");
  h.mounts[0].committedFrame = 410;
  scrollBy(h, -50);
  assert.equal(h.seeks.at(-1), 375, "new scroll uses 170 / (400 * .65 + 700 * .15), based on requested 398");
  h.exit(stage);
  assert.equal(stage.querySelector(".article-story__still").firstElementChild.committedFrame, 410);
  h.enter(stage); h.flush();
  assert.equal(h.mounts[1].frame, 410, "remount still belongs to the committed drawing");
  scrollBy(h, -50);
  assert.equal(h.seeks.at(-1), 387);
});

test("every static preference and failure clears a parked below-authored pose and restores the authored fallback", async () => {
  for (const mode of ["quiet", "reduced", "forced", "saved", "hidden", "pagehide", "failure"]) {
    const h = await harness(); const stage = reverseStage(h);
    const original = stage.querySelector(".article-story__still").firstElementChild;
    h.enter(stage); h.flush(); h.loaded(); scrollBy(h, -100); h.exit(stage);
    assert.equal(stage.querySelector(".article-story__still").firstElementChild.committedFrame, 398);
    if (mode === "quiet") h.buttons[1].events.click();
    if (mode === "reduced") { h.media.matches = true; h.media.events.change(); }
    if (mode === "forced") { h.forced.matches = true; h.forced.events.change(); }
    if (mode === "saved") { h.connection.saveData = true; h.connection.events.change(); }
    if (mode === "hidden") { h.document.hidden = true; h.document.events.visibilitychange(); }
    if (mode === "pagehide") h.events.get("pagehide")();
    if (mode === "failure") { h.enter(stage); h.flush(); h.mounts.at(-1).failed(); }
    assert.equal(stage.querySelector(".article-story__still").firstElementChild, original, mode);
    assert.equal(stage.querySelector("[data-story-caption]").textContent, "middlecaption");
    assert.equal(stage.dataset.storyChapter, "1");
    assert.equal(stage.attrs.has("data-story-ready"), false);
    if (mode === "quiet") h.buttons[1].events.click();
    if (mode === "reduced") { h.media.matches = false; h.media.events.change(); }
    if (mode === "forced") { h.forced.matches = false; h.forced.events.change(); }
    if (mode === "saved") { h.connection.saveData = false; h.connection.events.change(); }
    if (mode === "hidden") { h.document.hidden = false; h.document.events.visibilitychange(); }
    if (mode === "pagehide") h.events.get("pageshow")();
    const count = h.mounts.length; h.enter(stage); h.flush();
    if (mode === "failure") assert.equal(h.mounts.length, count, "failed enhancement remains a still");
    else assert.equal(h.mounts.at(-1).frame, 430, "restoring " + mode + " starts at the authored still");
  }
});

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

test("inline clocks retain signed backward reading and constant slope after resize rebases", async () => {
  for (const [index, start, end] of [[0, 70, 250], [1, 430, 600], [2, 820, 900]]) {
    const h = await harness(); const stage = h.stages[index];
    h.context.scrollY = stage.top;
    h.enter(stage); h.flush(); h.loaded();
    h.context.scrollY += 200; h.events.get("scroll")(); h.flush();
    const forward = h.seeks.at(-1);
    assert.ok(forward > start);
    h.events.get("resize")(); h.flush();
    const count = h.seeks.length;
    h.events.get("scroll")(); h.flush(); assert.equal(h.seeks.length, count, "same-position layout scroll does not seek");
    h.context.scrollY -= 100; h.events.get("scroll")(); h.flush();
    assert.ok(h.seeks.at(-1) < forward, "backward reading can leave a rebased frame");
    assert.ok(Math.abs((forward - h.seeks.at(-1)) - (end - start) * 100 / 525) <= 1, "rebase does not shrink the slope to the remaining frame range");
    h.context.scrollY = stage.top - 20; h.events.get("scroll")(); h.flush();
    assert.equal(h.seeks.at(-1), start, "the final frame, not the signed displacement, is clamped to the authored range");
  }
});

test("reverse reentry resumes the committed pose, not an unrendered request or the opening still", async () => {
  const h = await harness({ deferredCommit: true }); const stage = h.stages[1];
  h.context.scrollY = stage.top; h.enter(stage); h.flush(); h.loaded();
  h.context.scrollY += 350; h.events.get("scroll")(); h.flush();
  assert.ok(h.seeks.at(-1) > 527);
  h.mounts[0].committedFrame = 527;
  h.exit(stage);
  assert.equal(stage.querySelector(".article-story__still").firstElementChild.committedFrame, 527);
  assert.equal(h.destroyed.length, 1);
  h.context.scrollY = 1400; h.enter(stage); h.flush();
  assert.equal(h.mounts[1].frame, 527, "parked drawing and first live frame agree");
  h.context.scrollY = 1300; h.events.get("scroll")(); h.flush();
  assert.ok(h.seeks.at(-1) < 527 && h.seeks.at(-1) > 430);
  const previous = h.seeks.at(-1);
  h.context.scrollY = 1200; h.events.get("scroll")(); h.flush();
  assert.ok(h.seeks.at(-1) < previous, "upward reading continues through the retained range");
  assert.equal(h.mounts.length - h.destroyed.length, 1);
});

test("still preferences discard parked poses and restore all original drawings", async () => {
  for (const mode of ["quiet", "reduced", "saved", "hidden", "pagehide"]) {
    const h = await harness(); const stage = h.stages[0];
    const original = stage.querySelector(".article-story__still").firstElementChild;
    h.enter(stage); h.flush(); h.loaded();
    h.context.scrollY = 200; h.events.get("scroll")(); h.flush(); h.exit(stage);
    assert.notEqual(stage.querySelector(".article-story__still").firstElementChild, original);
    if (mode === "quiet") h.buttons[0].events.click();
    if (mode === "reduced") { h.media.matches = true; h.media.events.change(); }
    if (mode === "saved") { h.connection.saveData = true; h.connection.events.change(); }
    if (mode === "hidden") { h.document.hidden = true; h.document.events.visibilitychange(); }
    if (mode === "pagehide") h.events.get("pagehide")();
    assert.equal(stage.querySelector(".article-story__still").firstElementChild, original, mode);
  }
});

test("mobile reading speed follows the artwork, not the length of its explanation", async () => {
  const frames = [];
  for (const height of [450, 1200]) {
    const h = await harness(); const stage = h.stages[0];
    stage.top = 100; stage.height = height; stage.width = 320; stage.artHeight = 200;
    h.context.innerHeight = 720;
    h.enter(stage); h.flush(); h.loaded();
    h.context.scrollY = 150; h.events.get("scroll")(); h.flush();
    frames.push(h.seeks.at(-1));
    assert.ok(h.seeks.at(-1) > 180, "the visible artwork makes material progress");
    const seeks = h.seeks.length;
    h.context.scrollY = 350; h.events.get("scroll")(); h.flush();
    assert.equal(h.destroyed.length, 1, "reading an offscreen artwork's guide needs no live player");
    assert.equal(h.seeks.length, seeks);
  }
  assert.equal(frames[0], frames[1]);
});

test("resize before a queued scroll frame does not erase real reading progress", async () => {
  const h = await harness(); h.enter(h.stages[0]); h.flush(); h.loaded();
  h.context.scrollY = 150; h.events.get("scroll")();
  h.events.get("resize")(); h.flush();
  assert.equal(h.seeks.length, 1);
  assert.equal(h.seeks[0], Math.round(70 + 180 * 150 / 525));
  h.events.get("resize")(); h.flush();
  assert.equal(h.seeks.length, 1, "resize alone still never advances the story");
});

test("all four capability cards use their own authored range and preserve backward reading after layout", async () => {
  for (const story of ["cloud-runtime", "aws-labs-mcp"]) {
    for (const [index, beat] of motionStories[story].chapters.entries()) {
      const h = await harness(); const stage = h.stages[index];
      stage.dataset.storyStage = beat.moment;
      stage.dataset.storySlug = story;
      stage.dataset.storyFrame = String(beat.frame);
      stage.dataset.storyEndFrame = String(beat.end);
      stage.width = 600;
      h.article.dataset.storyLayout = "inline";
      h.context.scrollY = stage.top;
      h.enter(stage); h.flush(); h.loaded();
      assert.equal(h.mounts[0].frame, beat.frame);
      assert.equal(h.mounts[0].slug, story);
      h.context.scrollY += 200; h.events.get("scroll")(); h.flush();
      const forward = h.seeks.at(-1);
      assert.ok(forward > beat.frame && forward <= beat.end, story + " " + beat.moment);
      h.events.get("resize")(); h.flush();
      const count = h.seeks.length;
      h.events.get("scroll")(); h.flush();
      assert.equal(h.seeks.length, count, "layout does not count as progress");
      h.context.scrollY -= 100; h.events.get("scroll")(); h.flush();
      assert.ok(h.seeks.at(-1) < forward);
      assert.ok(h.seeks.at(-1) >= beat.frame);
      assert.ok(Math.abs(forward - h.seeks.at(-1) - (beat.end - beat.frame) * 100 / 525) <= 1,
        "four-beat cards use the exact range, including the new later card");
    }
  }
});

test("legacy rails follow actual anchors in both directions, while published articles are paragraph-adjacent", async () => {
  const page = await read("app/components/blog/ArticlePage.tsx");
  assert.match(page, /data-story-layout="inline"/);
  assert.doesNotMatch(page, /<StoryStage[^>]*\brail\b/);
  const h = await harness({ desktop: true }); const rail = h.stages[3];
  rail.getBoundingClientRect = () => ({ top: 120, bottom: 720, width: 600, height: 600 });
  h.context.scrollY = 400;
  h.enter(rail); h.flush(); h.loaded();
  assert.equal(h.mounts[0].frame, 70, "the first live frame matches the production rail's opening still");
  h.events.get("resize")(); h.flush(); h.events.get("scroll")(); h.flush();
  assert.equal(h.seeks.length, 0, "layout alone does not replace the arrival pose");
  for (const [scroll, expected] of [[100 - 360, 70], [600 - 360, 250], [1100 - 360, 430], [2200 - 360, 820], [3300 - 360, 900], [1100 - 360, 430]]) {
    h.context.scrollY = scroll; h.events.get("scroll")(); h.flush();
    assert.equal(h.seeks.at(-1) ?? h.mounts[0].frame, expected, "rail frame aligns with the actual reading anchor, without remapping to a premature phase");
  }
});

test("each first live pose exactly matches its authored still, including late arrivals and delayed readiness", async () => {
  for (const [index, expected] of [[0, 70], [1, 430], [2, 820], [3, 70]]) {
    const h = await harness({ deferredReady: true });
    const stage = h.stages[index];
    if (index === 3) { stage.width = 600; stage.top = 1500; }
    h.context.scrollY = stage.top + 200;
    h.enter(stage); h.flush(); h.loaded();
    assert.equal(h.mounts[0].frame, expected);
    const render = frame => renderToStaticMarkup(React.createElement(StoryScene, { story: motionStorySlugs[0], frame, id: "same-pose" }));
    assert.equal(render(h.mounts[0].frame), render(Number(stage.dataset.storyFrame)));
    h.context.scrollY += 100; h.events.get("scroll")(); h.flush();
    assert.equal(h.seeks.length, 0, "an unfitted enhancement cannot preempt the authored arrival pose");
    h.mounts[0].ready();
    h.context.scrollY += 50; h.events.get("resize")(); h.flush();
    h.events.get("scroll")(); h.flush();
    assert.equal(h.seeks.length, 0, "layout events do not count as story progress");
    h.context.scrollY += 100; h.events.get("scroll")(); h.flush();
    assert.equal(h.seeks.length, 1, "the next actual scroll advances from the arrival pose");
    assert.ok(h.seeks[0] > expected);
  }
});

test("the exported runtime attribute controls the loader with only a source/dev fallback", async () => {
  for (const [runtime, expected] of [["/article-motion.js?v=bound-byte-hash", "/article-motion.js?v=bound-byte-hash"], [null, "/article-motion.js"]]) {
    const h = await harness({ runtime }); h.enter(h.stages[0]); h.flush();
    assert.equal(h.scripts[0].src, expected);
  }
});

test("manual Still view shows all authored chapters and preserves reading position and original labels", async () => {
  const h = await harness(); h.enter(h.stages[0]); h.flush(); h.loaded();
  h.context.scrollY = 800;
  const before = h.readingNode.getBoundingClientRect().top;
  h.stages[0].dataset.storyChapter = "2";
  h.stages[0].querySelector("[data-story-title]").textContent = "live title";
  h.buttons[0].events.click();
  assert.equal(h.article["data-story-inline"], true);
  assert.equal(h.readingNode.getBoundingClientRect().top, before);
  assert.equal(h.stages[0].dataset.storyChapter, "0");
  assert.equal(h.stages[0].querySelector("[data-story-title]").textContent, "openingtitle");
  assert.equal(h.stages[0].attrs.has("data-story-ready"), false);
  h.buttons[0].events.click(); h.flush();
  assert.equal(h.article["data-story-inline"], false);
  assert.equal(h.readingNode.getBoundingClientRect().top, before);
  assert.equal(h.mounts.at(-1).frame, 70, "deliberate reentry begins at the visible authored still, not a hidden old timeline");
});

test("missing intersection support retains the complete still narrative without importing motion", async () => {
  const h = await harness({ observers: false });
  assert.equal(h.article["data-story-inline"], true);
  assert.equal(h.scripts.length, 0);
  assert.ok(h.buttons.every(button => button.hidden));
});

test("desktop Still-view focus moves out of whichever illustration tree the mode hides", async () => {
  const h = await harness({ desktop: true });
  h.stages[3].top = 900; h.context.scrollY = 800;
  h.enter(h.stages[3]); h.flush(); h.loaded();
  h.document.activeElement = h.buttons[3]; h.buttons[3].events.click();
  assert.equal(h.article["data-story-inline"], true);
  assert.equal(h.document.activeElement, h.buttons[1], "the visible middle chapter receives focus without scrolling");
  h.buttons[1].events.click();
  assert.equal(h.article["data-story-inline"], false);
  assert.equal(h.document.activeElement, h.buttons[3], "returning to motion does not retain focus in a hidden inline chapter");
});

test("automatic preferences and responsive layout changes restore hidden focus without stealing unaffected focus", async () => {
  for (const change of ["reduced", "saved", "text-size", "narrow"]) {
    const h = await harness({ desktop: true });
    h.stages[3].top = 900; h.context.scrollY = 800;
    h.enter(h.stages[3]); h.flush(); h.loaded();
    h.document.activeElement = h.buttons[3];
    if (change === "reduced") { h.media.matches = true; h.media.events.change(); }
    if (change === "saved") { h.connection.saveData = true; h.connection.events.change(); }
    if (change === "text-size") { h.context.fontSize = "28px"; h.events.get("resize")(); }
    if (change === "narrow") { h.context.narrowScreen = true; h.events.get("resize")(); }
    h.flush();
    assert.equal(h.document.activeElement, change === "reduced" || change === "saved" ? h.readingLink : h.buttons[1], change + " uses a visible focusable destination");
  }
  const h = await harness({ desktop: true });
  h.document.activeElement = h.readingLink;
  h.media.matches = true; h.media.events.change();
  assert.equal(h.document.activeElement, h.readingLink, "a reading link outside the hidden stage is left alone");
});

test("focus recovery survives native blur before preference and resize callbacks", async () => {
  for (const change of ["reduced", "saved", "text-size", "narrow"]) {
    const h = await harness({ desktop: true });
    h.stages[3].top = 900; h.context.scrollY = 800;
    h.enter(h.stages[3]); h.flush(); h.loaded();
    h.buttons[3].focus();
    h.document.activeElement = h.document.body; // Native visibility blur, without a new focusin.
    if (change === "reduced") { h.media.matches = true; h.media.events.change(); }
    if (change === "saved") { h.connection.saveData = true; h.connection.events.change(); }
    if (change === "text-size") { h.context.fontSize = "28px"; h.events.get("resize")(); }
    if (change === "narrow") { h.context.narrowScreen = true; h.events.get("resize")(); }
    h.flush();
    assert.equal(h.document.activeElement, change === "reduced" || change === "saved" ? h.readingLink : h.buttons[1], change + " restores from the remembered origin after the browser has already blurred it");
    const box = h.document.activeElement.getBoundingClientRect();
    assert.ok(box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < h.context.innerHeight);
  }
});

test("positive rectangles inside closed details never outrank a focusable reading paragraph", async () => {
  for (const native of [false, true]) {
    const h = await harness({ desktop: true });
    h.stages[3].top = 900; h.context.scrollY = 800;
    h.enter(h.stages[3]); h.flush(); h.loaded();
    const summary = { tagName: "SUMMARY", contains: () => false };
    h.readingLink.parentElement = { tagName: "DETAILS", open: false, children: [summary] };
    h.readingLink.focus = () => {}; // A closed panel's link cannot receive native focus.
    if (native) h.readingLink.checkVisibility = options => {
      assert.equal(options.checkVisibilityCSS, true);
      return false;
    };
    h.buttons[3].focus();
    h.document.activeElement = h.document.body;
    h.media.matches = true; h.media.events.change();
    const box = h.readingLink.getBoundingClientRect();
    assert.ok(box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < h.context.innerHeight, "the misleading closed-panel rectangle remains positive and onscreen");
    assert.equal(h.document.activeElement, h.readingNode, native ? "native visibility rejects the closed-panel link" : "the ancestor fallback rejects it without the native API");
  }
});

test("focus destinations exclude inert ancestors but retain the summary of closed details", async () => {
  for (const destination of ["inert", "summary"]) {
    const h = await harness({ desktop: true });
    h.stages[3].top = 900; h.context.scrollY = 800;
    h.enter(h.stages[3]); h.flush(); h.loaded();
    if (destination === "inert") h.readingLink.parentElement = { inert: true };
    else {
      h.readingLink.tagName = "SUMMARY";
      h.readingLink.parentElement = { tagName: "DETAILS", open: false, children: [h.readingLink] };
    }
    h.buttons[3].focus();
    h.document.activeElement = h.document.body;
    h.media.matches = true; h.media.events.change();
    assert.equal(h.document.activeElement, destination === "inert" ? h.readingNode : h.readingLink, destination + " respects native focus eligibility");
  }
});

test("intentional outside focus clears the remembered origin and unaffected focus is never stolen", async () => {
  for (const outside of ["link", "body"]) {
    const h = await harness({ desktop: true });
    h.stages[3].top = 900; h.context.scrollY = 800;
    h.enter(h.stages[3]); h.flush(); h.loaded();
    h.buttons[3].focus();
    const target = outside === "link" ? h.readingLink : h.document.body;
    h.document.activeElement = target;
    h.document.events.focusin({ target });
    h.document.activeElement = h.document.body;
    h.media.matches = true; h.media.events.change();
    assert.equal(h.document.activeElement, h.document.body, outside + " focusin prevents stale-origin recovery later");
  }
  const h = await harness({ desktop: true });
  h.stages[3].top = 900; h.context.scrollY = 800;
  h.enter(h.stages[3]); h.flush(); h.loaded();
  h.buttons[3].focus();
  h.document.activeElement = h.readingLink;
  h.media.matches = true; h.media.events.change();
  assert.equal(h.document.activeElement, h.readingLink, "an actual outside focus target is respected even if no focusin was observed");
  h.document.activeElement = h.document.body;
  h.media.events.change();
  assert.equal(h.document.activeElement, h.document.body, "observing actual outside focus also discards a previously remembered story origin");
});

test("a focused story figure can recover after native blur without depending on its button", async () => {
  const h = await harness({ desktop: true });
  h.stages[3].top = 900; h.context.scrollY = 800;
  h.enter(h.stages[3]); h.flush(); h.loaded();
  h.document.activeElement = h.stages[3];
  h.document.events.focusin({ target: h.stages[3] });
  h.document.activeElement = h.document.body;
  h.media.matches = true; h.media.events.change();
  assert.equal(h.document.activeElement, h.readingLink);
});

test("neutral focus is left alone when the remembered story control remains visible", async () => {
  const h = await harness({ desktop: true });
  h.stages[3].top = 900; h.context.scrollY = 800;
  h.enter(h.stages[3]); h.flush(); h.loaded();
  h.buttons[3].focus();
  h.document.activeElement = h.document.body;
  h.events.get("resize")(); h.flush();
  assert.equal(h.document.activeElement, h.document.body, "remembering a focus origin alone is not a reason to restore focus");
  h.media.matches = true; h.media.events.change();
  assert.equal(h.document.activeElement, h.document.body, "the unrelated neutral focus observed during resize cannot be reused to steal focus on a later hide");
});

test("pagehide and disconnected stories discard focus origins instead of restoring stale focus", async () => {
  for (const lifecycle of ["pagehide", "disconnect"]) {
    const h = await harness({ desktop: true });
    h.stages[3].top = 900; h.context.scrollY = 800;
    h.enter(h.stages[3]); h.flush(); h.loaded();
    h.buttons[3].focus();
    h.document.activeElement = h.document.body;
    if (lifecycle === "pagehide") {
      h.events.get("pagehide")();
      assert.equal(h.document.events.focusin, undefined);
    } else h.article.isConnected = false;
    h.media.matches = true; h.media.events.change();
    assert.equal(h.document.activeElement, h.document.body, lifecycle + " does not restore hidden or disconnected focus");
    if (lifecycle === "pagehide") {
      h.events.get("pageshow")();
      assert.equal(typeof h.document.events.focusin, "function");
    } else h.article.isConnected = true;
    h.media.events.change();
    assert.equal(h.document.activeElement, h.document.body, lifecycle + " discarded origin stays discarded after recovery");
  }
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
