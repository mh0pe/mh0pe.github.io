import assert from "node:assert/strict";
import {test} from "node:test";
import {mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink, link, realpath, unlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {resolve} from "node:path";
import {publishProvenanceFiles} from "../tools/write-provenance-files.mjs";

async function fixture(t) {
  const root = await realpath(await mkdtemp(resolve(tmpdir(), "provenance-output-")));
  t.after(() => rm(root, {recursive: true, force: true}));
  return {root, files: ["proof.json", "basis.json"].map(name => ({path: resolve(root, name), bytes: Buffer.from(name)}))};
}
test("publishes both outputs exclusively without staging residue", async t => {
  const f = await fixture(t); await publishProvenanceFiles(f.files);
  assert.deepEqual((await readdir(f.root)).sort(), ["basis.json", "proof.json"]);
  for (const file of f.files) assert.deepEqual(await readFile(file.path), file.bytes);
});
for (const index of [0, 1]) test(`preexisting destination ${index + 1} leaves both original targets unchanged`, async t => {
  const f = await fixture(t); await writeFile(f.files[index].path, "original");
  await assert.rejects(publishProvenanceFiles(f.files));
  assert.deepEqual(await readdir(f.root), [index ? "basis.json" : "proof.json"]);
  assert.equal(await readFile(f.files[index].path, "utf8"), "original");
});
test("duplicate output targets fail before creating files", async t => {
  const f = await fixture(t); await assert.rejects(publishProvenanceFiles([f.files[0], f.files[0]]));
  assert.deepEqual(await readdir(f.root), []);
});
test("missing second parent fails before creating first output", async t => {
  const f = await fixture(t); f.files[1].path = resolve(f.root, "missing/basis.json");
  await assert.rejects(publishProvenanceFiles(f.files)); assert.deepEqual(await readdir(f.root), []);
});
test("dangling output symlink is not replaced", async t => {
  const f = await fixture(t); await symlink(resolve(f.root, "missing"), f.files[1].path);
  await assert.rejects(publishProvenanceFiles(f.files)); assert.deepEqual(await readdir(f.root), ["basis.json"]);
});
test("symlink output directory is rejected before staging", async t => {
  const f = await fixture(t); await mkdir(resolve(f.root, "real")); await symlink(resolve(f.root, "real"), resolve(f.root, "linked"));
  f.files[1].path = resolve(f.root, "linked/basis.json"); await assert.rejects(publishProvenanceFiles(f.files));
  assert.deepEqual((await readdir(f.root)).sort(), ["linked", "real"]); assert.deepEqual(await readdir(resolve(f.root, "real")), []);
});
test("failure publishing second file rolls back only the first file created here", async t => {
  const f = await fixture(t); let calls = 0;
  await assert.rejects(publishProvenanceFiles(f.files, {linkFile: async (source, target) => {
    if (++calls === 2) throw Object.assign(new Error("simulated unavailable target"), {code: "EACCES"});
    await link(source, target);
  }}));
  assert.equal(calls, 2); assert.deepEqual(await readdir(f.root), []);
});
test("concurrent second-target creation is preserved while first output rolls back", async t => {
  const f = await fixture(t); let calls = 0;
  await assert.rejects(publishProvenanceFiles(f.files, {linkFile: async (source, target) => {
    if (++calls === 2) await writeFile(target, "someone else's file", {flag: "wx"});
    await link(source, target);
  }}));
  assert.deepEqual(await readdir(f.root), ["basis.json"]); assert.equal(await readFile(f.files[1].path, "utf8"), "someone else's file");
});
test("ancestor symlink is rejected", async t => {
  const f = await fixture(t); await mkdir(resolve(f.root, "real/sub"), {recursive: true}); await symlink(resolve(f.root, "real"), resolve(f.root, "linked"));
  f.files[1].path = resolve(f.root, "linked/sub/basis.json"); await assert.rejects(publishProvenanceFiles(f.files));
  assert.deepEqual(await readdir(resolve(f.root, "real/sub")), []);
});
test("rollback does not remove a replacement belonging to another writer", async t => {
  const f = await fixture(t); let calls = 0;
  await assert.rejects(publishProvenanceFiles(f.files, {linkFile: async (source, target) => {
    if (++calls === 2) { await unlink(f.files[0].path); await writeFile(f.files[0].path, "replacement"); throw Error("second link failed"); }
    await link(source, target);
  }}));
  assert.equal(await readFile(f.files[0].path, "utf8"), "replacement");
  assert.deepEqual(await readdir(f.root), ["proof.json"]);
});
test("rollback cleanup failure reports retained files and still cleans all temporary files", async t => {
  const f = await fixture(t); let calls = 0;
  await assert.rejects(publishProvenanceFiles(f.files, {
    linkFile: async (source, target) => { if (++calls === 2) throw Error("second link failed"); await link(source, target); },
    unlinkFile: async path => { if (path === f.files[0].path) throw Object.assign(Error("denied"), {code: "EACCES"}); await unlink(path); },
  }), error => error.mayRetainFiles === true && /may remain/.test(error.message));
  assert.deepEqual(await readdir(f.root), ["proof.json"]);
});
test("temporary cleanup failure after publication rolls back outputs and attempts remaining cleanup", async t => {
  const f = await fixture(t); let blocked = null;
  await assert.rejects(publishProvenanceFiles(f.files, {unlinkFile: async path => {
    if (!blocked && path.endsWith(".tmp")) { blocked = path; throw Object.assign(Error("denied"), {code: "EACCES"}); }
    await unlink(path);
  }}), error => error.mayRetainFiles === true);
  assert.deepEqual(await readdir(f.root), [blocked.split("/").at(-1)]);
});
