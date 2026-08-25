"use client";

import {
  type CSSProperties,
  type ChangeEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  DEFAULT_ATTRIBUTION_FILTERS,
  aggregateAttribution,
  attributionAgents,
  attributionEvidence,
  attributionRepositories,
  filtersEqual,
  parseAttributionSearch,
  readAgentAttributionData,
  serializeAttributionSearch,
  type AttributionAgentSummary,
  type AttributionCommit,
  type AttributionFilters,
  type AttributionMetric,
  type AttributionScope,
  type AttributionSurface,
} from "./attribution-model";
import agentAttribution from "../data/agent-attribution.json";

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
const agentAttributionData = readAgentAttributionData(agentAttribution);

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
}: {
  readonly legend: string;
  readonly value: T;
  readonly options: readonly { value: T; label: string }[];
  readonly onChange: (value: T) => void;
  readonly controls: string;
}) {
  return (
    <fieldset className="attribution-segmented">
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

function EvidenceItem({
  commit,
  agentLabel,
  scope,
  compact = false,
}: {
  readonly commit: AttributionCommit;
  readonly agentLabel: string;
  readonly scope: AttributionScope;
  readonly compact?: boolean;
}) {
  const additions =
    scope === "code" ? commit.additions.code : commit.additions.allText;
  const deliverySurface = commit.surfaces.includes("pr")
    ? "PR work"
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
          <span className="visually-hidden"> commit (opens in a new tab)</span>
          <Arrow />
        </a>
        <span>
          {agentLabel} · {integerFormatter.format(additions)}{" "}
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
        {agentLabel} · {integerFormatter.format(additions)}{" "}
        {scope === "code" ? "code" : "text"} additions · {deliverySurface}
      </p>
      <div className="attribution-evidence-links">
        <a href={commit.url} target="_blank" rel="noreferrer">
          View commit
          <span className="visually-hidden"> (opens in a new tab)</span>
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
        ? "commit"
        : "commits"
  }`;
}

function surfaceLabel(surface: AttributionSurface): string {
  if (surface === "pr") {
    return "PR work";
  }
  if (surface === "fork-only") {
    return "public fork implementations";
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
  agentLabel: string,
): string {
  const repositories =
    filters.repository === "all"
      ? `${integerFormatter.format(repositoryCount)} ${
          repositoryCount === 1 ? "repository" : "repositories"
        }`
      : filters.repository;

  return `${integerFormatter.format(commitCount)} AI-associated ${
    commitCount === 1 ? "commit" : "commits"
  } across ${repositories}; ${surfaceLabel(filters.surface)}; ${scopeLabel(
    filters.scope,
  )}; evidence focus: ${agentLabel}.`;
}

export default function AttributionExplorer() {
  const data = agentAttributionData;
  const [filters, setFilters] = useState<AttributionFilters>(
    DEFAULT_ATTRIBUTION_FILTERS,
  );
  const [evidenceLoaded, setEvidenceLoaded] = useState(false);
  const urlReady = useRef(false);
  const recordRef = useRef<HTMLDetailsElement | null>(null);
  const chartId = useId();
  const evidenceId = useId();
  const summaryId = useId();
  const repositoryId = useId();
  const agentId = useId();

  const repositories = useMemo(() => attributionRepositories(data), [data]);
  const selectableAgents = useMemo(() => attributionAgents(data), [data]);
  const rows = useMemo(
    () => aggregateAttribution(data, filters),
    [data, filters],
  );
  const evidence = useMemo(
    () => attributionEvidence(data, filters),
    [data, filters],
  );
  const agents = useMemo(
    () => new Map(data.agents.map((agent) => [agent.id, agent])),
    [data],
  );
  const visibleCommits = useMemo(
    () =>
      evidence.filter(
        (commit) => filters.agent === "all" || commit.agentId === filters.agent,
      ),
    [evidence, filters.agent],
  );
  const repositoryCount = useMemo(
    () => new Set(evidence.flatMap((commit) => commit.repositories)).size,
    [evidence],
  );
  const focusedAgentLabel =
    filters.agent === "all"
      ? "all agents"
      : (agents.get(filters.agent)?.label ?? filters.agent);
  const summary = filterSummary(
    filters,
    visibleCommits.length,
    repositoryCount,
    focusedAgentLabel,
  );

  useEffect(() => {
    let active = true;
    const readLocation = () => {
      const nextFilters = parseAttributionSearch(window.location.search, data);
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
    });
    window.addEventListener("popstate", readLocation);
    return () => {
      active = false;
      window.removeEventListener("popstate", readLocation);
    };
  }, [data]);

  useEffect(() => {
    if (!urlReady.current) {
      return;
    }

    const search = serializeAttributionSearch(filters);
    const nextUrl = `${window.location.pathname}${search}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [filters]);

  function updateFilter<Key extends keyof AttributionFilters>(
    key: Key,
    value: AttributionFilters[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleRepositoryChange(event: ChangeEvent<HTMLSelectElement>) {
    updateFilter("repository", event.currentTarget.value);
  }

  function handleAgentChange(event: ChangeEvent<HTMLSelectElement>) {
    updateFilter("agent", event.currentTarget.value);
  }

  function focusAgent(nextAgentId: string) {
    updateFilter("agent", filters.agent === nextAgentId ? "all" : nextAgentId);
  }

  const hasActiveFilters = !filtersEqual(filters, DEFAULT_ATTRIBUTION_FILTERS);
  const representativeEvidence = visibleCommits.slice(0, 3);
  const remainingEvidence = visibleCommits.slice(representativeEvidence.length);
  const selectedMetricTotal = rows.reduce((total, row) => total + row.value, 0);

  return (
    <section
      className="section attribution-section"
      id="agent-collaboration"
      aria-labelledby="agent-collaboration-title"
      data-constellation-cluster="agents"
    >
      <div className="shell">
        <div className="section-heading attribution-heading">
          <p className="section-code">03 / The public record</p>
          <div>
            <h2 id="agent-collaboration-title">
              The work carries its own provenance.
            </h2>
            <p>
              The constellation is the story. Open the record to filter public
              commits and inspect how GitHub preserves human authorship
              alongside recorded agent signals.
            </p>
          </div>
        </div>

        <details className="attribution-record" ref={recordRef}>
          <summary className="attribution-record-summary">
            <span>Explore the public record</span>
            <span aria-hidden="true">Filters · commits · exact values</span>
          </summary>
          <div className="attribution-record-body">
            <div className="attribution-overview">
              <div className="attribution-method">
                <p className="attribution-kicker">Measurement</p>
                <p>GitHub-reported added lines in AI-associated commits.</p>
                <ul>
                  <li>
                    {data.methodology.globalShaDeduplication
                      ? "Shared fork and upstream SHAs count once."
                      : "Each recorded commit occurrence is counted."}
                  </li>
                  <li>
                    {data.methodology.mergeCommitsExcluded
                      ? "Merge commits are excluded."
                      : "Merge commits are included."}
                  </li>
                  <li>
                    Multi-agent commits use a shared bucket rather than an
                    invented split.
                  </li>
                  <li>
                    The Code view excludes documentation, lockfiles, generated
                    output, and binaries; executable agent instructions count as
                    code.
                  </li>
                </ul>
                <details className="attribution-identity-disclosure">
                  <summary>Recorded identity mapping</summary>
                  <dl>
                    {data.agents.map((agent) => (
                      <div key={agent.id}>
                        <dt>{agent.label}</dt>
                        <dd>
                          {agent.aliases.length > 0
                            ? agent.aliases.join(", ")
                            : "No additional aliases"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
              </div>
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
                <p className="attribution-snapshot">
                  Public GitHub snapshot ·{" "}
                  <time dateTime={data.snapshot.generatedAt}>
                    {dateFormatter.format(new Date(data.snapshot.generatedAt))}
                  </time>
                </p>
              </div>
            </div>

            <div className="attribution-workspace">
              <form
                className="attribution-filters"
                aria-label="Filter agent collaboration evidence"
                onSubmit={(event) => event.preventDefault()}
              >
                <div className="attribution-select">
                  <label htmlFor={repositoryId}>Repository</label>
                  <select
                    id={repositoryId}
                    value={filters.repository}
                    onChange={handleRepositoryChange}
                    aria-controls={`${chartId} ${evidenceId}`}
                  >
                    <option value="all">All repositories</option>
                    {repositories.map((repository) => (
                      <option value={repository} key={repository}>
                        {repository}
                      </option>
                    ))}
                  </select>
                </div>

                <SegmentedControl<AttributionSurface>
                  legend="Delivery surface"
                  value={filters.surface}
                  onChange={(surface) => updateFilter("surface", surface)}
                  controls={`${chartId} ${evidenceId}`}
                  options={[
                    { value: "all", label: "All public" },
                    { value: "pr", label: "PR work" },
                    { value: "fork-only", label: "Public forks" },
                  ]}
                />

                <SegmentedControl<AttributionScope>
                  legend="Content scope"
                  value={filters.scope}
                  onChange={(scope) => updateFilter("scope", scope)}
                  controls={`${chartId} ${evidenceId}`}
                  options={[
                    { value: "code", label: "Code" },
                    { value: "all-text", label: "All text" },
                  ]}
                />

                <SegmentedControl<AttributionMetric>
                  legend="Metric"
                  value={filters.metric}
                  onChange={(metric) => updateFilter("metric", metric)}
                  controls={chartId}
                  options={[
                    { value: "additions", label: "Added lines" },
                    { value: "commits", label: "Commits" },
                  ]}
                />

                <div className="attribution-select">
                  <label htmlFor={agentId}>Evidence focus</label>
                  <select
                    id={agentId}
                    value={filters.agent}
                    onChange={handleAgentChange}
                    aria-controls={evidenceId}
                  >
                    <option value="all">All agents</option>
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
                  onClick={() => setFilters(DEFAULT_ATTRIBUTION_FILTERS)}
                  disabled={!hasActiveFilters}
                >
                  Clear filters
                </button>
              </form>

              <div
                className="attribution-chart"
                id={chartId}
                aria-labelledby="agent-collaboration-title"
              >
                <div className="attribution-chart-heading">
                  <div>
                    <p className="attribution-kicker">Distribution</p>
                    <h3>
                      {filters.metric === "additions"
                        ? "GitHub-reported added lines"
                        : "AI-associated commits"}
                    </h3>
                  </div>
                  <p>
                    Select an agent to focus the linked evidence. The
                    distribution remains visible for comparison.
                  </p>
                </div>

                {rows.length > 0 ? (
                  <ol className="attribution-traces">
                    {rows.map((row) => {
                      const isSelected = filters.agent === row.agent.id;
                      const traceScale = Math.max(
                        0,
                        Math.min(1, row.percentage / 100),
                      );
                      const traceStyle = {
                        "--attribution-trace-scale": traceScale,
                      } as CSSProperties;

                      return (
                        <li key={row.agent.id} data-marker={row.agent.marker}>
                          <button
                            type="button"
                            className={`attribution-trace${
                              isSelected ? " is-selected" : ""
                            }`}
                            style={traceStyle}
                            aria-pressed={isSelected}
                            aria-controls={evidenceId}
                            onClick={() => focusAgent(row.agent.id)}
                            aria-label={`${
                              isSelected
                                ? `Clear ${row.agent.label} evidence focus`
                                : `Focus evidence on ${row.agent.label}`
                            }: ${metricValue(
                              row,
                              filters.metric,
                            )}, ${percentageFormatter.format(
                              row.percentage,
                            )} percent of the current result`}
                          >
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
                              <span className="attribution-trace-fill" />
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
                    No measured AI-associated commits match this view. Clear or
                    adjust a filter to continue exploring.
                  </p>
                )}
              </div>
            </div>

            <div className="attribution-evidence" id={evidenceId}>
              <div className="attribution-evidence-intro">
                <div>
                  <p className="attribution-kicker">Linked evidence</p>
                  <h3>
                    {filters.agent === "all"
                      ? "Representative public commits"
                      : `${focusedAgentLabel} evidence`}
                  </h3>
                </div>
                <p>
                  Ranked by the current metric, with commit and pull-request
                  links for verification.
                </p>
              </div>

              {representativeEvidence.length > 0 ? (
                <ol className="attribution-evidence-featured">
                  {representativeEvidence.map((commit) => (
                    <li key={commit.sha}>
                      <EvidenceItem
                        commit={commit}
                        agentLabel={
                          agents.get(commit.agentId)?.label ?? commit.agentId
                        }
                        scope={filters.scope}
                      />
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="attribution-empty">
                  No linked commit evidence matches the current evidence focus.
                  Select another agent or clear the filters.
                </p>
              )}

              {remainingEvidence.length > 0 ? (
                <details
                  className="attribution-evidence-disclosure"
                  onToggle={(event) => {
                    if (event.currentTarget.open) {
                      setEvidenceLoaded(true);
                    }
                  }}
                >
                  <summary>
                    View {integerFormatter.format(remainingEvidence.length)}{" "}
                    more linked{" "}
                    {remainingEvidence.length === 1 ? "commit" : "commits"}
                  </summary>
                  {evidenceLoaded ? (
                    <ol>
                      {remainingEvidence.map((commit) => (
                        <li key={commit.sha}>
                          <EvidenceItem
                            commit={commit}
                            agentLabel={
                              agents.get(commit.agentId)?.label ??
                              commit.agentId
                            }
                            scope={filters.scope}
                            compact
                          />
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </details>
              ) : null}

              {rows.length > 0 ? (
                <details className="attribution-table-disclosure">
                  <summary>View exact distribution values</summary>
                  <div
                    className="attribution-table-wrap"
                    role="region"
                    aria-label="Scrollable exact distribution values"
                    tabIndex={0}
                  >
                    <table className="attribution-table">
                      <caption>
                        Exact agent collaboration values for the current
                        repository, delivery surface, and content scope.
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Agent</th>
                          <th scope="col">
                            {filters.scope === "code"
                              ? "Code additions"
                              : "All-text additions"}
                          </th>
                          <th scope="col">Commits</th>
                          <th scope="col">
                            Share of{" "}
                            {filters.metric === "additions"
                              ? "added lines"
                              : "commits"}
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
