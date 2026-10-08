import type { CSSProperties, ReactNode } from "react";
import type { BlogArticle } from "../../data/blog";
import { artFor, artStyle, type ArticleArtDirection, type ArtMoment } from "../../data/article-art";

function Move({ children, x = 0, y = 0, order = 0, kind = "gather" }: {
  readonly children: ReactNode; readonly x?: number; readonly y?: number;
  readonly order?: number; readonly kind?: string;
}) {
  return <g transform={`translate(${x} ${y})`}><g className="article-art__move" data-art-motion={kind}
    style={{ "--art-order": order, "--art-dx": `${(order % 3 - 1) * 38}px`, "--art-dy": `${order % 2 ? -32 : 26}px`, "--art-turn": `${order % 2 ? -9 : 7}deg` } as CSSProperties}>{children}</g></g>;
}

function Label({ x, y, children, small = false, light = false, anchor = "start" }: {
  readonly x: number; readonly y: number; readonly children: ReactNode;
  readonly small?: boolean; readonly light?: boolean; readonly anchor?: "start" | "middle" | "end";
}) {
  return <text className={`article-art__label${small ? " article-art__label--small" : ""}${light ? " article-art__label--light" : ""}`} x={x} y={y} textAnchor={anchor}>{children}</text>;
}

function Rules({ x = 0, y = 0, width = 130, count = 4 }: { readonly x?: number; readonly y?: number; readonly width?: number; readonly count?: number }) {
  return <g className="article-art__rules">{Array.from({ length: count }, (_, i) => <path key={i} d={`M${x} ${y + i * 18}h${width * (i === count - 1 ? .66 : 1)}`} />)}</g>;
}

function Paper({ width = 148, height = 184, tone = "light", children }: {
  readonly width?: number; readonly height?: number; readonly tone?: "light" | "pop" | "paper"; readonly children?: ReactNode;
}) {
  return <><path className="article-art__shadow" d={`M12 12h${width}v${height}H12z`} />
    <rect className={`article-art__material article-art__material--${tone}`} width={width} height={height} rx="3" />
    {children}</>;
}

function Check({ x, y, size = 22 }: { readonly x: number; readonly y: number; readonly size?: number }) {
  return <path className="article-art__check" d={`M${x} ${y + size * .5}l${size * .34} ${size * .34}l${size * .72} ${-size * .84}`} />;
}

// A bounded SVG interpretation of OriginKit Pulse Lines. The original dash/gap
// construction is retained; the infinite effect and client size measurement are not.
function Pulse({ d, order = 0 }: { readonly d: string; readonly order?: number }) {
  return <g><path className="article-art__track" d={d} /><path className="article-art__pulse" d={d} pathLength="100" style={{ "--art-order": order } as CSSProperties} /></g>;
}

function RegistrationMark({ x, y }: { readonly x: number; readonly y: number }) {
  return <g className="article-art__registration"><circle cx={x} cy={y} r="11" /><path d={`M${x - 19} ${y}h38M${x} ${y - 19}v38`} /></g>;
}

