import assert from "node:assert/strict";

// Separate from byte hashes: valid files can still contain contradictory joins.
export function validatePrRelationships(contents) {
  const commits = contents["commits.jsonl"];
  const prs = contents["pull_requests.jsonl"];
  const memberships = contents["pull_request_commits.jsonl"];
  for (const rows of [commits, prs, memberships]) assert.ok(Array.isArray(rows), "Missing PR relationship files");
  const repository = (value) => {
    assert.match(value ?? "", /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Invalid relationship repository");
    return value.toLowerCase();
  };
  const commitKey = (repo, sha) => {
    assert.match(sha ?? "", /^[0-9a-f]{40,64}$/, "Invalid relationship commit SHA");
    return JSON.stringify([repository(repo), sha]);
  };
  const canonical = (value) => JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));
  const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);
  const actual = new Map(), expected = new Map(), records = new Map(), byUrl = new Map(), byPr = new Map();
  for (const row of commits) {
    const key = commitKey(row.repository, row.sha);
    assert.ok(!records.has(key), "Duplicate commit identity");
    records.set(key, row);
    assert.ok(Array.isArray(row.associations), "Missing commit associations");
    for (const a of row.associations) {
      assert.ok(a && typeof a === "object" && !Array.isArray(a), "Invalid commit association");
      if (a.kind === "pull_request") bump(actual, JSON.stringify([key, canonical(a)]));
      else assert.ok(!["pull_request_url", "pull_request", "ordinal"].some((field) => Object.hasOwn(a, field)), "PR fields on a non-PR association");
    }
  }
  for (const pr of prs) {
    repository(pr.base?.repository);
    assert.ok(Number.isSafeInteger(pr.number) && pr.number > 0);
    assert.equal(pr.html_url, `https://github.com/${pr.base.repository}/pull/${pr.number}`);
    assert.ok(!byUrl.has(pr.html_url), "Duplicate PR identity");
    assert.ok(Number.isSafeInteger(pr.reported_counts?.commits) && pr.reported_counts.commits >= 0, "Invalid PR commit count");
    byUrl.set(pr.html_url, pr);
    byPr.set(pr.html_url, []);
  }
  for (const row of memberships) {
    const pr = byUrl.get(row.pull_request_url);
    assert.ok(pr, "Membership references a missing PR");
    assert.ok(Number.isSafeInteger(row.ordinal) && row.ordinal >= 0, "Invalid membership ordinal");
    assert.equal(row.base_repository, pr.base.repository);
    assert.equal(row.pull_request_number, pr.number);
    assert.ok(Object.hasOwn(row, "pull_request_node_id"));
    assert.equal(row.pull_request_node_id, pr.node_id ?? null);
    const key = commitKey(row.commit_repository, row.commit_sha);
    assert.ok(records.has(key), "Membership references a missing commit");
    byPr.get(pr.html_url).push(row);
    bump(expected, JSON.stringify([key, canonical({ kind: "pull_request", pull_request: `${pr.base.repository}#${pr.number}`, pull_request_url: pr.html_url, ordinal: row.ordinal })]));
  }
  for (const [url, rows] of byPr) {
    const count = byUrl.get(url).reported_counts.commits;
    assert.equal(rows.length, count, "PR membership count mismatch");
    assert.equal(new Set(rows.map((row) => row.commit_sha)).size, count, "Duplicate PR commit");
    assert.deepEqual(rows.map((row) => row.ordinal).sort((a, b) => a - b), Array.from({ length: count }, (_, i) => i), "PR ordinal mismatch");
  }
  assert.deepEqual(actual, expected, "PR association/membership mismatch");
  return { commits: commits.length, pullRequests: prs.length, memberships: memberships.length, associations: [...actual.values()].reduce((a, b) => a + b, 0) };
}
