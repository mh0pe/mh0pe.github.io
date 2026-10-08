import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import pages from "../app/data/social-pages.json" with { type: "json" };
import blogRoutes from "../app/data/blog-routes.json" with { type: "json" };

const root = new URL("../", import.meta.url);
const origin = "https://mh0pe.github.io";
const decode = value => value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&#39;", "'");
const tags = head => [...head.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key, decode(value)])));
const fileFor = path => path === "/404.html" ? "404.html" : path === "/" ? "index.html" : path.slice(1) + "index.html";

test("sharing catalog covers every export with deliberate artwork", () => {
  assert.equal(pages.length, 26);
  assert.equal(new Set(pages.map(page => page.path)).size, 26);
  assert.equal(pages.filter(page => !page.alias).length, 24);
  assert.equal(new Set(pages.filter(page => !page.alias).map(page => page.image)).size, 24);
  for (const slug of blogRoutes) assert.equal(pages.find(page => page.path === `/blog/${slug}/`).art, slug);
  for (const page of pages.filter(page => !page.alias)) {
    assert.ok(page.lines.length >= 2 && page.lines.length <= 3);
    assert.ok(page.alt.length > 50);
    assert.doesNotMatch(page.title + page.alt, /—|dataset|model not recorded/i);
  }
});

test("all 26 documents have complete page-specific social metadata", async () => {
  for (const entry of pages) {
    const card = entry.alias ? pages.find(page => page.path === entry.alias) : entry;
    const html = await readFile(new URL("pages-dist/" + fileFor(entry.path), root), "utf8");
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)[1];
    const meta = tags(head);
    const value = key => {
      const matched = meta.filter(tag => tag.name === key || tag.property === key);
      assert.equal(matched.length, 1, entry.path + ": " + key);
      return matched[0].content;
    };
    assert.equal((head.match(/<title\b/g) ?? []).length, 1, entry.path);
    assert.equal(value("og:title"), card.title);
    assert.equal(value("twitter:title"), card.title);
    assert.equal(value("og:image"), `${origin}/social/${card.image}.jpg`);
    assert.equal(value("twitter:image"), value("og:image"));
    assert.equal(value("og:image:alt"), card.alt);
    assert.equal(value("twitter:image:alt"), card.alt);
    assert.equal(value("og:image:width"), "1200");
    assert.equal(value("og:image:height"), "630");
    assert.equal(value("og:image:type"), "image/jpeg");
    assert.equal(value("twitter:card"), "summary_large_image");
    assert.equal(value("description"), value("og:description"));
    assert.equal(value("description"), value("twitter:description"));
    assert.ok(value("description").length > 40);
    assert.ok(value("og:site_name").includes("Madison Hope Steiner"));
    assert.equal(value("og:locale"), "en_US");
    assert.equal(value("og:type"), entry.path.startsWith("/blog/") && entry.path !== "/blog/" ? "article" : "website");
    assert.doesNotMatch(head, /twitter:(?:creator|site)"/);
    if (entry.path === "/404.html") {
      assert.doesNotMatch(head, /property="og:url"|rel="canonical"/);
    } else {
      assert.equal(value("og:url").replace(/\/$/, ""), (origin + card.path).replace(/\/$/, ""));
      assert.ok(head.includes(`rel="canonical" href="${origin + card.path}"`));
    }
    if (entry.alias || entry.path === "/404.html") assert.match(value("robots"), /noindex.*follow/);
    if (entry.path.startsWith("/blog/") && entry.path !== "/blog/") {
      assert.equal(value("article:author"), origin + "/");
      assert.ok(value("article:section"));
      assert.ok(meta.filter(tag => tag.property === "article:tag").length > 0);
      assert.doesNotMatch(head, /article:(?:published_time|modified_time)/);
    }
    if (/^\/(blog|work)\/[^/]+\/$/.test(entry.path)) {
      const data = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].flatMap(([, json]) => {
        const parsed = JSON.parse(json); return parsed["@graph"] ?? [parsed];
      });
      const article = data.find(item => ["BlogPosting", "TechArticle"].includes(item["@type"]));
      assert.ok(article, entry.path);
      assert.equal(article.image.url, value("og:image"));
      assert.equal(article.mainEntityOfPage, origin + card.path);
      assert.ok(article.citation.length);
      assert.equal(article.datePublished, undefined);
      assert.equal(article.dateModified, undefined);
    }
  }
});

test("social graphics are distinct, decoded, compact and copied exactly", async () => {
  const hashes = [];
  const manifest = JSON.parse(await readFile(new URL("public/social/manifest.json", root), "utf8"));
  assert.equal(manifest.cards.length, 24);
  assert.ok(manifest.inputs.some(input => input.file.endsWith("newsreader-variable.woff2")));
  assert.ok(manifest.inputs.some(input => input.file.endsWith("madison-outdoor-720.webp")));
  assert.equal(manifest.inputs.filter(input => input.file.startsWith("public/credentials/")).length, 6);
  for (const card of manifest.cards) {
    const source = await readFile(new URL("public/social/" + card.file, root));
    const exported = await readFile(new URL("pages-dist/social/" + card.file, root));
    assert.deepEqual(source, exported);
    const image = sharp(source);
    const info = await image.metadata();
    await image.raw().toBuffer();
    assert.equal(info.width, 1200);
    assert.equal(info.height, 630);
    assert.equal(info.format, "jpeg");
    assert.ok(source.length <= 200000);
    const hash = createHash("sha256").update(source).digest("hex");
    assert.equal(card.sha256, hash);
    hashes.push(hash);
  }
  assert.equal(new Set(hashes).size, 24);
});
