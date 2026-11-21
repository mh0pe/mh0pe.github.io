import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { expandAgentAttributionData } from "../app/data/agent-attribution-contract.mjs";

export const portfolioAccounts = new Set(["mh0pe", "awsmadi"]);
const expectedAccounts = [...portfolioAccounts].sort();

export function assertFullHistoryRefreshTarget(manifest) {
  assert.ok(manifest === undefined || (manifest !== null && typeof manifest === "object" &&
    (!Object.hasOwn(manifest, "sourceKind") || manifest.sourceKind === "full-public-history")),
    "This target includes selected public receipts. Reconcile that source generation explicitly before a full-history refresh; refusing to discard selected contributions.");
}

export function assertGraphSelectionPreserved(manifest, specs) {
  assert.ok(Array.isArray(specs) && specs.length > 0, "Graph selections are missing.");
  const ids = specs.map((spec) => spec.id);
  assert.equal(new Set(ids).size, ids.length, "Graph selections contain duplicate IDs.");
  if (manifest === undefined) return;
  assert.ok(Array.isArray(manifest.graphIds), "Target graph selections are missing.");
  assert.equal(new Set(manifest.graphIds).size, manifest.graphIds.length, "Target graph selections contain duplicate IDs.");
  const omitted = manifest.graphIds.filter((id) => !ids.includes(id));
  assert.equal(omitted.length, 0, `This refresh would drop project groups: ${omitted.join(", ")}. Use an explicitly reconciled successor generation.`);
}

export function assertPublicSource({ attribution: input, historyManifest, manifest, sourceExport }) {
  const attribution = expandAgentAttributionData(input);
  assert.equal(historyManifest?.public_only, true, "Public history export must be public-only.");
  assert.equal(historyManifest.status, "complete", "Public history export is incomplete.");
  assert.ok(Number.isFinite(Date.parse(historyManifest.completed_at)), "Public history export completion date is invalid.");
  assert.ok(Array.isArray(historyManifest.accounts), "Public history accounts are missing.");
  assert.deepEqual([...historyManifest.accounts].sort(), expectedAccounts, "Public history accounts do not match the portfolio.");
  assert.ok(typeof historyManifest.run_id === "string" && historyManifest.run_id.length > 0, "Public history run ID is missing.");
  assert.equal(attribution?.snapshot?.publicOnly, true, "Agent attribution input must be public-only.");
  assert.ok(Array.isArray(attribution.snapshot.accounts), "Attribution accounts are missing.");
  assert.deepEqual([...attribution.snapshot.accounts].sort(), expectedAccounts, "Attribution accounts do not match the portfolio.");
  assert.equal(attribution.snapshot.sourceExportGeneratedAt, historyManifest.completed_at, "Agent attribution does not match the selected public history export.");
  assert.ok(Array.isArray(attribution.commits) && Array.isArray(attribution.agents), "Attribution catalogs are missing.");
  if (manifest) {
    assert.equal(manifest.publicOnly, true, "Graph manifest must be public-only.");
    assert.equal(manifest.sourceExport, sourceExport, "Graph source export name does not match.");
    assert.equal(manifest.sourceExportCompletedAt, historyManifest.completed_at, "Graph source export date does not match.");
    assert.equal(manifest.sourceExportRunId, historyManifest.run_id, "Graph source export run does not match.");
  }
  return attribution;
}

// Use the export's recorded hash and row count, as the public-record refresh does.
export async function readPublicPullRequestExport(directory) {
  const manifest = JSON.parse(await readFile(resolve(directory, "manifest.json"), "utf8"));
  const bytes = await readFile(resolve(directory, "pull_requests.jsonl"));
  const entry = manifest.files?.["pull_requests.jsonl"];
  assert.ok(entry, "Public pull-request export integrity record is missing.");
  assert.equal(createHash("sha256").update(bytes).digest("hex"), entry.sha256, "Public pull-request export integrity check failed.");
  const rows = bytes.toString("utf8").split(/\r?\n/).filter(Boolean);
  assert.equal(rows.length, entry.records, "Public pull-request export row count does not match.");
  return { historyManifest: manifest, pullRequests: rows.map(JSON.parse), sourceExport: basename(resolve(directory)) };
}

