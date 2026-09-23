export const routeMotifKeys = [
  "work",
  "capabilities",
  "method",
  "decisions",
  "about",
  "credentials",
  "proof",
  "models",
  "case-study",
] as const;

export type RouteMotifKey = (typeof routeMotifKeys)[number];

const routeMotifKeySet = new Set<string>(routeMotifKeys);

export function resolveRouteMotif(route?: string): RouteMotifKey | undefined {
  return route && routeMotifKeySet.has(route)
    ? (route as RouteMotifKey)
    : undefined;
}

function FieldGuides() {
  return (
    <g className="route-motif__guides">
      <path d="M44 72H596M44 180H596M44 288H596" />
      <path d="M112 38V322M320 38V322M528 38V322" />
    </g>
  );
}

function WorkMotif() {
  return (
    <>
      <path
        className="route-motif__path route-motif__path--primary route-motif__draw route-motif__draw--1"
        d="M66 268C125 268 139 217 194 217S260 119 320 119s83 90 142 90 63-108 118-108"
        pathLength="1"
      />
      <g className="route-motif__branches">
        <path d="M194 217l-43-59M194 217l32 55" />
        <path d="M320 119l-38-55M320 119l50-42" />
        <path d="M462 209l-30 65M462 209l58 39" />
        <path d="M580 101l-42-42" />
      </g>
      <g className="route-motif__nodes">
        <circle className="route-motif__node route-motif__node--quiet" cx="66" cy="268" r="5" />
        <circle className="route-motif__node route-motif__node--core" cx="194" cy="217" r="12" />
        <circle className="route-motif__node route-motif__node--core" cx="320" cy="119" r="14" />
        <circle className="route-motif__node route-motif__node--core" cx="462" cy="209" r="12" />
        <circle className="route-motif__node route-motif__node--core" cx="580" cy="101" r="10" />
        <circle className="route-motif__node route-motif__node--accent" cx="151" cy="158" r="5" />
        <rect className="route-motif__node route-motif__node--accent" x="220" y="266" width="12" height="12" rx="2" />
        <path className="route-motif__node route-motif__node--accent" d="m282 64 7-7 7 7-7 7Z" />
        <path className="route-motif__node route-motif__node--accent" d="m370 69 8 14h-16Z" />
        <circle className="route-motif__node route-motif__node--accent" cx="432" cy="274" r="6" />
        <rect className="route-motif__node route-motif__node--accent" x="514" y="242" width="12" height="12" rx="6" />
        <path className="route-motif__node route-motif__node--accent" d="m538 59 7-7 7 7-7 7Z" />
      </g>
    </>
  );
}

function CapabilitiesMotif() {
  const nodes = [
    [320, 48],
    [438, 83],
    [514, 180],
    [438, 277],
    [320, 312],
    [202, 277],
    [126, 180],
    [202, 83],
  ] as const;

  return (
    <>
      <g className="route-motif__orbits">
        <ellipse cx="320" cy="180" rx="194" ry="132" />
        <ellipse cx="320" cy="180" rx="132" ry="194" transform="rotate(58 320 180)" />
      </g>
      <g className="route-motif__branches">
        {nodes.map(([x, y]) => <path d={`M320 180L${x} ${y}`} key={`${x}-${y}`} />)}
      </g>
      <circle className="route-motif__halo" cx="320" cy="180" r="43" />
      <circle className="route-motif__node route-motif__node--core" cx="320" cy="180" r="16" />
      <g className="route-motif__nodes">
        {nodes.map(([x, y], index) => (
          index % 2 === 0
            ? <circle className="route-motif__node route-motif__node--accent" cx={x} cy={y} r="7" key={`${x}-${y}`} />
            : <rect className="route-motif__node route-motif__node--accent" x={x - 6} y={y - 6} width="12" height="12" rx="2" key={`${x}-${y}`} />
        ))}
      </g>
      <path
        className="route-motif__path route-motif__path--accent route-motif__draw route-motif__draw--2"
        d="M126 180C177 83 252 48 320 48s147 35 194 132-31 132-194 132-143-35-194-132Z"
        pathLength="1"
      />
    </>
  );
}

function MethodMotif() {
  const points = [
    [88, 280],
    [220, 226],
    [346, 145],
    [548, 76],
  ] as const;

  return (
    <>
      <g className="route-motif__measures">
        {points.map(([x, y]) => <path d={`M${x} ${y}V314`} key={`${x}-${y}`} />)}
      </g>
      <path
        className="route-motif__path route-motif__path--primary route-motif__draw route-motif__draw--1"
        d="M54 302C102 297 144 263 220 226s80-43 126-81 120-47 202-69"
        pathLength="1"
      />
      <g className="route-motif__nodes">
        {points.map(([x, y], index) => (
          <g className="route-motif__checkpoint" key={`${x}-${y}`}>
            <circle className="route-motif__halo" cx={x} cy={y} r={20 + index * 2} />
            <circle className="route-motif__node route-motif__node--core" cx={x} cy={y} r="8" />
            <path className="route-motif__tick" d={`M${x - 14} ${y - 32}h28`} />
          </g>
        ))}
      </g>
      <path className="route-motif__path route-motif__path--accent" d="m548 76 31-24m-31 24 38 5" />
    </>
  );
}

