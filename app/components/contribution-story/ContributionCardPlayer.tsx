"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { getContributionGraph } from "./graph-loaders";
import { publishPortfolioLineageFocus } from "./lineage-focus";
import {
  createContributionPlayerItems,
  filterContributionPlayerItems,
  type ContributionPlayerEntityKind,
  type ContributionPlayerFilter,
} from "./player";
import { getContributionPlayerRecords } from "./player-record-loaders";
import {
  CONTRIBUTION_PLAYBACK_MIN_VISIBLE_RATIO,
  contributionPlaybackDelay,
  isContributionPlaybackVisible,
} from "./contribution-playback";
import type { ContributionStoryProject } from "./types";

const filters: readonly {
  readonly id: ContributionPlayerFilter;
  readonly label: string;
  readonly displayLabel?: string;
}[] = [
  { id: "all", label: "All" },
  { id: "repositories", label: "Repositories", displayLabel: "Repos" },
  { id: "changes", label: "Changes" },
  { id: "commits", label: "Commits" },
  { id: "files", label: "Files" },
];

const lineageStages: readonly Exclude<
  ContributionPlayerFilter,
  "all"
>[] = ["repositories", "changes", "commits", "files"];

function entityLabel(kind: ContributionPlayerEntityKind) {
  switch (kind) {
    case "repository":
      return "Repository";
    case "pull-request":
      return "Pull request";
    case "direct-change":
      return "Direct change";
    case "commit":
      return "Commit";
    case "file":
      return "File";
  }
}

function lineageDepth(kind: ContributionPlayerEntityKind) {
  switch (kind) {
    case "repository":
      return 0;
    case "pull-request":
    case "direct-change":
      return 1;
    case "commit":
      return 2;
    case "file":
      return 3;
  }
}

