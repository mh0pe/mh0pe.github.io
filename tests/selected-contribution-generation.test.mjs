import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { assertSelectedArticleSources, validateSelectedReceipt, stageSelectedGeneration, promoteSelectedGeneration } from "../tools/build-selected-contribution-generation.mjs";
import { expandAgentAttributionData } from "../app/data/agent-attribution-contract.mjs";
import { buildBasisCompanion } from "../tools/recover-attribution-provenance.mjs";
import { packContributionGraphCatalog } from "../app/data/contribution-graph-compact.mjs";
import { packContributionPlayerRecordCatalog } from "../app/data/contribution-player-records-compact.mjs";

const repository = "awslabs/automated-security-helper";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const app = new URL("../app/data/", import.meta.url);
const branch = "feat/workspace-mode-phase0-path-space";
const ids = ["automated-security-helper", "cloudformation-guard", "nix-windows", "portable-frameworks", "rules-js-pnp", "lightpanda-svg", "aws-labs-mcp", "cloud-runtime"];
const historicalModelId = "claude-opus-5";

function fixture(shas = Array.from({ length: 26 }, (_, i) => (i + 1).toString(16).padStart(40, "0"))) {
  const repo = { full_name: repository, private: false, visibility: "public" };
  const commitDetails = shas.map((sha, i) => ({ sha, html_url: `https://github.com/${repository}/commit/${sha}`,
    author: { login: "awsmadi" }, committer: { login: "awsmadi" }, commit: { message: `Change ${i}`, author: { date: "2026-08-25T00:00:00Z" } },
    parents: i === 25 ? [{ sha: shas[0] }, { sha: shas[1] }] : [{ sha: "0".repeat(40) }],
    stats: { additions: 1, deletions: 0 }, files: [{ filename: "src/example.ts", status: "modified", additions: 1, deletions: 0, changes: 1 }] }));
  const groups = [[460, commitDetails.slice(0, 7)], [462, commitDetails.slice(0, 25)], [478, commitDetails.slice(25)]];
  const pullRequests = groups.map(([number, commits]) => ({
    detail: { number, html_url: `https://github.com/${repository}/pull/${number}`, user: { login: "awsmadi" }, commits: commits.length, changed_files: 1,
      head: { repo, ref: `feature-${number}`, sha: commits.at(-1).sha }, base: { repo, ref: branch, sha: "0".repeat(40) }, merged_at: "2026-08-26T00:00:00Z", merged: true, state: "closed" },
    commits, files: [{ filename: "src/example.ts", status: "modified", additions: 1, deletions: 0, changes: 1,
      blob_url: `https://github.com/${repository}/blob/${commits.at(-1).sha}/src%2Fexample.ts` }],
  }));
  return {
    receipt: { schemaVersion: 1, publicOnly: true, accounts: ["mh0pe", "awsmadi"], preparedAt: "2026-10-11T00:00:00Z", repository: repo, pullRequests, commitDetails },
    index: { repository: { fullName: repository, private: false, visibility: "public" },
      summaries: pullRequests.map(({ detail }) => ({ number: detail.number, author: "awsmadi", merged: true, head: { repo: repository, ref: detail.head.ref, sha: detail.head.sha }, base: { repo: repository, ref: branch, sha: detail.base.sha } })),
      resources: pullRequests.map(({ detail, commits, files }) => ({ number: detail.number, commits: commits.map(({ sha }) => ({ sha, author: "awsmadi", committer: "awsmadi", authorDate: "2026-08-25T00:00:00Z" })), files: files.map(({ filename, status, additions, deletions, changes }) => ({ filename, status, additions, deletions, changes })) })),
    },
  };
}

function attributionFixture(receipt) {
  const details = receipt.commitDetails.filter(detail => detail.parents.length <= 1);
  const models = {
    schemaVersion: 3,
    snapshot: { publicOnly: true, accounts: ["mh0pe", "awsmadi"], sourceExportGeneratedAt: "2026-08-26T00:00:00Z" },
    agents: [{ id: historicalModelId, name: "Claude Opus 5", kind: "model" }],
    repositories: [repository],
    pullRequests: receipt.pullRequests.map(({ detail }) => [0, detail.number, 2]),
    commits: details.map((detail, index) => [
      detail.sha, index === 0 ? Date.parse(detail.commit.author.date) / 1000 : 0,
      0, [0], [1], [0], null, 1,
      detail.stats.additions, detail.stats.additions, detail.stats.deletions, detail.stats.deletions,
      receipt.pullRequests.flatMap((entry, prIndex) => entry.commits.some(commit => commit.sha === detail.sha) ? [prIndex] : []),
    ]),
  };
  const modelBytes = Buffer.from(JSON.stringify(models));
  const provenance = {
    schemaVersion: 1,
    inputBindings: { attributionSha256: hash(modelBytes) },
    commits: details.map(detail => ({ sha: detail.sha, modelIds: [historicalModelId], basis: "stated-awsmadi-date-rule",
      sourceOccurrences: [{ source: "public-history", repository }] })),
  };
  return { modelBytes, provenanceBytes: Buffer.from(JSON.stringify(provenance)), basisBytes: Buffer.from(JSON.stringify(buildBasisCompanion(modelBytes, provenance))) };
}

