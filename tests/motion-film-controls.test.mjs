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
    this.style = { removeProperty(name) { delete this[name]; } };
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

function createHarness(source, {
  reduceMotion = false,
  saveData = false,
  hasFilms = true,
  intersectionObserver = false,
} = {}) {
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
  const connection = new EventTargetHarness();
  connection.saveData = saveData;
  sourceElement.dataset.src = "/motion/operating-arc.mp4";
  video.attributes.add("data-autoplay");
  video.dataset = {};
  video.readyState = 0;
  video.currentTime = 0;
  Object.defineProperty(video, "currentTime", {
    get() { return this.playhead ?? 0; },
    set(value) {
      this.playhead = value;
      if (value === 0) this.ended = false;
      if (value === 0 && this.readyStateOnZeroSeek !== undefined) {
        this.readyState = this.readyStateOnZeroSeek;
      }
    },
  });
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
  const observers = [];
  class IntersectionObserverHarness {
    constructor(callback, options = {}) {
      this.callback = callback;
      this.options = options;
      this.targets = new Set();
      observers.push(this);
    }

    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
    disconnect() { this.targets.clear(); }
  }
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
    navigator: { connection },
    queueMicrotask,
    setTimeout,
    window,
  };
  if (intersectionObserver) {
    context.IntersectionObserver = IntersectionObserverHarness;
    window.IntersectionObserver = IntersectionObserverHarness;
  }
  vm.runInNewContext(source, context);
  function intersectMotionFilm(ratio) {
    for (const observer of observers) {
      if (!observer.targets.has(video)) continue;
      observer.callback([{
        target: video,
        isIntersecting: ratio > 0,
        intersectionRatio: ratio,
      }]);
    }
  }
  return {
    connection, control, document, intersectMotionFilm, media, observers,
    poster, reduceMotionQuery, sourceElement, video, window,
  };
}

test("explicit playback works below the autoplay threshold, including after buffering", async () => {
  const source = await readFile(new URL("../public/interactions.js", import.meta.url), "utf8");
  const { control, intersectMotionFilm, poster, video } = createHarness(source, { intersectionObserver: true });
  intersectMotionFilm(0.35);
  assert.equal(video.hasAttribute("data-motion-visible"), false);
  assert.equal(video.loadCount, 1);
  video.readyState = 2;
  video.dispatch("loadeddata");
  assert.equal(video.playCount, 0, "a partially visible film must not autoplay");

  video.readyState = 1;
  control.dispatch("click");
  assert.equal(video.playCount, 0, "explicit playback waits for enough media data");
  assert.equal(video.loadCount, 1, "buffering does not trigger a redundant load");
  video.readyState = 2;
  video.dispatch("loadeddata");
  assert.equal(video.playCount, 1, "loadeddata preserves explicit intent below the autoplay threshold");
  video.dispatch("playing");
  assert.equal(video.hasAttribute("data-motion-ready"), true);
  assert.equal(control.textContent, "Replay animation");

  control.dispatch("click");
  assert.equal(video.playCount, 2);
  assert.equal(video.loadCount, 1, "an error-free replay reuses the loaded media");
  const pauses = video.pauseCount;
  intersectMotionFilm(0);
  assert.ok(video.pauseCount > pauses, "leaving the viewport pauses explicit playback too");
  assert.equal(video.dataset.motionIntent, undefined);
  assert.equal(video.hasAttribute("data-motion-ready"), false);
  assert.equal(poster.style.opacity, undefined, "the poster returns when the film leaves the viewport");
  video.dispatch("loadeddata");
  video.dispatch("playing");
  assert.equal(video.playCount, 2, "late media events cannot restart an offscreen film");
  assert.equal(video.hasAttribute("data-motion-ready"), false);
});

test("the actual playback observer retains the 55 percent autoplay threshold", async () => {
  const source = await readFile(new URL("../public/interactions.js", import.meta.url), "utf8");
  const { intersectMotionFilm, observers, video } = createHarness(source, { intersectionObserver: true });
  assert.ok(observers.some(({ options }) => options.threshold?.includes?.(0.55)));
  video.readyState = 2;
  intersectMotionFilm(0.54);
  video.dispatch("loadeddata");
  assert.equal(video.playCount, 0);
  intersectMotionFilm(0.55);
  assert.equal(video.playCount, 1);
  video.dispatch("playing");
  assert.equal(video.hasAttribute("data-motion-ready"), true);
  const pauses = video.pauseCount;
  intersectMotionFilm(0.35);
  assert.ok(video.pauseCount > pauses, "autoplay without explicit intent stops below its threshold");
  assert.equal(video.hasAttribute("data-motion-ready"), false);
});

