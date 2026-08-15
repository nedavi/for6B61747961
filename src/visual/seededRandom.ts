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

export interface StarSeed {
  x: number; // 0..1, fraction of viewport width
  y: number; // 0..1, fraction of viewport height
  radius: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

const STAR_SEED = 1337;
const STAR_COUNT = 220;

// Computed once at module load — identical for the lifetime of the tab,
// regardless of how many times AmbientBackground re-renders or story steps change.
export const STARS: StarSeed[] = (() => {
  const random = mulberry32(STAR_SEED);
  return Array.from({ length: STAR_COUNT }, () => ({
    x: random(),
    y: random(),
    radius: 0.5 + random() * 1.1,
    baseOpacity: 0.25 + random() * 0.55,
    twinkleSpeed: 0.15 + random() * 0.35,
    twinkleOffset: random() * Math.PI * 2,
  }));
})();

export const GRAIN_SEED = 4242;
