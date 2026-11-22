import { motionStories } from "@/app/data/article-motion";
import { between, chapterAt } from "./story-timing";

type LabProps = { p: typeof motionStories["slowest-shard"]; frame: number };
const widths = [260,232,220,148,126,120,100,82,62];
const lanes = [[0,1,2],[3,4,5],[6,7,8]];
const assigned = [[0,5,8],[1,4,7],[2,3,6]];
const offsets = (order: number[][]) => {
  const result: [number, number][] = [];
  order.forEach((lane, row) => {
    let x = 250;
    for (const tile of lane) { result[tile] = [x, 237 + row * 127]; x += widths[tile] + 9; }
  });
  return result;
};
const before = offsets(lanes), after = offsets(assigned);
const starts = [0, 300, 650], poses = [70, 430, 820], ends = [300, 650, 900];

export function ShardWorld({ p, frame }: LabProps) {
  const stage = chapterAt(frame, "slowest-shard");
  const settle = between(frame, poses[stage], ends[stage]);
  return <g fill={p.ink} fontFamily="Instrument Sans, Arial, sans-serif" fontWeight="650">
    <text x="102" y="145" fontSize="48" data-mobile-label="">{["Split by name", "Place the long tests first", "Keep every test"][stage]}</text>
    {lanes.map((_, i) => <g key={i}>
      <text x="103" y={274 + i * 127} fontSize="31">Worker {i + 1}</text>
      <rect x="235" y={222 + i * 127} width="932" height="87" rx="14" fill={p.paper} stroke={p.ink} strokeOpacity=".22" />
    </g>)}
    {widths.map((w, i) => {
      const place = stage ? between(frame, 300 + i * 6, 428) : 0;
      const [x, y] = before[i].map((start, axis) => start + (after[i][axis] - start) * place);
      const seat = stage === 1 ? (i < 3 ? -18 : 9) * (1 - between(frame, 430 + i * 4, 545 + i * 4))
        : stage === 2 ? -9 * (1 - between(frame, 650 + i * 4, 820)) : 0;
      return <g key={i} data-test-tile={i} transform={`translate(${x} ${y + seat + 9 * (1 - between(frame, i * 5, 70))})`}>
        <rect width={w} height="55" rx="9" fill={i < 3 ? p.accent : p.material} stroke={p.ink} strokeWidth={stage === 2 ? 1 + settle * 3 : 1} />
        <text x="15" y="37" fontSize="28">{String.fromCharCode(65 + i)}</text>
      </g>;
    })}
    <path d={`M${stage ? 736 : 982} 217v${395 * (.88 + .12 * settle)}`} stroke={p.ink} strokeWidth="3" strokeDasharray="8 9" />
    <text x="103" y="687" fontSize="36">{stage === 2 ? "Each block appears once." : "The dashed line marks the last worker to finish."}</text>
  </g>;
}

const matrix = ["Older SDK", "Newer SDK", "Newer SDK"];
export function CompatibilityWorld({ p, frame }: LabProps) {
  const stage = chapterAt(frame, "support-is-a-matrix");
  const settle = between(frame, poses[stage], ends[stage]);
  return <g fill={p.ink} fontFamily="Instrument Sans, Arial, sans-serif" fontWeight="650">
    <text x="100" y="147" fontSize="48" data-mobile-label="">{["SDK version", "Component + chip", "What the build proves"][stage]}</text>
    {["SDK version", "Component", "Chip capability", "Build check"].map((title, i) =>
      <text key={title} x={206 + i * 287} y="229" fontSize="30" textAnchor="middle">{title}</text>)}
    {matrix.map((version, row) => [version, "Camera on", row === 1 ? "CSI available" : "No CSI", row === 1 ? "Included" : "No CSI check"].map((label, col) => {
      const active = stage === 0 ? col === 0 : stage === 1 ? col === 1 || col === 2 : col === 3;
      const excluded = row !== 1 && col === 3;
      const slide = 14 * (1 - between(frame, starts[stage] + (col + row) * 5, poses[stage]));
      return <g key={row + "-" + col} data-compat-cell={row + "-" + col} transform={`translate(${84 + col * 287} ${265 + row * 111 + slide})`}>
        <rect width="244" height="80" rx="10" fill={active && !excluded ? p.accent : p.paper} stroke={p.ink} strokeDasharray={excluded ? "7 6" : undefined} strokeWidth={active ? 2 + settle : 1} />
        <text x="122" y="51" textAnchor="middle" fontSize="30">{label}</text>
      </g>;
    }))}
    <text x="100" y="683" fontSize="35">Build coverage does not certify a board.</text>
  </g>;
}
