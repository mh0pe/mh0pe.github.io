import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, writeFile, readdir, rename, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertHydrationMatchesSnapshot, promoteFullContributionSuccessor, stageFullContributionSuccessor } from "../tools/stage-full-contribution-successor.mjs";
import { buildPublicRecord } from "../tools/refresh-public-record.mjs";
import { assertPublicSafePlayerRecords } from "../tools/build-project-player-records.mjs";

const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const dataDirectory = fileURLToPath(new URL("../app/data/", import.meta.url));

function prFixture() {
  const record = { html_url: "https://github.com/owner/project/pull/1", state: "merged", head: { sha: "a".repeat(40), ref: "work", repository: "owner/project" }, base: { sha: "b".repeat(40), ref: "feature-base", repository: "owner/project" } };
  const detail = { html_url: record.html_url, state: "closed", merged_at: "2026-10-10T00:00:00Z", head: { ...record.head, repo: { full_name: "owner/project" } }, base: { ...record.base, repo: { full_name: "owner/project" } } };
  return { record, detail };
}
test("live hydration must agree with collected refs and adoption state", () => {
  const f = prFixture(); assert.doesNotThrow(() => assertHydrationMatchesSnapshot(f.detail, f.record));
  f.record.state = "open_draft"; f.detail.state = "open"; f.detail.draft = true;
  assert.doesNotThrow(() => assertHydrationMatchesSnapshot(f.detail, f.record));
});
for (const [name, mutate] of [
  ["changed head", f => { f.detail.head.sha = "c".repeat(40); }],
  ["changed feature-base", f => { f.detail.base.ref = "main"; }],
  ["changed repository", f => { f.detail.head.repo.full_name = "private/elsewhere"; }],
  ["changed merge state", f => { f.detail.state = "open"; }],
  ["missing source", f => { f.record = undefined; }],
]) test(`hydration rejects ${name}`, () => { const f = prFixture(); mutate(f); assert.throws(() => assertHydrationMatchesSnapshot(f.detail, f.record)); });

test("staging rejects changed selected receipt before network or writes", async t => {
  const directory = await mkdtemp(resolve(tmpdir(), "full-successor-reject-"));
  t.after(() => rm(directory, { recursive: true }));
  let calls = 0;
  await assert.rejects(stageFullContributionSuccessor({ dataDirectory, outputDirectory: directory, expectedSelectedSha256: "0".repeat(64), expectedSelectionsSha256: "1".repeat(64) }, { fetchJson: async () => { calls++; } }), /Input changed/);
  assert.equal(calls, 0); assert.deepEqual(await readdir(directory), []);
});

test("public summary can be prepared without mutating site data", async t => {
  const directory = await mkdtemp(resolve(tmpdir(), "full-summary-"));
  t.after(() => rm(directory, { recursive: true }));
  const { mkdir } = await import("node:fs/promises");
  const history = resolve(directory, "history"), fork = resolve(directory, "fork");
  await mkdir(history); await mkdir(fork);
  const before = await readFile(resolve(dataDirectory, "public-history-summary.json"));
  async function fixture(path, contents, extra) {
    const files = {};
    for (const [name, value] of Object.entries(contents)) {
      const bytes = value === null ? "" : JSON.stringify(value) + "\n";
      await writeFile(resolve(path, name), bytes);
      files[name] = { sha256: hash(bytes), ...(name.endsWith(".jsonl") ? { records: value === null ? 0 : 1 } : {}) };
    }
    const manifest = JSON.stringify({ status: "complete", public_only: true, accounts: ["mh0pe", "awsmadi"], completed_at: "2026-10-10T00:00:00Z", files, ...extra });
    await writeFile(resolve(path, "manifest.json"), manifest);
    return hash(manifest);
  }
  const source = await fixture(history, { "commits.jsonl": null, "pull_request_commits.jsonl": null, "summary.json": { combined: { pull_requests: 1, merged_authored_pull_requests: 1 }, counting_rules: {} }, "pull_requests.jsonl": { html_url: "https://github.com/owner/project/pull/1", number: 1, reported_counts: { commits: 0 }, state: "merged", author: "awsmadi", base: { repository: "owner/project" } } }, { collection_scope: "submitted_public_pull_requests_and_owned_public_nonfork_commits" });
  await fixture(fork, { "commits.jsonl": null, "summary.json": { repositories_audited: 1, fork_only_commits: 1, residual_commits_without_collected_pr: 1, attributed_residual_commits: 1, pr_covered_shas_excluded: 0 } }, { source_export_manifest_sha256: source });
  const result = await buildPublicRecord(history, fork);
  assert.equal(result.presentation.merged_authored_pr_target_repositories, 1);
  assert.equal(result.source_manifests.public_history_sha256, source);
  assert.deepEqual(await readFile(resolve(dataDirectory, "public-history-summary.json")), before);
  const emptySource = await fixture(history, { "commits.jsonl": null, "pull_request_commits.jsonl": null, "summary.json": { combined: { pull_requests: 0, merged_authored_pull_requests: 0 }, counting_rules: {} }, "pull_requests.jsonl": null }, { collection_scope: "submitted_public_pull_requests_and_owned_public_nonfork_commits" });
  await fixture(fork, { "commits.jsonl": null, "summary.json": { repositories_audited: 0, fork_only_commits: 0, residual_commits_without_collected_pr: 0, attributed_residual_commits: 0, pr_covered_shas_excluded: 0 } }, { source_export_manifest_sha256: emptySource });
  assert.equal((await buildPublicRecord(history, fork)).presentation.merged_authored_pr_target_repositories, 0);
  await writeFile(resolve(fork, "summary.json"), "{}\n");
  await assert.rejects(buildPublicRecord(history, fork), /Snapshot hash mismatch/);
});

