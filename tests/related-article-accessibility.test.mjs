import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { tsImport } from "tsx/esm/api";

const { blogArticles, relatedArticles, articlePath } = await tsImport(
  new URL("../app/data/blog.ts", import.meta.url).href, import.meta.url,
);
const read = path => readFile(new URL(`../pages-dist/${path}`, import.meta.url), "utf8");
const decode = text => text.replace(/<!--.*?-->/g, "").replaceAll("&#x27;", "'").replaceAll("&amp;", "&").trim();

test("all related cards keep their illustration and one native, visibly named destination", async () => {
  for (const article of blogArticles) {
    const html = await read(`blog/${article.slug}/index.html`);
    const region = html.match(/<section[^>]+aria-labelledby="related-writing-title"[\s\S]+?<\/section>/)?.[0];
    assert.ok(region, article.slug);
    const cards = [...region.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g)];
    const expected = relatedArticles(article);
    assert.equal(cards.length, expected.length, article.slug);
    for (const [index, [, card]] of cards.entries()) {
      assert.match(card, /<div class="journal-related__cover"[^>]*>[\s\S]*?<svg\b[^>]*aria-hidden="true"/);
      const links = [...card.matchAll(/<a\b[^>]*>/g)];
      assert.equal(links.length, 1);
      assert.doesNotMatch(links[0][0], /aria-label|tabindex/i);
      assert.ok(links[0][0].includes(`href="${articlePath(expected[index])}"`));
      const title = card.match(/<h3><a[^>]*>([\s\S]*?)<span aria-hidden="true">/);
      assert.ok(title);
      assert.equal(decode(title[1]), expected[index].title);
    }
  }
  const css = await read("route-styles/blog.css");
  assert.match(css, /\.journal-related__link::after\s*\{[^{}]*position:absolute;[^{}]*inset:0/);
  assert.match(css, /\.journal-related__link:focus-visible::after\s*\{[^{}]*outline:/);
});