function DecisionsMotif() {
  return (
    <>
      <path className="route-motif__path route-motif__path--primary" d="M58 249C137 249 154 180 226 180" />
      <g className="route-motif__branches">
        <path d="M226 180C294 180 314 79 389 79S478 114 578 114" />
        <path d="M226 180C303 180 313 180 389 180s95-27 189-27" />
        <path d="M226 180C294 180 314 281 389 281s89-79 189-79" />
      </g>
      <path
        className="route-motif__path route-motif__path--accent route-motif__draw route-motif__draw--2"
        d="M58 249C137 249 154 180 226 180 303 180 313 180 389 180s95-27 189-27"
        pathLength="1"
      />
      <g className="route-motif__nodes">
        <circle className="route-motif__node route-motif__node--quiet" cx="58" cy="249" r="6" />
        <circle className="route-motif__node route-motif__node--core" cx="226" cy="180" r="13" />
        <path className="route-motif__node route-motif__node--accent" d="m389 166 14 14-14 14-14-14Z" />
        <circle className="route-motif__node route-motif__node--quiet" cx="389" cy="79" r="8" />
        <circle className="route-motif__node route-motif__node--quiet" cx="389" cy="281" r="8" />
        <circle className="route-motif__node route-motif__node--accent" cx="578" cy="153" r="9" />
      </g>
      <path className="route-motif__decision-mark" d="m212 180 9 9 18-24" />
    </>
  );
}

function AboutMotif() {
  return (
    <>
      <g className="route-motif__orbits">
        <ellipse cx="253" cy="180" rx="155" ry="105" transform="rotate(-18 253 180)" />
        <ellipse cx="388" cy="180" rx="155" ry="105" transform="rotate(18 388 180)" />
        <path d="M320 50c-93 58-93 202 0 260M320 50c93 58 93 202 0 260" />
      </g>
      <path
        className="route-motif__path route-motif__path--accent route-motif__draw route-motif__draw--1"
        d="M93 215C164 104 252 106 320 180s164 70 227-42"
        pathLength="1"
      />
      <g className="route-motif__branches">
        <path d="M161 145 122 97M238 129l-16-65M403 225l35 64M481 201l58 38" />
      </g>
      <g className="route-motif__nodes">
        <circle className="route-motif__node route-motif__node--quiet" cx="93" cy="215" r="6" />
        <circle className="route-motif__node route-motif__node--accent" cx="161" cy="145" r="8" />
        <circle className="route-motif__node route-motif__node--accent" cx="238" cy="129" r="6" />
        <circle className="route-motif__node route-motif__node--core" cx="320" cy="180" r="16" />
        <rect className="route-motif__node route-motif__node--accent" x="397" y="219" width="12" height="12" rx="2" />
        <circle className="route-motif__node route-motif__node--accent" cx="481" cy="201" r="8" />
        <circle className="route-motif__node route-motif__node--quiet" cx="547" cy="138" r="6" />
      </g>
    </>
  );
}

function CredentialsMotif() {
  const nodes = [
    [128, 128], [178, 75], [218, 154], [145, 216], [248, 238],
    [342, 92], [400, 137], [463, 82], [494, 166], [377, 214],
    [294, 278], [368, 308], [452, 282], [522, 238], [564, 303],
  ] as const;

  return (
    <>
      <path
        className="route-motif__path route-motif__path--accent route-motif__draw route-motif__draw--1"
        d="M60 272C144 306 131 102 225 121s63 190 161 165 82-198 178-153"
        pathLength="1"
      />
      <g className="route-motif__orbits">
        <circle cx="184" cy="151" r="91" />
        <circle cx="411" cy="151" r="103" />
        <circle cx="432" cy="274" r="82" />
      </g>
      <g className="route-motif__branches">
        {nodes.map(([x, y]) => <path d={`M320 180L${x} ${y}`} key={`${x}-${y}`} />)}
      </g>
      <g className="route-motif__nodes">
        {nodes.map(([x, y], index) => (
          index % 3 === 0
            ? <circle className="route-motif__node route-motif__node--accent" cx={x} cy={y} r="6" key={`${x}-${y}`} />
            : index % 3 === 1
              ? <rect className="route-motif__node route-motif__node--accent" x={x - 5} y={y - 5} width="10" height="10" rx="2" key={`${x}-${y}`} />
              : <path className="route-motif__node route-motif__node--accent" d={`M${x} ${y - 6}l6 6-6 6-6-6Z`} key={`${x}-${y}`} />
        ))}
      </g>
      <circle className="route-motif__halo" cx="320" cy="180" r="34" />
      <circle className="route-motif__node route-motif__node--core" cx="320" cy="180" r="12" />
    </>
  );
}

