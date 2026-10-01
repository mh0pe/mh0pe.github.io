import {
  AbsoluteFill,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { filmTheme } from "@/remotion/theme";
import { operatingArcTiming } from "@/remotion/operating-arc-timing.mjs";

const { colors, fonts } = filmTheme;

const stages = [
  "Pressure",
  "Constraint",
  "Decision",
  "Implementation",
  "State",
  "Source",
] as const;

const points = [
  { x: 180, y: 300 },
  { x: 600, y: 300 },
  { x: 1020, y: 300 },
  { x: 1020, y: 475 },
  { x: 600, y: 475 },
  { x: 180, y: 475 },
] as const;

const curves = [
  {
    from: points[0],
    control1: { x: 320, y: 300 },
    control2: { x: 460, y: 300 },
    to: points[1],
  },
  {
    from: points[1],
    control1: { x: 740, y: 300 },
    control2: { x: 940, y: 240 },
    to: points[2],
  },
  {
    from: points[2],
    control1: { x: 1100, y: 360 },
    control2: { x: 1100, y: 415 },
    to: points[3],
  },
  {
    from: points[3],
    control1: { x: 940, y: 535 },
    control2: { x: 740, y: 475 },
    to: points[4],
  },
  {
    from: points[4],
    control1: { x: 460, y: 475 },
    control2: { x: 320, y: 475 },
    to: points[5],
  },
] as const;

const path = curves.reduce(
  (value, curve, index) =>
    `${value}${index === 0 ? `M${curve.from.x} ${curve.from.y}` : ""} C${curve.control1.x} ${curve.control1.y} ${curve.control2.x} ${curve.control2.y} ${curve.to.x} ${curve.to.y}`,
  "",
);

const labelPositions = [
  { x: 180, y: 370 },
  { x: 600, y: 370 },
  { x: 900, y: 370 },
  { x: 960, y: 560 },
  { x: 600, y: 560 },
  { x: 180, y: 560 },
] as const;

function cubicPoint(
  curve: (typeof curves)[number],
  progress: number,
) {
  const inverse = 1 - progress;
  return {
    x:
      inverse ** 3 * curve.from.x +
      3 * inverse ** 2 * progress * curve.control1.x +
      3 * inverse * progress ** 2 * curve.control2.x +
      progress ** 3 * curve.to.x,
    y:
      inverse ** 3 * curve.from.y +
      3 * inverse ** 2 * progress * curve.control1.y +
      3 * inverse * progress ** 2 * curve.control2.y +
      progress ** 3 * curve.to.y,
  };
}

function ease(frame: number, input: readonly number[], output: readonly number[]) {
  return interpolate(frame, input, output, {
    easing: filmTheme.easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function signalProgressAtFrame(frame: number, fps: number) {
  const { signalStart: signalStartFrame, signalSegment: signalSegmentFrames } = operatingArcTiming(fps);
  const segment = Math.max(
    0,
    Math.min(
      curves.length - 1,
      Math.floor((frame - signalStartFrame) / signalSegmentFrames),
    ),
  );
  const segmentStart = signalStartFrame + segment * signalSegmentFrames;
  const segmentProgress = ease(
    frame,
    [segmentStart, segmentStart + signalSegmentFrames],
    [0, 1],
  );
  return (segment + segmentProgress) / curves.length;
}

export function OperatingArc() {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const timing = operatingArcTiming(fps);
  const { signalStart: signalStartFrame, signalSegment: signalSegmentFrames } = timing;
  const signalProgress = signalProgressAtFrame(frame, fps);
  const signalOpacity = ease(frame, [timing.exitStart, timing.exitEnd], [1, 0]);
  const finalSegmentFrame =
    signalStartFrame + (curves.length - 1) * signalSegmentFrames;
  const signalEndFrame = signalStartFrame + curves.length * signalSegmentFrames;
  const finalGlow = ease(
    frame,
    [finalSegmentFrame, signalEndFrame, durationInFrames - 1],
    [0.02, 0.24, 0.24],
  );
  const segment = Math.min(
    curves.length - 1,
    Math.floor(signalProgress * curves.length),
  );
  const segmentProgress = signalProgress * curves.length - segment;
  const signal = cubicPoint(curves[segment], segmentProgress);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        color: colors.foreground,
        fontFamily: fonts.display,
        overflow: "hidden",
      }}
    >
      <style>{`@font-face { font-family: "Instrument Motion"; src: url("${staticFile("fonts/instrument-sans-variable.woff2")}") format("woff2"); font-weight: 400 700; }`}</style>
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 12% 24%, ${colors.lime}12, transparent 55%), radial-gradient(ellipse at 90% 72%, ${colors.blue}14, transparent 58%)`,
        transform: `translateY(${ease(frame, [0, fps * 4], [5, 0])}px)`,
      }} />
      <svg
        viewBox="0 0 1200 675"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <defs>
          <linearGradient id="arc" x1="0" x2="1">
            <stop offset="0" stopColor={colors.lime} />
            <stop offset="0.58" stopColor={colors.blue} />
            <stop offset="1" stopColor={colors.copper} />
          </linearGradient>
          <radialGradient id="glow">
            <stop offset="0" stopColor={colors.copper} stopOpacity={finalGlow} />
            <stop offset="1" stopColor={colors.copper} stopOpacity="0" />
          </radialGradient>
        </defs>

        <g opacity="0.1" stroke={colors.foreground} strokeWidth="1">
          <path d="M68 210H1132" />
          <path d="M68 600H1132" />
        </g>

        <circle cx="180" cy="475" r="150" fill="url(#glow)" />
        <path d={path} fill="none" stroke={colors.foreground} strokeOpacity="0.12" strokeWidth="12" />
        <path
          d={path}
          fill="none"
          stroke="url(#arc)"
          strokeLinecap="round"
          strokeWidth="4"
        />

        {points.map((point, index) => {
          const arrival = signalStartFrame + index * signalSegmentFrames;
          const emphasis = index === points.length - 1
            ? ease(frame, [arrival - timing.emphasisLead, arrival + timing.emphasisLead], [0, 1])
            : ease(frame, [arrival - timing.emphasisLead, arrival + timing.emphasisPeak, arrival + timing.emphasisSettle], [0, 1, 0.42]);
          const entrance = Math.min(1, Math.max(0, spring({
            frame: frame - index * timing.entranceStagger,
            fps,
            durationInFrames: Math.round(timing.entranceDuration),
            config: filmTheme.spring,
          })));
          const label = labelPositions[index];

          return (
            <g key={stages[index]}>
              <circle
                cx={point.x}
                cy={point.y}
                r={22 + emphasis * 4}
                fill={colors.background}
                stroke={colors.foreground}
                strokeOpacity={0.28 + emphasis * 0.5}
                strokeWidth={1 + emphasis * 1.2}
              />
              <g opacity={entrance} transform={`translate(${point.x} ${point.y + (1 - entrance) * 12}) scale(${0.65 + entrance * 0.35})`}>
                <circle
                r={8 + emphasis * 2}
                fill={index < 2 ? colors.lime : index < 4 ? colors.blue : colors.copper}
                />
              </g>
              <text
                x={label.x}
                y={label.y}
                fill={colors.foreground}
                fillOpacity={0.68 + emphasis * 0.32}
                fontFamily={fonts.display}
                fontSize="42"
                fontWeight="600"
                textAnchor="middle"
              >
                {stages[index]}
              </text>
              <text
                x={point.x}
                y={point.y - 46}
                fill={colors.foreground}
                fillOpacity={0.5 + emphasis * 0.3}
                fontFamily={fonts.label}
                fontSize="22"
                textAnchor="middle"
              >
                {String(index + 1).padStart(2, "0")}
              </text>
            </g>
          );
        })}

        <g opacity={signalOpacity}>
          <circle cx={signal.x} cy={signal.y} r="18" fill={colors.foreground} fillOpacity="0.16" />
          <circle cx={signal.x} cy={signal.y} r="7" fill={colors.foreground} />
        </g>
      </svg>

      <div
        style={{
          position: "absolute",
          top: 54,
          left: 82,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          opacity: 1,
        }}
      >
        <div style={{ color: colors.lime, fontFamily: fonts.label, fontSize: 20, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Living architecture
        </div>
        <div style={{ width: 900, fontFamily: fonts.display, fontSize: 64, fontWeight: 540, letterSpacing: "-0.055em", lineHeight: 0.94 }}>
          From pressure to a system<br />teams can own.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: 82,
          bottom: 25,
          color: colors.foreground,
          fontFamily: fonts.label,
          fontSize: 19,
          letterSpacing: "0.08em",
          opacity: 0.62,
          textTransform: "uppercase",
        }}
      >
        clear · operable · portable
      </div>
      <AbsoluteFill style={{ background: `linear-gradient(125deg, ${colors.lime}05, transparent 50%, ${colors.copper}06)`, pointerEvents: "none" }} />
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.018, pointerEvents: "none" }}>
        <filter id="film-grain"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="2" seed="8" stitchTiles="stitch" /></filter>
        <rect width="100%" height="100%" filter="url(#film-grain)" />
      </svg>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 45%, ${colors.vignette} 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
}
