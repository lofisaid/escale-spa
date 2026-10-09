// Escale Spa — moteur commun des scènes 3D (Three.js).
// Rendu à la demande, ombres douces, occlusion ambiante (ordinateur), ombres de contact précalculées,
// caméra contrainte, points interactifs accessibles et libération complète des ressources.
import {
  WebGLRenderer, Scene, PerspectiveCamera, OrthographicCamera, Color, Vector3, Mesh, Group, BoxGeometry, PlaneGeometry,
  MeshBasicMaterial, ShaderMaterial, WebGLRenderTarget, HalfFloatType, PMREMGenerator, SRGBColorSpace, NeutralToneMapping,
  PCFShadowMap, BackSide, DoubleSide, Fog, Float32BufferAttribute,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function deviceTier() {
  const small = matchMedia('(max-width: 760px)').matches;
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  return small || weak ? 'low' : 'high';
}

// Environnement lumineux : pièce chaude avec une grande baie claire (réflexions douces et crédibles)
function buildEnvironment(renderer, { windowSide = -1 } = {}) {
  const env = new Scene();
  const room = new Mesh(new BoxGeometry(12, 6, 12), new MeshBasicMaterial({ color: new Color('#8a7566'), side: BackSide }));
  room.position.y = 3; env.add(room);
  const floor = new Mesh(new PlaneGeometry(12, 12), new MeshBasicMaterial({ color: new Color('#6b5444') }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; env.add(floor);
  const win = new Mesh(new PlaneGeometry(4, 3.2), new MeshBasicMaterial({ color: new Color(9, 8.2, 7.2) }));
  win.position.set(windowSide * 5.95, 2.2, 0); win.rotation.y = -windowSide * Math.PI / 2; env.add(win);
  const ceil = new Mesh(new PlaneGeometry(6, 6), new MeshBasicMaterial({ color: new Color(1.6, 1.5, 1.4) }));
  ceil.position.y = 5.95; ceil.rotation.x = Math.PI / 2; env.add(ceil);
  const pm = new PMREMGenerator(renderer);
  const rt = pm.fromScene(env, 0.035);
  pm.dispose();
  env.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return rt;
}

function boxBlur(src, n, r) {
  if (r < 1) return src;
  const tmp = new Float32Array(n * n); const out = new Float32Array(n * n); const k = 1 / (2 * r + 1);
  for (let y = 0; y < n; y++) { let acc = 0; const row = y * n; for (let x = -r; x <= r; x++) acc += src[row + Math.min(n - 1, Math.max(0, x))]; for (let x = 0; x < n; x++) { tmp[row + x] = acc * k; acc += src[row + Math.min(n - 1, x + r + 1)] - src[row + Math.max(0, x - r)]; } }
  for (let x = 0; x < n; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[Math.min(n - 1, Math.max(0, y)) * n + x]; for (let y = 0; y < n; y++) { out[y * n + x] = acc * k; acc += tmp[Math.min(n - 1, y + r + 1) * n + x] - tmp[Math.max(0, y - r) * n + x]; } }
  return out;
}

// Ombres de contact précalculées (une seule fois : la scène est statique)
function bakeContactShadows(renderer, scene, { width = 5, depth = 4, height = 0.9, center = [0, 0], y = 0.002, res = 1024, blur = 2.2, darkness = 0.9, opacity = 0.85 }) {
  const rt = new WebGLRenderTarget(res, res); rt.texture.generateMipmaps = false;
  const cam = new OrthographicCamera(-width / 2, width / 2, depth / 2, -depth / 2, 0, height);
  cam.position.set(center[0], y, center[1]); cam.rotation.x = Math.PI / 2; cam.updateMatrixWorld();
  const mat = new ShaderMaterial({
    uniforms: { darkness: { value: darkness } },
    vertexShader: 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float darkness; void main(){ float a = clamp(pow(1.0 - gl_FragCoord.z, 1.6) * darkness, 0.0, 1.0); gl_FragColor = vec4(vec3(0.0), a); }',
    side: DoubleSide,
  });
  const hidden = [];
  scene.traverse((o) => { if (o.isMesh && o.userData.contact === false && o.visible) { o.visible = false; hidden.push(o); } });
  const bg = scene.background; const fog = scene.fog; scene.background = null; scene.fog = null;
  const prevTarget = renderer.getRenderTarget(); const prevClear = renderer.getClearAlpha(); const prevSM = renderer.shadowMap.autoUpdate;
  renderer.shadowMap.autoUpdate = false;
  scene.overrideMaterial = mat; renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, cam);
  scene.overrideMaterial = null; scene.background = bg; scene.fog = fog; hidden.forEach((o) => { o.visible = true; });
  renderer.setRenderTarget(prevTarget); renderer.setClearAlpha(prevClear); renderer.shadowMap.autoUpdate = prevSM; renderer.shadowMap.needsUpdate = true;
  mat.dispose();
  // lecture unique → tableau d'occlusion (0 = libre, 255 = contact fort)
  const buf = new Uint8Array(res * res * 4); renderer.readRenderTargetPixels(rt, 0, 0, res, res, buf);
  const raw = new Float32Array(res * res); for (let i = 0; i < res * res; i++) raw[i] = buf[i * 4 + 3] / 255;
  // deux flous (CPU, boîte séparable) : contact serré sous les pieds + halo large sous les volumes
  const px = res / width; // pixels par mètre
  const tight = boxBlur(boxBlur(raw, res, Math.max(1, Math.round(0.012 * px * blur))), res, Math.max(1, Math.round(0.012 * px * blur)));
  const wide = boxBlur(boxBlur(boxBlur(raw, res, Math.round(0.06 * px * blur)), res, Math.round(0.06 * px * blur)), res, Math.round(0.06 * px * blur));
  const data = new Uint8Array(res * res);
  for (let i = 0; i < res * res; i++) data[i] = Math.min(255, Math.max(tight[i] * 1.1, wide[i] * 0.9) * 255 * opacity);
  rt.dispose();
  return { data, res, width, depth, center };
}

/**
 * Applique l'ombre de contact à un objet posé au sol (sol, tapis) : la carte est échantillonnée
 * sur le processeur et écrite dans les couleurs de sommets (géométrie subdivisée), ce qui
 * assombrit la couleur de base pour toutes les lumières, sans texture supplémentaire.
 */
export function applyContact(mesh, contact, { strength = 1 } = {}) {
  const { data, res, width: W, depth: D, center: [ccx, ccz] } = contact;
  mesh.updateMatrixWorld(true);
  const pos = mesh.geometry.attributes.position; const col = new Float32Array(pos.count * 3); const v = new Vector3();
  const sample = (u, w) => { // bilinéaire
    const x = u * (res - 1); const y = w * (res - 1); const x0 = Math.floor(x); const y0 = Math.floor(y); const fx = x - x0; const fy = y - y0;
    const at = (i, j) => data[(Math.min(res - 1, j) * res + Math.min(res - 1, i))];
    return (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
  };
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    const u = (v.x - (ccx - W / 2)) / W; const w = (v.z - (ccz - D / 2)) / D;
    let k = 1;
    if (u > 0 && u < 1 && w > 0 && w < 1) k = 1 - strength * sample(u, w) / 255;
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
  }
  mesh.geometry.setAttribute('color', new Float32BufferAttribute(col, 3));
  mesh.material.vertexColors = true; mesh.material.needsUpdate = true;
}

/**
 * createStage(container, sceneDef, opts)
 * sceneDef : { background, fog, views:{name:{pos,target,spread?}}, defaultView, anchors:[{id,pos,label}],
 *              contact:{…}, build(ctx) → appelée pour remplir la scène }
 */
export async function createStage(container, def, opts = {}) {
  const still = !!opts.still;
  const tier = opts.tier || deviceTier();
  const high = tier === 'high';
  const reduced = !!opts.reducedMotion;

  const renderer = new WebGLRenderer({ antialias: !high || still ? true : false, powerPreference: 'high-performance', preserveDrawingBuffer: still, alpha: false });
  renderer.setPixelRatio(still ? (opts.pixelRatio || 1) : Math.min(window.devicePixelRatio || 1, high ? 1.75 : 1.5));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = def.exposure ?? 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // scène statique : ombres calculées une fois
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', opts.label || def.label || '3D');
  canvas.tabIndex = -1;
  container.append(canvas);
  const hint = document.createElement('p');
  hint.className = 'sr-only'; hint.id = `scene-hint-${def.id}`; hint.textContent = opts.hint || '';
  container.append(hint); canvas.setAttribute('aria-describedby', hint.id);

  const scene = new Scene();
  scene.background = new Color(def.background || '#E9DED2');
  if (def.fog) scene.fog = new Fog(def.background || '#E9DED2', def.fog[0], def.fog[1]);
  const envRT = buildEnvironment(renderer, def.environment || {});
  scene.environment = envRT.texture;
  scene.environmentIntensity = def.envIntensity ?? 0.6;

  const camera = new PerspectiveCamera(def.fov || 32, 1, 0.05, 40);

  // remplissage de la scène par le module spécifique
  const ctx = { scene, renderer, tier, high, still, maxAnisotropy: renderer.capabilities.getMaxAnisotropy() };
  const tb = performance.now(); await def.build(ctx); ctx.buildMs = Math.round(performance.now() - tb); if (opts.still) console.warn('build ms', ctx.buildMs);
  renderer.shadowMap.needsUpdate = true;

  // ombres de contact
  if (def.contact) {
    const contact = bakeContactShadows(renderer, scene, { res: high ? 1024 : 512, ...def.contact });
    def.applyContact?.(contact, applyContact);
  }

  // post-traitement : occlusion ambiante (GTAO) sur ordinateur et pour les rendus fixes
  let composer = null; let gtao = null;
  const useAO = (high || still) && def.ao !== false;
  if (useAO) {
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    gtao = new GTAOPass(scene, camera, 1, 1);
    gtao.updateGtaoMaterial({ radius: def.aoRadius ?? 0.22, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: still ? 24 : 12, distanceFallOff: 1 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: still ? 16 : 8 });
    gtao.blendIntensity = def.aoIntensity ?? 0.9;
    composer.addPass(gtao);
    composer.addPass(new OutputPass());
  }

  // ——— caméra et contrôles contraints
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false; controls.enableDamping = !reduced; controls.dampingFactor = 0.09;
  controls.rotateSpeed = 0.45; controls.zoomSpeed = 0.5;
  const views = def.views;
  let current = opts.view && views[opts.view] ? opts.view : def.defaultView || Object.keys(views)[0];
  const setLimits = (name) => {
    const v = views[name]; const off = new Vector3(...v.pos).sub(new Vector3(...v.target));
    const az = Math.atan2(off.x, off.z); const pol = Math.acos(off.y / off.length()); const dist = off.length(); const s = v.spread ?? 0.35;
    controls.minAzimuthAngle = az - s; controls.maxAzimuthAngle = az + s;
    controls.minPolarAngle = Math.max(0.2, pol - 0.25); controls.maxPolarAngle = Math.min(1.5, pol + 0.18);
    controls.minDistance = dist * 0.8; controls.maxDistance = dist * 1.15;
  };
  const applyView = (name) => { const v = views[name]; camera.position.set(...v.pos); controls.target.set(...v.target); if (v.fov) { camera.fov = v.fov; camera.updateProjectionMatrix(); } setLimits(name); controls.update(); };
  applyView(current);

  // ——— points interactifs (vrais boutons HTML)
  const hotspots = (def.anchors || []).map((a) => {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'hotspot';
    const label = opts.labels?.[a.id] || a.label || a.id;
    el.setAttribute('aria-label', label); el.setAttribute('aria-expanded', 'false');
    if (opts.panelId) el.setAttribute('aria-controls', opts.panelId);
    const lbl = document.createElement('span'); lbl.textContent = label; lbl.setAttribute('aria-hidden', 'true'); el.append(lbl);
    el.addEventListener('click', () => opts.onSelect?.(a.id, el));
    if (!still && opts.hotspots !== false) container.append(el);
    return { id: a.id, el, pos: new Vector3(...a.pos) };
  });
  const tmp = new Vector3();
  const placeHotspots = () => {
    const w = container.clientWidth; const h = container.clientHeight;
    for (const hs of hotspots) {
      tmp.copy(hs.pos).project(camera);
      const vis = tmp.z < 1 && Math.abs(tmp.x) < 0.92 && Math.abs(tmp.y) < 0.88;
      hs.el.style.display = vis ? '' : 'none';
      const x = ((tmp.x + 1) / 2) * w;
      hs.el.style.left = `${x}px`; hs.el.style.top = `${((1 - tmp.y) / 2) * h}px`;
      hs.el.dataset.edge = x < 90 ? 'start' : x > w - 90 ? 'end' : '';
    }
  };

  // ——— taille
  const resize = () => {
    const w = Math.max(1, container.clientWidth); const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const base = views[current].fov || def.fov || 32;
    camera.fov = w / h < 0.95 ? base * 1.35 : base;
    camera.updateProjectionMatrix();
    if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
    requestRender();
  };

  // ——— rendu à la demande
  let raf = 0; let visible = true; let disposed = false; let anim = null;
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  const draw = () => { if (composer) composer.render(); else renderer.render(scene, camera); placeHotspots(); };
  function frame(now) {
    raf = 0; if (disposed) return;
    // garde-fou : position vérifiée à chaque image (l'observateur peut être en retard sous charge)
    { const r = container.getBoundingClientRect(); if (r.bottom <= 0 || r.top >= innerHeight || r.width === 0) { visible = false; return; } }
    let moving = false;
    if (anim) {
      const k = Math.min(1, (now - anim.t0) / anim.d); const e = ease(k);
      camera.position.lerpVectors(anim.fp, anim.tp, e); controls.target.lerpVectors(anim.ft, anim.tt, e);
      if (k >= 1) { setLimits(anim.view); anim = null; }
      moving = true;
    }
    const changed = controls.update();
    draw();
    if ((moving || changed) && visible && document.visibilityState === 'visible') raf = requestAnimationFrame(frame);
  }
  function requestRender() { if (!raf && !disposed && visible) raf = requestAnimationFrame(frame); }
  controls.addEventListener('change', requestRender);
  controls.addEventListener('start', requestRender);
  const ro = new ResizeObserver(resize); ro.observe(container);
  const io = new IntersectionObserver((entries) => { const e = entries[entries.length - 1]; visible = e.isIntersecting; if (visible) requestRender(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } }, { threshold: 0.01 });
  io.observe(container);
  const onVis = () => { if (document.visibilityState === 'visible') requestRender(); };
  document.addEventListener('visibilitychange', onVis);

  const focus = (name) => {
    const view = name && views[name] ? name : def.defaultView;
    current = view;
    hotspots.forEach((h) => h.el.setAttribute('aria-expanded', String(h.id === name)));
    if (reduced || still) { applyView(view); requestRender(); return; }
    controls.minAzimuthAngle = -Infinity; controls.maxAzimuthAngle = Infinity; controls.minDistance = 0; controls.maxDistance = Infinity; controls.minPolarAngle = 0; controls.maxPolarAngle = Math.PI;
    anim = { t0: performance.now(), d: 850, fp: camera.position.clone(), ft: controls.target.clone(), tp: new Vector3(...views[view].pos), tt: new Vector3(...views[view].target), view };
    requestRender();
  };

  resize();
  if (renderer.compileAsync && renderer.extensions.has('KHR_parallel_shader_compile')) { try { await renderer.compileAsync(scene, camera); } catch { /* ignore */ } }
  draw();

  function dispose() {
    disposed = true; if (raf) cancelAnimationFrame(raf);
    ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis);
    controls.dispose();
    const mats = new Set(); const geos = new Set();
    scene.traverse((o) => { if (o.geometry) geos.add(o.geometry); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m)); });
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => { for (const k of Object.keys(m)) { const v = m[k]; if (v && v.isTexture) v.dispose(); } m.dispose(); });
    envRT.dispose();
    if (composer) { composer.renderTarget1.dispose(); composer.renderTarget2.dispose(); composer.passes.forEach((p) => p.dispose?.()); }
    renderer.dispose(); renderer.forceContextLoss();
    canvas.remove(); hint.remove(); hotspots.forEach((h) => h.el.remove());
  }

  return { id: def.id, focusSpace: focus, focus, dispose, renderer, scene, camera, render: draw, get view() { return current; } };
}

// Aide : ajoute un mesh avec ombres, retourne le mesh
export function put(parent, geo, mat, x = 0, y = 0, z = 0, { cast = true, receive = true, contact } = {}) {
  const m = new Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = receive;
  if (contact === false) m.userData.contact = false;
  parent.add(m); return m;
}
export { Group };
