import { storyDuration } from "@/app/data/article-motion";

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export function ease(value: number) {
  const t = clamp(value);
  return t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}
export const between = (frame: number, start: number, end: number) => ease((frame - start) / (end - start));
export function chapterAt(frame: number) { return frame < 300 ? 0 : frame < 650 ? 1 : 2; }

// Each chapter includes a composed hold. Scroll controls the timeline, not time
// spent waiting; a fast fling seeks directly to the relevant frame.
export function storyState(frame: number) {
  const f = clamp(frame, 0, storyDuration - 1);
  return { focus: between(f, 250, 410), resolve: between(f, 610, 790), arrival: between(f, 0, 70), opening: between(f, 70, 240) };
}
