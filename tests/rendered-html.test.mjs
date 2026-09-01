import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { expectedProjectGraphIds } from "./project-catalog.mjs";

const root = new URL("../", import.meta.url);
const approvedOrganizationContexts = [
  {
    label: "Global payments network",
    text: "Tokenized-asset platform architecture designed for enterprise trust, security, and governance.",
  },
  {
    label: "Major U.S. financial institution",
    text: "Acquisition-related platform integration, regulatory remediation, and security engineering across a complex banking environment.",
  },
  {
    label: "Global automotive and mobility manufacturer",
    text: "Data-lake foundations for enterprise mobility and manufacturing analytics.",
  },
  {
    label: "International vehicle manufacturer",
    text: "Data-lake capabilities for large-scale operational and analytical workloads.",
  },
  {
    label: "Global investment manager",
    text: "Governed AWS account provisioning streamlined for secure, repeatable cloud adoption at enterprise scale.",
  },
];

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

async function dataFile(filename) {
  return JSON.parse(
    await readFile(new URL(`app/data/${filename}`, root), "utf8"),
  );
}

test("server-renders an executive open-source portfolio", async () => {
  const [trust, summary] = await Promise.all([
    dataFile("project-trust.json"),
    dataFile("public-history-summary.json"),
  ]);
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = (await response.text()).replaceAll("<!-- -->", "");
  assert.match(
    html,
    /<link rel="stylesheet" href="\/portfolio\.css(?:\?[^"]+)?"/i,
  );
  assert.match(html, /Madison Hope Steiner/i);
  assert.ok(
    (html.match(/Madison Hope Steiner/g) ?? []).length >= 3,
    "the canonical public identity should be clear without repetitive visible copy",
  );
  assert.match(html, /Principal AI Architect/i);
  assert.match(html, /Open-Source Systems Portfolio/i);
  assert.match(html, /aria-label="Madison Hope Steiner on GitHub as mh0pe"/i);
  assert.match(html, /aria-label="Madison Hope Steiner on GitHub as awsmadi"/i);
  assert.match(html, /Madison Hope Steiner on LinkedIn/i);
  assert.match(html, /type="application\/ld\+json"/i);
  assert.match(html, /"@type":"Person"/i);
  assert.match(html, /"@type":"ProfilePage"/i);
  assert.match(html, /"alternateName":\["Madison Steiner","mh0pe","awsmadi"\]/i);
  assert.match(html, /"sameAs":\["https:\/\/github\.com\/mh0pe","https:\/\/github\.com\/awsmadi","https:\/\/www\.linkedin\.com\/in\/madisonhsteiner"\]/i);
  assert.deepEqual(
    [...html.matchAll(/data-contribution-player="([^"]+)"/g)].map(
      (match) => match[1],
    ),
    expectedProjectGraphIds,
    "every expected public project should include its own contribution player",
  );
  assert.equal(
    (html.match(/class="contribution-card-disclosure"/g) ?? []).length,
    expectedProjectGraphIds.length,
    "every source player should use progressive disclosure",
  );
  assert.equal(
    (html.match(/class="project-model-spectrum"/g) ?? []).length,
    expectedProjectGraphIds.length,
    "every project card should expose its model-metadata state",
  );
  assert.match(html, /data-model-id=/i);
  assert.match(html, /Model spectrum/i);
  assert.deepEqual(
    [...html.matchAll(/data-project-constellation="([^"]+)"/g)].map(
      (match) => match[1],
    ),
    expectedProjectGraphIds,
    "every expected public project should carry its own inline constellation",
  );
  assert.equal(
    (html.match(/data-graph-source="inline"/g) ?? []).length,
    expectedProjectGraphIds.length,
    "every project constellation should render from inline public graph data",
  );
  assert.doesNotMatch(html, /class="project-evolution"/i);
  assert.match(html, /Public contribution lineage/i);
  assert.match(html, /Filter source records/i);
  assert.match(html, /data-lineage-stage="1"/i);
  assert.match(html, /<main id="main-content" tabindex="-1">/i);
  assert.match(
    html,
    /Bringing Hope to distributed systems[\s\S]*?at enterprise scale/i,
  );
  assert.match(
    html,
    /I(?:&#x27;|&apos;|')m Madison Hope Steiner, a Principal AI Architect[\s\S]*?systems that teams can operate at enterprise scale/i,
  );
  assert.doesNotMatch(html, /I build the infrastructure behind production AI agents/i);
  assert.match(html, /Organizational impact/i);
  assert.match(html, /Contexted impact/i);
  assert.match(html, /Amazon Web Services/i);
  assert.match(html, /Chainalysis/i);
  assert.match(html, /Cameo/i);
  assert.match(html, /Trōv/i);
  assert.match(html, /Rakuten AirMap, Inc\./i);
  assert.match(html, /F\.T\. Industries/i);
  assert.match(html, /cielo24/i);
  assert.match(html, /Quiver Media/i);
  assert.match(html, /Tinder/i);
  assert.match(html, /Joint Business Solutions/i);
  assert.doesNotMatch(html, /Current employer/i);
  assert.doesNotMatch(html, /Former employers/i);
  assert.match(html, /Product and platform contexts/i);
  assert.match(html, /class="career-ledger"/i);
  assert.equal(
    (
      html.match(
        /<img[^>]*src="\/logos\/svg\/[^"]+"[^>]*loading="eager"[^>]*>/gi,
      ) ?? []
    ).length,
    9,
  );
  assert.match(html, /Global payments network/i);
  assert.match(html, /Major U\.S\. financial institution/i);
  assert.match(html, /Global automotive and mobility manufacturer/i);
  assert.match(html, /International vehicle manufacturer/i);
  assert.match(html, /Global investment manager/i);
  assert.match(html, /tokenized-asset platform/i);
  assert.match(html, /regulatory remediation/i);
  assert.match(html, /data-lake foundations/i);
  assert.match(html, /Governed AWS account provisioning/i);
  assert.match(html, /They do not imply endorsement/i);
  assert.match(
    html,
    /This is a personal portfolio\.[\s\S]*?nothing on this site is a statement made on behalf of any current or former employer\./i,
  );
  assert.match(html, /linkedin\.com\/in\/madisonhsteiner/i);
  assert.match(
    html,
    /Each project starts with the operating result\.[\s\S]*?optional source map reveal the repositories, changes, commits, and files behind it\./i,
  );
  assert.match(
    html,
    /Capabilities available beyond current upstream releases\./i,
  );
  assert.match(
    html,
    /constellation represents contribution relationships, not literal Git ancestry/i,
  );
  assert.match(html, /Agent platforms from one contract[\s\S]*?<dd>15<\/dd>/i);
  assert.match(html, /SVG capability layers merged[\s\S]*?<dd>7<\/dd>/i);
  assert.match(
    html,
    /Multi-project security orchestration[\s\S]*?<dd>v3\.7<\/dd>/i,
  );
  assert.match(
    html,
    new RegExp(
      `Public contributions merged[\\s\\S]*?<dd>${summary.combined.merged_attributed_contribution_pull_requests}</dd>`,
      "i",
    ),
  );
  assert.match(html, /Automated Security Helper/i);
  assert.match(
    html,
    /Workspace mode shipped in v3\.7\.0[\s\S]*?distributed public implementation available/i,
  );
  assert.match(html, /CloudFormation Guard correctness/i);
  assert.match(html, /Shipped in Guard 3\.2\.1/i);
  assert.match(html, /Nix on Windows/i);
  assert.match(
    html,
    /Derivation builder and whole-project cross-build coverage merged[\s\S]*?reports build results under Wine/i,
  );
  assert.match(html, /Integrity-bound Yarn PnP for Bazel/i);
  assert.match(html, /zero-install importer/i);
  assert.match(html, /A typed SVG DOM for an agent-native browser/i);
  assert.match(html, /Seven capability layers merged upstream/i);
  assert.match(html, /complete dependency-ordered SVG stack/i);
  assert.match(html, /transactional collections/i);
  assert.match(html, /analytic path geometry/i);
  assert.match(html, /deterministic UTF-8 text metrics/i);
  assert.match(html, /Organizational agent systems/i);
  assert.match(
    html,
    /Subagents, agent teams, decision memory, and recursive improvement/i,
  );
  assert.match(html, /AWS Labs MCP/i);
  assert.match(html, /AWS CDK and jsii/i);
  assert.match(html, /OpenAI Plugins fork · template-aware GitHub creation/i);
  assert.match(html, /Nextcloud #62429 · logical-time preservation/i);
  assert.match(html, /class="resource-kind">PR</i);
  assert.match(html, /class="resource-kind">Docs</i);
  assert.match(html, /class="resource-kind">Repository</i);
  assert.match(html, /class="resource-kind">Capability</i);
  assert.match(html, /class="resource-kind">Release</i);
  assert.match(html, /class="resource-kind">Prototype</i);
  assert.match(html, /automated-security-helper\/pull\/331/i);
  assert.match(html, /automated-security-helper\/pull\/440/i);
  assert.match(html, /cloudformation-guard\/pull\/717/i);
  assert.match(html, /cloudformation-guard\/releases\/tag\/3\.2\.1/i);
  for (const pullRequest of [16342, 16343, 16345, 16354, 16355, 16347]) {
    assert.match(html, new RegExp(`NixOS/nix/pull/${pullRequest}`, "i"));
  }
  assert.match(html, /aspect-build\/rules_js\/pull\/2957/i);
  assert.match(html, /aws\/jsii\/pull\/5054/i);
  assert.match(html, /awslabs\/mcp\/pull\/2658/i);
  for (const pullRequest of [3012, 3034, 3030, 3033, 3031, 3029, 3032]) {
    assert.match(
      html,
      new RegExp(`lightpanda-io/browser/pull/${pullRequest}`, "i"),
    );
  }
  assert.match(html, /mh0pe\/browser\/tree\/codex\/svg-07-text/i);
  assert.match(html, /mh0pe\/plugins\/commit\/4dd70c45672d72aa5b4d4c7e2737a7cf32faa4e2/i);
  assert.match(html, /nextcloud\/server\/pull\/62429/i);
  assert.match(html, /awslabs\.github\.io\/automated-security-helper/i);
  assert.match(html, /lightpanda\.io\/docs/i);
  assert.match(html, /opens in a new tab/i);
  assert.doesNotMatch(html, /Copilot-authored pull requests/i);
  assert.match(html, new RegExp(String(trust.profile.public_since)));
  assert.match(
    html,
    /Each capability opens to the pull request, commit, release, or branch where the work lives/i,
  );
  assert.match(html, /Public GitHub record since/i);
  assert.match(
    html,
    /Explore the systems from initial proposal through review, integration, and continued evolution/i,
  );
  assert.doesNotMatch(
    html,
    /Co-authored-by|described without client names|Client names stay private|without naming clients/i,
  );
  const impactStart = html.indexOf('class="impact-context"');
  const impactEnd = html.indexOf('id="record"', impactStart);
  assert.ok(impactStart >= 0 && impactEnd > impactStart);
  const impactHtml = html.slice(impactStart, impactEnd);
  assert.equal((impactHtml.match(/<li>/g) ?? []).length, 5);
  assert.doesNotMatch(impactHtml, /<(?:a|img|svg)\b/i);
  assert.ok(html.indexOf('id="work"') < html.indexOf('id="trust"'));
  assert.doesNotMatch(html, /upstream stars|upstream forks/i);
  assert.match(html, /github\.com\/mh0pe/i);
  assert.match(html, /github\.com\/awsmadi/i);
  assert.doesNotMatch(
    html,
    /Architecture Ledger|How this was counted|export report|Principal-level systems scope|Two verified GitHub identities/i,
  );
  assert.doesNotMatch(html, /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  assert.doesNotMatch(
    html,
    /codex-preview|react-loading-skeleton|Your site is taking shape/i,
  );
});

