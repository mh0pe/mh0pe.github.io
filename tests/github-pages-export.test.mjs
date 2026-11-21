import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { tsImport } from "tsx/esm/api";
import { discoverExportCatalog } from "../tools/export-catalog.mjs";

const root = new URL("../", import.meta.url);
const output = new URL("../pages-dist/", import.meta.url);

async function artifact(filename) {
  return readFile(new URL(filename, output), "utf8");
}

const routes = [
  ["index.html", "https://mh0pe.github.io/"],
  ["work/index.html", "https://mh0pe.github.io/work/"],
  ["work/automated-security-helper/index.html", "https://mh0pe.github.io/work/automated-security-helper/"],
  ["work/cloudformation-guard/index.html", "https://mh0pe.github.io/work/cloudformation-guard/"],
  ["work/nix-windows/index.html", "https://mh0pe.github.io/work/nix-windows/"],
  ["work/agent-systems/index.html", "https://mh0pe.github.io/work/agent-systems/"],
  ["proof/index.html", "https://mh0pe.github.io/proof/"],
  ["about/index.html", "https://mh0pe.github.io/about/"],
  ["credentials/index.html", "https://mh0pe.github.io/credentials/"],
  ["decisions/index.html", "https://mh0pe.github.io/decisions/"],
  ["method/index.html", "https://mh0pe.github.io/method/"],
  ["capabilities/index.html", "https://mh0pe.github.io/capabilities/"],
  ["models/index.html", "https://mh0pe.github.io/models/"],
  ["evidence/index.html", "https://mh0pe.github.io/proof/"],
  ["career/index.html", "https://mh0pe.github.io/about/"],
  ["blog/zero-findings/index.html", "https://mh0pe.github.io/blog/zero-findings/"],
];

const staticRuntimePattern =
  /data-static-runtime="(?:theme-bootstrap|theme|interactions)"/i;
const criticalFontPreloads = [
  "/fonts/instrument-sans-variable.woff2",
  "/fonts/newsreader-variable.woff2",
];

function fontPreloadTags(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter(
      (tag) =>
        /\brel="preload"/i.test(tag) &&
        /\bas="font"/i.test(tag),
    );
}

test("every exported document keeps one same-origin favicon without weakening its security policy", async () => {
  const catalog = await discoverExportCatalog(fileURLToPath(output));
  assert.equal(catalog.length, 27);
  for (const entry of catalog) {
    const html = await artifact(entry.output);
    const icons = [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => tag).filter(tag => /\brel="icon"/i.test(tag));
    assert.equal(icons.length, 1, entry.output);
    assert.match(icons[0], /\bhref="\/favicon\.svg"/, entry.output);
    assert.match(icons[0], /\btype="image\/svg\+xml"/, entry.output);
    const csp = [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => tag).find(tag => /http-equiv="Content-Security-Policy"/i.test(tag));
    assert.ok(csp, entry.output);
    const content = csp.match(/content="([^"]*)"/i)?.[1].replaceAll("&#x27;", "'");
    assert.equal(content, "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; img-src 'self' data:; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'", entry.output);
  }
});

test("every exported identity link retains its visible accessible name", async () => {
  const catalog = await discoverExportCatalog(fileURLToPath(output));
  let identities = 0;
  for (const entry of catalog) {
    const html = await artifact(entry.output);
    const identity = html.match(/<a\b[^>]*class="site-identity"[^>]*>[\s\S]*?<\/a>/)?.[0];
    if (!identity) {
      assert.equal(entry.output, "404.html", "only the standalone 404 has no shared identity header");
      continue;
    }
    identities += 1;
    assert.doesNotMatch(identity, /aria-label(?:ledby)?=/, entry.output);
    assert.match(identity, /href="\/"/, entry.output);
    assert.match(identity, /class="site-identity__mark" aria-hidden="true"/, entry.output);
    assert.match(identity, /Principal AI Architect/, entry.output);
  }
  assert.equal(identities, 26);
});

