import { Arrow } from "../components/v2/Evidence";
import { RouteFrame, RouteIntro } from "../components/v2/RouteFrame";
import { CredentialListData } from "../components/v2/StructuredData";
import {
  credentialCategories,
  credentialsByCategory,
  publicCredentials,
} from "../data/credentials";
import { routeMetadata } from "../data/route-metadata";

export const metadata = routeMetadata(
  "/credentials/",
  "Credentials earned",
  `Explore ${publicCredentials.length} credentials earned by Madison Hope Steiner across security, cloud architecture, AI, data, networking, infrastructure, and financial services.`,
);

function LearningOverview() {
  return (
    <div className="credential-learning">
      <div>
        <p className="micro-label">Learning across disciplines</p>
        <h2 id="credential-overview-title">A wider view of the system.</h2>
        <p>Security, architecture, AI, and infrastructure are connected disciplines. This is the learning I bring to those connections.</p>
        <a className="hope-text-link" href="https://www.credly.com/users/madisonhsteiner" target="_blank" rel="noreferrer">
          View Madison&apos;s Credly profile<span className="visually-hidden">, opens in a new tab</span> <Arrow />
        </a>
      </div>
      <ol className="credential-learning__areas">
        {credentialCategories.map((category, index) => (
          <li key={category.id}><span aria-hidden="true">0{index + 1}</span><a href={`#${category.id}`}>{category.label} <Arrow /></a></li>
        ))}
      </ol>
    </div>
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
          <LearningOverview />
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
                          {/* Badge files are preoptimized; avoid synthetic responsive variants of the same file. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image}
                            alt=""
                            width="240"
                            height="240"
                            loading="lazy"
                            decoding="async"
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
                            aria-label={`Verify on Credly: ${item.name}, opens in a new tab`}
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
