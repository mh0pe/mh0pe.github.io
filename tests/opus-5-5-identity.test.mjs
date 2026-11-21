import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { tsImport } from "tsx/esm/api";

const root = new URL("../", import.meta.url);
const model = await tsImport(
  new URL("app/components/attribution-model.ts", root).href,
  import.meta.url,
);

test("Opus 5.5 keeps one rose tone and a non-color star marker", async () => {
  const [explorer, hopeLine, canvas, constellation, backdrop, styles] =
    await Promise.all([
      readFile(new URL("app/components/AttributionExplorer.tsx", root), "utf8"),
      readFile(new URL("app/components/v3/HopeLineField.tsx", root), "utf8"),
      readFile(
        new URL(
          "app/components/contribution-story/ContributionGraphCanvas.tsx",
          root,
        ),
        "utf8",
      ),
      readFile(
        new URL("app/components/ContributionConstellation.tsx", root),
        "utf8",
      ),
      readFile(
        new URL(
          "app/components/contribution-story/ProjectConstellationBackdrop.tsx",
          root,
        ),
        "utf8",
      ),
      readFile(new URL("public/portfolio.css", root), "utf8"),
    ]);

  assert.equal(model.modelTone("claude-opus-5-5"), "#f2a7c5");
  for (const source of [hopeLine, canvas]) {
    assert.match(source, /"claude-opus-5-5": "#f2a7c5"/);
  }

  assert.match(explorer, /star:\s*"✦"/);
  assert.match(styles, /\.attribution-agent-marker\[data-marker="star"\]::before/);
  assert.match(hopeLine, /geometricAgentMarkers[\s\S]*?"star"/);
  assert.match(hopeLine, /marker === "star"[\s\S]*?<path d="M0-7/);
  assert.match(canvas, /marker === "star"[\s\S]*?<icosahedronGeometry/);
  assert.match(constellation, /normalized === "star"[\s\S]*?<path d="M0 -6/);
  assert.match(backdrop, /marker === "star"[\s\S]*?points=\{starPoints/);
});
