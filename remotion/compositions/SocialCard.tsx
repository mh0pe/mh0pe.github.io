import { useEffect, useState } from "react";
import { AbsoluteFill, Img, cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { StoryScene } from "@/app/components/blog/motion/StoryScene";
import { ArchitectureHero } from "@/app/components/v3/LivingArchitecture";
import { isMotionStory, motionStories, storyFrames } from "@/app/data/article-motion";
import { publicCredentials } from "@/app/data/credentials";
import { socialPage } from "@/app/data/social";

const theme = {
  paper: "#f7f3ec", ink: "#26344b", material: "#d7e1ef", accent: "#dca878",
  layers: ["#899ff7", "#8ecbbb", "#f8cf97", "#c8b5e5"],
  fronts: ["#5368c6", "#4f9187", "#d89b62", "#a58ac9"],
  sides: ["#34499f", "#2f655e", "#ab6d3e", "#79609f"],
  display: '"Newsreader", Georgia, serif', sans: '"Instrument Sans", Arial, sans-serif',
};

function SupportingArt({ kind }: { kind: string }) {
  if (["stack", "work", "capabilities"].includes(kind)) return <div className="social-stack">
    <ArchitectureHero />
    <div className="social-stack-labels">{["Foundations", "Security", "Developer tools", "AI workflows"].reverse().map((label, index) =>
      <div key={label} style={{ borderLeft: "5px solid " + theme.layers[3 - index] }}>{label}</div>)}</div>
  </div>;
  if (kind === "portrait") return <Img src={staticFile("portraits/madison-outdoor-720.webp")}
    style={{ width: 345, height: 345, marginLeft: 104, objectFit: "cover", objectPosition: "center top", borderRadius: "80px 12px 80px 12px" }} />;
  if (kind === "credentials") return <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22, padding: 32 }}>
    {publicCredentials.slice(0, 6).map((credential) => <Img key={credential.id} src={staticFile(credential.image.slice(1))}
      style={{ width: 150, height: 150, objectFit: "contain" }} />)}
  </div>;
  if (kind === "windows") return <svg viewBox="0 0 600 400" width="100%" height="100%">
    <ellipse cx="310" cy="320" rx="225" ry="20" fill={theme.ink} opacity=".08" />
    <g transform="translate(55 88) rotate(-5 235 100)">
      <path d="M0 0h225v50h48v90h-48v70H0z" fill={theme.material} stroke={theme.ink} strokeWidth="2" />
      <path d="M235 0h245v210H235v-60h48V40h-48z" fill={theme.accent} stroke={theme.ink} strokeWidth="2" />
      <text x="38" y="120" fontFamily={theme.sans} fontSize="38" fontWeight="600" fill={theme.ink}>Nix</text>
      <text x="312" y="120" fontFamily={theme.sans} fontSize="34" fontWeight="600" fill={theme.ink}>Windows</text>
    </g>
  </svg>;
  if (kind === "recovery") return <svg viewBox="0 0 600 400" width="100%" height="100%">
    <ellipse cx="300" cy="336" rx="210" ry="20" fill={theme.ink} opacity=".08" />
    <path d="M188 325V65h235v260" fill={theme.material} stroke={theme.ink} strokeWidth="2" />
    <path d="m188 65 120 25v250l-120-15z" fill={theme.accent} stroke={theme.ink} strokeWidth="2" />
    <path d="M68 210h135m-22-22 22 22-22 22" fill="none" stroke={theme.ink} strokeWidth="4" />
    <text x="323" y="188" fontFamily={theme.sans} fontSize="28" fontWeight="600" fill={theme.ink}>The</text>
    <text x="323" y="224" fontFamily={theme.sans} fontSize="28" fontWeight="600" fill={theme.ink}>work</text>
  </svg>;
  const labels = kind === "policy" ? ["Pass", "Reject", "Missing", "Error"]
    : kind === "decisions" ? ["Pressure", "Choice", "Cost"]
    : kind === "method" ? ["Understand", "Build", "Verify"]
    : kind === "proof" ? ["Code", "Review", "Release"]
    : kind === "models" ? ["Direction", "Models", "Review"]
    : kind === "journal" ? ["Security", "AI workflows", "Foundations"]
    : kind === "windows" ? ["Nix", "Windows"] : ["Explore", "The work"];
  return <svg viewBox="0 0 600 400" width="100%" height="100%">
    <ellipse cx="300" cy="336" rx="254" ry="23" fill={theme.ink} opacity=".08" />
    {labels.map((label, i) => {
      const x = labels.length === 4 ? 35 + i % 2 * 285 : 40 + i * (labels.length === 2 ? 255 : 165);
      const y = labels.length === 4 ? 50 + Math.floor(i / 2) * 140 : 85 + i * 35;
      const width = labels.length === 4 ? 248 : labels.length === 2 ? 250 : 210;
      return <g key={label} transform={`translate(${x} ${y}) rotate(${labels.length === 4 ? 0 : (i - 1) * 5} 90 110)`}>
        <path d={`M12 15h${width - 12}v${labels.length === 4 ? 110 : 210}H12z`} fill={theme.ink} opacity=".14" />
        <rect width={width} height={labels.length === 4 ? 110 : 210} rx="4" fill={i === 1 ? theme.accent : theme.material} stroke={theme.ink} strokeOpacity=".4" />
        <path d={`M22 24h${width - 44}`} stroke={theme.ink} strokeOpacity=".35" />
        <text x="22" y={labels.length === 4 ? 72 : 84} fontFamily={theme.sans} fontSize={labels.length === 4 ? 32 : 27} fill={theme.ink} fontWeight="600">{label}</text>
        {labels.length !== 4 ? <path d={`M22 115h${width - 54}M22 139h${width - 76}M22 163h${width - 64}`} stroke={theme.ink} strokeOpacity=".3" strokeWidth="3" /> : null}
      </g>;
    })}
  </svg>;
}

