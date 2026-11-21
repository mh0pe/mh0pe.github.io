import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const THREE_CHAPTERS = ["opening", "middle", "ending"];
const FOUR_CHAPTERS = ["opening", "middle", "later", "ending"];
const EXPECTED_CHAPTERS_BY_STORY = new Map([
  ["workspace-security", THREE_CHAPTERS],
  ["one-definition-many-agent-tools", THREE_CHAPTERS],
  ["reproducible-security-checks", THREE_CHAPTERS],
  ["security-feedback-where-you-work", THREE_CHAPTERS],
  ["handoffs-that-carry-the-work", THREE_CHAPTERS],
  ["integrity-bound-yarn-pnp-for-bazel", THREE_CHAPTERS],
  ["typed-svg-dom", THREE_CHAPTERS],
  ["aws-labs-mcp", FOUR_CHAPTERS],
  ["cloud-runtime", FOUR_CHAPTERS],
  ["zero-findings", FOUR_CHAPTERS],
]);

function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validChapterList(value) {
  return Array.isArray(value) &&
    value.length > 0 &&
    value.every((chapter) => typeof chapter === "string" && chapter.trim() === chapter && chapter.length > 0) &&
    new Set(value).size === value.length;
}

function sameChapters(value, expected) {
  return validChapterList(value) &&
    validChapterList(expected) &&
    value.length === expected.length &&
    expected.every((chapter, index) => value[index] === chapter);
}

function storyFromRoute(route) {
  const match = typeof route === "string" ? /^\/blog\/([^/]+)\/$/.exec(route) : null;
  return match?.[1];
}

