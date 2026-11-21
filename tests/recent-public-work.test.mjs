import assert from "node:assert/strict";
import test from "node:test";
import { tsImport } from "tsx/esm/api";
import { fullRefreshSpecs } from "../tools/full-refresh-plan.mjs";

const { automatedSecurityHelperFlagship: story, cloudFormationGuardCaseStudy: guard, publicSources } = await tsImport(new URL("../app/data/portfolio-v2.ts", import.meta.url).href, import.meta.url);
const { developmentPhilosophy } = await tsImport(new URL("../app/data/philosophy.ts", import.meta.url).href, import.meta.url);

test("recent security stories link the specific public work selected for visualization", () => {
  const visualSources = new Set(fullRefreshSpecs().flatMap(spec => spec.evidences.map(evidence => evidence.href)));
  assert.deepEqual(story.recentWork.map(item => item.sourceId), ["ashRelease380", "ashPr951", "ashPr969"]);
  for (const item of story.recentWork) assert.ok(story.claims.some(claim => claim.sourceIds.includes(item.sourceId)));
  for (const number of [696, 707, 710, 712, 717, 757, 784, 786, 793, 795, 804]) {
    const source = publicSources[`ashPr${number}`];
    assert.equal(source.href, `https://github.com/awslabs/automated-security-helper/pull/${number}`);
    assert.ok(visualSources.has(source.href));
  }
  for (const claim of story.claims) for (const id of claim.sourceIds) assert.ok(publicSources[id], id);
});

