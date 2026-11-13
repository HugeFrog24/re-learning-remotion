import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { PerspectiveCamera } from "three";

type Vec3 = readonly [number, number, number];

export const Stage: React.FC<{
  readonly children: React.ReactNode;
  readonly background?: string;
}> = ({ children, background = "#05060a" }) => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: background }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ fov: 40, position: [0, 0, 10], near: 0.1, far: 500 }}
        gl={{ antialias: true }}
      >
        {children}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

export const CameraRig: React.FC<{
  readonly position: Vec3;
  readonly target?: Vec3;
  readonly fov?: number;
  readonly roll?: number;
}> = ({ position, target = [0, 0, 0], fov = 40, roll = 0 }) => {
  const camera = useThree((s) => s.camera);
  const [px, py, pz] = position;
  const [tx, ty, tz] = target;

  useLayoutEffect(() => {
    camera.position.set(px, py, pz);
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(tx, ty, tz);
    if (camera instanceof PerspectiveCamera && camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [camera, px, py, pz, tx, ty, tz, fov, roll]);

  return null;
};
