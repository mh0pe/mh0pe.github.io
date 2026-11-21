import assert from "node:assert/strict";
import {test} from "node:test";
import {readFile} from "node:fs/promises";
import {recordedAgents, inferOpus, classifyFile, commitMetrics, validateMetricsReceipt, canonicalBytes, prRepository} from "../tools/offline-attribution-replay.mjs";
import {replayCases} from "./fixtures/offline-replay-cases.mjs";
const functions = {
  agents: recordedAgents, date: inferOpus, classify: classifyFile, pr: prRepository,
  metrics: payload => {const m = commitMetrics(payload); return [m.additions, m.deletions, m.zeroDiff];},
  receipt: (...args) => {validateMetricsReceipt(...args); return null;},
};
for (const row of replayCases) test(`owned offline rule: ${row.id}`, () => {
  if (row.expected.ok) assert.deepEqual(functions[row.kind](...row.args), row.expected.value);
  else assert.throws(() => functions[row.kind](...row.args));
});
test("owned replay module exposes no network, child process or write dependency", async () => {
  const source = await readFile(new URL("../tools/offline-attribution-replay.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /node:(?:child_process|https?|net|tls)|\bfetch\s*\(|\b(?:writeFile|appendFile|mkdir|rename|unlink|symlink)\s*\(/);
  assert.doesNotMatch(source, /generate_agent_attribution_fallback|export_github_history|public_safety|\/Volumes\/|\/Users\//);
});
test("canonical payload hashes use lexical ordering even for numeric object keys", () => {
  assert.equal(canonicalBytes({"2": "b", "10": {"3": "c", "12": "d"}}).toString(), '{"10":{"12":"d","3":"c"},"2":"b"}');
});
