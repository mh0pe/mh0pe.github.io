import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { tsImport } from "tsx/esm/api";

const load = (path) => tsImport(new URL(`../${path}`, import.meta.url).href, import.meta.url);
const { caseStudies } = await load("app/data/portfolio-v2.ts");
const { default: SourceRecords, contributionRecords } = await load("app/components/v3/ProjectLineageField.tsx");
const { getContributionGraph } = await load("app/components/contribution-story/graph-loaders.ts");
const graphIds = { "automated-security-helper": "automated-security-helper", "cloudformation-guard": "cloudformation-guard", "nix-windows": "nix-windows", "agent-systems": "portable-frameworks" };
const render = (caseStudy, props = {}) => renderToStaticMarkup(createElement(SourceRecords, { caseStudy, ...props }));

test("source records have readable destinations without invented source-flow geometry", () => {
  for (const caseStudy of caseStudies) {
    for (const compact of [false, true]) {
      const html = render(caseStudy, { compact });
      assert.doesNotMatch(html, /<svg|<canvas|data-lineage-field|data-lineage-tooltip|Follow the thread/);
      assert.match(html, /Explore the contributions/);
      assert.match(html, /On GitHub/);
      assert.equal((html.match(/data-source-kind="change"/g) ?? []).length, 2);
      for (const [link] of html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)) {
        assert.match(link, /target="_blank"/);
        assert.match(link, /rel="noreferrer"/);
        assert.match(link, /opens in a new tab/);
      }
      // Reviewed changes are visible outside any implementation disclosure.
      const initiallyVisible = html.replace(/<details\b[\s\S]*?<\/details>/g, "");
      assert.equal((initiallyVisible.match(/Read the reviewed change/g) ?? []).length, 2);
    }
  }
});

test("every displayed link retains an exact existing public record", () => {
  for (const caseStudy of caseStudies) {
    const graph = getContributionGraph(graphIds[caseStudy.id]);
    const records = contributionRecords(graph);
    const html = render(caseStudy);
    assert.equal(records.length, 2);
    for (const record of records) {
      for (const node of Object.values(record).filter(Boolean)) {
        assert.ok(graph.nodes.some((source) => source.id === node.id && source.href === node.href));
        assert.ok(html.includes(`href="${node.href.replaceAll("&", "&amp;")}"`));
      }
      assert.ok(graph.edges.some((edge) => edge.kind === "documents-change" && edge.source === record.repository.id && edge.target === record.change.id));
      assert.ok(graph.edges.some((edge) => edge.kind === "includes-commit" && edge.source === record.change.id && edge.target === record.commit.id));
    }
    assert.match(html, /Related file/);
    assert.doesNotMatch(html, /exact commit|file changed in this commit/i);
  }
});

test("PAUL and SEED remain distinct and shared project links are deduplicated", () => {
  for (const caseStudy of caseStudies) {
    const html = render(caseStudy, { compact: true });
    const expected = caseStudy.id === "agent-systems" ? 8 : 7;
    assert.equal((html.match(/<a\b/g) ?? []).length, expected);
    if (caseStudy.id === "agent-systems") {
      const items = [...html.matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/g)].map(([item]) => item);
      for (const [index, name] of ["paul", "seed"].entries()) {
        assert.ok(items[index].includes(`href="https://github.com/mh0pe/${name}"`));
        assert.ok(items[index].includes(`href="https://github.com/mh0pe/${name}/pull/1"`));
      }
    }
    const inline = render(caseStudy, { inlineSources: true });
    assert.equal((inline.match(/class="source-records__details" open=""/g) ?? []).length, 2);
  }
});

test("source links keep phone labels, target sizes, contrast and visible focus", () => {
  const css = readFileSync(new URL("../public/portfolio-v3.css", import.meta.url), "utf8");
  assert.match(css, /\.hope-brand \.source-records__link \{[^}]*min-height: 44px/);
  assert.match(css, /\.hope-brand \.source-records :focus-visible \{[^}]*outline: 2px solid #f3efe6/);
  assert.doesNotMatch(css, /\.source-records[^{}]*\{[^}]*display:\s*none/);
});
