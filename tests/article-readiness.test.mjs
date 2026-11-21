import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { transformSync } from "esbuild";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";
import { tsImport } from "tsx/esm/api";

const root = new URL("../", import.meta.url);
const read = name => readFile(new URL(name, root), "utf8");
const load = name => tsImport(new URL(name, root).href, import.meta.url);
const readiness = await load("app/components/blog/motion/scene-readiness.ts");
const stories = await load("app/data/article-motion.ts");
const timing = await load("app/components/blog/motion/story-timing.ts");
const svgNode = (overrides = {}) => ({
  namespaceURI: "http://www.w3.org/2000/svg", localName: "svg", isConnected: true,
  getBoundingClientRect: () => ({ width: 600, height: 375 }), ...overrides,
});
const playerNode = (svg, overrides = {}) => ({
  isConnected: true, opacity: "1", contains: node => node === svg,
  getBoundingClientRect: () => ({ width: 600, height: 375 }),
  ownerDocument: { defaultView: { getComputedStyle: node => ({ opacity: node.opacity, visibility: "hidden" }) } },
  ...overrides,
});

async function execute(name, modules, additions = {}) {
  const output = transformSync(await read(name), { loader: "tsx", format: "cjs", jsx: "automatic" }).code;
  const moduleRecord = { exports: {} };
  const jsx = (type, props) => ({ type, props });
  const context = vm.createContext({ module: moduleRecord, exports: moduleRecord.exports,
    require(id) {
      if (id === "react/jsx-runtime") return { jsx, jsxs: jsx };
      assert.ok(Object.hasOwn(modules, id), "expected dependency " + id);
      return modules[id];
    }, ...additions,
  });
  vm.runInContext(output, context);
  return { context, exports: moduleRecord.exports };
}

async function entryHarness(initialFrame = 70, story = stories.motionStorySlugs[0]) {
  const roots = [], microtasks = [], seeks = [];
  const nodes = Object.fromEntries(["title", "caption", "description"].map(key => ["[data-story-" + key + "]", { textContent: "still " + key }]));
  const stage = { dataset: { storyStage: "opening" }, querySelector: selector => nodes[selector] };
  const owned = new Set();
  const mount = { closest: () => stage, contains: node => owned.has(node) };
  let ready = 0, failed = 0, pauses = 0;
  const { context } = await execute("app/components/blog/motion/player-entry.tsx", {
    react: React,
    "react-dom/client": { createRoot: () => {
      const record = { rendered: null, unmounted: 0, render(tree) { this.rendered = tree; }, unmount() { this.unmounted += 1; } };
      roots.push(record); return record;
    } },
    "@remotion/player": { Player: () => null },
    "@/app/components/blog/motion/StoryComposition": { StoryComposition: () => null },
    "@/app/data/article-motion": stories,
    "@/app/components/blog/motion/story-timing": timing,
    "@/app/components/blog/motion/scene-readiness": readiness,
  }, { window: {}, queueMicrotask: fn => microtasks.push(fn) });
  const handle = context.window.mountArticleStory(mount, story, initialFrame, () => ready += 1, () => failed += 1);
  const player = roots[0].rendered.props.children.props;
  const container = playerNode(null, { contains: node => owned.has(node) }); owned.add(container);
  const ref = { pause: () => pauses += 1, seekTo: frame => seeks.push(frame), getContainerNode: () => container };
  const flush = () => { for (const fn of microtasks.splice(0)) fn(); };
  return { context, handle, roots, player, ref, container, owned, nodes, stage, seeks, flush,
    get ready() { return ready; }, get failed() { return failed; }, get pauses() { return pauses; },
  };
}

