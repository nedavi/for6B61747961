// Restrained Fresnel rim glow — the classic "atmosphere sphere" technique
// (BackSide, additive blending, slightly larger radius than Earth): glow
// strength grows toward the grazing-angle limb, and is further weighted by
// the same sun direction Earth's shader uses so the glow reads brightest on
// the lit side rather than uniformly all the way around.
export const atmosphereVertexShader = /* glsl */ `
varying vec3 vNormalV;
varying vec3 vNormalW;

void main() {
  vNormalV = normalize(normalMatrix * normal);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const atmosphereFragmentShader = /* glsl */ `
uniform vec3 glowColor;
uniform vec3 sunDirection;
uniform float uOpacity;

varying vec3 vNormalV;
varying vec3 vNormalW;

void main() {
  // §K16: pushed hard, not incrementally, after two previous rounds of
  // "still not bright/visible enough" (§K11, §K13) against a specific
  // reference target. Falloff widened further (3.4→2.2 — a genuinely broad
  // glow band, not a thin edge), lit-side ceiling nearly doubled (1.75→3.2),
  // and the dark-side floor raised too (0.18→0.28) so the rim reads as
  // present most of the way around, not only on the sunlit limb.
  float grazing = clamp(1.0 - abs(dot(vNormalV, vec3(0.0, 0.0, 1.0))), 0.0, 1.0);
  float rim = pow(grazing, 2.2);

  float sunFactor = smoothstep(-0.3, 0.5, dot(normalize(vNormalW), normalize(sunDirection)));
  float intensity = rim * mix(0.28, 3.2, sunFactor);

  // Mixed further toward bright white (0.2→0.35) — a glowing, slightly
  // hazy white-cyan rim rather than a saturated flat blue line, closer to
  // the reference's stylized "Earth from space" look than a literal
  // scattering simulation.
  vec3 color = mix(glowColor, vec3(0.96, 0.98, 1.0), 0.35);

  gl_FragColor = vec4(color, intensity * uOpacity);
}
`;
