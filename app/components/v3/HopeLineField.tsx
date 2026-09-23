import { getContributionGraph } from "../contribution-story/graph-loaders";
import type {
  ContributionGraph,
  ContributionGraphAgent,
  ContributionGraphId,
  ContributionGraphNode,
} from "../contribution-story/types";

const graphIds = [
  "automated-security-helper",
  "cloudformation-guard",
  "nix-windows",
  "portable-frameworks",
  "rules-js-pnp",
  "lightpanda-svg",
  "aws-labs-mcp",
  "cloud-runtime",
] as const satisfies readonly ContributionGraphId[];

const projectRoutes: Record<
  ContributionGraphId,
  { readonly href: string; readonly label: string }
> = {
  "automated-security-helper": {
    href: "/work/automated-security-helper/",
    label: "Trace the case",
  },
  "cloudformation-guard": {
    href: "/work/cloudformation-guard/",
    label: "Trace the case",
  },
  "nix-windows": {
    href: "/work/nix-windows/",
    label: "Trace the case",
  },
  "portable-frameworks": {
    href: "/work/agent-systems/",
    label: "Trace the case",
  },
  "rules-js-pnp": {
    href: "/capabilities/#capability-rules-js-pnp",
    label: "Open in the capability atlas",
  },
  "lightpanda-svg": {
    href: "/capabilities/#capability-lightpanda-svg",
    label: "Open in the capability atlas",
  },
  "aws-labs-mcp": {
    href: "/capabilities/#capability-aws-labs-mcp",
    label: "Open in the capability atlas",
  },
  "cloud-runtime": {
    href: "/capabilities/#capability-aws-cloud-runtime",
    label: "Open in the capability atlas",
  },
};

const projectAnchors = [
  { x: 118, y: 162 },
  { x: 336, y: 100 },
  { x: 558, y: 168 },
  { x: 790, y: 94 },
  { x: 1035, y: 166 },
  { x: 1086, y: 370 },
  { x: 790, y: 462 },
  { x: 472, y: 410 },
] as const;

const mobileProjectAnchors = [
  { x: 74, y: 58 },
  { x: 164, y: 126 },
  { x: 278, y: 194 },
  { x: 198, y: 270 },
  { x: 82, y: 346 },
  { x: 160, y: 424 },
  { x: 280, y: 500 },
  { x: 210, y: 574 },
] as const;

const familyColors = {
  security: "var(--coral, #ef806f)",
  durability: "var(--gold, #d6b45d)",
  agents: "var(--violet, #9f8de2)",
  browser: "var(--cyan, #6bcad0)",
  cloud: "var(--lime, #b1cc68)",
} as const;

const agentColors: Record<string, string> = {
  "claude-opus-5": "var(--coral, #ef806f)",
  "claude-fable-5": "var(--gold, #d6b45d)",
  "claude-opus-4-8": "var(--lime, #b1cc68)",
  "claude-opus-4-7": "var(--violet, #9f8de2)",
  "claude-opus-4-6": "var(--cyan, #6bcad0)",
  "claude-sonnet-4-6": "var(--cyan, #6bcad0)",
  "claude-opus-4-5": "var(--gold, #d6b45d)",
  "claude-opus-4": "var(--violet, #9f8de2)",
  "claude-3-opus": "var(--coral, #ef806f)",
};

const geometricAgentMarkers = new Set([
  "circle",
  "square",
  "pentagon",
  "hexagon",
]);

const maxRepositoriesPerProject = 2;
const maxEvidencePerProject = 2;
const featuredEvidenceByGraph: Partial<
  Record<ContributionGraphId, readonly string[]>
> = {
  "portable-frameworks": ["github-template-preflight"],
};

interface Point {
  readonly x: number;
  readonly y: number;
}

interface ProjectField {
  readonly graph: ContributionGraph;
  readonly anchor: Point;
  readonly nodes: readonly ContributionGraphNode[];
  readonly positions: ReadonlyMap<string, Point>;
  readonly edges: ContributionGraph["edges"];
  readonly agents: readonly ContributionGraphAgent[];
  readonly repositories: readonly ContributionGraphNode[];
  readonly source: ContributionGraph["beats"][number];
}

