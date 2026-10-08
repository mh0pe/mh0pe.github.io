import { Composition } from "remotion";
import { OperatingArc } from "./compositions/OperatingArc";
import { StoryComposition } from "@/app/components/blog/motion/StoryComposition";
import { motionStorySlugs, storyDuration, storyFps } from "@/app/data/article-motion";
import { SocialCard } from "./compositions/SocialCard";

const FPS = 30;

export function RemotionRoot() {
  return (
    <>
    <Composition id="SocialCard" component={SocialCard} defaultProps={{ path: "/" }} durationInFrames={1} fps={30} width={1200} height={630} />
    <Composition
      id="OperatingArc"
      component={OperatingArc}
      durationInFrames={Math.round(5 * FPS)}
      fps={FPS}
      width={1280}
      height={720}
    />
    {motionStorySlugs.map((story) => <Composition key={story}
      id={"Article-" + story} component={StoryComposition}
      defaultProps={{ story, instance: "render" }} durationInFrames={storyDuration}
      fps={storyFps} width={1280} height={800} />)}
    </>
  );
}