function SharedReports({ moment }: { readonly moment: ArtMoment }) {
  if (moment === "cover") return <>
    <path className="article-art__wash" d="M0 310 640 115v305H0z" />
    {[{ x: 68, y: 56, label: "A", tone: "light" }, { x: 236, y: 76, label: "S", tone: "pop" }, { x: 404, y: 96, label: "I", tone: "paper" }].map((p, i) => <Move key={p.label} x={p.x} y={p.y} order={i}>
      <Paper width={144} height={184} tone={p.tone as "light" | "pop" | "paper"} /><Label x={19} y={52}>{p.label}</Label><Rules x={19} y={83} width={104} />
    </Move>)}
    <Move x={112} y={268} order={3}><Paper width={408} height={104} tone="paper" />
      <Label x={20} y={38}>One report</Label>
      {["light", "pop", "paper"].map((t, i) => <rect key={t} className={`article-art__material article-art__material--${t}`} x={20 + 123 * i} y={59} width="108" height="23" rx="2" />)}
    </Move>
  </>;
  if (moment === "focus") return <>
    <Move x={80} y={64} kind="register"><path className="article-art__outline" d="M0 46V0h80m320 0h80v46m0 218v46h-80M80 310H0v-46" /></Move>
    {["Application", "Service", "Infrastructure"].map((label, i) => <Move key={label} x={116} y={95 + i * 83} order={i}>
      <rect className={`article-art__material article-art__material--${i === 1 ? "pop" : "light"}`} width="408" height="66" rx="3" />
      <Label x={23} y={42}>{label}</Label><Check x={361} y={24} size={21} />
    </Move>)}
  </>;
  return <>
    <Move x={91} y={45}><Paper width={458} height={326} tone="paper" /><Label x={26} y={55}>Shared report</Label>
      {["Application / path", "Service / path", "Infrastructure / path"].map((label, i) => <g key={label}>
        <rect className={`article-art__material article-art__material--${i === 1 ? "pop" : "light"}`} x={24} y={90 + i * 72} width="409" height="58" rx="2" />
        <Label x={43} y={127 + i * 72} small>{label}</Label>
      </g>)}
    </Move><Pulse d="M43 165H91M43 237H91M43 309H91" />
  </>;
}

function Editions({ moment }: { readonly moment: ArtMoment }) {
  if (moment === "cover") return <>
    <circle className="article-art__wash" cx="502" cy="201" r="202" />
    <Move x={43} y={104} order={0}><Paper width={185} height={229} tone="paper" />
      <Label x={22} y={48}>Define</Label><path className="article-art__emblem" d="M94 72 129 133 94 194 59 133z" /><Rules x={22} y={213} width={142} count={1} />
    </Move><Pulse d="M229 218H283" />
    {Array.from({ length: 15 }, (_, i) => <Move key={i} x={294 + i % 5 * 61} y={85 + Math.floor(i / 5) * 105} order={i % 5 + Math.floor(i / 5)} kind="unfold">
      <path className={`article-art__material article-art__material--${i % 3 === 1 ? "pop" : "light"}`} d={i % 3 === 0 ? "M0 0h42l9 13v62H0z" : i % 3 === 1 ? "M0 9h16l6-9h29v75H0z" : "M0 0h51v75H0z"} />
      <path className="article-art__emblem" d="m25 22 11 19-11 19-11-19z" />
    </Move>)}
  </>;
  if (moment === "focus") return <>
    {["Document", "Folder", "Plugin"].map((label, i) => <Move key={label} x={51 + i * 187} y={103} order={i} kind="unfold">
      <path className={`article-art__material article-art__material--${i === 1 ? "pop" : "light"}`} d={i === 0 ? "M0 0h123l27 28v175H0z" : i === 1 ? "M0 28h49l17-28h84v203H0z" : "M0 0h150v203H0z"} />
      <path className="article-art__emblem" d="m75 55 32 56-32 56-32-56z" />
      <Label x={75} y={242} anchor="middle" small>{label}</Label>
    </Move>)}
    <Label x={320} y={65} anchor="middle">The same meaning</Label>
  </>;
  return <>
    {[0, 1, 2].map((i) => <Move key={i} x={73 + i * 183} y={90} order={i} kind="register">
      <rect className="article-art__outline" x="-13" y="-13" width="142" height="249" rx="3" />
      <Paper width={116} height={173} tone={i === 1 ? "pop" : "light"} /><path className="article-art__emblem" d="m58 45 26 45-26 45-26-45z" />
      <Check x={40} y={198} size={33} />
    </Move>)}<Label x={320} y={376} anchor="middle">Check each native form</Label>
  </>;
}