test("scene readiness requires owned, connected drawing and fitted Player roots with finite positive dimensions", () => {
  const good = svgNode();
  const container = playerNode(good);
  const mount = { contains: node => node === good || node === container };
  assert.equal(readiness.canRevealStoryScene(mount, good, container, false), true);
  assert.equal(readiness.canRevealStoryScene(mount, null, container, false), false);
  for (const overrides of [
    { namespaceURI: "http://www.w3.org/1999/xhtml" }, { localName: "div" }, { isConnected: false },
    ...[[0, 100], [100, 0], [-1, 100], [100, -1], [NaN, 100], [100, NaN], [Infinity, 100], [100, Infinity]].map(([width, height]) => ({ getBoundingClientRect: () => ({ width, height }) })),
  ]) {
    const svg = svgNode(overrides);
    assert.equal(readiness.canRevealStoryScene({ contains: () => true }, svg, playerNode(svg), false), false);
  }
  assert.equal(readiness.canRevealStoryScene(mount, svgNode(), container, false), false, "a foreign SVG cannot reveal this mount");
  assert.equal(readiness.canRevealStoryScene({ contains() { throw Error("disposed DOM must not be read"); } }, good, container, true), false);
  for (const invalid of [null, playerNode(good, { isConnected: false }), playerNode(svgNode()),
    playerNode(good, { ownerDocument: { defaultView: null } }),
    ...["0", ".5", "NaN"].map(opacity => playerNode(good, { opacity })),
    ...[[0, 100], [100, 0], [NaN, 100], [100, Infinity]].map(([width, height]) => playerNode(good, { getBoundingClientRect: () => ({ width, height }) })),
  ]) assert.equal(readiness.canRevealStoryScene({ contains: () => true }, good, invalid, false), false);
  assert.equal(readiness.canRevealStoryScene(mount, good, playerNode(good), false), false, "a foreign player root cannot reveal this mount");
});

test("composition signals scene availability only from an effect after its SVG is committed", async () => {
  const effects = [], received = [];
  let frame = 70;
  const { exports } = await execute("app/components/blog/motion/StoryComposition.tsx", {
    react: { useRef: () => ({ current: null }), useEffect: effect => effects.push(effect) },
    remotion: { staticFile: name => "/" + name, useCurrentFrame: () => frame },
    "@/app/components/blog/motion/StoryScene": { StoryScene: () => null },
  });
  const render = onSceneReady => exports.StoryComposition({ story: stories.motionStorySlugs[0], onSceneReady });
  const absent = render((svg, committedFrame) => received.push([svg, committedFrame]));
  assert.equal(received.length, 0);
  effects.shift()();
  assert.equal(received.length, 0, "no DOM means no availability callback");
  absent.props.ref.current = { querySelector: () => null };
  const committed = render((svg, committedFrame) => received.push([svg, committedFrame]));
  const svg = svgNode();
  committed.props.ref.current = { querySelector: selector => selector === "svg" ? svg : null };
  assert.equal(received.length, 0, "render itself never announces readiness");
  effects.shift()();
  assert.deepEqual(received, [[svg, 70]], "the callback reports the frame that actually committed");
  const fitted = render((svg, committedFrame) => received.push([svg, committedFrame]));
  fitted.props.ref.current = { querySelector: () => svg };
  effects.shift()();
  assert.deepEqual(received, [[svg, 70], [svg, 70]], "same-frame parent layout commits still retry availability");
  frame = 430;
  const still = render(undefined);
  still.props.ref.current = { querySelector() { throw Error("render-only compositions need no DOM readiness check"); } };
  effects.shift()();
  assert.equal(still.props.children[1].props.frame, 430);
});

