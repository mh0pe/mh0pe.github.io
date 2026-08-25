export const COMPACT_CONTRIBUTION_GRAPH_VERSION = 1;

const nodeTypes = [
  "repository",
  "evidence",
  "commit",
  "directory",
  "file",
];
const edgeKinds = [
  "contains-directory",
  "contains-subdirectory",
  "contains-file",
  "documents-change",
  "includes-commit",
  "commit-touches-file",
  "touches-file",
];
const availabilityValues = ["upstream", "public-fork"];
const fileStatuses = [
  "added",
  "changed",
  "copied",
  "modified",
  "removed",
  "renamed",
  "unchanged",
];
const integrationStatuses = [
  "merged",
  "open",
  "closed-unmerged",
  "direct-commit",
];
const beatKinds = ["pull-request", "commit"];

function invariant(condition, message) {
  if (!condition) {
    throw new TypeError(message);
  }
}

function enumCode(values, value, label) {
  if (value === undefined) {
    return -1;
  }
  if (value === null) {
    return -2;
  }
  const index = values.indexOf(value);
  invariant(index >= 0, `Cannot compact unknown ${label} ${value}.`);
  return index;
}

function requiredEnum(values, index, label) {
  invariant(
    Number.isSafeInteger(index) && index >= 0 && index < values.length,
    `Compact contribution graph contains invalid ${label} index ${index}.`,
  );
  return values[index];
}

function optionalEnum(values, index, label) {
  if (index === -1) {
    return undefined;
  }
  if (index === -2) {
    return null;
  }
  return requiredEnum(values, index, label);
}

function requiredString(strings, index, label) {
  invariant(
    Number.isSafeInteger(index) &&
      index >= 0 &&
      index < strings.length &&
      typeof strings[index] === "string",
    `Compact contribution graph contains invalid ${label} string index ${index}.`,
  );
  return strings[index];
}

function optionalString(strings, index, label) {
  if (index === -1) {
    return undefined;
  }
  if (index === -2) {
    return null;
  }
  return requiredString(strings, index, label);
}

function assignOptional(target, key, value) {
  if (value !== undefined) {
    target[key] = value;
  }
}

function optionalNumber(value) {
  return value === undefined ? -1 : value;
}

function assignOptionalNumber(target, key, value) {
  if (value !== -1) {
    target[key] = value;
  }
}

function derivedEdgeId(kind, source, target, evidenceId) {
  return `${kind}:${source}:${target}:${evidenceId ?? ""}`;
}

