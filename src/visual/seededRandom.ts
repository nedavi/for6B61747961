// Deterministic PRNG (mulberry32) — used so procedural positions (stars, grain)
// are stable across every re-render and every story step. Never Math.random()
// here: that would reshuffle the sky every time React re-renders.
export function mulberry32(seed: number): () => number {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type StarLayer = 'far' | 'near';

export interface StarSeed {
  x: number; // 0..1, fraction of viewport width
  y: number; // 0..1, fraction of viewport height
  radius: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  layer: StarLayer;
  /** Pointer-parallax multiplier in px, tiny — depth cue only, never chases the pointer. */
  parallax: number;
}

const STAR_SEED = 1337;

// Two depth layers so relative movement (twinkle timing + pointer parallax)
// reads as depth rather than a single flat field of dots (see AmbientBackground §11).
// 'far': more numerous, smaller, dimmer, minimal parallax. 'near': fewer, slightly
// larger/brighter, a touch more parallax — still within the 2-4px ceiling from DESIGN.md.
const FAR_COUNT = 160;
const NEAR_COUNT = 60;

// Computed once at module load — identical for the lifetime of the tab,
// regardless of how many times AmbientBackground re-renders or story steps change.
export const STARS: StarSeed[] = (() => {
  const random = mulberry32(STAR_SEED);
  const far: StarSeed[] = Array.from({ length: FAR_COUNT }, () => ({
    x: random(),
    y: random(),
    radius: 0.4 + random() * 0.7,
    baseOpacity: 0.2 + random() * 0.4,
    twinkleSpeed: 0.15 + random() * 0.3,
    twinkleOffset: random() * Math.PI * 2,
    layer: 'far' as const,
    parallax: 1.4 + random() * 0.8,
  }));
  const near: StarSeed[] = Array.from({ length: NEAR_COUNT }, () => ({
    x: random(),
    y: random(),
    radius: 0.9 + random() * 1.3,
    baseOpacity: 0.4 + random() * 0.5,
    twinkleSpeed: 0.2 + random() * 0.4,
    twinkleOffset: random() * Math.PI * 2,
    layer: 'near' as const,
    parallax: 2.6 + random() * 1.4,
  }));
  return [...far, ...near];
})();

export const GRAIN_SEED = 4242;
