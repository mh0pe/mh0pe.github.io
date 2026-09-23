import { portfolioIdentity, profileLinks } from "../../data/portfolio-v2";
import type { RouteMotifKey } from "../v3/RouteMotif";
import { Arrow } from "./Evidence";

const journeySteps = {
  work: {
    code: "Next / How I help",
    title: "See the patterns other teams can carry forward.",
    description: "Move from individual systems to the reusable architecture behind them.",
    href: "/capabilities/",
    action: "Explore how I help",
  },
  capabilities: {
    code: "Next / Approach",
    title: "See how the work moves from pressure to result.",
    description: "Follow the choices that turn a difficult condition into a system a team can own.",
    href: "/method/",
    action: "See how I build",
  },
  method: {
    code: "Next / Decisions",
    title: "Why I made these choices.",
    description: "Read the trade-offs that shaped security, agent integration, and browser delivery.",
    href: "/decisions/",
    action: "Explore decisions",
  },
  decisions: {
    code: "Next / Work",
    title: "See those choices in working systems.",
    description: "Return to the projects where architectural judgment became an operating capability.",
    href: "/work/",
    action: "Explore the work",
  },
  about: {
    code: "Next / Credentials",
    title: "What I have studied and earned.",
    description: "Explore credentials earned across security, cloud, AI, data, infrastructure, and industry architecture.",
    href: "/credentials/",
    action: "Explore credentials",
  },
  credentials: {
    code: "Next / Work",
    title: "See where that range becomes working systems.",
    description: "Move from disciplines learned to systems built, reviewed, and made available to others.",
    href: "/work/",
    action: "Explore the work",
  },
  proof: {
    code: "Next / Models",
    title: "Add the model collaboration layer.",
    description: "Explore where model collaboration appears across the work.",
    href: "/models/#agent-collaboration",
    action: "Explore model composition",
  },
  models: {
    code: "Next / Evidence",
    title: "Follow the collaboration back to the evidence.",
    description: "Move from model associations to the projects, decisions, and public sources behind them.",
    href: "/proof/",
    action: "Review the evidence",
  },
  "case-study": {
    code: "Next / Systems",
    title: "Compare this system with the rest of the portfolio.",
    description: "Move across selected security, infrastructure, browser, and agent systems.",
    href: "/work/",
    action: "Explore more work",
  },
} as const satisfies Record<
  RouteMotifKey,
  {
    readonly code: string;
    readonly title: string;
    readonly description: string;
    readonly href: string;
    readonly action: string;
  }
>;

export default function SiteFooter({
  compact = false,
  journeyKey,
}: {
  readonly compact?: boolean;
  readonly journeyKey?: RouteMotifKey;
}) {
  const journey = journeyKey ? journeySteps[journeyKey] : null;

  return (
    <footer className={`site-footer${compact ? " site-footer--compact" : ""}`}>
      {journey ? (
        <section className="site-footer__journey" aria-labelledby="next-chapter-title">
          <div className="shell site-footer__journey-inner">
            <p className="site-footer__journey-code">{journey.code}</p>
            <a className="site-footer__journey-link" href={journey.href}>
              <span>
                <strong id="next-chapter-title">{journey.title}</strong>
                <small>{journey.description}</small>
                <em>{journey.action}</em>
              </span>
              <span className="site-footer__journey-arrow" aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
      ) : null}
      <div className="shell site-footer__signature">
        <p className="site-footer__eyebrow">Madison Hope Steiner</p>
        <p className="site-footer__statement">
          Let&apos;s talk about what you&apos;re building.
        </p>
      </div>
      <div className="shell site-footer__grid">
        <p className="site-footer__disclosure">{portfolioIdentity.independenceNote}</p>
        <nav aria-label="Profiles and source">
          {profileLinks.map((profile) => (
            <a
              href={profile.href}
              target="_blank"
              rel="noreferrer"
              key={profile.id}
            >
              {profile.display}
              <span className="visually-hidden">, {profile.ariaLabel}, opens in a new tab</span>
              <Arrow />
            </a>
          ))}
          <a href="/credentials/">Credentials <Arrow /></a>
          <a href="/proof/">Evidence <Arrow /></a>
        </nav>
        <p className="site-footer__record">
          Open-source systems · Personal portfolio
        </p>
      </div>
    </footer>
  );
}
