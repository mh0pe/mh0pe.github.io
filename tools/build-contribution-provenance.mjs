import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, lstat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expandAgentAttributionData } from "../app/data/agent-attribution-contract.mjs";
import { unpackContributionGraphCatalog } from "../app/data/contribution-graph-compact.mjs";
import { unpackContributionPlayerRecordCatalog } from "../app/data/contribution-player-records-compact.mjs";
import { attributionBySha, portfolioAccounts, isAccountDirectedCopilotPullRequest } from "./public-contribution-guards.mjs";
import { validatePrRelationships } from "./pr-relationship-integrity.mjs";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const accounts = [...portfolioAccounts].sort();
const rows = (bytes) => bytes.toString().split(/\r?\n/).filter(Boolean).map(JSON.parse);

// Canonical IDs are URLs, not display titles or graph-local aliases.
export function contributionId(href) {
  const match = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/(pull\/[1-9][0-9]*|commit\/[a-f0-9]{40})$/.exec(href ?? "");
  assert.ok(match, `Expected an exact public PR or commit URL: ${href}`);
  return href;
}

async function readBoundFile(path) {
  const bytes = await readFile(path);
  return { bytes, binding: { name: basename(path), bytes: bytes.length, sha256: sha256(bytes) } };
}

export async function readVerifiedSnapshot(directory, kind = "history") {
  assert.ok(["history", "fork"].includes(kind));
  const file = await readBoundFile(resolve(directory, "manifest.json"));
  const manifest = JSON.parse(file.bytes);
  assert.equal(manifest.public_only, true);
  assert.equal(manifest.status, "complete");
  assert.deepEqual([...manifest.accounts].sort(), accounts);
  assert.ok(Number.isFinite(Date.parse(manifest.completed_at)));
  assert.ok(manifest.files && Object.keys(manifest.files).length > 0);
  const contents = {};
  const files = {};
  for (const [name, expected] of Object.entries(manifest.files)) {
    assert.ok(name !== "." && name !== ".." && basename(name) === name && !name.includes("\\"));
    assert.ok(!(await lstat(resolve(directory, name))).isSymbolicLink(), "Snapshot files cannot be symlinks");
    const item = await readBoundFile(resolve(directory, name));
    assert.equal(item.binding.sha256, expected.sha256, `Snapshot hash mismatch: ${name}`);
    if (name.endsWith(".jsonl")) {
      contents[name] = rows(item.bytes);
      assert.equal(contents[name].length, expected.records, `Snapshot row mismatch: ${name}`);
    }
    files[name] = item.binding;
  }
  if (kind === "history") validatePrRelationships(contents);
  else assert.ok(Array.isArray(contents["commits.jsonl"]), "Missing fork commits");
  if (Object.hasOwn(manifest, "derivation")) {
    const receiptPath = resolve(directory, "..", "correction-receipt.json");
    assert.ok(!(await lstat(receiptPath)).isSymbolicLink(), "Unsafe derivative receipt");
    const receipt = JSON.parse(await readFile(receiptPath));
    assert.equal(receipt.schemaVersion, 1);
    assert.equal(receipt.status, "verified-offline-correction");
    assert.equal(receipt.issue, "PORT-QA-PUBLIC-CONTEXT-FALLBACK-20261011");
    assert.equal(receipt.newNetworkObservations, false);
    assert.equal(basename(resolve(directory)), kind);
    assert.equal(manifest.derivation.method, kind === "history" ? "remove-stale-pr-ordinal-associations-v1" : "unchanged-fork-content-rebinding-v1");
    assert.equal(receipt[kind].originalManifestSha256, manifest.derivation.source_manifest_sha256);
    assert.equal(receipt[kind].correctedManifestSha256, file.binding.sha256);
    for (const [name, binding] of Object.entries({ "manifest.json": file.binding, ...files })) {
      assert.deepEqual(receipt.outputs[`${kind}/${name}`], { sha256: binding.sha256, bytes: binding.bytes });
    }
  }
  assert.deepEqual(await readFile(resolve(directory, "manifest.json")), file.bytes, "Manifest changed during validation");
  return { manifest, contents, binding: { ...file.binding, files } };
}

function selectionState(actual, override, absentReason) {
  if (actual) {
    assert.ok(!override, "An included contribution cannot also be excluded or pending.");
    return { status: "included", reason: "Matched by exact public contribution ID." };
  }
  if (override) {
    assert.ok(["excluded", "pending"].includes(override.status));
    assert.ok(typeof override.reason === "string" && override.reason.trim().length > 0);
    return { status: override.status, reason: override.reason.trim() };
  }
  return { status: "pending", reason: absentReason };
}

