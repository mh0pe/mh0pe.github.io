import type { ReactNode } from "react";
import { motionStories, type MotionStory } from "@/app/data/article-motion";
import { foldedSheet } from "@/app/components/blog/motion/miura-geometry";
import { storyState } from "@/app/components/blog/motion/story-timing";

type Palette = typeof motionStories[MotionStory];
type WorldProps = { p: Palette; focus: number; resolve: number; arrival: number; opening: number };
const FONT = '"Instrument Sans", Arial, sans-serif';

function Text({ x, y, children, size = 28, color, anchor = "start", weight = 550 }: {
  x: number; y: number; children: ReactNode; size?: number; color: string; anchor?: "start" | "middle" | "end"; weight?: number;
}) { return <text x={x} y={y} fill={color} fontFamily={FONT} fontSize={size} fontWeight={weight} textAnchor={anchor}>{children}</text>; }

function Slab({ x, y, w, h, depth = 25, color, ink, children }: {
  x: number; y: number; w: number; h: number; depth?: number; color: string; ink: string; children?: ReactNode;
}) {
  return <g transform={`translate(${x} ${y})`}>
    <path d={`M0 ${h}l${depth} ${depth * .65}h${w}v-${h}l-${depth}-${depth * .65}`} fill={ink} opacity=".17" />
    <rect width={w} height={h} rx="3" fill={color} stroke={ink} strokeOpacity=".45" />
    {children}
  </g>;
}

function Atlas({ p, focus, resolve, opening }: WorldProps) {
  const projects = ["Application", "Service", "Infrastructure"];
  return <>
    <g transform={`translate(${70 - focus * 15} ${65 + resolve * 10}) scale(${1 - resolve * .1})`}>
      {projects.map((label, i) => <g key={label} transform={`translate(${75 + i * 350 + (1 - opening) * (i - 1) * 24} ${165 + (i % 2) * 95 - (1 - opening) * i * 15})`}>
        <path d="M0 160 100 100 260 115 300 190 155 260 30 235z" fill={i === 1 ? p.accent : p.material} stroke={p.ink} strokeWidth="2" />
        <path d="M30 235v32l125 25 145-70v-32l-145 70z" fill={p.ink} opacity=".22" />
        <path d="M85 160 145 125 205 155 145 191z" fill={p.paper} stroke={p.ink} />
        <path d="M85 160v45l60 31v-45m60-36v45l-60 36" fill={p.paper} stroke={p.ink} />
        <Text x={145} y={75} color={p.ink} anchor="middle" size={29}>{label}</Text>
        <g opacity={1 - resolve}><Text x={145} y={338} color={p.ink} anchor="middle" size={22}>project / path</Text></g>
      </g>)}
      <rect x="50" y="155" width="1050" height="415" rx="30" fill="none" stroke={p.ink} strokeWidth="3" strokeDasharray="14 14" opacity={focus * (1 - resolve * .65)} />
    </g>
    {projects.map((label, i) => <path key={label + "-address"} d={`M${278 + i * 315} ${490 + (i % 2) * 85}V660`} fill="none" stroke={p.ink} strokeWidth="2" strokeDasharray="5 6" opacity={resolve * .7} />)}
    {projects.map((label, i) => <g key={label} opacity={resolve} transform={`translate(${160 + i * 350} ${700 - resolve * 25})`}>
      <rect width="310" height="62" fill={p.paper} stroke={p.ink} /><rect width="8" height="62" fill={i === 1 ? p.accent : p.ink} />
      <Text x={20} y={39} size={24} color={p.ink}>{label} / path</Text>
    </g>)}
  </>;
}

