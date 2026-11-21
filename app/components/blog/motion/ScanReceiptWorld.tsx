import { motionStories } from "@/app/data/article-motion";
import { between, chapterAt } from "@/app/components/blog/motion/story-timing";

type Palette = typeof motionStories["zero-findings"];
const chapters = motionStories["zero-findings"].chapters;
const face = '"Instrument Sans", Arial, sans-serif';
const receipts = [
  { scan: "A", coverage: "3 of 3 ran", gap: "Infrastructure ran", freshness: "Within age limit", decision: "Review within scope" },
  { scan: "B", coverage: "2 of 3 ran", gap: "Infrastructure: not run", freshness: "Past age limit", decision: "Follow up" },
] as const;
const stageLabels = ["01 / FINDINGS", "02 / COVERAGE", "03 / FRESHNESS", "04 / NEXT STEP"];

function band(frame: number, chapter: number, side: number) {
  const beat = chapters[chapter];
  const start = beat.start + side * 5;
  return frame < start ? 0 : .24 + .76 * between(frame, start, beat.frame);
}

export function ScanReceiptWorld({ p, frame, id }: { p: Palette; frame: number; id: string }) {
  const active = chapterAt(frame, "zero-findings");
  const beat = chapters[active];
  const settle = between(frame, beat.frame, beat.end);
  return <g fontFamily={face} fontWeight="660" fill={p.ink}>
    <text x="96" y="116" fontSize="34" letterSpacing="3">{stageLabels[active]}</text>
    <text x="1184" y="116" fontSize="32" textAnchor="end">Illustrative scans</text>
    {receipts.map((item, i) => {
      const enter = between(frame, i * 5, chapters[0].frame);
      const coverage = band(frame, 1, i);
      const freshness = band(frame, 2, i);
      const decision = band(frame, 3, i);
      const x = 96 + i * 560 + (i ? 1 : -1) * (22 * (1 - enter) + 8 * settle);
      const height = 194 + 130 * coverage + 105 * freshness + 95 * decision;
      const edge = i ? p.accent : p.material;
      const clip = id + "-receipt-" + item.scan;
      return <g key={item.scan} data-scan-receipt={item.scan} transform={`translate(${x} ${156 + (1 - enter) * 20}) scale(${.97 + .03 * enter})`} opacity={.6 + .4 * enter}>
        <rect x="9" y="12" width="526" height={height} rx="16" fill={p.ink} opacity=".13" />
        <rect width="526" height={height} rx="16" fill={p.paper} stroke={p.ink} strokeWidth="2" />
        <clipPath id={clip}><rect width="526" height={height} rx="16" /></clipPath>
        <g clipPath={`url(#${clip})`}>
        <path d="M24 112h478" stroke={p.ink} strokeOpacity=".28" />
        <text x="28" y="65" fontSize="38" data-mobile-label="">Scan {item.scan}</text>
        <text x="500" y="82" fontSize="66" textAnchor="end" fontWeight="760" data-mobile-label="">0 findings</text>
        <rect x="28" y="139" width={55 + 158 * settle} height="7" rx="3" fill={edge} />
        <text x="28" y="176" fontSize="30">Reported findings</text>
        {active >= 1 && <g data-scan-layer="coverage" opacity={coverage} transform={`translate(0 ${8 * (1 - coverage)})`}>
          <rect x="24" y="206" width="478" height="102" rx="9" fill={edge} fillOpacity={i ? ".7" : ".85"} stroke={p.ink} strokeWidth={2 + 3 * (active === 1 && i === 1 ? settle : 0)} strokeDasharray={i ? "7 5" : undefined} />
          <text x="44" y="249" fontSize="41">{item.coverage}</text>
          <text x="44" y="288" fontSize="34">{item.gap}</text>
        </g>}
        {active >= 2 && <g data-scan-layer="freshness" opacity={freshness} transform={`translate(0 ${8 * (1 - freshness)})`}>
          <path d="M28 333h470" stroke={p.ink} strokeOpacity=".27" />
          <text x="28" y="375" fontSize="30">Dependency data</text>
          <text x="28" y="415" fontSize="38" fontWeight="740">{item.freshness}</text>
          {active === 2 && i === 1 && <path d={`M29 427h${205 * settle}`} stroke={edge} strokeWidth="5" strokeLinecap="round" />}
        </g>}
        {active >= 3 && <g data-scan-layer="decision" opacity={decision} transform={`translate(0 ${8 * (1 - decision)})`}>
          <rect x="24" y="446" width="478" height="59" rx="9" fill={edge} />
          <text x="44" y="486" fontSize="35" fontWeight="750">{item.decision}</text>
        </g>}
        </g>
      </g>;
    })}
  </g>;
}
