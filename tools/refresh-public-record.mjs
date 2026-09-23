import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const accounts = ["awsmadi", "mh0pe"];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function validatedSnapshot(directory) {
  const bytes = await readFile(resolve(directory, "manifest.json"));
  const manifest = JSON.parse(bytes);
  assert.equal(manifest.status, "complete", "Refusing an incomplete collection");
  assert.equal(manifest.public_only, true, "Only public work may enter the site");
  assert.deepEqual([...manifest.accounts].sort(), accounts);
  for (const [name, entry] of Object.entries(manifest.files)) {
    assert.equal(basename(name), name, "Manifest paths must be local filenames");
    const content = await readFile(resolve(directory, name));
    assert.equal(hash(content), entry.sha256, `Integrity check failed: ${name}`);
    if (name.endsWith(".jsonl")) {
      assert.equal(content.toString().split(/\r?\n/).filter(Boolean).length, entry.records, name);
    }
  }
  return { manifest, hash: hash(bytes) };
}

const [historyArgument, forkArgument] = process.argv.slice(2);
assert.ok(historyArgument && forkArgument, "Usage: node tools/refresh-public-record.mjs HISTORY_EXPORT FORK_AUDIT");
const historyRoot = resolve(historyArgument);
const forkRoot = resolve(forkArgument);
const history = await validatedSnapshot(historyRoot);
const fork = await validatedSnapshot(forkRoot);
assert.equal(history.manifest.collection_scope, "submitted_public_pull_requests_and_owned_public_nonfork_commits");
assert.equal(fork.manifest.source_export_manifest_sha256, history.hash, "Fork audit belongs to another history export");
const summary = JSON.parse(await readFile(resolve(historyRoot, "summary.json"), "utf8"));
const forkSummary = JSON.parse(await readFile(resolve(forkRoot, "summary.json"), "utf8"));
const pullRequests = (await readFile(resolve(historyRoot, "pull_requests.jsonl"), "utf8")).trim().split(/\r?\n/).map(JSON.parse);
assert.equal(pullRequests.length, summary.combined.pull_requests);
const mergedAuthored = pullRequests.filter((pr) => pr.state === "merged" && accounts.includes(pr.author));
assert.equal(mergedAuthored.length, summary.combined.merged_authored_pull_requests);
const result = {
  ...summary,
  counting_rules: {
    ...summary.counting_rules,
    delivery_state: "Capability availability and upstream adoption are separate. Public implementation branches remain inspectable work regardless of merge status.",
    direct_fork_delivery: "Account-attributed commits reachable from public fork branches, absent from current upstream branches, and not covered by a collected PR.",
  },
  fork_delivery_audit: {
    repositories_audited: forkSummary.repositories_audited,
    fork_only_commits: forkSummary.fork_only_commits,
    residual_commits_without_collected_pr: forkSummary.residual_commits_without_collected_pr,
    account_attributed_residual_commits: forkSummary.attributed_residual_commits,
    pr_covered_shas_excluded: forkSummary.pr_covered_shas_excluded,
  },
  presentation: {
    merged_authored_pr_target_repositories: new Set(mergedAuthored.map((pr) => pr.base.repository)).size,
  },
  source_manifests: { public_history_sha256: history.hash, fork_audit_sha256: fork.hash },
};
const destination = fileURLToPath(new URL("../app/data/public-history-summary.json", import.meta.url));
await writeFile(destination, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ destination, cutoff: result.cutoff_date, ...result.presentation, ...result.combined }));
