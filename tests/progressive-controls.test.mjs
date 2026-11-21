import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { tsImport } from "tsx/esm/api";

const root = new URL("../", import.meta.url);

test("model exploration stays informative without promising inactive filters", async () => {
  const { default: Explorer } = await tsImport(new URL("app/components/AttributionExplorer.tsx", root).href, import.meta.url);
  const html = renderToStaticMarkup(createElement(Explorer));
  const selects = [...html.matchAll(/<select\b[^>]*>/g)].map((match) => match[0]);
  const segments = [...html.matchAll(/<fieldset\b[^>]*>/g)].map((match) => match[0]);
  const modelButtons = [...html.matchAll(/<button\b[^>]*class="attribution-trace[^"]*"[^>]*>/g)].map((match) => match[0]);
  assert.equal(selects.length, 2);
  assert.equal(segments.length, 3);
  assert.ok(modelButtons.length > 0);
  for (const control of [...selects, ...segments, ...modelButtons]) assert.match(control, /\bdisabled=""/);
  assert.match(html, /The full view is shown below/);
  assert.match(html, /href="https:\/\/github\.com\//);
  assert.match(html, /<details/);
  assert.match(html, /Lines added with model associations/);
  const css = await readFile(new URL("public/interactions.css", root), "utf8");
  assert.match(css, /\.attribution-readiness \{[^}]*grid-column: 1 \/ -1/);
});

test("theme control becomes usable only after its behavior is attached", async () => {
  const { ThemeToggle } = await tsImport(new URL("app/components/v2/SiteHeader.tsx", root).href, import.meta.url);
  assert.match(renderToStaticMarkup(createElement(ThemeToggle)), /data-theme-toggle="true" disabled=""/);
  const listeners = new Map();
  const control = { disabled: true, setAttribute() {}, addEventListener: (name, listener) => listeners.set(name, listener) };
  const classes = new Set();
  const document = {
    readyState: "complete",
    documentElement: { dataset: {}, style: {}, classList: { contains: (name) => classes.has(name), add: (name) => classes.add(name) } },
    querySelectorAll: (selector) => selector === "[data-theme-toggle]" ? [control] : [],
    querySelector: () => null,
    addEventListener() {},
  };
  const window = { matchMedia: () => ({ matches: false, addEventListener() {} }), localStorage: { getItem: () => null, setItem() {} }, addEventListener() {} };
  vm.runInNewContext(await readFile(new URL("public/theme.js", root), "utf8"), {
    document, window, WeakSet, MutationObserver: class { observe() {} },
  });
  assert.equal(control.disabled, false);
  assert.equal(typeof listeners.get("click"), "function");
  assert.equal(document.documentElement.dataset.theme, "light");
  listeners.get("click")();
  assert.equal(document.documentElement.dataset.theme, "dark");
});

test("selected projects explain individual contribution and models lead to a concrete case", async () => {
  const { caseStudies } = await tsImport(new URL("app/data/portfolio-v2.ts", root).href, import.meta.url);
  for (const study of caseStudies) {
    assert.ok(study.contributionSummary.length > 40, `${study.id}: contribution summary must explain the work in more than 40 characters`);
    const summaryWordCount = study.contributionSummary.split(/\s+/).length;
    assert.ok(summaryWordCount <= 18, `${study.id}: contribution summary has ${summaryWordCount} words; keep it within 18 for a scannable project card`);
  }
  const home = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(home, /<strong>My contribution<\/strong> \{project\.contributionSummary\}/);
  const html = (await readFile(new URL("pages-dist/index.html", root), "utf8")).replaceAll("<!-- -->", "");
  assert.equal((html.match(/<strong>My contribution<\/strong>/g) ?? []).length, 4);
  for (const study of caseStudies) {
    assert.ok(html.includes(study.contributionSummary), `${study.id}: exported home page must include the current contribution summary; rebuild pages-dist after content changes`);
  }
  assert.ok((html.match(/<(?!\/|!)[A-Za-z][^>]*>/g) ?? []).length <= 1850);
  const css = await readFile(new URL("public/interactions.css", root), "utf8");
  assert.match(css, /\.hope-story__contribution \{[^}]*color: var\(--hope-porcelain\)/);
  const footer = await readFile(new URL("app/components/v2/SiteFooter.tsx", root), "utf8");
  const models = footer.match(/models: \{([\s\S]*?)\n  \}/)?.[1];
  assert.match(models, /href: "\/work\/agent-systems\/"/);
});

test("a failed theme save keeps the current choice through observers and page restoration", async () => {
  for (const initial of ["dark", "light"]) {
    let stored = initial;
    const listeners = new Map(), events = new Map(), observers = [], attributes = new Map(), classes = new Set();
    const control = { disabled: true, setAttribute: (name, value) => attributes.set(name, value), addEventListener: (name, fn) => listeners.set(name, fn) };
    const meta = { setAttribute: (name, value) => { meta[name] = value; } };
    const rootElement = { dataset: {}, style: {}, classList: { contains: name => classes.has(name), add: name => classes.add(name) } };
    const document = { readyState: "complete", documentElement: rootElement,
      querySelectorAll: selector => selector === "[data-theme-toggle]" ? [control] : [meta],
      querySelector: () => ({}), addEventListener() {} };
    const window = { matchMedia: () => ({ matches: false, addEventListener() {} }),
      localStorage: { getItem: () => stored, setItem() { throw new Error("storage quota"); } },
      addEventListener: (name, fn) => events.set(name, fn) };
    vm.runInNewContext(await readFile(new URL("public/theme.js", root), "utf8"), {
      document, window, WeakSet, MutationObserver: class { constructor(fn) { observers.push(fn); } observe() {} },
    });
    assert.equal(rootElement.dataset.theme, initial);
    listeners.get("click")();
    for (const callback of observers) callback();
    events.get("pageshow")();
    const chosen = initial === "dark" ? "light" : "dark";
    assert.equal(rootElement.dataset.theme, chosen);
    assert.equal(rootElement.style.colorScheme, chosen);
    assert.equal(attributes.get("aria-label"), `Theme: switch to ${initial} mode`);
    assert.equal(meta.content, chosen === "dark" ? "#111827" : "#f7f5f0");
    stored = initial;
    events.get("storage")({ key: "mhs-color-theme" });
    assert.equal(rootElement.dataset.theme, initial, "an explicit update in another tab still synchronizes");
  }
});
