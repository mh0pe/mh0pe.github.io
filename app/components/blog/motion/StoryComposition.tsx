import { staticFile, useCurrentFrame } from "remotion";
import { StoryScene } from "@/app/components/blog/motion/StoryScene";
import type { MotionStory } from "@/app/data/article-motion";

export function StoryComposition({ story, instance = "film" }: { story: MotionStory; instance?: string }) {
  const frame = useCurrentFrame();
  return <><style>{`@font-face { font-family: "Instrument Sans"; src: url("${staticFile("fonts/instrument-sans-variable.woff2")}") format("woff2"); font-weight: 400 700; }`}</style><StoryScene story={story} frame={frame} id={story + "-" + instance} /></>;
}
