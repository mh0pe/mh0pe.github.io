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
  readonly kind?: "model" | "platform" | "aggregate";
}

export interface AttributionModel extends Omit<AttributionAgent, "kind"> {
  readonly kind: "model" | "unrecorded" | "multiple";
  readonly sourceIds: readonly string[];
  readonly tone: string;
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
  readonly modelIds?: readonly string[];
  readonly platformIds?: readonly string[];
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
  readonly schemaVersion: 1 | 2;
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
    readonly modelSignalPolicy?: "recorded-models-with-platform-fallback";
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
    (value.schemaVersion !== 1 && value.schemaVersion !== 2) ||
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

  if (value.schemaVersion === 2) {
    const agents = new Map(
      value.agents.map((agent) => [
        typeof agent === "object" && agent !== null && "id" in agent
          ? agent.id
          : null,
        agent,
      ]),
    );
    const valid =
      value.agents.every(
        (agent) =>
          typeof agent === "object" &&
          agent !== null &&
          "kind" in agent &&
          ["model", "platform", "aggregate"].includes(String(agent.kind)),
      ) &&
      value.commits.every((commit) => {
        if (
          typeof commit !== "object" ||
          commit === null ||
          !("modelIds" in commit) ||
          !Array.isArray(commit.modelIds) ||
          !("platformIds" in commit) ||
          !Array.isArray(commit.platformIds)
        ) {
          return false;
        }
        return (
          commit.modelIds.every((id: unknown) => {
            const agent = agents.get(id);
            return (
              typeof agent === "object" &&
              agent !== null &&
              "kind" in agent &&
              agent.kind === "model"
            );
          }) &&
          commit.platformIds.every((id: unknown) => {
            const agent = agents.get(id);
            return (
              typeof agent === "object" &&
              agent !== null &&
              "kind" in agent &&
              agent.kind === "platform"
            );
          })
        );
      });
    if (!valid) {
      throw new Error("Model attribution data failed its identity check.");
    }
  }

  return value as AgentAttributionData;
}

export interface AttributionAgentSummary {
  readonly agent: AttributionModel;
  readonly additions: number;
  readonly commits: number;
  readonly value: number;
  readonly percentage: number;
}

export const UNRECORDED_MODEL_ID = "model-not-recorded";
export const MULTIPLE_MODELS_ID = "multiple-recorded-models";

const modelTones: Readonly<Record<string, string>> = {
  "claude-opus-4-8": "#bca8ff",
  "claude-opus-4-6": "#ff9b7d",
  "claude-sonnet-4-6": "#c9f36b",
  "claude-fable-5": "#ffd27a",
  [UNRECORDED_MODEL_ID]: "#8ea3aa",
  [MULTIPLE_MODELS_ID]: "#68e4ea",
};

export function modelTone(id: string): string {
  return modelTones[id] ?? "#68e4ea";
}

export function modelForAgent(agent: AttributionAgent): AttributionModel {
  const isModel =
    agent.kind === "model" ||
    (agent.kind === undefined &&
      agent.id !== "github-copilot" &&
      agent.id !== "openai-codex" &&
      agent.id !== "shared");
  if (isModel) {
    return {
      ...agent,
      kind: "model",
      sourceIds: [agent.id],
      tone: modelTone(agent.id),
    };
  }
  if (agent.kind === "aggregate" || agent.id === "shared") {
    return {
      id: MULTIPLE_MODELS_ID,
      label: "Multiple recorded models",
      provider: "Commit metadata",
      aliases: [],
      marker: "hexagon",
      kind: "multiple",
      sourceIds: [agent.id],
      tone: modelTone(MULTIPLE_MODELS_ID),
    };
  }
  return {
    id: UNRECORDED_MODEL_ID,
    label: "Model not recorded",
    provider: "Platform metadata only",
    aliases: [],
    marker: "circle",
    kind: "unrecorded",
    sourceIds: [agent.id],
    tone: modelTone(UNRECORDED_MODEL_ID),
  };
}

export function modelIdsForCommit(
  data: AgentAttributionData,
  commit: AttributionCommit,
): readonly string[] {
  if (commit.modelIds && commit.modelIds.length > 0) {
    return [...new Set(commit.modelIds)];
  }
  if (commit.platformIds && commit.platformIds.length > 0) {
    return [UNRECORDED_MODEL_ID];
  }
  const agent = data.agents.find((candidate) => candidate.id === commit.agentId);
  return agent ? [modelForAgent(agent).id] : [UNRECORDED_MODEL_ID];
}

export function attributionModels(
  data: AgentAttributionData,
): readonly AttributionModel[] {
  const catalog = new Map<string, AttributionModel>();
  for (const agent of data.agents) {
    const model = modelForAgent(agent);
    const current = catalog.get(model.id);
    catalog.set(
      model.id,
      current
        ? {
            ...current,
            sourceIds: [...new Set([...current.sourceIds, ...model.sourceIds])],
          }
        : model,
    );
  }
  const used = new Set(
    data.commits.flatMap((commit) => modelIdsForCommit(data, commit)),
  );
  return [...catalog.values()]
    .filter((model) => used.has(model.id))
    .sort((left, right) => {
      const leftFallback = left.kind === "model" ? 0 : 1;
      const rightFallback = right.kind === "model" ? 0 : 1;
      return leftFallback - rightFallback || left.label.localeCompare(right.label);
    });
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
): readonly AttributionModel[] {
  return attributionModels(data);
}

export function parseAttributionSearch(
  search: string,
  data: AgentAttributionData,
): AttributionFilters {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const repositories = attributionRepositories(data);
  const agentIds = attributionModels(data).map((agent) => agent.id);

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
    (commit) =>
      filters.agent === "all" ||
      modelIdsForCommit(data, commit).includes(filters.agent),
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
  const agents = new Map(
    attributionModels(data).map((agent) => [agent.id, agent]),
  );
  const rows = new Map<
    string,
    { agent: AttributionModel; additions: number; commits: number }
  >();

  for (const commit of filterAttributionCommits(data, filters)) {
    const modelIds = modelIdsForCommit(data, commit);
    const share = 1 / Math.max(1, modelIds.length);
    for (const modelId of modelIds) {
      const agent = agents.get(modelId);
      if (!agent) {
        continue;
      }

      const row = rows.get(agent.id) ?? {
        agent,
        additions: 0,
        commits: 0,
      };
      row.additions +=
        (filters.scope === "code"
          ? commit.additions.code
          : commit.additions.allText) * share;
      row.commits += share;
      rows.set(agent.id, row);
    }
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
