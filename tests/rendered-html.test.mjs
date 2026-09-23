import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { gzipSync } from "node:zlib";

const root = new URL("../", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", process.pid + "-" + Date.now());
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost" + pathname, {
      headers: { accept: "text/html", host: "localhost" },
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

function visibleMain(html) {
  const main = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i)?.[0] ?? "";
  return main
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(
      /<details(?![^>]*\bopen\b)[^>]*>[\s\S]*?<summary\b[^>]*>([\s\S]*?)<\/summary>[\s\S]*?<\/details>/gi,
      " $1 ",
    )
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:#x?[0-9a-f]+|[a-z]+);/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
}

test("renders the outcome-led Living Systems Atlas homepage contract", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  const html = (await response.text()).replaceAll("<!-- -->", "");

  const sections = [...html.matchAll(/data-home-section="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(sections, [
    "opening",
    "outcomes",
    "selected-work",
    "atlas",
    "practice",
    "practice-detail",
    "composition",
    "context",
  ]);

  assert.match(html, /Madison Hope Steiner/i);
  assert.match(html, /Principal AI Architect/i);
  assert.match(
    html,
    /I help teams build and run AI, security, and cloud systems\./i,
  );
  const visibleText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.equal(
    (
      visibleText.match(
        /Bringing Hope to distributed systems at enterprise scale\./gi,
      ) ?? []
    ).length,
    1,
  );
  assert.match(
    html,
    /One[\s\S]{0,80}governed workspace across many projects/i,
  );
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /<main id="main-content" tabindex="-1" data-route="home">/i);
  assert.match(html, /data-visualization="hope-line"/i);
  assert.match(html, /The Hope Line/i);
  assert.equal(
    new Set([...html.matchAll(/data-graph-id="([^"]+)"/g)].map((match) => match[1])).size,
    8,
  );
  for (const nodeType of ["repository", "evidence", "commit", "file"]) {
    assert.match(html, new RegExp(`data-node-type="${nodeType}"`));
  }
  assert.equal(
    (html.match(/class="hope-line__index-detail"/g) ?? []).length,
    8,
  );
  assert.match(html, /Explore every system in the atlas/i);
  assert.match(html, /<dt>Implementation details<\/dt>/i);
});

test("keeps the homepage concise, inspectable, and free of retired visual islands", async () => {
  // Measure the artifact visitors receive, after the exporter removes the
  // framework transport stream. The worker response intentionally contains a
  // duplicate serialized tree that never ships on this static route.
  const html = await readFile(new URL("../pages-dist/index.html", import.meta.url), "utf8");
  const words = visibleMain(html).split(/\s+/).filter(Boolean);
  const openingTags =
    html.match(/<(?!\/|!|\?)[A-Za-z][A-Za-z0-9:-]*(?:\s|>)/g) ?? [];
  const links = html.match(/<a\b/gi) ?? [];
  const proofLinks = html.match(/data-proof-kind=/gi) ?? [];
  const buttons = html.match(/<button\b/gi) ?? [];
  const summaries = html.match(/<summary\b/gi) ?? [];

  assert.ok(words.length >= 1_700, "homepage should contain at least 1,700 visible words; found " + words.length);
  assert.ok(words.length <= 3_000, "homepage should contain at most 3,000 visible words; found " + words.length);
  assert.ok(
    links.length <= 188,
    "homepage should contain at most 188 links, including complete accessible lineage fallbacks; found " +
      links.length,
  );
  assert.ok(proofLinks.length <= 10, "homepage should contain at most 10 direct proof links; found " + proofLinks.length);
  assert.ok(buttons.length <= 8, "homepage should contain at most 8 buttons; found " + buttons.length);
  assert.ok(
    links.length + buttons.length + summaries.length <= 208,
    "homepage should contain at most 208 interactive elements, including eight complete accessible lineage fallbacks",
  );
  assert.ok(
    openingTags.length <= 1_850,
    "homepage should contain at most 1,850 deployed elements, including both atlas reductions and accessible mobile lineage links; found " +
      openingTags.length,
  );
  assert.ok(gzipSync(html).byteLength <= 40 * 1024);
  assert.doesNotMatch(
    html,
    /data-contribution-player|data-project-constellation|project-model-spectrum|<canvas\b|Loading the source trail/i,
  );
  assert.doesNotMatch(html, /Model not recorded|No model data|No model signal/i);
});