export function SocialCard({ path }: { path: string }) {
  const page = socialPage(path);
  const [fontGate] = useState(() => delayRender("Load local social-card fonts"));
  useEffect(() => {
    Promise.all([document.fonts.load('500 70px "Newsreader"'), document.fonts.load('600 24px "Instrument Sans"')])
      .then(async () => {
        await document.fonts.ready;
        if (!document.fonts.check('500 70px "Newsreader"') || !document.fonts.check('600 24px "Instrument Sans"')) {
          throw new Error("A social-card font did not load");
        }
        for (const line of document.querySelectorAll<HTMLElement>("[data-social-line]")) {
          if (line.scrollWidth > line.clientWidth + 1) throw new Error("Social headline overflows: " + line.textContent);
        }
        continueRender(fontGate);
      }).catch(cancelRender);
  }, [fontGate]);
  const palette = isMotionStory(page.art) ? motionStories[page.art] : theme;
  return <AbsoluteFill style={{ background: palette.paper, color: palette.ink, fontFamily: theme.sans }}>
    <style>{`
      @font-face {font-family: "Newsreader";src:url("${staticFile("fonts/newsreader-variable.woff2")}") format("woff2");font-weight:200 800}
      @font-face {font-family: "Instrument Sans";src:url("${staticFile("fonts/instrument-sans-variable.woff2")}") format("woff2");font-weight:400 700}
      .social-art .article-story__drawing {width:100%;height:100%;display:block}
      .social-stack {position:relative;width:100%;height:100%}
      .social-stack figure {margin:0;width:430px;position:absolute;left:-40px;top:0}
      .social-stack .architecture-hero__sculpture {width:430px;height:340px;overflow:visible}
      .social-stack .architecture-hero__key,.social-stack figcaption {display:none}
      .social-stack-labels {position:absolute;right:0;top:56px;font-size:22px;line-height:1.15}
      .social-stack-labels div {margin:0 0 18px;padding:10px 0 10px 13px;width:188px}
      .architecture-hero__shadow {fill:${theme.ink};opacity:.12}
      .architecture-hero__plinth {fill:${theme.material}}
      ${["foundations", "security", "tools", "ai"].map((area, i) => `.architecture-layer[data-area="${area}"] {--solid-top:${theme.layers[i]};--solid-front:${theme.fronts[i]};--solid-side:${theme.sides[i]}}`).join("\n")}
      .architecture-solid__top {fill:var(--solid-top)} .architecture-solid__front {fill:var(--solid-front)} .architecture-solid__side {fill:var(--solid-side)}
      .architecture-solid__edge {fill:none;stroke:${theme.paper};stroke-width:1;stroke-opacity:.4}
      .architecture-hero__inlay {fill:${theme.paper};opacity:.7}
    `}</style>
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 82% 34%, ${palette.material}, transparent 63%)`, opacity: .75 }} />
    <div style={{ position: "absolute", top: 48, left: 56, right: 56, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ fontSize: 25, fontWeight: 600, letterSpacing: -.4 }}>Madison Hope Steiner</div>
      <div style={{ fontSize: 18, letterSpacing: 2.2 }}>NOTES & SYSTEMS</div>
    </div>
    <div style={{ position: "absolute", top: 98, left: 56, right: 56, borderTop: `1px solid ${palette.ink}40` }} />
    <div style={{ position: "absolute", top: 142, left: 56, right: 56, fontSize: 21, fontWeight: 500 }}>{page.label}</div>
    <div style={{ position: "absolute", top: 220, left: 56, width: 528, fontFamily: theme.display, fontWeight: 500,
      fontSize: 70, lineHeight: 1.06, letterSpacing: -1.9 }}>
      {page.lines.map((line) => <div key={line} data-social-line style={{ whiteSpace: "nowrap" }}>{line}</div>)}
    </div>
    <div className="social-art" style={{ position: "absolute", top: 194, left: 598, width: 552, height: 345 }}>
      {isMotionStory(page.art) ? <StoryScene story={page.art} frame={storyFrames.opening} id={"social-" + page.image} /> : <SupportingArt kind={page.art} />}
    </div>
    <div style={{ position: "absolute", left: 56, bottom: 47, fontSize: 20 }}>Engineering, explained through the work.</div>
    <div style={{ position: "absolute", right: 56, bottom: 47, fontSize: 20 }}>mh0pe.github.io</div>
    <AbsoluteFill style={{ pointerEvents: "none", background: `linear-gradient(180deg, transparent 65%, ${palette.ink}05)` }} />
  </AbsoluteFill>;
}
