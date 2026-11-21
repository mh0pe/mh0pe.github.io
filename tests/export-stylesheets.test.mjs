import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postcss from "postcss";
import { compactStylesheet, sharedStylesheets, supplementalStylesheets } from "../tools/export-stylesheets.mjs";

function meaning(source) {
  const visit = (node) => {
    if (node.type === "comment") return null;
    return {
      type: node.type,
      selector: node.selector,
      name: node.name,
      params: node.params,
      prop: node.prop,
      value: node.value,
      rawValue: node.raws.value,
      important: node.important,
      nodes: node.nodes?.map(visit).filter(Boolean),
    };
  };
  return visit(postcss.parse(source));
}

test("compaction preserves shared CSS meaning and editable originals", async () => {
  for (const filename of sharedStylesheets) {
    const source = await readFile(new URL(`../public/${filename}`, import.meta.url), "utf8");
    const result = compactStylesheet(source, filename);
    assert.deepEqual(meaning(result), meaning(source), filename);
    assert.equal(compactStylesheet(result, filename), result, "compaction is stable");
    assert.ok(Buffer.byteLength(result) < Buffer.byteLength(source) * 0.9, filename);
    assert.equal(await readFile(new URL(`../public/${filename}`, import.meta.url), "utf8"), source);
  }
});

test("compaction retains licensing, resource references, fallbacks, and significant values", () => {
  const source = `/*! Keep this license */
    /* @license Retain this too */
    /* Ordinary explanation */
    @font-face { font-family: "A B"; src: url("/fonts/a.woff2?v=1&x=2"); }
    :root { --empty: ; --space: "a  b"; --calc: calc(100% - 2px); }
    @media (prefers-reduced-motion: reduce) {
      :root[data-theme="dark"] .test:focus-visible, .test[open] {
        display: block; display: grid; animation: none !important;
        content: "/* literal */"; width: var(--calc);
      }
    }`;
  const compact = compactStylesheet(source, "fixture.css");
  assert.deepEqual(meaning(compact), meaning(source));
  assert.match(compact, /Keep this license/);
  assert.match(compact, /@license Retain this too/);
  assert.doesNotMatch(compact, /Ordinary explanation/);
  assert.match(compact, /--empty: ;/);
});

test("supplemental formatting compaction preserves every declaration, state and motion rule", async () => {
  for (const filename of supplementalStylesheets) {
    const source = await readFile(new URL(`../public/${filename}`, import.meta.url), "utf8");
    const exported = await readFile(new URL(`../pages-dist/${filename}`, import.meta.url), "utf8");
    assert.equal(exported, compactStylesheet(source, filename));
    assert.deepEqual(meaning(exported), meaning(source), filename);
    assert.equal(compactStylesheet(exported, filename), exported);
    assert.ok(Buffer.byteLength(exported) < Buffer.byteLength(source), filename);
  }
});

test("malformed CSS fails closed instead of silently dropping styles", () => {
  assert.throws(() => compactStylesheet(".broken { color: red", "broken.css"), /Unclosed block/);
});

test("embedded license comments and legacy declaration markers survive compaction", () => {
  const source = ".x /*! retained rule notice */ { _color: red; *display: block; color /* @license retained declaration notice */ : blue; }";
  const compact = compactStylesheet(source, "raw-fragments.css");
  assert.match(compact, /\/\*! retained rule notice \*\//);
  assert.match(compact, /\/\* @license retained declaration notice \*\//);
  assert.match(compact, /_color:/);
  assert.match(compact, /\*display:/);
  assert.deepEqual(meaning(compact), meaning(source));
});

test("the actual export contains the compact styles in unchanged cascade order", async () => {
  for (const filename of sharedStylesheets) {
    const source = await readFile(new URL(`../public/${filename}`, import.meta.url), "utf8");
    const exported = await readFile(new URL(`../pages-dist/${filename}`, import.meta.url), "utf8");
    assert.equal(exported, compactStylesheet(source, filename));
  }
  const html = await readFile(new URL("../pages-dist/404.html", import.meta.url), "utf8");
  const positions = sharedStylesheets.map((filename) => html.indexOf(`href="/${filename}?`));
  assert.ok(positions.every((position, index) => position >= 0 && (index === 0 || positions[index - 1] < position)));
  // Other routes retain the cascade inside their single route bundle.
  const work = await readFile(new URL("../pages-dist/work/index.html", import.meta.url), "utf8");
  assert.match(work, /href="\/route-styles\/work\.css\?v=[a-f0-9]{64}"/);
});
