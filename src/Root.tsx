import { Composition, Folder } from "remotion";
import { getFps, secondsToFrames } from "./config";
import { Main, MAIN_SECONDS } from "./Main";
import { ClockTest, CLOCK_TEST_SECONDS } from "./scenes/ClockTest";

export const RemotionRoot: React.FC = () => {
  const fps = getFps();

  return (
    <>
      <Composition
        id="Main"
        component={Main}
        width={1080}
        height={1920}
        fps={fps}
        durationInFrames={secondsToFrames(MAIN_SECONDS, fps)}
      />
      <Folder name="Scenes">
        <Composition
          id="ClockTest"
          component={ClockTest}
          width={1080}
          height={1920}
          fps={fps}
          durationInFrames={secondsToFrames(CLOCK_TEST_SECONDS, fps)}
        />
      </Folder>
    </>
  );
};