function lexicalByLabel(
  left: ContributionGraphNode,
  right: ContributionGraphNode,
): number {
  return left.label.localeCompare(right.label);
}

function byWeightThenLabel(
  left: ContributionGraphNode,
  right: ContributionGraphNode,
): number {
  return right.weight - left.weight || lexicalByLabel(left, right);
}

function byAttributedRecency(
  left: ContributionGraphNode,
  right: ContributionGraphNode,
): number {
  const attribution = Number(Boolean(right.agentId)) - Number(Boolean(left.agentId));
  if (attribution !== 0) return attribution;

  const recency = (right.date ?? "").localeCompare(left.date ?? "");
  return recency || byWeightThenLabel(left, right);
}

function uniqueNodes(nodes: readonly ContributionGraphNode[]) {
  const byId = new Map<string, ContributionGraphNode>();
  for (const node of nodes) byId.set(node.id, node);
  return [...byId.values()];
}

function selectProjectNodes(graph: ContributionGraph) {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const repositories = graph.nodes.filter((node) => node.type === "repository");
  const evidence = graph.nodes.filter((node) => node.type === "evidence");
  const repositoryEvidence = new Map<string, ContributionGraphNode[]>();

  for (const edge of graph.edges) {
    if (edge.kind !== "documents-change") continue;
    const target = nodeById.get(edge.target);
    if (!target) continue;
    const current = repositoryEvidence.get(edge.source) ?? [];
    current.push(target);
    repositoryEvidence.set(edge.source, current);
  }

  const rankedRepositories = [...repositories]
    .sort((left, right) => {
      const leftEvidence = repositoryEvidence.get(left.id) ?? [];
      const rightEvidence = repositoryEvidence.get(right.id) ?? [];
      const leftScore = leftEvidence.reduce((total, node) => total + node.weight, 0);
      const rightScore = rightEvidence.reduce((total, node) => total + node.weight, 0);
      return rightScore - leftScore || lexicalByLabel(left, right);
    });
  const featuredEvidenceIds = new Set(
    (featuredEvidenceByGraph[graph.id] ?? []).map((id) => `evidence:${id}`),
  );
  const featuredRepositoryIds = new Set(
    graph.edges
      .filter(
        (edge) =>
          edge.kind === "documents-change" && featuredEvidenceIds.has(edge.target),
      )
      .map((edge) => edge.source),
  );
  const selectedRepositories = uniqueNodes([
    ...rankedRepositories.filter((node) => featuredRepositoryIds.has(node.id)),
    ...rankedRepositories,
  ]).slice(0, maxRepositoriesPerProject);

  const selectedEvidence = uniqueNodes([
    ...evidence.filter((node) => featuredEvidenceIds.has(node.id)),
    ...selectedRepositories.flatMap((repository) =>
      [...(repositoryEvidence.get(repository.id) ?? [])]
        .sort(byWeightThenLabel)
        .slice(0, 1),
    ),
  ]).slice(0, maxEvidencePerProject);

  for (const candidate of [...evidence].sort(byWeightThenLabel)) {
    if (selectedEvidence.length >= maxEvidencePerProject) break;
    if (!selectedEvidence.some((node) => node.id === candidate.id)) {
      selectedEvidence.push(candidate);
    }
  }

  const selectedCommits: ContributionGraphNode[] = [];
  const selectedFiles: ContributionGraphNode[] = [];

  for (const evidenceNode of selectedEvidence) {
    const commit = graph.edges
      .filter(
        (edge) =>
          edge.kind === "includes-commit" && edge.source === evidenceNode.id,
      )
      .map((edge) => nodeById.get(edge.target))
      .filter((node): node is ContributionGraphNode => node?.type === "commit")
      .sort(byAttributedRecency)[0];

    if (commit) selectedCommits.push(commit);

    const exactFile = commit
      ? graph.edges
          .filter(
            (edge) =>
              edge.kind === "commit-touches-file" && edge.source === commit.id,
          )
          .map((edge) => nodeById.get(edge.target))
          .filter((node): node is ContributionGraphNode => node?.type === "file")
          .sort(byWeightThenLabel)[0]
      : undefined;

    const evidenceFile = graph.edges
      .filter(
        (edge) =>
          edge.kind === "touches-file" && edge.source === evidenceNode.id,
      )
      .map((edge) => nodeById.get(edge.target))
      .filter((node): node is ContributionGraphNode => node?.type === "file")
      .sort(byWeightThenLabel)[0];

    const file = exactFile ?? evidenceFile;
    if (file) selectedFiles.push(file);
  }

  const nodes = uniqueNodes([
    ...selectedRepositories,
    ...selectedEvidence,
    ...selectedCommits,
    ...selectedFiles,
  ]);
  const selectedIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter(
    (edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target),
  );
  const agents = uniqueNodes(selectedCommits)
    .map((commit) => graph.agents.find((agent) => agent.id === commit.agentId))
    .filter((agent): agent is ContributionGraphAgent => Boolean(agent));

  return { nodes, edges, agents, repositories: selectedRepositories };
}

