/* eslint-disable @next/next/no-html-link-for-pages -- GitHub Pages needs a full-document recovery navigation. */

export default function NotFound() {
  return (
    <>
      <title>Page not found | Madison Hope Steiner</title>
      <main className="not-found">
        <div>
          <p className="section-code">404 / Page not found</p>
          <h1>This path does not exist.</h1>
          <p>
            Return to Madison Hope Steiner&apos;s open-source portfolio or
            continue to either public GitHub profile.
          </p>
          <nav className="profile-links" aria-label="Recovery links">
            <a href="/">
              <span aria-hidden="true">←</span> Return to portfolio
            </a>
            <a href="https://github.com/mh0pe">
              Madison Hope Steiner on GitHub · mh0pe{" "}
              <span aria-hidden="true">↗</span>
            </a>
            <a href="https://github.com/awsmadi">
              Madison Hope Steiner on GitHub · awsmadi{" "}
              <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </div>
      </main>
    </>
  );
}
