import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateBrowserAcceptance } from "../tools/browser-acceptance-contract.mjs";

const root = new URL("../", import.meta.url);
const fixturePath = new URL("fixtures/browser-acceptance.json", import.meta.url);
const fixtures = JSON.parse(await readFile(fixturePath, "utf8"));

test("browser acceptance requires a fitted real player, committed captions, scroll response, static fallbacks, and bounded overflow", () => {
  assert.deepEqual(validateBrowserAcceptance(fixtures.valid), { failures: [], ok: true });
});

test("browser acceptance uses the four-chapter catalog for Cloud Runtime and AWS Labs MCP", () => {
  for (const story of ["cloud-runtime", "aws-labs-mcp", "zero-findings"]) {
    const sample = structuredClone(fixtures.valid);
    sample.route = `/blog/${story}/`;
    sample.expectedChapters = ["opening", "middle", "later", "ending"];
    sample.static.visibleChapters = [...sample.expectedChapters];
    sample.static.visibleStillChapters = [...sample.expectedChapters];
    sample.reduced.visibleChapters = [...sample.expectedChapters];
    sample.reduced.visibleStillChapters = [...sample.expectedChapters];
    assert.deepEqual(validateBrowserAcceptance(sample), { failures: [], ok: true }, story);
  }
});

test("browser acceptance rejects missing, duplicate, unknown, and route-mismatched chapter declarations", () => {
  for (const [label, chapters, code] of [
    ["missing", undefined, "expected-chapters-invalid"],
    ["empty", [], "expected-chapters-invalid"],
    ["duplicate", ["opening", "middle", "middle"], "expected-chapters-invalid"],
    ["unknown", ["opening", "middle", "surprise"], "expected-chapters-story-mismatch"],
    ["missing fourth beat", ["opening", "middle", "ending"], "expected-chapters-story-mismatch"],
  ]) {
    const sample = structuredClone(fixtures.valid);
    if (label === "missing fourth beat") sample.route = "/blog/cloud-runtime/";
    sample.expectedChapters = chapters;
    const result = validateBrowserAcceptance(sample);
    assert.equal(result.ok, false, label);
    assert.ok(result.failures.some((failure) => failure.code === code), label);
  }
});

test("browser acceptance fails a positive-size player that is still transparent", () => {
  const result = validateBrowserAcceptance(fixtures.invisiblePlayer);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.code === "player-opacity" && failure.path === "arrival.live.playerOpacity"));
});

test("browser acceptance rejects fitted elements hidden by ancestors or effective zero opacity", () => {
  for (const [label, mutate, code, path] of [
    ["hidden ancestor", (sample) => { sample.arrival.live.playerVisibility.hiddenByAncestor = true; }, "hidden-by-ancestor", "arrival.live.playerVisibility.hiddenByAncestor"],
    ["zero effective opacity", (sample) => { sample.scroll.live.svgVisibility.effectiveOpacity = 0; }, "effective-opacity", "scroll.live.svgVisibility.effectiveOpacity"],
    ["visibility API result", (sample) => { sample.arrival.live.svgVisibility.checkVisibility = false; }, "effective-visibility-failed", "arrival.live.svgVisibility.checkVisibility"],
  ]) {
    const sample = structuredClone(fixtures.valid);
    mutate(sample);
    const result = validateBrowserAcceptance(sample);
    assert.equal(result.ok, false, label);
    assert.ok(result.failures.some((failure) => failure.code === code && failure.path === path), label);
  }
});

test("browser acceptance fails horizontal overflow even when player evidence passes", () => {
  const result = validateBrowserAcceptance(fixtures.overflow);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.code === "horizontal-overflow" && failure.path === "arrival.overflowPx"));
});

test("browser acceptance rejects stale captions, unchanged scroll frames, and incomplete static modes", () => {
  for (const [label, mutate, code] of [
    ["actual SVG", (sample) => { sample.arrival.live.svgInsidePlayer = false; }, "actual-svg-owner"],
    ["rendered SVG frame", (sample) => { sample.scroll.live.svgFrame = 429; }, "actual-svg-frame"],
    ["caption", (sample) => { sample.scroll.live.caption = "Stale caption."; }, "caption-uncommitted"],
    ["scroll frame", (sample) => {
      sample.scroll.live.requestedFrame = 70;
      sample.scroll.live.committedFrame = 70;
    }, "scroll-frame-unchanged"],
    ["manual still player", (sample) => { sample.static.livePlayerCount = 1; }, "static-player-present"],
    ["reduced chapters", (sample) => { sample.reduced.visibleChapters = ["opening", "middle"]; }, "static-chapters-mismatch"],
  ]) {
    const sample = structuredClone(fixtures.valid);
    mutate(sample);
    const result = validateBrowserAcceptance(sample);
    assert.equal(result.ok, false, label);
    assert.ok(result.failures.some((failure) => failure.code === code), label);
  }
});

test("browser acceptance rejects hidden authored stills in manual and reduced modes", () => {
  for (const mode of ["static", "reduced"]) {
    const sample = structuredClone(fixtures.valid);
    sample[mode].visibleStillChapters = ["opening", "ending"];
    const result = validateBrowserAcceptance(sample);
    assert.equal(result.ok, false, mode);
    assert.ok(result.failures.some((failure) =>
      failure.code === "static-stills-mismatch" && failure.path === `${mode}.visibleStillChapters`
    ), mode);
  }
});

test("browser acceptance CLI exits nonzero for rejected observations", () => {
  const result = spawnSync(process.execPath, [
    fileURLToPath(new URL("tools/browser-acceptance-contract.mjs", root)),
    fileURLToPath(fixturePath),
  ], {
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /"ok": false/);
});
