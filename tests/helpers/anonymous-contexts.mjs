import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";

// This allowlist contains only approved public copy. Never put private client
// identities or reversible encodings of them in the public test suite.
export const anonymousContexts = Object.freeze([
  { id: "payments-network", label: "Global payments network", scope: "I built tokenized-asset platform architecture for an enterprise payments network." },
  { id: "financial-institution", label: "Major U.S. financial institution", scope: "I supported acquisition-related platform delivery, regulatory remediation, and security engineering." },
  { id: "mobility-manufacturer", label: "Global automotive and mobility manufacturer", scope: "I worked on data-lake foundations for a global automotive and mobility manufacturer." },
  { id: "vehicle-manufacturer", label: "International vehicle manufacturer", scope: "I worked on data-lake foundations for an international vehicle manufacturer." },
  { id: "investment-manager", label: "Global investment manager", scope: "I built out and streamlined the AWS account provisioning process for a global investment manager." },
].map(Object.freeze));

export function assertAnonymousContexts(contexts, history) {
  const expected = anonymousContexts.map(context => ({
    ...context,
    careerContextSourceId: "linkedinMadison",
    observedAt: "2026-07-23",
    basis: "self-reported-scope-with-public-profile-context",
  }));
  const expectedHistory = anonymousContexts.map(({ label, scope }) => ({
    label, text: scope, scope_basis: "self-reported-personal-responsibility",
  }));
  // Boolean assertions avoid echoing an accidentally introduced identity into
  // a CI failure. Full-record equality rejects unreviewed metadata as well.
  assert.ok(isDeepStrictEqual(contexts, expected), "Organizational contexts must match the approved anonymous scope and claim basis");
  assert.ok(isDeepStrictEqual(history, expectedHistory), "Career history must match the approved anonymous scope and claim basis");
}

const escapeHtml = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");

export function assertAnonymousLandingMarkup(html) {
  const blocks = [...html.matchAll(/<details\b[^>]*class="landing-details landing-contexts"[^>]*>[\s\S]*?<\/details>/g)];
  const entries = anonymousContexts.map(({ label, scope }) => `<div><h4>${escapeHtml(label)}</h4><p>${escapeHtml(scope)}</p></div>`).join("");
  const expected = `<details class="landing-details landing-contexts"><summary>Work across payments, banking, mobility, and investment</summary><div class="landing-contexts__grid">${entries}</div></details>`;
  assert.ok(blocks.length === 1 && blocks[0][0] === expected, "The landing context block must contain only approved anonymous copy and markup");
}

export function assertAnonymousAboutMarkup(html) {
  const ledgers = [...html.matchAll(/<ol class="career-ledger career-ledger--unified">([\s\S]*?)<\/ol>/g)];
  assert.ok(ledgers.length === 1, "The experience page must contain one organizational ledger");
  const rows = [...ledgers[0][1].matchAll(/<li>[\s\S]*?<\/li>/g)].map(([row]) => row);
  const marker = '<div class="career-ledger__mark career-ledger__mark--context" aria-hidden="true"><svg viewBox="0 0 120 72"><circle cx="60" cy="36" r="23"></circle><path d="M12 36h25M83 36h25M60 7v12M60 53v12"></path></svg></div>';
  const expected = anonymousContexts.map(({ label, scope }, index) => `<li><span>${index + 11}</span>${marker}<div><h3>${escapeHtml(label)}</h3><p>${escapeHtml(scope)}</p></div></li>`);
  assert.ok(rows.length === 15 && isDeepStrictEqual(rows.slice(10), expected), "The experience ledger must retain all ten employers followed by five approved anonymous scopes");
}
