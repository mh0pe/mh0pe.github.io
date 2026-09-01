import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function source(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

test("rapid scrolling suspends expensive contribution motion", async () => {
  const [activity, rail, backdrop, constellation, css] = await Promise.all([
    source("app/components/contribution-story/scroll-activity.ts"),
    source("app/components/contribution-story/ContributionStoryRail.tsx"),
    source("app/components/contribution-story/ProjectConstellationBackdrop.tsx"),
    source("app/components/ContributionConstellation.tsx"),
    source("public/portfolio.css"),
  ]);

  assert.match(activity, /addEventListener\("scroll", handleScroll, \{ passive: true \}\)/);
  assert.match(activity, /SCROLL_IDLE_DELAY_MS = 160/);
  assert.match(rail, /canUseCanvas &&[\s\S]*!scrollActive &&[\s\S]*!reduceMotion/);
  assert.match(
    rail,
    /animate=\{!canvasReady && !reduceMotion && !scrollActive\}/,
  );
  assert.match(backdrop, /const visualActive = active && !scrollActive/);
  assert.match(backdrop, /const motionActive = visualActive && !reduceMotion/);
  assert.match(
    constellation,
    /const reduceMotion = useReducedMotion\(\) === true \|\| scrollActive/,
  );
  assert.match(css, /html\[data-scroll-active="true"\] \.project-constellation/);
  assert.match(
    css,
    /html\[data-scroll-active="true"\] body::before[\s\S]*mix-blend-mode: normal/,
  );
  assert.match(
    css,
    /html\[data-scroll-active="true"\] \.site-header[\s\S]*backdrop-filter: none/,
  );
  assert.doesNotMatch(
    css,
    /(?:project-story \.project|frontier-story \.frontier-list article|support-story \.support-list article)[\s\S]{0,420}transition:[\s\S]{0,180}box-shadow/,
  );
});

test("story layouts do not reserve space for the retired standalone player", async () => {
  const css = await source("public/portfolio.css");

  for (const className of ["project-story", "frontier-story", "support-story"]) {
    const rule = css.match(new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`))?.[1];
    assert.ok(rule, `expected a base .${className} rule`);
    assert.match(rule, /display:\s*block;/);
    assert.doesNotMatch(rule, /grid-template-columns:/);
  }

  assert.match(
    css,
    /\.decision-list article:nth-child\(4\)[\s\S]*?grid-column:\s*1 \/ 7/,
  );
  assert.match(
    css,
    /\.decision-list article:nth-child\(5\)[\s\S]*?grid-column:\s*7 \/ 13/,
  );
  assert.match(
    css,
    /@media screen and \(min-width: 68\.001rem\)[\s\S]*?\.lineage-stage-shell\s*\{[\s\S]*?position:\s*sticky/,
  );
  assert.match(
    css,
    /@media screen and \(min-width: 68\.001rem\)[\s\S]*?\.support-story > \.support-list\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2/,
  );
});
