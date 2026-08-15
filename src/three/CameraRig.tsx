import { useMemo, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Quaternion, Vector3, type Group } from 'three';
import { EARTH_REVEAL_CAMERA, journey, type CameraPose } from '../data/journey';
import { buildTimeline } from '../data/timeline';
import { quaternionForLatLng } from './latLng';
import { progressStore } from './progressStore';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { EARTH_MOBILE_BREAKPOINT } from './responsive';

const MOBILE_BREAKPOINT = EARTH_MOBILE_BREAKPOINT;

interface CameraKeyframe {
  progress: number;
  quaternion: Quaternion;
  pose: Required<Pick<CameraPose, 'distance' | 'fov'>> & {
    positionOffset: { x: number; y: number };
    lookAtOffset: { x: number; y: number; z: number };
  };
}

function normalizePose(pose: CameraPose): CameraKeyframe['pose'] {
  return {
    distance: pose.distance,
    fov: pose.fov ?? 40,
    positionOffset: { x: pose.positionOffset?.x ?? 0, y: pose.positionOffset?.y ?? 0 },
    lookAtOffset: { x: pose.lookAtOffset?.x ?? 0, y: pose.lookAtOffset?.y ?? 0, z: pose.lookAtOffset?.z ?? 0 },
  };
}

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface CameraRigProps {
  earthGroupRef: RefObject<Group | null>;
}

// Reads progressStore every frame (never React state/Context — ARCHITECTURE.md
// §6/§K) and drives two deliberately separate systems from the same progress
// value: WHICH lat/lng faces the camera (Earth group quaternion, three/latLng.ts)
// and HOW that correctly-oriented Earth is framed cinematically (camera
// position/lookAt/fov, data/journey.ts CameraPose). Both are built as one
// continuous keyframe list so rotation and camera arrival complete together at
// each waypoint boundary — a single continuous orbital shot, not three slides.
export function CameraRig({ earthGroupRef }: CameraRigProps) {
  const { camera, size } = useThree();
  const prefersReducedMotion = usePrefersReducedMotion();

  const keyframes = useMemo<CameraKeyframe[]>(() => {
    const timeline = buildTimeline(journey);
    const waypointSegments = timeline.filter((segment) => segment.waypoint);

    const frames: CameraKeyframe[] = [
      { progress: 0, quaternion: new Quaternion(), pose: normalizePose(EARTH_REVEAL_CAMERA) },
    ];

    waypointSegments.forEach((segment) => {
      const waypoint = segment.waypoint!;
      frames.push({
        progress: segment.end,
        quaternion: quaternionForLatLng(waypoint.lat, waypoint.lng),
        pose: normalizePose(waypoint.camera),
      });
    });

    return frames;
  }, []);

  useFrame(() => {
    const group = earthGroupRef.current;
    if (!group) return;

    const isMobile = size.width < MOBILE_BREAKPOINT;
    const progress = Math.min(1, Math.max(0, progressStore.progress));

    let lower = keyframes[0];
    let upper = keyframes[keyframes.length - 1];
    for (let i = 0; i < keyframes.length - 1; i += 1) {
      if (progress >= keyframes[i].progress && progress <= keyframes[i + 1].progress) {
        lower = keyframes[i];
        upper = keyframes[i + 1];
        break;
      }
    }

    const span = upper.progress - lower.progress;
    const rawT = span > 0 ? (progress - lower.progress) / span : 1;
    const t = prefersReducedMotion ? Math.min(1, Math.max(0, rawT)) : smoothstep(rawT);

    // Geographic orientation — shortest-path spherical interpolation, never a snap.
    const quaternion = new Quaternion().copy(lower.quaternion).slerp(upper.quaternion, t);
    group.quaternion.copy(quaternion);

    // Cinematic framing — plain per-field lerp between the same two keyframes.
    // Mobile backs off the distance slightly (more margin around the planet,
    // so labels near the limb have somewhere to go instead of clipping).
    const distance = lerp(lower.pose.distance, upper.pose.distance, t) * (isMobile ? 1.22 : 1);
    const fov = lerp(lower.pose.fov, upper.pose.fov, t);

    // Mobile gets its own responsive framing rather than the desktop offsets
    // reused blindly (Part R). A narrow PORTRAIT viewport is the constrained
    // axis horizontally but has generous vertical room, so the horizontal
    // (yaw) push is cut down hard — the same yaw that reads as elegant on a
    // wide desktop frame pushes the active waypoint's label past the screen
    // edge on a 390px-wide phone — while vertical (pitch) offset is reduced
    // more mildly, keeping some of the cinematic off-center feel. Extra FOV
    // headroom also helps keep labels inside the safe area.
    const offsetScale = isMobile ? 0.4 : 1;
    const yawScale = isMobile ? 0.12 : 1;
    const pitchScale = isMobile ? 0.5 : 1;
    const mobileFovBoost = isMobile ? 10 : 0;

    const offsetX = lerp(lower.pose.positionOffset.x, upper.pose.positionOffset.x, t) * offsetScale;
    const offsetY = lerp(lower.pose.positionOffset.y, upper.pose.positionOffset.y, t) * offsetScale;

    // Small angular nudges in radians, NOT a world-space point to stare at.
    // camera.lookAt(target) always centers `target` by definition — feeding it
    // a near-origin point (as an earlier version of this file did) therefore
    // always re-centered Earth regardless of the offset, which is exactly the
    // "globe-viewer" composition Part K2 says to avoid. The fix: lookAt the
    // true center first, then rotate the camera slightly off that on its own
    // local axes — Earth stays at world origin, so it visually slides toward
    // the side opposite the rotation, which is what "looking past the limb"
    // actually requires.
    const yaw = lerp(lower.pose.lookAtOffset.x, upper.pose.lookAtOffset.x, t) * yawScale;
    const pitch = lerp(lower.pose.lookAtOffset.y, upper.pose.lookAtOffset.y, t) * pitchScale + (isMobile ? 0.1 : 0);

    const rawPosition = new Vector3(offsetX, offsetY, 1).normalize().multiplyScalar(distance);
    camera.position.copy(rawPosition);
    camera.lookAt(0, 0, 0);
    camera.rotateY(yaw);
    camera.rotateX(pitch);

    if (camera instanceof PerspectiveCamera) {
      camera.fov = fov + mobileFovBoost;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
