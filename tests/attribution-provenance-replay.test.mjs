import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, readlink, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { recoverAttributionProvenance } from "../tools/recover-attribution-provenance.mjs";
import { canonicalBytes } from "../tools/offline-attribution-replay.mjs";

const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const replayTool = fileURLToPath(new URL("../tools/recover-attribution-provenance.mjs", import.meta.url));
const canonical = value => Buffer.from(JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item));
const shas = ["a", "b", "c"].map(letter => letter.repeat(40));
const date = "2026-09-01T12:00:00Z", completedAt = "2026-09-03T00:00:00Z";

function sourceBinding(history, fork) {
  const digest = createHash("sha256");
  for (const [label, bytes] of [["history-manifest", history], ["fork-manifest", fork]]) {
    const length = Buffer.alloc(8); length.writeBigUInt64BE(BigInt(bytes.length));
    digest.update(label).update(Buffer.from([0])).update(length).update(bytes);
  }
  return digest.digest("hex");
}

async function snapshotFiles(root, prefix = "") {
  const files = {};
  for (const name of await readdir(resolve(root, prefix))) {
    const relative = prefix ? `${prefix}/${name}` : name, path = resolve(root, relative);
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) files[relative] = { target: await readlink(path), modifiedAt: stat.mtimeMs };
    else if (stat.isDirectory()) Object.assign(files, await snapshotFiles(root, relative));
    else files[relative] = { sha256: hash(await readFile(path)), modifiedAt: stat.mtimeMs };
  }
  return files;
}

async function replayFixture(t) {
  const root = await realpath(await mkdtemp(resolve(tmpdir(), "attribution-replay-")));
  t.after(() => rm(root, { recursive: true }));
  const history = resolve(root, "history"), fork = resolve(root, "fork"), cacheDirectory = resolve(root, "cache"), models = resolve(root, "models.json");
  await mkdir(history); await mkdir(fork); await mkdir(cacheDirectory);
  async function source(path, contents, extra = {}) {
    const files = {};
    for (const [name, records] of Object.entries(contents)) {
      const bytes = records.map(record => JSON.stringify(record) + "\n").join("");
      await writeFile(resolve(path, name), bytes); files[name] = { sha256: hash(bytes), records: records.length };
    }
    const bytes = Buffer.from(JSON.stringify({ public_only: true, status: "complete", accounts: ["awsmadi", "mh0pe"], completed_at: completedAt, files, ...extra }) + "\n");
    await writeFile(resolve(path, "manifest.json"), bytes); return bytes;
  }
  const historyBytes = await source(history, {
    "commits.jsonl": [
      { sha: shas[0], repository: "owner/fork", message: "Human implementation", matched_accounts: ["awsmadi"], associations: [{ kind: "pull_request", pull_request: "owner/project#1", pull_request_url: "https://github.com/owner/project/pull/1", ordinal: 0 }] },
      { sha: shas[1], repository: "owner/project", message: "Human implementation", matched_accounts: ["awsmadi"], associations: [] },
      { sha: shas[2], repository: "owner/project", message: "Assistant implementation", author_login: "copilot", matched_accounts: ["mh0pe"], associations: [] },
    ],
    "pull_requests.jsonl": [{ html_url: "https://github.com/owner/project/pull/1", base: { repository: "owner/project" }, number: 1, node_id: "PR_1", reported_counts: { commits: 1 } }],
    "pull_request_commits.jsonl": [{ commit_sha: shas[0], commit_repository: "owner/fork", ordinal: 0, pull_request_number: 1, pull_request_node_id: "PR_1", pull_request_url: "https://github.com/owner/project/pull/1", base_repository: "owner/project" }],
  });
  const forkBytes = await source(fork, { "commits.jsonl": [] }, { source_export_manifest_sha256: hash(historyBytes) });
  const binding = sourceBinding(historyBytes, forkBytes), namespace = resolve(cacheDirectory, binding);
  await mkdir(namespace);
  const bindingReceipt = { schemaVersion: 1, sourceBinding: binding, historyManifestSha256: hash(historyBytes), historyManifestBytes: historyBytes.length, forkManifestSha256: hash(forkBytes), forkManifestBytes: forkBytes.length };
  await writeFile(resolve(namespace, "binding.json"), canonical(bindingReceipt));
  const entries = shas.map((sha, index) => {
    const repository = "owner/project";
    const payload = {
      sha, html_url: `https://github.com/${repository}/commit/${sha}`, parents: [{ sha: "d".repeat(40) }],
      stats: { additions: 10, deletions: 1 }, files: [{ filename: "src/code.py", additions: 10, deletions: 1 }],
      author: { login: index === 2 ? "awsmadi" : "human" },
      commit: { author: { name: "Human", date }, committer: { name: "Human", date }, message: index === 0 ? "Implemented capability\n\nCo-authored-by: Claude Opus 4.7 <[email omitted]>" : "Human implementation" },
    };
    return { path: resolve(namespace, `commit-${hash(`${repository.toLowerCase()}\0${sha}`)}.json`), envelope: { schemaVersion: 1, sourceBinding: binding, repository, sha, payloadSha256: hash(canonical(payload)), payload } };
  });
  for (const entry of entries) await writeFile(entry.path, canonical(entry.envelope));
  const modelData = {
    schemaVersion: 2, snapshot: { accounts: ["awsmadi", "mh0pe"], publicOnly: true, sourceExportGeneratedAt: completedAt },
    agents: [{ id: "claude-opus-4-7", kind: "model" }, { id: "claude-opus-5", kind: "model" }, { id: "github-copilot", kind: "platform" }],
    commits: shas.map((sha, index) => ({ sha, date, repository: "owner/project", accounts: [index === 2 ? "mh0pe" : "awsmadi"], agentId: ["claude-opus-4-7", "claude-opus-5", "github-copilot"][index], modelIds: index === 2 ? [] : [index === 0 ? "claude-opus-4-7" : "claude-opus-5"], platformIds: index === 2 ? ["github-copilot"] : [], additions: { code: 10, allText: 10 }, deletions: { code: 1, allText: 1 } })),
  };
  await writeFile(models, JSON.stringify(modelData));
  // Optional, explicit development-only compatibility oracle. CI leaves this
  // unset and exercises the real self-contained public module.
  const generator = process.env.ATTRIBUTION_REPLAY_ORACLE || undefined;
  return { root, history, fork, models, generator, cacheDirectory, namespace, bindingReceipt, entries, modelData };
}

