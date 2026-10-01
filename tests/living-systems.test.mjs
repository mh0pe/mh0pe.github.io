import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { tsImport } from "tsx/esm/api";

const root = new URL("../", import.meta.url);
const load = (path) => tsImport(new URL(path, root).href, import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const { default: Art, livingClusters, livingProjects } = await load("app/components/v3/LivingConstellation.tsx");
const { satinBands } = await load("app/components/v3/SatinRibbon.tsx");
const { default: Home } = await load("app/page.tsx");
const { default: Layout } = await load("app/layout.tsx");
const { default: Feature } = await load("app/components/v3/FeaturedProjectStory.tsx");
const html = renderToStaticMarkup(createElement(Home));

test("route-only art direction follows the existing theme in delivered CSS order", () => {
  const document = renderToStaticMarkup(createElement(Layout, null, createElement(Home)));
  const styles = [...document.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((match) => match[1].split("?")[0]);
  assert.deepEqual(styles, ["/portfolio-v2.css", "/portfolio-v3.css", "/interactions.css", "/living-systems.css"]);
});

test("large contribution art preserves all eight selections and their exact edges", () => {
  assert.equal(livingClusters.length, 8);
  assert.equal(livingClusters.reduce((n, cluster) => n + cluster.connections.length, 0), 58);
  for (const cluster of livingClusters) {
    assert.deepEqual(cluster.connections.map((edge) => edge.id), cluster.project.edges.map((edge) => edge.id));
    assert.equal((cluster.nodes.match(/M/g) ?? []).length, cluster.project.nodes.length);
    assert.ok(cluster.connections.every((edge) => /^M[\d.-]+ [\d.-]+L[\d.-]+ [\d.-]+$/.test(edge.d)));
  }
  const markup = renderToStaticMarkup(createElement(Art));
  assert.equal(markup, renderToStaticMarkup(createElement(Art)));
  assert.match(markup, /ribbons are decorative, not connections between projects/);
  assert.equal((markup.match(/class="living-cluster"/g) ?? []).length, 8);
  assert.equal((markup.match(/class="hope-line__index-item"/g) ?? []).length, 8);
  for (const project of livingProjects) assert.ok(markup.includes(`href="${project.href}"`));
});

test("both compositions keep graph nodes and their labels within the SVG", () => {
  for (const [i, cluster] of livingClusters.entries()) {
    const desktop = livingProjects[i];
    const mobile = { x: i % 2 ? 522 : 198, y: 90 + Math.floor(i / 2) * 142, scale: 1.15 };
    for (const layout of [desktop, mobile]) {
      for (const point of cluster.positions.values()) {
        const x = layout.x + point.x * layout.scale;
        const y = layout.y + point.y * layout.scale;
        assert.ok(x >= 12 && x <= 708 && y >= 12 && y <= 608, `${cluster.project.graph.id}: ${x}, ${y}`);
      }
      assert.ok(layout.y + 70 * layout.scale < 606);
    }
  }
});

test("Satin Flow derivative is bounded, smooth, deterministic and server-only", async () => {
  assert.equal(satinBands.length, 6);
  assert.ok(satinBands.every((d) => /^M.*C.*Z$/.test(d) && !/NaN|undefined|Infinity/.test(d)));
  const source = await read("app/components/v3/SatinRibbon.tsx");
  assert.doesNotMatch(source, /use client|useEffect|requestAnimationFrame|Math\.random|Date\.now|<canvas|<filter/);
  const notice = await read("THIRD_PARTY_NOTICES.md");
  assert.match(notice, /SatinRibbon\.tsx/);
  assert.match(notice, /originkit\.dev\/docs\/licensing/);
  assert.match(notice, /Copyright \(c\) 2026 uixmat/);
});

test("candidate retains immediate content, source trails and original page budgets", () => {
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /Bringing <em>Hope<\/em> to distributed systems/);
  assert.equal((html.match(/<strong>My contribution<\/strong>/g) ?? []).length, 4);
  assert.equal((html.match(/class="living-feature"/g) ?? []).length, 1);
  assert.match(html, /<summary>View code and reviewed changes<\/summary>/);
  assert.match(html, /href="\/work\/automated-security-helper\/"/);
  assert.match(html, /LinkedIn/);
  assert.doesNotMatch(html, /<canvas|Loading the source trail|<iframe|data-contribution-player/);
  assert.ok((html.match(/<(?!\/|!)[A-Za-z][^>]*>/g) ?? []).length <= 1850);
  assert.ok((html.match(/<a\b/g) ?? []).length <= 188);
  assert.ok((html.match(/<(?:a|button|summary|input)\b/g) ?? []).length <= 208);
  assert.ok(gzipSync(html).byteLength <= 40 * 1024);
  const visible = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i)[0]
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<details(?![^>]*\bopen\b)[^>]*>[\s\S]*?<summary\b[^>]*>([\s\S]*?)<\/summary>[\s\S]*?<\/details>/gi, " $1 ")
    .replace(/<[^>]+>/g, " ").replace(/&(?:#x?[0-9a-f]+|[a-z]+);/gi, " ")
    .trim().split(/\s+/);
  assert.ok(visible.length >= 1700 && visible.length <= 3000, `Visible words: ${visible.length}`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, "SVG and accessible IDs must be unique");
});

test("review fixes preserve one-step source access and a bounded decorative layer", async () => {
  const feature = renderToStaticMarkup(createElement(Feature));
  assert.equal((feature.match(/<details\b/g) ?? []).length, 3);
  assert.equal((feature.match(/class="source-records__details" open=""/g) ?? []).length, 2);
  assert.equal((feature.match(/class="source-records__link"/g) ?? []).length, 7);
  assert.ok(/data-contribution-sculpture="true"/.test(feature));
  assert.match(html, /class="cap-hero"/);
  assert.match(html, /class="cap-feature-art"/);
  const css = await read("public/living-systems.css");
  assert.match(css, /\.living-feature__sources \.lineage-field__fallback \{ display: block; \}/);
  assert.match(css, /\.hope-brand \.living-feature__actions a\.living-feature__action \{[^}]*background: #e1e8c4; color: #102820;/);
  assert.match(css, /\.living-feature__art \{ position: absolute;/);
  assert.doesNotMatch(css, /\.living-feature__art \{ position: relative;/);
  assert.match(css, /\[data-page-hidden\] \.living-constellation \.satin-ribbon/);
});

test("homepage-only styling adds no scroll simulation or hidden-content entrance", async () => {
  const paths = ["public/portfolio-v2.css", "public/portfolio-v3.css", "public/interactions.css", "public/living-systems.css"];
  const styles = await Promise.all(paths.map(read));
  assert.ok(styles.reduce((sum, css) => sum + gzipSync(css).byteLength, 0) <= 47 * 1024);
  const css = styles.at(-1);
  assert.doesNotMatch(css, /infinite|backdrop-filter|mix-blend-mode|animation-timeline|scroll-timeline|opacity:\s*0[;}]/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\[data-art-static\]/);
  assert.match(css, /--mobile-x/);
  assert.match(css, /min-height: 44px/);
  assert.match(html, /living-systems\.css\?v=20260930-clarity/);
});
