import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { PerspectiveCamera } from "three";
import { placeCamera } from "../render/lens";
import { BACKGROUND } from "../render/look";
import { canvasDpr } from "../render/resolution";
import type { CameraSetup } from "../world/camera";

export const Stage: React.FC<{
  readonly children: React.ReactNode;
}> = ({ children }) => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: BACKGROUND }}>
      <ThreeCanvas
        width={width}
        height={height}
        dpr={canvasDpr()}
        shadows="percentage"
        gl={{ antialias: true }}
      >
        {children}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

export const CameraRig: React.FC<{ readonly setup: CameraSetup }> = ({
  setup,
}) => {
  const camera = useThree((state) => state.camera);

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) {
      throw new TypeError("the stage needs a perspective camera");
    }
    placeCamera(camera, setup);
  }, [camera, setup]);

  return null;
};

export const useRenderPixels = (): {
  readonly ratio: number;
  readonly maxTextureSize: number;
} => {
  const gl = useThree((state) => state.gl);
  useThree((state) => state.viewport.dpr);
  return {
    ratio: gl.getPixelRatio(),
    maxTextureSize: gl.capabilities.maxTextureSize,
  };
};
