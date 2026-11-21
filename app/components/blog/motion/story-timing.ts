import { motionStories, storyDuration, type MotionStory } from "@/app/data/article-motion";

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export function ease(value: number) {
  const t = clamp(value);
  return t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}
export const between = (frame: number, start: number, end: number) => ease((frame - start) / (end - start));
export const chapterFrames = [0, 300, 650] as const;
export function chapterAt(frame: number, story?: MotionStory) {
  const starts = story ? motionStories[story].chapters.map(chapter => chapter.start) : chapterFrames;
  return starts.reduce((current, start, index) => frame >= start ? index : current, 0);
}

// Each chapter includes a composed hold. Scroll controls the timeline, not time
// spent waiting. Focus and resolution never begin under the previous chapter's
// caption, and the authored still poses retain onward motion within a chapter.
export function storyState(frame: number) {
  const f = clamp(frame, 0, storyDuration - 1);
  return { focus: between(f, chapterFrames[1], 600), resolve: between(f, chapterFrames[2], 900), arrival: between(f, 0, 70), opening: between(f, 70, 250) };
}
