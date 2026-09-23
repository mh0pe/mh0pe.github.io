import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { gzipSync } from "node:zlib";
import { expectedProjectGraphIds } from "./project-catalog.mjs";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", process.pid + "-" + Date.now());
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders one deterministic, graph-derived Hope Line", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  const field = html.match(
    /<section[^>]*data-visualization="hope-line"[^>]*>[\s\S]*?<\/section>/i,
  )?.[0];
  assert.ok(field);
  assert.match(field, /portfolio-wide map of connected systems/i);
  assert.match(field, /Each field connects a system to the public work and model associations behind it/i);

  const graphIds = [...field.matchAll(/data-graph-id="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.deepEqual([...new Set(graphIds)], expectedProjectGraphIds);
  for (const graphId of expectedProjectGraphIds) {
    assert.equal(
      graphIds.filter((candidate) => candidate === graphId).length,
      3,
      `${graphId} should appear in desktop art, mobile art, and the linked index`,
    );
  }

  for (const nodeType of ["repository", "evidence", "commit", "file"]) {
    assert.match(field, new RegExp(`data-node-type="${nodeType}"`));
  }
  for (const edgeKind of ["documents-change", "includes-commit", "commit-touches-file"]) {
    assert.match(field, new RegExp(`data-edge-kind="${edgeKind}"`));
  }
  assert.match(field, /<title>Project:/i);
  assert.match(field, /<title>Reviewed change:/i);
  assert.match(field, /<title>Code update:/i);
  assert.match(field, /<title>Implementation detail:/i);
  assert.match(field, /<title>Model association:/i);
  assert.match(field, /aria-label="Projects on the Hope Line"/i);
  const svgs = field.match(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi) ?? [];
  assert.equal(svgs.length, 2, "desktop and mobile topologies should both render");
  assert.ok(
    svgs.every((svg) => (svg.match(/<(?!\/|!)[A-Za-z][^>]*>/g) ?? []).length <= 500),
    "each signature SVG should remain bounded to 500 elements",
  );
  assert.doesNotMatch(field, /<(?:image|foreignObject|script|canvas)\b/i);
  assert.doesNotMatch(field, /(?:href|xlink:href)="data:/i);
  assert.ok(gzipSync(field).byteLength <= 10 * 1024);
});

test("keeps the Hope Line server-only, deterministic, and free of runtime loaders", async () => {
  const [page, field] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/components/v3/HopeLineField.tsx", import.meta.url),
      "utf8",
    ),
  ]);
  for (const source of [page, field]) {
    assert.doesNotMatch(source, /["']use client["']|import\(|motion\/react|@react-three\/fiber|d3-force|requestAnimationFrame|setInterval/);
  }
  assert.match(field, /getContributionGraph/);
  assert.match(field, /pathLength="1"/);
  assert.doesNotMatch(field, /Math\.random|Date\.now|new Date|animateMotion|<animate\b/);
});
