import AttributionExplorer from "../components/AttributionExplorer";
import { RouteFrame, RouteIntro } from "../components/v2/RouteFrame";
import { routeMetadata } from "../data/route-metadata";

export const metadata = routeMetadata(
  "/models/",
  "Model collaboration",
  "Explore where model collaboration appears across Madison Hope Steiner's public work and follow each view to the linked code changes.",
);

export default function ModelsPage() {
  return (
    <RouteFrame current="models" motif="models">
      <RouteIntro
        code="Models / Collaboration"
        title="The models I work with."
        summary="Compare model use across projects, then open the code changes behind each result."
      >
        <nav className="route-jump" aria-label="Model collaboration page sections">
          <a href="#agent-collaboration">Explore the model view</a>
          <a href="/proof/">How to read the public work</a>
        </nav>
      </RouteIntro>
      <div className="proof-models">
        <AttributionExplorer sectionCode="01 / Model composition" />
      </div>
    </RouteFrame>
  );
}
