import { useEffect, useMemo } from "react";
import { PlaneGeometry, ShaderMaterial, Vector2 } from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { useRenderPixels } from "../lib/Stage";
import type { LocalBox } from "../world/geometry";
import { BoxesMesh, type BodyLook } from "./BoxesMesh";
import { FLOOR, MIRROR } from "./look";
import {
  BASE_HEIGHT,
  BASE_WIDTH,
  capToGpu,
  inRenderPixels,
  PIXEL_PARAMS_1080,
} from "./resolution";

const BLUR_TAPS = 16;

const GLOSSY_MIRROR = {
  name: "GlossyMirror",
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    texel: { value: new Vector2() },
    blur: { value: 0 },
    f0: { value: 0 },
  },
  vertexShader: `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vWorld;
    varying vec3 vNormal;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      vNormal = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
      gl_Position = projectionMatrix * viewMatrix * world;
      #include <logdepthbuf_vertex>
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform vec2 texel;
    uniform float blur;
    uniform float f0;
    varying vec4 vUv;
    varying vec3 vWorld;
    varying vec3 vNormal;
    #include <logdepthbuf_pars_fragment>
    void main() {
      #include <logdepthbuf_fragment>
      vec2 uv = vUv.xy / vUv.w;
      vec3 sum = vec3(0.0);
      for (int i = 0; i < ${BLUR_TAPS}; i++) {
        float r = sqrt((float(i) + 0.5) / float(${BLUR_TAPS}));
        float a = float(i) * 2.39996323;
        sum += texture2D(tDiffuse, uv + r * blur * texel * vec2(cos(a), sin(a))).rgb;
      }
      float facing = clamp(dot(normalize(cameraPosition - vWorld), vNormal), 0.0, 1.0);
      float fresnel = f0 + (1.0 - f0) * pow(1.0 - facing, 5.0);
      gl_FragColor = vec4(color * sum / float(${BLUR_TAPS}), fresnel);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
};

const glossyMirror = (
  [width, depth]: readonly [number, number],
  [texelsWide, texelsHigh]: readonly [number, number],
  blur: number,
): Reflector => {
  const mirror = new Reflector(new PlaneGeometry(width, depth), {
    color: MIRROR.tint,
    textureWidth: texelsWide,
    textureHeight: texelsHigh,
    multisample: MIRROR.samples,
    shader: GLOSSY_MIRROR,
  });
  const material = mirror.material as ShaderMaterial;
  material.transparent = true;
  material.depthWrite = false;
  material.polygonOffset = true;
  material.polygonOffsetFactor = -1;
  material.polygonOffsetUnits = -1;
  material.uniforms.texel.value.set(1 / texelsWide, 1 / texelsHigh);
  material.uniforms.blur.value = blur;
  material.uniforms.f0.value = MIRROR.f0;
  return mirror;
};

const Mirror: React.FC<{ readonly box: LocalBox }> = ({ box }) => {
  const { ratio, maxTextureSize } = useRenderPixels();
  const [sx, sy, sz] = box.size;
  const [cx, cy, cz] = box.center;
  const texelsWide = capToGpu(BASE_WIDTH * ratio, maxTextureSize);
  const texelsHigh = capToGpu(BASE_HEIGHT * ratio, maxTextureSize);
  const blur = inRenderPixels(PIXEL_PARAMS_1080.reflectorBlur, ratio);
  const mirror = useMemo(
    () => glossyMirror([sx, sz], [texelsWide, texelsHigh], blur),
    [sx, sz, texelsWide, texelsHigh, blur],
  );

  useEffect(
    () => () => {
      mirror.dispose();
      mirror.geometry.dispose();
    },
    [mirror],
  );

  return (
    <primitive
      object={mirror}
      position={[cx, cy + sy / 2, cz]}
      rotation={[-Math.PI / 2, 0, 0]}
    />
  );
};

export const FloorMesh: React.FC<Omit<BodyLook, "faces">> = (look) => (
  <BoxesMesh
    {...look}
    receiveShadow
    Fixture={Mirror}
    paint={() => <meshStandardMaterial {...FLOOR} />}
  />
);
