import { lstat, mkdtemp, rename } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

// Validation runs against a complete private generation. The accepted directory
// is retained for rollback, including when promotion itself fails.
export async function stageAndPromoteDirectory(destination, build, operations = {}) {
  const io = { lstat, mkdtemp, rename, ...operations };
  const target = resolve(destination);
  const parent = dirname(target);
  let present = false;
  try {
    const stat = await io.lstat(target);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Output must be a real directory: " + target);
    present = true;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const staging = await io.mkdtemp(join(parent, "." + basename(target) + "-stage-"));
  const value = await build(staging);
  let previous = null;
  if (present) {
    const backup = await io.mkdtemp(join(parent, "." + basename(target) + "-previous-"));
    previous = join(backup, "artifact");
    await io.rename(target, previous);
  }
  try {
    await io.rename(staging, target);
  } catch (error) {
    if (previous) await io.rename(previous, target);
    throw error;
  }
  return { value, previous };
}
