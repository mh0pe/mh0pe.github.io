const pullRequestStates = [
  "open",
  "open_draft",
  "merged",
  "closed_unmerged",
];

const commitSurfaces = ["pr", "owned-nonfork", "fork-only"];

function fail(message) {
  throw new Error(`Compact attribution data is invalid: ${message}`);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readIndex(value, limit, label) {
  if (!Number.isInteger(value) || value < 0 || value >= limit) {
    fail(`${label} is outside its catalog`);
  }
  return value;
}

function readReferences(value, limit, label) {
  const references = value === null ? [] : Array.isArray(value) ? value : [value];
  const decoded = references.map((reference, index) =>
    readIndex(reference, limit, `${label}[${index}]`),
  );
  if (new Set(decoded).size !== decoded.length) {
    fail(`${label} contains duplicate references`);
  }
  return decoded;
}

function readMetric(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail(`${label} must be a non-negative integer`);
  }
  return value;
}

export function expandAgentAttributionData(value) {
  if (!isRecord(value) || value.schemaVersion !== 3) {
    return value;
  }
  if (
    !isRecord(value.snapshot) ||
    value.snapshot.publicOnly !== true ||
    !Array.isArray(value.snapshot.accounts) ||
    !Array.isArray(value.agents) ||
    !Array.isArray(value.repositories) ||
    !Array.isArray(value.pullRequests) ||
    !Array.isArray(value.commits)
  ) {
    fail("required catalogs or the public snapshot are missing");
  }

  const repositories = value.repositories;
  if (
    repositories.some(
      (repository) =>
        typeof repository !== "string" ||
        !/^[^/\s]+\/[^/\s]+$/.test(repository),
    )
  ) {
    fail("repository catalog contains an invalid public repository name");
  }

  const agents = value.agents;
  const pullRequests = value.pullRequests.map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== 3) {
      fail(`pullRequests[${rowIndex}] must contain three values`);
    }
    const repository = repositories[
      readIndex(row[0], repositories.length, `pullRequests[${rowIndex}][0]`)
    ];
    const number = readMetric(row[1], `pullRequests[${rowIndex}][1]`);
    const state = pullRequestStates[
      readIndex(
        row[2],
        pullRequestStates.length,
        `pullRequests[${rowIndex}][2]`,
      )
    ];
    return {
      number,
      url: `https://github.com/${repository}/pull/${number}`,
      state,
    };
  });

  let previousAuthoredAt = 0;
  const commits = value.commits.map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== 13) {
      fail(`commits[${rowIndex}] must contain thirteen values`);
    }
    const [
      sha,
      encodedAuthoredAt,
      repositoryReference,
      repositoryReferences,
      accountReferences,
      modelReferences,
      platformReferences,
      surfaceMask,
      codeAdditions,
      allTextAdditions,
      codeDeletions,
      allTextDeletions,
      pullRequestReferences,
    ] = row;
    if (typeof sha !== "string" || !/^[a-f0-9]{40}$/i.test(sha)) {
      fail(`commits[${rowIndex}][0] is not a full Git SHA`);
    }
    if (
      !Number.isSafeInteger(encodedAuthoredAt) ||
      (rowIndex === 0 ? encodedAuthoredAt <= 0 : encodedAuthoredAt < 0)
    ) {
      fail(`commits[${rowIndex}][1] is not a valid timestamp delta`);
    }
    const authoredAt =
      rowIndex === 0
        ? encodedAuthoredAt
        : previousAuthoredAt + encodedAuthoredAt;
    previousAuthoredAt = authoredAt;
    const repositoryIndex = readIndex(
      repositoryReference,
      repositories.length,
      `commits[${rowIndex}][2]`,
    );
    const repositoryIndexes = readReferences(
      repositoryReferences,
      repositories.length,
      `commits[${rowIndex}][3]`,
    );
    if (!repositoryIndexes.includes(repositoryIndex)) {
      fail(`commits[${rowIndex}] does not include its canonical repository`);
    }
    const accountIndexes = readReferences(
      accountReferences,
      value.snapshot.accounts.length,
      `commits[${rowIndex}][4]`,
    );
    if (accountIndexes.length === 0) {
      fail(`commits[${rowIndex}] has no public account attribution`);
    }
    const modelIndexes = readReferences(
      modelReferences,
      agents.length,
      `commits[${rowIndex}][5]`,
    );
    const platformIndexes = readReferences(
      platformReferences,
      agents.length,
      `commits[${rowIndex}][6]`,
    );
    if (
      modelIndexes.some((index) => agents[index]?.kind !== "model") ||
      platformIndexes.some((index) => agents[index]?.kind !== "platform")
    ) {
      fail(`commits[${rowIndex}] references the wrong identity kind`);
    }
    if (modelIndexes.length === 0 && platformIndexes.length === 0) {
      fail(`commits[${rowIndex}] has no model or platform provenance`);
    }
    if (
      !Number.isInteger(surfaceMask) ||
      surfaceMask <= 0 ||
      (surfaceMask & ~0b111) !== 0
    ) {
      fail(`commits[${rowIndex}][7] has an invalid surface mask`);
    }
    const surfaces = commitSurfaces.filter(
      (_surface, index) => (surfaceMask & (1 << index)) !== 0,
    );
    const additions = {
      code: readMetric(codeAdditions, `commits[${rowIndex}][8]`),
      allText: readMetric(allTextAdditions, `commits[${rowIndex}][9]`),
    };
    const deletions = {
      code: readMetric(codeDeletions, `commits[${rowIndex}][10]`),
      allText: readMetric(allTextDeletions, `commits[${rowIndex}][11]`),
    };
    if (additions.code > additions.allText || deletions.code > deletions.allText) {
      fail(`commits[${rowIndex}] has inconsistent scoped metrics`);
    }
    const pullRequestIndexes = readReferences(
      pullRequestReferences,
      pullRequests.length,
      `commits[${rowIndex}][12]`,
    );
    const modelIds = modelIndexes.map((index) => agents[index].id);
    const platformIds = platformIndexes.map((index) => agents[index].id);
    const agentId =
      modelIds.length === 1
        ? modelIds[0]
        : modelIds.length === 0 && platformIds.length === 1
          ? platformIds[0]
          : "shared";
    const repository = repositories[repositoryIndex];
    const accounts = accountIndexes.map((index) => value.snapshot.accounts[index]);

    return {
      sha,
      url: `https://github.com/${repository}/commit/${sha}`,
      date: new Date(authoredAt * 1_000).toISOString(),
      repository,
      repositories: repositoryIndexes.map((index) => repositories[index]),
      account: accounts[0],
      accounts,
      agentId,
      modelIds,
      platformIds,
      surfaces,
      prLinks: pullRequestIndexes.map((index) => pullRequests[index]),
      additions,
      deletions,
    };
  });

  return {
    schemaVersion: 2,
    snapshot: value.snapshot,
    methodology: value.methodology,
    filters: value.filters,
    agents,
    commits,
    coverage: value.coverage,
  };
}
