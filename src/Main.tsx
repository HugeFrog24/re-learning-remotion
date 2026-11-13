import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { ClockTest } from "./scenes/ClockTest";

/**
 * Master timeline. Scenes sit on absolute timecodes in seconds
 * (`from={12.5 * fps}`), so overlaps/crossfades are just overlapping ranges
 * and nothing depends on a specific frame rate.
 */
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
