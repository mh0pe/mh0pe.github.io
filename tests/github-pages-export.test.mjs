import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { gzipSync } from "node:zlib";

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

test("exports every redesign route with production canonical metadata", async () => {
  for (const [filename, canonical] of routes) {
    const html = await artifact(filename);
    assert.match(html, /<!doctype html>/i, filename);
    assert.ok(
      html.includes('rel="canonical" href="' + canonical + '"') ||
        html.includes('href="' + canonical + '" rel="canonical"'),
      filename + " should declare " + canonical,
    );
    if (filename === "models/index.html") {
      assert.match(html, /self\.__VINEXT_RSC_DONE__\s*=\s*true/);
    } else {
      assert.doesNotMatch(html, /self\.__VINEXT_RSC_|rel="modulepreload"/i);
    }
    assert.doesNotMatch(html, /localhost|127\.0\.0\.1|\/_vinext\/image/i);
  }
});

test("exports the Hope Line root as a static, outcome-first document", async () => {
  const html = await artifact("index.html");
  assert.match(
    html,
    /I help teams build and run AI, security, and cloud systems\./i,
  );
  assert.match(html, /data-visualization="hope-line"/i);
  assert.match(html, /data-node-type="repository"/i);
  assert.match(html, /data-node-type="evidence"/i);
  assert.match(html, /data-node-type="commit"/i);
  assert.match(html, /data-node-type="file"/i);
  assert.match(
    html,
    /Bringing\s*(?:<em[^>]*>)?Hope(?:<\/em>)?\s*to distributed systems at enterprise scale/i,
  );
  assert.doesNotMatch(
    html,
    /ContributionCardPlayer|ContributionConstellation|ProjectConstellationBackdrop|AttributionExplorer|data-project-constellation|data-contribution-player/,
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
  assert.doesNotMatch(home, /AttributionExplorer-[A-Za-z0-9_-]+\.js/);
  assert.doesNotMatch(proof, /AttributionExplorer-[A-Za-z0-9_-]+\.js/);
  assert.doesNotMatch(evidence, /AttributionExplorer-[A-Za-z0-9_-]+\.js/);
  assert.match(proof, /href="\/models\/#agent-collaboration"/i);
  assert.match(evidence, /href="\/models\/#agent-collaboration"/i);

  const match = models.match(
    /\/assets\/(AttributionExplorer-[A-Za-z0-9_-]+\.js)/,
  );
  assert.ok(match, "models route should load its attribution explorer");
  await access(new URL("assets/" + match[1], output));
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
            staticRuntimePattern.test(match[0]),
          `${filename} contains an unexpected runtime script: ${match[0]}`,
        );
      }
    }
  }
});

test("supporting routes continue into a relevant next chapter", async () => {
  const nextChapterByArtifact = {
    "work/index.html": "/capabilities/",
    "capabilities/index.html": "/method/",
    "method/index.html": "/decisions/",
    "decisions/index.html": "/work/",
    "about/index.html": "/credentials/",
    "credentials/index.html": "/work/",
    "proof/index.html": "/models/#agent-collaboration",
    "models/index.html": "/proof/",
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
