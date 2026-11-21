import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { fullRefreshSpecs, reconcileFullRefresh } from "./full-refresh-plan.mjs";
import { buildGraph, buildAgentSummary, hydrateEvidence, hydrateSampledCommitDetails, writeProjectGraphGeneration } from "./build-project-graphs.mjs";
import { readVerifiedSnapshot, buildContributionProvenance } from "./build-contribution-provenance.mjs";
import { assertSelectedArticleSources } from "./build-selected-contribution-generation.mjs";
import { assertPublicSource, attributionBySha, fetchPublicCommitDetail, assertPublicRepositories } from "./public-contribution-guards.mjs";
import { buildBasisCompanion } from "./recover-attribution-provenance.mjs";
import { buildPublicRecord } from "./refresh-public-record.mjs";
import { unpackContributionGraphCatalog } from "../app/data/contribution-graph-compact.mjs";
import { unpackContributionPlayerRecordCatalog } from "../app/data/contribution-player-records-compact.mjs";
import { promoteStagedPaths } from "./promote-staged-paths.mjs";

const execute = promisify(execFile);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const encode = value => `${JSON.stringify(value)}\n`;
const dataName = /^(agent-attribution(?:-provenance|-basis)?|public-history-summary|full-contribution-generation)\.json$|^project-(graphs|player-records)(\/([a-z][a-z0-9-]*|manifest)\.json|\.compact\.json)$/;
const targets = ["agent-attribution.json", "agent-attribution-provenance.json", "agent-attribution-basis.json", "public-history-summary.json", "project-graphs", "project-graphs.compact.json", "project-player-records", "project-player-records.compact.json", "full-contribution-generation.json"].map(name => ({ name, directory: name === "project-graphs" || name === "project-player-records" }));

async function bound(path, expected) {
  const bytes = await readFile(path);
  if (expected) assert.equal(hash(bytes), expected, `Input changed: ${path}`);
  return { bytes, sha256: hash(bytes), value: JSON.parse(bytes) };
}

async function catalog(directory, name) {
  const manifest = await bound(resolve(directory, name, "manifest.json"));
  const records = [];
  const files = { [`${name}/manifest.json`]: manifest.sha256 };
  for (const id of manifest.value.graphIds) {
    assert.match(id, /^[a-z][a-z0-9-]*$/);
    const item = await bound(resolve(directory, name, `${id}.json`));
    records.push(item.value); files[`${name}/${id}.json`] = item.sha256;
  }
  const compact = await bound(resolve(directory, `${name}.compact.json`));
  const decode = name === "project-graphs" ? unpackContributionGraphCatalog : unpackContributionPlayerRecordCatalog;
  assert.deepEqual(decode(compact.value), records, "Canonical and compact generation differ.");
  files[`${name}.compact.json`] = compact.sha256;
  return { manifest: manifest.value, records, files };
}

