import { Vector3 } from 'three';

// Shared world-space light direction — consumed by Earth's shader (day/night
// terminator + specular), CloudLayer's lit/shadow mix, AtmosphereGlow's
// lit-limb weighting, and mirrored by a real THREE.DirectionalLight in
// EarthCanvas so the scene's actual light source agrees with what the
// shaders compute. Slowly rotated in place (see advanceSunDirection below)
// rather than held perfectly fixed — direct feedback that a static
// terminator read as lifeless; a visible day/night sweep is now part of
// Earth's idle life alongside the cloud drift and night-light shimmer.
export const SUN_DIRECTION = new Vector3(-2, 0.8, 2.2).normalize();

const ROTATION_AXIS = new Vector3(0, 1, 0);
// A full terminator sweep every ~110s — slow enough to still read as
// "physically grounded lighting," fast enough that its movement is clearly
// visible within a normal viewing/scroll session, not a needle that never
// seems to move.
const RADIANS_PER_SECOND = (Math.PI * 2) / 110;

/**
 * Advances SUN_DIRECTION around Earth's polar axis, mutating the existing
 * Vector3 in place rather than reassigning it — every material/light that
 * already holds `{ value: SUN_DIRECTION }` picks up the change for free,
 * with no extra per-consumer wiring needed. Call once per frame from a
 * component inside the R3F <Canvas> tree (EarthCanvas's SunController).
 */
export function advanceSunDirection(deltaSeconds: number): void {
  SUN_DIRECTION.applyAxisAngle(ROTATION_AXIS, RADIANS_PER_SECOND * deltaSeconds);
}
