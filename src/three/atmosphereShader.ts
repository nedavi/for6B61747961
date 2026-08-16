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
  // A tight power curve on the grazing angle reads as a THIN scattering
  // edge rather than a thick halo — the previous 3.2 exponent at a much
  // larger radius produced a uniform cyan ring; a sharper falloff at a
  // radius much closer to the surface (see AtmosphereGlow.tsx) is what
  // actually looks like atmosphere rather than a glowing outline.
  // Falloff slightly softened (3.8→3.4) and lit-side intensity raised
  // (1.4→1.75) — direct follow-up feedback wanting a more visible/glowing
  // atmosphere; paired with EarthCanvas's new Bloom pass (§K11), which is
  // what actually turns this into a soft halo rather than just a brighter
  // hard edge.
  float grazing = clamp(1.0 - abs(dot(vNormalV, vec3(0.0, 0.0, 1.0))), 0.0, 1.0);
  float rim = pow(grazing, 3.4);

  float sunFactor = smoothstep(-0.3, 0.5, dot(normalize(vNormalW), normalize(sunDirection)));
  float intensity = rim * mix(0.18, 1.75, sunFactor);

  // A vivid, saturated azure rim rather than the desaturated-toward-white
  // scientific version — the requested look is closer to stylized "Earth
  // from space" art than a literal scattering simulation.
  vec3 color = mix(glowColor, vec3(0.96, 0.98, 1.0), 0.2);

  gl_FragColor = vec4(color, intensity * uOpacity * 0.85);
}
`;
