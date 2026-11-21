import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildRouteStyles } from "../tools/build-route-styles.mjs";
import { sharedStylesheets } from "../tools/export-stylesheets.mjs";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const hash = value => createHash("sha256").update(value).digest("hex");

// Decode inert JSON strings, never execute embedded scripts or rewrite Flight
// records. A URL may cross chunk boundaries and strings may contain Unicode.
function flightFrom(html) {
  assert.match(html, /self\.__VINEXT_RSC_DONE__\s*=\s*true/);
  const parts = [];
  for (const [, script] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    const match = script.trim().replace(/;$/, "").match(/^self\.__VINEXT_RSC_CHUNKS__=self\.__VINEXT_RSC_CHUNKS__\|\|\[\];self\.__VINEXT_RSC_CHUNKS__\.push\(([\s\S]*)\)$/);
    if (match) {
      const part = JSON.parse(match[1]);
      assert.equal(typeof part, "string");
      parts.push(part);
    }
  }
  assert.ok(parts.length > 0);
  return parts.join("");
}

test("Flight inspection joins JSON chunks without corrupting escapes or Unicode", () => {
  const value = ':HL["/route-styles/models.css?v=abc","style"]\n1:["café ✨ </script>"]\n';
  const chunks = [value.slice(0, 17), value.slice(17, 48), value.slice(48)];
  const html = chunks.map(part => `<script>self.__VINEXT_RSC_CHUNKS__=self.__VINEXT_RSC_CHUNKS__||[];self.__VINEXT_RSC_CHUNKS__.push(${JSON.stringify(part).replaceAll("<", "\\u003c")})</script>`).join("") + '<script>self.__VINEXT_RSC_DONE__=true</script>';
  assert.equal(flightFrom(html), value);
  assert.throws(() => flightFrom(html.replace("self.__VINEXT_RSC_DONE__=true", "")));
});

test("Models HTML, Flight preload and hydration link share the final stylesheet URL", async () => {
  const html = await read("pages-dist/models/index.html");
  const versions = JSON.parse(await read("app/data/route-style-versions.json"));
  const version = hash(await read("pages-dist/route-styles/models.css"));
  const expected = `/route-styles/models.css?v=${version}`;
  assert.equal(versions.models, version);
  assert.ok(html.includes(`href="${expected}"`));
  const frameworkHtml = await read("build/local-preview/models-vinext.html");
  assert.ok(frameworkHtml.includes(`href="${expected}"`));
  const flight = flightFrom(frameworkHtml);
  assert.ok(flight.includes(`:HL["${expected}","style"]`), "preload hint uses the same bytes");
  assert.ok(flight.includes(`"href":"${expected}"`), "hydration props use the same bytes");
  const urls = [...flight.matchAll(/\/route-styles\/models\.css[^"\s]*/g)].map(m => m[0]);
  assert.ok(urls.length >= 2);
  assert.deepEqual([...new Set(urls)], [expected]);
});

test("all route stylesheet versions match both generated and exported bytes", async () => {
  const versions = JSON.parse(await read("app/data/route-style-versions.json"));
  assert.deepEqual(Object.keys(versions).sort(), ["about", "blog", "capabilities", "case-study", "credentials", "decisions", "home", "method", "models", "proof", "work"]);
  for (const [route, version] of Object.entries(versions)) {
    assert.equal(hash(await read(`public/route-styles/${route}.css`)), version);
    assert.equal(hash(await read(`pages-dist/route-styles/${route}.css`)), version);
  }
});

test("stylesheet content changes invalidate the pre-render identity deterministically", async t => {
  const dir = await mkdtemp(join(tmpdir(), "portfolio-route-identity-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, "public"));
  for (const file of sharedStylesheets) await writeFile(join(dir, "public", file), ".site-header{color:blue}");
  const first = await buildRouteStyles(dir);
  assert.deepEqual(await buildRouteStyles(dir), first);
  await writeFile(join(dir, "public", sharedStylesheets[0]), ".site-header{color:red}");
  const second = await buildRouteStyles(dir);
  assert.deepEqual(JSON.parse(await readFile(join(dir, "app/data/route-style-versions.json"), "utf8")), second);
  for (const route of Object.keys(first)) {
    assert.notEqual(second[route], first[route]);
    assert.equal(second[route], hash(await readFile(join(dir, "public/route-styles", `${route}.css`))));
  }
});
