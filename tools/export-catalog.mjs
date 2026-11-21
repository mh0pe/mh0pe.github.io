import { lstat, readdir } from "node:fs/promises";
import { posix, relative, resolve, sep } from "node:path";

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function toPosix(path) {
  return path.split(sep).join(posix.sep);
}

export function routeForExportPath(path) {
  invariant(typeof path === "string" && path.length > 0, "Export path must be a non-empty string.");
  invariant(!path.startsWith("/") && !path.includes(".."), `Unsafe export path: ${path}`);
  if (path === "index.html") return "/";
  if (path === "404.html") return "/404.html";
  if (path.endsWith("/index.html")) return `/${path.slice(0, -"index.html".length)}`;
  return `/${path}`;
}

export async function discoverExportCatalog(outputDirectory) {
  const root = resolve(outputDirectory);
  const html = [];

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      const metadata = await lstat(path);
      const exportedPath = toPosix(relative(root, path));
      invariant(!metadata.isSymbolicLink(), `Export catalog contains a symbolic link: ${exportedPath}`);
      if (metadata.isDirectory()) await visit(path);
      else if (metadata.isFile() && entry.name.endsWith(".html")) html.push(exportedPath);
    }
  }

  await visit(root);
  const catalog = html.map((output) => ({ output, route: routeForExportPath(output) }));
  const routes = new Set();
  for (const entry of catalog) {
    invariant(!routes.has(entry.route), `Duplicate exported route: ${entry.route}`);
    routes.add(entry.route);
  }
  return catalog.sort((left, right) => left.route.localeCompare(right.route));
}

