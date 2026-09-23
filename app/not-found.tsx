/* eslint-disable @next/next/no-html-link-for-pages -- The exported recovery page must keep native navigation without a client runtime. */

import type { Metadata } from "next";
import { ThemeToggle } from "./components/v2/SiteHeader";

const notFoundTitle = "Page not found | Madison Hope Steiner";
const notFoundDescription =
  "The requested path does not exist. Continue through Madison Hope Steiner's open-source systems work or public GitHub profiles.";

export const metadata: Metadata = {
  title: notFoundTitle,
  description: notFoundDescription,
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: notFoundTitle,
    description: notFoundDescription,
  },
  twitter: {
    title: notFoundTitle,
    description: notFoundDescription,
  },
};

const recoveryRoutes = [
  {
    href: "/",
    label: "Portfolio",
    description: "Return to the full systems landscape.",
  },
  {
    href: "/work/",
    label: "Selected work",
    description: "Explore systems, decisions, and shipped capabilities.",
  },
  {
    href: "/proof/",
    label: "Public work",
    description: "Follow direct links to the code, review history, and implementation details.",
  },
] as const;

const githubProfiles = [
  { href: "https://github.com/mh0pe", handle: "mh0pe" },
  { href: "https://github.com/awsmadi", handle: "awsmadi" },
] as const;

export default function NotFound() {
  return (
    <main className="not-found" id="main-content">
      <div className="not-found__shell">
        <div className="not-found__utility">
          <a href="/">Madison Hope Steiner</a>
          <ThemeToggle />
        </div>
        <header className="not-found__intro">
          <p className="section-code">404 / Route ended</p>
          <h1>That path ends here. The work continues.</h1>
          <p>
            Choose a route back into Madison Hope Steiner&apos;s open-source
            systems portfolio.
          </p>
        </header>

        <nav
          className="not-found__routes"
          aria-labelledby="not-found-routes-title"
        >
          <h2 id="not-found-routes-title">Continue exploring</h2>
          <ol className="not-found__route-list">
            {recoveryRoutes.map((route, index) => (
              <li key={route.href}>
                <a className="not-found__route" href={route.href}>
                  <span className="not-found__route-number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="not-found__route-copy">
                    <strong>{route.label}</strong>
                    <small>{route.description}</small>
                  </span>
                  <span className="not-found__route-arrow" aria-hidden="true">
                    {index === 0 ? "←" : "↗"}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <aside
          className="not-found__profiles"
          aria-labelledby="not-found-profiles-title"
        >
          <div>
            <p className="section-code">Public profiles</p>
            <h2 id="not-found-profiles-title">Continue on GitHub</h2>
          </div>
          <ul>
            {githubProfiles.map((profile) => (
              <li key={profile.handle}>
                <a href={profile.href}>
                  GitHub / {profile.handle}
                  <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}
