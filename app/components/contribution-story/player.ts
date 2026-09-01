import { modelForAgent } from "../attribution-model";
import { createContributionTimeline } from "./timeline";
import type {
  ContributionGraph,
  ContributionGraphNodeType,
  ContributionPlayerChangeRecord,
  ContributionPlayerRecords,
} from "./types";

export type ContributionPlayerEntityKind =
  | "repository"
  | "pull-request"
  | "direct-change"
  | "commit"
  | "file";

export type ContributionPlayerFilter =
  | "all"
  | "repositories"
  | "changes"
  | "commits"
  | "files";

export interface ContributionPlayerFact {
  readonly label: string;
  readonly value: string;
}

export interface ContributionPlayerItem {
  readonly id: string;
  readonly kind: ContributionPlayerEntityKind;
  readonly label: string;
  readonly href: string;
  readonly repository: string;
  readonly evidenceId: string | null;
  readonly nodeId: string | null;
  readonly nodeType: ContributionGraphNodeType | null;
  readonly date: string | null;
  readonly status: string;
  readonly description: string;
  readonly facts: readonly ContributionPlayerFact[];
  readonly commitId: string | null;
  readonly fileId: string | null;
}

function plural(value: number, noun: string) {
  return `${value} ${noun}${value === 1 ? "" : "s"}`;
}

function compactSha(sha: string) {
  return sha.slice(0, 8);
}

function integrationLabel(
  change: Pick<ContributionPlayerChangeRecord, "integrationStatus">,
) {
  switch (change.integrationStatus) {
    case "merged":
      return "Merged upstream";
    case "open":
      return "Public implementation";
    case "closed-unmerged":
      return "Available in public source";
    case "direct-commit":
      return "Shipped in public source";
  }
}

function changeDescription(
  change: Pick<ContributionPlayerChangeRecord, "integrationStatus">,
) {
  if (change.integrationStatus === "merged") {
    return "A reviewed public change that is now part of the upstream codebase.";
  }
  if (change.integrationStatus === "direct-commit") {
    return "A directly shipped public change with its source record preserved.";
  }
  return "A working public implementation available from the linked source, whether or not upstream review has completed.";
}

function metricFacts(
  additions: number,
  deletions: number,
): readonly ContributionPlayerFact[] {
  if (additions === 0 && deletions === 0) {
    return [];
  }
  return [
    { label: "Added", value: `+${additions.toLocaleString("en-US")}` },
    { label: "Removed", value: `−${deletions.toLocaleString("en-US")}` },
  ];
}

function graphNodeForRepository(
  graph: ContributionGraph,
  repository: string,
) {
  return graph.nodes.find(
    (node) =>
      node.type === "repository" && node.repository === repository,
  );
}

function graphNodeForChange(graph: ContributionGraph, evidenceId: string) {
  return graph.nodes.find(
    (node) =>
      node.type === "evidence" && node.evidenceIds.includes(evidenceId),
  );
}

function graphNodeForCommit(
  graph: ContributionGraph,
  evidenceId: string,
  sha: string,
) {
  return graph.nodes.find(
    (node) =>
      node.type === "commit" &&
      node.sha === sha &&
      node.evidenceIds.includes(evidenceId),
  );
}

function graphNodeForFile(
  graph: ContributionGraph,
  change: ContributionPlayerChangeRecord,
  path: string,
) {
  return graph.nodes.find(
    (node) =>
      node.type === "file" &&
      node.repository === change.repository &&
      node.path === path &&
      node.evidenceIds.includes(change.id),
  );
}

function repositoryItems(
  graph: ContributionGraph,
  records: ContributionPlayerRecords,
): readonly ContributionPlayerItem[] {
  return records.repositories.map((repository) => {
    const node = graphNodeForRepository(graph, repository.name);
    const changes = records.changes.filter(
      (change) => change.repository === repository.name,
    );
    const commitCount = changes.reduce(
      (total, change) => total + change.commits.length,
      0,
    );
    const fileCount = changes.reduce(
      (total, change) => total + change.files.length,
      0,
    );

    return {
      id: `player:${graph.id}:repository:${repository.name}`,
      kind: "repository",
      label: repository.name,
      href: repository.href,
      repository: repository.name,
      evidenceId: changes[0]?.id ?? null,
      nodeId: node?.id ?? null,
      nodeType: node?.type ?? null,
      date: null,
      status: "Public repository",
      description:
        "The public source root that anchors this contribution lineage.",
      facts: [
        { label: "Changes", value: String(changes.length) },
        { label: "Commits", value: String(commitCount) },
        { label: "File records", value: String(fileCount) },
      ],
      commitId: null,
      fileId: null,
    };
  });
}

function changeItem(
  graph: ContributionGraph,
  change: ContributionPlayerChangeRecord,
): ContributionPlayerItem {
  const node = graphNodeForChange(graph, change.id);
  return {
    id: `player:${graph.id}:change:${change.id}`,
    kind: change.kind === "pull-request" ? "pull-request" : "direct-change",
    label: change.label,
    href: change.href,
    repository: change.repository,
    evidenceId: change.id,
    nodeId: node?.id ?? null,
    nodeType: node?.type ?? null,
    date: change.date,
    status: integrationLabel(change),
    description: changeDescription(change),
    facts: [
      {
        label: change.kind === "pull-request" ? "Review" : "Record",
        value: integrationLabel(change),
      },
      { label: "Commits", value: String(change.commits.length) },
      { label: "Files", value: String(change.files.length) },
    ],
    commitId: null,
    fileId: null,
  };
}

