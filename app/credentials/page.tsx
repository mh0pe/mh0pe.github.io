import type { CSSProperties } from "react";
import Image from "next/image";

import { Arrow } from "../components/v2/Evidence";
import { RouteFrame, RouteIntro } from "../components/v2/RouteFrame";
import { CredentialListData } from "../components/v2/StructuredData";
import {
  credentialCategories,
  credentialYears,
  credentialsByCategory,
  publicCredentials,
  type CredentialCategoryId,
} from "../data/credentials";
import { routeMetadata } from "../data/route-metadata";

export const metadata = routeMetadata(
  "/credentials/",
  "Credentials earned",
  "Explore 25 credentials earned by Madison Hope Steiner across security, cloud architecture, AI, data, networking, infrastructure, and financial services.",
);

const centers: Record<CredentialCategoryId, readonly [number, number]> = {
  "security-trust": [152, 148],
  "architecture-operations": [402, 132],
  "ai-data": [328, 354],
  "platforms-industry": [610, 302],
};

function constellationPoint(category: CredentialCategoryId, index: number) {
  const center = centers[category];
  const categoryCredentials = publicCredentials.filter(
    (credential) => credential.category === category,
  );
  const localIndex = categoryCredentials.findIndex(
    (credential) => credential.id === publicCredentials[index].id,
  );
  const angle = (localIndex / Math.max(categoryCredentials.length, 1)) * Math.PI * 2 - Math.PI / 2;
  const ring = 48 + (localIndex % 3) * 14;

  return {
    x: center[0] + Math.cos(angle) * ring,
    y: center[1] + Math.sin(angle) * ring,
  };
}

function LearningConstellation() {
  const nodes = publicCredentials.map((credential, index) => ({
    credential,
    ...constellationPoint(credential.category, index),
  }));

  return (
    <figure className="credential-constellation" data-motion-once>
      <div className="credential-constellation__copy">
        <p className="micro-label">A visible learning practice</p>
        <h2 id="credential-overview-title">Range is built one deliberate stretch at a time.</h2>
        <p>
          The learning path spans foundational cloud knowledge, professional architecture,
          security, infrastructure, data, machine learning, and AI delivery.
        </p>
        <dl className="credential-constellation__facts">
          <div><dt>Credentials earned</dt><dd>{publicCredentials.length}</dd></div>
          <div><dt>Learning record</dt><dd>{credentialYears.at(-1)}–{credentialYears[0]}</dd></div>
          <div><dt>Capability areas</dt><dd>{credentialCategories.length}</dd></div>
        </dl>
        <a
          className="hope-text-link"
          href="https://www.credly.com/users/madisonhsteiner"
          target="_blank"
          rel="noreferrer"
        >
          View Madison&apos;s Credly profile<span className="visually-hidden">, opens in a new tab</span> <Arrow />
        </a>
      </div>

      <div className="credential-constellation__art" aria-hidden="true">
        <svg viewBox="0 0 760 500" focusable="false">
          <g className="credential-constellation__guides">
            <path d="M30 112H730M30 250H730M30 388H730" />
            <path d="M120 34V466M380 34V466M640 34V466" />
          </g>
          <path
            className="credential-constellation__current"
            pathLength="1"
            d="M54 402C138 416 129 155 220 159s79 207 173 197 85-221 176-218 72 184 148 174"
          />
          <path
            className="credential-constellation__tracer"
            pathLength="1"
            d="M54 402C138 416 129 155 220 159s79 207 173 197 85-221 176-218 72 184 148 174"
          />
          {credentialCategories.map((category) => {
            const [x, y] = centers[category.id];
            return (
              <g className="credential-constellation__cluster" data-category={category.id} key={category.id}>
                <circle className="credential-constellation__orbit" cx={x} cy={y} r="86" />
                <circle className="credential-constellation__hub" cx={x} cy={y} r="11" />
                <text x={x} y={y + 112}>{category.label}</text>
              </g>
            );
          })}
          <g className="credential-constellation__threads">
            {nodes.map(({ credential, x, y }, index) => {
              const [centerX, centerY] = centers[credential.category];
              return (
                <path
                  d={`M${centerX} ${centerY}Q${(centerX + x) / 2 + (index % 2 ? 10 : -10)} ${(centerY + y) / 2} ${x} ${y}`}
                  key={`thread-${credential.id}`}
                />
              );
            })}
          </g>
          <g className="credential-constellation__nodes">
            {nodes.map(({ credential, x, y }, index) => (
              <g
                data-category={credential.category}
                data-credential-id={credential.id}
                key={credential.id}
                style={{ "--credential-index": index } as CSSProperties}
              >
                <circle className="credential-constellation__node-halo" cx={x} cy={y} r="10" />
                {index % 3 === 0 ? (
                  <path d={`M${x} ${y - 5}l5 5-5 5-5-5Z`} />
                ) : index % 3 === 1 ? (
                  <rect x={x - 4.5} y={y - 4.5} width="9" height="9" rx="2" />
                ) : (
                  <circle cx={x} cy={y} r="4.5" />
                )}
              </g>
            ))}
          </g>
        </svg>
      </div>
      <figcaption className="visually-hidden">
        A constellation of 25 credentials grouped into security and trust,
        architecture and operations, AI and data, and platforms and industry.
      </figcaption>
    </figure>
  );
}

