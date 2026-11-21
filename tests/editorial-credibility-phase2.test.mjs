import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { tsImport } from "tsx/esm/api";
import history from "../app/data/professional-history.json" with { type: "json" };
import socialPages from "../app/data/social-pages.json" with { type: "json" };
import { assertAnonymousContexts } from "./helpers/anonymous-contexts.mjs";

const content = await tsImport(new URL("../app/data/portfolio-v2.ts", import.meta.url).href, import.meta.url);
const { blogArticles, articleBySlug } = await tsImport(new URL("../app/data/blog.ts", import.meta.url).href, import.meta.url);
const { socialDescription } = await tsImport(new URL("../app/data/social.ts", import.meta.url).href, import.meta.url);
const { default: AttributionExplorer } = await tsImport(new URL("../app/components/AttributionExplorer.tsx", import.meta.url).href, import.meta.url);

test("model view explains inferred associations and line-count limits before the controls", () => {
  const html = renderToStaticMarkup(createElement(AttributionExplorer));
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(text, /Explore selected public changes by project and model/);
  assert.match(text, /Model associations use recorded commit markers or are inferred from my stated model-use history/);
  assert.match(text, /Line counts show change volume, not individual model output or project impact/);
  assert.ok(html.indexOf("Line counts show change volume") < html.indexOf('class="attribution-record"'));
  assert.match(text, /Explicit model markers take precedence/);
  assert.match(text, /newest public Claude Opus model available on the authored date/);
  assert.match(text, /every associated model/);
  assert.doesNotMatch(text, /No model data|Model not recorded|GitHub contribution credit/i);
});

test("account-linked assistant work stays distinct from recorded PR authorship", () => {
  assert.equal(content.publicRecordSnapshot.authoredMergedPullRequests, 263);
  assert.equal(content.publicRecordSnapshot.attributedMergedPullRequests, 270);
  assert.match(content.accountLinkedContributionNote, /account-linked total includes assistant-opened changes/);
  assert.match(content.accountLinkedContributionNote, /mh0pe or awsmadi/);
  assert.match(content.accountLinkedContributionNote, /recorded authors remain distinct/);
  assert.doesNotMatch(content.accountLinkedContributionNote, /GitHub contribution credit|Co-authored-by/i);
  const outcome = content.outcomeSummaries.find(item => item.id === "public-contribution-record");
  assert.match(outcome.evidenceNote, /Assistant-opened changes linked to my accounts/);
  assert.doesNotMatch(outcome.evidenceNote, /Account-directed|GitHub-authored/i);
});

test("the public-work count does not recast owned-project merges as upstream acceptance", async () => {
  const html = await readFile(new URL("../pages-dist/proof/index.html", import.meta.url), "utf8");
  assert.match(html, /<dt>Merged changes I authored<\/dt><dd>263<\/dd>/);
  assert.doesNotMatch(html, /Authored changes accepted into main projects/);
});

test("Nix working-code links identify the public implementations separately from upstream", () => {
  const { publicSources, nixWindowsCaseStudy } = content;
  assert.equal(nixWindowsCaseStudy.repository, "awsmadi/nix");
  assert.equal(nixWindowsCaseStudy.repositorySourceId, "nixFork");
  assert.equal(publicSources.nixFork.href, "https://github.com/awsmadi/nix/tree/feat/windows-builder-parity");
  assert.equal(publicSources.nixRecursiveImplementation.href, "https://github.com/awsmadi/nix/tree/feat/windows-recursive-nix-master");
  assert.equal(publicSources.nixFork.kind, "branch");
  assert.equal(publicSources.nixRecursiveImplementation.kind, "branch");
  assert.equal(publicSources.nixRepository.href, "https://github.com/NixOS/nix");
  assert.match(publicSources.nixRepository.label, /upstream foundation/i);
  const runtime = nixWindowsCaseStudy.claims.find(claim => claim.id === "nix-runtime-open");
  assert.ok(runtime.sourceIds.includes("nixFork"));
  assert.ok(runtime.sourceIds.includes("nixRecursiveImplementation"));
  const proof = nixWindowsCaseStudy.stages.find(stage => stage.name === "Proof");
  for (const id of ["nixRepository", "nixFork", "nixRecursiveImplementation", "nixValidationPr1"]) assert.ok(proof.sourceIds.includes(id), id);
  assert.doesNotMatch(JSON.stringify(nixWindowsCaseStudy), /MSVC|full runtime path together/i);
});

test("all direct employers remain, with business context separated from undocumented personal duties", () => {
  assert.deepEqual(history.employers.map(employer => employer.name), [
    "Amazon Web Services", "Chainalysis", "Cameo", "Trōv", "Rakuten AirMap, Inc.",
    "F.T. Industries", "cielo24", "Quiver Media", "Tinder", "Joint Business Solutions",
  ]);
  for (const employer of history.employers) {
    assert.match(employer.relationship, /^(Current|Former) employer$/);
    assert.equal(employer.context_label, "Organizational context");
    assert.equal(employer.scope_basis, "organization-context");
    assert.equal(employer.personal_responsibility_evidence, "pending");
    assert.ok(employer.scope.length > 20);
  }
  assert.match(content.portfolioIdentity.independenceNote, /not statements made on behalf of any current or former employer/);
});

