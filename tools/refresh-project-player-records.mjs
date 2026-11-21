import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import { assertContributionGraphV2 } from "../app/data/contribution-graph-contract.mjs";
import { writeProjectPlayerRecords } from "./build-project-player-records.mjs";
import {
  assertFullHistoryRefreshTarget,
  assertAttributionJoin,
  assertPortfolioCommit,
  assertPortfolioPullRequest,
  assertPublicRepositories,
  assertPublicSource,
  attributionBySha,
  readPublicPullRequestExport,
  fetchPublicCommitDetail,
  fetchPublicPullRequestCommits,
  assertPullRequestContentComplete,
} from "./public-contribution-guards.mjs";

const execFileAsync = promisify(execFile);
const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const graphRoot = resolve(siteRoot, "app/data/project-graphs");

async function ghJson(endpoint, { paged = false, flattenPages = true } = {}) {
  const args = ["api"];
  if (paged) {
    args.push("--paginate", "--slurp");
  }
  args.push(endpoint);
  const { stdout } = await execFileAsync("gh", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const parsed = JSON.parse(stdout);
  return paged && flattenPages ? parsed.flat() : parsed;
}

async function mapLimit(values, limit, worker) {
  const results = new Array(values.length);
  let cursor = 0;
  async function consume() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(values[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, consume),
  );
  return results;
}

function parsePullRequestNumber(beat) {
  const url = new URL(beat.href);
  const match = url.pathname.match(/\/pull\/(\d+)$/);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    !match || url.href !== `https://github.com/${beat.repository}/pull/${match[1]}`
  ) {
    throw new TypeError(`Invalid public pull-request URL ${beat.href}.`);
  }
  return Number(match[1]);
}

function parseCommitSha(beat) {
  const url = new URL(beat.href);
  const match = url.pathname.match(/\/commit\/([0-9a-f]{40})$/i);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    !match || url.href !== `https://github.com/${beat.repository}/commit/${match[1]}`
  ) {
    throw new TypeError(`Invalid public commit URL ${beat.href}.`);
  }
  return match[1];
}

async function hydrateBeat(graphId, beat, fetchJson, pullRequest) {
  if (beat.kind === "commit") {
    const sha = parseCommitSha(beat);
    const detail = await fetchPublicCommitDetail(beat.repository, sha, fetchJson);
    assert.equal(detail.sha, sha, "GitHub commit detail does not match the requested SHA.");
    assertPortfolioCommit(beat, detail);
    return {
      graphId,
      evidence: {
        ...beat,
        commits: [detail],
        files: detail.files ?? [],
        referenceSha: detail.sha,
      },
    };
  }

  const number = parsePullRequestNumber(beat);
  const [commits, files] = await Promise.all([
    fetchPublicPullRequestCommits(beat.repository, number, pullRequest, fetchJson),
    fetchJson(`repos/${beat.repository}/pulls/${number}/files?per_page=100`, {
      paged: true, cache: false,
    }),
  ]);
  assertPullRequestContentComplete(pullRequest, commits, files);
  return {
    graphId,
    evidence: {
      ...beat,
      commits,
      files,
      referenceSha:
        pullRequest.head?.sha ?? commits.at(-1)?.sha ?? pullRequest.base?.sha,
    },
  };
}

export async function refreshProjectPlayerRecords({
  manifest, attribution: input, graphs, historyManifest, pullRequests, sourceExport,
  fetchJson = ghJson, writeRecords = writeProjectPlayerRecords,
}) {
  assertFullHistoryRefreshTarget(manifest);
  const attribution = assertPublicSource({ attribution: input, historyManifest, manifest, sourceExport });
  const agentBySha = attributionBySha(attribution);
  assert.ok(Array.isArray(pullRequests), "Public pull-request export is missing.");
  assert.deepEqual(graphs.map((graph) => graph.id), manifest.graphIds, "Graphs do not match the manifest.");
  graphs.forEach((graph) => assertContributionGraphV2(graph, graph.id));
  const prByUrl = new Map(pullRequests.map((pr) => [pr.html_url, pr]));
  const beats = graphs.flatMap((graph) => graph.beats.map((beat) => ({ graphId: graph.id, beat })));
  // Validate URL/repository identity and the export before any live hydration.
  for (const { beat } of beats) {
    if (beat.kind === "commit") parseCommitSha(beat);
    else {
      parsePullRequestNumber(beat);
      assert.ok(prByUrl.has(beat.href), `Missing public export record for ${beat.href}.`);
    }
  }
  const repositories = beats.flatMap(({ beat }) => [beat.repository, prByUrl.get(beat.href)?.head?.repository].filter(Boolean));
  await assertPublicRepositories(repositories, fetchJson);
  const livePullRequests = new Map();
  for (const { beat } of beats.filter(({ beat }) => beat.kind === "pull-request")) {
    if (livePullRequests.has(beat.href)) continue;
    const detail = await fetchJson(`repos/${beat.repository}/pulls/${parsePullRequestNumber(beat)}`, { cache: false });
    assert.equal(detail.html_url, beat.href, "GitHub pull-request detail does not match the requested URL.");
    assert.equal(detail.base?.repo?.full_name, beat.repository, "GitHub pull-request base does not match the selected repository.");
    assertPortfolioPullRequest(beat, detail, prByUrl.get(beat.href));
    // A branch may have moved or changed visibility since the public export.
    const headRepository = detail.head?.repo?.full_name;
    assert.ok(headRepository, `Missing live public head repository for ${beat.href}.`);
    await assertPublicRepositories([headRepository], fetchJson);
    livePullRequests.set(beat.href, detail);
  }
  const hydrated = await mapLimit(beats, 5, ({ graphId, beat }) =>
    hydrateBeat(graphId, beat, fetchJson, livePullRequests.get(beat.href)),
  );
  const join = assertAttributionJoin(hydrated, agentBySha);
  const result = await writeRecords({
    specs: graphs.map((graph) => ({ id: graph.id })), hydrated, agentBySha,
    sourceExport: manifest.sourceExport,
    sourceExportCompletedAt: manifest.sourceExportCompletedAt,
    sourceExportRunId: manifest.sourceExportRunId,
  });
  return { ...result, attributionJoin: join };
}

async function main() {
  assert.ok(process.env.PUBLIC_HISTORY_EXPORT, "Set PUBLIC_HISTORY_EXPORT to the matching completed public contribution export.");
  const [manifest, attribution] = await Promise.all([
    readFile(resolve(graphRoot, "manifest.json"), "utf8").then(JSON.parse),
    readFile(resolve(siteRoot, "app/data/agent-attribution.json"), "utf8").then(
      JSON.parse,
    ),
  ]);
  const graphs = await Promise.all(
    manifest.graphIds.map(async (graphId) =>
      assertContributionGraphV2(
        JSON.parse(
          await readFile(resolve(graphRoot, `${graphId}.json`), "utf8"),
        ),
        graphId,
      ),
    ),
  );
  const publicExport = await readPublicPullRequestExport(process.env.PUBLIC_HISTORY_EXPORT);
  const result = await refreshProjectPlayerRecords({
    manifest, attribution, graphs, ...publicExport,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
