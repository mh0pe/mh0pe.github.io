import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { assertFullHistoryRefreshTarget, assertGraphSelectionPreserved } from "../tools/public-contribution-guards.mjs";
import { graphSpecs } from "../tools/build-project-graphs.mjs";

test("legacy full refresh cannot erase the ninth project group", () => {
  const manifest = { sourceKind: "full-public-history", graphIds: [...graphSpecs.map(s => s.id), "ash-workspace"] };
  assert.doesNotThrow(() => assertFullHistoryRefreshTarget(manifest));
  assert.throws(() => assertGraphSelectionPreserved(manifest, graphSpecs), /drop project groups: ash-workspace/);
  assert.doesNotThrow(() => assertGraphSelectionPreserved(manifest, [...graphSpecs, { id: "ash-workspace" }]));
});

test("graph selection guard accepts a new target and additions but rejects duplicates", () => {
  const specs = [{ id: "first" }, { id: "second" }];
  assert.doesNotThrow(() => assertGraphSelectionPreserved(undefined, specs));
  assert.doesNotThrow(() => assertGraphSelectionPreserved({ graphIds: ["first"] }, specs));
  assert.throws(() => assertGraphSelectionPreserved(undefined, [specs[0], specs[0]]), /duplicate/);
  assert.throws(() => assertGraphSelectionPreserved({ graphIds: ["first", "first"] }, specs), /duplicate/);
  assert.throws(() => assertGraphSelectionPreserved({}, specs), /missing/);
});

test("legacy entry point checks the target before source reads or hydration", async () => {
  const source = await readFile(new URL("../tools/build-project-graphs.mjs", import.meta.url), "utf8");
  const main = source.slice(source.indexOf("async function main()"));
  assert.ok(main.indexOf("assertFullHistoryRefreshTarget(targetManifest)") < main.indexOf("assertGraphSelectionPreserved(targetManifest, graphSpecs)"));
  assert.ok(main.indexOf("assertGraphSelectionPreserved(targetManifest, graphSpecs)") < main.indexOf("await loadProjectGraphInputs()"));
});
