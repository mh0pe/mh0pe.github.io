import type { CaseStudy } from "../../data/portfolio-v2";
import { getContributionGraph } from "../contribution-story/graph-loaders";
import type {
  ContributionGraph,
  ContributionGraphAgent,
  ContributionGraphId,
  ContributionGraphNode,
} from "../contribution-story/types";

const caseGraphIds: Record<CaseStudy["id"], ContributionGraphId> = {
  "automated-security-helper": "automated-security-helper",
  "cloudformation-guard": "cloudformation-guard",
  "nix-windows": "nix-windows",
  "agent-systems": "portable-frameworks",
};

interface ThreadBeat {
  readonly repository?: ContributionGraphNode;
  readonly change: ContributionGraphNode;
  readonly commit?: ContributionGraphNode;
  readonly file?: ContributionGraphNode;
  readonly agent?: ContributionGraphAgent;
}

function byWeight(left: ContributionGraphNode, right: ContributionGraphNode) {
  return right.weight - left.weight || left.label.localeCompare(right.label);
}

function firstNode(
  graph: ContributionGraph,
  ids: readonly string[],
  type: ContributionGraphNode["type"],
) {
  const wanted = new Set(ids);
  return graph.nodes
    .filter((node) => wanted.has(node.id) && node.type === type)
    .sort(byWeight)[0];
}

function buildThread(graph: ContributionGraph): readonly ThreadBeat[] {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const changes = graph.nodes
    .filter((node) => node.type === "evidence")
    .sort(byWeight)
    .slice(0, 2);

  return changes.map((change) => {
    const repositoryIds = graph.edges
      .filter((edge) => edge.kind === "documents-change" && edge.target === change.id)
      .map((edge) => edge.source);
    const commitIds = graph.edges
      .filter((edge) => edge.kind === "includes-commit" && edge.source === change.id)
      .map((edge) => edge.target);
    const commits = commitIds
      .map((id) => nodeById.get(id))
      .filter((node): node is ContributionGraphNode => node?.type === "commit")
      .sort((left, right) => {
        const associated = Number(Boolean(right.agentId)) - Number(Boolean(left.agentId));
        return associated || (right.date ?? "").localeCompare(left.date ?? "") || byWeight(left, right);
      });
    const commit = commits[0];
    const exactFileIds = commit
      ? graph.edges
          .filter((edge) => edge.kind === "commit-touches-file" && edge.source === commit.id)
          .map((edge) => edge.target)
      : [];
    const changeFileIds = graph.edges
      .filter((edge) => edge.kind === "touches-file" && edge.source === change.id)
      .map((edge) => edge.target);
    const file =
      firstNode(graph, exactFileIds, "file") ??
      firstNode(graph, changeFileIds, "file");

    return {
      repository: firstNode(graph, repositoryIds, "repository"),
      change,
      commit,
      file,
      agent: commit?.agentId
        ? graph.agents.find((candidate) => candidate.id === commit.agentId)
        : undefined,
    };
  });
}

function curve(fromX: number, fromY: number, toX: number, toY: number, moveTo = true) {
  const midpoint = (fromX + toX) / 2;
  return `${moveTo ? `M${fromX} ${fromY} ` : ""}C${midpoint} ${fromY} ${midpoint} ${toY} ${toX} ${toY}`;
}

function shortFileName(node: ContributionGraphNode) {
  const path = node.path ?? node.label;
  return path.split("/").at(-1) ?? path;
}

function SourceNode({
  node,
  type,
  x,
  y,
  agent,
}: {
  readonly node: ContributionGraphNode;
  readonly type: "repository" | "change" | "commit" | "file";
  readonly x: number;
  readonly y: number;
  readonly agent?: ContributionGraphAgent;
}) {
  const label =
    type === "repository"
      ? `Project: ${node.label}`
      : type === "change"
        ? `Reviewed change: ${node.label}`
        : type === "file"
          ? `Implementation detail: ${node.path ?? node.label}`
          : agent
            ? `Code update: ${node.label}. Model association: ${agent.label}.`
            : `Code update: ${node.label}`;

  const glyph = (
    <>
      <circle className="lineage-field__halo" r={type === "change" ? 18 : 14} />
      {type === "repository" ? <rect x="-10" y="-7" width="20" height="14" rx="3" /> : null}
      {type === "change" ? <path d="M0-10 10 0 0 10-10 0Z" /> : null}
      {type === "commit" ? <circle r="6" /> : null}
      {type === "file" ? <rect x="-6" y="-6" width="12" height="12" rx="2" /> : null}
      {agent ? <path className="lineage-field__model-stitch" d="M-9-11 0-16 9-11" /> : null}
    </>
  );

  return (
    <>
      <a
        className="lineage-field__source"
        data-lineage-label={label}
        data-lineage-node={type}
        href={node.href}
        target="_blank"
        rel="noreferrer"
        aria-label={`${label} Opens in a new tab.`}
      >
        <title>{label}</title>
        <circle className="lineage-field__hit-area" cx={x} cy={y} r="22" vectorEffect="non-scaling-stroke" />
      </a>
      <g
        className="lineage-field__source-static"
        transform={`translate(${x} ${y})`}
        aria-hidden="true"
      >
        {glyph}
      </g>
    </>
  );
}

