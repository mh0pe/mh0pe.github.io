import type { ReactNode } from "react";
import type { CaseStudy } from "../../data/portfolio-v2";
import { getContributionGraph } from "../contribution-story/graph-loaders";
import type { ContributionGraph, ContributionGraphId, ContributionGraphNode } from "../contribution-story/types";

const caseGraphIds: Record<CaseStudy["id"], ContributionGraphId> = {
  "automated-security-helper": "automated-security-helper",
  "cloudformation-guard": "cloudformation-guard",
  "nix-windows": "nix-windows",
  "agent-systems": "portable-frameworks",
};

function byWeight(a: ContributionGraphNode, b: ContributionGraphNode) {
  return b.weight - a.weight || a.label.localeCompare(b.label);
}

export function contributionRecords(graph: ContributionGraph) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const first = (ids: string[], type: ContributionGraphNode["type"]) => ids
    .map((id) => nodes.get(id)).filter((node): node is ContributionGraphNode => node?.type === type).sort(byWeight)[0];
  return graph.nodes.filter((node) => node.type === "evidence").sort(byWeight).slice(0, 2).map((change) => {
    const repository = first(graph.edges.filter((edge) => edge.kind === "documents-change" && edge.target === change.id).map((edge) => edge.source), "repository");
    const commits = graph.edges.filter((edge) => edge.kind === "includes-commit" && edge.source === change.id)
      .map((edge) => nodes.get(edge.target)).filter((node): node is ContributionGraphNode => node?.type === "commit")
      .sort((a, b) => Number(Boolean(b.agentId)) - Number(Boolean(a.agentId)) || (b.date ?? "").localeCompare(a.date ?? "") || byWeight(a, b));
    const commit = commits[0];
    const exactFiles = commit ? graph.edges.filter((edge) => edge.kind === "commit-touches-file" && edge.source === commit.id).map((edge) => edge.target) : [];
    const relatedFiles = graph.edges.filter((edge) => edge.kind === "touches-file" && edge.source === change.id).map((edge) => edge.target);
    const file = first(exactFiles, "file") ?? first(relatedFiles, "file");
    // A graph node's file URL may represent another revision. These are separate
    // related records, never a claimed exact commit-to-file chain.
    return { repository, change, commit, file };
  });
}

function RecordLink({ node, kind, children }: { node: ContributionGraphNode; kind: string; children: ReactNode }) {
  return <a className="source-records__link" href={node.href} data-source-kind={kind} data-source-id={node.id} target="_blank" rel="noreferrer">{children}<span className="source-records__arrow" aria-hidden="true">↗</span><span className="visually-hidden"> (opens in a new tab)</span></a>;
}

export default function ProjectLineageField({ caseStudy, compact = false, inlineSources = false }: {
  caseStudy: CaseStudy; compact?: boolean; inlineSources?: boolean;
}) {
  const records = contributionRecords(getContributionGraph(caseGraphIds[caseStudy.id]));
  return (
    <aside className={`lineage-field source-records${compact ? " source-records--compact" : ""}`} data-family={caseStudy.family} aria-label={`${caseStudy.title}: contributions on GitHub`}>
      <div className="source-records__heading"><p>Explore the contributions</p><span>On GitHub</span></div>
      <ul className="source-records__list">
        {records.map(({ repository, change, commit, file }, index) => (
          <li key={change.id} data-source-change={change.id}>
            {repository ? <p className="source-records__project">{records.findIndex((record) => record.repository?.id === repository.id) === index
              ? <RecordLink node={repository} kind="project">Open project: {repository.label}</RecordLink>
              : repository.label}</p> : null}
            <RecordLink node={change} kind="change"><span><strong>{change.label}</strong><small>Read the reviewed change</small></span></RecordLink>
            {commit || file ? <details className="source-records__details" open={inlineSources || undefined}>
              <summary>Implementation details</summary>
              {commit ? <RecordLink node={commit} kind="commit"><span><small>Code update</small>{commit.label}</span></RecordLink> : null}
              {file ? <RecordLink node={file} kind="file"><span><small>Related file</small>{file.path ?? file.label}</span></RecordLink> : null}
            </details> : null}
          </li>
        ))}
      </ul>
    </aside>
  );
}
