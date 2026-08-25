import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { brotliCompressSync, gzipSync } from "node:zlib";
import test from "node:test";

import {
  packContributionGraphCatalog,
  unpackContributionGraphCatalog,
} from "../app/data/contribution-graph-compact.mjs";
import { assertContributionGraphV2 } from "../app/data/contribution-graph-contract.mjs";

const graphDirectory = new URL("../app/data/project-graphs/", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("manifest.json", graphDirectory), "utf8"),
);
const sourceBuffers = await Promise.all(
  manifest.graphIds.map((graphId) =>
    readFile(new URL(`${graphId}.json`, graphDirectory)),
  ),
);
const sourceGraphs = sourceBuffers.map((buffer, index) =>
  assertContributionGraphV2(
    JSON.parse(buffer.toString("utf8")),
    manifest.graphIds[index],
  ),
);
const compactBuffer = await readFile(
  new URL("../app/data/project-graphs.compact.json", import.meta.url),
);
const compactCatalog = JSON.parse(compactBuffer.toString("utf8"));

test("compact catalog reverses to every canonical contribution graph", () => {
  const unpacked = unpackContributionGraphCatalog(compactCatalog);

  assert.deepEqual(unpacked, sourceGraphs);
  assert.deepEqual(packContributionGraphCatalog(sourceGraphs), compactCatalog);
});

test("compact catalog stays within transport and parse-size budgets", () => {
  const sourceBuffer = Buffer.concat(sourceBuffers);

  assert.ok(
    compactBuffer.byteLength <= sourceBuffer.byteLength * 0.35,
    "compact JSON should use at most 35% of canonical raw bytes",
  );
  assert.ok(
    gzipSync(compactBuffer).byteLength <=
      gzipSync(sourceBuffer).byteLength * 0.75,
    "compact JSON should use at most 75% of canonical gzip bytes",
  );
  assert.ok(
    brotliCompressSync(compactBuffer).byteLength <=
      brotliCompressSync(sourceBuffer).byteLength * 0.85,
    "compact JSON should use at most 85% of canonical Brotli bytes",
  );
});
