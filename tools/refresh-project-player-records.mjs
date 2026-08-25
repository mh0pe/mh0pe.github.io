import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { assertContributionGraphV2 } from "../app/data/contribution-graph-contract.mjs";
import { writeProjectPlayerRecords } from "./build-project-player-records.mjs";

const execFileAsync = promisify(execFile);
const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const graphRoot = resolve(siteRoot, "app/data/project-graphs");

async function ghJson(endpoint, { paged = false } = {}) {
  const args = ["api", "--cache", "1h"];
  if (paged) {
    args.push("--paginate", "--slurp");
  }
  args.push(endpoint);
  const { stdout } = await execFileAsync("gh", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const parsed = JSON.parse(stdout);
  return paged ? parsed.flat() : parsed;
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
    !match
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
    !match
  ) {
    throw new TypeError(`Invalid public commit URL ${beat.href}.`);
  }
  return match[1];
}

async function hydrateBeat(graphId, beat) {
  if (beat.kind === "commit") {
    const sha = parseCommitSha(beat);
    const detail = await ghJson(`repos/${beat.repository}/commits/${sha}`);
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
  const [detail, commits, files] = await Promise.all([
    ghJson(`repos/${beat.repository}/pulls/${number}`),
    ghJson(
      `repos/${beat.repository}/pulls/${number}/commits?per_page=100`,
      { paged: true },
    ),
    ghJson(`repos/${beat.repository}/pulls/${number}/files?per_page=100`, {
      paged: true,
    }),
  ]);
  return {
    graphId,
    evidence: {
      ...beat,
      commits,
      files,
      referenceSha:
        detail.head?.sha ?? commits.at(-1)?.sha ?? detail.base?.sha,
    },
  };
}

async function main() {
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
  const beats = graphs.flatMap((graph) =>
    graph.beats.map((beat) => ({ graphId: graph.id, beat })),
  );
  const hydrated = await mapLimit(beats, 5, ({ graphId, beat }) =>
    hydrateBeat(graphId, beat),
  );
  const agentBySha = new Map(
    attribution.commits.map((commit) => [commit.sha, commit.agentId]),
  );
  const result = await writeProjectPlayerRecords({
    specs: graphs.map((graph) => ({ id: graph.id })),
    hydrated,
    agentBySha,
    sourceExport: manifest.sourceExport,
    sourceExportCompletedAt: manifest.sourceExportCompletedAt,
    sourceExportRunId: manifest.sourceExportRunId,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

await main();
