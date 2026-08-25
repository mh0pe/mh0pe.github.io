export type AttributionSurface = "all" | "pr" | "fork-only";
export type AttributionCommitSurface = "pr" | "owned-nonfork" | "fork-only";
export type AttributionScope = "code" | "all-text";
export type AttributionMetric = "additions" | "commits";

export interface AttributionFilters {
  readonly repository: string;
  readonly surface: AttributionSurface;
  readonly scope: AttributionScope;
  readonly metric: AttributionMetric;
  readonly agent: string;
}

export interface AttributionAgent {
  readonly id: string;
  readonly label: string;
  readonly provider: string;
  readonly aliases: readonly string[];
  readonly marker: string;
}

export interface AttributionPullRequestLink {
  readonly number: number;
  readonly url: string;
  readonly state: "open" | "open_draft" | "merged" | "closed_unmerged";
}

export interface AttributionCommit {
  readonly sha: string;
  readonly url: string;
  readonly date: string;
  readonly repository: string;
  readonly repositories: readonly string[];
  readonly account: string;
  readonly accounts: readonly string[];
  readonly agentId: string;
  readonly surfaces: readonly AttributionCommitSurface[];
  readonly prLinks: readonly AttributionPullRequestLink[];
  readonly additions: {
    readonly code: number;
    readonly allText: number;
  };
  readonly deletions: {
    readonly code: number;
    readonly allText: number;
  };
}

export interface AgentAttributionData {
  readonly schemaVersion: 1;
  readonly snapshot: {
    readonly generatedAt: string;
    readonly sourceExportGeneratedAt: string;
    readonly accounts: readonly string[];
    readonly publicOnly: true;
  };
  readonly methodology: {
    readonly metricLabel: string;
    readonly mergeCommitsExcluded: boolean;
    readonly globalShaDeduplication: boolean;
    readonly defaultScope: "code";
    readonly sharedAgentPolicy: "shared-bucket";
  };
  readonly filters: {
    readonly repositories: readonly string[];
    readonly surfaces: readonly AttributionSurface[];
    readonly scopes: readonly AttributionScope[];
    readonly metrics: readonly AttributionMetric[];
  };
  readonly agents: readonly AttributionAgent[];
  readonly commits: readonly AttributionCommit[];
  readonly coverage: {
    readonly candidateShas: number;
    readonly measuredShas: number;
    readonly duplicateOccurrencesRemoved: number;
    readonly mergeCommitsExcluded: number;
    readonly zeroDiffCommits: number;
    readonly warnings: readonly string[];
  };
}

export function readAgentAttributionData(value: unknown): AgentAttributionData {
  if (
    typeof value !== "object" ||
    value === null ||
    !("schemaVersion" in value) ||
    value.schemaVersion !== 1 ||
    !("agents" in value) ||
    !Array.isArray(value.agents) ||
    !("commits" in value) ||
    !Array.isArray(value.commits) ||
    !("snapshot" in value) ||
    typeof value.snapshot !== "object" ||
    value.snapshot === null ||
    !("publicOnly" in value.snapshot) ||
    value.snapshot.publicOnly !== true
  ) {
    throw new Error("Agent attribution data failed its public schema check.");
  }

  return value as AgentAttributionData;
}

export interface AttributionAgentSummary {
  readonly agent: AttributionAgent;
  readonly additions: number;
  readonly commits: number;
  readonly value: number;
  readonly percentage: number;
}

export const ATTRIBUTION_QUERY_KEYS = {
  agent: "agent",
  repository: "repository",
  surface: "surface",
  scope: "scope",
  metric: "metric",
} as const;

export const DEFAULT_ATTRIBUTION_FILTERS: AttributionFilters = {
  agent: "all",
  repository: "all",
  surface: "all",
  scope: "code",
  metric: "additions",
};

function hasValue<T extends string>(
  values: readonly T[],
  candidate: string | null,
): candidate is T {
  return candidate !== null && values.some((value) => value === candidate);
}

