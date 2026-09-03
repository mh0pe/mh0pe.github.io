"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { getContributionGraph } from "./graph-loaders";
import {
  modelForAgent,
  type AttributionModel,
} from "../attribution-model";
import { publishPortfolioLineageFocus } from "./lineage-focus";
import { useScrollActivity } from "./scroll-activity";
import type {
  ContributionGraphEdge,
  ContributionGraphNode,
  ContributionStoryProject,
} from "./types";

const clusterTones = {
  security: "#ff7b5d",
  cloud: "#68e4ea",
  agents: "#bca8ff",
  browser: "#c9f36b",
  durability: "#ffd27a",
} as const;

const FLOW_EDGE_BUDGET = 4;
const PULSE_NODE_BUDGET = 2;
const BACKDROP_NODE_BUDGET = 36;
const BACKDROP_EDGE_BUDGET = 54;
const BEAT_DURATION_MS = 4_800;
const BACKDROP_VISIBILITY_RATIO = 0.18;

type BackdropCandidate = {
  readonly distanceFromCenter: number;
  readonly intersectionRatio: number;
};

type ResolvedEdge = {
  readonly edge: ContributionGraphEdge;
  readonly source: ContributionGraphNode;
  readonly target: ContributionGraphNode;
};

const backdropCandidates = new Map<string, BackdropCandidate>();
const backdropOwnerListeners = new Set<() => void>();
let backdropOwnerSnapshot: string | null = null;

function chooseBackdropOwner() {
  const nextOwner =
    [...backdropCandidates.entries()].sort(
      ([leftId, left], [rightId, right]) =>
        left.distanceFromCenter - right.distanceFromCenter ||
        right.intersectionRatio - left.intersectionRatio ||
        leftId.localeCompare(rightId),
    )[0]?.[0] ?? null;

  if (nextOwner === backdropOwnerSnapshot) {
    return;
  }
  backdropOwnerSnapshot = nextOwner;
  backdropOwnerListeners.forEach((listener) => listener());
}

function setBackdropCandidate(
  id: string,
  candidate: BackdropCandidate | null,
) {
  if (candidate) {
    backdropCandidates.set(id, candidate);
  } else {
    backdropCandidates.delete(id);
  }
  chooseBackdropOwner();
}

function subscribeBackdropOwner(listener: () => void) {
  backdropOwnerListeners.add(listener);
  return () => backdropOwnerListeners.delete(listener);
}

function getBackdropOwnerSnapshot() {
  return backdropOwnerSnapshot;
}

function getServerBackdropOwnerSnapshot() {
  return null;
}

function nodeIsActive(node: ContributionGraphNode, evidenceId: string) {
  return node.type === "repository" || node.evidenceIds.includes(evidenceId);
}

function edgeIsActive(
  source: ContributionGraphNode,
  target: ContributionGraphNode,
  evidenceId: string,
) {
  return (
    (source.type === "repository" || source.evidenceIds.includes(evidenceId)) &&
    target.evidenceIds.includes(evidenceId)
  );
}

function svgNumber(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function nodeRadius(node: ContributionGraphNode) {
  const base =
    node.type === "repository"
      ? 0.11
      : node.type === "evidence"
        ? 0.078
        : node.type === "directory"
          ? 0.046
          : node.type === "commit"
            ? 0.034
            : 0.028;
  return svgNumber(
    Math.min(base * 1.42, base + Math.log2(node.weight + 1) * 0.004),
  );
}

function polygonPoints(
  x: number,
  y: number,
  radius: number,
  sides: number,
  rotation = -Math.PI / 2,
) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = rotation + (index / sides) * Math.PI * 2;
    return `${svgNumber(x + Math.cos(angle) * radius)},${svgNumber(y + Math.sin(angle) * radius)}`;
  }).join(" ");
}

function starPoints(x: number, y: number, radius: number) {
  return Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + (index / 10) * Math.PI * 2;
    const pointRadius = index % 2 === 0 ? radius : radius * 0.44;
    return `${svgNumber(x + Math.cos(angle) * pointRadius)},${svgNumber(
      y + Math.sin(angle) * pointRadius,
    )}`;
  }).join(" ");
}

