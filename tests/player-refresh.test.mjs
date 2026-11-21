import assert from "node:assert/strict";
import { mkdtemp, readFile, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import test from "node:test";
import { expandAgentAttributionData } from "../app/data/agent-attribution-contract.mjs";
import { refreshProjectPlayerRecords } from "../tools/refresh-project-player-records.mjs";
import { writeProjectPlayerRecords } from "../tools/build-project-player-records.mjs";
import { readPublicPullRequestExport } from "../tools/public-contribution-guards.mjs";
import { createHash } from "node:crypto";
import { hydrateEvidence, loadProjectGraphInputs, writeProjectGraphGeneration } from "../tools/build-project-graphs.mjs";

const shaA = "a".repeat(40), shaB = "b".repeat(40), shaC = "c".repeat(40);
const repository = "mh0pe/example";
const href = `https://github.com/${repository}/pull/1`;
const completedAt = "2026-09-03T15:29:33.992364Z";

function fixture() {
  const beat = {
    id: "change", label: "A public improvement", href, kind: "pull-request", repository,
    availability: "upstream", integrationStatus: "merged", date: completedAt,
    commitCount: 3, changedFileCount: 1, displayedCommitCount: 0, displayedFileCount: 0, files: [],
    exactCommitFileCoverage: { sampledCommitCount: 0, resolvedCommitCount: 0, unavailableCommitCount: 0, displayableRelationCount: 0, displayedRelationCount: 0 },
  };
  return {
    manifest: { publicOnly: true, graphIds: ["example"], sourceExport: "public-export", sourceExportCompletedAt: completedAt, sourceExportRunId: "run-1" },
    historyManifest: { public_only: true, status: "complete", accounts: ["mh0pe", "awsmadi"], completed_at: completedAt, run_id: "run-1" },
    sourceExport: "public-export",
    attribution: {
      schemaVersion: 3, snapshot: { publicOnly: true, accounts: ["mh0pe", "awsmadi"], sourceExportGeneratedAt: completedAt },
      agents: [{ id: "model-a", kind: "model" }, { id: "model-b", kind: "model" }], repositories: [repository], pullRequests: [[0, 1, 2]],
      commits: [[shaA, 1750000000, 0, 0, 0, 0, null, 1, 1, 1, 0, 0, 0], [shaB, 1, 0, 0, 0, [0, 1], null, 1, 1, 1, 0, 0, 0]],
    },
    graphs: [{
      schemaVersion: 2, publicOnly: true, id: "example", chapterId: "work", title: "Example", impact: "A public improvement", caption: "Contribution history",
      agents: [], beats: [beat], edges: [],
      nodes: [{ id: "repository", type: "repository", label: "Example", href: `https://github.com/${repository}`, repository, evidenceIds: ["change"], x: 0, y: 0, z: 0, weight: 1 }],
      sampling: { representative: true, maxCommitsPerEvidence: 0, maxFilesPerEvidence: 0, exactCommitDetails: { requested: 0, resolved: 0, unavailable: 0 } },
    }],
    pullRequests: [{ html_url: href, author: "mh0pe", head: { repository } }],
  };
}

function fakeApi(overrides = {}) {
  const calls = [];
  const commits = [shaA, shaB, shaC].map((sha) => ({ sha, author: { login: "mh0pe" }, commit: { message: "feat: Improve example", author: { date: completedAt } } }));
  const files = [{ filename: "example.js", status: "modified", additions: 2, deletions: 1, changes: 3 }];
  const detail = { html_url: href, commits: 3, changed_files: 1, user: { login: "mh0pe" }, base: { repo: { full_name: repository } }, head: { repo: { full_name: repository }, sha: shaC } };
  const values = {
    [`repos/${repository}`]: { full_name: repository, private: false, visibility: "public" },
    [`repos/${repository}/pulls/1`]: detail,
    [`repos/${repository}/pulls/1/commits?per_page=100`]: commits,
    [`repos/${repository}/pulls/1/files?per_page=100`]: files,
    [`repos/${repository}/commits/${shaA}?per_page=100`]: [{ ...commits[0], files }],
    ...overrides,
  };
  return {
    calls,
    fetchJson: async (endpoint, options) => {
      calls.push({ endpoint, options });
      assert.ok(Object.hasOwn(values, endpoint), `Unexpected API access: ${endpoint}`);
      return structuredClone(values[endpoint]);
    },
  };
}

async function capturedRefresh(input = fixture(), api = fakeApi()) {
  let written;
  const result = await refreshProjectPlayerRecords({ ...input, fetchJson: api.fetchJson, writeRecords: async (value) => { written = value; return { accepted: true }; } });
  return { result, written, calls: api.calls };
}

for (const format of ["compact", "expanded"]) {
  test(`${format} attribution retains single and shared model IDs with legitimate missing markers`, async () => {
    const input = fixture();
    if (format === "expanded") input.attribution = expandAgentAttributionData(input.attribution);
    const { written, result, calls } = await capturedRefresh(input);
    assert.equal(written.agentBySha.get(shaA), "model-a");
    assert.equal(written.agentBySha.get(shaB), "shared");
    assert.equal(written.agentBySha.has(shaC), false);
    assert.deepEqual(result.attributionJoin, { attributedCommits: 2, uniqueCommits: 3, matchedCommits: 2, unmarkedCommits: 1 });
    assert.ok(calls.every(({ options }) => options.cache === false));
    const metadataIndex = calls.findIndex(({ endpoint }) => endpoint === `repos/${repository}`);
    const detailIndex = calls.findIndex(({ endpoint }) => endpoint.endsWith("/pulls/1"));
    const contentsIndex = calls.findIndex(({ endpoint }) => endpoint.includes("?per_page"));
    assert.ok(metadataIndex < detailIndex && detailIndex < contentsIndex);
  });
}

const rejectedInputs = [
  ["private source", (input) => { input.historyManifest.public_only = false; }],
  ["missing source", (input) => { delete input.historyManifest; }],
  ["incomplete source", (input) => { input.historyManifest.status = "running"; }],
  ["source account mismatch", (input) => { input.historyManifest.accounts = ["someone-else"]; }],
  ["missing source accounts", (input) => { delete input.historyManifest.accounts; }],
  ["private graph", (input) => { input.manifest.publicOnly = false; }],
  ["private attribution", (input) => { input.attribution.snapshot.publicOnly = false; }],
  ["attribution account mismatch", (input) => { input.attribution.snapshot.accounts = ["other", "awsmadi"]; }],
  ["attribution source mismatch", (input) => { input.attribution.snapshot.sourceExportGeneratedAt = "2020-01-01"; }],
  ["graph source name mismatch", (input) => { input.sourceExport = "wrong-export"; }],
  ["graph source run mismatch", (input) => { input.historyManifest.run_id = "wrong-run"; }],
  ["missing source run", (input) => { delete input.historyManifest.run_id; }],
  ["graph source date mismatch", (input) => { input.manifest.sourceExportCompletedAt = "2020-01-01"; }],
  ["missing PR export", (input) => { input.pullRequests = []; }],
  ["mismatched PR URL", (input) => { input.graphs[0].beats[0].repository = "mh0pe/other"; }],
  ["unknown attribution model", (input) => { input.attribution = expandAgentAttributionData(input.attribution); input.attribution.commits[0].agentId = "unknown"; }],
];
for (const [label, change] of rejectedInputs) {
  test(`rejects ${label} before hydration or output writes`, async () => {
    const input = fixture(); change(input);
    let writes = 0, calls = 0;
    await assert.rejects(refreshProjectPlayerRecords({ ...input, fetchJson: async () => { calls += 1; throw new Error("Unexpected hydration"); }, writeRecords: async () => { writes += 1; } }));
    assert.equal(writes, 0); assert.equal(calls, 0);
  });
}

for (const [label, metadata] of [
  ["private repository", { full_name: repository, private: true, visibility: "private" }],
  ["missing repository", undefined],
  ["missing visibility", { full_name: repository, private: false }],
  ["mismatched repository", { full_name: "other/repository", private: false, visibility: "public" }],
]) {
  test(`rejects ${label} before contribution content hydration and output writes`, async () => {
    const api = fakeApi({ [`repos/${repository}`]: metadata }); let writes = 0;
    await assert.rejects(refreshProjectPlayerRecords({ ...fixture(), fetchJson: api.fetchJson, writeRecords: async () => { writes += 1; } }), /not verified public/);
    assert.equal(writes, 0); assert.equal(api.calls.length, 1);
  });
}

test("rejects a live private head before fetching commit or file content", async () => {
  const api = fakeApi({
    [`repos/${repository}/pulls/1`]: { html_url: href, user: { login: "mh0pe" }, base: { repo: { full_name: repository } }, head: { repo: { full_name: "mh0pe/new-head" }, sha: shaC } },
    "repos/mh0pe/new-head": { full_name: "mh0pe/new-head", private: true, visibility: "private" },
  });
  let writes = 0;
  await assert.rejects(refreshProjectPlayerRecords({ ...fixture(), fetchJson: api.fetchJson, writeRecords: async () => { writes += 1; } }), /not verified public/);
  assert.equal(writes, 0); assert.ok(api.calls.every(({ endpoint }) => !endpoint.includes("?per_page")));
});

for (const [label, change] of [
  ["different PR URL", (detail) => { detail.html_url = href.replace("/1", "/2"); }],
  ["different base repository", (detail) => { detail.base.repo.full_name = "mh0pe/other"; }],
  ["missing head repository", (detail) => { detail.head.repo = null; }],
  ["unrelated author", (detail) => { detail.user.login = "someone-else"; }],
]) {
  test(`rejects live PR with ${label} before content hydration or output`, async () => {
    const detail = { html_url: href, user: { login: "mh0pe" }, base: { repo: { full_name: repository } }, head: { repo: { full_name: repository }, sha: shaC } };
    change(detail);
    const api = fakeApi({ [`repos/${repository}/pulls/1`]: detail });
    let writes = 0;
    await assert.rejects(refreshProjectPlayerRecords({ ...fixture(), fetchJson: api.fetchJson, writeRecords: async () => { writes += 1; } }));
    assert.equal(writes, 0);
    assert.ok(api.calls.every(({ endpoint }) => !endpoint.includes("?per_page")));
  });
}

test("rejects wholly unmatched nonempty attribution but accepts an empty attribution catalog", async () => {
  const input = fixture(); input.attribution.commits[0][0] = "d".repeat(40); input.attribution.commits[1][0] = "e".repeat(40);
  let writes = 0;
  await assert.rejects(refreshProjectPlayerRecords({ ...input, fetchJson: fakeApi().fetchJson, writeRecords: async () => { writes += 1; } }), /no matching contribution commits/);
  assert.equal(writes, 0);
  input.attribution.commits = [];
  const { result } = await capturedRefresh(input);
  assert.equal(result.attributionJoin.matchedCommits, 0);
});

test("retains the existing account-directed Copilot export contract", async () => {
  const input = fixture();
  Object.assign(input.pullRequests[0], {
    author: "Copilot", search_attributed_accounts: ["mh0pe"], search_author_matches_detail: false,
    discoveries: [{ account: "mh0pe", kind: "search_author_query" }],
    classification: { authored_by_account: false, head_repository_owned_by_account: true, related_accounts: ["mh0pe"] },
    head: { repository, repository_deleted: false, repository_unavailable: false },
  });
  const detail = { html_url: href, user: { login: "Copilot" }, base: { repo: { full_name: repository } }, head: { repo: { full_name: repository }, sha: shaC } };
  await capturedRefresh(input, fakeApi({ [`repos/${repository}/pulls/1`]: detail }));
  input.pullRequests[0].discoveries = [];
  let writes = 0;
  const api = fakeApi({ [`repos/${repository}/pulls/1`]: detail });
  await assert.rejects(refreshProjectPlayerRecords({ ...input, fetchJson: api.fetchJson, writeRecords: async () => { writes += 1; } }), /not attributed/);
  assert.equal(writes, 0); assert.ok(api.calls.every(({ endpoint }) => !endpoint.includes("?per_page")));
});

test("direct commits require the recorded SHA and a portfolio GitHub account", async () => {
  const input = fixture();
  Object.assign(input.graphs[0].beats[0], { href: `https://github.com/${repository}/commit/${shaA}`, kind: "commit", integrationStatus: "direct-commit", availability: "public-fork" });
  const { result } = await capturedRefresh(input);
  assert.equal(result.attributionJoin.matchedCommits, 1);
  for (const detail of [{ sha: shaA, author: { login: "someone-else" } }, { sha: shaB, author: { login: "mh0pe" } }]) {
    let writes = 0;
    await assert.rejects(refreshProjectPlayerRecords({ ...input, fetchJson: fakeApi({ [`repos/${repository}/commits/${shaA}?per_page=100`]: [{ ...detail, files: [] }] }).fetchJson, writeRecords: async () => { writes += 1; } }));
    assert.equal(writes, 0);
  }
});

async function tempDirectory() {
  return mkdtemp(join(tmpdir(), "player-refresh-fixture-"));
}
async function acceptedFiles(directory) {
  return Promise.all(["project-player-records/manifest.json", "project-player-records/example.json", "project-player-records.compact.json"].map((file) => readFile(resolve(directory, file), "utf8")));
}

test("staged generation roundtrips shared and absent model associations", async () => {
  const { written } = await capturedRefresh();
  const outputDirectory = await tempDirectory();
  const result = await writeProjectPlayerRecords({ ...written, outputDirectory });
  assert.equal(result.commitCount, 3);
  const record = JSON.parse(await readFile(join(outputDirectory, "project-player-records/example.json"), "utf8"));
  assert.deepEqual(record.changes[0].commits.map((commit) => commit.agentId), ["model-a", "shared", null]);
});

for (const unsafeTitle of ["fix: Handle file:///example/reference", "fix: Handle /home/example/reference", "fix: Contact person@example.test", "fix: Handle Bearer test-token"]) {
  test(`unsafe commit display title uses an immutable identity without losing the record (${unsafeTitle.split(" ")[2]})`, async () => {
    const { written } = await capturedRefresh();
    written.hydrated[0].evidence.commits[0].commit.message = unsafeTitle;
    const before = structuredClone(written.hydrated);
    const outputDirectory = await tempDirectory();
    const result = await writeProjectPlayerRecords({ ...written, outputDirectory });
    const record = JSON.parse(await readFile(join(outputDirectory, "project-player-records/example.json"), "utf8"));
    assert.equal(result.commitCount, 3);
    assert.equal(record.changes[0].commits[0].label, `Public commit ${shaA.slice(0, 7)}`);
    assert.equal(record.changes[0].commits[0].sha, shaA);
    assert.equal(record.changes[0].commits[0].href, `https://github.com/${repository}/commit/${shaA}`);
    assert.equal(record.changes[0].commits[1].label, "Improve example");
    assert.deepEqual(written.hydrated, before);
  });
}

test("display-label fallback does not permit unsafe file paths", async () => {
  const { written } = await capturedRefresh();
  written.hydrated[0].evidence.files[0].filename = "file:///example/reference";
  let writes = 0;
  await assert.rejects(writeProjectPlayerRecords({ ...written, operations: { mkdir: async () => { writes++; } } }), /Unsafe text/);
  assert.equal(writes, 0);
});

for (const failure of ["staging write", "staging validation", "promotion"]) {
  test(`${failure} failure retains every previous accepted output byte`, async () => {
    const { written } = await capturedRefresh();
    const outputDirectory = await tempDirectory();
    await writeProjectPlayerRecords({ ...written, outputDirectory });
    const before = await acceptedFiles(outputDirectory);
    written.hydrated[0].evidence.label = "A newer generation";
    let injected = false;
    const operations = failure === "promotion" ? {
      rename: async (source, target) => {
        if (!injected && target === join(outputDirectory, "project-player-records.compact.json")) { injected = true; throw new Error("Injected promotion failure"); }
        return rename(source, target);
      },
    } : {
      writeFile: async (path, data) => {
        if (basename(path) === "project-player-records.compact.json") {
          injected = true;
          if (failure === "staging write") throw new Error("Injected staging failure");
          return writeFile(path, "{}");
        }
        return writeFile(path, data);
      },
    };
    await assert.rejects(writeProjectPlayerRecords({ ...written, outputDirectory, operations }));
    assert.equal(injected, true);
    assert.deepEqual(await acceptedFiles(outputDirectory), before);
  });
}

test("invalid generation performs zero filesystem operations", async () => {
  const { written } = await capturedRefresh();
  written.hydrated[0].evidence.files = [];
  let operations = 0;
  const forbidden = async () => { operations += 1; throw new Error("Unexpected filesystem operation"); };
  await assert.rejects(writeProjectPlayerRecords({ ...written, operations: Object.fromEntries(["mkdir", "mkdtemp", "writeFile", "readFile", "rename", "lstat"].map((key) => [key, forbidden])) }));
  assert.equal(operations, 0);
});

test("public PR source loader verifies recorded bytes and row count", async () => {
  const directory = await tempDirectory();
  const bytes = `${JSON.stringify(fixture().pullRequests[0])}\n`;
  const manifest = { ...fixture().historyManifest, files: { "pull_requests.jsonl": { sha256: createHash("sha256").update(bytes).digest("hex"), records: 1 } } };
  await writeFile(join(directory, "manifest.json"), JSON.stringify(manifest));
  await writeFile(join(directory, "pull_requests.jsonl"), bytes);
  assert.equal((await readPublicPullRequestExport(directory)).pullRequests.length, 1);
  manifest.files["pull_requests.jsonl"].records = 2;
  await writeFile(join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(readPublicPullRequestExport(directory), /row count does not match/);
  await writeFile(join(directory, "pull_requests.jsonl"), `${bytes}\n`);
  await assert.rejects(readPublicPullRequestExport(directory), /integrity check failed/);
});

test("graph entrypoint loader rejects altered public export bytes before hydration", async () => {
  const directory = await tempDirectory();
  const input = fixture();
  const bytes = `${JSON.stringify(input.pullRequests[0])}\n`;
  const manifest = { ...input.historyManifest, files: { "pull_requests.jsonl": { sha256: createHash("sha256").update(bytes).digest("hex"), records: 1 } } };
  await writeFile(join(directory, "manifest.json"), JSON.stringify(manifest));
  await writeFile(join(directory, "pull_requests.jsonl"), bytes);
  const attributionFile = join(directory, "attribution.json");
  await writeFile(attributionFile, JSON.stringify(input.attribution));
  assert.equal((await loadProjectGraphInputs({ historyDirectory: directory, attributionFile })).pullRequests.length, 1);
  await writeFile(join(directory, "pull_requests.jsonl"), "{}\n");
  await assert.rejects(loadProjectGraphInputs({ historyDirectory: directory, attributionFile }), /integrity check failed/);
});

test("graph hydration checks live eligibility before commit and file requests", async () => {
  const input = fixture(), evidence = { ...input.graphs[0].beats[0], number: 1 };
  const prByUrl = new Map(input.pullRequests.map((pr) => [pr.html_url, pr]));
  const validApi = fakeApi();
  await hydrateEvidence(evidence, prByUrl, { fetchJson: validApi.fetchJson });
  const content = validApi.calls.findIndex(({ endpoint }) => endpoint.includes("?per_page"));
  assert.equal(validApi.calls[content - 1].endpoint, `repos/${repository}`);
  for (const detail of [
    { html_url: href, user: { login: "someone-else" }, base: { repo: { full_name: repository } }, head: { repo: { full_name: repository } } },
    { html_url: href, user: { login: "mh0pe" }, base: { repo: { full_name: repository } }, head: { repo: { full_name: "mh0pe/private" } } },
  ]) {
    const api = fakeApi({ [`repos/${repository}/pulls/1`]: detail, "repos/mh0pe/private": { full_name: "mh0pe/private", private: true, visibility: "private" } });
    await assert.rejects(hydrateEvidence(evidence, prByUrl, { fetchJson: api.fetchJson }));
    assert.ok(api.calls.every(({ endpoint }) => !endpoint.includes("?per_page")));
  }
});

test("direct-commit refresh combines all file pages", async () => {
  const input = fixture();
  Object.assign(input.graphs[0].beats[0], { href: `https://github.com/${repository}/commit/${shaA}`, kind: "commit", integrationStatus: "direct-commit", availability: "public-fork" });
  const pages = ["first.js", "second.js"].map((filename) => ({ sha: shaA, author: { login: "mh0pe" }, commit: { message: "Improve example" }, files: [{ filename, status: "modified", additions: 1, deletions: 0, changes: 1 }] }));
  const api = fakeApi({ [`repos/${repository}/commits/${shaA}?per_page=100`]: pages });
  const { written } = await capturedRefresh(input, api);
  assert.deepEqual(written.hydrated[0].evidence.files.map((file) => file.filename), ["first.js", "second.js"]);
  assert.equal(api.calls.at(-1).options.flattenPages, false);
});

test("reported PR totals reject truncated refresh content before output", async () => {
  const api = fakeApi({ [`repos/${repository}/pulls/1/commits?per_page=100`]: [{ sha: shaA }] });
  let writes = 0;
  await assert.rejects(refreshProjectPlayerRecords({ ...fixture(), fetchJson: api.fetchJson, writeRecords: async () => { writes += 1; } }), /commit content is incomplete/);
  assert.equal(writes, 0);
});

async function combinedFixture() {
  const input = fixture();
  const { written: playerInput } = await capturedRefresh(input);
  return { graphs: input.graphs, manifest: { ...input.manifest, schemaVersion: 2, generatedAt: completedAt }, playerInput };
}
async function acceptedGeneration(directory) {
  const files = ["project-graphs/manifest.json", "project-graphs/example.json", "project-graphs.compact.json", "project-player-records/manifest.json", "project-player-records/example.json", "project-player-records.compact.json", "unrelated.json"];
  return Promise.all(files.map((file) => readFile(join(directory, file), "utf8")));
}

for (const failure of ["graph staging", "player staging", "graph validation", "project-graphs", "project-graphs.compact.json", "project-player-records", "project-player-records.compact.json"]) {
  test(`combined generation ${failure} failure preserves all graph/player output`, async () => {
    const input = await combinedFixture();
    const outputDirectory = await tempDirectory();
    await writeFile(join(outputDirectory, "unrelated.json"), "unrelated accepted content");
    await writeProjectGraphGeneration({ ...input, outputDirectory });
    const before = await acceptedGeneration(outputDirectory);
    input.graphs[0].title = "New generation";
    input.playerInput.hydrated[0].evidence.label = "New generation";
    let injected = false;
    const operations = failure.endsWith("staging") || failure === "graph validation" ? {
      writeFile: async (path, data) => {
        const target = failure === "player staging" ? "project-player-records.compact.json" : "project-graphs.compact.json";
        if (basename(path) === target) {
          injected = true;
          if (failure === "graph validation") return writeFile(path, "{}");
          throw new Error("Injected generation staging failure");
        }
        return writeFile(path, data);
      },
    } : {
      rename: async (source, target) => {
        if (!injected && target === join(outputDirectory, failure)) { injected = true; throw new Error("Injected generation promotion failure"); }
        return rename(source, target);
      },
    };
    await assert.rejects(writeProjectGraphGeneration({ ...input, outputDirectory, operations }));
    assert.equal(injected, true);
    assert.deepEqual(await acceptedGeneration(outputDirectory), before);
  });
}
