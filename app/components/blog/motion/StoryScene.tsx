import type { ReactNode } from "react";
import { motionStories, type MotionStory } from "@/app/data/article-motion";
import { foldedSheet } from "@/app/components/blog/motion/miura-geometry";
import { between, chapterAt, storyState } from "@/app/components/blog/motion/story-timing";
import { CloudRuntimeWorld, MCPWorld } from "@/app/components/blog/motion/CapabilityScenes";

type Palette = typeof motionStories[MotionStory];
type WorldProps = { p: Palette; frame: number; id: string; focus: number; resolve: number; arrival: number; opening: number };
const FONT = '"Instrument Sans", Arial, sans-serif';
// Reverse-entry poses retain the current chapter's semantic artifacts. Their
// extra settling ends at the authored still, leaving accepted forward poses exact.
const reverseEntry = (frame: number, start: number, authored: number) => frame >= start && frame < authored ? 1 - between(frame, start, authored) : 0;
const endingVisibility = (frame: number, resolve: number) => frame >= 650 && frame < 820 ? storyState(820).resolve : resolve;

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

function Atlas({ p, frame, focus, resolve, opening }: WorldProps) {
  const projects = ["Application", "Service", "Infrastructure"];
  const scopeSettle = reverseEntry(frame, 300, 430);
  const scopeVisibility = frame >= 300 && frame < 430 ? storyState(430).focus : focus;
  const reportPrefix = frame >= 750 && frame < 820;
  const reportResolve = reportPrefix ? storyState(820).resolve : resolve;
  const reportY = 680 - reportResolve * 10;
  const dock = reportPrefix ? 1 : between(frame, 650, 800);
  return <>
    <g transform={`translate(${70 - focus * 15} ${65 + resolve * 10}) scale(${1 - resolve * .1})`}>
      {projects.map((label, i) => <g key={label} data-artifact={`workspace-project-${i}`} transform={`translate(${75 + i * 350 + (1 - opening) * (i - 1) * 24 + reverseEntry(frame, 0, 70) * (i - 1) * 28} ${165 + (i % 2) * 95 - (1 - opening) * i * 15})`}>
        <path d="M0 160 100 100 260 115 300 190 155 260 30 235z" fill={i === 1 ? p.accent : p.material} stroke={p.ink} strokeWidth="2" />
        <path d="M30 235v32l125 25 145-70v-32l-145 70z" fill={p.ink} opacity=".22" />
        <path d="M85 160 145 125 205 155 145 191z" fill={p.paper} stroke={p.ink} />
        <path d="M85 160v45l60 31v-45m60-36v45l-60 36" fill={p.paper} stroke={p.ink} />
        <Text x={145} y={75} color={p.ink} anchor="middle" size={29}>{label}</Text>
        <g opacity={1 - resolve}><Text x={145} y={338} color={p.ink} anchor="middle" size={22}>{i === 0 ? "src/api.py" : "project / path"}</Text></g>
      </g>)}
      <rect data-artifact="workspace-scope" x={50 - scopeSettle * 20} y="155" width={1050 + scopeSettle * 40} height="485" rx="30" fill="none" stroke={p.ink} strokeWidth="3" strokeDasharray="14 14" opacity={scopeVisibility * (1 - resolve * .65)} />
    </g>
    {projects.map((label, i) => <path key={label + "-address"} d={`M${278 + i * 315} ${490 + (i % 2) * 85}V660`} fill="none" stroke={p.ink} strokeWidth="2" strokeDasharray="5 6" opacity={reportResolve * .7} />)}
    {projects.map((label, i) => <g key={label} data-artifact={`report-address-${i}`} opacity={reportResolve} transform={`translate(${160 + i * 350} ${reportY})`}>
      <rect width="310" height="74" fill={p.paper} stroke={p.ink} /><rect width="8" height="74" fill={i === 1 ? p.accent : p.ink} />
      {i > 0 ? <Text x={20} y={45} size={22} color={p.ink}>{label} / path</Text> : null}
    </g>)}
    <g data-artifact="application-finding" transform={`translate(${182 - dock * 10} ${420 + dock * (reportY + 10 - 420)})`}>
      <rect width="285" height="54" rx="3" fill={p.accent} stroke={p.ink} strokeWidth="2" />
      <Text x={15} y={22} size={21} color={p.ink}>Application · src/api.py</Text>
      <Text x={15} y={44} size={17.5} color={p.ink}>Finding 01 · ownership retained</Text>
    </g>
  </>;
}

