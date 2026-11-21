import assert from "node:assert/strict";
import { lstat, mkdir, mkdtemp, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  packContributionPlayerRecordCatalog,
  unpackContributionPlayerRecordCatalog,
} from "../app/data/contribution-player-records-compact.mjs";
import { assertAttributionJoin } from "./public-contribution-guards.mjs";
import { promoteStagedPaths } from "./promote-staged-paths.mjs";

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutputDirectory = resolve(siteRoot, "app/data");
const forbiddenPublicText = /(?:[\w.+-]+@[\w.-]+\.[a-z]{2,}|\/Users\/|\/Volumes\/|\/home\/|file:\/\/|[A-Z]:\\|github_pat_|gh[pousr]_|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9._~-]+|Co-authored-by:)/i;

function shortCommitLabel(message, sha) {
  const label = (message ?? "Public commit")
    .split(/\r?\n/, 1)[0]
    .replace(/^(feat|fix|chore|refactor|test|docs)(\([^)]+\))?:\s*/i, "");
  // Presentation only: retain the complete source record and immutable link.
  return forbiddenPublicText.test(label) ? `Public commit ${sha.slice(0, 7)}` : label;
}

function publicGithubUrl(value, label) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    throw new TypeError(`${label} must use a public GitHub URL.`);
  }
  return url.href;
}

function immutableFileHref(evidence, file) {
  if (typeof file.blob_url === "string") {
    return publicGithubUrl(file.blob_url, `${evidence.id}:${file.filename}`);
  }
  if (!evidence.referenceSha) {
    throw new TypeError(
      `Cannot create immutable source URL for ${evidence.id}:${file.filename}.`,
    );
  }
  const path = file.filename
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://github.com/${evidence.repository}/blob/${evidence.referenceSha}/${path}`;
}

function pullRequestNumber(evidence) {
  if (evidence.kind !== "pull-request") {
    return null;
  }
  const match = new URL(evidence.href).pathname.match(/\/pull\/(\d+)$/);
  if (!match) {
    throw new TypeError(`Cannot derive pull-request number from ${evidence.href}.`);
  }
  return Number(match[1]);
}

function buildCanonicalRecords(specs, hydrated, agentBySha) {
  const evidenceByGraph = new Map();
  for (const item of hydrated) {
    const values = evidenceByGraph.get(item.graphId) ?? [];
    values.push(item.evidence);
    evidenceByGraph.set(item.graphId, values);
  }

  return specs.map((spec) => {
    const changes = [...(evidenceByGraph.get(spec.id) ?? [])]
      .sort(
        (left, right) =>
          (left.date ?? "").localeCompare(right.date ?? "") ||
          left.id.localeCompare(right.id),
      )
      .map((evidence) => ({
        id: evidence.id,
        label: evidence.label,
        href: publicGithubUrl(evidence.href, evidence.id),
        availability: evidence.availability,
        integrationStatus: evidence.integrationStatus,
        kind: evidence.kind,
        repository: evidence.repository,
        date: evidence.date ?? null,
        number: pullRequestNumber(evidence),
        referenceSha: evidence.referenceSha,
        commits: evidence.commits.map((commit) => ({
          sha: commit.sha,
          label: shortCommitLabel(commit.commit?.message, commit.sha),
          href: `https://github.com/${evidence.repository}/commit/${commit.sha}`,
          date:
            commit.commit?.author?.date ??
            commit.commit?.committer?.date ??
            null,
          agentId: agentBySha.get(commit.sha) ?? null,
        })),
        files: evidence.files.map((file) => ({
          path: file.filename,
          href: immutableFileHref(evidence, file),
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
        })),
      }));
    const repositoryNames = [
      ...new Set(changes.map((change) => change.repository)),
    ].sort();
    return {
      schemaVersion: 1,
      publicOnly: true,
      id: spec.id,
      repositories: repositoryNames.map((name) => ({
        name,
        href: `https://github.com/${name}`,
      })),
      changes,
    };
  });
}

function assertComplete(records) {
  for (const graph of records) {
    assert.equal(graph.publicOnly, true);
    assert.ok(graph.repositories.length > 0);
    assert.ok(graph.changes.length > 0);
    for (const change of graph.changes) {
      assert.ok(change.commits.length > 0);
      assert.ok(change.files.length > 0);
      for (const commit of change.commits) {
        assert.match(commit.sha, /^[0-9a-f]{40}$/i);
        publicGithubUrl(commit.href, commit.sha);
      }
      for (const file of change.files) {
        assert.ok(file.path.length > 0);
        assert.ok(Number.isSafeInteger(file.additions) && file.additions >= 0);
        assert.ok(Number.isSafeInteger(file.deletions) && file.deletions >= 0);
        assert.equal(file.changes, file.additions + file.deletions);
        publicGithubUrl(file.href, file.path);
      }
    }
  }
}

