import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const mimeTypes = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml; charset=utf-8"],
]);

const scriptPath = fileURLToPath(import.meta.url);
const siteRoot = resolve(scriptPath, "../..");
const publicRoot = resolve(process.env.PAGES_ROOT ?? resolve(siteRoot, "pages-dist"));
const host = process.env.HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

export function resolvePublicPath(root, requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  } catch {
    return null;
  }

  const relativePath = pathname.replace(/^\/+/, "");
  const requestedFile =
    relativePath === ""
      ? "index.html"
      : extname(relativePath)
        ? relativePath
        : `${relativePath.replace(/\/+$/, "")}/index.html`;
  const candidate = resolve(root, requestedFile);

  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
    return null;
  }
  return candidate;
}

async function regularFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function sendFile(response, path, statusCode = 200, method = "GET") {
  const metadata = await stat(path);
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Length": metadata.size,
    "Content-Type": mimeTypes.get(extname(path).toLowerCase()) ?? "application/octet-stream",
  });

  if (method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(path).pipe(response);
}

export function createPagesServer(root = publicRoot) {
  return createServer(async (request, response) => {
    const method = request.method ?? "GET";
    if (method !== "GET" && method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end("Method not allowed");
      return;
    }

    const candidate = resolvePublicPath(root, request.url ?? "/");
    if (!candidate) {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Bad request");
      return;
    }

    try {
      if (await regularFile(candidate)) {
        await sendFile(response, candidate, 200, method);
        return;
      }

      const notFound = resolve(root, "404.html");
      if (await regularFile(notFound)) {
        await sendFile(response, notFound, 404, method);
        return;
      }

      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    } catch (error) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Preview server error");
      console.error(error);
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid PORT: ${process.env.PORT ?? "3000"}`);
  }

  const server = createPagesServer();
  server.listen(port, host, () => {
    console.log(`Portfolio preview: http://${host}:${port}`);
    console.log(`Serving: ${publicRoot}`);
  });
}
