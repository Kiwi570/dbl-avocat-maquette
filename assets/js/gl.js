/* Lampe de bureau : sous-main bleu nuit, fibres et halo chaud (OGL) */
import { Renderer } from './vendor/ogl/core/Renderer.js';
import { Program } from './vendor/ogl/core/Program.js';
import { Mesh } from './vendor/ogl/core/Mesh.js';
import { Triangle } from './vendor/ogl/extras/Triangle.js';

const vertex = /* glsl */ `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragment = /* glsl */ `
precision mediump float;
uniform vec2 uRes;
uniform vec2 uLight;
uniform float uIntensity;
uniform float uDpr;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uRes;
  float aspect = uRes.x / uRes.y;
  vec3 nuit = vec3(0.063, 0.106, 0.188);

  /* grain fin, toujours present (calcul tres leger) */
  float grain = hash(floor(frag / uDpr)) - 0.5;

  /* vignette */
  vec2 c = uv - 0.5;
  float vig = dot(c, c);

  /* distance a la lampe */
  vec2 q = vec2(uv.x * aspect, uv.y);
  vec2 l = vec2(uLight.x * aspect, uLight.y);
  float d = distance(q, l);

  vec3 col = nuit * (1.0 - vig * 0.55) + grain * 0.012;

  /* loin de la lampe : on sort tout de suite */
  if (d > 0.95) {
    gl_FragColor = vec4(col, 1.0);
    return;
  }

  /* fibres du sous-main, motif deforme par du bruit (pas de grille) */
  vec2 p = frag / uDpr;
  vec2 warp = vec2(noise(p * 0.006), noise(p * 0.006 + 17.3)) * 9.0;
  float fibres = noise(vec2(p.x * 0.045, p.y * 0.42) + warp);
  fibres = fibres * 0.65 + noise(p * 0.11 + warp * 0.5) * 0.35;

  float halo = smoothstep(0.95, 0.0, d);
  halo = pow(halo, 1.8) * uIntensity;
  vec3 chaud = vec3(1.0, 0.80, 0.54);

  col += chaud * halo * (0.105 + 0.07 * fibres);
  col += nuit * (fibres - 0.5) * 0.18 * (0.35 + halo);

  gl_FragColor = vec4(col, 1.0);
}
`;

export function initBureau(conteneur, { mobile = false } = {}) {
  let renderer;
  try {
    renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.25),
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: 'low-power',
    });
  } catch (e) {
    return null;
  }
  const gl = renderer.gl;
  if (!gl) return null;
  gl.clearColor(0.063, 0.106, 0.188, 1);
  conteneur.appendChild(gl.canvas);

  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uRes: { value: [1, 1] },
      uLight: { value: [0.72, 0.62] },
      uIntensity: { value: 0 },
      uDpr: { value: renderer.dpr },
    },
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  const etat = {
    cible: [0.72, 0.62],
    actuel: [0.72, 0.62],
    intensite: 0,
    intensiteCible: 1,
    actif: false,
    visible: true,
    sale: true,
    raf: 0,
    t: 0,
  };

  function redimensionner() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    program.uniforms.uRes.value = [gl.canvas.width, gl.canvas.height];
    etat.sale = true;
    demander();
  }

  function boucle(t) {
    etat.raf = 0;
    if (!etat.actif || !etat.visible || document.hidden) return;
    const dt = Math.min(0.064, etat.t ? (t - etat.t) / 1000 : 0.016);
    etat.t = t;
    const k = 1 - Math.exp(-4.5 * dt);
    const ki = 1 - Math.exp(-2.2 * dt);
    let bouge = false;
    for (let i = 0; i < 2; i++) {
      const delta = etat.cible[i] - etat.actuel[i];
      if (Math.abs(delta) > 0.0004) { etat.actuel[i] += delta * k; bouge = true; }
    }
    const di = etat.intensiteCible - etat.intensite;
    if (Math.abs(di) > 0.002) { etat.intensite += di * ki; bouge = true; }
    if (bouge || etat.sale) {
      program.uniforms.uLight.value = [etat.actuel[0], etat.actuel[1]];
      program.uniforms.uIntensity.value = etat.intensite;
      renderer.render({ scene: mesh });
      etat.sale = false;
    }
    if (bouge) demander();
    else etat.t = 0;
  }

  function demander() {
    if (!etat.raf && etat.actif && etat.visible && !document.hidden) etat.raf = requestAnimationFrame(boucle);
  }

  window.addEventListener('resize', redimensionner, { passive: true });
  document.addEventListener('visibilitychange', demander);
  redimensionner();

  return {
    canvas: gl.canvas,
    demarrer() { etat.actif = true; etat.sale = true; demander(); },
    arreter() { etat.actif = false; },
    lumiere(x, y) { etat.cible[0] = x; etat.cible[1] = y; demander(); },
    visibilite(v) { etat.visible = v; gl.canvas.style.visibility = v ? 'visible' : 'hidden'; if (v) { etat.sale = true; demander(); } },
  };
}
