import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { gsap } from 'gsap';
import { NoToneMapping, SRGBColorSpace, type Group, type Mesh, type ShaderMaterial } from 'three';
import { Earth } from './Earth';
import { CloudLayer } from './CloudLayer';
import { AtmosphereGlow } from './AtmosphereGlow';
import { StarField } from './StarField';
import { CameraRig } from './CameraRig';
import { WaypointMarkers } from './WaypointMarkers';
import { RouteLine } from './RouteLine';
import { SUN_DIRECTION } from './sunDirection';
import { EARTH_REVEAL_CAMERA } from '../data/journey';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface EarthCanvasProps {
  /** True once storyPhase reaches 'earth' — starts the Earth/atmosphere opacity
   *  reveal (Part F). Before this, the canvas is already mounted and its star
   *  field visible (from 'space-transition' onward), but Earth itself stays at
   *  opacity 0 — this is what lets the reveal read as "Earth arrives out of an
   *  already-present starfield" rather than a hard pop-in. */
  revealed: boolean;
  onRevealed?: () => void;
}

const sunLightPosition: [number, number, number] = [
  SUN_DIRECTION.x * 10,
  SUN_DIRECTION.y * 10,
  SUN_DIRECTION.z * 10,
];

export function EarthCanvas({ revealed, onRevealed }: EarthCanvasProps) {
  const earthGroupRef = useRef<Group>(null);
  const earthMeshRef = useRef<Mesh>(null);
  const earthMaterialRef = useRef<ShaderMaterial>(null);
  const cloudMaterialRef = useRef<ShaderMaterial>(null);
  const atmosphereMaterialRef = useRef<ShaderMaterial>(null);
  const hasRevealedRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Auto-reveal: Earth + clouds + atmosphere fade in from opacity 0 once the
  // 'earth' phase is reached, independent of scroll (Part F — "no dramatic
  // zoom", just an opacity fade while the camera sits at EARTH_REVEAL_CAMERA's
  // distant pose).
  useEffect(() => {
    if (!revealed || hasRevealedRef.current) return;
    hasRevealedRef.current = true;

    const duration = prefersReducedMotion ? 0.6 : 2.6;
    const tl = gsap.timeline({ onComplete: () => onRevealed?.() });
    if (earthMaterialRef.current) {
      tl.to(earthMaterialRef.current.uniforms.uOpacity, { value: 1, duration, ease: 'power2.out' }, 0);
    }
    if (cloudMaterialRef.current) {
      tl.to(cloudMaterialRef.current.uniforms.uOpacity, { value: 1, duration: duration * 1.1, ease: 'power2.out' }, 0.1);
    }
    if (atmosphereMaterialRef.current) {
      tl.to(
        atmosphereMaterialRef.current.uniforms.uOpacity,
        { value: 1, duration: duration * 1.2, ease: 'power2.out' },
        0.2,
      );
    }
  }, [revealed, prefersReducedMotion, onRevealed]);

  return (
    <Canvas
      dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)]}
      camera={{ position: [0, 0, EARTH_REVEAL_CAMERA.distance], fov: EARTH_REVEAL_CAMERA.fov ?? 45, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, toneMapping: NoToneMapping, outputColorSpace: SRGBColorSpace }}
    >
      <ambientLight intensity={0.05} />
      <directionalLight position={sunLightPosition} intensity={1.2} />
      <StarField />
      <Suspense fallback={null}>
        <group ref={earthGroupRef}>
          <Earth meshRef={earthMeshRef} materialRef={earthMaterialRef} />
          <CloudLayer materialRef={cloudMaterialRef} />
          <WaypointMarkers earthMeshRef={earthMeshRef} />
          <RouteLine />
        </group>
        <AtmosphereGlow materialRef={atmosphereMaterialRef} />
        <CameraRig earthGroupRef={earthGroupRef} />
      </Suspense>
    </Canvas>
  );
}
