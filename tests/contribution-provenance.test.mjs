import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { contributionId, buildContributionProvenance, readVerifiedSnapshot } from "../tools/build-contribution-provenance.mjs";

const sha = "a".repeat(40);
const href = "https://github.com/example/project/pull/42";
const date = "2026-09-03T00:00:00Z";
function fixture() {
  const manifest = { public_only: true, completed_at: date, run_id: "run" };
  const visualManifest = { publicOnly: true, graphIds: ["example"], sourceExportCompletedAt: date, sourceExportRunId: "run" };
  return {
    history: { manifest, binding: { sha256: "history-hash" }, contents: { "pull_requests.jsonl": [{ html_url: href, author: "mh0pe" }] } },
    fork: { manifest: { ...manifest, source_export_manifest_sha256: "history-hash" }, binding: { sha256: "fork-hash" }, contents: {} },
    models: { schemaVersion: 1, snapshot: { publicOnly: true, accounts: ["awsmadi", "mh0pe"], sourceExportGeneratedAt: date }, agents: [{ id: "claude" }], commits: [{ sha, agentId: "claude", accounts: ["awsmadi"] }] },
    graphManifest: visualManifest, graphs: [{ id: "example", publicOnly: true, beats: [{ id: "beat", href }] }],
    playerManifest: visualManifest, players: [{ id: "example", publicOnly: true, changes: [{ id: "change", href, commits: [{ sha }] }] }],
    selections: [{ id: "story", sourceHref: href }],
  };
}

test("joins selected PR, graph, player, and model by exact IDs", () => {
  const report = buildContributionProvenance(fixture());
  assert.equal(report.generations.modelsMatchHistory, true);
  assert.equal(report.generations.graphMatchesHistory, true);
  for (const field of ["publicSource", "graph", "player", "model"]) assert.equal(report.featured[0][field].status, "included");
  assert.deepEqual(report.featured[0].model.commits, [{ sha, modelId: "claude" }]);
});

test("stale generations remain explicit rather than implying a refresh", () => {
  const f = fixture(); f.models.snapshot.sourceExportGeneratedAt = "2026-08-01T00:00:00Z";
  f.graphManifest = { ...f.graphManifest, sourceExportRunId: "older" };
  const report = buildContributionProvenance(f);
  assert.equal(report.generations.modelsMatchHistory, false);
  assert.equal(report.generations.graphMatchesHistory, false);
  assert.equal(report.generations.playerMatchesHistory, true);
});

test("missing newly selected work is pending, explicit exclusion requires a reason", () => {
  const f = fixture(); f.selections = [{ id: "new", sourceHref: "https://github.com/example/project/pull/43", graph: { status: "excluded", reason: "Article uses a conceptual illustration instead." } }];
  const entry = buildContributionProvenance(f).featured[0];
  assert.equal(entry.graph.status, "excluded");
  for (const field of ["publicSource", "player", "model"]) assert.equal(entry[field].status, "pending");
  f.selections[0].graph.reason = " "; assert.throws(() => buildContributionProvenance(f));
});

test("refuses conflicting override, duplicate selection, wrong fork binding, and nonpublic input", () => {
  for (const mutate of [
    f => { f.selections[0].graph = { status: "excluded", reason: "not intended" }; },
    f => f.selections.push(f.selections[0]),
    f => { f.fork.manifest.source_export_manifest_sha256 = "wrong"; },
    f => { f.graphs[0].publicOnly = false; },
    f => { f.models.snapshot.accounts = ["other"]; },
  ]) { const f = fixture(); mutate(f); assert.throws(() => buildContributionProvenance(f)); }
});

test("assistant-directed PR eligibility is retained without accepting unrelated bots", () => {
  const f = fixture();
  f.history.contents["pull_requests.jsonl"] = [{ html_url: href, author: "copilot", search_attributed_accounts: ["awsmadi"], discoveries: [{ kind: "search_author_query", account: "awsmadi" }], search_author_matches_detail: false, classification: { authored_by_account: false, head_repository_owned_by_account: true, related_accounts: ["awsmadi"] }, head: { repository: "awsmadi/project", repository_deleted: false, repository_unavailable: false } }];
  assert.equal(buildContributionProvenance(f).featured[0].publicSource.status, "included");
  f.history.contents["pull_requests.jsonl"][0].search_attributed_accounts = ["someone-else"];
  assert.equal(buildContributionProvenance(f).featured[0].publicSource.status, "pending");
});

test("owned history and fork commits retain both account schemas and shared model IDs", () => {
  for (const [snapshot, key] of [["history", "matched_accounts"], ["fork", "attributed_accounts"]]) {
    const f = fixture(); const url = `https://github.com/awsmadi/project/commit/${sha}`;
    f[snapshot].contents["commits.jsonl"] = [{ html_url: url, [key]: ["awsmadi"] }];
    f.selections = [{ id: "direct", sourceHref: url }]; f.models.commits[0].agentId = "shared";
    const entry = buildContributionProvenance(f).featured[0];
    assert.equal(entry.publicSource.status, "included"); assert.equal(entry.model.commits[0].modelId, "shared");
  }
});

test("canonical IDs reject branch URLs, foreign hosts, and query parameters", () => {
  for (const url of ["https://github.com/example/project/tree/main", `${href}?x=1`, href.replace("github.com", "example.com"), `${href}#comment`]) assert.throws(() => contributionId(url));
});

test("snapshot loader verifies public status, both accounts, byte hashes and row counts", async () => {
  const dir = await mkdtemp(resolve(tmpdir(), "portfolio-provenance-test-"));
  try {
    const data = `${JSON.stringify({ html_url: href, author: "mh0pe", base: { repository: "example/project" }, number: 42, reported_counts: { commits: 0 } })}\n`;
    const manifest = { public_only: true, status: "complete", accounts: ["mh0pe", "awsmadi"], completed_at: date, files: { "pull_requests.jsonl": { sha256: createHash("sha256").update(data).digest("hex"), records: 1 } } };
    await writeFile(resolve(dir, "pull_requests.jsonl"), data);
    for (const name of ["commits.jsonl", "pull_request_commits.jsonl"]) {
      await writeFile(resolve(dir, name), "");
      manifest.files[name] = { sha256: createHash("sha256").update("").digest("hex"), records: 0 };
    }
    await writeFile(resolve(dir, "manifest.json"), JSON.stringify(manifest));
    assert.equal((await readVerifiedSnapshot(dir)).contents["pull_requests.jsonl"].length, 1);
    for (const mutate of [m => { m.public_only = false; }, m => { m.accounts = ["mh0pe"]; }, m => { m.files["pull_requests.jsonl"].records = 2; }, m => { m.files["pull_requests.jsonl"].sha256 = "bad"; }]) {
      const invalid = structuredClone(manifest); mutate(invalid);
      await writeFile(resolve(dir, "manifest.json"), JSON.stringify(invalid));
      await assert.rejects(readVerifiedSnapshot(dir));
    }
  } finally { await rm(dir, { recursive: true }); }
});
