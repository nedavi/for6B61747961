import { useMemo, type RefObject } from 'react';
import { AdditiveBlending, BackSide, Color, ShaderMaterial } from 'three';
import { atmosphereFragmentShader, atmosphereVertexShader } from './atmosphereShader';
import { SUN_DIRECTION } from './sunDirection';

// Pushed again, 1.05 → 1.09 (§K16) — still short of the original 1.12 that
// read as a flat cyan ring, but this time paired with a much stronger
// intensity/falloff push in atmosphereShader.ts rather than another timid
// nudge, after two rounds of "still not bright enough" against a specific
// reference target.
const ATMOSPHERE_RADIUS = 1.09;
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
