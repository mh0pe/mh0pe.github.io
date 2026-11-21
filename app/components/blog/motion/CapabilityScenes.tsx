import type { ReactNode } from "react";

type CapabilityPalette = { ink: string; paper: string; material: string; accent: string };
type CapabilityWorldProps = { p: CapabilityPalette; frame: number };
const FONT = '"Instrument Sans", Arial, sans-serif';
const CHAPTER_SPAN = 225;
const CHAPTER_STARTS = [0, 225, 450, 675] as const;

const bounded = (n: number) => Math.min(1, Math.max(0, n));
const currentChapter = (frame: number) => Math.min(3, Math.floor(Math.max(0, frame) / CHAPTER_SPAN));
const phase = (frame: number, chapter: number, duration = CHAPTER_SPAN * .82) => {
  const t = bounded((frame - CHAPTER_STARTS[chapter]) / duration);
  return t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
};
// Keep the windows and their meaning stationary. Only the selected local
// artifact gets a useful reverse-entry offset, settling to its exact authored pose.
const prefix = (frame: number, chapter: number, authored: number) => frame >= CHAPTER_STARTS[chapter] && frame < authored
  ? 1 - phase(frame, chapter, authored - CHAPTER_STARTS[chapter]) : 0;
const anchoredPhase = (frame: number, chapter: number, authored: number) => prefix(frame, chapter, authored) ? phase(authored, chapter) : phase(frame, chapter);

function Label({ x, y, p, children, size = 25, weight = 550, anchor = "start", mobile = false }: {
  x: number; y: number; p: CapabilityPalette; children: ReactNode; size?: number;
  weight?: number; anchor?: "start" | "middle" | "end"; mobile?: boolean;
}) {
  return <text x={x} y={y} fill={p.ink} fontFamily={FONT} fontSize={size}
    fontWeight={weight} textAnchor={anchor} data-mobile-label={mobile ? true : undefined}>{children}</text>;
}

function Window({ p, x, y, title, scope, selected, name, children, footer }: {
  p: CapabilityPalette; x: number; y: number; title: string; scope?: string;
  selected: boolean; name: string; children: ReactNode; footer: string;
}) {
  return <g transform={`translate(${x} ${y})`} data-capability-window={name} data-capability-active={selected}>
    <path d="M0 264 12 274h530V10L530 0v264z" fill={p.ink} opacity=".12" />
    <rect width="530" height="264" rx="5" fill={p.paper} stroke={p.ink}
      strokeWidth={selected ? 3 : 1.5} strokeOpacity={selected ? 1 : .45} />
    <path d="M24 66h482" stroke={p.ink} strokeOpacity=".18" />
    {selected ? <rect x="24" y="58" width="124" height="7" rx="2" fill={p.accent} /> : null}
    <Label x={24} y={43} p={p} size={34} weight={650} mobile>{title}</Label>
    {scope ? <Label x={506} y={40} p={p} size={22} anchor="end">{scope}</Label> : null}
    {children}
    <Label x={24} y={246} p={p} size={22} weight={500}>{footer}</Label>
  </g>;
}

function Paper({ p, x, y, w, h, children }: {
  p: CapabilityPalette; x: number; y: number; w: number; h: number; children: ReactNode;
}) {
  return <g transform={`translate(${x} ${y})`}>
    <path d={`M0 ${h}l8 6h${w}v-${h}l-8-6`} fill={p.ink} opacity=".12" />
    <rect width={w} height={h} fill={p.paper} stroke={p.ink} strokeOpacity=".65" />
    {children}
  </g>;
}

function Picture({ p, x, y, w = 100, h = 66 }: {
  p: CapabilityPalette; x: number; y: number; w?: number; h?: number;
}) {
  return <g transform={`translate(${x} ${y})`}>
    <rect width={w} height={h} rx="2" fill={p.material} stroke={p.ink} />
    <circle cx={w * .73} cy={h * .27} r={h * .12} fill={p.ink} opacity=".65" />
    <path d={`M${w * .08} ${h * .84} ${w * .36} ${h * .35} ${w * .54} ${h * .62} ${w * .68} ${h * .43} ${w * .93} ${h * .84}z`}
      fill={p.ink} opacity=".65" />
  </g>;
}

