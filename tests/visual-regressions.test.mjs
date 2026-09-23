import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = new URL("../", import.meta.url);
const outputUrl = new URL("../pages-dist/", import.meta.url);
const outputPath = fileURLToPath(outputUrl);
const productionOrigin = "https://mh0pe.github.io";

function rgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function luminance(hex) {
  const channels = rgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(left, right) {
  const [bright, dark] = [luminance(left), luminance(right)].sort(
    (a, b) => b - a,
  );
  return (bright + 0.05) / (dark + 0.05);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function collectHtml(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectHtml(path)));
    else if (entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

function routeForArtifact(path) {
  const artifact = relative(outputPath, path).split(sep).join("/");
  if (artifact === "index.html") return "/";
  if (artifact === "404.html") return "/404.html";
  return `/${artifact.replace(/index\.html$/, "")}`;
}

function artifactForPathname(pathname) {
  if (pathname === "/") return resolve(outputPath, "index.html");
  if (pathname.endsWith("/")) {
    return resolve(outputPath, pathname.slice(1), "index.html");
  }
  return resolve(outputPath, pathname.slice(1));
}

test("light-route semantic colors meet WCAG AA", async () => {
  const css = await readFile(new URL("public/portfolio-v3.css", root), "utf8");
  const surfaces = ["#f3efe6", "#e9e3d8"];
  const textColors = ["#59615d", "#596825", "#3f56a0", "#985037"];

  for (const foreground of textColors) {
    for (const background of surfaces) {
      assert.ok(
        contrast(foreground, background) >= 4.5,
        `${foreground} should remain legible on ${background}`,
      );
    }
  }

  for (const selector of [
    ".hope-brand .decision-pages__index span",
    ".hope-brand .decision-pages__index small",
    ".hope-brand .decision-pages dt",
    ".hope-brand .decision-pages dd",
    ".hope-brand .not-found__intro > p:not(.section-code)",
    ".not-found__profiles a",
    ".hope-brand .hope-line :is(.section-code, .micro-label)",
  ]) {
    assert.ok(css.includes(selector), `${selector} needs an explicit V3 rule`);
  }
});

test("ARIA stays on semantic elements and forced colors remove decorative motifs", async () => {
  const caseStudy = await readFile(
    new URL("app/components/v2/CaseStudyPage.tsx", root),
    "utf8",
  );
  const explorer = await readFile(
    new URL("app/components/AttributionExplorer.tsx", root),
    "utf8",
  );
  const header = await readFile(
    new URL("app/components/v2/SiteHeader.tsx", root),
    "utf8",
  );
  const css = await readFile(new URL("public/portfolio-v3.css", root), "utf8");

  assert.doesNotMatch(caseStudy, /className="case-hero__signal"\s+aria-label=/);
  assert.doesNotMatch(explorer, /className="attribution-chart"[\s\S]{0,100}aria-labelledby=/);
  assert.match(header, /aria-current=\{current === item\.key \? "location"/);
  assert.match(
    css,
    /@media \(forced-colors: active\)\s*\{[\s\S]*?\.route-motif\s*\{[\s\S]*?display:\s*none !important/,
  );
});

test("headings wrap by words and essential content is static first", async () => {
  const css = await readFile(new URL("public/portfolio-v3.css", root), "utf8");
  const headingRule = css.match(
    /\.hope-brand h1,[\s\S]*?\.hope-brand h3\s*\{([\s\S]*?)\}/,
  )?.[1];
  assert.ok(headingRule);
  assert.match(headingRule, /hyphens:\s*none/);
  assert.match(headingRule, /overflow-wrap:\s*normal/);
  assert.match(headingRule, /word-break:\s*normal/);
  assert.match(headingRule, /text-wrap:\s*balance/);

  const refinement = css.slice(css.indexOf("End-to-end refinement"));
  assert.match(
    refinement,
    /\.hope-brand \.hope-hero__copy > \*\s*\{[\s\S]*?animation:\s*none !important[\s\S]*?opacity:\s*1/,
  );
  assert.match(refinement, /\.hope-line__spine-tracer\s*\{/);
  assert.match(refinement, /\.route-motif__draw\s*\{/);
  assert.match(
    css,
    /::view-transition-old\(site-header\),[\s\S]*?::view-transition-new\(site-header\)[\s\S]*?animation:\s*none !important/,
  );
});

test("Hope Line tablet stories use one consistent reading order", async () => {
  const css = await readFile(new URL("public/portfolio-v3.css", root), "utf8");
  const lastCardRule = css.indexOf(
    "@media (max-width: 70rem) and (min-width: 48.001rem)",
  );
  const tabletRule = css.indexOf(
    "@media (min-width: 48.001rem) and (max-width: 76rem)",
  );

  assert.ok(lastCardRule >= 0, "the compact last-card rule should exist");
  assert.ok(
    tabletRule > lastCardRule,
    "the bounded tablet correction must follow the competing last-card rule",
  );

  const tabletCss = css.slice(
    tabletRule,
    css.indexOf("@media", tabletRule + 1),
  );
  assert.match(
    tabletCss,
    /\.hope-work__stories > \.hope-story:nth-child\(even\),[\s\S]*?\.hope-work__stories > \.hope-story:last-child\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\);[\s\S]*?grid-template-rows:\s*auto;/,
  );
  assert.match(
    tabletCss,
    /\.hope-work__stories > \.hope-story:nth-child\(even\) \.hope-story__copy,[\s\S]*?\.hope-work__stories > \.hope-story:nth-child\(even\) \.lineage-field\s*\{[\s\S]*?order:\s*initial;/,
  );
});

test("narrow editorial columns cap display type on wide screens", async () => {
  const css = await readFile(new URL("public/portfolio-v3.css", root), "utf8");
  assert.match(css, /\.hope-brand \.hope-patterns__intro h2\s*\{[^}]*font-size: clamp\(3\.4rem, 6vw, 5rem\)/);
  assert.match(css, /\.hope-brand \.hope-composition h2\s*\{[^}]*font-size: clamp\(3\.2rem, 6vw, 6rem\)/);
});

test("tall employer marks can shrink within their grid tile", async () => {
  const css = await readFile(new URL("public/portfolio-v3.css", root), "utf8");
  assert.match(css, /\.career-ledger__mark img\s*\{[^}]*min-height: 0;[^}]*object-fit: contain;/);
});

test("compact lineage fields expose their HTML fallback on mobile", async () => {
  const css = await readFile(new URL("public/portfolio-v3.css", root), "utf8");
  const mobileRule = css.lastIndexOf("@media (max-width: 48rem)");

  assert.ok(mobileRule >= 0, "the mobile refinement block should exist");
  const mobileCss = css.slice(mobileRule, css.indexOf("@media", mobileRule + 1));
  assert.match(
    mobileCss,
    /\.lineage-field--compact \.lineage-field__fallback\s*\{[\s\S]*?display:\s*block;/,
  );
});

test("fixed dark chambers keep readable foregrounds and mobile-safe lineage links", async () => {
  const [brandCss, credentialCss, interactionCss] = await Promise.all([
    readFile(new URL("public/portfolio-v3.css", root), "utf8"),
    readFile(new URL("public/credentials.css", root), "utf8"),
    readFile(new URL("public/interactions.css", root), "utf8"),
  ]);

  assert.match(
    credentialCss,
    /\.hope-brand \.credential-overview\s*\{[\s\S]*?background:\s*#0b100e;[\s\S]*?color:\s*#f3efe6;[\s\S]*?color-scheme:\s*dark;/,
  );
  assert.match(
    brandCss,
    /\.lineage-field\s*\{[\s\S]*?background:[\s\S]*?#091314;[\s\S]*?color-scheme:\s*dark;/,
  );
  assert.match(
    brandCss,
    /\.lineage-field__source:focus-visible \.lineage-field__hit-area\s*\{[\s\S]*?stroke:\s*#f3efe6 !important;[\s\S]*?stroke-width:\s*4 !important;/,
  );
  assert.match(
    brandCss,
    /@media \(max-width: 48rem\)[\s\S]*?\.lineage-field__source\s*\{[\s\S]*?display:\s*none;/,
  );
  assert.match(
    brandCss,
    /\.lineage-field__source-static\s*\{[^}]*display:\s*inline;[^}]*pointer-events:\s*none;/,
  );
  assert.match(
    interactionCss,
    /\.motion-film\s*\{[\s\S]*?background:\s*#0b100e;[\s\S]*?color:\s*#f3efe6;[\s\S]*?color-scheme:\s*dark;/,
  );
  assert.match(
    brandCss,
    /\.hope-brand \.hope-work \.hope-act__summary\s*\{[\s\S]*?color:\s*rgb\(243 239 230 \/ 78%\);/,
  );
});

test("paper-surface status colors remain AA-readable in both themes", async () => {
  const css = await readFile(new URL("public/portfolio-v3.css", root), "utf8");
  const lightPairs = [
    ["#59615d", "#e9e3d8"],
    ["#4b6100", "#e9e3d8"],
    ["#355d64", "#e9e3d8"],
    ["#985037", "#e9e3d8"],
  ];
  const darkPairs = [
    ["#aeb8b2", "#18201c"],
    ["#c5dc79", "#18201c"],
    ["#a9b6ff", "#18201c"],
    ["#f0a084", "#18201c"],
  ];

  for (const [foreground, background] of [...lightPairs, ...darkPairs]) {
    assert.ok(
      contrast(foreground, background) >= 4.5,
      `${foreground} should remain legible on ${background}`,
    );
    assert.ok(css.includes(foreground), `${foreground} should be present in the status rules`);
  }

  assert.match(css, /\.route-section--paper \.status-stamp\[data-state="released"\]/);
  assert.match(css, /data-theme="dark"[\s\S]*?\.route-section--paper \.status-stamp\[data-state="merged"\]/);
});

test("supporting routes render distinct, inert visual motifs", async () => {
  const routes = [
    ["work/index.html", "work"],
    ["capabilities/index.html", "capabilities"],
    ["method/index.html", "method"],
    ["decisions/index.html", "decisions"],
    ["about/index.html", "about"],
    ["credentials/index.html", "credentials"],
    ["proof/index.html", "proof"],
    ["models/index.html", "models"],
    ["work/automated-security-helper/index.html", "case-study"],
  ];

  for (const [artifact, motif] of routes) {
    const html = await readFile(new URL(artifact, outputUrl), "utf8");
    assert.match(html, new RegExp(`data-route="${motif}"`));
    assert.match(
      html,
      new RegExp(
        `class="route-motif route-motif--${motif}" data-route-motif="${motif}" aria-hidden="true"`,
      ),
    );
  }

  const source = await readFile(
    new URL("app/components/v3/RouteMotif.tsx", root),
    "utf8",
  );
  assert.doesNotMatch(source, /<script|<foreignObject|<image|tabIndex|href=/i);
});

test("static navigation and route metadata remain GitHub Pages native", async () => {
  const header = await readFile(
    new URL("app/components/v2/SiteHeader.tsx", root),
    "utf8",
  );
  const metadata = await readFile(
    new URL("app/data/route-metadata.ts", root),
    "utf8",
  );

  assert.doesNotMatch(header, /from ["']next\/link["']/);
  assert.match(header, /<a className="site-identity" href="\/"/);
  assert.match(metadata, /summary_large_image/);
  assert.match(metadata, /https:\/\/mh0pe\.github\.io\/og-v3\.jpg/);

  for (const artifact of [
    "work/index.html",
    "capabilities/index.html",
    "models/index.html",
    "credentials/index.html",
    "work/automated-security-helper/index.html",
  ]) {
    const html = await readFile(new URL(artifact, outputUrl), "utf8");
    assert.doesNotMatch(html, /index\.rsc/);
    assert.match(
      html,
      /<meta property="og:image" content="https:\/\/mh0pe\.github\.io\/og-v3\.jpg"/,
    );
    assert.match(html, /<meta name="twitter:card" content="summary_large_image"/);
  }
});

test("light and dark themes are static, persistent, and accessible", async () => {
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  const header = await readFile(
    new URL("app/components/v2/SiteHeader.tsx", root),
    "utf8",
  );
  const themeScript = await readFile(new URL("public/theme.js", root), "utf8");
  const css = await readFile(new URL("public/portfolio-v3.css", root), "utf8");

  assert.match(layout, /prefers-color-scheme: dark/);
  assert.match(layout, /mhs-color-theme/);
  assert.match(layout, /data-static-runtime="theme"/);
  assert.match(layout, /src="\/theme\.js\?v=/);
  assert.match(layout, /data-static-runtime="interactions"/);
  assert.match(header, /data-theme-toggle/);
  assert.match(header, /aria-label="Toggle color theme"/);
  assert.match(header, /suppressHydrationWarning/);
  assert.doesNotMatch(header, /aria-pressed/);
  assert.match(themeScript, /localStorage\.setItem\(storageKey, nextTheme\)/);
  assert.match(themeScript, /Switch to \$\{action\} mode/);
  assert.match(themeScript, /systemPreference\.addEventListener\("change"/);
  assert.doesNotMatch(themeScript, /observe\(document\.body/);
  assert.match(css, /html\[data-theme="dark"\]/);
  assert.match(css, /\.theme-ready \.hope-brand \.theme-toggle/);
});

test("every exported same-origin fragment resolves to a real target", async () => {
  for (const sourcePath of await collectHtml(outputPath)) {
    const sourceHtml = await readFile(sourcePath, "utf8");
    const base = new URL(routeForArtifact(sourcePath), productionOrigin);
    for (const match of sourceHtml.matchAll(/\bhref="([^"]+)"/gi)) {
      const href = match[1].replaceAll("&amp;", "&");
      const target = new URL(href, base);
      if (target.origin !== productionOrigin || !target.hash) continue;

      const targetPath = artifactForPathname(target.pathname);
      await access(targetPath);
      const targetHtml = await readFile(targetPath, "utf8");
      const fragment = decodeURIComponent(target.hash.slice(1));
      assert.match(
        targetHtml,
        new RegExp(`\\bid=["']${escapeRegExp(fragment)}["']`, "i"),
        `${routeForArtifact(sourcePath)} points to missing ${target.pathname}${target.hash}`,
      );
    }
  }
});

test("employer logo normalization is bounded and data driven", async () => {
  const history = JSON.parse(
    await readFile(new URL("app/data/professional-history.json", root), "utf8"),
  );
  const keys = new Set();
  for (const employer of history.employers) {
    assert.match(employer.logo_key, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(!keys.has(employer.logo_key));
    keys.add(employer.logo_key);
    assert.ok(
      Number.isFinite(employer.optical_scale) &&
        employer.optical_scale >= 0.5 &&
        employer.optical_scale <= 1.4,
    );
  }

  const css = await readFile(new URL("public/portfolio-v3.css", root), "utf8");
  assert.match(css, /\.career-ledger__mark\s*\{[\s\S]*?overflow:\s*hidden/);
  assert.match(
    css,
    /\.career-ledger__image,[\s\S]*?transform:\s*scale\(var\(--logo-scale, 1\)\)/,
  );
});
