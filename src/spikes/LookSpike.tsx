import { useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { ThreeCanvas } from "@remotion/three";
import type { EffectComposer as EffectComposerImpl } from "postprocessing";
import { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from "remotion";
import { CanvasTexture, SRGBColorSpace } from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { CameraRig } from "../lib/Stage";
import { tween, useTime } from "../lib/time";

export const LOOK_SPIKE_SECONDS = 4;

export type LookVariant = "bloom" | "lights" | "hybrid";

const BYTES = [0xcc, 0xcc, 0x48, 0x83, 0xec, 0x28, 0xf3, 0x0f, 0x10, 0x41];

const TILE_SIZE = 0.04;
const TILE_HEIGHT = 0.012;
const TILE_PITCH = 0.044;
const PIN_SIZE = 0.003;
const PIN_PROTRUSION = 0.004;
const PIN_ROW_PITCH = 0.0045;
const PIN_SLOT_OFFSET = 0.006;
const PIN_BOTTOM = TILE_HEIGHT * 0.25;
const PIN_HEIGHT = TILE_HEIGHT + PIN_PROTRUSION - PIN_BOTTOM;

const EDGE = 0.0012;
const CYAN_GLOW = "#46f0ff";

RectAreaLightUniformsLib.init();

const makeGlyph = (byte: number): CanvasTexture => {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#c8fbff";
    ctx.font = "bold 64px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(byte.toString(16).toUpperCase().padStart(2, "0"), 64, 66);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

const EdgeBar: React.FC<{
  readonly position: readonly [number, number, number];
  readonly size: readonly [number, number, number];
}> = ({ position, size }) => (
  <mesh position={[...position]}>
    <boxGeometry args={[...size]} />
    <meshStandardMaterial
      color="#000000"
      emissive={CYAN_GLOW}
      emissiveIntensity={2}
      toneMapped={false}
    />
  </mesh>
);

const Tile: React.FC<{
  readonly byte: number;
  readonly index: number;
  readonly emissiveEdges: boolean;
}> = ({ byte, index, emissiveEdges }) => {
  const glyph = useMemo(() => makeGlyph(byte), [byte]);
  const half = TILE_SIZE / 2;
  const top = TILE_HEIGHT;

  return (
    <group position={[index * TILE_PITCH, 0, 0]}>
      <mesh position={[0, TILE_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[TILE_SIZE, TILE_HEIGHT, TILE_SIZE]} />
        <meshPhysicalMaterial
          color="#0b1a22"
          transmission={0.6}
          roughness={0.15}
        />
      </mesh>
      {Array.from({ length: 8 }, (_, r) => {
        const bit = (byte >> (7 - r)) & 1;
        return (
          <mesh
            key={r}
            position={[
              bit ? PIN_SLOT_OFFSET : -PIN_SLOT_OFFSET,
              PIN_BOTTOM + PIN_HEIGHT / 2,
              (r - 3.5) * PIN_ROW_PITCH,
            ]}
          >
            <boxGeometry args={[PIN_SIZE, PIN_HEIGHT, PIN_SIZE]} />
            <meshStandardMaterial
              color="#000000"
              emissive={bit ? "#7ff6ff" : "#2a5560"}
              emissiveIntensity={bit ? 1.6 : 0.5}
              toneMapped={false}
            />
          </mesh>
        );
      })}
      <mesh position={[0, top + 0.0004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.03, 0.03]} />
        <meshBasicMaterial map={glyph} transparent toneMapped={false} />
      </mesh>
      {emissiveEdges ? (
        <>
          <EdgeBar
            position={[0, top, half - EDGE / 2]}
            size={[TILE_SIZE, EDGE, EDGE]}
          />
          <EdgeBar
            position={[0, top, -half + EDGE / 2]}
            size={[TILE_SIZE, EDGE, EDGE]}
          />
          <EdgeBar
            position={[half - EDGE / 2, top, 0]}
            size={[EDGE, EDGE, TILE_SIZE]}
          />
          <EdgeBar
            position={[-half + EDGE / 2, top, 0]}
            size={[EDGE, EDGE, TILE_SIZE]}
          />
        </>
      ) : null}
    </group>
  );
};

const Glow: React.FC<{ readonly intensity: number }> = ({ intensity }) => {
  const advance = useThree((state) => state.advance);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender("composer"));
  const [composer, setComposer] = useState<EffectComposerImpl | null>(null);

  useEffect(() => {
    if (!composer) {
      return;
    }
    advance((frame / fps) * 1000);
    continueRender(handle);
  }, [composer, advance, frame, fps, continueRender, handle]);

  return (
    <EffectComposer ref={setComposer}>
      <Bloom luminanceThreshold={0.6} intensity={intensity} mipmapBlur />
    </EffectComposer>
  );
};

const Scene: React.FC<{ readonly variant: LookVariant }> = ({ variant }) => {
  const t = useTime();
  const useBloom = variant !== "lights";
  const useLights = variant !== "bloom";
  const slide = tween(t, [0, LOOK_SPIKE_SECONDS], [0, TILE_PITCH]);
  const sledX = 3.5 * TILE_PITCH + slide;
  const railCenter = 4.5 * TILE_PITCH;

  return (
    <>
      <CameraRig
        position={[railCenter + 0.08, 0.27, 0.5]}
        target={[railCenter, 0.0, 0]}
        fov={38}
      />
      <ambientLight intensity={0.35} />
      <directionalLight position={[0.2, 0.5, 0.3]} intensity={0.4} />

      {BYTES.map((byte, index) => (
        <Tile
          key={index}
          byte={byte}
          index={index}
          emissiveEdges={useBloom}
        />
      ))}

      <mesh
        position={[railCenter, -0.0005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[1.2, 0.8]} />
        <meshStandardMaterial color="#05060b" roughness={0.35} metalness={0.2} />
      </mesh>

      <mesh position={[sledX, 0.045, 0]}>
        <boxGeometry args={[0.16, 0.008, 0.03]} />
        <meshStandardMaterial color="#ffb43f" roughness={0.5} />
      </mesh>
      <pointLight
        position={[sledX, 0.038, 0]}
        color="#ffb43f"
        intensity={0.01}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.005}
        shadow-camera-far={0.5}
        shadow-bias={-0.0005}
      />

      {useLights ? (
        <>
          <mesh
            position={[railCenter, 0.0012, 0.03]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.0012, 0.0012, 0.46, 12]} />
            <meshStandardMaterial
              color="#000000"
              emissive={CYAN_GLOW}
              emissiveIntensity={2}
              toneMapped={false}
            />
          </mesh>
          <rectAreaLight
            position={[railCenter, 0.004, 0.032]}
            rotation={[-0.5, 0, 0]}
            width={0.46}
            height={0.004}
            intensity={6}
            color={CYAN_GLOW}
          />
        </>
      ) : null}

      {useBloom ? (
        <Glow intensity={variant === "hybrid" ? 0.6 : 1.2} />
      ) : null}
    </>
  );
};

export const LookSpike: React.FC<{ readonly variant: LookVariant }> = ({
  variant,
}) => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#05060a" }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ fov: 38, position: [0, 0.2, 0.34], near: 0.01, far: 5 }}
        gl={{ antialias: true }}
      >
        <Scene variant={variant} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
