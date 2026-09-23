import { SourceLink } from "../components/v2/Evidence";
import { RouteFrame, RouteIntro } from "../components/v2/RouteFrame";
import {
  proofVocabulary,
  publicRecordSnapshot,
  statusVocabulary,
} from "../data/portfolio-v2";
import { routeMetadata } from "../data/route-metadata";

export const metadata = routeMetadata(
  "/proof/",
  "Public work and direct links",
  "Projects, review history, code changes, implementation state, and direct links behind Madison Hope Steiner's open-source systems portfolio.",
);

export default function ProofPage() {
  return (
    <RouteFrame current="proof">
      <RouteIntro
        code="Evidence / Public work"
        title="Follow each result back to the work."
        summary="Start with a result, then open the supporting releases, reviews, code changes, tests, and documentation."
      >
        <nav className="route-jump" aria-label="Source page sections">
          <a href="#public-record">Contribution summary</a>
          <a href="#proof-language">How to read it</a>
          <a href="#model-lineage">Model collaboration</a>
        </nav>
      </RouteIntro>

      <span className="anchor-alias" id="contribution-lineage" aria-hidden="true" />
      <section className="route-section" id="public-record" aria-labelledby="public-record-title">
        <div className="shell proof-record">
          <div>
            <p className="section-code">01 / Contribution summary</p>
            <h2 id="public-record-title">A connected view of the public work.</h2>
            <p>Follow mh0pe and awsmadi contributions across established projects, independent public versions, and the systems they helped advance.</p>
            <SourceLink sourceId="publicHistorySnapshot">Open the contribution summary</SourceLink>
          </div>
          <dl>
            <div><dt>Authored changes accepted into main projects</dt><dd>{publicRecordSnapshot.authoredMergedPullRequests}</dd></div>
            <div><dt>Accepted changes with GitHub contribution credit</dt><dd>{publicRecordSnapshot.attributedMergedPullRequests}</dd></div>
            <div><dt>Projects that accepted contributions</dt><dd>{publicRecordSnapshot.mergedPullRequestTargetRepositories}</dd></div>
            <div><dt>Projects where changes were proposed</dt><dd>{publicRecordSnapshot.allSubmittedPullRequestTargetRepositories}</dd></div>
            <div className="proof-record__note">
              <dt>Why the counts differ</dt>
              <dd>The larger total follows GitHub&apos;s contribution credit, which can include accepted work beyond directly authored changes.</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="route-section route-section--paper" id="proof-language" aria-labelledby="proof-language-title">
        <div className="shell">
          <div className="section-heading">
            <p className="section-code">02 / Reading the source</p>
            <div><h2 id="proof-language-title">Choose the level of detail you need.</h2><p>Start with what shipped, then open the review history, exact changes, tests, and documentation.</p></div>
          </div>
          <div className="source-principles">
            <article><span>01</span><h3>Start with the outcome.</h3><p>The portfolio leads with what a team can now do.</p></article>
            <article><span>02</span><h3>Inspect how it works.</h3><p>Open the project, review discussion, exact code change, tests, and documentation only when you need them.</p></article>
            <article><span>03</span><h3>Check where it lives.</h3><p>Direct links show where the work is available and how it was reviewed.</p></article>
          </div>
          <details className="vocabulary-disclosure">
            <summary>Explore source and status language</summary>
            <div className="vocabulary-grid">
              <div>
                <h3>Source types</h3>
                <dl>
                  {proofVocabulary.map((entry) => (
                    <div key={entry.id}>
                      <dt>{entry.label}</dt>
                      <dd>{entry.establishes}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <h3>Status vocabulary</h3>
                <dl>
                  {statusVocabulary.map((entry) => (
                    <div key={entry.id}>
                      <dt>{entry.label}</dt>
                      <dd>{entry.definition}<span>{entry.dimension}</span></dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </details>
        </div>
      </section>

      <section className="route-section" id="model-lineage" aria-labelledby="model-lineage-title">
        <div className="shell">
          <div className="section-heading">
            <p className="section-code">03 / Model collaboration</p>
            <div>
              <h2 id="model-lineage-title">See another dimension of the build.</h2>
              <p>
                The model view connects model associations to projects and the public work behind them. Filter it when you want to explore how the work was composed.
              </p>
              <a className="text-action" href="/models/#agent-collaboration">
                Explore model composition <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </RouteFrame>
  );
}
