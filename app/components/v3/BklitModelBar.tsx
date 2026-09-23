"use client";

// Adapted from Bklit UI's AnimatedBar, MIT Copyright (c) 2026 uixmat.
// Pinned source and modifications: THIRD_PARTY_NOTICES.md.

export default function BklitModelBar({
  percentage,
  selected,
}: {
  readonly percentage: number;
  readonly selected: boolean;
}) {
  const width = Number.isFinite(percentage)
    ? Math.max(0, Math.min(100, percentage)) * 10
    : 0;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1000 12"
      preserveAspectRatio="none"
      width="100%"
      height="12"
      style={{ display: "block", overflow: "hidden" }}
      data-bklit-model-bar
    >
      <rect
        x={0}
        y={2}
        width={1000}
        height={8}
        rx={2}
        fill="var(--agent-accent)"
        style={{ transform: `scaleX(${width / 1000})`, opacity: selected ? 1 : 0.78 }}
      />
      {[250, 500, 750].map((x) => (
        <path
          key={x}
          d={`M${x} 0V12`}
          stroke="var(--ink)"
          strokeOpacity={0.16}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