function Calibration({ moment }: { readonly moment: ArtMoment }) {
  if (moment === "cover") return <>
    <circle className="article-art__wash" cx="292" cy="210" r="169" />
    <Move x={263} y={214} kind="turn"><circle className="article-art__material article-art__material--light" r="141" />
      <circle className="article-art__outline" r="105" />
      {Array.from({ length: 24 }, (_, i) => <path key={i} className="article-art__rule" transform={`rotate(${i * 15})`} d={`M0 -${i % 3 ? 120 : 115}v${i % 3 ? -6 : -13}`} />)}
      <path className="article-art__needle" d="M-17 15 67-88 17-15-67 88z" /><circle className="article-art__material article-art__material--paper" r="15" />
    </Move>
    <Move x={416} y={69} order={1} kind="register"><Paper width={157} height={265} tone="paper" /><Label x={18} y={42}>Tools</Label><Rules x={18} y={73} width={119} count={3} />
      <rect className="article-art__material article-art__material--pop" x="18" y="151" width="119" height="88" /><Label x={29} y={198}>Rules</Label>
    </Move><RegistrationMark x={86} y={63} /><RegistrationMark x={560} y={364} />
  </>;
  if (moment === "focus") return <>
    <rect className="article-art__material article-art__material--paper" x="74" y="68" width="492" height="289" rx="3" />
    <Label x={101} y={119}>Pinned environment</Label>
    {[0, 1, 2].map((i) => <Move key={i} x={101 + i * 152} y={158} order={i} kind="register"><Paper width={130} height={139} tone="light" />
      <circle className="article-art__outline" cx="65" cy="63" r="31" /><Check x={51} y={48} size={27} />
    </Move>)}<RegistrationMark x={74} y={68} /><RegistrationMark x={566} y={357} />
  </>;
  return <>
    <Move x={57} y={90} kind="register"><Paper width={236} height={228} tone="light" /><Label x={24} y={47}>Tools</Label>
      <circle className="article-art__outline" cx="118" cy="135" r="54" /><path className="article-art__rule" d="M118 81v108M64 135h108" />
    </Move>
    <Move x={349} y={90} order={2} kind="slide"><Paper width={236} height={228} tone="pop" /><Label x={24} y={47}>Rules + data</Label><Rules x={24} y={89} width={188} count={6} /></Move>
    <Label x={176} y={365} anchor="middle" small>Fixed reference</Label><Label x={467} y={365} anchor="middle" small>Separate inputs</Label>
  </>;
}

function Annotations({ moment }: { readonly moment: ArtMoment }) {
  if (moment === "focus") return <>
    <Move x={152} y={70} kind="unfold"><path className="article-art__material article-art__material--pop" d="M0 69 80 0h180l-80 69z" />
      <path className="article-art__material article-art__material--light" d="M180 69 260 0v234l-80 69z" /><rect className="article-art__material article-art__material--paper" y="69" width="180" height="234" />
      <Label x={21} y={116}>Package</Label><Rules x={21} y={150} width={139} count={6} />
    </Move><Move x={388} y={133} order={2} kind="slide"><Paper width={121} height={154} tone="pop" /><Check x={41} y={56} size={36} /></Move>
  </>;
  return <>
    <Move x={51} y={56}><Paper width={474} height={309} tone="paper" /><rect className="article-art__ink" width="474" height="45" rx="3" />
      <Label x={22} y={30} small light>Your work</Label><Rules x={31} y={81} width={340} count={10} />
      <path className="article-art__highlight" d="M31 145h340v24H31z" />
      <path className="article-art__rule" d="M18 145v24" />
    </Move>
    <Move x={361} y={177} order={2} kind="annotate"><Paper width={224} height={101} tone="pop" /><Label x={21} y={42}>A finding</Label><Rules x={21} y={68} width={181} count={1} /></Move>
    <Pulse d={moment === "cover" ? "M117 365v23h291v-99" : "M117 365v23h291v-99"} order={1} />
    {moment === "resolve" ? <Label x={71} y={404} small>Report → editor</Label> : <RegistrationMark x={561} y={84} />}
  </>;
}

