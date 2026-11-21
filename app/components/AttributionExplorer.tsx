"use client";

import {
  type CSSProperties,
  type ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  DEFAULT_ATTRIBUTION_FILTERS,
  aggregateAttribution,
  attributionAgents,
  attributionEvidence,
  attributionModels,
  attributionRepositories,
  filtersEqual,
  modelIdsForCommit,
  readAgentAttributionData,
  serializeAttributionSearch,
  type AttributionAgentSummary,
  type AttributionCommit,
  type AttributionFilters,
  type AttributionMetric,
  type AttributionScope,
  type AttributionSurface,
  type AgentAttributionData,
} from "./attribution-model";
import transport from "../data/attribution-transport.json";
import { loadAttributionArchive, parseArchiveSearch } from "../data/attribution-archive.mjs";
import BklitModelBar from "./v3/BklitModelBar";

export type {
  AgentAttributionData,
  AttributionAgent,
  AttributionAgentSummary,
  AttributionCommit,
  AttributionCommitSurface,
  AttributionFilters,
  AttributionMetric,
  AttributionPullRequestLink,
  AttributionScope,
  AttributionSurface,
} from "./attribution-model";

const integerFormatter = new Intl.NumberFormat("en-US");
const INLINE_COMMIT_EVIDENCE_LIMIT = 12;
const percentageFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const markerGlyphs: Readonly<Record<string, string>> = {
  circle: "●",
  diamond: "◆",
  hexagon: "⬢",
  shared: "✦",
  square: "■",
  star: "✦",
  triangle: "▲",
};
const initialData = { ...transport.catalog, schemaVersion: 2, commits: transport.defaultView.commits } as unknown as AgentAttributionData;
const initialModels = transport.models as unknown as ReturnType<typeof attributionModels>;

function associationOrigin(basis?: string) {
  switch (basis) {
    case "r":
      return {
        code: "r",
        label: "Commit marker",
        explanation: "The model is named in a recorded commit marker.",
      };
    case "h":
      return {
        code: "h",
        label: "Model-use history",
        explanation: "The model follows my stated awsmadi model-use history for the commit date.",
      };
    case "t":
      return {
        code: "t",
        label: "Tool record",
        explanation: "The commit record identifies a tool rather than a specific model.",
      };
    default:
      return undefined;
  }
}

function AssociationOrigin({
  origin,
}: {
  readonly origin: ReturnType<typeof associationOrigin>;
}) {
  return origin ? (
    <span data-association-basis={origin.code} title={origin.explanation}>
      {" · "}{origin.label}
    </span>
  ) : null;
}

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function AgentMarker({ marker }: { readonly marker: string }) {
  const glyph =
    markerGlyphs[marker.toLowerCase()] ??
    marker.trim().slice(0, 2).toLocaleUpperCase("en-US");

  return (
    <span
      className="attribution-agent-marker"
      data-marker={marker}
      aria-hidden="true"
    >
      {glyph}
    </span>
  );
}

function pullRequestLabel(url: string, number: number): string {
  try {
    const parsed = new URL(url);
    const [owner, repository, kind] = parsed.pathname
      .split("/")
      .filter(Boolean);
    if (
      parsed.hostname === "github.com" &&
      owner &&
      repository &&
      kind === "pull"
    ) {
      return `${owner}/${repository} #${number}`;
    }
  } catch {
    // URL validity is enforced by the artifact generator.
  }

  return `PR #${number}`;
}