function scaledPosition(node: ContributionGraphNode, anchor: Point): Point {
  const x = anchor.x + Math.max(-1, Math.min(1, node.x / 2.65)) * 72;
  const y = anchor.y + Math.max(-1, Math.min(1, node.y / 1.68)) * 48;
  const distance = Math.hypot(x - anchor.x, y - anchor.y);

  if (distance >= 23) return { x: Math.round(x), y: Math.round(y) };

  const angle = (stableHash(node.id) % 360) * (Math.PI / 180);
  return {
    x: Math.round(anchor.x + Math.cos(angle) * 28),
    y: Math.round(anchor.y + Math.sin(angle) * 28),
  };
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function smoothPath(points: readonly Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x} ${points[0].y}`;

  let path = `M${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const following = points[Math.min(points.length - 1, index + 2)];
    const controlOne = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6,
    };
    const controlTwo = {
      x: next.x - (following.x - current.x) / 6,
      y: next.y - (following.y - current.y) / 6,
    };
    path += ` C${controlOne.x.toFixed(1)} ${controlOne.y.toFixed(1)} ${controlTwo.x.toFixed(1)} ${controlTwo.y.toFixed(1)} ${next.x} ${next.y}`;
  }
  return path;
}

function curvedEdge(source: Point, target: Point, edgeId: string): string {
  const deltaX = target.x - source.x;
  const deltaY = target.y - source.y;
  const length = Math.max(1, Math.hypot(deltaX, deltaY));
  const direction = stableHash(edgeId) % 2 === 0 ? 1 : -1;
  const bend = direction * (4 + (stableHash(edgeId) % 5));
  const controlX = (source.x + target.x) / 2 - (deltaY / length) * bend;
  const controlY = (source.y + target.y) / 2 + (deltaX / length) * bend;
  return `M${source.x} ${source.y} Q${controlX.toFixed(1)} ${controlY.toFixed(1)} ${target.x} ${target.y}`;
}

function nodeTitle(
  node: ContributionGraphNode,
  agent: ContributionGraphAgent | undefined,
): string {
  if (node.type === "repository") return `Project: ${node.label}`;
  if (node.type === "evidence") return `Reviewed change: ${node.label}`;
  if (node.type === "file") return `Implementation detail: ${node.path ?? node.label}`;
  if (node.type === "commit") {
    return agent
      ? `Code update: ${node.label}. Associated model: ${agent.label}.`
      : `Code update: ${node.label}.`;
  }
  return node.label;
}

function NodeLinkList({
  nodes,
  usePath = false,
}: {
  readonly nodes: readonly ContributionGraphNode[];
  readonly usePath?: boolean;
}) {
  return (
    <>
      {nodes.map((node, index) => (
        <span key={node.id}>
          {index > 0 ? <span aria-hidden="true"> · </span> : null}
          <a href={node.href} target="_blank" rel="noreferrer">
            {usePath ? (node.path ?? node.label) : node.label}
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </span>
      ))}
    </>
  );
}

function DataGlyph({
  node,
  point,
  agent,
}: {
  readonly node: ContributionGraphNode;
  readonly point: Point;
  readonly agent: ContributionGraphAgent | undefined;
}) {
  return (
    <g
      className="hope-line__node"
      data-node-type={node.type}
      data-agent-id={node.agentId ?? undefined}
      transform={`translate(${point.x} ${point.y})`}
    >
      <title>{nodeTitle(node, agent)}</title>
      {node.type === "repository" ? (
        <rect x="-7" y="-5" width="14" height="10" rx="2" />
      ) : null}
      {node.type === "evidence" ? <path d="M0-7 7 0 0 7-7 0Z" /> : null}
      {node.type === "commit" ? <circle r="4.5" /> : null}
      {node.type === "file" ? (
        <rect x="-3.5" y="-3.5" width="7" height="7" rx="1" />
      ) : null}
    </g>
  );
}