test("all player labels are screened, including unsampled commits", () => {
  const records = [{ changes: [{ commits: Array.from({ length: 30 }, (_, i) => ({ label: `Public change ${i}` })) }] }];
  assert.doesNotThrow(() => assertPublicSafePlayerRecords(records));
  for (const label of ["Email person@example.com", "Open /Users/someone/project", "Open /Volumes/Drive/private", "Co-authored-by: someone", "Token ghp_example", "Bearer abcdefgh"]) {
    records[0].changes[0].commits[29].label = label;
    assert.throws(() => assertPublicSafePlayerRecords(records), /Unsafe text/);
  }
  assert.throws(() => assertPublicSafePlayerRecords([{ email: "hidden" }]), /Forbidden field/);
});

const promotedNames = ["agent-attribution.json", "agent-attribution-provenance.json", "agent-attribution-basis.json", "public-history-summary.json", "project-graphs", "project-graphs.compact.json", "project-player-records", "project-player-records.compact.json", "full-contribution-generation.json"];
const catalogNames = ["project-graphs", "project-player-records"];
const graphIds = ["project-one", "project-two", "project-three"];

async function promotionFixture(t) {
  const directory = await mkdtemp(resolve(tmpdir(), "full-promotion-"));
  t.after(() => rm(directory, { recursive: true }));
  const staging = resolve(directory, "staging"), target = resolve(directory, "data");
  await mkdir(staging); await mkdir(target);
  const outputs = {}, targetPredecessor = {};
  for (const [root, marker] of [[staging, "new"], [target, "old"]]) {
    for (const name of promotedNames.filter(name => name !== "full-contribution-generation.json")) {
      if (catalogNames.includes(name)) {
        await mkdir(resolve(root, name));
        await writeFile(resolve(root, name, "manifest.json"), JSON.stringify({ graphIds, marker }));
        for (const id of graphIds) await writeFile(resolve(root, name, `${id}.json`), JSON.stringify({ id, marker }));
      } else await writeFile(resolve(root, name), JSON.stringify({ name, marker }));
    }
    for (const name of await fileNames(root)) {
      const bytes = await readFile(resolve(root, name));
      if (root === staging) outputs[name] = { sha256: hash(bytes), bytes: bytes.length };
      else targetPredecessor[name] = hash(bytes);
    }
  }
  for (const [name, bytes] of [["blog.ts", "Original selected article source\n"], ["selected-contribution-generation.json", JSON.stringify({ sourceKind: "selected-public-receipts-with-inherited-records" })]]) {
    await writeFile(resolve(target, name), bytes);
    targetPredecessor[name] = hash(bytes);
  }
  // The graph writer retains a private sub-stage that is not a promoted target.
  await mkdir(resolve(staging, ".project-generation-stage-retained"));
  await writeFile(resolve(staging, ".project-generation-stage-retained", "private-receipt.json"), "{}\n");
  const generation = {
    schemaVersion: 1, publicOnly: true, sourceKind: "full-public-history-with-curated-project-records",
    inputs: { article: targetPredecessor["blog.ts"], selectedGeneration: targetPredecessor["selected-contribution-generation.json"] },
    outputs, targetPredecessor,
  };
  const f = { directory, staging, target, generation };
  await writeGeneration(f);
  return f;
}

async function fileNames(root, prefix = "") {
  const names = [];
  for (const name of await readdir(resolve(root, prefix))) {
    const relative = prefix ? `${prefix}/${name}` : name;
    const stat = await lstat(resolve(root, relative));
    if (stat.isDirectory()) names.push(...await fileNames(root, relative));
    else names.push(relative);
  }
  return names.sort();
}