export function packContributionGraphCatalog(graphs) {
  const strings = [];
  const stringIndexes = new Map();
  const stringIndex = (value) => {
    if (value === undefined) {
      return -1;
    }
    if (value === null) {
      return -2;
    }
    invariant(
      typeof value === "string",
      `Cannot compact non-string value ${String(value)}.`,
    );
    const existing = stringIndexes.get(value);
    if (existing !== undefined) {
      return existing;
    }
    const next = strings.length;
    strings.push(value);
    stringIndexes.set(value, next);
    return next;
  };

  const packedGraphs = graphs.map((graph) => {
    invariant(
      graph.schemaVersion === 2 &&
        graph.publicOnly === true &&
        graph.sampling?.representative === true,
      `Contribution graph ${graph.id} cannot use compact runtime schema v${COMPACT_CONTRIBUTION_GRAPH_VERSION}.`,
    );

    const agents = graph.agents.map((agent) => [
      stringIndex(agent.id),
      stringIndex(agent.label),
      stringIndex(agent.provider),
      agent.aliases.map(stringIndex),
      stringIndex(agent.marker),
      agent.recordedCommitCount,
      agent.associatedCodeAdditions,
    ]);
    const nodes = graph.nodes.map((node) => [
      stringIndex(node.id),
      enumCode(nodeTypes, node.type, "node type"),
      stringIndex(node.label),
      stringIndex(node.href),
      stringIndex(node.repository),
      node.evidenceIds.map(stringIndex),
      node.x,
      node.y,
      node.z,
      node.weight,
      enumCode(availabilityValues, node.availability, "availability"),
      stringIndex(node.agentId),
      stringIndex(node.date),
      stringIndex(node.path),
      stringIndex(node.sha),
      enumCode(fileStatuses, node.status, "file status"),
    ]);
    const edges = graph.edges.map((edge) => {
      invariant(
        edge.id ===
          derivedEdgeId(
            edge.kind,
            edge.source,
            edge.target,
            edge.evidenceId,
          ),
        `Contribution graph ${graph.id} edge ${edge.id} is not derivable.`,
      );
      return [
        stringIndex(edge.source),
        stringIndex(edge.target),
        enumCode(edgeKinds, edge.kind, "edge kind"),
        stringIndex(edge.evidenceId),
        enumCode(fileStatuses, edge.status, "edge status"),
        optionalNumber(edge.additions),
        optionalNumber(edge.deletions),
        optionalNumber(edge.changes),
      ];
    });
    const beats = graph.beats.map((beat) => [
      stringIndex(beat.id),
      stringIndex(beat.label),
      stringIndex(beat.href),
      enumCode(availabilityValues, beat.availability, "availability"),
      enumCode(
        integrationStatuses,
        beat.integrationStatus,
        "integration status",
      ),
      enumCode(beatKinds, beat.kind, "beat kind"),
      stringIndex(beat.repository),
      stringIndex(beat.date),
      beat.commitCount,
      beat.changedFileCount,
      beat.displayedCommitCount,
      beat.displayedFileCount,
      beat.files.map((file) => [
        stringIndex(file.nodeId),
        stringIndex(file.label),
        stringIndex(file.path),
        stringIndex(file.href),
        stringIndex(file.repository),
        enumCode(fileStatuses, file.status, "file status"),
      ]),
      [
        beat.exactCommitFileCoverage.sampledCommitCount,
        beat.exactCommitFileCoverage.resolvedCommitCount,
        beat.exactCommitFileCoverage.unavailableCommitCount,
        beat.exactCommitFileCoverage.displayableRelationCount,
        beat.exactCommitFileCoverage.displayedRelationCount,
      ],
    ]);

    return [
      stringIndex(graph.id),
      stringIndex(graph.chapterId),
      stringIndex(graph.title),
      stringIndex(graph.impact),
      stringIndex(graph.caption),
      [
        graph.sampling.maxCommitsPerEvidence,
        graph.sampling.maxFilesPerEvidence,
        graph.sampling.exactCommitDetails.requested,
        graph.sampling.exactCommitDetails.resolved,
        graph.sampling.exactCommitDetails.unavailable,
      ],
      agents,
      nodes,
      edges,
      beats,
    ];
  });

  return {
    v: COMPACT_CONTRIBUTION_GRAPH_VERSION,
    s: strings,
    g: packedGraphs,
  };
}