test("a source error before lazy activation does not block the first real load", async () => {
  const source = await readFile(new URL("../public/interactions.js", import.meta.url), "utf8");
  const { control, intersectMotionFilm, poster, sourceElement, video } = createHarness(source, { intersectionObserver: true });
  const initialLabel = control.textContent;
  assert.equal(video.loadCount, 0);
  assert.equal(sourceElement.src, undefined);
  sourceElement.dispatch("error");
  assert.equal(video.dataset.motionFailed, undefined, "a source without src has not failed an attempted load");
  assert.equal(control.textContent, initialLabel, "the unactivated film must not offer Retry");
  assert.equal(video.hasAttribute("data-motion-ready"), false);
  assert.equal(poster.style.opacity, undefined);

  intersectMotionFilm(0.65);
  assert.equal(video.loadCount, 1, "visibility still activates the first real load");
  assert.equal(sourceElement.src, sourceElement.dataset.src);
  video.readyState = 2;
  video.dispatch("loadeddata");
  assert.equal(video.playCount, 1);
  video.dispatch("playing");
  assert.equal(video.hasAttribute("data-motion-ready"), true);
  assert.equal(control.textContent, "Replay animation");
});

for (const errorTarget of ["source", "video"]) {
  test(`${errorTarget} errors retain the poster and allow one explicit media reload`, async () => {
    const source = await readFile(new URL("../public/interactions.js", import.meta.url), "utf8");
    const { control, intersectMotionFilm, poster, sourceElement, video } = createHarness(source, { intersectionObserver: true });
    intersectMotionFilm(0.65);
    video.readyState = 2;
    video.dispatch("loadeddata");
    video.dispatch("playing");
    assert.equal(video.hasAttribute("data-motion-ready"), true);
    const loads = video.loadCount;
    video.readyState = 0;
    (errorTarget === "source" ? sourceElement : video).dispatch("error");
    assert.equal(video.hasAttribute("data-motion-ready"), false);
    assert.equal(poster.style.opacity, undefined, "a failed video must not hide the poster");
    assert.equal(video.loadCount, loads, "errors do not create an automatic retry loop");
    const failedPlays = video.playCount;
    video.dispatch("loadeddata");
    video.dispatch("playing");
    assert.equal(video.playCount, failedPlays, "late loadeddata must not play a failed attempt");
    assert.equal(video.hasAttribute("data-motion-ready"), false, "late playing must not hide the failure poster");

    control.dispatch("click");
    assert.equal(video.loadCount, loads + 1, "explicit retry reloads media after an error");
    video.readyState = 2;
    const plays = video.playCount;
    video.dispatch("loadeddata");
    assert.equal(video.playCount, plays + 1);
    video.dispatch("playing");
    assert.equal(video.hasAttribute("data-motion-ready"), true);
    control.dispatch("click");
    assert.equal(video.loadCount, loads + 1, "successful retries do not force future replay reloads");
    assert.equal(video.playCount, plays + 2);
  });
}

