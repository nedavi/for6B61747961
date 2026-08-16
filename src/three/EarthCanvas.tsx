import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { gsap } from 'gsap';
import { NoToneMapping, SRGBColorSpace, type Group, type Mesh, type ShaderMaterial } from 'three';
import { Earth } from './Earth';
import { CloudLayer } from './CloudLayer';
import { AtmosphereGlow } from './AtmosphereGlow';
import { StarField } from './StarField';
import { GalaxyField } from './GalaxyField';
import { CameraRig } from './CameraRig';
import { WaypointMarkers } from './WaypointMarkers';
import { SUN_DIRECTION } from './sunDirection';
import { EARTH_REVEAL_CAMERA } from '../data/journey';
import { revealCameraStore, REVEAL_START_DISTANCE } from './revealCameraStore';
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
  const cloudLowMaterialRef = useRef<ShaderMaterial>(null);
  const cloudHighMaterialRef = useRef<ShaderMaterial>(null);
  const atmosphereMaterialRef = useRef<ShaderMaterial>(null);
  const hasRevealedRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Auto-reveal — Earth genuinely arrives OUT OF the cosmos rather than
  // fading in after it (a explicit visual-direction correction: the previous
  // version held distance fixed and only animated opacity, so nothing ever
  // read as "flying toward Earth"). Sequenced, not simultaneous:
  //   1. Atmospheric haze (the future rim-light sphere) blooms in first, in
  //      empty space — a faint blue glow before there's a planet to attach it to.
  //   2. Earth's own opacity resolves in TWO stages: a quick, dim silhouette
  //      (roughly a third of the way to full brightness) that holds briefly
  //      while the camera is still closing in, then continues brightening
  //      into full surface detail — "silhouette first, then the surface
  //      resolves," not one flat fade.
  //   3. Clouds catch up shortly after the surface is already legible.
  //   4. In parallel with all of the above, the camera itself dollies in
  //      (revealCameraStore, read every frame by CameraRig) from roughly 1.9x
  //      EARTH_REVEAL_CAMERA's resting distance down to it — an actual
  //      approach, not a static shot with an opacity fade laid over it.
  useEffect(() => {
    if (!revealed || hasRevealedRef.current) return;
    hasRevealedRef.current = true;
    revealCameraStore.distance = REVEAL_START_DISTANCE;

    const duration = prefersReducedMotion ? 0.6 : 3.2;
    const tl = gsap.timeline({ onComplete: () => onRevealed?.() });

    if (atmosphereMaterialRef.current) {
      tl.to(atmosphereMaterialRef.current.uniforms.uOpacity, { value: 1, duration: duration * 0.9, ease: 'power1.out' }, 0);
    }
    tl.to(
      revealCameraStore,
      { distance: EARTH_REVEAL_CAMERA.distance, duration: duration * 1.15, ease: 'power2.inOut' },
      prefersReducedMotion ? 0 : 0.15,
    );
    if (earthMaterialRef.current) {
      const earthOpacity = earthMaterialRef.current.uniforms.uOpacity;
      tl.to(earthOpacity, { value: 0.32, duration: duration * 0.35, ease: 'power1.out' }, prefersReducedMotion ? 0 : 0.35);
      tl.to(earthOpacity, { value: 1, duration: duration * 0.55, ease: 'power2.inOut' }, '+=0.1');
    }
    if (cloudLowMaterialRef.current) {
      tl.to(cloudLowMaterialRef.current.uniforms.uOpacity, { value: 1, duration: duration * 0.5, ease: 'power2.out' }, '-=0.3');
    }
    if (cloudHighMaterialRef.current) {
      tl.to(cloudHighMaterialRef.current.uniforms.uOpacity, { value: 1, duration: duration * 0.55, ease: 'power2.out' }, '-=0.35');
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
        <GalaxyField revealed={revealed} />
      </Suspense>
      <Suspense fallback={null}>
        <group ref={earthGroupRef}>
          <Earth meshRef={earthMeshRef} materialRef={earthMaterialRef} />
          <CloudLayer deck="low" materialRef={cloudLowMaterialRef} />
          <CloudLayer deck="high" materialRef={cloudHighMaterialRef} />
          <WaypointMarkers earthMeshRef={earthMeshRef} />
        </group>
        <AtmosphereGlow materialRef={atmosphereMaterialRef} />
        <CameraRig earthGroupRef={earthGroupRef} />
      </Suspense>
    </Canvas>
  );
}
