import type {
  ContributionGraph,
  ContributionGraphBeat,
  ContributionGraphEdge,
  ContributionGraphNode,
} from "./types";

const LEAD_IN = 0.06;
const LEAD_OUT = 0.06;
const PROGRESS_EPSILON = 1e-9;

export type ContributionTimelineDateSource =
  "source" | "beat-fallback" | "commit-fallback" | "undated";

export type ContributionTimelineMomentKind = "commit" | "beat";

export interface ContributionTimelineMoment {
  readonly id: string;
  readonly kind: ContributionTimelineMomentKind;
  readonly repository: string;
  readonly evidenceId: string | null;
  readonly nodeId: string | null;
  readonly date: string | null;
  readonly timestamp: number | null;
  readonly dateSource: ContributionTimelineDateSource;
  readonly progress: number;
}

export interface ContributionTimelineBeat {
  readonly beat: ContributionGraphBeat;
  /** The milestone at which evidence-level changed files can be revealed. */
  readonly progress: number;
  /** The first public commit or beat moment associated with this evidence. */
  readonly startProgress: number;
  readonly timestamp: number | null;
  readonly dateSource: Extract<
    ContributionTimelineDateSource,
    "source" | "commit-fallback" | "undated"
  >;
}

export type ContributionTimelineEdgeRelationship =
  | "repository-structure"
  | "repository-evidence"
  | "evidence-commit-membership"
  | "commit-changed-file"
  | "evidence-changed-file";

export interface ContributionTimelineEdgeSemantics {
  readonly relationship: ContributionTimelineEdgeRelationship;
  /**
   * None of the generated graph edge kinds describes a commit-parent edge.
   * `commit-touches-file` is an exact public commit/file modification, not a
   * claim about that commit's parent. `touches-file` remains aggregated
   * evidence-level changed-file data.
   */
  readonly isLiteralCommitAncestry: false;
  readonly revealPolicy: "endpoints" | "evidence-start" | "evidence-complete";
}

export interface ContributionTimeline {
  readonly moments: readonly ContributionTimelineMoment[];
  readonly beats: readonly ContributionTimelineBeat[];
  readonly nodeRevealAt: Readonly<Record<string, number>>;
  readonly edgeRevealAt: Readonly<Record<string, number>>;
  readonly startedAt: number | null;
  readonly endedAt: number | null;
}

export interface ContributionTimelineFrame {
  readonly progress: number;
  readonly activeMoment: ContributionTimelineMoment | null;
  readonly activeBeat: ContributionTimelineBeat | null;
  readonly activeEvidenceId: string | null;
  readonly previousBeatProgress: number | null;
  readonly nextBeatProgress: number | null;
}

interface DatedBeat {
  readonly beat: ContributionGraphBeat;
  readonly timestamp: number | null;
  readonly dateSource: ContributionTimelineBeat["dateSource"];
}

