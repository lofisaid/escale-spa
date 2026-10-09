// Escale Spa — scène 3D illustrative (Three.js), chargée à la demande.
// Toutes les matières sont générées localement (géométrie + textures canvas) :
// aucune ressource externe. API : createScene(container, opts) → { focusSpace, dispose }.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Color, Vector3, Group, Mesh, Shape, Path,
  PlaneGeometry, CylinderGeometry, SphereGeometry, BoxGeometry, TorusGeometry, LatheGeometry,
  ExtrudeGeometry, CircleGeometry, Vector2, MeshStandardMaterial, MeshBasicMaterial,
  HemisphereLight, DirectionalLight, PointLight, AmbientLight, CanvasTexture, SRGBColorSpace,
  RepeatWrapping, ACESFilmicToneMapping, PCFShadowMap, PMREMGenerator, DoubleSide, Fog,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ———————————————————————— palette
const P = {
  wall: '#EADBCB', wallDark: '#DCC8B4', ivory: '#F7F0E6', towel: '#F4EEE5', rose: '#D7A497', roseDeep: '#B9786A',
  roseSoft: '#EBCFC6', wood: '#7E5236', woodLight: '#A8774F', brass: '#C6A66A', brown: '#3A2420', green: '#6E7F5C', greenDark: '#4E5E42',
};

// ———————————————————————— points de vue (cibles et positions caméra)
const VIEWS = {
  overview: { pos: [5.1, 3.15, 6.0], target: [0.05, 0.62, -0.35] },
  massages: { pos: [1.55, 2.15, 2.55], target: [-0.7, 0.62, -0.45] },
  ongles: { pos: [3.95, 1.85, 3.75], target: [1.75, 0.62, 1.25] },
  visage: { pos: [4.35, 2.0, 0.75], target: [2.05, 0.68, -1.45] },
};
const ANCHORS = { massages: [-0.65, 1.1, -0.45], ongles: [1.75, 1.08, 1.25], visage: [2.05, 1.2, -1.45] };

