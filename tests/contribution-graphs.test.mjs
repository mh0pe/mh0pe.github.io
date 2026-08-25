import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildGraph,
  hydrateSampledCommitDetails,
  isAccountDirectedCopilotPullRequest,
} from "../tools/build-project-graphs.mjs";
import {
  assertContributionGraphV2,
  CONTRIBUTION_GRAPH_SCHEMA_VERSION,
} from "../app/data/contribution-graph-contract.mjs";
import { expectedProjectGraphIds } from "./project-catalog.mjs";

const graphDirectory = new URL("../app/data/project-graphs/", import.meta.url);
const generatorUrl = new URL(
  "../tools/build-project-graphs.mjs",
  import.meta.url,
);
const nodeDepths = new Map([
  ["repository", -0.9],
  ["directory", -0.45],
  ["file", 0.05],
  ["evidence", 0.55],
  ["commit", 0.95],
]);
const edgeKinds = new Set([
  "contains-directory",
  "contains-file",
  "contains-subdirectory",
  "documents-change",
  "includes-commit",
  "commit-touches-file",
  "touches-file",
]);

function copilotPullRequestFixture(account = "mh0pe") {
  const repository = `${account}/agent-directed-change`;
  return {
    live: {
      user: { login: "Copilot" },
      head: { repo: { full_name: repository } },
    },
    exported: {
      author: "Copilot",
      search_attributed_accounts: [account],
      search_author_matches_detail: false,
      discoveries: [{ account, kind: "search_author_query" }],
      classification: {
        authored_by_account: false,
        head_repository_owned_by_account: true,
        related_accounts: [account],
      },
      head: {
        repository,
        repository_deleted: false,
        repository_unavailable: false,
      },
    },
  };
}
const availabilityValues = new Set(["upstream", "public-fork"]);
const forbiddenArtifactKeys =
  /^(?:author|body|committer|credential|diff|email|password|patch|secret|token|verification)$/i;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}\b/i;
const secretPatterns = [
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\b(?:authorization\s*:\s*)?bearer\s+[A-Za-z0-9._~+/=-]{20,}\b/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

async function readJson(url) {
  const source = await readFile(url, "utf8");
  return { source, value: JSON.parse(source) };
}

function assertUnique(values, context) {
  assert.equal(
    new Set(values).size,
    values.length,
    `${context} should contain unique values`,
  );
}

function assertPublicGitHubUrl(value, context) {
  assert.equal(typeof value, "string", `${context} should be a URL string`);
  const url = new URL(value);
  assert.equal(url.protocol, "https:", `${context} should use HTTPS`);
  assert.equal(url.hostname, "github.com", `${context} should use GitHub`);
  assert.equal(url.username, "", `${context} should not contain credentials`);
  assert.equal(url.password, "", `${context} should not contain credentials`);
  assert.equal(url.port, "", `${context} should not use a custom port`);
}

function visit(value, visitor, path = []) {
  visitor(value, path);

  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, visitor, [...path, index]));
    return;
  }

  if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      visit(item, visitor, [...path, key]);
    }
  }
}

const { source: manifestSource, value: manifest } = await readJson(
  new URL("manifest.json", graphDirectory),
);
const graphs = new Map(
  await Promise.all(
    manifest.graphIds.map(async (id) => {
      const artifact = await readJson(new URL(`${id}.json`, graphDirectory));
      return [id, artifact];
    }),
  ),
);

