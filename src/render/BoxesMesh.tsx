import type { ThreeElements } from "@react-three/fiber";
import { Fragment, type ReactNode } from "react";
import type { LocalBox, Pose, Vec3 } from "../world/geometry";
import type { Faces } from "./glyphTexture";

export type Face = "px" | "nx" | "py" | "ny" | "pz" | "nz";

export type BodyLook = {
  readonly boxes: readonly LocalBox[];
  readonly pose: Pose;
  readonly faces: Faces;
};

const FACES: readonly Face[] = ["px", "nx", "py", "ny", "pz", "nz"];

export const faceSize = ([x, y, z]: Vec3, face: Face): [number, number] => {
  if (face === "px" || face === "nx") return [z, y];
  if (face === "py" || face === "ny") return [x, z];
  return [x, y];
};

export const Faced: React.FC<{
  readonly paint: (face: Face, slot: string) => ReactNode;
}> = ({ paint }) =>
  FACES.map((face, index) => (
    <Fragment key={face}>{paint(face, `material-${index}`)}</Fragment>
  ));

type Standard = ThreeElements["meshStandardMaterial"];

export const OneFace: React.FC<{
  readonly look: Standard;
  readonly face: Face;
  readonly special: Standard;
}> = ({ look, face, special }) => (
  <Faced
    paint={(each, slot) => (
      <meshStandardMaterial
        attach={slot}
        {...look}
        {...(each === face ? special : {})}
      />
    )}
  />
);

export const BoxesMesh: React.FC<{
  readonly boxes: readonly LocalBox[];
  readonly pose: Pose;
  readonly paint: (box: LocalBox) => ReactNode;
  readonly Fixture?: React.FC<{ readonly box: LocalBox }>;
  readonly castShadow?: boolean;
  readonly receiveShadow?: boolean;
}> = ({
  boxes,
  pose,
  paint,
  Fixture,
  castShadow = false,
  receiveShadow = false,
}) => (
  <group position={[...pose.position]} quaternion={[...pose.quaternion]}>
    {boxes.map((box) => (
      <Fragment key={box.name}>
        <mesh
          position={[...box.center]}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
        >
          <boxGeometry args={[...box.size]} />
          {paint(box)}
        </mesh>
        {Fixture ? <Fixture box={box} /> : null}
      </Fragment>
    ))}
  </group>
);