function Prism({ p, frame, focus, resolve, arrival, opening }: WorldProps) {
  const handoff = between(frame, 300, 360);
  const editionsExit = between(frame, 300, 330);
  const wrappersEnter = between(frame, 330, 360);
  const wrapperSettle = reverseEntry(frame, 360, 430);
  const chapter = chapterAt(frame, "one-definition-many-agent-tools");
  return <>
    <circle cx="640" cy="420" r="265" fill={p.material} opacity=".35" />
    <g transform={`translate(640 ${420 - handoff * 250}) rotate(${opening * 5 + focus * 8}) scale(${1 - handoff * .62})`}>
      <path d="M0-180 126 0 0 180-126 0z" fill={p.paper} stroke={p.ink} strokeWidth="3" />
      <path d="M0-95 67 0 0 95-67 0z" fill={p.accent} stroke={p.ink} strokeWidth="2" />
    </g>
    {Array.from({ length: 15 }, (_, i) => {
      const angle = (i / 15 * 2 * Math.PI) - Math.PI / 2;
      const x = 640 + Math.cos(angle) * (340 + arrival * 10 + opening * 20);
      const y = 420 + Math.sin(angle) * (220 + arrival * 10 + opening * 10);
      return <g key={i} data-artifact="integration-edition" transform={`translate(${x} ${y}) rotate(${Math.cos(angle) * 12}) scale(${1 - editionsExit * .5})`} opacity={1 - editionsExit}>
        <path d={i % 3 === 0 ? "M-36-48h53l19 20v76h-72z" : i % 3 === 1 ? "M-36-32h24l9-16h39v96h-72z" : "M-36-48h72v96h-72z"} fill={i % 5 === 0 ? p.accent : p.material} stroke={p.ink} />
        <path d="M0-20 14 0 0 20-14 0z" fill={p.ink} />
      </g>;
    })}
    {["Document", "Folder", "Plugin"].map((name, i) => <g key={name} data-artifact="native-wrapper" opacity={wrappersEnter} transform={`translate(${240 + i * 395 + wrapperSettle * (i - 1) * 12 + reverseEntry(frame, 650, 820) * (i - 1) * 24} ${470 + (1 - wrappersEnter) * 70 + (1 - focus) * 20 - resolve * 20 + wrapperSettle * 18})`}>
      <g transform={`rotate(${(1 - focus) * (1 - resolve) * (i - 1) * 8})`}>
        <path d={i === 0 ? "M-88-104h125l51 42v155h-176z" : i === 1 ? "M-88-73h59l18-31h99v197h-176z" : "M-88-104h176v197h-176z"} fill={i === 1 ? p.accent : p.material} stroke={p.ink} strokeWidth="2" />
        <path d="M0-61 41 0 0 61-41 0z" fill={p.ink} />
      </g>
      <Text x={0} y={169} anchor="middle" color={p.ink} size={32}>{name}</Text>
      <g opacity={endingVisibility(frame, resolve)}><path d="M0 181v17" stroke={p.ink} strokeWidth="2" />
        <rect x="-105" y="205" width="210" height="44" rx={i === 2 ? 20 : i === 1 ? 8 : 0} fill={p.paper} stroke={p.ink} strokeDasharray="5 5" />
        <Text x={0} y={234} anchor="middle" color={p.ink} size={23}>Receiving tool</Text>
      </g>
    </g>)}
    <Text x={640} y={82} anchor="middle" size={30} color={p.ink}>One shared definition</Text>
    <Text x={640} y={744} anchor="middle" size={27} color={p.ink}>{chapter === 2 ? "Generated form → receiving tool → acceptance check" : chapter === 1 ? "Different packaging. The guidance stays the same." : "Fifteen integrations, one source of guidance"}</Text>
  </>;
}