test("historical attribution fixture binds exactly 25 nonmerge August commits without current app attribution", () => {
  const { receipt } = fixture();
  const first = attributionFixture(receipt), second = attributionFixture(receipt);
  assert.deepEqual(first, second);
  const models = expandAgentAttributionData(JSON.parse(first.modelBytes));
  const proof = JSON.parse(first.provenanceBytes), basis = JSON.parse(first.basisBytes);
  assert.equal(models.commits.length, 25);
  assert.deepEqual(models.commits.map(commit => commit.sha), receipt.commitDetails.slice(0, 25).map(detail => detail.sha));
  assert.ok(models.commits.every(commit => commit.repository === repository && commit.accounts.length === 1 && commit.accounts[0] === "awsmadi"));
  assert.ok(models.commits.every(commit => commit.date === "2026-08-25T00:00:00.000Z" && commit.modelIds.length === 1 && commit.modelIds[0] === historicalModelId));
  assert.ok(proof.commits.every(commit => commit.basis === "stated-awsmadi-date-rule"));
  assert.ok(!models.commits.some(commit => commit.sha === receipt.commitDetails.at(-1).sha));
  assert.equal(basis.basis, "h".repeat(25));
  assert.deepEqual(buildBasisCompanion(first.modelBytes, proof), basis);
});

test("receipt preserves 33 memberships, 26 unique details, and feature-base context", () => {
  const f = fixture(); const r = validateSelectedReceipt(f.index, f.receipt);
  assert.equal(r.details.size, 26); assert.equal(r.memberships.size, 26);
  assert.equal([...r.memberships.values()].filter(prs => prs.length === 2).length, 7);
});

for (const [name, mutate] of [
  ["private source", f => { f.receipt.repository.private = true; }],
  ["wrong account", f => { f.receipt.pullRequests[0].detail.user.login = "other"; }],
  ["wrong head", f => { f.receipt.pullRequests[0].detail.head.sha = "f".repeat(40); }],
  ["main branch claim", f => { f.receipt.pullRequests[0].detail.base.ref = "main"; }],
  ["missing commits", f => { f.receipt.pullRequests[0].commits.pop(); }],
  ["duplicate details", f => { f.receipt.commitDetails.push(f.receipt.commitDetails[0]); }],
  ["incomplete file metrics", f => { f.receipt.commitDetails[0].stats.additions = 2; }],
  ["commit outside portfolio", f => { f.receipt.commitDetails[0].author.login = "other"; f.receipt.commitDetails[0].committer.login = "other"; }],
  ["inconsistent merge state", f => { f.receipt.pullRequests[0].detail.state = "open"; }],
  ["changed index author", f => { f.index.resources[0].commits[0].author = "other"; }],
  ["changed file metrics", f => { f.index.resources[0].files[0].additions = 8; }],
  ["conflicting shared metadata", f => { f.receipt.pullRequests[1].commits[0] = { ...f.receipt.pullRequests[1].commits[0], commit: { message: "different", author: { date: "2026-08-25T00:00:00Z" } } }; }],
]) test(`rejects ${name} before staging`, () => { const f = fixture(); mutate(f); assert.throws(() => validateSelectedReceipt(f.index, f.receipt)); });

async function prepare(directory) {
  const dataDirectory = resolve(directory, "data"); await mkdir(dataDirectory);
  const f = fixture(), attribution = attributionFixture(f.receipt);
  const originals = {};
  for (const [file, bytes] of [["agent-attribution.json", attribution.modelBytes], ["agent-attribution-provenance.json", attribution.provenanceBytes], ["agent-attribution-basis.json", attribution.basisBytes]]) {
    await writeFile(resolve(dataDirectory, file), bytes); originals[file] = hash(bytes);
  }
  const graphRecords = [];
  for (const name of ["project-graphs", "project-player-records"]) {
    await mkdir(resolve(dataDirectory, name));
    const records = [];
    for (const id of ids) {
      const bytes = await readFile(new URL(`${name}/${id}.json`, app));
      await writeFile(resolve(dataDirectory, name, `${id}.json`), bytes);
      originals[`${name}/${id}.json`] = hash(bytes); records.push(JSON.parse(bytes));
    }
    if (name === "project-graphs") graphRecords.push(...records);
    const manifest = JSON.parse(await readFile(new URL(`${name}/manifest.json`, app)));
    manifest.graphIds = ids;
    const bytes = JSON.stringify(manifest); await writeFile(resolve(dataDirectory, name, "manifest.json"), bytes);
    originals[`${name}/manifest.json`] = hash(bytes);
    const compact = JSON.stringify(name === "project-graphs" ? packContributionGraphCatalog(records) : packContributionPlayerRecordCatalog(records));
    await writeFile(resolve(dataDirectory, `${name}.compact.json`), compact); originals[`${name}.compact.json`] = hash(compact);
  }
  const indexPath = resolve(directory, "index.json"); const receiptPath = resolve(directory, "receipt.json");
  const selectionsPath = resolve(directory, "selected.json");
  const existing = [...new Set(graphRecords.flatMap(g => g.beats.map(b => b.href)))].filter(href => href.includes("/pull/")).slice(0, 23);
  const selections = [...existing, ...f.receipt.pullRequests.map(r => r.detail.html_url)].map((sourceHref, i) => ({ id: `selection-${i}`, sourceHref }));
  const index = JSON.stringify(f.index); const receipt = JSON.stringify(f.receipt);
  const selectionBytes = JSON.stringify(selections);
  const articleSource = selections.map((selection) => `"${selection.sourceHref}"`).join("\n");
  const articleSourcePath = resolve(dataDirectory, "blog.ts");
  await writeFile(indexPath, index); await writeFile(receiptPath, receipt); await writeFile(selectionsPath, selectionBytes); await writeFile(articleSourcePath, articleSource);
  return { options: { dataDirectory, outputDirectory: directory, indexPath, indexSha256: hash(index), receiptPath, receiptSha256: hash(receipt), selectionsPath, selectionsSha256: hash(selectionBytes), articleSourcePath, articleSourceSha256: hash(articleSource) }, originals };
}

