// Escale Spa — scène « Massage bien-être » : une table pliante installée dans un salon de particulier.
// Équipements illustrés = liste « Matériel apporté » du catalogue : table pliante, linge, huiles, lumière douce.
import {
  Group, Mesh, Shape, Path, ExtrudeGeometry, PlaneGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, BoxGeometry,
  MeshPhysicalMaterial, MeshStandardMaterial, MeshBasicMaterial, DirectionalLight, HemisphereLight, PointLight, RectAreaLight,
  InstancedMesh, Object3D, Color, DoubleSide, CanvasTexture, SRGBColorSpace, Vector2, Vector3, CatmullRomCurve3, TubeGeometry,
} from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { put } from './core.js';
import { softBox, drapedSheet, lathe, bolster, pipingRect, crescentCushion, leafGeometry, boxUV } from './geometry.js';
import { weave, terry, leatherette, plaster, oak, herringbone, woolRug, makeNoise } from './textures.js';

const TABLE = { x: 0.1, z: -0.55, len: 1.85, wid: 0.70, top: 0.70 };

export default {
  id: 'massage',
  background: '#EBDFD2',
  exposure: 1.1,
  envIntensity: 0.75,
  environment: { windowSide: -1 },
  fov: 32,
  aoRadius: 0.2,
  defaultView: 'overview',
  views: {
    overview: { pos: [2.95, 1.72, 2.45], target: [-0.15, 0.52, -0.72], spread: 0.32 },
    side: { pos: [0.18, 0.86, 2.55], target: [0.18, 0.5, -0.55], spread: 0.25, fov: 30 },
    detail: { pos: [2.12, 0.98, 0.98], target: [1.18, 0.58, -0.22], spread: 0.22, fov: 30 },
  },
  anchors: [
    { id: 'table', pos: [TABLE.x - 0.25, 0.78, TABLE.z + 0.05] },
    { id: 'linge', pos: [TABLE.x - 0.76, 0.84, TABLE.z] },
    { id: 'huiles', pos: [1.36, 0.78, 0.12] },
    { id: 'lumiere', pos: [-2.62, 1.6, -0.55] },
  ],
  contact: { width: 6.2, depth: 5, center: [-0.2, -0.6], height: 0.95, y: 0.0135, blur: 1, darkness: 1.3, opacity: 0.9 },

  // ombre de contact → sol et tapis
  applyContact(contact, apply) {
    apply(this._floor, contact, { strength: 0.95 });
    apply(this._rug, contact, { strength: 0.95 });
  },

  build({ scene, high, maxAnisotropy }) {
    RectAreaLightUniformsLib.init();
    const T = high ? 1 : 0.5; // résolution des textures
    const aniso = (t) => { for (const k of ['map', 'normalMap', 'roughnessMap']) if (t[k]) t[k].anisotropy = Math.min(8, maxAnisotropy); return t; };

    // ——————————————————— matières
    const texWeaveFine = aniso(weave({ size: 256, threads: 32, seed: 3, strength: 3.2, repeat: [1 / 0.035, 1 / 0.035] }));
    const texWeaveCoarse = aniso(weave({ size: 256, threads: 24, seed: 8, slub: 0.6, strength: 3.6, repeat: [1 / 0.06, 1 / 0.06] }));
    const texTerry = aniso(terry({ size: 256, seed: 9, strength: 2.4, repeat: [1 / 0.06, 1 / 0.06] }));
    const texLeather = aniso(leatherette({ size: 256, seed: 5, repeat: [1 / 0.05, 1 / 0.05] }));
    const texPlaster = plaster({ size: Math.round(512 * T), seed: 11, color: '#F4ECE2', repeat: [1 / 2.4, 1 / 2.4] });
    const texOakH = aniso(oak({ w: Math.round(512 * T), h: Math.round(128 * T), seed: 21, repeat: [1 / 0.6, 1 / 0.15] }));
    const texOakV = aniso(oak({ w: Math.round(512 * T), h: Math.round(128 * T), seed: 22, repeat: [1 / 0.6, 1 / 0.15] }));
    for (const k of ['map', 'normalMap']) { texOakV[k].center.set(0.5, 0.5); texOakV[k].rotation = Math.PI / 2; }
    const texFloor = aniso(herringbone({ size: Math.round(1024 * T), seed: 31 }));
    const texRug = aniso(woolRug({ w: Math.round(1024 * T), h: Math.round(768 * T), seed: 41 }));

    const M = {
      sheet: new MeshPhysicalMaterial({ color: '#F5F0E8', roughness: 0.9, sheen: 1, sheenColor: new Color('#ffffff'), sheenRoughness: 0.5, normalMap: texWeaveFine.normalMap, normalScale: new Vector2(0.7, 0.7), side: DoubleSide }),
      towelRose: new MeshPhysicalMaterial({ color: '#DDB0A2', roughness: 1, sheen: 1, sheenColor: new Color('#F6D9CF'), sheenRoughness: 0.8, normalMap: texTerry.normalMap, normalScale: new Vector2(1, 1) }),
      towelIvory: new MeshPhysicalMaterial({ color: '#F0E8DC', roughness: 1, sheen: 1, sheenColor: new Color('#ffffff'), sheenRoughness: 0.8, normalMap: texTerry.normalMap, normalScale: new Vector2(1, 1) }),
      cotton: new MeshPhysicalMaterial({ color: '#F1E9DE', roughness: 0.92, sheen: 0.8, sheenColor: new Color('#ffffff'), sheenRoughness: 0.5, normalMap: texWeaveFine.normalMap, normalScale: new Vector2(0.5, 0.5) }),
      leather: new MeshPhysicalMaterial({ color: '#B8968A', roughness: 1, roughnessMap: texLeather.roughnessMap, normalMap: texLeather.normalMap, normalScale: new Vector2(0.28, 0.28), clearcoat: 0.3, clearcoatRoughness: 0.45 }),
      oakH: new MeshPhysicalMaterial({ map: texOakH.map, normalMap: texOakH.normalMap, normalScale: new Vector2(0.4, 0.4), roughness: 0.5, clearcoat: 0.12, clearcoatRoughness: 0.4 }),
      oakV: new MeshPhysicalMaterial({ map: texOakV.map, normalMap: texOakV.normalMap, normalScale: new Vector2(0.4, 0.4), roughness: 0.5, clearcoat: 0.12, clearcoatRoughness: 0.4 }),
      floor: new MeshPhysicalMaterial({ map: texFloor.map, normalMap: texFloor.normalMap, normalScale: new Vector2(0.55, 0.55), roughnessMap: texFloor.roughnessMap, roughness: 1, clearcoat: 0.3, clearcoatRoughness: 0.32 }),
      wall: new MeshStandardMaterial({ map: texPlaster.map, normalMap: texPlaster.normalMap, normalScale: new Vector2(0.35, 0.35), roughness: 0.95 }),
      trim: new MeshStandardMaterial({ color: '#E2D3C2', roughness: 0.7 }),
      rug: new MeshPhysicalMaterial({ map: texRug.map, normalMap: texRug.normalMap, normalScale: new Vector2(0.55, 0.55), roughness: 1, sheen: 0.6, sheenColor: new Color('#fff4e6'), sheenRoughness: 0.9 }),
      brass: new MeshStandardMaterial({ color: '#BC9A62', metalness: 1, roughness: 0.3 }),
      steel: new MeshStandardMaterial({ color: '#D8D6D2', metalness: 1, roughness: 0.32, envMapIntensity: 1.4 }),
      rubber: new MeshStandardMaterial({ color: '#2B2624', roughness: 0.85 }),
      cable: new MeshStandardMaterial({ color: '#3A3634', metalness: 0.6, roughness: 0.45 }),
      ceramic: new MeshPhysicalMaterial({ color: '#EFE8DE', roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.15 }),
      stoneware: new MeshPhysicalMaterial({ color: '#C9A894', roughness: 0.75, normalMap: texPlaster.normalMap, normalScale: new Vector2(0.6, 0.6) }),
      terracotta: new MeshStandardMaterial({ color: '#B27A60', roughness: 0.92, normalMap: texPlaster.normalMap, normalScale: new Vector2(1, 1) }),
      amber: high
        ? new MeshPhysicalMaterial({ color: '#E3A15C', transmission: 1, thickness: 0.006, ior: 1.5, roughness: 0.06, attenuationColor: new Color('#9A4E12'), attenuationDistance: 0.03, specularIntensity: 1 })
        : new MeshPhysicalMaterial({ color: '#8E4B18', roughness: 0.12, transparent: true, opacity: 0.92 }),
      glass: high
        ? new MeshPhysicalMaterial({ color: '#ffffff', transmission: 1, thickness: 0.004, ior: 1.5, roughness: 0.04, specularIntensity: 1 })
        : new MeshPhysicalMaterial({ color: '#F4F1EC', roughness: 0.05, transparent: true, opacity: 0.3 }),
      oil: new MeshPhysicalMaterial({ color: '#D7A23C', roughness: 0.1, transmission: high ? 0.6 : 0, transparent: !high, opacity: high ? 1 : 0.85, ior: 1.47, thickness: 0.03 }),
      wax: new MeshPhysicalMaterial({ color: '#F4EDE2', roughness: 0.55, sheen: 0.3 }),
      wick: new MeshStandardMaterial({ color: '#2a201c', roughness: 0.9 }),
      flame: new MeshBasicMaterial({ color: '#FFD9A3' }),
      nylon: new MeshPhysicalMaterial({ color: '#544239', roughness: 0.8, sheen: 0.5, sheenColor: new Color('#9c8577'), normalMap: texWeaveCoarse.normalMap, normalScale: new Vector2(0.7, 0.7) }),
      strap: new MeshStandardMaterial({ color: '#3B2E28', roughness: 0.7 }),
      linen: new MeshPhysicalMaterial({ color: '#D8CCBB', roughness: 0.95, sheen: 0.8, sheenColor: new Color('#fff8ee'), sheenRoughness: 0.6, normalMap: texWeaveCoarse.normalMap, normalScale: new Vector2(0.9, 0.9) }),
      linenRose: new MeshPhysicalMaterial({ color: '#C99A8B', roughness: 0.95, sheen: 0.8, sheenColor: new Color('#f3d5ca'), sheenRoughness: 0.6, normalMap: texWeaveCoarse.normalMap, normalScale: new Vector2(0.9, 0.9) }),
      curtain: new MeshPhysicalMaterial({ color: '#F6F0E7', roughness: 0.95, sheen: 1, sheenColor: new Color('#ffffff'), transparent: true, opacity: 0.72, side: DoubleSide, normalMap: texWeaveFine.normalMap, normalScale: new Vector2(0.3, 0.3), emissive: new Color('#FFF1DD'), emissiveIntensity: 0.18 }),
      outside: new MeshBasicMaterial({ map: gardenTexture(), toneMapped: false }),
      frame: new MeshStandardMaterial({ color: '#E7DCCD', roughness: 0.55 }),
      leaf: new MeshStandardMaterial({ color: '#76845F', roughness: 0.62, side: DoubleSide }),
      bark: new MeshStandardMaterial({ color: '#6A5646', roughness: 0.95, normalMap: texPlaster.normalMap, normalScale: new Vector2(2, 2) }),
      soil: new MeshStandardMaterial({ color: '#4A3A30', roughness: 1 }),
    };

    // ——————————————————— pièce : sol, murs, plinthes
    const floor = put(scene, new PlaneGeometry(7.2, 6.4, high ? 320 : 180, high ? 284 : 160), M.floor, -0.2, 0, -0.6, { cast: false, contact: false });
    floor.rotation.x = -Math.PI / 2; this._floor = floor;
    floor.material.map.repeat.set(7.2 / 0.56, 6.4 / 0.56); floor.material.normalMap.repeat.copy(floor.material.map.repeat); floor.material.roughnessMap.repeat.copy(floor.material.map.repeat);

    const wallH = 3.0;
    // mur du fond (z = -2.45)
    const back = put(scene, new BoxGeometry(7.2, wallH, 0.2), M.wall, -0.2, wallH / 2, -2.55, { cast: false, contact: false });
    boxUV(back.geometry);
    // mur gauche percé d'une fenêtre (x = -2.85)
    const ws = new Shape(); ws.moveTo(-3.8, 0); ws.lineTo(2.6, 0); ws.lineTo(2.6, wallH); ws.lineTo(-3.8, wallH); ws.closePath();
    const hole = new Path(); const W0 = -1.55; const W1 = 0.35; const Y0 = 0.52; const Y1 = 2.5;
    hole.moveTo(W0, Y0); hole.lineTo(W1, Y0); hole.lineTo(W1, Y1); hole.lineTo(W0, Y1); hole.closePath(); ws.holes.push(hole);
    const leftG = new ExtrudeGeometry(ws, { depth: 0.24, bevelEnabled: false }); leftG.computeVertexNormals(); boxUV(leftG);
    const left = put(scene, leftG, M.wall, -2.85, 0, 0, { cast: true, contact: false });
    left.rotation.y = Math.PI / 2; // la forme (x) devient -z
    // ébrasement : la forme est en x = -z_monde ; les positions monde de la baie sont z ∈ [-0.35, 1.55]… on corrige :
    left.scale.x = -1; // x de forme → +z monde : baie z ∈ [-1.55, 0.35]
    left.geometry.computeVertexNormals();
    // plinthes
    put(scene, new BoxGeometry(7.0, 0.08, 0.018), M.trim, -0.15, 0.04, -2.44, { cast: false, contact: false });
    put(scene, new BoxGeometry(0.018, 0.08, 4.9), M.trim, -2.6, 0.04, 0.05, { cast: false, contact: false });

    // ——————————————————— fenêtre : dormant, ouvrants, appui, extérieur lumineux
    const win = new Group(); win.position.set(-2.85, 0, 0); scene.add(win);
    const fw = 0.06; const fz0 = W0; const fz1 = W1; const midZ = (fz0 + fz1) / 2;
    const bar = (len, axis, x, y, z, th = fw) => {
      const g = axis === 'y' ? new BoxGeometry(0.07, len, th) : new BoxGeometry(0.07, th, len);
      return put(win, g, M.frame, x, y, z, { contact: false });
    };
    bar(Y1 - Y0, 'y', 0.02, (Y0 + Y1) / 2, fz0 + fw / 2); bar(Y1 - Y0, 'y', 0.02, (Y0 + Y1) / 2, fz1 - fw / 2); bar(Y1 - Y0, 'y', 0.02, (Y0 + Y1) / 2, midZ, 0.045);
    bar(fz1 - fz0, 'z', 0.02, Y1 - fw / 2, midZ); bar(fz1 - fz0, 'z', 0.02, Y0 + fw / 2, midZ); bar(fz1 - fz0, 'z', 0.02, 1.95, midZ, 0.035);
    put(win, new BoxGeometry(0.3, 0.035, fz1 - fz0 + 0.12), M.trim, 0.13, Y0 - 0.015, midZ, { contact: false });
    const out = put(win, new PlaneGeometry(4.2, 3.4), M.outside, -1.6, 1.55, midZ, { cast: false, receive: false, contact: false });
    out.rotation.y = Math.PI / 2;

    // voilage : deux panneaux plissés, tirés de part et d'autre
    const curtainGeo = (w, h, gather, seed) => {
      const g = new PlaneGeometry(w, h, 90, 30); const p = g.attributes.position; const { n } = makeNoise(seed);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i); const y = p.getY(i); const t = (y + h / 2) / h;
        const amp = 0.028 + 0.012 * (1 - t);
        p.setZ(i, Math.sin(x * gather) * amp + (n(x * 8, y * 2, 999, 999) - 0.5) * 0.01);
      }
      g.computeVertexNormals(); return g;
    };
    for (const [zc, wdt, seed] of [[fz0 + 0.22, 0.55, 3], [fz1 - 0.2, 0.5, 4]]) {
      const c = put(win, curtainGeo(wdt, 2.35, 42, seed), M.curtain, 0.32, 1.37, zc, { cast: false, contact: false });
      c.rotation.y = Math.PI / 2;
    }
    put(win, new CylinderGeometry(0.012, 0.012, fz1 - fz0 + 0.6, 12), M.brass, 0.33, 2.6, midZ, { contact: false }).rotation.x = Math.PI / 2;

    // ——————————————————— tapis
    const rug = put(scene, softBox(2.7, 0.012, 1.95, 0.005, { density: high ? 70 : 40, min: 2 }), M.rug, TABLE.x - 0.05, 0.006, TABLE.z + 0.02, { cast: false, contact: false });
    rugUV(rug.geometry, 2.7, 1.95); this._rug = rug;

    // ——————————————————— TABLE DE MASSAGE PLIANTE
    const table = new Group(); table.position.set(TABLE.x, 0, TABLE.z); scene.add(table);
    const half = TABLE.len / 2; const hw = TABLE.wid / 2;
    const cushionH = 0.058; const boardY = TABLE.top - cushionH - 0.006;
    for (const sx of [-1, 1]) {
      // coussin rembourré + passepoil
      const cushion = put(table, softBox(half - 0.004, cushionH, TABLE.wid, 0.026, { dome: 0.006, bulge: 0.003, density: 70 }), M.leather, sx * (half / 2 + 0.002), TABLE.top - cushionH / 2, 0);
      cushion.userData.part = 'cushion';
      const pip = put(table, pipingRect(half - 0.006, TABLE.wid - 0.002, 0.03, 0.0035), M.leather, sx * (half / 2 + 0.002), TABLE.top - cushionH + 0.006, 0, { cast: false });
      void pip;
      // plateau contreplaqué
      put(table, new BoxGeometry(half - 0.012, 0.012, TABLE.wid - 0.01), M.oakH, sx * (half / 2 + 0.002), boardY, 0);
      // ceinture (cadre bois)
      const apronH = 0.075; const ay = boardY - 0.006 - apronH / 2;
      for (const sz of [-1, 1]) put(table, softBox(half - 0.04, apronH, 0.022, 0.004, { density: 30, min: 2 }), M.oakH, sx * (half / 2 + 0.002), ay, sz * (hw - 0.03));
      put(table, softBox(0.022, apronH, TABLE.wid - 0.06, 0.004, { density: 30, min: 2 }), M.oakV, sx * (half - 0.03), ay, 0);
      // pieds télescopiques + molette laiton + patins
      const lx = sx * (half - 0.11);
      for (const sz of [-1, 1]) {
        const lz = sz * (hw - 0.065);
        put(table, softBox(0.046, 0.25, 0.05, 0.008, { density: 40, min: 2 }), M.oakV, lx, ay - apronH / 2 - 0.125 + 0.01, lz);
        put(table, softBox(0.036, 0.36, 0.04, 0.007, { density: 40, min: 2 }), M.oakV, lx, 0.2, lz);
        put(table, new CylinderGeometry(0.024, 0.026, 0.004, 24), M.steel, lx, 0.381, lz);
        const knob = put(table, lathe([[0, 0], [0.016, 0], [0.019, 0.004], [0.019, 0.012], [0.012, 0.016], [0.006, 0.026], [0.0001, 0.026]], 24), M.brass, lx, 0.43, lz + sz * 0.026);
        knob.rotation.x = sz * Math.PI / 2;
        put(table, lathe([[0, 0], [0.024, 0], [0.026, 0.006], [0.022, 0.022], [0.0001, 0.022]], 24), M.rubber, lx, 0, lz);
        // câble de sécurité (ceinture → pied)
        const a = new Vector3(sx * 0.06, ay - apronH / 2 + 0.005, sz * (hw - 0.035)); const b = new Vector3(lx, 0.27, lz);
        const cab = new TubeGeometry(new CatmullRomCurve3([a, a.clone().lerp(b, 0.5).add(new Vector3(0, -0.004, 0)), b]), 24, 0.0022, 6);
        put(table, cab, M.cable, 0, 0, 0, { cast: false });
        put(table, new CylinderGeometry(0.006, 0.006, 0.012, 12), M.steel, b.x, b.y, b.z).rotation.z = Math.PI / 2;
      }
      // traverse entre les pieds
      put(table, softBox(0.03, 0.04, TABLE.wid - 0.15, 0.006, { density: 30, min: 2 }), M.oakV, lx, 0.14, 0);
    }
    // charnières centrales
    for (const sz of [-1, 1]) { put(table, softBox(0.07, 0.034, 0.004, 0.0015, { density: 200, min: 2 }), M.steel, 0, boardY - 0.04, sz * (hw - 0.0185)); for (const dx of [-0.022, 0, 0.022]) put(table, new CylinderGeometry(0.0035, 0.0035, 0.003, 12), M.steel, dx, boardY - 0.04, sz * (hw - 0.016)).rotation.x = Math.PI / 2; }
    // têtière : bras chromés, plateau, coussin en croissant
    const cradle = new Group(); cradle.position.set(half + 0.16, 0, 0); table.add(cradle);
    for (const sz of [-1, 1]) {
      const rod = new TubeGeometry(new CatmullRomCurve3([new Vector3(-0.2, boardY - 0.03, sz * 0.09), new Vector3(-0.1, boardY - 0.02, sz * 0.09), new Vector3(-0.02, TABLE.top - 0.045, sz * 0.09)]), 20, 0.008, 10);
      put(cradle, rod, M.steel, 0, 0, 0);
    }
    put(cradle, softBox(0.16, 0.012, 0.2, 0.005, { density: 40, min: 2 }), M.steel, 0.04, TABLE.top - 0.044, 0);
    const crescent = put(cradle, crescentCushion(0.165, 0.08, 0.06), M.leather, 0.03, TABLE.top - 0.038, 0);
    crescent.rotation.y = -Math.PI / 2;

    // drap posé sur le plateau (plis aux retombées)
    const sheet = put(table, drapedSheet(TABLE.len + 0.01, TABLE.wid + 0.008, 0.115, { R: 0.03, folds: 0.012, seed: 7, seg: high ? 320 : 150, gather: 0.9, creases: [-0.46, 0, 0.46] }), M.sheet, 0, TABLE.top + 0.0075, 0);
    sheet.userData.part = 'sheet';

    // linge : serviette de bain pliée (pied), serviette de main, traversin, serviette roulée (tête)
    put(table, softBox(0.4, 0.045, 0.56, 0.02, { dome: 0.006, bulge: 0.004, sag: 0.002, density: 70 }), M.towelRose, -half + 0.26, TABLE.top + 0.033, 0.0);
    put(table, softBox(0.3, 0.03, 0.4, 0.014, { dome: 0.004, bulge: 0.003, density: 80 }), M.towelIvory, -half + 0.28, TABLE.top + 0.07, 0.02).rotation.y = 0.06;
    const bol = put(table, bolster(0.075, 0.6), M.cotton, -0.3, TABLE.top + 0.083, 0);
    bol.rotation.y = Math.PI / 2;

    // ——————————————————— guéridon : huiles, bol, serviettes, bougie
    const side = new Group(); side.position.set(1.36, 0, 0.12); scene.add(side);
    const topY = 0.54;
    put(side, boxUV(lathe([[0.0001, 0], [0.23, 0], [0.235, 0.006], [0.235, 0.024], [0.228, 0.03], [0.0001, 0.03]], 64)), M.oakH, 0, topY - 0.03, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.3; const leg = put(side, lathe([[0.012, 0], [0.016, 0.25], [0.02, topY - 0.04], [0.0001, topY - 0.04]], 16), M.oakV, Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15);
      leg.rotation.z = Math.cos(a) * 0.06; leg.rotation.x = -Math.sin(a) * 0.06;
    }
    // flacon ambré à pompe
    const bottle = new Group(); bottle.position.set(-0.07, topY, -0.06); side.add(bottle);
    put(bottle, lathe([[0.0001, 0], [0.032, 0], [0.034, 0.004], [0.034, 0.105], [0.03, 0.118], [0.013, 0.13], [0.013, 0.142], [0.0001, 0.142]], 48), M.amber, 0, 0, 0);
    put(bottle, lathe([[0.0001, 0.006], [0.029, 0.006], [0.029, 0.085], [0.0001, 0.085]], 32), M.oil, 0, 0, 0, { cast: false });
    put(bottle, lathe([[0.0001, 0.138], [0.016, 0.138], [0.016, 0.158], [0.0001, 0.158]], 32), M.rubber, 0, 0, 0);
    put(bottle, new CylinderGeometry(0.005, 0.005, 0.035, 12), M.rubber, 0, 0.175, 0);
    put(bottle, new BoxGeometry(0.05, 0.012, 0.016), M.rubber, 0.012, 0.196, 0);
    // petite fiole en verre (bouchon liège)
    const vial = new Group(); vial.position.set(0.03, topY, -0.11); side.add(vial);
    put(vial, lathe([[0.0001, 0], [0.02, 0], [0.021, 0.004], [0.021, 0.07], [0.009, 0.085], [0.009, 0.095], [0.0001, 0.095]], 40), M.glass, 0, 0, 0);
    put(vial, lathe([[0.0001, 0.004], [0.018, 0.004], [0.018, 0.05], [0.0001, 0.05]], 32), M.oil, 0, 0, 0, { cast: false });
    put(vial, new CylinderGeometry(0.0085, 0.0075, 0.02, 16), new MeshStandardMaterial({ color: '#B88D62', roughness: 0.95 }), 0, 0.1, 0);
    // bol en grès
    put(side, lathe([[0.0001, 0], [0.04, 0], [0.07, 0.025], [0.078, 0.048], [0.073, 0.05], [0.064, 0.026], [0.036, 0.008], [0.0001, 0.008]], 48), M.stoneware, 0.09, topY, 0.06);
    // serviettes de main pliées
    put(side, softBox(0.2, 0.026, 0.14, 0.011, { dome: 0.003, bulge: 0.002, density: 90 }), M.towelIvory, -0.06, topY + 0.013, 0.1).rotation.y = 0.35;
    put(side, softBox(0.19, 0.024, 0.13, 0.01, { dome: 0.003, bulge: 0.002, density: 90 }), M.towelRose, -0.055, topY + 0.038, 0.095).rotation.y = 0.28;
    // bougie dans un verre
    const candle = new Group(); candle.position.set(0.1, topY, -0.06); side.add(candle);
    put(candle, lathe([[0.0001, 0], [0.034, 0], [0.036, 0.006], [0.036, 0.08], [0.033, 0.08], [0.033, 0.008], [0.0001, 0.008]], 40), M.glass, 0, 0, 0, { cast: false });
    put(candle, new CylinderGeometry(0.031, 0.031, 0.05, 32), M.wax, 0, 0.033, 0, { cast: false });
    put(candle, new CylinderGeometry(0.0012, 0.0012, 0.008, 6), M.wick, 0, 0.062, 0);
    const flame = put(candle, new SphereGeometry(0.0045, 12, 10), M.flame, 0, 0.071, 0, { cast: false, receive: false }); flame.scale.y = 2.1;
    const glow = new PointLight('#FFB772', 0.06, 1.2, 2); glow.position.set(1.36 + 0.1, topY + 0.08, 0.12 - 0.06); scene.add(glow);

    // ——————————————————— sac de transport de la table (posé contre le mur)
    const bag = new Group(); bag.position.set(1.75, 0, -2.22); bag.rotation.set(-0.16, -0.05, 0); scene.add(bag);
    put(bag, softBox(0.98, 0.7, 0.13, 0.05, { bulge: 0.012, density: 40 }), M.nylon, 0, 0.49, 0).rotation.z = Math.PI / 2;
    const zipper = put(bag, pipingRect(0.66, 0.94, 0.05, 0.0045), M.strap, 0, 0.49, 0.066, { cast: false });
    zipper.rotation.x = Math.PI / 2;
    for (const sx of [-0.12, 0.12]) {
      const handle = put(bag, new TorusGeometry(0.06, 0.009, 10, 24, Math.PI), M.strap, sx, 0.985, 0.01);
      handle.rotation.y = Math.PI / 2; handle.scale.set(1, 0.9, 1.4);
    }

    // ——————————————————— canapé de lin (angle, rappel du domicile)
    const sofa = new Group(); sofa.position.set(-1.66, 0, -1.98); scene.add(sofa);
    for (const sx of [-0.8, 0.8]) for (const sz of [-0.36, 0.36]) put(sofa, lathe([[0.02, 0], [0.024, 0.07], [0.0001, 0.07]], 16), M.oakV, sx, 0, sz);
    put(sofa, softBox(1.84, 0.2, 0.9, 0.05, { bulge: 0.005, density: 30 }), M.linen, 0, 0.17, 0);
    for (const sx of [-0.43, 0.43]) put(sofa, softBox(0.85, 0.15, 0.74, 0.06, { dome: 0.025, bulge: 0.01, density: 40 }), M.linen, sx, 0.345, 0.07);
    put(sofa, softBox(1.84, 0.46, 0.18, 0.06, { bulge: 0.008, density: 30 }), M.linen, 0, 0.5, -0.36);
    for (const sx of [-0.43, 0.43]) { const c = put(sofa, softBox(0.84, 0.44, 0.2, 0.08, { bulge: 0.02, density: 40 }), M.linen, sx, 0.62, -0.2); c.rotation.x = -0.17; }
    put(sofa, softBox(0.2, 0.56, 0.9, 0.07, { bulge: 0.01, density: 30 }), M.linen, 1.02, 0.35, 0);
    const pillow = put(sofa, softBox(0.44, 0.42, 0.14, 0.07, { bulge: 0.05, density: 50 }), M.linenRose, 0.62, 0.66, -0.1); pillow.rotation.set(-0.25, -0.35, 0.1);
    const throwBlanket = put(sofa, drapedSheet(0.5, 0.06, 0.32, { R: 0.03, folds: 0.012, seed: 12, seg: 60 }), M.cotton, -0.6, 0.73, -0.36);
    throwBlanket.rotation.y = 0.02;

    // ——————————————————— olivier en pot (près de la fenêtre : ombre portée filtrée)
    const plant = new Group(); plant.position.set(-2.28, 0, 0.82); scene.add(plant);
    put(plant, lathe([[0.0001, 0], [0.17, 0], [0.2, 0.05], [0.22, 0.36], [0.235, 0.4], [0.215, 0.405], [0.2, 0.37], [0.0001, 0.37]], 48), M.terracotta, 0, 0, 0);
    put(plant, new CylinderGeometry(0.2, 0.2, 0.01, 32), M.soil, 0, 0.365, 0, { cast: false });
    const trunkPts = [[0, 0.36, 0], [0.02, 0.6, 0.01], [-0.015, 0.85, 0.02], [0.02, 1.05, -0.01], [0.0, 1.2, 0.0]].map((p) => new Vector3(...p));
    put(plant, new TubeGeometry(new CatmullRomCurve3(trunkPts), 30, 0.022, 8), M.bark, 0, 0, 0);
    const branches = [];
    const { r } = makeNoise(17);
    for (let b = 0; b < 7; b++) {
      const a = b * 2.4; const y0 = 0.8 + b * 0.06; const len = 0.32 + r() * 0.2;
      const p0 = new Vector3(0, y0, 0); const p1 = new Vector3(Math.cos(a) * len * 0.5, y0 + 0.12, Math.sin(a) * len * 0.5); const p2 = new Vector3(Math.cos(a) * len, y0 + 0.28 + r() * 0.1, Math.sin(a) * len);
      const curve = new CatmullRomCurve3([p0, p1, p2]); branches.push(curve);
      put(plant, new TubeGeometry(curve, 12, 0.008, 6), M.bark, 0, 0, 0);
    }
    const leafCount = high ? 900 : 380; const leaves = new InstancedMesh(leafGeometry(0.06, 0.011), M.leaf, leafCount);
    leaves.castShadow = true; leaves.receiveShadow = true;
    const o = new Object3D();
    for (let i = 0; i < leafCount; i++) {
      const c = branches[i % branches.length]; const t = 0.25 + r() * 0.8; const p = c.getPointAt(Math.min(1, t));
      o.position.copy(p).add(new Vector3((r() - 0.5) * 0.18, (r() - 0.4) * 0.14, (r() - 0.5) * 0.18));
      o.rotation.set(r() * Math.PI * 2, r() * Math.PI * 2, r() * Math.PI * 2); o.scale.setScalar(0.8 + r() * 0.5); o.updateMatrix();
      leaves.setMatrixAt(i, o.matrix);
      const tint = new Color('#76845F').lerp(new Color('#A3AB8C'), r() * 0.6); leaves.setColorAt(i, tint);
    }
    plant.add(leaves);

    // ——————————————————— lumière : soleil filtré par la fenêtre + baie (lumière surfacique) + ciel
    const sun = new DirectionalLight('#FFDDB5', 4.6);
    sun.position.set(-8.2, 3.3, 1.2); sun.target.position.set(0.2, 0.3, -0.6);
    sun.castShadow = true; sun.shadow.mapSize.set(high ? 2048 : 1024, high ? 2048 : 1024);
    Object.assign(sun.shadow.camera, { left: -3.6, right: 3.6, top: 3.2, bottom: -3.2, near: 1, far: 16 }); sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.015; sun.shadow.radius = 5; sun.shadow.blurSamples = 16;
    scene.add(sun, sun.target);
    const area = new RectAreaLight('#FFF2E4', 2.6, 1.9, 1.95); area.position.set(-2.7, 1.52, (W0 + W1) / 2); area.lookAt(0, 1.0, (W0 + W1) / 2); scene.add(area);
    scene.add(new HemisphereLight('#FFF7EE', '#B8988A', 0.4));
    // plafond (invisible à la caméra) : empêche le soleil d'entrer par le haut
    const ceil = put(scene, new BoxGeometry(7.4, 0.1, 6.6), M.trim, -0.2, 3.05, -0.6, { cast: true, receive: false, contact: false }); ceil.material = new MeshStandardMaterial({ color: '#ffffff', colorWrite: false }); ceil.userData.contact = false;
    const bounce = new DirectionalLight('#F4DCCD', 0.35); bounce.position.set(4, 3, 5); scene.add(bounce);
  },
};

// UV du tapis : 0..1 sur le dessus (motif complet), bords sans importance
function rugUV(geo, w, d) {
  const p = geo.attributes.position; const uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getZ(i) / d + 0.5);
  uv.needsUpdate = true;
}

// Vue extérieure floue : ciel clair, feuillage lointain
function gardenTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 512); sky.addColorStop(0, '#FBF4EA'); sky.addColorStop(0.6, '#F7E9D8'); sky.addColorStop(1, '#EED8C0');
  g.fillStyle = sky; g.fillRect(0, 0, 512, 512);
  g.filter = 'blur(14px)';
  const { r } = makeNoise(77);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(${120 + r() * 40},${135 + r() * 30},${100 + r() * 25},${0.25 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * 512, 260 + r() * 240, 30 + r() * 60, 20 + r() * 50, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = 'rgba(230,205,180,.6)'; g.fillRect(0, 430, 512, 82);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}
