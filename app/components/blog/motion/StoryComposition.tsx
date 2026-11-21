import { useEffect, useRef } from "react";
import { staticFile, useCurrentFrame } from "remotion";
import { StoryScene } from "@/app/components/blog/motion/StoryScene";
import type { MotionStory } from "@/app/data/article-motion";

export function StoryComposition({ story, instance = "film", onSceneReady }: { story: MotionStory; instance?: string; onSceneReady?: (svg: SVGSVGElement, frame: number) => void }) {
  const frame = useCurrentFrame();
  const scene = useRef<HTMLDivElement>(null);
  // Also retry on same-frame Player layout commits. A frame/seek event alone
  // does not prove that the fitted, opaque drawing has reached the DOM.
  useEffect(() => {
    if (!onSceneReady) return;
    const svg = scene.current?.querySelector("svg");
    if (svg) onSceneReady(svg, frame);
  });
  return <div ref={scene} style={{ width: "100%", height: "100%" }}><style>{`@font-face { font-family: "Instrument Sans"; src: url("${staticFile("fonts/instrument-sans-variable.woff2")}") format("woff2"); font-weight: 400 700; font-display: swap; }`}</style><StoryScene story={story} frame={frame} id={story + "-" + instance} /></div>;
}
