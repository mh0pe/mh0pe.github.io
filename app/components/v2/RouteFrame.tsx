import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import RouteMotif, {
  resolveRouteMotif,
  type RouteMotifKey,
} from "../v3/RouteMotif";
import { CollectionPageData } from "./StructuredData";

const routeCollections = {
  work: ["/work/", "Selected systems", "Open-source systems that make difficult security, infrastructure, and agent work easier for teams to own."],
  capabilities: ["/capabilities/", "How I help", "Reusable architecture for security, cloud platforms, browser systems, and agent teams."],
  method: ["/method/", "Approach", "How operating pressure becomes a clear decision, working software, and a result another team can carry forward."],
  decisions: ["/decisions/", "Architecture decisions", "The choices, costs, and public work behind selected systems."],
  about: ["/about/", "Experience", "The organizations and operating environments that shaped Madison Hope Steiner's architecture work."],
  credentials: ["/credentials/", "Credentials earned", "A public learning record across security, cloud architecture, AI, data, networking, infrastructure, and financial services."],
  proof: ["/proof/", "Evidence", "Direct links to the projects, reviews, code changes, tests, and documentation behind the portfolio."],
  models: ["/models/", "Model collaboration", "Where model collaboration appears across Madison Hope Steiner's public work."],
} as const;

export function RouteFrame({
  current,
  motif,
  children,
}: {
  readonly current?: string;
  readonly motif?: RouteMotifKey;
  readonly children: React.ReactNode;
}) {
  const routeMotif = motif ?? resolveRouteMotif(current);
  const collectionKey = routeMotif === "case-study" ? undefined : routeMotif ?? current;
  const collection = collectionKey
    ? routeCollections[collectionKey as keyof typeof routeCollections]
    : undefined;
  const primaryCurrent = routeMotif === "case-study" ? undefined : current;
  const primarySection = routeMotif === "case-study" ? current : undefined;

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader current={primaryCurrent} activeSection={primarySection} />
      <main
        id="main-content"
        tabIndex={-1}
        data-route={routeMotif ?? current ?? "home"}
        data-motif={routeMotif}
      >
        {collection ? (
          <CollectionPageData path={collection[0]} name={collection[1]} description={collection[2]} />
        ) : null}
        {routeMotif ? <RouteMotif route={routeMotif} /> : null}
        {children}
      </main>
      <SiteFooter compact={Boolean(current)} journeyKey={routeMotif === "case-study" ? undefined : routeMotif} />
    </>
  );
}

export function RouteIntro({
  code,
  title,
  summary,
  children,
  visual,
}: {
  readonly code: string;
  readonly title: string;
  readonly summary: string;
  readonly children?: React.ReactNode;
  readonly visual?: React.ReactNode;
}) {
  return (
    <section className="route-intro" aria-labelledby="route-title">
      <div className={`shell route-intro__grid${visual ? " route-intro__grid--with-visual" : ""}`}>
        <div className="route-folio">
          <p className="section-code">{code}</p>
          <svg className="route-thread" data-motion-once viewBox="0 0 160 80" fill="none" aria-hidden="true" focusable="false">
            <path pathLength="1" d="M1 62C35 62 32 18 70 18S111 62 159 35" />
            <path d="M70 18v39m-5-5 5 5 5-5" />
            <circle cx="70" cy="18" r="5" />
            <circle cx="159" cy="35" r="1" />
          </svg>
        </div>
        <div>
          <h1 id="route-title">{title}</h1>
          <p className="route-intro__summary">{summary}</p>
          {children}
        </div>
        {visual ? <div className="route-intro__visual">{visual}</div> : null}
      </div>
    </section>
  );
}
