import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("model explorer keyboard order follows its visual reading order", async () => {
  const explorer = await source("app/components/AttributionExplorer.tsx");
  const styles = await Promise.all([
    "public/portfolio-v2.css",
    "public/portfolio-v3.css",
    "public/interactions.css",
  ].map(source));

  assert.deepEqual(
    [...explorer.matchAll(/className="attribution-(workspace|overview|evidence)"/g)]
      .map((match) => match[1]),
    ["workspace", "overview", "evidence"],
  );
  for (const css of styles) {
    assert.doesNotMatch(
      css,
      /\.attribution-(?:workspace|overview|evidence)\s*\{[^}]*\border\s*:/,
    );
  }
});

test("header content wraps instead of clipping enlarged identity text", async () => {
  const css = await source("public/portfolio-v3.css");
  assert.match(css, /\.hope-brand \.site-header__inner\s*\{[^}]*flex-wrap: wrap/);
  assert.match(css, /\.hope-brand \.site-identity\s*\{[^}]*overflow: visible;[^}]*flex-shrink: 0;[^}]*max-width: 100%/);
  assert.match(css, /\.hope-brand \.primary-nav\s*\{[^}]*flex-wrap: wrap/);
});

test("case facts use text-relative column widths for enlarged reading", async () => {
  const css = await source("public/portfolio-v3.css");
  assert.match(css, /\.hope-brand \.case-hero__facts\s*\{\s*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 16rem\), 1fr\)\)/);
});

test("credential cards adapt to enlarged text instead of squeezing titles", async () => {
  const css = await source("public/credentials.css");
  assert.match(css, /\.credential-grid\s*\{[^}]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 24rem\), 1fr\)\)/);
  assert.match(css, /\.credential-constellation__facts\s*\{[^}]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 8rem\), 1fr\)\)/);
  assert.match(css, /\.credential-card\s*\{[^}]*display: flex;[^}]*flex-wrap: wrap/);
  assert.match(css, /\.credential-card__body\s*\{[^}]*flex: 1 1 12rem/);
});

test("long route titles and footer content reflow with enlarged text", async () => {
  const css = await source("public/portfolio-v3.css");
  assert.match(css, /\.hope-brand \.route-intro h1\s*\{[^}]*overflow-wrap: anywhere/);
  assert.match(css, /container: route-intro \/ inline-size/);
  assert.match(css, /@container route-intro \(max-width: 48rem\)\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.hope-brand \.site-footer__grid\s*\{[^}]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 18rem\), 1fr\)\)/);
});

test("supporting routes keep navigation state and headings semantically accurate", async () => {
  const [decisions, models, capabilities] = await Promise.all([
    source("app/decisions/page.tsx"),
    source("app/models/page.tsx"),
    source("app/components/v2/CapabilityAtlas.tsx"),
  ]);

  assert.match(decisions, /<RouteFrame current="decisions" motif="decisions">/);
  assert.doesNotMatch(decisions, /<RouteFrame current="method"/);
  assert.match(
    decisions,
    /<h3 className="decision-pages__question">\{decision\.question\}<\/h3>/,
  );
  assert.doesNotMatch(decisions, /<h2>\{decision\.question\}<\/h2>/);

  assert.match(models, /<RouteFrame current="models" motif="models">/);
  assert.doesNotMatch(models, /<RouteFrame current="proof"/);

  assert.match(
    capabilities,
    /<h3 className="capability-atlas__system">\{row\.system\}<\/h3>/,
  );
  assert.doesNotMatch(capabilities, /<strong>\{row\.system\}<\/strong>/);
});

test("external profile and lineage links announce new tabs", async () => {
  const [home, credentials, lineage] = await Promise.all([
    source("app/page.tsx"),
    source("app/credentials/page.tsx"),
    source("app/components/v3/ProjectLineageField.tsx"),
  ]);

  const externalLinks = [...home.matchAll(/<a\b[^>]*target="_blank"[^>]*>[\s\S]*?<\/a>/g)];
  assert.ok(externalLinks.length > 0, "the homepage retains a direct profile link");
  for (const [link] of externalLinks) assert.match(link, /opens in a new tab/);
  assert.match(
    credentials,
    /Credly profile<span className="visually-hidden">, opens in a new tab<\/span>/,
  );
  assert.match(lineage, /className="source-records__link"/);
  assert.match(lineage, /data-source-kind/);
  assert.match(lineage, /<span className="visually-hidden"> \(opens in a new tab\)<\/span>/);
  assert.match(lineage, /Read the reviewed change/);
  assert.doesNotMatch(lineage, /<svg|data-lineage-tooltip|aria-live=/);
});

