"use client";

import { useId } from "react";
import { LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

const baseRoutes = [
  "M480 188C606 188 640 244 746 244S884 210 980 210",
  "M452 284C590 284 626 326 752 326S884 300 1040 300",
  "M506 400C624 400 668 366 772 366S910 418 1020 418",
  "M872 300C930 300 944 186 1010 186",
  "M872 300C960 300 968 300 1040 300",
  "M872 300C930 300 952 418 1020 418",
  "M1040 300C1090 300 1090 232 1140 232",
  "M1040 300C1090 300 1094 376 1140 376",
] as const;

const revealRoutes = [
  "M480 188C606 188 640 244 746 244S824 270 830 300C894 300 948 186 1010 186",
  "M452 284C590 284 626 326 752 326S804 306 830 300C916 300 976 300 1040 300C1090 300 1090 232 1140 232",
  "M506 400C624 400 668 366 772 366S812 326 830 300C902 300 952 418 1020 418C1080 418 1094 376 1140 376",
] as const;

const planes = [
  "650,200 754,144 754,456 650,512",
  "726,214 840,150 840,462 726,526",
  "804,250 914,190 914,502 804,562",
] as const;

const nodes = [
  { x: 1010, y: 186, tone: "cyan" },
  { x: 1040, y: 300, tone: "coral" },
  { x: 1020, y: 418, tone: "cyan" },
  { x: 1140, y: 232, tone: "coral" },
  { x: 1140, y: 376, tone: "lime" },
] as const;

function hexPoints(x: number, y: number, radius: number): string {
  return [
    [x, y - radius],
    [x + radius * 0.866, y - radius / 2],
    [x + radius * 0.866, y + radius / 2],
    [x, y + radius],
    [x - radius * 0.866, y + radius / 2],
    [x - radius * 0.866, y - radius / 2],
  ]
    .map(([pointX, pointY]) => `${pointX},${pointY}`)
    .join(" ");
}

function nodeColor(tone: (typeof nodes)[number]["tone"]): string {
  if (tone === "coral") {
    return "var(--signal-coral)";
  }
  if (tone === "lime") {
    return "var(--signal-lime)";
  }
  return "var(--accent)";
}

export function HeroSignalGraphic() {
  const idSuffix = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gridId = `hero-signal-grid-${idSuffix}`;
  const planeId = `hero-signal-plane-${idSuffix}`;
  const routeId = `hero-signal-route-${idSuffix}`;
  const washId = `hero-signal-wash-${idSuffix}`;
  const shouldAnimate = useReducedMotion() === false;

  return (
    <div className="hero-signal" aria-hidden="true">
      <LazyMotion features={domAnimation} strict>
        <m.svg
          className="hero-signal-svg"
          data-hero-signal="true"
          viewBox="0 0 1200 720"
          preserveAspectRatio="xMaxYMin slice"
          aria-hidden="true"
          focusable="false"
          role="presentation"
        >
          <defs>
            <linearGradient
              id={routeId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="72%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--signal-coral)" />
            </linearGradient>
            <linearGradient
              id={planeId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
              <stop
                offset="70%"
                stopColor="var(--deep-plum)"
                stopOpacity="0.08"
              />
              <stop
                offset="100%"
                stopColor="var(--signal-coral)"
                stopOpacity="0.16"
              />
            </linearGradient>
            <radialGradient id={washId} cx="76%" cy="32%" r="58%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
              <stop
                offset="52%"
                stopColor="var(--signal-coral)"
                stopOpacity="0.07"
              />
              <stop offset="100%" stopColor="var(--night)" stopOpacity="0" />
            </radialGradient>
            <pattern
              id={gridId}
              width="88"
              height="88"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M88 0H0V88"
                fill="none"
                stroke="var(--accent)"
                strokeOpacity="0.16"
                vectorEffect="non-scaling-stroke"
              />
            </pattern>
          </defs>

          <ellipse
            cx="910"
            cy="278"
            rx="410"
            ry="332"
            fill={`url(#${washId})`}
          />

          <rect
            className="signal-grid"
            x="470"
            y="0"
            width="730"
            height="650"
            fill={`url(#${gridId})`}
          />

          <g className="signal-inputs">
            {baseRoutes.slice(0, 3).map((path) => (
              <path
                className="signal-route"
                data-signal-route="base"
                d={path}
                fill="none"
                stroke="var(--accent)"
                strokeOpacity="0.24"
                strokeWidth="1.25"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                key={path}
              />
            ))}
          </g>

          <g className="signal-planes">
            {planes.map((points, index) => (
              <polygon
                className="signal-plane"
                data-signal-plane={index + 1}
                points={points}
                fill={`url(#${planeId})`}
                stroke="var(--accent)"
                strokeOpacity={0.28 - index * 0.045}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                key={points}
              />
            ))}
          </g>

          <g className="signal-core">
            <polygon
              points={hexPoints(830, 300, 52)}
              fill="var(--panel-dark)"
              fillOpacity="0.82"
              stroke="var(--accent)"
              strokeOpacity="0.38"
              vectorEffect="non-scaling-stroke"
            />
            <polygon
              points={hexPoints(830, 300, 34)}
              fill="none"
              stroke="var(--accent)"
              strokeOpacity="0.26"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx="830"
              cy="300"
              r="9"
              fill="var(--signal-coral)"
              fillOpacity="0.82"
            />
          </g>

          <g className="signal-routes">
            {baseRoutes.slice(3).map((path) => (
              <path
                className="signal-route"
                data-signal-route="base"
                d={path}
                fill="none"
                stroke="var(--accent)"
                strokeOpacity="0.3"
                strokeWidth="1.25"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                key={path}
              />
            ))}
          </g>

          <g className="signal-nodes">
            {nodes.map((node, index) => (
              <polygon
                className="signal-node"
                data-signal-node={index + 1}
                data-tone={node.tone}
                points={hexPoints(node.x, node.y, 24)}
                fill="var(--panel-dark)"
                fillOpacity="0.74"
                stroke={nodeColor(node.tone)}
                strokeOpacity="0.42"
                vectorEffect="non-scaling-stroke"
                key={`shell-${node.x}-${node.y}`}
              />
            ))}
            {nodes.map((node) => (
              <circle
                className="signal-node-core"
                cx={node.x}
                cy={node.y}
                r="5"
                fill={nodeColor(node.tone)}
                fillOpacity="0.86"
                key={`core-${node.x}-${node.y}`}
              />
            ))}
          </g>

          <g className="signal-pulses">
            {revealRoutes.map((path, index) => (
              <m.path
                className="signal-pulse"
                data-motion-layer="route"
                data-signal-route="reveal"
                d={path}
                fill="none"
                stroke={`url(#${routeId})`}
                strokeWidth="2"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={
                  shouldAnimate
                    ? { pathLength: 1, opacity: [0, 0.92, 0.16] }
                    : undefined
                }
                transition={{
                  duration: 1.55,
                  delay: 0.32 + index * 0.16,
                  ease: [0.22, 1, 0.36, 1],
                  times: [0, 0.68, 1],
                }}
                key={path}
              />
            ))}
          </g>

          <m.circle
            className="signal-core-pulse"
            data-motion-layer="core"
            cx="830"
            cy="300"
            r="38"
            fill="none"
            stroke="var(--signal-coral)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            initial={{ opacity: 0, scale: 0.78 }}
            animate={
              shouldAnimate
                ? { opacity: [0, 0.72, 0.14], scale: [0.78, 1.12, 1] }
                : undefined
            }
            transition={{
              duration: 1.08,
              delay: 1.12,
              ease: [0.16, 1, 0.3, 1],
              times: [0, 0.72, 1],
            }}
          />

          <g className="signal-node-pulses">
            {nodes.map((node, index) => (
              <m.circle
                className="signal-node-pulse"
                data-motion-layer="node"
                cx={node.x}
                cy={node.y}
                r="22"
                fill="none"
                stroke={nodeColor(node.tone)}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                initial={{ opacity: 0, scale: 0.72 }}
                animate={
                  shouldAnimate
                    ? {
                        opacity: [0, 0.76, 0.12],
                        scale: [0.72, 1.18, 1],
                      }
                    : undefined
                }
                transition={{
                  duration: 0.92,
                  delay: 1.42 + index * 0.12,
                  ease: [0.16, 1, 0.3, 1],
                  times: [0, 0.7, 1],
                }}
                key={`${node.x}-${node.y}`}
              />
            ))}
          </g>
        </m.svg>
      </LazyMotion>
    </div>
  );
}
