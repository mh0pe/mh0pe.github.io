"use client";

import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import {
  BufferAttribute,
  Color,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
  type Group,
} from "three";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
import {
  createGourcePhysics,
  gourceSceneCoordinate,
  type GourcePhysicsNode,
} from "./gource-physics";
import { advanceGourceMotion } from "./gource-motion";
import type {
  ContributionGraph,
  ContributionGraphNode,
  ContributionGraphNodeType,
} from "./types";

export interface GourceNodeHover {
  readonly nodeId: string;
  readonly x: number;
  readonly y: number;
}

interface GourceCommitAction {
  readonly id: string;
  readonly files: readonly GourcePhysicsNode[];
  readonly fileIds: ReadonlySet<string>;
  readonly agentId?: string | null;
}

const canvasCamera = {
  fov: 42,
  near: 0.1,
  far: 60,
  position: [0, 0, 6.8] as [number, number, number],
};

const canvasGl = {
  alpha: true,
  antialias: false,
  powerPreference: "high-performance" as const,
};

const canvasDpr: [number, number] = [1, 1.15];

const canvasStyle: CSSProperties = {
  pointerEvents: "auto",
  touchAction: "pan-y pinch-zoom",
};

const nodeTypes: readonly ContributionGraphNodeType[] = [
  "repository",
  "directory",
  "file",
];

const agentColors: Record<string, string> = {
  "claude-opus-4-8": "#bca8ff",
  "claude-opus-4-6": "#ff9b7d",
  "claude-sonnet-4-6": "#c9f36b",
  "claude-fable-5": "#ffd27a",
  "github-copilot": "#68e4ea",
  shared: "#ffd27a",
};

function nodeScale(node: GourcePhysicsNode) {
  const base = {
    repository: 0.2,
    directory: 0.105,
    file: 0.072,
    commit: 0.055,
    evidence: 0.14,
  }[node.graphNode.type];
  return (
    base + Math.min(0.07, Math.log2(Math.max(1, node.graphNode.weight)) * 0.01)
  );
}

function statusColor(node: ContributionGraphNode, tone: string) {
  if (node.agentId) {
    return agentColors[node.agentId] ?? tone;
  }
  if (node.type === "repository") {
    return "#f6f2e9";
  }
  if (node.type === "directory") {
    return "#7f9aa3";
  }
  if (node.type === "evidence") {
    return tone;
  }
  if (node.type === "commit") {
    return "#ffd27a";
  }
  if (node.status === "added") {
    return "#c9f36b";
  }
  if (node.status === "removed") {
    return "#ff7b5d";
  }
  if (node.status === "renamed") {
    return "#bca8ff";
  }
  return "#68e4ea";
}

function GeometryForType({
  type,
}: {
  readonly type: ContributionGraphNodeType;
}) {
  switch (type) {
    case "repository":
      return <dodecahedronGeometry args={[1, 0]} />;
    case "directory":
      return <octahedronGeometry args={[1, 0]} />;
    case "file":
      return <boxGeometry args={[1.85, 0.72, 0.46]} />;
    case "evidence":
      return <torusGeometry args={[0.72, 0.28, 5, 12]} />;
    case "commit":
      return <sphereGeometry args={[1, 7, 5]} />;
  }
}

function AgentGeometry({ marker }: { readonly marker: string }) {
  if (marker === "diamond") {
    return <octahedronGeometry args={[1, 0]} />;
  }
  if (marker === "triangle") {
    return <coneGeometry args={[1, 1.5, 3]} />;
  }
  if (marker === "circle") {
    return <sphereGeometry args={[1, 8, 6]} />;
  }
  if (marker === "hexagon" || marker === "shared") {
    return <cylinderGeometry args={[1, 1, 0.8, 6]} />;
  }
  if (marker === "star") {
    return <icosahedronGeometry args={[1, 0]} />;
  }
  return <boxGeometry args={[1.4, 1.4, 1.4]} />;
}

