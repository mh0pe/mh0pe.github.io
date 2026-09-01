import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type {
  ContributionGraph,
  ContributionGraphEdge,
  ContributionGraphNode,
} from "./types";

export interface GourcePhysicsNode extends SimulationNodeDatum {
  readonly id: string;
  readonly graphNode: ContributionGraphNode;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly z: number;
  readonly revealIndex: number;
  energy: number;
}

export interface GourcePhysicsLink
  extends SimulationLinkDatum<GourcePhysicsNode> {
  readonly id: string;
  readonly graphEdge: ContributionGraphEdge;
  readonly revealIndex: number;
}

export interface GourcePhysicsRuntime {
  readonly nodes: readonly GourcePhysicsNode[];
  readonly links: readonly GourcePhysicsLink[];
  readonly nodeById: ReadonlyMap<string, GourcePhysicsNode>;
  readonly simulation: Simulation<GourcePhysicsNode, GourcePhysicsLink>;
  activateEvidence: (evidenceId: string) => void;
  tick: (delta: number) => void;
  dispose: () => void;
}

export const GOURCE_PHYSICS_SCALE = 100;
const fixedPhysicsStep = 1 / 60;
const repositoryAnchorScale = 0.72;
const minimumRepositorySceneDistance = 0.52;
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const repositoryAnchorProbeLimit = 256;
const hierarchyNodeTypes = new Set<ContributionGraphNode["type"]>([
  "repository",
  "directory",
  "file",
]);
const hierarchyEdgeKinds = new Set<ContributionGraphEdge["kind"]>([
  "contains-directory",
  "contains-subdirectory",
  "contains-file",
]);

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

function hashAngle(value: string) {
  return (hashText(value) / 4294967296) * Math.PI * 2;
}

function nodeRadius(node: GourcePhysicsNode) {
  return (
    {
      repository: 0.26,
      evidence: 0,
      commit: 0,
      directory: 0.14,
      file: 0.11,
    }[node.graphNode.type] * GOURCE_PHYSICS_SCALE
  );
}

function linkDistance(link: GourcePhysicsLink) {
  return (
    {
      "contains-directory": 0.62,
      "contains-subdirectory": 0.5,
      "contains-file": 0.42,
      "documents-change": 0,
      "includes-commit": 0,
      "commit-touches-file": 0,
      "touches-file": 0,
    }[link.graphEdge.kind] * GOURCE_PHYSICS_SCALE
  );
}

function linkStrength(link: GourcePhysicsLink) {
  return {
    "contains-directory": 0.76,
    "contains-subdirectory": 0.72,
    "contains-file": 0.68,
    "documents-change": 0.28,
    "includes-commit": 0.52,
    "commit-touches-file": 0.66,
    "touches-file": 0.19,
  }[link.graphEdge.kind];
}

function chargeStrength(node: GourcePhysicsNode) {
  return {
    repository: -115,
    evidence: 0,
    commit: 0,
    directory: -30,
    file: -19,
  }[node.graphNode.type];
}

function semanticDepth(node: ContributionGraphNode) {
  return {
    repository: -0.55,
    directory: -0.24,
    file: 0.08,
    evidence: 0.38,
    commit: 0.62,
  }[node.type];
}

function firstEvidenceIndex(
  node: ContributionGraphNode,
  evidenceIndex: ReadonlyMap<string, number>,
) {
  if (node.type === "repository") {
    return 0;
  }

  let first = Number.POSITIVE_INFINITY;
  for (const evidenceId of node.evidenceIds) {
    first = Math.min(first, evidenceIndex.get(evidenceId) ?? first);
  }
  return Number.isFinite(first) ? first : 0;
}

function endpointId(endpoint: string | number | GourcePhysicsNode): string {
  return typeof endpoint === "object" ? endpoint.id : String(endpoint);
}

