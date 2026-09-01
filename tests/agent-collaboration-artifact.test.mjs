import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { gzipSync } from "node:zlib";

const root = new URL("../", import.meta.url);
const approvedAccounts = new Set(["mh0pe", "awsmadi"]);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

async function attributionArtifact() {
  const source = await readFile(
    new URL("app/data/agent-attribution.json", root),
    "utf8",
  );
  return { source, data: JSON.parse(source) };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value, keys, context) {
  assert.ok(isRecord(value), `${context} should be an object`);
  assert.deepEqual(
    Object.keys(value).sort(),
    [...keys].sort(),
    `${context} should expose only its public schema`,
  );
}

function visit(value, visitor, path = []) {
  visitor(value, path);

  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, visitor, [...path, index]));
    return;
  }

  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      visit(item, visitor, [...path, key]);
    }
  }
}

function collaborationSection(html) {
  const start = html.indexOf('id="agent-collaboration"');
  const end = html.indexOf('id="frontier"', start);
  assert.ok(start >= 0, "Agent collaboration section should be rendered");
  assert.ok(
    end > start,
    "Agent collaboration should precede fork capabilities",
  );
  return html.slice(start, end);
}

test("publishes the bounded public attribution schema", async () => {
  const { data } = await attributionArtifact();

  assertExactKeys(
    data,
    [
      "agents",
      "commits",
      "coverage",
      "filters",
      "methodology",
      "schemaVersion",
      "snapshot",
    ],
    "Attribution artifact",
  );
  assert.equal(data.schemaVersion, 1);
  assertExactKeys(
    data.snapshot,
    ["accounts", "generatedAt", "publicOnly", "sourceExportGeneratedAt"],
    "Snapshot",
  );
  assert.equal(data.snapshot.publicOnly, true);
  assert.match(data.snapshot.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(
    data.snapshot.accounts.every((account) => approvedAccounts.has(account)),
  );

  assertExactKeys(
    data.methodology,
    [
      "defaultScope",
      "globalShaDeduplication",
      "mergeCommitsExcluded",
      "metricLabel",
      "sharedAgentPolicy",
    ],
    "Methodology",
  );
  assert.equal(
    data.methodology.metricLabel,
    "GitHub-reported added lines in AI-associated commits",
  );
  assert.equal(data.methodology.mergeCommitsExcluded, true);
  assert.equal(data.methodology.globalShaDeduplication, true);
  assert.equal(data.methodology.sharedAgentPolicy, "shared-bucket");

  assertExactKeys(
    data.filters,
    ["metrics", "repositories", "scopes", "surfaces"],
    "Filter dimensions",
  );
  assert.deepEqual(data.filters.surfaces, ["all", "pr", "fork-only"]);
  assert.deepEqual(data.filters.scopes, ["code", "all-text"]);
  assert.deepEqual(data.filters.metrics, ["additions", "commits"]);

  assertExactKeys(
    data.coverage,
    [
      "candidateShas",
      "duplicateOccurrencesRemoved",
      "measuredShas",
      "mergeCommitsExcluded",
      "warnings",
      "zeroDiffCommits",
    ],
    "Coverage",
  );
  assert.ok(data.coverage.candidateShas >= data.coverage.measuredShas);
  assert.ok(Array.isArray(data.coverage.warnings));
  assert.ok(Array.isArray(data.agents) && data.agents.length > 0);
  assert.ok(Array.isArray(data.commits) && data.commits.length > 0);

  for (const [index, agent] of data.agents.entries()) {
    assertExactKeys(
      agent,
      ["aliases", "id", "label", "marker", "provider"],
      `Agent ${index}`,
    );
  }

  const shas = new Set();
  for (const [index, commit] of data.commits.entries()) {
    assertExactKeys(
      commit,
      [
        "account",
        "accounts",
        "additions",
        "agentId",
        "date",
        "deletions",
        "prLinks",
        "repository",
        "repositories",
        "sha",
        "surfaces",
        "url",
      ],
      `Commit ${index}`,
    );
    assert.match(commit.sha, /^[a-f0-9]{40}$/i);
    assert.ok(!shas.has(commit.sha), `Commit ${commit.sha} should be unique`);
    shas.add(commit.sha);
    assert.ok(approvedAccounts.has(commit.account));
    assert.ok(commit.accounts.includes(commit.account));
    assert.ok(
      commit.accounts.every((account) => approvedAccounts.has(account)),
    );
    assert.ok(commit.repositories.includes(commit.repository));
    assert.ok(data.agents.some((agent) => agent.id === commit.agentId));
    const commitUrl = new URL(commit.url);
    const commitUrlMatch = commitUrl.pathname.match(
      /^\/([^/]+\/[^/]+)\/commit\/([a-f0-9]{40})$/i,
    );
    assert.equal(commitUrl.hostname, "github.com");
    assert.ok(
      commitUrlMatch,
      `Commit ${commit.sha} should have a canonical URL`,
    );
    assert.ok(commit.repositories.includes(commitUrlMatch[1]));
    assert.equal(commitUrlMatch[2].toLowerCase(), commit.sha.toLowerCase());
    assertExactKeys(
      commit.additions,
      ["allText", "code"],
      `Commit ${index} additions`,
    );
    assertExactKeys(
      commit.deletions,
      ["allText", "code"],
      `Commit ${index} deletions`,
    );
    assert.ok(commit.additions.allText >= commit.additions.code);
    assert.ok(commit.deletions.allText >= commit.deletions.code);
    assert.ok(
      commit.surfaces.every((surface) =>
        ["pr", "owned-nonfork", "fork-only"].includes(surface),
      ),
    );
    for (const [prIndex, pullRequest] of commit.prLinks.entries()) {
      assertExactKeys(
        pullRequest,
        ["number", "state", "url"],
        `Commit ${index} PR ${prIndex}`,
      );
      assert.match(pullRequest.url, /^https:\/\/github\.com\/.+\/pull\/\d+$/);
      assert.equal(
        Number(new URL(pullRequest.url).pathname.split("/").at(-1)),
        pullRequest.number,
      );
    }
  }
});

test("artifact values contain no private or source-level payloads", async () => {
  const { source, data } = await attributionArtifact();

  assert.doesNotMatch(source, /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  assert.doesNotMatch(source, /Co-authored-by:/i);
  assert.doesNotMatch(source, /\/Users\/|file:\/\/|gh[pousr]_[A-Za-z0-9_]+/i);

  const allowedStringFields = new Set([
    "account",
    "accounts",
    "agentId",
    "aliases",
    "date",
    "defaultScope",
    "generatedAt",
    "id",
    "label",
    "marker",
    "metrics",
    "metricLabel",
    "provider",
    "repository",
    "repositories",
    "scopes",
    "sha",
    "sharedAgentPolicy",
    "sourceExportGeneratedAt",
    "state",
    "surfaces",
    "url",
    "warnings",
  ]);

  visit(data, (value, path) => {
    const key = path.filter((part) => typeof part === "string").at(-1);
    if (typeof value === "string" && key) {
      assert.ok(
        allowedStringFields.has(key),
        `Unexpected public string field "${path.join(".")}"`,
      );
    }
  });
});

test("matches the audited public snapshot totals", async () => {
  const { data } = await attributionArtifact();

  assert.equal(data.coverage.candidateShas, 126);
  assert.equal(data.coverage.duplicateOccurrencesRemoved, 29);
  assert.equal(data.coverage.mergeCommitsExcluded, 8);
  assert.equal(data.coverage.zeroDiffCommits, 10);
  assert.equal(data.coverage.measuredShas, 108);
  assert.deepEqual(data.coverage.warnings, []);
  assert.equal(data.commits.length, data.coverage.measuredShas);

  const totals = data.commits.reduce(
    (sum, commit) => ({
      code: sum.code + commit.additions.code,
      allText: sum.allText + commit.additions.allText,
    }),
    { code: 0, allText: 0 },
  );
  assert.deepEqual(totals, { code: 46_418, allText: 48_104 });

  const byAgent = new Map();
  for (const commit of data.commits) {
    const current = byAgent.get(commit.agentId) ?? {
      commits: 0,
      code: 0,
      allText: 0,
    };
    current.commits += 1;
    current.code += commit.additions.code;
    current.allText += commit.additions.allText;
    byAgent.set(commit.agentId, current);
  }

  assert.deepEqual(Object.fromEntries([...byAgent].sort()), {
    "claude-fable-5": { commits: 16, code: 21_031, allText: 22_494 },
    "claude-opus-4-6": { commits: 10, code: 603, allText: 634 },
    "claude-opus-4-8": { commits: 36, code: 15_418, allText: 15_432 },
    "claude-sonnet-4-6": { commits: 5, code: 5_884, allText: 5_904 },
    "github-copilot": { commits: 41, code: 3_482, allText: 3_640 },
  });
});

test("server-renders the default collaboration explorer as evidence UI", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);

  const html = (await response.text()).replaceAll("<!-- -->", "");
  const section = collaborationSection(html);
  assert.ok(
    html.indexOf('id="work"') < html.indexOf('id="agent-collaboration"'),
    "Agent collaboration should follow selected work",
  );

  assert.match(section, /03 \/ The public record/i);
  assert.match(section, /The work carries its own provenance\./i);
  assert.match(
    section,
    /<details class="attribution-record">(?![^>]*\bopen\b)/i,
  );
  assert.match(section, /Explore the public record/i);
  assert.ok(
    section.indexOf("Explore the public record") <
      section.indexOf("Repository"),
    "The evidence drawer should precede its filters",
  );
  assert.match(
    section,
    /GitHub-reported added lines in AI-associated commits/i,
  );
  assert.match(section, /Repository/i);
  assert.match(section, /Delivery surface/i);
  assert.match(section, /Content scope/i);
  assert.match(section, /Metric/i);
  assert.match(section, /Added lines/i);
  assert.match(section, /All public/i);
  assert.match(section, /Code/i);
  assert.match(section, /Claude Opus 4\.8/i);
  assert.match(section, /Claude Sonnet 4\.6/i);
  assert.match(section, /GitHub Copilot/i);
  assert.match(section, /role="status"/i);
  assert.match(section, /aria-live="polite"/i);
  assert.match(section, /<button\b/i);
  assert.doesNotMatch(section, /<canvas\b/i);
});

