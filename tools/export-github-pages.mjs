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
const NOT_FOUND_TITLE = "Page not found | Madison Hope Steiner";
const NOT_FOUND_DESCRIPTION =
  "The requested path does not exist. Continue through Madison Hope Steiner's open-source systems work or public GitHub profiles.";
const routeManifest = [
  { pathname: "/", output: "index.html" },
  { pathname: "/work", output: "work/index.html" },
  {
    pathname: "/work/automated-security-helper",
    output: "work/automated-security-helper/index.html",
  },
  {
    pathname: "/work/cloudformation-guard",
    output: "work/cloudformation-guard/index.html",
  },
  { pathname: "/work/nix-windows", output: "work/nix-windows/index.html" },
  { pathname: "/work/agent-systems", output: "work/agent-systems/index.html" },
  { pathname: "/proof", output: "proof/index.html" },
  { pathname: "/about", output: "about/index.html" },
  { pathname: "/credentials", output: "credentials/index.html" },
  { pathname: "/decisions", output: "decisions/index.html" },
  { pathname: "/method", output: "method/index.html" },
  { pathname: "/capabilities", output: "capabilities/index.html" },
  { pathname: "/models", output: "models/index.html", hydrate: true },
  {
    pathname: "/evidence",
    output: "evidence/index.html",
    canonicalPath: "/proof/",
  },
  { pathname: "/career", output: "career/index.html", canonicalPath: "/about/" },
];

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
  const retiredClientPrefixes = [
    "ActiveNav-",
    "ContributionCardPlayer-",
    "ContributionConstellation-",
    "HeroSignalGraphic-",
    "ProjectConstellationBackdrop-",
    "graph-loaders-",
    "lineage-focus-",
    "scroll-activity-",
    "use-reduced-motion-",
  ];
  const isRetiredClientAsset =
    parts[0] === "assets" &&
    retiredClientPrefixes.some((prefix) => name?.startsWith(prefix));

  return (
    !parts.includes(".vite") &&
    name !== "_headers" &&
    name !== ".assetsignore" &&
    path !== "og-v2.png" &&
    path !== "portfolio.css" &&
    !isRetiredClientAsset &&
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

function stripVinextRuntime(html) {
  return html
    .replace(/<link\b[^>]*>/gi, (tag) =>
      attribute(tag, "rel")?.toLowerCase() === "modulepreload" ? "" : tag,
    )
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (tag) => {
      const type = attribute(tag, "type")?.toLowerCase();
      const runtime = attribute(tag, "data-static-runtime");
      const src = attribute(tag, "src");
      const isStaticRuntime =
        (runtime === "theme-bootstrap" && src === null) ||
        (runtime === "theme" && src?.startsWith("/theme.js?") === true) ||
        (runtime === "interactions" && src?.startsWith("/interactions.js?") === true);
      return type === "application/ld+json" || isStaticRuntime ? tag : "";
    });
}

function escapeHtmlAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function metadataIdentity(key) {
  const separator = key.indexOf(":");
  return [key.slice(0, separator), key.slice(separator + 1)];
}

function normalizeNotFoundMetadata(html) {
  const metadata = new Map([
    ["name:robots", "noindex, follow"],
    ["name:description", NOT_FOUND_DESCRIPTION],
    ["property:og:title", NOT_FOUND_TITLE],
    ["property:og:description", NOT_FOUND_DESCRIPTION],
    ["name:twitter:title", NOT_FOUND_TITLE],
    ["name:twitter:description", NOT_FOUND_DESCRIPTION],
  ]);
  const seen = new Set();
  let normalized = stripVinextRuntime(html)
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<link\b[^>]*>/gi, (tag) =>
      attribute(tag, "rel")?.toLowerCase() === "canonical" ? "" : tag,
    )
    .replace(/<meta\b[^>]*>/gi, (tag) => {
      const name = attribute(tag, "name")?.toLowerCase();
      const property = attribute(tag, "property")?.toLowerCase();

      if (property === "og:url") {
        return "";
      }

      const key = name ? `name:${name}` : property ? `property:${property}` : null;
      const content = key ? metadata.get(key) : null;
      if (!key || content === undefined) {
        return tag;
      }
      if (seen.has(key)) {
        return "";
      }

      seen.add(key);
      const [attributeName, attributeValue] = metadataIdentity(key);
      return `<meta ${attributeName}="${attributeValue}" content="${escapeHtmlAttribute(content)}"/>`;
    });

  const missingMetadata = [...metadata.entries()]
    .filter(([key]) => !seen.has(key))
    .map(([key, content]) => {
      const [attributeName, attributeValue] = metadataIdentity(key);
      return `<meta ${attributeName}="${attributeValue}" content="${escapeHtmlAttribute(content)}"/>`;
    })
    .join("");

  return normalized.replace(
    /<\/head>/i,
    `${missingMetadata}<title>${NOT_FOUND_TITLE}</title></head>`,
  );
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

