import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { tsImport } from "tsx/esm/api";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const { articleArt, artFor } = await tsImport(new URL("app/data/article-art.ts", root).href, import.meta.url);
const { blogArticles } = await tsImport(new URL("app/data/blog.ts", root).href, import.meta.url);
const { motionStories } = await tsImport(new URL("app/data/article-motion.ts", root).href, import.meta.url);

// React's static export supplies explicit closing tags. Read their actual tree,
// including non-whitespace text, while ignoring comments and raw script/style
// text. This tests the figure content model without depending on class names.
function captionRelationships(html) {
  const document = { tag: "#document", children: [] };
  const stack = [document];
  const figures = [], captions = [];
  const voids = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const tokens = /<!--[\s\S]*?-->|<![^>]*>|<(script|style)\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>|<\/?([a-z][\w:-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>|([^<]+)/gi;
  for (const match of html.matchAll(tokens)) {
    if (match[0].startsWith("<!")) continue;
    if (match[3]) {
      if (match[3].trim()) stack.at(-1).children.push({ tag: "#text" });
      continue;
    }
    const tag = (match[1] ?? match[2]).toLowerCase();
    if (match[0].startsWith("</")) {
      assert.equal(stack.at(-1).tag, tag, "The static export must have balanced tags.");
      stack.pop();
      continue;
    }
    const parent = stack.at(-1);
    const node = { tag, parent, children: [] };
    parent.children.push(node);
    if (tag === "figure") figures.push(node);
    if (tag === "figcaption") captions.push(node);
    if (!match[1] && !voids.has(tag) && !/\/>$/.test(match[0])) stack.push(node);
  }
  assert.equal(stack.length, 1, "The static export must close its elements.");
  for (const caption of captions) {
    assert.equal(caption.parent.tag, "figure", "A caption must belong directly to a figure.");
    const siblings = caption.parent.children;
    assert.ok(siblings[0] === caption || siblings.at(-1) === caption, "A caption must be the figure's first or last meaningful child.");
  }
  for (const figure of figures) assert.ok(figure.children.filter(child => child.tag === "figcaption").length <= 1, "A figure may have only one caption.");
  return { figures, captions };
}

test("caption relationships allow first/last captions, flow content and nested figures", () => {
  const result = captionRelationships(`<figure><figcaption><h3>Meaning</h3><p>Explanation</p><details><summary>Notes</summary><p>Context</p></details><button>Replay</button></figcaption><svg><path d="M0 0h2" /></svg></figure>
    <figure><figure><img src="one.png"><figcaption>Inner</figcaption></figure><figcaption>Outer</figcaption></figure>
    <!-- <figcaption>not a real caption</figcaption> --><script>const example = "<figcaption>not markup</figcaption>";</script><style>/* <figcaption> */</style>`);
  assert.equal(result.figures.length, 3);
  assert.equal(result.captions.length, 3);
});

test("caption relationships reject nested, orphan, middle and duplicate captions", () => {
  for (const html of [
    "<figure><div><figcaption>Nested</figcaption></div></figure>",
    "<figcaption>Orphan</figcaption>",
    "<figure><svg></svg><figcaption>Middle</figcaption><button>Replay</button></figure>",
    "<figure><figcaption>First</figcaption><svg></svg><figcaption>Last</figcaption></figure>",
    "<figure>Text before<figcaption>Middle</figcaption><svg></svg></figure>",
  ]) assert.throws(() => captionRelationships(html), /caption/i);
});

test("every exported figure gives captions a valid figure relationship", async () => {
  for (const article of blogArticles) {
    const result = captionRelationships(await read("pages-dist/blog/" + article.slug + "/index.html"));
    assert.equal(result.captions.length, 4, article.slug + " retains the three story moments and desktop companion caption.");
  }
  const collection = captionRelationships(await read("pages-dist/blog/index.html"));
  assert.equal(collection.captions.length, 2, "Both collection figure captions remain present.");
  const documents = (await readdir(new URL("pages-dist/", root), { recursive: true }))
    .filter(path => path.endsWith(".html")).sort();
  assert.equal(documents.length, 26, "Check every exported document, including the error page.");
  for (const path of documents) captionRelationships(await read("pages-dist/" + path));
});

test("every essay has an individual art direction and two meaningfully placed visual beats", () => {
  assert.equal(Object.keys(articleArt).length, 9);
  assert.equal(new Set(Object.values(articleArt).map((direction) => direction.family)).size, 9);
  for (const article of blogArticles) {
    const direction = artFor(article.slug);
    assert.equal(direction.beats.length, 2);
    assert.deepEqual(new Set(direction.beats.map((beat) => beat.moment)), new Set(["focus", "resolve"]));
    assert.equal(new Set(direction.beats.map((beat) => beat.section)).size, 2);
    for (const beat of direction.beats) assert.ok(article.sections.some((section) => section.id === beat.section));
    for (const scene of [direction.cover, ...direction.beats]) {
      assert.ok(scene.title.length > 12);
      assert.ok(scene.description.length > 45);
      assert.ok(scene.caption.length > 45);
      assert.doesNotMatch(JSON.stringify(scene), /[—]/u);
    }
  }
  assert.throws(() => artFor("unreviewed-article"), /Missing article art direction/);
});

function luminance(hex) {
  const channel = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * channel[0] + .7152 * channel[1] + .0722 * channel[2];
}

test("each print palette keeps text ink readable on all three illustrated materials", () => {
  for (const direction of Object.values(articleArt)) {
    const [ink, ...materials] = direction.palette;
    for (const material of materials) {
      const contrast = (luminance(material) + .05) / (luminance(ink) + .05);
      assert.ok(contrast >= 4.5, `${direction.family} ${material}: ${contrast}`);
    }
  }
});

for (const article of blogArticles) {
  test(article.slug + " exports three useful story moments and a bounded visual companion", async () => {
    const html = await read("pages-dist/blog/" + article.slug + "/index.html");
    const direction = artFor(article.slug);
    assert.equal((html.match(/data-story-stage=/g) ?? []).length, 4);
    assert.equal((html.match(/class="article-story__drawing"/g) ?? []).length, 4);
    for (const moment of ["opening", "middle", "ending", "rail"]) assert.ok(html.includes(`data-story-stage="${moment}"`));
    assert.ok(html.includes(`data-art="${direction.family}"`));
    assert.equal((html.match(/data-story-quiet="true" hidden=""/g) ?? []).length, 4);
    for (const scene of motionStories[article.slug].chapters) {
      assert.ok(html.includes(scene.title.replaceAll("&", "&amp;").replaceAll("'", "&#x27;")));
      assert.ok(html.includes(scene.description.replaceAll("'", "&#x27;")) || html.includes(scene.description));
    }
    assert.ok(html.includes('/editorial-art.css?'));
    assert.doesNotMatch(html, /<canvas|<video|<iframe|type="module"|vite-rsc|__next_f/);
    assert.doesNotMatch(html, /<details open=""/);
    assert.ok(html.indexOf('data-story-stage="opening"') < html.indexOf('class="shell article-layout"'));
  });
}

test("the collection previews share the article's identity without starting nine animations", async () => {
  const html = await read("pages-dist/blog/index.html");
  assert.equal((html.match(/data-journal-entry="true"/g) ?? []).length, 9);
  assert.equal((html.match(/data-journal-figure="true"/g) ?? []).length, 1);
  const legend = html.match(/<ul class="journal-feature__legend"[^>]*>(.*?)<\/ul>/s)?.[1];
  assert.ok(legend);
  assert.doesNotMatch(legend, /<span/, "Separate projects are named, not presented as numbered steps.");
  for (const direction of Object.values(articleArt)) assert.ok(html.includes(`data-art-family="${direction.family}"`));
});

test("editorial choreography is bounded, remains visible, and respects static preferences", async () => {
  const css = await read("public/editorial-art.css");
  const drawing = await read("app/components/blog/EditorialArt.tsx");
  assert.ok(Buffer.byteLength(css) < 15_000);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /data-journal-static/);
  assert.match(css, /forced-colors/);
  assert.doesNotMatch(css, /\binfinite\b|opacity:\s*0(?:[; }]|$)|backdrop-filter/);
  assert.doesNotMatch(drawing, /useEffect|useState|Math\.random|fetch\(|<canvas|requestAnimationFrame/);
  const animations = [...css.matchAll(/animation: [\w-]+ (\d+)ms/g)];
  assert.ok(animations.length >= 3);
  for (const [, duration] of animations) assert.ok(Number(duration) + 6 * 160 < 5000);
});

test("OriginKit source adaptations and their limits are recorded without claiming stock components", async () => {
  const notices = await read("THIRD_PARTY_NOTICES.md");
  for (const component of ["pulse-lines", "text-gather", "pixel-unfold"]) assert.ok(notices.includes("https://www.originkit.dev/components/" + component));
  assert.match(notices, /not\s+the stock components/);
  assert.match(notices, /not relicensed/);
});
