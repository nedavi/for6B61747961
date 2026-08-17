import { Suspense, useEffect, useRef, type RefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { gsap } from 'gsap';
import { NoToneMapping, SRGBColorSpace, type DirectionalLight, type Group, type Mesh, type ShaderMaterial } from 'three';
import { Earth } from './Earth';
import { CloudLayer } from './CloudLayer';
import { AtmosphereGlow } from './AtmosphereGlow';
import { StarField } from './StarField';
import { CameraRig } from './CameraRig';
import { WaypointMarkers } from './WaypointMarkers';
import { RegionalDetail } from './RegionalDetail';
import { SUN_DIRECTION, advanceSunDirection } from './sunDirection';
import { EARTH_REVEAL_CAMERA } from '../data/journey';
import { revealCameraStore, REVEAL_START_DISTANCE } from './revealCameraStore';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

// Rotates SUN_DIRECTION every frame and mirrors it onto the real
// THREE.DirectionalLight's position — a separate component (rather than
// inline in EarthCanvas's body) because useFrame only works inside the
// <Canvas> render tree, and EarthCanvas itself renders <Canvas>, it isn't
// inside one.
function SunController({ lightRef }: { lightRef: RefObject<DirectionalLight | null> }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  useFrame((_, delta) => {
    if (prefersReducedMotion) return;
    advanceSunDirection(delta);
    lightRef.current?.position.set(SUN_DIRECTION.x * 10, SUN_DIRECTION.y * 10, SUN_DIRECTION.z * 10);
  });

  return null;
}

interface EarthCanvasProps {
  /** True once storyPhase reaches 'earth' — starts the Earth/atmosphere opacity
   *  reveal (Part F). Before this, the canvas is already mounted and its star
   *  field visible (from 'space-transition' onward), but Earth itself stays at
   *  opacity 0 — this is what lets the reveal read as "Earth arrives out of an
   *  already-present starfield" rather than a hard pop-in. */
  revealed: boolean;
  onRevealed?: () => void;
}

// Initial position only — SunController takes over every subsequent frame
// via directionalLightRef once mounted (SUN_DIRECTION now rotates).
const sunLightPosition: [number, number, number] = [
  SUN_DIRECTION.x * 10,
  SUN_DIRECTION.y * 10,
  SUN_DIRECTION.z * 10,
];

// §K27: direct report that flicker/darkening happens on a large external
// display but not a MacBook's own screen — `innerWidth × innerHeight` for a
// big monitor can be several times a laptop's logical viewport even before
// devicePixelRatio is applied, and Bloom's cost scales with total rendered
// pixels. Capping the DPR ceiling lower specifically on large viewports keeps
// the actual framebuffer (and therefore Bloom's cost) roughly bounded across
// screen sizes, instead of letting it grow unbounded with both viewport size
// AND pixel ratio at once. Computed once per mount, not tracked reactively —
// this only needs to be right at initial size, not live-updated on resize.
function getDprCap(): number {
  if (typeof window === 'undefined') return 2;
  const viewportArea = window.innerWidth * window.innerHeight;
  return viewportArea > 2_600_000 ? 1.5 : 2;
}

export function EarthCanvas({ revealed, onRevealed }: EarthCanvasProps) {
  const earthGroupRef = useRef<Group>(null);
  const earthMeshRef = useRef<Mesh>(null);
  const earthMaterialRef = useRef<ShaderMaterial>(null);
  const directionalLightRef = useRef<DirectionalLight>(null);
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
      dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, getDprCap())]}
      // §K25: near raised 0.1 → 0.5 — nothing ever renders closer than ~0.9
      // units from the camera (Rhodes' tightest framing, distance 1.9, minus
      // Earth's own radius 1), so 0.1 was wasting most of the depth buffer's
      // precision on a range that's never used. A 1:1000 near/far ratio is a
      // well-known z-fighting risk; 0.5 cuts that to 1:200 with a safe margin
      // below the true minimum, which is the other half of this pass's flicker fix
      // (paired with AtmosphereGlow.tsx's widened radius).
      camera={{ position: [0, 0, EARTH_REVEAL_CAMERA.distance], fov: EARTH_REVEAL_CAMERA.fov ?? 45, near: 0.5, far: 100 }}
      gl={{ antialias: true, alpha: true, toneMapping: NoToneMapping, outputColorSpace: SRGBColorSpace }}
    >
      <ambientLight intensity={0.05} />
      <directionalLight ref={directionalLightRef} position={sunLightPosition} intensity={1.2} />
      <SunController lightRef={directionalLightRef} />
      <StarField />
      <Suspense fallback={null}>
        <group ref={earthGroupRef}>
          <Earth meshRef={earthMeshRef} materialRef={earthMaterialRef} />
          <CloudLayer deck="low" materialRef={cloudLowMaterialRef} />
          <CloudLayer deck="high" materialRef={cloudHighMaterialRef} />
          <WaypointMarkers earthMeshRef={earthMeshRef} />
        </group>
        <RegionalDetail earthMaterialRef={earthMaterialRef} />
        <AtmosphereGlow materialRef={atmosphereMaterialRef} />
        <CameraRig earthGroupRef={earthGroupRef} />
      </Suspense>
      {/* Bloom — the highest-leverage single change for the "glowing,
          cinematic" look asked for (§K11): the sun glint, the atmosphere rim,
          and bright night-light clusters pick up a soft halo instead of
          being hard-edged raw color. §K12 already raised the threshold once;
          §K13 cut further after a real screenshot showed a large blown-out
          white disc instead of a glint — `mipmapBlur` is dropped entirely
          (it's designed for a big, soft UE4-style spread, which is exactly
          the wrong shape here) in favor of the default, more contained
          kernel blur. §K23: intensity raised again (0.18→0.32) alongside
          earthShader.ts's specular becoming both tighter (higher exponent)
          and brighter — a bigger bloom reaction on a *smaller* source point
          should read as "this specific spot glows" rather than the wide
          blown-out patch §K13 was fixing, but threshold is deliberately left
          at 0.92 rather than also lowered, so nothing beyond that already-
          narrow specular core and genuine highlights (ice, cloud edges)
          starts blooming. Does not require HDR/tone-mapping — it operates on
          luminance directly, independent of the NoToneMapping choice above
          (kept for the shader's own color math, see §6). */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.92} luminanceSmoothing={0.15} intensity={0.32} />
      </EffectComposer>
    </Canvas>
  );
}
