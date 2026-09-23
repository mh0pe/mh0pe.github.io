import { RouteFrame, RouteIntro } from "../components/v2/RouteFrame";
import OperatingArcFilm from "../components/v3/OperatingArcFilm";
import { flagshipStageNames } from "../data/portfolio-v2";
import { routeMetadata } from "../data/route-metadata";

export const metadata = routeMetadata(
  "/method/",
  "Architecture approach",
  "See Madison Hope Steiner's six-stage approach for turning operating pressure into clear decisions, working software, and a result teams can continue.",
);

const methodCopy = {
  Pressure: "Name the condition forcing change, then describe success in terms people can recognize.",
  Constraint: "Identify the trust, scale, portability, and organizational boundaries the design must respect.",
  Decision: "Record the choice, its cost, and the reasoning clearly enough for the next team to use.",
  Implementation: "Turn the decision into working software, tests, documentation, and an operable path.",
  State: "Show what works today and where people can inspect or extend it.",
  Proof: "Link the result to the release, reviewed change, working code, documentation, or contribution summary behind it.",
} as const;

export default function MethodPage() {
  return (
    <RouteFrame current="method">
      <RouteIntro
        code="Approach / Six stages"
        title="How I approach architecture."
        summary="I start with the problem and its constraints. The implementation should leave the next team enough context to maintain it."
      />
      <div className="shell">
        <OperatingArcFilm />
      </div>
      <section className="route-section" aria-labelledby="method-title">
        <div className="shell method-layout">
          <div><p className="section-code">01 / Operating approach</p><h2 id="method-title">From pressure to a system teams can operate.</h2><p>Start with the real constraint. End with a system that works, explains itself, and can be carried forward.</p></div>
          <ol className="method-stages">
            {flagshipStageNames.map((stage, index) => <li key={stage}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{stage === "Proof" ? "Source" : stage}</h3><p>{methodCopy[stage]}</p>{stage === "Decision" ? <a className="method-stage__action" href="/decisions/">See architecture decisions <span aria-hidden="true">→</span></a> : null}{stage === "Implementation" ? <a className="method-stage__action" href="/work/">Explore working systems <span aria-hidden="true">→</span></a> : null}{stage === "Proof" ? <a className="method-stage__action" href="/proof/">Follow the public work <span aria-hidden="true">→</span></a> : null}</div></li>)}
          </ol>
        </div>
      </section>
      <section className="route-section route-section--paper" aria-labelledby="method-rules-title">
        <div className="shell method-rules">
          <p className="section-code">02 / Principles</p>
          <div><h2 id="method-rules-title">The next team should be able to continue.</h2><ul><li>Frame the pressure and constraint before choosing the technology.</li><li>Leave the current state clear enough for another team to continue.</li><li>Keep decisions and public links close to the story so every reader can explore at the depth they need.</li></ul></div>
        </div>
      </section>
    </RouteFrame>
  );
}
