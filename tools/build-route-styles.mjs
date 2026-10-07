import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";
import { compactStylesheet, sharedStylesheets } from "./export-stylesheets.mjs";

// Whole component families, not first-viewport coverage. Stateful variants stay
// included even when a filter, disclosure or motion control has not opened yet.
const sharedFamilies = [
  "hope-brand", "hope-button", "hope-text-link", "shell", "visually-hidden", "skip-link", "anchor-alias",
  "site-", "primary-nav", "mobile-nav", "theme-", "section", "route-",
  "button-row", "text-action", "micro-label", "is-", "has-", "js-",
];
export const routeFamilies = {
  home: [...sharedFamilies, "landing-", "architecture-", "contribution-scene", "lineage-", "source-"],
  models: [...sharedFamilies, "proof-models", "attribution-"],
  method: [...sharedFamilies, "philosophy-", "method-", "motion-film"],
};

export function includesRouteClass(route, className) {
  if (!routeFamilies[route]) throw new Error(`Unknown stylesheet route: ${route}`);
  return routeFamilies[route].some((family) => className.startsWith(family));
}

export function includesRouteSelector(route, selector) {
  try {
    const parsed = selectorParser().astSync(selector);
    // Keep the entire selector list if any branch could apply. Classes nested
    // in :not(), :is(), :has(), etc. are deliberately not used to exclude rules.
    return parsed.nodes.some((branch) => !branch.nodes.some((node) => (
      node.type === "class" && !includesRouteClass(route, node.value)
    )));
  } catch {
    // Future syntax must cost extra bytes, never silently lose its styling.
    return true;
  }
}

export function routeStylesheet(source, route, filename) {
  if (!routeFamilies[route]) throw new Error(`Unknown stylesheet route: ${route}`);
  const root = postcss.parse(source, { from: filename });
  root.walkRules((rule) => {
    let ancestor = rule.parent;
    while (ancestor) {
      if (ancestor.type === "atrule" && /keyframes$/i.test(ancestor.name)) return;
      ancestor = ancestor.parent;
    }
    if (!includesRouteSelector(route, rule.selector)) rule.remove();
  });
  // Keep every at-rule wrapper, keyframe, font, property and layer declaration.
  // Empty wrappers are harmless and retain the exact cascade/layer ordering.
  return compactStylesheet(root.toString(), filename);
}

export async function buildRouteStyles(projectRoot) {
  const output = resolve(projectRoot, "public/route-styles");
  await mkdir(output, { recursive: true });
  const inputs = await Promise.all(sharedStylesheets.map(async (filename) => ({
    filename,
    source: await readFile(resolve(projectRoot, "public", filename), "utf8"),
  })));
  for (const route of Object.keys(routeFamilies)) {
    const css = inputs.map(({ source, filename }) => routeStylesheet(source, route, filename)).join("\n");
    await writeFile(resolve(output, `${route}.css`), css, "utf8");
    console.log(`Route stylesheet ${route}: ${Buffer.byteLength(css)} bytes`);
  }
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  await buildRouteStyles(resolve(dirname(scriptPath), ".."));
}
