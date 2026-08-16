import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { gsap } from 'gsap';
import { NoToneMapping, SRGBColorSpace, type Group, type Material, type Mesh, type ShaderMaterial } from 'three';
import { Earth } from './Earth';
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
  const earthMaterialRef = useRef<Material>(null);
  const earthMaterialsRef = useRef<Material[]>([]);
  const atmosphereMaterialRef = useRef<ShaderMaterial>(null);
  const hasRevealedRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Auto-reveal — Earth genuinely arrives OUT OF the cosmos rather than
  // fading in after it. Sequenced, not simultaneous:
  //   1. Atmospheric haze (this project's own rim-light shell, layered
  //      outside the model's own atmosphere mesh) blooms in first, in
  //      empty space — a faint blue glow before there's a planet to attach
  //      it to.
  //   2. Every material in the loaded model (Earth surface + clouds +
  //      atmosphere shell, all part of the single earth-model.glb scene —
  //      see three/Earth.tsx) fades in together as one object, matching how
  //      the source file itself was authored. This is simpler than the
  //      previous from-scratch pipeline's staged "silhouette, then surface,
  //      then clouds catch up" choreography, which depended on independently
  //      controllable Earth/cloud materials that no longer exist as
  //      separate objects.
  //   3. In parallel, the camera itself dollies in (revealCameraStore, read
  //      every frame by CameraRig) from roughly 1.9x EARTH_REVEAL_CAMERA's
  //      resting distance down to it — an actual approach, not a static
  //      shot with an opacity fade laid over it.
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
    const modelOpacity = { value: 0 };
    tl.to(
      modelOpacity,
      {
        value: 1,
        duration: duration * 0.75,
        ease: 'power2.inOut',
        onUpdate: () => {
          for (const material of earthMaterialsRef.current) material.opacity = modelOpacity.value;
        },
      },
      prefersReducedMotion ? 0 : 0.35,
    );
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
          <Earth meshRef={earthMeshRef} materialRef={earthMaterialRef} materialsRef={earthMaterialsRef} />
          <WaypointMarkers earthMeshRef={earthMeshRef} />
        </group>
        <AtmosphereGlow materialRef={atmosphereMaterialRef} />
        <CameraRig earthGroupRef={earthGroupRef} />
      </Suspense>
    </Canvas>
  );
}
