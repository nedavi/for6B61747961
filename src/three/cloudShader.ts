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

varying vec2 vUv;
varying vec3 vNormalW;

void main() {
  float density = texture2D(cloudMap, vUv).r;
  if (density < 0.02) discard;

  float sunDot = dot(normalize(vNormalW), normalize(sunDirection));
  float lit = smoothstep(-0.3, 0.35, sunDot);

  // Warm-white on the lit side, cool dim on the dark side — clouds should
  // dim into the night the same way the surface below them does, not stay
  // a flat white sticker regardless of terminator.
  vec3 litColor = vec3(1.0, 0.99, 0.97);
  vec3 shadowColor = vec3(0.05, 0.06, 0.09);
  vec3 color = mix(shadowColor, litColor, lit);

  float alpha = density * uOpacity * mix(0.22, 0.62, lit);
  gl_FragColor = vec4(color, alpha);
}
`;
