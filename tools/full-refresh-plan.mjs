import assert from "node:assert/strict";
import { graphSpecs } from "./build-project-graphs.mjs";
import { assertGraphSelectionPreserved, assertPortfolioPullRequest, portfolioAccounts } from "./public-contribution-guards.mjs";
import { contributionId } from "./build-contribution-provenance.mjs";

const repository = "awslabs/automated-security-helper";

export function fullRefreshSpecs() {
  const specs = structuredClone(graphSpecs);
  const security = specs.find(spec => spec.id === "automated-security-helper");
  assert.ok(security);
  security.evidences.push(...[
    [696, "ash-content-freshness", "Make scanner-data freshness explicit"],
    [707, "ash-symbol-exceptions", "Keep exceptions attached to the intended code"],
    [710, "ash-repeatable-inputs", "Repeat commands with validated inputs"],
    [712, "ash-shared-config", "Share policy with explicit local choices"],
    [717, "ash-output-contract", "Review changes to user-facing output"],
    [757, "ash-scanner-isolation", "Bound each scanner's operating-system access"],
    [784, "ash-operator-policy", "Keep operator policy separate from project input"],
    [786, "ash-linux-isolation", "Refine Linux scanner isolation"],
    [793, "ash-macos-isolation", "Refine macOS scanner isolation"],
    [795, "ash-confined-conversion", "Keep file conversion within the inspected tree"],
    [804, "ash-task-documentation", "Connect user tasks to checked documentation"],
  ].map(([number, id, label]) => ({
    id, label, repository, number,
    href: `https://github.com/${repository}/pull/${number}`,
    kind: "pull-request", availability: "upstream",
    sampling: { maxCommits: 1, maxFiles: 2 },
  })));
  return [...specs, {
    id: "ash-workspace", chapterId: "security", title: "Workspace-aware security",
    impact: "Plan, execute, and report without losing project context.",
    attributionRepositories: [repository],
    evidences: [
      [460, "Validate the workspace plan"],
      [462, "Execute with project scope"],
      [478, "Keep project context in reports"],
    ].map(([number, label]) => ({
      id: `ash-workspace-${number}`, label, repository, number,
      href: `https://github.com/${repository}/pull/${number}`,
      kind: "pull-request", availability: "upstream",
    })),
  }];
}

