import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const stateCodes = new Map(
  ["open", "open_draft", "merged", "closed_unmerged"].map((state, index) => [
    state,
    index,
  ]),
);
const surfaceBits = new Map(
  ["pr", "owned-nonfork", "fork-only"].map((surface, index) => [
    surface,
    1 << index,
  ]),
);

function fail(message) {
  throw new Error(`Cannot compact agent attribution: ${message}`);
}

function indexCatalog(values, label) {
  const catalog = [...new Set(values)].sort((left, right) =>
    left.localeCompare(right),
  );
  return {
    catalog,
    indexes: new Map(catalog.map((value, index) => [value, index])),
    index(value) {
      const index = this.indexes.get(value);
      if (index === undefined) {
        fail(`${label} value ${JSON.stringify(value)} is not cataloged`);
      }
      return index;
    },
  };
}

function encodeReferences(values, catalog) {
  const references = [...new Set(values)].map((value) => catalog.index(value));
  return references.length === 0
    ? null
    : references.length === 1
      ? references[0]
      : references;
}

function parsePullRequest(url, expectedNumber) {
  const parsed = new URL(url);
  const match = parsed.pathname.match(/^\/([^/]+\/[^/]+)\/pull\/(\d+)$/);
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "github.com" ||
    !match ||
    Number(match[2]) !== expectedNumber
  ) {
    fail(`invalid public pull request URL ${url}`);
  }
  return { repository: match[1], number: expectedNumber };
}

export function compactAgentAttribution(data) {
  if (data.schemaVersion !== 2 || data.snapshot?.publicOnly !== true) {
    fail("input must be a public schema-v2 artifact");
  }
  const repositories = indexCatalog(
    [
      ...data.filters.repositories,
      ...data.commits.flatMap((commit) => commit.repositories),
      ...data.commits.flatMap((commit) =>
        commit.prLinks.map((pullRequest) =>
          parsePullRequest(pullRequest.url, pullRequest.number).repository,
        ),
      ),
    ],
    "repository",
  );
  const accounts = indexCatalog(data.snapshot.accounts, "account");
  const agentIndexes = new Map(
    data.agents.map((agent, index) => [agent.id, index]),
  );
  const agentCatalog = {
    index(value) {
      const index = agentIndexes.get(value);
      if (index === undefined) {
        fail(`agent value ${JSON.stringify(value)} is not cataloged`);
      }
      return index;
    },
  };

  const pullRequestRecords = new Map();
  for (const commit of data.commits) {
    for (const pullRequest of commit.prLinks) {
      const parsed = parsePullRequest(pullRequest.url, pullRequest.number);
      const stateCode = stateCodes.get(pullRequest.state);
      if (stateCode === undefined) {
        fail(`unsupported pull request state ${pullRequest.state}`);
      }
      pullRequestRecords.set(pullRequest.url, [
        repositories.index(parsed.repository),
        parsed.number,
        stateCode,
      ]);
    }
  }
  const pullRequestUrls = [...pullRequestRecords.keys()].sort((left, right) =>
    left.localeCompare(right),
  );
  const pullRequestIndexes = new Map(
    pullRequestUrls.map((url, index) => [url, index]),
  );
  const pullRequests = pullRequestUrls.map((url) => pullRequestRecords.get(url));

  const orderedCommits = data.commits
    .map((commit) => {
      const authoredAt = Date.parse(commit.date);
      if (!Number.isFinite(authoredAt) || authoredAt % 1_000 !== 0) {
        fail(`commit ${commit.sha} has a non-second timestamp`);
      }
      return { commit, authoredAt: authoredAt / 1_000 };
    })
    .sort(
      (left, right) =>
        left.authoredAt - right.authoredAt ||
        left.commit.sha.localeCompare(right.commit.sha),
    );
  let previousAuthoredAt = 0;
  const commits = orderedCommits.map(({ commit, authoredAt }, index) => {
    const encodedAuthoredAt = index === 0 ? authoredAt : authoredAt - previousAuthoredAt;
    previousAuthoredAt = authoredAt;
    const surfaceMask = commit.surfaces.reduce((mask, surface) => {
      const bit = surfaceBits.get(surface);
      if (bit === undefined) {
        fail(`commit ${commit.sha} has an unsupported surface ${surface}`);
      }
      return mask | bit;
    }, 0);
    const prReferences = commit.prLinks.map((pullRequest) => {
      const index = pullRequestIndexes.get(pullRequest.url);
      if (index === undefined) {
        fail(`commit ${commit.sha} references an uncataloged pull request`);
      }
      return index;
    });
    return [
      commit.sha,
      encodedAuthoredAt,
      repositories.index(commit.repository),
      encodeReferences(commit.repositories, repositories),
      encodeReferences(commit.accounts, accounts),
      encodeReferences(commit.modelIds, agentCatalog),
      encodeReferences(commit.platformIds, agentCatalog),
      surfaceMask,
      commit.additions.code,
      commit.additions.allText,
      commit.deletions.code,
      commit.deletions.allText,
      prReferences.length === 0
        ? null
        : prReferences.length === 1
          ? prReferences[0]
          : prReferences,
    ];
  });

  return {
    schemaVersion: 3,
    snapshot: data.snapshot,
    methodology: data.methodology,
    filters: data.filters,
    agents: data.agents,
    coverage: data.coverage,
    repositories: repositories.catalog,
    pullRequests,
    commits,
  };
}

async function main() {
  const [, , inputArgument, outputArgument] = process.argv;
  if (!inputArgument || !outputArgument) {
    fail("usage: node tools/compact-agent-attribution.mjs INPUT OUTPUT");
  }
  const input = JSON.parse(await readFile(resolve(inputArgument), "utf8"));
  const compact = compactAgentAttribution(input);
  await writeFile(resolve(outputArgument), `${JSON.stringify(compact)}\n`, "utf8");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