test("pins the refreshed project catalog and positioning copy in source", async () => {
  const [page, layout] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
  ]);

  assert.deepEqual(
    [...page.matchAll(/\bgraphId:\s*"([^"]+)"/g)].map((match) => match[1]),
    expectedProjectGraphIds,
  );
  assert.match(
    page,
    /Bringing Hope to distributed systems[\s\S]*?at enterprise scale/,
  );
  assert.match(
    page,
    /Multi-project security orchestration[\s\S]*?<dd>v3\.7<\/dd>/,
  );
  assert.match(page, /SVG capability layers merged[\s\S]*?<dd>7<\/dd>/);
  assert.match(
    page,
    /Derivation builder and whole-project cross-build coverage merged/,
  );
  assert.match(page, /Seven capability layers merged upstream/);
  assert.doesNotMatch(page, /I build the infrastructure/);
  assert.match(
    layout,
    /Madison Hope Steiner \| Principal AI Architect Portfolio/,
  );
  assert.match(layout, /Open-Source Systems Portfolio/);
});

test("uses bounded public data sources consistently", async () => {
  const [
    page,
    layout,
    packageJson,
    logoAssets,
    professionalHistory,
    summary,
    trust,
  ] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
    dataFile("logo-assets.json"),
    dataFile("professional-history.json"),
    dataFile("public-history-summary.json"),
    dataFile("project-trust.json"),
  ]);

  assert.equal(summary.public_only, true);
  assert.equal(trust.public_only, true);
  assert.equal(professionalHistory.employers.length, 10);
  assert.equal(professionalHistory.organization_contexts.length, 5);
  assert.deepEqual(
    professionalHistory.organization_contexts,
    approvedOrganizationContexts,
  );
  assert.ok(
    professionalHistory.employers.every(
      (employer) =>
        typeof employer.scope === "string" && employer.scope.length > 20,
    ),
    "every organization should carry meaningful context, not only a logo",
  );
  assert.match(professionalHistory.profile_url, /^https:\/\/www\.linkedin\.com\//);
  assert.match(summary.collection_status, /^(complete|verified_baseline)$/);
  assert.match(summary.cutoff_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(trust.observed_at, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(page, /public-history-summary\.json/);
  assert.match(page, /project-trust\.json/);
  assert.match(page, /professional-history\.json/);
  assert.match(layout, /favicon\.svg/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview|codex-preview/);
  assert.doesNotMatch(layout, /Starter Project|next\/font|favicon\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  const imageEmployers = professionalHistory.employers.filter(
    (employer) => employer.logo,
  );
  assert.equal(imageEmployers.length, 9);
  assert.equal(logoAssets.assets.length, imageEmployers.length);
  assert.equal(
    logoAssets.assets.filter((asset) => asset.kind === "source_vector").length,
    4,
  );
  assert.equal(
    logoAssets.assets.filter(
      (asset) => asset.kind === "mirrored_source_vector",
    ).length,
    1,
  );
  assert.equal(
    logoAssets.assets.filter((asset) => asset.kind === "derived_vector").length,
    4,
  );

  const provenanceByFile = new Map(
    logoAssets.assets.map((asset) => [asset.file, asset]),
  );

  for (const employer of imageEmployers) {
    assert.match(employer.logo, /^\/logos\/svg\/[a-z0-9-]+\.svg$/);
    assert.match(
      employer.logo_treatment,
      /^(source_vector|mirrored_source_vector|derived_vector)$/,
    );
    assert.ok(employer.width > 0);
    assert.ok(employer.height > 0);

    const source = await readFile(
      new URL(`public${employer.logo}`, root),
      "utf8",
    );
    assert.match(source, /^<svg\b/);
    assert.match(source, /\bviewBox="/);
    assert.match(source, /<path\b/);
    assert.doesNotMatch(
      source,
      /<script\b|<image\b|<foreignObject\b|\bon[a-z]+\s*=|\b(?:href|src)\s*=|data:|url\(/i,
    );

    const provenance = provenanceByFile.get(employer.logo);
    assert.ok(provenance);
    assert.equal(provenance.employer, employer.name);
    assert.equal(provenance.kind, employer.logo_treatment);
    assert.match(provenance.source_url, /^https:\/\//);
    assert.match(provenance.provenance_url, /^https:\/\//);
  }

  const starTotal = Object.values(trust.ecosystems).reduce(
    (total, ecosystem) => total + ecosystem.stars,
    0,
  );
  assert.equal(starTotal, trust.selected_ecosystem_stars);
});

test("keeps project activity players readable and touchable on phones", async () => {
  const styles = await readFile(new URL("public/portfolio.css", root), "utf8");
  const viewEnterStart = styles.indexOf("@keyframes view-enter");
  const viewEnterEnd = styles.indexOf("@supports", viewEnterStart);
  const viewEnter = styles.slice(viewEnterStart, viewEnterEnd);

  assert.ok(viewEnterStart >= 0 && viewEnterEnd > viewEnterStart);
  assert.match(viewEnter, /translate:\s*0 2rem/);
  assert.doesNotMatch(
    viewEnter,
    /opacity:\s*0/,
    "Core scroll-linked content must remain visible before it enters the viewport",
  );

  assert.match(
    styles,
    /@media \(max-width: 47\.5rem\)[\s\S]*?\.project-story \.project,[\s\S]*?\.support-story \.support-list article\s*\{[\s\S]*?padding-inline:\s*1\.35rem/,
  );
  assert.match(
    styles,
    /@media \(max-width: 30rem\)[\s\S]*?\.project-story \.project,[\s\S]*?\.support-story \.support-list article\s*\{[\s\S]*?padding-inline:\s*1rem/,
  );
  assert.match(
    styles,
    /@media \(max-width: 30rem\)[\s\S]*?\.contribution-card-player\s*\{[\s\S]*?width:\s*100%[\s\S]*?margin-inline:\s*0/,
  );
  assert.doesNotMatch(styles, /width:\s*calc\(100% \+ 2rem\)/);
  assert.match(
    styles,
    /@media \(max-width: 56\.25rem\)[\s\S]*?\.project > \.project-rail\s*\{[\s\S]*?position:\s*relative;[\s\S]*?top:\s*auto;/,
  );
  assert.match(
    styles,
    /\.contribution-card-disclosure > summary\s*\{[\s\S]*?min-height:\s*3\.75rem/,
  );
  assert.match(
    styles,
    /\.contribution-card-disclosure:not\(\[open\]\) > \.contribution-card-player\s*\{[\s\S]*?display:\s*none/,
  );
  assert.match(
    styles,
    /\.card-player-filters\s*\{[\s\S]*?overflow-x:\s*auto[\s\S]*?overscroll-behavior-inline:\s*contain[\s\S]*?scroll-snap-type:\s*inline proximity/,
  );
  assert.match(
    styles,
    /\.card-player-filters button\[data-filter="all"\]\s*\{[\s\S]*?min-height:\s*2\.75rem/,
  );
  assert.match(
    styles,
    /\.card-player-facts > div:last-child:nth-child\(odd\)\s*\{[\s\S]*?grid-column:\s*1 \/ -1/,
  );
  assert.match(
    styles,
    /\.card-player-transport \.card-player-play\s*\{[\s\S]*?grid-column:\s*2 \/ -1[\s\S]*?grid-row:\s*1/,
  );
  assert.match(
    styles,
    /\.project-constellation\s*\{[\s\S]*?position:\s*absolute[\s\S]*?pointer-events:\s*none/,
  );
  assert.match(
    styles,
    /@media \(max-width: 47\.5rem\)[\s\S]*?\.project-constellation\s*\{[\s\S]*?opacity:\s*0\.14/,
  );
  assert.match(
    styles,
    /@media \(forced-colors: active\)[\s\S]*?\.project-constellation\s*\{[\s\S]*?display:\s*none/,
  );
});

test("ships responsive, accessible, print-ready interaction styles", async () => {
  const styles = await readFile(new URL("public/portfolio.css", root), "utf8");
  const viewTimelineStart = styles.indexOf(
    "@supports (animation-timeline: view())",
  );
  const reducedMotionStart = styles.indexOf(
    "@media (prefers-reduced-motion: reduce)",
    viewTimelineStart,
  );
  const viewTimelineStyles = styles.slice(
    viewTimelineStart,
    reducedMotionStart,
  );

  assert.match(styles, /@font-face/);
  assert.match(styles, /Instrument Sans/);
  assert.match(styles, /min-height:\s*2\.75rem/);
  assert.match(styles, /@media \(max-width: 56\.25rem\)/);
  assert.match(styles, /@media print/);
  assert.match(styles, /@media \(forced-colors: active\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /@supports \(animation-timeline: view\(\)\)/);
  assert.doesNotMatch(viewTimelineStyles, /\.career-ledger/);
  assert.doesNotMatch(viewTimelineStyles, /^\s*\.project,\s*$/m);
  assert.doesNotMatch(
    viewTimelineStyles,
    /^\s*\.frontier-list article,\s*$/m,
  );
  assert.doesNotMatch(
    viewTimelineStyles,
    /^\s*\.support-list article,\s*$/m,
  );
  assert.match(
    viewTimelineStyles,
    /\.project > \.project-body[\s\S]*?\.frontier-list[\s\S]*?article[\s\S]*?> :not\(\.contribution-card-disclosure, \.project-constellation\)/,
  );
  assert.match(styles, /--signal-coral:/);
  assert.match(styles, /--signal-lime:/);
  assert.match(styles, /backdrop-filter:/);
  assert.match(
    styles,
    /@media \(max-width: 47\.5rem\)[\s\S]*?\.primary-nav\s*\{[\s\S]*?flex-wrap:\s*wrap/,
  );
  assert.match(styles, /\.career-current-mark img[\s\S]*?filter:\s*none/);
  assert.match(
    styles,
    /\.career-current-mark\s*\{[\s\S]*?background:\s*var\(--paper\)/,
  );
  assert.match(styles, /\.career-history-grid/);
  assert.match(styles, /\.career-logo--chainalysis/);
  assert.match(styles, /--logo-max-height:\s*2\.15rem/);
  assert.match(
    styles,
    /\.career-logo img\s*\{[\s\S]*?max-width:\s*var\(--logo-max-width/,
  );
  assert.match(
    styles,
    /\.career-logo img\s*\{[\s\S]*?max-height:\s*var\(--logo-max-height/,
  );
  assert.match(styles, /\.career-logo\s*\{[\s\S]*?overflow:\s*hidden/);
  assert.match(
    styles,
    /\.impact-context ul\s*\{[\s\S]*?repeat\(6,\s*minmax\(0,\s*1fr\)\)/,
  );
  assert.match(
    styles,
    /@media \(max-width: 30rem\)[\s\S]*?\.career-history-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  );
  assert.match(
    styles,
    /@media \(max-width: 30rem\)[\s\S]*?\.career-history-grid li\s*\{[\s\S]*?grid-template-columns:\s*6\.5rem\s+minmax\(0,\s*1fr\)/,
  );
  assert.match(styles, /\[id\]\s*\{[\s\S]*?scroll-margin-top:\s*7rem/);
  assert.doesNotMatch(styles, /--logo-scale/);
  assert.match(styles, /\.resource-links/);
  assert.doesNotMatch(styles, /\.copilot-evidence/);
  assert.doesNotMatch(styles, /employer-grid|employer-mark--cielo/);
  assert.doesNotMatch(styles, /Helvetica Neue|Inter|Times New Roman/);
  assert.doesNotMatch(styles, /-webkit-text-stroke/);
  assert.doesNotMatch(
    styles,
    /@media \(max-width: 47\.5rem\)[\s\S]*?\.primary-nav\s*\{\s*display:\s*none;/,
  );
});

test("provides a branded recovery page", async () => {
  const response = await render("/not-a-real-page");
  assert.equal(response.status, 404);
  const html = await response.text();
  assert.match(html, /<title>Page not found \| Madison Hope Steiner<\/title>/i);
  assert.match(html, /noindex/i);
  assert.doesNotMatch(html, /index,\s*follow|rel="canonical"/i);
  assert.match(html, /This path does not exist/i);
  assert.match(html, /Return to portfolio/i);
  assert.match(html, /github\.com\/mh0pe|>mh0pe</i);
  assert.match(html, /github\.com\/awsmadi|>awsmadi</i);
});
