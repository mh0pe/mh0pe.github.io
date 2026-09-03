import assert from "node:assert/strict";
import test from "node:test";
import { tsImport } from "tsx/esm/api";

const model = await tsImport(
  new URL("../app/components/attribution-model.ts", import.meta.url).href,
  import.meta.url,
);

const fixture = {
  schemaVersion: 1,
  snapshot: {
    generatedAt: "2026-07-23T00:00:00Z",
    sourceExportGeneratedAt: "2026-07-23T00:00:00Z",
    accounts: ["public-account"],
    publicOnly: true,
  },
  methodology: {
    metricLabel: "GitHub-reported added lines in AI-associated commits",
    mergeCommitsExcluded: true,
    globalShaDeduplication: true,
    defaultScope: "code",
    sharedAgentPolicy: "shared-bucket",
  },
  filters: {
    repositories: ["public-account/alpha", "public-account/beta"],
    surfaces: ["all", "pr", "fork-only"],
    scopes: ["code", "all-text"],
    metrics: ["additions", "commits"],
  },
  agents: [
    {
      id: "agent-a",
      label: "Agent A",
      provider: "Provider A",
      aliases: [],
      marker: "A",
    },
    {
      id: "agent-b",
      label: "Agent B",
      provider: "Provider B",
      aliases: [],
      marker: "B",
    },
  ],
  commits: [
    {
      sha: "a".repeat(40),
      url: `https://github.com/public-account/alpha/commit/${"a".repeat(40)}`,
      date: "2026-07-23T00:00:00Z",
      repository: "public-account/alpha",
      repositories: ["public-account/alpha"],
      account: "public-account",
      accounts: ["public-account"],
      agentId: "agent-a",
      surfaces: ["pr"],
      prLinks: [],
      additions: { code: 100, allText: 120 },
      deletions: { code: 10, allText: 12 },
    },
    {
      sha: "a".repeat(40),
      url: `https://github.com/public-account/alpha/commit/${"a".repeat(40)}`,
      date: "2026-07-23T00:00:00Z",
      repository: "public-account/alpha",
      repositories: ["public-account/alpha"],
      account: "public-account",
      accounts: ["public-account"],
      agentId: "agent-a",
      surfaces: ["pr"],
      prLinks: [],
      additions: { code: 100, allText: 120 },
      deletions: { code: 10, allText: 12 },
    },
    {
      sha: "b".repeat(40),
      url: `https://github.com/public-account/beta/commit/${"b".repeat(40)}`,
      date: "2026-07-22T00:00:00Z",
      repository: "public-account/beta",
      repositories: ["public-account/beta"],
      account: "public-account",
      accounts: ["public-account"],
      agentId: "agent-b",
      surfaces: ["fork-only"],
      prLinks: [],
      additions: { code: 50, allText: 80 },
      deletions: { code: 5, allText: 8 },
    },
  ],
  coverage: {
    candidateShas: 2,
    measuredShas: 2,
    duplicateOccurrencesRemoved: 1,
    mergeCommitsExcluded: 0,
    zeroDiffCommits: 0,
    warnings: [],
  },
};

test("URL parsing accepts public dimensions and rejects invalid values", () => {
  const {
    DEFAULT_ATTRIBUTION_FILTERS,
    parseAttributionSearch,
    serializeAttributionSearch,
  } = model;

  assert.deepEqual(
    parseAttributionSearch(
      "?agent=unknown&repository=private&surface=invalid&scope=invalid&metric=invalid",
      fixture,
    ),
    DEFAULT_ATTRIBUTION_FILTERS,
  );

  const filters = parseAttributionSearch(
    "?agent=agent-b&repository=public-account%2Fbeta&surface=fork-only&scope=all-text&metric=commits",
    fixture,
  );
  assert.deepEqual(filters, {
    repository: "public-account/beta",
    surface: "fork-only",
    scope: "all-text",
    metric: "commits",
    agent: "agent-b",
  });

  const serialized = new URLSearchParams(
    serializeAttributionSearch(filters).slice(1),
  );
  assert.equal(serialized.get("agent"), "agent-b");
  assert.equal(serialized.get("repository"), "public-account/beta");
  assert.equal(serialized.get("surface"), "fork-only");
  assert.equal(serialized.get("scope"), "all-text");
  assert.equal(serialized.get("metric"), "commits");
  assert.equal(serializeAttributionSearch(DEFAULT_ATTRIBUTION_FILTERS), "");
  assert.equal(
    parseAttributionSearch(
      "?campaign=portfolio&repository=public-account%2Falpha",
      fixture,
    ).repository,
    "public-account/alpha",
  );
});