test("exports every redesign route with production canonical metadata", async () => {
  for (const [filename, canonical] of routes) {
    const html = await artifact(filename);
    assert.match(html, /<!doctype html>/i, filename);
    assert.ok(
      html.includes('rel="canonical" href="' + canonical + '"') ||
        html.includes('href="' + canonical + '" rel="canonical"'),
      filename + " should declare " + canonical,
    );
    assert.doesNotMatch(html, /self\.__VINEXT_RSC_|rel="modulepreload"/i);
    assert.equal((html.match(/data-static-runtime="model-explorer"/g) ?? []).length,
      filename === "models/index.html" ? 1 : 0, filename);
    assert.doesNotMatch(html, /localhost|127\.0\.0\.1|\/_vinext\/image/i);
  }
});

test("exports the visual landing story as a static, outcome-first document", async () => {
  const html = await artifact("index.html");
  assert.match(
    html,
    /I help teams make AI, security, and cloud platforms work together at enterprise scale\./i,
  );
  assert.match(html, /data-home-section="selected-work"/i);
  assert.deepEqual(
    [...html.matchAll(/data-story-kind="([^"]+)"/g)].map((match) => match[1]),
    ["security", "policy", "windows", "continuity"],
  );
  assert.equal((html.match(/<strong>My contribution<\/strong>/g) ?? []).length, 4);
  assert.equal((html.match(/<summary>Explore the changes and source history<\/summary>/g) ?? []).length, 4);
  for (const id of ["automated-security-helper", "cloudformation-guard", "nix-windows", "agent-systems"]) {
    assert.ok(html.includes(`id="project-${id}"`), id);
    assert.ok(html.includes(`href="/work/${id}/"`), `${id} remains shareable`);
  }
  for (const kind of ["project", "change", "commit", "file"]) {
    assert.ok(html.includes(`data-source-kind="${kind}"`), kind);
  }
  assert.match(html, /Read the reviewed change/i);
  assert.equal((html.match(/class="landing-principle"/g) ?? []).length, 5);
  assert.equal((html.match(/class="landing-employer"/g) ?? []).length, 10);
  assert.match(html, /class="landing-credential-groups"/);
  const galleries = [...html.matchAll(/<ul class="landing-credential-gallery">([\s\S]*?)<\/ul>/g)].map(([, gallery]) => gallery);
  assert.equal(galleries.length, 4);
  assert.equal(galleries.reduce((count, gallery) => count + (gallery.match(/<img\b/g) ?? []).length, 0), 25);
  assert.equal(galleries.reduce((count, gallery) => count + (gallery.match(/<li\b/g) ?? []).length, 0), 25);
  assert.doesNotMatch(html, /landing-credential-list|landing-credential-highlights|Explore all 25 credentials earned/);
  assert.doesNotMatch(html, /class="cap-change"|data-cap-project=/);
  assert.match(
    html,
    /Bringing\s*(?:<em[^>]*>)?Hope(?:<\/em>)?\s*to distributed systems\./i,
  );
  assert.doesNotMatch(
    html,
    /ContributionCardPlayer|ContributionConstellation|ProjectConstellationBackdrop|AttributionExplorer|data-project-constellation|data-contribution-player|data-visualization="hope-line"|cap-tower/,
  );
  for (const match of html.matchAll(/<script\b[^>]*>/gi)) {
    assert.ok(
      /type="application\/ld\+json"/i.test(match[0]) ||
        staticRuntimePattern.test(match[0]),
      `unexpected homepage script: ${match[0]}`,
    );
  }
  assert.match(html, /data-static-runtime="theme-bootstrap"/i);
  assert.match(html, /data-static-runtime="theme"[^>]*src="\/theme\.js\?v=/i);
  assert.match(html, /data-static-runtime="interactions"[^>]*src="\/interactions\.js\?v=/i);
  assert.doesNotMatch(html, /rel="modulepreload"/i);
  assert.ok(gzipSync(html).byteLength <= 40 * 1024);
});

test("loads model-attribution code only from the model-composition surfaces", async () => {
  const [home, proof, models, evidence] = await Promise.all([
    artifact("index.html"),
    artifact("proof/index.html"),
    artifact("models/index.html"),
    artifact("evidence/index.html"),
  ]);
  for (const html of [home, proof, evidence]) assert.doesNotMatch(html, /model-explorer\.js|AttributionExplorer-[A-Za-z0-9_-]+\.js/);
  assert.match(proof, /href="\/models\/#agent-collaboration"/i);
  assert.match(evidence, /href="\/models\/#agent-collaboration"/i);

  const match = models.match(/src="\/(model-explorer\.js)\?v=[a-f0-9]{64}"/);
  assert.ok(match, "models route should load its attribution explorer");
  await access(new URL(match[1], output));
});

test("exports one complete hash-bound attribution archive without loading it on other routes", async () => {
  const { validateAttributionTransportFiles } = await tsImport(new URL("../tools/build-attribution-transport.mjs", import.meta.url).href, import.meta.url);
  const seed = JSON.parse(await readFile(new URL("../app/data/attribution-transport.json", import.meta.url), "utf8"));
  const decoded = await validateAttributionTransportFiles({
    seed,
    archiveDirectory: new URL("attribution/", output).pathname,
    attributionBytes: await readFile(new URL("../app/data/agent-attribution.json", import.meta.url)),
    basisBytes: await readFile(new URL("../app/data/agent-attribution-basis.json", import.meta.url)),
  });
  assert.equal(decoded.data.commits.length, seed.totalRows);
  assert.deepEqual((await readdir(new URL("attribution/", output))).sort(), seed.archive.map(chunk => `${chunk.sha256}.json`).sort());
  const models = await artifact("models/index.html");
  assert.ok(models.includes(`data-attribution-generation="${seed.canonicalSha256}"`));
  for (const [filename] of routes) {
    if (filename === "models/index.html") continue;
    const html = await artifact(filename);
    assert.doesNotMatch(html, /(?:src|href)="\/attribution\//);
    assert.doesNotMatch(html, /attribution-transport|data-attribution-generation/);
  }
});

test("preloads only the two normal above-the-fold font faces", async () => {
  const artifacts = [...routes.map(([filename]) => filename), "404.html"];

  for (const filename of artifacts) {
    const html = await artifact(filename);
    const tags = fontPreloadTags(html);
    const hrefs = tags.map((tag) => tag.match(/\bhref="([^"]+)"/i)?.[1]);

    assert.deepEqual(hrefs, criticalFontPreloads, filename);
    for (const tag of tags) {
      assert.match(tag, /\btype="font\/woff2"/i, filename);
      assert.match(tag, /\bcrossorigin(?:="")?/i, filename);
    }
    assert.doesNotMatch(
      html,
      /<link\b[^>]*rel="preload"[^>]*newsreader-variable-italic\.woff2/i,
      filename,
    );
  }

  for (const font of criticalFontPreloads) {
    await access(new URL(`.${font}`, output));
  }
});

test("exports a static recovery page with full-navigation links", async () => {
  const html = await artifact("404.html");
  assert.match(html, /<div class="not-found__shell">/i);
  assert.match(html, /<ol class="not-found__route-list">/i);
  assert.match(
    html,
    /<a class="not-found__route" href="\/">[\s\S]*Portfolio[\s\S]*<\/a>/i,
  );
  assert.match(html, /https:\/\/github\.com\/mh0pe/i);
  assert.match(html, /https:\/\/github\.com\/awsmadi/i);
  assert.match(html, /data-theme-toggle/i);
});

test("every exported page preserves only the intended static enhancement runtime", async () => {
  const artifacts = [...routes.map(([filename]) => filename), "404.html"];

  for (const filename of artifacts) {
    const html = await artifact(filename);
    assert.match(html, /data-static-runtime="theme-bootstrap"/i, filename);
    assert.match(
      html,
      /data-static-runtime="theme"[^>]*src="\/theme\.js\?v=/i,
      filename,
    );
    assert.match(
      html,
      /data-static-runtime="interactions"[^>]*src="\/interactions\.js\?v=/i,
      filename,
    );

    if (filename !== "models/index.html") {
      for (const match of html.matchAll(/<script\b[^>]*>/gi)) {
        assert.ok(
          /type="application\/ld\+json"/i.test(match[0]) ||
            staticRuntimePattern.test(match[0]) ||
            (filename.startsWith("blog/") && /data-static-runtime="(journal|article-scroll)" src="\/\1\.js\?v=[a-f0-9]{64}"/.test(match[0])),
          `${filename} contains an unexpected runtime script: ${match[0]}`,
        );
      }
    }
  }
});

test("supporting routes continue into a relevant next chapter", async () => {
  const nextChapterByArtifact = {
    "work/index.html": "/blog/workspace-security/",
    "capabilities/index.html": "/method/",
    "method/index.html": "/blog/handoffs-that-carry-the-work/",
    "decisions/index.html": "/work/",
    "about/index.html": "/credentials/",
    "credentials/index.html": "/work/",
    "proof/index.html": "/blog/",
    "models/index.html": "/work/agent-systems/",
  };

  for (const [filename, href] of Object.entries(nextChapterByArtifact)) {
    const html = await artifact(filename);
    assert.match(html, /class="site-footer__journey"/i, filename);
    assert.ok(
      html.includes(`class="site-footer__journey-link" href="${href}"`),
      `${filename} should continue to ${href}`,
    );
  }

  assert.doesNotMatch(await artifact("index.html"), /class="site-footer__journey"/i);
});

test("case studies have one closing journey and retain the shared contact footer", async () => {
  for (const filename of [
    "work/automated-security-helper/index.html",
    "work/cloudformation-guard/index.html",
    "work/nix-windows/index.html",
    "work/agent-systems/index.html",
  ]) {
    const html = await artifact(filename);
    assert.match(html, /class="case-close"/, filename);
    assert.match(html, /aria-label="Adjacent case studies"/, filename);
    assert.doesNotMatch(html, /class="site-footer__journey"/, filename);
    assert.match(html, /class="site-footer site-footer--compact"/, filename);
    assert.match(html, /Let&#x27;s talk about what you&#x27;re building\./, filename);
  }
});

test("case-study hero and adjacent links use concise outcome headlines", async () => {
  const source = await readFile(new URL("app/components/v2/CaseStudyPage.tsx", root), "utf8");
  assert.match(source, /<h1 className="case-hero__plain">\{caseStudy\.cardHeadline\}<\/h1>/);
  assert.match(source, /<strong>\{previous\.cardHeadline\}<\/strong>/);
  assert.match(source, /<strong>\{next\.cardHeadline\}<\/strong>/);
  assert.match(source, /description=\{caseStudy\.plainResult\}/);
  assert.match(source, /<p className="case-hero__result">\{caseStudy\.operatingResult\}<\/p>/);
});

test("publishes a browser-only artifact surface and discovery files", async () => {
  const topLevel = await readdir(output);
  const clientAssets = await readdir(new URL("assets/", output));

  for (const required of [
    "index.html",
    "404.html",
    "portfolio-v2.css",
    "portfolio-v3.css",
    "interactions.css",
    "interactions.js",
    "theme.js",
    "favicon.svg",
    "og-v3.jpg",
    "robots.txt",
    "sitemap.xml",
    "llms.txt",
    "work",
    "proof",
    "about",
    "credentials",
    "motion",
  ]) {
    assert.ok(topLevel.includes(required), required);
  }
  for (const forbidden of ["server", ".vite", "_headers", ".assetsignore", "og-v2.png"]) {
    assert.ok(!topLevel.includes(forbidden), forbidden);
  }
  assert.ok(clientAssets.every((asset) => !asset.endsWith(".json")));

  const [robots, sitemap, llms] = await Promise.all([
    artifact("robots.txt"),
    artifact("sitemap.xml"),
    artifact("llms.txt"),
  ]);
  assert.match(robots, /Sitemap: https:\/\/mh0pe\.github\.io\/sitemap\.xml/);
  for (const [, canonical] of routes) {
    assert.ok(sitemap.includes("<loc>" + canonical + "</loc>"), canonical);
  }
  assert.match(llms, /Madison Hope Steiner/);
  assert.match(llms, /Selected systems: https:\/\/mh0pe\.github\.io\/work\//i);
  assert.match(llms, /Credentials earned: https:\/\/mh0pe\.github\.io\/credentials\//i);
  assert.match(llms, /GitHub, mh0pe: https:\/\/github\.com\/mh0pe/i);
  assert.match(llms, /GitHub, awsmadi: https:\/\/github\.com\/awsmadi/i);

  await access(new URL("LICENSE", root));
});
