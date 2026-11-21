import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { buildBasisCompanion, validateRecoveredRows } from "../tools/recover-attribution-provenance.mjs";

const sha = "a".repeat(40);
const models = { commits: [{ sha, modelIds: ["claude"] }] };
const row = () => ({ sha, modelIds: ["claude"], basis: "recorded-model-marker", sourceOccurrences: [{ source: "public-history", repository: "owner/project" }] });

test("preserves exact model identity with explicit recorded basis", () => {
  assert.deepEqual(validateRecoveredRows(models, [row()]), [row()]);
});
test("preserves inferred basis separately from recorded markers", () => {
  const entry = row(); entry.basis = "stated-awsmadi-date-rule";
  assert.equal(validateRecoveredRows(models, [entry])[0].basis, entry.basis);
});
test("platform-only cannot masquerade as a recorded model", () => {
  const entry = row(); entry.modelIds = []; entry.basis = "platform-only";
  assert.equal(validateRecoveredRows({ commits: [{ sha, modelIds: [] }] }, [entry])[0].basis, "platform-only");
  entry.basis = "recorded-model-marker";
  assert.throws(() => validateRecoveredRows({ commits: [{ sha, modelIds: [] }] }, [entry]));
});
test("model mismatch fails before output", () => {
  const entry = row(); entry.modelIds = ["different-model"];
  assert.throws(() => validateRecoveredRows(models, [entry]), /mismatch/);
});
test("missing marker without an eligible default fails", () => {
  const entry = row(); entry.modelIds = []; entry.basis = "missing-marker";
  assert.throws(() => validateRecoveredRows(models, [entry]), /mismatch/);
  assert.throws(() => validateRecoveredRows({ commits: [{ sha, modelIds: [] }] }, [entry]), /Missing marker/);
});
test("missing source occurrence, rows, duplicates, or unknown SHA fails", () => {
  assert.throws(() => validateRecoveredRows(models, []));
  assert.throws(() => validateRecoveredRows(models, [row(), row()]));
  const entry = row(); entry.sha = "b".repeat(40);
  assert.throws(() => validateRecoveredRows(models, [entry]));
  entry.sha = sha; entry.sourceOccurrences = [];
  assert.throws(() => validateRecoveredRows(models, [entry]));
});
test("rejects accidental raw messages or extra source fields", () => {
  const entry = row(); entry.message = "not permitted";
  assert.throws(() => validateRecoveredRows(models, [entry]));
  delete entry.message; entry.sourceOccurrences[0].email = "not permitted";
  assert.throws(() => validateRecoveredRows(models, [entry]));
});

test("compact basis binds exact bytes and SHA order without sorting existing rows", () => {
  const data = { schemaVersion: 1, commits: [{ sha: "b".repeat(40), modelIds: ["claude"] }, ...models.commits] };
  const bytes = Buffer.from(JSON.stringify(data));
  const proof = { schemaVersion: 1, inputBindings: { attributionSha256: createHash("sha256").update(bytes).digest("hex") }, commits: [row(), { ...row(), sha: "b".repeat(40), basis: "stated-awsmadi-date-rule" }] };
  const companion = buildBasisCompanion(bytes, proof);
  assert.equal(companion.basis, "hr");
  assert.equal(companion.shaOrderSha256, createHash("sha256").update(JSON.stringify(data.commits.map(c => c.sha))).digest("hex"));
  assert.throws(() => buildBasisCompanion(Buffer.from(`${bytes}\n`), proof), /bytes changed/);
  const reordered = Buffer.from(JSON.stringify({ ...data, commits: [...data.commits].reverse() }));
  assert.throws(() => buildBasisCompanion(reordered, proof), /bytes changed/);
});

test("checked-in compact basis matches unchanged attribution and full recovered proof", async () => {
  const root = new URL("../app/data/", import.meta.url);
  const bytes = await readFile(new URL("agent-attribution.json", root));
  const proof = JSON.parse(await readFile(new URL("agent-attribution-provenance.json", root)));
  const companion = JSON.parse(await readFile(new URL("agent-attribution-basis.json", root)));
  assert.deepEqual(companion, buildBasisCompanion(bytes, proof));
});
