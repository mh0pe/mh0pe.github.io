import { Composition } from "remotion";
import { OperatingArc } from "./compositions/OperatingArc";

const FPS = 30;

export function RemotionRoot() {
  return (
    <Composition
      id="OperatingArc"
      component={OperatingArc}
      durationInFrames={Math.round(5 * FPS)}
      fps={FPS}
      width={1280}
      height={720}
    />
  );
}
