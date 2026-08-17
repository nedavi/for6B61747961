import { useMemo, type RefObject } from 'react';
import { BackSide, Color, NormalBlending, ShaderMaterial } from 'three';
import { atmosphereFragmentShader, atmosphereVertexShader } from './atmosphereShader';
import { SUN_DIRECTION } from './sunDirection';

// §K18: replaced every earlier guess (1.05/1.09/1.06 across §K11/K16/K17)
// with a real measurement — the actual reference GLB (earth.glb, downloaded
// from the Sketchfab page and inspected directly) scales its atmosphere
// sphere to only 1.0142x its Earth sphere's radius (98.10 vs 96.72 in its
// own node transforms). Ours had been 6-9% larger this whole time, which on
// its own was enough to read as a bloated shell rather than a thin one,
// regardless of any shader tuning. Kept slightly above the reference's exact
// ratio for depth-buffer safety margin at this project's camera distances,
// not because the reference number was in doubt.
const ATMOSPHERE_RADIUS = 1.03;
const ATMOSPHERE_SEGMENTS = 64;

// §K18: matched to the reference GLB's actual atmosphere material —
// `lambert7`'s baseColorFactor (0.142, 0.352, 0.679) converts almost exactly
// to this hex. Previously an --color-accent-atmosphere DESIGN.md pick
// (#5fc9e8, a brighter/more saturated cyan) dimmed ad hoc in-shader; now a
// real desaturated navy-blue measured from a file instead of eyeballed.
const ATMOSPHERE_COLOR = new Color('#245aad');

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
        // §K18: switched from AdditiveBlending to NormalBlending — the
        // single most important fix this pass. The reference GLB's own
        // atmosphere material uses ordinary alpha BLEND (+ KHR_materials_
        // transmission, which is glass-like light transmission through the
        // shell, not an added glow) — never ADD. Additive blending sums
        // brightness onto whatever is behind it unconditionally; no matter
        // how low the shader's intensity numbers got tuned across §K11/K13/
        // K16/K17, the night side was still being brightened on top of
        // black, which is the real reason "the dark side isn't dark" kept
        // recurring as feedback regardless of which numbers changed. Normal
        // blending actually mixes toward the atmosphere color instead of
        // adding to it, so a low alpha over a black night side stays close
        // to black rather than being lifted every frame.
        blending={NormalBlending}
        side={BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}
