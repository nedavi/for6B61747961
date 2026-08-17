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
  // §K17: reversed direction from §K16. Direct feedback after that pass was
  // that the glow was washing across most of the visible disc rather than
  // hugging the limb — the real culprit was the falloff exponent, not the
  // intensity numbers alone: at 2.2, "rim" is already well above zero
  // across a large fraction of the sphere's face, not just near the grazing
  // edge, so a bright chunk of the "atmosphere" was really sitting on top of
  // ordinary Earth surface. Narrowed back (2.2→3.0, tighter than even §K13's
  // 3.4→2.2 starting point was aiming to loosen) so the glow reads as a rim,
  // not a haze over the disc.
  float grazing = clamp(1.0 - abs(dot(vNormalV, vec3(0.0, 0.0, 1.0))), 0.0, 1.0);
  float rim = pow(grazing, 3.0);

  // Ceiling cut hard (3.2→1.6) and floor cut even harder (0.28→0.1) — the
  // floor specifically, since it applies regardless of sun angle: at 0.28
  // the rim was glowing almost as brightly on the UNLIT side as the lit one,
  // which fights directly against "dark side should be dark."
  float sunFactor = smoothstep(-0.3, 0.5, dot(normalize(vNormalW), normalize(sunDirection)));
  float intensity = rim * mix(0.1, 1.6, sunFactor);

  // Pulled back toward the base blue (0.35→0.25) — less flat-white wash,
  // more a thin colored rim.
  vec3 color = mix(glowColor, vec3(0.96, 0.98, 1.0), 0.25);

  gl_FragColor = vec4(color, intensity * uOpacity);
}
`;
