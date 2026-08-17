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
vec3 perturbNormal(vec3 N, vec3 V, vec2 uv, float specMask) {
  vec3 mapN = texture2D(normalMap, uv).xyz * 2.0 - 1.0;

  vec2 fineUv = uv * 900.0;
  float e = 0.6;
  float h0 = valueNoise(fineUv);
  float hX = valueNoise(fineUv + vec2(e, 0.0));
  float hY = valueNoise(fineUv + vec2(0.0, e));
  // §K23: the fine bump is now masked by specMask — heavily suppressed over
  // water (specMask ≈ 1) so its normal stays close to flat there, sharpening
  // the specular reflection into a proper "mirror" glint rather than one
  // scattered by per-pixel grain; land (specMask ≈ 0) keeps the same 0.15
  // strength as §K12 set it to. Direct request: water should read as a
  // smooth, glossy surface, not textured like land.
  vec2 fineTilt = vec2(h0 - hX, h0 - hY) * 0.15 * (1.0 - specMask * 0.85);
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
  // specMask sampled before perturbNormal now (§K23) — it needs it to mask
  // the fine bump over water; see perturbNormal's own comment above.
  float specMask = texture2D(specularMap, vUv).r;
  vec3 N = perturbNormal(vNormalW, vViewPos, vUv, specMask);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);

  vec3 dayColor = texture2D(dayMap, vUv).rgb;
  vec3 nightColor = texture2D(nightMap, vUv).rgb;

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

  // Exposure-style brightening (1 - exp(-x * k)) instead of a midpoint
  // contrast curve — a contrast curve ((x-0.5)*k+0.5) actively pushes
  // near-zero source values NEGATIVE for k>1, which is exactly what the raw
  // NASA ocean pixels are (close to (0,0,0.05)): every later "brighten the
  // shadows" step was fighting a starting point already below zero. This
  // curve can't go negative and naturally rolls off toward 1 instead of
  // clipping to a flat plate, so it lifts dark water without blowing out
  // bright land.
  // Cut again, 7.0 → 4.5 (§K17) — direct feedback was that the whole lit
  // side reads as washed-out/overexposed rather than a natural-brightness
  // day side. 7.0 (already brought down once from 10.0 in §K12) was still
  // pushing nearly every mid-brightness land/water pixel close to 1.0; 4.5
  // keeps the same "can't go negative, rolls off instead of clipping"
  // exposure-curve shape but leaves real midtone variation intact instead of
  // flattening most of the lit hemisphere toward white.
  vec3 exposedDay = vec3(1.0) - exp(-dayColor * 4.5);

  // Push blue-dominant pixels (open ocean) toward a slightly more vivid
  // azure — additive push cut hard (2.6→0.7 / 1.3→0.25, §K12), since at the
  // old strength it turned the new source's real bathymetry gradient
  // (naturally lighter over shelves, darker over open ocean) into patchy
  // cyan blotches rather than a smooth gradient — direct feedback ("лазурные
  // участки непонятные"). Still additive/masked, not a flat mix, so water
  // keeps its own variation.
  float blueDominance = max(dayColor.b - dayColor.r, 0.0);
  exposedDay.b += blueDominance * 0.7;
  exposedDay.g += blueDominance * 0.25;

  // Saturation lift cut from 1.65 → 1.2 (§K12) — 1.65 was double-counting
  // with the blueDominance push above specifically on water pixels,
  // compounding the same blotchy-cyan problem from a second direction.
  float dayLuma = dot(exposedDay, vec3(0.299, 0.587, 0.114));
  vec3 gradedDay = mix(vec3(dayLuma), exposedDay, 1.2);

  // A faint cool haze toward the grazing limb (Ngeo, the UNPERTURBED
  // geometric normal — a macro atmospheric-perspective cue, must not
  // sparkle with the per-pixel fine-grain bump from perturbNormal above).
  float limbFresnel = pow(1.0 - max(dot(Ngeo, viewDir), 0.0), 2.4);
  vec3 hazeColor = vec3(0.55, 0.68, 0.82);
  gradedDay = mix(gradedDay, hazeColor, limbFresnel * 0.2);

  // Subtle city-light shimmer — NOT a synchronized pulse. Each pixel gets its
  // own slow phase from a spatial hash, so different clusters drift in and
  // out of phase with each other; amplitude is tiny (~5%) so it reads as
  // "real electrical grid flicker at a distance," never as blinking lights.
  float shimmerPhase = hash(floor(vUv * 300.0)) * 6.2831853;
  float shimmer = 1.0 + 0.05 * sin(uTime * 0.12 + shimmerPhase);
  // Raised from 0.85 to 1.35 in §K11, pulled back slightly to 1.15 in §K12
  // alongside the general overexposure correction — still bright enough to
  // read as glowing city lights once Bloom's threshold is raised to only
  // catch genuine highlights (EarthCanvas.tsx), without needing as much raw
  // brightness to get there.
  vec3 gradedNight = nightColor * 1.15 * shimmer;
  vec3 color = mix(gradedNight, gradedDay, dayMix);

  // True view-dependent specular (Blinn-Phong half-vector) — a real ocean
  // glint that moves and appears/disappears as the camera orbits, not a
  // fixed brightness pattern tied only to surface-vs-sun angle. Two lobes:
  // a bright core and a softer mid sheen, warmed off pure white toward gold
  // for a "sun glint" rather than a clinical specular highlight.
  // §K12 dropped a third, very-wide "halo" lobe (a pre-Bloom hand-rolled
  // glow that became redundant/additive once real Bloom existed). §K13:
  // that wasn't enough — a real screenshot still showed a large blown-out
  // white disc, not a glint, so both remaining lobes are tightened hard:
  // narrower exponents (110→170, 18→30) and roughly halved intensity.
  // §K23 pushed this narrower AND brighter (170→210 exponent, 0.5→0.68
  // intensity) for a "mirror-like" glint with a real Bloom reaction. §K31:
  // reversed — direct report of "sparkling/flickering only while scrolling,
  // fine when static" is the signature of a well-known real-time-graphics
  // artifact ("fireflies"): a highlight this narrow can occupy only a
  // handful of pixels, so as the camera moves every frame during scroll, it
  // can fall between pixel centers and inconsistently trigger Bloom's
  // luminance threshold frame to frame — appearing to pop/sparkle — while
  // sitting under it, or over it, consistently (no flicker) when the camera
  // is still. A tighter, brighter highlight is *more* prone to this, not
  // less, so §K23's specific direction was very likely the actual cause of
  // this report. Widened back past even §K13's 170 (210→130) and intensity
  // cut (0.68→0.45) — genuinely trades away some of the "mirror" sharpness,
  // but a highlight with more spatial extent is much less likely to
  // disappear between adjacent pixels as the camera sweeps across it.
  vec3 halfVector = normalize(viewDir + normalize(sunDirection));
  float ndh = max(dot(N, halfVector), 0.0);
  float specCore = pow(ndh, 130.0);
  float specSheen = pow(ndh, 30.0);
  color += vec3(1.0, 0.93, 0.78) * specCore * specMask * dayMix * 0.45;
  color += vec3(1.0, 0.9, 0.72) * specSheen * specMask * dayMix * 0.09;

  // Faint cool fill so the unlit side reads as dark blue-black rather than
  // pure crushed black.
  color += vec3(0.012, 0.016, 0.03) * (1.0 - dayMix);

  // Soft highlight-safety clamp — keeps the very brightest ice/cloud-edge
  // pixels from clipping to a flat white plate at close camera range.
  // Tightened (1.05→0.92 threshold, 0.45→0.6 strength, §K12) alongside the
  // brightness/specular reductions above — direct feedback was harsh,
  // "grainy" overexposure, and the old clamp was tuned for numbers that no
  // longer apply.
  color = color / (1.0 + max(vec3(0.0), color - 0.92) * 0.6);

  gl_FragColor = vec4(color, uOpacity);
}
`;
