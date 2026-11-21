import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { brotliCompressSync, gzipSync } from "node:zlib";
import test from "node:test";

import {
  packContributionPlayerRecordCatalog,
  unpackContributionPlayerRecordCatalog,
} from "../app/data/contribution-player-records-compact.mjs";

const recordRoot = new URL("../app/data/project-player-records/", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("manifest.json", recordRoot), "utf8"),
);
const canonicalBuffers = await Promise.all(
  manifest.graphIds.map((graphId) =>
    readFile(new URL(`${graphId}.json`, recordRoot)),
  ),
);
const canonicalRecords = canonicalBuffers.map((buffer) =>
  JSON.parse(buffer.toString("utf8")),
);
const compactBuffer = await readFile(
  new URL("../app/data/project-player-records.compact.json", import.meta.url),
);
const compactCatalog = JSON.parse(compactBuffer.toString("utf8"));

test("compact player catalog reverses to every complete public record", () => {
  assert.deepEqual(
    unpackContributionPlayerRecordCatalog(compactCatalog),
    canonicalRecords,
  );
  assert.deepEqual(
    packContributionPlayerRecordCatalog(canonicalRecords),
    compactCatalog,
  );

  const totals = canonicalRecords.reduce(
    (result, graph) => {
      assert.equal(graph.publicOnly, true);
      result.changes += graph.changes.length;
      for (const change of graph.changes) {
        result.commits += change.commits.length;
        result.files += change.files.length;
      }
      return result;
    },
    { changes: 0, commits: 0, files: 0 },
  );
  assert.deepEqual(totals, { changes: 73, commits: 1369, files: 3010 });
  const workspace = canonicalRecords.find((record) => record.id === "ash-workspace");
  assert.ok(workspace);
  assert.equal(canonicalRecords.length, 9);
  assert.equal(workspace.changes.length, 3);
  assert.deepEqual(workspace.changes.map((change) => change.number).sort((a, b) => a - b), [460, 462, 478]);
  const workspaceCommits = workspace.changes.flatMap((change) => change.commits);
  assert.equal(workspaceCommits.length, 33, "PR memberships retain overlapping commits.");
  assert.equal(new Set(workspaceCommits.map((commit) => commit.sha)).size, 26, "Shared commits are not distinct authored changes.");
  assert.equal(workspace.changes.reduce((count, change) => count + change.files.length, 0), 93);
  assert.deepEqual(
    { changes: totals.changes - 3, commits: totals.commits - workspaceCommits.length, files: totals.files - 93 },
    { changes: 70, commits: 1336, files: 2917 },
    "The refreshed eight groups retain every complete current record.",
  );
});

test("compact player catalog preserves deleted-file base references", () => {
  const headSha = "a".repeat(40);
  const baseSha = "b".repeat(40);
  const records = [
    {
      schemaVersion: 1,
      publicOnly: true,
      id: "deleted-files",
      repositories: [
        { name: "example/repo", href: "https://github.com/example/repo" },
      ],
      changes: [
        {
          id: "change-1",
          label: "Remove retired fixture",
          href: "https://github.com/example/repo/pull/1",
          availability: "public-fork",
          integrationStatus: "open",
          kind: "pull-request",
          repository: "example/repo",
          date: null,
          number: 1,
          referenceSha: headSha,
          commits: [
            {
              sha: headSha,
              label: "Remove retired fixture",
              href: `https://github.com/example/repo/commit/${headSha}`,
              date: null,
              agentId: null,
            },
          ],
          files: [
            {
              path: "fixtures/retired.yml",
              href: `https://github.com/example/repo/blob/${baseSha}/fixtures%2Fretired.yml`,
              status: "removed",
              additions: 0,
              deletions: 1,
              changes: 1,
            },
          ],
        },
      ],
    },
  ];

  const compact = packContributionPlayerRecordCatalog(records);
  assert.equal(compact.v, 3);
  assert.deepEqual(unpackContributionPlayerRecordCatalog(compact), records);

  compact.g[0][2][0][10][0][5] = "not-a-sha";
  assert.throws(
    () => unpackContributionPlayerRecordCatalog(compact),
    /invalid file reference SHA/,
  );
});

test("complete player catalog stays compact in raw and transport form", () => {
  const canonicalBuffer = Buffer.concat(canonicalBuffers);

  assert.ok(compactBuffer.byteLength <= canonicalBuffer.byteLength * 0.35);
  assert.ok(
    gzipSync(compactBuffer).byteLength <=
      gzipSync(canonicalBuffer).byteLength * 0.75,
  );
  assert.ok(
    brotliCompressSync(compactBuffer).byteLength <=
      brotliCompressSync(canonicalBuffer).byteLength * 0.8,
  );
});