test("stages coherent 9-group generation and rollback preserves every predecessor byte", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "selected-generation-test-"));
  try {
    const { options, originals } = await prepare(directory);
    const result = await stageSelectedGeneration(options);
    assert.equal(result.manifest.selected.length, 26);
    assert.equal(result.manifest.selected.filter(s => s.status === "inherited-predecessor").length, 23);
    assert.equal(result.manifest.modelCoverage.filter(c => c.modelId !== null).length, 25);
    assert.ok(result.manifest.modelCoverage.filter(c => c.modelId !== null).every(c => c.modelId === historicalModelId && c.basis === "stated-awsmadi-date-rule" && c.association === "inherited-exact-sha"));
    assert.equal(result.manifest.modelCoverage.filter(c => c.association === "merge-commit-outside-attribution-scope").length, 1);
    for (const [name, expected] of Object.entries(originals)) {
      assert.equal(hash(await readFile(resolve(options.dataDirectory, name))), expected);
      if (name.includes("/") && !name.endsWith("manifest.json")) assert.equal(hash(await readFile(resolve(result.staging, name))), expected);
    }
    await assert.rejects(promoteSelectedGeneration(result.staging, options.dataDirectory, result.manifestSha256, { rename: async (from, to) => {
      if (from === resolve(result.staging, "project-player-records")) throw Error("injected promotion failure");
      return rename(from, to);
    } }), /injected/);
    for (const [name, expected] of Object.entries(originals)) assert.equal(hash(await readFile(resolve(options.dataDirectory, name))), expected);
    await assert.rejects(promoteSelectedGeneration(result.staging, options.dataDirectory, "0".repeat(64)), /manifest changed/);
    await promoteSelectedGeneration(result.staging, options.dataDirectory, result.manifestSha256);
    assert.equal(JSON.parse(await readFile(resolve(options.dataDirectory, "project-graphs/manifest.json"))).graphIds.length, 9);
  } finally { await rm(directory, { recursive: true }); }
});

test("wrong receipt bytes reject with no stage created", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "selected-hash-test-"));
  try { const { options } = await prepare(directory); options.receiptSha256 = "0".repeat(64); await assert.rejects(stageSelectedGeneration(options), /hash mismatch/); }
  finally { await rm(directory, { recursive: true }); }
});

test("exact article selection rejects different 26-PR subset and duplicate IDs", () => {
  const selections = Array.from({ length: 26 }, (_, i) => ({ id: `entry-${i}`, sourceHref: `https://github.com/example/project/pull/${i + 1}` }));
  const article = selections.map(s => `"${s.sourceHref}"`).join("\n");
  assertSelectedArticleSources(selections, article);
  const wrong = structuredClone(selections); wrong[0].sourceHref = "https://github.com/example/project/pull/99";
  assert.throws(() => assertSelectedArticleSources(wrong, article), /differ/);
  const duplicate = structuredClone(selections); duplicate[0].id = duplicate[1].id;
  assert.throws(() => assertSelectedArticleSources(duplicate, article), /Duplicate selection ID/);
  duplicate[0].id = ""; assert.throws(() => assertSelectedArticleSources(duplicate, article), /Invalid selection ID/);
});

test("selected-source and article bytes are externally hash-bound", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "selected-catalog-hash-test-"));
  try {
    const { options } = await prepare(directory);
    await assert.rejects(stageSelectedGeneration({ ...options, selectionsSha256: "0".repeat(64) }), /hash mismatch/);
    await assert.rejects(stageSelectedGeneration({ ...options, articleSourceSha256: "0".repeat(64) }), /hash mismatch/);
  } finally { await rm(directory, { recursive: true }); }
});
