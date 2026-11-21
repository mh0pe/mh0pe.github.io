import assert from "node:assert/strict";
import test from "node:test";
import { buildGraph } from "../tools/build-project-graphs.mjs";
import { assertContributionGraphV2 } from "../app/data/contribution-graph-contract.mjs";
import { packContributionGraphCatalog, unpackContributionGraphCatalog } from "../app/data/contribution-graph-compact.mjs";

const spec = { id: "budget-fixture", chapterId: "work", title: "Work", impact: "Complete contributions" };
function fixture(count = 22, shared = false) {
  return Array.from({ length: count }, (_, i) => {
    const repository = `mh0pe/project-${i % 2}`, referenceSha = (i + 1).toString(16).padStart(40, "0");
    const files = Array.from({ length: 10 }, (_, j) => {
      const filename = `src/${shared ? "shared" : `project-${i}`}/deep/${j}.ts`;
      return { filename, blob_url: `https://github.com/${repository}/blob/${referenceSha}/${filename}`, status: "modified", additions: j + 1, deletions: 1, changes: j + 2 };
    });
    const commits = Array.from({ length: 6 }, (_, j) => {
      const sha = (i * 10 + j + 1).toString(16).padStart(40, "0");
      return { sha, html_url: `https://github.com/${repository}/commit/${sha}`, commit: { message: `Change ${j}`, author: { date: "2026-10-10T00:00:00Z" } }, exactFiles: files };
    });
    return { id: `change-${i}`, label: `Contribution ${i}`, href: `https://github.com/${repository}/pull/${i + 1}`, kind: "pull-request", availability: "upstream", integrationStatus: "merged", repository, referenceSha, date: "2026-10-10T00:00:00Z", commits, sampledCommits: commits, files, exactCommitDetailCoverage: { requested: 6, resolved: 6, unavailable: 0 } };
  });
}

for (const shared of [false, true]) test(`global visual budget preserves every contribution with ${shared ? "shared" : "deep unique"} paths`, () => {
  const evidence = fixture(22, shared), before = structuredClone(evidence);
  const graph = buildGraph(spec, evidence, new Map(), new Map(), []);
  assert.ok(graph.nodes.length <= 100, `${graph.nodes.length} nodes`);
  assert.ok(graph.edges.length <= 180, `${graph.edges.length} edges`);
  assert.equal(graph.beats.length, evidence.length);
  assert.ok(graph.beats.every(beat => beat.displayedCommitCount >= 1));
  for (const beat of graph.beats) {
    assert.equal(beat.commitCount, 6); assert.equal(beat.changedFileCount, 10);
  }
  assertContributionGraphV2(graph, spec.id);
  assert.deepEqual(unpackContributionGraphCatalog(packContributionGraphCatalog([graph])), [graph]);
  assert.deepEqual(evidence, before, "Full activity records and hydrated details must remain untouched.");
  assert.deepEqual(buildGraph(spec, evidence.slice().reverse(), new Map(), new Map(), []), graph);
});

test("a mandatory contribution backbone that cannot fit fails explicitly", () => {
  assert.throws(() => buildGraph(spec, fixture(51), new Map(), new Map(), []), /mandatory.*budget/i);
});

test("small complete graphs retain all existing samples", () => {
  const evidence = fixture(1);
  const graph = buildGraph(spec, evidence, new Map(), new Map(), []);
  assert.equal(graph.beats[0].displayedCommitCount, 6);
  assert.equal(graph.beats[0].displayedFileCount, 10);
  assertContributionGraphV2(graph, spec.id);
});

test("an exact-fit backbone preserves complete files outside the visual sample", () => {
  const evidence = fixture(49), before = structuredClone(evidence);
  const graph = buildGraph(spec, evidence, new Map(), new Map(), []);
  assert.equal(graph.nodes.length, 100);
  assert.equal(graph.edges.length, 98);
  assert.ok(graph.beats.every(beat => beat.displayedCommitCount === 1 && beat.displayedFileCount === 0));
  assert.equal(evidence.reduce((sum, change) => sum + change.files.length, 0), 490);
  assert.deepEqual(evidence, before);
  assertContributionGraphV2(graph, spec.id);
});

test("shared files respect the connection budget before exhausting nodes", () => {
  const evidence = fixture(33, true).map(item => ({
    ...item,
    sampledCommits: item.commits.slice(0, 1),
    exactCommitDetailCoverage: { requested: 1, resolved: 1, unavailable: 0 },
  }));
  const graph = buildGraph(spec, evidence, new Map(), new Map(), []);
  assert.ok(graph.nodes.length < 100);
  assert.ok(graph.edges.length <= 180);
  assert.equal(graph.beats.length, 33);
  assert.ok(graph.beats.some(beat => beat.displayedFileCount < 10));
  assertContributionGraphV2(graph, spec.id);
});

test("zero-file changes retain every contribution and complete commit record", () => {
  const evidence = fixture().map(item => ({
    ...item,
    files: [],
    sampledCommits: item.commits.map(commit => ({ ...commit, exactFiles: [] })),
  }));
  const before = structuredClone(evidence);
  const graph = buildGraph(spec, evidence, new Map(), new Map(), []);
  assert.ok(graph.nodes.length <= 100 && graph.edges.length <= 180);
  assert.equal(graph.beats.length, 22);
  assert.ok(graph.beats.every(beat => beat.displayedFileCount === 0 && beat.displayedCommitCount >= 1));
  assert.equal(evidence.reduce((sum, change) => sum + change.commits.length, 0), 132);
  assert.deepEqual(evidence, before);
  assertContributionGraphV2(graph, spec.id);
});