interface PendingMoment {
  readonly id: string;
  readonly kind: ContributionTimelineMomentKind;
  readonly repository: string;
  readonly evidenceId: string | null;
  readonly nodeId: string | null;
  readonly date: string | null;
  readonly timestamp: number | null;
  readonly dateSource: ContributionTimelineDateSource;
}

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function parseTimestamp(date: string | null | undefined): number | null {
  if (typeof date !== "string" || date.trim() === "") {
    return null;
  }

  const timestamp = Date.parse(date);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function compareOptionalTimestamps(
  left: number | null,
  right: number | null,
): number {
  if (left === null) {
    return right === null ? 0 : 1;
  }

  if (right === null) {
    return -1;
  }

  return left - right;
}

function compareDatedBeats(left: DatedBeat, right: DatedBeat): number {
  return (
    compareOptionalTimestamps(left.timestamp, right.timestamp) ||
    compareText(left.beat.repository, right.beat.repository) ||
    compareText(left.beat.id, right.beat.id)
  );
}

function comparePendingMoments(
  left: PendingMoment,
  right: PendingMoment,
): number {
  return (
    compareOptionalTimestamps(left.timestamp, right.timestamp) ||
    compareText(left.repository, right.repository) ||
    compareText(left.evidenceId ?? "", right.evidenceId ?? "") ||
    // A commit at the exact milestone timestamp is revealed before the beat.
    (left.kind === right.kind ? 0 : left.kind === "commit" ? -1 : 1) ||
    compareText(left.id, right.id)
  );
}

function getEventProgress(index: number, count: number): number {
  if (count <= 0) {
    return 1;
  }

  if (count === 1) {
    return 0.5;
  }

  const usableRange = 1 - LEAD_IN - LEAD_OUT;
  return LEAD_IN + (index / (count - 1)) * usableRange;
}

function getPrimaryEvidenceId(
  node: Pick<ContributionGraphNode, "evidenceIds">,
  beatByEvidence: ReadonlyMap<string, DatedBeat>,
): string | null {
  if (node.evidenceIds.length === 0) {
    return null;
  }

  return (
    [...node.evidenceIds].sort((left, right) => {
      const leftBeat = beatByEvidence.get(left);
      const rightBeat = beatByEvidence.get(right);
      return (
        compareOptionalTimestamps(
          leftBeat?.timestamp ?? null,
          rightBeat?.timestamp ?? null,
        ) || compareText(left, right)
      );
    })[0] ?? null
  );
}

function minimumProgress(
  evidenceIds: readonly string[],
  progressByEvidence: ReadonlyMap<string, number>,
): number | null {
  let minimum: number | null = null;

  for (const evidenceId of evidenceIds) {
    const progress = progressByEvidence.get(evidenceId);

    if (progress !== undefined && (minimum === null || progress < minimum)) {
      minimum = progress;
    }
  }

  return minimum;
}

function buildDatedBeats(
  graph: ContributionGraph,
  commits: readonly ContributionGraphNode[],
): readonly DatedBeat[] {
  const commitTimestampsByEvidence = new Map<string, number[]>();

  for (const commit of commits) {
    const timestamp = parseTimestamp(commit.date);

    if (timestamp === null) {
      continue;
    }

    for (const evidenceId of commit.evidenceIds) {
      const timestamps = commitTimestampsByEvidence.get(evidenceId) ?? [];
      timestamps.push(timestamp);
      commitTimestampsByEvidence.set(evidenceId, timestamps);
    }
  }

  return graph.beats
    .map((beat): DatedBeat => {
      const sourceTimestamp = parseTimestamp(beat.date);

      if (sourceTimestamp !== null) {
        return {
          beat,
          timestamp: sourceTimestamp,
          dateSource: "source",
        };
      }

      const commitTimestamps = commitTimestampsByEvidence.get(beat.id) ?? [];

      if (commitTimestamps.length > 0) {
        return {
          beat,
          timestamp: Math.max(...commitTimestamps),
          dateSource: "commit-fallback",
        };
      }

      return {
        beat,
        timestamp: null,
        dateSource: "undated",
      };
    })
    .sort(compareDatedBeats);
}

function buildPendingMoments(
  commits: readonly ContributionGraphNode[],
  beats: readonly DatedBeat[],
): readonly PendingMoment[] {
  const beatByEvidence = new Map(beats.map((beat) => [beat.beat.id, beat]));
  const moments: PendingMoment[] = beats.map(
    ({ beat, timestamp, dateSource }) => ({
      id: `beat:${beat.id}`,
      kind: "beat",
      repository: beat.repository,
      evidenceId: beat.id,
      nodeId: null,
      date: parseTimestamp(beat.date) === null ? null : beat.date,
      timestamp,
      dateSource,
    }),
  );

  for (const commit of commits) {
    const evidenceId = getPrimaryEvidenceId(commit, beatByEvidence);
    const sourceTimestamp = parseTimestamp(commit.date);
    const fallbackTimestamp =
      evidenceId === null
        ? null
        : (beatByEvidence.get(evidenceId)?.timestamp ?? null);

    moments.push({
      id: `commit:${commit.id}`,
      kind: "commit",
      repository: commit.repository,
      evidenceId,
      nodeId: commit.id,
      date: sourceTimestamp === null ? null : (commit.date ?? null),
      timestamp: sourceTimestamp ?? fallbackTimestamp,
      dateSource:
        sourceTimestamp !== null
          ? "source"
          : fallbackTimestamp !== null
            ? "beat-fallback"
            : "undated",
    });
  }

  return moments.sort(comparePendingMoments);
}

function getEndpointRevealProgress(
  revealAt: Readonly<Record<string, number>>,
  nodeId: string,
): number {
  return revealAt[nodeId] ?? 1;
}

/**
 * Classifies the generated graph's evidence semantics without inventing Git
 * parentage. No current edge kind represents literal commit ancestry.
 */
export function getContributionEdgeSemantics(
  edge: Pick<ContributionGraphEdge, "kind">,
): ContributionTimelineEdgeSemantics {
  switch (edge.kind) {
    case "contains-directory":
    case "contains-subdirectory":
    case "contains-file":
      return {
        relationship: "repository-structure",
        isLiteralCommitAncestry: false,
        revealPolicy: "endpoints",
      };
    case "documents-change":
      return {
        relationship: "repository-evidence",
        isLiteralCommitAncestry: false,
        revealPolicy: "evidence-start",
      };
    case "includes-commit":
      return {
        relationship: "evidence-commit-membership",
        isLiteralCommitAncestry: false,
        revealPolicy: "endpoints",
      };
    case "commit-touches-file":
      return {
        relationship: "commit-changed-file",
        isLiteralCommitAncestry: false,
        revealPolicy: "endpoints",
      };
    case "touches-file":
      return {
        relationship: "evidence-changed-file",
        isLiteralCommitAncestry: false,
        revealPolicy: "evidence-complete",
      };
  }
}

/**
 * Builds a deterministic, render-library-independent playback timeline.
 *
 * Commits appear at their public commit dates. Evidence starts with its first
 * public moment, while changed files appear only at the evidence milestone:
 * the graph does not contain enough information to attribute a file to a
 * particular commit or to infer commit-parent ancestry.
 */
export function createContributionTimeline(
  graph: ContributionGraph,
): ContributionTimeline {
  if ((graph as { publicOnly?: unknown }).publicOnly !== true) {
    throw new TypeError("Contribution timelines require a public-only graph.");
  }

  const commits = graph.nodes.filter((node) => node.type === "commit");
  const datedBeats = buildDatedBeats(graph, commits);
  const pendingMoments = buildPendingMoments(commits, datedBeats);
  const moments = pendingMoments.map(
    (moment, index): ContributionTimelineMoment => ({
      ...moment,
      progress: getEventProgress(index, pendingMoments.length),
    }),
  );

  const momentById = new Map(moments.map((moment) => [moment.id, moment]));
  const evidenceStartProgress = new Map<string, number>();
  const evidenceCompleteProgress = new Map<string, number>();
  const commitProgress = new Map<string, number>();

  for (const moment of moments) {
    if (moment.evidenceId !== null) {
      const existingStart = evidenceStartProgress.get(moment.evidenceId);

      if (existingStart === undefined || moment.progress < existingStart) {
        evidenceStartProgress.set(moment.evidenceId, moment.progress);
      }

      if (moment.kind === "beat") {
        evidenceCompleteProgress.set(moment.evidenceId, moment.progress);
      }
    }

    if (moment.nodeId !== null) {
      commitProgress.set(moment.nodeId, moment.progress);
    }
  }

  const beats = datedBeats.map(
    ({ beat, timestamp, dateSource }): ContributionTimelineBeat => {
      const progress = momentById.get(`beat:${beat.id}`)?.progress ?? 1;

      return {
        beat,
        progress,
        startProgress: evidenceStartProgress.get(beat.id) ?? progress,
        timestamp,
        dateSource,
      };
    },
  );

  const nodeRevealAt: Record<string, number> = {};

  for (const node of graph.nodes) {
    switch (node.type) {
      case "repository":
        nodeRevealAt[node.id] = 0;
        break;
      case "evidence":
        nodeRevealAt[node.id] =
          minimumProgress(node.evidenceIds, evidenceStartProgress) ?? 1;
        break;
      case "commit":
        nodeRevealAt[node.id] = commitProgress.get(node.id) ?? 1;
        break;
      case "directory":
      case "file":
        nodeRevealAt[node.id] =
          minimumProgress(node.evidenceIds, evidenceCompleteProgress) ??
          minimumProgress(node.evidenceIds, evidenceStartProgress) ??
          1;
        break;
    }
  }

  const edgeRevealAt: Record<string, number> = {};

  for (const edge of graph.edges) {
    const semantics = getContributionEdgeSemantics(edge);
    const endpointProgress = Math.max(
      getEndpointRevealProgress(nodeRevealAt, edge.source),
      getEndpointRevealProgress(nodeRevealAt, edge.target),
    );
    const evidenceStart =
      edge.evidenceId === undefined
        ? null
        : (evidenceStartProgress.get(edge.evidenceId) ?? null);
    const evidenceComplete =
      edge.evidenceId === undefined
        ? null
        : (evidenceCompleteProgress.get(edge.evidenceId) ??
          evidenceStartProgress.get(edge.evidenceId) ??
          null);

    switch (semantics.revealPolicy) {
      case "endpoints":
        edgeRevealAt[edge.id] = endpointProgress;
        break;
      case "evidence-start":
        edgeRevealAt[edge.id] = Math.max(
          endpointProgress,
          evidenceStart ?? endpointProgress,
        );
        break;
      case "evidence-complete":
        edgeRevealAt[edge.id] = Math.max(
          endpointProgress,
          evidenceComplete ?? endpointProgress,
        );
        break;
    }
  }

  const datedTimestamps = moments
    .map((moment) => moment.timestamp)
    .filter((timestamp): timestamp is number => timestamp !== null);

  return {
    moments,
    beats,
    nodeRevealAt,
    edgeRevealAt,
    startedAt:
      datedTimestamps.length === 0 ? null : Math.min(...datedTimestamps),
    endedAt: datedTimestamps.length === 0 ? null : Math.max(...datedTimestamps),
  };
}

export function clampTimelineProgress(progress: number): number {
  if (Number.isNaN(progress) || progress === Number.NEGATIVE_INFINITY) {
    return 0;
  }

  if (progress === Number.POSITIVE_INFINITY) {
    return 1;
  }

  return Math.min(1, Math.max(0, progress));
}

function getActiveMoment(
  timeline: ContributionTimeline,
  progress: number,
): ContributionTimelineMoment | null {
  let low = 0;
  let high = timeline.moments.length - 1;
  let activeIndex = -1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);

    if (timeline.moments[middle].progress <= progress + PROGRESS_EPSILON) {
      activeIndex = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return activeIndex < 0 ? null : timeline.moments[activeIndex];
}

export function getBeatProgress(
  timeline: ContributionTimeline,
  evidenceId: string,
): number | null {
  return (
    timeline.beats.find(({ beat }) => beat.id === evidenceId)?.progress ?? null
  );
}

export function getActiveEvidenceId(
  timeline: ContributionTimeline,
  progress: number,
): string | null {
  return (
    getActiveMoment(timeline, clampTimelineProgress(progress))?.evidenceId ??
    null
  );
}

export function getActiveTimelineBeat(
  timeline: ContributionTimeline,
  progress: number,
): ContributionTimelineBeat | null {
  const evidenceId = getActiveEvidenceId(timeline, progress);

  if (evidenceId === null) {
    return null;
  }

  return timeline.beats.find(({ beat }) => beat.id === evidenceId) ?? null;
}

export function getPreviousBeatProgress(
  timeline: ContributionTimeline,
  progress: number,
): number | null {
  const clampedProgress = clampTimelineProgress(progress);

  for (let index = timeline.beats.length - 1; index >= 0; index -= 1) {
    const beatProgress = timeline.beats[index].progress;

    if (beatProgress < clampedProgress - PROGRESS_EPSILON) {
      return beatProgress;
    }
  }

  return null;
}

export function getNextBeatProgress(
  timeline: ContributionTimeline,
  progress: number,
): number | null {
  const clampedProgress = clampTimelineProgress(progress);

  for (const { progress: beatProgress } of timeline.beats) {
    if (beatProgress > clampedProgress + PROGRESS_EPSILON) {
      return beatProgress;
    }
  }

  return null;
}

export function getContributionTimelineFrame(
  timeline: ContributionTimeline,
  progress: number,
): ContributionTimelineFrame {
  const clampedProgress = clampTimelineProgress(progress);
  const activeMoment = getActiveMoment(timeline, clampedProgress);
  const activeEvidenceId = activeMoment?.evidenceId ?? null;
  const activeBeat =
    activeEvidenceId === null
      ? null
      : (timeline.beats.find(({ beat }) => beat.id === activeEvidenceId) ??
        null);

  return {
    progress: clampedProgress,
    activeMoment,
    activeBeat,
    activeEvidenceId,
    previousBeatProgress: getPreviousBeatProgress(timeline, clampedProgress),
    nextBeatProgress: getNextBeatProgress(timeline, clampedProgress),
  };
}

export function isContributionNodeRevealed(
  timeline: ContributionTimeline,
  nodeId: string,
  progress: number,
): boolean {
  const revealAt = timeline.nodeRevealAt[nodeId];
  return (
    revealAt !== undefined &&
    revealAt <= clampTimelineProgress(progress) + PROGRESS_EPSILON
  );
}

export function isContributionEdgeRevealed(
  timeline: ContributionTimeline,
  edgeId: string,
  progress: number,
): boolean {
  const revealAt = timeline.edgeRevealAt[edgeId];
  return (
    revealAt !== undefined &&
    revealAt <= clampTimelineProgress(progress) + PROGRESS_EPSILON
  );
}
