import assert from "node:assert/strict";
import { lstat, readFile, readdir } from "node:fs/promises";
import { posix } from "node:path";
import test from "node:test";

const output = new URL("../pages-dist/", import.meta.url);
const origin = "https://mh0pe.github.io";

function decodeEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (entity, name) => {
    if (name[0] === "#") {
      const hex = name[1].toLowerCase() === "x";
      const code = Number.parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "\ufffd";
    }
    return { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" }[name.toLowerCase()] ?? entity;
  });
}

function attributes(tag) {
  const result = new Map();
  const body = tag.replace(/^<\/?[^\s>]+/, "").replace(/\/?\s*>$/, "");
  for (const match of body.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    result.set(match[1].toLowerCase(), decodeEntities(match[2] ?? match[3] ?? match[4] ?? ""));
  }
  return result;
}

// Follow the srcset URL/descriptor boundary: commas inside a data URL are data.
function srcsetUrls(value) {
  const urls = [];
  let offset = 0;
  while (offset < value.length) {
    while (/[\s,]/.test(value[offset] ?? "") && offset < value.length) offset += 1;
    const start = offset;
    while (offset < value.length && !/\s/.test(value[offset])) offset += 1;
    let url = value.slice(start, offset);
    if (!url) break;
    if (url.endsWith(",")) {
      url = url.replace(/,+$/, "");
      urls.push(url);
      continue;
    }
    urls.push(url);
    let parentheses = 0;
    while (offset < value.length) {
      const character = value[offset++];
      if (character === "(") parentheses += 1;
      if (character === ")") parentheses -= 1;
      if (character === "," && parentheses === 0) break;
    }
  }
  return urls;
}

function decodeCss(value) {
  return value.replace(/\\([\da-f]{1,6}\s?|\r\n|[^\da-f])/gi, (_, escape) => {
    if (/^[\da-f]/i.test(escape)) return String.fromCodePoint(Number.parseInt(escape.trim(), 16) || 0xfffd);
    return /[\r\n\f]/.test(escape) ? "" : escape;
  });
}

function cssUrls(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const urls = [];
  for (const match of clean.matchAll(/url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|((?:\\.|[^)\\])*?))\s*\)|@import\s+(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)')/gi)) {
    urls.push(decodeCss(match.slice(1).find((value) => value !== undefined).trim()));
  }
  return urls;
}