for (const preference of ["reduceMotion", "saveData"]) {
  test(`${preference} still overrides explicit intent below the autoplay threshold`, async () => {
    const source = await readFile(new URL("../public/interactions.js", import.meta.url), "utf8");
    const { connection, control, intersectMotionFilm, reduceMotionQuery, video } = createHarness(source, { intersectionObserver: true });
    intersectMotionFilm(0.35);
    video.readyState = 2;
    control.dispatch("click");
    video.dispatch("playing");
    assert.equal(video.hasAttribute("data-motion-ready"), true);
    const loads = video.loadCount;
    const plays = video.playCount;
    if (preference === "reduceMotion") {
      reduceMotionQuery.matches = true;
      reduceMotionQuery.dispatch("change");
    } else {
      connection.saveData = true;
      connection.dispatch("change");
    }
    assert.equal(control.hidden, true);
    assert.equal(video.hasAttribute("data-motion-ready"), false);
    control.dispatch("click");
    video.dispatch("loadeddata");
    video.dispatch("playing");
    assert.equal(video.loadCount, loads);
    assert.equal(video.playCount, plays);
    assert.equal(video.hasAttribute("data-motion-ready"), false);
  });
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

test("completed films stay finished after scrolling or returning to the page, but can replay", async () => {
  const source = await readFile(new URL("../public/interactions.js", import.meta.url), "utf8");
  const { control, document, video, window } = createHarness(source);
  video.readyState = 2;
  video.dataset.motionStarted = "true";
  video.dataset.motionIntent = "true";
  video.currentTime = 5;
  video.ended = true;
  const playCount = video.playCount;

  window.dispatch("scroll");
  await new Promise((resolve) => setTimeout(resolve, 220));
  document.hidden = true;
  document.dispatch("visibilitychange");
  document.hidden = false;
  document.dispatch("visibilitychange");
  video.dispatch("loadeddata");
  assert.equal(video.playCount, playCount, "automatic events must not restart a completed film");
  assert.equal(video.currentTime, 5);

  control.dispatch("click");
  assert.equal(video.playCount, playCount + 1);
  assert.equal(video.currentTime, 0, "explicit Replay starts at the beginning");
});

test("Replay seeks immediately when an ended film must wait for media data", async () => {
  const source = await readFile(new URL("../public/interactions.js", import.meta.url), "utf8");
  const { control, video } = createHarness(source);
  video.dataset.motionStarted = "true";
  video.currentTime = 5;
  video.ended = true;
  video.readyState = 1;
  control.dispatch("click");
  assert.equal(video.currentTime, 0);
  assert.equal(video.playCount, 0);
  video.readyState = 2;
  video.dispatch("loadeddata");
  assert.equal(video.playCount, 1);
});

test("Replay resumes after seeked when seeking temporarily lowers readyState", async () => {
  const source = await readFile(new URL("../public/interactions.js", import.meta.url), "utf8");
  const { control, intersectMotionFilm, video } = createHarness(source, { intersectionObserver: true });
  intersectMotionFilm(0.65);
  video.readyState = 4;
  video.dispatch("loadeddata");
  video.dispatch("playing");
  const initialPlays = video.playCount;
  video.dispatch("seeked");
  assert.equal(video.playCount, initialPlays, "seek completion alone does not imply replay intent");

  video.currentTime = 5;
  video.ended = true;
  video.readyStateOnZeroSeek = 1;
  control.dispatch("click");
  assert.equal(video.currentTime, 0);
  assert.equal(video.readyState, 1, "the seek can temporarily discard buffered readiness");
  assert.equal(video.playCount, initialPlays);
  video.dispatch("seeked");
  assert.equal(video.playCount, initialPlays, "seeked waits for enough playable data");

  video.readyState = 4;
  video.dispatch("seeked");
  assert.equal(video.playCount, initialPlays + 1, "seeked resumes the explicit replay without another loadeddata event");
  video.dispatch("playing");
  assert.equal(video.hasAttribute("data-motion-ready"), true);
  assert.equal(video.loadCount, 1, "replaying an existing resource does not reload it");

  intersectMotionFilm(0);
  assert.equal(video.dataset.motionIntent, undefined);
  video.readyState = 4;
  video.dispatch("seeked");
  assert.equal(video.playCount, initialPlays + 1, "late seek completion cannot restart a film after intent is cleared");
  assert.equal(video.hasAttribute("data-motion-ready"), false);
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

test("live data saving pauses a running film and restores controls without reloading", async () => {
  const source = await readFile(new URL("../public/interactions.js", import.meta.url), "utf8");
  const { connection, control, video } = createHarness(source);
  video.readyState = 2;
  video.dispatch("loadeddata");
  video.dispatch("playing");
  const loads = video.loadCount;
  const pauses = video.pauseCount;
  connection.saveData = true;
  connection.dispatch("change");
  assert.equal(control.hidden, true);
  assert.equal(video.hasAttribute("data-motion-ready"), false);
  assert.equal(video.hasAttribute("data-motion-visible"), false);
  assert.equal(video.pauseCount, pauses + 1);
  const plays = video.playCount;
  control.dispatch("click");
  assert.equal(video.playCount, plays);
  connection.saveData = false;
  connection.dispatch("change");
  assert.equal(control.hidden, false);
  assert.equal(video.hasAttribute("data-motion-visible"), true);
  assert.equal(video.loadCount, loads);
  assert.equal(video.playCount, plays + 1);
});

test("turning data saving off permits first load but never replays a completed film", async () => {
  const source = await readFile(new URL("../public/interactions.js", import.meta.url), "utf8");
  const { connection, control, video } = createHarness(source, { saveData: true });
  assert.equal(video.loadCount, 0);
  connection.saveData = false;
  connection.dispatch("change");
  assert.equal(video.loadCount, 1);
  assert.equal(control.hidden, false);
  video.readyState = 2;
  video.currentTime = 5;
  video.ended = true;
  const plays = video.playCount;
  connection.saveData = true;
  connection.dispatch("change");
  connection.saveData = false;
  connection.dispatch("change");
  assert.equal(video.playCount, plays);
  assert.equal(video.currentTime, 5);
  assert.equal(video.loadCount, 1);
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