test("the rendered composition font face uses the base blog swap policy with its existing family, source and weight", async () => {
  const { exports } = await execute("app/components/blog/motion/StoryComposition.tsx", {
    react: { useRef: () => ({ current: null }), useEffect: () => {} },
    remotion: { staticFile: name => "/" + name, useCurrentFrame: () => 70 },
    "@/app/components/blog/motion/StoryScene": { StoryScene: () => null },
  });
  const rendered = exports.StoryComposition({ story: stories.motionStorySlugs[0] });
  const style = rendered.props.children[0];
  assert.equal(style.type, "style");
  const instrumentSans = css => {
    const faces = [];
    postcss.parse(css).walkAtRules("font-face", rule => {
      const descriptors = Object.fromEntries(rule.nodes.filter(node => node.type === "decl").map(node => [node.prop, node.value]));
      if (descriptors["font-family"] === '"Instrument Sans"') faces.push(descriptors);
    });
    assert.equal(faces.length, 1, "exactly one normal Instrument Sans face is expected");
    return faces[0];
  };
  const composition = instrumentSans(style.props.children);
  assert.deepEqual(composition, {
    "font-family": '"Instrument Sans"',
    src: 'url("/fonts/instrument-sans-variable.woff2") format("woff2")',
    "font-weight": "400 700",
    "font-display": "swap",
  });
  for (const file of ["public/portfolio.css", "public/route-styles/blog.css", "pages-dist/route-styles/blog.css"]) {
    const blog = instrumentSans(await read(file));
    assert.equal(blog["font-style"], "normal", file);
    assert.equal(blog["font-family"], composition["font-family"], file);
    assert.equal(blog["font-weight"], composition["font-weight"], file);
    assert.equal(blog["font-display"], composition["font-display"], file);
    assert.match(blog.src, /^url\("\/fonts\/instrument-sans-variable\.woff2"\) format\("woff2(?:-variations)?"\)$/, file);
  }
});

test("player ref pauses and seeks but waits for the measured SVG before changing captions", async () => {
  const h = await entryHarness();
  assert.equal(h.stage.dataset.storyRequestedFrame, "70");
  h.container.opacity = "0";
  const svg = svgNode(); h.owned.add(svg);
  h.handle.seek(90);
  h.player.inputProps.onSceneReady(svg, 90);
  assert.equal(h.ready, 0, "the committed scene also waits for the initialized Player reference");
  h.player.ref(h.ref);
  assert.equal(h.pauses, 1);
  assert.deepEqual(h.seeks, [90], "pre-ref seeks are applied when the Player reference initializes");
  assert.equal(h.ready, 0);
  h.handle.seek(700);
  assert.equal(h.stage.dataset.storyRequestedFrame, "700");
  assert.deepEqual(h.seeks, [90, 700]);
  assert.equal(h.nodes["[data-story-title]"].textContent, "still title");
  const zero = svgNode({ getBoundingClientRect: () => ({ width: 0, height: 375 }) });
  h.owned.add(zero); h.player.inputProps.onSceneReady(zero, 700);
  h.player.inputProps.onSceneReady(svgNode(), 700);
  assert.equal(h.ready, 0);
  assert.equal(h.nodes["[data-story-title]"].textContent, "still title");
  h.container.opacity = "1";
  h.player.inputProps.onSceneReady(svg, 700);
  assert.equal(h.ready, 1);
  assert.equal(h.pauses, 2);
  assert.deepEqual(h.seeks, [90, 700], "the handoff accepts the committed latest frame without a fresh asynchronous seek");
  assert.equal(h.nodes["[data-story-title]"].textContent, stories.motionStories[stories.motionStorySlugs[0]].chapters[2].title);
  h.player.inputProps.onSceneReady(svg, 700);
  assert.equal(h.ready, 1, "readiness is idempotent across subsequent composition effects");
  assert.equal(h.pauses, 2);
  h.handle.seek(430);
  assert.equal(h.nodes["[data-story-title]"].textContent, stories.motionStories[stories.motionStorySlugs[0]].chapters[2].title, "a request does not preempt the drawing's caption");
  assert.equal(h.stage.dataset.storyChapter, "2");
  h.player.inputProps.onSceneReady(svg, 430);
  assert.equal(h.nodes["[data-story-title]"].textContent, stories.motionStories[stories.motionStorySlugs[0]].chapters[1].title);
  assert.equal(h.stage.dataset.storyChapter, "1");
});