function Prism({ p, focus, resolve, arrival, opening }: WorldProps) {
  return <>
    <circle cx="640" cy="375" r="265" fill={p.material} opacity=".35" />
    <g transform={`translate(640 ${385 - focus * 215}) rotate(${opening * 5 + focus * 8}) scale(${1 - focus * .58})`}>
      <path d="M0-180 126 0 0 180-126 0z" fill={p.paper} stroke={p.ink} strokeWidth="3" />
      <path d="M0-95 67 0 0 95-67 0z" fill={p.accent} stroke={p.ink} strokeWidth="2" />
    </g>
    {Array.from({ length: 15 }, (_, i) => {
      const angle = (i / 15 * 2 * Math.PI) - Math.PI / 2;
      const x = 640 + Math.cos(angle) * (315 + arrival * 50 + opening * 25);
      const y = 385 + Math.sin(angle) * (220 + arrival * 35 + opening * 20);
      return <g key={i} transform={`translate(${x} ${y}) rotate(${Math.cos(angle) * 12}) scale(${1 - focus * .5})`} opacity={1 - focus * .86}>
        <path d={i % 3 === 0 ? "M-36-48h53l19 20v76h-72z" : i % 3 === 1 ? "M-36-32h24l9-16h39v96h-72z" : "M-36-48h72v96h-72z"} fill={i % 5 === 0 ? p.accent : p.material} stroke={p.ink} />
        <path d="M0-20 14 0 0 20-14 0z" fill={p.ink} />
      </g>;
    })}
    {["Document", "Folder", "Plugin"].map((name, i) => <g key={name} opacity={focus} transform={`translate(${240 + i * 395} ${470 + (1 - focus) * 70 - resolve * 20})`}>
      <g transform={`rotate(${(1 - resolve) * (i - 1) * 11})`}>
        <path d={i === 0 ? "M-88-104h125l51 42v155h-176z" : i === 1 ? "M-88-73h59l18-31h99v197h-176z" : "M-88-104h176v197h-176z"} fill={i === 1 ? p.accent : p.material} stroke={p.ink} strokeWidth="2" />
        <path d="M0-61 41 0 0 61-41 0z" fill={p.ink} />
      </g>
      <Text x={0} y={169} anchor="middle" color={p.ink} size={32}>{name}</Text>
      <g opacity={resolve}><path d="M0 181v17" stroke={p.ink} strokeWidth="2" />
        <rect x="-105" y="205" width="210" height="44" rx={i === 2 ? 20 : i === 1 ? 8 : 0} fill={p.paper} stroke={p.ink} strokeDasharray="5 5" />
        <Text x={0} y={234} anchor="middle" color={p.ink} size={23}>Receiving tool</Text>
      </g>
    </g>)}
    <Text x={640} y={744} anchor="middle" size={25} color={p.ink}>{resolve > .5 ? "Generated form → receiving tool → validation" : "A shared meaning, different packaging"}</Text>
  </>;
}

function Instrument({ p, focus, resolve, opening }: WorldProps) {
  return <>
    {["Code", "Rules", "External data"].map((name, i) => <g key={name} transform={`translate(${175 + i * 200 + resolve * (i - 1) * 65 + opening * (i - 1) * 10} ${100 + i * 72 + focus * 20})`}>
      <path d="M0 0h490v54H0z" fill={i === 1 ? p.accent : p.material} stroke={p.ink} />
      <Text x={26} y={36} color={p.ink} size={27}>{name}</Text>
    </g>)}
    <g transform={`translate(640 ${445 + focus * 20})`}>
      <ellipse rx="245" ry="119" fill={p.paper} stroke={p.ink} strokeWidth="3" />
      <ellipse rx="211" ry="88" fill={p.material} stroke={p.ink} />
      {Array.from({ length: 36 }, (_, i) => {
        const a = i / 36 * Math.PI * 2;
        return <path key={i} d={`M${Math.cos(a) * 225} ${Math.sin(a) * 102}l${Math.cos(a) * 12} ${Math.sin(a) * 8}`} stroke={p.ink} strokeWidth="2" />;
      })}
      <Text x={0} y={8} anchor="middle" size={45} color={p.ink}>Pinned tools</Text>
      <path d="M0 112v65m-15-12 15 12 15-12" fill="none" stroke={p.ink} strokeWidth="3" />
    </g>
    <Text x={640} y={668} anchor="middle" color={p.ink} size={30}>Known environment</Text>
    <Text x={640} y={720} anchor="middle" color={p.ink} size={25}>Independent inputs remain independent</Text>
  </>;
}

