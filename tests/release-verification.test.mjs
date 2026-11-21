import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import blogRoutes from "../app/data/blog-routes.json" with { type: "json" };
import { discoverExportCatalog, routeForExportPath } from "../tools/export-catalog.mjs";
import { viewportAuditFailureReasons } from "../tools/viewport-audit-contract.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("viewport audit derives all exported routes, including the blog index and ten articles", async () => {
  const catalog = await discoverExportCatalog(fileURLToPath(new URL("../pages-dist/", import.meta.url)));
  const routes = catalog.map((entry) => entry.route);
  assert.equal(routes.length, 27);
  assert.ok(routes.includes("/blog/"));
  assert.deepEqual(
    blogRoutes.filter((slug) => routes.includes(`/blog/${slug}/`)),
    blogRoutes,
  );
  assert.equal(routeForExportPath("404.html"), "/404.html");
  assert.equal(routeForExportPath("work/index.html"), "/work/");
});

test("viewport audit classifies release failures and exits nonzero when any are found", async () => {
  assert.deepEqual(viewportAuditFailureReasons({
    brokenImages: [], horizontalOverflow: false, newsreaderLoaded: true, oneH1: true, oneMain: true,
  }), []);
  assert.deepEqual(viewportAuditFailureReasons({
    brokenImages: ["missing.png"], horizontalOverflow: true, newsreaderLoaded: false, oneH1: false, oneMain: false,
  }), ["document-horizontal-overflow", "broken-images", "heading-count", "main-count", "newsreader-not-loaded"]);
  const source = await read("tools/viewport-audit.mjs");
  assert.match(source, /discoverExportCatalog/);
  assert.match(source, /if \(failures\.length > 0\) process\.exitCode = 1/);
});

test("Pages workflow pins verified action commits, Node, and emits both public and retained manifests", async () => {
  const workflow = await read(".github/workflows/pages.yml");
  for (const sha of [
    "d23441a48e516b6c34aea4fa41551a30e30af803",
    "249970729cb0ef3589644e2896645e5dc5ba9c38",
    "983d7736d9b0ae728b81ab479565c72886d7745b",
    "7b1f4a764d45c48632c6b24a0339c27f5614fb0b",
    "d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e",
    "ea165f8d65b6e75b540449e92b4886f43607fa02",
  ]) assert.ok(workflow.includes(sha), sha);
  assert.match(workflow, /node-version: "22\.23\.3"/);
  assert.match(workflow, /build:[\s\S]*?permissions:\n\s+contents: read\n\s+pages: read/);
  assert.match(workflow, /deploy:[\s\S]*?permissions:\n\s+pages: write\n\s+id-token: write/);
  assert.match(workflow, /build-artifact-manifest\.mjs pages-dist pages-dist\/release-manifest\.json/);
  assert.match(workflow, /name: pages-release-manifest-/);
});