test("rapid forward and backward seeks keep every caption and mobile chapter on the actual committed drawing", async () => {
  const h = await entryHarness();
  const svg = svgNode(); h.owned.add(svg); h.player.ref(h.ref);
  h.player.inputProps.onSceneReady(svg, 70);
  h.handle.seek(700); h.handle.seek(430);
  assert.equal(h.stage.dataset.storyChapter, "0", "requested work has not committed");
  h.player.inputProps.onSceneReady(svg, 700);
  assert.equal(h.stage.dataset.storyChapter, "2", "an intermediate committed drawing owns the caption even if another seek is queued");
  assert.equal(h.nodes["[data-story-caption]"].textContent, stories.motionStories[stories.motionStorySlugs[0]].chapters[2].caption);
  h.player.inputProps.onSceneReady(svg, 430);
  assert.equal(h.stage.dataset.storyChapter, "1");
  h.handle.seek(70);
  assert.equal(h.stage.dataset.storyChapter, "1");
  h.player.inputProps.onSceneReady(svg, 70);
  assert.equal(h.stage.dataset.storyChapter, "0");
  assert.equal(h.ready, 1, "later commits do not repeat first handoff");
});

test("four-beat captions follow committed frames through later and ending without skipping a capability", async () => {
  for (const story of ["cloud-runtime", "aws-labs-mcp"]) {
    const h = await entryHarness(70, story);
    const svg = svgNode(); h.owned.add(svg);
    h.player.ref(h.ref); h.player.inputProps.onSceneReady(svg, 70);
    for (const [index, beat] of stories.motionStories[story].chapters.entries()) {
      h.handle.seek(beat.frame);
      h.player.inputProps.onSceneReady(svg, beat.frame);
      assert.equal(h.stage.dataset.storyChapter, String(index));
      assert.equal(h.nodes["[data-story-title]"].textContent, beat.title);
      assert.equal(h.nodes["[data-story-description]"].textContent, beat.description);
    }
    h.handle.seek(560); h.player.inputProps.onSceneReady(svg, 820);
    assert.equal(h.stage.dataset.storyChapter, "3", "a stale fourth-beat drawing cannot announce the third beat");
    h.player.inputProps.onSceneReady(svg, 560);
    assert.equal(h.stage.dataset.storyChapter, "2");
  }
});

test("positive SVG bounds never replace the still while Remotion's fitted root is transparent", async () => {
  const h = await entryHarness();
  const svg = svgNode(); h.owned.add(svg);
  h.container.opacity = "0";
  h.player.ref(h.ref);
  h.player.inputProps.onSceneReady(svg, 70);
  assert.equal(h.ready, 0);
  assert.equal(h.nodes["[data-story-title]"].textContent, "still title");
  h.container.opacity = "1";
  h.player.inputProps.onSceneReady(svg, 70);
  assert.equal(h.ready, 1, "a fitted same-frame composition commit retries without a timer");
});

test("Player ref replacement retries a fitted committed scene without relying on an extra frame update", async () => {
  const h = await entryHarness();
  const svg = svgNode(); h.owned.add(svg);
  h.container.opacity = "0";
  h.player.ref(h.ref); h.player.inputProps.onSceneReady(svg, 70);
  assert.equal(h.ready, 0);
  h.player.ref(null);
  h.container.opacity = "1";
  h.player.ref(h.ref);
  assert.equal(h.ready, 1);
});

