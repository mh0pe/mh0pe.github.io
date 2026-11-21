import { Component, createRef, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Player, type PlayerRef } from "@remotion/player";
import { StoryComposition } from "@/app/components/blog/motion/StoryComposition";
import { isMotionStory, motionStories, storyDuration, storyFps } from "@/app/data/article-motion";
import { chapterAt, clamp } from "@/app/components/blog/motion/story-timing";
import { canRevealStoryScene } from "@/app/components/blog/motion/scene-readiness";

class SceneBoundary extends Component<{ children: ReactNode; failed: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.failed(); }
  render() { return this.state.failed ? null : this.props.children; }
}

type StoryHandle = { seek: (frame: number) => void; checkpoint: () => { frame: number; svg: SVGSVGElement } | null; destroy: () => void };
let mountSerial = 0;
declare global { interface Window { mountArticleStory?: (element: HTMLElement, story: string, frame: number, ready: () => void, failed: () => void) => StoryHandle | null } }

window.mountArticleStory = (element, slug, initialFrame, ready, failed) => {
  if (!isMotionStory(slug)) return null;
  const root = createRoot(element);
  const ref = createRef<PlayerRef>();
  let disposed = false;
  let sceneReady = false;
  let committedScene: { svg: SVGSVGElement; frame: number } | null = null;
  let latestFrame = clamp(Math.round(initialFrame), 0, storyDuration - 1);
  let lastChapter = -1;
  const stage = element.closest<HTMLElement>("[data-story-stage]")!;
  // A parked drawing retains its old IDs. Every new live mount gets a separate
  // namespace so its clip paths cannot collide with that visible fallback.
  const instance = stage.dataset.storyStage + "-player-" + ++mountSerial;
  stage.dataset.storyRequestedFrame = String(latestFrame);
  const caption = (frame: number) => {
    const chapter = chapterAt(frame, slug);
    stage.dataset.storyChapter = String(chapter);
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
  const revealCommittedScene = () => {
    const player = ref.current;
    if (disposed || !player || !committedScene) return;
    if (!sceneReady && committedScene.frame !== latestFrame) { player.seekTo(latestFrame); return; }
    if (!canRevealStoryScene(element, committedScene.svg, player.getContainerNode(), disposed)) return;
    // A seek request is not a render acknowledgement. Once live, the copy and
    // mobile labels follow every committed drawing, even during rapid seeks.
    caption(committedScene.frame);
    if (!sceneReady) {
      player.pause();
      sceneReady = true;
      ready();
    }
  };
  const onSceneReady = (svg: SVGSVGElement, frame: number) => {
    if (disposed) return;
    committedScene = { svg, frame };
    revealCommittedScene();
  };
  const safeFailure = () => queueMicrotask(() => { if (!disposed) failed(); });
  root.render(<SceneBoundary failed={safeFailure}>
    <Player ref={value => {
      ref.current = value;
      if (value && !disposed) { value.pause(); value.seekTo(latestFrame); revealCommittedScene(); }
    }} component={StoryComposition} inputProps={{ story: slug, instance, onSceneReady }}
      durationInFrames={storyDuration} fps={storyFps} compositionWidth={1280} compositionHeight={800}
      initialFrame={latestFrame} controls={false} autoPlay={false} loop={false} clickToPlay={false}
      doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false} showPosterWhenPaused={false}
      numberOfSharedAudioTags={0} allowFullscreen={false} initiallyMuted
      style={{ width: "100%", height: "100%" }}
      errorFallback={() => { safeFailure(); return null; }}
    />
  </SceneBoundary>);
  return {
    checkpoint() {
      if (!sceneReady || !committedScene || !canRevealStoryScene(element, committedScene.svg, ref.current?.getContainerNode() ?? null, disposed)) return null;
      if (committedScene.svg.getAttribute("data-story-scene-frame") !== String(committedScene.frame)) return null;
      const svg = committedScene.svg.cloneNode(true) as SVGSVGElement;
      const words = motionStories[slug].chapters[chapterAt(committedScene.frame, slug)];
      svg.removeAttribute("aria-hidden");
      svg.removeAttribute("aria-labelledby");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", words.title + ". " + words.description);
      return { frame: committedScene.frame, svg };
    },
    seek(frame) {
      const next = clamp(Math.round(frame), 0, storyDuration - 1);
      if (disposed || next === latestFrame) return;
      latestFrame = next;
      stage.dataset.storyRequestedFrame = String(next);
      ref.current?.seekTo(next);
    },
    destroy() { if (disposed) return; disposed = true; committedScene = null; delete stage.dataset.storyRequestedFrame; root.unmount(); },
  };
};
