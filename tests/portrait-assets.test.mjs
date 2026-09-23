import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = new URL("../", import.meta.url);

test("ships one responsive identity portrait with bounded local assets", async () => {
  const files = [
    "madison-outdoor-480.avif",
    "madison-outdoor-480.webp",
    "madison-outdoor-720.avif",
    "madison-outdoor-720.webp",
  ];
  let totalBytes = 0;

  assert.deepEqual(
    (await readdir(new URL("public/portraits/", root))).sort(),
    files,
    "the public portrait directory should not ship unreferenced derivatives",
  );

  for (const file of files) {
    const source = new URL(`public/portraits/${file}`, root);
    const [filesystem, image] = await Promise.all([
      stat(source),
      sharp(fileURLToPath(source)).metadata(),
    ]);
    totalBytes += filesystem.size;
    assert.ok(filesystem.size <= 64 * 1024, `${file} is ${filesystem.size} bytes`);
    assert.equal(image.width, file.includes("-480.") ? 480 : 720, file);
    assert.equal(image.height, file.includes("-480.") ? 640 : 960, file);
    assert.equal(image.format, file.endsWith(".avif") ? "heif" : "webp", file);
  }

  assert.ok(totalBytes <= 160 * 1024, `identity portrait assets total ${totalBytes} bytes`);

  const source = await readFile(new URL("app/components/v3/AboutPortrait.tsx", root), "utf8");
  assert.match(source, /type="image\/avif"/);
  assert.match(source, /type="image\/webp"/);
  assert.match(source, /alt="Portrait of Madison Hope Steiner"/);
  assert.match(source, /loading="eager"/);
  assert.match(source, /fetchPriority="high"/);
  assert.match(source, /data-motion-once/);
  assert.match(source, /focusable="false"/);
  assert.equal(
    (
      source.match(
        /sizes="\(max-width: 25rem\) 8\.5rem, \(max-width: 29\.5rem\) 34vw, \(max-width: 48rem\) 10rem, \(max-width: 68rem\) 18rem, 22\.5rem"/g,
      ) ?? []
    ).length,
    3,
  );
  assert.doesNotMatch(source, /imgur\.com/i);

  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  assert.match(layout, /image: `\$\{canonicalUrl\}portraits\/madison-outdoor-720\.webp`/);

  const exported = await readFile(new URL("pages-dist/about/index.html", root), "utf8");
  for (const file of files) {
    await stat(new URL(`pages-dist/portraits/${file}`, root));
    assert.match(exported, new RegExp(`/portraits/${file.replace(".", "\\.")}`));
  }
});
