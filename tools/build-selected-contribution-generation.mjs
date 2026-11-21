import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGraph, hydrateSampledCommitDetails } from "./build-project-graphs.mjs";
import { writeProjectPlayerRecords } from "./build-project-player-records.mjs";
import { promoteStagedPaths } from "./promote-staged-paths.mjs";
import { assertPullRequestContentComplete, attributionBySha, portfolioAccounts } from "./public-contribution-guards.mjs";
import { expandAgentAttributionData } from "../app/data/agent-attribution-contract.mjs";
import { assertContributionGraphV2 } from "../app/data/contribution-graph-contract.mjs";
import { packContributionGraphCatalog, unpackContributionGraphCatalog } from "../app/data/contribution-graph-compact.mjs";
import { packContributionPlayerRecordCatalog, unpackContributionPlayerRecordCatalog } from "../app/data/contribution-player-records-compact.mjs";
import { buildBasisCompanion } from "./recover-attribution-provenance.mjs";
import { contributionId } from "./build-contribution-provenance.mjs";

const repository = "awslabs/automated-security-helper";
const numbers = [460, 462, 478];
const graphId = "ash-workspace";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const encode = (value) => `${JSON.stringify(value)}\n`;
const expectedSha = /^[a-f0-9]{40}$/;
const targets = [
  { name: "project-graphs", directory: true },
  { name: "project-graphs.compact.json", directory: false },
  { name: "project-player-records", directory: true },
  { name: "project-player-records.compact.json", directory: false },
  { name: "selected-contribution-generation.json", directory: false },
];

export function assertSelectedArticleSources(selections, articleSource) {
  const urls = [...new Set(articleSource.match(/https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/g) ?? [])].sort();
  assert.equal(urls.length, 26, "Article catalog must contain exactly the approved 26 literal PR URLs.");
  assert.ok(Array.isArray(selections));
  assert.equal(selections.length, 26);
  for (const selection of selections) assert.match(selection.id ?? "", /^[a-z][a-z0-9-]*$/, "Invalid selection ID.");
  assert.equal(new Set(selections.map((selection) => selection.id)).size, 26, "Duplicate selection ID.");
  const selected = selections.map((selection) => contributionId(selection.sourceHref));
  assert.equal(new Set(selected).size, 26, "Duplicate selected PR URL.");
  assert.deepEqual([...selected].sort(), urls, "Selections differ from the article catalog.");
}

