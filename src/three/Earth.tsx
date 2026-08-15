import { useMemo, type RefObject } from 'react';
import { useTexture } from '@react-three/drei';
import { ShaderMaterial, SRGBColorSpace } from 'three';
import type { Mesh } from 'three';
import { earthFragmentShader, earthVertexShader } from './earthShader';
import { SUN_DIRECTION } from './sunDirection';
import { isMobileViewport } from './responsive';

const EARTH_SEGMENTS = 96; // ARCHITECTURE.md §S — 64-128 range, no adaptive LOD needed here

interface EarthProps {
  meshRef: RefObject<Mesh | null>;
  materialRef: RefObject<ShaderMaterial | null>;
}

// The real textured sphere (ARCHITECTURE.md §6/§E) — day/night terminator,
// restrained ocean specular, and cheap normal-mapped relief all computed in
// one custom shader (three/earthShader.ts) rather than a stack of standard-
// material passes. Rendered as a plain mesh (no owned group) — EarthCanvas
// mounts it inside the shared rotating group alongside WaypointMarkers/
// RouteLine, the same group CameraRig rotates to bring a waypoint's lat/lng
// to face the camera (three/latLng.ts).
export function Earth({ meshRef, materialRef }: EarthProps) {
  // Desktop gets the full 4096x2048 day map / 2048x1024 night map; mobile a
  // smaller tier of the same source images — not the same 2K asset stretched
  // across a close 60-75%-of-frame composition on both. Normal/specular maps
  // are already small enough (1536x768) to share across tiers.
  const isMobile = useMemo(() => isMobileViewport(), []);
  const [dayMap, nightMap, normalMap, specularMap] = useTexture([
    isMobile ? '/assets/earth/earth-day-mobile.webp' : '/assets/earth/earth-day.webp',
    isMobile ? '/assets/earth/earth-night-mobile.webp' : '/assets/earth/earth-night.webp',
    '/assets/earth/earth-normal.webp',
    '/assets/earth/earth-specular.webp',
  ]);

  dayMap.colorSpace = SRGBColorSpace;
  nightMap.colorSpace = SRGBColorSpace;

  const uniforms = useMemo(
    () => ({
      dayMap: { value: dayMap },
      nightMap: { value: nightMap },
      normalMap: { value: normalMap },
      specularMap: { value: specularMap },
      sunDirection: { value: SUN_DIRECTION },
      normalStrength: { value: 0.35 },
      uOpacity: { value: 0 },
    }),
    [dayMap, nightMap, normalMap, specularMap],
  );

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, EARTH_SEGMENTS, EARTH_SEGMENTS]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={earthVertexShader}
        fragmentShader={earthFragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  );
}
