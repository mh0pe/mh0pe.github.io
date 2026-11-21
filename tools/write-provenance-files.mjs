import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {lstat, open, link, unlink} from "node:fs/promises";
import {dirname, resolve} from "node:path";

async function absent(path) {
  try { await lstat(path); }
  catch (error) { if (error.code === "ENOENT") return; throw error; }
  throw new Error("Output already exists");
}

// Exclusive publication with failure rollback, not a cross-directory crash
// transaction. Existing targets are never replaced or removed.
export async function publishProvenanceFiles(files, {linkFile = link, unlinkFile = unlink, statFile = lstat} = {}) {
  const items = files.map(file => ({...file, path: resolve(file.path)}));
  assert.ok(items.length > 0 && new Set(items.map(file => file.path)).size === items.length);
  for (const item of items) {
    assert.ok(Buffer.isBuffer(item.bytes));
    let parentPath = dirname(item.path);
    for (;;) {
      const parent = await lstat(parentPath);
      assert.ok(parent.isDirectory() && !parent.isSymbolicLink());
      const next = dirname(parentPath); if (next === parentPath) break; parentPath = next;
    }
    await absent(item.path);
  }
  const staged = [], installed = [], cleanupErrors = [];
  let failure = null;
  async function rollback() {
    for (const item of [...installed].reverse()) {
      try {
        const current = await statFile(item.path);
        if (current.ino === item.identity.ino && current.dev === item.identity.dev) await unlinkFile(item.path);
      } catch (error) { if (error.code !== "ENOENT") cleanupErrors.push(error); }
    }
  }
  try {
    for (const item of items) {
      const temporary = resolve(dirname(item.path), `.provenance-${randomUUID()}.tmp`);
      const handle = await open(temporary, "wx", 0o600);
      staged.push(temporary);
      try { await handle.writeFile(item.bytes); await handle.sync(); item.identity = await handle.stat(); }
      finally { await handle.close(); }
      item.temporary = temporary;
    }
    for (const item of items) { await linkFile(item.temporary, item.path); installed.push(item); }
  } catch (error) { failure = error; }
  if (failure) await rollback();
  for (const path of staged) {
    try { await unlinkFile(path); }
    catch (error) { if (error.code !== "ENOENT") cleanupErrors.push(error); }
  }
  if (!failure && cleanupErrors.length) await rollback();
  if (failure || cleanupErrors.length) throw Object.assign(new Error(cleanupErrors.length
    ? "Provenance publication failed; some output or temporary files may remain."
    : "Provenance publication failed; created outputs were rolled back."), {mayRetainFiles: cleanupErrors.length > 0});
}