function FallbackSourceLink({
  href,
  children,
}: {
  readonly href: string;
  readonly children: React.ReactNode;
}) {
  return (
    <a
      className="lineage-field__fallback-link"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      <span className="lineage-field__fallback-label">{children}</span>
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

export default function ProjectLineageField({
  caseStudy,
  compact = false,
}: {
  readonly caseStudy: CaseStudy;
  readonly compact?: boolean;
}) {
  const graph = getContributionGraph(caseGraphIds[caseStudy.id]);
  const beats = buildThread(graph);
  const rows = beats.length === 1 ? [112] : [74, 158];
  const repositories = [...new Map(
    beats
      .map((beat) => beat.repository)
      .filter((node): node is ContributionGraphNode => Boolean(node))
      .map((node) => [node.id, node]),
  ).values()];
  const repositoryRows = new Map(repositories.map((repository) => [
    repository.id,
    repositories.length === 1
      ? 112
      : rows[beats.findIndex((beat) => beat.repository?.id === repository.id)] ?? 112,
  ]));
  const threads = beats.map((beat, index) => {
    const y = rows[index] ?? 112;
    const rootY = beat.repository ? repositoryRows.get(beat.repository.id) ?? y : y;
    const segments: (readonly [number, number, number, number])[] = [
      ...(beat.repository ? [[82, rootY, 248, y] as const] : []),
      [248, y, 414, y],
      [414, y, 574, y],
      [574, y, 706, 112],
    ];
    return { beat, y, segments };
  });

  return (
    <figure
      className={`lineage-field${compact ? " lineage-field--compact" : ""}`}
      data-family={caseStudy.family}
      data-lineage-field
    >
      <div className="lineage-field__heading">
        <p className="micro-label">Living architecture</p>
        <p>Follow a real path from system to change, code, and result.</p>
      </div>
      <div className="lineage-field__canvas">
        <svg
          viewBox="0 0 760 228"
          role="group"
          aria-labelledby={`lineage-${caseStudy.id}-title lineage-${caseStudy.id}-description`}
        >
          <title id={`lineage-${caseStudy.id}-title`}>{`${caseStudy.title} contribution thread`}</title>
          <desc id={`lineage-${caseStudy.id}-description`}>
            Linked public work connects the project, representative changes, and
            implementation details to the result described in this case study.
          </desc>
          <defs>
            <linearGradient id={`lineage-gradient-${caseStudy.id}`} x1="0" x2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.18" />
              <stop offset="0.52" stopColor="currentColor" stopOpacity="0.9" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0.28" />
            </linearGradient>
          </defs>
          <g className="lineage-field__guides" aria-hidden="true">
            <path d="M28 42H732M28 112H732M28 182H732" />
            <path d="M82 22V206M248 22V206M414 22V206M574 22V206M706 22V206" />
          </g>
          <g className="lineage-field__paths" aria-hidden="true">
            {threads.map(({ beat, segments }, index) => (
              <g key={`paths-${beat.change.id}`} style={{ "--thread-index": index } as React.CSSProperties}>
                {segments.map((segment, segmentIndex) => (
                  <path key={segmentIndex} d={curve(...segment)} pathLength="1" />
                ))}
              </g>
            ))}
            {threads.map(({ beat, segments }) => (
              <path
                key={`current-${beat.change.id}`}
                className="lineage-field__current"
                d={segments.map((segment, index) => curve(...segment, index === 0)).join(" ")}
                pathLength="1"
                stroke={`url(#lineage-gradient-${caseStudy.id})`}
              />
            ))}
          </g>
          {repositories.map((repository) => (
            <SourceNode
              key={repository.id}
              node={repository}
              type="repository"
              x={82}
              y={repositoryRows.get(repository.id) ?? 112}
            />
          ))}
          {threads.map(({ beat, y }) => {
            return (
              <g key={beat.change.id}>
                <SourceNode node={beat.change} type="change" x={248} y={y} />
                {beat.commit ? (
                  <SourceNode node={beat.commit} type="commit" x={414} y={y} agent={beat.agent} />
                ) : null}
                {beat.file ? <SourceNode node={beat.file} type="file" x={574} y={y} /> : null}
                {beat.file ? (
                  <text className="lineage-field__file-label" x={574} y={y + 25} textAnchor="middle">
                    {shortFileName(beat.file)}
                  </text>
                ) : null}
              </g>
            );
          })}
          <g className="lineage-field__outcome" transform="translate(706 112)" aria-hidden="true">
            <circle r="23" />
            <circle r="8" />
          </g>
          <g className="lineage-field__labels" aria-hidden="true">
            <text x="82" y="204" textAnchor="middle">PROJECT</text>
            <text x="248" y="204" textAnchor="middle">REVIEW</text>
            <text x="414" y="204" textAnchor="middle">CODE</text>
            <text x="574" y="204" textAnchor="middle">DETAIL</text>
            <text x="706" y="204" textAnchor="middle">RESULT</text>
          </g>
        </svg>
        <p className="lineage-field__tooltip" data-lineage-tooltip aria-hidden="true">
          Trace the work through its source links.
        </p>
      </div>
      <details className="lineage-field__fallback" data-lineage-fallback>
        <summary>Follow the thread</summary>
        <ol>
          {beats.map((beat, index) => (
            <li key={`fallback-${beat.change.id}`}>
              {beat.repository ? (
                beats.findIndex((candidate) => candidate.repository?.id === beat.repository?.id) === index ? (
                  <FallbackSourceLink href={beat.repository.href}>
                    Project: {beat.repository.label}
                  </FallbackSourceLink>
                ) : (
                  <>
                    Project: {beat.repository.label}<br />
                  </>
                )
              ) : null}
              Reviewed change
              <FallbackSourceLink href={beat.change.href}>{beat.change.label}</FallbackSourceLink>
              {beat.commit ? (
                <FallbackSourceLink href={beat.commit.href}>
                  Code update: {beat.commit.label}
                </FallbackSourceLink>
              ) : null}
              {beat.file ? (
                <FallbackSourceLink href={beat.file.href}>
                  Implementation detail: {beat.file.path ?? beat.file.label}
                </FallbackSourceLink>
              ) : null}
            </li>
          ))}
        </ol>
      </details>
    </figure>
  );
}
