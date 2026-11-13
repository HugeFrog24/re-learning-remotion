export const BACKGROUND = "#05060a";
export const CYAN_GLOW = "#46f0ff";
export const UNLIT = "#000000";
export const WHITE = "#ffffff";

export const AMBIENT = { intensity: 0.35 };
export const KEY_LIGHT = {
  position: [0.2, 0.5, 0.3] as [number, number, number],
  intensity: 0.4,
};

export const EDGE = { width: 0.0012, color: CYAN_GLOW, intensity: 2 };
export const GLYPH = { color: "#c8fbff", em: 0.8 };

export const GLASS = { color: "#b9dbe4", transmission: 0.85, roughness: 0.12 };
export const PIN_LIT = { emissive: "#7ff6ff", emissiveIntensity: 1.6 };
export const PIN_DARK = { emissive: "#2a5560", emissiveIntensity: 0.5 };

export const CARDBOARD = { color: "#b48c5c", roughness: 0.9 };
export const PRINT = { ink: "#2a1a0c", em: 0.5 };

export const RAIL = { color: "#0c0f15", roughness: 0.45, metalness: 0.6 };
export const TUBE = {
  height: 0.0024,
  color: CYAN_GLOW,
  intensity: 2,
  light: {
    intensity: 6,
    height: 0.004,
    lift: 0.004,
    standoff: 0.002,
    tilt: -0.5,
  },
};

export const FLOOR = { color: "#05060b", roughness: 0.9, metalness: 0 };
export const MIRROR = { tint: WHITE, f0: 0.04, samples: 4 };

export const SLED_LIGHT = {
  color: "#ffb43f",
  intensity: 0.1,
  rise: 0.06,
  standoff: 0.03,
  shadow: { mapSize: 1024, near: 0.005, far: 0.5, bias: -0.0005 },
};

export const BLOOM = { threshold: 0.6, intensity: 0.6 };
