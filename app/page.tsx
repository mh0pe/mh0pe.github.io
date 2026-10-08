/* eslint-disable @next/next/no-html-link-for-pages -- Native links preserve the static portfolio's navigation. */
import type { Metadata } from "next";
import Image from "next/image";
import { SourceLink } from "./components/v2/Evidence";
import { RouteFrame } from "./components/v2/RouteFrame";
import { ProfilePageData } from "./components/v2/StructuredData";
import ProjectLineageField from "./components/v3/ProjectLineageField";
import { ArchitectureHero, ContributionScene } from "./components/v3/LivingArchitecture";
import { developmentPhilosophy } from "./data/philosophy";
import { credentialsByCategory } from "./data/credentials";
import professionalHistory from "./data/professional-history.json";
import { articleBySlug, articlePath, legacyEntryPoints, topicFor } from "./data/blog";
import {
  agentSystemsCaseStudy,
  automatedSecurityHelperFlagship,
  cloudFormationGuardCaseStudy,
  nixWindowsCaseStudy,
  organizationContexts,
  publicSources,
} from "./data/portfolio-v2";

export const metadata: Metadata = {
  alternates: { canonical: "https://mh0pe.github.io/" },
};

const stories = [
  { project: automatedSecurityHelperFlagship, kind: "security", title: "Security checks that work together.", description: "Coordinate checks across projects, bring the findings together, and keep each project's context intact.", layer: "Security & delivery" },
  { project: cloudFormationGuardCaseStudy, kind: "policy", title: "A result you can act on.", description: "Keep the meaning of a policy intact, from the rule a person writes to the result they receive.", layer: "Developer tools" },
  { project: nixWindowsCaseStudy, kind: "windows", title: "Open another place to build.", description: "Bring the shared Nix build system to Windows, with native execution and builds that can invoke further work.", layer: "Infrastructure" },
  { project: agentSystemsCaseStudy, kind: "continuity", title: "Let the next session pick up the work.", description: "Carry decisions, working context, and recoverable state across the tools an agent team uses.", layer: "AI workflows" },
] as const;

const writingEntries = legacyEntryPoints.filter((entry) => entry.kind === "article").map((entry) => ({
  entry,
  article: articleBySlug(entry.href.split("/")[2])!,
}));

