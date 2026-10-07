import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { tsImport } from "tsx/esm/api";

const root = new URL("../", import.meta.url);
const load = (path) => tsImport(new URL(path, root).href, import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const { developmentPhilosophy } = await load("app/data/philosophy.ts");
const { automatedSecurityHelperFlagship: ash, nixWindowsCaseStudy: nix, capabilityIndexRows, publicSources } = await load("app/data/portfolio-v2.ts");

test("philosophy is concise, shared, and connected to concrete work", async () => {
  assert.equal(developmentPhilosophy.length, 5);
  assert.equal(new Set(developmentPhilosophy.map((entry) => entry.id)).size, 5);
  assert.doesNotMatch(JSON.stringify(developmentPhilosophy), /\u2014/);
  const home = await read("pages-dist/index.html");
  const method = await read("pages-dist/method/index.html");
  assert.equal((home.match(/data-home-section="philosophy"/g) ?? []).length, 1);
  assert.doesNotMatch(home, /data-home-section="(?:practice|practice-detail|composition)"/);
  assert.match(method, /data-motion-film/);
  assert.equal((method.match(/class="method-stage__action"/g) ?? []).length, 7);
  assert.equal((home.match(/class="landing-principle"/g) ?? []).length, 5);
  for (const principle of developmentPhilosophy) {
    assert.ok(method.includes(`id="${principle.id}"`));
    assert.ok(method.includes(`href="${principle.href}"`));
    assert.ok(home.includes(`<summary><h3>${principle.title}`), `${principle.id} has a visible summary on the landing page`);
    assert.ok(home.includes(`href="${principle.href}"`), `${principle.id} connects to real work without another philosophy route`);
  }
});

test("recent ASH work links to implementation without inventing a release", async () => {
  const home = await read("pages-dist/index.html");
  const page = await read("pages-dist/work/automated-security-helper/index.html");
  assert.equal(ash.recentWork.length, 3);
  for (const work of ash.recentWork) {
    assert.ok(home.includes(publicSources[work.sourceId].href));
    assert.ok(home.includes(work.title));
  }
  for (const id of ["ash-result-integrity", "ash-scoped-agent-access", "ash-repeatable-environments"]) {
    const claim = ash.claims.find((entry) => entry.id === id);
    assert.equal(claim.state, "Merged");
    assert.equal(claim.observedAt, "2026-10-01");
    assert.ok(page.includes(`id="claim-${id}"`));
    assert.ok(claim.sourceIds.every((sourceId) => publicSources[sourceId].kind === "pull-request"));
    for (const name of ["Implementation", "State", "Proof"]) {
      assert.ok(ash.stages.find((stage) => stage.name === name).claimIds.includes(id));
    }
  }
  assert.equal(ash.claims.find((entry) => entry.id === "ash-completeness-implementation").state, "Open");
  assert.match(ash.claims.find((entry) => entry.id === "ash-scoped-agent-access").maturity, /not authenticate callers/);
});

test("adoption updates preserve usable public implementations", () => {
  const inheritance = nix.claims.find((entry) => entry.id === "nix-portable-inheritance");
  assert.equal(inheritance.state, "Merged");
  assert.deepEqual([...inheritance.sourceIds], ["nixPr16449"]);
  assert.ok(nix.stages.find((stage) => stage.name === "State").claimIds.includes(inheritance.id));
  assert.ok(!nix.claims.find((entry) => entry.id === "nix-portable-boundaries").sourceIds.includes("nixPr16449"));
  const pnp = capabilityIndexRows.find((entry) => entry.id === "rules-js-pnp");
  assert.ok(pnp.statusIds.includes("upstream-review-closed"));
  assert.ok(pnp.statusIds.includes("available-public-fork"));
  assert.ok(!pnp.statusIds.includes("upstream-review-active"));
});