test("a seek request is not a commit: stale artwork keeps the still and original captions", async () => {
  const h = await entryHarness();
  const svg = svgNode(); h.owned.add(svg);
  h.player.ref(h.ref);
  h.handle.seek(700);
  h.player.inputProps.onSceneReady(svg, 70);
  assert.equal(h.ready, 0);
  assert.equal(h.nodes["[data-story-title]"].textContent, "still title");
  assert.deepEqual(h.seeks, [70, 700, 700]);
  h.player.inputProps.onSceneReady(svg, 700);
  assert.equal(h.ready, 1);
  assert.equal(h.nodes["[data-story-title]"].textContent, stories.motionStories[stories.motionStorySlugs[0]].chapters[2].title);
});

test("disposing the actual entry rejects late readiness, queued failures, ref callbacks and seeks", async () => {
  const h = await entryHarness();
  h.player.ref(h.ref);
  h.roots[0].rendered.props.failed();
  h.handle.destroy(); h.handle.destroy();
  assert.equal(h.roots[0].unmounted, 1);
  const svg = svgNode(); h.owned.add(svg);
  h.player.inputProps.onSceneReady(svg, 70);
  h.player.ref(h.ref); h.handle.seek(430);
  h.player.errorFallback(); h.flush();
  assert.equal(h.ready, 0);
  assert.equal(h.failed, 0);
  assert.equal(h.pauses, 1);
  assert.deepEqual(h.seeks, [70]);
  assert.equal(h.nodes["[data-story-title]"].textContent, "still title");
});

test("a disposed mount cannot reveal artwork or change captions after that stage is remounted", async () => {
  const h = await entryHarness();
  const old = h.player;
  h.handle.destroy();
  assert.equal(Object.hasOwn(h.stage.dataset, "storyRequestedFrame"), false);
  const mount = { closest: () => ({ dataset: { storyStage: "opening" }, querySelector: selector => h.nodes[selector] }), contains: () => true };
  const current = h.context.window.mountArticleStory(mount, stories.motionStorySlugs[0], 430, () => {}, () => {});
  const svg = svgNode(); h.owned.add(svg);
  old.inputProps.onSceneReady(svg, 70);
  assert.equal(h.ready, 0);
  assert.equal(h.nodes["[data-story-title]"].textContent, "still title");
  const currentPlayer = h.roots[1].rendered.props.children.props;
  assert.notEqual(currentPlayer.inputProps.instance, old.inputProps.instance, "new live SVG IDs cannot collide with a parked drawing");
  currentPlayer.ref(h.ref); currentPlayer.inputProps.onSceneReady(svg, 430);
  assert.equal(h.nodes["[data-story-title]"].textContent, stories.motionStories[stories.motionStorySlugs[0]].chapters[1].title);
  current.destroy();
});

test("a parked checkpoint is an accessible copy of the committed drawing, never the queued frame", async () => {
  const h = await entryHarness();
  assert.equal(h.handle.checkpoint(), null);
  const attributes = new Map([["aria-hidden", "true"], ["data-story-scene-frame", "70"]]);
  const svg = svgNode({ getAttribute: name => attributes.get(name) ?? null, cloneNode(deep) {
    assert.equal(deep, true);
    const copied = new Map(attributes);
    return { attributes: copied, removeAttribute: name => copied.delete(name), setAttribute: (name, value) => copied.set(name, value) };
  } });
  h.owned.add(svg); h.player.ref(h.ref);
  h.player.inputProps.onSceneReady(svg, 70);
  h.handle.seek(160);
  const checkpoint = h.handle.checkpoint();
  assert.equal(checkpoint.frame, 70);
  assert.notEqual(checkpoint.svg, svg);
  assert.equal(checkpoint.svg.attributes.get("data-story-scene-frame"), "70");
  assert.equal(checkpoint.svg.attributes.get("role"), "img");
  assert.ok(checkpoint.svg.attributes.get("aria-label").includes(stories.motionStories[stories.motionStorySlugs[0]].chapters[0].description));
  assert.equal(checkpoint.svg.attributes.has("aria-hidden"), false);
  assert.equal(attributes.get("aria-hidden"), "true", "the live drawing remains decorative");
  attributes.set("data-story-scene-frame", "160");
  assert.equal(h.handle.checkpoint(), null, "a DOM update awaiting its effect cannot be paired with the older acknowledged frame");
  attributes.set("data-story-scene-frame", "70");
  h.container.opacity = "0";
  assert.equal(h.handle.checkpoint(), null, "an unfitted player cannot replace the fallback");
  h.container.opacity = "1"; h.handle.destroy();
  assert.equal(h.handle.checkpoint(), null);
});