async function snapshot(root) {
  return Object.fromEntries(await Promise.all((await fileNames(root)).map(async name => [name, hash(await readFile(resolve(root, name)))])));
}

async function writeGeneration(f) {
  const bytes = JSON.stringify(f.generation) + "\n";
  await writeFile(resolve(f.staging, "full-contribution-generation.json"), bytes);
  f.generationSha256 = hash(bytes);
}

test("full successor promotion installs exactly the receipt-bound files and retains predecessor anchors", async t => {
  const f = await promotionFixture(t);
  const before = await snapshot(f.target);
  await promoteFullContributionSuccessor(f.staging, f.target, f.generationSha256);
  const after = await snapshot(f.target);
  assert.deepEqual(Object.keys(after).sort(), [...Object.keys(f.generation.outputs), "full-contribution-generation.json", "blog.ts", "selected-contribution-generation.json"].sort());
  for (const [name, expected] of Object.entries(f.generation.outputs)) assert.equal(after[name], expected.sha256);
  assert.equal(after["full-contribution-generation.json"], f.generationSha256);
  for (const name of ["blog.ts", "selected-contribution-generation.json"]) assert.equal(after[name], before[name]);
  for (const [name, expected] of Object.entries(f.generation.targetPredecessor).filter(([name]) => !["blog.ts", "selected-contribution-generation.json"].includes(name))) {
    const [top, ...suffix] = name.split("/");
    assert.equal(hash(await readFile(resolve(f.staging, `previous-${top}`, ...suffix))), expected);
  }
  assert.ok((await readdir(f.staging)).includes(".project-generation-stage-retained"));
});

for (const name of ["agent-attribution.json", "project-graphs/project-two.json", "project-player-records/manifest.json", "blog.ts", "selected-contribution-generation.json"]) {
  test(`full successor promotion rejects target drift in ${name} before mutation`, async t => {
    const f = await promotionFixture(t);
    await writeFile(resolve(f.target, name), "changed after preparation\n");
    const before = await snapshot(f.target);
    let calls = 0;
    await assert.rejects(promoteFullContributionSuccessor(f.staging, f.target, f.generationSha256, { rename: async () => { calls++; } }));
    assert.equal(calls, 0); assert.deepEqual(await snapshot(f.target), before);
  });
}

for (const [label, mutate, message] of [
  ["missing staged top-level receipt entry", async f => { delete f.generation.outputs["agent-attribution.json"]; }, /Staged outputs/],
  ["missing staged catalog receipt entry", async f => { delete f.generation.outputs["project-graphs/project-two.json"]; }, /Staged outputs/],
  ["extra staged receipt entry", async f => { f.generation.outputs["project-graphs/not-promoted.json"] = { sha256: "a".repeat(64), bytes: 1 }; }, /Staged outputs/],
  ["unlisted staged catalog file", async f => { await writeFile(resolve(f.staging, "project-graphs/unlisted.json"), "{}\n"); }, /catalog inventory/],
  ["missing staged top-level file", async f => { await rm(resolve(f.staging, "agent-attribution.json")); }, /ENOENT/],
  ["missing predecessor top-level receipt entry", async f => { delete f.generation.targetPredecessor["agent-attribution.json"]; }, /Target predecessor/],
  ["missing predecessor catalog receipt entry", async f => { delete f.generation.targetPredecessor["project-player-records/project-three.json"]; }, /Target predecessor/],
  ["missing predecessor anchor", async f => { delete f.generation.targetPredecessor["blog.ts"]; }, /Target predecessor/],
  ["extra predecessor receipt entry", async f => { f.generation.targetPredecessor["project-graphs/unrelated.json"] = "a".repeat(64); }, /Target predecessor/],
  ["unlisted predecessor catalog file", async f => { await writeFile(resolve(f.target, "project-player-records/unlisted.json"), "{}\n"); }, /catalog inventory/],
  ["missing output hash", async f => { delete f.generation.outputs["agent-attribution.json"].sha256; }, /match/],
  ["missing output byte count", async f => { delete f.generation.outputs["agent-attribution.json"].bytes; }, /byte count/],
  ["changed output byte count", async f => { f.generation.outputs["agent-attribution.json"].bytes++; }, /byte count/],
  ["changed staged bytes", async f => { await writeFile(resolve(f.staging, "agent-attribution-basis.json"), "{}\n"); }, /Staged byte count|Staged output changed/],
  ["missing predecessor hash", async f => { f.generation.targetPredecessor["agent-attribution.json"] = null; }, /match/],
  ["unbound article anchor", async f => { f.generation.inputs.article = "a".repeat(64); }, /Article anchor/],
  ["unbound selected receipt anchor", async f => { f.generation.inputs.selectedGeneration = "a".repeat(64); }, /Selected receipt anchor/],
  ["linked staged file", async f => { await rm(resolve(f.staging, "agent-attribution.json")); await symlink(resolve(f.target, "agent-attribution.json"), resolve(f.staging, "agent-attribution.json")); }, /regular file/],
  ["linked staged catalog leaf", async f => { await rm(resolve(f.staging, "project-graphs/project-two.json")); await symlink(resolve(f.target, "project-graphs/project-two.json"), resolve(f.staging, "project-graphs/project-two.json")); }, /regular file/],
  ["linked predecessor catalog leaf", async f => { await rm(resolve(f.target, "project-player-records/project-two.json")); await symlink(resolve(f.staging, "project-player-records/project-two.json"), resolve(f.target, "project-player-records/project-two.json")); }, /regular file/],
  ["nested staged catalog directory", async f => { await mkdir(resolve(f.staging, "project-graphs/nested")); }, /regular file/],
  ["duplicate catalog record IDs", async f => { await writeFile(resolve(f.staging, "project-graphs/manifest.json"), JSON.stringify({ graphIds: ["project-one", "project-one"] })); }, /IDs must be unique/],
  ["manifest masquerading as a record", async f => { await writeFile(resolve(f.staging, "project-graphs/manifest.json"), JSON.stringify({ graphIds: ["manifest"] })); }, /cannot replace the manifest/],
  ["existing accepted backup", async f => { await writeFile(resolve(f.staging, "previous-agent-attribution.json"), "retained accepted bytes\n"); }, /backup already exists/],
  ["already-promoted target receipt", async f => { await writeFile(resolve(f.target, "full-contribution-generation.json"), "{}\n"); }, /already a full successor/],
]) test(`full successor promotion rejects ${label} before mutation`, async t => {
  const f = await promotionFixture(t);
  await mutate(f); await writeGeneration(f);
  const before = await snapshot(f.target);
  let calls = 0;
  await assert.rejects(promoteFullContributionSuccessor(f.staging, f.target, f.generationSha256, { rename: async () => { calls++; } }), message);
  assert.equal(calls, 0); assert.deepEqual(await snapshot(f.target), before);
});

