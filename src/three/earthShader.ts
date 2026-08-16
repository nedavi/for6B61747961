// A compact custom Earth shader instead of MeshStandardMaterial: a physically
// *plausible* (not physically accurate) day/night terminator driven by a fixed
// world-space sun direction, a restrained specular ocean response masked by
// the specular map, and cheap tangent-space-free normal perturbation for subtle
// surface relief. All in one pass — no post-processing pipeline needed for this.
export const earthVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewPos;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
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
uniform float uTime;

// Regional detail insert (data/regionalTextures.ts) — a second, higher-
// density crop of the SAME source imagery blended in only within a small UV
// window around the currently-approached destination. regionalBlend (0..1)
// is proximity-driven from three/RegionalDetail.tsx; hasRegional guards
// against sampling before a region has ever been assigned.
uniform sampler2D regionalMap;
uniform vec2 regionalUvMin;
uniform vec2 regionalUvMax;
uniform float regionalBlend;
uniform float hasRegional;

// NOTE: cameraPosition is auto-declared AND auto-populated by three.js's
// shader preamble for every material — redeclaring it here is a compile
// error ("redefinition"), a real bug caught only by actually running this in
// a browser, not by reading the GLSL. Just use it directly below.

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewPos;
varying vec3 vWorldPos;

// Cheap per-pixel hash — used for the night-light shimmer's phase offset
// (distant city clusters don't all pulse in lockstep) and as the basis for
// the fine-grain bump noise below.
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Bilinear value noise from the same hash — cheap, no texture, tileable
// anywhere on the UV plane.
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Cheap normal perturbation without precomputed tangents (screen-space
// derivative trick) — enough for subtle terrain relief at this camera range.
// Two frequencies are blended: the coarse normalMap (continent-scale
// relief) and a much higher-frequency procedural bump synthesized from
// valueNoise (surface grain). The coarse map alone only tilts lighting at
// a continental scale — up close that reads as a lit photograph glued to a
// sphere rather than something with real surface texture; the fine layer is
// what breaks that "printed map" flatness without needing a second asset.
vec3 perturbNormal(vec3 N, vec3 V, vec2 uv) {
  vec3 mapN = texture2D(normalMap, uv).xyz * 2.0 - 1.0;

  vec2 fineUv = uv * 900.0;
  float e = 0.6;
  float h0 = valueNoise(fineUv);
  float hX = valueNoise(fineUv + vec2(e, 0.0));
  float hY = valueNoise(fineUv + vec2(0.0, e));
  vec2 fineTilt = vec2(h0 - hX, h0 - hY) * 0.6;
  vec3 combinedN = normalize(vec3(mapN.xy + fineTilt, mapN.z));

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
  return normalize(mix(Nn, TBN * combinedN, normalStrength));
}

void main() {
  vec3 Ngeo = normalize(vNormalW);
  vec3 N = perturbNormal(vNormalW, vViewPos, vUv);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);

  vec3 dayColor = texture2D(dayMap, vUv).rgb;
  vec3 nightColor = texture2D(nightMap, vUv).rgb;
  float specMask = texture2D(specularMap, vUv).r;

  // Regional detail insert — no branching needed: localUv lands outside
  // 0..1 when vUv is outside the crop window, which makes edgeDist negative,
  // which smoothstep clamps to 0 automatically. A soft 12%-of-crop-width
  // falloff at the edges is what keeps the seam from being a hard rectangle.
  vec2 regionalRange = max(regionalUvMax - regionalUvMin, vec2(1e-5));
  vec2 localUv = (vUv - regionalUvMin) / regionalRange;
  vec2 edgeDist = min(localUv, 1.0 - localUv);
  float regionalMask = smoothstep(0.0, 0.12, min(edgeDist.x, edgeDist.y));
  vec3 regionalColor = texture2D(regionalMap, clamp(localUv, 0.0, 1.0)).rgb;
  dayColor = mix(dayColor, regionalColor, regionalMask * regionalBlend * hasRegional);

  float sunDot = dot(N, normalize(sunDirection));
  // A wider terminator band than a hard day/night line — real Earth's
  // twilight zone is broad and soft, not a knife edge, and a harder edge is
  // exactly what reads as "synthetic Three.js demo" lighting.
  float dayMix = smoothstep(-0.28, 0.32, sunDot);

  // Cinematic grade: a gentle S-curve around midtones reads as graded
  // footage, where the old flat *0.9 multiply darkened shadows and
  // highlights equally — exactly what read as "flat/synthetic" rather than
  // a real photograph. A faint cool haze blends in toward the grazing limb
  // (Ngeo, the UNPERTURBED geometric normal — this is a macro atmospheric-
  // perspective cue and must not sparkle with the per-pixel fine-grain bump
  // from perturbNormal above). Real orbital photography always shows a hint
  // of that haze right at the edge of the disk; without it, terrain reads as
  // a texture pasted on a sphere all the way to the limb.
  float limbFresnel = pow(1.0 - max(dot(Ngeo, viewDir), 0.0), 2.4);
  vec3 hazeColor = vec3(0.55, 0.68, 0.82);
  vec3 contrastDay = (dayColor - 0.5) * 1.08 + 0.5;
  vec3 gradedDay = mix(contrastDay * 0.93, hazeColor, limbFresnel * 0.2);

  // Subtle city-light shimmer — NOT a synchronized pulse. Each pixel gets its
  // own slow phase from a spatial hash, so different clusters drift in and
  // out of phase with each other; amplitude is tiny (~5%) so it reads as
  // "real electrical grid flicker at a distance," never as blinking lights.
  float shimmerPhase = hash(floor(vUv * 300.0)) * 6.2831853;
  float shimmer = 1.0 + 0.05 * sin(uTime * 0.12 + shimmerPhase);
  vec3 gradedNight = nightColor * 0.85 * shimmer;
  vec3 color = mix(gradedNight, gradedDay, dayMix);

  // True view-dependent specular (Blinn-Phong half-vector) — a real ocean
  // glint that moves and appears/disappears as the camera orbits, not a
  // fixed brightness pattern tied only to surface-vs-sun angle. Tight and
  // restrained so it reads as an occasional cinematic highlight, not a
  // permanent bright spot.
  vec3 halfVector = normalize(viewDir + normalize(sunDirection));
  float specAngle = pow(max(dot(N, halfVector), 0.0), 90.0);
  color += vec3(0.8, 0.88, 1.0) * specAngle * specMask * dayMix * 0.5;

  // Faint cool fill so the unlit side reads as dark blue-black rather than
  // pure crushed black.
  color += vec3(0.012, 0.016, 0.03) * (1.0 - dayMix);

  // Soft highlight-safety clamp — keeps the very brightest ice/cloud-edge
  // pixels from clipping to a flat white plate at close camera range.
  color = color / (1.0 + max(vec3(0.0), color - 0.92) * 0.6);

  gl_FragColor = vec4(color, uOpacity);
}
`;
