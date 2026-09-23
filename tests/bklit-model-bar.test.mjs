import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("Bklit bars preserve static values, reduced motion, and native model controls", async () => {
  const [bar, explorer, notices, css] = await Promise.all([
    readFile(new URL("app/components/v3/BklitModelBar.tsx", root), "utf8"),
    readFile(new URL("app/components/AttributionExplorer.tsx", root), "utf8"),
    readFile(new URL("THIRD_PARTY_NOTICES.md", root), "utf8"),
    readFile(new URL("public/interactions.css", root), "utf8"),
  ]);
  assert.match(bar, /width=\{1000\}/);
  assert.match(bar, /scaleX\(\$\{width \/ 1000\}\)/);
  assert.match(bar, /Number\.isFinite\(percentage\)/);
  assert.match(bar, /Math\.max\(0, Math\.min\(100, percentage\)\)/);
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)\s*\{\s*\[data-bklit-model-bar\] rect/);
  assert.match(css, /transition: transform 360ms/);
  assert.match(bar, /aria-hidden="true"/);
  assert.doesNotMatch(bar, /setTimeout|setInterval|requestAnimationFrame|ResizeObserver|@visx|motion\/react/);
  assert.match(explorer, /<BklitModelBar/);
  assert.match(explorer, /aria-pressed=\{isSelected\}/);
  assert.match(explorer, /onClick=\{\(\) => focusAgent\(row\.agent\.id\)\}/);
  assert.match(explorer, /integerFormatter\.format\(row\.value\)/);
  assert.match(notices, /Copyright \(c\) 2026 uixmat/);
  assert.match(notices, /0dfdfc57ca068470ccfb93c4501cebc555c9054d/);
});
