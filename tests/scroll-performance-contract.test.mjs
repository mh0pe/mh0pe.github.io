import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { expectedProjectGraphIds } from "./project-catalog.mjs";

const root = new URL("../", import.meta.url);

test("homepage motion remains finite, static-first, and independent of scroll handlers", async () => {
  const [page, foundation, brand, interactionCss, interactions, field, work, lineageField] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("public/portfolio-v2.css", root), "utf8"),
    readFile(new URL("public/portfolio-v3.css", root), "utf8"),
    readFile(new URL("public/interactions.css", root), "utf8"),
    readFile(new URL("public/interactions.js", root), "utf8"),
    readFile(new URL("app/components/v3/HopeLineField.tsx", root), "utf8"),
    readFile(new URL("app/work/page.tsx", root), "utf8"),
    readFile(new URL("app/components/v3/ProjectLineageField.tsx", root), "utf8"),
  ]);
  const css = foundation + "\n" + brand;
  const staticSurface = page + css + field + work + lineageField;

  assert.doesNotMatch(
    page,
    /ContributionConstellation|ContributionCardPlayer|ProjectConstellationBackdrop|AttributionExplorer|HeroSignalGraphic/,
  );
  assert.doesNotMatch(
    staticSurface,
    /addEventListener\(["']scroll|animation-timeline|scroll-timeline|requestAnimationFrame|setInterval|animateMotion|frameloop|backdrop-filter|mix-blend-mode|import\(/,
  );
  assert.doesNotMatch(css, /animation(?:-iteration-count)?:\s*[^;]*infinite/i);
  assert.match(interactions, /IntersectionObserver/);
  assert.match(interactions, /saveData/);
  assert.match(interactions, /prefers-reduced-motion/);
  assert.match(interactions, /!video\.hasAttribute\("data-motion-visible"\)/);
  assert.match(interactions, /for \(const observer of motionFilmObservers\) observer\.disconnect\(\)/);
  assert.match(interactions, /if \(motionFilmObservers\.length > 0\) return/);
  assert.match(
    interactions,
    /addEventListener\("playing"[\s\S]*?poster\.style\.opacity = "1"[\s\S]*?video\.toggleAttribute\("data-motion-ready", true\)/,
  );
  assert.doesNotMatch(interactions, /loadeddata[^\n]+data-motion-ready/);
  assert.match(
    interactions,
    /compactNavigation\.matches[\s\S]*?activeLink\.closest\("\.case-jump"\)[\s\S]*?activeLink\.scrollIntoView\(\{[\s\S]*?behavior:\s*"auto"[\s\S]*?inline:\s*"nearest"/,
  );
  assert.doesNotMatch(interactions, /scrollIntoView\(\{[\s\S]{0,180}?behavior:\s*"smooth"/);
  assert.match(interactions, /const MOTION_FILM_SCROLL_IDLE_MS = 180/);
  assert.match(
    interactions,
    /window\.addEventListener\("scroll", beginMotionFilmScroll, \{ passive: true \}\)/,
  );
  assert.match(
    interactions,
    /function loadMotionFilm\([\s\S]*?motionFilmScrollActive[\s\S]*?!explicitIntent[\s\S]*?!motionFilmHasIntent\(video\)[\s\S]*?return false/,
  );
  assert.match(
    interactions,
    /function loadMotionFilm\([\s\S]*?reduceMotion\.matches[\s\S]*?navigator\.connection\?\.saveData === true[\s\S]*?return false/,
  );
  assert.match(
    interactions,
    /function beginMotionFilmScroll\(\)[\s\S]*?motionFilmScrollActive = true[\s\S]*?removeAttribute\("data-motion-intent"\)[\s\S]*?video\.pause\(\)[\s\S]*?window\.setTimeout\([\s\S]*?MOTION_FILM_SCROLL_IDLE_MS/,
  );
  assert.match(
    interactions,
    /function resumeMotionFilmsAfterScroll\(\)[\s\S]*?motionFilmScrollActive = false[\s\S]*?loadMotionFilm\(video\)[\s\S]*?playMotionFilm\(video\)/,
  );
  assert.match(
    interactions,
    /addEventListener\("click", \(\) => requestMotionFilm\(video\)\)/,
  );
  assert.match(
    interactions,
    /function requestMotionFilm\(video\)[\s\S]*?video\.dataset\.motionIntent = "true"[\s\S]*?explicitIntent: true/,
  );
  assert.match(
    interactions,
    /addEventListener\("visibilitychange"[\s\S]*?!document\.hidden\) observeMotionFilms\(\)/,
  );
  assert.doesNotMatch(
    interactions,
    /addEventListener\(["'](?:wheel|touchmove|pointermove|mousemove)|requestAnimationFrame|setInterval|\bfetch\(|\bimport\(/,
  );
  assert.doesNotMatch(interactionCss, /animation-timeline|scroll-timeline/);
  assert.doesNotMatch(
    interactionCss,
    /animation(?:-iteration-count)?:\s*[^;]*infinite/i,
  );
  assert.match(interactionCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(interactionCss, /\.motion-film\s*\{[^}]*margin-inline:\s*0;/);
  assert.match(brand, /@keyframes hope-tracer-pass/);
  assert.match(brand, /\.hope-line\[data-motion-entered\] \.hope-line__spine-tracer\s*\{[^}]*animation:\s*hope-tracer-pass/);
  assert.doesNotMatch(brand, /(?:^|\n)\s*\.hope-line__spine-tracer\s*\{[^}]*animation:(?!\s*none\b)/);
  assert.match(field, /pathLength="1"/);
  assert.match(field, /getContributionGraph/);
  const graphIdBlock = field.match(/const graphIds = \[([\s\S]*?)\] as const/)?.[1];
  assert.ok(graphIdBlock);
  assert.deepEqual(
    [...graphIdBlock.matchAll(/"([a-z0-9-]+)"/g)].map((match) => match[1]),
    expectedProjectGraphIds,
  );
  assert.match(work, /<ProjectLineageField caseStudy=\{caseStudy\} compact/);
  assert.match(lineageField, /data-lineage-label/);
  assert.match(lineageField, /getContributionGraph/);
  assert.doesNotMatch(page + field, /["']use client["']/);
  assert.match(brand, /@media \(prefers-reduced-motion: reduce\)/);
});

test("mobile presentation linearizes the portfolio while retaining bounded data art", async () => {
  const css = await readFile(new URL("public/portfolio-v3.css", root), "utf8");

  assert.match(css, /@media \(max-width: 58rem\)[\s\S]*?\.hope-patterns__intro\s*\{[\s\S]*?position:\s*static/);
  assert.match(css, /@media \(max-width: 48rem\)[\s\S]*?\.hope-line__index\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(css, /@media \(max-width: 48rem\)[\s\S]*?\.hope-line__svg--mobile\s*\{[\s\S]*?display:\s*block[\s\S]*?width:\s*100%[\s\S]*?transform:\s*none/);
  assert.doesNotMatch(css, /width:\s*56rem/);
  assert.match(css, /@media \(max-width: 48rem\)[\s\S]*?\.hope-work__stories\s*\{[\s\S]*?display:\s*block/);
  assert.match(css, /\.hope-line__art\s*\{[\s\S]*?overflow:\s*hidden/);
  assert.doesNotMatch(css, /(?:html|body|main)\s*\{[^}]*overflow-x:\s*(?:auto|scroll)/);
});

test("interactive surfaces retain legible contrast, focus, and touch targets", async () => {
  const css = await readFile(new URL("public/portfolio-v3.css", root), "utf8");

  assert.match(css, /--hope-green-dark:\s*#596825/);
  assert.match(css, /\.hope-brand h1,[\s\S]*?hyphens:\s*none[\s\S]*?overflow-wrap:\s*normal[\s\S]*?text-wrap:\s*balance[\s\S]*?word-break:\s*normal/);
  assert.match(css, /\.hope-composition :focus-visible\s*\{[\s\S]*?outline-color:\s*#f5f0e7/);
  assert.match(css, /\.hope-line-chamber :focus-visible,[\s\S]*?outline-color:\s*var\(--hope-green\)/);
  assert.match(css, /\.hope-line__index-actions a\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(css, /\.hope-brand \.site-footer nav a\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(css, /\.hope-brand \.case-jump a\s*\{[\s\S]*?min-height:\s*44px/);
  assert.doesNotMatch(css, /repeat\(auto-fit,\s*minmax\(0,\s*1fr\)\)/);
});
