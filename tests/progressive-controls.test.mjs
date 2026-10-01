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
    assert.ok(study.contributionSummary.length > 40);
    assert.ok(study.contributionSummary.split(/\s+/).length <= 18);
  }
  const home = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(home, /<strong>My contribution<\/strong> \{caseStudy.contributionSummary\}/);
  const { default: Home } = await tsImport(new URL("app/page.tsx", root).href, import.meta.url);
  const html = renderToStaticMarkup(createElement(Home));
  assert.equal((html.match(/<strong>My contribution<\/strong>/g) ?? []).length, 4);
  assert.ok((html.match(/<(?!\/|!)[A-Za-z][^>]*>/g) ?? []).length <= 1850);
  const css = await readFile(new URL("public/interactions.css", root), "utf8");
  assert.match(css, /\.hope-story__contribution \{[^}]*color: var\(--hope-porcelain\)/);
  const footer = await readFile(new URL("app/components/v2/SiteFooter.tsx", root), "utf8");
  const models = footer.match(/models: \{([\s\S]*?)\n  \}/)?.[1];
  assert.match(models, /href: "\/work\/agent-systems\/"/);
});