async function rewriteEntry(entry) {
  entry.envelope.payloadSha256 = hash(canonical(entry.envelope.payload));
  await writeFile(entry.path, canonical(entry.envelope));
}

test("full offline replay merges fetched model markers before inference and keeps fetched accounts out of defaults", async t => {
  const f = await replayFixture(t), before = await snapshotFiles(f.root);
  const proof = await recoverAttributionProvenance(f);
  assert.deepEqual(proof.commits.map(row => row.basis), ["recorded-model-marker", "stated-awsmadi-date-rule", "platform-only"]);
  assert.deepEqual(proof.commits.map(row => row.modelIds), [["claude-opus-4-7"], ["claude-opus-5"], []]);
  assert.equal(proof.commits[0].sourceOccurrences[0].repository, "owner/fork");
  const summary = proof.inputBindings.commitDetailCache;
  assert.equal(summary.verification, "offline-source-bound"); assert.equal(summary.entries, 3);
  assert.equal(summary.sourceBinding, f.bindingReceipt.sourceBinding);
  assert.equal(summary.bindingSha256, hash(await readFile(resolve(f.namespace, "binding.json"))));
  const entries = f.entries.map(entry => ({ repository: entry.envelope.repository.toLowerCase(), sha: entry.envelope.sha, payloadSha256: entry.envelope.payloadSha256, envelopeSha256: hash(canonical(entry.envelope)) }));
  assert.equal(summary.entriesSha256, hash(canonical(entries)));
  assert.deepEqual(await recoverAttributionProvenance(f), proof);
  assert.deepEqual(await snapshotFiles(f.root), before);
  assert.doesNotMatch(JSON.stringify(proof), /Human implementation|Co-authored-by|email omitted|\/Volumes\/|\/Users\//);
});

for (const [label, mutate] of [
  ["nested author name", payload => { payload.commit.message = "Implemented capability"; payload.commit.author.name = "Claude Opus 4.7"; }],
  ["top-level committer name", payload => { payload.commit.message = "Implemented capability"; payload.committer = { name: "Claude Opus 4.7" }; }],
]) test(`replay uses the public module's fetched ${label} signal extraction`, async t => {
  const f = await replayFixture(t); mutate(f.entries[0].envelope.payload); await rewriteEntry(f.entries[0]);
  const proof = await recoverAttributionProvenance(f);
  assert.equal(proof.commits[0].basis, "recorded-model-marker"); assert.deepEqual(proof.commits[0].modelIds, ["claude-opus-4-7"]);
});

test("source-only replay remains available without any cache binding or cache reads", async t => {
  const f = await replayFixture(t);
  f.modelData.commits[0].modelIds = ["claude-opus-5"]; f.modelData.commits[0].agentId = "claude-opus-5";
  await writeFile(f.models, JSON.stringify(f.modelData));
  await rm(f.entries[0].path);
  const before = await snapshotFiles(f.root);
  const proof = await recoverAttributionProvenance({ ...f, cacheDirectory: undefined });
  assert.equal(proof.commits[0].basis, "stated-awsmadi-date-rule"); assert.ok(!("commitDetailCache" in proof.inputBindings));
  assert.deepEqual(await snapshotFiles(f.root), before);
});

test("retained nested numeric-key payload hashes replay using canonical lexical order", async t => {
  const f = await replayFixture(t), entry = f.entries[0];
  entry.envelope.payload.extra = {"2": "b", "10": {"3": "c", "12": "d"}};
  entry.envelope.payloadSha256 = hash(canonicalBytes(entry.envelope.payload));
  await writeFile(entry.path, canonicalBytes(entry.envelope));
  const before = await snapshotFiles(f.root);
  assert.equal((await recoverAttributionProvenance(f)).commits[0].basis, "recorded-model-marker");
  assert.deepEqual(await snapshotFiles(f.root), before);
});

test("cache timestamps compare exact instants including microseconds", async t => {
  const f = await replayFixture(t);
  f.entries[0].envelope.payload.commit.author.date = "2026-09-01T08:00:00.123456-04:00";
  f.modelData.commits[0].date = "2026-09-01T12:00:00.123456Z";
  await rewriteEntry(f.entries[0]); await writeFile(f.models, JSON.stringify(f.modelData));
  await recoverAttributionProvenance(f);
  f.modelData.commits[0].date = "2026-09-01T12:00:00.123457Z";
  await writeFile(f.models, JSON.stringify(f.modelData));
  await assert.rejects(recoverAttributionProvenance(f), /no output was written/);
});

for (const [label, mutate] of [
  ["corrupt payload hash", async f => { f.entries[0].envelope.payloadSha256 = "0".repeat(64); await writeFile(f.entries[0].path, canonical(f.entries[0].envelope)); }],
  ["wrong envelope generation", async f => { f.entries[0].envelope.sourceBinding = "0".repeat(64); await rewriteEntry(f.entries[0]); }],
  ["wrong manifest binding", async f => { f.bindingReceipt.historyManifestSha256 = "0".repeat(64); await writeFile(resolve(f.namespace, "binding.json"), canonical(f.bindingReceipt)); }],
  ["missing published SHA", async f => { await rm(f.entries[1].path); }],
  ["wrong requested SHA", async f => { f.entries[0].envelope.sha = "e".repeat(40); await rewriteEntry(f.entries[0]); }],
  ["wrong payload SHA", async f => { f.entries[0].envelope.payload.sha = "e".repeat(40); await rewriteEntry(f.entries[0]); }],
  ["wrong requested repository", async f => { f.entries[0].envelope.repository = "owner/elsewhere"; await rewriteEntry(f.entries[0]); }],
  ["different published repository without a resolved URL", async f => { delete f.entries[0].envelope.payload.html_url; await rewriteEntry(f.entries[0]); f.modelData.commits[0].repository = "owner/elsewhere"; await writeFile(f.models, JSON.stringify(f.modelData)); }],
  ["unsanitized email field", async f => { f.entries[0].envelope.payload.commit.author.email = "private@example.invalid"; await rewriteEntry(f.entries[0]); }],
  ["nested private payload", async f => { f.entries[0].envelope.payload.repository = { private: true }; await rewriteEntry(f.entries[0]); }],
  ["private object in array", async f => { f.entries[0].envelope.payload.extra = [{ private: true }]; await rewriteEntry(f.entries[0]); }],
  ["internal visibility", async f => { f.entries[0].envelope.payload.extra = { visibility: "internal" }; await rewriteEntry(f.entries[0]); }],
  ["uppercase sensitive field", async f => { f.entries[0].envelope.payload.extra = { EMAIL: "value" }; await rewriteEntry(f.entries[0]); }],
  ["Unicode email in filename", async f => { f.entries[0].envelope.payload.files[0].filename = "person@example.ſſ"; await rewriteEntry(f.entries[0]); }],
  ["Unicode unknown model", async f => { f.entries[0].envelope.payload.author.name = "Gemİnİ 999"; await rewriteEntry(f.entries[0]); }],
  ["extra envelope field", async f => { f.entries[0].envelope.extra = true; await rewriteEntry(f.entries[0]); }],
  ["wrong schema", async f => { f.entries[0].envelope.schemaVersion = 2; await rewriteEntry(f.entries[0]); }],
  ["missing file metrics", async f => { delete f.entries[0].envelope.payload.files; await rewriteEntry(f.entries[0]); }],
  ["different published metrics", async f => { f.entries[0].envelope.payload.files[0].additions = 11; f.entries[0].envelope.payload.stats.additions = 11; await rewriteEntry(f.entries[0]); }],
  ["missing parents", async f => { delete f.entries[0].envelope.payload.parents; await rewriteEntry(f.entries[0]); }],
  ["merge parents", async f => { f.entries[0].envelope.payload.parents.push({ sha: "e".repeat(40) }); await rewriteEntry(f.entries[0]); }],
  ["different author timestamp", async f => { f.entries[0].envelope.payload.commit.author.date = "2026-09-02T12:00:00Z"; await rewriteEntry(f.entries[0]); }],
  ["unknown fetched model", async f => { f.entries[0].envelope.payload.commit.author.name = "Claude Opus 999"; await rewriteEntry(f.entries[0]); }],
  ["linked entry", async f => { await rm(f.entries[0].path); await symlink(f.entries[1].path, f.entries[0].path); }],
  ["linked binding receipt", async f => { const receipt = resolve(f.root, "binding-copy.json"); await writeFile(receipt, canonical(f.bindingReceipt)); await rm(resolve(f.namespace, "binding.json")); await symlink(receipt, resolve(f.namespace, "binding.json")); }],
  ["linked cache namespace", async f => { const moved = resolve(f.root, "moved-namespace"); const { rename } = await import("node:fs/promises"); await rename(f.namespace, moved); await symlink(moved, f.namespace); }],
  ["linked cache root", async f => { const moved = resolve(f.root, "moved-cache"); const { rename } = await import("node:fs/promises"); await rename(f.cacheDirectory, moved); await symlink(moved, f.cacheDirectory); }],
]) test(`cache-bound replay rejects ${label} before writing either output`, async t => {
  const f = await replayFixture(t); await mutate(f);
  const before = await snapshotFiles(f.root), output = resolve(f.root, "proof.json"), basisOutput = resolve(f.root, "basis.json");
  const result = spawnSync(process.execPath, [replayTool, "--history", f.history, "--fork", f.fork, "--models", f.models, ...(f.generator ? ["--generator", f.generator] : []), "--cache-directory", f.cacheDirectory, "--output", output, "--basis-output", basisOutput], { encoding: "utf8" });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /Local provenance replay failed; no output was written/);
  assert.doesNotMatch(result.stderr, /private@example|Claude Opus 999|Human implementation/);
  await assert.rejects(lstat(output), { code: "ENOENT" }); await assert.rejects(lstat(basisOutput), { code: "ENOENT" });
  assert.deepEqual(await snapshotFiles(f.root), before);
});

