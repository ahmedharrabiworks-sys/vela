import React from "react";
import { Composition } from "remotion";
import { Video } from "./Video";
import { TIMELINES } from "./timeline";

export const Root: React.FC = () => (
  <>
    <Composition id="VelaEN" component={Video} defaultProps={{ lang: "en" as const }} width={1080} height={1920} fps={30} durationInFrames={TIMELINES.en.durationInFrames} />
    <Composition id="VelaAR" component={Video} defaultProps={{ lang: "ar" as const }} width={1080} height={1920} fps={30} durationInFrames={TIMELINES.ar.durationInFrames} />
  </>
);
