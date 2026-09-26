/**
 * ThreeUI's Emerald Horizon shaders (MIT, @designcodeio/threeui, source
 * revision 763c59aa), with one change at the end of the fragment shader.
 *
 * The original paints every pixel opaque on a near-black base
 * (`vec3(0.0, 0.02, 0.0)`, alpha 1.0) — a dark panel with the glow in it. Here
 * the glow's own strength is its alpha and the colour is premultiplied by it,
 * so the canvas is transparent wherever there is no glow and the footer's own
 * ground shows through. Over black it composites to the original exactly.
 */
export const LUMINA_VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

export const LUMINA_FRAGMENT_SHADER = `
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_wave_scale;
uniform float u_variation;
uniform float u_glow;
uniform float u_vignette;
varying vec2 vUv;
float hash(float n) { return fract(sin(n) * 1e4); }
float noise(float x) {
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(hash(i), hash(i + 1.0), u);
}
void main() {
  vec2 st = gl_FragCoord.xy / u_resolution.xy;
  float yPos = st.y;
  float wave1 = sin(st.x * 3.0 + u_time * 0.5) * 0.1 * u_wave_scale;
  float wave2 = sin(st.x * 5.0 - u_time * 0.3) * 0.05 * u_wave_scale;
  float combinedWave = wave1 + wave2;
  float intensity = smoothstep(0.4, -0.1, yPos + combinedWave);
  float variation = noise(st.x * 2.0 + u_time * 0.1) * 0.5 + 0.5;
  intensity *= variation * 1.5 * u_variation;
  vec3 glowColor1 = vec3(0.05, 0.8, 0.2);
  vec3 glowColor2 = vec3(0.0, 1.0, 0.5);
  vec3 finalGlow = mix(glowColor1, glowColor2, st.x + sin(u_time*0.2)*0.5);
  float vignette = mix(1.0, smoothstep(1.2, 0.5, length(st - vec2(0.5, 0.0))), u_vignette);
  float strength = pow(intensity, 1.5) * 1.2 * u_glow * vignette;
  gl_FragColor = vec4(clamp(finalGlow * strength, 0.0, 1.0), clamp(strength, 0.0, 1.0));
}
`;
