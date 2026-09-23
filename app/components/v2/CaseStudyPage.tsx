import { caseStudies, publicSources, type CaseStudy } from "../../data/portfolio-v2";
import ProjectLineageField from "../v3/ProjectLineageField";
import { SourceLink, StatusStamp } from "./Evidence";
import { RouteFrame } from "./RouteFrame";
import { CaseStudyData } from "./StructuredData";

const stageActions = {
  Pressure: "See the starting point",
  Constraint: "Inspect the boundary",
  Decision: "Review the decision",
  Implementation: "Inspect the build",
  State: "See where it works",
  Proof: "Follow the public work",
} as const;

export default function CaseStudyPage({ caseStudy }: { readonly caseStudy: CaseStudy }) {
  const caseIndex = caseStudies.findIndex((candidate) => candidate.id === caseStudy.id);
  const previous = caseStudies[(caseIndex - 1 + caseStudies.length) % caseStudies.length];
  const next = caseStudies[(caseIndex + 1) % caseStudies.length];
  const sourceUrls = [...new Set(
    caseStudy.claims.flatMap((claim) => claim.sourceIds.map((sourceId) => publicSources[sourceId].href)),
  )];

  return (
    <RouteFrame current="work" motif="case-study">
      <CaseStudyData
        path={`/work/${caseStudy.id}/`}
        title={caseStudy.title}
        description={caseStudy.plainResult}
        sources={sourceUrls}
      />
      <article className="case-study">
        <header className="case-hero" id="story">
          <div className="shell case-hero__grid">
            <div className="case-hero__rail" aria-hidden="true">
              <span>RESULT</span>
              <span>SYSTEM</span>
              <span>WORK</span>
            </div>
            <div className="case-hero__body">
              <p className="section-code case-breadcrumb">
                <a href="/work/">Selected work</a> <span aria-hidden="true">/</span> {caseStudy.family}
              </p>
              <p className="micro-label case-hero__eyebrow">{caseStudy.title}</p>
              <h1 className="case-hero__plain">{caseStudy.cardHeadline}</h1>
              <p className="case-hero__result">{caseStudy.operatingResult}</p>
              <dl className="case-hero__facts">
                <div>
                  <dt>Who this helps</dt>
                  <dd>{caseStudy.audience}</dd>
                </div>
                <div>
                  <dt>My role</dt>
                  <dd>{caseStudy.responsibility}</dd>
                </div>
                <div>
                  <dt>Current state</dt>
                  <dd>{caseStudy.proofState}</dd>
                </div>
                <div>
                  <dt>Public activity</dt>
                  <dd>{caseStudy.period}</dd>
                </div>
                <div>
                  <dt>Working code</dt>
                  <dd><SourceLink sourceId={caseStudy.repositorySourceId}>{caseStudy.repository}</SourceLink></dd>
                </div>
              </dl>
              <ProjectLineageField caseStudy={caseStudy} />
            </div>
          </div>
        </header>

        <nav className="case-jump shell" aria-label={`${caseStudy.title} sections`}>
          <a href="#story">Result</a>
          <a href="#architecture">How it works</a>
          <a href="#source">Public work</a>
        </nav>

        <section className="case-path" id="architecture" aria-labelledby="case-path-title">
          <div className="shell">
            <div className="section-heading">
              <p className="section-code">How it works / {String(caseStudy.stages.length).padStart(2, "0")} stages</p>
              <div>
                <h2 id="case-path-title">From constraint to a system a team can own.</h2>
                <p>Six stages connect the original pressure to the system that now exists.</p>
              </div>
            </div>
            <ol className="case-path__list">
              {caseStudy.stages.map((stage) => {
                const [primary, ...secondary] = stage.sourceIds;
                return (
                  <li data-case-stage={stage.name.toLowerCase()} id={`stage-${stage.name.toLowerCase()}`} key={stage.name}>
                    <article>
                      <div className="case-path__marker" aria-hidden="true"><span>{stage.index}</span></div>
                      <div className="case-path__copy">
                        <p className="micro-label">{stage.name === "Proof" ? "Source" : stage.name}</p>
                        <h3>{stage.title}</h3>
                        <p>{stage.body}</p>
                        {stage.points ? <ul>{stage.points.map((point) => <li key={point}>{point}</li>)}</ul> : null}
                        <div className="case-path__proof">
                          <SourceLink sourceId={primary}>{stageActions[stage.name]}</SourceLink>
                          {secondary.length > 0 ? (
                            <details>
                              <summary>More links from this decision</summary>
                              <ul>
                                {secondary.map((sourceId) => (
                                  <li key={sourceId}><SourceLink sourceId={sourceId}>{publicSources[sourceId].label}</SourceLink></li>
                                ))}
                              </ul>
                            </details>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="case-verification" id="source" aria-labelledby="case-source-title">
          <div className="shell">
            <div className="section-heading">
              <p className="section-code">Public work / Implementation trail</p>
              <div>
                <h2 id="case-source-title">Inspect the work behind the result.</h2>
                <p>Open the working code, review discussions, exact changes, and documentation behind each part.</p>
              </div>
            </div>
            <div className="claim-ledger-grid">
              {caseStudy.claims.map((claim) => (
                <article className="claim-ledger" data-claim-id={claim.id} id={`claim-${claim.id}`} key={claim.id}>
                  <div className="claim-ledger__heading">
                    <p className="micro-label">What changed</p>
                    <StatusStamp state={claim.state} />
                  </div>
                  <h3>{claim.outcome}</h3>
                  <p>{claim.contribution}</p>
                  <details className="claim-ledger__context">
                    <summary>Where this work lives</summary>
                    <dl>
                      <div><dt>Available now</dt><dd>{claim.availability}</dd></div>
                      <div><dt>Integration</dt><dd>{claim.adoption}</dd></div>
                      <div><dt>What supports it</dt><dd>{claim.maturity}</dd></div>
                    </dl>
                  </details>
                  <div className="claim-ledger__proofs" role="group" aria-label={`Links for ${claim.outcome}`}>
                    {claim.sourceIds.map((sourceId) => <SourceLink sourceId={sourceId} key={sourceId} />)}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="case-close" aria-labelledby="case-close-title">
          <div className="shell case-close__grid">
            <p className="section-code">Continue exploring</p>
            <div>
              <h2 id="case-close-title">Compare the decisions across systems.</h2>
              <p>Move to another result, or return to the complete work collection.</p>
              <nav className="case-neighbors" aria-label="Adjacent case studies">
                <a href={`/work/${previous.id}/`}><span>Previous</span><strong>{previous.cardHeadline}</strong></a>
                <a href={`/work/${next.id}/`}><span>Next</span><strong>{next.cardHeadline}</strong></a>
              </nav>
              <div className="button-row">
                <a className="text-action" href="/work/">Explore all work <span aria-hidden="true">→</span></a>
                <a className="text-action" href="/proof/">Follow the public work <span aria-hidden="true">→</span></a>
              </div>
            </div>
          </div>
        </section>
      </article>
    </RouteFrame>
  );
}
