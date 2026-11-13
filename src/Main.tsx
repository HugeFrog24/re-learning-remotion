import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { ClockTest } from "./scenes/ClockTest";

export const MAIN_SECONDS = 6;

export const Main: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#05060a" }}>
      <Sequence
        name="Clock test"
        from={0 * fps}
        durationInFrames={6 * fps}
        premountFor={1 * fps}
      >
        <ClockTest />
      </Sequence>
    </AbsoluteFill>
  );
};
