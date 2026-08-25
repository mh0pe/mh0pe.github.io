export const CONTRIBUTION_GRAPH_SCHEMA_VERSION = 2;

const integrationStatuses = new Set([
  "merged",
  "open",
  "closed-unmerged",
  "direct-commit",
]);
const availabilityValues = new Set(["upstream", "public-fork"]);
const fileStatuses = new Set([
  "added",
  "changed",
  "copied",
  "modified",
  "removed",
  "renamed",
  "unchanged",
]);
const nodeTypes = new Set([
  "repository",
  "evidence",
  "commit",
  "directory",
  "file",
]);
const edgeKinds = new Set([
  "contains-directory",
  "contains-subdirectory",
  "contains-file",
  "documents-change",
  "includes-commit",
  "commit-touches-file",
  "touches-file",
]);
const edgeEndpointTypes = new Map([
  ["contains-directory", [["repository", "directory"]]],
  ["contains-subdirectory", [["directory", "directory"]]],
  [
    "contains-file",
    [
      ["repository", "file"],
      ["directory", "file"],
    ],
  ],
  ["documents-change", [["repository", "evidence"]]],
  ["includes-commit", [["evidence", "commit"]]],
  ["commit-touches-file", [["commit", "file"]]],
  ["touches-file", [["evidence", "file"]]],
]);

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function requireCondition(condition, message) {
  if (!condition) {
    throw new TypeError(message);
  }
}

function isPublicGitHubUrl(value) {
  if (typeof value !== "string") {
    return false;
  }
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "github.com" &&
      url.username === "" &&
      url.password === "" &&
      url.port === ""
    );
  } catch {
    return false;
  }
}

function isRepositoryBlobUrl(value, repository, path) {
  if (!isPublicGitHubUrl(value)) {
    return false;
  }
  try {
    const url = new URL(value);
    const prefix = `/${repository}/blob/`;
    if (!url.pathname.startsWith(prefix)) {
      return false;
    }
    const revisionAndPath = url.pathname.slice(prefix.length);
    const revisionEnd = revisionAndPath.indexOf("/");
    return (
      revisionEnd > 0 &&
      decodeURIComponent(revisionAndPath.slice(revisionEnd + 1)) === path
    );
  } catch {
    return false;
  }
}

function uniqueStrings(values) {
  return (
    Array.isArray(values) &&
    values.every((value) => typeof value === "string") &&
    new Set(values).size === values.length
  );
}

