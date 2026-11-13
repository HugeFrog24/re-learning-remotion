import { Composition, Folder } from "remotion";
import { getFps, secondsToFrames } from "./config";
import { BASE_HEIGHT, BASE_WIDTH } from "./render/resolution";
import { Main, MAIN_SECONDS } from "./Main";
import { ClockTest, CLOCK_TEST_SECONDS } from "./scenes/ClockTest";
import { LookSpike, LOOK_SPIKE_SECONDS } from "./spikes/LookSpike";

export const RemotionRoot: React.FC = () => {
  const fps = getFps();

  return (
    <>
      <Composition
        id="Main"
        component={Main}
        width={BASE_WIDTH}
        height={BASE_HEIGHT}
        fps={fps}
        durationInFrames={secondsToFrames(MAIN_SECONDS, fps)}
      />
      <Folder name="Scenes">
        <Composition
          id="ClockTest"
          component={ClockTest}
          width={BASE_WIDTH}
          height={BASE_HEIGHT}
          fps={fps}
          durationInFrames={secondsToFrames(CLOCK_TEST_SECONDS, fps)}
        />
      </Folder>
      <Folder name="Spikes">
        <Composition
          id="LookSpike"
          component={LookSpike}
          width={BASE_WIDTH}
          height={BASE_HEIGHT}
          fps={fps}
          durationInFrames={secondsToFrames(LOOK_SPIKE_SECONDS, fps)}
          defaultProps={{ variant: "bloom" as const }}
        />
      </Folder>
    </>
  );
};
