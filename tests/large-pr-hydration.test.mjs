import assert from "node:assert/strict";
import test from "node:test";
import { hydrateEvidence } from "../tools/build-project-graphs.mjs";

const repository = "mh0pe/example";
const href = `https://github.com/${repository}/pull/1`;
const sha = (i) => i.toString(16).padStart(40, "0");

function fixture() {
  const commits = Array.from({ length: 376 }, (_, i) => ({
    sha: sha(i + 1), author: { login: "mh0pe" },
    commit: { message: `Change ${i}`, author: { date: "2026-10-10T00:00:00Z" } },
  }));
  const detail = { html_url: href, commits: 376, changed_files: 1, user: { login: "mh0pe" },
    base: { sha: sha(1000), repo: { full_name: repository } },
    head: { sha: sha(376), repo: { full_name: repository } } };
  const initial = structuredClone(commits.slice(0, 250));
  const pages = Array.from({ length: 4 }, (_, i) => ({ total_commits: 376, commits: structuredClone(commits.slice(i * 100, (i + 1) * 100)) }));
  const calls = [];
  const f = { commits, detail, initial, pages, calls };
  f.run = () => hydrateEvidence({ kind: "pull-request", repository, href, number: 1 },
    new Map([[href, { html_url: href, author: "mh0pe" }]]), { fetchJson: async (endpoint, options) => {
      calls.push({ endpoint, options });
      if (endpoint === `repos/${repository}`) return { full_name: repository, private: false, visibility: "public" };
      if (endpoint === `repos/${repository}/pulls/1`) return detail;
      if (endpoint.endsWith("/commits?per_page=100")) return initial;
      if (endpoint.endsWith("/files?per_page=100")) return [{ filename: "code.js", additions: 1, deletions: 0, changes: 1 }];
      assert.equal(endpoint, `repos/${repository}/compare/${sha(1000)}...${sha(376)}?per_page=100`);
      assert.deepEqual(options, { paged: true, flattenPages: false, cache: false });
      return f.pages;
    } });
  return f;
}

test("large PR hydration recovers every commit from paginated immutable comparison", async () => {
  const f = fixture();
  assert.deepEqual((await f.run()).commits, f.commits);
  assert.equal(f.calls.filter(({ endpoint }) => endpoint.includes("/compare/")).length, 1);
});

for (const [name, mutate] of [
  ["incomplete initial page", f => f.initial.pop()],
  ["duplicate initial entry", f => { f.initial[1] = f.initial[0]; }],
  ["missing immutable base", f => { delete f.detail.base.sha; }],
  ["empty comparison", f => { f.pages = []; }],
  ["inconsistent page total", f => { f.pages[1].total_commits = 375; }],
  ["missing comparison page", f => { f.pages.pop(); }],
  ["duplicate comparison entry", f => { f.pages[1].commits[0] = f.pages[0].commits[0]; }],
  ["malformed comparison SHA", f => { f.pages[0].commits[0].sha = "bad"; }],
  ["missing initial member", f => { f.pages[0].commits[0].sha = sha(2000); }],
  ["conflicting author identity", f => { f.pages[0].commits[0].author.login = "someone-else"; }],
  ["missing new commit metadata", f => { delete f.pages[3].commits[0].commit; }],
  ["invalid new commit chronology", f => { f.pages[3].commits[0].commit.author.date = "not-a-date"; }],
  ["conflicting commit description", f => { f.pages[0].commits[0].commit.message = "Different"; }],
  ["conflicting commit date", f => { f.pages[0].commits[0].commit.author.date = "2026-10-09T00:00:00Z"; }],
]) test(`large PR hydration rejects ${name}`, async () => {
  const f = fixture(); mutate(f); await assert.rejects(f.run());
});

test("large PR comparison preserves known identity when comparison omits it without mutating responses", async () => {
  const f = fixture(); f.pages[0].commits[0].author = null;
  const before = structuredClone(f.pages);
  const result = await f.run();
  assert.equal(result.commits[0].author.login, "mh0pe");
  assert.deepEqual(f.pages, before);
});

test("large PR comparison retains known descriptions and chronology without mutating either response", async () => {
  const f = fixture(); delete f.pages[0].commits[0].commit;
  delete f.pages[0].commits[1].commit.author.date;
  const before = structuredClone({ pages: f.pages, initial: f.initial });
  const result = await f.run();
  assert.deepEqual(result.commits, f.commits);
  assert.deepEqual({ pages: f.pages, initial: f.initial }, before);
});
