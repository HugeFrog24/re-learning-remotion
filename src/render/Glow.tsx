import { useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import type {
  BloomEffect,
  EffectComposer as EffectComposerImpl,
} from "postprocessing";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useCurrentFrame, useDelayRender, useVideoConfig } from "remotion";
import { useRenderPixels } from "../lib/Stage";
import { BLOOM } from "./look";
import { pinFineMipSteps } from "./mipmapRadius";
import { bloomConfig } from "./resolution";

export const Glow: React.FC<{ readonly ready: boolean }> = ({ ready }) => {
  const advance = useThree((state) => state.advance);
  const { ratio } = useRenderPixels();
  const { levels, radius, fineSteps } = bloomConfig(ratio);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { delayRender, continueRender } = useDelayRender();
  const hold = useRef<number | null>(null);
  const [composer, setComposer] = useState<EffectComposerImpl | null>(null);

  const release = useCallback(() => {
    if (hold.current === null) return;
    continueRender(hold.current);
    hold.current = null;
  }, [continueRender]);

  const pinFineLevels = useCallback(
    (effect: BloomEffect | null) => {
      if (effect) pinFineMipSteps(effect.mipmapBlurPass, fineSteps, radius);
    },
    [fineSteps, radius],
  );

  useLayoutEffect(() => {
    hold.current = delayRender(`Drawing the glow of frame ${frame}`);
    return release;
  }, [frame, delayRender, release]);

  useEffect(() => {
    if (!composer || !ready) return;
    advance((frame / fps) * 1000);
    release();
  }, [composer, ready, advance, frame, fps, release]);

  return (
    <EffectComposer ref={setComposer}>
      <Bloom
        ref={pinFineLevels}
        mipmapBlur
        luminanceThreshold={BLOOM.threshold}
        intensity={BLOOM.intensity}
        radius={radius}
        levels={levels}
      />
    </EffectComposer>
  );
};
