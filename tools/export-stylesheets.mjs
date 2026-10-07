import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import postcss from "postcss";

export const sharedStylesheets = [
  "portfolio-v2.css",
  "portfolio-v3.css",
  "interactions.css",
];

// Compact formatting, not CSS meaning: retain selectors, declaration values,
// duplicate fallbacks, order, and every conditional rule. In particular, custom
// property whitespace can be significant after var() substitution.
export function compactStylesheet(source, filename) {
  const root = postcss.parse(source, { from: filename });
  root.walkComments((comment) => {
    if (!/^!|@license|@preserve|copyright/i.test(comment.text.trim())) {
      comment.remove();
    }
  });
  root.walk((node) => {
    if (!/\S/.test(node.raws.before ?? "")) node.raws.before = "";
    if (node.type === "decl") {
      if (!node.prop.startsWith("--") && /^[\s:]*$/.test(node.raws.between ?? "")) {
        node.raws.between = ":";
      }
    } else if (node.type === "rule" || node.type === "atrule") {
      if (node.nodes) {
        if (!/\S/.test(node.raws.between ?? "")) node.raws.between = "";
        if (!/\S/.test(node.raws.after ?? "")) node.raws.after = "";
        node.raws.semicolon = false;
      }
    }
  });
  if (!/\S/.test(root.raws.after ?? "")) root.raws.after = "";
  return root.toString();
}

export async function compactExportedStylesheets(directory) {
  for (const filename of sharedStylesheets) {
    const target = resolve(directory, filename);
    const source = await readFile(target, "utf8");
    const compact = compactStylesheet(source, filename);
    await writeFile(target, compact, "utf8");
    console.log(`Stylesheet ${filename}: ${Buffer.byteLength(source)} → ${Buffer.byteLength(compact)} bytes`);
  }
}
