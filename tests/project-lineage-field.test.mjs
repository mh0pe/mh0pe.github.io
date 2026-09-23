import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { tsImport } from "tsx/esm/api";

const { caseStudies } = await tsImport(
  new URL("../app/data/portfolio-v2.ts", import.meta.url).href,
  import.meta.url,
);
const { default: ProjectLineageField } = await tsImport(
  new URL("../app/components/v3/ProjectLineageField.tsx", import.meta.url).href,
  import.meta.url,
);

function render(caseId, compact = false) {
  const caseStudy = caseStudies.find((item) => item.id === caseId);
  assert.ok(caseStudy, `${caseId} should be an actual case study`);
  return renderToStaticMarkup(createElement(ProjectLineageField, { caseStudy, compact }));
}

test("lineage connections remain visible before entry and labels inherit the dark panel accent", () => {
  const css = readFileSync(new URL("../public/portfolio-v3.css", import.meta.url), "utf8");
  const motion = css.slice(css.indexOf("@keyframes hope-current-pass"), css.indexOf("@media (max-width: 76rem)"));
  assert.doesNotMatch(motion, /lineage-field__paths\s*>\s*g\s+path/,
    "only the overlay current should wait for entrance, never the static connections");
  assert.match(css, /\.lineage-field \.lineage-field__heading p\s*\{[^}]*color:\s*inherit/,
    "light-page micro-label colors must not leak into the dark artwork");
  assert.match(motion, /lineage-field\[data-motion-entered\] \.lineage-field__current/,
    "the finite entrance current must remain available");
});