function ProofMotif() {
  return (
    <>
      <g className="route-motif__source-stack">
        <rect x="55" y="82" width="108" height="50" rx="8" />
        <rect x="55" y="155" width="108" height="50" rx="8" />
        <rect x="55" y="228" width="108" height="50" rx="8" />
      </g>
      <g className="route-motif__branches">
        <path d="M163 107C232 107 212 180 284 180" />
        <path d="M163 180H284" />
        <path d="M163 253C232 253 212 180 284 180" />
        <path d="M356 180H465" />
      </g>
      <circle className="route-motif__halo" cx="320" cy="180" r="42" />
      <path className="route-motif__node route-motif__node--core" d="m320 159 21 21-21 21-21-21Z" />
      <path
        className="route-motif__path route-motif__path--accent route-motif__draw route-motif__draw--2"
        d="M55 107h108c69 0 49 73 121 73h72 109"
        pathLength="1"
      />
      <g className="route-motif__proof-output">
        <circle cx="516" cy="180" r="51" />
        <circle className="route-motif__node route-motif__node--accent" cx="516" cy="180" r="11" />
        <path d="m500 180 10 10 23-27" />
      </g>
    </>
  );
}

function ModelsMotif() {
  return (
    <>
      <g className="route-motif__braid">
        <path d="M55 83C174 83 213 265 350 180s133-66 230-66" />
        <path d="M55 145c110 0 165-62 295 35s149 35 230 35" />
        <path d="M55 215c110 0 165 62 295-35s149-35 230-35" />
        <path d="M55 277c119 0 158-182 295-97s133 66 230 66" />
      </g>
      <path
        className="route-motif__path route-motif__path--accent route-motif__draw route-motif__draw--1"
        d="M55 83C174 83 213 265 350 180s133-66 230-66"
        pathLength="1"
      />
      <g className="route-motif__model-inputs">
        <circle className="route-motif__node route-motif__node--accent" cx="55" cy="83" r="8" />
        <rect className="route-motif__node route-motif__node--accent" x="48" y="138" width="14" height="14" rx="2" />
        <path className="route-motif__node route-motif__node--accent" d="m55 207 9 15H46Z" />
        <path className="route-motif__node route-motif__node--accent" d="m55 266 11 11-11 11-11-11Z" />
      </g>
      <circle className="route-motif__halo" cx="350" cy="180" r="36" />
      <circle className="route-motif__node route-motif__node--core" cx="350" cy="180" r="13" />
      <g className="route-motif__nodes">
        <circle className="route-motif__node route-motif__node--quiet" cx="580" cy="114" r="7" />
        <circle className="route-motif__node route-motif__node--quiet" cx="580" cy="145" r="7" />
        <circle className="route-motif__node route-motif__node--quiet" cx="580" cy="215" r="7" />
        <circle className="route-motif__node route-motif__node--quiet" cx="580" cy="246" r="7" />
      </g>
    </>
  );
}

function CaseStudyMotif() {
  return (
    <>
      <g className="route-motif__case-inputs">
        <circle cx="74" cy="112" r="9" />
        <circle cx="74" cy="180" r="9" />
        <circle cx="74" cy="248" r="9" />
      </g>
      <g className="route-motif__branches">
        <path d="M83 112c84 0 78 68 137 68M83 180h137M83 248c84 0 78-68 137-68" />
        <path d="M420 180h65M485 180l55-69M485 180l55 69" />
      </g>
      <rect className="route-motif__system" x="220" y="105" width="200" height="150" rx="28" />
      <path
        className="route-motif__path route-motif__path--accent route-motif__draw route-motif__draw--2"
        d="M83 180h137c38 0 61-35 100-35s62 35 100 35h65l55-69"
        pathLength="1"
      />
      <g className="route-motif__system-core">
        <circle className="route-motif__halo" cx="320" cy="180" r="44" />
        <circle className="route-motif__node route-motif__node--core" cx="320" cy="180" r="13" />
        <path d="M277 180h86M320 137v86" />
      </g>
      <circle className="route-motif__node route-motif__node--accent" cx="540" cy="111" r="11" />
      <circle className="route-motif__node route-motif__node--quiet" cx="540" cy="249" r="11" />
    </>
  );
}

function MotifArt({ route }: { readonly route: RouteMotifKey }) {
  switch (route) {
    case "work": return <WorkMotif />;
    case "capabilities": return <CapabilitiesMotif />;
    case "method": return <MethodMotif />;
    case "decisions": return <DecisionsMotif />;
    case "about": return <AboutMotif />;
    case "credentials": return <CredentialsMotif />;
    case "proof": return <ProofMotif />;
    case "models": return <ModelsMotif />;
    case "case-study": return <CaseStudyMotif />;
  }
}

export default function RouteMotif({ route }: { readonly route: RouteMotifKey }) {
  return (
    <div
      className={`route-motif route-motif--${route}`}
      data-route-motif={route}
      aria-hidden="true"
    >
      <svg
        className="route-motif__svg"
        viewBox="0 0 640 360"
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
      >
        <FieldGuides />
        <g className="route-motif__art">
          <MotifArt route={route} />
        </g>
      </svg>
    </div>
  );
}
