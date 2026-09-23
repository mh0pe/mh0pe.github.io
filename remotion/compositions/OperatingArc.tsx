import {
  AbsoluteFill,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

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

const signalStartFrame = 10;
const signalSegmentFrames = 20;

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
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function signalProgressAtFrame(frame: number) {
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
  const { durationInFrames } = useVideoConfig();
  const signalProgress = signalProgressAtFrame(frame);
  const finalSegmentFrame =
    signalStartFrame + (curves.length - 1) * signalSegmentFrames;
  const signalEndFrame = signalStartFrame + curves.length * signalSegmentFrames;
  const finalGlow = ease(
    frame,
    [finalSegmentFrame, signalEndFrame, durationInFrames - 1],
    [0.02, 0.62, 0.62],
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
        backgroundColor: "#0b100e",
        color: "#f3efe6",
        fontFamily: '"Instrument Motion", Arial, sans-serif',
        overflow: "hidden",
      }}
    >
      <style>{`@font-face { font-family: "Instrument Motion"; src: url("${staticFile("fonts/instrument-sans-variable.woff2")}") format("woff2"); font-weight: 400 700; }`}</style>
      <svg
        viewBox="0 0 1200 675"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <defs>
          <linearGradient id="arc" x1="0" x2="1">
            <stop offset="0" stopColor="#b7cf61" />
            <stop offset="0.58" stopColor="#93a6ff" />
            <stop offset="1" stopColor="#ef9877" />
          </linearGradient>
          <radialGradient id="glow">
            <stop offset="0" stopColor="#ef9877" stopOpacity={finalGlow} />
            <stop offset="1" stopColor="#ef9877" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g opacity="0.1" stroke="#f3efe6" strokeWidth="1">
          <path d="M68 210H1132" />
          <path d="M68 600H1132" />
        </g>

        <circle cx="180" cy="475" r="150" fill="url(#glow)" />
        <path d={path} fill="none" stroke="#f3efe6" strokeOpacity="0.12" strokeWidth="12" />
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
            ? ease(frame, [arrival - 8, arrival + 8], [0, 1])
            : ease(frame, [arrival - 8, arrival + 4, arrival + 18], [0, 1, 0.42]);
          const label = labelPositions[index];

          return (
            <g key={stages[index]}>
              <circle
                cx={point.x}
                cy={point.y}
                r={22 + emphasis * 4}
                fill="#0b100e"
                stroke="#f3efe6"
                strokeOpacity={0.28 + emphasis * 0.5}
                strokeWidth={1 + emphasis * 1.2}
              />
              <circle
                cx={point.x}
                cy={point.y}
                r={8 + emphasis * 2}
                fill={index < 2 ? "#b7cf61" : index < 4 ? "#93a6ff" : "#ef9877"}
              />
              <text
                x={label.x}
                y={label.y}
                fill="#f3efe6"
                fillOpacity={0.68 + emphasis * 0.32}
                fontFamily='"Instrument Motion", Arial, sans-serif'
                fontSize="42"
                fontWeight="600"
                textAnchor="middle"
              >
                {stages[index]}
              </text>
              <text
                x={point.x}
                y={point.y - 46}
                fill="#f3efe6"
                fillOpacity={0.5 + emphasis * 0.3}
                fontFamily="monospace"
                fontSize="22"
                textAnchor="middle"
              >
                {String(index + 1).padStart(2, "0")}
              </text>
            </g>
          );
        })}

        <circle cx={signal.x} cy={signal.y} r="18" fill="#f3efe6" fillOpacity="0.16" />
        <circle cx={signal.x} cy={signal.y} r="7" fill="#f3efe6" />
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
        <div style={{ color: "#b7cf61", fontFamily: "monospace", fontSize: 20, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Living architecture
        </div>
        <div style={{ width: 900, fontFamily: '"Instrument Motion", Arial, sans-serif', fontSize: 64, fontWeight: 540, letterSpacing: "-0.055em", lineHeight: 0.94 }}>
          From pressure to a system<br />teams can own.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: 82,
          bottom: 25,
          color: "#f3efe6",
          fontFamily: "monospace",
          fontSize: 19,
          letterSpacing: "0.08em",
          opacity: 0.62,
          textTransform: "uppercase",
        }}
      >
        clear · operable · portable
      </div>
    </AbsoluteFill>
  );
}