function commitItems(
  graph: ContributionGraph,
  change: ContributionPlayerChangeRecord,
): readonly ContributionPlayerItem[] {
  const agentById = new Map(
    graph.agents.map((agent) => [agent.id, modelForAgent(agent)]),
  );

  return change.commits.map((commit) => {
    const node = graphNodeForCommit(graph, change.id, commit.sha);
    const exactFileEdges = node
      ? graph.edges.filter(
          (edge) =>
            edge.kind === "commit-touches-file" &&
            edge.evidenceId === change.id &&
            edge.source === node.id,
        )
      : [];
    const additions = exactFileEdges.reduce(
      (total, edge) => total + (edge.additions ?? 0),
      0,
    );
    const deletions = exactFileEdges.reduce(
      (total, edge) => total + (edge.deletions ?? 0),
      0,
    );
    const agent = commit.agentId
      ? agentById.get(commit.agentId)?.label
      : null;

    return {
      id: `player:${graph.id}:commit:${change.id}:${commit.sha}`,
      kind: "commit",
      label: commit.label,
      href: commit.href,
      repository: change.repository,
      evidenceId: change.id,
      nodeId: node?.id ?? null,
      nodeType: node?.type ?? null,
      date: commit.date,
      status: `Commit ${compactSha(commit.sha)}`,
      description:
        exactFileEdges.length > 0
          ? `This public commit has exact file-level relationships for ${plural(exactFileEdges.length, "changed path")}.`
          : "This public commit is part of the complete linked change record.",
      facts: [
        { label: "SHA", value: compactSha(commit.sha) },
        ...(exactFileEdges.length > 0
          ? [{ label: "Exact files", value: String(exactFileEdges.length) }]
          : []),
        ...(agent ? [{ label: "Recorded model", value: agent }] : []),
        ...metricFacts(additions, deletions),
      ],
      commitId: commit.sha,
      fileId: null,
    };
  });
}

function fileItems(
  graph: ContributionGraph,
  change: ContributionPlayerChangeRecord,
): readonly ContributionPlayerItem[] {
  return change.files.map((file) => {
    const node = graphNodeForFile(graph, change, file.path);
    const exactEdges = node
      ? graph.edges.filter(
          (edge) =>
            edge.kind === "commit-touches-file" &&
            edge.evidenceId === change.id &&
            edge.target === node.id,
        )
      : [];

    return {
      id: `player:${graph.id}:file:${change.id}:${file.path}`,
      kind: "file",
      label: file.path,
      href: file.href,
      repository: change.repository,
      evidenceId: change.id,
      nodeId: node?.id ?? null,
      nodeType: node?.type ?? "file",
      date: change.date,
      status: file.status,
      description:
        exactEdges.length > 0
          ? `This path is connected to ${plural(exactEdges.length, "exact public commit")} in the visualized change.`
          : "This path is part of the complete public changed-file record.",
      facts: [
        { label: "State", value: file.status },
        { label: "Changes", value: file.changes.toLocaleString("en-US") },
        ...metricFacts(file.additions, file.deletions),
      ],
      commitId: null,
      fileId: node?.id ?? `record-file:${change.repository}:${file.path}`,
    };
  });
}

export function createContributionPlayerItems(
  graph: ContributionGraph,
  records: ContributionPlayerRecords,
): readonly ContributionPlayerItem[] {
  if (graph.id !== records.id || records.publicOnly !== true) {
    throw new TypeError(
      `Player records do not match public graph ${graph.id}.`,
    );
  }
  const timeline = createContributionTimeline(graph);
  const changeById = new Map(
    records.changes.map((change) => [change.id, change]),
  );
  const orderedChanges = [
    ...timeline.beats
      .map(({ beat }) => changeById.get(beat.id))
      .filter(
        (change): change is ContributionPlayerChangeRecord =>
          change !== undefined,
      ),
  ];
  if (orderedChanges.length !== records.changes.length) {
    throw new TypeError(
      `Player records contain changes outside graph ${graph.id}.`,
    );
  }

  const items: ContributionPlayerItem[] = [];
  for (const repository of repositoryItems(graph, records)) {
    items.push(repository);
    for (const change of orderedChanges.filter(
      (candidate) => candidate.repository === repository.repository,
    )) {
      items.push(changeItem(graph, change));
      items.push(...commitItems(graph, change));
      items.push(...fileItems(graph, change));
    }
  }
  return items;
}

export function filterContributionPlayerItems(
  items: readonly ContributionPlayerItem[],
  filter: ContributionPlayerFilter,
): readonly ContributionPlayerItem[] {
  switch (filter) {
    case "all":
      return items;
    case "repositories":
      return items.filter((item) => item.kind === "repository");
    case "changes":
      return items.filter(
        (item) =>
          item.kind === "pull-request" || item.kind === "direct-change",
      );
    case "commits":
      return items.filter((item) => item.kind === "commit");
    case "files":
      return items.filter((item) => item.kind === "file");
  }
}
