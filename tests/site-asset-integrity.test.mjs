import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import sharp from "sharp";
import { createPagesServer } from "../tools/serve-pages.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "pages-dist");
const origin = "https://mh0pe.github.io";

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)]
    .map(([, key, , value]) => [key.toLowerCase(), value.replaceAll("&amp;", "&")]));
}

function mediaReferences(html) {
  const refs = [];
  for (const [tag] of html.matchAll(/<(?:img|source|video|script|link|meta)\b[^>]*>/gi)) {
    const attr = attributes(tag);
    for (const key of ["src", "data-src", "poster"]) if (attr[key]) refs.push(attr[key]);
    for (const key of ["srcset", "imagesrcset"]) {
      if (attr[key] && !attr[key].startsWith("data:")) {
        refs.push(...attr[key].split(",").map((item) => item.trim().split(/\s+/)[0]));
      }
    }
    if (/\b(?:stylesheet|icon|preload|manifest)\b/.test(attr.rel ?? "") && attr.href) refs.push(attr.href);
    if (["og:image", "og:image:url", "twitter:image"].includes(attr.property ?? attr.name)) refs.push(attr.content);
  }
  return refs.filter(Boolean);
}

function localReference(reference, from) {
  if (/^(?:data:|blob:|#)/i.test(reference)) return null;
  const url = new URL(reference, new URL(from, origin));
  if (url.origin !== origin) return null;
  const path = resolve(output, `.${decodeURIComponent(url.pathname)}`);
  assert.ok(path.startsWith(`${output}${sep}`), `Asset escapes output: ${reference}`);
  return { path, url: url.pathname + url.search };
}

test("asset discovery includes responsive sources, delayed video, posters, and sharing images", () => {
  assert.deepEqual(mediaReferences('<picture><source srcset="/a.avif 480w, /b.avif 720w"><img src="/a.webp"></picture><video data-src="/film.mp4" poster="/poster.jpg"></video><meta property="og:image" content="https://mh0pe.github.io/share.jpg">'),
    ["/a.avif", "/b.avif", "/a.webp", "/film.mp4", "/poster.jpg", "https://mh0pe.github.io/share.jpg"]);
});

test("every exported route serves complete, decodable local media and correct asset types", async (context) => {
  const files = await walk(output);
  const pages = files.filter((path) => path.endsWith(".html"));
  assert.ok(pages.length >= 16, "include primary pages, aliases, case studies, and 404");
  const assets = new Map();
  function add(reference, from) {
    const asset = localReference(reference, from);
    if (asset) assets.set(asset.path, asset.url);
  }
  for (const page of pages) {
    const route = `/${relative(output, page).split(sep).join("/")}`;
    const html = await readFile(page, "utf8");
    for (const reference of mediaReferences(html)) add(reference, route);
    for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
      assert.ok("alt" in attributes(tag), `${route}: image lacks an alt attribute`);
    }
  }
  for (const file of files.filter((path) => path.endsWith(".css"))) {
    const css = await readFile(file, "utf8");
    const route = `/${relative(output, file).split(sep).join("/")}`;
    for (const [, value] of css.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/g)) add(value, route);
  }
  assert.ok(assets.size >= 35, `only ${assets.size} assets found`);
  const server = createPagesServer(output);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  context.after(() => { server.closeAllConnections(); return new Promise((resolve) => server.close(resolve)); });
  const port = server.address().port;
  const expectedTypes = { ".avif": "image/avif", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".mp4": "video/mp4" };
  for (const [path, url] of assets) {
    const metadata = await stat(path);
    assert.ok(metadata.isFile() && metadata.size > 0, `${url}: missing or empty asset`);
    const extension = extname(path);
    if (/^\.(?:avif|webp|png|jpe?g|svg)$/.test(extension)) {
      const image = await sharp(path).metadata();
      assert.ok(image.width > 0 && image.height > 0, `${url}: invalid dimensions`);
      await sharp(path).resize(1, 1).toBuffer();
    }
    if (extension === ".woff2") assert.equal((await readFile(path)).subarray(0, 4).toString(), "wOF2", url);
    const response = await fetch(`http://127.0.0.1:${port}${url}`, { method: "HEAD" });
    assert.equal(response.status, 200, url);
    assert.equal(Number(response.headers.get("content-length")), metadata.size, url);
    if (expectedTypes[extension]) assert.ok(response.headers.get("content-type")?.startsWith(expectedTypes[extension]), `${url}: incorrect MIME type`);
  }
  context.diagnostic(`Checked ${pages.length} exported documents and ${assets.size} unique local assets.`);
});

test("exported public assets exactly match their current source bytes", async () => {
  let compared = 0;
  for (const path of await walk(output)) {
    const source = resolve(root, "public", relative(output, path));
    let sourceBytes;
    try { sourceBytes = await readFile(source); }
    catch (error) { if (error.code === "ENOENT") continue; throw error; }
    assert.ok((await readFile(path)).equals(sourceBytes), `Stale exported asset: ${relative(output, path)}`);
    compared += 1;
  }
  assert.ok(compared >= 50, `only ${compared} public assets compared`);
});
