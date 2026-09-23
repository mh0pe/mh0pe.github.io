import type {
  CaseStudy,
  DeliveryState,
} from "../../data/portfolio-v2";

type SignalState = Lowercase<DeliveryState> | "mixed";

const signalWidth = 438;
const signalHeight = 136;
const signalStartX = 34;
const signalStepX = 74;

function stageState(
  caseStudy: CaseStudy,
  claimIds: readonly string[] | undefined,
): SignalState {
  const claims = caseStudy.claims.filter((claim) =>
    claimIds?.includes(claim.id),
  );
  const states = new Set(claims.map((claim) => claim.state));
  const [onlyState] = states;

  if (states.size !== 1 || !onlyState) {
    return "mixed";
  }

  return onlyState.toLowerCase() as Lowercase<DeliveryState>;
}

function stateOffset(state: SignalState): number {
  if (state === "released") return -6;
  if (state === "merged") return -3;
  if (state === "open") return 7;
  if (state === "prototype") return 10;
  return 0;
}

export default function CaseSignal({
  caseStudy,
}: {
  readonly caseStudy: CaseStudy;
}) {
  const nodes = caseStudy.stages.map((stage, index) => {
    const sourceCount = new Set(stage.sourceIds).size;
    const state = stageState(caseStudy, stage.claimIds);
    const evidenceLift = Math.min(sourceCount, 16) * 4;

    return {
      x: signalStartX + index * signalStepX,
      y: Math.max(30, Math.min(104, 108 - evidenceLift + stateOffset(state))),
      radius: Number(Math.min(8, 4 + Math.sqrt(sourceCount)).toFixed(2)),
      sourceCount,
      state,
    };
  });
  const route = nodes
    .map((node, index) => `${index === 0 ? "M" : "L"}${node.x} ${node.y}`)
    .join(" ");
  const gradientId = `case-signal-${caseStudy.id}`;

  return (
    <div
      className="case-signal"
      data-case-signal={caseStudy.id}
      aria-hidden="true"
    >
      <svg
        viewBox={`0 0 ${signalWidth} ${signalHeight}`}
        focusable="false"
        role="presentation"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--cyan)" />
            <stop offset="0.58" stopColor="var(--lime)" />
            <stop offset="1" stopColor="var(--coral)" />
          </linearGradient>
        </defs>
        <path className="case-signal__grid" d="M0 28H438M0 68H438M0 108H438" />
        {nodes.map((node) => (
          <path
            className="case-signal__stem"
            d={`M${node.x} ${node.y}V118`}
            key={`stem-${node.x}`}
          />
        ))}
        <path className="case-signal__underlay" d={route} />
        <path
          className="case-signal__trace"
          d={route}
          pathLength="1"
          stroke={`url(#${gradientId})`}
        />
        {nodes.map((node, index) => (
          <g
            className="case-signal__terminal"
            data-stage={caseStudy.stages[index].name.toLowerCase()}
            data-state={node.state}
            data-source-count={node.sourceCount}
            transform={`translate(${node.x} ${node.y})`}
            key={caseStudy.stages[index].name}
          >
            <circle className="case-signal__halo" r={node.radius + 6} />
            <circle className="case-signal__node" r={node.radius} />
          </g>
        ))}
      </svg>
    </div>
  );
}
