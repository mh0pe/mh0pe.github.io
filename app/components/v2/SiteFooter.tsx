/* eslint-disable @next/next/no-html-link-for-pages -- Native anchors preserve static Pages navigation without RSC requests. */
import { portfolioIdentity, profileLinks, publicSources } from "../../data/portfolio-v2";
import type { RouteMotifKey } from "../v3/RouteMotif";
import { Arrow } from "./Evidence";
import { landingNavigation } from "./SiteHeader";

const journeySteps = {
  work: {
    code: "Related reading",
    title: "A shared view can keep the local context.",
    description: "The decisions behind bringing security checks together without losing project ownership.",
    href: "/blog/workspace-security/",
    action: "Read the essay",
  },
  capabilities: {
    code: "Related reading",
    title: "How I think about development and AI.",
    description: "The principles behind the engineering, the collaboration, and what I leave for the next team.",
    href: "/method/",
    action: "Read my philosophy",
  },
  method: {
    code: "Related reading",
    title: "Keep the reason with the work.",
    description: "How decisions and working context can survive the next handoff.",
    href: "/blog/handoffs-that-carry-the-work/",
    action: "Read the essay",
  },
  decisions: {
    code: "Related work",
    title: "See those choices in working systems.",
    description: "Return to the projects where architectural judgment became an operating capability.",
    href: "/work/",
    action: "Explore the work",
  },
  about: {
    code: "Learning and practice",
    title: "What I have studied and earned.",
    description: "Explore credentials earned across security, cloud, AI, data, infrastructure, and industry architecture.",
    href: "/credentials/",
    action: "Explore credentials",
  },
  credentials: {
    code: "Related work",
    title: "See where that range becomes working systems.",
    description: "Move from disciplines learned to systems built, reviewed, and made available to others.",
    href: "/work/",
    action: "Explore the work",
  },
  proof: {
    code: "Related reading",
    title: "The decisions behind the changes.",
    description: "Illustrated essays connect the source work to the problems it addresses.",
    href: "/blog/",
    action: "Browse the writing",
  },
  models: {
    code: "Related work",
    title: "See how agent teams carry the work forward.",
    description: "Explore the decisions, shared context, and handoffs behind BASE, CARL, PAUL, and SEED.",
    href: "/work/agent-systems/",
    action: "Explore the agent systems",
  },
  "case-study": {
    code: "Related reading",
    title: "More decisions, explained through the work.",
    description: "Explore the illustrated essays on security, developer tools, and AI workflows.",
    href: "/blog/",
    action: "Browse the writing",
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
      <nav className="shell site-footer__catalog" aria-labelledby="site-catalog-title">
        <div><p className="site-footer__eyebrow">Explore the portfolio</p><h2 id="site-catalog-title">Choose your next chapter.</h2></div>
        <div className="site-footer__catalog-grid">
          {[
            ["/work/", "The systems", "What I built and what it makes possible."],
            ["/blog/", "The ideas", "Illustrated essays from the work."],
            ["/method/", "The approach", "How I think about engineering and AI."],
            ["/about/", "The experience", "The organizations and contexts behind it."],
            ["/credentials/", "The learning", "Credentials earned across disciplines."],
            ["/proof/", "The source", "Follow the changes, reviews, and code."],
          ].map(([href, title, description], index) => (
            <a href={href} key={href}><span className="site-footer__catalog-number" aria-hidden="true">0{index + 1}</span><span><strong>{title}</strong><small>{description}</small></span><Arrow /></a>
          ))}
        </div>
      </nav>
      <div className="shell site-footer__signature">
        <p className="site-footer__eyebrow">Madison Hope Steiner</p>
        <p className="site-footer__statement">
          Let&apos;s talk about what you&apos;re building.
        </p>
        <a className="text-action" href={publicSources.linkedinMadison.href} target="_blank" rel="noreferrer">
          Connect on LinkedIn<span className="visually-hidden">, opens in a new tab</span> <Arrow />
        </a>
      </div>
      <div className="shell site-footer__grid">
        <div>
          <p className="site-footer__disclosure">{portfolioIdentity.independenceNote}</p>
          <p className="site-footer__record">Open-source systems · Personal portfolio</p>
        </div>
        <nav aria-label="Explore the portfolio">
          {landingNavigation.map((item) => (
            <a href={item.href} key={item.key} target={item.key === "connect" ? "_blank" : undefined} rel={item.key === "connect" ? "noreferrer" : undefined}>{item.label}{item.key === "connect" ? <span className="visually-hidden">, opens in a new tab</span> : null} <Arrow /></a>
          ))}
        </nav>
        <nav aria-label="Profiles and source">
          {profileLinks.filter((profile) => profile.id !== "linkedin").map((profile) => (
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
          <details className="site-footer__details">
            <summary>Go deeper</summary>
            <a href="/blog/">Writing <Arrow /></a>
            <a href="/#credentials">Credentials <Arrow /></a>
            <a href="/work/">All project stories <Arrow /></a>
            <a href="/decisions/">Architecture decisions <Arrow /></a>
            <a href="/models/">AI collaboration <Arrow /></a>
            <a href="/proof/">Source links <Arrow /></a>
          </details>
        </nav>
      </div>
    </footer>
  );
}