export function attributionRepositories(
  data: AgentAttributionData,
): readonly string[] {
  const configured = data.filters.repositories.filter(
    (repository) => repository !== "all",
  );
  const repositories = [
    ...configured,
    ...data.commits.flatMap((commit) => commit.repositories),
  ];

  return [...new Set(repositories)].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function attributionAgents(
  data: AgentAttributionData,
): readonly AttributionAgent[] {
  const agentIds = new Set(data.commits.map((commit) => commit.agentId));
  return data.agents.filter((agent) => agentIds.has(agent.id));
}

export function parseAttributionSearch(
  search: string,
  data: AgentAttributionData,
): AttributionFilters {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const repositories = attributionRepositories(data);
  const agentIds = attributionAgents(data).map((agent) => agent.id);

  const repository = params.get(ATTRIBUTION_QUERY_KEYS.repository);
  const surface = params.get(ATTRIBUTION_QUERY_KEYS.surface);
  const scope = params.get(ATTRIBUTION_QUERY_KEYS.scope);
  const metric = params.get(ATTRIBUTION_QUERY_KEYS.metric);
  const agent = params.get(ATTRIBUTION_QUERY_KEYS.agent);

  return {
    repository:
      repository === "all" || hasValue(repositories, repository)
        ? repository
        : DEFAULT_ATTRIBUTION_FILTERS.repository,
    surface: hasValue(["all", "pr", "fork-only"] as const, surface)
      ? surface
      : DEFAULT_ATTRIBUTION_FILTERS.surface,
    scope: hasValue(["code", "all-text"] as const, scope)
      ? scope
      : DEFAULT_ATTRIBUTION_FILTERS.scope,
    metric: hasValue(["additions", "commits"] as const, metric)
      ? metric
      : DEFAULT_ATTRIBUTION_FILTERS.metric,
    agent:
      agent === "all" || hasValue(agentIds, agent)
        ? agent
        : DEFAULT_ATTRIBUTION_FILTERS.agent,
  };
}

export function serializeAttributionSearch(
  filters: AttributionFilters,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters) as Array<
    [keyof AttributionFilters, string]
  >) {
    if (value !== DEFAULT_ATTRIBUTION_FILTERS[key]) {
      params.set(ATTRIBUTION_QUERY_KEYS[key], value);
    }
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function filtersEqual(
  left: AttributionFilters,
  right: AttributionFilters,
): boolean {
  return (
    left.agent === right.agent &&
    left.repository === right.repository &&
    left.surface === right.surface &&
    left.scope === right.scope &&
    left.metric === right.metric
  );
}

function commitMatchesView(
  commit: AttributionCommit,
  filters: AttributionFilters,
): boolean {
  return (
    (filters.repository === "all" ||
      commit.repositories.includes(filters.repository)) &&
    (filters.surface === "all" || commit.surfaces.includes(filters.surface))
  );
}

export function filterAttributionCommits(
  data: AgentAttributionData,
  filters: AttributionFilters,
): readonly AttributionCommit[] {
  const seenShas = new Set<string>();

  return data.commits.filter((commit) => {
    if (!commitMatchesView(commit, filters) || seenShas.has(commit.sha)) {
      return false;
    }

    seenShas.add(commit.sha);
    return true;
  });
}

export function attributionEvidence(
  data: AgentAttributionData,
  filters: AttributionFilters,
): readonly AttributionCommit[] {
  const commits = filterAttributionCommits(data, filters).filter(
    (commit) => filters.agent === "all" || commit.agentId === filters.agent,
  );

  return [...commits].sort((left, right) => {
    if (filters.metric === "additions") {
      const leftAdditions =
        filters.scope === "code" ? left.additions.code : left.additions.allText;
      const rightAdditions =
        filters.scope === "code"
          ? right.additions.code
          : right.additions.allText;
      if (leftAdditions !== rightAdditions) {
        return rightAdditions - leftAdditions;
      }
    }

    return (
      Date.parse(right.date) - Date.parse(left.date) ||
      left.sha.localeCompare(right.sha)
    );
  });
}

export function aggregateAttribution(
  data: AgentAttributionData,
  filters: AttributionFilters,
): readonly AttributionAgentSummary[] {
  const agents = new Map(data.agents.map((agent) => [agent.id, agent]));
  const rows = new Map<
    string,
    { agent: AttributionAgent; additions: number; commits: number }
  >();

  for (const commit of filterAttributionCommits(data, filters)) {
    const agent = agents.get(commit.agentId);
    if (!agent) {
      continue;
    }

    const row = rows.get(agent.id) ?? {
      agent,
      additions: 0,
      commits: 0,
    };
    row.additions +=
      filters.scope === "code"
        ? commit.additions.code
        : commit.additions.allText;
    row.commits += 1;
    rows.set(agent.id, row);
  }

  const total = [...rows.values()].reduce(
    (sum, row) =>
      sum + (filters.metric === "additions" ? row.additions : row.commits),
    0,
  );

  return [...rows.values()]
    .map((row) => {
      const value =
        filters.metric === "additions" ? row.additions : row.commits;
      return {
        ...row,
        value,
        percentage: total === 0 ? 0 : (value / total) * 100,
      };
    })
    .sort(
      (left, right) =>
        right.value - left.value ||
        left.agent.label.localeCompare(right.agent.label),
    );
}
