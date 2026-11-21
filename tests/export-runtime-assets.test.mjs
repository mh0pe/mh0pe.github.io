import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createRuntimeAssetPinner } from "../tools/export-runtime-assets.mjs";
import { stageAndPromoteDirectory } from "../tools/staged-directory.mjs";

const digest = (value) => createHash("sha256").update(value).digest("hex");
async function temporary(t) {
  const dir = await mkdtemp(join(tmpdir(), "portfolio-export-fixture-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test("an exported page binds controller, lazy player and styles to their final bytes", async (t) => {
  const dir = await temporary(t);
  await Promise.all([writeFile(join(dir, "controller.js"), "controller"), writeFile(join(dir, "player.js"), "player"), writeFile(join(dir, "style.css"), "style")]);
  const original = '<link rel="stylesheet" href="/style.css?v=old&amp;theme=1"><script src="/controller.js?v=old" defer></script><article data-story-runtime="/player.js">story</article>';
  const result = await createRuntimeAssetPinner(dir)(original);
  assert.ok(result.includes('/style.css?v=' + digest("style") + '&amp;theme=1'));
  assert.ok(result.includes('/controller.js?v=' + digest("controller")));
  assert.ok(result.includes('data-story-runtime="/player.js?v=' + digest("player") + '"'));
  assert.equal(await createRuntimeAssetPinner(dir)(result), result);
  await writeFile(join(dir, "player.js"), "repaired player");
  const updated = await createRuntimeAssetPinner(dir)(original);
  assert.notEqual(updated, result);
  assert.ok(updated.includes('/player.js?v=' + digest("repaired player")));
  assert.ok(updated.includes('/controller.js?v=' + digest("controller")));
});

test("asset pinning leaves external and non-runtime links unchanged and fails on missing assets", async (t) => {
  const dir = await temporary(t);
  const html = '<link href="https://example.com/style.css"><script src="//example.com/a.js"></script><link href="/portrait.avif"><article data-story-runtime="/missing.js"></article>';
  await assert.rejects(createRuntimeAssetPinner(dir)(html), { code: "ENOENT" });
  assert.equal(await createRuntimeAssetPinner(dir)(html.replace('<article data-story-runtime="/missing.js"></article>', "")), html.replace('<article data-story-runtime="/missing.js"></article>', ""));
});

test("bundled module preloads retain the same identity as their imports", async (t) => {
  const dir = await temporary(t);
  const html = '<link rel="modulepreload" href="/assets/index-BjJ52tji.js"><link rel="stylesheet" href="/assets/index-Abc12345.css"><script type="module">import("/assets/index-BjJ52tji.js")</script>';
  assert.equal(await createRuntimeAssetPinner(dir)(html), html);
});

test("route styles must already have their final identity before HTML export", async (t) => {
  const dir = await temporary(t);
  await mkdir(join(dir, "route-styles"));
  const css = ".attribution-empty{color:blue}";
  await writeFile(join(dir, "route-styles/models.css"), css);
  const valid = `<link rel="stylesheet" href="/route-styles/models.css?v=${digest(css)}">`;
  assert.equal(await createRuntimeAssetPinner(dir)(valid), valid);
  await assert.rejects(createRuntimeAssetPinner(dir)('<link rel="stylesheet" href="/route-styles/models.%63ss?v=old">'), /identity differs from final bytes/);
  for (const href of ["/route-styles/models.css", "/route-styles/models.css?v=20261003-loading", `/route-styles/models.css?v=${"0".repeat(64)}`, `/route-styles/models.css?v=${digest(css)}&amp;v=old`, `/route-styles/models.css?v=${digest(css)}&amp;theme=1`, `/route-styles/models.css?v=${digest(css)}#fragment`, `/route%2Dstyles/models.css?v=${digest(css)}`]) {
    await assert.rejects(createRuntimeAssetPinner(dir)(`<link rel="stylesheet" href="${href}">`), /identity differs from final bytes/);
  }
  await writeFile(join(dir, "route-styles/models.css"), css + ".site-header{color:red}");
  await assert.rejects(createRuntimeAssetPinner(dir)(valid), /identity differs from final bytes/);
});

test("a failed render leaves the accepted artifact unchanged", async (t) => {
  const dir = await temporary(t);
  const target = join(dir, "pages");
  await mkdir(target);
  await writeFile(join(target, "index.html"), "accepted");
  await assert.rejects(stageAndPromoteDirectory(target, async (staging) => {
    await writeFile(join(staging, "index.html"), "incomplete");
    throw new Error("fixture render failure");
  }), /fixture render failure/);
  assert.equal(await readFile(join(target, "index.html"), "utf8"), "accepted");
});

test("successful promotion retains the accepted predecessor", async (t) => {
  const dir = await temporary(t);
  const target = join(dir, "pages");
  await mkdir(target);
  await writeFile(join(target, "index.html"), "accepted");
  const result = await stageAndPromoteDirectory(target, async (staging) => {
    await writeFile(join(staging, "index.html"), "validated");
    return { files: 1 };
  });
  assert.equal(await readFile(join(target, "index.html"), "utf8"), "validated");
  assert.equal(await readFile(join(result.previous, "index.html"), "utf8"), "accepted");
  assert.deepEqual(result.value, { files: 1 });
});

test("failed promotion restores the accepted directory", async (t) => {
  const dir = await temporary(t);
  const target = join(dir, "pages");
  await mkdir(target);
  await writeFile(join(target, "index.html"), "accepted");
  await assert.rejects(stageAndPromoteDirectory(target, async (staging) => {
    await writeFile(join(staging, "index.html"), "validated");
  }, {
    rename: async (from, to) => {
      if (from.includes("-stage-")) throw new Error("fixture promotion failure");
      return rename(from, to);
    },
  }), /fixture promotion failure/);
  assert.equal(await readFile(join(target, "index.html"), "utf8"), "accepted");
});
