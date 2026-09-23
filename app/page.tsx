import type { Metadata } from "next";

import { Arrow, SourceLink } from "./components/v2/Evidence";
import { RouteFrame } from "./components/v2/RouteFrame";
import { ProfilePageData } from "./components/v2/StructuredData";
import HopeLineField from "./components/v3/HopeLineField";
import ProjectLineageField from "./components/v3/ProjectLineageField";
import { publicCredentials } from "./data/credentials";
import {
  agentSystemsCaseStudy,
  architectureDecisions,
  automatedSecurityHelperFlagship,
  capabilityIndexRows,
  cloudFormationGuardCaseStudy,
  homepageCapabilityIds,
  nixWindowsCaseStudy,
  organizationContexts,
  outcomeSummaries,
  portfolioIdentity,
  publicSources,
} from "./data/portfolio-v2";

export const metadata: Metadata = {
  alternates: { canonical: "https://mh0pe.github.io/" },
};

const homepageCapabilities = homepageCapabilityIds.map((id) => {
  const row = capabilityIndexRows.find((candidate) => candidate.id === id);
  if (!row) throw new Error(`Missing homepage capability: ${id}`);
  return row;
});

const selectedCases = [
  automatedSecurityHelperFlagship,
  cloudFormationGuardCaseStudy,
  nixWindowsCaseStudy,
  agentSystemsCaseStudy,
] as const;

