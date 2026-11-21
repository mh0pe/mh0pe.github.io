import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { tsImport } from "tsx/esm/api";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import postcss from "postcss";

const root = new URL("../", import.meta.url);
const load = file => tsImport(new URL(file, root).href, import.meta.url);
const read = file => readFile(new URL(file, root), "utf8");
const { motionStories, motionStorySlugs, validatedReverseFloor } = await load("app/data/article-motion.ts");
const { blogArticles } = await load("app/data/blog.ts");
const { chapterAt } = await load("app/components/blog/motion/story-timing.ts");
const { default: ArticlePage } = await load("app/components/blog/ArticlePage.tsx");
const { StoryScene } = await load("app/components/blog/motion/StoryScene.tsx");
const { ArtDrawing } = await load("app/components/blog/EditorialArt.tsx");
const { artFor } = await load("app/data/article-art.ts");
const escaped = text => text.replaceAll("&", "&amp;").replaceAll("'", "&#x27;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const scene = (story, frame) => renderToStaticMarkup(React.createElement(StoryScene, { story, frame, id: "fixture", accessible: true }));
const artifactTag = (html, artifact) => {
  const tag = html.match(new RegExp('<(?:g|rect)\\b[^>]*data-artifact="' + artifact + '"[^>]*>'))?.[0];
  assert.ok(tag, artifact + " has a rendered artifact");
  return Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
};
const artifactRect = (html, artifact) => {
  const group = html.match(new RegExp('<g\\b[^>]*data-artifact="' + artifact + '"[^>]*>'))?.[0];
  assert.ok(group);
  const rect = html.slice(html.indexOf(group) + group.length).match(/^<rect\b[^>]*>/)?.[0];
  assert.ok(rect, artifact + " starts with its card boundary");
  return Object.fromEntries([...rect.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
};
const translation = tag => tag.transform.match(/^translate\(([-\d.]+) ([-\d.]+)\)/).slice(1).map(Number);

const outcomesParagraph = "It also keeps different outcomes distinct. A scan with no findings, an incomplete scan, a cancelled run, and an unavailable report are not interchangeable editor states. The implementation preserves that distinction while letting a person cancel work and return to it later.";
function assertSecurityOutcomePlacement(html) {
  const sections = new Map([...html.matchAll(/<section class="article-section" id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)].map(match => [match[1], match[2]]));
  assert.deepEqual([...sections.keys()], ["installation", "editor", "outcomes", "trust"], "Keep legacy anchors and insert outcomes before permission.");
  const outcomes = sections.get("outcomes");
  assert.ok(outcomes.includes('<p>' + escaped(outcomesParagraph) + '</p><figure class="article-story article-story--ending"'), "The ending must immediately follow the actual outcomes explanation, not an inferred metadata paragraph.");
  assert.equal(html.split('<p>' + escaped(outcomesParagraph) + '</p>').length - 1, 1, "Move the existing paragraph without duplicating it.");
  assert.doesNotMatch(sections.get("editor"), /data-story-stage="ending"/);
  assert.doesNotMatch(sections.get("trust"), /data-story-stage=/, "Permission prose does not carry the unrelated outcomes graphic.");
  assert.match(sections.get("trust"), /The editor does not run a scan in an untrusted workspace\./);
  assert.match(html, /data-story-focus="editor" data-story-resolve="outcomes"/, "Focus and resolution keep distinct meaningful anchors.");
  for (const id of ["editor", "outcomes", "trust"]) {
    assert.ok(html.includes('href="#' + id + '"'), "Contents retain a working link to " + id);
    assert.equal((html.match(new RegExp(' id="' + id + '"', 'g')) ?? []).length, 1);
  }
  assert.match(outcomes, /data-story-anchor="outcomes"/);
  assert.match(outcomes, /Complete, no findings, incomplete, cancelled and unavailable are alternatives, not steps toward success\./);
  assert.match(outcomes, /href="https:\/\/github\.com\/awslabs\/automated-security-helper\/blob\/bd1ce7de6f797548a603ca43d3bf6ab497d3fcee\/editors\/vscode\/README\.md"/);
}

test("security outcomes sit beside their exact explanation while legacy anchors remain", () => {
  const article = blogArticles.find(article => article.slug === "security-feedback-where-you-work");
  assertSecurityOutcomePlacement(renderToStaticMarkup(React.createElement(ArticlePage, { article })));
});

test("the generated security document preserves the outcomes reading order", async () => {
  assertSecurityOutcomePlacement(await read("pages-dist/blog/security-feedback-where-you-work/index.html"));
});

test("security editorial relocation preserves accepted prose, sources and all motion values", () => {
  const article = blogArticles.find(article => article.slug === "security-feedback-where-you-work");
  const fingerprint = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  // Frozen from accepted HaxojP, not regenerated from the successor under test.
  assert.equal(fingerprint({ ...article, sections: article.sections.flatMap(section => section.paragraphs) }), "8b2accb3c18395cd5829268570cb9c43467c9ec4992b025e2052844e405652ae", "All six paragraphs stay verbatim and in order, with all other article facts and sources unchanged.");
  assert.equal(fingerprint(article.sections.find(section => section.id === "installation")), "b25b160934eb451cdfb92f5cb1a48e6b71720f04d408bd8afaf5266ff5c022ad");
  assert.equal(fingerprint(article.sections.find(section => section.id === "trust")), "242c75ff6195ae4ad6f843729016f949554dc41fbd9a807c8ac8463d50c0d843");
  const story = motionStories[article.slug];
  assert.equal(story.chapters.at(-1).section, "outcomes");
  assert.equal(fingerprint({ ...story, chapters: story.chapters.map(chapter => chapter.moment === "ending" ? { ...chapter, section: "trust" } : chapter) }), "1564322f99129477340158fa5889a04767468a55b39ecd9b0b8d64fbdc185152", "Only the ending prose anchor changes; timing, palette, caption and source IDs are preserved.");
});

test("reverse floors are explicit validated same-chapter metadata, never inferred from an absent or malformed value", () => {
  const base = motionStories["workspace-security"].chapters[1];
  for (const reverseFloor of [undefined, null, "300", NaN, Infinity, 299, 300.5, 430, 600]) {
    assert.equal(validatedReverseFloor({ ...base, reverseFloor }), undefined);
  }
  assert.equal(validatedReverseFloor({ ...base, start: 0, reverseFloor: 0 }), 0);
  for (const overrides of [{ start: -1 }, { start: 300.5 }, { frame: 300 }, { end: 901 }, { end: 430 }]) {
    assert.equal(validatedReverseFloor({ ...base, ...overrides }), undefined);
  }
});

test("new reverse prefixes retain their current semantic artifacts at every admitted frame", () => {
  for (let frame = 360; frame <= 430; frame++) {
    const prism = scene("one-definition-many-agent-tools", frame);
    assert.equal(artifactTag(prism, "integration-edition").opacity, "0");
    assert.equal((prism.match(/data-artifact="native-wrapper" opacity="1"/g) ?? []).length, 3);
    const feedback = scene("security-feedback-where-you-work", frame);
    assert.equal(artifactTag(feedback, "installed-package-boundary").opacity, "0");
    assert.equal(artifactTag(feedback, "editor-reveal").width, "1280");
    assert.equal(artifactTag(feedback, "editor-finding").opacity, "1");
    assert.equal(artifactTag(feedback, "alternative-scan-outcomes").opacity, "0");
    assert.equal(artifactTag(scene("typed-svg-dom", frame), "live-attribute-link").opacity, "1");
  }
  for (let frame = 650; frame <= 820; frame++) {
    const feedback = scene("security-feedback-where-you-work", frame);
    assert.equal(artifactTag(feedback, "editor-finding").opacity, "0");
    assert.equal(artifactTag(feedback, "installed-package-boundary").opacity, "0");
    assert.ok(Number(artifactTag(feedback, "alternative-scan-outcomes").opacity) > .86);
    for (const text of ["Complete", "No findings", "Incomplete", "Cancelled", "Unavailable", "Alternatives, not steps"]) assert.ok(feedback.includes(text));
    assert.ok(Number(artifactTag(scene("typed-svg-dom", frame), "illustrated-letter-bounds").opacity) > .86);
  }
  for (let frame = 750; frame <= 820; frame++) {
    const workspace = scene("workspace-security", frame);
    const [rx, ry] = translation(artifactTag(workspace, "report-address-0"));
    const [fx, fy] = translation(artifactTag(workspace, "application-finding"));
    assert.ok(fx >= rx + 10 && fx + 285 <= rx + 300);
    assert.ok(fy >= ry + 10 && fy + 54 <= ry + 64);
    assert.ok(ry + 74 < 750);
  }
});

test("every story beat has an exact paragraph, real source and ordered nonoverlapping frame range", () => {
  for (const article of blogArticles) {
    const chapters = motionStories[article.slug].chapters;
    assert.deepEqual(chapters.map(beat => beat.moment), ["cloud-runtime", "aws-labs-mcp", "zero-findings"].includes(article.slug)
      ? ["opening", "middle", "later", "ending"] : ["opening", "middle", "ending"]);
    assert.equal(new Set(chapters.map(beat => beat.moment)).size, chapters.length);
    for (const [index, beat] of chapters.entries()) {
      const section = article.sections.find(section => section.id === beat.section);
      assert.ok(section, article.slug + " " + beat.moment + " has a prose anchor");
      assert.ok(section.paragraphs.length >= chapters.filter(other => other.section === beat.section).length,
        article.slug + " has a paragraph for each beat at " + beat.section);
      assert.ok(beat.sourceIds.length > 0);
      assert.ok(beat.sourceIds.every(id => article.sources.some(source => source.id === id)), article.slug + " sources exist");
      assert.ok(beat.start <= beat.frame && beat.frame < beat.end);
      assert.equal(validatedReverseFloor(beat), beat.reverseFloor);
      assert.ok(Number.isInteger(beat.reverseFloor) && beat.start <= beat.reverseFloor && beat.reverseFloor < beat.frame);
      assert.equal(chapterAt(beat.reverseFloor, article.slug), index);
      assert.ok(beat.end <= 900);
      assert.equal(chapterAt(beat.frame, article.slug), index);
      assert.equal(chapterAt(beat.end, article.slug), index);
      if (index > 0) assert.ok(chapters[index - 1].end < beat.start);
    }
  }
});

test("server-rendered articles place each visual immediately after its explaining paragraph with its matching source", () => {
  for (const article of blogArticles) {
    const chapters = motionStories[article.slug].chapters;
    const html = renderToStaticMarkup(React.createElement(ArticlePage, { article }));
    assert.equal((html.match(/data-story-stage=/g) ?? []).length, chapters.length);
    assert.equal((html.match(/data-story-description=/g) ?? []).length, chapters.length);
    assert.equal((html.match(/data-mobile-story-chapter=/g) ?? []).length, chapters.length);
    assert.equal((html.match(/data-story-source-chapter=/g) ?? []).length, chapters.length);
    assert.equal((html.match(/class="article-story__drawing"/g) ?? []).length, chapters.length + 1, "one compact cover plus inline figures");
    assert.match(html, /data-story-layout="inline"/);
    assert.doesNotMatch(html, /data-story-stage="rail"|class="article-visual-rail"/);
    for (const section of article.sections) {
      const sectionHTML = html.split('<section class="article-section" id="' + section.id + '"')[1]?.split("</section>")[0];
      assert.ok(sectionHTML, article.slug + " keeps " + section.id);
      const beats = chapters.filter(beat => beat.section === section.id);
      for (const [index, beat] of beats.entries()) {
        assert.ok(sectionHTML.includes('<p>' + escaped(section.paragraphs[index]) + '</p><figure class="article-story article-story--' + beat.moment + '"'),
          article.slug + " " + beat.moment + " follows its paragraph without an unrelated rail");
        assert.ok(sectionHTML.includes('data-story-frame="' + beat.frame + '"'));
        assert.ok(sectionHTML.includes('data-story-start-frame="' + beat.start + '"'));
        assert.ok(sectionHTML.includes('data-story-reverse-floor="' + beat.reverseFloor + '"'));
        assert.ok(sectionHTML.includes(escaped(beat.caption)));
        for (const id of beat.sourceIds) assert.ok(sectionHTML.includes('href="' + escaped(article.sources.find(source => source.id === id).href) + '"'));
      }
    }
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size, article.slug + " has no duplicate figure IDs");
    assert.doesNotMatch(html, /ownership atlas|publishing prism|working margin|continuity fold|precision interlock|capability rooms|executable proof/i);
  }
});

test("four-part capability scenes keep four windows, one active accent and browser-scoped infrastructure", () => {
  for (const story of ["cloud-runtime", "aws-labs-mcp"]) {
    for (const [index, beat] of motionStories[story].chapters.entries()) {
      const html = scene(story, beat.frame);
      assert.equal((html.match(/data-capability-window=/g) ?? []).length, 4);
      assert.equal((html.match(/data-mobile-label="true"/g) ?? []).length, 4, "only the four primary window titles remain in the mobile artwork");
      assert.equal((html.match(/data-capability-active="true"/g) ?? []).length, 1);
      assert.match(html, new RegExp('data-capability-chapter="' + index + '"'));
      assert.ok(html.includes(escaped(beat.description)));
    }
  }
  const mcp = scene("aws-labs-mcp", 900);
  assert.match(mcp, /Session closed/);
  assert.match(mcp, /Browser infrastructure · operator-managed/);
  const cloud = scene("cloud-runtime", 70);
  for (const word of ["Preview", "Iterate", "Learn", "Execute", "collection: ?", "Hotswap is a development workflow."]) assert.ok(cloud.includes(word));
  assert.doesNotMatch(cloud, /Deployed|Deployment complete|All checks passed/);
});

test("persistent artifacts and limits remain visible in the specific article worlds", () => {
  for (const frame of [70, 430, 820]) {
    const workspace = scene("workspace-security", frame);
    assert.match(workspace, /data-artifact="application-finding"/);
    assert.match(workspace, /Application · src\/api.py/);
    const tools = scene("reproducible-security-checks", frame);
    assert.match(tools, /data-artifact="fixed-tool-environment" transform="translate\(640 445\)"/);
    assert.equal((tools.match(/data-artifact="independent-input-/g) ?? []).length, 3);
    assert.match(scene("handoffs-that-carry-the-work", frame), /data-artifact="decision-and-reason" opacity="1"|data-artifact="decision-and-reason" opacity="0\.[7-9]/);
    const integrity = scene("integrity-bound-yarn-pnp-for-bazel", frame);
    assert.equal((integrity.match(/data-artifact="file-check-/g) ?? []).length, 5);
    assert.match(integrity, /data-artifact="verified-file-specimen"/);
  }
  const feedback = scene("security-feedback-where-you-work", 900);
  assert.equal(artifactTag(feedback, "editor-finding").opacity, "0");
  assert.match(feedback, /Alternatives, not steps toward a clean result/);
  for (const word of ["Complete", "No findings", "Incomplete", "Cancelled", "Unavailable"]) assert.ok(feedback.includes(word));
  const svg = scene("typed-svg-dom", 820);
  assert.match(svg, /data-artifact="illustrated-letter-bounds"/);
  assert.match(svg, /Fallback text metrics/);
});

test("all reverse prefixes change actual geometry and keep fixed foundations stationary", () => {
  const stripFrame = html => html.replace(/ data-story-scene-frame="[^"]+"/g, "");
  const outerWorld = html => html.match(/<path\b[^>]*d="M75 750h1130M75 50h1130"[^>]*><\/path><g\b[^>]*>/)[0].match(/<g\b[^>]*>$/)[0];
  for (const story of motionStorySlugs) for (const beat of motionStories[story].chapters) {
    assert.notEqual(stripFrame(scene(story, beat.reverseFloor)), stripFrame(scene(story, beat.frame)), story + "/" + beat.moment + " is not just a changing frame diagnostic");
  }
  for (let frame = 0; frame <= 70; frame++) {
    const html = scene("reproducible-security-checks", frame);
    assert.equal(outerWorld(html), '<g transform="translate(0 0)">');
    assert.match(html, /<g data-artifact="fixed-tool-environment" transform="translate\(640 445\)">/);
  }
  for (const story of ["cloud-runtime", "aws-labs-mcp"]) {
    const names = story === "cloud-runtime" ? ["preview", "iterate", "learn", "execute"] : ["documents", "images", "connection", "session"];
    const positions = story === "cloud-runtime" ? ["90 142", "660 142", "90 436", "660 436"] : ["90 132", "660 132", "90 423", "660 423"];
    for (const [index, beat] of motionStories[story].chapters.entries()) {
      const foundation = scene(story, beat.frame).match(/<g data-capability-foundation="persistent">[\s\S]*?<\/g>/)?.[0];
      for (let frame = beat.reverseFloor; frame <= beat.frame; frame++) {
        const html = scene(story, frame);
        assert.equal(outerWorld(html), '<g transform="translate(0 0)">');
        const windows = [...html.matchAll(/<g\b[^>]*data-capability-window="[^"]+"[^>]*>/g)].map(match => match[0]);
        assert.equal(windows.length, 4);
        windows.forEach((tag, i) => {
          assert.ok(tag.includes('data-capability-window="' + names[i] + '"'));
          assert.ok(tag.includes('transform="translate(' + positions[i] + ')"'));
          assert.ok(tag.includes('data-capability-active="' + String(i === index) + '"'));
        });
        assert.equal((html.match(/data-mobile-label="true"/g) ?? []).length, 4);
        if (story === "aws-labs-mcp") assert.equal(html.match(/<g data-capability-foundation="persistent">[\s\S]*?<\/g>/)?.[0], foundation);
      }
    }
  }
});

test("shared-definition stills clear the title and hand off to opaque wrappers without overlapping editions", () => {
  for (const frame of [70, 160, 250]) {
    const html = scene("one-definition-many-agent-tools", frame);
    const tags = [...html.matchAll(/<g\b[^>]*data-artifact="integration-edition"[^>]*>/g)].map(match => match[0]);
    assert.equal(tags.length, 15);
    for (const tag of tags) {
      const y = Number(tag.match(/translate\([-\d.]+ ([-\d.]+)\)/)[1]);
      const scale = Number(tag.match(/scale\(([-\d.]+)\)/)[1]);
      assert.ok(y - 60 * scale >= 112, "each edition clears the title band, including its rotated bounds");
      assert.ok(y + 60 * scale <= 720, "each edition clears the bottom caption band");
    }
  }
  for (let frame = 300; frame <= 420; frame += 10) {
    const html = scene("one-definition-many-agent-tools", frame);
    const editions = Number(artifactTag(html, "integration-edition").opacity);
    const wrappers = Number(artifactTag(html, "native-wrapper").opacity);
    assert.ok(editions === 0 || wrappers === 0, "outgoing editions and incoming wrappers never share a visible phase");
  }
  for (const frame of [430, 600]) {
    const html = scene("one-definition-many-agent-tools", frame);
    assert.equal(artifactTag(html, "integration-edition").opacity, "0");
    assert.equal((html.match(/data-artifact="native-wrapper" opacity="1"/g) ?? []).length, 3);
    assert.ok(html.includes("Different packaging. The guidance stays the same."));
    const [, wrapperY] = translation(artifactTag(html, "native-wrapper"));
    assert.ok(wrapperY - 104 > 260, "wrappers are below the shared-definition diamond band");
  }
});

test("workspace scope encloses its service address and authored ending docks the finding inside report padding", () => {
  const middle = scene("workspace-security", 430);
  const scope = artifactTag(middle, "workspace-scope");
  const [, serviceY] = translation(artifactTag(middle, "workspace-project-1"));
  assert.ok(Number(scope.y) + Number(scope.height) >= serviceY + 338 + 20,
    "boundary includes the full service/path label and breathing room");
  for (const frame of [820, 900]) {
    const html = scene("workspace-security", frame);
    const [reportX, reportY] = translation(artifactTag(html, "report-address-0"));
    const [findingX, findingY] = translation(artifactTag(html, "application-finding"));
    const report = artifactRect(html, "report-address-0");
    const finding = artifactRect(html, "application-finding");
    assert.ok(findingX >= reportX + 10);
    assert.ok(findingY >= reportY + 10);
    assert.ok(findingX + Number(finding.width) <= reportX + Number(report.width) - 10);
    assert.ok(findingY + Number(finding.height) <= reportY + Number(report.height) - 10);
    assert.ok(reportY + Number(report.height) < 750, "report remains above the scene's lower rule");
    assert.match(html, /Finding 01 · ownership retained/);
  }
});

test("feedback handoff continuously reveals opaque nonoverlapping artwork, including the former blank midpoint", () => {
  const checkpoints = [300, 320, 330, 340, 360, 420];
  for (let frame = 300; frame <= 420; frame++) {
    const html = scene("security-feedback-where-you-work", frame);
    const installed = artifactTag(html, "installed-package-boundary");
    const editor = artifactTag(html, "editor-finding");
    const remainder = artifactTag(html, "package-remainder");
    const reveal = artifactTag(html, "editor-reveal");
    const seam = Number(remainder.x);
    assert.equal(Number(reveal.x), 0);
    assert.equal(Number(reveal.width), seam, "the editor stops exactly where the installed package begins");
    assert.equal(seam + Number(remainder.width), 1280, "complementary clips cover the full visual, with no gap or overlapping label pixels");
    assert.equal(editor.opacity, "1", "revealed editor content is opaque, never ghosted");
    assert.equal(installed.opacity, frame >= 360 ? "0" : "1", "remaining package content is opaque until fully replaced");
    assert.equal(installed["clip-path"], "url(#fixture-package-remainder)");
    assert.equal(editor["clip-path"], "url(#fixture-editor-reveal)");
    assert.equal(remainder.height, "800");
    assert.equal(reveal.height, "800");
    // These are the actual three filled card extents in the world, not the
    // background: installed package, external boundary and editor canvas.
    const installedX = 147;
    const installedWidth = Math.max(0, installedX + 600 - Math.max(installedX, seam));
    const externalWidth = Math.max(0, 1140 - Math.max(855, seam));
    const editorWidth = Math.max(0, Math.min(880, seam) - 100);
    assert.ok(Math.max(installedWidth, externalWidth, editorWidth) >= 285,
      "at least one substantial composed artifact remains visible at frame " + frame);
    if (checkpoints.includes(frame)) {
      assert.match(html, /<g transform="translate\(147 210\)">/);
      assert.match(html, /<rect x="855" y="280" width="285" height="170"/);
      assert.match(html, /<g transform="translate\(100 145\)">/);
    }
  }
  const midpoint = scene("security-feedback-where-you-work", 330);
  assert.equal(artifactTag(midpoint, "package-remainder").x, "640");
  assert.equal(artifactTag(midpoint, "editor-reveal").width, "640");
  assert.notEqual(scene("security-feedback-where-you-work", 320), midpoint);
  assert.notEqual(scene("security-feedback-where-you-work", 340), midpoint);
});

test("feedback stills show a clean editor middle and separate ending outcomes, not ghosted package or finding labels", () => {
  for (const frame of [430, 600]) {
    const html = scene("security-feedback-where-you-work", frame);
    assert.equal(artifactTag(html, "installed-package-boundary").opacity, "0");
    assert.equal(artifactTag(html, "editor-finding").opacity, "1");
    assert.equal(artifactTag(html, "alternative-scan-outcomes").opacity, "0");
  }
  for (const frame of [820, 900]) {
    const html = scene("security-feedback-where-you-work", frame);
    assert.equal(artifactTag(html, "editor-finding").opacity, "0");
    assert.ok(Number(artifactTag(html, "alternative-scan-outcomes").opacity) > .8);
    for (const word of ["Complete", "No findings", "Incomplete", "Cancelled", "Unavailable"]) assert.ok(html.includes(word));
  }
});

test("live-value callout is opaque at authored middle and stays in its own band outside SVG layers and fallback metrics", () => {
  for (const frame of [430, 600]) {
    const html = scene("typed-svg-dom", frame);
    assert.equal(artifactTag(html, "live-attribute-link").opacity, "1");
    const tag = html.match(/<g\b[^>]*data-artifact="live-attribute-link"[^>]*>/)[0];
    const contents = html.slice(html.indexOf(tag) + tag.length);
    const rect = contents.match(/<rect\b[^>]*>/)[0];
    const bounds = Object.fromEntries([...rect.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
    const [layerX] = translation(artifactTag(html, "svg-layer-6"));
    assert.ok(Number(bounds.x) > layerX + 550, "callout starts beyond every layer's widest extent");
    assert.ok(Number(bounds.y) > 568 + 15, "callout is below the layer legend");
    assert.ok(Number(bounds.y) + Number(bounds.height) < 638, "callout does not cross the fallback metrics band");
    assert.match(contents, /Attribute ↔ live value/);
  }
});

test("collection previews use one static authored SVG and matching accessible metadata, never a Player", () => {
  for (const story of motionStorySlugs) {
    const direction = artFor(story);
    const preview = renderToStaticMarkup(React.createElement(ArtDrawing, { direction, id: "preview", compact: true }));
    assert.equal((preview.match(/<svg\b/g) ?? []).length, 1);
    assert.match(preview, /class="article-art__drawing"/);
    assert.ok(preview.includes('data-art-family="' + direction.family + '"'));
    assert.match(preview, /data-story-scene-frame="70"/);
    assert.match(preview, /aria-hidden="true"/);
    assert.doesNotMatch(preview, /data-story-mount|<canvas|<video|<iframe|data-art-motion=/);
    const accessible = renderToStaticMarkup(React.createElement(ArtDrawing, { direction, id: "accessible" }));
    assert.ok(accessible.includes(escaped(direction.cover.description)));
  }
});

test("source links and scroll cues follow committed state without animation or forced layout delays", async () => {
  const css = postcss.parse(await read("public/living-feature.css"));
  const selectors = [];
  css.walkRules(rule => selectors.push(...rule.selectors));
  for (const chapter of [0, 1, 2, 3]) assert.ok(selectors.includes('.article-story[data-story-chapter="' + chapter + '"] [data-story-source-chapter="' + chapter + '"]'));
  assert.ok(selectors.includes(".article-story[data-story-ready] .article-story__cue"));
  css.walkDecls(decl => assert.ok(!["animation", "transition", "animation-delay"].includes(decl.prop)));
  const controller = await read("public/article-scroll.js");
  assert.match(controller, /article\.dataset\.storyLayout === "inline"/);
  assert.match(controller, /Number\(stage\.dataset\.storyEndFrame\)/);
  assert.doesNotMatch(controller, /setTimeout|setInterval|requestIdleCallback/);
});

test("normal-mode readiness reveals the cue and control without adding layout boxes", async () => {
  const css = postcss.parse(await read("public/living-feature.css"));
  const rules = [];
  css.walkRules(rule => rules.push(rule));
  const normal = selector => rules.find(rule => rule.parent.type === "root" && rule.selectors.includes(selector));
  const declarations = rule => Object.fromEntries(rule.nodes.filter(node => node.type === "decl").map(node => [node.prop, node.value]));
  const cue = declarations(normal(".article-story__cue"));
  assert.equal(cue.display, "block");
  assert.equal(cue.visibility, "hidden");
  const reveal = declarations(normal(".article-story[data-story-ready] .article-story__cue"));
  assert.deepEqual(reveal, { visibility: "visible" }, "ready changes visibility only, not box geometry");
  const control = declarations(normal(".article-story__quiet"));
  assert.equal(control.display, "block");
  assert.equal(control["min-height"], "44px");
  const reserved = normal(".article-story .article-story__quiet[hidden]");
  assert.deepEqual(declarations(reserved), { display: "block", visibility: "hidden", "pointer-events": "none" });
  assert.ok(reserved.nodes.some(node => node.prop === "display" && node.important), "reservation beats journal's blanket hidden rule");
  assert.ok(reserved.selector.includes(".article-story .article-story__quiet[hidden]"), "specificity exceeds .journal [hidden]");
  for (const mode of ["(prefers-reduced-motion: reduce), (forced-colors: active)", "print"]) {
    for (const selector of [".article-story__quiet", ".article-story .article-story__quiet[hidden]", ".article-story__cue"]) {
      const rule = rules.find(rule => rule.parent.name === "media" && rule.parent.params === mode && rule.selectors.includes(selector));
      assert.ok(rule?.nodes.some(node => node.prop === "display" && node.value === "none" && node.important), selector + " consumes no control space in " + mode);
    }
  }
  for (const article of blogArticles) {
    const html = renderToStaticMarkup(React.createElement(ArticlePage, { article }));
    assert.equal((html.match(/data-story-quiet="true" hidden=""/g) ?? []).length, motionStories[article.slug].chapters.length,
      "initial controls retain the real hidden attribute as well as CSS visibility/noninteraction");
  }
});

test("mobile capability scenes keep their four primary titles without exposing tiny detail labels", async () => {
  const css = postcss.parse(await read("public/living-feature.css"));
  const rules = [];
  css.walkRules(rule => rules.push(rule));
  const tiny = rules.find(rule => rule.selector === ".article-story__drawing text" && rule.parent.params === "(max-width: 700px)");
  const titles = rules.find(rule => rule.selector === ".article-story__drawing text[data-mobile-label]" && rule.parent.params === "(max-width: 700px)");
  assert.ok(tiny.nodes.some(node => node.prop === "display" && node.value === "none"));
  assert.ok(titles.nodes.some(node => node.prop === "display" && node.value === "block"));
  assert.ok(titles.nodes.some(node => node.prop === "font-size" && node.value === "46px"));
  assert.ok(rules.indexOf(titles) > rules.indexOf(tiny));
  for (const story of ["cloud-runtime", "aws-labs-mcp"]) {
    const html = scene(story, 70);
    const labels = [...html.matchAll(/<text\b[^>]*data-mobile-label="true"[^>]*>([^<]+)<\/text>/g)].map(match => match[1]);
    assert.deepEqual(labels, story === "cloud-runtime" ? ["Preview", "Iterate", "Learn", "Execute"] : ["Documents", "Images", "Connection", "Session"]);
  }
});
