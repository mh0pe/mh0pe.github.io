import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { tsImport } from "tsx/esm/api";

const { selectSourceTrail, SourceTrailDetails } = await tsImport(new URL("../app/components/blog/ArticleSourceTrail.tsx", import.meta.url).href, import.meta.url);
const repository = "awslabs/automated-security-helper";
const href = `https://github.com/${repository}/pull/462`;
const sha = "a".repeat(40);
const file = path => ({ path, href: `https://github.com/${repository}/blob/${sha}/${encodeURIComponent(path)}`, status: "added", additions: 1, deletions: 0, changes: 1 });
function fixture() {
  return { id: "ash-workspace", publicOnly: true, changes: [{
    id: "workspace-execution", kind: "pull-request", href, number: 462, repository, referenceSha: sha,
    commits: ["docs: setup", "feat: inherited planning", "feat: scope one execution per project", "feat: merge per-project results", "test: attribution gate", "feat: other detail"].map((label, i) => {
      const commitSha = i.toString(16).repeat(40);
      return { sha: commitSha, href: `https://github.com/${repository}/commit/${commitSha}`, label };
    }),
    files: [file("docs/README.md"), file("automated_security_helper/schemas/results.json"), file("other.py"), file("automated_security_helper/workspace/aggregation.py"), file("automated_security_helper/workspace/execution.py"), file("tests/unit/workspace/test_project_isolation.py")],
  }] };
}

test("workspace source trail joins exact PR href and selects bounded relevant changes", () => {
  const trail = selectSourceTrail(fixture(), href);
  assert.equal(trail.commits.length, 3);
  assert.deepEqual(trail.commits.map(item => item.label), ["feat: scope one execution per project", "feat: merge per-project results", "test: attribution gate"]);
  assert.deepEqual(trail.files.map(item => item.path.split("/").at(-1)), ["execution.py", "aggregation.py", "test_project_isolation.py"]);
  assert.equal(trail.allChangesHref, href + "/files");
});

test("unknown, private, mismatched and malformed records do not become source links", () => {
  assert.equal(selectSourceTrail(fixture(), href + "0"), null);
  for (const mutate of [r => { r.publicOnly = false; }, r => { r.id = "other"; }, r => { r.changes[0].repository = "other/repo"; }, r => { r.changes[0].number = 999; }]) {
    const record = fixture(); mutate(record); assert.equal(selectSourceTrail(record, href), null);
  }
  const record = fixture();
  record.changes[0].commits = [{ sha, label: "wrong", href: "https://example.com/" }];
  record.changes[0].files = [{ ...file("a.py"), href: `https://github.com/${repository}/blob/${sha}/wrong.py` }, { ...file("a.py"), href: `https://github.com/${repository}/blob/${sha}/%GG` }];
  assert.equal(selectSourceTrail(record, href), null);
});

test("disclosure stays native, accessible and limited to static links", () => {
  const html = renderToStaticMarkup(createElement(SourceTrailDetails, { trail: selectSourceTrail(fixture(), href), label: "Scoped execution" }));
  assert.match(html, /<details class="article-implementation"><summary>Explore this change/);
  assert.match(html, /Scoped execution/);
  assert.equal((html.match(/<a /g) ?? []).length, 7);
  assert.equal((html.match(/opens in a new tab/g) ?? []).length, 7);
  assert.doesNotMatch(html, /<script|<canvas|additions|deletions|referenceSha|agentId|onClick/);
});

test("only the workspace article includes source trails without replacing original links", async () => {
  const page = await readFile(new URL("../app/components/blog/ArticlePage.tsx", import.meta.url), "utf8");
  assert.match(page, /article\.slug === "workspace-security" \? <ArticleSourceTrail sourceHref=\{source\.href\}/);
  assert.match(page, /<a href=\{source\.href\}/);
});
