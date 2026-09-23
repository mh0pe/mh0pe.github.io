import { Composition } from "remotion";
import { OperatingArc } from "./compositions/OperatingArc";

export function RemotionRoot() {
  return (
    <Composition
      id="OperatingArc"
      component={OperatingArc}
      durationInFrames={150}
      fps={30}
      width={1280}
      height={720}
    />
  );
}
