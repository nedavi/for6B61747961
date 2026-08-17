import { useMemo, type RefObject } from 'react';
import { AdditiveBlending, BackSide, Color, ShaderMaterial } from 'three';
import { atmosphereFragmentShader, atmosphereVertexShader } from './atmosphereShader';
import { SUN_DIRECTION } from './sunDirection';

// Pulled back in, 1.09 → 1.06 (§K17) — §K16's push made the glow read as
// lighting up the whole disc rather than a thin limb; paired with the
// tighter falloff exponent in atmosphereShader.ts, a smaller radius keeps
// the glow shell close against the surface instead of a wide halo.
const ATMOSPHERE_RADIUS = 1.06;
const ATMOSPHERE_SEGMENTS = 64;

// --color-accent-atmosphere from DESIGN.md, dimmed/desaturated slightly in-shader
// so it reads as a physically plausible rim rather than neon cyan (Part L).
const ATMOSPHERE_COLOR = new Color('#5fc9e8');

interface AtmosphereGlowProps {
  materialRef: RefObject<ShaderMaterial | null>;
}

export function AtmosphereGlow({ materialRef }: AtmosphereGlowProps) {
  const uniforms = useMemo(
    () => ({
      glowColor: { value: ATMOSPHERE_COLOR },
      sunDirection: { value: SUN_DIRECTION },
      uOpacity: { value: 0 },
    }),
    [],
  );

  return (
    <mesh scale={ATMOSPHERE_RADIUS} renderOrder={3}>
      <sphereGeometry args={[1, ATMOSPHERE_SEGMENTS, ATMOSPHERE_SEGMENTS]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={atmosphereVertexShader}
        fragmentShader={atmosphereFragmentShader}
        uniforms={uniforms}
        transparent
        blending={AdditiveBlending}
        side={BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}
