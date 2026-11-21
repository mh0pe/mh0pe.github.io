import assert from "node:assert/strict";
import { test } from "node:test";
import { fullRefreshSpecs, reconcileFullRefresh } from "../tools/full-refresh-plan.mjs";
import { graphSpecs } from "../tools/build-project-graphs.mjs";

function fixture() {
  const specs = fullRefreshSpecs();
  const previousGraphs = specs.map(s => ({ id: s.id, beats: s.evidences.map(e => ({ id: e.id, href: e.href })) }));
  const previousPlayers = specs.map(s => ({ id: s.id, changes: s.evidences.map(e => ({ id: e.id, href: e.href, commits: [{ sha: "a".repeat(40) }] })) }));
  const prs = specs.flatMap(s => s.evidences.filter(e => e.kind === "pull-request").map(e => ({ html_url: e.href, number: e.number, author: "awsmadi", state: "merged", base: { repository: e.repository, ref: "feature-base", sha: "b".repeat(40) }, head: { ref: "implementation", sha: "a".repeat(40) } })));
  const unique = [...new Map(prs.map(pr => [pr.html_url, pr])).values()];
  return { specs, previousGraphs, previousPlayers,
    selections: [{ id: "workspace", sourceHref: specs.at(-1).evidences[0].href }],
    selectedGeneration: { publicOnly: true, refreshedContext: specs.at(-1).evidences.map(e => ({ href: e.href, headSha: "a".repeat(40), headRef: "implementation", baseSha: "b".repeat(40), baseRef: "feature-base", integrationStatus: "merged-into-feature-base", defaultBranchDeliveryEstablished: false })) },
    history: { binding: { sha256: "1".repeat(64) }, manifest: { status: "complete", public_only: true, collection_scope: "submitted_public_pull_requests_and_owned_public_nonfork_commits", accounts: ["mh0pe", "awsmadi"], run_id: "fresh-run", completed_at: "2026-10-11T12:00:00Z" }, contents: { "pull_requests.jsonl": unique, "pull_request_commits.jsonl": specs.at(-1).evidences.map(e => ({ pull_request_url: e.href, commit_sha: "a".repeat(40) })), "commits.jsonl": specs.flatMap(s => s.evidences.filter(e => e.kind === "commit").map(e => ({ html_url: e.href, matched_accounts: ["awsmadi"] }))) } },
    fork: { manifest: { status: "complete", public_only: true, accounts: ["mh0pe", "awsmadi"], source_export_manifest_sha256: "1".repeat(64) }, contents: { "commits.jsonl": [] } },
  };
}

test("full successor explicitly preserves nine groups and feature-base context", () => {
  const result = reconcileFullRefresh(fixture());
  assert.equal(result.groups, 9);
  assert.equal(result.featureContext.length, 3);
  assert.ok(result.featureContext.every(c => !c.defaultBranchDeliveryEstablished));
});

test("recent security work joins the full refresh without mutating legacy selections", () => {
  const before = structuredClone(graphSpecs);
  const first = fullRefreshSpecs();
  const security = first.find(spec => spec.id === "automated-security-helper");
  for (const number of [696, 707, 710, 712, 717, 757, 784, 786, 793, 795, 804]) {
    const records = security.evidences.filter(evidence => evidence.number === number);
    assert.equal(records.length, 1);
    assert.equal(records[0].href, `https://github.com/awslabs/automated-security-helper/pull/${number}`);
    assert.equal(records[0].sampling.maxCommits, 1);
    assert.equal(records[0].sampling.maxFiles, 2);
  }
  assert.equal(reconcileFullRefresh(fixture()).uniqueContributions, 73);
  security.evidences.pop();
  assert.deepEqual(graphSpecs, before);
  assert.equal(fullRefreshSpecs().find(spec => spec.id === security.id).evidences.length, security.evidences.length + 1);
});

for (const [name, mutate] of [
  ["missing old beat", f => f.specs[0].evidences.shift()],
  ["missing workspace group", f => f.specs.pop()],
  ["empty predecessors", f => { f.previousGraphs = []; f.previousPlayers = []; }],
  ["empty predecessor beats", f => { f.previousGraphs[0].beats = []; }],
  ["renamed existing beat", f => { f.specs[0].evidences[0].id = "renamed"; }],
  ["uncovered article", f => { f.selections[0].sourceHref = "https://github.com/a/b/pull/1"; }],
  ["duplicate article ID", f => { f.selections.push({ ...f.selections[0], sourceHref: f.specs[0].evidences[0].href }); }],
  ["duplicate article URL", f => { f.selections.push({ ...f.selections[0], id: "duplicate-source" }); }],
  ["partial history", f => { f.history.manifest.status = "smoke_complete"; }],
  ["wrong collection scope", f => { f.history.manifest.collection_scope = "selected"; }],
  ["nonpublic history", f => { f.history.manifest.public_only = false; }],
  ["wrong account", f => { f.history.manifest.accounts = ["someone"]; }],
  ["mismatched fork generation", f => { f.fork.manifest.source_export_manifest_sha256 = "2".repeat(64); }],
  ["partial fork", f => { f.fork.manifest.status = "partial"; }],
  ["unattributed direct commit", f => { f.history.contents["commits.jsonl"][0].matched_accounts = ["someone"]; }],
  ["unattributed PR", f => { f.history.contents["pull_requests.jsonl"][0].author = "someone"; }],
  ["duplicate PR", f => { f.history.contents["pull_requests.jsonl"].push(f.history.contents["pull_requests.jsonl"][0]); }],
  ["changed feature-base claim", f => { f.selectedGeneration.refreshedContext[0].defaultBranchDeliveryEstablished = true; }],
  ["duplicated feature contexts", f => { f.selectedGeneration.refreshedContext = Array(3).fill(f.selectedGeneration.refreshedContext[0]); }],
  ["changed feature-base branch", f => { f.selectedGeneration.refreshedContext[0].baseRef = "main"; }],
  ["changed selected implementation", f => { f.selectedGeneration.refreshedContext[0].headSha = "f".repeat(40); }],
  ["dropped selected membership", f => { f.history.contents["pull_request_commits.jsonl"].pop(); }],
  ["duplicate selected membership", f => { f.history.contents["pull_request_commits.jsonl"].push(f.history.contents["pull_request_commits.jsonl"][0]); }],
]) test(`full successor rejects ${name}`, () => { const f = fixture(); mutate(f); assert.throws(() => reconcileFullRefresh(f)); });
