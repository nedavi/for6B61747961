import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Mesh, ShaderMaterial } from 'three';
import { cloudFragmentShader, cloudVertexShader } from './cloudShader';
import { SUN_DIRECTION } from './sunDirection';
import { isMobileViewport } from './responsive';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const CLOUD_RADIUS = 1.008;
const CLOUD_SEGMENTS = 72;
// Radians/second — imperceptible in any single glance, but the planet is
// never perfectly frozen even when scroll is idle (Part 18 "Earth idle
// life"). This is layered as the mesh's OWN local rotation on top of the
// parent Earth group's geographic-targeting quaternion, so it never fights
// CameraRig's rotation — see EarthCanvas.tsx for the group nesting.
const DRIFT_RADIANS_PER_SECOND = 0.0022;

interface CloudLayerProps {
  materialRef: RefObject<ShaderMaterial | null>;
}

export function CloudLayer({ materialRef }: CloudLayerProps) {
  const meshRef = useRef<Mesh>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMobile = useMemo(() => isMobileViewport(), []);

  const cloudMap = useTexture(isMobile ? '/assets/earth/earth-clouds-mobile.webp' : '/assets/earth/earth-clouds.webp');

  const uniforms = useMemo(
    () => ({
      cloudMap: { value: cloudMap },
      sunDirection: { value: SUN_DIRECTION },
      uOpacity: { value: 0 },
    }),
    [cloudMap],
  );

  useFrame((_, delta) => {
    if (prefersReducedMotion || !meshRef.current) return;
    meshRef.current.rotation.y += DRIFT_RADIANS_PER_SECOND * delta;
  });

  return (
    <mesh ref={meshRef} scale={CLOUD_RADIUS}>
      <sphereGeometry args={[1, CLOUD_SEGMENTS, CLOUD_SEGMENTS]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={cloudVertexShader}
        fragmentShader={cloudFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
