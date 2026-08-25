import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  packContributionPlayerRecordCatalog,
  unpackContributionPlayerRecordCatalog,
} from "../app/data/contribution-player-records-compact.mjs";

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const canonicalRoot = resolve(siteRoot, "app/data/project-player-records");
const compactPath = resolve(
  siteRoot,
  "app/data/project-player-records.compact.json",
);

function shortCommitLabel(message) {
  return (message ?? "Public commit")
    .split(/\r?\n/, 1)[0]
    .replace(/^(feat|fix|chore|refactor|test|docs)(\([^)]+\))?:\s*/i, "");
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
          label: shortCommitLabel(commit.commit?.message),
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

export async function writeProjectPlayerRecords({
  specs,
  hydrated,
  agentBySha,
  sourceExport,
  sourceExportCompletedAt,
  sourceExportRunId,
}) {
  const records = buildCanonicalRecords(specs, hydrated, agentBySha);
  assertComplete(records);
  const compact = packContributionPlayerRecordCatalog(records);
  assert.deepEqual(unpackContributionPlayerRecordCatalog(compact), records);

  await mkdir(canonicalRoot, { recursive: true });
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
  await Promise.all([
    writeFile(
      resolve(canonicalRoot, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    ),
    ...records.map((record) =>
      writeFile(
        resolve(canonicalRoot, `${record.id}.json`),
        `${JSON.stringify(record)}\n`,
      ),
    ),
    writeFile(compactPath, compactSource),
  ]);

  return {
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
