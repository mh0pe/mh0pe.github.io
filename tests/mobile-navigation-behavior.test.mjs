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
  constructor(name, document) {
    super();
    this.name = name;
    this.document = document;
    this.children = [];
    this.parentElement = null;
  }

  append(child) {
    child.parentElement = this;
    this.children.push(child);
  }

  contains(node) {
    return node === this || this.children.some((child) => child.contains(node));
  }

  closest(selector) {
    if (selector === "a[href]" && this.name === "link") return this;
    return this.parentElement?.closest(selector) ?? null;
  }

  focus() {
    this.document.activeElement = this;
    this.focusCount = (this.focusCount ?? 0) + 1;
  }

  querySelector(selector) {
    if (selector === "summary") return this.children.find((child) => child.name === "summary") ?? null;
    if (selector === "nav") return this.children.find((child) => child.name === "nav") ?? null;
    return null;
  }

  querySelectorAll() {
    return [];
  }

  toggleAttribute() {}
  removeAttribute() {}
}

function createHarness(source) {
  const deferred = [];
  const document = new EventTargetHarness();
  const details = new ElementHarness("details", document);
  const summary = new ElementHarness("summary", document);
  const navigation = new ElementHarness("nav", document);
  const link = new ElementHarness("link", document);
  const outside = new ElementHarness("outside", document);
  const identity = new ElementHarness("identity", document);
  navigation.append(link);
  details.append(summary);
  details.append(navigation);
  details.open = false;
  document.documentElement = new ElementHarness("root", document);
  document.activeElement = null;
  document.hidden = false;
  document.querySelector = (selector) => selector === ".site-identity" ? identity : null;
  document.querySelectorAll = (selector) => selector === ".mobile-nav" ? [details] : [];
  const desktopNavigation = new EventTargetHarness();
  desktopNavigation.matches = false;
  const inertMedia = () => ({ matches: false, addEventListener() {} });
  const window = new EventTargetHarness();
  window.setTimeout = (callback, delay) => {
    deferred.push({ callback, delay });
    return deferred.length;
  };
  window.clearTimeout = clearTimeout;
  const context = {
    Element: ElementHarness,
    clearTimeout,
    console,
    decodeURIComponent,
    document,
    location: { hash: "" },
    matchMedia(query) {
      return query === "(min-width: 58.001rem)" ? desktopNavigation : inertMedia();
    },
    navigator: {},
    queueMicrotask,
    setTimeout,
    window,
  };
  vm.runInNewContext(source, context);
  return {
    deferred,
    desktopNavigation,
    details,
    document,
    identity,
    link,
    navigation,
    outside,
    summary,
    runDeferred() {
      for (const task of deferred.splice(0)) task.callback();
    },
  };
}

test("mobile navigation closes through keyboard, pointer, focus, links, and desktop transition", async () => {
  const source = await readFile(new URL("../public/interactions.js", import.meta.url), "utf8");
  const harness = createHarness(source);
  let prevented = false;

  harness.details.open = true;
  harness.navigation.focus();
  harness.details.dispatch("keydown", {
    key: "Escape",
    preventDefault() { prevented = true; },
  });
  assert.equal(harness.details.open, false);
  assert.equal(harness.document.activeElement, harness.summary);
  assert.equal(prevented, true);

  harness.details.open = true;
  harness.document.dispatch("pointerdown", { target: harness.outside });
  assert.equal(harness.details.open, false);
  assert.equal(harness.document.activeElement, harness.summary, "outside pointer does not move focus itself");

  harness.details.open = true;
  harness.link.focus();
  const summaryFocusCountBeforeClick = harness.summary.focusCount;
  harness.navigation.dispatch("click", { target: harness.link, defaultPrevented: false });
  assert.equal(harness.details.open, true, "click handling leaves the anchor visible for native activation");
  assert.equal(harness.document.activeElement, harness.link, "click handling does not steal anchor focus");
  assert.equal(harness.summary.focusCount, summaryFocusCountBeforeClick);
  assert.equal(harness.deferred.length, 1);
  assert.equal(harness.deferred[0].delay, 0);
  harness.runDeferred();
  assert.equal(harness.details.open, false);
  assert.equal(
    harness.document.activeElement,
    harness.summary,
    "link activation restores focus only after the click task",
  );

  harness.details.open = true;
  harness.link.focus();
  const canceledClick = { target: harness.link, defaultPrevented: false };
  harness.navigation.dispatch("click", canceledClick);
  canceledClick.defaultPrevented = true;
  harness.runDeferred();
  assert.equal(harness.details.open, true, "canceled link activation leaves the menu open");
  assert.equal(harness.document.activeElement, harness.link);

  harness.details.open = true;
  harness.summary.focus();
  harness.document.activeElement = harness.outside;
  harness.details.dispatch("focusout", { target: harness.summary, relatedTarget: harness.link });
  assert.equal(harness.details.open, true, "Tab into the menu stays open despite transient outside activeElement");
  assert.equal(harness.deferred.length, 0, "known internal focus destination needs no delayed close");
  harness.link.focus();

  harness.details.dispatch("focusout", { target: harness.link, relatedTarget: harness.outside });
  assert.equal(harness.details.open, false, "known outside focus destination closes the menu");

  harness.details.open = true;
  harness.link.focus();
  harness.document.activeElement = harness.outside;
  harness.details.dispatch("focusout", { target: harness.link, relatedTarget: null });
  assert.equal(harness.details.open, true, "unknown focus destination does not close during the event");
  harness.link.focus();
  harness.runDeferred();
  assert.equal(harness.details.open, true, "settled internal focus keeps the menu open");

  harness.document.activeElement = harness.outside;
  harness.details.dispatch("focusout", { target: harness.link, relatedTarget: null });
  harness.runDeferred();
  assert.equal(harness.details.open, false);

  harness.details.open = true;
  harness.link.focus();
  const summaryFocusCountBeforeDesktop = harness.summary.focusCount;
  harness.desktopNavigation.matches = true;
  harness.desktopNavigation.dispatch("change");
  assert.equal(harness.details.open, false);
  assert.equal(harness.document.activeElement, harness.identity);
  assert.equal(
    harness.summary.focusCount,
    summaryFocusCountBeforeDesktop,
    "desktop transition never focuses the hidden summary",
  );
});
