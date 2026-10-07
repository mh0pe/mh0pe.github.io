import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../app/components/v3/LivingArchitecture.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../public/living-architecture.css", import.meta.url), "utf8");
const claims = readFileSync(new URL("../app/data/capability-bricks.ts", import.meta.url), "utf8");

test("architectural areas lead to real project sections without implying dependency or volume", () => {
  for (const id of ["nix-windows", "automated-security-helper", "cloudformation-guard", "agent-systems"]) {
    assert.ok(component.includes(`href: "#project-${id}"`));
  }
  assert.match(component, /areas of practice, not contribution volume or dependencies/);
  assert.match(component, /<a href=\{area\.href\}/);
  assert.doesNotMatch(component, /onMouseMove|onPointerMove|requestAnimationFrame|setInterval|"use client"/);
});

test("five contribution scenes have distinct structures and source-backed guidance count", () => {
  for (const name of ["Guidance", "Security", "Windows", "Continuity", "Policy"]) {
    assert.match(component, new RegExp(`function ${name}\\(\\)`));
  }
  for (const structure of ["fanout", "lanes", "nested-build", "handoff", "verdicts"]) {
    assert.ok(component.includes(`contribution-scene__${structure}`));
  }
  assert.match(component, /Array\.from\(\{ length: 15 \}/);
  assert.match(claims, /outputCount: 15/);
  assert.match(component, /Nothing to compare/);
  assert.match(component, /Project context stays attached/);
  assert.match(component, /Another Nix operation/);
  assert.doesNotMatch(component, /⌘/);
});

test("art keeps meaningful labels in HTML and no essential labels in SVG", () => {
  assert.doesNotMatch(component, /<text\b/);
  const svgTags = [...component.matchAll(/<svg\b[^>]*>/g)].map(([tag]) => tag);
  assert.ok(svgTags.length >= 4);
  assert.ok(svgTags.every((tag) => tag.includes('aria-hidden="true"') && tag.includes('focusable="false"')));
  assert.match(component, /<figcaption>\{scene\.caption\}<\/figcaption>/);
  assert.match(css, /\.architecture-hero__key a:focus-visible/);
  assert.match(css, /min-height: 54px/);
});

test("motion is a finite progressive enhancement with theme and reduced-motion fallbacks", () => {
  assert.match(component, /data-motion-once/);
  assert.match(css, /prefers-reduced-motion: no-preference/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /data-motion-entered/);
  assert.match(css, /data-art-static/);
  assert.match(css, /data-page-hidden/);
  assert.match(css, /\[data-theme="dark"\]/);
  assert.match(css, /@container \(max-width: 28rem\)/);
  assert.doesNotMatch(css, /infinite|animation-timeline|will-change/);
});