export function buildContributionProvenance({ history, fork, models: input, graphManifest, graphs, playerManifest, players, selections, bindings = {} }) {
  assert.equal(history.manifest.public_only, true);
  assert.equal(fork.manifest.public_only, true);
  assert.equal(fork.manifest.source_export_manifest_sha256, history.binding.sha256, "Fork audit belongs to another history export.");
  const models = expandAgentAttributionData(input);
  assert.equal(models.snapshot.publicOnly, true);
  assert.deepEqual([...models.snapshot.accounts].sort(), accounts);
  const modelBySha = attributionBySha(models);
  for (const [manifest, records] of [[graphManifest, graphs], [playerManifest, players]]) {
    assert.equal(manifest.publicOnly, true);
    assert.deepEqual(records.map((record) => record.id), manifest.graphIds);
    assert.equal(new Set(manifest.graphIds).size, manifest.graphIds.length);
    for (const record of records) assert.equal(record.publicOnly, true);
  }
  const source = new Map();
  for (const pr of history.contents["pull_requests.jsonl"] ?? []) {
    if (portfolioAccounts.has(pr.author) || isAccountDirectedCopilotPullRequest(pr, pr)) source.set(contributionId(pr.html_url), "public-history-pr");
  }
  for (const [snapshot, name] of [[history, "public-history-commit"], [fork, "public-fork-commit"]]) {
    for (const commit of snapshot.contents["commits.jsonl"] ?? []) {
      const owners = commit.attributed_accounts ?? commit.matched_accounts ?? commit.accounts ?? [commit.author_login, commit.committer_login];
      if (owners.some((owner) => portfolioAccounts.has(owner))) source.set(contributionId(commit.html_url), name);
    }
  }
  const graphById = new Map();
  for (const graph of graphs) for (const beat of graph.beats) {
    const id = contributionId(beat.href);
    graphById.set(id, [...(graphById.get(id) ?? []), { graphId: graph.id, beatId: beat.id }]);
  }
  const playerById = new Map();
  for (const player of players) for (const change of player.changes) {
    const id = contributionId(change.href);
    playerById.set(id, [...(playerById.get(id) ?? []), { graphId: player.id, change }]);
  }
  assert.ok(Array.isArray(selections) && selections.length > 0);
  assert.equal(new Set(selections.map((selection) => selection.id)).size, selections.length);
  const featured = selections.map((selection) => {
    assert.match(selection.id, /^[a-z][a-z0-9-]*$/);
    const id = contributionId(selection.sourceHref);
    const graph = graphById.get(id) ?? [];
    const player = playerById.get(id) ?? [];
    const shas = new Set(player.flatMap(({ change }) => change.commits.map((commit) => commit.sha)));
    if (id.includes("/commit/")) shas.add(id.split("/").at(-1));
    const modelCommits = [...shas].filter((sha) => modelBySha.has(sha)).sort().map((sha) => ({ sha, modelId: modelBySha.get(sha) }));
    return {
      id: selection.id, contributionId: id,
      publicSource: source.has(id) ? { status: "included", source: source.get(id) } : { status: "pending", reason: "No eligible exact contribution ID in these verified public snapshots." },
      graph: { ...selectionState(graph.length > 0, selection.graph, "Not selected in this graph generation."), references: graph },
      player: { ...selectionState(player.length > 0, selection.player, "Not selected in this player generation."), references: player.map(({ graphId, change }) => ({ graphId, changeId: change.id })) },
      model: { ...selectionState(modelCommits.length > 0, selection.model, "No exact selected commit join to these model associations."), commits: modelCommits },
    };
  });
  return {
    schemaVersion: 1, publicOnly: true, accounts,
    scope: "Internal selected-contribution provenance; not a live visibility check or complete account inventory.",
    bindings: { publicHistory: history.binding, forkAudit: fork.binding, ...bindings },
    generations: {
      history: history.manifest.completed_at, models: models.snapshot.sourceExportGeneratedAt,
      graph: graphManifest.sourceExportCompletedAt, player: playerManifest.sourceExportCompletedAt,
      modelsMatchHistory: models.snapshot.sourceExportGeneratedAt === history.manifest.completed_at,
      graphMatchesHistory: graphManifest.sourceExportCompletedAt === history.manifest.completed_at && graphManifest.sourceExportRunId === history.manifest.run_id,
      playerMatchesHistory: playerManifest.sourceExportCompletedAt === history.manifest.completed_at && playerManifest.sourceExportRunId === history.manifest.run_id,
    },
    featured,
  };
}

async function readCatalog(directory, collection) {
  const manifestFile = await readBoundFile(resolve(directory, "manifest.json"));
  const manifest = JSON.parse(manifestFile.bytes);
  const records = [];
  const files = { "manifest.json": manifestFile.binding };
  for (const id of manifest.graphIds) {
    assert.match(id, /^[a-z][a-z0-9-]*$/);
    const file = await readBoundFile(resolve(directory, `${id}.json`));
    records.push(JSON.parse(file.bytes));
    files[`${id}.json`] = file.binding;
  }
  const compact = await readBoundFile(resolve(directory, `../${collection}.compact.json`));
  const decode = collection === "project-graphs" ? unpackContributionGraphCatalog : unpackContributionPlayerRecordCatalog;
  assert.deepEqual(decode(JSON.parse(compact.bytes)), records, "Canonical and compact catalog generations differ.");
  files[`${collection}.compact.json`] = compact.binding;
  return { manifest, records, files };
}

export async function loadContributionProvenance(options) {
  const history = await readVerifiedSnapshot(options.history);
  const fork = await readVerifiedSnapshot(options.fork, "fork");
  const models = await readBoundFile(options.models);
  const selections = await readBoundFile(options.selections);
  const graphs = await readCatalog(options.graphs, "project-graphs");
  const players = await readCatalog(options.players, "project-player-records");
  return buildContributionProvenance({ history, fork, models: JSON.parse(models.bytes), graphManifest: graphs.manifest, graphs: graphs.records, playerManifest: players.manifest, players: players.records, selections: JSON.parse(selections.bytes), bindings: { models: models.binding, selections: selections.binding, graphs: graphs.files, players: players.files } });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  assert.equal(args.length, 14, "Usage: --history DIR --fork DIR --models FILE --graphs DIR --players DIR --selections FILE --output NEW_FILE");
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].slice(2);
    assert.ok(args[i].startsWith("--") && ["history", "fork", "models", "graphs", "players", "selections", "output"].includes(key) && !options[key]);
    options[key] = resolve(args[i + 1]);
  }
  const report = await loadContributionProvenance(options);
  await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  console.log(`Wrote internal provenance manifest: ${options.output}`);
}
