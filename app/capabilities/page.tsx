import CapabilityAtlas from "../components/v2/CapabilityAtlas";
import { RouteFrame, RouteIntro } from "../components/v2/RouteFrame";
import { capabilityIndexRows } from "../data/portfolio-v2";
import { routeMetadata } from "../data/route-metadata";

export const metadata = routeMetadata(
  "/capabilities/",
  "How I help teams",
  "Reusable architecture across security, agent systems, cloud platforms, browser systems, and developer infrastructure.",
);

export default function CapabilitiesPage() {
  return (
    <RouteFrame current="capabilities">
      <RouteIntro
        code={`How I help / ${String(capabilityIndexRows.length).padStart(2, "0")} systems`}
        title="Tools other teams can use."
        summary="Find capabilities for security, agent coordination, infrastructure, and browsers, with links to the code and documentation."
      />
      <section className="route-section" aria-labelledby="atlas-title">
        <div className="shell"><h2 id="atlas-title" className="visually-hidden">Capability atlas</h2><CapabilityAtlas /></div>
      </section>
    </RouteFrame>
  );
}
