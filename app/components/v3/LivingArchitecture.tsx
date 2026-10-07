import type { CSSProperties, ReactNode } from "react";

type SceneKind = "guidance" | "security" | "windows" | "continuity" | "policy";
type Point = readonly [number, number];

const areas = [
  { id: "foundations", label: "Foundations", detail: "Nix on Windows", href: "#project-nix-windows" },
  { id: "security", label: "Security", detail: "Automated Security Helper", href: "#project-automated-security-helper" },
  { id: "tools", label: "Developer tools", detail: "CloudFormation Guard", href: "#project-cloudformation-guard" },
  { id: "ai", label: "AI workflows", detail: "Agent systems", href: "#project-agent-systems" },
] as const;

// The pieces describe areas of practice, not contribution volume or dependencies.
const footprints: readonly (readonly Point[])[] = [
  [[0, 0], [2.45, 0], [2.45, 1.2], [4, 1.2], [4, 3], [0, 3]],
  [[2.51, 0], [4, 0], [4, 1.14], [2.51, 1.14]],
];

function projected([x, z]: Point, height: number) {
  return [270 + (x - z) * 65, 288 + (x + z) * 24 - height * 58] as const;
}

function polygon(points: readonly Point[], height: number) {
  return points.map((point) => projected(point, height).join(",")).join(" ");
}

function Solid({ footprint, level, part }: { footprint: readonly Point[]; level: number; part: number }) {
  const bottom = level * 0.88;
  const top = bottom + 0.82;
  return (
    <g className="architecture-solid" data-part={part}>
      {footprint.map((point, index) => {
        const next = footprint[(index + 1) % footprint.length];
        const [dx, dz] = [next[0] - point[0], next[1] - point[1]];
        if (dx >= 0 && dz <= 0) return null;
        return <polygon key={index} className={dz > 0 ? "architecture-solid__side" : "architecture-solid__front"} points={[projected(point, top), projected(next, top), projected(next, bottom), projected(point, bottom)].map((p) => p.join(",")).join(" ")} />;
      })}
      <polygon className="architecture-solid__top" points={polygon(footprint, top)} />
      <polyline className="architecture-solid__edge" points={polygon(footprint, top)} />
    </g>
  );
}

