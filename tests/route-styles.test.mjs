import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

const routes = [
  ["home", ""], ["models", "models/"], ["method", "method/"], ["credentials", "credentials/"],
  ["work", "work/"], ["about", "about/"], ["about", "career/"], ["proof", "proof/"], ["proof", "evidence/"],
  ["decisions", "decisions/"], ["capabilities", "capabilities/"],
  ...["automated-security-helper", "cloudformation-guard", "nix-windows", "agent-systems"]
    .map(slug => ["case-study", `work/${slug}/`]),
];
for (const [route, url] of routes) {
  test(`${url || "/"} bundle includes every rendered component and preserves its CSS sequence`, async () => {
    const html = await read(`pages-dist/${url}index.html`);
    for (const match of html.matchAll(/class="([^"]*)"/g)) {
      for (const name of match[1].split(/\s+/).filter(Boolean)) {
        assert.ok(includesRouteClass(route, name), `Add ${name} to the ${route} style contract before using it`);
      }
    }
    const generated = await read(`pages-dist/route-styles/${route}.css`);
    const sourceBundles = await Promise.all(sharedStylesheets.map(async filename => routeStylesheet(await read(`public/${filename}`), route, filename)));
    assert.equal(generated, sourceBundles.join("\n"));
    assert.ok(Buffer.byteLength(generated) < (route === "case-study" ? 70_000 : 65_000));
    const version = createHash("sha256").update(generated).digest("hex");
    assert.ok(html.includes(`href="/route-styles/${route}.css?v=${version}"`));
    for (const shared of sharedStylesheets) assert.ok(!html.includes(`href="/${shared}?`));
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
  assert.ok(positions.every((position, index) => position >= 0 && (index === 0 || positions[index - 1] < position)));
  assert.doesNotMatch(html, /data-recovery-styles/);
});

test("Models hydrates just the explorer and leaves styles and fonts on the critical path", async () => {
  const html = await read("pages-dist/models/index.html");
  const hints = [...html.matchAll(/<link\b[^>]*>/g)].map(match => match[0]);
  const modules = hints.filter(tag => tag.includes('rel="modulepreload"'));
  assert.deepEqual(modules, [], "the static document does not preload framework modules");
  for (const tag of hints.filter(tag => tag.includes('as="font"') || tag.includes('rel="stylesheet"'))) {
    assert.ok(!tag.includes('fetchpriority="low"'), "visible fonts and styles are not demoted");
  }
  const bytes = await read("pages-dist/model-explorer.js");
  const version = createHash("sha256").update(bytes).digest("hex");
  assert.match(html, new RegExp('<script data-static-runtime="model-explorer" src="/model-explorer\\.js\\?v=' + version + '" defer>'));
  assert.doesNotMatch(html, /__VINEXT_RSC_|import\(["']\/assets\/index-/);
  const framework = await read("build/local-preview/models-vinext.html");
  const mount = /<div class="proof-models" data-model-explorer-root[^>]*>[\s\S]*?<\/main>/;
  assert.ok(mount.test(framework));
  assert.equal(html.match(mount)?.[0], framework.match(mount)?.[0], "the island uses unchanged server-rendered explorer HTML");
});

test("new route bundles retain open, focus, dark theme and motion selectors", async () => {
  const selectors = {
    work: [".work-index__history > summary", ".source-records__details"],
    "case-study": [".case-path__list > li[data-active]", ".claim-ledger__context[open]"],
    proof: [".vocabulary-disclosure[open]"],
    about: ['[data-theme="dark"] .hope-brand .career-ledger__mark', "[data-motion-entered] .about-portrait__trace-current"],
    capabilities: ["details[open]", ".capability-atlas__node[data-active]"],
    decisions: [".decision-pages__proofs"],
  };
  for (const [route, required] of Object.entries(selectors)) {
    const css = await read(`pages-dist/route-styles/${route}.css`);
    for (const selector of required) assert.ok(css.replace(/\s+/g, "").includes(selector.replace(/\s+/g, "")), `${route}: ${selector}`);
  }
});
