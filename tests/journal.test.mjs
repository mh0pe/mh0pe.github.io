import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { tsImport } from "tsx/esm/api";
import { includesRouteClass } from "../tools/build-route-styles.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const { blogArticles, blogTopics, legacyEntryPoints, articlePath, relatedArticles } = await tsImport(new URL("app/data/blog.ts", root).href, import.meta.url);
const slugs = JSON.parse(await read("app/data/blog-routes.json"));
const structured = (html) => [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
const flatSchema = (html) => structured(html).flatMap((record) => record["@graph"] ?? [record]);

test("the journal has nine distinct, illustrated, source-backed essays", () => {
  assert.equal(blogArticles.length, 9);
  assert.equal(new Set(slugs).size, 9);
  assert.deepEqual(slugs, blogArticles.map((article) => article.slug));
  for (const article of blogArticles) {
    assert.ok(blogTopics.some((topic) => topic.id === article.topic));
    assert.ok(article.intro.length >= 2);
    assert.ok(article.sections.length >= 3);
    assert.ok(article.sections.some((section) => section.detail?.caption.length > 20));
    assert.ok(article.diagram.caption.length > 30);
    assert.ok(article.takeaway.length > 30);
    assert.ok(article.tags.length >= 2);
    assert.equal(new Set(article.sources.map((source) => source.id)).size, article.sources.length);
    for (const source of article.sources) {
      const url = new URL(source.href);
      assert.equal(url.protocol, "https:");
      assert.equal(url.hostname, "github.com");
      assert.ok(!source.href.includes("/private/"));
    }
    for (const section of article.sections) {
      for (const id of section.sources ?? []) assert.ok(article.sources.some((source) => source.id === id), article.slug + ": " + id);
    }
    assert.equal(new Set(article.sections.map((section) => section.id)).size, article.sections.length);
    assert.ok(!/[—]/u.test(JSON.stringify(article)), article.slug);
    assert.ok(!("datePublished" in article) && !("publishedAt" in article));
    assert.equal(relatedArticles(article).length, 2);
    assert.ok(relatedArticles(article).every((related) => related.slug !== article.slug));
  }
});

test("all eight original narratives keep their homepage entry points and canonical destinations", async () => {
  const recovered = JSON.parse(await read("review/legacy-narratives.json"));
  const originals = recovered.narratives ?? recovered.records;
  assert.equal(originals.length, 8);
  assert.deepEqual(new Set(originals.map((entry) => entry.id)), new Set(legacyEntryPoints.map((entry) => entry.id)));
  const home = await read("pages-dist/index.html");
  for (const entry of legacyEntryPoints) {
    assert.ok(home.includes('id="post-' + entry.id + '"'), entry.id);
    assert.ok(home.includes('href="' + entry.href + '"'), entry.href);
  }
  assert.equal(legacyEntryPoints.filter((entry) => entry.kind === "case").length, 4);
  assert.equal(legacyEntryPoints.filter((entry) => entry.kind === "article").length, 4);
  assert.ok(home.includes('href="/blog/"'));
});

test("the hub has native topic destinations and inactive controls until enhancement", async () => {
  const html = await read("pages-dist/blog/index.html");
  assert.equal((html.match(/\bdata-journal-entry="true"/g) ?? []).length, 9);
  assert.match(html, /<select[^>]*data-journal-tag="true"[^>]*disabled=""/);
  assert.match(html, /data-journal-tag-control="true" hidden=""/);
  assert.match(html, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(html, /journal-feature__legend/);
  for (const topic of blogTopics) {
    assert.ok(html.includes('href="#topic-' + topic.id + '"'));
    assert.ok(html.includes('id="topic-' + topic.id + '"'));
  }
  for (const article of blogArticles) assert.ok(html.includes('href="' + articlePath(article) + '"'));
  const blog = flatSchema(html).find((record) => record["@type"] === "Blog");
  assert.equal(blog.blogPost.length, 9);
});

for (const article of blogArticles) {
  test(article.slug + " exports a complete readable article without React hydration", async () => {
    const html = await read("pages-dist/blog/" + article.slug + "/index.html");
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.ok(html.includes("Madison Hope Steiner"));
    assert.ok(html.includes('rel="canonical" href="https://mh0pe.github.io' + articlePath(article) + '"'));
    assert.ok((html.match(/<figcaption/g) ?? []).length >= 2);
    assert.match(html, /role="img" aria-labelledby="[^"]+-still-title [^"]+-still-description"/);
    assert.match(html, /data-story-quiet="true" hidden=""/);
    assert.match(html, /<details class="article-implementation"/);
    assert.match(html, /data-static-runtime="journal" src="\/journal\.js\?/);
    assert.ok(html.includes('/route-styles/blog.css?'));
    assert.ok(html.indexOf('/journal.css?') < html.indexOf('</head>'));
    assert.doesNotMatch(html, /type="module"|__VINEXT|__webpack|__next_f|modulepreload|vite-rsc/);
    const schema = flatSchema(html).find((record) => record["@type"] === "BlogPosting");
    assert.equal(schema.headline, article.title);
    assert.equal(schema.url, "https://mh0pe.github.io" + articlePath(article));
    assert.equal(schema.author["@id"], "https://mh0pe.github.io/#madison-hope-steiner");
    assert.deepEqual(schema.citation, article.sources.map((source) => source.href));
    assert.ok(!("datePublished" in schema) && !("dateModified" in schema));
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, "all SVG and article IDs are unique");
    for (const match of html.matchAll(/class="([^"]*)"/g)) {
      for (const name of match[1].split(/\s+/).filter(Boolean)) assert.ok(includesRouteClass("blog", name), name);
    }
    assert.equal(schema.discussionUrl, article.linkedinPost?.href);
  });
}

test("only the verified corresponding LinkedIn post is linked", async () => {
  const receipt = JSON.parse(await read("review/linkedin-backlinks.json"));
  const linked = blogArticles.filter((article) => article.linkedinPost);
  assert.equal(linked.length, 1);
  assert.equal(linked[0].slug, "typed-svg-dom");
  assert.equal(linked[0].linkedinPost.href, receipt.backlinks[0].url);
  assert.ok(linked[0].sources.some((source) => source.href === receipt.backlinks[0].correspondingWork));
});

test("writing discovery and route assets do not burden existing reading routes", async () => {
  const sitemap = await read("public/sitemap.xml");
  const llms = await read("public/llms.txt");
  for (const article of blogArticles) {
    assert.ok(sitemap.includes("https://mh0pe.github.io" + articlePath(article)));
    assert.ok(llms.includes("https://mh0pe.github.io" + articlePath(article)));
  }
  const home = await read("pages-dist/index.html");
  assert.doesNotMatch(home, /href="\/journal\.css|src="\/journal\.js|href="\/route-styles\/blog\.css/);
  const css = await read("pages-dist/route-styles/blog.css");
  assert.ok(Buffer.byteLength(css) < 65_000);
  const runtime = await read("public/journal.js");
  assert.doesNotMatch(runtime, /\bfetch\(|\bimport\(|setInterval|addEventListener\(["']scroll/);
  const journalCss = await read("public/journal.css");
  assert.match(journalCss, /prefers-reduced-motion/);
  assert.match(journalCss, /forced-colors/);
  assert.doesNotMatch(journalCss, /opacity:\s*0(?:[; }]|$)/);
  for (const selector of ["journal-feature h2 a", "journal-entry h3 a", "journal-related h3 a"]) {
    const rule = journalCss.slice(journalCss.indexOf("." + selector)).split("}")[0];
    assert.match(rule, /display: block/);
    assert.match(rule, /min-height: 44px/);
  }
  const landingCss = await read("public/landing-story.css");
  assert.match(landingCss, /\.landing-writing h3 a \{ display: block; min-height: 44px/);
});

class Target {
  constructor(dataset = {}) { this.dataset = dataset; this.attributes = new Map(); this.listeners = new Map(); this.hidden = false; this.disabled = true; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  toggleAttribute(name, on) { if (on) this.setAttribute(name, ""); else this.removeAttribute(name); }
  hasAttribute(name) { return this.attributes.has(name); }
  addEventListener(name, handler) { this.listeners.set(name, handler); }
  emit(name, event = {}) { this.listeners.get(name)?.(event); }
  scrollIntoView() { this.scrolled = true; }
  focus() { this.focusCalls = (this.focusCalls ?? 0) + 1; }
}

async function harness({ reduced = false, saved = false, hidden = false, observer = true, hub = true, url = "https://mh0pe.github.io/blog/" } = {}) {
  const document = new Target(); document.hidden = hidden;
  document.documentElement = new Target();
  const window = new Target();
  const media = new Target(); media.matches = reduced;
  const connection = new Target(); connection.saveData = saved;
  const frames = [];
  const figures = [new Target(), new Target()];
  for (const figure of figures) {
    figure.replay = new Target(); figure.replay.hidden = true;
    figure.querySelector = () => figure.replay;
  }
  let observerCallback;
  class Observer {
    constructor(callback) { observerCallback = callback; }
    observe() {}
  }
  if (observer) window.IntersectionObserver = Observer;
  const topicLinks = ["all", ...blogTopics.map((topic) => topic.id)].map((id) => {
    const link = new Target({ journalTopic: id });
    link.textContent = id === "all" ? "All writing" : blogTopics.find((topic) => topic.id === id).label;
    return link;
  });
  const groups = blogTopics.map((topic) => {
    const group = new Target({ journalGroup: topic.id });
    group.entries = blogArticles.filter((article) => article.topic === topic.id).map((article) => new Target({ journalTags: JSON.stringify(article.tags) }));
    group.querySelectorAll = () => group.entries;
    return group;
  });
  const select = new Target(); select.value = "";
  select.options = [{ value: "" }, ...new Set(blogArticles.flatMap((article) => article.tags))].map((value) => typeof value === "string" ? { value } : value);
  const status = new Target(); const empty = new Target(); empty.hidden = true;
  const tagWrapper = new Target(); tagWrapper.hidden = true;
  const resets = [new Target(), new Target({ journalReset: "empty" })];
  const journal = {
    querySelectorAll: (selector) => selector === "[data-journal-topic]" ? topicLinks : selector === "[data-journal-group]" ? groups : resets,
    querySelector: (selector) => ({ "[data-journal-tag]": select, "[data-journal-status]": status, "[data-journal-empty]": empty, "[data-journal-tag-control]": tagWrapper })[selector],
  };
  const articles = new Target();
  document.querySelectorAll = () => figures;
  document.querySelector = () => hub ? journal : null;
  document.getElementById = (id) => id === "articles" ? articles : groups.find((group) => "topic-" + group.dataset.journalGroup === id);
  let current = new URL(url);
  const location = { get href() { return current.href; }, get search() { return current.search; } };
  const history = { pushState: (_, __, path) => { current = new URL(path, current); } };
  vm.runInNewContext(await read("public/journal.js"), {
    document, window, navigator: { connection }, matchMedia: () => media,
    IntersectionObserver: Observer, URL, URLSearchParams, history, location,
    requestAnimationFrame: (callback) => frames.push(callback),
  });
  const click = (target, extra = {}) => {
    const event = { button: 0, preventDefault() { this.prevented = true; }, ...extra };
    target.emit("click", event); return event;
  };
  const enter = (figure = figures[0], intersecting = true) => observerCallback?.([{ target: figure, isIntersecting: intersecting }]);
  const flush = () => { while (frames.length) frames.shift()(); };
  const navigate = (path) => { current = new URL(path, current); window.emit("popstate"); };
  const visibleCount = () => groups.flatMap((group) => group.entries).filter((entry) => !entry.hidden).length;
  return { document, window, media, connection, figures, groups, topicLinks, select, status, empty, tagWrapper, resets, click, enter, flush, navigate, visibleCount, get url() { return current; } };
}

test("topic and focus filters preserve URL state, reset, and browser history", async () => {
  const page = await harness();
  assert.equal(page.select.disabled, false);
  assert.equal(page.tagWrapper.hidden, false);
  assert.equal(page.visibleCount(), 9);
  assert.match(page.status.textContent, /9 essays/);
  page.click(page.topicLinks.find((link) => link.dataset.journalTopic === "security"));
  assert.equal(page.visibleCount(), 2);
  assert.equal(page.url.searchParams.get("topic"), "security");
  page.select.value = "MCP"; page.select.emit("change");
  assert.equal(page.visibleCount(), 0);
  assert.equal(page.empty.hidden, false);
  page.click(page.resets[0]);
  assert.equal(page.visibleCount(), 9);
  assert.equal(page.empty.hidden, true);
  assert.equal(page.url.search, "");
  page.navigate("?topic=browser&tag=SVG");
  assert.equal(page.visibleCount(), 1);
  assert.equal(page.select.value, "SVG");
  page.navigate("?topic=unknown&tag=unknown");
  assert.equal(page.visibleCount(), 9);
  assert.equal(page.select.value, "");
  assert.equal(page.click(page.topicLinks[1], { metaKey: true }).prevented, undefined);
  assert.equal(page.click(page.resets[0], { button: 1 }).prevented, undefined);
});

test("empty-state reset returns keyboard focus to visible All writing", async () => {
  const page = await harness({ url: "https://mh0pe.github.io/blog/?topic=security&tag=MCP" });
  const all = page.topicLinks[0];
  assert.equal(page.empty.hidden, false);
  assert.equal(page.click(page.resets[1], { metaKey: true }).prevented, undefined);
  assert.equal(all.focusCalls ?? 0, 0, "modified activation keeps native navigation");
  assert.equal(page.empty.hidden, false);
  page.click(page.resets[1]);
  assert.equal(page.visibleCount(), 9);
  assert.equal(page.empty.hidden, true);
  assert.equal(all.focusCalls, 1, "focus leaves the panel that the reset just hid");
  assert.equal(all.attributes.get("aria-current"), "location");
});

test("persistent Clear filters control does not move keyboard focus", async () => {
  const page = await harness({ url: "https://mh0pe.github.io/blog/?topic=security&tag=MCP" });
  page.click(page.resets[0]);
  assert.equal(page.visibleCount(), 9);
  assert.equal(page.topicLinks[0].focusCalls ?? 0, 0);
});

test("illustrations assemble once when visible and replay only while visible", async () => {
  const page = await harness({ hub: false });
  const figure = page.figures[0];
  assert.equal(figure.hasAttribute("data-figure-play"), false);
  assert.equal(figure.replay.disabled, false);
  page.enter(); assert.equal(figure.hasAttribute("data-figure-play"), true);
  page.enter(figure, false); assert.equal(figure.hasAttribute("data-figure-play"), false);
  page.enter(); assert.equal(figure.hasAttribute("data-figure-play"), false, "no scroll-triggered repeat");
  page.click(figure.replay); page.flush(); assert.equal(figure.hasAttribute("data-figure-play"), true);
  page.click(figure.replay); page.enter(figure, false); page.flush();
  assert.equal(figure.hasAttribute("data-figure-play"), false, "flinging away cancels a queued replay");
});

for (const option of [{ reduced: true }, { saved: true }, { hidden: true }]) {
  test("motion does not start under " + JSON.stringify(option), async () => {
    const page = await harness({ ...option, hub: false });
    const figure = page.figures[0]; page.enter(); page.click(figure.replay); page.flush();
    assert.equal(figure.hasAttribute("data-figure-play"), false);
    page.media.matches = false; page.connection.saveData = false; page.document.hidden = false;
    page.document.emit("visibilitychange");
    assert.equal(figure.hasAttribute("data-figure-play"), true, "a pending visible figure can start after the restriction is removed");
    page.media.matches = true; page.media.emit("change");
    assert.equal(figure.hasAttribute("data-figure-play"), false);
    assert.equal(figure.replay.hidden, true);
    assert.equal(figure.replay.disabled, true);
  });
}

test("without an observer, diagrams stay static until a permitted replay", async () => {
  const page = await harness({ observer: false, hub: false });
  const figure = page.figures[0];
  assert.equal(figure.hasAttribute("data-figure-play"), false);
  page.click(figure.replay); page.flush();
  assert.equal(figure.hasAttribute("data-figure-play"), true);
});