export function validateSelectedReceipt(index, receipt) {
  assert.equal(index.repository.fullName, repository);
  assert.equal(index.repository.private, false);
  assert.equal(index.repository.visibility, "public");
  assert.equal(receipt.schemaVersion, 1);
  assert.equal(receipt.publicOnly, true);
  assert.deepEqual([...receipt.accounts].sort(), ["awsmadi", "mh0pe"]);
  assert.ok(Number.isFinite(Date.parse(receipt.preparedAt)));
  assert.deepEqual(receipt.pullRequests.map((entry) => entry.detail.number).sort((a, b) => a - b), numbers);
  assert.deepEqual(index.summaries.map((entry) => entry.number).sort((a, b) => a - b), numbers);
  const metadata = new Map([receipt.repository, ...(receipt.repositoryMetadata ?? [])].filter(Boolean).map((entry) => [entry.full_name, entry]));
  const publicRepo = (name) => {
    const entry = metadata.get(name);
    assert.ok(entry && entry.private === false && entry.visibility === "public", `No public metadata for ${name}`);
  };
  publicRepo(repository);
  const details = new Map();
  for (const detail of receipt.commitDetails) {
    assert.match(detail.sha, expectedSha);
    assert.equal(detail.html_url, `https://github.com/${repository}/commit/${detail.sha}`);
    assert.ok([detail.author?.login, detail.committer?.login].some((account) => portfolioAccounts.has(account)), "Exact commit lacks portfolio-account eligibility.");
    assert.ok(!details.has(detail.sha), "Duplicate exact commit detail.");
    assert.ok(Array.isArray(detail.parents) && Array.isArray(detail.files));
    assert.equal(new Set(detail.files.map((file) => file.filename)).size, detail.files.length);
    for (const file of detail.files) {
      for (const metric of ["additions", "deletions", "changes"]) assert.ok(Number.isSafeInteger(file[metric]) && file[metric] >= 0);
      assert.equal(file.changes, file.additions + file.deletions);
    }
    assert.equal(detail.files.reduce((n, f) => n + f.additions, 0), detail.stats.additions, "Incomplete exact commit additions.");
    assert.equal(detail.files.reduce((n, f) => n + f.deletions, 0), detail.stats.deletions, "Incomplete exact commit deletions.");
    details.set(detail.sha, detail);
  }
  const memberships = new Map();
  const evidence = receipt.pullRequests.map(({ detail, commits, files }) => {
    const original = index.summaries.find((entry) => entry.number === detail.number);
    assert.equal(detail.html_url, `https://github.com/${repository}/pull/${detail.number}`);
    assert.ok(portfolioAccounts.has(detail.user?.login));
    assert.equal(detail.user.login, original.author);
    assert.equal(detail.base.repo.full_name, repository);
    for (const side of ["head", "base"]) {
      assert.equal(detail[side].repo.private, false);
      publicRepo(detail[side].repo.full_name);
      assert.equal(detail[side].repo.full_name, original[side].repo);
      assert.equal(detail[side].sha, original[side].sha, "Receipt refs differ from approved index.");
      assert.equal(detail[side].ref, original[side].ref);
    }
    assert.equal(detail.base.ref, "feat/workspace-mode-phase0-path-space");
    assert.ok(detail.merged_at && detail.merged === true && detail.state === "closed" && original.merged === true);
    assertPullRequestContentComplete(detail, commits, files);
    const oldResource = index.resources.find((entry) => entry.number === detail.number);
    assert.deepEqual(commits.map((entry) => entry.sha), oldResource.commits.map((entry) => entry.sha));
    assert.deepEqual(files.map((entry) => entry.filename).sort(), oldResource.files.map((entry) => entry.filename).sort());
    for (const file of files) {
      const originalFile = oldResource.files.find((entry) => entry.filename === file.filename);
      for (const key of ["status", "additions", "deletions", "changes"]) assert.equal(file[key], originalFile[key], `File ${key} differs from approved index.`);
    }
    for (const commit of commits) {
      assert.match(commit.sha, expectedSha);
      const exact = details.get(commit.sha);
      assert.ok(exact, `Missing exact detail for ${commit.sha}`);
      assert.equal(commit.commit?.message, exact.commit?.message);
      assert.equal(commit.commit?.author?.date, exact.commit?.author?.date);
      assert.ok([commit.author?.login, commit.committer?.login].some((account) => portfolioAccounts.has(account)));
      const originalCommit = oldResource.commits.find((entry) => entry.sha === commit.sha);
      assert.equal(exact.author?.login, originalCommit.author);
      assert.equal(exact.committer?.login, originalCommit.committer);
      assert.equal(exact.commit.author.date, originalCommit.authorDate);
      assert.equal(commit.author?.login, exact.author?.login);
      assert.equal(commit.committer?.login, exact.committer?.login);
      memberships.set(commit.sha, [...(memberships.get(commit.sha) ?? []), detail.number]);
    }
    return {
      id: `ash-workspace-${detail.number}`, label: { 460: "Validate the workspace plan", 462: "Execute with project scope", 478: "Keep project context in reports" }[detail.number],
      href: detail.html_url, repository, kind: "pull-request", number: detail.number,
      availability: "upstream", integrationStatus: "merged", referenceSha: detail.head.sha,
      date: detail.merged_at, commits, files,
    };
  });
  assert.equal([...memberships.values()].reduce((n, values) => n + values.length, 0), 33);
  assert.equal(memberships.size, 26);
  assert.equal(details.size, 26);
  assert.deepEqual([...details.keys()].sort(), [...memberships.keys()].sort());
  return { evidence, details, memberships };
}

async function boundFile(path, expected) {
  const bytes = await readFile(path);
  const sha256 = hash(bytes);
  if (expected) assert.equal(sha256, expected, `Input hash mismatch: ${path}`);
  return { bytes, sha256 };
}

