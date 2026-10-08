import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const result = await build({
  absWorkingDir: root,
  entryPoints: [resolve(root, "app/components/blog/motion/player-entry.tsx")],
  outfile: resolve(root, "public/article-motion.js"), bundle: true, format: "iife",
  platform: "browser", target: ["es2020"], minify: true, legalComments: "eof", metafile: true,
  define: { "process.env.NODE_ENV": '"production"' },
  tsconfig: resolve(root, "tsconfig.json"),
});
await mkdir(resolve(root, "build/local-preview"), { recursive: true });
await writeFile(resolve(root, "build/local-preview/article-motion-metafile.json"), JSON.stringify(result.metafile, null, 2));
const output = Object.values(result.metafile.outputs)[0];
// React DOM and the real Remotion Player dominate this one shared bundle. The
// smaller preference gate keeps it off the hub and all static-preference reads.
if (output.bytes > 550_000) throw new Error("Article motion exceeded the 550 KB uncompressed budget.");
console.log(`Isolated article motion: ${output.bytes} bytes; no runtime imports.`);
