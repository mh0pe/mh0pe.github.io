import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

// The HTML and its deferred player must name the bytes copied into this export.
// A date in source does not change when an asset is repaired in a later build.
export function createRuntimeAssetPinner(directory) {
  const root = resolve(directory);
  const hashes = new Map();
  return async function pinRuntimeAssets(html) {
    const replacements = [];
    for (const tag of html.matchAll(/<(?:script|link|article)\b[^>]*>/gi)) {
      for (const attribute of tag[0].matchAll(/\b(?:src|href|data-story-runtime)="([^"]+)"/g)) {
        const original = attribute[1];
        if (!original.startsWith("/") || original.startsWith("//")) continue;
        const url = new URL(original.replaceAll("&amp;", "&"), "https://export.invalid");
        const pathname = decodeURIComponent(url.pathname);
        if (!/\.(?:js|css)$/.test(pathname)) continue;
        // Vite's import graph already uses content-hashed names. Altering only
        // preload URLs would give the same module two different identities.
        if (/^\/assets\/[^/]+-[\w-]{8,}\.(?:js|css)$/.test(url.pathname)) continue;
        const target = resolve(root, "." + pathname);
        if (!target.startsWith(root + sep)) throw new Error("Asset escapes export: " + pathname);
        if (!hashes.has(target)) {
          hashes.set(target, readFile(target).then((bytes) => createHash("sha256").update(bytes).digest("hex")));
        }
        const version = await hashes.get(target);
        if (pathname.startsWith("/route-styles/")) {
          if (original !== `${pathname}?v=${version}`) {
            throw new Error("Route stylesheet identity differs from final bytes; rebuild before export: " + pathname);
          }
          // Do not normalize a URL that is also embedded in Flight. A second
          // spelling would be a second browser resource even for the same bytes.
          continue;
        }
        url.searchParams.set("v", version);
        const value = (url.pathname + url.search + url.hash).replaceAll("&", "&amp;");
        const start = tag.index + attribute.index + attribute[0].indexOf('"') + 1;
        replacements.push({ start, end: start + original.length, value });
      }
    }
    for (const change of replacements.reverse()) {
      html = html.slice(0, change.start) + change.value + html.slice(change.end);
    }
    return html;
  };
}
