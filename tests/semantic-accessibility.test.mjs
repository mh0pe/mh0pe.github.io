import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("supporting routes keep navigation state and headings semantically accurate", async () => {
  const [decisions, models, capabilities] = await Promise.all([
    source("app/decisions/page.tsx"),
    source("app/models/page.tsx"),
    source("app/components/v2/CapabilityAtlas.tsx"),
  ]);

  assert.match(decisions, /<RouteFrame current="decisions" motif="decisions">/);
  assert.doesNotMatch(decisions, /<RouteFrame current="method"/);
  assert.match(
    decisions,
    /<h3 className="decision-pages__question">\{decision\.question\}<\/h3>/,
  );
  assert.doesNotMatch(decisions, /<h2>\{decision\.question\}<\/h2>/);

  assert.match(models, /<RouteFrame current="models" motif="models">/);
  assert.doesNotMatch(models, /<RouteFrame current="proof"/);

  assert.match(
    capabilities,
    /<h3 className="capability-atlas__system">\{row\.system\}<\/h3>/,
  );
  assert.doesNotMatch(capabilities, /<strong>\{row\.system\}<\/strong>/);
});

test("external profile and lineage links announce new tabs", async () => {
  const [home, credentials, lineage] = await Promise.all([
    source("app/page.tsx"),
    source("app/credentials/page.tsx"),
    source("app/components/v3/ProjectLineageField.tsx"),
  ]);

  assert.ok(
    (home.match(/opens in a new tab/g) ?? []).length >= 2,
    "both homepage LinkedIn links should announce their new tab",
  );
  assert.match(
    credentials,
    /Credly profile<span className="visually-hidden">, opens in a new tab<\/span>/,
  );
  assert.match(lineage, /className="lineage-field__fallback-link"/);
  assert.match(lineage, /className="lineage-field__fallback-label"/);
  assert.match(lineage, /data-lineage-fallback/);
  assert.match(lineage, /<span className="visually-hidden"> \(opens in a new tab\)<\/span>/);
  assert.match(lineage, /className="lineage-field__source-static"/);
  assert.match(lineage, /data-lineage-tooltip aria-hidden="true"/);
  assert.doesNotMatch(lineage, /data-lineage-tooltip aria-live=/);
});

test("secondary navigation exposes semantic touch-target hooks", async () => {
  const [home, method] = await Promise.all([
    source("app/page.tsx"),
    source("app/method/page.tsx"),
  ]);

  assert.match(home, /className="hope-work__conversation-link"/);
  assert.match(
    home,
    /className="shell principal-scope" role="group" aria-label="How I create leverage"/,
  );
  assert.equal(
    (method.match(/className="method-stage__action"/g) ?? []).length,
    3,
  );
});