export function ArchitectureHero() {
  return (
    <figure className="architecture-hero" data-motion-once>
      <div className="architecture-hero__stage">
        <svg className="architecture-hero__sculpture" viewBox="0 0 620 490" aria-hidden="true" focusable="false">
          <ellipse className="architecture-hero__shadow" cx="303" cy="450" rx="210" ry="24" />
          <path className="architecture-hero__plinth" d="M54 386 270 301 558 410 344 495Z" transform="translate(0 -15)" />
          {areas.map((area, level) => (
            <g className="architecture-layer" data-area={area.id} key={area.id} style={{ "--piece-order": level } as CSSProperties}>
              <Solid footprint={footprints[1]} level={level} part={1} />
              <Solid footprint={footprints[0]} level={level} part={0} />
              {area.id === "ai" ? <path className="architecture-hero__inlay" d="m223 138 32-12 46 17 33-12 38 14-63 24Z" /> : null}
            </g>
          ))}
        </svg>
      </div>
      <div className="architecture-hero__key">
        <p className="architecture-hero__title">Where my work fits</p>
        <ul>
          {areas.toReversed().map((area) => (
            <li key={area.id}>
              <a href={area.href} data-area={area.id}>
                <span className="architecture-hero__swatch" aria-hidden="true" />
                <span><strong>{area.label}</strong><small>{area.detail}</small></span>
                <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10h11m-4-4 4 4-4 4" /></svg>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <figcaption>From the foundations software runs on to the tools and AI workflows people use.</figcaption>
    </figure>
  );
}

function Document({ compact = false }: { compact?: boolean }) {
  return (
    <svg className="contribution-scene__document" viewBox="0 0 100 126" aria-hidden="true" focusable="false">
      <path className="contribution-scene__document-depth" d="M18 13h57l17 17v87H18Z" />
      <path className="contribution-scene__document-page" d="M9 7h57l17 17v86H9Z" />
      <path className="contribution-scene__document-fold" d="M66 7v20h17" />
      <path className="contribution-scene__document-ink" d={compact ? "M25 48h42M25 61h31M25 74h37" : "M25 45h31M25 59h42M25 73h23M25 87h36"} />
    </svg>
  );
}

function FlowArrow({ className = "" }: { className?: string }) {
  return <svg className={`contribution-scene__arrow ${className}`} viewBox="0 0 100 40" aria-hidden="true" focusable="false"><path d="M5 20h83m-12-11 12 11-12 11" /></svg>;
}

function Guidance() {
  return (
    <div className="contribution-scene__fanout">
      <div className="contribution-scene__definition"><Document /><strong>One definition</strong><span>Shared agent guidance</span></div>
      <div className="contribution-scene__translation"><FlowArrow /><span>Generate</span></div>
      <div className="contribution-scene__outputs">
        <div className="contribution-scene__documents" aria-hidden="true">{Array.from({ length: 15 }, (_, index) => <span data-output-document key={index} style={{ "--piece-order": index % 5 } as CSSProperties}><Document compact /></span>)}</div>
        <strong>15 coding tools</strong><span>A configuration for each</span>
      </div>
    </div>
  );
}

const scanLanes = ["Code checks", "Package checks", "Infrastructure checks"];

function Security() {
  return (
    <div className="contribution-scene__scan">
      <div className="contribution-scene__scan-origin"><span className="contribution-scene__pipeline-mark" aria-hidden="true"><i /><i /><i /></span><strong>Build pipeline</strong></div>
      <div className="contribution-scene__lanes">
        {scanLanes.map((label, index) => (
          <div className="contribution-scene__lane" key={label} style={{ "--piece-order": index } as CSSProperties}>
            <span className="contribution-scene__lane-symbol" aria-hidden="true">{index === 0 ? "{ }" : index === 1 ? "◇" : "▥"}</span>
            <strong>{label}</strong>
            <svg viewBox="0 0 180 24" aria-hidden="true" focusable="false"><path className="contribution-scene__lane-track" d="M1 12h168m-8-7 8 7-8 7" /><path className="contribution-scene__lane-signal" d="M1 12h154" pathLength="1" /></svg>
          </div>
        ))}
      </div>
      <div className="contribution-scene__report"><div className="contribution-scene__report-art" aria-hidden="true"><i /><i /><i /></div><strong>Combined results</strong><span>Project context stays attached</span></div>
    </div>
  );
}

function Windows() {
  return (
    <div className="contribution-scene__build">
      <div className="contribution-scene__build-contract"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m3 7 9-4 9 4-9 4ZM3 7v10l9 4 9-4V7M12 11v10" /></svg><strong>Shared Nix builder</strong><span>Common build logic</span></div>
      <div className="contribution-scene__build-runtime">
        <div className="contribution-scene__runtime-label"><span className="contribution-scene__window-mark" aria-hidden="true"><i /><i /><i /><i /></span><strong>Windows execution</strong></div>
        <div className="contribution-scene__nested-build"><span className="contribution-scene__nested-corner" aria-hidden="true" /><strong>A build</strong><div><span aria-hidden="true">↳</span><strong>Another Nix operation</strong></div><span>Builds can invoke further builds</span></div>
      </div>
    </div>
  );
}

function Continuity() {
  return (
    <div className="contribution-scene__continuity">
      <div className="contribution-scene__session contribution-scene__session--earlier"><span>Earlier session</span><div className="contribution-scene__session-lines" aria-hidden="true"><i /><i /><i /></div><strong>Work in progress</strong></div>
      <div className="contribution-scene__handoff"><span className="contribution-scene__handoff-label">Context carries forward</span><div className="contribution-scene__context"><span>Decisions</span><span>Working state</span><span>Next steps</span></div><FlowArrow /></div>
      <div className="contribution-scene__session contribution-scene__session--next"><span>Next session</span><div className="contribution-scene__session-lines" aria-hidden="true"><i /><i /><i /></div><strong>Continue the work</strong></div>
    </div>
  );
}

const verdicts = [
  { mark: "✓", label: "Meets the rule", detail: "A passing result" },
  { mark: "×", label: "Does not meet it", detail: "A rejection and its reason" },
  { mark: "∅", label: "Nothing to compare", detail: "Missing is not a pass" },
  { mark: "!", label: "Evaluation error", detail: "The check could not complete" },
];

function Policy() {
  return (
    <div className="contribution-scene__policy">
      <div className="contribution-scene__policy-input"><div><Document compact /><strong>Policy + input</strong></div><FlowArrow /><span>Evaluate, then explain</span></div>
      <ul className="contribution-scene__verdicts">{verdicts.map((verdict, index) => <li key={verdict.label} style={{ "--piece-order": index } as CSSProperties}><span aria-hidden="true">{verdict.mark}</span><div><strong>{verdict.label}</strong><small>{verdict.detail}</small></div></li>)}</ul>
    </div>
  );
}

const scenes: Record<SceneKind, { title: string; caption: string; content: () => ReactNode }> = {
  guidance: { title: "Define once. Adapt to each tool.", caption: "One source generates fifteen tool-specific configurations.", content: Guidance },
  security: { title: "Run checks in parallel. Keep the context.", caption: "Distributed security checks come together in a shared result.", content: Security },
  windows: { title: "Extend the builder. Keep the shared structure.", caption: "A Windows execution path with support for nested Nix operations.", content: Windows },
  continuity: { title: "A new session does not need a blank slate.", caption: "Recover shared working state and carry relevant context into the next session.", content: Continuity },
  policy: { title: "Keep the meaning in the result.", caption: "Distinguish a passing check from a rejection, missing information, or an evaluation error.", content: Policy },
};

export function ContributionScene({ kind }: { kind: SceneKind }) {
  const scene = scenes[kind];
  const Content = scene.content;
  return <figure className={`contribution-scene contribution-scene--${kind}`} data-motion-once><p className="contribution-scene__title">{scene.title}</p><Content /><figcaption>{scene.caption}</figcaption></figure>;
}
