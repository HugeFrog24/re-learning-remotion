import { useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import type { EffectComposer as EffectComposerImpl } from "postprocessing";
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
import { BLOOM_RADIUS, bloomIntensity, bloomLevels } from "./resolution";

export const Glow: React.FC<{ readonly ready: boolean }> = ({ ready }) => {
  const advance = useThree((state) => state.advance);
  const { ratio } = useRenderPixels();
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
        mipmapBlur
        luminanceThreshold={BLOOM.threshold}
        intensity={bloomIntensity(BLOOM.intensity, ratio)}
        radius={BLOOM_RADIUS}
        levels={bloomLevels(ratio)}
      />
    </EffectComposer>
  );
};