// This is an explicit migration check, not a way to relabel mixed generations.
// Every old contribution and the feature-base context must survive the fresh inputs.
export function reconcileFullRefresh({ specs, previousGraphs, previousPlayers, selectedGeneration, selections, history, fork }) {
  assert.equal(history.manifest.status, "complete");
  assert.equal(history.manifest.public_only, true);
  assert.equal(history.manifest.collection_scope, "submitted_public_pull_requests_and_owned_public_nonfork_commits");
  assert.deepEqual([...history.manifest.accounts].sort(), ["awsmadi", "mh0pe"]);
  assert.ok(history.manifest.run_id && Number.isFinite(Date.parse(history.manifest.completed_at)));
  assert.equal(fork.manifest.status, "complete");
  assert.equal(fork.manifest.public_only, true);
  assert.deepEqual([...fork.manifest.accounts].sort(), ["awsmadi", "mh0pe"]);
  assert.match(history.binding.sha256, /^[a-f0-9]{64}$/);
  assert.equal(fork.manifest.source_export_manifest_sha256, history.binding.sha256, "Fork history generation mismatch.");
  assert.equal(selectedGeneration.publicOnly, true);
  assert.ok(Array.isArray(previousGraphs) && previousGraphs.length > 0, "Predecessor graphs are missing.");
  assert.ok(Array.isArray(previousPlayers) && previousPlayers.length > 0, "Predecessor players are missing.");
  for (const graph of previousGraphs) assert.ok(Array.isArray(graph.beats) && graph.beats.length > 0, "Predecessor graph is empty.");
  for (const player of previousPlayers) assert.ok(Array.isArray(player.changes) && player.changes.length > 0, "Predecessor player is empty.");
  assertGraphSelectionPreserved({ graphIds: previousGraphs.map(g => g.id) }, specs);
  assert.deepEqual(previousGraphs.map(g => g.id), previousPlayers.map(p => p.id));
  const planned = new Map();
  const plannedTuples = new Set();
  for (const spec of specs) {
    assert.ok(spec.evidences.length > 0);
    assert.equal(new Set(spec.evidences.map(e => e.id)).size, spec.evidences.length, "Duplicate evidence ID.");
    planned.set(spec.id, new Set(spec.evidences.map(e => contributionId(e.href))));
    for (const evidence of spec.evidences) plannedTuples.add(JSON.stringify([spec.id, evidence.id, evidence.href]));
  }
  for (const group of previousGraphs) for (const beat of group.beats) {
    assert.ok(planned.get(group.id)?.has(beat.href), `Refresh would drop ${group.id}: ${beat.href}`);
    assert.ok(plannedTuples.has(JSON.stringify([group.id, beat.id, beat.href])), "Refresh changes an existing graph contribution identity.");
  }
  for (const group of previousPlayers) for (const change of group.changes) {
    assert.ok(planned.get(group.id)?.has(change.href), `Refresh would drop player source ${group.id}: ${change.href}`);
    assert.ok(plannedTuples.has(JSON.stringify([group.id, change.id, change.href])), "Refresh changes an existing player contribution identity.");
  }
  const all = new Set([...planned.values()].flatMap(set => [...set]));
  assert.ok(Array.isArray(selections) && selections.length > 0);
  for (const selection of selections) assert.match(selection.id ?? "", /^[a-z][a-z0-9-]*$/);
  assert.equal(new Set(selections.map(s => s.id)).size, selections.length, "Duplicate article selection ID.");
  assert.equal(new Set(selections.map(s => s.sourceHref)).size, selections.length, "Duplicate article source URL.");
  for (const selection of selections) assert.ok(all.has(contributionId(selection.sourceHref)), `Uncovered article: ${selection.sourceHref}`);
  const prs = history.contents["pull_requests.jsonl"];
  assert.ok(Array.isArray(prs));
  const byHref = new Map(prs.map(pr => [pr.html_url, pr]));
  assert.equal(byHref.size, prs.length, "Duplicate public pull request.");
  const eligibleCommits = new Set();
  for (const snapshot of [history, fork]) {
    assert.ok(Array.isArray(snapshot.contents["commits.jsonl"]));
    for (const commit of snapshot.contents["commits.jsonl"]) {
      const accounts = commit.attributed_accounts ?? commit.matched_accounts ?? commit.accounts ?? [commit.author_login, commit.committer_login];
      if (accounts.some(account => portfolioAccounts.has(account))) eligibleCommits.add(contributionId(commit.html_url));
    }
  }
  for (const spec of specs) for (const evidence of spec.evidences) if (evidence.kind === "commit") {
    assert.ok(eligibleCommits.has(evidence.href), `Direct commit is not in fresh eligible public history: ${evidence.href}`);
  }
  for (const spec of specs) for (const evidence of spec.evidences) if (evidence.kind === "pull-request") {
    const record = byHref.get(evidence.href);
    assertPortfolioPullRequest(evidence, record, record);
    assert.equal(record.base.repository, evidence.repository);
    assert.equal(record.number, evidence.number);
  }
  const workspace = specs.find(spec => spec.id === "ash-workspace");
  assert.ok(workspace);
  const workspaceHrefs = [460, 462, 478].map(number => `https://github.com/${repository}/pull/${number}`);
  assert.deepEqual(workspace.evidences.map(e => e.href).sort(), workspaceHrefs.slice().sort());
  assert.deepEqual(selectedGeneration.refreshedContext.map(c => c.href).sort(), workspaceHrefs.slice().sort(), "Selected feature contexts must cover all three unique PRs.");
  const featureContext = selectedGeneration.refreshedContext.map(context => {
    const fresh = byHref.get(context.href);
    assert.ok(fresh, `Missing preserved selected source: ${context.href}`);
    assert.equal(context.integrationStatus, "merged-into-feature-base");
    assert.equal(context.defaultBranchDeliveryEstablished, false);
    assert.equal(fresh.state, "merged", "Selected merge state changed; review required.");
    assert.equal(fresh.head.sha, context.headSha, "Selected implementation changed; review required.");
    assert.equal(fresh.head.ref, context.headRef, "Selected head branch changed; review required.");
    assert.equal(fresh.base.ref, context.baseRef, "Selected feature-base context changed; review required.");
    assert.equal(fresh.base.sha, context.baseSha, "Selected feature-base SHA changed; review required.");
    return { ...context, source: "fresh-public-history" };
  });
  const memberships = history.contents["pull_request_commits.jsonl"];
  assert.ok(Array.isArray(memberships));
  assert.equal(new Set(memberships.map(row => JSON.stringify([row.pull_request_url, row.commit_sha]))).size, memberships.length, "Duplicate PR commit membership.");
  for (const player of previousPlayers.filter(p => p.id === "ash-workspace")) for (const change of player.changes) {
    const freshShas = new Set(memberships.filter(row => row.pull_request_url === change.href).map(row => row.commit_sha));
    assert.deepEqual([...freshShas].sort(), change.commits.map(commit => commit.sha).sort(), `Selected commit memberships changed: ${change.href}`);
  }
  return { groups: specs.length, uniqueContributions: all.size, selectedArticlePRs: selections.length, featureContext };
}
