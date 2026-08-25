"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import {
  contributionLineageChapters,
  contributionLineageSnapshot,
  type LineageChapter,
  type LineageEvent,
} from "../data/contribution-lineage";
import {
  getPortfolioLineageFocus,
  publishPortfolioLineageFocus,
  projectIdForEvidence,
  subscribePortfolioLineageFocus,
} from "./contribution-story/lineage-focus";
import type { ContributionClusterId } from "./contribution-story/types";

interface Point {
  readonly x: number;
  readonly y: number;
}

export interface LineageAgentSignal {
  readonly id: string;
  readonly label: string;
  readonly provider: string;
  readonly marker: string;
  readonly commitCount: number;
  readonly codeAdditions: number;
}

export interface LineageAgentCluster {
  readonly chapterId: string;
  readonly signals: readonly LineageAgentSignal[];
}

export interface ContributionConstellationProps {
  readonly agentClusters: readonly LineageAgentCluster[];
}

const stage = {
  width: 1360,
  height: 820,
  origin: { x: 680, y: 410 },
} as const;

const clusterCenters: Record<string, Point> = {
  security: { x: 250, y: 230 },
  cloud: { x: 665, y: 170 },
  agents: { x: 1080, y: 280 },
  browser: { x: 420, y: 645 },
  durability: { x: 970, y: 650 },
};

const fieldStars = Array.from({ length: 62 }, (_, index) => ({
  x: 24 + ((index * 193 + 71) % (stage.width - 48)),
  y: 24 + ((index * 109 + 43) % (stage.height - 48)),
  radius: index % 9 === 0 ? 1.8 : index % 4 === 0 ? 1.2 : 0.7,
  opacity: 0.14 + (index % 5) * 0.035,
}));

const snapshotDate = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(`${contributionLineageSnapshot.observedAt}T00:00:00Z`));

function connectionPath(from: Point, to: Point): string {
  const bend = Math.max(64, Math.abs(to.x - from.x) * 0.32);
  const direction = to.x >= from.x ? 1 : -1;
  return `M ${from.x} ${from.y} C ${from.x + bend * direction} ${from.y}, ${
    to.x - bend * direction
  } ${to.y}, ${to.x} ${to.y}`;
}