async function predecessor(dataDirectory) {
  const files = {};
  const values = {};
  for (const name of ["project-graphs", "project-player-records"]) {
    const file = await boundFile(resolve(dataDirectory, name, "manifest.json"));
    files[`${name}/manifest.json`] = file;
    const manifest = JSON.parse(file.bytes);
    assert.equal(manifest.publicOnly, true);
    assert.equal(manifest.graphIds.length, 8);
    assert.equal(new Set(manifest.graphIds).size, 8);
    assert.ok(!manifest.graphIds.includes(graphId));
    const records = [];
    for (const id of manifest.graphIds) {
      assert.match(id, /^[a-z][a-z0-9-]*$/);
      const record = await boundFile(resolve(dataDirectory, name, `${id}.json`));
      files[`${name}/${id}.json`] = record;
      records.push(JSON.parse(record.bytes));
      assert.equal(records.at(-1).id, id);
      assert.equal(records.at(-1).publicOnly, true);
    }
    const compact = await boundFile(resolve(dataDirectory, `${name}.compact.json`));
    files[`${name}.compact.json`] = compact;
    const decode = name === "project-graphs" ? unpackContributionGraphCatalog : unpackContributionPlayerRecordCatalog;
    assert.deepEqual(decode(JSON.parse(compact.bytes)), records);
    values[name] = { manifest, records };
  }
  assert.deepEqual(values["project-graphs"].manifest.graphIds, values["project-player-records"].manifest.graphIds);
  return { files, values };
}

