import { SourceLink, StatusStamp } from "../components/v2/Evidence";
import { RouteFrame, RouteIntro } from "../components/v2/RouteFrame";
import ProjectLineageField from "../components/v3/ProjectLineageField";
import { caseStudies } from "../data/portfolio-v2";
import { routeMetadata } from "../data/route-metadata";

export const metadata = routeMetadata(
  "/work/",
  "Selected open-source systems",
  "Four systems that turn difficult security, infrastructure, portability, and agent coordination problems into results teams can use.",
);

export default function WorkPage() {
  return (
    <RouteFrame current="work">
      <RouteIntro
        code="Work / 04 systems"
        title="Four systems, built for the next team."
        summary="Security teams retain control. Platform teams gain a path across operating systems. Agent teams carry decisions forward. Explore the choices that make each possible."
      >
        <nav className="route-jump" aria-label="Work page sections">
          <a href="#systems">Explore the systems</a>
          <a href="#states">See what is available</a>
        </nav>
      </RouteIntro>

      <section className="route-section" id="systems" aria-labelledby="systems-title">
        <div className="shell">
          <div className="section-heading">
            <p className="section-code">01 / Outcomes</p>
            <div><h2 id="systems-title">Start with what became possible.</h2><p>Each story leads with the result, then opens into the judgment, architecture, and public work behind it.</p></div>
          </div>
          <ol className="work-index">
            {caseStudies.map((caseStudy, index) => (
              <li key={caseStudy.id}>
                <article>
                  <div className="work-index__copy">
                    <div className="work-index__heading">
                      <p className="micro-label">{caseStudy.eyebrow}</p>
                      <span className="work-index__number" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3>{caseStudy.cardHeadline}</h3>
                    <p className="work-index__project">{caseStudy.title}</p>
                    <p>{caseStudy.plainResult}</p>
                    <dl className="work-index__facts">
                      <div><dt>Who it helps</dt><dd>{caseStudy.audience}</dd></div>
                      <div><dt>My role</dt><dd>{caseStudy.responsibility}</dd></div>
                    </dl>
                    <div className="work-index__actions">
                      <a className="button button--primary" href={`/work/${caseStudy.id}/`}>Explore the system</a>
                      <SourceLink sourceId={caseStudy.repositorySourceId}>See the working code</SourceLink>
                    </div>
                  </div>
                  <ProjectLineageField caseStudy={caseStudy} compact />
                </article>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="route-section route-section--paper" id="states" aria-labelledby="states-title">
        <div className="shell">
          <div className="section-heading">
            <p className="section-code">02 / Source</p>
            <div><h2 id="states-title">Take the work further.</h2><p>Explore the releases and working implementations, with links to the code and the decisions behind it.</p></div>
          </div>
          <ol className="work-state-list">
            {caseStudies.map((caseStudy) => (
              <li key={caseStudy.id}>
                <div><p className="micro-label">{caseStudy.title}</p><h3>{caseStudy.proofState}</h3></div>
                <StatusStamp state={caseStudy.claims[0].state} />
                <a href={`/work/${caseStudy.id}/#source`}>Open the linked work</a>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </RouteFrame>
  );
}
