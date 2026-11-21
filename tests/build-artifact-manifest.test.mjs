import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { link, mkdtemp, mkdir, readFile, readdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildArtifactManifest } from "../tools/build-artifact-manifest.mjs";

const digest = (value) => createHash("sha256").update(value).digest("hex");

test("artifact manifest binds every regular export and excludes its own public copy deterministically", async () => {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-manifest-"));
  await mkdir(join(directory, "blog"));
  await writeFile(join(directory, "index.html"), "home");
  await writeFile(join(directory, "blog", "index.html"), "blog");
  const outputPath = join(directory, "release-manifest.json");
  const first = await buildArtifactManifest({ outputPath, rootDirectory: directory, sourceRevision: "abc123" });
  const firstBytes = await readFile(outputPath, "utf8");
  const second = await buildArtifactManifest({ outputPath, rootDirectory: directory, sourceRevision: "abc123" });
  const secondBytes = await readFile(outputPath, "utf8");

  assert.equal(first.fileCount, 2);
  assert.equal(first.selfExcludedPath, "release-manifest.json");
  assert.deepEqual(first.files.map((file) => file.path), ["blog/index.html", "index.html"]);
  assert.equal(first.files.find((file) => file.path === "index.html").sha256, digest("home"));
  assert.deepEqual(second, first);
  assert.equal(secondBytes, firstBytes);
});

test("artifact manifest fails closed on symbolic links", async () => {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-manifest-link-"));
  await writeFile(join(directory, "index.html"), "home");
  await symlink(join(directory, "index.html"), join(directory, "alias.html"));
  await assert.rejects(
    buildArtifactManifest({ outputPath: join(directory, "release-manifest.json"), rootDirectory: directory }),
    /symbolic link: alias\.html/,
  );
});

test("artifact manifest validates an existing excluded destination before writing it", async () => {
  const linkedDirectory = await mkdtemp(join(tmpdir(), "portfolio-manifest-destination-link-"));
  const linkedVictim = join(linkedDirectory, "victim.json");
  await writeFile(linkedVictim, "do not replace");
  await symlink(linkedVictim, join(linkedDirectory, "release-manifest.json"));
  await assert.rejects(
    buildArtifactManifest({ outputPath: join(linkedDirectory, "release-manifest.json"), rootDirectory: linkedDirectory }),
    /symbolic link: release-manifest\.json/,
  );
  assert.equal(await readFile(linkedVictim, "utf8"), "do not replace");

  const hardLinkedDirectory = await mkdtemp(join(tmpdir(), "portfolio-manifest-destination-hardlink-"));
  const hardLinkedVictim = join(hardLinkedDirectory, "victim.json");
  await writeFile(hardLinkedVictim, "do not replace");
  await link(hardLinkedVictim, join(hardLinkedDirectory, "release-manifest.json"));
  await assert.rejects(
    buildArtifactManifest({ outputPath: join(hardLinkedDirectory, "release-manifest.json"), rootDirectory: hardLinkedDirectory }),
    /Manifest destination is hard-linked: release-manifest\.json/,
  );
  assert.equal(await readFile(hardLinkedVictim, "utf8"), "do not replace");
});

test("artifact manifest uses locale-independent UTF-8 path order", async () => {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-manifest-unicode-"));
  const names = ["\ue000.html", "z.html", "😀.html", "é.html", "a.html"];
  await Promise.all(names.map((name) => writeFile(join(directory, name), name)));
  // Some filesystems decompose Unicode names. Preserve their exact spelling
  // while checking byte order, rather than imposing a normalization form.
  const expectedPaths = (await readdir(directory)).sort((left, right) =>
    Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8")),
  );
  const manifest = await buildArtifactManifest({
    outputPath: join(directory, "release-manifest.json"),
    rootDirectory: directory,
  });
  assert.deepEqual(manifest.files.map((file) => file.path), expectedPaths);
});
