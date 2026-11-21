import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assertFullHistoryRefreshTarget } from "../tools/public-contribution-guards.mjs";
import { refreshProjectPlayerRecords } from "../tools/refresh-project-player-records.mjs";

test("full-history refresh accepts legacy and explicitly complete-history targets", () => {
  for (const manifest of [undefined, {}, { sourceKind: "full-public-history" }]) {
    assert.doesNotThrow(() => assertFullHistoryRefreshTarget(manifest));
  }
});

test("full-history refresh refuses selected or unknown source generations", () => {
  for (const sourceKind of ["selected-public-receipts-with-inherited-records", "future-generation", "", null, false, 0, undefined]) {
    assert.throws(() => assertFullHistoryRefreshTarget({ sourceKind }), /refusing to discard selected contributions/);
  }
});

test("player refresh rejects mixed generations before any network or write operation", async () => {
  const calls = [];
  await assert.rejects(refreshProjectPlayerRecords({
    manifest: { sourceKind: "selected-public-receipts-with-inherited-records" },
    fetchJson: async () => { calls.push("network"); },
    writeRecords: async () => { calls.push("write"); },
  }), /refusing to discard selected contributions/);
  assert.deepEqual(calls, []);
});

test("graph CLI checks the target generation before loading or hydrating history", async () => {
  const source = await readFile(new URL("../tools/build-project-graphs.mjs", import.meta.url), "utf8");
  const main = source.slice(source.indexOf("async function main()"));
  const guard = main.indexOf("assertFullHistoryRefreshTarget(targetManifest)");
  assert.ok(guard >= 0);
  assert.ok(guard < main.indexOf("loadProjectGraphInputs("));
  assert.ok(guard < main.indexOf("hydrateEvidence("));
});