export default function HomePage() {
  return (
    <RouteFrame>
      {/* Route styles follow the shared theme in the static export. */}
      {/* eslint-disable @next/next/no-css-tags */}
      <link rel="stylesheet" href="/living-systems.css?v=20261001-philosophy" />
      {/* eslint-disable @next/next/no-css-tags */}
      <link rel="stylesheet" href="/living-architecture.css?v=20261003-palette" />
      {/* eslint-disable @next/next/no-css-tags */}
      <link rel="stylesheet" href="/landing-story.css?v=20261007-journal-targets" />
      <ProfilePageData />
      <div className="landing-story">
        <span className="anchor-alias" id="top" aria-hidden="true" />
        <section className="landing-opening shell" data-home-section="opening" aria-labelledby="home-title">
          <div className="landing-opening__copy">
            <p className="landing-role">Principal AI Architect</p>
            <h1 id="home-title">Bringing Hope to distributed systems.</h1>
            <p className="landing-lead">I help teams make AI, security, and cloud platforms work together at enterprise scale.</p>
            <div className="landing-actions">
              <a className="hope-button hope-button--primary" href="#work">Explore my work</a>
              <a className="landing-link" href="#philosophy">How I think</a>
            </div>
          </div>
          <ArchitectureHero />
        </section>

        <span className="anchor-alias" id="range" aria-hidden="true" />
        <span className="anchor-alias" id="outcomes" aria-hidden="true" />
        <span className="anchor-alias" id="atlas" aria-hidden="true" />
        <section className="landing-work" id="work" data-home-section="selected-work" aria-labelledby="work-title">
          <header className="shell landing-section-heading">
            <p className="landing-label">Selected work</p>
            <h2 id="work-title">The pieces matter.<br />So does how they fit.</h2>
            <p>Explore what I contributed, what it enables, and the work behind it.</p>
          </header>
          <div className="shell landing-projects">
            {stories.map(({ project, kind, title, description, layer }, index) => (
              <article className="landing-project" id={`project-${project.id}`} data-story-kind={kind} key={project.id} aria-labelledby={`story-${project.id}`}>
                <div className="landing-project__copy">
                  <span className="anchor-alias" id={`post-${project.id === "agent-systems" ? "portable-frameworks" : project.id}`} aria-hidden="true" />
                  <p className="landing-project__identity">{project.title}</p>
                  <h3 id={`story-${project.id}`}>{title}</h3>
                  <p className="landing-project__description">{description}</p>
                  <p className="landing-project__contribution"><strong>My contribution</strong> {project.contributionSummary}</p>
                  <span className="landing-project__layer">{layer}</span>
                </div>
                <ContributionScene kind={kind} />
                <div className="landing-project__depth">
                  <details className="landing-details">
                    <summary>Explore the contribution</summary>
                    <div className="landing-details__body">
                      {index === 0 ? (
                        <>
                          <h4>One definition, fifteen coding tools.</h4>
                          <p>A shared definition becomes the configuration each tool needs, so teams can carry the same guidance across working environments.</p>
                          <ContributionScene kind="guidance" />
                          <section className="landing-recent" aria-label="Recent contributions to Automated Security Helper">
                            <h4>Recent work</h4>
                            <ul>{automatedSecurityHelperFlagship.recentWork.map((work) => (
                              <li key={work.sourceId}><h5>{work.title}</h5><p>{work.summary}</p><SourceLink sourceId={work.sourceId}>Read the change</SourceLink></li>
                            ))}</ul>
                          </section>
                        </>
                      ) : null}
                      <ProjectLineageField caseStudy={project} compact inlineSources />
                      <a className="landing-link" href={`/work/${project.id}/`}>Read the full project story</a>
                    </div>
                  </details>
                  <SourceLink sourceId={project.repositorySourceId}>See the working code</SourceLink>
                </div>
              </article>
            ))}
          </div>
        </section>

        <span className="anchor-alias" id="frontier" aria-hidden="true" />
        <span className="anchor-alias" id="contribution-lineage" aria-hidden="true" />
        <span className="anchor-alias" id="practice" aria-hidden="true" />
        <span className="anchor-alias" id="agent-collaboration" aria-hidden="true" />
        <section className="shell landing-philosophy" id="philosophy" data-home-section="philosophy" aria-labelledby="philosophy-title">
          <div className="landing-philosophy__intro">
            <p className="landing-label">Development &amp; AI philosophy</p>
            <h2 id="philosophy-title">Extend what a team can do.</h2>
            <p>I use AI to explore further and build more. Responsibility for the architecture and the result stays with me.</p>
            <a className="landing-link" href="/models/#agent-collaboration">Explore how I work with models</a>
          </div>
          <div className="landing-principles">
            {developmentPhilosophy.map((principle) => (
              <details className="landing-principle" key={principle.id}>
                <summary><h3>{principle.title}<span aria-hidden="true">+</span></h3></summary>
                <div><p>{principle.body}</p><a className="landing-link" href={principle.href}>{principle.example}</a></div>
              </details>
            ))}
          </div>
        </section>

        <section className="shell landing-writing" id="writing" data-home-section="writing" aria-labelledby="writing-title">
          <header>
            <p className="landing-label">Writing</p>
            <h2 id="writing-title">The decisions behind the work.</h2>
            <p>Illustrated essays on how a platform comes together, where a boundary belongs, and what makes software useful to the next person.</p>
            <a className="landing-link" href="/blog/">Explore all writing</a>
          </header>
          <div className="landing-writing__entries">
            {writingEntries.map(({ entry, article }) => <article id={`post-${entry.id}`} key={entry.id}>
              <p>{topicFor(article).label}</p>
              <h3><a href={articlePath(article)}>{article.title}</a></h3>
              <p>{article.deck}</p>
            </article>)}
          </div>
        </section>

        <span className="anchor-alias" id="record" aria-hidden="true" />
        <span className="anchor-alias" id="trust" aria-hidden="true" />
        <section className="landing-experience" id="experience" data-home-section="context" aria-labelledby="experience-title">
          <div className="shell">
            <div className="landing-experience__intro">
              <picture className="landing-portrait">
                <source type="image/avif" srcSet="/portraits/madison-outdoor-480.avif 480w, /portraits/madison-outdoor-720.avif 720w" sizes="(max-width: 700px) 70vw, 320px" />
                <img src="/portraits/madison-outdoor-720.webp" width="720" height="960" alt="Madison Hope Steiner outdoors" loading="lazy" decoding="async" />
              </picture>
              <div>
                <p className="landing-label">Experience</p>
                <h2 id="experience-title">Different environments.<br />A wider perspective.</h2>
                <p>My work spans cloud platforms, financial systems, consumer products, mobility, and media. Each brings a different set of constraints, and a different reason to get the architecture right.</p>
                <a className="landing-link" href={publicSources.linkedinMadison.href} target="_blank" rel="noreferrer">My professional background on LinkedIn<span className="visually-hidden">, opens in a new tab</span></a>
              </div>
            </div>
            <h3 className="landing-employers-title">Organizations where I have worked</h3>
            <div className="landing-employers">
              {professionalHistory.employers.map((employer) => (
                <details className="landing-employer" key={employer.logo_key}>
                  <summary>
                    <span className="landing-employer__logo" aria-hidden="true">
                      {employer.logo ? <Image src={employer.logo} alt="" width={employer.width ?? 240} height={employer.height ?? 96} loading="lazy" unoptimized /> : <span>F.T.</span>}
                    </span>
                    <span>{employer.name}</span>
                    <span className="landing-employer__plus" aria-hidden="true">+</span>
                  </summary>
                  <p>{employer.scope}</p>
                </details>
              ))}
            </div>
            <details className="landing-details landing-contexts">
              <summary>Work across payments, banking, mobility, and investment</summary>
              <div className="landing-contexts__grid">
                {organizationContexts.map((context) => <div key={context.id}><h4>{context.label}</h4><p>{context.scope}</p></div>)}
              </div>
            </details>
          </div>
        </section>

        <section className="shell landing-credentials" id="credentials" aria-labelledby="credentials-title">
          <div className="landing-section-heading">
            <p className="landing-label">Always learning</p>
            <h2 id="credentials-title">Breadth built through practice and study.</h2>
            <p>Certifications and training badges earned across security, architecture, AI, and platforms.</p>
          </div>
          <div className="landing-credential-groups">
            {credentialsByCategory.map((category) => (
              <section className="landing-credential-group" key={category.id} aria-labelledby={`badges-${category.id}`}>
                <h3 id={`badges-${category.id}`}>{category.label}</h3>
                <ul className="landing-credential-gallery">
                  {category.credentials.map((credential) => (
                    <li key={credential.id}>
                      <a href={credential.href} target="_blank" rel="noreferrer">
                        <Image src={credential.image} alt="" width={128} height={128} loading="lazy" unoptimized />
                        <span>
                          <strong>{credential.name}</strong>
                          <small>Earned {credential.issued}</small>
                          <span className="visually-hidden">View Credly record, opens in a new tab</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
        <span className="anchor-alias" id="connect" aria-hidden="true" />
      </div>
    </RouteFrame>
  );
}
