import assert from "node:assert/strict";
import { lstat, rename } from "node:fs/promises";
import { resolve } from "node:path";

// Call only after the complete staged generation has passed readback validation.
// Backups stay in staging for recovery from interruption or rollback failure.
export async function promoteStagedPaths(staging, outputDirectory, paths, operations = {}) {
  const io = { lstat, rename, ...operations };
  const targets = paths.map(({ name, directory }) => {
    assert.match(name, /^[a-z][a-z0-9.-]*$/);
    return { target: resolve(outputDirectory, name), staged: resolve(staging, name), backup: resolve(staging, `previous-${name}`), directory };
  });
  assert.equal(new Set(targets.map((entry) => entry.target)).size, targets.length);
  for (const entry of targets) {
    try {
      const stat = await io.lstat(entry.target);
      assert.ok(!stat.isSymbolicLink() && (entry.directory ? stat.isDirectory() : stat.isFile()), "Output must be a regular file or directory.");
      entry.present = true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  try {
    for (const entry of targets) {
      if (entry.present) {
        await io.rename(entry.target, entry.backup);
        entry.saved = true;
      }
      await io.rename(entry.staged, entry.target);
      entry.installed = true;
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const entry of [...targets].reverse()) {
      try {
        if (entry.installed) await io.rename(entry.target, entry.staged);
        if (entry.saved) await io.rename(entry.backup, entry.target);
      } catch (rollbackError) { rollbackErrors.push(rollbackError); }
    }
    if (rollbackErrors.length) throw new AggregateError([error, ...rollbackErrors], `Generation promotion and rollback failed; accepted backups remain in ${staging}.`);
    throw error;
  }
}