export function attributionBySha(attribution) {
  const catalog = new Set(attribution.agents.map((agent) => agent.id));
  const result = new Map();
  for (const commit of attribution.commits) {
    assert.match(commit.sha ?? "", /^[a-f0-9]{40}$/i, "Attribution commit SHA is invalid.");
    assert.ok(commit.agentId === "shared" || catalog.has(commit.agentId), "Attribution commit references an unknown identity.");
    const accounts = commit.accounts ?? [commit.account];
    assert.ok(accounts.length > 0 && accounts.every((account) => portfolioAccounts.has(account)), "Attribution commit has an unexpected account.");
    assert.ok(!result.has(commit.sha) || result.get(commit.sha) === commit.agentId, "Conflicting attribution for the same commit.");
    result.set(commit.sha, commit.agentId);
  }
  return result;
}

export function assertAttributionJoin(hydrated, agentBySha) {
  const shas = new Set(hydrated.flatMap(({ evidence }) => evidence.commits.map((commit) => commit.sha)));
  const matched = [...shas].filter((sha) => agentBySha.has(sha)).length;
  assert.ok(agentBySha.size === 0 || matched > 0, "Nonempty attribution has no matching contribution commits; refusing to erase model associations.");
  return { attributedCommits: agentBySha.size, uniqueCommits: shas.size, matchedCommits: matched, unmarkedCommits: shas.size - matched };
}

export function isAccountDirectedCopilotPullRequest(pullRequest, publicExportRecord) {
  const liveAuthor = (pullRequest?.user?.login ?? pullRequest?.author ?? "").toLowerCase();
  const exportedAuthor = (publicExportRecord?.author ?? "").toLowerCase();
  const attributedAccounts = publicExportRecord?.search_attributed_accounts ?? [];
  if (liveAuthor !== "copilot" || exportedAuthor !== "copilot" || attributedAccounts.length !== 1 || !portfolioAccounts.has(attributedAccounts[0])) return false;
  const attributedAccount = attributedAccounts[0];
  const searchDiscoveries = (publicExportRecord.discoveries ?? []).filter((discovery) => discovery.kind === "search_author_query");
  const relatedAccounts = publicExportRecord.classification?.related_accounts ?? [];
  const exportedHeadRepository = publicExportRecord.head?.repository;
  const liveHeadRepository = pullRequest.head?.repo?.full_name ?? pullRequest.head?.repository;
  return searchDiscoveries.length === 1 && searchDiscoveries[0].account === attributedAccount &&
    publicExportRecord.search_author_matches_detail === false &&
    publicExportRecord.classification?.authored_by_account === false &&
    publicExportRecord.classification?.head_repository_owned_by_account === true &&
    relatedAccounts.length === 1 && relatedAccounts[0] === attributedAccount &&
    exportedHeadRepository === liveHeadRepository && exportedHeadRepository?.split("/")[0] === attributedAccount &&
    publicExportRecord.head?.repository_deleted === false && publicExportRecord.head?.repository_unavailable === false;
}

export function assertPortfolioPullRequest(evidence, pullRequest, publicExportRecord) {
  if (!pullRequest || !publicExportRecord) throw new Error(`Missing public export record for ${evidence.href}.`);
  const liveAuthor = pullRequest.user?.login ?? pullRequest.author;
  if (!portfolioAccounts.has(liveAuthor) && !isAccountDirectedCopilotPullRequest(pullRequest, publicExportRecord)) {
    throw new Error(`${evidence.href} is not attributed to mh0pe or awsmadi in the public export.`);
  }
}

export function assertPortfolioCommit(evidence, detail) {
  if (![detail.author?.login, detail.committer?.login].some((account) => portfolioAccounts.has(account))) {
    throw new Error(`${evidence.href} is not attributed to mh0pe or awsmadi by GitHub.`);
  }
}

export async function assertPublicRepositories(repositories, fetchJson) {
  for (const repository of [...new Set(repositories)].sort()) {
    assert.match(repository ?? "", /^[^/\s]+\/[^/\s]+$/, "Invalid public repository name.");
    const metadata = await fetchJson(`repos/${repository}`, { cache: false });
    if (metadata?.private !== false || metadata?.visibility !== "public" || metadata?.full_name !== repository) {
      throw new Error(`${repository} is not verified public; refusing to generate portfolio data.`);
    }
  }
}

export async function fetchPublicCommitDetail(repository, sha, fetchJson) {
  const pages = await fetchJson(`repos/${repository}/commits/${sha}?per_page=100`, { paged: true, flattenPages: false, cache: false });
  assert.ok(Array.isArray(pages) && pages.length > 0, `GitHub returned no commit detail for ${repository}@${sha}.`);
  for (const page of pages) {
    assert.equal(page?.sha, sha, "Commit detail page does not match the requested SHA.");
    assert.ok(Array.isArray(page.files), "Commit detail page is missing its files.");
  }
  const files = pages.flatMap((page) => page.files);
  assert.equal(new Set(files.map((file) => file.filename)).size, files.length, "Commit detail contains duplicate file pages.");
  return { ...pages[0], files };
}

