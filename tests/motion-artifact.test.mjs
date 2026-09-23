import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

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
  assert.match(composition, /const signalProgress = signalProgressAtFrame\(frame\)/);
  assert.match(composition, /const curves = \[/);
  assert.match(composition, /function cubicPoint/);
  assert.match(composition, /const signalStartFrame = 10/);
  assert.match(composition, /const signalSegmentFrames = 20/);
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
  assert.match(composition, /\[0\.02, 0\.62, 0\.62\]/);
  assert.doesNotMatch(composition, /\.map\(\(point, index\) => `\$\{index === 0 \? "M" : "L"\}/);
  assert.doesNotMatch(
    composition,
    /strokeDashoffset|const entrance|opacity:\s*entrance|scale:\s*entrance/,
  );
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

  assert.match(rootSource, /durationInFrames=\{150\}/);
  assert.match(rootSource, /fps=\{30\}/);
  assert.match(rootSource, /width=\{1280\}/);
  assert.match(rootSource, /height=\{720\}/);
  assert.match(packageJson, /"@remotion\/cli": "4\.0\.520"/);
  assert.match(packageJson, /"remotion": "4\.0\.520"/);
  assert.match(packageJson, /--muted/);
});

test("stage emphasis shares the signal's segment clock", async () => {
  const composition = await readFile(
    new URL("remotion/compositions/OperatingArc.tsx", root),
    "utf8",
  );
  const start = Number(
    composition.match(/const signalStartFrame = (\d+)/)?.[1],
  );
  const segmentFrames = Number(
    composition.match(/const signalSegmentFrames = (\d+)/)?.[1],
  );
  const stageCount = 6;
  const curveCount = stageCount - 1;

  assert.ok(Number.isFinite(start));
  assert.ok(Number.isFinite(segmentFrames));
  for (let index = 0; index < stageCount; index += 1) {
    const arrival = start + index * segmentFrames;
    const completedSegments = Math.min(
      curveCount,
      Math.max(0, Math.floor((arrival - start) / segmentFrames)),
    );
    assert.equal(
      completedSegments / curveCount,
      index / curveCount,
      `stage ${index + 1} should emphasize when the signal reaches its node`,
    );
  }
});
