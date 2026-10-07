import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postcss from "postcss";
import { includesRouteClass, includesRouteSelector, routeStylesheet } from "../tools/build-route-styles.mjs";
import { sharedStylesheets } from "../tools/export-stylesheets.mjs";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("route filtering retains whole selector lists and uncertain nested conditions", () => {
  assert.equal(includesRouteSelector("models", ".attribution-empty:focus-visible"), true);
  assert.equal(includesRouteSelector("models", ".other-page, .site-header[open]"), true);
  assert.equal(includesRouteSelector("models", ".other-page .site-header"), false);
  for (const selector of [":not(.other-page)", ".hope-brand :is(.other-page, .attribution-empty)", ":has(.other-page)", "svg|unknown??"]) {
    assert.equal(includesRouteSelector("models", selector), true, selector);
  }
  const css = routeStylesheet(`@layer stable; @keyframes demo { from { opacity: 0 } to { opacity: 1 } }
    @media (prefers-reduced-motion: reduce) { .attribution-empty { animation: none } .other-page { color: red } }
    :root[data-theme="dark"] .attribution-trace.is-selected { --color: blue; color: var(--color) }
    .other-page { color: green } .attribution-empty { color: blue } .attribution-empty { color: red }`, "models", "fixture.css");
  assert.match(css, /@layer stable/);
  assert.match(css, /@keyframes demo/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\[data-theme="dark"\]/);
  assert.doesNotMatch(css, /\.other-page/);
  assert.ok(css.indexOf("color:blue}") < css.lastIndexOf("color:red}"));
});

for (const route of ["home", "models", "method"]) {
  test(`${route} bundle includes every rendered component and preserves its CSS sequence`, async () => {
    const html = await read(`pages-dist/${route === "home" ? "index.html" : `${route}/index.html`}`);
    for (const match of html.matchAll(/class="([^"]*)"/g)) {
      for (const name of match[1].split(/\s+/).filter(Boolean)) {
        assert.ok(includesRouteClass(route, name), `Add ${name} to the ${route} style contract before using it`);
      }
    }
    const generated = await read(`pages-dist/route-styles/${route}.css`);
    const sourceBundles = await Promise.all(sharedStylesheets.map(async filename => routeStylesheet(await read(`public/${filename}`), route, filename)));
    assert.equal(generated, sourceBundles.join("\n"));
    assert.ok(Buffer.byteLength(generated) < 65_000);
    assert.match(html, new RegExp(`href="/route-styles/${route}\\.css\\?v=20261003-loading"`));
    assert.doesNotMatch(html, /<link[^>]+href="\/(?:portfolio-v2|portfolio-v3|interactions)\.css/);
    assert.ok(html.indexOf(`/route-styles/${route}.css`) < html.indexOf("</head>"), "blocking styles are discovered in the head");
    const parsed = postcss.parse(generated);
    assert.ok(parsed.nodes.length > 0);
    assert.match(generated, /prefers-reduced-motion/);
    assert.match(generated, /forced-colors/);
    assert.match(generated, /data-theme/);
  });
}

test("Models includes interactive states absent from its initial HTML", async () => {
  const css = await read("pages-dist/route-styles/models.css");
  for (const selector of [".attribution-empty", ".attribution-trace-selection", ".is-selected", ".theme-ready"]) {
    assert.ok(css.includes(selector), selector);
  }
  assert.match(css, /\.route-intro__grid > div > \*[^{}]*\{[^{}]*animation:none/);
});

test("the recovery page discovers its complete styles in the head without burdening healthy routes", async () => {
  const html = await read("pages-dist/404.html");
  const head = html.slice(0, html.indexOf("</head>"));
  const positions = sharedStylesheets.map(name => head.indexOf(`href="/${name}?`));
  assert.ok(positions[0] >= 0 && positions[0] < positions[1] && positions[1] < positions[2]);
  assert.doesNotMatch(html, /data-recovery-styles/);
});

test("hydration module hints leave priority to visible styles and fonts", async () => {
  const html = await read("pages-dist/models/index.html");
  const hints = [...html.matchAll(/<link\b[^>]*>/g)].map(match => match[0]);
  const modules = hints.filter(tag => tag.includes('rel="modulepreload"'));
  assert.ok(modules.length > 0, "interactive modules still preload");
  for (const tag of modules) assert.ok(tag.includes('fetchpriority="low"'));
  for (const tag of hints.filter(tag => tag.includes('as="font"') || tag.includes('rel="stylesheet"'))) {
    assert.ok(!tag.includes('fetchpriority="low"'), "visible fonts and styles are not demoted");
  }
  assert.match(html, /import\(["']\/assets\/index-/);
});
