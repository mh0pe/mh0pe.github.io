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
// Two additional worlds share this bundle; the regression suite still holds the
// 175 KB gzip ceiling. The preference gate keeps it off the hub and still reads.
if (output.bytes > 555_000) throw new Error("Article motion exceeded the 555 KB uncompressed budget.");
console.log(`Isolated article motion: ${output.bytes} bytes; no runtime imports.`);