export async function stageSelectedGeneration({ dataDirectory, outputDirectory, indexPath, indexSha256, receiptPath, receiptSha256, selectionsPath, selectionsSha256, articleSourcePath, articleSourceSha256, operations = {} }) {
  assert.match(indexSha256 ?? "", /^[a-f0-9]{64}$/);
  assert.match(receiptSha256 ?? "", /^[a-f0-9]{64}$/);
  assert.match(selectionsSha256 ?? "", /^[a-f0-9]{64}$/);
  assert.match(articleSourceSha256 ?? "", /^[a-f0-9]{64}$/);
  assert.equal(resolve(articleSourcePath), resolve(dataDirectory, "blog.ts"), "Article source must be the target data catalog.");
  const selectionsFile = await boundFile(selectionsPath, selectionsSha256);
  const articleSourceFile = await boundFile(articleSourcePath, articleSourceSha256);
  const selections = JSON.parse(selectionsFile.bytes);
  assertSelectedArticleSources(selections, articleSourceFile.bytes.toString());
  const indexFile = await boundFile(indexPath, indexSha256);
  const receiptFile = await boundFile(receiptPath, receiptSha256);
  const receipt = JSON.parse(receiptFile.bytes);
  const index = JSON.parse(indexFile.bytes);
  const checked = validateSelectedReceipt(index, receipt);
  const old = await predecessor(dataDirectory);
  const modelsFile = await boundFile(resolve(dataDirectory, "agent-attribution.json"));
  const provenanceFile = await boundFile(resolve(dataDirectory, "agent-attribution-provenance.json"));
  const basisFile = await boundFile(resolve(dataDirectory, "agent-attribution-basis.json"));
  assert.deepEqual(buildBasisCompanion(modelsFile.bytes, JSON.parse(provenanceFile.bytes)), JSON.parse(basisFile.bytes));
  const attribution = expandAgentAttributionData(JSON.parse(modelsFile.bytes));
  assert.equal(attribution.snapshot.publicOnly, true);
  assert.deepEqual([...attribution.snapshot.accounts].sort(), ["awsmadi", "mh0pe"]);
  const agentBySha = attributionBySha(attribution);
  const basisBySha = new Map(JSON.parse(provenanceFile.bytes).commits.map((entry) => [entry.sha, entry.basis]));
  const modelCoverage = [...checked.memberships].map(([sha, prs]) => ({ sha, prs, modelId: agentBySha.get(sha) ?? null, basis: basisBySha.get(sha) ?? null,
    association: agentBySha.has(sha) ? "inherited-exact-sha" : checked.details.get(sha).parents.length > 1 ? "merge-commit-outside-attribution-scope" : "not-established" }));
  assert.equal(modelCoverage.filter((entry) => entry.modelId !== null).length, 25);
  assert.equal(modelCoverage.filter((entry) => entry.association === "merge-commit-outside-attribution-scope").length, 1);
  const hydrated = await hydrateSampledCommitDetails(checked.evidence.map((evidence) => ({ graphId, evidence })),
    async ({ sha }) => checked.details.get(sha));
  for (const item of hydrated) assert.equal(item.evidence.exactCommitDetailCoverage.unavailable, 0);
  const inheritedAgents = old.values["project-graphs"].records.find((entry) => entry.id === "automated-security-helper").agents;
  const graph = buildGraph({ id: graphId, chapterId: "security", title: "Workspace-aware security", impact: "Plan, execute, and report without losing project context." }, hydrated.map((item) => item.evidence), agentBySha, new Map(), inheritedAgents);
  assertContributionGraphV2(graph, graphId);
  assert.ok(graph.nodes.length <= 100 && graph.edges.length <= 180);
  const refreshed = new Set(checked.evidence.map((item) => item.href));
  const allGraphs = [...old.values["project-graphs"].records, graph];
  const selected = selections.map((selection) => {
    const href = contributionId(selection.sourceHref);
    const references = allGraphs.flatMap((g) => g.beats.filter((beat) => beat.href === href).map((beat) => ({ graphId: g.id, beatId: beat.id })));
    assert.ok(references.length > 0, `Uncovered selected contribution: ${href}`);
    return { id: selection.id, href, status: refreshed.has(href) ? "refreshed-public-receipt" : "inherited-predecessor", references };
  });
  assert.equal(selected.filter((item) => item.status === "refreshed-public-receipt").length, 3);
  const io = { mkdir, mkdtemp, readFile, writeFile, ...operations };
  await io.mkdir(outputDirectory, { recursive: true });
  const staging = await io.mkdtemp(resolve(outputDirectory, ".selected-generation-stage-"));
  const generationId = `selected-${receiptSha256.slice(0, 16)}`;
  await writeProjectPlayerRecords({ specs: [{ id: graphId }], hydrated, agentBySha, outputDirectory: staging,
    sourceExport: generationId, sourceExportCompletedAt: receipt.preparedAt, sourceExportRunId: generationId, operations });
  const newPlayer = JSON.parse(await io.readFile(resolve(staging, `project-player-records/${graphId}.json`), "utf8"));
  const players = [...old.values["project-player-records"].records, newPlayer];
  for (const item of selected) {
    assert.ok(players.some((p) => p.changes.some((change) => change.href === item.href)), `Missing player selection ${item.href}`);
  }
  const graphCatalog = packContributionGraphCatalog(allGraphs);
  const playerCatalog = packContributionPlayerRecordCatalog(players);
  assert.deepEqual(unpackContributionGraphCatalog(graphCatalog), allGraphs);
  assert.deepEqual(unpackContributionPlayerRecordCatalog(playerCatalog), players);
  const files = {};
  for (const [name, file] of Object.entries(old.files)) {
    if (name.endsWith("/manifest.json") || name.endsWith(".compact.json")) continue;
    files[name] = file.bytes;
  }
  files[`project-graphs/${graphId}.json`] = Buffer.from(encode(graph));
  files[`project-player-records/${graphId}.json`] = Buffer.from(encode(newPlayer));
  for (const [name, schemaVersion] of [["project-graphs", 2], ["project-player-records", 1]]) {
    files[`${name}/manifest.json`] = Buffer.from(encode({ schemaVersion, publicOnly: true, generatedAt: receipt.preparedAt,
      sourceKind: "selected-public-receipts-with-inherited-records", sourceExport: generationId, sourceExportCompletedAt: receipt.preparedAt, sourceExportRunId: generationId,
      graphIds: allGraphs.map((item) => item.id), sourceBindings: "selected-contribution-generation.json" }));
  }
  files["project-graphs.compact.json"] = Buffer.from(encode(graphCatalog));
  files["project-player-records.compact.json"] = Buffer.from(encode(playerCatalog));
  const manifest = {
    schemaVersion: 1, publicOnly: true, id: generationId, preparedAt: receipt.preparedAt,
    scope: "26 selected article PRs: 23 inherited, 3 refreshed. Not a fresh full-account history or refreshed model census.",
    inputs: { approvedIndex: indexSha256, publicReceipt: receiptSha256, selections: selectionsFile.sha256, articleSource: articleSourceFile.sha256,
      models: modelsFile.sha256, provenance: provenanceFile.sha256, basis: basisFile.sha256,
      predecessor: Object.fromEntries(Object.entries(old.files).map(([name, file]) => [name, file.sha256])) },
    predecessorGenerations: { graphs: old.values["project-graphs"].manifest, players: old.values["project-player-records"].manifest, models: attribution.snapshot },
    refreshedContext: receipt.pullRequests.map(({ detail }) => ({ href: detail.html_url, headSha: detail.head.sha, headRef: detail.head.ref, baseSha: detail.base.sha, baseRef: detail.base.ref, integrationStatus: "merged-into-feature-base", defaultBranchDeliveryEstablished: false })),
    selected, modelCoverage,
    agentLegend: { scope: "inherited-repository-family", sourceGraphId: "automated-security-helper", sourceSha256: old.files["project-graphs/automated-security-helper.json"].sha256, modelArtifactSha256: modelsFile.sha256 },
    counts: { selectedPRs: 26, inheritedPRs: 23, refreshedPRs: 3, refreshedCommitOccurrences: 33, refreshedUniqueCommitShas: 26 },
    outputs: Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, { sha256: hash(bytes), bytes: bytes.length }])),
  };
  files["selected-contribution-generation.json"] = Buffer.from(encode(manifest));
  await io.mkdir(resolve(staging, "project-graphs"), { recursive: true });
  const writes = await Promise.allSettled(Object.entries(files).map(([name, bytes]) => io.writeFile(resolve(staging, name), bytes)));
  const failures = writes.filter((result) => result.status === "rejected");
  if (failures.length) throw new AggregateError(failures.map((result) => result.reason), "Selected generation staging failed; predecessor unchanged.");
  for (const [name, bytes] of Object.entries(files)) assert.equal(hash(await io.readFile(resolve(staging, name))), hash(bytes), `Staged readback failed: ${name}`);
  return { staging, manifest, manifestSha256: hash(files["selected-contribution-generation.json"]) };
}