function htmlDocument(html) {
  const ids = new Set();
  const references = [];
  const stylesheets = [];
  const tokens = /<!--[\s\S]*?-->|<(script|style)\b(?:[^>"']|"[^"]*"|'[^']*')*>([\s\S]*?)<\/\1\s*>|<[a-z][^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>/gi;
  function inspect(tag) {
    const attrs = attributes(tag);
    if (attrs.has("id")) ids.add(attrs.get("id"));
    // An unexpected base tag would change every resolution rule and must fail.
    assert.doesNotMatch(tag, /^<base\b/i, "exported pages must not override the production base URL");
    for (const name of ["href", "xlink:href", "src", "poster"]) {
      if (attrs.has(name)) references.push({ url: attrs.get(name), kind: name });
    }
    for (const name of ["srcset", "imagesrcset"]) {
      for (const url of srcsetUrls(attrs.get(name) ?? "")) references.push({ url, kind: name });
    }
    for (const url of cssUrls(attrs.get("style") ?? "")) references.push({ url, kind: "inline style" });
    if (/^<link\b/i.test(tag) && (attrs.get("rel") ?? "").split(/\s+/).includes("stylesheet")) {
      stylesheets.push(attrs.get("href"));
    }
  }
  for (const match of html.matchAll(tokens)) {
    if (match[0].startsWith("<!--")) continue;
    if (match[1]) {
      inspect(match[0].slice(0, match[0].indexOf(">") + 1));
      if (match[1].toLowerCase() === "style") {
        for (const url of cssUrls(match[2])) references.push({ url, kind: "style block" });
      }
    } else inspect(match[0]);
  }
  return { ids, references, stylesheets };
}

async function inventory(directory = "") {
  const entries = [];
  for (const item of await readdir(new URL(directory, output), { withFileTypes: true })) {
    const path = directory + item.name;
    const metadata = await lstat(new URL(path, output));
    assert.ok(!metadata.isSymbolicLink(), `export contains a symbolic link: ${path}`);
    assert.ok(metadata.isDirectory() || metadata.isFile(), `unexpected file type: ${path}`);
    if (metadata.isDirectory()) entries.push(...await inventory(path + "/"));
    else entries.push(path);
  }
  return entries.sort();
}

function pageUrl(filename) {
  return new URL("/" + filename.replace(/(^|\/)index\.html$/, "$1"), origin);
}

function localReference(value, base, files) {
  const url = new URL(value, base);
  if (!["https:", "http:"].includes(url.protocol) || url.origin !== origin) return null;
  const pathname = decodeURIComponent(url.pathname).replace(/^\//, "");
  const normalized = posix.normalize(pathname);
  assert.ok(!normalized.startsWith("../") && !normalized.includes("\0"), `unsafe artifact path: ${value}`);
  const possibilities = [normalized, posix.join(normalized, "index.html")];
  const target = possibilities.find((name) => files.has(name));
  return { target, fragment: decodeURIComponent(url.hash.slice(1)), url };
}

test("reference parsing preserves responsive images, CSS escapes, queries and real anchors", () => {
  assert.deepEqual(srcsetUrls("data:image/svg+xml,%3Csvg%3E 1x, /photo.webp?v=2 2x"), [
    "data:image/svg+xml,%3Csvg%3E", "/photo.webp?v=2",
  ]);
  assert.deepEqual(srcsetUrls("/small.webp, /large.webp 2x"), ["/small.webp", "/large.webp"]);
  assert.deepEqual(cssUrls('/* url(/ignored) */ url("/fonts/hello\\20 world.woff2") url(#paint) @import "other.css";'), [
    "/fonts/hello world.woff2", "#paint", "other.css",
  ]);
  const document = htmlDocument('<a href="/work/?a=1&amp;b=2#my%20work">Work</a><h2 id="my work">Work</h2><script>const fake = \'<a href="/not-an-element">\';</script><style>.a{background:url(/art.svg)}</style><img srcset="data:image/png;base64,AA 1x, /large.png 2x">');
  assert.deepEqual([...document.ids], ["my work"]);
  assert.deepEqual(document.references.map(({ url }) => url), ["/work/?a=1&b=2#my%20work", "/art.svg", "data:image/png;base64,AA", "/large.png"]);
  const files = new Set(["work/index.html", "fonts/example.woff2"]);
  assert.deepEqual(localReference("../?filter=a#my%20work", new URL("/work/project/", origin), files).target, "work/index.html");
  assert.equal(localReference("/work/#my%20work", origin, files).fragment, "my work");
  assert.equal(localReference("/missing/", origin, files).target, undefined);
  assert.equal(localReference("https://github.com/mh0pe", origin, files), null);
  assert.equal(localReference("data:image/png;base64,AA", origin, files), null);
  assert.equal(localReference("mailto:hello@example.com", origin, files), null);
});

test("all exported page links, anchors and asset references resolve inside the artifact", async () => {
  const files = new Set(await inventory());
  const pages = [...files].filter((name) => name.endsWith(".html"));
  assert.equal(pages.length, 16, "check the complete set of exported pages, including recovery and legacy routes");
  const documents = new Map(await Promise.all(pages.map(async (name) => [
    name, htmlDocument(await readFile(new URL(name, output), "utf8")),
  ])));
  const failures = [];
  for (const [name, document] of documents) {
    for (const reference of document.references) {
      try {
        const result = localReference(reference.url, pageUrl(name), files);
        if (!result) continue;
        if (!result.target) failures.push(`${name}: ${reference.kind} ${reference.url} has no exported file`);
        else if (result.fragment && documents.has(result.target) && !documents.get(result.target).ids.has(result.fragment)) {
          failures.push(`${name}: ${reference.kind} ${reference.url} has no #${result.fragment} in ${result.target}`);
        }
      } catch (error) {
        failures.push(`${name}: ${reference.kind} ${reference.url}: ${error.message}`);
      }
    }
  }
  assert.deepEqual(failures, [], failures.join("\n"));
});

test("all exported stylesheet assets and SVG paint references have valid targets", async () => {
  const files = new Set(await inventory());
  const stylesheets = [...files].filter((name) => name.endsWith(".css"));
  assert.ok(stylesheets.length > 0, "the exported site must include its stylesheets");
  const documents = new Map(await Promise.all([...files].filter((name) => name.endsWith(".html")).map(async (name) => [
    name, htmlDocument(await readFile(new URL(name, output), "utf8")),
  ])));
  const failures = [];
  for (const name of stylesheets) {
    const css = await readFile(new URL(name, output), "utf8");
    for (const value of cssUrls(css)) {
      // Shared CSS can target a paint server that is used by only one page.
      // It must exist on a page loading this sheet, not merely somewhere in source.
      if (value.startsWith("#")) {
        const id = decodeURIComponent(value.slice(1));
        const users = [...documents].filter(([page, document]) => document.stylesheets.some((href) =>
          localReference(href, pageUrl(page), files)?.target === name));
        if (!users.some(([, document]) => document.ids.has(id))) {
          failures.push(`${name}: ${value} is not defined by any exported page loading this stylesheet`);
        }
        continue;
      }
      try {
        const result = localReference(value, new URL("/" + name, origin), files);
        if (result && !result.target) failures.push(`${name}: ${value} has no exported file`);
        if (result?.target && result.fragment && documents.has(result.target) && !documents.get(result.target).ids.has(result.fragment)) {
          failures.push(`${name}: ${value} has no matching HTML fragment`);
        }
      } catch (error) {
        failures.push(`${name}: ${value}: ${error.message}`);
      }
    }
  }
  assert.deepEqual(failures, [], failures.join("\n"));
});

test("the export excludes secrets, source code, private reviews, server output and source maps", async () => {
  const files = await inventory();
  const forbidden = files.filter((name) => {
    const parts = name.split("/");
    return parts.some((part) => /^\.env(?:\.|$)|^\.(?:git|github|wrangler|next|vinext|vite)(?:$|\.)|^(?:reviews|server|node_modules|tests|app|tools|sources|remotion)$/.test(part))
      || /\.(?:tsx?|jsx|map|tsbuildinfo)$/i.test(name)
      || /(?:^|\/)(?:package(?:-lock)?\.json|AGENTS\.md|tsconfig\.json|source\.tar(?:\.gz)?)$/.test(name);
  });
  assert.deepEqual(forbidden, [], `private or source-only files leaked: ${forbidden.join(", ")}`);
  // The inspected production output has no maps, so neither emitted maps nor
  // inline source maps are expected as part of this static publication package.
  for (const name of files.filter((path) => /\.(?:js|css)$/.test(path))) {
    const source = await readFile(new URL(name, output), "utf8");
    assert.doesNotMatch(source, /[#@]\s*sourceMappingURL\s*=/, `${name} exposes a source-map reference`);
  }
});