export function createGourcePhysics(
  graph: ContributionGraph,
): GourcePhysicsRuntime {
  const evidenceIndex = new Map(
    graph.beats.map((beat, index) => [beat.id, index]),
  );
  const random = seededRandom(hashText(graph.id));
  const hierarchyGraphNodes = graph.nodes.filter((graphNode) =>
    hierarchyNodeTypes.has(graphNode.type),
  );
  const hierarchyGraphEdges = graph.edges.filter((graphEdge) =>
    hierarchyEdgeKinds.has(graphEdge.kind),
  );
  const graphNodeById = new Map(
    hierarchyGraphNodes.map((graphNode) => [graphNode.id, graphNode]),
  );
  const parentByNodeId = new Map(
    hierarchyGraphEdges.map((graphEdge) => [
      graphEdge.target,
      graphEdge.source,
    ]),
  );
  const anchorByNodeId = new Map<
    string,
    { readonly x: number; readonly y: number }
  >();
  const repositoryAnchors: Array<{
    readonly x: number;
    readonly y: number;
  }> = [];

  function resolveAnchor(nodeId: string): {
    readonly x: number;
    readonly y: number;
  } {
    const cached = anchorByNodeId.get(nodeId);
    if (cached) {
      return cached;
    }
    const graphNode = graphNodeById.get(nodeId);
    if (!graphNode) {
      throw new Error(`Missing Gource hierarchy node ${nodeId}`);
    }
    if (graphNode.type === "repository") {
      const baseAngle = hashAngle(`${graphNode.id}:repository-anchor`);
      const radius =
        (0.45 +
          (hashText(`${graphNode.id}:repository-radius`) / 4294967296) * 1.75) *
        GOURCE_PHYSICS_SCALE;
      const minimumAnchorDistance =
        (minimumRepositorySceneDistance * GOURCE_PHYSICS_SCALE) /
        repositoryAnchorScale;
      for (let attempt = 0; attempt < repositoryAnchorProbeLimit; attempt += 1) {
        const angle = baseAngle + attempt * goldenAngle;
        const anchor = {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        };
        const collision = repositoryAnchors.some(
          (existing) =>
            Math.hypot(anchor.x - existing.x, anchor.y - existing.y) <
            minimumAnchorDistance,
        );
        if (!collision) {
          repositoryAnchors.push(anchor);
          anchorByNodeId.set(nodeId, anchor);
          return anchor;
        }
      }
      throw new Error(`Unable to place Gource repository anchor ${nodeId}`);
    }
    const parentId = parentByNodeId.get(nodeId);
    if (!parentId) {
      throw new Error(`Missing Gource hierarchy parent for ${nodeId}`);
    }
    const parent = resolveAnchor(parentId);
    const angle = hashAngle(`${graph.id}:${nodeId}:hierarchy-anchor`);
    const distance =
      (graphNode.type === "directory" ? 0.58 : 0.44) * GOURCE_PHYSICS_SCALE;
    const anchor = {
      x: parent.x + Math.cos(angle) * distance,
      y: parent.y + Math.sin(angle) * distance,
    };
    anchorByNodeId.set(nodeId, anchor);
    return anchor;
  }

  for (const repository of hierarchyGraphNodes.filter(
    (graphNode) => graphNode.type === "repository",
  )) {
    resolveAnchor(repository.id);
  }

  const nodes: GourcePhysicsNode[] = graph.nodes
    .filter((graphNode) => hierarchyNodeTypes.has(graphNode.type))
    .map((graphNode) => {
      const nodeRandom = seededRandom(
        hashText(`${graph.id}:${graphNode.id}:initial-position`),
      );
      const angle = nodeRandom() * Math.PI * 2;
      const radius =
        graphNode.type === "repository"
          ? 0
          : (0.12 + nodeRandom() * 0.2) * GOURCE_PHYSICS_SCALE;
      const repositoryNode = graphNode.type === "repository";
      const anchor = resolveAnchor(graphNode.id);
      return {
        id: graphNode.id,
        graphNode,
        anchorX: anchor.x,
        anchorY: anchor.y,
        x: anchor.x * 0.74 + Math.cos(angle) * radius,
        y: anchor.y * 0.74 + Math.sin(angle) * radius,
        fx: repositoryNode ? anchor.x * repositoryAnchorScale : undefined,
        fy: repositoryNode ? anchor.y * repositoryAnchorScale : undefined,
        z: semanticDepth(graphNode),
        revealIndex: firstEvidenceIndex(graphNode, evidenceIndex),
        energy: 0,
      };
    });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const links: GourcePhysicsLink[] = hierarchyGraphEdges.map((graphEdge) => {
    const source = nodeById.get(graphEdge.source);
    const target = nodeById.get(graphEdge.target);
    if (!source || !target) {
      throw new Error(`Invalid Gource hierarchy edge ${graphEdge.id}`);
    }
    return {
      id: graphEdge.id,
      graphEdge,
      source,
      target,
      revealIndex: Math.max(source.revealIndex, target.revealIndex),
    };
  });

  let visibleIndex = 0;
  let accumulator = 0;
  const simulation = forceSimulation<GourcePhysicsNode>(nodes)
    .randomSource(random)
    .alphaDecay(0.032)
    .velocityDecay(0.28)
    .stop();

  function configureVisibleForces() {
    const visibleNodes = nodes.filter(
      (node) => node.revealIndex <= visibleIndex,
    );
    const visibleLinks = links.filter(
      (link) => link.revealIndex <= visibleIndex,
    );
    simulation
      .nodes(visibleNodes)
      .force(
        "link",
        forceLink<GourcePhysicsNode, GourcePhysicsLink>(visibleLinks)
          .id((node) => node.id)
          .distance(linkDistance)
          .strength(linkStrength)
          .iterations(2),
      )
      .force(
        "charge",
        forceManyBody<GourcePhysicsNode>()
          .strength(chargeStrength)
          .distanceMax(3.2 * GOURCE_PHYSICS_SCALE),
      )
      .force(
        "collision",
        forceCollide<GourcePhysicsNode>()
          .radius(nodeRadius)
          .strength(0.92)
          .iterations(2),
      )
      .force(
        "x",
        forceX<GourcePhysicsNode>((node) => node.anchorX * 0.72).strength(
          (node) => (node.graphNode.type !== "repository" ? 0.035 : 0),
        ),
      )
      .force(
        "y",
        forceY<GourcePhysicsNode>((node) => node.anchorY * 0.72).strength(
          (node) => (node.graphNode.type !== "repository" ? 0.045 : 0),
        ),
      );
  }

  configureVisibleForces();

  function activateEvidence(evidenceId: string) {
    visibleIndex = Math.max(0, evidenceIndex.get(evidenceId) ?? 0);
    configureVisibleForces();
    for (const node of nodes) {
      const active = node.graphNode.evidenceIds.includes(evidenceId);
      node.energy = active ? 1 : node.energy * 0.45;
    }
    accumulator = 0;
    simulation.alpha(Math.max(0.38, simulation.alpha())).alphaTarget(0);
  }

  function tick(delta: number) {
    const boundedDelta = Math.min(0.05, Math.max(0.001, delta));
    accumulator = Math.min(fixedPhysicsStep * 3, accumulator + boundedDelta);
    let iterations = 0;
    while (accumulator >= fixedPhysicsStep && iterations < 3) {
      simulation.tick();
      accumulator -= fixedPhysicsStep;
      iterations += 1;
    }
    const energyDecay = Math.pow(0.13, boundedDelta);
    for (const node of nodes) {
      node.energy *= energyDecay;
    }
  }

  return {
    nodes,
    links,
    nodeById,
    simulation,
    activateEvidence,
    tick,
    dispose: () => simulation.stop(),
  };
}

export function gourceLinkEndpoints(link: GourcePhysicsLink) {
  return {
    sourceId: endpointId(link.source),
    targetId: endpointId(link.target),
  };
}

export function gourceSceneCoordinate(
  value: number | undefined,
  fallback: number,
) {
  return (value ?? fallback) / GOURCE_PHYSICS_SCALE;
}