test("indirect organizational scopes retain the stated responsibilities without naming clients", () => {
  assertAnonymousContexts(content.organizationContexts, history.organization_contexts);
  assert.equal(content.organizationContexts.length, 5);
  assert.equal(history.organization_contexts.length, 5);
  for (const [index, context] of content.organizationContexts.entries()) {
    assert.match(context.scope, /^I (built|supported|worked)/);
    assert.equal(context.scope, history.organization_contexts[index].text);
    assert.equal(context.basis, "self-reported-scope-with-public-profile-context");
    assert.equal(history.organization_contexts[index].scope_basis, "self-reported-personal-responsibility");
  }
  assert.match(content.organizationContexts[0].scope, /tokenized-asset platform architecture/);
  assert.doesNotMatch(content.organizationContexts[0].scope, /tokenized payments/i);
  assert.match(content.organizationContexts[4].scope, /built out and streamlined the AWS account provisioning process/);
});

test("anonymous scope contract rejects synthetic identities and unsupported claims in either source", () => {
  const mutate = (change) => {
    const contexts = structuredClone(content.organizationContexts);
    const career = structuredClone(history.organization_contexts);
    change(contexts, career);
    assert.throws(() => assertAnonymousContexts(contexts, career));
  };
  mutate((contexts) => { contexts[0].label = "Example Test Organization"; });
  mutate((contexts, career) => { contexts[0].scope += " for Example Test Organization"; career[0].text = contexts[0].scope; });
  mutate((contexts) => { contexts[0].clientName = "Example Test Organization"; });
  mutate((contexts) => { contexts[0].companyUrl = "https://example.invalid"; });
  mutate((contexts) => { contexts[0].scope += " Reduced cost by 99%."; });
  mutate((contexts) => { contexts[0].basis = "independently-verified-impact"; });
  mutate((contexts) => { contexts[0].careerContextSourceId = "exampleCustomer"; });
  mutate((contexts) => { contexts.pop(); });
  mutate((contexts) => { contexts.push(contexts[0]); });
  mutate((contexts) => { contexts.reverse(); });
  mutate((contexts, career) => { career[0].label = "Example Test Organization"; });
  mutate((contexts, career) => { career[0].scope_basis = "independently-verified-impact"; });
});

test("new motion chapters split existing article content without discarding prior section IDs", () => {
  const mcp = articleBySlug("aws-labs-mcp");
  const cloud = articleBySlug("cloud-runtime");
  assert.deepEqual(mcp.sections.map(section => section.id), ["documents", "images", "transport", "sessions"]);
  assert.deepEqual(cloud.sections.map(section => section.id), ["preview", "iterate", "examples", "runtime"]);
  assert.deepEqual(mcp.sections[0].sources, ["mcp-documents"]);
  assert.deepEqual(mcp.sections[1].sources, ["mcp-assets"]);
  assert.match(mcp.sections[1].paragraphs[0], /separating inspection from extraction/);
  assert.equal(mcp.sections[1].detail.title, "Inspect before extracting.");
  assert.deepEqual(cloud.sections[0].sources, ["cdk-diff"]);
  assert.deepEqual(cloud.sections[1].sources, ["cdk-hotswap"]);
  assert.match(cloud.sections[0].paragraphs[0], /Fn::ForEach/);
  assert.match(cloud.sections[1].paragraphs[0], /Hotswap remains a development workflow/);
  for (const article of blogArticles) {
    const sources = new Set(article.sources.map(source => source.id));
    for (const section of article.sections) for (const id of section.sources ?? []) assert.ok(sources.has(id), article.slug + ": " + id);
    assert.equal(new Set(article.sections.map(section => section.id)).size, article.sections.length);
  }
});

test("every article takeaway names the decision or boundary discussed", () => {
  const anchors = {
    "workspace-security": /each finding tied to the project and configuration/,
    "one-definition-many-agent-tools": /validate each generated integration/,
    "reproducible-security-checks": /Pin the scanner tools/,
    "security-feedback-where-you-work": /incomplete, cancelled, or missing report/,
    "handoffs-that-carry-the-work": /Review proposed lessons/,
    "integrity-bound-yarn-pnp-for-bazel": /declared dependencies and locations/,
    "typed-svg-dom": /geometry, text metrics, and browser access/,
    "aws-labs-mcp": /clear input and lifecycle controls/,
    "cloud-runtime": /check examples against the package/,
  };
  assert.equal(blogArticles.length, Object.keys(anchors).length);
  for (const article of blogArticles) assert.match(article.takeaway, anchors[article.slug], article.slug);
});

test("article sharing previews are distinct and free of internal branch requirements", () => {
  const descriptions = [];
  for (const article of blogArticles) {
    const path = `/blog/${article.slug}/`;
    const card = socialPages.find(page => page.path === path);
    assert.ok(card.description.length >= 100 && card.description.length <= 200, article.slug);
    assert.equal(socialDescription(path, "fallback"), card.description);
    assert.equal(socialDescription(path.slice(0, -1), "fallback"), card.description);
    assert.doesNotMatch(card.description + article.deck + article.takeaway, /public capability branch|capture date|dataset|—/i);
    descriptions.push(card.description);
  }
  assert.equal(new Set(descriptions).size, blogArticles.length);
  assert.equal(socialDescription("/models/", "Model page description"), "Model page description");
  assert.equal(socialDescription("/evidence/", "Proof page description"), "Proof page description");
});
