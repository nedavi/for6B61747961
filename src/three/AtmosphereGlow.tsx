import { useMemo, type RefObject } from 'react';
import { AdditiveBlending, BackSide, Color, ShaderMaterial } from 'three';
import { atmosphereFragmentShader, atmosphereVertexShader } from './atmosphereShader';
import { SUN_DIRECTION } from './sunDirection';

// Much closer to the surface than the original 1.12 — a rim this far out
// reads as a thick glowing halo rather than atmosphere. 1.035 combined with
// the shader's sharper falloff (atmosphereShader.ts) gives a thin edge.
const ATMOSPHERE_RADIUS = 1.035;
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