function nodeGlyph(
  node: ContributionGraphNode,
  model: AttributionModel | null,
  active: boolean,
): ReactNode {
  const radius = nodeRadius(node);
  const x = svgNumber(node.x);
  const y = svgNumber(node.y);
  const common = {
    "data-active": active ? "true" : "false",
    "data-agent-marker": model?.marker ?? undefined,
    "data-model-id": model?.id ?? undefined,
    "data-model-kind": model?.kind ?? undefined,
    "data-node-type": node.type,
    style: model
      ? ({ "--model-signal": model.tone } as CSSProperties)
      : undefined,
  };
  const marker = model?.marker ?? null;

  if (marker === "triangle") {
    return (
      <polygon
        {...common}
        key={node.id}
        points={polygonPoints(x, y, radius * 1.22, 3)}
      />
    );
  }
  if (marker === "diamond") {
    return (
      <rect
        {...common}
        height={svgNumber(radius * 2)}
        key={node.id}
        rx={svgNumber(radius * 0.16)}
        transform={`rotate(45 ${x} ${y})`}
        width={svgNumber(radius * 2)}
        x={svgNumber(x - radius)}
        y={svgNumber(y - radius)}
      />
    );
  }
  if (marker === "square") {
    return (
      <rect
        {...common}
        height={svgNumber(radius * 2)}
        key={node.id}
        rx={svgNumber(radius * 0.18)}
        width={svgNumber(radius * 2)}
        x={svgNumber(x - radius)}
        y={svgNumber(y - radius)}
      />
    );
  }
  if (marker === "star") {
    return (
      <polygon
        {...common}
        key={node.id}
        points={starPoints(x, y, radius * 1.34)}
      />
    );
  }
  if (
    node.type === "evidence" &&
    node.availability === "public-fork"
  ) {
    return (
      <rect
        {...common}
        height={svgNumber(radius * 2)}
        key={node.id}
        rx={svgNumber(radius * 0.14)}
        transform={`rotate(45 ${x} ${y})`}
        width={svgNumber(radius * 2)}
        x={svgNumber(x - radius)}
        y={svgNumber(y - radius)}
      />
    );
  }
  if (node.type === "repository") {
    return (
      <polygon
        {...common}
        key={node.id}
        points={polygonPoints(x, y, radius * 1.12, 6)}
      />
    );
  }
  return <circle {...common} cx={x} cy={y} key={node.id} r={radius} />;
}

type ProjectModelSignal = AttributionModel & {
  readonly recordedCommitCount: number;
};

function projectModelSignals(
  agents: readonly {
    readonly id: string;
    readonly label: string;
    readonly provider: string;
    readonly aliases: readonly string[];
    readonly marker: string;
    readonly recordedCommitCount: number;
  }[],
): readonly ProjectModelSignal[] {
  const signals = new Map<string, ProjectModelSignal>();
  for (const agent of agents) {
    const model = modelForAgent(agent);
    if (!model) {
      continue;
    }
    const current = signals.get(model.id);
    signals.set(model.id, {
      ...model,
      sourceIds: [
        ...new Set([...(current?.sourceIds ?? []), ...model.sourceIds]),
      ],
      recordedCommitCount:
        (current?.recordedCommitCount ?? 0) + agent.recordedCommitCount,
    });
  }
  return [...signals.values()].sort(
    (left, right) =>
      right.recordedCommitCount - left.recordedCommitCount ||
      left.label.localeCompare(right.label),
  );
}

