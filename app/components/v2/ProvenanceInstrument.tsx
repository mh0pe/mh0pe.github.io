import type { CaseStudy } from "../../data/portfolio-v2";
import { StatusStamp } from "./Evidence";

const terminals = [
  { x: 92, y: 108 },
  { x: 238, y: 184 },
  { x: 392, y: 120 },
  { x: 536, y: 252 },
  { x: 698, y: 178 },
  { x: 836, y: 92 },
] as const;

export default function ProvenanceInstrument({
  caseStudy,
}: {
  readonly caseStudy: CaseStudy;
}) {
  return (
    <figure
      className="provenance-instrument"
      data-visualization="provenance-cutaway"
      aria-labelledby="instrument-title instrument-caption"
    >
      <div className="instrument-header">
        <div>
          <p className="micro-label">Provenance instrument</p>
          <h2 id="instrument-title">Trace the operating result.</h2>
        </div>
        <span className="instrument-header__mode">Public source · 06 stages</span>
      </div>

      <svg
        className="instrument-drawing"
        viewBox="0 0 920 340"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="proof-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--cyan)" />
            <stop offset="0.58" stopColor="var(--lime)" />
            <stop offset="1" stopColor="var(--coral)" />
          </linearGradient>
          <pattern id="instrument-grid" width="46" height="46" patternUnits="userSpaceOnUse">
            <path d="M46 0H0V46" fill="none" stroke="currentColor" strokeOpacity="0.14" />
          </pattern>
        </defs>
        <rect className="instrument-grid" width="920" height="340" fill="url(#instrument-grid)" />
        <path
          className="instrument-cut-plane"
          d="M40 286L92 108L238 184L392 120L536 252L698 178L836 92L884 48"
        />
        <path
          className="instrument-proof-glow"
          d="M40 286L92 108L238 184L392 120L536 252L698 178L836 92L884 48"
          pathLength="1"
        />
        <path
          className="instrument-proof-line"
          d="M40 286L92 108L238 184L392 120L536 252L698 178L836 92L884 48"
          pathLength="1"
        />
        {terminals.map((terminal, index) => (
          <g
            className={`instrument-terminal instrument-terminal--${index + 1}`}
            transform={`translate(${terminal.x} ${terminal.y})`}
            key={caseStudy.stages[index].name}
            data-stage-terminal={caseStudy.stages[index].name.toLowerCase()}
          >
            <circle className="instrument-terminal__pulse" r="25" />
            <circle className="instrument-terminal__shell" r="18" />
            <circle className="instrument-terminal__core" r="5" />
            <path d="M-27 0H-18M18 0H27M0-27V-18M0 18V27" />
            <text x="0" y="-36" textAnchor="middle">
              {caseStudy.stages[index].index}
            </text>
          </g>
        ))}
        <path className="instrument-registration" d="M24 24H62M43 5V43M858 314H896M877 295V333" />
        <text className="instrument-coordinate" x="68" y="320">OUTCOME / {caseStudy.id}</text>
        <text className="instrument-coordinate" x="690" y="320">SOURCE / GITHUB</text>
      </svg>

      <ol className="instrument-ledger">
        {caseStudy.stages.map((stage) => {
          const matchingClaims = caseStudy.claims.filter((candidate) =>
            stage.claimIds?.includes(candidate.id),
          );
          const stageClaims =
            matchingClaims.length > 0 ? matchingClaims : [caseStudy.claims[0]];
          const states = new Set(stageClaims.map((claim) => claim.state));
          const state = stageClaims[0].state;

          return (
            <li
              key={stage.name}
              data-claim-ref={stageClaims.map((claim) => claim.id).join(" ")}
            >
              <a href={`/work/${caseStudy.id}/#stage-${stage.name.toLowerCase()}`}>
                <span className="instrument-ledger__index">{stage.index}</span>
                <span>
                  <strong>{stage.name}</strong>
                  <small>{stage.title}</small>
                </span>
                {states.size === 1 ? (
                  <StatusStamp state={state} />
                ) : (
                  <span className="status-stamp" data-state="mixed">
                    <span aria-hidden="true" className="status-stamp__mark" />
                    Mixed
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ol>
      <figcaption id="instrument-caption">
        A curated causal path from operating pressure to public proof. It is an architectural reading, not literal Git ancestry.
      </figcaption>
    </figure>
  );
}