export function assertContributionGraphV2(value, expectedId) {
  requireCondition(isRecord(value), "Contribution graph must be an object.");
  requireCondition(
    value.schemaVersion === CONTRIBUTION_GRAPH_SCHEMA_VERSION,
    `Contribution graph ${expectedId} is not schema v${CONTRIBUTION_GRAPH_SCHEMA_VERSION}.`,
  );
  requireCondition(value.id === expectedId, `Unexpected graph ID ${value.id}.`);
  requireCondition(
    isNonEmptyString(value.chapterId) &&
      isNonEmptyString(value.title) &&
      isNonEmptyString(value.impact) &&
      isNonEmptyString(value.caption) &&
      value.title.length > 0 &&
      value.impact.length > 0 &&
      value.caption.length > 0,
    `Contribution graph ${expectedId} has invalid editorial metadata.`,
  );
  requireCondition(
    value.publicOnly === true,
    `Contribution graph ${expectedId} is not public-only.`,
  );
  requireCondition(
    Array.isArray(value.nodes) &&
      Array.isArray(value.edges) &&
      Array.isArray(value.beats) &&
      Array.isArray(value.agents),
    `Contribution graph ${expectedId} has an invalid collection envelope.`,
  );
  requireCondition(
    value.nodes.length > 0 && value.beats.length > 0,
    `Contribution graph ${expectedId} must contain nodes and beats.`,
  );
  requireCondition(
    isRecord(value.sampling) &&
      value.sampling.representative === true &&
      isNonNegativeInteger(value.sampling.maxCommitsPerEvidence) &&
      isNonNegativeInteger(value.sampling.maxFilesPerEvidence) &&
      isRecord(value.sampling.exactCommitDetails),
    `Contribution graph ${expectedId} has an invalid sampling policy.`,
  );

  const exactSummary = value.sampling.exactCommitDetails;
  requireCondition(
    isNonNegativeInteger(exactSummary.requested) &&
      isNonNegativeInteger(exactSummary.resolved) &&
      isNonNegativeInteger(exactSummary.unavailable) &&
      exactSummary.resolved + exactSummary.unavailable ===
        exactSummary.requested &&
      exactSummary.unavailable === 0,
    `Contribution graph ${expectedId} has inconsistent exact-detail coverage.`,
  );

  const agentIds = new Set();
  for (const agent of value.agents) {
    requireCondition(
      isRecord(agent) &&
        isNonEmptyString(agent.id) &&
        !agentIds.has(agent.id) &&
        isNonEmptyString(agent.label) &&
        isNonEmptyString(agent.provider) &&
        uniqueStrings(agent.aliases) &&
        agent.aliases.every(isNonEmptyString) &&
        isNonEmptyString(agent.marker) &&
        agent.attributionScope === "repository-family" &&
        isNonNegativeInteger(agent.recordedCommitCount) &&
        isNonNegativeInteger(agent.associatedCodeAdditions),
      `Contribution graph ${expectedId} has an invalid agent attribution record.`,
    );
    agentIds.add(agent.id);
  }

  const nodeById = new Map();
  for (const node of value.nodes) {
    requireCondition(
      isRecord(node) &&
        isNonEmptyString(node.id) &&
        !nodeById.has(node.id) &&
        nodeTypes.has(node.type) &&
        isNonEmptyString(node.label) &&
        isPublicGitHubUrl(node.href) &&
        isNonEmptyString(node.repository) &&
        uniqueStrings(node.evidenceIds) &&
        node.evidenceIds.every(isNonEmptyString) &&
        Number.isFinite(node.x) &&
        Number.isFinite(node.y) &&
        Number.isFinite(node.z) &&
        Number.isFinite(node.weight) &&
        node.weight >= 0 &&
        (node.availability === undefined ||
          availabilityValues.has(node.availability)),
      `Contribution graph ${expectedId} contains an invalid node ${node?.id}.`,
    );
    nodeById.set(node.id, node);
  }

  const edgeIds = new Set();
  for (const edge of value.edges) {
    const source = nodeById.get(edge?.source);
    const target = nodeById.get(edge?.target);
    const expectedTypes = edgeEndpointTypes.get(edge?.kind);
    requireCondition(
      isRecord(edge) &&
        isNonEmptyString(edge.id) &&
        !edgeIds.has(edge.id) &&
        source !== undefined &&
        target !== undefined &&
        edgeKinds.has(edge.kind) &&
        expectedTypes?.some(
          ([sourceType, targetType]) =>
            source.type === sourceType && target.type === targetType,
        ) &&
        (edge.evidenceId === undefined || isNonEmptyString(edge.evidenceId)),
      `Contribution graph ${expectedId} contains an invalid edge ${edge?.id}.`,
    );
    edgeIds.add(edge.id);
  }

  const beatIds = new Set();
  let sampledCommitCount = 0;
  let resolvedCommitCount = 0;
  let unavailableCommitCount = 0;
  let displayedRelationCount = 0;
  for (const beat of value.beats) {
    const coverage = beat?.exactCommitFileCoverage;
    requireCondition(
      isRecord(beat) &&
        isNonEmptyString(beat.id) &&
        !beatIds.has(beat.id) &&
        isNonEmptyString(beat.label) &&
        isPublicGitHubUrl(beat.href) &&
        availabilityValues.has(beat.availability) &&
        integrationStatuses.has(beat.integrationStatus) &&
        (beat.kind === "pull-request" || beat.kind === "commit") &&
        isNonEmptyString(beat.repository) &&
        (beat.date === null || isNonEmptyString(beat.date)) &&
        isNonNegativeInteger(beat.commitCount) &&
        isNonNegativeInteger(beat.changedFileCount) &&
        isNonNegativeInteger(beat.displayedCommitCount) &&
        isNonNegativeInteger(beat.displayedFileCount) &&
        Array.isArray(beat.files) &&
        beat.files.length === beat.displayedFileCount &&
        beat.displayedCommitCount <= beat.commitCount &&
        beat.displayedFileCount <= beat.changedFileCount &&
        beat.displayedCommitCount <= value.sampling.maxCommitsPerEvidence &&
        beat.displayedFileCount <= value.sampling.maxFilesPerEvidence &&
        (beat.kind === "commit"
          ? beat.integrationStatus === "direct-commit" &&
            beat.availability === "public-fork"
          : beat.integrationStatus !== "direct-commit") &&
        isRecord(coverage) &&
        isNonNegativeInteger(coverage.sampledCommitCount) &&
        isNonNegativeInteger(coverage.resolvedCommitCount) &&
        isNonNegativeInteger(coverage.unavailableCommitCount) &&
        isNonNegativeInteger(coverage.displayableRelationCount) &&
        isNonNegativeInteger(coverage.displayedRelationCount) &&
        coverage.resolvedCommitCount + coverage.unavailableCommitCount ===
          coverage.sampledCommitCount &&
        coverage.unavailableCommitCount === 0 &&
        coverage.sampledCommitCount === beat.displayedCommitCount &&
        coverage.displayedRelationCount <= coverage.displayableRelationCount,
      `Contribution graph ${expectedId} has invalid exact-file coverage for ${beat?.id}.`,
    );
    const beatFileNodeIds = new Set();
    for (const file of beat.files) {
      const fileNode = nodeById.get(file?.nodeId);
      requireCondition(
        isRecord(file) &&
          isNonEmptyString(file.nodeId) &&
          !beatFileNodeIds.has(file.nodeId) &&
          isNonEmptyString(file.label) &&
          isNonEmptyString(file.path) &&
          isRepositoryBlobUrl(file.href, beat.repository, file.path) &&
          file.repository === beat.repository &&
          fileStatuses.has(file.status) &&
          fileNode?.type === "file" &&
          fileNode.repository === beat.repository &&
          fileNode.path === file.path &&
          fileNode.evidenceIds.includes(beat.id),
        `Contribution graph ${expectedId} has an invalid file reference for ${beat.id}.`,
      );
      beatFileNodeIds.add(file.nodeId);
    }
    sampledCommitCount += coverage.sampledCommitCount;
    resolvedCommitCount += coverage.resolvedCommitCount;
    unavailableCommitCount += coverage.unavailableCommitCount;
    displayedRelationCount += coverage.displayedRelationCount;
    beatIds.add(beat.id);
  }

  for (const node of value.nodes) {
    requireCondition(
      node.evidenceIds.every((evidenceId) => beatIds.has(evidenceId)),
      `Contribution graph ${expectedId} node ${node.id} references unknown evidence.`,
    );
  }
  const exactRelationsByBeat = new Map();
  for (const edge of value.edges) {
    requireCondition(
      edge.evidenceId === undefined || beatIds.has(edge.evidenceId),
      `Contribution graph ${expectedId} edge ${edge.id} references unknown evidence.`,
    );
    if (edge.kind === "commit-touches-file") {
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      requireCondition(
        source.evidenceIds.includes(edge.evidenceId) &&
          target.evidenceIds.includes(edge.evidenceId),
        `Contribution graph ${expectedId} exact edge ${edge.id} crosses evidence beats.`,
      );
      exactRelationsByBeat.set(
        edge.evidenceId,
        (exactRelationsByBeat.get(edge.evidenceId) ?? 0) + 1,
      );
    }
  }

  for (const beat of value.beats) {
    const displayedCommitNodes = value.nodes.filter(
      (node) => node.type === "commit" && node.evidenceIds.includes(beat.id),
    ).length;
    const displayedFileNodes = value.nodes.filter(
      (node) => node.type === "file" && node.evidenceIds.includes(beat.id),
    ).length;
    requireCondition(
      displayedCommitNodes === beat.displayedCommitCount &&
        displayedFileNodes === beat.displayedFileCount &&
        (exactRelationsByBeat.get(beat.id) ?? 0) ===
          beat.exactCommitFileCoverage.displayedRelationCount,
      `Contribution graph ${expectedId} displayed topology does not reconcile for ${beat.id}.`,
    );
  }

  requireCondition(
    sampledCommitCount === exactSummary.requested &&
      resolvedCommitCount === exactSummary.resolved &&
      unavailableCommitCount === exactSummary.unavailable,
    `Contribution graph ${expectedId} exact-detail totals do not reconcile.`,
  );

  const exactEdges = value.edges.filter(
    (edge) => edge?.kind === "commit-touches-file",
  );
  requireCondition(
    exactEdges.length === displayedRelationCount,
    `Contribution graph ${expectedId} exact-edge totals do not reconcile.`,
  );
  for (const edge of exactEdges) {
    requireCondition(
      typeof edge.status === "string" &&
        isNonNegativeInteger(edge.additions) &&
        isNonNegativeInteger(edge.deletions) &&
        isNonNegativeInteger(edge.changes) &&
        edge.changes === edge.additions + edge.deletions,
      `Contribution graph ${expectedId} contains an invalid exact commit/file edge.`,
    );
  }

  return value;
}