function ModelGlyph({
  agent,
  point,
}: {
  readonly agent: ContributionGraphAgent;
  readonly point: Point;
}) {
  const color = agentColors[agent.id] ?? "var(--ink-muted, #8b969b)";
  const marker = agent.marker.toLowerCase();
  const isTextMarker = !geometricAgentMarkers.has(marker);

  return (
    <g
      className="hope-line__model"
      data-agent-id={agent.id}
      transform={`translate(${point.x} ${point.y})`}
      color={color}
    >
      <title>
        {`Model association: ${agent.label}. ${agent.recordedCommitCount} recorded ${agent.recordedCommitCount === 1 ? "commit" : "commits"} in this repository family.`}
      </title>
      {marker === "circle" ? <circle r="6" /> : null}
      {marker === "square" ? (
        <rect x="-5.5" y="-5.5" width="11" height="11" rx="1" />
      ) : null}
      {marker === "pentagon" ? (
        <path d="M0-7 6.7-2.2 4.1 5.7-4.1 5.7-6.7-2.2Z" />
      ) : null}
      {marker === "hexagon" ? (
        <path d="M-6-3.5 0-7 6-3.5 6 3.5 0 7-6 3.5Z" />
      ) : null}
      {isTextMarker ? (
        <>
          <rect x="-12" y="-7" width="24" height="14" rx="7" />
          <text x="0" y="2.5" textAnchor="middle">
            {agent.marker}
          </text>
        </>
      ) : null}
    </g>
  );
}

const projectFields: readonly ProjectField[] = graphIds.map((graphId, index) => {
  const graph = getContributionGraph(graphId);
  const anchor = projectAnchors[index];
  const selection = selectProjectNodes(graph);
  const positions = new Map(
    selection.nodes.map((node) => [node.id, scaledPosition(node, anchor)]),
  );
  const featuredBeatId = featuredEvidenceByGraph[graphId]?.[0];
  const source =
    graph.beats.find((beat) => beat.id === featuredBeatId) ?? graph.beats[0];

  if (!source) {
    throw new Error(`Contribution graph ${graphId} has no source beat.`);
  }

  return {
    graph,
    anchor,
    positions,
    source,
    ...selection,
  };
});