// Four separate contribution areas share a reading surface, not an execution
// pipeline. Their panels and labels stay in place; only local artifacts change.
export function CloudRuntimeWorld({ p, frame }: CapabilityWorldProps) {
  const chapter = currentChapter(frame);
  const preview = anchoredPhase(frame, 0, 70), iterate = anchoredPhase(frame, 1, 320);
  const learn = anchoredPhase(frame, 2, 560), execute = anchoredPhase(frame, 3, 820);
  const previewEntry = prefix(frame, 0, 70), iterateEntry = prefix(frame, 1, 320);
  const learnEntry = prefix(frame, 2, 560), executeEntry = prefix(frame, 3, 820);
  return <g data-capability-world="cloud-runtime" data-capability-chapter={chapter}>
    <Label x={90} y={87} p={p} size={44} weight={650}>Developer feedback, across the work.</Label>
    <Window p={p} x={90} y={142} title="Preview" scope="AWS CDK" selected={chapter === 0} name="preview"
      footer="A preview explains intent before action.">
      <Paper p={p} x={24} y={86} w={196} h={132}>
        <Label x={16} y={31} p={p}>Template</Label>
        <Label x={16} y={76} p={p} size={33} weight={650}>for each</Label>
        <Label x={16} y={112} p={p} size={23}>collection: ?</Label>
      </Paper>
      <path d="M224 153h20m-7-7 7 7-7 7" stroke={p.ink} strokeWidth="2" fill="none" />
      <g transform={`translate(${(1 - preview) * 16 - previewEntry * 14} ${(1 - preview) * 7 - previewEntry * 20}) rotate(${(1 - preview) * 1.5} 375 145)`}>
        <Paper p={p} x={250} y={86} w={256} h={132}>
          <Label x={14} y={31} p={p}>Change preview</Label>
          <Label x={14} y={68} p={p} size={26}>+ loop added</Label>
          <Label x={14} y={96} p={p} size={24}>~ properties changed</Label>
          <Label x={14} y={122} p={p} size={23}>collection: ?</Label>
        </Paper>
      </g>
    </Window>
    <Window p={p} x={660} y={142} title="Iterate" scope="AWS CDK" selected={chapter === 1} name="iterate"
      footer="Hotswap is a development workflow.">
      <rect x="24" y="92" width="186" height="122" rx="4" fill={p.material} stroke={p.ink} />
      <Label x={40} y={137} p={p} size={30} weight={650}>QuickSight</Label>
      <Label x={40} y={175} p={p} size={23}>Resource types</Label>
      <path d="M216 153h29m-7-7 7 7-7 7" stroke={p.ink} strokeWidth="2" fill="none" />
      <g transform={`translate(${(1 - iterate) * 12 + iterateEntry * 10} ${(1 - iterate) * -8 - iterateEntry * 16})`}>
        <rect x="254" y="92" width="252" height="122" rx="4" fill={p.paper} stroke={p.ink} strokeWidth="2" />
        <Label x={273} y={136} p={p} size={28} weight={650}>Cloud Control</Label>
        <Label x={273} y={174} p={p}>Shared handler</Label>
      </g>
    </Window>
    <Window p={p} x={90} y={436} title="Learn" scope="AWS CDK" selected={chapter === 2} name="learn"
      footer="Compare the path, not just the prose.">
      <g transform={`translate(${(1 - learn) * -8 - learnEntry * 12} ${(1 - learn) * -6 - learnEntry * 12})`}>
        <Paper p={p} x={24} y={87} w={218} h={131}>
          <Label x={16} y={32} p={p}>Example path</Label>
          <Label x={16} y={77} p={p} size={28}>package /</Label>
          <Label x={16} y={111} p={p} size={28}>feature</Label>
        </Paper>
      </g>
      <Label x={262 - learnEntry * 12} y={165 - learnEntry * 12} p={p} size={37} anchor="middle">=</Label>
      <g transform={`translate(${(1 - learn) * 8 - learnEntry * 12} ${(1 - learn) * 6 - learnEntry * 12})`}>
        <Paper p={p} x={282} y={87} w={224} h={131}>
          <Label x={16} y={32} p={p}>Actual export</Label>
          <Label x={16} y={77} p={p} size={28}>package /</Label>
          <Label x={16} y={111} p={p} size={28}>feature</Label>
        </Paper>
      </g>
    </Window>
    <Window p={p} x={660} y={436} title="Execute" scope="jsii" selected={chapter === 3} name="execute"
      footer="Behavior and diagnostic names stay.">
      <rect x="24" y="87" width="482" height="131" rx="4" fill="none" stroke={p.ink} strokeWidth="3" />
      <Label x={40} y={120} p={p} size={26} weight={650}>The external contract</Label>
      {["Promises", "Types", "Members", "Bundle"].map((name, i) => <g key={name}
        transform={`translate(${37 + i * 114 + executeEntry * 10} ${150 + (1 - execute) * (i % 2 ? 9 : -9) - executeEntry * 16}) scale(${.97 + execute * .03})`}>
        <rect width="106" height="46" rx="3" fill={p.material} stroke={p.ink} />
        <Label x={53} y={31} p={p} size={22} anchor="middle">{name}</Label>
      </g>)}
    </Window>
    <Label x={640} y={757} p={p} size={27} anchor="middle">Four responsibilities, not a required sequence.</Label>
  </g>;
}