async function ghJson(endpoint, { paged = false, flattenPages = true } = {}) {
  const args = ["api", "-H", "X-GitHub-Api-Version: 2022-11-28"];
  if (paged) args.push("--paginate", "--slurp");
  args.push(endpoint);
  const { stdout } = await execute("gh", args, { encoding: "utf8", timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
  const value = JSON.parse(stdout);
  return paged && flattenPages ? value.flat() : value;
}

export async function stageFullContributionSuccessor(options, { fetchJson = ghJson } = {}) {
  const { dataDirectory, outputDirectory, historyDirectory, forkDirectory, attributionPath, provenancePath, basisPath, selectionsPath, expectedSelectedSha256, expectedSelectionsSha256 } = options;
  assert.match(expectedSelectedSha256 ?? "", /^[a-f0-9]{64}$/);
  assert.match(expectedSelectionsSha256 ?? "", /^[a-f0-9]{64}$/);
  const selected = await bound(resolve(dataDirectory, "selected-contribution-generation.json"), expectedSelectedSha256);
  for (const [name, expected] of Object.entries(selected.value.outputs)) {
    assert.ok(dataName.test(name)); await bound(resolve(dataDirectory, name), expected.sha256);
  }
  const previous = {};
  for (const [name, key] of [["agent-attribution.json", "models"], ["agent-attribution-provenance.json", "provenance"], ["agent-attribution-basis.json", "basis"]]) {
    previous[name] = (await bound(resolve(dataDirectory, name), selected.value.inputs[key])).sha256;
  }
  previous["public-history-summary.json"] = (await bound(resolve(dataDirectory, "public-history-summary.json"))).sha256;
  previous["selected-contribution-generation.json"] = selected.sha256;
  const article = await readFile(resolve(dataDirectory, "blog.ts"));
  assert.equal(hash(article), selected.value.inputs.articleSource, "Selected article source changed; reconcile first.");
  previous["blog.ts"] = hash(article);
  const selections = await bound(selectionsPath, expectedSelectionsSha256);
  assertSelectedArticleSources(selections.value, article.toString());
  const oldGraphs = await catalog(dataDirectory, "project-graphs");
  const oldPlayers = await catalog(dataDirectory, "project-player-records");
  Object.assign(previous, oldGraphs.files, oldPlayers.files);
  assert.equal(oldGraphs.manifest.sourceKind, "selected-public-receipts-with-inherited-records");
  assert.equal(oldPlayers.manifest.sourceKind, oldGraphs.manifest.sourceKind);
  const history = await readVerifiedSnapshot(historyDirectory);
  const fork = await readVerifiedSnapshot(forkDirectory, "fork");
  const specs = fullRefreshSpecs();
  const reconciliation = reconcileFullRefresh({ specs, previousGraphs: oldGraphs.records, previousPlayers: oldPlayers.records, selectedGeneration: selected.value, selections: selections.value, history, fork });
  const models = await bound(attributionPath);
  const proof = await bound(provenancePath);
  const basis = await bound(basisPath);
  const attribution = assertPublicSource({ attribution: models.value, historyManifest: history.manifest });
  assert.deepEqual(buildBasisCompanion(models.bytes, proof.value), basis.value);
  for (const [key, expected] of Object.entries({ publicHistoryManifestSha256: history.binding.sha256, publicHistoryCommitsSha256: history.binding.files["commits.jsonl"].sha256, publicForkManifestSha256: fork.binding.sha256, publicForkCommitsSha256: fork.binding.files["commits.jsonl"].sha256 })) assert.equal(proof.value.inputBindings[key], expected, `Attribution proof uses different ${key}`);
  const agentBySha = attributionBySha(attribution);
  const basisBySha = new Map(proof.value.commits.map(row => [row.sha, row.basis]));
  for (const row of selected.value.modelCoverage) {
    assert.equal(agentBySha.get(row.sha) ?? null, row.modelId, `Selected model association changed: ${row.sha}`);
    assert.equal(basisBySha.get(row.sha) ?? null, row.basis, `Selected attribution certainty changed: ${row.sha}`);
  }
  const publicSummary = await buildPublicRecord(historyDirectory, forkDirectory);
  assert.equal(publicSummary.source_manifests.public_history_sha256, history.binding.sha256, "Summary uses another history generation.");
  assert.equal(publicSummary.source_manifests.fork_audit_sha256, fork.binding.sha256, "Summary uses another fork generation.");
  const prByUrl = new Map(history.contents["pull_requests.jsonl"].map(pr => [pr.html_url, pr]));
  const observations = [];
  const trackedFetch = async (endpoint, requestOptions) => {
    const value = await fetchJson(endpoint, requestOptions);
    const match = /^repos\/([^/]+\/[^/]+)\/pulls\/(\d+)$/.exec(endpoint);
    if (match) assertHydrationMatchesSnapshot(value, prByUrl.get(`https://github.com/${match[1]}/pull/${match[2]}`));
    observations.push({ endpoint, observedAt: new Date().toISOString(), responseSha256: hash(encode(value)) });
    return value;
  };
  const aggregate = [];
  for (const spec of specs) for (const evidence of spec.evidences) {
    process.stderr.write(`[full-successor] ${spec.id}: ${evidence.id}\n`);
    aggregate.push({ graphId: spec.id, evidence: await hydrateEvidence(evidence, prByUrl, {
      fetchJson: trackedFetch,
      fetchCommitDetail: (repository, sha) => fetchPublicCommitDetail(repository, sha, trackedFetch),
    }) });
  }
  for (const { evidence } of aggregate.filter(item => item.evidence.kind === "pull-request")) {
    const expected = history.contents["pull_request_commits.jsonl"].filter(row => row.pull_request_url === evidence.href).map(row => row.commit_sha).sort();
    assert.deepEqual(evidence.commits.map(commit => commit.sha).sort(), expected, `PR commits changed since collection: ${evidence.href}`);
  }
  const hydrated = await hydrateSampledCommitDetails(aggregate, async ({ repository, sha }) => {
    await assertPublicRepositories([repository], trackedFetch);
    return fetchPublicCommitDetail(repository, sha, trackedFetch);
  });
  assert.ok(hydrated.every(item => item.evidence.exactCommitDetailCoverage.unavailable === 0), "Missing exact sampled commit detail.");
  const agentCatalog = new Map(attribution.agents.map(agent => [agent.id, agent]));
  const graphs = specs.map(spec => buildGraph(spec, hydrated.filter(item => item.graphId === spec.id).map(item => item.evidence), agentBySha, prByUrl, buildAgentSummary(spec, attribution, agentCatalog)));
  await mkdir(outputDirectory, { recursive: true });
  const staging = await mkdtemp(resolve(outputDirectory, ".full-successor-stage-"));
  const sourceExport = `public-history-${history.manifest.run_id}`;
  const manifest = { schemaVersion: 2, publicOnly: true, generatedAt: new Date().toISOString(), sourceKind: "full-public-history-with-curated-project-records", sourceExport, sourceExportCompletedAt: history.manifest.completed_at, sourceExportRunId: history.manifest.run_id, graphIds: specs.map(spec => spec.id), sourceBindings: "full-contribution-generation.json" };
  await writeProjectGraphGeneration({ graphs, manifest, outputDirectory: staging, playerInput: { specs, hydrated, agentBySha, sourceExport, sourceExportCompletedAt: history.manifest.completed_at, sourceExportRunId: history.manifest.run_id } });
  const playerManifest = { ...manifest, schemaVersion: 1 };
  await writeFile(resolve(staging, "project-player-records/manifest.json"), encode(playerManifest));
  const players = await catalog(staging, "project-player-records");
  const freshGraphs = await catalog(staging, "project-graphs");
  const provenance = buildContributionProvenance({ history, fork, models: models.value, graphManifest: manifest, graphs: freshGraphs.records, playerManifest, players: players.records, selections: selections.value });
  assert.ok(provenance.generations.modelsMatchHistory && provenance.generations.graphMatchesHistory && provenance.generations.playerMatchesHistory);
  assert.ok(provenance.featured.every(row => row.publicSource.status === "included" && row.graph.status === "included" && row.player.status === "included"), "A selected article source is absent from the fresh generation.");
  const files = { "agent-attribution.json": models.bytes, "agent-attribution-provenance.json": proof.bytes, "agent-attribution-basis.json": basis.bytes, "public-history-summary.json": Buffer.from(encode(publicSummary)) };
  for (const [name, bytes] of Object.entries(files)) await writeFile(resolve(staging, name), bytes);
  const outputs = {};
  for (const name of [...Object.keys(files), ...Object.keys(freshGraphs.files), ...Object.keys(players.files)]) {
    assert.ok(dataName.test(name)); const bytes = await readFile(resolve(staging, name)); outputs[name] = { sha256: hash(bytes), bytes: bytes.length };
  }
  const generation = { schemaVersion: 1, publicOnly: true, sourceKind: manifest.sourceKind, preparedAt: manifest.generatedAt,
    scope: "Complete public collection with curated project visualizations. The visual selection is not a complete account inventory.",
    inputs: { history: history.binding, fork: fork.binding, models: models.sha256, provenance: proof.sha256, basis: basis.sha256, selectedGeneration: selected.sha256, selections: selections.sha256, article: hash(article) },
    targetPredecessor: previous, reconciliation, contributionProvenance: provenance, hydrationObservations: observations, outputs,
  };
  const generationBytes = Buffer.from(encode(generation));
  assert.equal((await readVerifiedSnapshot(historyDirectory)).binding.sha256, history.binding.sha256, "History changed while staging.");
  assert.equal((await readVerifiedSnapshot(forkDirectory, "fork")).binding.sha256, fork.binding.sha256, "Fork history changed while staging.");
  await writeFile(resolve(staging, "full-contribution-generation.json"), generationBytes);
  for (const [name, expected] of Object.entries(outputs)) assert.equal(hash(await readFile(resolve(staging, name))), expected.sha256);
  return { staging, generationSha256: hash(generationBytes), reconciliation };
}

export function assertHydrationMatchesSnapshot(detail, record) {
  assert.ok(record, "PR detail has no matching collected source.");
  assert.equal(detail.html_url, record.html_url);
  for (const side of ["head", "base"]) for (const key of ["sha", "ref"]) {
    assert.equal(detail[side]?.[key], record[side]?.[key], `PR ${side} ${key} changed since collection.`);
  }
  for (const side of ["head", "base"]) assert.equal(detail[side]?.repo?.full_name, record[side]?.repository, `PR ${side} repository changed since collection.`);
  const state = detail.state === "open" ? detail.draft ? "open_draft" : "open" : detail.merged_at ? "merged" : "closed_unmerged";
  assert.equal(state, record.state, "PR integration state changed since collection.");
}

async function regularPath(path, directory = false) {
  const stat = await lstat(path);
  assert.ok(!stat.isSymbolicLink() && (directory ? stat.isDirectory() : stat.isFile()), `Promotion path must be a regular ${directory ? "directory" : "file"}: ${path}`);
}

async function promotionInventory(directory) {
  const inventory = {};
  for (const target of targets.filter(target => target.name !== "full-contribution-generation.json")) {
    const path = resolve(directory, target.name);
    await regularPath(path, target.directory);
    if (!target.directory) {
      inventory[target.name] = await readFile(path);
      continue;
    }
    const names = await readdir(path);
    for (const name of names) await regularPath(resolve(path, name));
    const manifestBytes = await readFile(resolve(path, "manifest.json"));
    const { graphIds } = JSON.parse(manifestBytes);
    assert.ok(Array.isArray(graphIds) && graphIds.length, `Promotion catalog must declare its records: ${target.name}`);
    for (const id of graphIds) {
      assert.match(id, /^[a-z][a-z0-9-]*$/);
      assert.notEqual(id, "manifest", "Catalog records cannot replace the manifest.");
    }
    assert.equal(new Set(graphIds).size, graphIds.length, "Promotion catalog record IDs must be unique.");
    assert.deepEqual(names.sort(), ["manifest.json", ...graphIds.map(id => `${id}.json`)].sort(), `Promotion catalog inventory differs from its manifest: ${target.name}`);
    for (const name of names) inventory[`${target.name}/${name}`] = name === "manifest.json" ? manifestBytes : await readFile(resolve(path, name));
  }
  return inventory;
}

function assertReceiptInventory(receipt, inventory, label) {
  assert.ok(receipt && typeof receipt === "object" && !Array.isArray(receipt), `${label} must be a file inventory.`);
  assert.deepEqual(Object.keys(receipt).sort(), Object.keys(inventory).sort(), `${label} must bind exactly every promoted file.`);
}

async function assertAbsent(path, message) {
  try { await lstat(path); assert.fail(message); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}

export async function promoteFullContributionSuccessor(staging, dataDirectory, expectedGenerationSha256, operations = {}) {
  assert.match(expectedGenerationSha256 ?? "", /^[a-f0-9]{64}$/);
  await regularPath(staging, true);
  await regularPath(dataDirectory, true);
  const stagedRoot = await realpath(staging), targetRoot = await realpath(dataDirectory);
  assert.ok(stagedRoot !== targetRoot && !stagedRoot.startsWith(`${targetRoot}${sep}`) && !targetRoot.startsWith(`${stagedRoot}${sep}`), "Promotion roots must be separate and non-overlapping.");
  await regularPath(resolve(staging, "full-contribution-generation.json"));
  const generation = await bound(resolve(staging, "full-contribution-generation.json"), expectedGenerationSha256);
  assert.equal(generation.value.schemaVersion, 1);
  assert.equal(generation.value.publicOnly, true);
  assert.equal(generation.value.sourceKind, "full-public-history-with-curated-project-records");
  const stagedFiles = await promotionInventory(staging);
  assertReceiptInventory(generation.value.outputs, stagedFiles, "Staged outputs");
  for (const [name, expected] of Object.entries(generation.value.outputs)) {
    assert.ok(dataName.test(name));
    assert.ok(expected && typeof expected === "object" && !Array.isArray(expected), `Output metadata is required: ${name}`);
    assert.match(expected.sha256 ?? "", /^[a-f0-9]{64}$/);
    assert.ok(Number.isSafeInteger(expected.bytes) && expected.bytes >= 0, `Output byte count is required: ${name}`);
    assert.equal(stagedFiles[name].length, expected.bytes, `Staged byte count changed: ${name}`);
    assert.equal(hash(stagedFiles[name]), expected.sha256, `Staged output changed: ${name}`);
  }
  const predecessorFiles = await promotionInventory(dataDirectory);
  for (const name of ["blog.ts", "selected-contribution-generation.json"]) {
    await regularPath(resolve(dataDirectory, name));
    predecessorFiles[name] = await readFile(resolve(dataDirectory, name));
  }
  assertReceiptInventory(generation.value.targetPredecessor, predecessorFiles, "Target predecessor");
  for (const [name, expected] of Object.entries(generation.value.targetPredecessor)) {
    assert.ok(dataName.test(name) || ["blog.ts", "selected-contribution-generation.json"].includes(name));
    assert.match(expected ?? "", /^[a-f0-9]{64}$/);
    assert.equal(hash(predecessorFiles[name]), expected, `Target changed before promotion: ${name}`);
  }
  assert.equal(generation.value.targetPredecessor["blog.ts"], generation.value.inputs?.article, "Article anchor must match the generation input.");
  assert.equal(generation.value.targetPredecessor["selected-contribution-generation.json"], generation.value.inputs?.selectedGeneration, "Selected receipt anchor must match the generation input.");
  await assertAbsent(resolve(dataDirectory, "full-contribution-generation.json"), "Target is already a full successor.");
  for (const { name } of targets) await assertAbsent(resolve(staging, `previous-${name}`), `Promotion backup already exists: ${name}`);
  await promoteStagedPaths(staging, dataDirectory, targets, operations);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const keys = ["dataDirectory", "outputDirectory", "historyDirectory", "forkDirectory", "attributionPath", "provenancePath", "basisPath", "selectionsPath", "expectedSelectedSha256", "expectedSelectionsSha256"];
  const args = process.argv.slice(2); const options = {};
  for (let i = 0; i < args.length; i += 2) { const key = args[i].replace(/^--/, ""); assert.ok(keys.includes(key) && args[i + 1] && !options[key]); options[key] = args[i + 1]; }
  assert.deepEqual(Object.keys(options).sort(), [...keys].sort());
  console.log(JSON.stringify(await stageFullContributionSuccessor(options)));
}