export function ProjectModelSpectrum({
  project,
}: {
  readonly project: ContributionStoryProject;
}) {
  const graph = getContributionGraph(project.graphId);
  const signals = projectModelSignals(graph.agents);
  if (signals.length === 0) {
    return null;
  }

  return (
    <div
      className="project-model-spectrum"
      aria-label={`Model metadata for commits related to ${project.title}`}
    >
      <div className="project-model-spectrum-heading">
        <span>Model spectrum</span>
        <small>Related commit metadata</small>
      </div>
      <ul>
        {signals.map((signal) => (
          <li
            data-model-id={signal.id}
            data-model-kind={signal.kind}
            data-model-marker={signal.marker}
            key={signal.id}
            style={
              { "--model-signal": signal.tone } as CSSProperties
            }
            title={`${signal.label}: ${signal.recordedCommitCount} related ${
              signal.recordedCommitCount === 1 ? "commit" : "commits"
            }`}
          >
            <i aria-hidden="true" />
            <span>
              <strong>{signal.label}</strong>
              <small>
                {signal.recordedCommitCount} related{" "}
                {signal.recordedCommitCount === 1 ? "commit" : "commits"}
              </small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function edgePath(edges: readonly ResolvedEdge[]) {
  return edges
    .map(
      ({ source, target }) =>
        `M ${svgNumber(source.x)} ${svgNumber(source.y)} L ${svgNumber(target.x)} ${svgNumber(target.y)}`,
    )
    .join(" ");
}

function sampleEdges(
  edges: readonly ResolvedEdge[],
  budget: number,
): readonly ResolvedEdge[] {
  if (edges.length <= budget) {
    return edges;
  }
  const stride = edges.length / budget;
  return Array.from(
    { length: budget },
    (_, index) => edges[Math.min(edges.length - 1, Math.floor(index * stride))],
  );
}

function sampleBackdropNodes(
  nodes: readonly ContributionGraphNode[],
): readonly ContributionGraphNode[] {
  const required = nodes.filter(
    (node) => node.type === "repository" || node.type === "evidence",
  );
  if (nodes.length <= BACKDROP_NODE_BUDGET) {
    return nodes;
  }

  const requiredIds = new Set(required.map((node) => node.id));
  const candidates = nodes.filter((node) => !requiredIds.has(node.id));
  const sampled = sampleItems(
    candidates,
    Math.max(0, BACKDROP_NODE_BUDGET - required.length),
  );
  const visibleIds = new Set([
    ...requiredIds,
    ...sampled.map((node) => node.id),
  ]);
  return nodes.filter((node) => visibleIds.has(node.id));
}

function sampleBackdropEdges(
  edges: readonly ResolvedEdge[],
): readonly ResolvedEdge[] {
  if (edges.length <= BACKDROP_EDGE_BUDGET) {
    return edges;
  }

  const required = edges.filter(
    ({ edge }) => edge.kind === "documents-change",
  );
  const requiredIds = new Set(required.map(({ edge }) => edge.id));
  const candidates = edges.filter(({ edge }) => !requiredIds.has(edge.id));
  const sampled = sampleItems(
    candidates,
    Math.max(0, BACKDROP_EDGE_BUDGET - required.length),
  );
  const visibleIds = new Set([
    ...requiredIds,
    ...sampled.map(({ edge }) => edge.id),
  ]);
  return edges.filter(({ edge }) => visibleIds.has(edge.id));
}

function sampleItems<T>(items: readonly T[], budget: number): readonly T[] {
  if (items.length <= budget) {
    return items;
  }
  if (budget <= 0) {
    return [];
  }
  const stride = items.length / budget;
  return Array.from(
    { length: budget },
    (_, index) => items[Math.min(items.length - 1, Math.floor(index * stride))],
  );
}

export function ProjectConstellationBackdrop({
  project,
}: {
  readonly project: ContributionStoryProject;
}) {
  const ownerId = useId();
  const layerRef = useRef<HTMLDivElement | null>(null);
  const interactionPausedRef = useRef(false);
  const reduceMotion = useReducedMotion() === true;
  const scrollActive = useScrollActivity();
  const owner = useSyncExternalStore(
    subscribeBackdropOwner,
    getBackdropOwnerSnapshot,
    getServerBackdropOwnerSnapshot,
  );
  const graph = getContributionGraph(project.graphId);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [beatIndex, setBeatIndex] = useState(0);
  const active = owner === ownerId && visible && documentVisible;
  const visualActive = active && !scrollActive;
  const motionActive = visualActive && !reduceMotion;
  const resolvedBeatIndex = reduceMotion
    ? Math.max(0, graph.beats.length - 1)
    : beatIndex;
  const selectedBeat =
    graph.beats[resolvedBeatIndex] ?? graph.beats[0] ?? null;
  const selectedEvidenceId = selectedBeat?.id ?? "";

  const nodeById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  );
  const modelByAgentId = useMemo(
    () =>
      new Map(
        graph.agents.map((agent) => [agent.id, modelForAgent(agent)]),
      ),
    [graph.agents],
  );
  const backdropNodes = useMemo(
    () => sampleBackdropNodes(graph.nodes),
    [graph.nodes],
  );
  const backdropNodeIds = useMemo(
    () => new Set(backdropNodes.map((node) => node.id)),
    [backdropNodes],
  );
  const resolvedEdges = useMemo(
    () =>
      graph.edges.flatMap((edge) => {
        const source = nodeById.get(edge.source);
        const target = nodeById.get(edge.target);
        return source && target ? [{ edge, source, target }] : [];
      }),
    [graph.edges, nodeById],
  );
  const backdropEdges = useMemo(
    () =>
      sampleBackdropEdges(
        resolvedEdges.filter(
          ({ source, target }) =>
            backdropNodeIds.has(source.id) && backdropNodeIds.has(target.id),
        ),
      ),
    [backdropNodeIds, resolvedEdges],
  );
  const activeEdges = useMemo(
    () =>
      backdropEdges.filter(
        ({ edge, source, target }) =>
          edge.evidenceId === selectedEvidenceId ||
          edgeIsActive(source, target, selectedEvidenceId),
      ),
    [backdropEdges, selectedEvidenceId],
  );
  const flowEdges = useMemo(
    () =>
      sampleEdges(
        activeEdges.length > 0 ? activeEdges : backdropEdges,
        FLOW_EDGE_BUDGET,
      ),
    [activeEdges, backdropEdges],
  );
  const pulseNodes = useMemo(
    () =>
      backdropNodes
        .filter(
          (node) =>
            node.type === "repository" ||
            node.agentId ||
            (node.type === "evidence" &&
              nodeIsActive(node, selectedEvidenceId)),
        )
        .sort((left, right) => right.weight - left.weight)
        .slice(0, PULSE_NODE_BUDGET),
    [backdropNodes, selectedEvidenceId],
  );

  useEffect(() => {
    const layer = layerRef.current;
    const article = layer?.closest<HTMLElement>("[data-evolution-project]");
    if (!layer || !article) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (scrollActive) {
          setBackdropCandidate(ownerId, null);
          return;
        }
        const nextVisible =
          entry.isIntersecting &&
          entry.intersectionRatio >= BACKDROP_VISIBILITY_RATIO;
        setVisible(nextVisible);
        if (!nextVisible) {
          setBackdropCandidate(ownerId, null);
          return;
        }
        const center =
          entry.boundingClientRect.top + entry.boundingClientRect.height / 2;
        setBackdropCandidate(ownerId, {
          distanceFromCenter: Math.abs(center - window.innerHeight / 2),
          intersectionRatio: entry.intersectionRatio,
        });
      },
      {
        rootMargin: "12% 0px",
        threshold: [0, BACKDROP_VISIBILITY_RATIO, 0.36, 0.62],
      },
    );
    observer.observe(article);
    return () => {
      observer.disconnect();
      setBackdropCandidate(ownerId, null);
    };
  }, [ownerId, scrollActive]);

  useEffect(() => {
    const update = () => setDocumentVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    const article = layerRef.current?.closest<HTMLElement>(
      "[data-evolution-project]",
    );
    article?.setAttribute(
      "data-evolution-active",
      visualActive ? "true" : "false",
    );
    return () => article?.setAttribute("data-evolution-active", "false");
  }, [visualActive]);

  useEffect(() => {
    if (
      !motionActive ||
      interactionPausedRef.current ||
      graph.beats.length < 2
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      setBeatIndex((current) => (current + 1) % graph.beats.length);
    }, BEAT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [beatIndex, graph.beats.length, motionActive]);

  useEffect(() => {
    const article = layerRef.current?.closest<HTMLElement>(
      "[data-evolution-project]",
    );
    if (!article) {
      return;
    }
    const selectEvidence = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const evidenceId =
        target.closest<HTMLElement>("[data-evidence-id]")?.dataset.evidenceId;
      const nextIndex = graph.beats.findIndex(
        (beat) => beat.id === evidenceId,
      );
      if (nextIndex < 0) {
        return;
      }
      interactionPausedRef.current = true;
      setBeatIndex(nextIndex);
    };
    const releasePointer = () => {
      interactionPausedRef.current = false;
    };
    const releaseFocus = (event: FocusEvent) => {
      if (
        !(event.relatedTarget instanceof Node) ||
        !article.contains(event.relatedTarget)
      ) {
        interactionPausedRef.current = false;
      }
    };
    article.addEventListener("pointerover", selectEvidence);
    article.addEventListener("focusin", selectEvidence);
    article.addEventListener("pointerleave", releasePointer);
    article.addEventListener("focusout", releaseFocus);
    return () => {
      article.removeEventListener("pointerover", selectEvidence);
      article.removeEventListener("focusin", selectEvidence);
      article.removeEventListener("pointerleave", releasePointer);
      article.removeEventListener("focusout", releaseFocus);
    };
  }, [graph.beats]);

  useEffect(() => {
    if (!visualActive || !selectedBeat) {
      return;
    }
    publishPortfolioLineageFocus({
      chapterId: project.clusterId,
      evidenceId: selectedBeat.id,
      projectId: project.id,
      graphId: project.graphId,
      repository: selectedBeat.repository,
      commitId: null,
      fileId: null,
      nodeId: null,
      nodeType: null,
      source: "project-simulation",
    });
  }, [project, selectedBeat, visualActive]);

  return (
    <div
      aria-hidden="true"
      className="project-constellation"
      data-constellation-active={visualActive ? "true" : "false"}
      data-constellation-visible={visible ? "true" : "false"}
      data-edge-count={graph.edges.length}
      data-evidence-id={selectedEvidenceId}
      data-graph-source="inline"
      data-node-count={graph.nodes.length}
      data-project-constellation={project.graphId}
      ref={layerRef}
      style={
        {
          "--constellation-tone": clusterTones[project.clusterId],
        } as CSSProperties
      }
    >
      <svg
        focusable="false"
        preserveAspectRatio="xMidYMid slice"
        viewBox="-3.3 -2.35 6.6 4.7"
      >
        <path
          className="project-constellation-edges"
          d={edgePath(backdropEdges)}
          vectorEffect="non-scaling-stroke"
        />
        {activeEdges.length > 0 ? (
          <path
            className="project-constellation-edges-active"
            d={edgePath(activeEdges)}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        <motion.g
          animate={{ opacity: visualActive ? 1 : 0.48 }}
          className="project-constellation-nodes"
          initial={false}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 92, damping: 24, mass: 1.1 }
          }
        >
          {backdropNodes.map((node) =>
            nodeGlyph(
              node,
              node.agentId
                ? (modelByAgentId.get(node.agentId) ?? null)
                : null,
              nodeIsActive(node, selectedEvidenceId),
            ),
          )}
        </motion.g>
        {motionActive ? (
          <g
            className="project-constellation-flow"
            data-motion-layer="contribution-flow"
          >
            {flowEdges.map(({ source, target }, index) => {
              const delay = index * 0.34;
              const duration = 2.45 + index * 0.21;
              return (
                <circle
                  className="project-constellation-traveler"
                  cx="0"
                  cy="0"
                  key={`flow:${index}`}
                  opacity="0"
                  r="0.035"
                >
                  <animateMotion
                    begin={`${delay}s`}
                    calcMode="spline"
                    dur={`${duration}s`}
                    keyPoints="0;1"
                    keySplines="0.16 1 0.3 1"
                    keyTimes="0;1"
                    path={`M ${source.x} ${source.y} L ${target.x} ${target.y}`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    begin={`${delay}s`}
                    dur={`${duration}s`}
                    keyTimes="0;0.18;0.78;1"
                    repeatCount="indefinite"
                    values="0;0.92;0.92;0"
                  />
                </circle>
              );
            })}
            {pulseNodes.map((node, index) => {
              const radius = nodeRadius(node);
              const delay = index * 0.58;
              const duration = 2.8 + index * 0.24;
              return (
                <circle
                  className="project-constellation-pulse"
                  cx={node.x}
                  cy={node.y}
                  key={`pulse:${node.id}`}
                  opacity="0"
                  r={radius}
                >
                  <animate
                    attributeName="opacity"
                    begin={`${delay}s`}
                    dur={`${duration}s`}
                    keyTimes="0;0.16;0.82;1"
                    repeatCount="indefinite"
                    values="0;0.56;0;0"
                  />
                  <animate
                    attributeName="r"
                    begin={`${delay}s`}
                    dur={`${duration}s`}
                    keyTimes="0;0.82;1"
                    repeatCount="indefinite"
                    values={`${radius * 1.2};${radius * 4};${radius * 4}`}
                  />
                </circle>
              );
            })}
          </g>
        ) : null}
      </svg>
    </div>
  );
}
