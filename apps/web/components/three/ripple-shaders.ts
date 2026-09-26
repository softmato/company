/**
 * Shaders for `RippleAsset` — React Bits' RippleDistortion, with the composite
 * pass rewritten for a transparent illustration on a light card:
 *
 * - **Alpha is kept.** The original draws on black and outputs opaque pixels;
 *   this samples a premultiplied texture and writes its alpha through, so the
 *   card shows round the object and the ripple bends the object's own edge.
 * - **No cover fit.** The canvas is always sized to the image's own aspect
 *   ratio, so UVs map straight across; anything pushed outside the image
 *   samples as empty rather than smearing the edge pixel (clamp would).
 * - **No grayscale.** The assets are in the brand colours and stay that way.
 * - Glint is weighted by alpha, so the sheen never lights up empty card.
 */

export const WAVE_VERTEX = /* glsl */ `
precision highp float;
attribute vec2 position;
attribute vec2 uv;
attribute vec2 iOffset;
attribute vec2 iScale;
attribute float iOpacity;
varying vec2 vUv;
varying float vOpacity;
void main() {
  vUv = uv;
  vOpacity = iOpacity;
  gl_Position = vec4(iOffset + position * iScale, 0.0, 1.0);
}
`;

export const WAVE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying float vOpacity;
uniform float uRings;
const float PI = 3.141592653589793;
const float EDGE = 0.006737947;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = dot(p, p);
  if (r > 1.0) discard;
  float brush = (exp(-r * 5.0) - EDGE) / (1.0 - EDGE);
  brush *= 0.55 + 0.45 * cos(sqrt(r) * PI * 2.0 * uRings);
  gl_FragColor = vec4(vec3(brush * vOpacity * vOpacity), 1.0);
}
`;

export const SCREEN_VERTEX = /* glsl */ `
precision highp float;
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const COMPOSITE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform sampler2D uDisplacement;
uniform vec2 uTexel;
uniform vec3 uTint;
uniform vec3 uHighlight;
uniform float uStrength;
uniform float uSwirl;
uniform float uDispersion;
uniform float uGlint;
uniform float uTintAmount;
const float TAU = 6.283185307179586;

vec4 sampleImage(vec2 uv) {
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return vec4(0.0);
  return texture2D(uTexture, uv);
}

void main() {
  float amount = texture2D(uDisplacement, vUv).r;
  float theta = amount * uSwirl * TAU;
  vec2 push = vec2(sin(theta), cos(theta)) * amount * uStrength;

  vec4 color;
  if (uDispersion > 0.001) {
    float split = uDispersion * 0.25;
    vec4 r = sampleImage(vUv + push * (1.0 + split));
    vec4 g = sampleImage(vUv + push);
    vec4 b = sampleImage(vUv + push * (1.0 - split));
    color = vec4(r.r, g.g, b.b, max(max(r.a, g.a), b.a));
  } else {
    color = sampleImage(vUv + push);
  }

  if (uTintAmount > 0.001) {
    color.rgb = mix(color.rgb, color.rgb * uTint * 1.9, clamp(amount * 1.6, 0.0, 1.0) * uTintAmount);
  }

  if (uGlint > 0.001) {
    float ex = texture2D(uDisplacement, vUv + vec2(uTexel.x, 0.0)).r - texture2D(uDisplacement, vUv - vec2(uTexel.x, 0.0)).r;
    float ey = texture2D(uDisplacement, vUv + vec2(0.0, uTexel.y)).r - texture2D(uDisplacement, vUv - vec2(0.0, uTexel.y)).r;
    vec3 normal = normalize(vec3(-ex * 26.0, -ey * 26.0, 1.0));
    vec3 light = normalize(vec3(-0.35, 0.55, 1.0));
    float raw = pow(max(dot(normal, light), 0.0), 22.0);
    float flatSpec = pow(max(light.z, 0.0), 22.0);
    float spec = clamp((raw - flatSpec) / max(1.0 - flatSpec, 0.0001), 0.0, 1.0);
    color.rgb += uHighlight * spec * uGlint * color.a;
  }

  gl_FragColor = color;
}
`;