export function unpackContributionGraph(catalog, expectedId) {
  invariant(
    catalog?.v === COMPACT_CONTRIBUTION_GRAPH_VERSION &&
      Array.isArray(catalog.s) &&
      Array.isArray(catalog.g),
    `Invalid compact contribution graph catalog v${catalog?.v}.`,
  );
  const strings = catalog.s;
  const packed = catalog.g.find(
    (candidate) =>
      Array.isArray(candidate) &&
      requiredString(strings, candidate[0], "graph ID") === expectedId,
  );
  invariant(packed, `Compact contribution graph ${expectedId} is missing.`);

  const nodes = packed[7].map((node) => {
    const unpacked = {
      id: requiredString(strings, node[0], "node ID"),
      type: requiredEnum(nodeTypes, node[1], "node type"),
      label: requiredString(strings, node[2], "node label"),
      href: requiredString(strings, node[3], "node URL"),
      repository: requiredString(strings, node[4], "node repository"),
      evidenceIds: node[5].map((index) =>
        requiredString(strings, index, "node evidence ID"),
      ),
      x: node[6],
      y: node[7],
      z: node[8],
      weight: node[9],
    };
    assignOptional(
      unpacked,
      "availability",
      optionalEnum(availabilityValues, node[10], "availability"),
    );
    assignOptional(
      unpacked,
      "agentId",
      optionalString(strings, node[11], "node agent ID"),
    );
    assignOptional(
      unpacked,
      "date",
      optionalString(strings, node[12], "node date"),
    );
    assignOptional(
      unpacked,
      "path",
      optionalString(strings, node[13], "node path"),
    );
    assignOptional(
      unpacked,
      "sha",
      optionalString(strings, node[14], "node SHA"),
    );
    assignOptional(
      unpacked,
      "status",
      optionalEnum(fileStatuses, node[15], "node status"),
    );
    return unpacked;
  });

  const edges = packed[8].map((edge) => {
    const source = requiredString(strings, edge[0], "edge source");
    const target = requiredString(strings, edge[1], "edge target");
    const kind = requiredEnum(edgeKinds, edge[2], "edge kind");
    const evidenceId = optionalString(strings, edge[3], "edge evidence ID");
    const unpacked = {
      id: derivedEdgeId(kind, source, target, evidenceId),
      source,
      target,
      kind,
    };
    assignOptional(unpacked, "evidenceId", evidenceId);
    assignOptional(
      unpacked,
      "status",
      optionalEnum(fileStatuses, edge[4], "edge status"),
    );
    assignOptionalNumber(unpacked, "additions", edge[5]);
    assignOptionalNumber(unpacked, "deletions", edge[6]);
    assignOptionalNumber(unpacked, "changes", edge[7]);
    return unpacked;
  });

  const beats = packed[9].map((beat) => {
    const coverage = beat[13];
    return {
      id: requiredString(strings, beat[0], "beat ID"),
      label: requiredString(strings, beat[1], "beat label"),
      href: requiredString(strings, beat[2], "beat URL"),
      availability: requiredEnum(
        availabilityValues,
        beat[3],
        "availability",
      ),
      integrationStatus: requiredEnum(
        integrationStatuses,
        beat[4],
        "integration status",
      ),
      kind: requiredEnum(beatKinds, beat[5], "beat kind"),
      repository: requiredString(strings, beat[6], "beat repository"),
      date: optionalString(strings, beat[7], "beat date"),
      commitCount: beat[8],
      changedFileCount: beat[9],
      displayedCommitCount: beat[10],
      displayedFileCount: beat[11],
      files: beat[12].map((file) => ({
        nodeId: requiredString(strings, file[0], "beat file node ID"),
        label: requiredString(strings, file[1], "beat file label"),
        path: requiredString(strings, file[2], "beat file path"),
        href: requiredString(strings, file[3], "beat file URL"),
        repository: requiredString(
          strings,
          file[4],
          "beat file repository",
        ),
        status: requiredEnum(fileStatuses, file[5], "beat file status"),
      })),
      exactCommitFileCoverage: {
        sampledCommitCount: coverage[0],
        resolvedCommitCount: coverage[1],
        unavailableCommitCount: coverage[2],
        displayableRelationCount: coverage[3],
        displayedRelationCount: coverage[4],
      },
    };
  });
  const sampling = packed[5];

  return {
    schemaVersion: 2,
    id: requiredString(strings, packed[0], "graph ID"),
    chapterId: requiredString(strings, packed[1], "graph chapter ID"),
    title: requiredString(strings, packed[2], "graph title"),
    impact: requiredString(strings, packed[3], "graph impact"),
    publicOnly: true,
    caption: requiredString(strings, packed[4], "graph caption"),
    sampling: {
      representative: true,
      maxCommitsPerEvidence: sampling[0],
      maxFilesPerEvidence: sampling[1],
      exactCommitDetails: {
        requested: sampling[2],
        resolved: sampling[3],
        unavailable: sampling[4],
      },
    },
    agents: packed[6].map((agent) => ({
      aliases: agent[3].map((index) =>
        requiredString(strings, index, "agent alias"),
      ),
      id: requiredString(strings, agent[0], "agent ID"),
      label: requiredString(strings, agent[1], "agent label"),
      marker: requiredString(strings, agent[4], "agent marker"),
      provider: requiredString(strings, agent[2], "agent provider"),
      recordedCommitCount: agent[5],
      associatedCodeAdditions: agent[6],
      attributionScope: "repository-family",
    })),
    nodes,
    edges,
    beats,
  };
}

export function unpackContributionGraphCatalog(catalog) {
  invariant(
    Array.isArray(catalog?.g),
    "Compact contribution graph catalog has no graph collection.",
  );
  return catalog.g.map((packed) =>
    unpackContributionGraph(
      catalog,
      requiredString(catalog.s, packed[0], "graph ID"),
    ),
  );
}
