import { Vector3 } from 'three';

// Shared, fixed world-space light direction — consumed by Earth's shader (day/night
// terminator + specular) and AtmosphereGlow's lit-limb weighting, and mirrored by a
// real THREE.DirectionalLight in EarthCanvas so the scene's actual light source
// agrees with what the shaders compute. Fixed rather than animated: as the Earth
// group rotates to face different waypoints, different geography sweeps under this
// constant terminator, which is what makes day/night look physically grounded.
export const SUN_DIRECTION = new Vector3(-3, 1.1, 0.3).normalize();
