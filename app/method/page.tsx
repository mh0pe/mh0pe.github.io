import { Arrow } from "@/app/components/v2/Evidence";
import { RouteFrame, RouteIntro } from "@/app/components/v2/RouteFrame";
import OperatingArcFilm from "@/app/components/v3/OperatingArcFilm";
import { developmentPhilosophy } from "@/app/data/philosophy";
import { routeMetadata } from "@/app/data/route-metadata";

export const metadata = routeMetadata(
  "/method/",
  "Development & AI philosophy",
  "How Madison Hope Steiner approaches engineering, AI collaboration, and systems other teams can understand and extend.",
);

export default function MethodPage() {
  return (
    <RouteFrame current="method">
      <RouteIntro
        code="Development & AI"
        title="Build capability. Keep responsibility."
        summary="Good architecture should make a team more capable. I pair hands-on engineering with AI collaboration to solve the immediate problem and leave a system people can understand and extend."
      />
      <section className="route-section philosophy-page" aria-labelledby="philosophy-principles-title">
        <div className="shell">
          <h2 id="philosophy-principles-title" className="visually-hidden">Development and AI principles</h2>
          <ul className="philosophy-principles">
            {developmentPhilosophy.map((principle) => (
              <li key={principle.id} id={principle.id}>
                <h2>{principle.title}</h2>
                <div>
                  <p>{principle.body}</p>
                  <a className="method-stage__action" href={principle.href}>{principle.example} <Arrow /></a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="route-section route-section--paper" aria-labelledby="philosophy-in-practice">
        <div className="shell">
          <div className="section-heading">
            <p className="section-code">In practice</p>
            <div>
              <h2 id="philosophy-in-practice">Make the thinking visible.</h2>
              <p>The choices behind a system should be as inspectable as the code.</p>
              <div className="button-row">
                <a className="method-stage__action" href="/decisions/">Read specific architecture decisions <Arrow /></a>
                <a className="method-stage__action" href="/models/#agent-collaboration">Explore model collaboration <Arrow /></a>
              </div>
            </div>
          </div>
          <OperatingArcFilm />
        </div>
      </section>
    </RouteFrame>
  );
}
