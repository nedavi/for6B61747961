// A compact custom Earth shader instead of MeshStandardMaterial: a physically
// *plausible* (not physically accurate) day/night terminator driven by a fixed
// world-space sun direction, a restrained specular ocean response masked by
// the specular map, and cheap tangent-space-free normal perturbation for subtle
// surface relief. All in one pass — no post-processing pipeline needed for this.
export const earthVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewPos;

void main() {
  vUv = uv;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const earthFragmentShader = /* glsl */ `
uniform sampler2D dayMap;
uniform sampler2D nightMap;
uniform sampler2D specularMap;
uniform sampler2D normalMap;
uniform vec3 sunDirection;
uniform float normalStrength;
uniform float uOpacity;

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewPos;

// Cheap normal perturbation without precomputed tangents (screen-space
// derivative trick) — enough for subtle terrain relief at this camera range.
vec3 perturbNormal(vec3 N, vec3 V, vec2 uv) {
  vec3 mapN = texture2D(normalMap, uv).xyz * 2.0 - 1.0;
  vec3 q0 = dFdx(V);
  vec3 q1 = dFdy(V);
  vec2 st0 = dFdx(uv);
  vec2 st1 = dFdy(uv);
  vec3 Nn = normalize(N);
  vec3 q1perp = cross(q1, Nn);
  vec3 q0perp = cross(Nn, q0);
  vec3 T = q1perp * st0.x + q0perp * st1.x;
  vec3 B = q1perp * st0.y + q0perp * st1.y;
  float det = max(dot(T, T), dot(B, B));
  float invmax = det == 0.0 ? 0.0 : inversesqrt(det);
  mat3 TBN = mat3(T * invmax, B * invmax, Nn);
  return normalize(mix(Nn, TBN * mapN, normalStrength));
}

void main() {
  vec3 N = perturbNormal(vNormalW, vViewPos, vUv);

  vec3 dayColor = texture2D(dayMap, vUv).rgb;
  vec3 nightColor = texture2D(nightMap, vUv).rgb;
  float specMask = texture2D(specularMap, vUv).r;

  float sunDot = dot(N, normalize(sunDirection));
  // A wider terminator band than a hard day/night line — real Earth's
  // twilight zone is broad and soft, not a knife edge, and a harder edge is
  // exactly what reads as "synthetic Three.js demo" lighting.
  float dayMix = smoothstep(-0.28, 0.32, sunDot);

  // Cinematic grade: a touch darker/cooler than the raw source photography,
  // and night lights held back from blowing out — this is a mood piece, not
  // a scientific globe viewer.
  vec3 gradedDay = dayColor * 0.9;
  vec3 gradedNight = nightColor * 0.85;
  vec3 color = mix(gradedNight, gradedDay, dayMix);

  // Restrained, tight specular ocean glint — lit side only, narrow highlight,
  // low intensity so bright ice/desert regions never blow out from stacking
  // with an already-bright albedo pixel.
  float specAngle = pow(max(sunDot, 0.0), 44.0);
  color += vec3(0.75, 0.85, 1.0) * specAngle * specMask * 0.16;

  // Faint cool fill so the unlit side reads as dark blue-black rather than
  // pure crushed black.
  color += vec3(0.012, 0.016, 0.03) * (1.0 - dayMix);

  // Soft highlight-safety clamp — keeps the very brightest ice/cloud-edge
  // pixels from clipping to a flat white plate at close camera range.
  color = color / (1.0 + max(vec3(0.0), color - 0.92) * 0.6);

  gl_FragColor = vec4(color, uOpacity);
}
`;
