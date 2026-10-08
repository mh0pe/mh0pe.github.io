import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(process.argv[2] ?? resolve(root, "review/living-feature"));
await mkdir(output, { recursive: true });
const slugs = JSON.parse(await readFile(resolve(root, "app/data/blog-routes.json"), "utf8"));
const serveUrl = await bundle({ entryPoint: resolve(root, "remotion/index.ts"), outDir: resolve(output, "composition-bundle"), enableCaching: false,
  webpackOverride: config => ({ ...config, resolve: { ...config.resolve, alias: { ...config.resolve?.alias, "@": root } } }) });
const browser = await openBrowser("chrome", { browserExecutable: process.env.ARTICLE_RENDER_BROWSER });
const results = [];
try {
  for (const slug of slugs) {
    const composition = await selectComposition({ serveUrl, id: "Article-" + slug, puppeteerInstance: browser });
    for (const frame of [70, 430, 820]) {
      const target = resolve(output, slug + "-" + frame + ".png");
      await renderStill({ serveUrl, composition, frame, output: target, imageFormat: "png", puppeteerInstance: browser });
      results.push({ slug, frame, file: target });
      console.log(`${slug}: ${frame}`);
    }
  }
} finally { await browser.close({ silent: true }); }
const cells = [];
for (let row = 0; row < slugs.length; row++) {
  cells.push({ input: Buffer.from(`<svg width="1280" height="42"><rect width="1280" height="42" fill="#fff"/><text x="15" y="28" font-family="Arial" font-size="22" fill="#222">${slugs[row]}: opening / middle / ending</text></svg>`), top: row * 314, left: 0 });
  for (let col = 0; col < 3; col++) cells.push({ input: await sharp(resolve(output, slugs[row] + "-" + [70, 430, 820][col] + ".png")).resize(426, 266).png().toBuffer(), top: row * 314 + 42, left: col * 427 });
}
await sharp({ create: { width: 1280, height: slugs.length * 314, channels: 3, background: "#fff" } }).composite(cells).jpeg({ quality: 90 }).toFile(resolve(output, "article-scenes.jpg"));
await writeFile(resolve(output, "RENDERED.json"), JSON.stringify({ kind: "Remotion composition frames, not webpage screenshots", results }, null, 2));
