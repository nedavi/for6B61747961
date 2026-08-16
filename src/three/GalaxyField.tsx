import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { gsap } from 'gsap';
import { AdditiveBlending, type Points, type PointsMaterial } from 'three';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const GALAXY_URL = '/assets/space/galaxy.glb';

// A distant, authored star-cluster point cloud (50,000 points, real per-vertex
// color variation — mostly cool blue-white "hot star" tones with occasional
// warm outliers) sitting far behind the Earth scene. Purely atmospheric: it
// never moves toward the camera, is never interactive, and exists only to
// give the space-transition beat a genuine sense of depth beyond the flat
// StarField shell. Deliberately placed off-axis (not directly behind Earth)
// so it reads as "something out there" rather than competing with the planet
// for visual weight, and scaled/positioned by eye against real screenshots —
// there is no physically "correct" size for a prop like this.
// Must stay within the Canvas camera's far plane (EarthCanvas.tsx sets
// far: 100) — an earlier version placed this at z=-150 and it silently
// rendered nothing at all (no error, just invisible), since it was being
// clipped by the far plane the whole time. Caught only by forcing the
// material to opacity 1 and confirming it still didn't appear anywhere.
const GALAXY_POSITION: [number, number, number] = [40, 20, -80];
const GALAXY_ROTATION: [number, number, number] = [0.3, 0.6, -0.15];
const GALAXY_SCALE = 8;

interface GalaxyFieldProps {
  /** Same flag EarthCanvas receives — true once storyPhase reaches 'earth'.
   *  The galaxy belongs to the space-transition beat; once the journey
   *  itself starts, it fades out so it never competes with Earth for focus. */
  revealed: boolean;
}

export function GalaxyField({ revealed }: GalaxyFieldProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { scene } = useGLTF(GALAXY_URL);

  const points = useMemo<Points | null>(() => {
    let found: Points | null = null;
    scene.traverse((obj) => {
      if ((obj as Points).isPoints) found = obj as Points;
    });
    return found;
  }, [scene]);

  useEffect(() => {
    if (!points) return;
    const material = points.material as PointsMaterial;
    material.size = 0.28;
    material.sizeAttenuation = true;
    material.transparent = true;
    material.opacity = 0;
    material.blending = AdditiveBlending;
    material.depthWrite = false;
  }, [points]);

  useEffect(() => {
    if (!points) return;
    const material = points.material as PointsMaterial;
    const targetOpacity = revealed ? 0 : 0.22;
    gsap.to(material, {
      opacity: targetOpacity,
      duration: prefersReducedMotion ? 0.4 : revealed ? 2.4 : 3.6,
      delay: prefersReducedMotion ? 0 : revealed ? 0 : 1.6,
      ease: 'power2.out',
    });
  }, [points, revealed, prefersReducedMotion]);

  return (
    <group position={GALAXY_POSITION} rotation={GALAXY_ROTATION} scale={GALAXY_SCALE}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(GALAXY_URL);
