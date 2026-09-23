import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

class EventTargetHarness {
  listeners = new Map();

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatch(type, event = {}) {
    event.target ??= this;
    event.currentTarget = this;
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

class ElementHarness extends EventTargetHarness {
  constructor(name) {
    super();
    this.name = name;
    this.attributes = new Set();
    this.dataset = {};
    this.hidden = false;
    this.style = { removeProperty() {} };
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name.startsWith("data-")) delete this.dataset[dataKey(name)];
  }

  toggleAttribute(name, force) {
    if (force === false) this.removeAttribute(name);
    else this.attributes.add(name);
  }

  closest(selector) {
    if (selector === ".motion-film") return this.film ?? null;
    return null;
  }

  querySelectorAll() {
    return [];
  }
}

function dataKey(attribute) {
  return attribute
    .slice(5)
    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function createHarness(source, { reduceMotion = false, saveData = false, hasFilms = true } = {}) {
  const document = new EventTargetHarness();
  const root = new ElementHarness("root");
  const film = new ElementHarness("film");
  const media = new ElementHarness("media");
  const poster = new ElementHarness("poster");
  const control = new ElementHarness("control");
  const sourceElement = new ElementHarness("source");
  const video = new ElementHarness("video");
  const reduceMotionQuery = new EventTargetHarness();
  reduceMotionQuery.matches = reduceMotion;
  sourceElement.dataset.src = "/motion/operating-arc.mp4";
  video.attributes.add("data-autoplay");
  video.dataset = {};
  video.readyState = 0;
  video.currentTime = 0;
  video.loadCount = 0;
  video.pauseCount = 0;
  video.playCount = 0;
  video.load = () => { video.loadCount += 1; };
  video.pause = () => { video.pauseCount += 1; };
  video.play = () => {
    video.playCount += 1;
    return Promise.resolve();
  };
  video.parentElement = media;
  video.film = film;
  control.film = film;
  media.querySelector = (selector) => selector === "[data-motion-poster]" ? poster : null;
  media.querySelectorAll = () => [];
  film.querySelector = (selector) => selector === "[data-motion-play]" ? control : null;
  video.querySelectorAll = (selector) => selector === "source[data-src]" ? [sourceElement] : [];

  document.documentElement = root;
  document.hidden = false;
  document.querySelector = () => null;
  document.querySelectorAll = (selector) => {
    if (selector === "video[data-motion-film]" && hasFilms) return [video];
    return [];
  };
  const window = new EventTargetHarness();
  window.setTimeout = setTimeout;
  window.clearTimeout = clearTimeout;
  const context = {
    Element: ElementHarness,
    clearTimeout,
    console,
    decodeURIComponent,
    document,
    location: { hash: "" },
    matchMedia(query) {
      if (query === "(prefers-reduced-motion: reduce)") return reduceMotionQuery;
      return { matches: false, addEventListener() {} };
    },
    navigator: { connection: { saveData } },
    queueMicrotask,
    setTimeout,
    window,
  };
  vm.runInNewContext(source, context);
  return { control, media, reduceMotionQuery, sourceElement, video, window };
}

test("films can load and play without IntersectionObserver", async () => {
  const source = await readFile(new URL("../public/interactions.js", import.meta.url), "utf8");
  const { video, control } = createHarness(source);
  assert.equal(video.hasAttribute("data-motion-visible"), true);
  assert.equal(video.loadCount, 1);
  video.readyState = 2;
  video.dispatch("loadeddata");
  assert.equal(video.playCount, 1);
  video.dispatch("playing");
  assert.equal(video.hasAttribute("data-motion-ready"), true);
  control.dispatch("click");
  assert.equal(video.playCount, 2);
});

test("pages without films do not install motion scroll timers", async () => {
  const source = await readFile(new URL("../public/interactions.js", import.meta.url), "utf8");
  const { window } = createHarness(source, { hasFilms: false });
  assert.equal(window.listeners.has("scroll"), false);
});

test("motion-film button is the only click target and replays from frame zero", async () => {
  const source = await readFile(new URL("../public/interactions.js", import.meta.url), "utf8");
  const { control, media, video } = createHarness(source);
  assert.equal(control.hidden, false);

  video.attributes.add("data-motion-visible");
  video.dataset.motionStarted = "true";
  video.readyState = 2;
  video.currentTime = 4;
  const playCount = video.playCount;
  media.dispatch("click");
  assert.equal(video.playCount, playCount, "the noninteractive media has no click behavior");

  control.dispatch("click");
  assert.equal(video.currentTime, 0);
  assert.equal(video.playCount, playCount + 1);
  video.dispatch("playing");
  assert.equal(control.textContent, "Replay animation");
});

test("live reduced-motion changes pause and restore film playback", async () => {
  const source = await readFile(new URL("../public/interactions.js", import.meta.url), "utf8");
  const { control, reduceMotionQuery, video } = createHarness(source);

  video.readyState = 2;
  video.dispatch("loadeddata");
  video.dispatch("playing");
  assert.equal(video.hasAttribute("data-motion-ready"), true);
  assert.equal(control.hidden, false);
  const loadCount = video.loadCount;
  const pauseCount = video.pauseCount;

  reduceMotionQuery.matches = true;
  reduceMotionQuery.dispatch("change");
  assert.equal(video.hasAttribute("data-motion-ready"), false);
  assert.equal(video.hasAttribute("data-motion-visible"), false);
  assert.equal(control.hidden, true);
  assert.equal(video.pauseCount, pauseCount + 1);
  const reducedPlayCount = video.playCount;
  control.dispatch("click");
  assert.equal(video.playCount, reducedPlayCount);
  assert.equal(video.loadCount, loadCount);

  reduceMotionQuery.matches = false;
  reduceMotionQuery.dispatch("change");
  assert.equal(video.hasAttribute("data-motion-visible"), true);
  assert.equal(control.hidden, false);
  assert.equal(video.loadCount, loadCount);

  video.currentTime = 4;
  const playCount = video.playCount;
  control.dispatch("click");
  assert.equal(video.currentTime, 0);
  assert.equal(video.playCount, playCount + 1);
  assert.equal(video.loadCount, loadCount);
});

for (const preference of [
  { label: "reduced motion", reduceMotion: true, saveData: false },
  { label: "data saving", reduceMotion: false, saveData: true },
]) {
  test(`${preference.label} keeps the motion control hidden and blocks loading`, async () => {
    const source = await readFile(new URL("../public/interactions.js", import.meta.url), "utf8");
    const { control, sourceElement, video } = createHarness(source, preference);
    assert.equal(control.hidden, true);
    assert.equal(video.loadCount, 0);
    assert.equal(sourceElement.src, undefined);
    control.dispatch("click");
    assert.equal(video.loadCount, 0);
    assert.equal(video.playCount, 0);
    assert.equal(sourceElement.src, undefined);
  });
}