export async function promoteSelectedGeneration(staging, outputDirectory, expectedManifestSha256, operations = {}) {
  const io = { readFile, ...operations };
  assert.match(expectedManifestSha256 ?? "", /^[a-f0-9]{64}$/);
  const manifestBytes = await io.readFile(resolve(staging, "selected-contribution-generation.json"));
  assert.equal(hash(manifestBytes), expectedManifestSha256, "Selected manifest changed before promotion.");
  const manifest = JSON.parse(manifestBytes);
  for (const [name, expected] of Object.entries(manifest.outputs)) {
    assert.ok(/^(project-graphs|project-player-records)(\/([a-z][a-z0-9-]*|manifest)\.json|\.compact\.json)$/.test(name));
    assert.equal(hash(await io.readFile(resolve(staging, name))), expected.sha256, `Promotion input changed: ${name}`);
  }
  for (const [name, expected] of Object.entries(manifest.inputs.predecessor)) {
    assert.ok(/^(project-graphs|project-player-records)(\/([a-z][a-z0-9-]*|manifest)\.json|\.compact\.json)$/.test(name));
    assert.equal(hash(await io.readFile(resolve(outputDirectory, name))), expected, `Target predecessor changed: ${name}`);
  }
  for (const [name, key] of [["agent-attribution.json", "models"], ["agent-attribution-provenance.json", "provenance"], ["agent-attribution-basis.json", "basis"], ["blog.ts", "articleSource"]]) {
    assert.equal(hash(await io.readFile(resolve(outputDirectory, name))), manifest.inputs[key], `Target model input changed: ${name}`);
  }
  try {
    await io.readFile(resolve(outputDirectory, "selected-contribution-generation.json"));
    assert.fail("Target already contains a selected-generation manifest.");
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  await promoteStagedPaths(staging, outputDirectory, targets, operations);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const allowed = ["dataDirectory", "outputDirectory", "indexPath", "indexSha256", "receiptPath", "receiptSha256", "selectionsPath", "selectionsSha256", "articleSourcePath", "articleSourceSha256"];
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, "");
    assert.ok(allowed.includes(key) && args[i + 1] && !options[key]);
    options[key] = args[i + 1];
  }
  assert.deepEqual(Object.keys(options).sort(), [...allowed].sort());
  const result = await stageSelectedGeneration(options);
  console.log(JSON.stringify({ staging: result.staging, manifestSha256: result.manifestSha256, counts: result.manifest.counts }));
}
