/**
 * Shaders for `elastic-engine.ts` — React Bits' ElasticMesh, changed in two
 * places so the sheet at rest is pixel-for-pixel the photograph it replaces:
 *
 *   1. Shading is measured from the flat sheet's own lighting, so an
 *      undeformed sheet comes out at exactly the image's colour. The original
 *      brightens a flat sheet by ~7%, which would flash on every handoff.
 *   2. The lattice is drawn only where the sheet is deformed, so it rises
 *      with the pull and is gone again by the time the photo takes back over.
 *
 * `uCover` crops the image the way `object-fit: cover` does, since the photo
 * it stands in for is cropped to its frame by CSS.
 *
 * `uSheet` is the sheet's size in CSS pixels (the canvas is larger, to leave
 * room for the sheet to bulge past its own edges), for the corner radius.
 */
export const ELASTIC_VERTEX = /* glsl */ `
precision highp float;
attribute vec2 aGrid;
attribute vec2 uv;
attribute vec3 aOffset;
attribute vec3 aNormal;

uniform float uAspect;
uniform float uTilt;
uniform float uDist;
uniform float uFit;

varying vec2 vUv;
varying vec3 vNormal;
varying float vDepth;

void main() {
  vUv = uv;

  vec2 base = vec2((aGrid.x * 2.0 - 1.0) * uAspect, 1.0 - aGrid.y * 2.0);
  vec3 p = vec3(base + aOffset.xy, aOffset.z);

  float ct = cos(uTilt);
  float st = sin(uTilt);
  float ry = p.y * ct - p.z * st;
  float rz = p.y * st + p.z * ct;
  p.y = ry;
  p.z = rz;

  float persp = uDist / (uDist - p.z);
  vec2 clip = vec2(p.x / uAspect, p.y) * persp * uFit;

  vNormal = aNormal;
  vDepth = aOffset.z;
  gl_Position = vec4(clip, 0.0, 1.0);
}
`;

export const ELASTIC_FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec3 vNormal;
varying float vDepth;

uniform sampler2D tMap;
uniform vec2 uCover;
uniform vec3 uHighlight;
uniform float uShading;
uniform vec2 uSheet;
uniform float uRadius;
uniform float uGridDensity;
uniform float uGridOpacity;
uniform vec3 uGridColor;

void main() {
  vec3 base = texture2D(tMap, vUv * uCover + (1.0 - uCover) * 0.5).rgb;

  vec3 N = normalize(vNormal);
  vec3 L = normalize(vec3(-0.35, 0.55, 0.78));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));

  float diff = clamp(dot(N, L), 0.0, 1.0);
  float specRaw = pow(clamp(dot(N, H), 0.0, 1.0), 26.0);
  float specFlat = pow(clamp(H.z, 0.0, 1.0), 26.0);
  float spec = clamp((specRaw - specFlat) / (1.0 - specFlat), 0.0, 1.0);
  float ao = clamp(1.0 + vDepth * 0.45, 0.65, 1.25);

  vec3 lit = base * (1.0 + uShading * 0.55 * (diff - L.z));
  lit *= ao;
  lit += uHighlight * spec * uShading * 0.25;

  vec2 g = vUv * uGridDensity;
  vec2 w = uGridDensity / max(uSheet, vec2(1.0));
  vec2 d = abs(fract(g - 0.5) - 0.5) / max(w * 1.5, vec2(1e-4));
  float line = 1.0 - clamp(min(d.x, d.y), 0.0, 1.0);
  float bend = clamp(abs(vDepth) * 6.0, 0.0, 1.0);
  lit = mix(lit, uGridColor, line * uGridOpacity * bend * (0.45 + diff * 0.55));

  vec2 p = (vUv - 0.5) * uSheet;
  vec2 halfSheet = uSheet * 0.5;
  float r = min(uRadius, min(halfSheet.x, halfSheet.y));
  vec2 q = abs(p) - (halfSheet - r);
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  float alpha = 1.0 - smoothstep(-1.25, 1.25, sd);
  if (alpha <= 0.002) discard;

  gl_FragColor = vec4(lit * alpha, alpha);
}
`;
