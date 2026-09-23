import Image from "next/image";
import type { CSSProperties } from "react";

import { Arrow, SourceLink } from "../components/v2/Evidence";
import { RouteFrame, RouteIntro } from "../components/v2/RouteFrame";
import AboutPortrait from "../components/v3/AboutPortrait";
import { organizationContexts, portfolioIdentity } from "../data/portfolio-v2";
import professionalHistory from "../data/professional-history.json";
import { routeMetadata } from "../data/route-metadata";

export const metadata = routeMetadata(
  "/about/",
  "Experience and organizational scale",
  "The environments that shaped Madison Hope Steiner's work across AI, cloud, security, data, and product systems.",
);

const impactEntries = [
  ...professionalHistory.employers.map((employer) => ({
    id: `employer-${employer.logo_key}`,
    label: employer.name,
    scope: employer.scope,
    employer,
  })),
  ...organizationContexts.map((context) => ({
    id: `context-${context.id}`,
    label: context.label,
    scope: context.scope,
    employer: null,
  })),
];

export default function AboutPage() {
  return (
    <RouteFrame current="about">
      <RouteIntro
        code="Experience / Organizational range"
        title="Experience across industries."
        summary="Madison Hope Steiner designs AI, cloud, security, data, and developer systems that teams can operate with confidence."
        visual={<AboutPortrait />}
      >
        <p className="route-intro__note">
          {portfolioIdentity.roleBasis} <SourceLink sourceId="linkedinMadison">View professional background</SourceLink>
        </p>
      </RouteIntro>

      <section className="route-section" id="impact" aria-labelledby="impact-title">
        <div className="shell">
          <div className="section-heading">
            <p className="section-code">01 / Impact in context</p>
            <div>
              <h2 id="impact-title">Where I have contributed.</h2>
              <p>The organizations I have worked with, and the scope of that work.</p>
            </div>
          </div>
          <ol className="career-ledger career-ledger--unified">
            {impactEntries.map((entry, index) => (
              <li key={entry.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {entry.employer ? (
                  <div
                    aria-hidden="true"
                    className={`career-ledger__mark career-ledger__mark--${entry.employer.logo_key}`}
                    data-logo={entry.employer.logo_key}
                    data-logo-treatment={entry.employer.logo_treatment}
                    style={{ "--logo-scale": entry.employer.optical_scale } as CSSProperties}
                  >
                    {entry.employer.logo ? (
                      <Image
                        alt=""
                        className="career-ledger__image"
                        height={entry.employer.height ?? 96}
                        sizes="(max-width: 720px) 176px, 208px"
                        src={entry.employer.logo}
                        unoptimized
                        width={entry.employer.width ?? 240}
                      />
                    ) : (
                      <span className="career-ledger__wordmark">{entry.employer.name}</span>
                    )}
                  </div>
                ) : (
                  <div className="career-ledger__mark career-ledger__mark--context" aria-hidden="true">
                    <svg viewBox="0 0 120 72"><circle cx="60" cy="36" r="23" /><path d="M12 36h25M83 36h25M60 7v12M60 53v12" /></svg>
                  </div>
                )}
                <div><h3>{entry.label}</h3><p>{entry.scope}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="route-section route-section--paper about-close" aria-labelledby="about-close-title">
        <div className="shell case-close__grid">
          <p className="section-code">02 / Carry it forward</p>
          <div>
            <h2 id="about-close-title">Range matters when it changes the architecture.</h2>
            <p>Security, regulation, scale, customer experience, and platform ownership create different constraints. The work is to turn those constraints into systems teams can keep using.</p>
            <div className="button-row">
              <a className="text-action" href="/work/">Explore the systems <Arrow /></a>
              <a className="text-action" href="/method/">See the approach <Arrow /></a>
            </div>
          </div>
        </div>
      </section>
    </RouteFrame>
  );
}