function attribute(markup, name) {
  return markup.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

test("stacked Work cards size to their copy, artwork, and expanded source list", () => {
  const css = readFileSync(new URL("../public/portfolio-v3.css", import.meta.url), "utf8");
  assert.match(css, /@media \(width < 48rem\)\s*\{\s*\.hope-brand \.work-index article,\s*\.work-index__copy\s*\{\s*height:\s*auto;/,
    "legacy full-height flex cards must not squeeze the diagram canvas into its source list");
});

function svgMarkup(html) {
  const svg = html.match(/<svg\b[^>]*>[\s\S]*?<\/svg>/)?.[0];
  assert.ok(svg, "the lineage SVG should be rendered");
  return svg;
}

function repositoryNodes(svg) {
  return [...svg.matchAll(
    /(<a\b[^>]*data-lineage-node="repository"[^>]*>[\s\S]*?<\/a>)\s*(<g\b[^>]*class="lineage-field__source-static"[^>]*>[\s\S]*?<\/g>)/g,
  )].map(([, link, glyph]) => ({ link, glyph }));
}

function paths(svg, current) {
  return [...svg.matchAll(/<path\b[^>]*pathLength="1"[^>]*>/g)]
    .map(([markup]) => markup)
    .filter((markup) => (attribute(markup, "class") === "lineage-field__current") === current)
    .map((markup) => attribute(markup, "d"));
}

function fallbackItems(html) {
  const fallback = html.match(/<details\b[^>]*data-lineage-fallback[^>]*>[\s\S]*?<\/details>/)?.[0];
  assert.ok(fallback, "the keyboard-readable source list should be rendered");
  return [...fallback.matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/g)].map(([item]) => item);
}

function assertEvidenceTrail(item, svg, y) {
  const sources = [...svg.matchAll(/<a\b[^>]*data-lineage-node="(?:change|commit|file)"[^>]*>[\s\S]*?<\/a>/g)]
    .map(([link]) => link)
    .filter((link) => attribute(link, "cy") === String(y));
  assert.deepEqual(sources.map((link) => attribute(link, "data-lineage-node")), ["change", "commit", "file"]);
  const fallbackLinks = [...item.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map(([link]) => link);
  assert.deepEqual(
    fallbackLinks.filter((link) => !link.includes("Project: ")).map((link) => attribute(link, "href")),
    sources.map((link) => attribute(link, "href")),
    "the fallback should preserve the complete change, commit, and file trail from the same SVG row",
  );
  assert.match(item, /Code update:/);
  assert.match(item, /Implementation detail:/);
}

function assertRepositoryNode(node, repository, y) {
  assert.equal(attribute(node.link, "href"), `https://github.com/${repository}`);
  assert.equal(attribute(node.link, "data-lineage-label"), `Project: ${repository}`);
  assert.equal(attribute(node.link, "aria-label"), `Project: ${repository} Opens in a new tab.`);
  assert.ok(node.link.includes(`<title>Project: ${repository}</title>`));
  assert.equal(attribute(node.link, "target"), "_blank");
  assert.equal(attribute(node.link, "rel"), "noreferrer");
  const hitArea = node.link.match(/<circle\b[^>]*class="lineage-field__hit-area"[^>]*>/)?.[0];
  assert.ok(hitArea, `${repository} should retain its interactive hit area`);
  assert.equal(attribute(hitArea, "cx"), "82");
  assert.equal(attribute(hitArea, "cy"), String(y));
  assert.equal(attribute(hitArea, "r"), "22");
  assert.equal(attribute(node.glyph, "transform"), `translate(82 ${y})`);
  assert.match(node.glyph, /<rect x="-10" y="-7" width="20" height="14"/);
}

test("renders distinct, correctly labelled PAUL and SEED repository roots", () => {
  for (const compact of [false, true]) {
    const svg = svgMarkup(render("agent-systems", compact));
    const repositories = repositoryNodes(svg);
    assert.equal(repositories.length, 2, "both selected repository sources need their own link and glyph");
    assertRepositoryNode(repositories[0], "mh0pe/paul", 74);
    assertRepositoryNode(repositories[1], "mh0pe/seed", 158);
    const changes = [...svg.matchAll(/<a\b[^>]*data-lineage-node="change"[^>]*>[\s\S]*?<\/a>/g)].map(([link]) => link);
    assert.deepEqual(changes.map((link) => attribute(link, "href")), [
      "https://github.com/mh0pe/paul/pull/1",
      "https://github.com/mh0pe/seed/pull/1",
    ]);
    assert.deepEqual(changes.map((link) => attribute(link, "cy")), ["74", "158"]);
  }
});

test("draws static and animated branches from each change's own repository", () => {
  const svg = svgMarkup(render("agent-systems"));
  const staticPaths = paths(svg, false);
  assert.equal(staticPaths.length, 8, "both threads should retain all four source-to-result segments");
  const firstEdges = staticPaths.filter((d) => d.startsWith("M82 "));
  assert.deepEqual(firstEdges, [
    "M82 74 C165 74 165 74 248 74",
    "M82 158 C165 158 165 158 248 158",
  ]);
  const currents = paths(svg, true);
  assert.equal(currents.length, 2, "separate repositories must not share one animated circuit");
  for (const [index, y] of [74, 158].entries()) {
    const d = currents[index];
    const otherY = y === 74 ? 158 : 74;
    const staticThread = staticPaths.slice(index * 4, index * 4 + 4)
      .map((segment, segmentIndex) => segmentIndex === 0 ? segment : segment.replace(/^M[\d.]+ [\d.]+ /, ""))
      .join(" ");
    assert.equal(d, staticThread, "the animated current must follow the visible static thread exactly");
    assert.match(d, new RegExp(`^M82 ${y}(?:\\s|$)`));
    assert.equal((d.match(/M/g) ?? []).length, 1, "each current should be one continuous branch");
    assert.ok(d.includes(`248 ${y}`), "the current must reach its own reviewed-change point");
    assert.ok(d.includes(`574 ${y}`) || d.includes("H574"), "the current must reach its own implementation detail");
    assert.ok(d.includes("706 112"), "the branch should still connect to the shared result");
    assert.doesNotMatch(d, new RegExp(`(?:82|248|414|574) ${otherY}(?:\\s|$)`), "a current must not pass through the other repository's thread");
  }
});

test("keeps each fallback repository link with its matching reviewed change", () => {
  const html = render("agent-systems");
  const items = fallbackItems(html);
  assert.equal(items.length, 2, "the fallback should list two self-contained evidence threads");
  for (const [index, repository] of ["paul", "seed"].entries()) {
    const item = items[index];
    const root = `href="https://github.com/mh0pe/${repository}"`;
    const change = `href="https://github.com/mh0pe/${repository}/pull/1"`;
    assert.ok(item.includes(root), `${repository}'s source must be in its evidence list item`);
    assert.ok(item.includes(change), `${repository}'s reviewed change must be in the same item`);
    assert.ok(item.indexOf(root) < item.indexOf(change), "the fallback should read from source to change");
    assertEvidenceTrail(item, svgMarkup(html), [74, 158][index]);
    const otherRepository = repository === "paul" ? "seed" : "paul";
    assert.ok(!item.includes(`href="https://github.com/mh0pe/${otherRepository}"`));
  }
});

test("retains one centered root for two changes from the same repository", () => {
  for (const [caseId, repository] of [
    ["automated-security-helper", "awslabs/automated-security-helper"],
    ["cloudformation-guard", "aws-cloudformation/cloudformation-guard"],
    ["nix-windows", "NixOS/nix"],
  ]) {
    const html = render(caseId);
    const svg = svgMarkup(html);
    const repositories = repositoryNodes(svg);
    assert.equal(repositories.length, 1, `${caseId} should deduplicate its repository root`);
    assertRepositoryNode(repositories[0], repository, 112);
    assert.deepEqual(paths(svg, false).filter((d) => d.startsWith("M82 ")), [
      "M82 112 C165 112 165 74 248 74",
      "M82 112 C165 112 165 158 248 158",
    ]);
    const currents = paths(svg, true);
    assert.ok(currents.length > 0, "shared-root cases should retain their current animation");
    assert.ok(currents.every((d) => d.startsWith("M82 112 ")));
    const items = fallbackItems(html);
    assert.equal(items.length, 2);
    const rootHref = `href="https://github.com/${repository}"`;
    assert.equal(items.join("").split(rootHref).length - 1, 1, "the shared repository should have exactly one fallback anchor");
    assert.ok(items[0].includes(rootHref), "the first evidence item should link its repository");
    assert.ok(!items[1].includes(rootHref), "later evidence items should not duplicate the repository anchor");
    for (const [index, item] of items.entries()) {
      assert.ok(item.includes(`Project: ${repository}`), "each evidence item must explicitly identify its repository");
      assertEvidenceTrail(item, svg, [74, 158][index]);
    }
    const repeatedProject = items[1].replace(/<a\b[^>]*>[\s\S]*?<\/a>/g, "");
    assert.ok(repeatedProject.includes(`Project: ${repository}<br/>`), "the repeated project should remain plain text on its own line");
  }
});

test("keeps the four compact lineage fields within their 58-link budget", () => {
  const expectedLinks = {
    "automated-security-helper": 14,
    "cloudformation-guard": 14,
    "nix-windows": 14,
    "agent-systems": 16,
  };
  let total = 0;
  for (const [caseId, expected] of Object.entries(expectedLinks)) {
    const html = render(caseId, true);
    const links = [...html.matchAll(/<a\b[^>]*\bhref="[^"]+"/g)];
    assert.equal(links.length, expected, `${caseId} should include every evidence source without duplicate repository fallback links`);
    total += links.length;
  }
  assert.equal(total, 58, "the homepage's four compact fields must not exceed their accessible-link allocation");
});
