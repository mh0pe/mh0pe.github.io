export type ContributionGraphId =
  | "automated-security-helper"
  | "cloudformation-guard"
  | "nix-windows"
  | "rules-js-pnp"
  | "lightpanda-svg"
  | "portable-frameworks"
  | "aws-labs-mcp"
  | "cloud-runtime";

export type ContributionClusterId =
  "security" | "cloud" | "agents" | "browser" | "durability";

export type ContributionGraphNodeType =
  "repository" | "evidence" | "commit" | "directory" | "file";

export interface ContributionGraphAgent {
  readonly id: string;
  readonly label: string;
  readonly provider: string;
  readonly aliases: readonly string[];
  readonly marker: string;
  readonly attributionScope: "repository-family";
  readonly recordedCommitCount: number;
  readonly associatedCodeAdditions: number;
}

export interface ContributionGraphNode {
  readonly id: string;
  readonly type: ContributionGraphNodeType;
  readonly label: string;
  readonly href: string;
  readonly repository: string;
  readonly evidenceIds: readonly string[];
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly weight: number;
  readonly availability?: "upstream" | "public-fork";
  readonly agentId?: string | null;
  readonly date?: string | null;
  readonly path?: string;
  readonly sha?: string;
  readonly status?: string;
}

export interface ContributionGraphEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly kind:
    | "contains-directory"
    | "contains-subdirectory"
    | "contains-file"
    | "documents-change"
    | "includes-commit"
    | "commit-touches-file"
    | "touches-file";
  readonly evidenceId?: string;
  readonly status?: string;
  readonly additions?: number;
  readonly deletions?: number;
  readonly changes?: number;
}

export interface ContributionGraphBeatFile {
  readonly nodeId: string;
  readonly label: string;
  readonly path: string;
  readonly href: string;
  readonly repository: string;
  readonly status: string;
}

export interface ContributionGraphBeat {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly availability: "upstream" | "public-fork";
  readonly integrationStatus:
    "merged" | "open" | "closed-unmerged" | "direct-commit";
  readonly kind: "pull-request" | "commit";
  readonly repository: string;
  readonly date: string | null;
  readonly commitCount: number;
  readonly changedFileCount: number;
  readonly displayedCommitCount: number;
  readonly displayedFileCount: number;
  readonly files: readonly ContributionGraphBeatFile[];
  readonly exactCommitFileCoverage: {
    readonly sampledCommitCount: number;
    readonly resolvedCommitCount: number;
    readonly unavailableCommitCount: number;
    readonly displayableRelationCount: number;
    readonly displayedRelationCount: number;
  };
}

export interface ContributionGraph {
  readonly schemaVersion: 2;
  readonly id: ContributionGraphId;
  readonly chapterId: ContributionClusterId;
  readonly title: string;
  readonly impact: string;
  readonly caption: string;
  readonly publicOnly: true;
  readonly sampling: {
    readonly representative: true;
    readonly maxCommitsPerEvidence: number;
    readonly maxFilesPerEvidence: number;
    readonly exactCommitDetails: {
      readonly requested: number;
      readonly resolved: number;
      readonly unavailable: number;
    };
  };
  readonly agents: readonly ContributionGraphAgent[];
  readonly nodes: readonly ContributionGraphNode[];
  readonly edges: readonly ContributionGraphEdge[];
  readonly beats: readonly ContributionGraphBeat[];
}

export interface ContributionStoryProject {
  readonly id: string;
  readonly title: string;
  readonly graphId: ContributionGraphId;
  readonly clusterId: ContributionClusterId;
}

export interface ContributionPlayerCommitRecord {
  readonly sha: string;
  readonly label: string;
  readonly href: string;
  readonly date: string | null;
  readonly agentId: string | null;
}

export interface ContributionPlayerFileRecord {
  readonly path: string;
  readonly href: string;
  readonly status: string;
  readonly additions: number;
  readonly deletions: number;
  readonly changes: number;
}

export interface ContributionPlayerChangeRecord {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly availability: "upstream" | "public-fork";
  readonly integrationStatus:
    | "merged"
    | "open"
    | "closed-unmerged"
    | "direct-commit";
  readonly kind: "pull-request" | "commit";
  readonly repository: string;
  readonly date: string | null;
  readonly number: number | null;
  readonly referenceSha: string;
  readonly commits: readonly ContributionPlayerCommitRecord[];
  readonly files: readonly ContributionPlayerFileRecord[];
}

export interface ContributionPlayerRecords {
  readonly schemaVersion: 1;
  readonly publicOnly: true;
  readonly id: ContributionGraphId;
  readonly repositories: readonly {
    readonly name: string;
    readonly href: string;
  }[];
  readonly changes: readonly ContributionPlayerChangeRecord[];
}
