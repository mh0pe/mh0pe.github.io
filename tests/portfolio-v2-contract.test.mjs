import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { tsImport } from "tsx/esm/api";

const content = await tsImport(
  new URL("../app/data/portfolio-v2.ts", import.meta.url).href,
  import.meta.url,
);
const { ClaimLedger, SourceLink } = await tsImport(
  new URL("../app/components/v2/Evidence.tsx", import.meta.url).href,
  import.meta.url,
);

const {
  caseStudies,
  architectureDecisions,
  capabilityIndexRows,
  flagshipStageNames,
  homepageCapabilityIds,
  organizationContexts,
  outcomeSummaries,
  portfolioIdentity,
  portfolioV2,
  publicRecordSnapshot,
  publicSources,
  statusVocabulary,
} = content;

function unique(values, label) {
  assert.equal(new Set(values).size, values.length, label + " IDs must be unique");
}

test("pins the auditable load path content cardinalities", () => {
  assert.equal(outcomeSummaries.length, 4);
  assert.equal(caseStudies.length, 4);
  assert.equal(architectureDecisions.length, 3);
  assert.equal(capabilityIndexRows.length, 9);
  assert.equal(homepageCapabilityIds.length, 6);
  assert.deepEqual([...flagshipStageNames], [
    "Pressure",
    "Constraint",
    "Decision",
    "Implementation",
    "State",
    "Proof",
  ]);

  for (const caseStudy of caseStudies) {
    assert.deepEqual(caseStudy.stages.map((stage) => stage.name), [...flagshipStageNames]);
  }
});

test("resolves every claim, source, status, and homepage capability", () => {
  unique(outcomeSummaries.map((item) => item.id), "outcome");
  unique(caseStudies.map((item) => item.id), "case");
  unique(architectureDecisions.map((item) => item.id), "decision");
  unique(capabilityIndexRows.map((item) => item.id), "capability");
  unique(statusVocabulary.map((item) => item.id), "status");

  const claimIds = caseStudies.flatMap((item) => item.claims.map((claim) => claim.id));
  unique(claimIds, "claim");

  const sourceIds = new Set(Object.keys(publicSources));
  const statusIds = new Set(statusVocabulary.map((item) => item.id));
  const capabilityIds = new Set(capabilityIndexRows.map((item) => item.id));

  for (const caseStudy of caseStudies) {
    const localClaims = new Set(caseStudy.claims.map((claim) => claim.id));
    assert.ok(sourceIds.has(caseStudy.repositorySourceId));
    for (const stage of caseStudy.stages) {
      assert.ok(stage.sourceIds.length > 0);
      for (const id of stage.sourceIds) assert.ok(sourceIds.has(id), id);
      for (const id of stage.claimIds ?? []) assert.ok(localClaims.has(id), id);
    }
    for (const claim of caseStudy.claims) {
      assert.equal(claim.publicOnly, true);
      assert.match(claim.observedAt, /^\d{4}-\d{2}-\d{2}$/);
      for (const id of claim.sourceIds) assert.ok(sourceIds.has(id), id);
    }
  }

  for (const item of [...outcomeSummaries, ...architectureDecisions, ...capabilityIndexRows]) {
    for (const id of item.sourceIds) assert.ok(sourceIds.has(id), id);
    for (const id of item.statusIds ?? []) assert.ok(statusIds.has(id), id);
  }
  for (const id of homepageCapabilityIds) assert.ok(capabilityIds.has(id), id);
});

test("keeps evidence URLs public, credential-free, and state-compatible", () => {
  for (const [id, source] of Object.entries(publicSources)) {
    const url = new URL(source.href);
    assert.equal(url.protocol, "https:", id);
    assert.equal(url.username, "", id);
    assert.equal(url.password, "", id);
    assert.ok(["github.com", "www.linkedin.com", "awslabs.github.io"].includes(url.hostname), id);
  }

  for (const caseStudy of caseStudies) {
    for (const claim of caseStudy.claims) {
      const kinds = claim.sourceIds.map((id) => publicSources[id].kind);
      if (claim.state === "Released") assert.ok(kinds.includes("release"), claim.id);
      if (claim.state === "Merged") assert.ok(kinds.includes("pull-request"), claim.id);
      if (claim.state === "Open") {
        assert.ok(kinds.includes("pull-request") || kinds.includes("branch"), claim.id);
        assert.ok(claim.adoption.trim().length > 0, claim.id);
      }
    }
  }
});

test("pins authorship counts and keeps model provenance outside impact claims", () => {
  assert.deepEqual(
    {
      authored: publicRecordSnapshot.authoredMergedPullRequests,
      attributed: publicRecordSnapshot.attributedMergedPullRequests,
      mergedRepositories: publicRecordSnapshot.mergedPullRequestTargetRepositories,
      allSubmittedRepositories:
        publicRecordSnapshot.allSubmittedPullRequestTargetRepositories,
      observed: publicRecordSnapshot.observedAt,
    },
    {
      authored: 174,
      attributed: 181,
      mergedRepositories: 19,
      allSubmittedRepositories: 44,
      observed: "2026-09-19",
    },
  );
  assert.equal(publicSources.publicHistorySnapshot.kind, "snapshot");

  const impactCopy = JSON.stringify({
    outcomes: outcomeSummaries,
    cases: caseStudies,
    capabilities: capabilityIndexRows,
  });
  assert.doesNotMatch(impactCopy, /Model not recorded|No model data|No model signal|Live upstream/);
  assert.doesNotMatch(impactCopy, /one validated model/i);
  assert.doesNotMatch(impactCopy, /without changing GitHub|no merge claim is made/i);
});

