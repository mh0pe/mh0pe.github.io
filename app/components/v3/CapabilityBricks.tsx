import type { CSSProperties } from "react";
import { capabilityProjects, type CapabilityProject } from "@/app/data/capability-bricks";

type Change = CapabilityProject["changes"][number];

// Solids provide depth; HTML labels carry every piece of information.
// The only repeated-object count is the fifteen documented tool integrations.
function SceneObject({ stage, count }: { stage: number; count?: number }) {
  const motion = { "--assemble-x": stage === 0 ? "-12px" : "12px", "--assemble-y": "-14px", "--assemble-order": stage } as CSSProperties;
  return (
    <svg viewBox="0 0 180 126" focusable="false" aria-hidden="true">
      <ellipse className="cap-object__shadow" cx="91" cy="110" rx="68" ry="8" />
      <g className="cap-piece" style={motion}>
        <path className="cap-object__top" d="M20 49 91 18 160 49 90 81Z" />
        <path className="cap-object__front" d="M20 49 90 81 90 108 20 76Z" />
        <path className="cap-object__side" d="M90 81 160 49 160 76 90 108Z" />
        {stage === 0 ? <g className="cap-object__detail"><path d="M59 46 90 32 124 47 92 62Z" /><path d="m72 46 18-8m-8 15 18-8" /></g> : null}
        {stage === 1 ? <g className="cap-object__detail"><path d="m49 47 29-13 15 7-9 4 15 7-20 9Z" /><path d="m89 35 17-7 30 14-28 13-15-7 10-5Z" /></g> : null}
        {stage === 2 && count ? <g className="cap-object__tiles">{Array.from({ length: count }, (_, i) => {
          const x = 72 + i % 5 * 11 - Math.floor(i / 5) * 11;
          const y = 34 + i % 5 * 5 + Math.floor(i / 5) * 5;
          return <path key={i} data-output-tile d={`M${x} ${y}l8-4 8 4-8 4Z`} />;
        })}</g> : null}
        {stage === 2 && !count ? <g className="cap-object__detail"><path d="m60 45 29-13 32 15-29 13Z" /><path d="m76 45 9 4 17-8" /></g> : null}
      </g>
    </svg>
  );
}

export function CapabilityScene({ change, color = 0 }: { change: Change; color?: number }) {
  const stages = [change.scene.start, change.scene.addition, change.scene.result];
  return (
    <ol className="cap-scene" data-color={color} aria-label="Starting point, my contribution, and what it enables">
      {stages.map((stage, index) => (
        <li className="cap-scene__stage" data-stage={index} key={stage.label}>
          <div className="cap-scene__object"><SceneObject stage={index} count={index === 2 ? change.scene.outputCount : undefined} /></div>
          <div className="cap-scene__label">
            <span className="cap-scene__role">{["Starting point", "My contribution", "Enables"][index]}</span>
            <strong>{stage.label}</strong><small>{stage.detail}</small>
          </div>
          {index < 2 ? <span className="cap-scene__arrow" aria-hidden="true">→</span> : null}
        </li>
      ))}
    </ol>
  );
}

export function CapabilityHero() {
  return (
    <figure className="cap-hero" data-stack-assembly>
      <div className="cap-hero__heading"><span>One definition. Fifteen coding tools.</span><span>Automated Security Helper</span></div>
      <CapabilityScene change={capabilityProjects[0].changes[0]} />
      <figcaption><strong>Shared guidance, wherever the team works.</strong><a href="#outcomes">Explore my contributions <span aria-hidden="true">↘</span></a></figcaption>
    </figure>
  );
}

function shortDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(date));
}

export default function CapabilityBricks() {
  return (
    <section className="cap-exhibit hope-act" data-home-section="outcomes" aria-labelledby="cap-title">
      <div className="shell">
        <div className="cap-exhibit__heading">
          <div><p className="hope-kicker">01 / Contributions in action</p><h2 id="cap-title">What I added.<br /><em>What it enables.</em></h2></div>
          <p>Choose a project, then a contribution. See what it connects, what I built, and how others can use it.</p>
        </div>
        <fieldset className="cap-projects">
          <legend className="visually-hidden">Choose a project to explore</legend>
          {capabilityProjects.map((project, index) => (
            <label key={project.id}><input type="radio" name="cap-project" value={project.id} defaultChecked={index === 0} /><span><small>0{index + 1}</small>{project.name}</span></label>
          ))}
        </fieldset>
        {capabilityProjects.map((project, projectIndex) => (
          <article className="cap-project" key={project.id} aria-label={project.name} data-cap-project={project.id} data-cap-index={projectIndex} data-capability-story>
            <p className="cap-fallback-name">{project.name}</p>
            <fieldset className="cap-history">
              <legend>Explore a contribution <span>/ 2026</span></legend>
              <div className="cap-history__steps">
                {project.changes.map((change, index) => (
                  <label key={change.id}><input type="radio" name={`cap-change-${project.id}`} value={index} defaultChecked={index === 2} /><span><time dateTime={change.date}>{shortDate(change.date)}</time><strong>{change.short}</strong><i aria-hidden="true">{index + 1}</i></span></label>
                ))}
              </div>
            </fieldset>
            <div className="cap-story-views" data-stack-assembly>
              {project.changes.map((change, index) => (
                <section className="cap-change" data-change={index} key={change.id} aria-labelledby={`cap-${change.id}`}>
                  <header className="cap-change__intro"><h3 id={`cap-${change.id}`}>{change.title}</h3><p>{change.meaning}</p></header>
                  <CapabilityScene change={change} color={index} />
                  <a className="cap-source" href={change.href} target="_blank" rel="noreferrer">Read this contribution on GitHub <span aria-hidden="true">↗</span><span className="visually-hidden">, opens in a new tab</span></a>
                </section>
              ))}
            </div>
            <div className="cap-project__actions"><a className="cap-case" href={project.href}>See the full project <span aria-hidden="true">→</span></a><button className="cap-replay" type="button" data-cap-replay hidden>Replay illustration <span aria-hidden="true">↺</span></button></div>
            <details className="cap-reading"><summary>About these contributions</summary><p>These are selected changes, not the project&apos;s complete history. Dates show the latest included commit in each saved change, not a release date. Each illustration explains one capability; the contributions are not steps that must be used in sequence.</p></details>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CapabilityFeatureArt() {
  return <div className="cap-feature-art" data-stack-assembly><CapabilityScene change={capabilityProjects[0].changes[0]} /></div>;
}
