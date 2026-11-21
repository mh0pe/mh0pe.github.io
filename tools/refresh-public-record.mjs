import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readVerifiedSnapshot } from "./build-contribution-provenance.mjs";
import { fileURLToPath } from "node:url";

const accounts = ["awsmadi", "mh0pe"];


export async function buildPublicRecord(historyArgument, forkArgument) {
assert.ok(historyArgument && forkArgument, "Usage: node tools/refresh-public-record.mjs HISTORY_EXPORT FORK_AUDIT");
const historyRoot = resolve(historyArgument);
const forkRoot = resolve(forkArgument);
const history = await readVerifiedSnapshot(historyRoot);
const fork = await readVerifiedSnapshot(forkRoot, "fork");
assert.equal(history.manifest.collection_scope, "submitted_public_pull_requests_and_owned_public_nonfork_commits");
assert.equal(fork.manifest.source_export_manifest_sha256, history.binding.sha256, "Fork audit belongs to another history export");
const summary = JSON.parse(await readFile(resolve(historyRoot, "summary.json"), "utf8"));
const forkSummary = JSON.parse(await readFile(resolve(forkRoot, "summary.json"), "utf8"));
const pullRequests = (await readFile(resolve(historyRoot, "pull_requests.jsonl"), "utf8")).split(/\r?\n/).filter(Boolean).map(JSON.parse);
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
  source_manifests: { public_history_sha256: history.binding.sha256, fork_audit_sha256: fork.binding.sha256 },
};
return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const result = await buildPublicRecord(...process.argv.slice(2));
const destination = fileURLToPath(new URL("../app/data/public-history-summary.json", import.meta.url));
await writeFile(destination, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ destination, cutoff: result.cutoff_date, ...result.presentation, ...result.combined }));
}
