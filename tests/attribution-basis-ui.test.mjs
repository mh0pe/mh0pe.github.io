import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { tsImport } from "tsx/esm/api";
import attribution from "../app/data/agent-attribution.json" with { type: "json" };
import basis from "../app/data/agent-attribution-basis.json" with { type: "json" };

const { readAgentAttributionData } = await tsImport(new URL("../app/components/attribution-model.ts", import.meta.url).href, import.meta.url);
const { EvidenceItem } = await tsImport(new URL("../app/components/AttributionExplorer.tsx", import.meta.url).href, import.meta.url);
const data = readAgentAttributionData(attribution);
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const textOf = html => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

test("the canonical basis column stays bound to exact commit bytes and order", async () => {
  const attributionBytes = await readFile(new URL("../app/data/agent-attribution.json", import.meta.url));
  const basisBytes = await readFile(new URL("../app/data/agent-attribution-basis.json", import.meta.url));
  assert.equal(sha256(attributionBytes), basis.attributionSha256);
  assert.equal(sha256(JSON.stringify(data.commits.map(commit => commit.sha))), basis.shaOrderSha256);
  assert.equal(basis.basis.length, data.commits.length);
  assert.match(basis.basis, /^[rht]+$/);
  assert.deepEqual(Object.keys(basis).sort(), ["attributionSha256", "basis", "schemaVersion", "shaOrderSha256"]);
  assert.ok(gzipSync(basisBytes, { level: 9 }).length < 300);
});

for (const [code, label, prefix] of [
  ["r", "Commit marker", "Model association"],
  ["h", "Model-use history", "Model association"],
  ["t", "Tool record", "Tool association"],
]) {
  test(`${label} is shown in the existing compact and full change detail`, () => {
    const commit = data.commits[basis.basis.indexOf(code)];
    assert.ok(commit);
    for (const compact of [false, true]) {
      const html = renderToStaticMarkup(createElement(EvidenceItem, {
        commit, basis: code, modelLabel: "Associated identity", scope: "code", compact,
      }));
      const text = textOf(html);
      assert.match(text, new RegExp(`${prefix}: Associated identity`));
      assert.match(text, new RegExp(label));
      assert.match(html, new RegExp(`data-association-basis="${code}"`));
      assert.ok(html.includes(commit.url));
      assert.doesNotMatch(text, /No model data|Model not recorded|Missing model|—/i);
    }
  });
}

test("an unrelated SHA does not inherit a basis from position or emit a missing-data badge", () => {
  const commit = { ...data.commits[0], sha: "unknown-commit-sha" };
  const html = renderToStaticMarkup(createElement(EvidenceItem, {
    commit, modelLabel: "Associated identity", scope: "code",
  }));
  assert.doesNotMatch(html, /data-association-basis=/);
  assert.doesNotMatch(textOf(html), /No model data|Model not recorded|Missing model|Model-use history|Commit marker/);
});

test("the explorer client imports only the bounded default summary and passes basis per record", async () => {
  const source = await readFile(new URL("../app/components/AttributionExplorer.tsx", import.meta.url), "utf8");
  assert.match(source, /import transport from "\.\.\/data\/attribution-transport\.json"/);
  assert.doesNotMatch(source, /import .*agent-attribution(?:-basis|-provenance)?\.json/);
  assert.match(source, /basis=\{basisFor\(commit\)\}/);
  assert.doesNotMatch(source, /complete public\s+record/);
});
