import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { resolve, posix } from "node:path";

// Frozen compatibility rules for the accepted October 11 collection, not a
// live model catalog. Replaying evidence never extends the collection cutoff.
const releases = [
  ["2024-03-04", "claude-3-opus"], ["2025-05-22", "claude-opus-4"],
  ["2025-08-05", "claude-opus-4-1"], ["2025-11-24", "claude-opus-4-5"],
  ["2026-02-05", "claude-opus-4-6"], ["2026-04-16", "claude-opus-4-7"],
  ["2026-05-28", "claude-opus-4-8"], ["2026-07-24", "claude-opus-5"],
  ["2026-09-22", "claude-opus-5-5"],
];
const identities = new Map();
const kinds = new Map();
function identity(id, kind, ...names) {
  kinds.set(id, kind);
  for (const name of names) identities.set(name.toLowerCase(), id);
}
identity("claude-3-opus", "model", "Claude 3 Opus");
for (const version of ["4", "4.1", "4.5", "4.6", "4.7", "4.8", "5", "5.5"]) {
  identity(`claude-opus-${version.replaceAll(".", "-")}`, "model", `Claude Opus ${version}`,
    ...(["4.6", "4.7", "4.8"].includes(version) ? [`Claude Opus ${version} (1M context)`] : []));
}
for (const version of ["4.6", "5"]) identity(`claude-sonnet-${version.replaceAll(".", "-")}`, "model", `Claude Sonnet ${version}`);
identity("claude-fable-5", "model", "Claude Fable 5");
identity("anthropic-claude", "platform", "Claude");
identity("github-copilot", "platform", "GitHub Copilot", "Copilot", "copilot-swe-agent[bot]");
identity("openai-codex", "platform", "OpenAI Codex", "Codex");
identity("shared", "aggregate", "Shared / multi-agent");
const modelLike = /(?:^|[^\p{L}\p{N}_])(?:anthropic|claude|openai|chatgpt|copilot|codex|gemini|gemma|gpt(?:[- .]?[a-z0-9][a-z0-9.-]*)?|o[1-9][0-9]*(?:[-.][a-z0-9]+)*|llama|mistral|mixtral|grok|qwen|deepseek)(?![\p{L}\p{N}_])/u;
const lockfiles = new Set("bun.lock bun.lockb cargo.lock composer.lock gemfile.lock gradle.lockfile mix.lock npm-shrinkwrap.json package-lock.json pipfile.lock pnpm-lock.yaml podfile.lock poetry.lock pubspec.lock uv.lock yarn.lock".split(" "));
const binary = new Set(".7z .a .avi .bin .bmp .class .dmg .doc .docx .eot .exe .gif .gz .ico .jar .jpeg .jpg .mov .mp3 .mp4 .otf .o .pdf .png .ppt .pptx .pyc .so .tar .tgz .tif .tiff .ttf .wav .webm .webp .woff .woff2 .xls .xlsx .zip .xz".split(" "));
const generated = new Set("__snapshots__ .next build coverage dist generated gen node_modules out snapshots target third_party vendor".split(" "));
const privateFields = new Set("billing collaborators disk_usage email ldap_dn owned_private_repos permissions plan private_gists private_repos ratelimit role_name total_private_repos two_factor_authentication".split(" "));
const email = /(?<![\p{L}\p{N}_.+-])[\p{L}\p{N}_.+-]+@[\p{L}\p{N}_.-]+\.[A-Za-zİıſK]{2,}(?![\p{L}\p{N}_.-])/u;
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const order = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (object(value)) return `{${Object.keys(value).sort(order).map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  assert.ok(value === null || ["string", "boolean"].includes(typeof value) || (typeof value === "number" && Number.isFinite(value)));
  return JSON.stringify(value);
}
export const canonicalBytes = value => Buffer.from(canonical(value));
const foldIdentity = value => value.toLowerCase().replaceAll("ſ", "s").replaceAll("ß", "ss");
const same = (a, b) => assert.deepEqual(a, b);
function keys(value, expected) { assert.ok(object(value)); same(Object.keys(value).sort(), [...expected].sort()); }
function sha(value) { assert.equal(typeof value, "string"); assert.match(value, /^[a-f0-9]{40}$/i); return value.toLowerCase(); }
function repository(value) { assert.equal(typeof value, "string"); assert.match(value, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/); return value; }

export function recordedAgents(record) {
  const names = [];
  const nested = object(record.commit) ? record.commit : {};
  for (const message of [record.message, nested.message]) {
    if (typeof message !== "string") continue;
    const lines = message.split(/\r?\n/);
    while (lines.length && !lines.at(-1).trim()) lines.pop();
    while (lines.length && /^[A-Za-z][A-Za-z0-9-]*:\s+\S.*$/.test(lines.at(-1).trim())) {
      const match = /^Co-authored-by:\s*(.+?)\s*<[^<>]+>\s*$/i.exec(lines.pop().trim());
      if (match) names.push(match[1]);
    }
  }
  for (const role of ["author", "committer"]) {
    names.push(record[`${role}_login`]);
    for (const parent of [record[role], nested[role]]) if (object(parent)) names.push(parent.name, parent.login);
  }
  const found = new Set();
  for (const name of names) {
    if (typeof name !== "string" || !name.trim()) continue;
    const id = identities.get(foldIdentity(name.trim()));
    if (id) found.add(id);
    else assert.ok(!modelLike.test(foldIdentity(name).replaceAll("i\u0307", "i").replaceAll("ı", "i")), "Unrecognized model identity");
  }
  return [...found].sort(order);
}

function instant(value) {
  assert.equal(typeof value, "string");
  const m = /^(\d{4})-(\d{2})-(\d{2})[Tt ](\d{2}):(\d{2}):(\d{2})(?:[.,](\d+))?(Z|[+-]\d{2}:?\d{2})$/.exec(value);
  assert.ok(m, "A valid timestamp with timezone is required");
  const [, y, month, day, hour, minute, second, fraction = "", zone] = m;
  const date = new Date(0); date.setUTCFullYear(+y, +month - 1, +day); date.setUTCHours(+hour, +minute, +second, 0);
  same([date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()], [+y, +month, +day, +hour, +minute, +second]);
  const z = zone === "Z" ? [0, 0] : [Number(zone.slice(1, 3)), Number(zone.slice(-2))];
  assert.ok(z[0] < 24 && z[1] < 60);
  const offset = (z[0] * 60 + z[1]) * (zone[0] === "-" ? -1 : 1);
  const milliseconds = date.getTime() - offset * 60000;
  return {micros: BigInt(milliseconds) * 1000n + BigInt(fraction.padEnd(6, "0").slice(0, 6)), day: new Date(milliseconds).toISOString().slice(0, 10)};
}
export function inferOpus(authoredAt, completedAt) {
  const day = instant(authoredAt).day;
  assert.ok(day <= instant(completedAt).day && day <= "2026-10-11", "Date outside frozen attribution calendar");
  const release = releases.findLast(([boundary]) => boundary <= day);
  assert.ok(release, "Date before supported attribution calendar");
  return release[1];
}

export function classifyFile(filename) {
  const path = String(filename ?? "").replaceAll("\\", "/").replace(/^\/+|\/+$/g, "").toLowerCase();
  const parts = path.split("/").filter(Boolean), name = parts.at(-1) ?? "", dirs = parts.slice(0, -1);
  const suffix = posix.extname(name);
  if (binary.has(suffix)) return "binary";
  if (lockfiles.has(name)) return "lockfile";
  if (dirs.some(part => generated.has(part)) || /\.min\.|\.generated\.|(?:\.map|\.g\.dart|\.pb\.go|\.designer\.cs)$/.test(name)) return "generated";
  const executableDirs = path.replace(/^[./]+/, "").split("/").filter(Boolean).slice(0, -1);
  if (/\.(md|mdx|markdown)$/.test(name) && (["agents.md", "claude.md", "seed.md", "skill.md"].includes(name) || executableDirs.some(part => ["base-framework", "commands", "paul-framework", "skills"].includes(part)))) return "code";
  if (dirs.some(part => ["doc", "docs", "documentation", "man"].includes(part)) || /\.(adoc|markdown|md|mdx|rst|txt)$/.test(name) || /^(changelog|code_of_conduct|contributing|license|readme)/.test(name)) return "documentation";
  return "code";
}

export function commitMetrics(payload) {
  assert.ok(object(payload.stats) && Array.isArray(payload.files));
  // Preserve the original base-metric integer semantics; receipt-backed
  // inventories below require strictly nonnegative, non-boolean integers.
  const integer = value => Number.isSafeInteger(value) || typeof value === "boolean";
  assert.ok(integer(payload.stats.additions) && integer(payload.stats.deletions));
  const additions = {code: 0, allText: 0}, deletions = {code: 0, allText: 0};
  let rawAdded = 0, rawDeleted = 0;
  for (const file of payload.files) {
    assert.ok(object(file) && typeof file.filename === "string" && integer(file.additions) && integer(file.deletions));
    const category = classifyFile(file.filename), a = Number(file.additions), d = Number(file.deletions);
    rawAdded += a; rawDeleted += d;
    if (category !== "binary") { additions.allText += a; deletions.allText += d; }
    if (category === "code") { additions.code += a; deletions.code += d; }
  }
  same(rawAdded, Number(payload.stats.additions)); same(rawDeleted, Number(payload.stats.deletions));
  return {additions, deletions, zeroDiff: rawAdded === 0 && rawDeleted === 0};
}

function sanitized(value) {
  if (typeof value === "string") assert.ok(!email.test(value), "Unsanitized cached text");
  else if (Array.isArray(value)) value.forEach(sanitized);
  else if (object(value)) {
    assert.ok(value.private !== true && value.isPrivate !== true && String(value.visibility ?? "").toLowerCase() !== "private" && value.visibility !== "internal", "Non-public cached data");
    for (const [key, child] of Object.entries(value)) {
      assert.ok(!privateFields.has(key.toLowerCase()), "Unsanitized cached field"); sanitized(child);
    }
  }
}

function inventory(files) {
  assert.ok(Array.isArray(files));
  const seen = new Set();
  return files.map(file => {
    assert.ok(object(file));
    const {filename, status, additions, deletions, changes, previous_filename} = file;
    assert.ok(typeof filename === "string" && filename && !filename.includes("\0") && !seen.has(filename)); seen.add(filename);
    assert.ok(["added", "removed", "modified", "renamed", "changed"].includes(status));
    assert.ok([additions, deletions, changes].every(n => Number.isSafeInteger(n) && n >= 0));
    same(changes, additions + deletions);
    if (status === "renamed") assert.ok(typeof previous_filename === "string" && previous_filename && !previous_filename.includes("\0") && previous_filename !== filename);
    else assert.ok(previous_filename == null);
    return {filename, status, additions, deletions, changes, ...(status === "renamed" ? {previous_filename} : {})};
  }).sort((a, b) => order(a.filename, b.filename));
}

export function validateMetricsReceipt(repo, id, payload) {
  const receipt = payload._fileMetricsReconciliation;
  if (receipt == null) return;
  keys(receipt, ["method", "repository", "commit", "parents", "original_api_stats", "original_api_files", "original_inventory_sha256", "corrected_inventory_sha256", "numstat_sha256", "name_status_sha256", "rename_threshold", "differences"]);
  same(payload.sha, id); assert.ok(Array.isArray(payload.parents) && payload.parents.length === 1);
  const parent = payload.parents[0]?.sha; same(sha(parent), parent);
  same(receipt.method, "public-git-exact-file-metrics-v1"); same(receipt.rename_threshold, "50%");
  same(receipt.repository, repo); same(receipt.commit, id); same(receipt.parents, [parent]);
  const before = inventory(receipt.original_api_files), after = inventory(payload.files);
  assert.ok(before.length > 0 && before.length < 3000); same(before, receipt.original_api_files);
  const withoutMetrics = rows => rows.map(({filename, status, previous_filename}) => ({filename, status, ...(previous_filename == null ? {} : {previous_filename})}));
  same(withoutMetrics(before), withoutMetrics(after));
  for (const key of ["original_inventory_sha256", "corrected_inventory_sha256", "numstat_sha256", "name_status_sha256"]) assert.match(receipt[key], /^[a-f0-9]{64}$/);
  same(hash(canonicalBytes(before)), receipt.original_inventory_sha256); same(hash(canonicalBytes(after)), receipt.corrected_inventory_sha256);
  keys(payload.stats, ["additions", "deletions", "total"]);
  assert.ok(Object.values(payload.stats).every(n => Number.isSafeInteger(n) && n >= 0));
  same(payload.stats, receipt.original_api_stats); same(payload.stats.total, payload.stats.additions + payload.stats.deletions);
  const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);
  for (const [field, stat] of [["additions", "additions"], ["deletions", "deletions"], ["changes", "total"]]) same(sum(after, field), payload.stats[stat]);
  const metric = row => ({additions: row.additions, deletions: row.deletions, changes: row.changes});
  const differences = before.flatMap((row, i) => canonicalBytes(row).equals(canonicalBytes(after[i])) ? [] : [{filename: row.filename, reported: metric(row), measured: metric(after[i])}]);
  assert.ok(differences.length); same(receipt.differences, differences);
  assert.ok(sum(before, "additions") !== payload.stats.additions || sum(before, "deletions") !== payload.stats.deletions || sum(before, "changes") !== payload.stats.total);
}

export function sourceGenerationBinding(history, fork) {
  const digest = createHash("sha256");
  for (const [label, bytes] of [["history-manifest", history], ["fork-manifest", fork]]) {
    const size = Buffer.alloc(8); size.writeBigUInt64BE(BigInt(bytes.length));
    digest.update(label).update(Buffer.from([0])).update(size).update(bytes);
  }
  return digest.digest("hex");
}
async function regular(path, directory = false) {
  const stat = await lstat(path);
  assert.ok(!stat.isSymbolicLink() && (directory ? stat.isDirectory() : stat.isFile()), "Unsafe cache path");
}
async function readRegular(path) {
  await regular(path);
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try { assert.ok((await handle.stat()).isFile()); return await handle.readFile(); }
  finally { await handle.close(); }
}
function githubPath(value, kind) {
  assert.equal(typeof value, "string");
  // Do not let WHATWG URL normalization repair a malformed evidence binding.
  const match = /^https:\/\/github\.com(\/[^?#]*)(?:[?#].*)?$/.exec(value);
  assert.ok(match);
  const pieces = match[1].split("/").filter(Boolean);
  assert.ok(pieces.length === 4 && pieces[2] === kind);
  return pieces;
}
export function prRepository(value) {
  const pieces = githubPath(value, "pull"); assert.match(pieces[3], /^[+-]?\d+$/);
  return repository(pieces.slice(0, 2).join("/"));
}
function commitRepository(value, id) {
  try { const pieces = githubPath(value, "commit"); same(pieces[3].toLowerCase(), id.toLowerCase()); return repository(pieces.slice(0, 2).join("/")); }
  catch { return null; }
}

// This module has no network, child-process, mutable-cache, or write APIs.
export async function replayAttribution(data) {
  const occurrences = new Map(), used = new Map();
  for (const [source, records] of [["public-history", data.history], ["public-fork", data.fork]]) {
    for (const record of records) {
      if (source === "public-fork" && (!record.attributed_accounts || (Array.isArray(record.attributed_accounts) && !record.attributed_accounts.length))) continue;
      if (!occurrences.has(record.sha)) occurrences.set(record.sha, []);
      occurrences.get(record.sha).push({source, record});
    }
  }
  let directory, bindingPath, bindingBytes, binding;
  if (data.cacheDirectory) {
    const history = Buffer.from(data.historyManifestBytes, "base64"), fork = Buffer.from(data.forkManifestBytes, "base64");
    binding = sourceGenerationBinding(history, fork); directory = resolve(data.cacheDirectory, binding);
    await regular(data.cacheDirectory, true); await regular(directory, true);
    bindingPath = resolve(directory, "binding.json"); bindingBytes = await readRegular(bindingPath);
    same(JSON.parse(bindingBytes), {schemaVersion: 1, sourceBinding: binding, historyManifestSha256: hash(history), historyManifestBytes: history.length, forkManifestSha256: hash(fork), forkManifestBytes: fork.length});
  }
  const commits = [];
  for (const commit of data.commits) {
    const records = occurrences.get(commit.sha); assert.ok(records?.length, "Missing source occurrence");
    const agents = new Set(), eligible = new Set(), prs = new Set(), references = new Map(); let defaultEligible = false;
    for (const {source, record} of records) {
      const found = recordedAgents(record), repo = repository(record.repository);
      const accounts = record[source === "public-history" ? "matched_accounts" : "attributed_accounts"];
      const inferred = Array.isArray(accounts) && accounts.includes("awsmadi");
      found.forEach(id => agents.add(id)); defaultEligible ||= inferred;
      references.set(`${source}\0${repo}`, {source, repository: repo});
      if (found.length || inferred) {
        eligible.add(repo);
        for (const association of record.associations ?? []) if (association?.pull_request_url) prs.add(prRepository(association.pull_request_url));
      }
    }
    if (directory) {
      for (const membership of data.memberships ?? []) if (membership.commit_sha === commit.sha) {
        prRepository(membership.pull_request_url); prs.add(repository(membership.base_repository));
      }
      assert.ok(eligible.size, "No eligible source request");
      const repo = [...(prs.size ? prs : eligible)].sort(order)[0], id = sha(commit.sha);
      const path = resolve(directory, `commit-${hash(`${repo.toLowerCase()}\0${id}`)}.json`), bytes = await readRegular(path);
      const envelope = JSON.parse(bytes);
      keys(envelope, ["schemaVersion", "sourceBinding", "repository", "sha", "payloadSha256", "payload"]);
      same(envelope.schemaVersion, 1); same(envelope.sourceBinding, binding); same(String(envelope.repository).toLowerCase(), repo.toLowerCase()); same(sha(envelope.sha), id);
      const payload = envelope.payload; same(hash(canonicalBytes(payload)), envelope.payloadSha256);
      sanitized(payload); assert.ok(object(payload)); same(sha(payload.sha), id); validateMetricsReceipt(repo, id, payload);
      assert.ok(bytes.equals(await readRegular(path)), "Cache entry changed during replay");
      assert.ok(Array.isArray(payload.parents) && payload.parents.length <= 1); payload.parents.forEach(parent => sha(parent?.sha));
      const metrics = commitMetrics(payload); assert.ok(!metrics.zeroDiff); same(metrics.additions, commit.additions); same(metrics.deletions, commit.deletions);
      same(instant(payload.commit?.author?.date).micros, instant(commit.date).micros);
      const resolved = payload._resolvedRepository || commitRepository(payload.html_url, id);
      same(typeof resolved === "string" ? repository(resolved) : repo, commit.repository);
      recordedAgents(payload).forEach(agent => agents.add(agent));
      used.set(`${repo.toLowerCase()}\0${id}`, {repository: repo.toLowerCase(), sha: id, payloadSha256: envelope.payloadSha256, envelopeSha256: hash(bytes)});
    }
    const explicit = [...agents].filter(id => kinds.get(id) === "model").sort(order);
    const modelIds = explicit.length ? explicit : defaultEligible ? [inferOpus(commit.date, data.sourceCompletedAt)] : [];
    const basis = explicit.length ? "recorded-model-marker" : modelIds.length ? "stated-awsmadi-date-rule" : agents.size ? "platform-only" : "missing-marker";
    commits.push({sha: commit.sha, modelIds, basis, sourceOccurrences: [...references.keys()].sort(order).map(key => references.get(key))});
  }
  let cacheBinding = null;
  if (directory) {
    assert.ok(bindingBytes.equals(await readRegular(bindingPath)), "Cache binding changed during replay");
    const entries = [...used.keys()].sort(order).map(key => used.get(key));
    cacheBinding = {verification: "offline-source-bound", sourceBinding: binding, bindingSha256: hash(bindingBytes), entries: entries.length, entriesSha256: hash(canonicalBytes(entries))};
  }
  return {commits, cacheBinding};
}
