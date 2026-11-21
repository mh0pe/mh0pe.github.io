import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  unpackContributionPlayerRecordCatalog,
  unpackContributionPlayerRecords,
} from "../app/data/contribution-player-records-compact.mjs";

const root = new URL("../app/data/", import.meta.url);
const catalog = JSON.parse(await readFile(new URL("project-player-records.compact.json", root), "utf8"));

test("selected decoding preserves every complete canonical record", async () => {
  const full = unpackContributionPlayerRecordCatalog(catalog);
  for (const record of full) {
    const selected = unpackContributionPlayerRecords(catalog, record.id);
    assert.deepEqual(selected, record);
    const canonical = JSON.parse(await readFile(new URL(`project-player-records/${record.id}.json`, root), "utf8"));
    assert.deepEqual(selected, canonical);
  }
});

test("selection never decodes unrelated malformed or large payloads", () => {
  const wanted = ["wanted", ["example/repo"], []];
  const unrelated = ["unrelated"];
  Object.defineProperty(unrelated, 1, { get() { throw new Error("Unrequested repository payload accessed"); } });
  Object.defineProperty(unrelated, 2, { get() { throw new Error("Unrequested change payload accessed"); } });
  const large = ["large", ["example/repo"], new Array(100_000).fill(null)];
  const mixed = { v: catalog.v, g: [unrelated, large, wanted] };
  assert.deepEqual(unpackContributionPlayerRecords(mixed, "wanted"), {
    schemaVersion: 1, publicOnly: true, id: "wanted",
    repositories: [{ name: "example/repo", href: "https://github.com/example/repo" }], changes: [],
  });
  assert.throws(() => unpackContributionPlayerRecordCatalog(mixed), /Unrequested repository payload accessed/);
});

test("requested invalid payloads still fail closed", () => {
  const invalid = structuredClone(catalog.g.find(group => group[2].length));
  invalid[2][0][8] = "not-a-sha";
  assert.throws(() => unpackContributionPlayerRecords({ v: catalog.v, g: [invalid] }, invalid[0]), /invalid reference SHA/);
  assert.throws(() => unpackContributionPlayerRecords({ v: catalog.v, g: [["bad", null, []]] }, "bad"));
  assert.throws(() => unpackContributionPlayerRecords(catalog, "absent"), /do not contain absent/);
  assert.throws(() => unpackContributionPlayerRecords({ ...catalog, v: -1 }, catalog.g[0][0]), /Unsupported compact/);
  assert.throws(() => unpackContributionPlayerRecords({ v: catalog.v, g: null }, "wanted"), /Unsupported compact/);
});