test("project source collections are named groups, not nested page landmarks", async () => {
  const lineage = await source("app/components/v3/ProjectLineageField.tsx");
  assert.match(lineage, /<div role="group"[^>]*aria-label=\{`\$\{caseStudy\.title\}: contributions on GitHub`\}/);
  assert.doesNotMatch(lineage, /<\/?aside\b|role="complementary"/);
  assert.match(lineage, /<ul className="source-records__list">/);
  for (const kind of ["project", "change", "commit", "file"]) {
    assert.ok(lineage.includes(`kind="${kind}"`), `${kind} remains in the named source group`);
  }
  assert.match(lineage, /open=\{inlineSources \|\| undefined\}/);
});

test("landing disclosures and secondary navigation preserve native semantics", async () => {
  const [home, method] = await Promise.all([
    source("app/page.tsx"),
    source("app/method/page.tsx"),
  ]);

  assert.match(home, /className="landing-link" href=\{publicSources\.linkedinMadison\.href\}/);
  assert.match(
    home,
    /id="philosophy" data-home-section="philosophy" aria-labelledby="philosophy-title"/,
  );
  assert.match(home, /<div className="landing-principles">/);
  assert.match(home, /developmentPhilosophy\.map\(\(principle\)/);
  assert.match(home, /<details className="landing-principle"[^>]*>\s*<summary><h3>\{principle\.title\}<span aria-hidden="true">\+<\/span><\/h3><\/summary>/);
  assert.match(home, /<details className="landing-employer"[^>]*>\s*<summary>/);
  assert.doesNotMatch(home, /role="button"|tabIndex=\{?[1-9]|onClick=|onKeyDown=/);
  assert.match(home, /<ProjectLineageField caseStudy=\{project\} compact inlineSources \/>/);
  assert.match(home, /<h2 id="philosophy-title">/);
  assert.match(method, /className="method-stage__action" href=\{principle.href\}/);
  assert.match(method, /className="method-stage__action" href="\/decisions\/"/);
  assert.match(method, /className="method-stage__action" href="\/models\/#agent-collaboration"/);
});

test("all landing credentials use visible named category galleries without disclosure controls", async () => {
  const home = await source("app/page.tsx");
  const section = home.slice(home.indexOf('<section className="shell landing-credentials"'), home.indexOf('<span className="anchor-alias" id="connect"'));
  assert.ok(section.length > 0, "the homepage contains a complete credential section");
  assert.match(section, /<div className="landing-credential-groups">/);
  assert.match(section, /credentialsByCategory\.map\(\(category\)/);
  assert.match(section, /<section className="landing-credential-group"[^>]*aria-labelledby=\{`badges-\$\{category\.id\}`\}/);
  assert.match(section, /<h3 id=\{`badges-\$\{category\.id\}`\}>\{category\.label\}<\/h3>/);
  assert.match(section, /<ul className="landing-credential-gallery">/);
  assert.match(section, /category\.credentials\.map\(\(credential\)/);
  assert.match(section, /<a href=\{credential\.href\} target="_blank" rel="noreferrer">/);
  assert.match(section, /<Image src=\{credential\.image\} alt=""[^>]*loading="lazy"[^>]*unoptimized/);
  assert.match(section, /<strong>\{credential\.name\}<\/strong>/);
  assert.match(section, /Earned \{credential\.issued\}/);
  assert.match(section, /View Credly record, opens in a new tab/);
  assert.doesNotMatch(section, /<details\b|<summary\b|\shidden(?:\s|=|>)|aria-hidden="true"|selectedCredentials|\.slice\(/);
  assert.doesNotMatch(home, /landing-credential-list|landing-credential-highlights/);
});