export default function HomePage() {
  return (
    <RouteFrame>
      <ProfilePageData />
      <nav className="journey-rail" aria-label="Page journey" data-journey-rail>
        <a href="#top" data-journey-section="opening"><span>Opening</span></a>
        <a href="#outcomes" data-journey-section="outcomes"><span>Outcomes</span></a>
        <a href="#work" data-journey-section="selected-work"><span>Work</span></a>
        <a href="#atlas" data-journey-section="atlas"><span>Atlas</span></a>
        <a href="#practice" data-journey-section="practice practice-detail"><span>Approach</span></a>
        <a href="#agent-collaboration" data-journey-section="composition"><span>Models</span></a>
        <a href="#trust" data-journey-section="context"><span>Experience</span></a>
      </nav>
      <span className="anchor-alias" id="top" aria-hidden="true" />

      <section className="hope-hero" data-home-section="opening" aria-labelledby="home-title">
        <div className="shell hope-hero__mast">
          <p>Madison Hope Steiner</p>
          <p>Principal AI Architect · mh0pe / awsmadi</p>
        </div>

        <div className="shell hope-hero__grid">
          <div className="hope-hero__copy">
            <p className="hope-kicker">{portfolioIdentity.eyebrow}</p>
            <h1 id="home-title">{portfolioIdentity.headline}</h1>
            <p className="hope-hero__lead">{portfolioIdentity.introduction}</p>
            <div className="hope-actions">
              <a className="hope-button hope-button--primary" href="#outcomes">
                <span>See what changes</span><span aria-hidden="true">↘</span>
              </a>
              <a className="hope-button hope-button--quiet" href={publicSources.linkedinMadison.href} target="_blank" rel="noreferrer">
                <span>Connect on LinkedIn<span className="visually-hidden">, opens in a new tab</span></span><span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <div className="hope-hero__signature-block">
            <p className="hope-hero__signature">
              Bringing <em>Hope</em> to distributed systems at enterprise scale.
            </p>
            <svg className="hope-hero__current" viewBox="0 0 520 190" aria-hidden="true">
              <path className="hope-hero__current-guide" d="M10 112C96 112 92 38 176 38s77 112 164 112 76-74 170-74" />
              <path className="hope-hero__current-trace" pathLength="1" d="M10 112C96 112 92 38 176 38s77 112 164 112 76-74 170-74" />
              <circle cx="176" cy="38" r="9" />
              <path d="M340 140l10 10-10 10-10-10Z" />
              <circle cx="510" cy="76" r="5" />
            </svg>
          </div>
        </div>

        <nav className="home-jump shell" aria-label="On this page">
          <span>Explore</span>
          <a href="#outcomes">Outcomes</a>
          <a href="#work">Work</a>
          <a href="#atlas">Living atlas</a>
          <a href="#practice">Approach</a>
          <a href="#trust">Experience</a>
        </nav>
      </section>

      <span className="anchor-alias" id="range" aria-hidden="true" />
      <span className="anchor-alias" id="outcomes" aria-hidden="true" />
      <section className="hope-act hope-transformations" data-home-section="outcomes" aria-labelledby="transformations-title">
        <div className="shell hope-act__heading">
          <p className="hope-index">01</p>
          <div>
            <p className="hope-kicker">What changes</p>
            <h2 id="transformations-title">Make the difficult system easier for a team to own.</h2>
            <p className="hope-act__summary">The strongest work changes what an organization can safely do, then leaves a path the next team can continue.</p>
          </div>
        </div>

        <div className="shell hope-transformations__grid hope-transformations__grid--four">
          {outcomeSummaries.map((outcome, index) => (
            <article key={outcome.id} data-outcome-id={outcome.id}>
              <span className="hope-transformations__number">0{index + 1}</span>
              <h3>{outcome.title}</h3>
              <p>{outcome.summary}</p>
              <p className="hope-transformations__value">{outcome.value} <span>{outcome.label}</span></p>
              {"proofHref" in outcome && outcome.proofHref ? (
                <a href={outcome.proofHref}>See the system <Arrow /></a>
              ) : (
                <SourceLink sourceId={outcome.sourceIds[0]}>See the work</SourceLink>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="hope-act hope-work" id="work" data-home-section="selected-work" aria-labelledby="work-title">
        <div className="shell hope-act__heading hope-act__heading--light">
          <p className="hope-index">02</p>
          <div>
            <p className="hope-kicker">Selected work</p>
            <h2 id="work-title">What dependable operation looks like in practice.</h2>
            <p className="hope-act__summary">Each story begins with what became possible. The architecture and public work are there when you want to go deeper.</p>
          </div>
        </div>

        <div className="shell hope-work__stories">
          {selectedCases.map((caseStudy, index) => (
            <article className={`hope-story${index === 0 ? " hope-story--flagship" : ""}`} data-family={caseStudy.family} key={caseStudy.id}>
              <div className="hope-story__copy">
                <p className="hope-story__meta">0{index + 1} · {caseStudy.family}</p>
                <h3>{caseStudy.cardHeadline}</h3>
                <p className="hope-story__project">{caseStudy.title}</p>
                <p className="hope-story__summary">{caseStudy.summary}</p>
                <div className="hope-story__actions">
                  <a href={`/work/${caseStudy.id}/`}>Explore the system <Arrow /></a>
                  <SourceLink sourceId={caseStudy.repositorySourceId}>See the working code</SourceLink>
                </div>
              </div>
              <ProjectLineageField caseStudy={caseStudy} compact />
            </article>
          ))}
        </div>

        <div className="shell hope-work__conversation">
          <p>Have a system that is difficult to govern, operate, or evolve?</p>
          <a className="hope-work__conversation-link" href={publicSources.linkedinMadison.href} target="_blank" rel="noreferrer">
            Connect on LinkedIn<span className="visually-hidden">, opens in a new tab</span> <Arrow />
          </a>
        </div>
      </section>

      <span className="anchor-alias" id="atlas" aria-hidden="true" />
      <section className="hope-act hope-atlas" data-home-section="atlas" aria-label="Living systems atlas">
        <div className="shell hope-line-chamber">
          <HopeLineField compact />
        </div>
      </section>

      <span className="anchor-alias" id="frontier" aria-hidden="true" />
      <span className="anchor-alias" id="contribution-lineage" aria-hidden="true" />
      <section className="hope-act hope-patterns" data-home-section="practice" aria-labelledby="patterns-title" id="practice">
        <div className="shell hope-patterns__layout">
          <div className="hope-patterns__intro">
            <p className="hope-index">04</p>
            <p className="hope-kicker">Staff-level leverage</p>
            <h2 id="patterns-title">Turn isolated fixes into capabilities other teams can use.</h2>
            <p>Clarify who owns the system, make the trade-offs explicit, and leave architecture another team can run.</p>
            <div className="hope-actions">
              <a className="hope-text-link" href="/method/">See the approach <Arrow /></a>
              <a className="hope-text-link" href="/decisions/">Read key decisions <Arrow /></a>
            </div>
          </div>

          <ol className="hope-patterns__list">
            {homepageCapabilities.slice(0, 3).map((row, index) => (
              <li key={row.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{row.system}</h3><p>{row.capability}</p></div>
                <small>{row.family}</small>
              </li>
            ))}
          </ol>
        </div>

        <div className="shell principal-scope" role="group" aria-label="How I create leverage">
          <article><span>Frame</span><h3>Name the boundary that actually matters.</h3><p>Trust, ownership, portability, and failure behavior shape the system before technology choices do.</p></article>
          <article><span>Decide</span><h3>Make the trade-off useful to the next team.</h3><p>A durable decision explains the choice, the cost, and the conditions that would change it.</p></article>
          <article><span>Enable</span><h3>Leave a path others can operate and extend.</h3><p>Working code, tests, documentation, and clear boundaries turn individual delivery into organizational leverage.</p></article>
        </div>
      </section>

      <section className="hope-act hope-practice" data-home-section="practice-detail" aria-labelledby="practice-title">
        <div className="shell hope-practice__grid">
          <div className="hope-practice__intro">
            <p className="hope-index">05</p>
            <p className="hope-kicker">Architecture as judgment</p>
            <h2 id="practice-title">The reasoning should remain visible after the build.</h2>
            <p>Pressure, constraints, decisions, implementation, current state, and source form one continuous operating story.</p>
            <a className="hope-text-link" href="/method/">See how I work <Arrow /></a>
          </div>

          <ol className="hope-decisions">
            {architectureDecisions.map((decision) => (
              <li key={decision.id}>
                <p>{decision.family}</p>
                <h3>{decision.question}</h3>
                <a href={`/decisions/#${decision.id}`}>Read the decision <Arrow /></a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <span className="anchor-alias" id="agent-collaboration" aria-hidden="true" />
      <section className="hope-act hope-composition" data-home-section="composition" aria-labelledby="composition-title">
        <div className="shell hope-composition__grid">
          <div>
            <p className="hope-index">06</p>
            <p className="hope-kicker">Human judgment, extended</p>
            <h2 id="composition-title">Use models to extend judgment without losing accountability.</h2>
          </div>
          <div className="hope-composition__copy">
            <p>I have helped pioneer practical patterns for subagents, coordinated agent teams, and organizations that improve their own operating playbooks.</p>
            <p>Explore where model collaboration appears in the work, then follow any result back to its public source.</p>
            <div className="hope-actions">
              <a className="hope-button hope-button--primary" href="/models/#agent-collaboration"><span>Explore model collaboration</span><span aria-hidden="true">↗</span></a>
              <a className="hope-button hope-button--quiet" href="/work/agent-systems/"><span>See the agent systems</span><span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </div>
      </section>

      <span className="anchor-alias" id="record" aria-hidden="true" />
      <span className="anchor-alias" id="trust" aria-hidden="true" />
      <section className="hope-act hope-context" data-home-section="context" aria-labelledby="context-title">
        <div className="shell hope-context__heading">
          <p className="hope-index">07</p>
          <div>
            <p className="hope-kicker">Impact in context</p>
            <h2 id="context-title">Architecture shaped across demanding environments.</h2>
            <p>Work has crossed cloud infrastructure, blockchain, consumer marketplaces, digital insurance, mobility, media accessibility, and enterprise platforms.</p>
          </div>
        </div>

        <div className="shell hope-context__grid">
          {organizationContexts.map((context) => (
            <article key={context.id}><h3>{context.label}</h3><p>{context.scope}</p></article>
          ))}
        </div>

        <a className="shell hope-credential-signal" href="/credentials/">
          <span className="hope-credential-signal__count">{publicCredentials.length}</span>
          <span>
            <strong>Credentials earned across the systems disciplines.</strong>
            <small>Security, cloud architecture, AI, data, networking, and infrastructure, each linked to its public Credly record.</small>
          </span>
          <span className="hope-credential-signal__action">Explore the learning record <Arrow /></span>
        </a>

        <div className="shell hope-context__close">
          <p>Explore the organizations and operating environments that shaped this work, or inspect the public systems behind it.</p>
          <div className="hope-actions">
            <a className="hope-text-link" href="/about/">See experience <Arrow /></a>
            <a className="hope-text-link" href="/proof/">Follow the public work <Arrow /></a>
          </div>
        </div>
      </section>
    </RouteFrame>
  );
}