export function assertPublicSafePlayerRecords(records) {
  const forbiddenKey = /^(authorization|body|email|patch|token)$/i;
  const visit = value => {
    if (typeof value === "string") assert.ok(!forbiddenPublicText.test(value), "Unsafe text in public player records.");
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) {
      assert.ok(!forbiddenKey.test(key), "Forbidden field in public player records."); visit(child);
    }
  };
  visit(records);
}

export async function writeProjectPlayerRecords({
  specs,
  hydrated,
  agentBySha,
  sourceExport,
  sourceExportCompletedAt,
  sourceExportRunId,
  outputDirectory = defaultOutputDirectory,
  operations = {},
}) {
  assertAttributionJoin(hydrated, agentBySha);
  assert.ok(specs.length > 0 && new Set(specs.map((spec) => spec.id)).size === specs.length);
  for (const spec of specs) assert.match(spec.id, /^[a-z][a-z0-9-]*$/);
  assert.ok(typeof sourceExport === "string" && sourceExport.length > 0);
  assert.ok(Number.isFinite(Date.parse(sourceExportCompletedAt)));
  assert.ok(typeof sourceExportRunId === "string" && sourceExportRunId.length > 0);
  const records = buildCanonicalRecords(specs, hydrated, agentBySha);
  assertComplete(records);
  assertPublicSafePlayerRecords(records);
  const compact = packContributionPlayerRecordCatalog(records);
  assert.deepEqual(unpackContributionPlayerRecordCatalog(compact), records);

  const io = { lstat, mkdir, mkdtemp, readFile, rename, writeFile, ...operations };
  const manifest = {
    schemaVersion: 1,
    publicOnly: true,
    generatedAt: new Date().toISOString(),
    sourceExport,
    sourceExportCompletedAt,
    sourceExportRunId,
    graphIds: records.map((record) => record.id),
  };
  const compactSource = `${JSON.stringify(compact)}\n`;
  await io.mkdir(outputDirectory, { recursive: true });
  const staging = await io.mkdtemp(resolve(outputDirectory, ".project-player-records-stage-"));
  const stagedRecords = resolve(staging, "project-player-records");
  const stagedCompact = resolve(staging, "project-player-records.compact.json");
  await io.mkdir(stagedRecords);
  // Wait for every staging write to settle before validation or promotion.
  const writes = await Promise.allSettled([
    io.writeFile(resolve(stagedRecords, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`),
    ...records.map((record) => io.writeFile(resolve(stagedRecords, `${record.id}.json`), `${JSON.stringify(record)}\n`)),
    io.writeFile(stagedCompact, compactSource),
  ]);
  const failures = writes.filter((result) => result.status === "rejected");
  if (failures.length) throw new AggregateError(failures.map((result) => result.reason), "Player generation staging failed; previous output retained.");
  const staged = await Promise.all(records.map(async (record) => JSON.parse(await io.readFile(resolve(stagedRecords, `${record.id}.json`), "utf8"))));
  assertComplete(staged);
  assert.deepEqual(staged, records, "Staged canonical player records changed during writing.");
  assert.deepEqual(JSON.parse(await io.readFile(resolve(stagedRecords, "manifest.json"), "utf8")), manifest);
  assert.deepEqual(unpackContributionPlayerRecordCatalog(JSON.parse(await io.readFile(stagedCompact, "utf8"))), records, "Staged compact player records do not match.");

  await promoteStagedPaths(staging, outputDirectory, [
    { name: "project-player-records", directory: true },
    { name: "project-player-records.compact.json", directory: false },
  ], io);

  return {
    retainedGenerationDirectory: staging,
    bytes: Buffer.byteLength(compactSource),
    graphCount: records.length,
    changeCount: records.reduce(
      (total, record) => total + record.changes.length,
      0,
    ),
    commitCount: records.reduce(
      (total, record) =>
        total +
        record.changes.reduce(
          (changeTotal, change) =>
            changeTotal + change.commits.length,
          0,
        ),
      0,
    ),
    fileCount: records.reduce(
      (total, record) =>
        total +
        record.changes.reduce(
          (changeTotal, change) => changeTotal + change.files.length,
          0,
        ),
      0,
    ),
  };
}
