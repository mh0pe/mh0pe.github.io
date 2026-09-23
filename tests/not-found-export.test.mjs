import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const output = new URL("../pages-dist/404.html", import.meta.url);

test("exports one accurate, non-indexable 404 document", async () => {
  const html = await readFile(output, "utf8");
  const titles = html.match(/<title\b[^>]*>[\s\S]*?<\/title>/gi) ?? [];

  assert.deepEqual(titles, [
    "<title>Page not found | Madison Hope Steiner</title>",
  ]);
  assert.match(
    html,
    /<meta name="robots" content="noindex, follow"\/>/i,
  );
  assert.doesNotMatch(html, /<link\b[^>]*rel="canonical"/i);
  assert.doesNotMatch(html, /<meta\b[^>]*property="og:url"/i);
});

test("orders semantic recovery routes before public profiles", async () => {
  const html = await readFile(output, "utf8");
  const main = html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ?? "";
  const routes = [
    'href="/"',
    'href="/work/"',
    'href="/proof/"',
    'href="https://github.com/mh0pe"',
    'href="https://github.com/awsmadi"',
  ];
  const positions = routes.map((route) => main.indexOf(route));

  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
  assert.match(
    main,
    /<nav[^>]*aria-labelledby="not-found-routes-title"[\s\S]*?<ol[^>]*class="not-found__route-list"/i,
  );
  assert.match(
    main,
    /<aside[^>]*aria-labelledby="not-found-profiles-title"[\s\S]*?<ul>/i,
  );
});
