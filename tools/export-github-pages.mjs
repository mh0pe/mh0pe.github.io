import {
  access,
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const EXPECTED_ORIGIN = "https://mh0pe.github.io";
const toolsDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(toolsDirectory, "..");
const serverEntry = resolve(projectRoot, "dist/server/index.js");
const clientDirectory = resolve(projectRoot, "dist/client");
const outputDirectory = resolve(projectRoot, "pages-dist");

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? EXPECTED_ORIGIN;
  const parsed = new URL(configured);

  invariant(
    parsed.origin === EXPECTED_ORIGIN &&
      (parsed.pathname === "/" || parsed.pathname === "") &&
      parsed.search === "" &&
      parsed.hash === "",
    `NEXT_PUBLIC_SITE_URL must be exactly ${EXPECTED_ORIGIN}`,
  );

  process.env.NEXT_PUBLIC_SITE_URL = EXPECTED_ORIGIN;
}

function validateOutputTarget() {
  invariant(
    dirname(outputDirectory) === projectRoot &&
      outputDirectory === resolve(projectRoot, "pages-dist"),
    "Refusing to replace an output directory outside this project.",
  );
}

async function assertRegularTree(directory, label) {
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const path = resolve(current, entry.name);
      const metadata = await lstat(path);
      const display = relative(projectRoot, path);

      invariant(
        !metadata.isSymbolicLink(),
        `${label} contains a symbolic link: ${display}`,
      );
      invariant(
        !metadata.isFile() || metadata.nlink === 1,
        `${label} contains a hard-linked file: ${display}`,
      );

      if (metadata.isDirectory()) {
        await visit(path);
      }
    }
  }

  await visit(directory);
}

function shouldCopyClientAsset(source) {
  const path = relative(clientDirectory, source);
  if (!path) {
    return true;
  }

  const parts = path.split(sep);
  const name = parts.at(-1);
  const isSupersededLogoSource =
    parts[0] === "logos" &&
    (parts[1] === "normalized" || name?.endsWith(".jpg"));

  return (
    !parts.includes(".vite") &&
    name !== "_headers" &&
    name !== ".assetsignore" &&
    path !== "og-v2.png" &&
    !isSupersededLogoSource
  );
}