test("renders contribution scope, model context, independence, and compatibility anchors", async () => {
  const response = await render("/");
  const html = (await response.text()).replaceAll("<!-- -->", "");

  for (const anchor of [
    "top",
    "work",
    "range",
    "frontier",
    "practice",
    "record",
    "trust",
    "agent-collaboration",
    "contribution-lineage",
  ]) {
    assert.match(html, new RegExp('id="' + anchor + '"'));
  }

  assert.match(
    html,
    /<section class="hope-act hope-work" id="work"[^>]*aria-labelledby="work-title"/i,
  );
  assert.doesNotMatch(html, /<span[^>]+id="work"/i);

  assert.match(html, /174 merged pull requests authored as mh0pe or awsmadi/i);
  assert.match(html, /Where model collaboration appears in the work/i);
  assert.match(html, /Model associations:/i);
  assert.match(html, /not statements made on behalf of any current or former employer/i);
  assert.match(html, /href="\/work\/automated-security-helper\//i);
  assert.match(html, /href="https:\/\/github\.com\//i);
  assert.match(html, /GitHub · mh0pe[\s\S]{0,240}Madison Hope Steiner on GitHub as mh0pe/i);
  assert.doesNotMatch(html, /Live upstream|Model spectrum|trusted by/i);
});

test("renders every primary redesign route with its promised content", async () => {
  const cases = [
    ["/work", /Four systems, built for the next team/i],
    ["/work/automated-security-helper", /Automated Security Helper/i],
    ["/work/cloudformation-guard", /CloudFormation Guard/i],
    ["/work/nix-windows", /Nix on Windows/i],
    ["/work/agent-systems", /BASE, CARL, PAUL, and SEED/i],
    ["/proof", /Follow each result back to the work/i],
    ["/about", /Experience across industries/i],
    ["/credentials", /Learning is part of the architecture/i],
    ["/decisions", /The trade-off is part of the architecture/i],
    ["/method", /How I approach architecture/i],
    ["/capabilities", /Tools other teams can use/i],
    ["/models", /The models I work with/i],
  ];

  for (const [pathname, pattern] of cases) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    const html = (await response.text()).replaceAll("<!-- -->", "");
    assert.match(html, pattern, pathname);
    if (pathname === "/capabilities") {
      const systemCount = (html.match(/id="capability-[^"]+"/g) ?? []).length;
      assert.ok(systemCount > 0);
      assert.ok(
        html.includes(`How I help / ${String(systemCount).padStart(2, "0")} systems`),
        "the introduction count matches the systems actually listed",
      );
    }
  }
});

test("source keeps the requested outcome hierarchy and public-state fields", async () => {
  const [casePage, workPage] = await Promise.all([
    readFile(new URL("app/components/v2/CaseStudyPage.tsx", root), "utf8"),
    readFile(new URL("app/work/page.tsx", root), "utf8"),
  ]);

  assert.match(casePage, /<p className="micro-label case-hero__eyebrow">\{caseStudy\.title\}<\/p>/);
  assert.match(casePage, /<h1 className="case-hero__plain">\{caseStudy\.cardHeadline\}<\/h1>/);
  assert.match(casePage, /description=\{caseStudy\.plainResult\}/);
  assert.match(casePage, /<p className="case-hero__result">\{caseStudy\.operatingResult\}<\/p>/);
  assert.doesNotMatch(casePage, /<h1>\{caseStudy\.title\}<\/h1>/);
  assert.match(casePage, /<dt>Public activity<\/dt>\s*<dd>\{caseStudy\.period\}<\/dd>/);
  assert.match(casePage, /caseStudy\.stages\.length[\s\S]*?stages<\/p>/);
  assert.match(casePage, /Six stages connect the original pressure to the system that now exists\./);
  assert.doesNotMatch(casePage, /caseStudy\.stages\.length[\s\S]{0,100}?decisions<\/p>/);

  for (const [label, value] of [
    ["My role", "responsibility"],
    ["Who it helps", "audience"],
  ]) {
    assert.match(
      workPage,
      new RegExp("<dt>" + label + "<\\/dt><dd>\\{caseStudy\\." + value + "\\}<\\/dd>"),
    );
  }

  assert.match(workPage, /<p>\{caseStudy\.plainResult\}<\/p>/);
  assert.match(workPage, /<h3>\{caseStudy\.proofState\}<\/h3>/);

  assert.doesNotMatch(casePage + workPage, /—/);
});

test("renders the work index with outcomes, audience, role, and linked implementation context", async () => {
  const response = await render("/work");
  const html = (await response.text()).replaceAll("<!-- -->", "");

  assert.equal((html.match(/<dt>My role<\/dt>/g) ?? []).length, 4);
  assert.equal((html.match(/<dt>Who it helps<\/dt>/g) ?? []).length, 4);
  assert.match(html, /Teams can coordinate security across many projects without losing control/i);
  assert.match(html, /available in the linked public fork and branches/i);
  assert.match(html, /available as working implementations across the linked public projects/i);
  for (const headline of [
    "Security at scale, with ownership intact.",
    "Policy results that preserve intent.",
    "Windows support in testable steps.",
    "Agent teams that carry context forward.",
  ]) {
    assert.ok(html.includes(`<h3>${headline}</h3>`), headline);
  }
});

test("renders case pages with an outcome H1 and a six-stage operating path", async () => {
  const cases = [
    [
      "/work/automated-security-helper",
      "Automated Security Helper",
      "Security at scale, with ownership intact.",
      "Teams can coordinate security across many projects without losing control of ownership, boundaries, or failures.",
      "Public contribution activity · 2024 to 2026",
    ],
    [
      "/work/cloudformation-guard",
      "CloudFormation Guard",
      "Policy results that preserve intent.",
      "Teams can trust that a policy verdict keeps the meaning its author intended, from evaluation through the result an operator sees.",
      "Public contribution activity · 2026",
    ],
    [
      "/work/nix-windows",
      "Nix on Windows",
      "Windows support in testable steps.",
      "A team can advance Windows support in independent, testable steps instead of betting the entire port on one large change.",
      "Public contribution activity · 2026",
    ],
    [
      "/work/agent-systems",
      "BASE, CARL, PAUL, and SEED",
      "Agent teams that carry context forward.",
      "Agent teams can remember reviewed decisions, recover interrupted work, and hand delivery across tools without losing context.",
      "Public contribution activity · 2026",
    ],
  ];

  for (const [pathname, system, headline, outcome, period] of cases) {
    const response = await render(pathname);
    const html = (await response.text()).replaceAll("<!-- -->", "");
    assert.match(
      html,
      new RegExp(
        '<p class="micro-label case-hero__eyebrow">' + escapeRegExp(system) +
          '<\\/p>\\s*<h1 class="case-hero__plain">' + escapeRegExp(headline) + '<\\/h1>',
        "i",
      ),
      pathname,
    );
    assert.match(html, new RegExp('"description":"' + escapeRegExp(outcome) + '"'), pathname);
    assert.match(
      html,
      new RegExp('<dt>Public activity<\\/dt><dd>' + escapeRegExp(period) + '<\\/dd>', "i"),
      pathname,
    );
    assert.match(html, /href="#story"[^>]*>Result</i);
    assert.match(html, /href="#architecture"[^>]*>How it works</i);
    assert.match(html, /href="#source"[^>]*>Public work</i);
    assert.match(html, /How it works \/ 06 stages/i);
    assert.match(html, /Six stages connect the original pressure to the system that now exists/i);
    assert.doesNotMatch(html, /How it works \/ 06 decisions/i);
    assert.equal((html.match(/class="case-path__marker"/g) ?? []).length, 6);
    for (const stage of ["pressure", "constraint", "decision", "implementation", "state", "proof"]) {
      assert.match(html, new RegExp('id="stage-' + stage + '"'));
    }
    assert.match(html, /From constraint to a system a team can own/i);
    assert.match(html, /Inspect the work behind the result/i);
    assert.doesNotMatch(html, /Scan[\s\S]*Read[\s\S]*Verify/i);
  }
});

test("renders contexted impact with normalized decorative employer marks", async () => {
  const response = await render("/about");
  const html = await response.text();
  for (const employer of [
    "Amazon Web Services",
    "Chainalysis",
    "Cameo",
    "Trōv",
    "Rakuten AirMap, Inc.",
    "F.T. Industries",
    "cielo24",
    "Quiver Media",
    "Tinder",
    "Joint Business Solutions",
  ]) {
    assert.match(html, new RegExp(escapeRegExp(employer), "i"));
  }
  assert.match(html, /Global payments network/i);
  assert.match(html, /Major U\.S\. financial institution/i);
  assert.match(html, /Global automotive and mobility manufacturer/i);
  assert.match(html, /International vehicle manufacturer/i);
  assert.match(html, /Global investment manager/i);
  const marks = html.match(/<img\b[^>]*src="\/logos\/svg\/[^"]+\.svg"[^>]*>/gi) ?? [];
  assert.equal(marks.length, 9);
  for (const mark of marks) {
    assert.match(mark, /alt=""/i);
    assert.match(mark, /loading="lazy"/i);
    assert.doesNotMatch(mark, /\.(?:png|jpe?g)\b/i);
  }
  assert.equal(new Set([...html.matchAll(/data-logo="([^"]+)"/g)].map((match) => match[1])).size, 10);
  assert.match(html, /Experience \/ Organizational range/i);
  assert.doesNotMatch(html, /trusted by/i);
});

test("ships layered responsive, motion-safe, and forced-color CSS", async () => {
  const [foundation, brand] = await Promise.all([
    readFile(new URL("public/portfolio-v2.css", root), "utf8"),
    readFile(new URL("public/portfolio-v3.css", root), "utf8"),
  ]);
  const css = foundation + "\n" + brand;
  assert.ok(gzipSync(foundation).byteLength <= 24 * 1024);
  assert.ok(gzipSync(brand).byteLength <= 18 * 1024);
  for (const breakpoint of ["70rem", "58rem", "48rem", "25rem"]) {
    assert.match(brand, new RegExp(`@media \\(max-width: ${breakpoint}\\)`));
  }
  assert.match(brand, /@media \(prefers-reduced-motion: reduce\)/i);
  assert.match(brand, /@media \(forced-colors: active\)/i);
  assert.match(brand, /@media print/i);
  assert.doesNotMatch(css, /body\s*\{[\s\S]*?min-width:\s*320px/i);
  assert.match(brand, /min-height:\s*44px/i);
  assert.match(foundation, /\.source-link__label\s*\{[\s\S]*?overflow-wrap:\s*anywhere/i);
  assert.match(brand, /\.career-ledger__mark\s*\{[\s\S]*?place-items:\s*center[\s\S]*?background:/i);
  assert.match(brand, /\.career-ledger__mark img\s*\{[\s\S]*?width:\s*100%[\s\S]*?height:\s*100%[\s\S]*?object-fit:\s*contain/i);
  assert.match(brand, /\.hope-line__svg--mobile\s*\{[\s\S]*?display:\s*none/i);
  assert.match(brand, /@media \(max-width: 48rem\)[\s\S]*?\.hope-line__svg--mobile\s*\{[\s\S]*?display:\s*block[\s\S]*?width:\s*100%[\s\S]*?transform:\s*none/i);
  assert.doesNotMatch(brand, /width:\s*56rem/i);
  assert.match(brand, /@media \(max-width: 58rem\)[\s\S]*?\.hope-patterns__intro\s*\{[\s\S]*?position:\s*static/i);
  assert.doesNotMatch(css, /scroll-behavior:\s*smooth|animation-timeline|mix-blend-mode|backdrop-filter/i);
  assert.doesNotMatch(css, /animation(?:-iteration-count)?:\s*[^;]*infinite/i);
});

test("renders a branded recovery page", async () => {
  const response = await render("/missing-route");
  assert.equal(response.status, 404);
  const html = await response.text();
  assert.match(html, /That path ends here\. The work continues\./i);
  assert.match(html, /aria-labelledby="not-found-routes-title"/i);
  assert.match(html, /<a class="not-found__route" href="\/">/i);
});
