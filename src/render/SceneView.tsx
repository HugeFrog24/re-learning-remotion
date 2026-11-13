import { useCurrentFrame, useVideoConfig } from "remotion";
import { CameraRig, Stage, useRenderPixels } from "../lib/Stage";
import { FLOOR_ID, type Body, type Scene } from "../world/body";
import type { CameraSetup } from "../world/camera";
import { storyTimeOfFrame, type StoryClock } from "../world/clock";
import { isStencil } from "../world/stencil";
import { RAIL_ID, TILE_ID_PREFIX } from "../world/tape";
import { FloorMesh } from "./FloorMesh";
import { Glow } from "./Glow";
import { useFaces, useGlyphFont, type Faces } from "./glyphTexture";
import { cameraPropsAt } from "./lens";
import { AMBIENT, KEY_LIGHT, SLED_LIGHT } from "./look";
import { RailMesh } from "./RailMesh";
import { capToGpu, glyphTextureSize } from "./resolution";
import { StencilMesh } from "./StencilMesh";
import { TileMesh } from "./TileMesh";

const BodyMesh: React.FC<{
  readonly body: Body;
  readonly t: number;
  readonly faces: Faces;
}> = ({ body, t, faces }) => {
  const boxes = body.localBoxes;
  const pose = body.poseAt(t);
  if (body.id.startsWith(TILE_ID_PREFIX)) {
    return <TileMesh boxes={boxes} pose={pose} faces={faces} />;
  }
  if (body.id === RAIL_ID) {
    return <RailMesh boxes={boxes} pose={pose} faces={faces} />;
  }
  if (body.id === FLOOR_ID) {
    return <FloorMesh boxes={boxes} pose={pose} />;
  }
  if (isStencil(boxes)) {
    return <StencilMesh boxes={boxes} pose={pose} faces={faces} />;
  }
  throw new Error(`no look is defined for body ${body.id}`);
};

const Lights: React.FC<{ readonly camera: CameraSetup }> = ({ camera }) => {
  const { maxTextureSize } = useRenderPixels();
  const [x, y, z] = camera.target;
  const shadowMap = capToGpu(SLED_LIGHT.shadow.mapSize, maxTextureSize);
  return (
    <>
      <ambientLight intensity={AMBIENT.intensity} />
      <directionalLight
        position={KEY_LIGHT.position}
        intensity={KEY_LIGHT.intensity}
      />
      <pointLight
        position={[x, y + SLED_LIGHT.rise, z + SLED_LIGHT.standoff]}
        color={SLED_LIGHT.color}
        intensity={SLED_LIGHT.intensity}
        castShadow
        shadow-mapSize={[shadowMap, shadowMap]}
        shadow-camera-near={SLED_LIGHT.shadow.near}
        shadow-camera-far={SLED_LIGHT.shadow.far}
        shadow-bias={SLED_LIGHT.shadow.bias}
      />
    </>
  );
};

const Bodies: React.FC<{
  readonly scene: Scene;
  readonly t: number;
  readonly family: string;
}> = ({ scene, t, family }) => {
  const { ratio, maxTextureSize } = useRenderPixels();
  const faces = useFaces(family, glyphTextureSize(ratio, maxTextureSize));
  return scene.bodies.map((body) => (
    <BodyMesh key={body.id} body={body} t={t} faces={faces} />
  ));
};

const Shot: React.FC<{
  readonly scene: Scene;
  readonly clock: StoryClock;
}> = ({ scene, clock }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const family = useGlyphFont();
  const camera = cameraPropsAt(scene, clock, frame, fps);
  return (
    <>
      <CameraRig setup={camera} />
      <Lights camera={camera} />
      {family ? (
        <Bodies
          scene={scene}
          t={storyTimeOfFrame(frame, fps, clock)}
          family={family}
        />
      ) : null}
      <Glow ready={family !== null} />
    </>
  );
};

export const SceneView: React.FC<{
  readonly scene: Scene;
  readonly clock: StoryClock;
}> = ({ scene, clock }) => (
  <Stage>
    <Shot scene={scene} clock={clock} />
  </Stage>
);