async function render(worker, pathname, expectedStatus) {
  const response = await worker.fetch(
    new Request(new URL(pathname, EXPECTED_ORIGIN), {
      headers: {
        accept: "text/html",
        host: "mh0pe.github.io",
        "x-forwarded-host": "mh0pe.github.io",
        "x-forwarded-proto": "https",
      },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
      IMAGES: {
        input() {
          throw new Error(
            "Static export cannot use the Worker image optimizer.",
          );
        },
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  invariant(
    response.status === expectedStatus,
    `${pathname} rendered with ${response.status}; expected ${expectedStatus}.`,
  );
  invariant(
    /^text\/html\b/i.test(response.headers.get("content-type") ?? ""),
    `${pathname} did not render an HTML response.`,
  );

  return response.text();
}

function htmlTags(html, name) {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? [];
}

function attribute(tag, name) {
  const match = tag.match(
    new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`, "i"),
  );
  const value = match?.[1] ?? match?.[2] ?? null;
  if (value === null) {
    return null;
  }

  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    )
    .replace(/&#([0-9]+);/g, (_, codePoint) =>
      String.fromCodePoint(Number.parseInt(codePoint, 10)),
    )
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function hasTag(html, name, attributes) {
  return htmlTags(html, name).some((tag) =>
    Object.entries(attributes).every(
      ([key, value]) => attribute(tag, key) === value,
    ),
  );
}

function validateIndexHtml(html) {
  invariant(
    /<!doctype html>/i.test(html),
    "The root export is not a complete HTML document.",
  );
  invariant(
    /self\.__VINEXT_RSC_DONE__\s*=\s*true/.test(html),
    "The Vinext RSC stream did not finish before export.",
  );
  invariant(
    /import\(["']\/assets\/index-[A-Za-z0-9_-]+\.js["']\)/.test(html),
    "The browser hydration entry is missing from the root document.",
  );
  invariant(
    hasTag(html, "link", {
      rel: "canonical",
      href: `${EXPECTED_ORIGIN}/`,
    }),
    "The canonical URL does not point to the production origin.",
  );
  invariant(
    hasTag(html, "meta", {
      property: "og:url",
      content: EXPECTED_ORIGIN,
    }) ||
      hasTag(html, "meta", {
        property: "og:url",
        content: `${EXPECTED_ORIGIN}/`,
      }),
    "The Open Graph URL does not point to the production origin.",
  );
  invariant(
    hasTag(html, "meta", {
      property: "og:image",
      content: `${EXPECTED_ORIGIN}/og-v3.jpg`,
    }),
    "The Open Graph image is missing or has the wrong origin.",
  );
  invariant(
    hasTag(html, "meta", {
      name: "twitter:image",
      content: `${EXPECTED_ORIGIN}/og-v3.jpg`,
    }),
    "The Twitter image is missing or has the wrong origin.",
  );
  invariant(
    hasTag(html, "meta", {
      "http-equiv": "Content-Security-Policy",
      content:
        "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; img-src 'self' data:; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    }),
    "The static document is missing its fallback content security policy.",
  );
  invariant(!/localhost|127\.0\.0\.1/i.test(html), "Local URLs leaked into HTML.");
  invariant(
    !/\/_vinext\/image\b/.test(html),
    "The export depends on the Worker image optimizer.",
  );
}

function decodeReference(value) {
  return value.replaceAll("&amp;", "&").trim();
}

function localArtifactPath(reference, baseFile = "index.html") {
  const decoded = decodeReference(reference);
  if (
    !decoded ||
    decoded.startsWith("#") ||
    /^(?:data|blob|mailto|tel|javascript):/i.test(decoded) ||
    decoded.startsWith("//")
  ) {
    return null;
  }

  let pathname;
  if (/^https?:/i.test(decoded)) {
    const absolute = new URL(decoded);
    if (absolute.origin !== EXPECTED_ORIGIN) {
      return null;
    }
    pathname = absolute.pathname;
  } else if (decoded.startsWith("/")) {
    pathname = new URL(decoded, EXPECTED_ORIGIN).pathname;
  } else {
    const baseDirectory = posix.dirname(baseFile);
    pathname = posix.join("/", baseDirectory, decoded.split(/[?#]/, 1)[0]);
  }

  const normalized = posix.normalize(decodeURIComponent(pathname));
  invariant(
    normalized.startsWith("/") && !normalized.startsWith("/../"),
    `Asset reference escapes the public artifact: ${reference}`,
  );

  if (normalized === "/") {
    return null;
  }

  return normalized.endsWith("/")
    ? `${normalized.slice(1)}index.html`
    : normalized.slice(1);
}

function htmlReferences(html) {
  const references = [];
  const attributePattern = /\b(?:href|src)=["']([^"']+)["']/gi;
  const sourceSetPattern = /\b(?:srcset|imagesrcset)=["']([^"']+)["']/gi;

  for (const match of html.matchAll(attributePattern)) {
    references.push(match[1]);
  }
  for (const match of html.matchAll(sourceSetPattern)) {
    for (const candidate of match[1].split(",")) {
      const reference = candidate.trim().split(/\s+/, 1)[0];
      if (reference) {
        references.push(reference);
      }
    }
  }

  return references;
}

async function collectFiles(directory, extension = null) {
  const files = [];

  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (!extension || entry.name.endsWith(extension)) {
        files.push(path);
      }
    }
  }

  await visit(directory);
  return files;
}

async function assertArtifactReference(reference, baseFile) {
  const path = localArtifactPath(reference, baseFile);
  if (!path) {
    return;
  }

  try {
    await access(resolve(outputDirectory, path));
  } catch {
    throw new Error(`${baseFile} references a missing asset: ${reference}`);
  }
}

async function validateArtifactReferences(indexHtml, notFoundHtml) {
  for (const reference of [
    ...htmlReferences(indexHtml),
    ...htmlReferences(notFoundHtml),
  ]) {
    await assertArtifactReference(reference, "index.html");
  }

  const hydrationEntry = indexHtml.match(
    /import\(["'](\/assets\/index-[A-Za-z0-9_-]+\.js)["']\)/,
  )?.[1];
  invariant(hydrationEntry, "Unable to locate the hydration entry.");
  await assertArtifactReference(hydrationEntry, "index.html");

  for (const stylesheet of await collectFiles(outputDirectory, ".css")) {
    const relativeStylesheet = relative(outputDirectory, stylesheet).split(sep).join("/");
    const source = await readFile(stylesheet, "utf8");
    for (const match of source.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)) {
      await assertArtifactReference(match[2], relativeStylesheet);
    }
  }
}

async function validateArtifactSurface() {
  const forbidden = [
    resolve(outputDirectory, "server"),
    resolve(outputDirectory, ".vite"),
    resolve(outputDirectory, "_headers"),
    resolve(outputDirectory, ".assetsignore"),
    resolve(outputDirectory, "og-v2.png"),
    resolve(outputDirectory, "logos/normalized"),
  ];

  for (const path of forbidden) {
    try {
      await access(path);
      throw new Error(
        `The public artifact contains build-only content: ${relative(projectRoot, path)}`,
      );
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }
}

async function main() {
  validateOrigin();
  validateOutputTarget();
  await Promise.all([access(serverEntry), access(clientDirectory)]);
  await assertRegularTree(clientDirectory, "Vinext client output");

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await cp(clientDirectory, outputDirectory, {
    recursive: true,
    filter: shouldCopyClientAsset,
  });

  const workerUrl = pathToFileURL(serverEntry);
  workerUrl.searchParams.set("github-pages-export", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const [indexHtml, notFoundHtml] = await Promise.all([
    render(worker, "/", 200),
    render(worker, "/__github-pages_not_found__", 404),
  ]);

  validateIndexHtml(indexHtml);
  invariant(
    /Page not found|This path does not exist/i.test(notFoundHtml),
    "The 404 export does not contain the recovery page.",
  );
  invariant(
    /<a href="\/">[\s\S]*Return to portfolio[\s\S]*<\/a>/i.test(notFoundHtml),
    "The 404 recovery link must force a full document navigation.",
  );

  await Promise.all([
    writeFile(resolve(outputDirectory, "index.html"), indexHtml, "utf8"),
    writeFile(resolve(outputDirectory, "404.html"), notFoundHtml, "utf8"),
  ]);

  await validateArtifactSurface();
  await validateArtifactReferences(indexHtml, notFoundHtml);
  await assertRegularTree(outputDirectory, "GitHub Pages artifact");

  const files = await collectFiles(outputDirectory);
  process.stdout.write(
    `${JSON.stringify(
      {
        origin: EXPECTED_ORIGIN,
        output: relative(projectRoot, outputDirectory),
        files: files.length,
        indexBytes: Buffer.byteLength(indexHtml),
        notFoundBytes: Buffer.byteLength(notFoundHtml),
      },
      null,
      2,
    )}\n`,
  );
}

await main();
