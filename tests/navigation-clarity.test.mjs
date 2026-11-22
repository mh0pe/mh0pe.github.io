import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("primary navigation surfaces writing and a direct LinkedIn conversation", async () => {
  const header = await source("app/components/v2/SiteHeader.tsx");
  const navigation = header.match(/const landingNavigation = \[([\s\S]*?)\] as const;/)?.[1];

  assert.ok(navigation, "primary navigation should have a static route list");
  assert.deepEqual(
    [...navigation.matchAll(/label: "([^"]+)"/g)].map((match) => match[1]),
    ["Work", "Writing", "Philosophy", "Experience", "LinkedIn"],
  );
  assert.deepEqual(
    [...navigation.matchAll(/href: "([^"]+)"/g)].map((match) => match[1]),
    ["/#work", "/blog/", "/#philosophy", "/#experience"],
  );
  assert.doesNotMatch(navigation, /How I help|Evidence|Approach|Credentials|Models|Public work/);
  assert.doesNotMatch(header, /aria-current=/, "landing anchors must not claim a deep route is current");
  assert.match(navigation, /href: publicSources\.linkedinMadison\.href/);
  assert.match(header, /target=\{item\.key === "connect" \? "_blank" : undefined\}/);
  assert.match(header, /opens in a new tab/);
  assert.match(header, /section === "blog" \? "writing"/);
  assert.match(header, /item\.key === "connect" \? "primary-nav__conversation" : undefined/);
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

test("the editorial masthead keeps reachable controls and attaches its reading-progress rule", async () => {
  const [css, markup, runtime] = await Promise.all([
    source("public/editorial-system.css"), source("app/components/v2/SiteHeader.tsx"), source("public/interactions.css"),
  ]);
  assert.match(css, /\.site-header__inner \{[^}]*display: grid;[^}]*box-shadow: none/);
  assert.match(css, /\.mobile-nav summary \{[^}]*min-height: 44px/);
  assert.match(css, /\.mobile-nav summary > span:first-child \{[^}]*position: static;[^}]*clip: auto/);
  assert.match(markup, /<details className="mobile-nav">[\s\S]*?<summary>[\s\S]*?<span>Menu<\/span>/);
  assert.match(runtime, /\.site-header::after \{[^}]*bottom: -1px/);
});

test("nested work has a visual section cue without claiming the parent page is current", async () => {
  const header = await source("app/components/v2/SiteHeader.tsx");
  const css = await source("public/portfolio-v3.css");
  assert.match(header, /const section = activeSection \?\? current;/);
  assert.match(header, /section === "method"\s*\? "philosophy"/);
  assert.match(header, /section === "about" \|\| section === "credentials"\s*\? "experience"/);
  assert.match(header, /data-active-section=\{activeKey === item\.key \? "true" : undefined\}/);
  assert.match(header, /activeKey === item\.key \? <span className="visually-hidden">, current section<\/span> : null/);
  assert.equal((header.match(/<NavigationLinks current=\{current\} activeSection=\{activeSection\} \/>/g) ?? []).length, 2);
  assert.match(css, /\.primary-nav a\[data-active-section="true"\]/);
  assert.match(css, /\.mobile-nav nav a\[data-active-section="true"\]/);
});

test("narrow project navigation fits all destinations and still view describes its scope", async () => {
  const [css, stage, runtime] = await Promise.all([
    source("public/journey-polish.css"),
    source("app/components/blog/StoryStage.tsx"),
    source("public/article-scroll.js"),
  ]);
  const narrow = css.slice(css.indexOf("@media (max-width: 23rem)"));
  assert.match(narrow, /\.case-jump \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(narrow, /\.case-jump a \{[^}]*min-width: 0;[^}]*white-space: normal/);
  assert.match(css, /\[data-route="credentials"\] \.route-jump \{ flex-wrap: wrap; overflow-x: visible; \}/);
  assert.match(stage, /data-story-quiet hidden>Still view for all illustrations<\/button>/);
  assert.match(runtime, /button\.textContent = "Still view for all illustrations"/);
});

test("supporting routes remain reachable outside primary navigation", async () => {
  const [footer, method, proof] = await Promise.all([
    source("app/components/v2/SiteFooter.tsx"),
    source("app/method/page.tsx"),
    source("app/proof/page.tsx"),
  ]);

  assert.match(footer, /href: "\/method\/"/);
  assert.match(footer, /href: "\/credentials\/"/);
  assert.match(footer, /href: "\/blog\/workspace-security\/"/);
  assert.match(footer, /href: "\/blog\/handoffs-that-carry-the-work\/"/);
  assert.doesNotMatch(footer, /code: "Next \//);
  assert.match(method, /href="\/decisions\/"/);
  assert.match(proof, /href="\/models\/#agent-collaboration"/);
  assert.match(footer, /import \{ landingNavigation \} from "\.\/SiteHeader"/);
  assert.match(footer, /<nav aria-label="Explore the portfolio">\s*\{landingNavigation\.map/);
  assert.match(footer, /<details className="site-footer__details">[\s\S]*<summary>Go deeper<\/summary>/);
  assert.match(footer, /<a href="\/#credentials">Credentials <Arrow \/><\/a>/);
  assert.match(footer, /<a href="\/proof\/">Source links <Arrow \/><\/a>/);
  assert.match(footer, /portfolioIdentity\.independenceNote/);
  assert.match(footer, /href=\{publicSources\.linkedinMadison\.href\}/);
  assert.doesNotMatch(footer, />Public work <Arrow \/><\/a>/);
});

test("home projects expose story and code after the contribution, outside disclosure", async () => {
  const home = await source("app/page.tsx");
  const project = home.slice(home.indexOf('<article className="landing-project"'), home.indexOf('id="frontier"'));
  const order = ["landing-project__copy", "landing-project__visual", "landing-project__follow-through", "landing-project__actions", "landing-project__depth"].map((part) => project.indexOf(part));
  assert.ok(order.every((position) => position >= 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  const visible = project.slice(0, project.indexOf('<details className="landing-details"'));
  assert.match(visible, /Read the project story/);
  assert.match(visible, /sourceId=\{project\.repositorySourceId\}>Open the code/);
  assert.match(home, /one shared definition across fifteen coding tools/);
  assert.match(home, /native Windows builds in Nix/);
});

test("writing previews reuse article art and mobile project order stays semantic", async () => {
  const [home, css, shared] = await Promise.all([source("app/page.tsx"), source("public/landing-story.css"), source("public/journey-polish.css")]);
  assert.match(home, /<ArtDrawing direction=\{artFor\(article.slug\)\}[^>]+compact/);
  assert.match(home, /className="landing-writing__art" aria-hidden="true"/);
  assert.match(home, /href="\/editorial-art.css/);
  assert.match(css, /grid-template-areas: "intro" "art" "contribution" "depth"/);
  assert.match(home, /"--employer-optical-scale": employer.optical_scale/);
  assert.match(css, /transform: scale\(var\(--employer-optical-scale, 1\)\)/);
  assert.match(shared, /site-identity small \{ font-size: \.72rem/);
  assert.doesNotMatch(shared, /animation:/);
});