export function MCPWorld({ p, frame }: CapabilityWorldProps) {
  const chapter = currentChapter(frame);
  const documents = anchoredPhase(frame, 0, 70), images = anchoredPhase(frame, 1, 320);
  const documentEntry = prefix(frame, 0, 70), imageEntry = prefix(frame, 1, 320);
  const connection = phase(frame, 2), session = phase(frame, 3, CHAPTER_SPAN * .95);
  return <g data-capability-world="aws-labs-mcp" data-capability-chapter={chapter}>
    <Label x={90} y={87} p={p} size={44} weight={650}>Four capabilities. Separate boundaries.</Label>
    <Window p={p} x={90} y={132} title="Documents" selected={chapter === 0} name="documents"
      footer="Choose size limits. Keep pages and slides.">
      <Paper p={p} x={36} y={84} w={177} h={126}>
        <Label x={14} y={32} p={p}>Document</Label>
        {[58, 79, 100].map((y, i) => <path key={y} d={`M14 ${y}h${i === 2 ? 100 : 143}`} stroke={p.ink} strokeWidth="3" strokeOpacity=".5" />)}
      </Paper>
      <g transform={`translate(${(1 - documents) * 17 - documentEntry * 32} ${(1 - documents) * 9}) rotate(${(1 - documents) * -2} 379 148)`}>
        <Paper p={p} x={278} y={84} w={216} h={126}>
          <Label x={13} y={32} p={p} size={24}>Page / slide image</Label>
          <Picture p={p} x={17} y={46} w={180} h={65} />
        </Paper>
      </g>
    </Window>
    <Window p={p} x={660} y={132} title="Images" selected={chapter === 1} name="images"
      footer="Inspect first. Extract by choice.">
      <Label x={36} y={110} p={p} size={25} weight={650}>Inspect assets</Label>
      <rect x="36" y="125" width="193" height="89" rx="3" fill="none" stroke={p.ink} />
      <Picture p={p} x={49} y={139} w={76} h={59} />
      <Picture p={p} x={138} y={139} w={76} h={59} />
      <rect x="46" y="136" width="82" height="65" fill="none" stroke={p.ink} strokeWidth="3" />
      <Label x={276} y={110} p={p} size={25} weight={650}>Selected output</Label>
      <rect x="276" y="125" width="218" height="89" rx="3" fill={p.paper} stroke={p.ink} strokeDasharray="6 5" />
      <g transform={`translate(${(1 - images) * -22 + imageEntry * 32} ${(1 - images) * 10}) scale(${.94 + images * .06})`}>
        <Picture p={p} x={311} y={138} w={148} h={62} />
      </g>
    </Window>
    <Window p={p} x={90} y={423} title="Connection" selected={chapter === 2} name="connection"
      footer="Choose the interface, host and port.">
      <Label x={140} y={113} p={p} size={25} anchor="middle">Local default</Label>
      <Label x={390} y={113} p={p} size={25} anchor="middle">Network option</Label>
      <path d="M140 145v57m250-57v57M140 174h250" stroke={p.ink} strokeWidth="3" fill="none" />
      <circle cx={140 + connection * 250} cy="174" r="17" fill={p.paper} stroke={p.ink} strokeWidth="4" />
      <Label x={265} y={217} p={p} size={23} anchor="middle">The tool&apos;s purpose stays the same.</Label>
    </Window>
    <Window p={p} x={660} y={423} title="Session" selected={chapter === 3} name="session"
      footer="Close the session. Keep the infrastructure.">
      <rect x="36" y="87" width="458" height="130" rx="4" fill={p.material} stroke={p.ink} strokeWidth="2" />
      <path d="M36 113h458" stroke={p.ink} />
      {[52, 67, 82].map(x => <circle key={x} cx={x} cy="100" r="3" fill={p.ink} />)}
      <rect x="52" y="127" width="426" height="73" fill={p.ink} opacity=".16" />
      <rect x="52" y="127" width={426 * session} height="73" fill={p.paper} />
      <Label x={265} y={173} p={p} size={30} weight={650} anchor="middle">
        {session === 1 ? "Session closed" : session > 0 ? "Closing the session" : "Temporary browser session"}
      </Label>
    </Window>
    <g data-capability-foundation="persistent">
      <path d="M70 767l14 12h1130v-64l-14-12v64z" fill={p.ink} opacity=".17" />
      <rect x="70" y="703" width="1130" height="64" rx="3" fill={p.material} stroke={p.ink} strokeWidth="2" />
      <Label x={635} y={746} p={p} size={31} weight={650} anchor="middle">Browser infrastructure · operator-managed</Label>
    </g>
  </g>;
}