// Call only after live public-repository and portfolio-eligibility checks.
export async function fetchPublicPullRequestCommits(repository, number, detail, fetchJson) {
  const initial = await fetchJson(`repos/${repository}/pulls/${number}/commits?per_page=100`, { paged: true, cache: false });
  const expected = detail.commits;
  if (!Number.isSafeInteger(expected) || expected <= 250 || initial?.length === expected) return initial;
  assert.ok(Array.isArray(initial) && initial.length === 250, "Large PR did not return the complete capped commit response.");
  const validSha = /^[a-f0-9]{40}$/;
  const initialBySha = new Map();
  for (const commit of initial) {
    assert.match(commit?.sha ?? "", validSha, "Invalid initial PR commit SHA.");
    assert.ok(!initialBySha.has(commit.sha), "Duplicate initial PR commit.");
    initialBySha.set(commit.sha, commit);
  }
  for (const side of ["base", "head"]) assert.match(detail[side]?.sha ?? "", validSha, "Large PR comparison requires immutable revisions.");
  const pages = await fetchJson(`repos/${repository}/compare/${detail.base.sha}...${detail.head.sha}?per_page=100`, { paged: true, flattenPages: false, cache: false });
  assert.ok(Array.isArray(pages) && pages.length > 0, "Missing PR comparison pages.");
  const commits = [], seen = new Set();
  for (const page of pages) {
    assert.equal(page?.total_commits, expected, "PR comparison total differs from the pull request.");
    assert.ok(Array.isArray(page.commits), "Missing PR comparison commits.");
    for (const input of page.commits) {
      assert.match(input?.sha ?? "", validSha, "Invalid comparison commit SHA.");
      assert.ok(!seen.has(input.sha), "Duplicate comparison commit.");
      seen.add(input.sha);
      const commit = structuredClone(input), original = initialBySha.get(commit.sha);
      for (const role of ["author", "committer"]) {
        const prior = original?.[role]?.login, current = commit[role]?.login;
        if (prior && current) assert.equal(current.toLowerCase(), prior.toLowerCase(), `Conflicting comparison ${role} identity.`);
        if (prior && !current) commit[role] = structuredClone(original[role]);
      }
      commit.commit ??= {};
      assert.ok(typeof commit.commit === "object" && !Array.isArray(commit.commit), "Malformed comparison commit metadata.");
      if (commit.commit.message == null && typeof original?.commit?.message === "string") commit.commit.message = original.commit.message;
      assert.equal(typeof commit.commit.message, "string", "Missing comparison commit message.");
      if (typeof original?.commit?.message === "string") assert.equal(commit.commit.message, original.commit.message, "Conflicting comparison commit message.");
      for (const role of ["author", "committer"]) {
        const prior = original?.commit?.[role];
        if (prior && commit.commit[role] == null) commit.commit[role] = structuredClone(prior);
        const current = commit.commit[role];
        if (current == null) continue;
        assert.ok(typeof current === "object" && !Array.isArray(current), "Malformed comparison commit actor.");
        if (current.date == null && prior?.date) current.date = prior.date;
        assert.ok(Number.isFinite(Date.parse(current.date)), "Missing comparison commit date.");
        if (prior?.date) assert.equal(Date.parse(current.date), Date.parse(prior.date), "Conflicting comparison commit date.");
      }
      assert.ok(commit.commit.author?.date || commit.commit.committer?.date, "Missing comparison commit chronology.");
      commits.push(commit);
    }
  }
  assert.equal(commits.length, expected, "PR comparison content is incomplete.");
  assert.ok([...initialBySha.keys()].every(sha => seen.has(sha)), "PR comparison omits an initial commit.");
  return commits;
}

export function assertPullRequestContentComplete(detail, commits, files) {
  assert.ok(Array.isArray(commits) && Array.isArray(files), "Pull-request content is missing.");
  if (Number.isSafeInteger(detail.commits)) assert.equal(commits.length, detail.commits, "Pull-request commit content is incomplete.");
  if (Number.isSafeInteger(detail.changed_files)) assert.equal(files.length, detail.changed_files, "Pull-request file content is incomplete.");
  assert.equal(new Set(commits.map((commit) => commit.sha)).size, commits.length, "Pull-request commits contain duplicate pages.");
  assert.equal(new Set(files.map((file) => file.filename)).size, files.length, "Pull-request files contain duplicate pages.");
}
