import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("primary navigation follows the hiring-reader spine", async () => {
  const header = await source("app/components/v2/SiteHeader.tsx");
  const navigation = header.match(/const navigation = \[([\s\S]*?)\] as const;/)?.[1];

  assert.ok(navigation, "primary navigation should have a static route list");
  assert.deepEqual(
    [...navigation.matchAll(/label: "([^"]+)"/g)].map((match) => match[1]),
    ["Work", "How I help", "Decisions", "Experience", "Evidence"],
  );
  assert.doesNotMatch(navigation, /Approach|Credentials|Models|Public work/);
  assert.match(header, />\s*Connect<span className="visually-hidden">/);
  assert.match(header, /aria-current=\{current === item\.key \? "location" : undefined\}/);
  assert.doesNotMatch(header, /current === "(?:method|credentials|models)"/);
});

test("child routes do not claim a primary destination as current", async () => {
  const frame = await source("app/components/v2/RouteFrame.tsx");

  assert.match(
    frame,
    /const primaryCurrent = routeMotif === "case-study" \? undefined : current;/,
  );
  assert.match(frame, /<SiteHeader current=\{primaryCurrent\} activeSection=\{primarySection\} \/>/);
  assert.match(frame, /const primarySection = routeMotif === "case-study" \? current : undefined;/);
});

test("nested work has a visual section cue without claiming the parent page is current", async () => {
  const header = await source("app/components/v2/SiteHeader.tsx");
  const css = await source("public/portfolio-v3.css");
  assert.match(header, /data-active-section=\{activeSection === item\.key \? "true" : undefined\}/);
  assert.equal((header.match(/<NavigationLinks current=\{current\} activeSection=\{activeSection\} \/>/g) ?? []).length, 2);
  assert.match(css, /\.primary-nav a\[data-active-section="true"\]/);
  assert.match(css, /\.mobile-nav nav a\[data-active-section="true"\]/);
});

test("supporting routes remain reachable outside primary navigation", async () => {
  const [footer, method, proof] = await Promise.all([
    source("app/components/v2/SiteFooter.tsx"),
    source("app/method/page.tsx"),
    source("app/proof/page.tsx"),
  ]);

  assert.match(footer, /href: "\/method\/"/);
  assert.match(footer, /href: "\/credentials\/"/);
  assert.match(footer, /href: "\/models\/#agent-collaboration"/);
  assert.match(method, /href="\/decisions\/"/);
  assert.match(proof, /href="\/models\/#agent-collaboration"/);
  assert.match(footer, /<a href="\/proof\/">Evidence <Arrow \/><\/a>/);
  assert.doesNotMatch(footer, />Public work <Arrow \/><\/a>/);
});