// ———————————————————————— textures procédurales
function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 4;
  t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(...repeat);
  return t;
}
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// Sol en « bejmat » (petits carreaux posés en chevrons) aux tons rosés
function bejmatTexture(small) {
  const S = small ? 512 : 1024;
  return canvasTex(S, S, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = '#B9998A'; g.fillRect(0, 0, w, h);
    const u = w / 16; const gap = Math.max(1.2, w / 520);
    const tones = ['#DFC2B1', '#D8B8A5', '#E5CBBB', '#D3AE9B', '#DCBDAB', '#E9D3C5', '#D6B3A1'];
    const tile = (x, y, tw, th) => {
      g.fillStyle = tones[Math.floor(r() * tones.length)];
      g.fillRect(x + gap, y + gap, tw - gap * 2, th - gap * 2);
      g.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.06})`;
      g.fillRect(x + gap, y + gap, tw - gap * 2, (th - gap * 2) * 0.35);
    };
    // motif périodique : paire (horizontal + vertical), translations a=(u,u) et b=(2u,-2u)
    for (let i = -24; i < 40; i++) {
      for (let j = -24; j < 24; j++) {
        const ox = i * u + j * 2 * u; const oy = i * u - j * 2 * u;
        if (ox < -3 * u || ox > w + u || oy < -3 * u || oy > h + u) continue;
        tile(ox, oy, 2 * u, u);
        tile(ox + 2 * u, oy - u, u, 2 * u);
      }
    }
  }, [6, 6]);
}
// Enduit type tadelakt
function plasterTexture() {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = P.wall; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) {
      const x = r() * w; const y = r() * h; const rad = 20 + r() * 90;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      const a = r() * 0.06;
      grd.addColorStop(0, r() > 0.5 ? `rgba(255,248,240,${a})` : `rgba(170,130,110,${a})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }, [2, 1]);
}
// Tapis berbère simple (losanges)
function rugTexture() {
  return canvasTex(512, 384, (g, w, h) => {
    g.fillStyle = '#F1E6D8'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#B9786A'; g.lineWidth = 3;
    g.strokeRect(18, 18, w - 36, h - 36);
    g.lineWidth = 1.5; g.strokeStyle = '#8A5A48';
    g.strokeRect(30, 30, w - 60, h - 60);
    g.strokeStyle = 'rgba(122,80,62,.55)'; g.lineWidth = 2;
    for (let x = 64; x < w - 40; x += 64) {
      for (let y = 64; y < h - 40; y += 64) {
        g.beginPath(); g.moveTo(x, y - 22); g.lineTo(x + 18, y); g.lineTo(x, y + 22); g.lineTo(x - 18, y); g.closePath(); g.stroke();
      }
    }
    const r = rng(3);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(90,60,40,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 1, 3); }
  });
}
// Lumière du jardin derrière la fenêtre en arc
function gardenTexture() {
  return canvasTex(256, 512, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#FFF3E2'); grd.addColorStop(0.55, '#FBE3CC'); grd.addColorStop(1, '#E9C7A6');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(110,127,92,.55)';
    for (let i = 0; i < 9; i++) { // palmes stylisées
      g.save(); g.translate(w * 0.62, h * 0.38); g.rotate(-1.2 + i * 0.32);
      g.beginPath(); g.ellipse(70, 0, 80, 9, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
    g.fillRect(w * 0.6, h * 0.38, 7, h);
  });
}

// ———————————————————————— géométries utilitaires
const rbox = (w, h, d, r = 0.03, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, r);
function archShape(w, h, x = 0, y = 0) {
  const s = new Path(); const r = w / 2;
  s.moveTo(x - r, y); s.lineTo(x - r, y + h - r);
  s.absarc(x, y + h - r, r, Math.PI, 0, true);
  s.lineTo(x + r, y); s.lineTo(x - r, y);
  return s;
}
function lathe(points, seg = 32) { return new LatheGeometry(points.map(([x, y]) => new Vector2(x, y)), seg); }

export async function createScene(container, opts = {}) {
  const isSmall = matchMedia('(max-width: 700px)').matches || (navigator.hardwareConcurrency || 8) <= 4;
  const reduced = !!opts.reducedMotion;
  const still = !!opts.still;

  // ——— renderer
  const renderer = new WebGLRenderer({ antialias: !isSmall || still, powerPreference: 'high-performance', preserveDrawingBuffer: still, alpha: false });
  renderer.setPixelRatio(still ? (opts.pixelRatio || 1) : Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', opts.label || '3D');
  canvas.tabIndex = -1;
  container.append(canvas);

  const hint = document.createElement('p');
  hint.className = 'sr-only'; hint.id = 'scene-hint'; hint.textContent = opts.hint || '';
  container.append(hint);
  canvas.setAttribute('aria-describedby', 'scene-hint');

  const scene = new Scene();
  scene.background = new Color('#E9D9C8');
  scene.fog = new Fog('#E9D9C8', 12, 22);
  const pmrem = new PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);

  const camera = new PerspectiveCamera(34, 1, 0.1, 40);

  // ——— matières
  const textures = [];
  const T = (t) => (textures.push(t), t);
  const floorTex = T(bejmatTexture(isSmall));
  const plaster = T(plasterTexture());
  const M = {
    floor: new MeshStandardMaterial({ map: floorTex, roughness: 0.78, metalness: 0 }),
    wall: new MeshStandardMaterial({ map: plaster, roughness: 0.92 }),
    wallDark: new MeshStandardMaterial({ color: P.wallDark, roughness: 0.95 }),
    leather: new MeshStandardMaterial({ color: P.rose, roughness: 0.52 }),
    leatherDeep: new MeshStandardMaterial({ color: P.roseDeep, roughness: 0.55 }),
    towel: new MeshStandardMaterial({ color: P.towel, roughness: 1 }),
    towelRose: new MeshStandardMaterial({ color: P.roseSoft, roughness: 1 }),
    wood: new MeshStandardMaterial({ color: P.wood, roughness: 0.55 }),
    woodLight: new MeshStandardMaterial({ color: P.woodLight, roughness: 0.6 }),
    brass: new MeshStandardMaterial({ color: P.brass, roughness: 0.32, metalness: 1 }),
    ceramic: new MeshStandardMaterial({ color: '#F3ECE3', roughness: 0.3 }),
    terracotta: new MeshStandardMaterial({ color: '#C08068', roughness: 0.85 }),
    leaf: new MeshStandardMaterial({ color: P.green, roughness: 0.7, side: DoubleSide }),
    leafDark: new MeshStandardMaterial({ color: P.greenDark, roughness: 0.7, side: DoubleSide }),
    rug: new MeshStandardMaterial({ map: T(rugTexture()), roughness: 1 }),
    garden: new MeshBasicMaterial({ map: T(gardenTexture()) }),
    wax: new MeshStandardMaterial({ color: '#F6EFE4', roughness: 0.6 }),
    flame: new MeshBasicMaterial({ color: '#FFD9A0' }),
    white: new MeshStandardMaterial({ color: '#FBF8F3', roughness: 0.4 }),
    dark: new MeshStandardMaterial({ color: '#3A2A25', roughness: 0.5 }),
  };
  // reflets d'environnement : forts sur le laiton et la céramique, très faibles ailleurs
  // (scene.environment éclairerait tout de façon uniforme et effacerait les ombres)
  for (const [m, k] of [[M.brass, 0.9], [M.ceramic, 0.35], [M.white, 0.3], [M.leather, 0.1], [M.leatherDeep, 0.1]]) { m.envMap = envRT.texture; m.envMapIntensity = k; }
  const polish = ['#C9877A', '#E6B9AE', '#9E4E44', '#EAD4C7', '#B98F6B', '#6E3B36'].map((c) => new MeshStandardMaterial({ color: c, roughness: 0.15, metalness: 0.05, envMap: envRT.texture, envMapIntensity: 0.45 }));

  const add = (geo, mat, x = 0, y = 0, z = 0, parent = scene, { cast = true, receive = true } = {}) => {
    const m = new Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = receive; parent.add(m); return m;
  };

  // ——— pièce
  const floor = add(new PlaneGeometry(10, 8), M.floor, 0.5, 0, 0.5, scene, { cast: false });
  floor.rotation.x = -Math.PI / 2;

  // mur du fond avec niche en arc
  const backShape = new Shape(); backShape.moveTo(-4, 0); backShape.lineTo(5.5, 0); backShape.lineTo(5.5, 3.8); backShape.lineTo(-4, 3.8); backShape.lineTo(-4, 0);
  const back = add(new ExtrudeGeometry(backShape, { depth: 0.2, bevelEnabled: false }), M.wall, 0, 0, -2.75, scene, { cast: false });
  const nicheG = new ExtrudeGeometry((() => { const s = new Shape(); const a = archShape(1.1, 2.1, 0, 0); s.setFromPoints(a.getPoints(24)); return s; })(), { depth: 0.12, bevelEnabled: false });
  const niche = add(nicheG, M.wallDark, 0.4, 0.55, -2.62, scene, { cast: false });
  add(new BoxGeometry(1.1, 0.04, 0.22), M.woodLight, 0.4, 1.25, -2.56); // étagère
  // vase et bougies dans la niche
  add(lathe([[0, 0], [0.09, 0], [0.12, 0.08], [0.1, 0.22], [0.05, 0.3], [0.055, 0.36], [0, 0.36]]), M.terracotta, 0.2, 1.27, -2.56);
  add(lathe([[0, 0], [0.07, 0], [0.08, 0.12], [0.04, 0.18], [0, 0.18]]), M.ceramic, 0.6, 1.27, -2.56);
  add(new BoxGeometry(1.1, 0.04, 0.22), M.woodLight, 0.4, 0.57, -2.56); // rebord bas
  add(rbox(0.5, 0.05, 0.18, 0.02), M.towel, 0.3, 0.615, -2.56); add(rbox(0.46, 0.05, 0.17, 0.02), M.towelRose, 0.3, 0.665, -2.56);

  // mur gauche percé d'une fenêtre en arc (la lumière entre par là)
  const leftShape = new Shape(); leftShape.moveTo(-2.75, 0); leftShape.lineTo(4.5, 0); leftShape.lineTo(4.5, 3.8); leftShape.lineTo(-2.75, 3.8); leftShape.lineTo(-2.75, 0);
  leftShape.holes.push(archShape(1.25, 2.55, 0.6, 0.55));
  const left = add(new ExtrudeGeometry(leftShape, { depth: 0.22, bevelEnabled: false }), M.wall, -3.6, 0, 0, scene, { cast: true });
  left.rotation.y = Math.PI / 2; left.position.set(-3.6, 0, 0); left.scale.x = -1; // s'étend vers +z
  // encadrement en arc (laiton discret) et vue jardin
  const frameShape = new Shape(); frameShape.setFromPoints(archShape(1.39, 2.62, 0, 0).getPoints(32));
  frameShape.holes.push((() => { const h = new Path(); h.setFromPoints(archShape(1.25, 2.55, 0, 0).getPoints(32).reverse()); return h; })());
  const fr = add(new ExtrudeGeometry(frameShape, { depth: 0.05, bevelEnabled: false }), M.woodLight, -3.36, 0.5, 0.6, scene, { cast: false });
  fr.rotation.y = Math.PI / 2;
  const gardenPlane = add(new PlaneGeometry(1.6, 3), M.garden, -3.95, 1.75, 0.6, scene, { cast: false, receive: false });
  gardenPlane.rotation.y = Math.PI / 2;
  add(new BoxGeometry(0.34, 0.05, 1.4), M.wallDark, -3.4, 0.53, 0.6, scene, { cast: false }); // rebord

  // plinthe
  add(new BoxGeometry(9.5, 0.08, 0.03), M.wallDark, 0.75, 0.04, -2.54, scene, { cast: false });

  // tapis
  const rug = add(new PlaneGeometry(3.2, 2.3), M.rug, -0.65, 0.006, -0.35, scene, { cast: false });
  rug.rotation.x = -Math.PI / 2;

  // ——— 1. table de massage
  const table = new Group(); table.position.set(-0.65, 0, -0.45); scene.add(table);
  add(rbox(1.92, 0.12, 0.72, 0.05), M.leather, 0, 0.68, 0, table);
  const cradle = add(new TorusGeometry(0.15, 0.05, 12, 32, Math.PI * 1.4), M.leather, 1.12, 0.69, 0, table);
  cradle.rotation.x = -Math.PI / 2; cradle.rotation.z = Math.PI * 0.8;
  add(new CylinderGeometry(0.02, 0.02, 0.18, 8), M.wood, 1.02, 0.6, 0, table).rotation.z = Math.PI / 2;
  for (const [x, z] of [[-0.82, -0.28], [-0.82, 0.28], [0.82, -0.28], [0.82, 0.28]]) add(new CylinderGeometry(0.03, 0.035, 0.62, 12), M.wood, x, 0.31, z, table);
  add(new BoxGeometry(1.64, 0.025, 0.025), M.wood, 0, 0.18, 0.28, table); add(new BoxGeometry(1.64, 0.025, 0.025), M.wood, 0, 0.18, -0.28, table);
  // linge plié + drap
  add(rbox(1.7, 0.02, 0.74, 0.01), M.towel, -0.05, 0.745, 0, table);
  add(rbox(0.42, 0.07, 0.36, 0.03), M.towel, -0.62, 0.79, 0, table);
  add(rbox(0.38, 0.05, 0.32, 0.025), M.towelRose, -0.62, 0.85, 0, table);
  const bolster = add(new CylinderGeometry(0.1, 0.1, 0.6, 24), M.towelRose, 0.45, 0.85, 0, table); bolster.rotation.x = Math.PI / 2;
  // tabouret avec bougies et huiles
  const stool = new Group(); stool.position.set(-0.55, 0, 0.55); scene.add(stool);
  add(new CylinderGeometry(0.22, 0.2, 0.04, 32), M.woodLight, 0, 0.48, 0, stool);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const l = add(new CylinderGeometry(0.018, 0.022, 0.46, 8), M.wood, Math.cos(a) * 0.15, 0.23, Math.sin(a) * 0.15, stool); l.rotation.z = Math.cos(a) * 0.08; l.rotation.x = -Math.sin(a) * 0.08; }
  const candles = [];
  for (const [x, z, h] of [[-0.08, -0.05, 0.12], [0.06, 0.04, 0.08]]) {
    add(new CylinderGeometry(0.035, 0.035, h, 20), M.wax, x, 0.5 + h / 2, z, stool);
    const f = add(new SphereGeometry(0.012, 8, 8), M.flame, x, 0.5 + h + 0.018, z, stool, { cast: false, receive: false }); f.scale.y = 1.8; candles.push(f);
  }
  add(lathe([[0, 0], [0.03, 0], [0.035, 0.08], [0.012, 0.12], [0.012, 0.16], [0, 0.16]], 16), new MeshStandardMaterial({ color: '#C8924F', roughness: 0.1, transparent: true, opacity: 0.85 }), 0.1, 0.5, -0.1, stool);

  // ——— 2. poste de manucure
  const nails = new Group(); nails.position.set(1.75, 0, 1.25); scene.add(nails);
  add(new CylinderGeometry(0.42, 0.42, 0.035, 48), M.woodLight, 0, 0.66, 0, nails);
  add(new CylinderGeometry(0.04, 0.05, 0.62, 16), M.brass, 0, 0.33, 0, nails);
  add(new CylinderGeometry(0.22, 0.24, 0.03, 32), M.brass, 0, 0.015, 0, nails);
  // coussin repose-main
  const armrest = add(new CapsuleLike(0.07, 0.3), M.towelRose, -0.05, 0.73, 0.08, nails); armrest.rotation.z = Math.PI / 2;
  // lampe LED en arc
  const lamp = add(new TorusGeometry(0.12, 0.018, 12, 32, Math.PI), M.white, 0.1, 0.68, 0.12, nails); lamp.rotation.y = Math.PI / 2.4;
  // flacons de vernis
  polish.forEach((m, i) => {
    const a = -0.5 + i * 0.32; const x = Math.cos(a) * 0.28 - 0.02; const z = Math.sin(a) * 0.28 - 0.12;
    add(rbox(0.045, 0.06, 0.045, 0.012, 2), m, x, 0.71, z, nails);
    add(new CylinderGeometry(0.01, 0.012, 0.055, 10), M.dark, x, 0.765, z, nails);
  });
  add(rbox(0.22, 0.012, 0.14, 0.005), M.towel, -0.18, 0.684, -0.12, nails);
  // poufs
  for (const [x, z] of [[0.72, 0.15], [-0.7, -0.1]]) {
    add(lathe([[0, 0], [0.26, 0.01], [0.3, 0.12], [0.28, 0.3], [0.2, 0.38], [0, 0.39]], 32), x > 0 ? M.leather : M.leatherDeep, x, 0, z, nails);
  }

  // ——— 3. espace soins du visage
  const face = new Group(); face.position.set(2.05, 0, -1.45); face.rotation.y = -0.55; scene.add(face);
  add(rbox(0.7, 0.12, 1.0, 0.05), M.leather, 0, 0.6, 0.25, face);
  const backrest = add(rbox(0.7, 0.12, 0.8, 0.05), M.leather, 0, 0.88, -0.5, face); backrest.rotation.x = 0.75;
  const headrest = add(rbox(0.36, 0.09, 0.22, 0.04), M.towelRose, 0, 1.17, -0.84, face); headrest.rotation.x = 0.75;
  for (const [x, z] of [[-0.28, 0.6], [0.28, 0.6], [-0.28, -0.4], [0.28, -0.4]]) add(new CylinderGeometry(0.028, 0.03, 0.54, 10), M.brass, x, 0.27, z, face);
  add(rbox(0.66, 0.025, 0.5, 0.01), M.towel, 0, 0.67, 0.42, face);
  // desserte : bols, serviettes roulées, pinceau
  const cart = new Group(); cart.position.set(0.75, 0, -0.1); face.add(cart);
  for (const y of [0.32, 0.72]) add(rbox(0.46, 0.025, 0.36, 0.01), M.woodLight, 0, y, 0, cart);
  for (const [x, z] of [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.15], [0.2, 0.15]]) add(new CylinderGeometry(0.012, 0.012, 0.74, 8), M.brass, x, 0.37, z, cart);
  add(lathe([[0, 0], [0.04, 0], [0.08, 0.03], [0.085, 0.05], [0.075, 0.05], [0.035, 0.012], [0, 0.012]]), M.ceramic, -0.1, 0.735, 0.05, cart);
  add(lathe([[0, 0], [0.035, 0], [0.065, 0.03], [0.068, 0.045], [0.06, 0.045], [0.03, 0.01], [0, 0.01]]), M.ceramic, 0.1, 0.735, -0.07, cart);
  add(new CylinderGeometry(0.055, 0.055, 0.008, 24), new MeshStandardMaterial({ color: '#E7C4B6', roughness: 0.9 }), -0.1, 0.77, 0.05, cart, { cast: false });
  for (let i = 0; i < 3; i++) { const t = add(new CylinderGeometry(0.045, 0.045, 0.3, 20), i === 1 ? M.towelRose : M.towel, 0, 0.385 + i * 0.0 + 0.0, -0.1 + i * 0.1, cart); t.rotation.z = Math.PI / 2; t.position.y = 0.385; }
  const brush = add(new CylinderGeometry(0.006, 0.004, 0.16, 8), M.wood, 0.12, 0.745, 0.1, cart); brush.rotation.z = Math.PI / 2; brush.rotation.y = 0.4;

  // ——— décor : plante en pot, lanterne
  const plant = new Group(); plant.position.set(-3.0, 0, -2.1); scene.add(plant);
  add(lathe([[0, 0], [0.22, 0], [0.28, 0.45], [0.3, 0.5], [0, 0.5]]), M.terracotta, 0, 0, 0, plant);
  const leafShape = new Shape(); leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(0.09, 0.08, 0.1, 0.24, 0, 0.34); leafShape.bezierCurveTo(-0.1, 0.24, -0.09, 0.08, 0, 0);
  const leafGeo = new ExtrudeGeometry(leafShape, { depth: 0.004, bevelEnabled: false, curveSegments: 8 });
  const leafCount = isSmall ? 12 : 22; const r = rng(5);
  for (let i = 0; i < leafCount; i++) {
    const a = i * 2.39996; const lvl = i / leafCount;
    const stem = new Group(); stem.position.set(0, 0.5, 0); stem.rotation.y = a; plant.add(stem);
    const len = 0.35 + lvl * 0.7;
    const st = add(new CylinderGeometry(0.008, 0.01, len, 5), M.leafDark, 0, len / 2, 0, stem, { cast: true, receive: false });
    stem.rotation.z = 0.15 + (1 - lvl) * 0.5;
    const lf = add(leafGeo, i % 3 ? M.leaf : M.leafDark, 0, len - 0.02, 0, stem, { cast: true, receive: false });
    lf.rotation.set(-0.6 - r() * 0.5, r() * 0.6 - 0.3, 0.2 + r() * 0.3);
    lf.scale.setScalar(1.1 + r() * 0.4);
    void st;
  }
  // lanterne au sol près de la niche
  const lantern = new Group(); lantern.position.set(1.3, 0, -2.3); scene.add(lantern);
  add(new CylinderGeometry(0.13, 0.15, 0.04, 8), M.brass, 0, 0.02, 0, lantern);
  add(new CylinderGeometry(0.11, 0.13, 0.42, 8, 1, true), new MeshStandardMaterial({ color: P.brass, metalness: 1, roughness: 0.4, transparent: true, opacity: 0.55, side: DoubleSide }), 0, 0.25, 0, lantern, { cast: false });
  add(new CylinderGeometry(0.02, 0.12, 0.16, 8), M.brass, 0, 0.54, 0, lantern);
  const lanternGlow = add(new SphereGeometry(0.05, 12, 12), M.flame, 0, 0.22, 0, lantern, { cast: false, receive: false });

  // ——— lumières
  const hemi = new HemisphereLight('#FFF4E8', '#B88E7C', 0.95); scene.add(hemi);
  scene.add(new AmbientLight('#FFE9DA', 0.08));
  const sun = new DirectionalLight('#FFDDB8', 4.2);
  sun.position.set(-8.2, 4.4, 1.9); sun.target.position.set(-0.9, 0, 0.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isSmall ? 1024 : 2048, isSmall ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 30 }); sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 2;
  scene.add(sun, sun.target);
  const key = new DirectionalLight('#FFF1E4', 1.9); key.position.set(3.5, 7.5, 4.5); key.target.position.set(0, 0, -0.5);
  key.castShadow = true; key.shadow.mapSize.set(isSmall ? 1024 : 2048, isSmall ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 25 }); key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02; key.shadow.radius = 2;
  scene.add(key, key.target);
  const fill = new DirectionalLight('#F3D7CC', 0.35); fill.position.set(6, 4, 7); scene.add(fill);
  const candleLight = new PointLight('#FFC27A', 1.2, 3.2, 2); candleLight.position.set(-0.6, 0.75, 0.55); scene.add(candleLight);
  const lanternLight = new PointLight('#FFB867', 1.4, 3.5, 2); lanternLight.position.set(1.3, 0.35, -2.2); scene.add(lanternLight);

  // ——— caméra & contrôles (mouvements limités)
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = !reduced;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.6;
  controls.enableZoom = true;
  controls.minPolarAngle = 0.85; controls.maxPolarAngle = 1.32;

  let current = 'overview';
  const setLimits = (view) => {
    const v = VIEWS[view];
    const off = new Vector3(...v.pos).sub(new Vector3(...v.target));
    const az = Math.atan2(off.x, off.z); const dist = off.length();
    controls.minAzimuthAngle = az - 0.38; controls.maxAzimuthAngle = az + 0.38;
    controls.minDistance = dist * 0.82; controls.maxDistance = dist * 1.18;
  };
  const applyView = (view) => { const v = VIEWS[view]; camera.position.set(...v.pos); controls.target.set(...v.target); setLimits(view); controls.update(); };
  applyView(opts.view || 'overview');

  let anim = null;
  const focusSpace = (id) => {
    const view = id && VIEWS[id] ? id : 'overview';
    current = view;
    hotspots.forEach((h) => h.el.setAttribute('aria-expanded', String(h.id === id)));
    if (reduced || still) { applyView(view); requestRender(); return; }
    // relâcher les limites pendant la transition
    controls.minAzimuthAngle = -Infinity; controls.maxAzimuthAngle = Infinity; controls.minDistance = 0; controls.maxDistance = Infinity;
    anim = { t0: performance.now(), d: 900, fp: camera.position.clone(), ft: controls.target.clone(), tp: new Vector3(...VIEWS[view].pos), tt: new Vector3(...VIEWS[view].target), view };
    start();
  };

  // ——— points interactifs (vrais boutons HTML)
  const hotspots = Object.entries(ANCHORS).map(([id, p]) => {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'hotspot';
    el.setAttribute('aria-label', opts.spaces?.[id] || id);
    el.setAttribute('aria-expanded', 'false');
    el.setAttribute('aria-controls', 'scene-panel');
    const lbl = document.createElement('span'); lbl.textContent = opts.spaces?.[id] || id; lbl.setAttribute('aria-hidden', 'true');
    el.append(lbl);
    el.addEventListener('click', () => opts.onSelect?.(id, el));
    if (!still) container.append(el);
    return { id, el, pos: new Vector3(...p) };
  });
  const tmp = new Vector3();
  const placeHotspots = () => {
    const w = container.clientWidth; const h = container.clientHeight;
    for (const hs of hotspots) {
      tmp.copy(hs.pos).project(camera);
      const vis = tmp.z < 1 && Math.abs(tmp.x) < 0.95 && Math.abs(tmp.y) < 0.92;
      hs.el.style.display = vis ? '' : 'none';
      const x = ((tmp.x + 1) / 2) * w;
      hs.el.style.left = `${x}px`;
      hs.el.dataset.edge = x < 90 ? 'start' : x > w - 90 ? 'end' : '';
      hs.el.style.top = `${((1 - tmp.y) / 2) * h}px`;
    }
  };

  // ——— taille
  const resize = () => {
    const w = Math.max(1, container.clientWidth); const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.95 ? 46 : 34; // portrait : champ plus large
    camera.updateProjectionMatrix();
    requestRender();
  };
  const ro = new ResizeObserver(resize); ro.observe(container);

  // ——— boucle de rendu : uniquement si visible ; à la demande en mouvement réduit
  let raf = 0; let visible = true; let needs = true; let disposed = false;
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  function frame(now) {
    raf = 0;
    if (disposed) return;
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
    if (!reduced) {
      const f = 1 + Math.sin(now * 0.011) * 0.04 + Math.sin(now * 0.027) * 0.03;
      candleLight.intensity = 1.2 * f; lanternLight.intensity = 1.4 * (2 - f);
      candles.forEach((c, i) => { c.scale.y = 1.8 + Math.sin(now * 0.02 + i) * 0.15; });
      lanternGlow.scale.setScalar(f);
    }
    renderer.render(scene, camera); window.__sceneFrames = (window.__sceneFrames || 0) + 1; // compteur de diagnostic (tests)
    placeHotspots();
    needs = false;
    if (visible && document.visibilityState === 'visible' && (!reduced || moving || changed || needs)) raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf && !disposed && visible) raf = requestAnimationFrame(frame); }
  function requestRender() { needs = true; start(); }
  controls.addEventListener('change', requestRender);
  const io = new IntersectionObserver((entries) => { const e = entries[entries.length - 1]; visible = e.isIntersecting; if (visible) start(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } }, { threshold: 0.01 });
  io.observe(container);
  const onVis = () => { if (document.visibilityState === 'visible') start(); };
  document.addEventListener('visibilitychange', onVis);

  resize();
  // compilation des shaders avant le premier affichage
  if (renderer.compileAsync && renderer.extensions.has('KHR_parallel_shader_compile')) { try { await renderer.compileAsync(scene, camera); } catch { /* ignore */ } }
  renderer.render(scene, camera); placeHotspots();
  start();

  function dispose() {
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    ro.disconnect(); io.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    controls.dispose();
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
    Object.values(M).forEach((m) => m.dispose()); polish.forEach((m) => m.dispose()); leafGeo.dispose();
    textures.forEach((t) => t.dispose());
    envRT.dispose(); pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove(); hint.remove();
    hotspots.forEach((h) => h.el.remove());
  }

  return { focusSpace, dispose, renderer, scene, camera, get view() { return current; } };
}

// Géométrie « capsule » simplifiée (cylindre + 2 demi-sphères) pour le repose-main
function CapsuleLike(r, len) {
  const pts = [];
  for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2); pts.push(new Vector2(Math.cos(a) * r, Math.sin(a) * r - len / 2)); }
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * (Math.PI / 2); pts.push(new Vector2(Math.cos(a) * r, Math.sin(a) * r + len / 2)); }
  return new LatheGeometry(pts, 24);
}
