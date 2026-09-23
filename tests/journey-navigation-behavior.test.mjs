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
}

class ElementHarness extends EventTargetHarness {
  constructor({ dataset = {}, hash = "", id = "", selectors = [] } = {}) {
    super();
    this.attributes = new Map();
    this.dataset = dataset;
    this.hash = hash;
    this.id = id;
    this.selectors = new Set(selectors);
    this.style = {
      properties: new Map(),
      setProperty: (name, value) => this.style.properties.set(name, value),
      removeProperty: (name) => this.style.properties.delete(name),
    };
  }

  closest(selector) {
    return this.selectors.has(selector) ? this : null;
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  toggleAttribute(name, force) {
    if (force === false) this.attributes.delete(name);
    else this.attributes.set(name, "");
  }

  querySelectorAll() {
    return [];
  }
}

function attributes(source, name) {
  return [...source.matchAll(new RegExp(`${name}="([^"]+)"`, "g"))].map(
    (match) => match[1],
  );
}

function journeyLinkAttributes(source) {
  return [...source.matchAll(/<a href="#[^"]+" data-journey-section="([^"]+)"/g)].map(
    (match) => match[1],
  );
}

function createHarness(source, linkAttributes, sectionKeys) {
  const links = linkAttributes.map(
    (journeySection) =>
      new ElementHarness({
        dataset: { journeySection },
        selectors: [".case-jump"],
      }),
  );
  const sections = sectionKeys.map(
    (homeSection) => new ElementHarness({ dataset: { homeSection } }),
  );
  const header = new ElementHarness();
  const root = new ElementHarness();
  const rail = new ElementHarness();
  rail.querySelectorAll = (selector) =>
    selector === "[data-journey-section]" ? links : [];

  const observers = [];
  class IntersectionObserverHarness {
    constructor(callback) {
      this.callback = callback;
      this.targets = [];
      observers.push(this);
    }

    observe(target) {
      this.targets.push(target);
    }

    disconnect() {}
  }

  const document = new EventTargetHarness();
  document.documentElement = root;
  document.hidden = false;
  document.querySelector = (selector) => {
    if (selector === ".site-header") return header;
    if (selector === "[data-journey-rail]") return rail;
    return null;
  };
  document.querySelectorAll = (selector) => {
    if (selector === "[data-home-section]") return sections;
    return [];
  };

  const window = new EventTargetHarness();
  window.IntersectionObserver = IntersectionObserverHarness;
  window.setTimeout = setTimeout;
  window.clearTimeout = clearTimeout;
  const context = {
    Element: ElementHarness,
    IntersectionObserver: IntersectionObserverHarness,
    clearTimeout,
    console,
    decodeURIComponent,
    document,
    location: { hash: "" },
    matchMedia() {
      return { matches: false, addEventListener() {} };
    },
    navigator: {},
    queueMicrotask,
    setTimeout,
    window,
  };
  vm.runInNewContext(source, context);
  const journeyObserver = observers.find(
    (observer) =>
      observer.targets.length === sections.length &&
      observer.targets.every((target) => sections.includes(target)),
  );
  assert.ok(journeyObserver, "the journey uses one IntersectionObserver for its sections");

  function show(sectionKey) {
    journeyObserver.callback(
      sections.map((section) => ({
        target: section,
        intersectionRatio: section.dataset.homeSection === sectionKey ? 1 : 0,
        boundingClientRect: { top: 100 },
      })),
    );
  }

  return { header, links, show, window };
}

test("journey groups related sections while keeping one current link and accurate progress", async () => {
  const [source, page] = await Promise.all([
    readFile(new URL("../public/interactions.js", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  const linkAttributes = journeyLinkAttributes(page);
  const sectionKeys = attributes(page, "data-home-section");
  const coveredKeys = new Set(linkAttributes.flatMap((value) => value.split(/\s+/)));
  assert.deepEqual(
    sectionKeys.filter((key) => !coveredKeys.has(key)),
    [],
    "every homepage section is represented by a journey link",
  );

  const harness = createHarness(source, linkAttributes, sectionKeys);
  const modelsIndex = linkAttributes.findIndex((value) => value.split(/\s+/).includes("composition"));
  const approachIndex = linkAttributes.findIndex((value) => value.split(/\s+/).includes("practice-detail"));
  assert.notEqual(modelsIndex, -1);
  assert.notEqual(approachIndex, -1);

  for (const section of ["composition", "practice-detail", "practice", "practice-detail", "composition"]) {
    harness.show(section);
    const current = harness.links
      .map((link, index) => (link.getAttribute("aria-current") === "location" ? index : -1))
      .filter((index) => index >= 0);
    const expected = section === "composition" ? modelsIndex : approachIndex;
    assert.deepEqual(current, [expected], `${section} has exactly one current journey link`);
    assert.equal(
      harness.header.style.properties.get("--page-progress"),
      String((expected + 1) / harness.links.length),
    );
  }

  assert.equal(
    harness.window.listeners.get("scroll")?.length ?? 0,
    0,
    "the homepage journey needs no scroll listener when no motion film is present",
  );
  assert.doesNotMatch(
    source.slice(source.indexOf("function observeJourney"), source.indexOf("function connectMobileNavigation")),
    /getBoundingClientRect|requestAnimationFrame|addEventListener\(["']scroll/,
  );
});