function Margin({ p, focus, resolve, opening }: WorldProps) {
  return <>
    <g transform={`translate(${110 + focus * 20} ${130 - focus * 12}) rotate(${(1 - resolve) * -3} 430 220)`}>
      <Slab x={0} y={0} w={790} h={442} color={p.paper} ink={p.ink} depth={25 + focus * 45}>
        <Text x={44} y={69} size={45} color={p.ink}>The work</Text>
        {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M44 ${115 + i * 45}h${470 + (i % 3) * 85}`} stroke={p.ink} strokeOpacity={i === 2 ? 1 : .28} strokeWidth={i === 2 ? 7 : 4} />)}
        <rect x="27" y="181" width="672" height="47" fill={p.accent} opacity=".28" />
      </Slab>
    </g>
    <Slab x={1000 - opening * 40 - focus * 30} y={385 - opening * 60 - resolve * 45} w={230} h={158} depth={20} color={p.accent} ink={p.ink}>
      <Text x={24} y={48} size={32} color={p.ink}>Finding</Text>
      <Text x={24} y={91} size={23} color={p.ink}>Beside the line</Text>
      <path d="M24 121h175" stroke={p.ink} />
    </Slab>
    <g opacity={focus * (1 - resolve)}>
      <rect x="175" y="563" width="440" height="95" fill={p.paper} stroke={p.ink} strokeWidth="2" />
      <Text x={197} y={601} size={27} color={p.ink}>Installed artifact</Text>
      <Text x={197} y={636} size={24} color={p.ink}>ASH wheel + package contents</Text>
      <rect x="805" y="572" width="340" height="75" fill={p.material} stroke={p.ink} strokeDasharray="7 7" />
      <Text x={828} y={618} size={26} color={p.ink}>External dependencies</Text>
    </g>
    <g opacity={resolve}>{["Complete", "No findings", "Incomplete", "Cancelled", "Unavailable"].map((label, i) => <g key={label}>
      <rect x={91 + i * 220} y="632" width="210" height="60" fill={p.paper} stroke={p.ink} />
      <Text x={196 + i * 220} y={670} anchor="middle" size={24} color={p.ink}>{label}</Text>
    </g>)}</g>
  </>;
}

function Continuity({ p, focus, resolve, opening }: WorldProps) {
  const folding = .18 + opening * .18 + focus * .49 - resolve * .69;
  return <>
    <path d="M85 645H1195" stroke={p.ink} strokeOpacity=".3" />
    <path d="M640 95v610" stroke={p.ink} strokeWidth="2" strokeDasharray="9 12" opacity=".3" />
    <Text x={370} y={110} anchor="middle" color={p.ink} size={25}>One session</Text>
    <Text x={905} y={110} anchor="middle" color={p.ink} size={25}>The next session</Text>
    <g transform={`translate(${(resolve - focus) * 60} ${-focus * 30})`}>
      {foldedSheet(folding).map((face, i) => <polygon key={i} points={face.points} fill={face.shade ? p.material : p.paper} stroke={p.ink} strokeOpacity=".4" strokeWidth="1.1" />)}
    </g>
    {["Why", "Now", "Next"].map((label, i) => <g key={label}>
      <path d={`M100 ${390 + i * 85}C350 ${280 + i * 85},810 ${560 + i * 30},1170 ${340 + i * 85}`} fill="none" stroke={i === 1 ? p.ink : p.accent} strokeWidth="12" opacity=".75" />
      <rect x="95" y={355 + i * 85} width="135" height="57" fill={p.paper} />
      <Text x={114} y={394 + i * 85} color={p.ink} size={40}>{label}</Text>
    </g>)}
    <g opacity={focus * (1 - resolve)}>
      <Slab x={255} y={173} w={270} h={76} color={p.paper} ink={p.ink}><Text x={25} y={47} size={30} color={p.ink}>Decision</Text></Slab>
      <path d="M550 210C630 160 680 160 742 210" fill="none" stroke={p.ink} strokeWidth="2" />
      <Slab x={745} y={173} w={270} h={76} color={p.paper} ink={p.ink}><Text x={25} y={47} size={30} color={p.ink}>Its reason</Text></Slab>
    </g>
    <g opacity={resolve}>
      <rect x="745" y="643" width="385" height="68" fill={p.paper} stroke={p.ink} strokeDasharray="7 7" />
      <Text x={937} y={685} anchor="middle" size={28} color={p.ink}>Proposed lesson · review first</Text>
    </g>
  </>;
}

function Interlock({ p, focus, resolve, opening }: WorldProps) {
  const labels = ["Content", "Type", "Mode", "Path", "Membership"];
  return <>
    {labels.map((name, i) => <g key={name} transform={`translate(${415 + i * 90 + (1 - opening) * (i - 2) * 15 + focus * (i - 2) * 38 - resolve * (i - 2) * 38} ${370 - i * 25})`}>
      <path d="M-140-130h260l40 65v185l-45 45h-250l-40-55v-190z" fill={i === 2 ? p.accent : p.material} stroke={p.ink} strokeWidth="2" />
      <path d="M-73-65h124l28 30v88l-26 25h-123l-29-28v-85z" fill={p.paper} stroke={p.ink} strokeWidth="2" />
    </g>)}
    {labels.map((name, i) => <Text key={name} x={200 + i * 220} y={685} anchor="middle" color={p.ink} size={28}>{name}</Text>)}
    <g opacity={resolve}>
      <Slab x={106} y={142} w={292} h={75} color={p.paper} ink={p.ink}><Text x={23} y={47} size={27} color={p.ink}>Matching input</Text></Slab>
      <Slab x={885} y={476} w={265} h={80} color={p.paper} ink={p.ink}><Text x={22} y={48} size={26} color={p.ink}>Changed input</Text></Slab>
      <path d="M870 448v120" stroke={p.ink} strokeWidth="9" />
      <Text x={1018} y={610} anchor="middle" size={27} color={p.ink}>Refused</Text>
      <path d="M398 180C455 180 475 250 450 290" fill="none" stroke={p.ink} strokeWidth="3" />
    </g>
    <Text x={640} y={118} anchor="middle" size={34} color={p.ink}>Verify before the resolver loads</Text>
  </>;
}

function Letterform({ p, focus, resolve, opening }: WorldProps) {
  const layers = ["Prototypes", "Live values", "Collections", "Geometry", "Structure", "Resources", "Text metrics"];
  return <>
    {[...layers].reverse().map((name, reverseIndex) => {
      const i = 6 - reverseIndex;
      const spread = 18 + opening * 5 + focus * 21 - resolve * 10;
      return <g key={name} transform={`translate(${80 + i * spread} ${135 + i * spread * .78})`}>
        <path d="M0 0h470l80 350H80z" fill={i === 3 ? p.accent : p.material} fillOpacity={i === 3 ? .48 : .18} stroke={p.ink} strokeOpacity=".42" strokeWidth="2" />
        <path d="M190 270 262 66h48l134 204h-54l-32-53h-95l-17 53zM278 177h57l-41-65z" fill={p.ink} fillOpacity={i === 3 ? .8 : .09} fillRule="evenodd" />
      </g>;
    })}
    {layers.map((name, i) => <g key={name}>
      <rect x="895" y={160 + i * 64} width="6" height="28" fill={i === 3 ? p.ink : p.material} stroke={p.ink} />
      <Text x={920} y={184 + i * 64} color={p.ink} size={28}>{name}</Text>
    </g>)}
    <path d="M205 208h383v383H205z" fill="none" stroke={p.ink} strokeDasharray="7 7" strokeWidth="2" opacity={resolve} />
    <g opacity={resolve}><rect x="895" y="638" width="292" height="58" fill={p.paper} stroke={p.ink} /><Text x={1041} y={676} anchor="middle" color={p.ink} size={25}>Fallback text metrics</Text></g>
    <Text x={590} y={730} anchor="middle" color={p.ink} size={29}>Document-model anatomy</Text>
  </>;
}

function Rooms({ p, focus, resolve, opening }: WorldProps) {
  const names = ["Documents", "Images", "Connection", "Session"];
  return <>
    <Slab x={105} y={581} w={1070} h={80} color={p.material} ink={p.ink} depth={28}>
      <Text x={535} y={51} color={p.ink} anchor="middle" size={30}>Infrastructure</Text>
    </Slab>
    {names.map((name, i) => {
      const x = 140 + i * 268;
      const shift = i === 0 ? -focus * 48 : i === 2 ? focus * 22 : 0;
      return <g key={name} transform={`translate(${x} ${230 + shift})`}>
        <path d="M0 70 70 0 215 0v285l-70 70H0z" fill={p.paper} stroke={p.ink} strokeWidth="2" />
        <path d="M0 70h145l70-70M145 70v285" fill="none" stroke={p.ink} strokeOpacity=".4" />
        <rect x="28" y="118" width="91" height="118" fill={i === 3 ? p.ink : i === 1 ? p.accent : p.material} />
        <path d={`M28 118h91v118H28z`} fill="none" stroke={p.ink} strokeWidth={1 + opening * 2} />
        {i === 3 ? <rect x="28" y="118" width={91 * resolve} height="118" fill={p.material} /> : null}
        {i === 1 ? <g opacity={focus}><circle cx="85" cy="151" r="13" fill={p.ink} /><path d="m35 219 29-42 18 21 18-25 16 46z" fill={p.ink} /><Text x={104} y={470 - shift} size={23} anchor="middle" color={p.ink}>Inspect / extract</Text></g> : null}
        {i === 2 ? <g><path d="M49 147v63m48-63v63" stroke={p.ink} strokeWidth="3" /><circle cx={49 + focus * 48} cy="180" r="12" fill={p.paper} stroke={p.ink} strokeWidth="3" /></g> : null}
        <Text x={105} y={-52 - shift} anchor="middle" color={p.ink} size={27}>{name}</Text>
        {i === 0 ? <g opacity={focus}><path d="M40 145h66M40 165h66M40 185h46" stroke={p.ink} strokeWidth="3" /></g> : null}
      </g>;
    })}
    <Text x={640} y={742} anchor="middle" color={p.ink} size={25}>{resolve > .5 ? "A session ends. The foundation remains." : "Independent capabilities, explicit boundaries"}</Text>
  </>;
}

function Proof({ p, focus, resolve, opening }: WorldProps) {
  return <>
    <g opacity={1 - resolve}><Text x={640} y={225 - focus * 45} size={100 + opening * 12 - focus * 36} anchor="middle" color={p.ink} weight={650}>for each</Text></g>
    <rect x="130" y="260" width="1040" height="344" rx="12" fill="none" stroke={p.ink} strokeWidth="3" />
    <g opacity={1 - resolve} transform={`translate(${160 + resolve * 30} ${302 - focus * 20})`}>
      <Slab x={0} y={0} w={440} h={205} color={p.paper} ink={p.ink} depth={22}>
        <Text x={28} y={55} color={p.ink} size={31}>{focus > .5 ? "Documented example" : "Preview of intent"}</Text>
        <Text x={28} y={125} color={p.ink} size={focus > .5 ? 28 : 60}>{focus > .5 ? "package / exported path" : "value: ?"}</Text>
        <path d="M28 165h380" stroke={p.ink} strokeOpacity=".35" />
      </Slab>
      <Slab x={525 - focus * 42} y={40 - focus * 40} w={385} h={205} color={p.material} ink={p.ink} depth={22}>
        <Text x={28} y={55} color={p.ink} size={31}>{focus > .5 ? "Package export" : "Unresolved stays ?"}</Text>
        <Text x={28} y={125} color={p.ink} size={27}>{focus > .5 ? "package / exported path" : "Not an invented count"}</Text>
      </Slab>
    </g>
    <g opacity={resolve}>
      {["Types", "Members", "Bundle"].map((label, i) => <Slab key={label} x={270 + i * 260} y={340} w={240} h={105} color={p.material} ink={p.ink}><Text x={120} y={64} anchor="middle" color={p.ink} size={35}>{label}</Text></Slab>)}
      <rect x="407" y="510" width="470" height="67" fill={p.accent} stroke={p.ink} />
      <Text x={640} y={553} anchor="middle" color={p.ink} size={29}>The external contract stays</Text>
    </g>
    <Text x={640} y={713} anchor="middle" color={p.ink} size={30}>Previews · Executable examples · Runtime contracts</Text>
  </>;
}

const worlds: Record<MotionStory, (props: WorldProps) => ReactNode> = {
  "workspace-security": Atlas, "one-definition-many-agent-tools": Prism,
  "reproducible-security-checks": Instrument, "security-feedback-where-you-work": Margin,
  "handoffs-that-carry-the-work": Continuity, "integrity-bound-yarn-pnp-for-bazel": Interlock,
  "typed-svg-dom": Letterform, "aws-labs-mcp": Rooms, "cloud-runtime": Proof,
};

// Pure frame geometry is shared by server-rendered stills, the scroll player,
// and Remotion renders. No browser, clock, network request or random positions.
export function StoryScene({ story, frame, id, accessible = false }: {
  story: MotionStory; frame: number; id: string; accessible?: boolean;
}) {
  const p = motionStories[story];
  const state = storyState(frame);
  const World = worlds[story];
  const chapter = frame < 300 ? 0 : frame < 650 ? 1 : 2;
  return <svg viewBox="0 0 1280 800" width="1280" height="800" className="article-story__drawing"
    role={accessible ? "img" : undefined} aria-hidden={accessible ? undefined : true}
    aria-labelledby={accessible ? id + "-title " + id + "-description" : undefined} focusable="false">
    {accessible ? <><title id={id + "-title"}>{p.chapters[chapter].title}</title><desc id={id + "-description"}>{p.chapters[chapter].description}</desc></> : null}
    <defs>
      <radialGradient id={id + "-wash"}><stop stopColor={p.material} stopOpacity=".7" /><stop offset="1" stopColor={p.paper} /></radialGradient>
      <linearGradient id={id + "-grade"} x2=".2" y2="1"><stop stopColor={p.paper} stopOpacity="0" /><stop offset="1" stopColor={p.ink} stopOpacity=".07" /></linearGradient>
      <pattern id={id + "-grain"} width="31" height="29" patternUnits="userSpaceOnUse"><circle cx="7" cy="9" r=".65" fill={p.ink} opacity=".11" /><circle cx="24" cy="21" r=".45" fill={p.ink} opacity=".08" /></pattern>
    </defs>
    <rect width="1280" height="800" fill={p.paper} />
    <ellipse cx="640" cy="390" rx="670" ry="470" fill={`url(#${id}-wash)`} />
    <path d="M75 750h1130M75 50h1130" stroke={p.ink} strokeOpacity=".15" />
    <g transform={`translate(${(1 - state.arrival) * -12} ${(1 - state.arrival) * 14})`}><World p={p} {...state} /></g>
    <rect width="1280" height="800" fill={`url(#${id}-grade)`} />
    <rect width="1280" height="800" fill={`url(#${id}-grain)`} />
  </svg>;
}