function Folio({ moment }: { readonly moment: ArtMoment }) {
  if (moment === "cover") return <>
    <path className="article-art__wash" d="M0 368 640 32v388H0z" />
    {["Why", "Now", "Next"].map((label, i) => <Move key={label} x={54 + i * 174} y={63 + i * 26} order={i} kind="page">
      <Paper width={168} height={244} tone={i === 1 ? "light" : i === 2 ? "pop" : "paper"} />
      <Label x={21} y={55}>{label}</Label><Rules x={21} y={91} width={125} count={7} />
    </Move>)}
  </>;
  if (moment === "focus") return <>
    <Move x={67} y={58}><Paper width={199} height={306} tone="paper" /><Label x={20} y={46}>Conversation</Label><Rules x={20} y={78} width={159} count={11} /></Move>
    <Pulse d="M267 211H337" />
    <Move x={353} y={125} order={2} kind="page"><Paper width={219} height={173} tone="light" /><Label x={22} y={49}>Decision</Label><Rules x={22} y={79} width={175} count={4} /></Move>
  </>;
  return <>
    <Move x={39} y={104}><Paper width={191} height={226} tone="paper" /><Label x={18} y={48}>Observe</Label><Rules x={18} y={80} width={155} count={6} /></Move>
    <Move x={410} y={104} order={3} kind="page"><Paper width={191} height={226} tone="light" /><Label x={18} y={48}>Guidance</Label><Rules x={18} y={80} width={155} count={6} /></Move>
    <Move x={320} y={215} order={1} kind="seal"><circle className="article-art__material article-art__material--pop" r="64" /><Check x={-25} y={-30} size={47} /></Move>
    <Label x={320} y={327} anchor="middle" small>Review</Label><Pulse d="M233 215h22m130 0h22" />
  </>;
}

function Verification({ moment }: { readonly moment: ArtMoment }) {
  if (moment === "focus") return <>
    {["Lockfile", "Graph"].map((label, i) => <Move key={label} x={76 + i * 265} y={72} order={i} kind="register">
      <Paper width={225} height={279} tone={i ? "light" : "pop"} /><Label x={22} y={51}>{label}</Label><Rules x={22} y={90} width={181} count={8} />
      <RegistrationMark x={225} y={161} />
    </Move>)}<Pulse d="M302 232H337" />
  </>;
  if (moment === "resolve") return <>
    <Move x={227} y={85}><Paper width={187} height={245} tone="paper" /><Label x={28} y={57}>File</Label><Rules x={28} y={89} width={130} count={6} /></Move>
    {[{ x: 77, y: 137, label: "Bytes" }, { x: 426, y: 89, label: "Type" }, { x: 426, y: 256, label: "Mode" }].map((p, i) => <Move key={p.label} x={p.x} y={p.y} order={i} kind="seal">
      <rect className={`article-art__material article-art__material--${i ? "light" : "pop"}`} width="132" height="83" rx="3" /><Label x={20} y={40}>{p.label}</Label><Check x={20} y={52} size={15} />
    </Move>)}
  </>;
  return <>
    {Array.from({ length: 12 }, (_, i) => <Move key={i} x={48 + i % 3 * 61} y={107 + Math.floor(i / 3) * 56} order={(i % 3 + Math.floor(i / 3)) % 6} kind="unfold">
      <rect className={`article-art__material article-art__material--${i % 2 ? "light" : "pop"}`} width="45" height="40" rx="2" /><path className="article-art__rule" d="M10 14h25M10 23h18" />
    </Move>)}
    <Move x={290} y={57} order={1} kind="gate"><path className="article-art__material article-art__material--light" d="M0 0h60v311H0z" />
      <path className="article-art__ink" d="M17 103h26v105H17z" /><Check x={13} y={33} size={28} />
    </Move><Pulse d="M231 214h57m66 0h101" order={3} />
    <Move x={491} y={214} order={4} kind="seal"><circle className="article-art__material article-art__material--pop" r="65" /><path className="article-art__ink" d="m-15-27 43 27-43 27z" /></Move>
    <Label x={132} y={373} anchor="middle" small>Files</Label><Label x={320} y={406} anchor="middle" small>Verify</Label><Label x={491} y={320} anchor="middle" small>Run</Label>
  </>;
}