export default function CredentialsPage() {
  return (
    <RouteFrame current="credentials">
      <CredentialListData credentials={publicCredentials} />
      <RouteIntro
        code={`Credentials / ${publicCredentials.length} earned`}
        title="Learning is part of the architecture."
        summary="I keep learning visible across the disciplines required to design, secure, and evolve systems at scale."
      >
        <nav className="route-jump" aria-label="Credential areas">
          {credentialCategories.map((category) => (
            <a href={`#${category.id}`} key={category.id}>{category.label}</a>
          ))}
        </nav>
      </RouteIntro>

      <section className="route-section credential-overview" aria-labelledby="credential-overview-title">
        <div className="shell">
          <LearningConstellation />
        </div>
      </section>

      <section className="route-section route-section--paper credential-catalog" aria-labelledby="credential-catalog-title">
        <div className="shell">
          <div className="section-heading">
            <p className="section-code">02 / Credentials earned</p>
            <div>
              <h2 id="credential-catalog-title">Every credential links directly to Credly.</h2>
              <p>
                Each credential below includes its issuing organization, earned date,
                and full Credly record ID for direct verification.
              </p>
            </div>
          </div>

          <div className="credential-groups">
            {credentialsByCategory.map((category, categoryIndex) => (
              <section
                className="credential-group"
                data-credential-category={category.id}
                id={category.id}
                key={category.id}
                aria-labelledby={`${category.id}-title`}
              >
                <header className="credential-group__heading">
                  <p className="credential-group__number">{String(categoryIndex + 1).padStart(2, "0")}</p>
                  <div>
                    <h3 id={`${category.id}-title`}>{category.label}</h3>
                    <p>{category.summary}</p>
                  </div>
                  <p className="credential-group__count">{category.credentials.length} earned</p>
                </header>

                <ul className="credential-grid">
                  {category.credentials.map((item) => (
                    <li id={`credential-${item.id}`} key={item.id}>
                      <article className="credential-card">
                        <span className="credential-card__art">
                          <Image
                            src={item.image}
                            alt=""
                            width="240"
                            height="240"
                            loading="lazy"
                            unoptimized
                          />
                        </span>
                        <div className="credential-card__body">
                          <time className="credential-card__date" dateTime={item.issuedDate}>Earned {item.issued}</time>
                          <h4 className="credential-card__title">{item.name}</h4>
                          <span className="credential-card__issuer">{item.issuer}</span>
                          <span className="credential-card__record">
                            <span>Credly record ID</span>
                            <code>{item.id}</code>
                          </span>
                          <a
                            className="credential-card__verify"
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Verify ${item.name} on Credly, opens in a new tab`}
                          >
                            Verify on Credly <Arrow />
                          </a>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>
    </RouteFrame>
  );
}