test("filter math deduplicates SHAs and reconciles percentages", () => {
  const {
    aggregateAttribution,
    DEFAULT_ATTRIBUTION_FILTERS,
    filterAttributionCommits,
  } = model;

  assert.equal(
    filterAttributionCommits(fixture, DEFAULT_ATTRIBUTION_FILTERS).length,
    2,
  );

  const rows = aggregateAttribution(fixture, DEFAULT_ATTRIBUTION_FILTERS);
  assert.deepEqual(
    rows.map((row) => ({
      id: row.agent.id,
      additions: row.additions,
      commits: row.commits,
      value: row.value,
    })),
    [
      { id: "agent-a", additions: 100, commits: 1, value: 100 },
      { id: "agent-b", additions: 50, commits: 1, value: 50 },
    ],
  );
  assert.ok(Math.abs(rows[0].percentage - 66.6666666667) < 0.000001);
  assert.ok(Math.abs(rows[1].percentage - 33.3333333333) < 0.000001);
  assert.ok(
    Math.abs(
      rows.reduce((total, row) => total + row.percentage, 0) - 100,
    ) < 0.000001,
  );
});

test("surface and scope filters change the distribution deterministically", () => {
  const { aggregateAttribution, DEFAULT_ATTRIBUTION_FILTERS } = model;
  const forkRows = aggregateAttribution(fixture, {
    ...DEFAULT_ATTRIBUTION_FILTERS,
    surface: "fork-only",
    scope: "all-text",
  });

  assert.equal(forkRows.length, 1);
  assert.equal(forkRows[0].agent.id, "agent-b");
  assert.equal(forkRows[0].additions, 80);
  assert.equal(forkRows[0].percentage, 100);

  const commitRows = aggregateAttribution(fixture, {
    ...DEFAULT_ATTRIBUTION_FILTERS,
    metric: "commits",
  });
  assert.deepEqual(
    commitRows.map((row) => [row.agent.id, row.value, row.percentage]),
    [
      ["agent-a", 1, 50],
      ["agent-b", 1, 50],
    ],
  );
});

test("agent focus narrows evidence without hiding the comparison chart", () => {
  const {
    aggregateAttribution,
    attributionEvidence,
    DEFAULT_ATTRIBUTION_FILTERS,
  } = model;
  const focusedFilters = {
    ...DEFAULT_ATTRIBUTION_FILTERS,
    agent: "agent-b",
  };

  assert.equal(aggregateAttribution(fixture, focusedFilters).length, 2);
  const evidence = attributionEvidence(fixture, focusedFilters);
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].agentId, "agent-b");
});

test("v2 keeps models distinct and omits platform-only rows from model totals", () => {
  const {
    aggregateAttribution,
    attributionModels,
    DEFAULT_ATTRIBUTION_FILTERS,
    modelIdsForCommit,
    readAgentAttributionData,
  } = model;
  const data = readAgentAttributionData({
    ...fixture,
    schemaVersion: 2,
    methodology: {
      ...fixture.methodology,
      modelSignalPolicy: "recorded-models-with-platform-fallback",
    },
    agents: [
      {
        id: "model-a",
        label: "Model A",
        provider: "Provider A",
        aliases: [],
        marker: "circle",
        kind: "model",
      },
      {
        id: "model-b",
        label: "Model B",
        provider: "Provider B",
        aliases: [],
        marker: "diamond",
        kind: "model",
      },
      {
        id: "platform-a",
        label: "Platform A",
        provider: "Platform A",
        aliases: [],
        marker: "ring",
        kind: "platform",
      },
      {
        id: "shared",
        label: "Shared",
        provider: "Multiple",
        aliases: [],
        marker: "hexagon",
        kind: "aggregate",
      },
    ],
    commits: [
      {
        ...fixture.commits[0],
        agentId: "model-a",
        modelIds: ["model-a"],
        platformIds: ["platform-a"],
      },
      {
        ...fixture.commits[2],
        agentId: "platform-a",
        modelIds: [],
        platformIds: ["platform-a"],
        additions: { code: 30, allText: 30 },
      },
      {
        ...fixture.commits[2],
        sha: "c".repeat(40),
        url: `https://github.com/public-account/beta/commit/${"c".repeat(40)}`,
        agentId: "shared",
        modelIds: ["model-a", "model-b"],
        platformIds: [],
        additions: { code: 60, allText: 60 },
      },
    ],
  });

  assert.deepEqual(
    attributionModels(data).map((entry) => [entry.id, entry.kind]),
    [
      ["model-a", "model"],
      ["model-b", "model"],
    ],
  );
  assert.deepEqual(modelIdsForCommit(data, data.commits[1]), []);
  assert.deepEqual(
    aggregateAttribution(data, DEFAULT_ATTRIBUTION_FILTERS).map((row) => [
      row.agent.id,
      row.additions,
      row.commits,
    ]),
    [
      ["model-a", 130, 1.5],
      ["model-b", 30, 0.5],
    ],
  );
});