test("scanner access, operator policy, and task-led docs retain distinct proof boundaries", () => {
  const expected = {
    "ash-scanner-isolation": ["ashPr757", "ashPr786", "ashPr793"],
    "ash-operator-policy": ["ashPr784", "ashPr795"],
    "ash-task-led-documentation": ["ashPr804", "ashPr727", "ashRelease380", "ashPr969", "ashPr970"],
  };
  for (const [id, sources] of Object.entries(expected)) {
    const claim = story.claims.find(item => item.id === id);
    assert.ok(claim, id);
    assert.deepEqual(claim.sourceIds, sources);
    assert.equal(claim.publicOnly, true);
    const released = id === "ash-task-led-documentation";
    assert.equal(claim.observedAt, released ? "2026-11-21" : "2026-10-11");
    assert.equal(claim.state, released ? "Released" : "Merged");
    for (const name of ["Implementation", "State", "Proof"]) {
      const stage = story.stages.find(item => item.name === name);
      assert.ok(stage.claimIds.includes(id));
      for (const source of sources) assert.ok(stage.sourceIds.includes(source));
    }
  }
  const isolation = story.claims.find(item => item.id === "ash-scanner-isolation");
  assert.match(isolation.maturity, /opt-in and defaults off/);
  assert.match(isolation.maturity, /no native Windows backend/);
  assert.match(isolation.maturity, /host TCP and UDP/);
  const policy = story.claims.find(item => item.id === "ash-operator-policy");
  assert.match(policy.maturity, /retain their own link behavior/);
  const docs = story.claims.find(item => item.id === "ash-task-led-documentation");
  assert.match(docs.availability, /ASH v3\.8\.0/);
  assert.match(docs.adoption, /reached main through ASH #727/);
  assert.match(docs.adoption, /#804 records the earlier proposal/);
  assert.match(docs.maturity, /follow-ups came after v3\.8\.0/);
  assert.doesNotMatch(JSON.stringify(expected) + JSON.stringify(story.recentWork), /\u2014/);
});

test("October capability claims distinguish main-branch integration from releases and measurement", () => {
  const ids = ["ash-completeness-implementation", "ash-shared-policy", "ash-code-aware-exceptions", "ash-output-contract"];
  for (const id of ids) {
    const claim = story.claims.find(item => item.id === id);
    const released = id === "ash-completeness-implementation";
    assert.equal(claim.state, released ? "Released" : "Merged");
    assert.equal(claim.observedAt, released ? "2026-11-21" : "2026-10-11");
    assert.match(claim.availability, released ? /v3\.8\.0/ : /main branch/);
    assert.doesNotMatch(claim.outcome, /\d+%|every language|all execution paths/i);
    for (const name of ["Implementation", "State", "Proof"]) assert.ok(story.stages.find(stage => stage.name === name).claimIds.includes(id));
  }
  const completeness = story.claims.find(item => item.id === ids[0]);
  assert.deepEqual(completeness.sourceIds, ["ashPr640", "ashPr696", "ashRelease380"]);
  assert.match(completeness.adoption, /named in the v3\.8\.0 release notes/);
  assert.match(completeness.maturity, /reported scanner status and target counts/);
  assert.doesNotMatch(JSON.stringify(completeness), /not yet adopted|"Open"/);
  assert.match(story.claims.find(item => item.id === ids[2]).maturity, /optional symbol parsers/);
  assert.match(story.claims.find(item => item.id === ids[3]).maturity, /excludes container and Nix exit paths/);
});

test("existing result and environment claims retain earlier sources while adding October execution and distribution work", () => {
  const result = story.claims.find(item => item.id === "ash-result-integrity");
  const environment = story.claims.find(item => item.id === "ash-repeatable-environments");
  for (const [claim, old, added] of [
    [result, [661, 673, 687, 690, 699], [737, 759, 765, 767]],
    [environment, [692, 693], [740, 763, 766, 777]],
  ]) {
    assert.equal(claim.state, "Merged");
    assert.equal(claim.observedAt, "2026-10-11");
    for (const number of [...old, ...added]) {
      const id = `ashPr${number}`;
      assert.ok(claim.sourceIds.includes(id));
      assert.equal(publicSources[id].href, `https://github.com/awslabs/automated-security-helper/pull/${number}`);
      if (added.includes(number)) {
        for (const name of ["Implementation", "State", "Proof"]) assert.ok(story.stages.find(stage => stage.name === name).sourceIds.includes(id), `${name}: ${id}`);
      }
    }
  }
  assert.match(result.outcome, /npm, Yarn, and pnpm/);
  assert.match(result.maturity, /Offline audits have separate warning or skip behavior/);
  assert.match(result.maturity, /explicit process environments/);
  assert.match(environment.maturity, /not universal publisher attestation/);
  assert.match(environment.maturity, /maintainer\/legal decision/);
  assert.match(environment.maturity, /not a logged-in agent session/);
  assert.equal(story.recentWork.length, 3);
  for (const claim of story.claims.filter(item => item.observedAt === "2026-10-11")) {
    assert.doesNotMatch(claim.maturity, /rerun here|verification here|established here|no adoption measurement is claimed/i);
  }
});

test("September foundations enrich existing merged claims without changing selected project cards", () => {
  const additions = {
    "ash-repeatable-environments": [669, 670],
    "ash-output-contract": [678, 680, 689],
    "ash-shared-policy": [691],
  };
  for (const [claimId, numbers] of Object.entries(additions)) {
    const claim = story.claims.find(item => item.id === claimId);
    assert.equal(claim.state, "Merged", claimId);
    assert.match(claim.availability, /main branch/);
    for (const number of numbers) {
      const sourceId = `ashPr${number}`;
      assert.equal(publicSources[sourceId]?.href, `https://github.com/awslabs/automated-security-helper/pull/${number}`);
      assert.ok(claim.sourceIds.includes(sourceId), `${claimId}: ${sourceId}`);
      for (const name of ["Implementation", "State", "Proof"]) {
        assert.ok(story.stages.find(stage => stage.name === name).sourceIds.includes(sourceId), `${name}: ${sourceId}`);
      }
    }
  }
  assert.equal(story.claims.length, 15);
  assert.equal(story.recentWork.length, 3);
  assert.ok(story.contributionSummary.split(/\s+/).length <= 18);
  const sharedPolicy = story.claims.find(item => item.id === "ash-shared-policy");
  assert.match(sharedPolicy.maturity, /aliases and overrides/);
  assert.match(sharedPolicy.maturity, /configured plugin instances/);
  const output = story.claims.find(item => item.id === "ash-output-contract");
  assert.match(output.maturity, /CLI, MCP, and reporter references/);
  assert.match(output.maturity, /checks that reject drift/);
  assert.match(output.maturity, /Operational caveats remain hand-authored/);
  const docs = story.claims.find(item => item.id === "ash-task-led-documentation");
  assert.equal(docs.state, "Released");
  assert.ok(docs.sourceIds.includes("ashPr804"), "retain the historical documentation proposal");
});

test("November startup measurements and Guard releases stay separate from branch work", () => {
  const feedback = story.claims.find(item => item.id === "ash-faster-feedback");
  assert.equal(feedback.state, "Merged");
  assert.deepEqual(feedback.sourceIds, ["ashPr935", "ashPr936", "ashPr951", "ashPr965"]);
  assert.match(feedback.maturity, /same-host median.*version command, not end-to-end scanning/);
  assert.match(feedback.maturity, /replay, not a new CI wall-clock result/);
  for (const name of ["Implementation", "State", "Proof"]) {
    const stage = story.stages.find(item => item.name === name);
    assert.ok(stage.claimIds.includes(feedback.id));
    for (const source of feedback.sourceIds) assert.ok(stage.sourceIds.includes(source));
  }
  const released = guard.claims.find(item => item.id === "guard-replacement-test-matching");
  const wider = guard.claims.find(item => item.id === "guard-semantic-audit");
  assert.equal(released.state, "Released");
  assert.equal(publicSources.guardRelease322.href, "https://github.com/aws-cloudformation/cloudformation-guard/releases/tag/3.2.2");
  assert.deepEqual(released.sourceIds, ["guardRelease322", "guardPr749", "guardPr750"]);
  assert.equal(wider.state, "Open");
  for (const source of released.sourceIds) assert.ok(!wider.sourceIds.includes(source));
});

test("result and delivery refinements keep their operational and measurement boundaries", () => {
  assert.match(story.operatingResult, /traceable project results and recorded failures/);
  assert.doesNotMatch(story.operatingResult, /without losing/);
  const completeness = story.claims.find(item => item.id === "ash-completeness-implementation");
  assert.match(completeness.maturity, /valid rule CVSS scores/i);
  assert.match(completeness.maturity, /malformed GitLab findings/);
  assert.match(completeness.maturity, /container\/Nix runs discard stale artifacts/);
  assert.match(completeness.maturity, /unless reuse is requested/);
  assert.match(completeness.maturity, /do not establish that every scanner or converter failure is detected/);
  const environment = story.claims.find(item => item.id === "ash-repeatable-environments");
  assert.match(environment.maturity, /PR reviews report 113 validation combinations retained across 33 jobs, not measured time savings/);
  assert.match(environment.maturity, /explicit artifact\/cache publication inventory/);
  assert.match(environment.maturity, /not every possible upload path/);
  const meaning = developmentPhilosophy.find(item => item.id === "meaning");
  assert.match(meaning.body, /tests fail for the defect they claim to catch/);
  assert.doesNotMatch(JSON.stringify(story) + JSON.stringify(developmentPhilosophy), /\u2014/);
});
