import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { validatePrRelationships } from "../tools/pr-relationship-integrity.mjs";
import { readVerifiedSnapshot } from "../tools/build-contribution-provenance.mjs";

const url = "https://github.com/owner/project/pull/1", sha = "a".repeat(40);
const fixture = () => ({
  "commits.jsonl": [{ repository: "owner/project", sha, associations: [{ kind: "pull_request", pull_request: "owner/project#1", pull_request_url: url, ordinal: 0 }] }],
  "pull_requests.jsonl": [{ html_url: url, base: { repository: "owner/project" }, number: 1, node_id: "PR_1", reported_counts: { commits: 1 } }],
  "pull_request_commits.jsonl": [{ pull_request_url: url, pull_request_node_id: "PR_1", base_repository: "owner/project", pull_request_number: 1, ordinal: 0, commit_repository: "owner/project", commit_sha: sha }],
});

test("PR relationships reconcile including complete association multiplicity", () => {
  assert.deepEqual(validatePrRelationships(fixture()), { commits: 1, pullRequests: 1, memberships: 1, associations: 1 });
});

test("a malformed derivation marker cannot bypass the completed-receipt gate", async t => {
  const root = await mkdtemp(resolve(tmpdir(), "pr-derivative-test-"));
  t.after(() => rm(root, { recursive: true }));
  const files = {};
  for (const [name, rows] of Object.entries(fixture())) {
    const data = rows.map(row => JSON.stringify(row) + "\n").join("");
    await writeFile(resolve(root, name), data);
    files[name] = { sha256: createHash("sha256").update(data).digest("hex"), records: rows.length };
  }
  for (const derivation of [null, false, {}]) {
    await writeFile(resolve(root, "manifest.json"), JSON.stringify({ status: "complete", public_only: true,
      accounts: ["mh0pe", "awsmadi"], completed_at: "2026-10-11T14:04:43Z", files, derivation }));
    await assert.rejects(readVerifiedSnapshot(root));
  }
});

for (const [label, change] of [
  ["stale ordinal", f => f["commits.jsonl"][0].associations.push({ ...f["commits.jsonl"][0].associations[0], ordinal: 126 })],
  ["duplicate association", f => f["commits.jsonl"][0].associations.push({ ...f["commits.jsonl"][0].associations[0] })],
  ["missing association", f => { f["commits.jsonl"][0].associations = []; }],
  ["duplicate membership", f => f["pull_request_commits.jsonl"].push({ ...f["pull_request_commits.jsonl"][0] })],
  ["ordinal gap", f => { f["pull_request_commits.jsonl"][0].ordinal = 1; }],
  ["wrong repository", f => { f["pull_request_commits.jsonl"][0].commit_repository = "other/project"; }],
  ["wrong PR identity", f => { f["pull_request_commits.jsonl"][0].pull_request_number = 2; }],
  ["wrong node identity", f => { f["pull_request_commits.jsonl"][0].pull_request_node_id = "other"; }],
  ["non-PR disguised link", f => { f["commits.jsonl"][0].associations[0].kind = "repository_branch_graph"; }],
  ["missing relationship file", f => { delete f["pull_request_commits.jsonl"]; }],
]) test(`snapshot rejects ${label} even with valid hashes`, async t => {
  const root = await mkdtemp(resolve(tmpdir(), "pr-relationship-test-"));
  t.after(() => rm(root, { recursive: true }));
  const contents = fixture(); change(contents);
  const files = {};
  for (const [name, rows] of Object.entries(contents)) {
    const data = rows.map(row => JSON.stringify(row) + "\n").join("");
    await writeFile(resolve(root, name), data);
    files[name] = { sha256: createHash("sha256").update(data).digest("hex"), records: rows.length };
  }
  await writeFile(resolve(root, "manifest.json"), JSON.stringify({ status: "complete", public_only: true, accounts: ["mh0pe", "awsmadi"], completed_at: "2026-10-11T14:04:43Z", files }));
  await assert.rejects(readVerifiedSnapshot(root));
});
