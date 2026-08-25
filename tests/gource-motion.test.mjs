import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { tsImport } from "tsx/esm/api";
import { expectedProjectGraphIds } from "./project-catalog.mjs";

const motionModule = await tsImport(
  "../app/components/contribution-story/gource-motion.ts",
  import.meta.url,
);
const graphDataModule = await tsImport(
  "../app/components/contribution-story/graph-loaders.ts",
  import.meta.url,
);
const playbackModule = await tsImport(
  "../app/components/contribution-story/contribution-playback.ts",
  import.meta.url,
);

test("keeps the SVG fallback visibly animated when WebGL is unavailable", async () => {
  const [
    source,
    canvasSource,
    cardPlayerSource,
    backdropSource,
    graphDataSource,
    styleSource,
  ] = await Promise.all([
    readFile(
      new URL(
        "../app/components/contribution-story/ContributionStoryRail.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/components/contribution-story/ContributionGraphCanvas.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/components/contribution-story/ContributionCardPlayer.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/components/contribution-story/ProjectConstellationBackdrop.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/components/contribution-story/graph-loaders.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../public/portfolio.css", import.meta.url), "utf8"),
  ]);

  assert.match(source, /import\s*\{\s*motion,\s*useReducedMotion\s*\}/);
  assert.match(source, /data-motion-traveler=/);
  assert.match(source, /data-motion-pulse=/);
  assert.match(source, /data-canvas-ready=\{canvasReady/);
  assert.match(source, /canvasOwnerSnapshot\.revision \+ 1/);
  assert.match(source, /const canvasSessionId =/);
  assert.match(source, /readyCanvasSessionId === canvasSessionId/);
  assert.match(
    source,
    /animate=\{!canvasReady && !reduceMotion\}/,
  );
  assert.doesNotMatch(
    source,
    /animate=\{!canvasReady && !reduceMotion && railVisible\}/,
  );
  assert.match(
    source,
    /import\s*\{[\s\S]*?ContributionGraphCanvas[\s\S]*?\}\s*from\s*"\.\/ContributionGraphCanvas"/,
  );
  assert.doesNotMatch(source, /\blazy\(|\bSuspense\b|loadContributionGraphCanvas/);
  assert.match(source, /let webGl2Supported: boolean \| null = null/);
  assert.match(source, /<motion\.g/);
  assert.match(source, /<animateMotion/);
  assert.match(source, /repeatCount="indefinite"/);
  assert.match(source, /attributeName="opacity"/);
  assert.match(source, /attributeName="r"/);
  assert.match(source, /rootMargin:\s*"0px 0px 25% 0px"/);
  assert.match(
    source,
    /min-width:\s*64rem[\s\S]*pointer:\s*fine[\s\S]*hover:\s*hover/,
  );
  assert.match(source, /WEBGL_lose_context/);
  assert.match(source, /data-graph-source="inline"/);
  assert.doesNotMatch(
    source,
    /Loading the source trail|project-evolution-loading/,
  );
  assert.match(graphDataSource, /import compactCatalog from/);
  assert.match(graphDataSource, /import \{ unpackContributionGraph \} from/);
  assert.match(graphDataSource, /const graphCache = new Map/);
  assert.doesNotMatch(graphDataSource, /project-graphs\/.*\.json/);
  assert.doesNotMatch(graphDataSource, /\bimport\s*\(/);
  assert.doesNotMatch(graphDataSource, /Promise|graphPromises/);
  assert.match(canvasSource, /function FirstFrameSignal/);
  assert.match(canvasSource, /<FirstFrameSignal onReady=\{onReady\}/);
  assert.doesNotMatch(canvasSource, /function DemandFrameScheduler/);
  assert.match(canvasSource, /frameloop="always"/);
  assert.doesNotMatch(canvasSource, /setInterval\(invalidate/);
  assert.match(canvasSource, /dpr=\{canvasDpr\}/);
  assert.doesNotMatch(canvasSource, /computeBoundingSphere/);
  assert.match(cardPlayerSource, /contributionPlaybackDelay/);
  assert.match(cardPlayerSource, /ref=\{stageRef\}/);
  assert.match(
    cardPlayerSource,
    /threshold:\s*\[0,\s*CONTRIBUTION_PLAYBACK_MIN_VISIBLE_RATIO\]/,
  );
  assert.match(
    cardPlayerSource,
    /const nextVisible = isContributionPlaybackVisible\(entry\)/,
  );
  assert.doesNotMatch(cardPlayerSource, /setVisible\(entry\.isIntersecting\)/);
  assert.match(cardPlayerSource, /contributionPlaybackDelay\(entryPendingRef\.current\)/);
  assert.match(
    cardPlayerSource,
    /key=\{`\$\{project\.graphId\}:\$\{activeItem\.id\}`\}/,
  );
  assert.match(backdropSource, /const FLOW_EDGE_BUDGET = 4/);
  assert.match(backdropSource, /const PULSE_NODE_BUDGET = 2/);
  assert.match(backdropSource, /const BACKDROP_VISIBILITY_RATIO = 0\.18/);
  assert.match(backdropSource, /useSyncExternalStore/);
  assert.match(backdropSource, /data-project-constellation=/);
  assert.match(backdropSource, /data-graph-source="inline"/);
  assert.match(backdropSource, /aria-hidden="true"/);
  assert.match(backdropSource, /<animateMotion/);
  assert.match(backdropSource, /repeatCount="indefinite"/);
  assert.match(
    backdropSource,
    /threshold:\s*\[0,\s*BACKDROP_VISIBILITY_RATIO,\s*0\.36,\s*0\.62\]/,
  );
  assert.doesNotMatch(
    backdropSource,
    /ContributionGraphCanvas|@react-three\/fiber|from "three"/,
  );
  assert.match(source, /const STATIC_TRAVELER_BUDGET = 6/);
  assert.match(source, /const STATIC_PULSE_BUDGET = 2/);
  assert.doesNotMatch(styleSource, /evolution-static-edge-flow/);
  assert.doesNotMatch(styleSource, /evolution-static-node-breathe/);
  assert.doesNotMatch(canvasSource, /onCreated=\{onReady\}/);
  assert.doesNotMatch(source, /key=\{`traveler:\$\{edge\.id\}:\$\{selectedEvidenceId\}`\}/);
  assert.doesNotMatch(source, /key=\{`pulse:\$\{node\.id\}:\$\{selectedEvidenceId\}`\}/);
  assert.match(
    styleSource,
    /\.project-evolution-viewport\[data-canvas-ready="true"\][\s\S]*?opacity:\s*1/,
  );
  assert.match(
    styleSource,
    /\.project-evolution-viewport\[data-canvas-ready="true"\][\s\S]*?> \.project-evolution-static[\s\S]*?opacity:\s*0/,
  );
  assert.match(
    styleSource,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.project-evolution-static-motion\s*\{[\s\S]*?display:\s*none/,
  );
});

test("starts card playback promptly, then returns to the reading cadence", () => {
  assert.equal(playbackModule.CONTRIBUTION_PLAYBACK_ENTRY_DELAY_MS, 240);
  assert.equal(playbackModule.CONTRIBUTION_PLAYBACK_INTERVAL_MS, 3_200);
  assert.equal(playbackModule.CONTRIBUTION_PLAYBACK_MIN_VISIBLE_RATIO, 0.12);
  assert.equal(playbackModule.contributionPlaybackDelay(true), 240);
  assert.equal(playbackModule.contributionPlaybackDelay(false), 3_200);
  assert.equal(
    playbackModule.isContributionPlaybackVisible({
      isIntersecting: true,
      intersectionRatio: 0.01,
    }),
    false,
  );
  assert.equal(
    playbackModule.isContributionPlaybackVisible({
      isIntersecting: true,
      intersectionRatio:
        playbackModule.CONTRIBUTION_PLAYBACK_MIN_VISIBLE_RATIO,
    }),
    true,
  );
  assert.equal(
    playbackModule.isContributionPlaybackVisible({
      isIntersecting: false,
      intersectionRatio: 1,
    }),
    false,
  );
  assert.ok(
    playbackModule.contributionPlaybackDelay(true) <= 500,
    "the first visible transition must not feel like loading",
  );
});

test("inlines every complete public graph synchronously", () => {
  for (const graphId of expectedProjectGraphIds) {
    const graph = graphDataModule.getContributionGraph(graphId);
    assert.equal(graph.id, graphId);
    assert.equal(graph.schemaVersion, 2);
    assert.equal(graph.publicOnly, true);
    assert.ok(graph.nodes.length > 0);
    assert.ok(graph.edges.length > 0);
    assert.ok(graph.beats.length > 0);
  }
});

test("advances motion with visible-frame time and caps long frame gaps", () => {
  const frame = motionModule.advanceGourceMotion(0, 5, 3);

  assert.equal(frame.delta, motionModule.GOURCE_MAX_FRAME_DELTA);
  assert.equal(frame.elapsed, motionModule.GOURCE_MAX_FRAME_DELTA);
  assert.equal(frame.actionIndex, 0);
  assert.equal(frame.kinetic, true);
});

test("progresses through commit actions and loops the contribution bloom", () => {
  let elapsed = 0;
  const actionIndexes = new Set();
  let loopCount = 0;

  for (let frameIndex = 0; frameIndex < 60 * 14; frameIndex += 1) {
    const frame = motionModule.advanceGourceMotion(elapsed, 1 / 60, 5);
    elapsed = frame.elapsed;
    actionIndexes.add(frame.actionIndex);
    if (frame.looped) {
      loopCount += 1;
      assert.ok(frame.cycleAge < motionModule.GOURCE_MAX_FRAME_DELTA);
    }
  }

  assert.deepEqual([...actionIndexes], [0, 1, 2, 3, 4]);
  assert.ok(loopCount >= 2);
});

test("uses a deliberate rest beat without ending ambient playback", () => {
  let elapsed = 0;
  let sawRest = false;
  let resumed = false;

  for (let frameIndex = 0; frameIndex < 60 * 8; frameIndex += 1) {
    const frame = motionModule.advanceGourceMotion(elapsed, 1 / 60, 1);
    elapsed = frame.elapsed;
    if (!frame.kinetic) {
      sawRest = true;
    }
    if (sawRest && frame.looped && frame.kinetic) {
      resumed = true;
      break;
    }
  }

  assert.equal(sawRest, true);
  assert.equal(resumed, true);
});