function SegmentedControl<T extends string>({
  legend,
  value,
  options,
  onChange,
  controls,
  disabled,
}: {
  readonly legend: string;
  readonly value: T;
  readonly options: readonly { value: T; label: string }[];
  readonly onChange: (value: T) => void;
  readonly controls: string;
  readonly disabled: boolean;
}) {
  return (
    <fieldset className="attribution-segmented" disabled={disabled}>
      <legend>{legend}</legend>
      <div>
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            aria-pressed={value === option.value}
            aria-controls={controls}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function EvidenceItem({
  commit,
  modelLabel,
  scope,
  compact = false,
  basis,
}: {
  readonly commit: AttributionCommit;
  readonly modelLabel: string;
  readonly scope: AttributionScope;
  readonly compact?: boolean;
  readonly basis?: string;
}) {
  const additions =
    scope === "code" ? commit.additions.code : commit.additions.allText;
  const origin = associationOrigin(basis);
  const associationLabel = origin?.code === "t" ? "Tool association" : "Model association";
  const deliverySurface = commit.surfaces.includes("pr")
    ? "Change sent for review"
    : commit.surfaces.includes("fork-only")
      ? "public fork implementation"
      : "owned public repository";

  if (compact) {
    return (
      <div className="attribution-evidence-compact">
        <a href={commit.url} target="_blank" rel="noreferrer">
          <span>{commit.repository}</span>
          <span aria-hidden="true"> / </span>
          <code>{commit.sha.slice(0, 7)}</code>
          <span className="visually-hidden"> code change (opens in a new tab)</span>
          <Arrow />
        </a>
        <span>
          {associationLabel}: {modelLabel}<AssociationOrigin origin={origin} />
          {" · "}{integerFormatter.format(additions)}{" "}
          {scope === "code" ? "code" : "text"} additions ·{" "}
          <time dateTime={commit.date}>
            {dateFormatter.format(new Date(commit.date))}
          </time>
        </span>
        {commit.prLinks.map((pullRequest) => (
          <a
            href={pullRequest.url}
            target="_blank"
            rel="noreferrer"
            key={pullRequest.url}
          >
            {pullRequestLabel(pullRequest.url, pullRequest.number)}
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="attribution-evidence-item">
      <div className="attribution-evidence-heading">
        <p>
          <span>{commit.repository}</span>
          <span aria-hidden="true"> / </span>
          <code>{commit.sha.slice(0, 7)}</code>
        </p>
        <time dateTime={commit.date}>
          {dateFormatter.format(new Date(commit.date))}
        </time>
      </div>
      <p className="attribution-evidence-meta">
        {associationLabel}: {modelLabel}<AssociationOrigin origin={origin} />
        {" · "}{integerFormatter.format(additions)}{" "}
        {scope === "code" ? "code" : "text"} additions · {deliverySurface}
      </p>
      <div className="attribution-evidence-links">
        <a href={commit.url} target="_blank" rel="noreferrer">
          Open code change
          <span className="visually-hidden">
            {` in ${commit.repository}, ${commit.sha.slice(0, 7)} (opens in a new tab)`}
          </span>
          <Arrow />
        </a>
        {commit.prLinks.map((pullRequest) => (
          <a
            href={pullRequest.url}
            target="_blank"
            rel="noreferrer"
            key={pullRequest.url}
          >
            {pullRequestLabel(pullRequest.url, pullRequest.number)}
            <span className="visually-hidden"> (opens in a new tab)</span>
            <Arrow />
          </a>
        ))}
      </div>
    </div>
  );
}

function metricValue(
  row: AttributionAgentSummary,
  metric: AttributionMetric,
): string {
  return `${integerFormatter.format(row.value)} ${
    metric === "additions"
      ? "added lines"
      : row.value === 1
      ? "code change"
      : "code changes"
  }`;
}

function surfaceLabel(surface: AttributionSurface): string {
  if (surface === "pr") {
    return "changes sent for review";
  }
  if (surface === "fork-only") {
    return "independent public versions";
  }
  return "all public delivery surfaces";
}

function scopeLabel(scope: AttributionScope): string {
  return scope === "code" ? "code additions" : "all text additions";
}

function filterSummary(
  filters: AttributionFilters,
  commitCount: number,
  repositoryCount: number,
  modelLabel: string,
): string {
  const repositories =
    filters.repository === "all"
      ? `${integerFormatter.format(repositoryCount)} ${
          repositoryCount === 1 ? "project" : "projects"
        }`
      : filters.repository;

  return `${integerFormatter.format(commitCount)} ${
    commitCount === 1 ? "code change" : "code changes"
  } across ${repositories}; ${surfaceLabel(filters.surface)}; ${scopeLabel(
    filters.scope,
  )}; model focus: ${modelLabel}.`;
}

type AttributionExplorerProps = {
  sectionCode?: string;
};

export default function AttributionExplorer({
  sectionCode = "03 / Model composition",
}: AttributionExplorerProps = {}) {
  const [archive, setArchive] = useState<{ data: AgentAttributionData; basisBySha: Map<string, string> } | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "error" | "ready">("idle");
  const [retry, setRetry] = useState(0);
  const requestEpoch = useRef(0);
  const data = archive?.data ?? initialData;
  const [requestedFilters, setFilters] = useState<AttributionFilters>(
    DEFAULT_ATTRIBUTION_FILTERS,
  );
  const filters = archive ? requestedFilters : DEFAULT_ATTRIBUTION_FILTERS;
  const needsArchive = !filtersEqual(requestedFilters, DEFAULT_ATTRIBUTION_FILTERS);
  const urlReady = useRef(false);
  const [interactive, setInteractive] = useState(false);
  const recordRef = useRef<HTMLDetailsElement | null>(null);
  // This single explorer has the same identity across the framework-rendered
  // document and the independently hydrated Pages export.
  const chartId = "agent-collaboration-chart";
  const evidenceId = "agent-collaboration-evidence";
  const summaryId = "agent-collaboration-summary";
  const repositoryId = "agent-collaboration-repository";
  const agentId = "agent-collaboration-model";

  const repositories = useMemo(() => archive ? attributionRepositories(data) : transport.repositories, [archive, data]);
  const selectableAgents = useMemo(() => archive ? attributionAgents(data) : initialModels, [archive, data]);
  const rows = useMemo(
    () => archive ? aggregateAttribution(data, filters).filter((row) => row.value > 0) : transport.defaultView.rows as unknown as AttributionAgentSummary[],
    [archive, data, filters],
  );
  const evidence = useMemo(
    () => archive ? attributionEvidence(data, filters) : initialData.commits,
    [archive, data, filters],
  );
  const agents = useMemo(
    () => new Map(selectableAgents.map((agent) => [agent.id, agent])),
    [selectableAgents],
  );
  const visibleCommits = useMemo(
    () =>
      evidence.filter(
        (commit) =>
          filters.agent === "all" ||
          modelIdsForCommit(data, commit).includes(filters.agent),
      ),
    [data, evidence, filters.agent],
  );
  const repositoryCount = useMemo(
    () => archive ? new Set(evidence.flatMap((commit) => commit.repositories)).size : transport.defaultView.repositoryCount,
    [archive, evidence],
  );
  const focusedAgentLabel =
    filters.agent === "all"
      ? "all models"
      : (agents.get(filters.agent)?.label ?? filters.agent);
  const summary = filterSummary(
    filters,
    archive ? visibleCommits.length : transport.defaultView.evidenceCount,
    repositoryCount,
    focusedAgentLabel,
  );

  useEffect(() => {
    if (!needsArchive || archive) return;
    const controller = new AbortController();
    const epoch = ++requestEpoch.current;
    loadAttributionArchive(transport, { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted || epoch !== requestEpoch.current) return;
      setArchive({ data: readAgentAttributionData(result.data), basisBySha: result.basisBySha });
      setLoadState("ready");
    }).catch(() => {
      if (!controller.signal.aborted && epoch === requestEpoch.current) setLoadState("error");
    });
    return () => { controller.abort(); requestEpoch.current += 1; };
  }, [needsArchive, archive, retry]);

  useEffect(() => {
    let active = true;
    const readLocation = () => {
      setLoadState("idle");
      setRetry(value => value + 1);
      const nextFilters = parseArchiveSearch(window.location.search, transport) as AttributionFilters;
      const search = serializeAttributionSearch(nextFilters);
      const nextUrl = `${window.location.pathname}${search}${window.location.hash}`;
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

      if (nextUrl !== currentUrl) {
        window.history.replaceState(window.history.state, "", nextUrl);
      }

      if (
        !filtersEqual(nextFilters, DEFAULT_ATTRIBUTION_FILTERS) &&
        recordRef.current
      ) {
        recordRef.current.open = true;
      }

      setFilters((current) =>
        filtersEqual(current, nextFilters) ? current : nextFilters,
      );
    };

    queueMicrotask(() => {
      if (!active) {
        return;
      }
      urlReady.current = true;
      readLocation();
      setInteractive(true);
    });
    window.addEventListener("popstate", readLocation);
    return () => {
      active = false;
      window.removeEventListener("popstate", readLocation);
    };
  }, []);

  useEffect(() => {
    if (!urlReady.current) {
      return;
    }

    const search = serializeAttributionSearch(requestedFilters);
    const nextUrl = `${window.location.pathname}${search}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [requestedFilters]);

  function updateFilter<Key extends keyof AttributionFilters>(
    key: Key,
    value: AttributionFilters[Key],
  ) {
    if (loadState === "error") { setLoadState("idle"); setRetry(current => current + 1); }
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleRepositoryChange(event: ChangeEvent<HTMLSelectElement>) {
    updateFilter("repository", event.currentTarget.value);
  }

  function handleAgentChange(event: ChangeEvent<HTMLSelectElement>) {
    updateFilter("agent", event.currentTarget.value);
  }

  function focusAgent(nextAgentId: string) {
    updateFilter("agent", requestedFilters.agent === nextAgentId ? "all" : nextAgentId);
  }

  const hasActiveFilters = needsArchive;
  const representativeEvidence = visibleCommits.slice(0, 3);
  const remainingEvidence = visibleCommits.slice(representativeEvidence.length);
  const inlineCommitEvidence = remainingEvidence.slice(
    0,
    INLINE_COMMIT_EVIDENCE_LIMIT,
  );
  const selectedMetricTotal = rows.reduce((total, row) => total + row.value, 0);
  const additionalEvidenceCount = archive ? remainingEvidence.length : Math.max(0, transport.defaultView.evidenceCount - representativeEvidence.length);
  function basisFor(commit: AttributionCommit) {
    if (archive) return archive.basisBySha.get(commit.sha);
    const index = transport.defaultView.commits.findIndex(row => row.sha === commit.sha);
    return index < 0 ? undefined : transport.defaultView.basis[index];
  }

  return (
    <section
      className="section attribution-section"
      id="agent-collaboration"
      data-attribution-generation={transport.canonicalSha256}
      aria-labelledby="agent-collaboration-title"
      data-constellation-cluster="agents"
    >
      <div className="shell">
        <div className="section-heading attribution-heading">
          <p className="section-code">{sectionCode}</p>
          <div>
            <h2 id="agent-collaboration-title">
              Where model collaboration appears in the work.
            </h2>
            <p>
              Explore selected public changes by project and model, then follow
              the links to the work.
            </p>
            <p>
              Model associations use recorded commit markers or are inferred
              from my stated model-use history. Line counts show change volume,
              not individual model output or project impact.
            </p>
          </div>
        </div>

        <details className="attribution-record" ref={recordRef} open>
          <summary className="attribution-record-summary">
            <span>Explore model collaboration</span>
            <span aria-hidden="true">Filters · code changes · public work</span>
          </summary>
          <div className="attribution-record-body">
            <div className="attribution-workspace">
              <p className="attribution-readiness">
                {interactive
                  ? "Choose a project or model to explore its part in the work."
                  : "The full view is shown below. Filters require interactive controls to load."}
              </p>
              {needsArchive && !archive ? (
                <div role="status" aria-live="polite" aria-atomic="true">
                  <p>{loadState === "error"
                    ? "The selected view could not load. The complete default view is still shown below."
                    : "Loading the full history for your selection. The complete default view is still shown below."}</p>
                  {loadState === "error" ? <button type="button" onClick={() => { setLoadState("idle"); setRetry(value => value + 1); }}>Retry selected view</button> : null}
                </div>
              ) : null}
              <form
                className="attribution-filters"
                aria-label="Filter model collaboration"
                onSubmit={(event) => event.preventDefault()}
              >
                <div className="attribution-select">
                  <label htmlFor={repositoryId}>Project</label>
                  <select
                    id={repositoryId}
                    disabled={!interactive}
                    value={requestedFilters.repository}
                    onChange={handleRepositoryChange}
                    aria-controls={`${chartId} ${evidenceId}`}
                  >
                    <option value="all">All projects</option>
                    {repositories.map((repository) => (
                      <option value={repository} key={repository}>
                        {repository}
                      </option>
                    ))}
                  </select>
                </div>

                <SegmentedControl<AttributionSurface>
                  disabled={!interactive}
                  legend="Work type"
                  value={requestedFilters.surface}
                  onChange={(surface) => updateFilter("surface", surface)}
                  controls={`${chartId} ${evidenceId}`}
                  options={[
                    { value: "all", label: "All public" },
                    { value: "pr", label: "Changes sent for review" },
                    { value: "fork-only", label: "Independent public versions" },
                  ]}
                />

                <SegmentedControl<AttributionScope>
                  disabled={!interactive}
                  legend="What to measure"
                  value={requestedFilters.scope}
                  onChange={(scope) => updateFilter("scope", scope)}
                  controls={`${chartId} ${evidenceId}`}
                  options={[
                    { value: "code", label: "Code" },
                    { value: "all-text", label: "Code and documentation" },
                  ]}
                />

                <SegmentedControl<AttributionMetric>
                  disabled={!interactive}
                  legend="Count by"
                  value={requestedFilters.metric}
                  onChange={(metric) => updateFilter("metric", metric)}
                  controls={chartId}
                  options={[
                    { value: "additions", label: "Lines added" },
                    { value: "commits", label: "Code changes" },
                  ]}
                />

                <div className="attribution-select">
                  <label htmlFor={agentId}>Model</label>
                  <select
                    id={agentId}
                    disabled={!interactive}
                    value={requestedFilters.agent}
                    onChange={handleAgentChange}
                    aria-controls={evidenceId}
                  >
                    <option value="all">All models</option>
                    {selectableAgents.map((agent) => (
                      <option value={agent.id} key={agent.id}>
                        {agent.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className="attribution-clear"
                  type="button"
                  onClick={() => { setLoadState("idle"); setFilters(DEFAULT_ATTRIBUTION_FILTERS); }}
                  disabled={!interactive || !hasActiveFilters}
                >
                  Clear filters
                </button>
              </form>

              <div
                className="attribution-chart"
                id={chartId}
              >
                <div className="attribution-chart-heading">
                  <div>
                    <p className="attribution-kicker">Model mix</p>
                    <h3>
                      {filters.metric === "additions"
                        ? "Lines added with model associations"
                        : "Code changes with model associations"}
                    </h3>
                  </div>
                  <p>
                    Select a model to focus the linked evidence. The
                    distribution remains visible for comparison.
                  </p>
                </div>

                {rows.length > 0 ? (
                  <ol className="attribution-traces">
                    {rows.map((row) => {
                      const isSelected = filters.agent === row.agent.id;
                      const descriptionId = `${chartId}-${row.agent.id}-description`;
                      const traceStyle = {
                        "--agent-accent": row.agent.tone,
                      } as CSSProperties;

                      return (
                        <li
                          key={row.agent.id}
                          data-marker={row.agent.marker}
                          data-model-id={row.agent.id}
                        >
                          <button
                            type="button"
                            className={`attribution-trace${
                              isSelected ? " is-selected" : ""
                            }`}
                            disabled={!interactive}
                            style={traceStyle}
                            aria-pressed={isSelected}
                            aria-controls={evidenceId}
                            onClick={() => focusAgent(row.agent.id)}
                            aria-describedby={descriptionId}
                          >
                            <span id={descriptionId} hidden>
                              {`${
                                isSelected
                                  ? `Clear ${row.agent.label} evidence focus`
                                  : `Focus evidence on ${row.agent.label}`
                              }: ${metricValue(
                                row,
                                filters.metric,
                              )}, ${percentageFormatter.format(
                                row.percentage,
                              )} percent of the current result`}
                            </span>
                            <span className="attribution-trace-label">
                              <AgentMarker marker={row.agent.marker} />
                              <strong>{row.agent.label}</strong>
                              {isSelected ? (
                                <span className="attribution-trace-selection">
                                  Selected
                                </span>
                              ) : null}
                            </span>
                            <span
                              className="attribution-trace-track"
                              aria-hidden="true"
                            >
                              <BklitModelBar
                                percentage={row.percentage}
                                selected={isSelected}
                              />
                            </span>
                            <span className="attribution-trace-value">
                              <strong>
                                {integerFormatter.format(row.value)}
                              </strong>
                              <span>
                                {percentageFormatter.format(row.percentage)}%
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="attribution-empty">
                    No code changes match these filters. Clear or adjust a filter
                    to continue exploring.
                  </p>
                )}
              </div>
            </div>

            <div className="attribution-overview">
              <details className="attribution-method">
                <summary>How this view works</summary>
                <div className="attribution-method__body">
                  <p>{data.methodology.metricLabel}.</p>
                  <ul>
                  {data.methodology.modelSignalPolicy ===
                  "recorded-models-with-awsmadi-date-default" ? (
                    <li>
                      Explicit model markers take precedence. When none is
                      present, this portfolio assigns awsmadi commits to the
                      newest public Claude Opus model available on the authored date.
                    </li>
                  ) : null}
                  <li>
                    {data.methodology.globalShaDeduplication
                      ? "The same commit shared by a fork and its upstream project counts once."
                      : "Each recorded commit occurrence is counted."}
                  </li>
                  <li>
                    {data.methodology.mergeCommitsExcluded
                      ? "Merge commits are excluded."
                      : "Merge commits are included."}
                  </li>
                  <li>
                    Multi-model commits preserve every associated model and share
                    visual weight so each commit still counts once.
                  </li>
                  <li>
                    The Code view excludes documentation, lockfiles, generated
                    output, and binaries; executable agent instructions count as
                    code.
                  </li>
                  </ul>
                  <details className="attribution-identity-disclosure">
                    <summary>Model attribution mapping</summary>
                    <dl>
                      {selectableAgents.map((model) => (
                        <div key={model.id}>
                          <dt>{model.label}</dt>
                          <dd>{model.provider}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </div>
              </details>
              <div className="attribution-current">
                <p className="attribution-kicker">Current view</p>
                <p
                  id={summaryId}
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {summary}
                </p>
              </div>
            </div>

            <div className="attribution-evidence" id={evidenceId}>
              <div className="attribution-evidence-intro">
                <div>
                  <p className="attribution-kicker">Linked work</p>
                  <h3>
                    {filters.agent === "all"
                      ? "Linked code changes"
                      : `${focusedAgentLabel} code changes`}
                  </h3>
                </div>
                <p>
                  Ranked by the selected measure, with direct links to the code
                  and review history.
                </p>
              </div>

              {representativeEvidence.length > 0 ? (
                <ol className="attribution-evidence-featured">
                  {representativeEvidence.map((commit) => (
                    <li key={commit.sha}>
                      <EvidenceItem
                        commit={commit}
                        basis={basisFor(commit)}
                        modelLabel={modelIdsForCommit(data, commit)
                          .map((id) => agents.get(id)?.label ?? id)
                          .join(" + ")}
                        scope={filters.scope}
                      />
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="attribution-empty">
                  No linked code changes match the current focus. Select another
                  model or clear the filters.
                </p>
              )}

              {remainingEvidence.length > 0 ? (
                <details className="attribution-evidence-disclosure">
                  <summary>
                    Inspect {integerFormatter.format(inlineCommitEvidence.length)}{" "}
                    additional linked{" "}
                    {inlineCommitEvidence.length === 1 ? "code change" : "code changes"}
                  </summary>
                  <p className="attribution-evidence-limit">
                    Showing a bounded sample from {integerFormatter.format(
                    additionalEvidenceCount,
                    )} additional matches. The chart includes every change in
                    this view; filters recalculate this list.
                  </p>
                  <ol>
                    {inlineCommitEvidence.map((commit) => (
                      <li key={commit.sha}>
                        <EvidenceItem
                          commit={commit}
                          basis={basisFor(commit)}
                          modelLabel={modelIdsForCommit(data, commit)
                            .map((id) => agents.get(id)?.label ?? id)
                            .join(" + ")}
                          scope={filters.scope}
                          compact
                        />
                      </li>
                    ))}
                  </ol>
                </details>
              ) : null}

              {rows.length > 0 ? (
                <details className="attribution-table-disclosure">
                  <summary>View exact values</summary>
                  <div
                    className="attribution-table-wrap"
                    role="region"
                    aria-label="Scrollable exact distribution values"
                    tabIndex={0}
                  >
                    <table className="attribution-table">
                      <caption>
                        Exact model-attribution values for the current
                        project, work type, and selected measure.
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Model</th>
                          <th scope="col">
                            {filters.scope === "code"
                              ? "Code additions"
                              : "All-text additions"}
                          </th>
                          <th scope="col">Code changes</th>
                          <th scope="col">
                            Share of{" "}
                            {filters.metric === "additions"
                              ? "added lines"
                              : "code changes"}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.agent.id} data-marker={row.agent.marker}>
                            <th scope="row">
                              <AgentMarker marker={row.agent.marker} />
                              {row.agent.label}
                            </th>
                            <td>{integerFormatter.format(row.additions)}</td>
                            <td>{integerFormatter.format(row.commits)}</td>
                            <td>
                              {percentageFormatter.format(row.percentage)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th scope="row">Current total</th>
                          <td>
                            {integerFormatter.format(
                              rows.reduce(
                                (total, row) => total + row.additions,
                                0,
                              ),
                            )}
                          </td>
                          <td>
                            {integerFormatter.format(
                              rows.reduce(
                                (total, row) => total + row.commits,
                                0,
                              ),
                            )}
                          </td>
                          <td>{selectedMetricTotal > 0 ? "100%" : "0%"}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </details>
              ) : null}
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}