function validateRouteHtml(html, pathname, declaredCanonicalPath) {
  const canonicalPath =
    declaredCanonicalPath ?? (pathname === "/" ? "/" : `${pathname}/`);
  invariant(
    /<!doctype html>/i.test(html),
    `${pathname} is not a complete HTML document.`,
  );
  invariant(
    /self\.__VINEXT_RSC_DONE__\s*=\s*true/.test(html),
    `${pathname} did not finish its Vinext RSC stream.`,
  );
  invariant(
    hasTag(html, "link", {
      rel: "canonical",
      href: new URL(canonicalPath, EXPECTED_ORIGIN).toString(),
    }),
    `${pathname} is missing its production canonical URL.`,
  );
  invariant(!/localhost|127\.0\.0\.1/i.test(html), `${pathname} contains a local URL.`);
  invariant(
    !/\/_vinext\/image\b/.test(html),
    `${pathname} depends on the Worker image optimizer.`,
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
  const attributePattern = /\b(?:href|src|data-src)=["']([^"']+)["']/gi;
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

async function validateArtifactReferences(documents) {
  for (const document of documents) {
    for (const reference of htmlReferences(document.html)) {
      await assertArtifactReference(reference, document.output);
    }
  }

  const hydratedDocuments = documents.filter((document) => document.hydrate);
  invariant(hydratedDocuments.length > 0, "The route manifest has no hydrated document.");
  for (const document of hydratedDocuments) {
    const hydrationEntry = document.html.match(
      /import\(["'](\/assets\/index-[A-Za-z0-9_-]+\.js)["']\)/,
    )?.[1];
    invariant(
      hydrationEntry,
      `Unable to locate the hydrated route entry for ${document.output}.`,
    );
    await assertArtifactReference(hydrationEntry, document.output);
  }

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
    resolve(outputDirectory, "portfolio.css"),
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

  const [routeHtml, notFoundHtml] = await Promise.all([
    Promise.all(
      routeManifest.map(async (route) => ({
        ...route,
        html: await render(worker, route.pathname, 200),
      })),
    ),
    render(worker, "/__github-pages_not_found__", 404),
  ]);

  const indexHtml = routeHtml.find((route) => route.pathname === "/")?.html;
  invariant(indexHtml, "The root route did not render.");

  validateIndexHtml(indexHtml);
  for (const route of routeHtml) {
    validateRouteHtml(route.html, route.pathname, route.canonicalPath);
  }
  invariant(
    hasTag(notFoundHtml, "div", { class: "not-found__shell" }),
    "The 404 export does not contain the semantic recovery shell.",
  );
  invariant(
    hasTag(notFoundHtml, "a", {
      class: "not-found__route",
      href: "/",
    }),
    "The 404 recovery link must force a full document navigation.",
  );

  const exportedRouteHtml = routeHtml.map((route) => ({
    ...route,
    html: route.hydrate ? route.html : stripVinextRuntime(route.html),
  }));
  const exportedNotFoundHtml = normalizeNotFoundMetadata(notFoundHtml);
  invariant(
    htmlTags(exportedNotFoundHtml, "title").length === 1 &&
      exportedNotFoundHtml.includes(`<title>${NOT_FOUND_TITLE}</title>`),
    "The static 404 document must have one exact title.",
  );
  invariant(
    hasTag(exportedNotFoundHtml, "meta", {
      name: "robots",
      content: "noindex, follow",
    }),
    "The static 404 document must remain excluded from search results.",
  );
  invariant(
    !htmlTags(exportedNotFoundHtml, "link").some(
      (tag) => attribute(tag, "rel")?.toLowerCase() === "canonical",
    ),
    "The static 404 document must not claim another page as canonical.",
  );
  const exportedIndexHtml = exportedRouteHtml.find(
    (route) => route.pathname === "/",
  )?.html;
  invariant(exportedIndexHtml, "The static root route did not render.");

  await Promise.all([
    ...exportedRouteHtml.map(async (route) => {
      const target = resolve(outputDirectory, route.output);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, route.html, "utf8");
    }),
    writeFile(resolve(outputDirectory, "404.html"), exportedNotFoundHtml, "utf8"),
  ]);

  await validateArtifactSurface();
  await validateArtifactReferences([
    ...exportedRouteHtml,
    {
      pathname: "/404.html",
      output: "404.html",
      html: exportedNotFoundHtml,
      hydrate: false,
    },
  ]);
  await assertRegularTree(outputDirectory, "GitHub Pages artifact");

  const files = await collectFiles(outputDirectory);
  process.stdout.write(
    `${JSON.stringify(
      {
        origin: EXPECTED_ORIGIN,
        output: relative(projectRoot, outputDirectory),
        routes: routeHtml.length,
        files: files.length,
        staticRoutes: exportedRouteHtml.filter((route) => !route.hydrate).length,
        hydratedRoutes: exportedRouteHtml.filter((route) => route.hydrate).length,
        indexBytes: Buffer.byteLength(exportedIndexHtml),
        notFoundBytes: Buffer.byteLength(exportedNotFoundHtml),
      },
      null,
      2,
    )}\n`,
  );
}

await main();