export default function HopeLineField({ compact = false }: { readonly compact?: boolean }) {
  const spine = smoothPath(projectFields.map((project) => project.anchor));
  const mobileSpine = smoothPath(mobileProjectAnchors);

  return (
    <section
      className={`hope-line${compact ? " hope-line--compact" : ""}`}
      data-visualization="hope-line"
      aria-labelledby="hope-line-title"
    >
      <header className="hope-line__heading">
        <p className="section-code">Living systems atlas / 08 systems</p>
        <div>
          <h2 id="hope-line-title">The Hope Line</h2>
          <p>
            Eight systems share one continuous thread. Each mark opens the public
            work behind a result, with deeper detail available when you want it.
          </p>
        </div>
      </header>

      <div className="hope-line__art">
        <svg
          className="hope-line__svg hope-line__svg--desktop"
          viewBox="0 0 1200 570"
          role="img"
          aria-labelledby="hope-line-svg-title hope-line-svg-description"
          focusable="false"
        >
          <title id="hope-line-svg-title">
            The Hope Line, a portfolio-wide map of connected systems
          </title>
          <desc id="hope-line-svg-description">
            Eight project fields follow one continuous line. Each field connects a
            system to the public work and model associations behind it. A linked
            project guide follows.
          </desc>

          <g className="hope-line__grid" aria-hidden="true">
            {[90, 180, 270, 360, 450].map((y) => (
              <path d={`M28 ${y}H1172`} key={`horizontal-${y}`} />
            ))}
            {[160, 360, 560, 760, 960].map((x) => (
              <path d={`M${x} 28V542`} key={`vertical-${x}`} />
            ))}
          </g>

          <path className="hope-line__spine-underlay" d={spine} />
          <path className="hope-line__spine" d={spine} pathLength="1" />
          <path
            className="hope-line__spine-tracer"
            d={spine}
            pathLength="1"
            aria-hidden="true"
          />

          {projectFields.map((project, projectIndex) => {
            const color = familyColors[project.graph.chapterId];
            const projectNumber = String(projectIndex + 1).padStart(2, "0");

            return (
              <g
                className="hope-line__project"
                data-family={project.graph.chapterId}
                data-graph-id={project.graph.id}
                color={color}
                aria-hidden="true"
                key={project.graph.id}
              >
                <title>{`${project.graph.title}. ${project.graph.impact}`}</title>

                <circle
                  className="hope-line__project-halo"
                  cx={project.anchor.x}
                  cy={project.anchor.y}
                  r="54"
                />

                {project.repositories.map((repository) => {
                  const target = project.positions.get(repository.id);
                  return target ? (
                    <path
                      className="hope-line__project-branch"
                      d={curvedEdge(
                        project.anchor,
                        target,
                        `${project.graph.id}:${repository.id}`,
                      )}
                      pathLength="1"
                      key={`branch-${repository.id}`}
                    />
                  ) : null;
                })}

                {project.edges.map((edge) => {
                  const source = project.positions.get(edge.source);
                  const target = project.positions.get(edge.target);
                  return source && target ? (
                    <path
                      className="hope-line__edge"
                      data-edge-kind={edge.kind}
                      d={curvedEdge(source, target, edge.id)}
                      pathLength="1"
                      key={edge.id}
                    >
                      <title>{edge.kind.replaceAll("-", " ")}</title>
                    </path>
                  ) : null;
                })}

                {project.nodes.map((node) => {
                  const point = project.positions.get(node.id);
                  const agent = project.graph.agents.find(
                    (candidate) => candidate.id === node.agentId,
                  );
                  return point ? (
                    <DataGlyph
                      node={node}
                      point={point}
                      agent={agent}
                      key={node.id}
                    />
                  ) : null;
                })}

                {project.agents.map((agent, agentIndex) => {
                  const attributedCommit = project.nodes.find(
                    (node) =>
                      node.type === "commit" && node.agentId === agent.id,
                  );
                  const commitPoint = attributedCommit
                    ? project.positions.get(attributedCommit.id)
                    : undefined;
                  const modelPoint = {
                    x: project.anchor.x + 64,
                    y: project.anchor.y - 42 + agentIndex * 20,
                  };

                  return (
                    <g key={`${project.graph.id}:${agent.id}`}>
                      {commitPoint ? (
                        <path
                          className="hope-line__model-link"
                          d={curvedEdge(
                            commitPoint,
                            modelPoint,
                            `${project.graph.id}:${agent.id}:model`,
                          )}
                          pathLength="1"
                        />
                      ) : null}
                      <ModelGlyph agent={agent} point={modelPoint} />
                    </g>
                  );
                })}

                <g
                  className="hope-line__project-core"
                  transform={`translate(${project.anchor.x} ${project.anchor.y})`}
                >
                  <circle r="16" />
                  <text x="0" y="3.5" textAnchor="middle">
                    {projectNumber}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        <svg
          className="hope-line__svg hope-line__svg--mobile"
          viewBox="0 0 360 632"
          role="img"
          aria-labelledby="hope-line-mobile-title hope-line-mobile-description"
          focusable="false"
        >
          <title id="hope-line-mobile-title">
            The Hope Line, a portfolio-wide map of connected systems
          </title>
          <desc id="hope-line-mobile-description">
            Eight project systems follow one continuous contribution path. A
            complete linked project index follows the illustration.
          </desc>
          <path className="hope-line__mobile-orbit" d="M28 28H332V604H28Z" />
          <path className="hope-line__spine-underlay" d={mobileSpine} />
          <path className="hope-line__spine" d={mobileSpine} pathLength="1" />
          <path
            className="hope-line__spine-tracer"
            d={mobileSpine}
            pathLength="1"
            aria-hidden="true"
          />
          {projectFields.map((project, index) => {
            const anchor = mobileProjectAnchors[index];
            const color = familyColors[project.graph.chapterId];
            const alignRight = anchor.x > 190;

            return (
              <g
                className="hope-line__mobile-project"
                color={color}
                data-family={project.graph.chapterId}
                data-graph-id={project.graph.id}
                aria-hidden="true"
                key={`mobile-${project.graph.id}`}
              >
                <title>{`${project.graph.title}. ${project.graph.impact}`}</title>
                <circle
                  className="hope-line__project-halo"
                  cx={anchor.x}
                  cy={anchor.y}
                  r="28"
                />
                <circle
                  className="hope-line__mobile-core"
                  cx={anchor.x}
                  cy={anchor.y}
                  r="11"
                />
                <text
                  className="hope-line__mobile-number"
                  x={anchor.x}
                  y={anchor.y + 3}
                  textAnchor="middle"
                >
                  {String(index + 1).padStart(2, "0")}
                </text>
                <text
                  className="hope-line__mobile-label"
                  x={anchor.x + (alignRight ? -20 : 20)}
                  y={anchor.y - 15}
                  textAnchor={alignRight ? "end" : "start"}
                >
                  {project.graph.title}
                </text>
                <text
                  className="hope-line__mobile-family"
                  x={anchor.x + (alignRight ? -20 : 20)}
                  y={anchor.y + 2}
                  textAnchor={alignRight ? "end" : "start"}
                >
                  {project.graph.chapterId}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <details className="hope-line__index-shell" open={!compact}>
        <summary>{compact ? "Explore every system in the atlas" : "Project index"}</summary>
      <ol className="hope-line__index" aria-label="Projects on the Hope Line">
        {projectFields.map((project, index) => {
          const route = projectRoutes[project.graph.id];
          const repositoryNames = project.graph.nodes
            .filter((node) => node.type === "repository")
            .map((node) => node.label);
          const models = project.graph.agents.map((agent) => agent.label);
          const changes = project.nodes
            .filter((node) => node.type === "evidence");
          const commits = project.nodes
            .filter((node) => node.type === "commit");
          const files = project.nodes
            .filter((node) => node.type === "file");

          return (
            <li
              className="hope-line__index-item"
              data-family={project.graph.chapterId}
              data-graph-id={project.graph.id}
              key={project.graph.id}
            >
              <span className="hope-line__index-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="hope-line__index-copy">
                <p className="micro-label">{project.graph.chapterId}</p>
                <h3>{project.graph.title}</h3>
                <p>{project.graph.impact}</p>
                <p className="hope-line__index-meta">
                  <span>{repositoryNames.join(" · ")}</span>
                  {models.length > 0 ? (
                    <span>{`Model associations: ${models.join(", ")}`}</span>
                  ) : null}
                </p>
                <details className="hope-line__index-detail">
                  <summary>Follow this system</summary>
                  <dl>
                    {project.repositories.length > 0 ? (
                      <div>
                        <dt>Projects</dt>
                        <dd><NodeLinkList nodes={project.repositories} /></dd>
                      </div>
                    ) : null}
                    {changes.length > 0 ? (
                      <div>
                        <dt>Reviewed changes</dt>
                        <dd><NodeLinkList nodes={changes} /></dd>
                      </div>
                    ) : null}
                    {commits.length > 0 ? (
                      <div>
                        <dt>Code updates</dt>
                        <dd><NodeLinkList nodes={commits} /></dd>
                      </div>
                    ) : null}
                    {files.length > 0 ? (
                      <div>
                        <dt>Implementation details</dt>
                        <dd><NodeLinkList nodes={files} usePath /></dd>
                      </div>
                    ) : null}
                    {models.length > 0 ? (
                      <div>
                        <dt>Models</dt>
                        <dd>{models.join(" · ")}</dd>
                      </div>
                    ) : null}
                  </dl>
                </details>
                <div className="hope-line__index-actions">
                  <a className="text-action" href={route.href}>
                    <span>{route.label}</span>
                    <span aria-hidden="true">→</span>
                  </a>
                  <a
                    className="source-link hope-line__source-link"
                    href={project.source.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="source-link__label">
                      Public work: {project.source.label}
                    </span>
                    <span className="visually-hidden">
                      {" "}(opens in a new tab)
                    </span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      </details>
    </section>
  );
}
