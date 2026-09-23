import { SourceLink } from "../components/v2/Evidence";
import { RouteFrame, RouteIntro } from "../components/v2/RouteFrame";
import { architectureDecisions, publicSources } from "../data/portfolio-v2";
import { routeMetadata } from "../data/route-metadata";

export const metadata = routeMetadata(
  "/decisions/",
  "Architecture decision register",
  "Explore Madison Hope Steiner's architecture decisions across policy correctness, agent integration, and browser delivery, with trade-offs and public work.",
);

export default function DecisionsPage() {
  return (
    <RouteFrame current="decisions" motif="decisions">
      <RouteIntro code="Decisions / 03 records" title="The trade-off is part of the architecture." summary="A useful decision captures the pressure, the choice, its cost, and the code that followed." />
      <section className="route-section" aria-labelledby="decision-register-title">
        <div className="shell">
          <h2 id="decision-register-title" className="visually-hidden">Architecture decisions</h2>
          <ol className="decision-pages">
            {architectureDecisions.map((decision) => (
              <li key={decision.id} id={decision.id}>
                <article>
                  <div className="decision-pages__index"><span>{decision.number}</span><small>{decision.family}</small></div>
                  <div className="decision-pages__body">
                    <p className="micro-label">Question</p><h3 className="decision-pages__question">{decision.question}</h3>
                    <dl>
                      <div><dt>Decision</dt><dd>{decision.decision}</dd></div>
                      <div><dt>Result</dt><dd>{decision.consequence}</dd></div>
                      <div><dt>Trade-off</dt><dd>{decision.tradeoff}</dd></div>
                    </dl>
                    <div className="decision-pages__proofs">
                      {decision.sourceIds.map((sourceId) => <SourceLink sourceId={sourceId} key={sourceId}>{publicSources[sourceId].label}</SourceLink>)}
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </RouteFrame>
  );
}