const specimenCurve = "M417 77C340 9 197 41 191 131C185 215 386 167 385 259C384 348 238 379 158 301";

function Cutaway({ moment }: { readonly moment: ArtMoment }) {
  if (moment === "cover") return <>
    {Array.from({ length: 7 }, (_, i) => <Move key={i} x={15 + i * 12} y={39 - i * 4} order={6 - i} kind="cutaway">
      <path className={i === 6 ? "article-art__specimen" : "article-art__specimen-layer"} d={specimenCurve} style={{ "--layer-opacity": .18 + i * .10 } as CSSProperties} />
    </Move>)}
    <path className="article-art__axis" d="M67 78v265m-9-256 9-9 9 9m-9 256h34" />
    <Label x={608} y={106} anchor="end" small>Text</Label><Label x={608} y={171} anchor="end" small>Resources</Label><Label x={608} y={236} anchor="end" small>Geometry</Label><Label x={608} y={301} anchor="end" small>Identity</Label>
    <RegistrationMark x={462} y={84} /><RegistrationMark x={113} y={352} />
  </>;
  if (moment === "focus") return <>
    <Move x={57} y={113} kind="cutaway"><rect className="article-art__material article-art__material--light" width="151" height="188" rx="3" /><Label x={22} y={52}>Identity</Label><path className="article-art__outline" d="m49 84 28 48 28-48" /></Move>
    <Move x={246} y={113} order={1} kind="turn"><circle className="article-art__material article-art__material--pop" cx="73" cy="93" r="73" /><path className="article-art__needle" d="M65 103 109 47 81 86z" /><Label x={73} y={211} anchor="middle" small>Live values</Label></Move>
    <Move x={433} y={113} order={2} kind="unfold">{[0, 1, 2].map((i) => <rect key={i} className="article-art__material article-art__material--light" x={i * 21} y={i * 23} width="97" height="132" rx="2" />)}<Label x={73} y={211} anchor="middle" small>Collections</Label></Move>
  </>;
  return <>
    <path className="article-art__grid" d="M43 77h311v261H43zM43 142h311M43 207h311M43 272h311M120 77v261M198 77v261M276 77v261" />
    <Move kind="register"><path className="article-art__curve" d="M61 291C151 46 257 370 337 96" />
      {[{ x: 61, y: 291 }, { x: 151, y: 46 }, { x: 257, y: 370 }, { x: 337, y: 96 }].map((p, i) => <circle key={i} className="article-art__material article-art__material--pop" cx={p.x} cy={p.y} r="8" />)}
    </Move><path className="article-art__axis" d="M61 291 151 46M337 96 257 370" />
    <Move x={414} y={194} order={2} kind="gather">
      {/* OriginKit Text Gather's character scatter-to-registration treatment,
          made deterministic, finite, and limited to an illustrated specimen. */}
      {"Ag".split("").map((letter, i) => <g key={letter} className="article-art__letter" style={{ "--art-order": i, "--art-dx": `${i ? 35 : -30}px`, "--art-dy": `${i ? -29 : 22}px`, "--art-turn": `${i ? -10 : 8}deg` } as CSSProperties}>
        <text className="article-art__type-specimen" x={i * 61} y="0">{letter}</text>
      </g>)}<path className="article-art__rule" d="M-12 12h145M-12-95h145" /><Label x={63} y={73} anchor="middle" small>Fallback metrics</Label>
    </Move>
  </>;
}