test("every below-authored reverse interval preserves committed captions and accessible checkpoints", async () => {
  for (const story of stories.motionStorySlugs) {
    for (const [index, chapter] of stories.motionStories[story].chapters.entries()) {
      const floor = stories.validatedReverseFloor(chapter);
      assert.ok(Number.isInteger(floor), story + ": reverse interval is explicit");
      const h = await entryHarness(chapter.frame, story);
      const attributes = new Map([["aria-hidden", "true"], ["data-story-scene-frame", String(chapter.frame)]]);
      const svg = svgNode({ getAttribute: name => attributes.get(name) ?? null, cloneNode() {
        const copied = new Map(attributes);
        return { attributes: copied, removeAttribute: name => copied.delete(name), setAttribute: (name, value) => copied.set(name, value) };
      } });
      h.owned.add(svg); h.player.ref(h.ref);
      h.player.inputProps.onSceneReady(svg, chapter.frame);
      h.handle.seek(floor);
      assert.equal(h.handle.checkpoint().frame, chapter.frame, "a reverse request does not replace the committed pose");
      attributes.set("data-story-scene-frame", String(floor));
      assert.equal(h.handle.checkpoint(), null, "DOM and effect must agree before parking");
      h.player.inputProps.onSceneReady(svg, floor);
      assert.equal(h.stage.dataset.storyChapter, String(index));
      assert.equal(h.nodes["[data-story-title]"].textContent, chapter.title);
      assert.equal(h.nodes["[data-story-caption]"].textContent, chapter.caption);
      assert.equal(h.nodes["[data-story-description]"].textContent, chapter.description);
      h.handle.seek(chapter.frame);
      const checkpoint = h.handle.checkpoint();
      assert.equal(checkpoint.frame, floor);
      assert.equal(checkpoint.svg.attributes.get("data-story-scene-frame"), String(floor));
      assert.equal(checkpoint.svg.attributes.get("role"), "img");
      assert.ok(checkpoint.svg.attributes.get("aria-label").includes(chapter.description));
      assert.equal(checkpoint.svg.attributes.has("aria-hidden"), false);
      h.handle.destroy();
      h.player.inputProps.onSceneReady(svg, chapter.frame);
      assert.equal(h.handle.checkpoint(), null, "disposed reverse checkpoints cannot return");
      assert.equal(h.ready, 1);
    }
  }
});

test("the hidden live mount remains measurable while static artwork stays visible until ready", async () => {
  for (const file of ["public/living-feature.css", "pages-dist/living-feature.css"]) {
    const css = postcss.parse(await read(file));
    const declarations = selector => {
      const rule = css.nodes.find(node => node.type === "rule" && node.selector === selector);
      assert.ok(rule, file + ": " + selector);
      return Object.fromEntries(rule.nodes.filter(node => node.type === "decl").map(node => [node.prop, node.value]));
    };
    const live = declarations(".article-story__live");
    assert.equal(live.display, "block"); assert.equal(live.visibility, "hidden");
    assert.equal(declarations(".article-story[data-story-ready] .article-story__live").visibility, "visible");
    assert.equal(declarations(".article-story[data-story-ready] .article-story__still").visibility, "hidden");
    assert.notEqual(declarations(".article-story__still").visibility, "hidden");
  }
  const source = await read("app/components/blog/motion/player-entry.tsx");
  assert.doesNotMatch(source, /setTimeout|setInterval|requestAnimationFrame|requestIdleCallback/);
  assert.match(source, /autoPlay=\{false\}/);
});

