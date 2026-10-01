// The hash, gradient-noise and domain-warp construction is translated from
// OriginKit Satin Flow. See THIRD_PARTY_NOTICES.md for source and usage terms.
// This is a deterministic SVG interpretation, not the original WebGL renderer.
type Vector = readonly [number, number, number];
const dot = (a: Vector, b: Vector) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const fract = (n: number) => n - Math.floor(n);
const hashAxes: readonly Vector[] = [
  [127.1, 311.7, 74.7], [269.5, 183.3, 246.1], [113.5, 271.9, 124.6],
];

function noise(p: Vector) {
  const cell = p.map(Math.floor);
  const fraction = p.map(fract);
  const blend = fraction.map((n) => n * n * (3 - 2 * n));
  let value = 0;
  for (let corner = 0; corner < 8; corner++) {
    const bits = [corner & 1, (corner >> 1) & 1, (corner >> 2) & 1];
    const point = cell.map((n, i) => n + bits[i]) as unknown as Vector;
    const gradient = hashAxes.map((axis) => -1 + 2 * fract(Math.sin(dot(point, axis)) * 43758.5453123));
    const weight = blend.reduce((n, v, i) => n * (bits[i] ? v : 1 - v), 1);
    value += gradient.reduce((n, v, i) => n + v * (fraction[i] - bits[i]), 0) * weight;
  }
  return value;
}

function fbm(input: Vector) {
  let point = input;
  let value = 0;
  let amplitude = 0.5;
  for (let octave = 0; octave < 4; octave++) {
    value += amplitude * noise(point);
    point = point.map((n) => n * 2 + 100) as unknown as Vector;
    amplitude *= 0.5;
  }
  return value;
}

function fold(x: number, lane: number) {
  const p: Vector = [x / 520, lane * 0.16, 0.4];
  const n1 = fbm(p);
  const n2 = fbm([p[0] + n1 * 1.5, p[1] + n1 * 1.2, p[2] + 0.5]);
  const n3 = fbm([p[0] + n2 * 2, p[1] + n2, p[2] + 0.8]);
  return 260 + lane * 26 + Math.sin(x / 250 + n3 * 6.28) * 78 + n2 * 44;
}

function smooth(points: readonly (readonly [number, number])[], start: "M" | "L") {
  const coord = ([x, y]: readonly [number, number]) => `${x.toFixed(1)} ${y.toFixed(1)}`;
  let path = `${start}${coord(points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i];
    const p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    path += `C${coord([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${coord([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${coord(p2)}`;
  }
  return path;
}

// Six broad folds, 25 samples each. Computed once, with no browser simulation.
export const satinBands = Array.from({ length: 6 }, (_, lane) => {
  const points = Array.from({ length: 25 }, (_, i) => {
    const x = -80 + i * 40;
    return [x, fold(x, lane)] as const;
  });
  const path = smooth(points, "M");
  const returnPath = smooth([...points].reverse().map(([x, y]) => [x, y + 13 + lane * 3]), "L");
  return `${path} ${returnPath}Z`;
});

export default function SatinRibbon({ id }: { readonly id: string }) {
  return (
    <g className="satin-ribbon" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0.7">
          <stop className="satin-ribbon__shadow" offset="0" />
          <stop className="satin-ribbon__light" offset="0.55" />
          <stop className="satin-ribbon__shadow" offset="1" />
        </linearGradient>
      </defs>
      {satinBands.map((d, i) => <path key={i} d={d} fill={`url(#${id})`} opacity={0.32 + i * 0.09} />)}
    </g>
  );
}