function Apertures({ moment }: { readonly moment: ArtMoment }) {
  if (moment === "cover") return <>
    {["Documents", "Images", "Transport", "Sessions"].map((label, i) => <Move key={label} x={53 + i % 2 * 278} y={41 + Math.floor(i / 2) * 190} order={i} kind="window">
      <rect className={`article-art__material article-art__material--${i % 2 ? "pop" : "light"}`} width="255" height="166" rx="3" />
      {i === 0 ? <><rect className="article-art__outline" x="87" y="23" width="77" height="87" /><Rules x={100} y={44} width={50} count={3} /></> : i === 1 ? <><rect className="article-art__outline" x="67" y="25" width="120" height="83" /><path className="article-art__ink" d="m77 97 36-36 28 20 24-16 13 32z" /><circle className="article-art__ink" cx="155" cy="47" r="10" /></> : i === 2 ? <><path className="article-art__outline" d="M83 69h91m-30-24 30 24-30 24M112 45 83 69l29 24" /></> : <><rect className="article-art__outline" x="57" y="25" width="140" height="88" rx="3" /><path className="article-art__rule" d="M57 45h140M75 34h20" /><Rules x={75} y={61} width={104} count={2} /></>}
      <Label x={127} y={145} anchor="middle" small>{label}</Label>
    </Move>)}
  </>;
  if (moment === "focus") return <>
    <Move x={65} y={52}><Paper width={230} height={313} tone="paper" /><Rules x={22} y={32} width={186} count={4} />
      <rect className="article-art__material article-art__material--light" x="22" y="119" width="186" height="106" />
      <path className="article-art__ink" d="m33 213 54-58 30 20 31-33 48 71z" /><Rules x={22} y={252} width={186} count={2} />
    </Move><Pulse d="M297 222H361" />
    <Move x={377} y={127} order={2} kind="unfold"><rect className="article-art__outline" x="-13" y="-13" width="199" height="176" />
      <rect className="article-art__material article-art__material--pop" width="173" height="150" /><path className="article-art__ink" d="m16 127 49-60 27 20 29-31 35 71z" />
    </Move><Label x={464} y={344} anchor="middle" small>Selected output</Label>
  </>;
  return <>
    <Move x={115} y={106} kind="window"><Paper width={410} height={225} tone="paper" /><rect className="article-art__ink" width="410" height="44" />
      <Label x={22} y={30} small light>Working session</Label><Rules x={31} y={80} width={348} count={6} />
    </Move>
    <Move x={66} y={80} order={0} kind="gate"><path className="article-art__curve" d="M28 0H0v284h28" /></Move>
    <Move x={546} y={80} order={2} kind="gate"><path className="article-art__curve" d="M0 0h28v284H0" /></Move>
    <Label x={80} y={402} small anchor="middle">Begin</Label><Label x={560} y={402} small anchor="middle">End</Label>
  </>;
}

function Revisions({ moment }: { readonly moment: ArtMoment }) {
  if (moment === "resolve") return <>
    <rect className="article-art__outline" x="98" y="59" width="444" height="302" rx="3" /><Label x={124} y={103}>The same contract</Label>
    {Array.from({ length: 12 }, (_, i) => <Move key={i} x={193 + i % 4 * 64} y={158 + Math.floor(i / 4) * 47} order={i % 4} kind="unfold">
      <rect className={`article-art__material article-art__material--${i % 3 === 0 ? "pop" : "light"}`} width="49" height="34" rx="2" />
    </Move>)}<Label x={320} y={326} anchor="middle" small>Refined internals</Label>
  </>;
  if (moment === "focus") return <>
    <Move x={47} y={82}><Paper width={242} height={249} tone="paper" /><Label x={24} y={51}>Intent</Label><Rules x={24} y={85} width={194} count={7} /></Move>
    <Pulse d="M291 207h59" />
    <Move x={366} y={82} order={2} kind="edit"><Paper width={229} height={249} tone="light" /><Label x={23} y={51}>Preview</Label><Rules x={23} y={85} width={183} count={7} /><path className="article-art__highlight" d="M23 98h183v25H23z" /><Check x={182} y={188} size={22} /></Move>
  </>;
  return <>
    <Move x={122} y={44}><Paper width={392} height={331} tone="paper" /><Label x={26} y={48}>A clearer next step</Label>
      <Rules x={26} y={85} width={338} count={12} />
      <path className="article-art__highlight" d="M26 117h338v26H26zM26 224h209v26H26z" />
    </Move>
    <Move x={75} y={125} order={1} kind="edit"><path className="article-art__curve" d="M-17 0h34M0-17v34" /></Move>
    <Move x={528} y={247} order={2} kind="edit"><circle className="article-art__material article-art__material--pop" r="50" /><Check x={-19} y={-21} size={37} /></Move>
    <Move x={74} y={278} order={3} kind="edit"><path className="article-art__curve" d="M0 0h110" /></Move>
  </>;
}

