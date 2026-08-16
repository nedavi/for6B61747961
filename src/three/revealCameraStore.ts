import { EARTH_REVEAL_CAMERA } from '../data/journey';

// Distance the auto-reveal camera "flies in" from before scroll takes over —
// Earth starts noticeably smaller/more distant than EARTH_REVEAL_CAMERA's own
// resting distance, and EarthCanvas's reveal GSAP timeline tweens this value
// down to EARTH_REVEAL_CAMERA.distance while CameraRig reads it every frame.
// A plain mutable object (like progressStore.ts) so CameraRig's useFrame can
// read it without any React re-render plumbing, and GSAP can tween it directly.
export const REVEAL_START_DISTANCE = EARTH_REVEAL_CAMERA.distance * 1.9;

export const revealCameraStore = {
  distance: REVEAL_START_DISTANCE,
};