function Instrument({ p, frame, resolve }: WorldProps) {
  const inputMotion = (start: number) => {
    const t = Math.max(0, Math.min(1, (frame - start) / 180));
    return 1 - Math.pow(1 - t, 3);
  };
  return <>
    {["Code", "Rules", "External data"].map((name, i) => <g key={name} data-artifact={`independent-input-${i}`} transform={`translate(${175 + i * 200 + inputMotion(80 + i * 120) * (i - 1) * 55 + resolve * (i === 1 ? 75 : -35) + reverseEntry(frame, 0, 70) * (1 - i) * 32} ${100 + i * 72})`}>
      <path d="M0 0h490v54H0z" fill={i === 1 ? p.accent : p.material} stroke={p.ink} />
      <Text x={26} y={36} color={p.ink} size={27}>{name}</Text>
    </g>)}
    <g data-artifact="fixed-tool-environment" transform="translate(640 445)">
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

function Margin({ p, frame, id, focus, resolve, opening }: WorldProps) {
  const handoff = between(frame, 300, 360);
  const seam = handoff * 1280;
  const outcomeSettle = reverseEntry(frame, 650, 820);
  return <>
    <defs>
      <clipPath id={id + "-package-remainder"} clipPathUnits="userSpaceOnUse"><rect data-artifact="package-remainder" x={seam} y="0" width={1280 - seam} height="800" /></clipPath>
      <clipPath id={id + "-editor-reveal"} clipPathUnits="userSpaceOnUse"><rect data-artifact="editor-reveal" x="0" y="0" width={seam} height="800" /></clipPath>
    </defs>
    <g opacity={handoff === 1 ? 0 : 1} clipPath={`url(#${id}-package-remainder)`} data-artifact="installed-package-boundary"
      transform={frame < 70 ? `translate(${-24 * reverseEntry(frame, 0, 70)} 0)` : undefined}>
      <Slab x={135 + opening * 12} y={210} w={600} h={300} color={p.paper} ink={p.ink}>
        <Text x={35} y={65} size={38} color={p.ink}>Installed ASH package</Text>
        <Text x={35} y={135} size={28} color={p.ink}>Wheel → unpacked contents</Text>
        <path d="M35 170h520" stroke={p.ink} />
        <Text x={35} y={230} size={25} color={p.ink}>Inspect the artifact people install</Text>
      </Slab>
      <rect x="855" y="280" width="285" height="170" rx="3" fill={p.material} stroke={p.ink} strokeDasharray="9 8" />
      <Text x={998} y={345} anchor="middle" size={27} color={p.ink}>External</Text>
      <Text x={998} y={384} anchor="middle" size={27} color={p.ink}>dependencies</Text>
      <Text x={640} y={635} anchor="middle" size={28} color={p.ink}>Two inspection boundaries, not one</Text>
    </g>
    <g opacity={frame >= 650 ? 0 : 1} clipPath={`url(#${id}-editor-reveal)`} data-artifact="editor-finding">
      <Slab x={100} y={145} w={780} h={405} color={p.paper} ink={p.ink} depth={35}>
        <Text x={36} y={64} size={34} color={p.ink}>src/api.py</Text>
        {Array.from({ length: 5 }, (_, i) => <g key={i}><Text x={36} y={125 + i * 47} size={20} color={p.ink}>{40 + i}</Text><path d={`M85 ${118 + i * 47}h${450 + (i % 3) * 75}`} stroke={p.ink} strokeOpacity={i === 2 ? 1 : .25} strokeWidth={i === 2 ? 6 : 3} /></g>)}
        <rect x="74" y="197" width="650" height="35" fill={p.accent} opacity=".3" />
      </Slab>
      <Slab x={930 - focus * 80} y={335 - focus * 35} w={275} h={145} color={p.accent} ink={p.ink}>
        <Text x={22} y={44} size={30} color={p.ink}>Finding 01</Text>
        <Text x={22} y={85} size={24} color={p.ink}>src/api.py · line 42</Text>
        <Text x={22} y={118} size={22} color={p.ink}>Beside the relevant line</Text>
      </Slab>
    </g>
    {handoff > 0 && handoff < 1 ? <path d={`M${seam} 100V685`} stroke={p.ink} strokeWidth="2" strokeOpacity=".22" /> : null}
    <g opacity={endingVisibility(frame, resolve)} data-artifact="alternative-scan-outcomes"
      transform={outcomeSettle ? `translate(${640 * .03 * outcomeSettle} ${18 * outcomeSettle}) scale(${1 - .03 * outcomeSettle})` : undefined}>
      <Text x={640} y={148} anchor="middle" size={39} color={p.ink}>Five distinct outcomes</Text>
      <Text x={640} y={195} anchor="middle" size={25} color={p.ink}>Alternatives, not steps toward a clean result</Text>
      {["Complete", "No findings", "Incomplete", "Cancelled", "Unavailable"].map((label, i) => {
        const x = i < 3 ? 130 + i * 355 : 307 + (i - 3) * 355;
        const y = i < 3 ? 300 : 500;
        return <g key={label} transform={`translate(${x} ${y})`}>
          <rect width="310" height="135" rx="3" fill={p.paper} stroke={p.ink} strokeWidth="2" />
          <circle cx="36" cy="40" r="10" fill={p.material} stroke={p.ink} />
          <Text x={60} y={48} size={27} color={p.ink}>{label}</Text>
          <Text x={24} y={96} size={22} color={p.ink}>{["Finished, findings possible", "Nothing reported", "Only partially finished", "Stopped by the user", "No result available"][i]}</Text>
        </g>;
      })}
    </g>
  </>;
}

function Continuity({ p, frame, focus, resolve, opening }: WorldProps) {
  const folding = .18 + opening * .18 + focus * .49 - resolve * .69 - reverseEntry(frame, 0, 70) * .1;
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
    <g data-artifact="decision-and-reason" opacity={.7 + focus * .3}>
      <Slab x={255} y={173} w={270} h={76} color={p.paper} ink={p.ink}><Text x={25} y={47} size={30} color={p.ink}>Decision</Text></Slab>
      <path d="M550 210C630 160 680 160 742 210" fill="none" stroke={p.ink} strokeWidth="2" />
      <Slab x={745} y={173} w={270} h={76} color={p.paper} ink={p.ink}><Text x={25} y={47} size={30} color={p.ink}>Its reason</Text></Slab>
    </g>
    <g opacity={endingVisibility(frame, resolve)}>
      <rect x="745" y="643" width="385" height="68" fill={p.paper} stroke={p.ink} strokeDasharray="7 7" />
      <Text x={937} y={685} anchor="middle" size={28} color={p.ink}>Proposed lesson · review first</Text>
    </g>
  </>;
}

function Interlock({ p, frame, focus, resolve, opening }: WorldProps) {
  const labels = ["Content", "Type", "Mode", "Path", "Membership"];
  return <>
    {labels.map((name, i) => <g key={name} data-artifact={`file-check-${i + 1}`} transform={`translate(${415 + i * 90 + (1 - opening) * (i - 2) * 15 + focus * (i - 2) * 38 - resolve * (i - 2) * 38 + reverseEntry(frame, 0, 70) * (i - 2) * 12} ${370 - i * 25})`}>
      <path d="M-140-130h260l40 65v185l-45 45h-250l-40-55v-190z" fill={i === 2 ? p.accent : p.material} stroke={p.ink} strokeWidth="2" />
      <path d="M-73-65h124l28 30v88l-26 25h-123l-29-28v-85z" fill={p.paper} stroke={p.ink} strokeWidth="2" />
      <circle cx="-110" cy="-103" r="19" fill={p.paper} stroke={p.ink} />
      <Text x={-110} y={-96} anchor="middle" size={20} color={p.ink}>{i + 1}</Text>
    </g>)}
    <g data-artifact="verified-file-specimen" transform="translate(565 375)">
      <path d="M0-55h65l25 25v125H0z" fill={p.paper} stroke={p.ink} strokeWidth="2" />
      <path d="M65-55v25h25M17-7h54M17 15h54M17 37h38" fill="none" stroke={p.ink} strokeWidth="2" />
    </g>
    {labels.map((name, i) => <Text key={name} x={200 + i * 220} y={685} anchor="middle" color={p.ink} size={26}>{i + 1} · {name}</Text>)}
    <g opacity={endingVisibility(frame, resolve)}>
      <Slab x={106} y={142} w={292} h={75} color={p.paper} ink={p.ink}><Text x={23} y={47} size={27} color={p.ink}>Matching input</Text></Slab>
      <Slab x={885} y={476} w={265} h={80} color={p.paper} ink={p.ink}><Text x={22} y={48} size={26} color={p.ink}>Changed input</Text></Slab>
      <path d="M870 448v120" stroke={p.ink} strokeWidth="9" />
      <Text x={1018} y={610} anchor="middle" size={27} color={p.ink}>Refused</Text>
      <path d="M398 180C455 180 475 250 450 290" fill="none" stroke={p.ink} strokeWidth="3" />
    </g>
    <Text x={640} y={118} anchor="middle" size={34} color={p.ink}>Verify before the resolver loads</Text>
  </>;
}

function Letterform({ p, frame, focus, resolve, opening }: WorldProps) {
  const layers = ["Prototypes", "Live values", "Collections", "Geometry", "Structure", "Resources", "Text metrics"];
  const chapter = chapterAt(frame, "typed-svg-dom");
  const highlighted = chapter === 0 ? [0, 1, 2] : chapter === 1 ? [1, 2, 3, 4, 5] : [3, 6];
  return <>
    {[...layers].reverse().map((name, reverseIndex) => {
      const i = 6 - reverseIndex;
      const spread = 18 + opening * 5 + focus * 21 - resolve * 10;
      const assembled = Math.max(0, Math.min(1, (frame - i * 4) / 60));
      const lift = Math.pow(1 - assembled, 3) * (25 + i * 8);
      const active = highlighted.includes(i);
      return <g key={name} data-artifact={`svg-layer-${i}`} transform={`translate(${80 + i * spread} ${135 + i * spread * .78 - lift})`}>
        <path d="M0 0h470l80 350H80z" fill={active ? p.accent : p.material} fillOpacity={active ? .38 : .12} stroke={p.ink} strokeOpacity=".42" strokeWidth="2" />
        <path d="M190 270 262 66h48l134 204h-54l-32-53h-95l-17 53zM278 177h57l-41-65z" fill={p.ink} fillOpacity={active ? .45 : .06} fillRule="evenodd" />
        {i === 3 ? <rect x="190" y="66" width="254" height="204" fill="none" stroke={p.ink} strokeDasharray="7 7" strokeWidth="2" opacity={endingVisibility(frame, resolve)} data-artifact="illustrated-letter-bounds" /> : null}
      </g>;
    })}
    {layers.map((name, i) => <g key={name}>
      <rect x="895" y={160 + i * 64} width="6" height="28" fill={highlighted.includes(i) ? p.ink : p.material} stroke={p.ink} />
      <Text x={920} y={184 + i * 64} color={p.ink} size={28}>{name}</Text>
    </g>)}
    <g opacity={between(frame, 300, 360) * (1 - endingVisibility(frame, resolve))} data-artifact="live-attribute-link">
      <path d="M630 350C730 350 740 225 875 225" fill="none" stroke={p.ink} strokeWidth="2" />
      <rect x="905" y="592" width="282" height="42" fill={p.paper} stroke={p.ink} />
      <Text x={1046} y={620} anchor="middle" size={25} color={p.ink}>Attribute ↔ live value</Text>
    </g>
    <g opacity={endingVisibility(frame, resolve)}><rect x="895" y="638" width="292" height="58" fill={p.paper} stroke={p.ink} /><Text x={1041} y={676} anchor="middle" color={p.ink} size={25}>Fallback text metrics</Text></g>
    <Text x={590} y={730} anchor="middle" color={p.ink} size={29}>{chapter === 0 ? "Identity → live values → collections" : chapter === 1 ? "Connected behavior, built on shared foundations" : "Geometry and fallback text measurements"}</Text>
  </>;
}

const worlds: Record<MotionStory, (props: WorldProps) => ReactNode> = {
  "workspace-security": Atlas, "one-definition-many-agent-tools": Prism,
  "reproducible-security-checks": Instrument, "security-feedback-where-you-work": Margin,
  "handoffs-that-carry-the-work": Continuity, "integrity-bound-yarn-pnp-for-bazel": Interlock,
  "typed-svg-dom": Letterform, "aws-labs-mcp": MCPWorld, "cloud-runtime": CloudRuntimeWorld,
};

// Pure frame geometry is shared by server-rendered stills, the scroll player,
// and Remotion renders. No browser, clock, network request or random positions.
export function StoryScene({ story, frame, id, accessible = false, className = "article-story__drawing", artFamily, artMoment }: {
  story: MotionStory; frame: number; id: string; accessible?: boolean;
  className?: string; artFamily?: string; artMoment?: string;
}) {
  const p = motionStories[story];
  const state = storyState(frame);
  const World = worlds[story];
  const chapter = chapterAt(frame, story);
  const arrivalOffset = ["reproducible-security-checks", "cloud-runtime", "aws-labs-mcp"].includes(story) ? 0 : 1 - state.arrival;
  return <svg viewBox="0 0 1280 800" width="1280" height="800" className={className} data-story-scene-frame={frame} data-art-family={artFamily} data-art-moment={artMoment}
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
    <g transform={`translate(${arrivalOffset * -12} ${arrivalOffset * 14})`}><World p={p} frame={frame} id={id} {...state} /></g>
    <rect width="1280" height="800" fill={`url(#${id}-grade)`} />
    <rect width="1280" height="800" fill={`url(#${id}-grain)`} />
  </svg>;
}