const drawingByFamily = { reports: SharedReports, editions: Editions, registration: Calibration, annotations: Annotations, folio: Folio, verification: Verification, cutaway: Cutaway, apertures: Apertures, revisions: Revisions };

export function ArtDrawing({ direction, moment = "cover", id, title, description, compact = false }: {
  readonly direction: ArticleArtDirection; readonly moment?: ArtMoment; readonly id: string;
  readonly title?: string; readonly description?: string; readonly compact?: boolean;
}) {
  const Drawing = drawingByFamily[direction.family];
  return <svg className="article-art__drawing" data-art-family={direction.family} data-art-moment={moment}
    viewBox="0 0 640 420" fill="none" role={compact ? undefined : "img"}
    aria-hidden={compact ? true : undefined} aria-labelledby={compact ? undefined : `${id}-drawing-title ${id}-drawing-description`} focusable="false">
    {!compact ? <><title id={id + "-drawing-title"}>{title ?? direction.cover.title}</title><desc id={id + "-drawing-description"}>{description ?? direction.cover.description}</desc></> : null}
    <rect className="article-art__background" width="640" height="420" />
    <path className="article-art__edge" d="M21 21h46m-46 0v46M619 21h-46m46 0v46M21 399h46m-46 0v-46M619 399h-46m46 0v-46" />
    <Drawing moment={moment} />
  </svg>;
}

export function EditorialCover({ article }: { readonly article: BlogArticle }) {
  const direction = artFor(article.slug);
  const id = "figure-" + article.slug;
  return <figure className="article-cover" id={id} data-journal-figure data-art={direction.family} style={artStyle(direction)}>
    <ArtDrawing direction={direction} id={id} />
    <div className="article-cover__tools">
      <details className="article-cover__key"><summary>How the pieces fit</summary>
        <ul>{article.diagram.steps.map((step) => <li key={step.label}><strong>{step.label}</strong><span>{step.detail}</span></li>)}</ul>
      </details>
      <button className="article-figure__replay" type="button" data-figure-replay disabled hidden aria-label={"Replay the illustration: " + direction.cover.title}>Replay <span aria-hidden="true">↻</span></button>
    </div>
    <figcaption>{direction.cover.caption}</figcaption>
  </figure>;
}

export function EditorialBeat({ direction, beat, id, detail }: {
  readonly direction: ArticleArtDirection; readonly beat: ArticleArtDirection["beats"][number]; readonly id: string;
  readonly detail?: BlogArticle["sections"][number]["detail"];
}) {
  return <figure className="article-beat" data-journal-figure data-art={direction.family} style={artStyle(direction)} aria-labelledby={id + "-heading"}>
    <ArtDrawing direction={direction} moment={beat.moment} id={id} title={beat.title} description={beat.description} />
    <figcaption className="article-beat__note">
      <h3 id={id + "-heading"}>{beat.title}</h3>
      <p className="article-beat__caption">{beat.caption}</p>
      {detail ? <details className="article-beat__detail"><summary>Design notes</summary>
        <ol>{detail.steps.map((step) => <li key={step}>{step}</li>)}</ol><p>{detail.caption}</p>
      </details> : null}
      <button className="article-figure__replay" type="button" data-figure-replay disabled hidden aria-label={"Replay the illustration: " + beat.title}>Replay <span aria-hidden="true">↻</span></button>
    </figcaption>
  </figure>;
}
