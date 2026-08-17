import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Mesh, ShaderMaterial } from 'three';
import { cloudFragmentShader, cloudVertexShader } from './cloudShader';
import { SUN_DIRECTION } from './sunDirection';
import { isMobileViewport } from './responsive';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface CloudDeckConfig {
  radius: number;
  segments: number;
  /** Radians/second — imperceptible in any single glance, but the planet is
   *  never perfectly frozen even when scroll is idle (Part 18 "Earth idle
   *  life"). Layered as the mesh's OWN local rotation on top of the parent
   *  Earth group's geographic-targeting quaternion, so it never fights
   *  CameraRig's rotation — see EarthCanvas.tsx for the group nesting. */
  driftRadiansPerSecond: number;
  /** Starting offset so the two decks don't look like one texture duplicated
   *  at the very first frame, before their independent drift has had time to
   *  diverge them. */
  initialRotation: number;
  layerAlphaScale: number;
  renderOrder: number;
}

// Two decks sharing one density texture (public/assets/earth/earth-clouds.webp)
// but different radius/speed/opacity/starting-offset — reads as a low, denser
// deck and a high, wispier deck rather than a single flat texture sliding over
// the planet (Part 3). Real multi-layer cloud photography would be nicer still,
// but two decks of the one legitimate NASA-derived density map is a reasonable
// depth cue without inventing cloud geography that doesn't exist.
// Drift speeds raised ~6x in §K9, then roughly doubled again here (still more
// dynamics requested) — direct feedback that clouds read as too
// large/opaque/static, twice over. The two decks still drift at different
// (and opposite) rates so they visibly diverge rather than moving as one slab.
// §K23: segments raised again (72→96, 56→80) — direct request for "more
// polygons." The cloud texture's own detail (re-sourced at true 8K this
// pass, see cloudShader.ts/journey.md) is what mainly reads as quality up
// close, since geometry only affects the sphere's own silhouette smoothness,
// but a cheap change worth making regardless while touching this file.
export const CLOUD_DECKS: Record<'low' | 'high', CloudDeckConfig> = {
  low: { radius: 1.006, segments: 96, driftRadiansPerSecond: 0.02, initialRotation: 0, layerAlphaScale: 0.62, renderOrder: 1 },
  high: {
    radius: 1.014,
    segments: 80,
    driftRadiansPerSecond: -0.012,
    initialRotation: 1.7,
    layerAlphaScale: 0.4,
    renderOrder: 2,
  },
};

interface CloudLayerProps {
  materialRef: RefObject<ShaderMaterial | null>;
  deck: 'low' | 'high';
}

export function CloudLayer({ materialRef, deck }: CloudLayerProps) {
  const config = CLOUD_DECKS[deck];
  const meshRef = useRef<Mesh>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMobile = useMemo(() => isMobileViewport(), []);

  const cloudMap = useTexture(isMobile ? '/assets/earth/earth-clouds-mobile.webp' : '/assets/earth/earth-clouds.webp');

  const uniforms = useMemo(
    () => ({
      cloudMap: { value: cloudMap },
      sunDirection: { value: SUN_DIRECTION },
      uOpacity: { value: 0 },
      layerAlphaScale: { value: config.layerAlphaScale },
    }),
    [cloudMap, config.layerAlphaScale],
  );

  useFrame((_, delta) => {
    if (prefersReducedMotion || !meshRef.current) return;
    meshRef.current.rotation.y += config.driftRadiansPerSecond * delta;
  });

  return (
    <mesh ref={meshRef} scale={config.radius} rotation-y={config.initialRotation} renderOrder={config.renderOrder}>
      <sphereGeometry args={[1, config.segments, config.segments]} />
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