function ContextLossGuard({
  onContextLost,
}: {
  readonly onContextLost: () => void;
}) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const handleLoss = (event: Event) => {
      event.preventDefault();
      onContextLost();
    };
    canvas.addEventListener("webglcontextlost", handleLoss);
    return () => canvas.removeEventListener("webglcontextlost", handleLoss);
  }, [gl, onContextLost]);
  return null;
}

function FirstFrameSignal({ onReady }: { readonly onReady: () => void }) {
  const signaledRef = useRef(false);
  const readyFrameRef = useRef<number | null>(null);

  useFrame(() => {
    if (signaledRef.current) {
      return;
    }
    signaledRef.current = true;
    readyFrameRef.current = window.requestAnimationFrame(() => {
      readyFrameRef.current = null;
      onReady();
    });
  });

  useEffect(
    () => () => {
      if (readyFrameRef.current !== null) {
        window.cancelAnimationFrame(readyFrameRef.current);
      }
    },
    [],
  );

  return null;
}

function GourceScene({
  graph,
  activeEvidenceId,
  highlightedNodeId,
  tone,
  reduceMotion,
  trackPointer,
  onNodeHover,
  onNodeSelect,
}: {
  readonly graph: ContributionGraph;
  readonly activeEvidenceId: string;
  readonly highlightedNodeId: string | null;
  readonly tone: string;
  readonly reduceMotion: boolean;
  readonly trackPointer: boolean;
  readonly onNodeHover: (detail: GourceNodeHover | null) => void;
  readonly onNodeSelect: (nodeId: string | null) => void;
}) {
  const runtime = useMemo(() => createGourcePhysics(graph), [graph]);
  const invalidate = useThree((state) => state.invalidate);
  const events = useThree((state) => state.events);
  const activeBeatIndex = Math.max(
    0,
    graph.beats.findIndex((beat) => beat.id === activeEvidenceId),
  );
  const nodesByType = useMemo(
    () => ({
      repository: runtime.nodes.filter(
        (node) => node.graphNode.type === "repository",
      ),
      directory: runtime.nodes.filter(
        (node) => node.graphNode.type === "directory",
      ),
      file: runtime.nodes.filter((node) => node.graphNode.type === "file"),
      commit: [] as GourcePhysicsNode[],
      evidence: [] as GourcePhysicsNode[],
    }),
    [runtime.nodes],
  );
  const evidenceFiles = useMemo(
    () =>
      runtime.nodes.filter(
        (node) =>
          node.graphNode.type === "file" &&
          node.graphNode.evidenceIds.includes(activeEvidenceId),
      ),
    [activeEvidenceId, runtime.nodes],
  );
  const activeEvidenceNodeIds = useMemo(
    () =>
      new Set(
        runtime.nodes
          .filter((node) =>
            node.graphNode.evidenceIds.includes(activeEvidenceId),
          )
          .map((node) => node.id),
      ),
    [activeEvidenceId, runtime.nodes],
  );
  const actionGroups = useMemo((): readonly GourceCommitAction[] => {
    const commitById = new Map(
      graph.nodes
        .filter(
          (node) =>
            node.type === "commit" &&
            node.evidenceIds.includes(activeEvidenceId),
        )
        .map((node) => [node.id, node]),
    );
    const filesByCommit = new Map<string, Map<string, GourcePhysicsNode>>();
    for (const edge of graph.edges) {
      if (
        edge.kind !== "commit-touches-file" ||
        edge.evidenceId !== activeEvidenceId ||
        !commitById.has(edge.source)
      ) {
        continue;
      }
      const file = runtime.nodeById.get(edge.target);
      if (!file || file.graphNode.type !== "file") {
        continue;
      }
      const files = filesByCommit.get(edge.source) ?? new Map();
      files.set(file.id, file);
      filesByCommit.set(edge.source, files);
    }
    const exactActions = [...filesByCommit.entries()]
      .sort(([leftId], [rightId]) => {
        const left = commitById.get(leftId);
        const right = commitById.get(rightId);
        return (
          (left?.date ?? "").localeCompare(right?.date ?? "") ||
          leftId.localeCompare(rightId)
        );
      })
      .map(([commitId, files]) => {
        const values = [...files.values()];
        return {
          id: commitId,
          files: values,
          fileIds: new Set(values.map((file) => file.id)),
          agentId: commitById.get(commitId)?.agentId ?? null,
        };
      });
    if (exactActions.length > 0) {
      return exactActions;
    }
    return [
      {
        id: `evidence:${activeEvidenceId}`,
        files: evidenceFiles,
        fileIds: new Set(evidenceFiles.map((file) => file.id)),
      },
    ];
  }, [
    activeEvidenceId,
    evidenceFiles,
    graph.edges,
    graph.nodes,
    runtime.nodeById,
  ]);
  const activeAgentIds = useMemo(
    () =>
      new Set(
        graph.nodes
          .filter(
            (node) =>
              node.type === "commit" &&
              node.evidenceIds.includes(activeEvidenceId) &&
              node.agentId,
          )
          .map((node) => node.agentId as string),
      ),
    [activeEvidenceId, graph.nodes],
  );
  const activeAgents = useMemo(
    () => graph.agents.filter((agent) => activeAgentIds.has(agent.id)),
    [activeAgentIds, graph.agents],
  );
  const resolvedLinks = useMemo(
    () =>
      runtime.links.map((link) => {
        const source =
          typeof link.source === "object"
            ? link.source
            : runtime.nodeById.get(String(link.source));
        const target =
          typeof link.target === "object"
            ? link.target
            : runtime.nodeById.get(String(link.target));
        if (!source || !target) {
          throw new Error(`Unresolved Gource hierarchy edge ${link.id}`);
        }
        return { link, source, target };
      }),
    [runtime.links, runtime.nodeById],
  );
  const meshRefs = useRef(new Map<ContributionGraphNodeType, InstancedMesh>());
  const agentRefs = useRef(new Map<string, Group>());
  const contributorRef = useRef<Group | null>(null);
  const edgeAttributeRef = useRef<BufferAttribute | null>(null);
  const edgeColorAttributeRef = useRef<BufferAttribute | null>(null);
  const beamAttributeRef = useRef<BufferAttribute | null>(null);
  const edgePositionSeed = useMemo(
    () => new Float32Array(resolvedLinks.length * 6),
    [resolvedLinks.length],
  );
  const edgeColors = useMemo(
    () => new Float32Array(resolvedLinks.length * 6),
    [resolvedLinks.length],
  );
  const beamPositionSeed = useMemo(
    () =>
      new Float32Array(
        Math.max(1, ...actionGroups.map((action) => action.files.length)) * 6,
      ),
    [actionGroups],
  );
  const displayScales = useRef(new Map<string, number>());
  const motionElapsedRef = useRef(0);
  const sceneGroupRef = useRef<Group | null>(null);
  const matrix = useMemo(() => new Matrix4(), []);
  const position = useMemo(() => new Vector3(), []);
  const scale = useMemo(() => new Vector3(), []);
  const quaternion = useMemo(() => new Quaternion(), []);
  const baseColor = useMemo(() => new Color(), []);
  const energyColor = useMemo(() => new Color("#ffffff"), []);
  const toneColor = useMemo(() => new Color(tone), [tone]);
  const quietColor = useMemo(() => new Color("#263c45"), []);
  const cameraTarget = useMemo(() => new Vector3(), []);
  const lookTarget = useMemo(() => new Vector3(), []);
  const actorPosition = useMemo(() => new Vector3(), []);
  const actorTarget = useMemo(() => new Vector3(), []);
  const nodeScaleById = useMemo(
    () => new Map(runtime.nodes.map((node) => [node.id, nodeScale(node)])),
    [runtime.nodes],
  );
  const nodeColorById = useMemo(
    () =>
      new Map(
        runtime.nodes.map((node) => [
          node.id,
          new Color(statusColor(node.graphNode, tone)),
        ]),
      ),
    [runtime.nodes, tone],
  );
  const lastViewportSizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    runtime.activateEvidence(activeEvidenceId);
    motionElapsedRef.current = 0;
    invalidate();
  }, [activeEvidenceId, invalidate, reduceMotion, runtime]);

  useEffect(() => () => runtime.dispose(), [runtime]);

  useEffect(() => {
    resolvedLinks.forEach(({ link, source, target }, index) => {
      const active =
        link.graphEdge.evidenceId === activeEvidenceId ||
        source.graphNode.evidenceIds.includes(activeEvidenceId) ||
        target.graphNode.evidenceIds.includes(activeEvidenceId);
      const color = active ? toneColor : quietColor;
      const offset = index * 6;
      edgeColors[offset] = color.r;
      edgeColors[offset + 1] = color.g;
      edgeColors[offset + 2] = color.b;
      edgeColors[offset + 3] = color.r;
      edgeColors[offset + 4] = color.g;
      edgeColors[offset + 5] = color.b;
    });
    if (edgeColorAttributeRef.current) {
      edgeColorAttributeRef.current.needsUpdate = true;
    }
    invalidate();
  }, [
    activeEvidenceId,
    edgeColors,
    invalidate,
    quietColor,
    resolvedLinks,
    toneColor,
  ]);

  const hoverForType = useCallback(
    (type: ContributionGraphNodeType, event: ThreeEvent<PointerEvent>) => {
      const instanceId = event.instanceId;
      if (instanceId === undefined) {
        return;
      }
      const physicsNode = nodesByType[type][instanceId];
      if (!physicsNode || physicsNode.revealIndex > activeBeatIndex) {
        return;
      }
      event.stopPropagation();
      onNodeHover({
        nodeId: physicsNode.id,
        x: (event.pointer.x + 1) / 2,
        y: (1 - event.pointer.y) / 2,
      });
    },
    [activeBeatIndex, nodesByType, onNodeHover],
  );

  const selectForType = useCallback(
    (type: ContributionGraphNodeType, event: ThreeEvent<MouseEvent>) => {
      const instanceId = event.instanceId;
      if (instanceId === undefined) {
        return;
      }
      const physicsNode = nodesByType[type][instanceId];
      if (!physicsNode || physicsNode.revealIndex > activeBeatIndex) {
        return;
      }
      event.stopPropagation();
      onNodeSelect(physicsNode.id);
    },
    [activeBeatIndex, nodesByType, onNodeSelect],
  );

  useFrame(({ camera, pointer, size }, delta) => {
    const motion = advanceGourceMotion(
      motionElapsedRef.current,
      delta,
      actionGroups.length,
    );
    motionElapsedRef.current = motion.elapsed;
    if (motion.looped) {
      runtime.activateEvidence(activeEvidenceId);
    }
    const ambientActive = !reduceMotion;
    const motionTime = motion.cycleAge;
    if (ambientActive && motion.kinetic) {
      runtime.tick(motion.delta);
    }
    const activeAction = actionGroups[motion.actionIndex] ?? actionGroups[0];
    let activeX = 0;
    let activeY = 0;
    let activeCount = 0;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const type of nodeTypes) {
      const mesh = meshRefs.current.get(type);
      if (!mesh) {
        continue;
      }
      const typeNodes = nodesByType[type];
      for (let index = 0; index < typeNodes.length; index += 1) {
        const node = typeNodes[index];
        const revealed = node.revealIndex <= activeBeatIndex;
        const targetScale = revealed
          ? (nodeScaleById.get(node.id) ?? 0.08)
          : 0.0001;
        const currentScale = displayScales.current.get(node.id) ?? targetScale;
        const interpolation = reduceMotion
          ? 1
          : 1 - Math.pow(0.0008, Math.min(0.05, delta));
        const nextScale =
          currentScale + (targetScale - currentScale) * interpolation;
        displayScales.current.set(node.id, nextScale);

        const x = gourceSceneCoordinate(node.x, node.anchorX);
        const y = gourceSceneCoordinate(node.y, node.anchorY);
        const pulse = revealed ? node.energy * 0.42 : 0;
        const evidenceActive = activeEvidenceNodeIds.has(node.id);
        const actionActive = activeAction?.fileIds.has(node.id) ?? false;
        const highlighted = highlightedNodeId === node.id || evidenceActive;
        position.set(x, y, node.z + pulse * 0.24);
        const semanticScale =
          nextScale * (1 + pulse + (highlightedNodeId === node.id ? 0.34 : 0));
        scale.setScalar(semanticScale);
        matrix.compose(position, quaternion, scale);
        mesh.setMatrixAt(index, matrix);

        baseColor.copy(nodeColorById.get(node.id) ?? quietColor);
        if (!highlighted) {
          baseColor.multiplyScalar(0.82);
        } else if (
          node.graphNode.type === "file" &&
          activeAction &&
          !actionActive
        ) {
          baseColor.multiplyScalar(0.7);
        }
        if (pulse > 0.01 || actionActive) {
          baseColor.lerp(
            energyColor,
            Math.min(0.72, Math.max(pulse, actionActive ? 0.42 : 0)),
          );
        }
        mesh.setColorAt(index, baseColor);

        if (revealed) {
          const extentX =
            semanticScale * (node.graphNode.type === "file" ? 1.08 : 1.15);
          const extentY =
            semanticScale * (node.graphNode.type === "file" ? 0.56 : 1.15);
          minX = Math.min(minX, x - extentX);
          maxX = Math.max(maxX, x + extentX);
          minY = Math.min(minY, y - extentY);
          maxY = Math.max(maxY, y + extentY);
        }
        if (revealed && evidenceActive) {
          activeX += x;
          activeY += y;
          activeCount += 1;
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }

    const edgeAttribute = edgeAttributeRef.current;
    if (edgeAttribute) {
      for (let index = 0; index < resolvedLinks.length; index += 1) {
        const { link, source, target } = resolvedLinks[index];
        const revealed = link.revealIndex <= activeBeatIndex;
        const sourceX = gourceSceneCoordinate(source.x, source.anchorX);
        const sourceY = gourceSceneCoordinate(source.y, source.anchorY);
        const targetX = gourceSceneCoordinate(target.x, target.anchorX);
        const targetY = gourceSceneCoordinate(target.y, target.anchorY);
        edgeAttribute.setXYZ(index * 2, sourceX, sourceY, source.z);
        edgeAttribute.setXYZ(
          index * 2 + 1,
          revealed ? targetX : sourceX,
          revealed ? targetY : sourceY,
          revealed ? target.z : source.z,
        );
      }
      edgeAttribute.needsUpdate = true;
    }

    let actorX =
      activeCount > 0
        ? activeX / activeCount
        : Number.isFinite(minX)
          ? (minX + maxX) / 2
          : 0;
    let actorY =
      activeCount > 0
        ? activeY / activeCount
        : Number.isFinite(minY)
          ? (minY + maxY) / 2
          : 0;
    if (activeAction && activeAction.files.length > 0) {
      actorX = 0;
      actorY = 0;
      for (const file of activeAction.files) {
        actorX += gourceSceneCoordinate(file.x, file.anchorX);
        actorY += gourceSceneCoordinate(file.y, file.anchorY);
      }
      actorX /= activeAction.files.length;
      actorY /= activeAction.files.length;
    }
    actorX -= 0.32;
    actorY += 0.26;
    minX = Math.min(minX, actorX - 0.3);
    maxX = Math.max(maxX, actorX + 0.3);
    minY = Math.min(minY, actorY - 0.25);
    maxY = Math.max(maxY, actorY + 0.25);

    const centerX = Number.isFinite(minX) ? (minX + maxX) / 2 : 0;
    const centerY = Number.isFinite(minY) ? (minY + maxY) / 2 : 0;
    const spanX = Number.isFinite(minX) ? maxX - minX : 2.4;
    const spanY = Number.isFinite(minY) ? maxY - minY : 2.4;
    const aspect = Math.max(0.2, size.width / Math.max(1, size.height));
    const verticalHalfFov = (canvasCamera.fov * Math.PI) / 360;
    const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * aspect);
    const fittedDistance = Math.max(
      5.4,
      ((spanY + 0.9) / 2 / Math.tan(verticalHalfFov)) * 1.1,
      ((spanX + 0.9) / 2 / Math.tan(horizontalHalfFov)) * 1.1,
    );
    const lastViewportSize = lastViewportSizeRef.current;
    const viewportChanged =
      lastViewportSize.width !== size.width ||
      lastViewportSize.height !== size.height;
    lastViewportSize.width = size.width;
    lastViewportSize.height = size.height;
    const cameraInterpolation =
      reduceMotion || viewportChanged
        ? 1
        : 1 - Math.pow(0.012, motion.delta);
    cameraTarget.set(centerX * 0.16, centerY * 0.16, fittedDistance);
    camera.position.lerp(cameraTarget, cameraInterpolation);
    lookTarget.set(centerX * 0.12, centerY * 0.12, 0);
    camera.lookAt(lookTarget);

    if (sceneGroupRef.current && ambientActive) {
      const drift = Math.sin(motionTime * 0.16) * 0.018;
      sceneGroupRef.current.rotation.x +=
        (pointer.y * -0.045 + drift - sceneGroupRef.current.rotation.x) *
        cameraInterpolation;
      sceneGroupRef.current.rotation.y +=
        (pointer.x * 0.065 - sceneGroupRef.current.rotation.y) *
        cameraInterpolation;
    }

    actorTarget.set(actorX, actorY, 0.78);
    actorPosition.lerp(actorTarget, cameraInterpolation);
    if (contributorRef.current) {
      contributorRef.current.position.copy(actorPosition);
      contributorRef.current.rotation.z += ambientActive
        ? motion.delta * 0.34
        : 0;
    }

    const actionFiles = activeAction?.files ?? [];
    const beamAttribute = beamAttributeRef.current;
    if (beamAttribute) {
      const beamCount = beamAttribute.count / 2;
      for (let index = 0; index < beamCount; index += 1) {
        const file = actionFiles[index];
        const fileX = file
          ? gourceSceneCoordinate(file.x, file.anchorX)
          : actorPosition.x;
        const fileY = file
          ? gourceSceneCoordinate(file.y, file.anchorY)
          : actorPosition.y;
        beamAttribute.setXYZ(
          index * 2,
          actorPosition.x,
          actorPosition.y,
          actorPosition.z,
        );
        beamAttribute.setXYZ(
          index * 2 + 1,
          fileX,
          fileY,
          file ? file.z + 0.04 : actorPosition.z,
        );
      }
      beamAttribute.needsUpdate = true;
    }

    for (let index = 0; index < activeAgents.length; index += 1) {
      const agent = activeAgents[index];
      const actor = agentRefs.current.get(agent.id);
      if (!actor) {
        continue;
      }
      actor.visible =
        activeAction?.agentId === undefined ||
        activeAction.agentId === agent.id;
      if (!actor.visible) {
        continue;
      }
      const angle =
        motionTime * (0.16 + index * 0.018) +
        (index / Math.max(1, activeAgents.length)) * Math.PI * 2;
      actor.position.set(
        actorPosition.x + Math.cos(angle) * 0.16,
        actorPosition.y + Math.sin(angle) * 0.13,
        actorPosition.z + 0.08,
      );
      actor.rotation.z += ambientActive
        ? motion.delta * (0.28 + index * 0.04)
        : 0;
    }

    if (trackPointer && ambientActive) {
      events.update?.();
    }
  });

  return (
    <group ref={sceneGroupRef}>
      <lineSegments frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[edgePositionSeed, 3]}
            ref={(attribute: BufferAttribute | null) => {
              edgeAttributeRef.current = attribute;
            }}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[edgeColors, 3]}
            ref={(attribute: BufferAttribute | null) => {
              edgeColorAttributeRef.current = attribute;
            }}
          />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.5}
          toneMapped={false}
        />
      </lineSegments>

      <lineSegments frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[beamPositionSeed, 3]}
            ref={(attribute: BufferAttribute | null) => {
              beamAttributeRef.current = attribute;
            }}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={tone}
          transparent
          opacity={0.72}
          toneMapped={false}
        />
      </lineSegments>

      {nodeTypes.map((type) => {
        const interactiveProps =
          type === "file"
            ? {
                onPointerMove: (event: ThreeEvent<PointerEvent>) =>
                  hoverForType(type, event),
                onPointerOut: () => onNodeHover(null),
                onClick: (event: ThreeEvent<MouseEvent>) =>
                  selectForType(type, event),
              }
            : {};
        return (
          <instancedMesh
            args={[undefined, undefined, nodesByType[type].length]}
            frustumCulled={false}
            {...interactiveProps}
            ref={(mesh: InstancedMesh | null) => {
              if (mesh) {
                meshRefs.current.set(type, mesh);
              } else {
                meshRefs.current.delete(type);
              }
            }}
            key={type}
          >
            <GeometryForType type={type} />
            <meshBasicMaterial transparent opacity={0.96} toneMapped={false} />
          </instancedMesh>
        );
      })}

      <group ref={contributorRef}>
        <mesh scale={0.105}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#f6f2e9" toneMapped={false} />
        </mesh>
        <mesh scale={0.18}>
          <ringGeometry args={[0.68, 1, 24]} />
          <meshBasicMaterial
            color={tone}
            transparent
            opacity={0.38}
            toneMapped={false}
          />
        </mesh>
      </group>

      {activeAgents.map((agent, index) => (
        <group
          ref={(group: Group | null) => {
            if (group) {
              agentRefs.current.set(agent.id, group);
            } else {
              agentRefs.current.delete(agent.id);
            }
          }}
          key={agent.id}
        >
          <mesh
            scale={
              0.055 +
              Math.min(0.038, Math.log2(agent.recordedCommitCount + 1) * 0.01)
            }
            rotation={[0.35, 0.3, index]}
          >
            <AgentGeometry marker={agent.marker} />
            <meshBasicMaterial
              color={agentColors[agent.id] ?? "#f6f2e9"}
              toneMapped={false}
            />
          </mesh>
          <mesh scale={0.11}>
            <ringGeometry args={[0.62, 1, 18]} />
            <meshBasicMaterial
              color={agentColors[agent.id] ?? tone}
              transparent
              opacity={0.22}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function ContributionGraphCanvas({
  graph,
  activeEvidenceId,
  highlightedNodeId,
  tone,
  reduceMotion,
  trackPointer,
  onContextLost,
  onNodeHover,
  onReady,
  onNodeSelect,
}: {
  readonly graph: ContributionGraph;
  readonly activeEvidenceId: string;
  readonly highlightedNodeId: string | null;
  readonly tone: string;
  readonly reduceMotion: boolean;
  readonly trackPointer: boolean;
  readonly onContextLost: () => void;
  readonly onNodeHover: (detail: GourceNodeHover | null) => void;
  readonly onReady: () => void;
  readonly onNodeSelect: (nodeId: string | null) => void;
}) {
  return (
    <Canvas
      aria-hidden="true"
      camera={canvasCamera}
      dpr={canvasDpr}
      frameloop="always"
      gl={canvasGl}
      fallback={<span />}
      onPointerMissed={() => {
        onNodeHover(null);
        onNodeSelect(null);
      }}
      style={canvasStyle}
    >
      <color attach="background" args={["#07151c"]} />
      <ContextLossGuard onContextLost={onContextLost} />
      <FirstFrameSignal onReady={onReady} />
      <GourceScene
        graph={graph}
        activeEvidenceId={activeEvidenceId}
        highlightedNodeId={highlightedNodeId}
        tone={tone}
        reduceMotion={reduceMotion}
        trackPointer={trackPointer}
        onNodeHover={onNodeHover}
        onNodeSelect={onNodeSelect}
      />
    </Canvas>
  );
}
