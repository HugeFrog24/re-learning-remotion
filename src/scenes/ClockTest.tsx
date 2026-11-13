import { Audio } from "@remotion/media";
import { ding, whoosh } from "@remotion/sfx";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CameraRig, Stage } from "../lib/Stage";
import { tween, useTime } from "../lib/time";

export const CLOCK_TEST_SECONDS = 6;

export const ClockTest: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTime();

  const rise = tween(t, [0.2, 1.4], [-7, 0], Easing.bezier(0.16, 1, 0.3, 1));
  const spin = t * 0.9;
  const camZ = tween(t, [0, 6], [15, 11], Easing.inOut(Easing.cubic));

  return (
    <AbsoluteFill>
      <Stage>
        <CameraRig position={[0, 0.8, camZ]} target={[0, 0, 0]} fov={40} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[4, 6, 5]} intensity={2.2} />
        <pointLight position={[-4, -2, 3]} intensity={40} color="#5b8cff" />
        <mesh position={[0, rise, 0]} rotation={[spin * 0.6, spin, 0]}>
          <torusKnotGeometry args={[1.4, 0.42, 220, 32]} />
          <meshStandardMaterial
            color="#e8e3d9"
            metalness={0.6}
            roughness={0.25}
          />
        </mesh>
      </Stage>
      <Interactive.Div
        name="Clock readout"
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 140,
          textAlign: "center",
          fontFamily: "monospace",
          fontSize: 44,
          color: "white",
          opacity: interpolate(frame, [0.5 * fps, 1 * fps], [0, 0.85], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        t = {t.toFixed(3)}s · f{frame} @ {fps}fps
      </Interactive.Div>
      <Audio name="Whoosh in" src={whoosh} from={0.1 * fps} volume={0.8} />
      <Audio name="Settle ding" src={ding} from={1.4 * fps} volume={0.6} />
    </AbsoluteFill>
  );
};
