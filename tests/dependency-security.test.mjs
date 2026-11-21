import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
import sourceMap from "source-map-js";

const root = new URL("../", import.meta.url);
const lock = JSON.parse(await readFile(new URL("package-lock.json", root), "utf8"));
const reviewedVersions = {next: "16.4.2", vite: "8.1.6", sharp: "0.35.5", "source-map-js": "1.2.2"};
const requireReviewedVersion = (name, version) => {
  assert.ok(Object.hasOwn(reviewedVersions, name), `Unreviewed dependency: ${name}`);
  assert.equal(version, reviewedVersions[name], `Unreviewed dependency version: ${name}@${version}`);
};

for (const name of Object.keys(reviewedVersions)) {
  test(`every resolved and installed ${name} copy includes the reviewed security fixes`, async () => {
    const copies = Object.entries(lock.packages).filter(([path]) => path.endsWith("/node_modules/" + name) || path === "node_modules/" + name);
    assert.ok(copies.length);
    for (const [path, item] of copies) {
      requireReviewedVersion(name, item.version);
      const installed = JSON.parse(await readFile(new URL(`${path}/package.json`, root), "utf8"));
      assert.equal(installed.version, item.version, `Installed dependency diverges from lock: ${path}`);
      assert.ok(item.integrity?.startsWith("sha512-"));
      assert.ok(item.resolved?.startsWith("https://registry.npmjs.org/"));
    }
  });
}

test("security version checks do not admit unreviewed release branches", () => {
  requireReviewedVersion("next", "16.4.2");
  for (const version of ["16.3.8", "16.4.0", "16.4.1", "16.5.0", "17.0.0", "16.4.2-beta.1"]) {
    assert.throws(() => requireReviewedVersion("next", version), /Unreviewed dependency version/);
  }
  requireReviewedVersion("vite", "8.1.6");
  for (const version of ["8.1.5", "8.2.3", "8.3.2", "9.0.0", "8.1.6-beta.1"]) {
    assert.throws(() => requireReviewedVersion("vite", version), /Unreviewed dependency version/);
  }
});

test("indexed source maps reject unsafe section offsets before walking code", () => {
  const map = {version: 3, sources: ["source.js"], sourcesContent: ["four"], names: [], mappings: "AAAA"};
  for (const line of [1e12, -1, 0.5, Infinity, NaN]) {
    assert.throws(() => new sourceMap.SourceMapConsumer({version: 3, sections: [{offset: {line, column: 0}, map}]}), /offset/i);
  }
  const consumer = new sourceMap.SourceMapConsumer({version: 3, sections: [{offset: {line: 3, column: 0}, map}]});
  const result = sourceMap.SourceNode.fromStringWithSourceMap("one\ntwo\nthree\nfour", consumer).toString();
  assert.equal(result, "one\ntwo\nthree\nfour");
});

test("real Sharp native pipeline decodes SVG, PNG, JPEG and WebP", async () => {
  assert.equal(sharp.versions.sharp, "0.35.5");
  assert.ok(sharp.versions.vips && sharp.versions.rsvg, "Native image libraries must be loaded");
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32"><rect width="64" height="32" fill="#245c4f"/></svg>');
  const png = await sharp(svg).png().toBuffer();
  const jpeg = await sharp(png).jpeg({quality: 90, mozjpeg: true}).toBuffer();
  const webp = await sharp(jpeg).webp().toBuffer();
  for (const bytes of [svg, png, jpeg, webp]) {
    const resized = await sharp(bytes).resize(32, 16).png().toBuffer();
    const metadata = await sharp(resized).metadata();
    assert.deepEqual([metadata.width, metadata.height, metadata.format], [32, 16, "png"]);
  }
  await assert.rejects(sharp(Buffer.from("not an image")).png().toBuffer(), /unsupported image format/i);
});
