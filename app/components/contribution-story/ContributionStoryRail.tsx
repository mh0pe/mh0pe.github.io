"use client";

import {
  Component,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { contributionLineageChapters } from "../../data/contribution-lineage";
import {
  ContributionGraphCanvas,
  type GourceNodeHover,
} from "./ContributionGraphCanvas";
import { getContributionGraph } from "./graph-loaders";
import {
  getPortfolioLineageFocus,
  publishPortfolioLineageFocus,
  subscribePortfolioLineageFocus,
} from "./lineage-focus";
import { useScrollActivity } from "./scroll-activity";
import type {
  ContributionGraph,
  ContributionGraphBeat,
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

const STATIC_TRAVELER_BUDGET = 6;
const STATIC_PULSE_BUDGET = 2;

const beatNarrativeById = new Map(
  contributionLineageChapters.flatMap((chapter) =>
    chapter.events.map((event) => [event.id, event.detail] as const),
  ),
);

let canvasClaimOrder = 0;
let webGl2Supported: boolean | null = null;
const serverCanvasOwnerSnapshot = {
  owner: null,
  revision: 0,
} as const;
let canvasOwnerSnapshot: {
  readonly owner: string | null;
  readonly revision: number;
} = serverCanvasOwnerSnapshot;
const canvasCandidates = new Map<string, number>();
const canvasOwnerListeners = new Set<() => void>();

function publishCanvasOwner() {
  const nextOwner =
    [...canvasCandidates.entries()].sort(
      ([, leftOrder], [, rightOrder]) => rightOrder - leftOrder,
    )[0]?.[0] ?? null;
  if (nextOwner === canvasOwnerSnapshot.owner) {
    return;
  }
  canvasOwnerSnapshot = {
    owner: nextOwner,
    revision: canvasOwnerSnapshot.revision + 1,
  };
  canvasOwnerListeners.forEach((listener) => listener());
}

function setCanvasCandidate(id: string, eligible: boolean) {
  if (eligible) {
    if (!canvasCandidates.has(id)) {
      canvasCandidates.set(id, ++canvasClaimOrder);
    }
  } else {
    canvasCandidates.delete(id);
  }
  publishCanvasOwner();
}

function subscribeToCanvasOwner(listener: () => void) {
  canvasOwnerListeners.add(listener);
  return () => {
    canvasOwnerListeners.delete(listener);
  };
}

function getCanvasOwnerSnapshot() {
  return canvasOwnerSnapshot;
}

function getServerCanvasOwnerSnapshot() {
  return serverCanvasOwnerSnapshot;
}

class GraphBoundary extends Component<
  { readonly children: ReactNode; readonly onError: () => void },
  { readonly failed: boolean }
> {
  state: Readonly<{ failed: boolean }> = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function supportsWebGl2() {
  if (webGl2Supported !== null) {
    return webGl2Supported;
  }
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    if (!context) {
      webGl2Supported = false;
      return webGl2Supported;
    }
    context.getExtension("WEBGL_lose_context")?.loseContext();
    canvas.width = 1;
    canvas.height = 1;
    webGl2Supported = true;
    return webGl2Supported;
  } catch {
    webGl2Supported = false;
    return webGl2Supported;
  }
}

function graphEdgeIsActive(
  source: ContributionGraphNode,
  target: ContributionGraphNode,
  evidenceId: string,
) {
  return (
    (source.type === "repository" || source.evidenceIds.includes(evidenceId)) &&
    target.evidenceIds.includes(evidenceId)
  );
}

function graphNodeIsActive(node: ContributionGraphNode, evidenceId: string) {
  return node.type === "repository" || node.evidenceIds.includes(evidenceId);
}

function staticNodeRadius(node: ContributionGraphNode) {
  return node.type === "repository"
    ? 0.11
    : node.type === "evidence"
      ? 0.085
      : node.type === "directory"
        ? 0.052
        : 0.032;
}

function StaticGraph({
  animate,
  graph,
  highlightedNodeId,
  selectedEvidenceId,
}: {
  readonly animate: boolean;
  readonly graph: ContributionGraph;
  readonly highlightedNodeId: string | null;
  readonly selectedEvidenceId: string;
}) {
  const nodeById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph],
  );
  const animatedEdges = useMemo(
    () =>
      graph.edges
        .flatMap((edge) => {
          const source = nodeById.get(edge.source);
          const target = nodeById.get(edge.target);
          if (
            !source ||
            !target ||
            (edge.evidenceId !== selectedEvidenceId &&
              !graphEdgeIsActive(source, target, selectedEvidenceId))
          ) {
            return [];
          }
          return [{ edge, source, target }];
        })
        .slice(0, STATIC_TRAVELER_BUDGET),
    [graph.edges, nodeById, selectedEvidenceId],
  );
  const animatedNodes = useMemo(
    () =>
      graph.nodes
        .filter((node) => graphNodeIsActive(node, selectedEvidenceId))
        .slice(0, STATIC_PULSE_BUDGET),
    [graph.nodes, selectedEvidenceId],
  );

  return (
    <svg
      className="project-evolution-static"
      data-motion-active={animate ? "true" : "false"}
      viewBox="-3 -2.15 6 4.3"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <g>
        {graph.edges.map((edge) => {
          const source = nodeById.get(edge.source);
          const target = nodeById.get(edge.target);
          if (!source || !target) {
            return null;
          }
          const active =
            edge.evidenceId === selectedEvidenceId ||
            graphEdgeIsActive(source, target, selectedEvidenceId);
          return (
            <line
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              data-active={active ? "true" : "false"}
              data-kind={edge.kind}
              key={edge.id}
            />
          );
        })}
      </g>
      <g>
        {graph.nodes.map((node) => {
          const active = graphNodeIsActive(node, selectedEvidenceId);
          const radius = staticNodeRadius(node);
          return node.type === "evidence" &&
            node.availability === "public-fork" ? (
            <rect
              x={node.x - radius}
              y={node.y - radius}
              width={radius * 2}
              height={radius * 2}
              rx={0.018}
              transform={`rotate(45 ${node.x} ${node.y})`}
              data-active={active ? "true" : "false"}
              data-player-active={
                highlightedNodeId === node.id ? "true" : "false"
              }
              data-node-type={node.type}
              key={node.id}
            />
          ) : (
            <circle
              cx={node.x}
              cy={node.y}
              r={radius}
              data-active={active ? "true" : "false"}
              data-player-active={
                highlightedNodeId === node.id ? "true" : "false"
              }
              data-node-type={node.type}
              key={node.id}
            />
          );
        })}
      </g>
      <motion.g
        animate={{ opacity: animate ? 1 : 0 }}
        className="project-evolution-static-motion"
        data-motion-layer="contribution-flow"
        initial={false}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        {animatedEdges.map(({ edge, source, target }, index) => {
          const delay = (index % 9) * 0.16;
          const duration = 2.35 + (index % 4) * 0.22;
          const timing = `${duration + 0.28}s`;
          return (
            <circle
              className="project-evolution-motion-traveler"
              cx={0}
              cy={0}
              data-motion-traveler={edge.kind}
              key={`traveler:${edge.id}`}
              opacity={0}
              r={0.038}
            >
              {animate ? (
                <>
                  <animateMotion
                    begin={`${delay}s`}
                    calcMode="spline"
                    dur={timing}
                    keyPoints="0;1;1"
                    keySplines="0.4 0 0.2 1;0 0 1 1"
                    keyTimes={`0;${duration / (duration + 0.28)};1`}
                    path={`M ${source.x} ${source.y} L ${target.x} ${target.y}`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    begin={`${delay}s`}
                    dur={timing}
                    keyTimes="0;0.18;0.78;0.9;1"
                    repeatCount="indefinite"
                    values="0;0.96;0.96;0;0"
                  />
                  <animate
                    attributeName="r"
                    begin={`${delay}s`}
                    dur={timing}
                    keyTimes="0;0.46;0.9;1"
                    repeatCount="indefinite"
                    values="0.028;0.052;0.028;0.028"
                  />
                </>
              ) : null}
            </circle>
          );
        })}
        {animatedNodes.map((node, index) => {
          const radius = staticNodeRadius(node);
          const delay = (index % 7) * 0.22;
          const duration = 2.1 + (index % 3) * 0.24;
          const timing = `${duration + 0.34}s`;
          return (
            <circle
              className="project-evolution-motion-pulse"
              cx={node.x}
              cy={node.y}
              data-motion-pulse={node.type}
              key={`pulse:${node.id}`}
              opacity={0}
              r={radius * 1.15}
            >
              {animate ? (
                <>
                  <animate
                    attributeName="opacity"
                    begin={`${delay}s`}
                    dur={timing}
                    keyTimes="0;0.16;0.78;1"
                    repeatCount="indefinite"
                    values="0;0.62;0;0"
                  />
                  <animate
                    attributeName="r"
                    begin={`${delay}s`}
                    dur={timing}
                    keyTimes="0;0.78;1"
                    repeatCount="indefinite"
                    values={`${radius * 1.15};${radius * 3.9};${
                      radius * 3.9
                    }`}
                  />
                </>
              ) : null}
            </circle>
          );
        })}
      </motion.g>
      <g className="project-evolution-static-labels">
        {graph.nodes
          .filter(
            (node) =>
              node.type === "repository" ||
              (node.type === "file" &&
                node.evidenceIds.includes(selectedEvidenceId)),
          )
          .sort((left, right) => right.weight - left.weight)
          .slice(0, 9)
          .map((node) => (
            <text
              x={node.x + 0.08}
              y={node.y - 0.065}
              data-node-type={node.type}
              key={`label:${node.id}`}
            >
              {node.type === "repository" ? node.repository : node.label}
            </text>
          ))}
      </g>
    </svg>
  );
}

function compactDate(value: string | null) {
  if (!value) {
    return "Public evidence";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function selectedBeat(
  graph: ContributionGraph | null,
  evidenceId: string,
): ContributionGraphBeat | null {
  return (
    graph?.beats.find((beat) => beat.id === evidenceId) ??
    graph?.beats[0] ??
    null
  );
}

function graphNodeForBeat(
  node: ContributionGraphNode | null | undefined,
  beat: ContributionGraphBeat | null,
): ContributionGraphNode | null {
  if (
    !node ||
    !beat ||
    (node.type !== "repository" && !node.evidenceIds.includes(beat.id))
  ) {
    return null;
  }
  if (node.type !== "file") {
    return node;
  }
  const file = beat.files.find((candidate) => candidate.nodeId === node.id);
  return file
    ? {
        ...node,
        label: file.label,
        path: file.path,
        href: file.href,
        repository: file.repository,
        status: file.status,
      }
    : null;
}

export function ContributionStoryRail({
  scopeId,
  projects,
}: {
  readonly scopeId: string;
  readonly projects: readonly ContributionStoryProject[];
}) {
  const canvasCandidateId = useId();
  const railRef = useRef<HTMLElement | null>(null);
  const evidenceDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const entriesRef = useRef(new Map<Element, IntersectionObserverEntry>());
  const reduceMotion = useReducedMotion() === true;
  const scrollActive = useScrollActivity();
  const claimedCanvasOwner = useSyncExternalStore(
    subscribeToCanvasOwner,
    getCanvasOwnerSnapshot,
    getServerCanvasOwnerSnapshot,
  );
  const [activeProjectId, setActiveProjectId] = useState(projects[0]?.id ?? "");
  const [selectedEvidenceId, setSelectedEvidenceId] = useState("");
  const [canUseCanvas, setCanUseCanvas] = useState(false);
  const [railVisible, setRailVisible] = useState(false);
  const [scopeVisible, setScopeVisible] = useState(false);
  const [failedCanvasGraphId, setFailedCanvasGraphId] = useState<
    string | null
  >(null);
  const [readyCanvasSessionId, setReadyCanvasSessionId] = useState<string | null>(
    null,
  );
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<GourceNodeHover | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [listHighlightedNodeId, setListHighlightedNodeId] = useState<
    string | null
  >(null);
  const pendingEvidenceIdRef = useRef<string | null>(null);
  const autoplayPausedRef = useRef(false);

  const activeProject =
    projects.find((project) => project.id === activeProjectId) ??
    projects[0] ??
    null;
  const activeGraphId = activeProject?.graphId ?? null;
  const activeClusterId = activeProject?.clusterId ?? null;
  const resolvedProjectId = activeProject?.id ?? null;
  const activeGraph = activeGraphId
    ? getContributionGraph(activeGraphId)
    : null;
  const canvasFailed = failedCanvasGraphId === activeGraphId;
  const tone = activeProject
    ? clusterTones[activeProject.clusterId]
    : clusterTones.agents;
  const beat = selectedBeat(activeGraph, selectedEvidenceId);
  const activeEvidenceId = beat?.id ?? "";
  const activeNodeById = useMemo(
    () => new Map((activeGraph?.nodes ?? []).map((node) => [node.id, node])),
    [activeGraph],
  );
  const activeFiles = useMemo(
    () =>
      (beat?.files ?? [])
        .map((file) => graphNodeForBeat(activeNodeById.get(file.nodeId), beat))
        .filter((file): file is ContributionGraphNode => file !== null),
    [activeNodeById, beat],
  );
  const hoveredGraphNode = hoveredNode
    ? graphNodeForBeat(activeNodeById.get(hoveredNode.nodeId), beat)
    : null;
  const selectedGraphNode = selectedNodeId
    ? graphNodeForBeat(activeNodeById.get(selectedNodeId), beat)
    : null;
  const listHighlightedGraphNode = listHighlightedNodeId
    ? graphNodeForBeat(activeNodeById.get(listHighlightedNodeId), beat)
    : null;
  const inspectedGraphNode =
    selectedGraphNode ?? hoveredGraphNode ?? listHighlightedGraphNode;
  const highlightedNodeId =
    hoveredGraphNode?.id ??
    listHighlightedGraphNode?.id ??
    selectedGraphNode?.id ??
    null;

  useEffect(() => {
    const query = window.matchMedia(
      "(min-width: 64rem) and (pointer: fine) and (hover: hover)",
    );
    const forcedColors = window.matchMedia("(forced-colors: active)");
    const update = () => {
      const canvasAvailable =
        query.matches && !forcedColors.matches && supportsWebGl2();
      setCanUseCanvas(canvasAvailable);
    };
    update();
    query.addEventListener("change", update);
    forcedColors.addEventListener("change", update);
    return () => {
      query.removeEventListener("change", update);
      forcedColors.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setRailVisible(entry.isIntersecting),
      {
        rootMargin: "0px 0px 25% 0px",
        threshold: 0.01,
      },
    );
    observer.observe(rail);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const scope = document.getElementById(scopeId);
    if (!scope) {
      return;
    }
    const observedEntries = entriesRef.current;
    const articles = Array.from(
      scope.querySelectorAll<HTMLElement>("[data-evolution-project]"),
    );
    const chooseActive = () => {
      if (scrollActive) {
        return;
      }
      const viewportCenter = window.innerHeight / 2;
      const visible = [...observedEntries.values()]
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => {
          const leftCenter =
            left.boundingClientRect.top + left.boundingClientRect.height / 2;
          const rightCenter =
            right.boundingClientRect.top + right.boundingClientRect.height / 2;
          return (
            Math.abs(leftCenter - viewportCenter) -
            Math.abs(rightCenter - viewportCenter)
          );
        });
      const nextId = visible[0]?.target.getAttribute("data-evolution-project");
      if (nextId) {
        setActiveProjectId(nextId);
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => observedEntries.set(entry.target, entry));
        chooseActive();
      },
      {
        rootMargin: "-18% 0px -38% 0px",
        threshold: [0.05, 0.18, 0.36, 0.62],
      },
    );
    articles.forEach((article) => observer.observe(article));
    return () => {
      observer.disconnect();
      observedEntries.clear();
    };
  }, [scopeId, scrollActive]);

  useEffect(() => {
    const scope = document.getElementById(scopeId);
    if (!scope) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setScopeVisible(entry.isIntersecting),
      { rootMargin: "35% 0px", threshold: 0.01 },
    );
    observer.observe(scope);
    return () => observer.disconnect();
  }, [scopeId]);

  useEffect(() => {
    const scope = document.getElementById(scopeId);
    if (!scope) {
      return;
    }
    scope
      .querySelectorAll<HTMLElement>("[data-evolution-project]")
      .forEach((article) => {
        article.setAttribute(
          "data-evolution-active",
          article.dataset.evolutionProject === resolvedProjectId
            ? "true"
            : "false",
        );
      });
  }, [resolvedProjectId, scopeId]);

  useEffect(() => {
    if (!activeGraph) {
      return;
    }
    const pendingEvidenceId = pendingEvidenceIdRef.current;
    const pendingBeat = activeGraph.beats.find(
      (item) => item.id === pendingEvidenceId,
    );
    setSelectedEvidenceId(
      pendingBeat?.id ??
        (reduceMotion
          ? (activeGraph.beats.at(-1)?.id ?? "")
          : (activeGraph.beats[0]?.id ?? "")),
    );
    pendingEvidenceIdRef.current = null;
    autoplayPausedRef.current = pendingBeat !== undefined;
    setHoveredNode(null);
    setSelectedNodeId(null);
    setListHighlightedNodeId(null);
  }, [activeGraph, reduceMotion]);

  useEffect(() => {
    if (
      !activeGraph ||
      !scopeVisible ||
      scrollActive ||
      reduceMotion ||
      !resolvedProjectId ||
      activeGraph.beats.length < 2
    ) {
      return;
    }
    const scope = document.getElementById(scopeId);
    const article = Array.from(
      scope?.querySelectorAll<HTMLElement>("[data-evolution-project]") ?? [],
    ).find(
      (candidate) => candidate.dataset.evolutionProject === resolvedProjectId,
    );
    if (!article) {
      return;
    }
    let frame = 0;
    const updateFromScroll = () => {
      frame = 0;
      if (
        autoplayPausedRef.current ||
        hoveredNode !== null ||
        selectedNodeId !== null ||
        listHighlightedNodeId !== null ||
        evidenceOpen ||
        document.hidden
      ) {
        return;
      }
      const rect = article.getBoundingClientRect();
      const entryLine = window.innerHeight * 0.82;
      const exitLine = window.innerHeight * 0.18;
      const travel = Math.max(1, rect.height + entryLine - exitLine);
      const progress = Math.min(
        1,
        Math.max(0, (entryLine - rect.top) / travel),
      );
      const beatIndex = Math.min(
        activeGraph.beats.length - 1,
        Math.floor(progress * activeGraph.beats.length),
      );
      const nextEvidenceId = activeGraph.beats[beatIndex]?.id;
      if (nextEvidenceId) {
        setSelectedEvidenceId((current) =>
          current === nextEvidenceId ? current : nextEvidenceId,
        );
      }
    };
    const scheduleUpdate = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(updateFromScroll);
      }
    };
    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    document.addEventListener("visibilitychange", scheduleUpdate);
    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      document.removeEventListener("visibilitychange", scheduleUpdate);
    };
  }, [
    activeGraph,
    evidenceOpen,
    hoveredNode,
    listHighlightedNodeId,
    reduceMotion,
    resolvedProjectId,
    scrollActive,
    scopeVisible,
    scopeId,
    selectedNodeId,
  ]);

  useEffect(() => {
    const applyExternalFocus = () => {
      const focus = getPortfolioLineageFocus();
      if (
        (focus.source !== "constellation" &&
          focus.source !== "card-player") ||
        !focus.projectId ||
        !projects.some((project) => project.id === focus.projectId)
      ) {
        return;
      }
      pendingEvidenceIdRef.current = focus.evidenceId;
      autoplayPausedRef.current = true;
      setSelectedNodeId(
        focus.source === "card-player" ? focus.nodeId : null,
      );
      setHoveredNode(null);
      setListHighlightedNodeId(null);
      setActiveProjectId(focus.projectId);
      setSelectedEvidenceId((current) =>
        activeGraph?.beats.some((item) => item.id === focus.evidenceId)
          ? (focus.evidenceId ?? current)
          : current,
      );
    };
    return subscribePortfolioLineageFocus(applyExternalFocus);
  }, [activeGraph, projects]);

  useEffect(() => {
    const scope = document.getElementById(scopeId);
    if (!scope) {
      return;
    }
    const selectFromTarget = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const evidenceTarget = target.closest<HTMLElement>("[data-evidence-id]");
      const article = target.closest<HTMLElement>("[data-evolution-project]");
      if (!evidenceTarget || !article || !scope.contains(article)) {
        return;
      }
      const projectId = article.dataset.evolutionProject;
      const evidenceId = evidenceTarget.dataset.evidenceId;
      if (projectId) {
        setActiveProjectId(projectId);
      }
      if (evidenceId) {
        if (evidenceId !== activeEvidenceId) {
          setSelectedNodeId(null);
          setHoveredNode(null);
          setListHighlightedNodeId(null);
        }
        setSelectedEvidenceId(evidenceId);
      }
    };
    scope.addEventListener("focusin", selectFromTarget);
    scope.addEventListener("pointerover", selectFromTarget);
    return () => {
      scope.removeEventListener("focusin", selectFromTarget);
      scope.removeEventListener("pointerover", selectFromTarget);
    };
  }, [activeEvidenceId, scopeId]);

  useEffect(() => {
    if (!activeClusterId || !resolvedProjectId || !railVisible) {
      return;
    }
    publishPortfolioLineageFocus({
      chapterId: activeClusterId,
      evidenceId: activeEvidenceId || null,
      projectId: resolvedProjectId,
      graphId: activeGraphId,
      repository: beat?.repository ?? null,
      commitId:
        selectedGraphNode?.type === "commit"
          ? (selectedGraphNode.sha ?? selectedGraphNode.id)
          : null,
      fileId: selectedGraphNode?.type === "file" ? selectedGraphNode.id : null,
      nodeId: selectedGraphNode?.id ?? null,
      nodeType: selectedGraphNode?.type ?? null,
      source: selectedGraphNode ? "node" : "project-simulation",
    });
  }, [
    activeClusterId,
    activeEvidenceId,
    activeGraphId,
    beat?.repository,
    railVisible,
    resolvedProjectId,
    selectedGraphNode,
  ]);

  const handleCanvasFailure = useCallback(() => {
    if (activeGraphId) {
      setFailedCanvasGraphId(activeGraphId);
      setReadyCanvasSessionId(null);
    }
  }, [activeGraphId]);

  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const handleNodeHover = useCallback((detail: GourceNodeHover | null) => {
    if (detail && tooltipRef.current) {
      tooltipRef.current.style.setProperty(
        "--tooltip-x",
        `${Math.min(86, Math.max(14, detail.x * 100))}%`,
      );
      tooltipRef.current.style.setProperty(
        "--tooltip-y",
        `${Math.min(80, Math.max(18, detail.y * 100))}%`,
      );
    }
    setHoveredNode((current) => {
      if (!detail || current?.nodeId !== detail.nodeId) {
        return detail;
      }
      return current;
    });
  }, []);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId && evidenceDetailsRef.current) {
      evidenceDetailsRef.current.open = true;
    }
  }, []);

  useEffect(() => {
    if (!selectedNodeId) {
      return;
    }
    const clearPinnedNode = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      setSelectedNodeId(null);
      setHoveredNode(null);
      setListHighlightedNodeId(null);
    };
    window.addEventListener("keydown", clearPinnedNode);
    return () => window.removeEventListener("keydown", clearPinnedNode);
  }, [selectedNodeId]);

  const canvasEligible = Boolean(
    activeGraph &&
      activeProject &&
      canUseCanvas &&
      railVisible &&
      !scrollActive &&
      !reduceMotion &&
      !canvasFailed,
  );

  useEffect(() => {
    setCanvasCandidate(canvasCandidateId, canvasEligible);
    return () => setCanvasCandidate(canvasCandidateId, false);
  }, [canvasCandidateId, canvasEligible]);

  const renderCanvas =
    canvasEligible && claimedCanvasOwner.owner === canvasCandidateId;
  const canvasGraph = renderCanvas ? activeGraph : null;
  const canvasSessionId =
    renderCanvas && activeGraphId
      ? `${activeGraphId}:${claimedCanvasOwner.revision}`
      : null;
  const canvasReady =
    canvasSessionId !== null && readyCanvasSessionId === canvasSessionId;

  const handleCanvasReady = useCallback(() => {
    if (canvasSessionId) {
      setReadyCanvasSessionId(canvasSessionId);
    }
  }, [canvasSessionId]);

  if (!activeProject) {
    return null;
  }

  return (
    <aside
      className="project-evolution"
      data-cluster={activeProject.clusterId}
      data-scroll-active={scrollActive ? "true" : "false"}
      ref={railRef}
      style={{ "--evolution-tone": tone } as CSSProperties}
      aria-labelledby={`${scopeId}-evolution-title`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setSelectedNodeId(null);
          setHoveredNode(null);
          setListHighlightedNodeId(null);
        }
      }}
    >
      <div className="project-evolution-bezel">
        <div className="project-evolution-core">
          <header className="project-evolution-topline">
            <div>
              <span>Code in motion</span>
              <strong id={`${scopeId}-evolution-title`}>
                {activeProject.title}
              </strong>
            </div>
            <span aria-hidden="true">
              {canvasReady ? "Repository bloom" : "Public lineage"}
            </span>
          </header>

          <div
            className="project-evolution-viewport"
            data-canvas-ready={canvasReady ? "true" : "false"}
            data-graph-source="inline"
            data-live-canvas={renderCanvas ? "true" : "false"}
            aria-hidden="true"
          >
            {activeGraph ? (
              <StaticGraph
                animate={!canvasReady && !reduceMotion && !scrollActive}
                graph={activeGraph}
                highlightedNodeId={highlightedNodeId}
                selectedEvidenceId={activeEvidenceId}
              />
            ) : null}
            {canvasGraph ? (
              <GraphBoundary
                key={canvasSessionId}
                onError={handleCanvasFailure}
              >
                <ContributionGraphCanvas
                  graph={canvasGraph}
                  activeEvidenceId={activeEvidenceId}
                  highlightedNodeId={highlightedNodeId}
                  tone={tone}
                  reduceMotion={reduceMotion}
                  trackPointer={hoveredNode !== null}
                  onContextLost={handleCanvasFailure}
                  onNodeHover={handleNodeHover}
                  onReady={handleCanvasReady}
                  onNodeSelect={handleNodeSelect}
                />
              </GraphBoundary>
            ) : null}
            {hoveredGraphNode && hoveredNode ? (
              <div
                className="project-evolution-tooltip"
                ref={tooltipRef}
                style={
                  {
                    "--tooltip-x": `${Math.min(86, Math.max(14, hoveredNode.x * 100))}%`,
                    "--tooltip-y": `${Math.min(80, Math.max(18, hoveredNode.y * 100))}%`,
                  } as CSSProperties
                }
              >
                <span>
                  {hoveredGraphNode.type === "file"
                    ? "File touched in this work"
                    : hoveredGraphNode.type}
                </span>
                <strong>
                  {hoveredGraphNode.path ?? hoveredGraphNode.label}
                </strong>
                <small>
                  {hoveredGraphNode.repository}
                  {hoveredGraphNode.status
                    ? ` · ${hoveredGraphNode.status}`
                    : ""}
                </small>
              </div>
            ) : null}
          </div>

          {activeGraph && beat ? (
            <>
              <div className="project-evolution-plaque">
                <div>
                  <span>{compactDate(beat.date)}</span>
                  <span>
                    {beat.integrationStatus === "merged"
                      ? "Live upstream"
                      : beat.integrationStatus === "direct-commit"
                        ? "Shipped in public source"
                        : "Live in public fork"}
                  </span>
                </div>
                <strong>{beat.label}</strong>
                <p>{beatNarrativeById.get(beat.id) ?? activeGraph.impact}</p>
                <div className="project-evolution-authorship">
                  <span>Portfolio identities</span>
                  <strong>mh0pe · awsmadi</strong>
                  <small>Agent shapes show the models connected to this work.</small>
                </div>
                <a
                  href={beat.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open on GitHub: ${beat.label} (opens in a new tab)`}
                >
                  Open on GitHub <span aria-hidden="true">↗</span>
                </a>
                <i aria-hidden="true">
                  {String(
                    activeGraph.beats.findIndex((item) => item.id === beat.id) +
                      1,
                  ).padStart(2, "0")}
                  <span>/</span>
                  {String(activeGraph.beats.length).padStart(2, "0")}
                </i>
              </div>

              <details
                className="project-evolution-evidence"
                ref={evidenceDetailsRef}
                onToggle={(event) => setEvidenceOpen(event.currentTarget.open)}
              >
                <summary>
                  <span>Trace the build</span>
                  <small>
                    {beat.displayedCommitCount ?? Math.min(6, beat.commitCount)}{" "}
                    commits ·{" "}
                    {beat.displayedFileCount ??
                      Math.min(10, beat.changedFileCount)}{" "}
                    files
                  </small>
                </summary>

                <div className="project-evolution-evidence-body">
                  {inspectedGraphNode ? (
                    <div
                      className="project-evolution-inspector"
                      aria-label="Selected public graph item"
                    >
                      <span>
                        {inspectedGraphNode.type === "file"
                          ? "File detail"
                          : inspectedGraphNode.type}
                      </span>
                      <div>
                        <strong>
                          {inspectedGraphNode.path ?? inspectedGraphNode.label}
                        </strong>
                        <small>
                          {inspectedGraphNode.repository}
                          {inspectedGraphNode.status
                            ? ` · ${inspectedGraphNode.status}`
                            : ""}
                        </small>
                      </div>
                      <a
                        href={inspectedGraphNode.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open source for ${inspectedGraphNode.path ?? inspectedGraphNode.label} on GitHub (opens in a new tab)`}
                      >
                        Open source <span aria-hidden="true">↗</span>
                      </a>
                      {selectedGraphNode ? (
                        <button
                          type="button"
                          onClick={() => setSelectedNodeId(null)}
                          aria-label="Clear selected graph item"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="project-evolution-files">
                    <div>
                      <span>Files that carry this change</span>
                      <small>Open any path in its public source.</small>
                    </div>
                    <ul>
                      {activeFiles.map((file) => (
                        <li key={file.id}>
                          <a
                            href={file.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-status={file.status ?? "modified"}
                            onPointerEnter={() => {
                              setListHighlightedNodeId(file.id);
                            }}
                            onPointerLeave={() => {
                              setListHighlightedNodeId(null);
                            }}
                            onFocus={() => {
                              setListHighlightedNodeId(file.id);
                            }}
                            onBlur={() => {
                              setListHighlightedNodeId(null);
                            }}
                            aria-label={`Open ${file.path ?? file.label}, ${file.status ?? "modified"}, in ${file.repository} (opens in a new tab)`}
                          >
                            <span aria-hidden="true">
                              {file.status === "added"
                                ? "A"
                                : file.status === "removed"
                                  ? "D"
                                  : file.status === "renamed"
                                    ? "R"
                                    : "M"}
                            </span>
                            <strong>{file.label}</strong>
                            <small>{file.path ?? file.repository}</small>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {activeGraph.agents.length > 0 ? (
                    <div
                      className="project-evolution-agents"
                      aria-label="GitHub-recorded AI coauthor signals in this repository family"
                    >
                      <span>Recorded agent signals</span>
                      <ul>
                        {activeGraph.agents.map((agent) => (
                          <li data-agent-marker={agent.marker} key={agent.id}>
                            <i aria-hidden="true" />
                            <span>{agent.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <p className="project-evolution-caption">
                    {activeGraph.caption}
                  </p>
                </div>
              </details>
            </>
          ) : (
            <p className="project-evolution-caption">
              Public source detail is unavailable.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
