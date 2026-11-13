import { Composition, Folder } from "remotion";
import {
  StencilSeat,
  STENCIL_SEAT_SECONDS,
} from "./chapters/00-stencil-seat/StencilSeat";
import { getFps, secondsToFrames } from "./config";
import { Main, MAIN_SECONDS } from "./Main";
import { BASE_HEIGHT, BASE_WIDTH } from "./render/resolution";

const Film: React.FC<{
  readonly id: string;
  readonly component: React.FC;
  readonly seconds: number;
  readonly fps: number;
}> = ({ id, component, seconds, fps }) => (
  <Composition
    id={id}
    component={component}
    width={BASE_WIDTH}
    height={BASE_HEIGHT}
    fps={fps}
    durationInFrames={secondsToFrames(seconds, fps)}
  />
);

export const RemotionRoot: React.FC = () => {
  const fps = getFps();

  return (
    <>
      <Film id="Main" component={Main} seconds={MAIN_SECONDS} fps={fps} />
      <Folder name="Chapters">
        <Film
          id="StencilSeat"
          component={StencilSeat}
          seconds={STENCIL_SEAT_SECONDS}
          fps={fps}
        />
      </Folder>
    </>
  );
};
