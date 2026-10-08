import { Component, createRef, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Player, type PlayerRef } from "@remotion/player";
import { StoryComposition } from "@/app/components/blog/motion/StoryComposition";
import { isMotionStory, motionStories, storyDuration, storyFps } from "@/app/data/article-motion";
import { chapterAt, clamp } from "@/app/components/blog/motion/story-timing";

class SceneBoundary extends Component<{ children: ReactNode; failed: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.failed(); }
  render() { return this.state.failed ? null : this.props.children; }
}

type StoryHandle = { seek: (frame: number) => void; destroy: () => void };
declare global { interface Window { mountArticleStory?: (element: HTMLElement, story: string, frame: number, ready: () => void, failed: () => void) => StoryHandle | null } }

window.mountArticleStory = (element, slug, initialFrame, ready, failed) => {
  if (!isMotionStory(slug)) return null;
  const root = createRoot(element);
  const ref = createRef<PlayerRef>();
  let disposed = false;
  let latestFrame = clamp(Math.round(initialFrame), 0, storyDuration - 1);
  let lastChapter = -1;
  const stage = element.closest<HTMLElement>("[data-story-stage]")!;
  const caption = (frame: number) => {
    const chapter = chapterAt(frame);
    if (lastChapter === chapter) return;
    lastChapter = chapter;
    const words = motionStories[slug].chapters[chapter];
    const title = stage.querySelector("[data-story-title]");
    const description = stage.querySelector("[data-story-caption]");
    const alternative = stage.querySelector("[data-story-description]");
    if (title) title.textContent = words.title;
    if (description) description.textContent = words.caption;
    if (alternative) alternative.textContent = words.description;
  };
  const safeFailure = () => queueMicrotask(() => { if (!disposed) failed(); });
  root.render(<SceneBoundary failed={safeFailure}>
    <Player ref={value => {
      ref.current = value;
      if (value && !disposed) { value.pause(); value.seekTo(latestFrame); caption(latestFrame); ready(); }
    }} component={StoryComposition} inputProps={{ story: slug, instance: stage.dataset.storyStage + "-player" }}
      durationInFrames={storyDuration} fps={storyFps} compositionWidth={1280} compositionHeight={800}
      initialFrame={latestFrame} controls={false} autoPlay={false} loop={false} clickToPlay={false}
      doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false} showPosterWhenPaused={false}
      numberOfSharedAudioTags={0} allowFullscreen={false} initiallyMuted
      style={{ width: "100%", height: "100%" }}
      errorFallback={() => { safeFailure(); return null; }}
    />
  </SceneBoundary>);
  return {
    seek(frame) {
      const next = clamp(Math.round(frame), 0, storyDuration - 1);
      if (disposed || next === latestFrame) return;
      latestFrame = next;
      ref.current?.seekTo(next);
      caption(next);
    },
    destroy() { disposed = true; root.unmount(); },
  };
};
