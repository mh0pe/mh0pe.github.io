import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import sharp from "sharp";
import pages from "../app/data/social-pages.json" with { type: "json" };

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "public/social");
const review = resolve(root, "review/social");
const digest = data => createHash("sha256").update(data).digest("hex");
const sources = ["app/data/social-pages.json", "app/data/social.ts", "app/data/blog.ts", "app/data/article-motion.ts", "app/data/credentials.ts",
  "remotion/index.ts", "remotion/Root.tsx", "remotion/compositions/SocialCard.tsx", "app/components/blog/motion/StoryScene.tsx", "app/components/blog/motion/story-timing.ts",
  "app/components/blog/motion/miura-geometry.ts", "app/components/v3/LivingArchitecture.tsx", "public/fonts/newsreader-variable.woff2", "public/fonts/instrument-sans-variable.woff2", "tools/render-social-cards.mjs", "package-lock.json", "public/portraits/madison-outdoor-720.webp"];
const credentialSource = await readFile(resolve(root, "app/data/credentials.ts"), "utf8");
sources.push(...[...credentialSource.matchAll(/credential\(\s*"([a-z0-9-]+)"/g)].slice(0, 6).map(([, id]) => `public/credentials/${id}.webp`));
const inputs = await Promise.all(sources.map(async file => ({ file, sha256: digest(await readFile(resolve(root, file))) })));
const sourceHash = digest(JSON.stringify(inputs));
let previous;
try { previous = JSON.parse(await readFile(resolve(output, "manifest.json"), "utf8")); } catch { /* First render. */ }
if (!process.argv.includes("--force") && previous?.sourceHash === sourceHash && previous.cards?.length === 24) {
  const intact = await Promise.all(previous.cards.map(async card => {
    try { return digest(await readFile(resolve(output, card.file))) === card.sha256; } catch { return false; }
  }));
  if (intact.every(Boolean)) { console.log("Social previews: 24 verified cached cards"); process.exit(0); }
}
await mkdir(output, { recursive: true });
await mkdir(review, { recursive: true });
const serveUrl = await bundle({ entryPoint: resolve(root, "remotion/index.ts"), enableCaching: false,
  webpackOverride: config => ({ ...config, resolve: { ...config.resolve, alias: { ...config.resolve?.alias, "@": root } } }) });
const browser = await openBrowser("chrome", { browserExecutable: process.env.ARTICLE_RENDER_BROWSER });
const cards = [];
try {
  for (const page of pages.filter(page => !page.alias)) {
    const inputProps = { path: page.path };
    const composition = await selectComposition({ serveUrl, id: "SocialCard", inputProps, puppeteerInstance: browser });
    const { buffer } = await renderStill({ serveUrl, composition, inputProps, frame: 0, imageFormat: "png", puppeteerInstance: browser });
    if (!buffer) throw new Error("Missing social render: " + page.path);
    const bytes = await sharp(buffer).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    const decoded = await sharp(bytes).metadata();
    if (decoded.width !== 1200 || decoded.height !== 630 || bytes.length > 200000) throw new Error("Invalid social image: " + page.path);
    const file = page.image + ".jpg";
    await writeFile(resolve(output, file), bytes);
    cards.push({ path: page.path, file, art: page.art, title: page.title, alt: page.alt, width: decoded.width, height: decoded.height, bytes: bytes.length, sha256: digest(bytes) });
    console.log(`${page.path}: ${Math.round(bytes.length / 1024)} KB`);
  }
} finally { await browser.close({ silent: true }); }
const manifest = { kind: "Rendered static sharing graphics, not webpage screenshots", renderer: "Remotion 4.0.520", sourceHash, inputs, cards,
  aliases: pages.filter(page => page.alias).map(page => ({ path: page.path, canonical: page.alias })) };
await writeFile(resolve(output, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
for (const width of [400, 600]) {
  const height = Math.round(width * 630 / 1200);
  const cells = await Promise.all(cards.map(async (card, index) => ({ input: await sharp(resolve(output, card.file)).resize(width, height).toBuffer(), left: index % 3 * width, top: Math.floor(index / 3) * height })));
  await sharp({ create: { width: width * 3, height: height * Math.ceil(cards.length / 3), channels: 3, background: "white" } }).composite(cells).jpeg({ quality: 92 }).toFile(resolve(review, `contact-sheet-${width}.jpg`));
}
await writeFile(resolve(review, "RENDERED.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log("Social previews: 24 cards rendered, font-gated and overflow-checked");