test("phone navigation avoids cross-document transitions while desktop identity motion remains", async () => {
  for (const file of ["public/portfolio-v3.css", "public/route-styles/home.css", "public/route-styles/blog.css"]) {
    const css = postcss.parse(await read(file));
    const transitions = [];
    css.walkAtRules("view-transition", node => transitions.push(node));
    assert.equal(transitions.length, 2, file);
    const auto = transitions.find(node => node.nodes.some(decl => decl.prop === "navigation" && decl.value === "auto"));
    const none = transitions.find(node => node.nodes.some(decl => decl.prop === "navigation" && decl.value === "none"));
    assert.equal(auto.parent.type, "root");
    assert.equal(none.parent.type, "atrule"); assert.equal(none.parent.name, "media");
    assert.equal(none.parent.params, "(max-width: 700px)");
    let identity = false;
    css.walkRules(rule => { if (rule.selector.includes("::view-transition-new(site-identity)") && rule.nodes.some(decl => decl.prop === "animation-duration" && decl.value === "420ms")) identity = true; });
    assert.equal(identity, true, "desktop identity treatment remains");
  }
});

test("desktop reading copy switches without a full-page text crossfade", async () => {
  const css = postcss.parse(await read("public/portfolio-v3.css"));
  const rule = selector => css.nodes.find(node => node.type === "rule" && node.selector === selector);
  assert.ok(rule("::view-transition-old(root)").nodes.some(decl => decl.prop === "display" && decl.value === "none"));
  assert.ok(rule("::view-transition-new(root)").nodes.some(decl => decl.prop === "animation" && decl.value === "none"));
});

test("the writing library fragment leaves room for the sticky header on reset and native links", async () => {
  const specificity = selector => {
    const score = [0, 0, 0];
    const parsed = selectorParser().astSync(selector);
    parsed.walkIds(() => score[0] += 1);
    parsed.walkClasses(() => score[1] += 1);
    parsed.walkAttributes(() => score[1] += 1);
    parsed.walkTags(() => score[2] += 1);
    return score;
  };
  const general = postcss.parse(await read("public/portfolio-v3.css")).nodes.find(node => node.type === "rule" && node.selector === ".hope-brand [id]");
  assert.ok(general);
  assert.deepEqual(specificity(general.selector), [0, 2, 0]);
  for (const file of ["public/journal.css", "pages-dist/journal.css"]) {
    const css = postcss.parse(await read(file));
    const library = css.nodes.find(node => node.type === "rule" && node.selector === ".hope-brand .journal-library[id]");
    assert.ok(library, file);
    assert.deepEqual(specificity(library.selector), [0, 3, 0], "the library rule outranks the general sticky-header offset without relying on load order");
    assert.ok(library.nodes.some(decl => decl.prop === "scroll-margin-top" && decl.value === "7rem"), file);
  }
  const html = await read("pages-dist/blog/index.html");
  assert.match(html, /class="shell journal-library" id="articles"/);
});

test("topic selection switches readable foreground and fill together rather than crossing intermediate colors", async () => {
  for (const file of ["public/journal.css", "pages-dist/journal.css"]) {
    const css = postcss.parse(await read(file));
    const chips = css.nodes.find(node => node.type === "rule" && node.selector === ".hope-brand .journal-topics a");
    assert.ok(chips, file);
    assert.ok(chips.nodes.some(decl => decl.prop === "transition" && decl.value === "none"));
    const selected = css.nodes.find(node => node.type === "rule" && node.selector === ".journal-topics a:is(:hover,[aria-current])");
    assert.ok(selected.nodes.some(decl => decl.prop === "background" && decl.value === "var(--hope-carbon)"));
    assert.ok(selected.nodes.some(decl => decl.prop === "color" && decl.value === "var(--hope-porcelain)"));
  }
});
