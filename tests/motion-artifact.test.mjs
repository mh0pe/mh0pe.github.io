import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { operatingArcTiming } from "../remotion/operating-arc-timing.mjs";

const root = new URL("../", import.meta.url);

test("the operating arc is an optimized poster-first motion artifact", async () => {
  const [component, composition, poster, video, posterStat, videoStat] =
    await Promise.all([
      readFile(new URL("app/components/v3/OperatingArcFilm.tsx", root), "utf8"),
      readFile(new URL("remotion/compositions/OperatingArc.tsx", root), "utf8"),
      readFile(new URL("public/motion/operating-arc-poster.jpg", root)),
      readFile(new URL("public/motion/operating-arc.mp4", root)),
      stat(new URL("public/motion/operating-arc-poster.jpg", root)),
      stat(new URL("public/motion/operating-arc.mp4", root)),
    ]);

  assert.match(component, /data-motion-film/);
  assert.match(component, /data-motion-poster/);
  assert.match(component, /data-autoplay/);
  assert.match(component, /data-src="\/motion\/operating-arc\.mp4"/);
  assert.doesNotMatch(component, /<source\s+src=/);
  assert.doesNotMatch(component, /Remotion study/i);
  assert.doesNotMatch(component, /@remotion\/player/);

  assert.match(composition, /useCurrentFrame/);
  assert.match(composition, /interpolate/);
  assert.match(composition, /const signalProgress = signalProgressAtFrame\(frame, fps\)/);
  assert.match(composition, /const curves = \[/);
  assert.match(composition, /function cubicPoint/);
  assert.match(composition, /operatingArcTiming\(fps\)/);
  assert.match(composition, /config: filmTheme.spring/);
  assert.match(composition, /easing: filmTheme.easing/);
  assert.match(composition, /extrapolateLeft: "clamp"/);
  assert.match(composition, /extrapolateRight: "clamp"/);
  assert.match(composition, /const arrival = signalStartFrame \+ index \* signalSegmentFrames/);
  assert.match(
    composition,
    /\[finalSegmentFrame, signalEndFrame, durationInFrames - 1\]/,
  );
  assert.match(composition, /const signal = cubicPoint\(curves\[segment\], segmentProgress\)/);
  assert.match(composition, /fillOpacity=\{0\.68 \+ emphasis \* 0\.32\}/);
  assert.match(composition, /\{ x: 180, y: 300 \}/);
  assert.match(composition, /\{ x: 1020, y: 475 \}/);
  assert.match(composition, /fontSize="42"/);
  assert.doesNotMatch(composition, /\.map\(\(point, index\) => `\$\{index === 0 \? "M" : "L"\}/);
  assert.match(composition, /\[timing.exitStart, timing.exitEnd\], \[1, 0\]/);
  assert.doesNotMatch(composition, /Math\.random|Date\.now|setTimeout|setInterval/);
  assert.doesNotMatch(composition, /transition:|animation:/);

  assert.deepEqual([...poster.subarray(0, 3)], [0xff, 0xd8, 0xff]);
  assert.equal(video.subarray(4, 8).toString("ascii"), "ftyp");
  assert.ok(posterStat.size <= 100 * 1024, "poster should stay below 100 KiB");
  assert.ok(videoStat.size <= 900 * 1024, "video should stay below 900 KiB");
});

test("the Remotion composition is fixed, finite, and reproducible", async () => {
  const [rootSource, packageJson] = await Promise.all([
    readFile(new URL("remotion/Root.tsx", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(rootSource, /const FPS = 30/);
  assert.match(rootSource, /durationInFrames=\{Math.round\(5 \* FPS\)\}/);
  assert.match(rootSource, /fps=\{FPS\}/);
  assert.match(rootSource, /width=\{1280\}/);
  assert.match(rootSource, /height=\{720\}/);
  assert.match(packageJson, /"@remotion\/cli": "4\.0\.520"/);
  assert.match(packageJson, /"remotion": "4\.0\.520"/);
  assert.match(packageJson, /--muted/);
});

test("the choreography keeps the same timing at 24, 30, and 60 fps", () => {
  const stageCount = 6;
  const curveCount = stageCount - 1;
  for (const fps of [24, 30, 60]) {
    const timing = operatingArcTiming(fps);
    for (let index = 0; index < stageCount; index += 1) {
      const arrival = timing.signalStart + index * timing.signalSegment;
      assert.ok(Math.abs(arrival / fps - (1 / 3 + index * 2 / 3)) < 1e-9);
    }
    const arrival = timing.signalStart + curveCount * timing.signalSegment;
    assert.ok(timing.exitStart > arrival, "traveler reaches the final stage before exiting");
    assert.ok(timing.exitEnd - timing.exitStart <= fps * 0.3, "exit remains brief");
    assert.ok(5 * fps - timing.exitEnd >= fps * 0.5, "complete diagram holds for at least half a second");
    assert.ok((stageCount - 1) * timing.entranceStagger + timing.entranceDuration < arrival);
  }
});
