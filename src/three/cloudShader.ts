// Clouds as a separate sphere, not baked into the day map — the density comes
// from the red channel of a plain opaque grayscale texture (no alpha channel
// in the file itself; see public/assets/earth/earth-clouds.webp), which
// compresses far better than the same detail with a real alpha channel while
// giving identical results here since the shader reads density directly.
export const cloudVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;

void main() {
  vUv = uv;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const cloudFragmentShader = /* glsl */ `
uniform sampler2D cloudMap;
uniform vec3 sunDirection;
uniform float uOpacity;
// Per-layer alpha ceiling — lets a "low"/dense deck and a "high"/wispy deck
// share the same density texture while reading as two different cloud
// layers rather than one texture duplicated (three/CloudLayer.tsx).
uniform float layerAlphaScale;

varying vec2 vUv;
varying vec3 vNormalW;

void main() {
  // §K23: raised again, 0.14 → 0.32 — direct feedback that coverage still
  // read as too much even after the first thinning pass. This discards the
  // texture's broad mid-gray haze entirely and keeps only its denser, more
  // clearly-defined cloud masses — real satellite data, just a smaller
  // fraction of it rendered, which is what actually controls "how many
  // clouds" rather than the texture's own resolution (bumped separately,
  // see CloudLayer.tsx/journey.md, but resolution and coverage are unrelated
  // levers — one is sharpness, the other is how much of the map counts as
  // "cloud" at all).
  float density = texture2D(cloudMap, vUv).r;
  if (density < 0.32) discard;

  float sunDot = dot(normalize(vNormalW), normalize(sunDirection));
  float lit = smoothstep(-0.3, 0.35, sunDot);

  // Warm-white on the lit side, cool dim on the dark side — clouds should
  // dim into the night the same way the surface below them does, not stay
  // a flat white sticker regardless of terminator.
  vec3 litColor = vec3(1.0, 1.0, 1.0);
  vec3 shadowColor = vec3(0.05, 0.06, 0.09);
  vec3 color = mix(shadowColor, litColor, lit);

  // Lower alpha ceiling — more transparent overall, so Earth's own surface
  // stays legible through the deck rather than the clouds reading as a
  // solid layer.
  float alpha = density * uOpacity * mix(0.12, 0.5, lit) * layerAlphaScale;
  gl_FragColor = vec4(color, alpha);
}
`;
