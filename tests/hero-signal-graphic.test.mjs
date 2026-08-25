import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { gzipSync } from "node:zlib";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

function heroSignalSvg(html) {
  const match = html.match(
    /<svg[^>]*data-hero-signal="true"[^>]*>[\s\S]*?<\/svg>/i,
  );
  assert.ok(match, "Hero signal SVG should server-render");
  return match[0];
}

test("server-renders a complete decorative signal diagram", async () => {
  const response = await render();
  assert.equal(response.status, 200);

  const svg = heroSignalSvg(await response.text());
  assert.match(svg, /viewBox="0 0 1200 720"/i);
  assert.match(svg, /preserveAspectRatio="xMaxYMin slice"/i);
  assert.match(svg, /aria-hidden="true"/i);
  assert.match(svg, /focusable="false"/i);
  assert.match(svg, /role="presentation"/i);

  assert.equal(
    (svg.match(/data-signal-route="base"/g) ?? []).length,
    8,
    "Static base routes should remain visible without JavaScript",
  );
  assert.equal((svg.match(/data-signal-route="reveal"/g) ?? []).length, 3);
  assert.equal((svg.match(/data-signal-node="/g) ?? []).length, 5);
  assert.equal((svg.match(/data-signal-plane="/g) ?? []).length, 3);

  assert.doesNotMatch(svg, /<(?:image|foreignObject|script|a)\b/i);
  assert.doesNotMatch(svg, /(?:href|xlink:href)="(?:https?:|data:)/i);
  assert.doesNotMatch(svg, /\btabindex=/i);
});

test("keeps the SVG deterministic, bounded, and reduced-motion aware", async () => {
  const component = await readFile(
    new URL("app/components/HeroSignalGraphic.tsx", root),
    "utf8",
  );
  const response = await render();
  const svg = heroSignalSvg(await response.text());
  const openingTags = svg.match(/<[a-z][^/!>]*(?:>|\/>)/gi) ?? [];

  assert.match(component, /from "motion\/react"/);
  assert.match(component, /from "motion\/react-m"/);
  assert.match(component, /useReducedMotion\(\) === false/);
  assert.doesNotMatch(component, /Math\.random|Date\.now|new Date/);
  assert.doesNotMatch(component, /\brepeat\s*:/);
  assert.equal(
    (component.match(/animate=\{\s*shouldAnimate/g) ?? []).length,
    3,
    "Every animation family should be gated by reduced-motion state",
  );
  assert.ok(openingTags.length < 60, "SVG should stay below 60 elements");
  assert.ok(svg.length < 20_000, "SVG SSR markup should stay below 20 KB");
  assert.ok(
    gzipSync(svg).length < 5_000,
    "SVG SSR markup should stay below 5 KB gzip",
  );
});

test("provides CSS fallbacks for accessibility and typography", async () => {
  const css = await readFile(new URL("public/portfolio.css", root), "utf8");
  const headlineSpan = css.match(/\.hero h1 span\s*{([\s\S]*?)}/i)?.[1];

  assert.match(css, /\.hero-signal\s*{[\s\S]*?pointer-events:\s*none/i);
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.hero-signal \[data-motion-layer\]/i,
  );
  assert.match(
    css,
    /@media \(forced-colors: active\)[\s\S]*?\.hero-signal[\s\S]*?display:\s*none/i,
  );
  assert.match(css, /@media print[\s\S]*?\.hero-signal[\s\S]*?display:\s*none/i);
  assert.match(
    css,
    /\.hero-signal-svg\s*{[\s\S]*?width:\s*auto[\s\S]*?aspect-ratio:\s*5\s*\/\s*3/i,
  );
  assert.match(
    css,
    /@media \(min-width: 47\.5625rem\) and \(max-width: 56\.25rem\)[\s\S]*?\.hero-signal\s*{[\s\S]*?inset:\s*3\.5rem -12% auto 36%/i,
  );
  assert.ok(headlineSpan, "Hero headline span styles should exist");
  assert.match(headlineSpan, /line-height:\s*1\.08/i);
  assert.match(headlineSpan, /padding-bottom:\s*0\.14em/i);
  assert.match(headlineSpan, /margin-bottom:\s*0/i);
  assert.doesNotMatch(headlineSpan, /margin-bottom:\s*-/i);
});