export function validateBrowserAcceptance(observation) {
  const failures = [];
  const fail = (code, path, message) => failures.push({ code, path, message });
  const require = (condition, code, path, message) => {
    if (!condition) fail(code, path, message);
  };
  const validateOverflow = (snapshot, path) => {
    require(
      finite(snapshot?.overflowPx) && snapshot.overflowPx <= 1,
      "horizontal-overflow",
      `${path}.overflowPx`,
      "Horizontal overflow must be a finite value no greater than one CSS pixel.",
    );
  };
  const validateLive = (snapshot, path) => {
    const live = snapshot?.live;
    const validateVisibility = (visibility, visibilityPath, subject) => {
      require(visibility?.checkVisibility === true,
        "effective-visibility-failed", `${visibilityPath}.checkVisibility`, `${subject} must pass the effective visibility check.`);
      require(visibility?.hiddenByAncestor === false,
        "hidden-by-ancestor", `${visibilityPath}.hiddenByAncestor`, `${subject} must not be hidden by an ancestor.`);
      require(visibility?.effectiveOpacity === 1,
        "effective-opacity", `${visibilityPath}.effectiveOpacity`, `${subject} and its ancestor chain must be fully opaque.`);
    };
    require(live?.svgCount === 1, "actual-svg-count", `${path}.live.svgCount`, "Exactly one live SVG must be present.");
    require(live?.svgConnected === true, "actual-svg-disconnected", `${path}.live.svgConnected`, "The live SVG must be connected.");
    require(live?.svgInsidePlayer === true, "actual-svg-owner", `${path}.live.svgInsidePlayer`, "The committed SVG must be contained by the measured player.");
    require(finite(live?.svgWidth) && live.svgWidth > 0 && finite(live?.svgHeight) && live.svgHeight > 0,
      "actual-svg-invisible", `${path}.live`, "The committed SVG must have finite positive dimensions.");
    validateVisibility(live?.svgVisibility, `${path}.live.svgVisibility`, "The committed SVG");
    require(live?.playerCount === 1, "player-count", `${path}.live.playerCount`, "Exactly one player must be present.");
    require(live?.playerOpacity === 1, "player-opacity", `${path}.live.playerOpacity`, "The fitted player must be fully opaque.");
    require(finite(live?.playerWidth) && live.playerWidth > 0 && finite(live?.playerHeight) && live.playerHeight > 0,
      "player-invisible", `${path}.live`, "The player must have finite positive dimensions.");
    validateVisibility(live?.playerVisibility, `${path}.live.playerVisibility`, "The player");
    require(Number.isInteger(live?.requestedFrame) && Number.isInteger(live?.committedFrame),
      "frame-invalid", `${path}.live`, "Requested and committed frames must be integers.");
    require(live?.requestedFrame === live?.committedFrame,
      "frame-uncommitted", `${path}.live.committedFrame`, "The visible frame must equal the requested frame.");
    require(Number.isInteger(live?.svgFrame) && live.svgFrame === live?.committedFrame,
      "actual-svg-frame", `${path}.live.svgFrame`, "The SVG's rendered-frame marker must equal the committed frame.");
    require(typeof live?.expectedCaption === "string" && live.expectedCaption.length > 0,
      "caption-expected-missing", `${path}.live.expectedCaption`, "Expected caption evidence is required.");
    require(live?.caption === live?.expectedCaption,
      "caption-uncommitted", `${path}.live.caption`, "The caption must match the committed frame.");
    validateOverflow(snapshot, path);
  };
  const validateStatic = (snapshot, path, modeKey, expectedChapters) => {
    require(snapshot?.[modeKey] === true, "static-mode-inactive", `${path}.${modeKey}`, `${modeKey} must be active.`);
    require(snapshot?.livePlayerCount === 0, "static-player-present", `${path}.livePlayerCount`, "Static mode must remove live players.");
    require(sameChapters(snapshot?.visibleChapters, expectedChapters), "static-chapters-mismatch", `${path}.visibleChapters`, "All expected static chapters must be visible once and in the declared reading order.");
    require(sameChapters(snapshot?.visibleStillChapters, expectedChapters), "static-stills-mismatch", `${path}.visibleStillChapters`, "Every expected authored still must be visibly fitted once and in the declared reading order.");
    validateOverflow(snapshot, path);
  };

  require(observation?.schemaVersion === 1, "schema-version", "schemaVersion", "schemaVersion must be 1.");
  require(typeof observation?.route === "string" && observation.route.startsWith("/"), "route-invalid", "route", "A root-relative route is required.");
  require(finite(observation?.viewport?.width) && observation.viewport.width > 0 && finite(observation?.viewport?.height) && observation.viewport.height > 0,
    "viewport-invalid", "viewport", "Viewport width and height must be finite and positive.");
  const story = storyFromRoute(observation?.route);
  const catalogChapters = EXPECTED_CHAPTERS_BY_STORY.get(story);
  require(catalogChapters !== undefined, "story-unsupported", "route", "The route must identify a cataloged motion story.");
  require(validChapterList(observation?.expectedChapters), "expected-chapters-invalid", "expectedChapters", "Expected chapters must be an explicit nonempty ordered list of unique, trimmed names.");
  require(sameChapters(observation?.expectedChapters, catalogChapters), "expected-chapters-story-mismatch", "expectedChapters", "Expected chapters must match the route-specific motion story catalog in order.");

  validateLive(observation?.arrival, "arrival");
  validateLive(observation?.scroll, "scroll");
  require(finite(observation?.scroll?.scrollYBefore) && finite(observation?.scroll?.scrollYAfter) && observation.scroll.scrollYBefore !== observation.scroll.scrollYAfter,
    "scroll-missing", "scroll", "The reading sample must include a real scroll displacement.");
  require(
    Number.isInteger(observation?.arrival?.live?.committedFrame) &&
      Number.isInteger(observation?.scroll?.live?.committedFrame) &&
      observation.arrival.live.committedFrame !== observation.scroll.live.committedFrame,
    "scroll-frame-unchanged",
    "scroll.live.committedFrame",
    "The committed frame must change after scrolling.",
  );
  const scrollDelta = observation?.scroll?.scrollYAfter - observation?.scroll?.scrollYBefore;
  const frameDelta = observation?.scroll?.live?.committedFrame - observation?.arrival?.live?.committedFrame;
  require(finite(scrollDelta) && finite(frameDelta) && Math.sign(scrollDelta) === Math.sign(frameDelta),
    "scroll-frame-direction", "scroll", "Scroll and committed-frame deltas must have the same direction.");

  validateStatic(observation?.static, "static", "manualStill", observation?.expectedChapters);
  validateStatic(observation?.reduced, "reduced", "prefersReducedMotion", observation?.expectedChapters);
  return { failures, ok: failures.length === 0 };
}

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("Usage: node tools/browser-acceptance-contract.mjs <observation.json>");
  const observation = JSON.parse(await readFile(path, "utf8"));
  const result = validateBrowserAcceptance(observation);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