test("CLI publishes proof and basis without a private generator", async t => {
  const f = await replayFixture(t), output = resolve(f.root, "proof.json"), basis = resolve(f.root, "basis.json");
  const result = spawnSync(process.execPath, [replayTool, "--history", f.history, "--fork", f.fork, "--models", f.models, "--cache-directory", f.cacheDirectory, "--output", output, "--basis-output", basis], {encoding: "utf8"});
  assert.equal(result.status, 0, result.stderr);
  const proof = JSON.parse(await readFile(output)); assert.equal(proof.commits.length, 3);
  assert.equal(JSON.parse(await readFile(basis)).basis, "rht");
  assert.ok(!(await readdir(f.root)).some(name => name.startsWith(".provenance-")));
});
test("CLI existing second output leaves first absent and original second untouched", async t => {
  const f = await replayFixture(t), output = resolve(f.root, "proof.json"), basis = resolve(f.root, "basis.json");
  await writeFile(basis, "existing"); const before = await snapshotFiles(f.root);
  const result = spawnSync(process.execPath, [replayTool, "--history", f.history, "--fork", f.fork, "--models", f.models, "--cache-directory", f.cacheDirectory, "--output", output, "--basis-output", basis], {encoding: "utf8"});
  assert.notEqual(result.status, 0); assert.match(result.stderr, /no output was written/);
  assert.deepEqual(await snapshotFiles(f.root), before);
});
