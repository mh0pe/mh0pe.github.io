export const COMPACT_CONTRIBUTION_PLAYER_RECORDS_VERSION = 2;

const availabilityValues = ["upstream", "public-fork"];
const integrationStatuses = [
  "merged",
  "open",
  "closed-unmerged",
  "direct-commit",
];
const changeKinds = ["pull-request", "commit"];
const fileStatuses = [
  "added",
  "changed",
  "copied",
  "modified",
  "removed",
  "renamed",
  "unchanged",
];

function invariant(condition, message) {
  if (!condition) {
    throw new TypeError(message);
  }
}

function enumCode(values, value, label) {
  const index = values.indexOf(value);
  invariant(index >= 0, `Cannot compact unknown ${label} ${value}.`);
  return index;
}

function enumValue(values, index, label) {
  invariant(
    Number.isSafeInteger(index) && index >= 0 && index < values.length,
    `Compact player records contain invalid ${label} index ${index}.`,
  );
  return values[index];
}

function requiredString(value, label) {
  invariant(
    typeof value === "string" && value.length > 0,
    `Compact player records contain invalid ${label}.`,
  );
  return value;
}

function optionalString(value, label) {
  return value === null ? null : requiredString(value, label);
}

function repositoryHref(repository) {
  return `https://github.com/${repository}`;
}

function changeHref(repository, kind, number, commits) {
  if (kind === "pull-request") {
    invariant(
      Number.isSafeInteger(number) && number > 0,
      `Pull request ${repository} has no number.`,
    );
    return `https://github.com/${repository}/pull/${number}`;
  }
  const sha = requiredString(commits[0]?.sha, "direct-change commit SHA");
  return `https://github.com/${repository}/commit/${sha}`;
}

function commitHref(repository, sha) {
  return `https://github.com/${repository}/commit/${sha}`;
}

function encodedPath(path) {
  return encodeURIComponent(path);
}

function fileHref(repository, referenceSha, path) {
  return `https://github.com/${repository}/blob/${referenceSha}/${encodedPath(path)}`;
}

export function packContributionPlayerRecordCatalog(records) {
  return {
    v: COMPACT_CONTRIBUTION_PLAYER_RECORDS_VERSION,
    g: records.map((graph) => {
      const repositories = graph.repositories.map((repository) => {
        invariant(
          repository.href === repositoryHref(repository.name),
          `Repository URL is not derivable for ${repository.name}.`,
        );
        return repository.name;
      });
      const repositoryIndexes = new Map(
        repositories.map((repository, index) => [repository, index]),
      );
      return [
        graph.id,
        repositories,
        graph.changes.map((change) => {
          const repositoryIndex = repositoryIndexes.get(change.repository);
          invariant(
            repositoryIndex !== undefined,
            `Unknown repository ${change.repository}.`,
          );
          invariant(
            change.href ===
              changeHref(
                change.repository,
                change.kind,
                change.number,
                change.commits,
              ),
            `Change URL is not derivable for ${change.id}.`,
          );
          return [
            change.id,
            change.label,
            enumCode(availabilityValues, change.availability, "availability"),
            enumCode(
              integrationStatuses,
              change.integrationStatus,
              "integration status",
            ),
            enumCode(changeKinds, change.kind, "change kind"),
            repositoryIndex,
            change.date,
            change.number,
            change.referenceSha,
            change.commits.map((commit) => {
              invariant(
                commit.href === commitHref(change.repository, commit.sha),
                `Commit URL is not derivable for ${change.repository}@${commit.sha}.`,
              );
              return [
                commit.sha,
                commit.label,
                commit.date,
                commit.agentId,
              ];
            }),
            change.files.map((file) => {
              invariant(
                file.href ===
                  fileHref(
                    change.repository,
                    change.referenceSha,
                    file.path,
                  ),
                `File URL is not derivable for ${change.id}:${file.path}.`,
              );
              return [
                file.path,
                enumCode(fileStatuses, file.status, "file status"),
                file.additions,
                file.deletions,
                file.changes,
              ];
            }),
          ];
        }),
      ];
    }),
  };
}

export function unpackContributionPlayerRecordCatalog(catalog) {
  invariant(
    catalog?.v === COMPACT_CONTRIBUTION_PLAYER_RECORDS_VERSION &&
      Array.isArray(catalog.g),
    "Unsupported compact contribution player record catalog.",
  );
  return catalog.g.map((packedGraph) => {
    const id = requiredString(packedGraph[0], "graph ID");
    const repositories = packedGraph[1].map((name) => ({
      name: requiredString(name, "repository"),
      href: repositoryHref(name),
    }));
    return {
      schemaVersion: 1,
      publicOnly: true,
      id,
      repositories,
      changes: packedGraph[2].map((packedChange) => {
        const repository = requiredString(
          repositories[packedChange[5]]?.name,
          "change repository",
        );
        const kind = enumValue(
          changeKinds,
          packedChange[4],
          "change kind",
        );
        const referenceSha = requiredString(
          packedChange[8],
          "reference SHA",
        );
        const commits = packedChange[9].map((packedCommit) => {
          const sha = requiredString(packedCommit[0], "commit SHA");
          return {
            sha,
            label: requiredString(packedCommit[1], "commit label"),
            href: commitHref(repository, sha),
            date: optionalString(packedCommit[2], "commit date"),
            agentId: optionalString(packedCommit[3], "commit agent"),
          };
        });
        const number = packedChange[7];
        return {
          id: requiredString(packedChange[0], "change ID"),
          label: requiredString(packedChange[1], "change label"),
          href: changeHref(repository, kind, number, commits),
          availability: enumValue(
            availabilityValues,
            packedChange[2],
            "availability",
          ),
          integrationStatus: enumValue(
            integrationStatuses,
            packedChange[3],
            "integration status",
          ),
          kind,
          repository,
          date: optionalString(packedChange[6], "change date"),
          number,
          referenceSha,
          commits,
          files: packedChange[10].map((packedFile) => {
            const path = requiredString(packedFile[0], "file path");
            return {
              path,
              href: fileHref(repository, referenceSha, path),
              status: enumValue(
                fileStatuses,
                packedFile[1],
                "file status",
              ),
              additions: packedFile[2],
              deletions: packedFile[3],
              changes: packedFile[4],
            };
          }),
        };
      }),
    };
  });
}

export function unpackContributionPlayerRecords(catalog, expectedId) {
  const graph = unpackContributionPlayerRecordCatalog(catalog).find(
    (candidate) => candidate.id === expectedId,
  );
  invariant(graph, `Compact player records do not contain ${expectedId}.`);
  return graph;
}
