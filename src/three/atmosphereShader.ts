// Fresnel rim, normal-blended against a thin shell (BackSide, ~1.4% larger
// than Earth) — §K18 recalibrated this after inspecting the reference GLB
// directly rather than guessing again: alpha now means "how much this pixel
// mixes toward the atmosphere color," not "how much brightness to add," so
// the numbers below are opacities (small near the center of the disc, larger
// toward the grazing limb), not an intensity ceiling.
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
  float grazing = clamp(1.0 - abs(dot(vNormalV, vec3(0.0, 0.0, 1.0))), 0.0, 1.0);
  float rim = pow(grazing, 3.0);

  // Reference GLB's own atmosphere material is a flat, mostly-uniform 0.25
  // alpha (not view-angle-dependent at all — its "brighter at the limb"
  // look comes from the real transmission ray traveling a longer path
  // through the shell there, a physical effect we can't replicate with a
  // flat-shaded sphere). This Fresnel term stands in for that path-length
  // cue instead: barely-there near the center of the disc (0.02), rising to
  // a visible-but-still-translucent rim (0.5) at the true grazing edge —
  // opacities, not brightness, so this can never light up what's behind it.
  float sunFactor = smoothstep(-0.3, 0.5, dot(normalize(vNormalW), normalize(sunDirection)));
  float alpha = mix(0.02, 0.5, rim) * mix(0.18, 1.0, sunFactor);

  // glowColor is now the reference's own measured blue (#245aad, see
  // AtmosphereGlow.tsx) — only lightened slightly toward the limb, not
  // pushed toward white the way an additive "glow" wants to be.
  vec3 color = mix(glowColor, vec3(0.75, 0.85, 0.96), rim * 0.35);

  gl_FragColor = vec4(color, alpha * uOpacity);
}
`;