function eventPoint(center: Point, index: number, count: number): Point {
  const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
  const radius = 82 + (index % 2) * 32;
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

function agentPoint(center: Point, index: number, count: number): Point {
  const angle = -Math.PI / 2 + (index / Math.max(count, 1)) * Math.PI * 2;
  const radius = 48;
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

function availabilityLabel(event: LineageEvent): string {
  return event.availability === "upstream"
    ? "Live upstream"
    : "Live in the public fork";
}

function chapterEvent(
  chapter: LineageChapter,
  eventId: string | null,
): LineageEvent {
  return (
    chapter.events.find((event) => event.id === eventId) ?? chapter.events[0]
  );
}

function EventGlyph({
  event,
  index,
}: {
  readonly event: LineageEvent;
  readonly index: number;
}) {
  const label =
    event.label.length > 26 ? `${event.label.slice(0, 24)}…` : event.label;
  const labelOnLeft = index % 2 === 1;
  const labelX = labelOnLeft ? -18 : 18;
  const labelAnchor = labelOnLeft ? "end" : "start";

  if (event.availability === "public-fork") {
    return (
      <>
        <rect
          className="lineage-node-halo"
          x="-13"
          y="-13"
          width="26"
          height="26"
          rx="7"
          transform="rotate(45)"
        />
        <rect
          className="lineage-node-core"
          x="-8"
          y="-8"
          width="16"
          height="16"
          rx="4"
          transform="rotate(45)"
        />
        <text
          className="lineage-node-label"
          x={labelX}
          y="4"
          textAnchor={labelAnchor}
        >
          {label}
        </text>
      </>
    );
  }

  return (
    <>
      <circle className="lineage-node-halo" cx="0" cy="0" r="13" />
      <circle className="lineage-node-core" cx="0" cy="0" r="8" />
      <text
        className="lineage-node-label"
        x={labelX}
        y="4"
        textAnchor={labelAnchor}
      >
        {label}
      </text>
    </>
  );
}

function AgentGlyph({ marker }: { readonly marker: string }) {
  const normalized = marker.toLowerCase();
  if (normalized === "diamond") {
    return (
      <rect
        x="-5"
        y="-5"
        width="10"
        height="10"
        rx="1"
        transform="rotate(45)"
      />
    );
  }
  if (normalized === "triangle") {
    return <path d="M0 -6L6 5H-6Z" />;
  }
  if (normalized === "circle") {
    return <circle r="5.4" />;
  }
  if (normalized === "hexagon" || normalized === "shared") {
    return <polygon points="0,-6 5.2,-3 5.2,3 0,6 -5.2,3 -5.2,-3" />;
  }
  if (normalized === "star") {
    return (
      <path d="M0 -6L1.8 -1.9L6 -1.6L2.8 1.2L3.8 5.4L0 3.1L-3.8 5.4L-2.8 1.2L-6 -1.6L-1.8 -1.9Z" />
    );
  }
  return <rect x="-5" y="-5" width="10" height="10" rx="1.5" />;
}

function LineageSpine({
  activeChapterId,
  projectId,
  repository,
  reduceMotion,
}: {
  readonly activeChapterId: string;
  readonly projectId: string | null;
  readonly repository: string | null;
  readonly reduceMotion: boolean;
}) {
  const activeIndex = Math.max(
    0,
    contributionLineageChapters.findIndex(
      (chapter) => chapter.id === activeChapterId,
    ),
  );
  const progress =
    contributionLineageChapters.length > 1
      ? activeIndex / (contributionLineageChapters.length - 1)
      : 1;

  const projectLabel = projectId
    ?.split("-")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
  const repositoryLabel = repository?.split("/").at(-1);

  return (
    <div className="lineage-spine">
      <svg
        viewBox="0 0 88 620"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <path className="lineage-spine-track" d="M44 42V578" />
        <m.path
          className="lineage-spine-progress"
          d="M44 42V578"
          initial={false}
          animate={{ pathLength: progress }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.72, ease: [0.16, 1, 0.3, 1] }
          }
        />
        {contributionLineageChapters.map((chapter, index) => {
          const y =
            42 +
            (index / (contributionLineageChapters.length - 1)) * (578 - 42);
          const isActive = chapter.id === activeChapterId;
          return (
            <g
              className="lineage-spine-node"
              data-tone={chapter.tone}
              data-active={isActive ? "true" : "false"}
              transform={`translate(44 ${y})`}
              key={chapter.id}
            >
              <circle r="13" />
              <circle r="4" />
              <text x="-21" y="4" textAnchor="end">
                {chapter.index}
              </text>
            </g>
          );
        })}
      </svg>
      {projectId ? (
        <a
          className="lineage-spine-beacon"
          href={`#post-${projectId}`}
          aria-label={`Live lineage: ${repositoryLabel ?? projectLabel}; jump to ${projectLabel ?? projectId}`}
        >
          <span>Live lineage</span>
          <strong>{repositoryLabel ?? projectLabel}</strong>
          <small>{projectLabel}</small>
        </a>
      ) : null}
    </div>
  );
}

export function ContributionConstellation({
  agentClusters,
}: ContributionConstellationProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const activeChapterIndexRef = useRef(0);
  const reduceMotion = useReducedMotion() === true;
  const idSuffix = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const washId = `lineage-wash-${idSuffix}`;
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [ambientChapterId, setAmbientChapterId] = useState("security");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    contributionLineageChapters[0].events[0]?.id ?? null,
  );
  const [agentLens, setAgentLens] = useState(true);
  const [focusedAgentId, setFocusedAgentId] = useState("all");
  const [lineageFocus, setLineageFocus] = useState(getPortfolioLineageFocus);

  const activeChapter = contributionLineageChapters[activeChapterIndex];
  const selectedEvent = chapterEvent(activeChapter, selectedEventId);
  const agentClusterMap = useMemo(
    () => new Map(agentClusters.map((cluster) => [cluster.chapterId, cluster])),
    [agentClusters],
  );
  const activeAgentSignals =
    agentClusterMap.get(activeChapter.id)?.signals ?? [];
  useEffect(() => {
    const root = sectionRef.current;
    if (!root) {
      return;
    }

    const chapterElements = Array.from(
      root.querySelectorAll<HTMLElement>("[data-lineage-chapter]"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) => right.intersectionRatio - left.intersectionRatio,
          );
        const nextId = visible[0]?.target.getAttribute("data-lineage-chapter");
        const nextIndex = contributionLineageChapters.findIndex(
          (chapter) => chapter.id === nextId,
        );

        if (nextIndex >= 0 && nextIndex !== activeChapterIndexRef.current) {
          activeChapterIndexRef.current = nextIndex;
          setActiveChapterIndex(nextIndex);
          setSelectedEventId(
            contributionLineageChapters[nextIndex].events[0]?.id ?? null,
          );
          setFocusedAgentId("all");
          const firstEvent = contributionLineageChapters[nextIndex].events[0];
          if (firstEvent) {
            publishPortfolioLineageFocus({
              chapterId: contributionLineageChapters[nextIndex]
                .id as ContributionClusterId,
              evidenceId: firstEvent.id,
              projectId: projectIdForEvidence(firstEvent.id),
              repository: firstEvent.repository,
              commitId: null,
              fileId: null,
              nodeId: null,
              nodeType: null,
              source: "constellation-scroll",
            });
          }
        }
      },
      {
        rootMargin: "-28% 0px -52% 0px",
        threshold: [0.08, 0.24, 0.48, 0.72],
      },
    );

    chapterElements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observedSections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-constellation-cluster]"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) => right.intersectionRatio - left.intersectionRatio,
          );
        const nextId = visible[0]?.target.getAttribute(
          "data-constellation-cluster",
        );
        if (
          nextId &&
          contributionLineageChapters.some((chapter) => chapter.id === nextId)
        ) {
          setAmbientChapterId(nextId);
        }
      },
      {
        rootMargin: "-38% 0px -48% 0px",
        threshold: [0.05, 0.2, 0.45],
      },
    );

    observedSections.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleLineageFocus = () => {
      const detail = getPortfolioLineageFocus();
      setLineageFocus(detail);
      if (detail.source === "constellation-scroll") {
        return;
      }

      const nextChapterIndex = contributionLineageChapters.findIndex(
        (chapter) => chapter.id === detail.chapterId,
      );
      if (nextChapterIndex < 0) {
        return;
      }

      const nextChapter = contributionLineageChapters[nextChapterIndex];
      const nextEvent =
        nextChapter.events.find(
          (lineageEvent) => lineageEvent.id === detail.evidenceId,
        ) ??
        nextChapter.events.find(
          (lineageEvent) => lineageEvent.id === detail.projectId,
        ) ??
        nextChapter.events[0];
      const nextEventId = nextEvent?.id ?? null;
      const chapterChanged = nextChapterIndex !== activeChapterIndexRef.current;

      activeChapterIndexRef.current = nextChapterIndex;
      setActiveChapterIndex((currentIndex) =>
        currentIndex === nextChapterIndex ? currentIndex : nextChapterIndex,
      );
      setSelectedEventId((currentId) =>
        currentId === nextEventId ? currentId : nextEventId,
      );
      if (chapterChanged) {
        setFocusedAgentId("all");
      }
    };

    return subscribePortfolioLineageFocus(handleLineageFocus);
  }, []);

  function publishConstellationSelection(
    chapter: LineageChapter,
    event: LineageEvent,
    source: "constellation" | "constellation-scroll" = "constellation",
  ) {
    publishPortfolioLineageFocus({
      chapterId: chapter.id as ContributionClusterId,
      evidenceId: event.id,
      projectId: projectIdForEvidence(event.id),
      repository: event.repository,
      commitId: null,
      fileId: null,
      nodeId: null,
      nodeType: null,
      source,
    });
  }

  function selectChapter(index: number) {
    const chapter = contributionLineageChapters[index];
    const chapterChanged = index !== activeChapterIndexRef.current;
    activeChapterIndexRef.current = index;
    setActiveChapterIndex(index);
    setSelectedEventId(chapter.events[0]?.id ?? null);
    if (chapterChanged) {
      setFocusedAgentId("all");
    }
    if (chapter.events[0]) {
      publishConstellationSelection(chapter, chapter.events[0]);
    }
    document.getElementById(`lineage-chapter-${chapter.id}`)?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <LineageSpine
        activeChapterId={
          lineageFocus.source === "project-simulation" ||
          lineageFocus.source === "node"
            ? lineageFocus.chapterId
            : ambientChapterId
        }
        projectId={lineageFocus.projectId}
        repository={lineageFocus.repository}
        reduceMotion={reduceMotion}
      />

      <section
        className="section lineage-section"
        id="contribution-lineage"
        aria-labelledby="contribution-lineage-title"
        ref={sectionRef}
        data-constellation-cluster={activeChapter.id}
      >
        <div className="shell lineage-intro">
          <p className="section-code">02 / Work in motion</p>
          <div>
            <p className="lineage-kicker">Public work, traced from source</p>
            <h2 id="contribution-lineage-title">
              Watch systems take shape, branch by branch.
            </h2>
            <p>
              Two public identities meet at the origin. Colored clusters become
              system families; their orbiting marks become source-linked
              capabilities. Agent shapes appear only when GitHub records an
              author or Co-authored-by signal.
            </p>
          </div>
        </div>

        <div className="shell lineage-provenance">
          <span aria-hidden="true">↳</span>
          <p>
            A curated field built from public code. Every named capability opens
            to the pull request, commit, or fork that carries it today.
          </p>
        </div>

        <div className="shell lineage-scroll">
          <div className="lineage-stage-shell">
            <div className="lineage-stage">
              <div className="lineage-stage-topline">
                <div>
                  <span>In focus</span>
                  <strong>{activeChapter.eyebrow}</strong>
                </div>
                <div className="lineage-stage-actions">
                  <span>{activeChapter.range}</span>
                  <button
                    type="button"
                    aria-pressed={agentLens}
                    onClick={() => {
                      setAgentLens((current) => !current);
                      setFocusedAgentId("all");
                    }}
                  >
                    <span
                      className="lineage-agent-lens-glyph"
                      aria-hidden="true"
                    >
                      ✦
                    </span>
                    {agentLens ? "Hide agent signals" : "Show agent signals"}
                  </button>
                </div>
              </div>

              <nav className="lineage-cluster-nav" aria-label="Choose a system">
                {contributionLineageChapters.map((chapter, index) => (
                  <button
                    type="button"
                    data-tone={chapter.tone}
                    data-active={
                      activeChapterIndex === index ? "true" : "false"
                    }
                    aria-pressed={activeChapterIndex === index}
                    onClick={() => selectChapter(index)}
                    key={chapter.id}
                  >
                    <span>{chapter.index}</span>
                    {chapter.eyebrow}
                  </button>
                ))}
              </nav>

              <svg
                className="lineage-svg"
                data-active-chapter={activeChapter.id}
                viewBox={`0 0 ${stage.width} ${stage.height}`}
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
                focusable="false"
              >
                <defs>
                  <radialGradient id={washId} cx="50%" cy="50%" r="60%">
                    <stop
                      offset="0%"
                      stopColor="var(--accent)"
                      stopOpacity="0.12"
                    />
                    <stop
                      offset="58%"
                      stopColor="var(--deep-plum)"
                      stopOpacity="0.08"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--night)"
                      stopOpacity="0"
                    />
                  </radialGradient>
                </defs>

                <ellipse
                  cx={stage.origin.x}
                  cy={stage.origin.y}
                  rx="490"
                  ry="330"
                  fill={`url(#${washId})`}
                />

                <g className="lineage-field" aria-hidden="true">
                  {fieldStars.map((star, index) => (
                    <circle
                      cx={star.x}
                      cy={star.y}
                      r={star.radius}
                      opacity={star.opacity}
                      key={`${star.x}-${star.y}-${index}`}
                    />
                  ))}
                </g>

                <g className="lineage-network">
                  {contributionLineageChapters.map((chapter) => {
                    const center = clusterCenters[chapter.id];
                    const isActive = chapter.id === activeChapter.id;
                    return (
                      <m.path
                        className="lineage-network-path"
                        data-tone={chapter.tone}
                        data-active={isActive ? "true" : "false"}
                        d={connectionPath(stage.origin, center)}
                        fill="none"
                        initial={false}
                        animate={{
                          opacity: isActive ? 0.9 : 0.18,
                          pathLength: isActive ? 1 : 0.44,
                        }}
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : {
                                duration: 0.78,
                                ease: [0.16, 1, 0.3, 1],
                              }
                        }
                        key={chapter.id}
                      />
                    );
                  })}
                </g>

                <g
                  className="lineage-origin"
                  transform={`translate(${stage.origin.x} ${stage.origin.y})`}
                >
                  <polygon points="0,-30 26,-15 26,15 0,30 -26,15 -26,-15" />
                  <circle r="6" />
                  <text x="0" y="52">
                    mh0pe + awsmadi
                  </text>
                </g>

                {contributionLineageChapters.map((chapter) => {
                  const center = clusterCenters[chapter.id];
                  const isActive = chapter.id === activeChapter.id;
                  const agentSignals =
                    agentClusterMap.get(chapter.id)?.signals ?? [];
                  return (
                    <m.g
                      className="lineage-cluster"
                      data-tone={chapter.tone}
                      data-active={isActive ? "true" : "false"}
                      initial={false}
                      animate={{
                        opacity: isActive ? 1 : 0.24,
                        scale: isActive ? 1 : 0.9,
                      }}
                      style={{
                        transformOrigin: `${center.x}px ${center.y}px`,
                      }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : {
                              duration: 0.62,
                              ease: [0.16, 1, 0.3, 1],
                            }
                      }
                      key={chapter.id}
                    >
                      <g
                        className="lineage-cluster-anchor"
                        transform={`translate(${center.x} ${center.y})`}
                      >
                        <polygon points="0,-30 26,-15 26,15 0,30 -26,15 -26,-15" />
                        <circle r="6" />
                        <text x="0" y="52">
                          {chapter.index}
                        </text>
                      </g>

                      {chapter.events.map((event, eventIndex) => {
                        const point = eventPoint(
                          center,
                          eventIndex,
                          chapter.events.length,
                        );
                        const isSelected =
                          isActive && event.id === selectedEvent.id;
                        return (
                          <g key={event.id}>
                            <m.path
                              className="lineage-event-path"
                              d={connectionPath(center, point)}
                              fill="none"
                              initial={false}
                              animate={{
                                opacity: isActive ? 0.76 : 0.18,
                                pathLength: isActive ? 1 : 0.32,
                              }}
                              transition={
                                reduceMotion
                                  ? { duration: 0 }
                                  : {
                                      duration: 0.62,
                                      delay: isActive
                                        ? Math.min(eventIndex * 0.055, 0.32)
                                        : 0,
                                      ease: [0.16, 1, 0.3, 1],
                                    }
                              }
                            />
                            <g transform={`translate(${point.x} ${point.y})`}>
                              <m.g
                                className="lineage-node"
                                data-availability={event.availability}
                                data-selected={isSelected ? "true" : "false"}
                                onMouseEnter={() => {
                                  if (isActive) {
                                    setSelectedEventId(event.id);
                                    publishConstellationSelection(
                                      chapter,
                                      event,
                                    );
                                  }
                                }}
                                onClick={() => {
                                  setSelectedEventId(event.id);
                                  publishConstellationSelection(chapter, event);
                                  document
                                    .getElementById(`lineage-event-${event.id}`)
                                    ?.scrollIntoView({
                                      behavior: reduceMotion
                                        ? "auto"
                                        : "smooth",
                                      block: "center",
                                    });
                                }}
                                initial={false}
                                animate={{
                                  opacity: isActive ? 1 : 0.45,
                                  scale: isSelected ? 1.22 : 1,
                                }}
                                style={{ transformOrigin: "center" }}
                                transition={
                                  reduceMotion
                                    ? { duration: 0 }
                                    : {
                                        duration: 0.32,
                                        ease: [0.16, 1, 0.3, 1],
                                      }
                                }
                              >
                                <EventGlyph event={event} index={eventIndex} />
                              </m.g>
                            </g>
                          </g>
                        );
                      })}

                      {agentLens && agentSignals.length > 0 ? (
                        <circle
                          className="lineage-agent-orbit"
                          cx={center.x}
                          cy={center.y}
                          r="48"
                        />
                      ) : null}

                      {agentLens
                        ? agentSignals.map((signal, agentIndex) => {
                            const point = agentPoint(
                              center,
                              agentIndex,
                              agentSignals.length,
                            );
                            const isFocused =
                              focusedAgentId === "all" ||
                              focusedAgentId === signal.id;
                            const signalScale = Math.min(
                              1.35,
                              0.78 +
                                Math.log2(Math.max(1, signal.commitCount) + 1) *
                                  0.15,
                            );
                            return (
                              <g
                                transform={`translate(${point.x} ${point.y})`}
                                key={`${chapter.id}-${signal.id}`}
                              >
                                <m.g
                                  className="lineage-agent-node"
                                  data-marker={signal.marker}
                                  data-focused={isFocused ? "true" : "false"}
                                  initial={false}
                                  animate={{
                                    opacity:
                                      isActive && isFocused
                                        ? 1
                                        : isFocused
                                          ? 0.52
                                          : 0.12,
                                    scale: signalScale,
                                  }}
                                  style={{ transformOrigin: "center" }}
                                  transition={
                                    reduceMotion
                                      ? { duration: 0 }
                                      : {
                                          duration: 0.42,
                                          ease: [0.16, 1, 0.3, 1],
                                        }
                                  }
                                >
                                  <title>{`${signal.label}: ${
                                    signal.commitCount
                                  } recorded ${
                                    signal.commitCount === 1
                                      ? "commit"
                                      : "commits"
                                  } in this capability family`}</title>
                                  <circle
                                    className="lineage-agent-node-halo"
                                    r="10"
                                  />
                                  <g className="lineage-agent-node-glyph">
                                    <AgentGlyph marker={signal.marker} />
                                  </g>
                                </m.g>
                              </g>
                            );
                          })
                        : null}
                    </m.g>
                  );
                })}
              </svg>

              <div className="lineage-readout" data-tone={activeChapter.tone}>
                <div className="lineage-readout-heading">
                  <span>{selectedEvent.date}</span>
                  <span>{availabilityLabel(selectedEvent)}</span>
                </div>
                <strong>{selectedEvent.label}</strong>
                <p>{selectedEvent.detail}</p>
                <div className="lineage-readout-links">
                  {selectedEvent.links.map((link) => (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      key={link.href}
                    >
                      {link.label}
                      <span aria-hidden="true"> ↗</span>
                      <span className="visually-hidden">
                        {" "}
                        (opens in a new tab)
                      </span>
                    </a>
                  ))}
                  {projectIdForEvidence(selectedEvent.id) ? (
                    <a
                      href={`#post-${projectIdForEvidence(selectedEvent.id)}`}
                      className="lineage-readout-project"
                    >
                      Read the project story
                      <span aria-hidden="true"> ↓</span>
                    </a>
                  ) : null}
                </div>
              </div>

              {agentLens ? (
                <div className="lineage-agent-legend">
                  <div>
                    <strong>Recorded agent signals</strong>
                    <span>GitHub author and Co-authored-by metadata</span>
                  </div>
                  {activeAgentSignals.length > 0 ? (
                    <div>
                      <button
                        type="button"
                        data-active={
                          focusedAgentId === "all" ? "true" : "false"
                        }
                        aria-pressed={focusedAgentId === "all"}
                        onClick={() => setFocusedAgentId("all")}
                      >
                        <span
                          className="lineage-agent-marker"
                          aria-hidden="true"
                        >
                          ✦
                        </span>
                        All agent signals
                      </button>
                      {activeAgentSignals.map((signal) => (
                        <button
                          type="button"
                          data-marker={signal.marker}
                          data-active={
                            focusedAgentId === signal.id ? "true" : "false"
                          }
                          aria-pressed={focusedAgentId === signal.id}
                          onClick={() =>
                            setFocusedAgentId((current) =>
                              current === signal.id ? "all" : signal.id,
                            )
                          }
                          key={signal.id}
                        >
                          <span
                            className="lineage-agent-marker"
                            data-marker={signal.marker}
                            aria-hidden="true"
                          />
                          <span>
                            <strong>{signal.label}</strong>
                            <small>
                              {signal.commitCount}{" "}
                              {signal.commitCount === 1 ? "commit" : "commits"}
                            </small>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p>
                      No agent author or coauthor signal is recorded for this
                      system.
                    </p>
                  )}
                </div>
              ) : null}

              <div
                className="lineage-legend"
                aria-label="Constellation legend"
                role="group"
              >
                <span>
                  <i data-shape="circle" aria-hidden="true" />
                  Live upstream
                </span>
                <span>
                  <i data-shape="diamond" aria-hidden="true" />
                  Live in public fork
                </span>
                <span>
                  <i data-shape="dash" aria-hidden="true" />
                  Work connection
                </span>
              </div>
            </div>
          </div>

          <div className="lineage-chapters">
            {contributionLineageChapters.map((chapter, chapterIndex) => {
              const isActive = chapterIndex === activeChapterIndex;
              return (
                <article
                  className="lineage-chapter"
                  id={`lineage-chapter-${chapter.id}`}
                  data-lineage-chapter={chapter.id}
                  data-tone={chapter.tone}
                  data-active={isActive ? "true" : "false"}
                  key={chapter.id}
                >
                  <div className="lineage-chapter-card">
                    <div className="lineage-chapter-meta">
                      <span>{chapter.index}</span>
                      <div>
                        <p>{chapter.eyebrow}</p>
                        <small>{chapter.range}</small>
                      </div>
                    </div>
                    <h3>{chapter.title}</h3>
                    <p className="lineage-chapter-repositories">
                      {chapter.repositories}
                    </p>
                    <p>{chapter.summary}</p>
                    <ol className="lineage-event-list">
                      {chapter.events.map((event, eventIndex) => {
                        const isExpanded =
                          isActive && event.id === selectedEvent.id;
                        const detailId = `lineage-event-detail-${idSuffix}-${event.id}`;
                        return (
                          <li
                            id={`lineage-event-${event.id}`}
                            data-selected={isExpanded ? "true" : "false"}
                            key={event.id}
                          >
                            <button
                              type="button"
                              aria-expanded={isExpanded}
                              aria-disabled={isExpanded}
                              aria-controls={detailId}
                              onClick={() => {
                                if (isExpanded) {
                                  return;
                                }
                                const chapterChanged =
                                  chapterIndex !==
                                  activeChapterIndexRef.current;
                                activeChapterIndexRef.current = chapterIndex;
                                setActiveChapterIndex(chapterIndex);
                                setSelectedEventId(event.id);
                                publishConstellationSelection(chapter, event);
                                if (chapterChanged) {
                                  setFocusedAgentId("all");
                                }
                              }}
                            >
                              <span>{event.date}</span>
                              <strong>
                                {eventIndex + 1}. {event.label}
                              </strong>
                              <small>{availabilityLabel(event)}</small>
                            </button>
                            <div
                              className="lineage-event-detail"
                              id={detailId}
                              hidden={!isExpanded}
                            >
                              <p>{event.detail}</p>
                              <div className="lineage-event-links">
                                {event.links.map((link) => (
                                  <a
                                    href={link.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    key={link.href}
                                  >
                                    {link.label}
                                    <span aria-hidden="true"> ↗</span>
                                    <span className="visually-hidden">
                                      {" "}
                                      (opens in a new tab)
                                    </span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="shell lineage-method">
          <p>
            <strong>What the lines mean.</strong> This is a curated map of
            public work, not a literal Git graph. Every named point opens to the
            PR, commit, or fork that carries the capability. Agent marks appear
            only when GitHub records an author or Co-authored-by signal; they do
            not claim exclusive line ownership.
          </p>
          <p>
            Public-only snapshot ·{" "}
            <time dateTime={contributionLineageSnapshot.observedAt}>
              {snapshotDate}
            </time>
          </p>
        </div>
      </section>
    </LazyMotion>
  );
}