function compactDate(value: string | null) {
  if (!value) {
    return "Public source";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return "Public source";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function ContributionCardPlayer({
  project,
}: {
  readonly project: ContributionStoryProject;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const entryPendingRef = useRef(true);
  const reduceMotion = useReducedMotion() === true;
  const graph = getContributionGraph(project.graphId);
  const records = getContributionPlayerRecords(project.graphId);
  const allItems = useMemo(
    () => createContributionPlayerItems(graph, records),
    [graph, records],
  );
  const [filter, setFilter] = useState<ContributionPlayerFilter>("all");
  const filteredItems = useMemo(
    () => filterContributionPlayerItems(allItems, filter),
    [allItems, filter],
  );
  const filterCounts = useMemo(() => {
    const counts: Record<ContributionPlayerFilter, number> = {
      all: allItems.length,
      repositories: 0,
      changes: 0,
      commits: 0,
      files: 0,
    };
    for (const item of allItems) {
      if (item.kind === "repository") {
        counts.repositories += 1;
      } else if (
        item.kind === "pull-request" ||
        item.kind === "direct-change"
      ) {
        counts.changes += 1;
      } else if (item.kind === "commit") {
        counts.commits += 1;
      } else {
        counts.files += 1;
      }
    }
    return counts;
  }, [allItems]);
  const [activeItemId, setActiveItemId] = useState(allItems[0]?.id ?? "");
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const effectivePlaying = playing && !reduceMotion;
  const activeIndex = Math.max(
    0,
    filteredItems.findIndex((item) => item.id === activeItemId),
  );
  const activeItem = filteredItems[activeIndex] ?? filteredItems[0] ?? null;
  const progress =
    filteredItems.length <= 1
      ? 100
      : (activeIndex / (filteredItems.length - 1)) * 100;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextVisible = isContributionPlaybackVisible(entry);
        if (!nextVisible) {
          entryPendingRef.current = true;
        }
        setVisible(nextVisible);
      },
      {
        threshold: [0, CONTRIBUTION_PLAYBACK_MIN_VISIBLE_RATIO],
      },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const update = () => setDocumentVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (
      !effectivePlaying ||
      !visible ||
      reduceMotion ||
      filteredItems.length < 2 ||
      !documentVisible
    ) {
      return;
    }
    const delay = contributionPlaybackDelay(entryPendingRef.current);
    const timer = window.setTimeout(() => {
      entryPendingRef.current = false;
      const nextIndex = (activeIndex + 1) % filteredItems.length;
      setActiveItemId(filteredItems[nextIndex]?.id ?? "");
    }, delay);
    return () => window.clearTimeout(timer);
  }, [
    activeIndex,
    documentVisible,
    effectivePlaying,
    filteredItems,
    reduceMotion,
    visible,
  ]);

  useEffect(() => {
    if (!activeItem || !visible) {
      return;
    }
    publishPortfolioLineageFocus({
      chapterId: project.clusterId,
      projectId: project.id,
      graphId: project.graphId,
      evidenceId: activeItem.evidenceId,
      repository: activeItem.repository,
      commitId: activeItem.commitId,
      fileId: activeItem.fileId,
      nodeId: activeItem.nodeId,
      nodeType: activeItem.nodeType,
      source: "card-player",
    });
  }, [activeItem, project, visible]);

  if (!activeItem) {
    return null;
  }

  const activeLineageDepth = lineageDepth(activeItem.kind);
  const lineageProgress =
    (activeLineageDepth / (lineageStages.length - 1)) * 100;

  const move = (direction: -1 | 1) => {
    setPlaying(false);
    const nextIndex =
      (activeIndex + direction + filteredItems.length) % filteredItems.length;
    setActiveItemId(filteredItems[nextIndex]?.id ?? "");
  };

  return (
    <details className="contribution-card-disclosure">
      <summary>
        <span>
          <strong>Explore the technical source map</strong>
          <small>Repositories, changes, commits, and files</small>
        </span>
        <span>{allItems.length.toLocaleString("en-US")} public records</span>
      </summary>
      <div
        className="contribution-card-player"
        data-contribution-player={project.graphId}
        data-entity-kind={activeItem.kind}
        data-lineage-stage={activeLineageDepth + 1}
        data-playing={effectivePlaying && visible ? "true" : "false"}
        style={
          {
            "--lineage-progress": `${lineageProgress}%`,
            "--lineage-scale": lineageProgress / 100,
          } as CSSProperties
        }
      >
      <header className="card-player-heading">
        <div>
          <span>Public contribution lineage</span>
          <strong>{project.title}</strong>
        </div>
        <output aria-live="off">
          {String(activeIndex + 1).padStart(2, "0")}
          <span>/</span>
          {String(filteredItems.length).padStart(2, "0")}
        </output>
      </header>

      <div
        className="card-player-filters"
        role="group"
        aria-label={`Filter source records for ${project.title}`}
      >
        {filters.map((option) => {
          const stageIndex = lineageStages.findIndex(
            (stage) => stage === option.id,
          );
          return (
            <button
              aria-pressed={filter === option.id}
              aria-label={`${option.label}: ${filterCounts[option.id]} records`}
              data-filter={option.id}
              data-state={
                option.id === "all"
                  ? "overview"
                  : stageIndex < activeLineageDepth
                    ? "traversed"
                    : stageIndex === activeLineageDepth
                      ? "active"
                      : "upcoming"
              }
              key={option.id}
              onClick={() => {
                setPlaying(false);
                setFilter(option.id);
                setActiveItemId(
                  filterContributionPlayerItems(allItems, option.id)[0]?.id ??
                    "",
                );
              }}
              type="button"
            >
              {option.displayLabel ?? option.label}
              <span>{filterCounts[option.id]}</span>
            </button>
          );
        })}
      </div>

      <div className="card-player-stage" ref={stageRef}>
        <div
          className="card-player-sculpture"
          aria-hidden="true"
          data-stage-number={`0${activeLineageDepth + 1}`}
        >
          <motion.i
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            className="card-player-core"
            data-kind={activeItem.kind}
            initial={
              reduceMotion
                ? false
                : { opacity: 0.35, scale: 0.64, rotate: -18 }
            }
            key={`${project.graphId}:${activeItem.id}`}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 19,
              mass: 0.85,
            }}
          />
        </div>

        <div className="card-player-readout">
          <div className="card-player-identity">
            <span>{entityLabel(activeItem.kind)}</span>
            <strong>{activeItem.label}</strong>
            <small>{activeItem.repository}</small>
          </div>

          <p className="card-player-description">
            <span>
              {compactDate(activeItem.date)} · {activeItem.status}
            </span>
            {activeItem.description}
          </p>

          <dl className="card-player-facts">
            {activeItem.facts.slice(0, 4).map((fact) => (
              <div key={`${fact.label}:${fact.value}`}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>

          <a
            href={activeItem.href}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${entityLabel(activeItem.kind)} source for ${activeItem.label} (opens in a new tab)`}
          >
            Open source
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>

      <div
        className="card-player-transport"
        style={{ "--player-progress": `${progress}%` } as CSSProperties}
      >
        <button
          aria-label="Previous source record"
          onClick={() => move(-1)}
          type="button"
        >
          ←
        </button>
        <button
          aria-label={
            reduceMotion
              ? "Automatic playback disabled by reduced motion preference"
              : effectivePlaying
                ? "Pause source player"
                : "Play source player"
          }
          aria-pressed={effectivePlaying}
          className="card-player-play"
          disabled={reduceMotion}
          onClick={() => setPlaying((current) => !current)}
          type="button"
        >
          <span aria-hidden="true">
            {reduceMotion ? "◇" : effectivePlaying ? "Ⅱ" : "▶"}
          </span>
          {reduceMotion ? "Manual" : effectivePlaying ? "Pause" : "Play"}
        </button>
        <label>
          <span className="visually-hidden">Source record position</span>
          <input
            aria-valuetext={`${entityLabel(activeItem.kind)}: ${activeItem.label}`}
            max={Math.max(0, filteredItems.length - 1)}
            min="0"
            onChange={(event) => {
              setPlaying(false);
              setActiveItemId(
                filteredItems[Number(event.currentTarget.value)]?.id ?? "",
              );
            }}
            step="1"
            type="range"
            value={activeIndex}
          />
        </label>
        <button
          aria-label="Next source record"
          onClick={() => move(1)}
          type="button"
        >
          →
        </button>
      </div>
      </div>
    </details>
  );
}
