import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { expectedProjectGraphIds } from "./project-catalog.mjs";

const root = new URL("../", import.meta.url);
const output = new URL("../pages-dist/", import.meta.url);

async function artifact(filename) {
  return readFile(new URL(filename, output), "utf8");
}

test("exports a production-origin GitHub Pages document", async () => {
  const html = await artifact("index.html");

  assert.match(html, /<!doctype html>/i);
  assert.match(
    html,
    /<link[^>]+rel="canonical"[^>]+href="https:\/\/mh0pe\.github\.io\/"/i,
  );
  assert.match(
    html,
    /<meta[^>]+property="og:image"[^>]+content="https:\/\/mh0pe\.github\.io\/og-v3\.jpg"/i,
  );
  assert.match(
    html,
    /<meta[^>]+name="twitter:image"[^>]+content="https:\/\/mh0pe\.github\.io\/og-v3\.jpg"/i,
  );
  assert.match(html, /http-equiv="Content-Security-Policy"/i);
  assert.match(html, /name="referrer" content="strict-origin-when-cross-origin"/i);
  assert.match(html, /Madison Hope Steiner \| Principal AI Architect Portfolio/i);
  assert.match(html, /type="application\/ld\+json"/i);
  assert.match(html, /"@type":"Person"/i);
  assert.match(html, /https:\/\/github\.com\/mh0pe/i);
  assert.match(html, /https:\/\/github\.com\/awsmadi/i);
  assert.match(html, /https:\/\/www\.linkedin\.com\/in\/madisonhsteiner/i);
  assert.match(
    html,
    /Bringing Hope to distributed systems[\s\S]*?at enterprise scale/i,
  );
  assert.match(html, /Six fixes merged[\s\S]*?minimal builder runs under Wine/i);
  assert.match(html, /Seven capability layers merged upstream/i);
  assert.match(html, /data-graph-source="inline"/i);
  assert.deepEqual(
    [...html.matchAll(/data-project-constellation="([^"]+)"/g)].map(
      (match) => match[1],
    ),
    expectedProjectGraphIds,
  );
  assert.doesNotMatch(html, /Loading the source trail/i);
  assert.doesNotMatch(html, /localhost|127\.0\.0\.1|\/_vinext\/image/i);
});

test("preserves Vinext hydration and all interactive client islands", async () => {
  const html = await artifact("index.html");
  const requiredChunks = [
    /\/assets\/index-[A-Za-z0-9_-]+\.js/,
    /\/assets\/ActiveNav-[A-Za-z0-9_-]+\.js/,
    /\/assets\/HeroSignalGraphic-[A-Za-z0-9_-]+\.js/,
    /\/assets\/AttributionExplorer-[A-Za-z0-9_-]+\.js/,
    /\/assets\/ContributionCardPlayer-[A-Za-z0-9_-]+\.js/,
    /\/assets\/ProjectConstellationBackdrop-[A-Za-z0-9_-]+\.js/,
  ];

  assert.match(html, /self\.__VINEXT_RSC_DONE__\s*=\s*true/);
  for (const pattern of requiredChunks) {
    const match = html.match(pattern);
    assert.ok(match, `Expected client chunk matching ${pattern}`);
    await access(new URL(`.${match[0]}`, output));
  }
});

test("bundles card constellations without the standalone WebGL rail", async () => {
  const html = await artifact("index.html");
  const assets = await readdir(new URL("assets/", output));
  const backdropMatch = html.match(
    /\/assets\/(ProjectConstellationBackdrop-[A-Za-z0-9_-]+\.js)/,
  );

  assert.ok(backdropMatch, "Expected the per-card constellation renderer");
  const backdropSource = await artifact(`assets/${backdropMatch[1]}`);
  assert.match(backdropSource, /data-project-constellation/);
  assert.doesNotMatch(html, /ContributionStoryRail-[A-Za-z0-9_-]+\.js/);
  assert.ok(
    !assets.some((asset) =>
      /^ContributionStoryRail-[A-Za-z0-9_-]+\.js$/.test(asset),
    ),
    "The standalone graph rail should leave the production bundle",
  );
  assert.ok(
    !assets.some((asset) =>
      /^ContributionGraphCanvas-[A-Za-z0-9_-]+\.js$/.test(asset),
    ),
    "The renderer should not wait for a late dynamic chunk",
  );
});

test("exports a static recovery page with full-navigation links", async () => {
  const html = await artifact("404.html");

  assert.match(html, /Page not found|This path does not exist/i);
  assert.match(
    html,
    /<a href="\/">[\s\S]*Return to portfolio[\s\S]*<\/a>/i,
  );
  assert.match(html, /https:\/\/github\.com\/mh0pe/i);
  assert.match(html, /https:\/\/github\.com\/awsmadi/i);
});

test("publishes client assets only", async () => {
  const topLevel = await readdir(output);
  const clientAssets = await readdir(new URL("assets/", output));

  assert.ok(topLevel.includes("index.html"));
  assert.ok(topLevel.includes("404.html"));
  assert.ok(topLevel.includes("portfolio.css"));
  assert.ok(topLevel.includes("favicon.svg"));
  assert.ok(topLevel.includes("robots.txt"));
  assert.ok(topLevel.includes("sitemap.xml"));
  assert.ok(topLevel.includes("llms.txt"));
  assert.ok(!topLevel.includes("server"));
  assert.ok(!topLevel.includes(".vite"));
  assert.ok(!topLevel.includes("_headers"));
  assert.ok(!topLevel.includes(".assetsignore"));
  assert.ok(!topLevel.includes("og-v2.png"));
  assert.ok(
    clientAssets.every((asset) => !asset.endsWith(".json")),
    "Full contribution graphs should be compiled inline, not emitted as runtime JSON assets",
  );
  for (const graphId of expectedProjectGraphIds) {
    assert.ok(
      clientAssets.every((asset) => !asset.includes(graphId)),
      `Graph ${graphId} should not be emitted as a separately fetched asset`,
    );
  }

  const [robots, sitemap, llms] = await Promise.all([
    artifact("robots.txt"),
    artifact("sitemap.xml"),
    artifact("llms.txt"),
  ]);
  assert.match(robots, /Sitemap: https:\/\/mh0pe\.github\.io\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/mh0pe\.github\.io\/<\/loc>/);
  assert.match(llms, /Madison Hope Steiner/);
  assert.match(llms, /https:\/\/github\.com\/mh0pe/);
  assert.match(llms, /https:\/\/github\.com\/awsmadi/);
  assert.match(llms, /https:\/\/www\.linkedin\.com\/in\/madisonhsteiner/);

  await access(new URL("LICENSE", root));
});
