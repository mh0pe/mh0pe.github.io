import {createHash} from "node:crypto";
const sha = "a".repeat(40), parent = "b".repeat(40);
const canonical = value => Buffer.from(JSON.stringify(value, (_key, v) => v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : v));
const hash = value => createHash("sha256").update(canonical(value)).digest("hex");
export function metricReceipt() {
  const original = [{filename: "src/a.js", status: "modified", additions: 2, deletions: 1, changes: 3}];
  const files = [{filename: "src/a.js", status: "modified", additions: 10, deletions: 1, changes: 11}];
  const stats = {additions: 10, deletions: 1, total: 11};
  return {sha, parents: [{sha: parent}], stats, files, _fileMetricsReconciliation: {
    method: "public-git-exact-file-metrics-v1", repository: "owner/project", commit: sha, parents: [parent],
    original_api_stats: stats, original_api_files: original, original_inventory_sha256: hash(original), corrected_inventory_sha256: hash(files),
    numstat_sha256: "c".repeat(64), name_status_sha256: "d".repeat(64), rename_threshold: "50%",
    differences: [{filename: "src/a.js", reported: {additions: 2, deletions: 1, changes: 3}, measured: {additions: 10, deletions: 1, changes: 11}}],
  }};
}
export const replayCases = [];
function add(id, kind, args, value, ok = true) { replayCases.push({id, kind, args, expected: {ok, ...(ok ? {value} : {})}}); }
const marker = name => `Capability\n\nCo-authored-by: ${name} <[email omitted]>`;
for (const [name, id] of [["Claude Opus 4.7", "claude-opus-4-7"], ["Claude Opus 4.8 (1M context)", "claude-opus-4-8"], ["Claude Fable 5", "claude-fable-5"], ["Claude Sonnet 5", "claude-sonnet-5"], ["CODEX", "openai-codex"], ["copilot-swe-agent[bot]", "github-copilot"]]) {
  add(`marker:${name}`, "agents", [{message: marker(name)}], [id]);
}
add("nonfinal trailer ignored", "agents", [{message: `${marker("Claude Opus 4.7")}\n\nordinary body prose`}], []);
add("ordinary model prose ignored", "agents", [{message: "I discussed Claude Opus 999 in this change"}], []);
add("nested committer alias", "agents", [{commit: {committer: {name: "  Claude Opus 4.7  "}}}], ["claude-opus-4-7"]);
add("unknown model identity", "agents", [{author: {name: "Claude Opus 999"}}], null, false);
add("Unicode unknown model identity", "agents", [{author: {name: "Gemİnİ 999"}}], null, false);
add("casefold long s alias", "agents", [{author: {name: "Claude Opuſ 4.7"}}], ["claude-opus-4-7"]);
add("unknown alongside known identity", "agents", [{message: marker("Claude Opus 4.7"), committer_login: "gpt-999"}], null, false);
add("multiple explicit models and platform", "agents", [{message: `${marker("Claude Opus 4.7")}\nCo-authored-by: Claude Sonnet 5 <[email omitted]>`, author_login: "Copilot"}], ["claude-opus-4-7", "claude-sonnet-5", "github-copilot"]);
const boundaries = [["2024-03-04", "claude-3-opus"], ["2025-05-22", "claude-opus-4"], ["2025-08-05", "claude-opus-4-1"], ["2025-11-24", "claude-opus-4-5"], ["2026-02-05", "claude-opus-4-6"], ["2026-04-16", "claude-opus-4-7"], ["2026-05-28", "claude-opus-4-8"], ["2026-07-24", "claude-opus-5"], ["2026-09-22", "claude-opus-5-5"]];
for (const [i, [day, model]] of boundaries.entries()) {
  add(`date:on:${day}`, "date", [`${day}T00:00:00Z`, "2026-10-11T00:00:00Z"], model);
  const before = new Date(Date.parse(`${day}T00:00:00Z`) - 1).toISOString();
  add(`date:before:${day}`, "date", [before, "2026-10-11T00:00:00Z"], i ? boundaries[i - 1][1] : null, i > 0);
}
add("date UTC offset boundary", "date", ["2026-07-23T20:00:00-04:00", "2026-10-11T00:00:00Z"], "claude-opus-5");
add("same day later instant", "date", ["2026-09-01T23:00:00Z", "2026-09-01T00:00:00Z"], "claude-opus-5");
for (const [label, authored, cutoff] of [["beyond snapshot", "2026-09-02T00:00:00Z", "2026-09-01T00:00:00Z"], ["beyond calendar", "2026-10-12T00:00:00Z", "2026-10-15T00:00:00Z"], ["naive", "2026-09-01T00:00:00", "2026-10-11T00:00:00Z"], ["invalid", "2026-02-31T00:00:00Z", "2026-10-11T00:00:00Z"]]) add(`date:${label}`, "date", [authored, cutoff], null, false);
for (const [path, kind] of [["src/a.ts", "code"], ["docs/a.ts", "documentation"], ["skills/a.md", "code"], ["docs/AGENTS.md", "code"], ["dist/skills/a.md", "generated"], ["package-lock.json", "lockfile"], ["docs/photo.png", "binary"], ["src/a.generated.ts", "generated"], ["lib/a.pb.go", "generated"], ["vendor/x.js", "generated"], ["README", "documentation"], ["src\\a.ts", "code"]]) add(`file:${path}`, "classify", [path], kind);
add("mixed file metrics", "metrics", [{stats: {additions: 14, deletions: 7}, files: [
  {filename: "src/a.ts", additions: 2, deletions: 1}, {filename: "docs/a.md", additions: 2, deletions: 1},
  {filename: "skills/a.md", additions: 2, deletions: 1}, {filename: "package-lock.json", additions: 2, deletions: 1},
  {filename: "dist/a.js", additions: 2, deletions: 1}, {filename: "a.png", additions: 4, deletions: 2},
]}], [{code: 4, allText: 10}, {code: 2, allText: 5}, false]);
add("unreconciled raw metrics", "metrics", [{stats: {additions: 1, deletions: 0}, files: []}], null, false);
add("executable Markdown leading dot convention", "classify", [".skills/a.md"], "code");
add("valid raw public PR", "pr", ["https://github.com/owner/project/pull/12?view=diff#part"], "owner/project");
add("explicit port is not a raw public binding", "pr", ["https://github.com:443/owner/project/pull/12"], null, false);
add("dot segment cannot repair a PR binding", "pr", ["https://github.com/owner/wrong/../project/pull/12"], null, false);
add("credentialed authority is not public binding", "pr", ["https://user@github.com/owner/project/pull/12"], null, false);
add("valid metric receipt", "receipt", ["owner/project", sha, metricReceipt()], null);
for (const [label, mutate] of [
  ["method", p => {p._fileMetricsReconciliation.method = "unknown";}],
  ["repository", p => {p._fileMetricsReconciliation.repository = "owner/other";}],
  ["parent", p => {p.parents[0].sha = "B".repeat(40);}],
  ["threshold", p => {p._fileMetricsReconciliation.rename_threshold = "75%";}],
  ["original digest", p => {p._fileMetricsReconciliation.original_inventory_sha256 = "e".repeat(64);}],
  ["corrected digest", p => {p._fileMetricsReconciliation.corrected_inventory_sha256 = "e".repeat(64);}],
  ["proof shape", p => {p._fileMetricsReconciliation.numstat_sha256 = "invalid";}],
  ["file identity", p => {p.files[0].filename = "other.js";}],
  ["boolean metric", p => {p.files[0].deletions = true;}],
  ["duplicate inventory", p => {p._fileMetricsReconciliation.original_api_files.push({...p._fileMetricsReconciliation.original_api_files[0]});}],
  ["no difference", p => {p._fileMetricsReconciliation.differences = [];}],
  ["extra field", p => {p._fileMetricsReconciliation.extra = true;}],
  ["extra inventory metadata", p => {p._fileMetricsReconciliation.original_api_files[0].extra = true;}],
  ["incorrect stats", p => {p.stats.total = 12;}],
]) {
  const payload = metricReceipt(); mutate(payload); add(`receipt:${label}`, "receipt", ["owner/project", sha, payload], null, false);
}