test("publishes exactly the expected public graph catalog", async () => {
  assert.equal(manifest.schemaVersion, CONTRIBUTION_GRAPH_SCHEMA_VERSION);
  assert.equal(manifest.publicOnly, true);
  assertUnique(manifest.graphIds, "Manifest graph IDs");
  assert.deepEqual(manifest.graphIds, expectedProjectGraphIds);
  assert.match(manifest.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(
    Number.isFinite(Date.parse(manifest.generatedAt)),
    "Manifest generation time should be a valid ISO date",
  );
  assert.equal(typeof manifest.sourceExport, "string");
  assert.ok(manifest.sourceExport.length > 0);
  assert.ok(Number.isFinite(Date.parse(manifest.sourceExportCompletedAt)));
  assert.equal(typeof manifest.sourceExportRunId, "string");

  const artifactFiles = (await readdir(graphDirectory))
    .filter((file) => file.endsWith(".json") && file !== "manifest.json")
    .map((file) => file.slice(0, -".json".length))
    .sort();
  assert.deepEqual(
    artifactFiles,
    [...expectedProjectGraphIds].sort(),
    "The catalog should not omit graphs or retain stale graph artifacts",
  );
});

test("graph artifacts have valid topology and bounded deterministic positions", () => {
  for (const [graphId, { value: graph }] of graphs) {
    assert.equal(assertContributionGraphV2(graph, graphId), graph);
    assert.equal(graph.schemaVersion, manifest.schemaVersion);
    assert.equal(graph.publicOnly, true);
    assert.equal(graph.id, graphId);
    assert.match(graph.chapterId, /^[a-z][a-z0-9-]*$/);
    assert.ok(graph.title.length > 0);
    assert.ok(graph.impact.length > 0);
    assert.match(graph.caption, /not a claim of literal Git ancestry/i);
    assert.ok(graph.nodes.length > 0, `${graphId} should include nodes`);
    assert.ok(graph.edges.length > 0, `${graphId} should include edges`);
    assert.ok(graph.beats.length > 0, `${graphId} should include evidence`);
    assert.equal(graph.sampling.exactCommitDetails.unavailable, 0);
    assert.ok(graph.sampling.exactCommitDetails.resolved > 0);
    assert.ok(
      graph.edges.some((edge) => edge.kind === "commit-touches-file"),
      `${graphId} should retain exact commit-to-file lineage`,
    );

    assertUnique(
      graph.nodes.map((node) => node.id),
      `${graphId} node IDs`,
    );
    assertUnique(
      graph.edges.map((edge) => edge.id),
      `${graphId} edge IDs`,
    );
    assertUnique(
      graph.beats.map((beat) => beat.id),
      `${graphId} evidence IDs`,
    );
    assertUnique(
      graph.agents.map((agent) => agent.id),
      `${graphId} agent IDs`,
    );

    const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
    const beatsById = new Map(graph.beats.map((beat) => [beat.id, beat]));
    const agentIds = new Set(graph.agents.map((agent) => agent.id));

    for (const node of graph.nodes) {
      assert.ok(nodeDepths.has(node.type), `${node.id} has a known node type`);
      assert.equal(typeof node.label, "string");
      assert.ok(node.label.length > 0, `${node.id} should have a label`);
      assert.match(node.repository, /^[^/\s]+\/[^/\s]+$/);
      assertPublicGitHubUrl(node.href, `${graphId} node ${node.id}`);
      assert.ok(Array.isArray(node.evidenceIds));
      for (const evidenceId of node.evidenceIds) {
        assert.ok(
          beatsById.has(evidenceId),
          `${node.id} references known evidence ${evidenceId}`,
        );
      }

      for (const axis of ["x", "y", "z"]) {
        assert.ok(
          Number.isFinite(node[axis]),
          `${node.id} should have a finite ${axis} coordinate`,
        );
        assert.equal(
          node[axis],
          Number(node[axis].toFixed(4)),
          `${node.id} ${axis} should use stable four-decimal serialization`,
        );
      }
      assert.ok(Math.abs(node.x) <= 2.65, `${node.id} x should be normalized`);
      assert.ok(Math.abs(node.y) <= 1.68, `${node.id} y should be normalized`);
      assert.equal(
        node.z,
        nodeDepths.get(node.type),
        `${node.id} should use semantic depth for ${node.type}`,
      );
      assert.ok(Number.isFinite(node.weight) && node.weight >= 1);

      if (node.path !== undefined) {
        assert.equal(node.type, "file");
        assert.ok(!node.path.startsWith("/"), `${node.id} path is relative`);
        assert.ok(
          !/^[A-Za-z]:[\\/]/.test(node.path),
          `${node.id} path is not a Windows absolute path`,
        );
        assert.ok(
          !node.path.split("/").includes(".."),
          `${node.id} path does not traverse outside its repository`,
        );
      }
      if (node.type === "commit") {
        assert.match(node.sha, /^[a-f0-9]{40}$/i);
        assert.match(new URL(node.href).pathname, /\/commit\/[a-f0-9]{40}$/i);
      }
      if (node.agentId !== null && node.agentId !== undefined) {
        assert.ok(
          agentIds.has(node.agentId),
          `${node.id} references a cataloged agent`,
        );
      }
    }

    for (const edge of graph.edges) {
      assert.ok(edgeKinds.has(edge.kind), `${edge.id} has a known edge kind`);
      assert.ok(nodesById.has(edge.source), `${edge.id} source resolves`);
      assert.ok(nodesById.has(edge.target), `${edge.id} target resolves`);
      if (edge.evidenceId !== undefined) {
        assert.ok(
          beatsById.has(edge.evidenceId),
          `${edge.id} references known evidence`,
        );
      }
      if (edge.kind === "commit-touches-file") {
        const source = nodesById.get(edge.source);
        const target = nodesById.get(edge.target);
        assert.equal(source.type, "commit");
        assert.equal(target.type, "file");
        assert.ok(source.evidenceIds.includes(edge.evidenceId));
        assert.ok(target.evidenceIds.includes(edge.evidenceId));
        assert.equal(typeof edge.status, "string");
        for (const metric of ["additions", "deletions", "changes"]) {
          assert.ok(
            Number.isSafeInteger(edge[metric]) && edge[metric] >= 0,
            `${edge.id} ${metric} comes from exact GitHub commit detail`,
          );
        }
      }
    }

    for (const beat of graph.beats) {
      assert.match(beat.id, /^[a-z0-9][a-z0-9-]*$/);
      assert.ok(availabilityValues.has(beat.availability));
      assert.ok(["pull-request", "commit"].includes(beat.kind));
      assert.match(beat.repository, /^[^/\s]+\/[^/\s]+$/);
      assert.ok(Number.isInteger(beat.commitCount) && beat.commitCount >= 1);
      assert.ok(
        Number.isInteger(beat.changedFileCount) && beat.changedFileCount >= 0,
      );
      assert.ok(Number.isFinite(Date.parse(beat.date)));
      assert.ok(
        ["merged", "open", "closed-unmerged", "direct-commit"].includes(
          beat.integrationStatus,
        ),
      );
      assert.ok(
        Number.isInteger(beat.displayedCommitCount) &&
          beat.displayedCommitCount >= 1,
      );
      assert.ok(
        Number.isInteger(beat.displayedFileCount) &&
          beat.displayedFileCount >= 0,
      );
      assertPublicGitHubUrl(beat.href, `${graphId} evidence ${beat.id}`);
      assert.match(
        new URL(beat.href).pathname,
        beat.kind === "pull-request"
          ? /^\/[^/]+\/[^/]+\/pull\/\d+$/
          : /^\/[^/]+\/[^/]+\/commit\/[a-f0-9]{40}$/i,
      );

      const evidenceNode = nodesById.get(`evidence:${beat.id}`);
      assert.ok(evidenceNode, `${beat.id} should have an evidence node`);
      assert.equal(evidenceNode.href, beat.href);
      assert.equal(evidenceNode.availability, beat.availability);
      assert.ok(
        graph.edges.some(
          (edge) =>
            edge.kind === "documents-change" && edge.target === evidenceNode.id,
        ),
        `${beat.id} should connect its repository to its evidence node`,
      );
    }

    for (const agent of graph.agents) {
      assert.match(agent.id, /^[a-z0-9][a-z0-9-]*$/);
      assert.ok(agent.label.length > 0);
      assert.ok(agent.provider.length > 0);
      assert.ok(Array.isArray(agent.aliases));
      assert.ok(
        Number.isInteger(agent.recordedCommitCount) &&
          agent.recordedCommitCount >= 1,
      );
      assert.equal(agent.attributionScope, "repository-family");
      assert.ok(Number.isInteger(agent.associatedCodeAdditions));
      assert.ok(agent.associatedCodeAdditions >= 0);
    }
  }
});

test("schema v2 validation rejects stale graph-v1 artifacts", () => {
  assert.throws(
    () =>
      assertContributionGraphV2(
        {
          schemaVersion: 1,
          id: "stale-fixture",
          publicOnly: true,
          agents: [],
          nodes: [],
          edges: [],
          beats: [],
        },
        "stale-fixture",
      ),
    /not schema v2/,
  );
});

function validContractFixture() {
  const repository = "mh0pe/public-fixture";
  const evidenceId = "fixture-evidence";
  const sha = "a".repeat(40);
  const node = (id, type, label, evidenceIds = []) => ({
    id,
    type,
    label,
    href: `https://github.com/${repository}`,
    repository,
    evidenceIds,
    weight: 1,
    x: 0,
    y: 0,
    z: 0,
  });
  const repositoryId = `repository:${repository}`;
  const evidenceNodeId = `evidence:${evidenceId}`;
  const commitId = `commit:${evidenceId}:${sha}`;
  const directoryId = `directory:${repository}:src`;
  const fileId = `file:${repository}:src/fixture.ts`;
  const edge = (id, source, target, kind, evidence) => ({
    id,
    source,
    target,
    kind,
    ...(evidence ? { evidenceId: evidence } : {}),
  });
  return {
    schemaVersion: CONTRIBUTION_GRAPH_SCHEMA_VERSION,
    id: "fixture",
    chapterId: "agents",
    title: "Fixture graph",
    impact: "Fixture impact",
    caption: "Fixture caption",
    publicOnly: true,
    sampling: {
      representative: true,
      maxCommitsPerEvidence: 1,
      maxFilesPerEvidence: 1,
      exactCommitDetails: { requested: 1, resolved: 1, unavailable: 0 },
    },
    agents: [],
    nodes: [
      node(repositoryId, "repository", repository),
      {
        ...node(evidenceNodeId, "evidence", "Fixture", [evidenceId]),
        availability: "public-fork",
      },
      node(commitId, "commit", "Fixture commit", [evidenceId]),
      node(directoryId, "directory", "src", [evidenceId]),
      {
        ...node(fileId, "file", "fixture.ts", [evidenceId]),
        path: "src/fixture.ts",
        status: "modified",
      },
    ],
    edges: [
      edge(
        "documents",
        repositoryId,
        evidenceNodeId,
        "documents-change",
        evidenceId,
      ),
      edge("includes", evidenceNodeId, commitId, "includes-commit", evidenceId),
      edge("directory", repositoryId, directoryId, "contains-directory"),
      edge("file", directoryId, fileId, "contains-file"),
      edge("aggregate", evidenceNodeId, fileId, "touches-file", evidenceId),
      {
        ...edge("exact", commitId, fileId, "commit-touches-file", evidenceId),
        status: "modified",
        additions: 2,
        deletions: 1,
        changes: 3,
      },
    ],
    beats: [
      {
        id: evidenceId,
        label: "Fixture",
        href: `https://github.com/${repository}/pull/1`,
        availability: "public-fork",
        integrationStatus: "open",
        kind: "pull-request",
        repository,
        date: "2026-07-25T00:00:00Z",
        commitCount: 1,
        changedFileCount: 1,
        displayedCommitCount: 1,
        displayedFileCount: 1,
        files: [
          {
            nodeId: fileId,
            label: "fixture.ts",
            path: "src/fixture.ts",
            href: `https://github.com/${repository}/blob/fixture/src/fixture.ts`,
            repository,
            status: "modified",
          },
        ],
        exactCommitFileCoverage: {
          sampledCommitCount: 1,
          resolvedCommitCount: 1,
          unavailableCommitCount: 0,
          displayableRelationCount: 1,
          displayedRelationCount: 1,
        },
      },
    ],
  };
}

test("schema v2 accepts repository-root files and fork-merged work", () => {
  const graph = validContractFixture();
  const repositoryNode = graph.nodes.find((node) => node.type === "repository");
  const fileNode = graph.nodes.find((node) => node.type === "file");
  const directoryNode = graph.nodes.find((node) => node.type === "directory");
  const fileEdge = graph.edges.find((edge) => edge.id === "file");

  graph.nodes = graph.nodes.filter((node) => node !== directoryNode);
  graph.edges = graph.edges.filter((edge) => edge.id !== "directory");
  fileEdge.source = repositoryNode.id;
  fileNode.path = "fixture.ts";
  fileNode.href = `https://github.com/${fileNode.repository}/blob/fixture/fixture.ts`;
  graph.beats[0].files[0].path = fileNode.path;
  graph.beats[0].files[0].href = fileNode.href;
  graph.beats[0].integrationStatus = "merged";

  assert.equal(assertContributionGraphV2(graph, "fixture"), graph);
});

test("schema v2 validation rejects malformed runtime topology", async (t) => {
  const cases = [
    ["null node", (graph) => (graph.nodes[0] = null)],
    ["duplicate node", (graph) => graph.nodes.push(graph.nodes[0])],
    ["dangling edge", (graph) => (graph.edges[0].source = "missing")],
    [
      "wrong endpoint types",
      (graph) => (graph.edges[0].kind = "contains-file"),
    ],
    [
      "incomplete exact detail",
      (graph) => {
        graph.sampling.exactCommitDetails = {
          requested: 1,
          resolved: 0,
          unavailable: 1,
        };
        graph.beats[0].exactCommitFileCoverage.resolvedCommitCount = 0;
        graph.beats[0].exactCommitFileCoverage.unavailableCommitCount = 1;
      },
    ],
    [
      "per-beat exact count mismatch",
      (graph) =>
        (graph.beats[0].exactCommitFileCoverage.displayedRelationCount = 0),
    ],
    [
      "sampling budget overflow",
      (graph) => (graph.sampling.maxFilesPerEvidence = 0),
    ],
    [
      "invalid exact change metrics",
      (graph) => (graph.edges.at(-1).changes = 4),
    ],
    [
      "unsupported file status",
      (graph) => (graph.beats[0].files[0].status = "banana"),
    ],
    [
      "file link from another repository",
      (graph) =>
        (graph.beats[0].files[0].href =
          "https://github.com/another-owner/another-repo/blob/fixture/src/fixture.ts"),
    ],
    [
      "file link for another path",
      (graph) =>
        (graph.beats[0].files[0].href =
          "https://github.com/mh0pe/public-fixture/blob/fixture/src/other.ts"),
    ],
  ];

  assert.equal(
    assertContributionGraphV2(validContractFixture(), "fixture").id,
    "fixture",
  );
  for (const [label, mutate] of cases) {
    await t.test(label, () => {
      const graph = validContractFixture();
      mutate(graph);
      assert.throws(() => assertContributionGraphV2(graph, "fixture"));
    });
  }
});

test("graph artifacts contain only public-safe evidence summaries", () => {
  for (const [graphId, { source, value: graph }] of graphs) {
    assert.doesNotMatch(source, /(^|\n)diff --git /m);
    assert.doesNotMatch(source, /(^|\n)@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/m);

    visit(graph, (value, path) => {
      const key = String(path.at(-1) ?? "");
      assert.doesNotMatch(
        key,
        forbiddenArtifactKeys,
        `${graphId} should not publish the ${key} field`,
      );

      if (typeof value !== "string") {
        return;
      }

      assert.doesNotMatch(value, emailPattern, `${graphId} contains no email`);
      for (const pattern of secretPatterns) {
        assert.doesNotMatch(
          value,
          pattern,
          `${graphId} contains no credential material`,
        );
      }
      if (!value.startsWith("https://")) {
        assert.doesNotMatch(
          value,
          /^(?:\/(?:Users|Volumes|home|private|tmp)\/|[A-Za-z]:[\\/]|\\\\)/,
          `${graphId} contains no absolute local paths`,
        );
      }
    });
  }

  assert.doesNotMatch(manifestSource, emailPattern);
  for (const pattern of secretPatterns) {
    assert.doesNotMatch(manifestSource, pattern);
  }
});

test("the generator freezes a seeded fixed-tick d3-force layout", async () => {
  const source = await readFile(generatorUrl, "utf8");

  assert.match(source, /from\s+["']d3-force["']/);
  assert.match(source, /\bforceSimulation\s*\(/);
  assert.match(source, /\bfunction\s+seededRandom\s*\(/);
  assert.match(
    source,
    /\.randomSource\(\s*seededRandom\(\s*hashString\(\s*graph\.id\s*\)\s*\)\s*\)/,
  );
  assert.match(source, /\.stop\(\)\s*;/);
  assert.match(source, /\bsimulation\.tick\(\s*220\s*\)\s*;/);
  assert.match(source, /\.toFixed\(\s*4\s*\)/);
  assert.doesNotMatch(source, /\bMath\.random\s*\(/);
  assert.doesNotMatch(source, /\bsimulation\.on\(\s*["']tick["']/);
  assert.doesNotMatch(source, /\brequestAnimationFrame\s*\(/);
});

function fixtureCommit(repository, index) {
  const sha = index.toString(16).padStart(40, "0");
  return {
    sha,
    html_url: `https://github.com/${repository}/commit/${sha}`,
    commit: {
      message: `Commit ${index}`,
      author: { date: "2026-07-24T12:00:00Z" },
      committer: { date: "2026-07-24T12:00:00Z" },
    },
  };
}

test("sampled commit detail hydration is bounded and fetches at most six commits per evidence", async () => {
  const repository = "mh0pe/public-fixture";
  const items = [0, 20].map((offset, graphIndex) => ({
    graphId: `fixture-${graphIndex}`,
    evidence: {
      repository,
      commits: Array.from({ length: 9 }, (_, index) =>
        fixtureCommit(repository, offset + index + 1),
      ),
    },
  }));
  let activeRequests = 0;
  let peakRequests = 0;
  const requestedShas = [];

  const hydrated = await hydrateSampledCommitDetails(items, async ({ sha }) => {
    requestedShas.push(sha);
    activeRequests += 1;
    peakRequests = Math.max(peakRequests, activeRequests);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 2));
    activeRequests -= 1;
    return {
      ...fixtureCommit(repository, Number.parseInt(sha, 16)),
      sha,
      files: [
        {
          filename: `src/${sha.slice(-2)}.ts`,
          status: "modified",
          additions: 4,
          deletions: 2,
          changes: 6,
        },
      ],
    };
  });

  assert.equal(requestedShas.length, 12);
  assert.equal(new Set(requestedShas).size, requestedShas.length);
  assert.ok(peakRequests > 1, "commit details should hydrate concurrently");
  assert.ok(peakRequests <= 5, "commit detail concurrency remains bounded");
  for (const { evidence } of hydrated) {
    assert.equal(evidence.sampledCommits.length, 6);
    assert.deepEqual(evidence.exactCommitDetailCoverage, {
      requested: 6,
      resolved: 6,
      unavailable: 0,
    });
    assert.ok(
      evidence.sampledCommits.every(
        (entry) =>
          entry.exactFiles.length === 1 && entry.exactFiles[0].changes === 6,
      ),
    );
  }
});

test("the graph preserves aggregate evidence files and only links exact sampled commit relations", () => {
  const repository = "mh0pe/public-fixture";
  const entry = fixtureCommit(repository, 42);
  const evidenceHref = `https://github.com/${repository}/pull/42`;
  const aggregateFiles = [
    {
      filename: "src/proven.ts",
      blob_url: `https://github.com/${repository}/blob/${entry.sha}/src/proven.ts`,
      status: "modified",
      additions: 20,
      deletions: 5,
      changes: 25,
    },
    {
      filename: "src/aggregate-only.ts",
      blob_url: `https://github.com/${repository}/blob/${entry.sha}/src/aggregate-only.ts`,
      status: "added",
      additions: 12,
      deletions: 0,
      changes: 12,
    },
  ];
  const graph = buildGraph(
    {
      id: "fixture",
      chapterId: "fixture",
      title: "Fixture",
      impact: "Fixture impact",
    },
    [
      {
        id: "fixture-evidence",
        label: "Fixture evidence",
        href: evidenceHref,
        availability: "public-fork",
        integrationStatus: "open",
        kind: "pull-request",
        repository,
        date: "2026-07-24T12:00:00Z",
        referenceSha: entry.sha,
        files: aggregateFiles,
        commits: [entry],
        sampledCommits: [
          {
            ...entry,
            exactFiles: [
              {
                filename: "src/proven.ts",
                status: "modified",
                additions: 4,
                deletions: 2,
                changes: 6,
              },
            ],
          },
        ],
      },
    ],
    new Map(),
    new Map([
      [
        evidenceHref,
        {
          reported_counts: {
            changed_files: aggregateFiles.length,
          },
        },
      ],
    ]),
    [],
  );

  const evidenceEdges = graph.edges.filter(
    (edge) => edge.kind === "touches-file",
  );
  const exactEdges = graph.edges.filter(
    (edge) => edge.kind === "commit-touches-file",
  );
  assert.equal(evidenceEdges.length, 2, "aggregate PR files remain visible");
  assert.equal(exactEdges.length, 1);
  assert.deepEqual(
    {
      source: exactEdges[0].source,
      target: exactEdges[0].target,
      evidenceId: exactEdges[0].evidenceId,
      status: exactEdges[0].status,
      additions: exactEdges[0].additions,
      deletions: exactEdges[0].deletions,
      changes: exactEdges[0].changes,
    },
    {
      source: `commit:fixture-evidence:${entry.sha}`,
      target: `file:${repository}:src/proven.ts`,
      evidenceId: "fixture-evidence",
      status: "modified",
      additions: 4,
      deletions: 2,
      changes: 6,
    },
  );
  assert.ok(
    !exactEdges.some((edge) => edge.target.endsWith("aggregate-only.ts")),
    "aggregate evidence does not masquerade as exact commit causality",
  );
  assert.equal(graph.beats[0].changedFileCount, 2);
  assert.equal(graph.beats[0].displayedFileCount, 2);
  assert.deepEqual(
    graph.beats[0].files.map(({ path, href, status }) => ({
      path,
      href,
      status,
    })),
    [
      {
        path: "src/proven.ts",
        href: `https://github.com/${repository}/blob/${entry.sha}/src/proven.ts`,
        status: "modified",
      },
      {
        path: "src/aggregate-only.ts",
        href: `https://github.com/${repository}/blob/${entry.sha}/src/aggregate-only.ts`,
        status: "added",
      },
    ],
  );
});

test("accepts account-directed Copilot pull requests without changing GitHub authorship", () => {
  for (const account of ["mh0pe", "awsmadi"]) {
    const fixture = copilotPullRequestFixture(account);
    assert.equal(
      isAccountDirectedCopilotPullRequest(fixture.live, fixture.exported),
      true,
      `${account} should retain account direction while Copilot remains the recorded author`,
    );
    assert.equal(fixture.exported.classification.authored_by_account, false);
  }
});

test("rejects ambiguous or unsupported Copilot attribution", async (t) => {
  const cases = [
    [
      "another live bot",
      (value) => (value.live.user.login = "dependabot[bot]"),
    ],
    ["another exported bot", (value) => (value.exported.author = "some-bot")],
    [
      "no search attribution",
      (value) => (value.exported.search_attributed_accounts = []),
    ],
    [
      "two portfolio accounts",
      (value) =>
        (value.exported.search_attributed_accounts = ["mh0pe", "awsmadi"]),
    ],
    [
      "portfolio plus third-party account",
      (value) =>
        (value.exported.search_attributed_accounts = ["mh0pe", "someone"]),
    ],
    [
      "unknown account",
      (value) => (value.exported.search_attributed_accounts = ["someone"]),
    ],
    [
      "conflicting search discovery",
      (value) => (value.exported.discoveries[0].account = "awsmadi"),
    ],
    [
      "matching detail author flag",
      (value) => (value.exported.search_author_matches_detail = true),
    ],
    [
      "account-authored classification",
      (value) => (value.exported.classification.authored_by_account = true),
    ],
    [
      "head not account owned",
      (value) =>
        (value.exported.classification.head_repository_owned_by_account = false),
    ],
    [
      "ambiguous related accounts",
      (value) =>
        (value.exported.classification.related_accounts = ["mh0pe", "someone"]),
    ],
    [
      "exported head owned elsewhere",
      (value) =>
        (value.exported.head.repository = "someone/agent-directed-change"),
    ],
    [
      "live and exported heads disagree",
      (value) => (value.live.head.repo.full_name = "mh0pe/different-change"),
    ],
    [
      "deleted head",
      (value) => (value.exported.head.repository_deleted = true),
    ],
    [
      "unavailable head",
      (value) => (value.exported.head.repository_unavailable = true),
    ],
  ];

  for (const [label, mutate] of cases) {
    await t.test(label, () => {
      const fixture = copilotPullRequestFixture();
      mutate(fixture);
      assert.equal(
        isAccountDirectedCopilotPullRequest(fixture.live, fixture.exported),
        false,
      );
    });
  }
});