for (const name of promotedNames) test(`failed installation of ${name} restores the predecessor and staged generation`, async t => {
  const f = await promotionFixture(t);
  const beforeTarget = await snapshot(f.target), beforeStaged = await snapshot(f.staging);
  let failed = false;
  await assert.rejects(promoteFullContributionSuccessor(f.staging, f.target, f.generationSha256, {
    rename: async (from, to) => {
      if (!failed && from === resolve(f.staging, name)) { failed = true; throw new Error(`Injected installation failure: ${name}`); }
      return rename(from, to);
    },
  }), /Injected installation failure/);
  assert.ok(failed); assert.deepEqual(await snapshot(f.target), beforeTarget); assert.deepEqual(await snapshot(f.staging), beforeStaged);
});

test("failure while saving a target also restores all previously replaced paths", async t => {
  const f = await promotionFixture(t);
  const beforeTarget = await snapshot(f.target), beforeStaged = await snapshot(f.staging);
  let failed = false;
  await assert.rejects(promoteFullContributionSuccessor(f.staging, f.target, f.generationSha256, {
    rename: async (from, to) => {
      if (!failed && from === resolve(f.target, "project-player-records")) { failed = true; throw new Error("Injected backup failure"); }
      return rename(from, to);
    },
  }), /Injected backup failure/);
  assert.ok(failed); assert.deepEqual(await snapshot(f.target), beforeTarget); assert.deepEqual(await snapshot(f.staging), beforeStaged);
});

test("a rollback failure reports the retained exact predecessor backup", async t => {
  const f = await promotionFixture(t);
  const before = await snapshot(f.target);
  const name = "agent-attribution-basis.json", backup = resolve(f.staging, `previous-${name}`);
  await assert.rejects(promoteFullContributionSuccessor(f.staging, f.target, f.generationSha256, {
    rename: async (from, to) => {
      if (from === resolve(f.staging, name)) throw new Error("Injected installation failure");
      if (from === backup) throw new Error("Injected rollback failure");
      return rename(from, to);
    },
  }), error => {
    assert.ok(error instanceof AggregateError);
    assert.equal(error.errors.length, 2);
    assert.match(error.message, /accepted backups remain/);
    return true;
  });
  assert.equal(hash(await readFile(backup)), before[name]);
  assert.equal(hash(await readFile(resolve(f.staging, name))), f.generation.outputs[name].sha256);
  const after = await snapshot(f.target);
  const expected = { ...before }; delete expected[name];
  assert.deepEqual(after, expected);
});