test("renders public evidence links and an exact-value table", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);

  const html = (await response.text()).replaceAll("<!-- -->", "");
  const section = collaborationSection(html);
  const publicEvidenceLinks =
    section.match(
      /<a[^>]+href="https:\/\/github\.com\/[^"]+\/(?:commit|pull)\/[^"]+"[^>]*>/gi,
    ) ?? [];

  assert.ok(
    publicEvidenceLinks.length >= 1,
    "Default explorer should link to public commit or PR evidence",
  );
  assert.match(section, /<details\b/i);
  assert.match(section, /<summary\b/i);
  assert.match(section, /<table\b/i);
  assert.match(section, /<caption\b/i);
  assert.match(section, /<thead\b/i);
  assert.match(section, /<tbody\b/i);
  assert.match(section, /<th\b[^>]*scope="col"/i);
  assert.match(section, /opens in a new tab/i);
});

test("keeps attribution data and rendered evidence within performance budgets", async () => {
  const [{ source }, response, packageSource] = await Promise.all([
    attributionArtifact(),
    render("/"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  assert.equal(response.status, 200);

  const html = await response.text();
  const section = collaborationSection(html);
  const openingTags =
    html.match(/<(?!\/|!|\?)[A-Za-z][A-Za-z0-9:-]*(?:\s|>)/g) ?? [];
  const richEvidenceCards =
    section.match(/class="[^"]*\battribution-evidence-item\b[^"]*"/g) ?? [];
  const constellationMarkup =
    html.match(
      /<div[^>]+data-project-constellation="[^"]+"[\s\S]*?<\/svg><\/div>/gi,
    ) ?? [];
  const constellationGlyphs = constellationMarkup.flatMap(
    (markup) => markup.match(/data-node-type=/g) ?? [],
  );
  const constellationDecimals = constellationMarkup.flatMap((markup) =>
    [...markup.matchAll(/-?\d+\.(\d+)/g)].map((match) => match[1].length),
  );

  assert.ok(
    Buffer.byteLength(source) <= 100 * 1024,
    "Attribution JSON should remain at or below 100 KB raw",
  );
  assert.ok(
    gzipSync(source).byteLength <= 20 * 1024,
    "Attribution JSON should remain at or below 20 KB gzip",
  );
  assert.ok(
    Buffer.byteLength(html) <= 400 * 1024,
    "Rendered portfolio with inline contribution graphs should remain at or below 400 KB raw",
  );
  assert.ok(
    gzipSync(html).byteLength <= 52 * 1024,
    "Rendered portfolio with inline contribution graphs should remain at or below 52 KB gzip",
  );
  assert.ok(
    openingTags.length < 3_500,
    `Rendered portfolio with inline SVG graphs should stay below 3,500 elements; found ${openingTags.length}`,
  );
  assert.ok(
    constellationGlyphs.length >= 240,
    `Project constellations should retain visual density; found ${constellationGlyphs.length} rendered glyphs`,
  );
  assert.ok(
    Math.max(...constellationDecimals) <= 6,
    "Project constellation presentation numbers should stay at six decimal places or fewer",
  );
  assert.ok(
    richEvidenceCards.length <= 3,
    "Only representative evidence should use rich cards",
  );
  assert.doesNotMatch(
    section,
    /attribution-evidence-compact/i,
    "Closed evidence disclosure should not server-render repetitive commit rows",
  );

  const packageData = JSON.parse(packageSource);
  const dependencies = new Set([
    ...Object.keys(packageData.dependencies ?? {}),
    ...Object.keys(packageData.devDependencies ?? {}),
  ]);
  for (const chartDependency of [
    "chart.js",
    "echarts",
    "recharts",
    "victory",
  ]) {
    assert.ok(
      !dependencies.has(chartDependency),
      `Semantic traces should not add ${chartDependency}`,
    );
  }
  assert.ok(
    !dependencies.has("d3"),
    "Repository evolution should use modular d3-force, not the D3 umbrella package",
  );
  assert.ok(
    dependencies.has("d3-force"),
    "Repository evolution should retain its build-time d3-force layout dependency",
  );
});

test("invalid URL filters retain a useful server-rendered default", async () => {
  const response = await render(
    "/?agent=unknown&repository=private&surface=invalid&scope=invalid&metric=invalid",
  );
  assert.equal(response.status, 200);

  const html = (await response.text()).replaceAll("<!-- -->", "");
  const section = collaborationSection(html);

  assert.match(section, /Added lines/i);
  assert.match(section, /All public/i);
  assert.match(section, /Code/i);
  assert.doesNotMatch(section, /No measured AI-associated commits match/i);
});