test("keeps the executive identity and workspace outcome direct and evidence-safe", () => {
  assert.equal(portfolioIdentity.role, "Principal AI Architect");
  assert.equal(portfolioIdentity.eyebrow, "Principal AI Architect");
  assert.match(portfolioIdentity.headline, /build and run/i);
  assert.match(portfolioIdentity.introduction, /architecture and hands-on implementation/i);
  assert.match(portfolioIdentity.introduction, /what changed and how it works/i);
  assert.equal(
    portfolioIdentity.brandLine,
    "Bringing Hope to distributed systems at enterprise scale.",
  );

  const workspaceOutcome = outcomeSummaries.find(
    (outcome) => outcome.id === "workspace-orchestration",
  );
  assert.ok(workspaceOutcome);
  assert.equal(workspaceOutcome.value, "One");
  assert.match(workspaceOutcome.label, /workspace across many projects/i);
  assert.doesNotMatch(workspaceOutcome.summary, /repositories/i);

  assert.doesNotMatch(JSON.stringify(portfolioV2), /\u2014/);
});

test("keeps the flagship and agent-system claims inside their exact evidence", () => {
  const flagship = caseStudies.find(
    (caseStudy) => caseStudy.id === "automated-security-helper",
  );
  const agentSystems = caseStudies.find(
    (caseStudy) => caseStudy.id === "agent-systems",
  );
  assert.ok(flagship);
  assert.ok(agentSystems);

  const workspaceClaim = flagship.claims.find(
    (claim) => claim.id === "ash-workspace-release",
  );
  assert.ok(workspaceClaim);
  for (const sourceId of [
    "ashPr456",
    "ashPr460",
    "ashPr462",
    "ashPr465",
    "ashPr472",
    "ashPr478",
  ]) {
    assert.ok(workspaceClaim.sourceIds.includes(sourceId), sourceId);
  }

  assert.match(JSON.stringify(flagship), /nine participating end to end/i);
  assert.match(agentSystems.responsibility, /^I have helped pioneer practical patterns/i);
  assert.match(agentSystems.responsibility, /BASE, CARL, PAUL, and SEED/i);
  assert.match(agentSystems.responsibility, /recoverable state, reviewed decisions/i);
  assert.equal(agentSystems.repository, "BASE public fork");
  assert.doesNotMatch(agentSystems.proofState, /repositories/i);

  const githubTemplateCapability = capabilityIndexRows.find(
    (capability) => capability.id === "github-template-preflight",
  );
  assert.ok(githubTemplateCapability);
  assert.deepEqual(githubTemplateCapability.sourceIds, [
    "pluginsCommit4dd70c4",
    "pluginsFork",
    "openaiPluginsRepository",
  ]);
});

test("renders fork integration without implying upstream adoption", () => {
  const agentSystems = caseStudies.find((item) => item.id === "agent-systems");
  const claim = agentSystems.claims.find((item) => item.id === "agent-portability-merged");
  const html = renderToStaticMarkup(createElement(ClaimLedger, { claim }));

  assert.match(html, /data-state="merged"/);
  assert.match(html, />Integrated<\/span>/);
  assert.doesNotMatch(html, /Integrated upstream/);
  assert.match(html, /Integrated in the CARL, PAUL, and SEED public fork lineages\./);
});

test("labels the agent-system working-code link for its actual BASE destination", () => {
  const agentSystems = caseStudies.find((item) => item.id === "agent-systems");
  const html = renderToStaticMarkup(createElement(
    SourceLink,
    { sourceId: agentSystems.repositorySourceId },
    agentSystems.repository,
  ));

  assert.match(html, /href="https:\/\/github\.com\/mh0pe\/base-v1"/);
  assert.match(html, />BASE public fork<\/span>/);
  assert.doesNotMatch(html, /CARL|PAUL|SEED/);
});

test("records professional context as self-reported and independent", () => {
  assert.equal(organizationContexts.length, 5);
  for (const context of organizationContexts) {
    assert.equal(context.basis, "self-reported-scope-with-public-profile-context");
    assert.equal(context.careerContextSourceId, "linkedinMadison");
    assert.equal(context.observedAt, "2026-07-23");
  }
  assert.match(portfolioV2.identity.roleBasis, /AI systems/i);
  assert.match(portfolioV2.identity.roleBasis, /organizational design/i);
  assert.match(portfolioV2.identity.independenceNote, /not.*on behalf of/i);
});

test("keeps employer marks as normalized local vectors without endorsement language", async () => {
  const history = JSON.parse(
    await readFile(
      new URL("../app/data/professional-history.json", import.meta.url),
      "utf8",
    ),
  );

  assert.equal(history.employers.length, 10);
  assert.doesNotMatch(JSON.stringify(history), /trusted by/i);

  for (const employer of history.employers) {
    assert.ok(employer.name.length > 0);
    assert.ok(employer.scope.length > 20);
    assert.match(employer.relationship, /^(?:Current|Former) employer$/);

    if (employer.logo === null) {
      assert.equal(employer.logo_treatment, "wordmark");
      continue;
    }

    assert.match(employer.logo, /^\/logos\/svg\/[a-z0-9-]+\.svg$/);
    assert.match(
      employer.logo_treatment,
      /^(?:source_vector|mirrored_source_vector|derived_vector)$/,
    );
    const svg = await readFile(
      new URL(`../public${employer.logo}`, import.meta.url),
      "utf8",
    );
    assert.match(svg, /^<svg\b[^>]*\bviewBox=/i, employer.name);
    assert.match(svg, /<path\b/i, employer.name);
    assert.doesNotMatch(
      svg,
      /<script\b|<image\b|<foreignObject\b|\bon[a-z]+\s*=|\b(?:href|src)\s*=|data:|url\(|\.(?:png|jpe?g)\b/i,
      employer.name,
    );
  }
});
