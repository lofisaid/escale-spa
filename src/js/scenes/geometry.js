// Escale Spa — géométries « douces » (rembourrages, drapés, profils tournés).
import { BoxGeometry, BufferGeometry, Float32BufferAttribute, PlaneGeometry, LatheGeometry, Vector2, Vector3, Shape, ExtrudeGeometry, CatmullRomCurve3, TubeGeometry } from 'three';
import { makeNoise } from './textures.js';

// Normales lissées par position (évite les coutures entre faces d'une boîte subdivisée)
export function smoothNormals(geo) {
  const pos = geo.attributes.position; const idx = geo.index;
  const acc = new Map(); const key = (i) => `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
  const a = new Vector3(); const b = new Vector3(); const c = new Vector3(); const n = new Vector3();
  const tri = (i0, i1, i2) => {
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    n.subVectors(c, b).cross(a.clone().sub(b)); // pondéré par l'aire
    for (const i of [i0, i1, i2]) { const k = key(i); const v = acc.get(k) || acc.set(k, new Vector3()).get(k); v.add(n); }
  };
  if (idx) for (let i = 0; i < idx.count; i += 3) tri(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2));
  else for (let i = 0; i < pos.count; i += 3) tri(i, i + 1, i + 2);
  const nrm = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const v = acc.get(key(i)).clone().normalize(); nrm.set([v.x, v.y, v.z], i * 3); }
  geo.setAttribute('normal', new Float32BufferAttribute(nrm, 3));
  return geo;
}

// UV « boîte » en mètres, selon l'axe dominant de la normale (textures à l'échelle réelle)
export function boxUV(geo, scale = 1) {
  const p = geo.attributes.position; const nr = geo.attributes.normal; const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(nr.getX(i)); const ay = Math.abs(nr.getY(i)); const az = Math.abs(nr.getZ(i));
    let u; let v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); } else if (ax >= az) { u = p.getZ(i); v = p.getY(i); } else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u * scale; uv[i * 2 + 1] = v * scale;
  }
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return geo;
}

/**
 * Boîte rembourrée : arêtes arrondies de rayon r, dessus bombé (dome), flancs gonflés (bulge).
 * seg : densité de subdivision (par mètre). Utilisée pour coussins, plateaux, linge plié, housses.
 */
export function softBox(w, h, d, r, { dome = 0, bulge = 0, sag = 0, density = 60, min = 4 } = {}) {
  const nx = Math.max(min, Math.round(w * density)); const ny = Math.max(min, Math.round(h * density)); const nz = Math.max(min, Math.round(d * density));
  const geo = new BoxGeometry(w, h, d, nx, ny, nz);
  const p = geo.attributes.position; const hw = w / 2; const hh = h / 2; const hd = d / 2;
  const rr = Math.min(r, hw, hh, hd);
  const v = new Vector3(); const inner = new Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    inner.set(Math.max(-hw + rr, Math.min(hw - rr, v.x)), Math.max(-hh + rr, Math.min(hh - rr, v.y)), Math.max(-hd + rr, Math.min(hd - rr, v.z)));
    const dir = v.clone().sub(inner); const len = dir.length();
    if (len > 1e-6) v.copy(inner).add(dir.multiplyScalar(rr / len));
    const fx = 1 - Math.pow(Math.min(1, Math.abs(v.x) / hw), 3); const fz = 1 - Math.pow(Math.min(1, Math.abs(v.z) / hd), 3);
    const ty = (v.y + hh) / h; // 0 en bas, 1 en haut
    if (dome) v.y += dome * fx * fz * Math.max(0, ty * 2 - 1) ** 0.5;
    if (sag) v.y -= sag * fx * fz * ty;
    if (bulge) { const sy = 1 - Math.pow((ty - 0.5) * 2, 2); v.x *= 1 + (bulge / hw) * sy * fz; v.z *= 1 + (bulge / hd) * sy * fx; }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  smoothNormals(geo);
  boxUV(geo);
  return geo;
}

/**
 * Drap posé sur un plateau w × d (centré, dessus à y = 0) et retombant de `hang` sur les côtés,
 * avec arrondi de rayon R sur l'arête et plis naturels. UV = coordonnées du tissu à plat (m).
 */
export function drapedSheet(w, d, hang, { R = 0.03, folds = 0.012, seed = 2, seg = 160, gather = 1, creases = [] } = {}) {
  const W = w + 2 * hang; const D = d + 2 * hang;
  const geo = new PlaneGeometry(W, D, seg, Math.round(seg * D / W));
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position; const uv = geo.attributes.uv; const { n } = makeNoise(seed);
  const hw = w / 2; const hd = d / 2; const arc = (Math.PI / 2) * R;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i); const z = p.getZ(i);
    uv.setXY(i, (x + W / 2), (z + D / 2));
    const cx = Math.max(-hw, Math.min(hw, x)); const cz = Math.max(-hd, Math.min(hd, z));
    const dx = x - cx; const dz = z - cz; const t = Math.hypot(dx, dz);
    if (t < 1e-6) {
      // dessus : ondulations très légères + plis de pliage (repassage) en travers
      let y0 = 0.0018 * (n(x * 6 + 3, z * 6, 999, 999) - 0.5) + 0.0007 * (n(x * 22, z * 22 + 5, 999, 999) - 0.5);
      for (const c of creases) y0 += 0.0012 * Math.exp(-Math.pow((x - c) / 0.008, 2)) - 0.0006 * Math.exp(-Math.pow((x - c - 0.012) / 0.01, 2));
      p.setXYZ(i, x, y0, z); continue;
    }
    const nx = dx / t; const nz = dz / t;
    let out; let y;
    if (t < arc) { const a = t / R; out = R * Math.sin(a); y = -(R - R * Math.cos(a)); } else { out = R; y = -R - (t - arc); }
    // plis : ondulations le long de l'arête, croissantes vers l'ourlet
    const along = Math.abs(nx) > Math.abs(nz) ? z : x;
    const k = Math.min(1, Math.max(0, (t - arc) / (hang - arc)));
    const wave = Math.sin(along * 34 * gather + n(along * 5, 3, 999, 999) * 5) * 0.75 + (n(along * 10, 8, 999, 999) - 0.5) * 0.4;
    out += folds * k * k * wave;
    // coins : le tissu s'évase et descend un peu plus
    const corner = Math.abs(dx) > 1e-6 && Math.abs(dz) > 1e-6 ? Math.min(1, Math.min(Math.abs(dx), Math.abs(dz)) / hang) : 0;
    y -= corner * 0.02 * k;
    p.setXYZ(i, cx + nx * out, y, cz + nz * out);
  }
  geo.computeVertexNormals();
  return geo;
}

// Profil tourné (vases, flacons, pieds) : points [[r, y], …]
export function lathe(points, seg = 48) { return new LatheGeometry(points.map(([r, y]) => new Vector2(Math.max(0.0001, r), y)), seg); }

// Traversin : cylindre aux extrémités arrondies, couché selon x
export function bolster(radius, length, seg = 40) {
  const pts = []; const cap = radius * 0.9;
  for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * (Math.PI / 2); pts.push([Math.cos(a) * radius * 0.92 + 0.0001, -length / 2 + cap + Math.sin(a) * cap]); }
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * (Math.PI / 2); pts.push([Math.cos(a) * radius * 0.92 + 0.0001, length / 2 - cap + Math.sin(a) * cap]); }
  // léger renflement central
  const g = lathe(pts.map(([r, y]) => [r * (1 + 0.06 * (1 - Math.pow(y / (length / 2), 2))), y]), seg);
  g.rotateZ(Math.PI / 2);
  return boxUV(g);
}

// Tube suivant un rectangle arrondi (passepoil des coussins), dans le plan xz à y = 0
export function pipingRect(w, d, r, radius = 0.004) {
  const pts = []; const hw = w / 2 - r; const hd = d / 2 - r;
  const corners = [[hw, hd, 0], [-hw, hd, Math.PI / 2], [-hw, -hd, Math.PI], [hw, -hd, Math.PI * 1.5]];
  for (const [cx, cz, a0] of corners) for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * (Math.PI / 2); pts.push(new Vector3(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r)); }
  return new TubeGeometry(new CatmullRomCurve3(pts, true, 'catmullrom', 0.2), 160, radius, 6, true);
}

// Têtière en croissant (vue de dessus), extrudée avec chanfrein arrondi
export function crescentCushion(outerR = 0.17, innerR = 0.09, thickness = 0.05) {
  const s = new Shape();
  s.absarc(0, 0, outerR, Math.PI * 0.05, Math.PI * 0.95, false);
  s.absarc(0, outerR * 0.18, innerR, Math.PI * 0.95, Math.PI * 0.05, true);
  const g = new ExtrudeGeometry(s, { depth: thickness - 0.024, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 6, curveSegments: 40 });
  g.rotateX(-Math.PI / 2); g.translate(0, 0.012, 0);
  return boxUV(g);
}

// Feuille d'olivier (lancéolée, légèrement courbée)
export function leafGeometry(len = 0.06, wid = 0.011) {
  const s = new Shape(); s.moveTo(0, 0);
  s.quadraticCurveTo(wid, len * 0.45, 0, len); s.quadraticCurveTo(-wid, len * 0.45, 0, 0);
  const g = new ExtrudeGeometry(s, { depth: 0.0006, bevelEnabled: false, curveSegments: 6 });
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) + Math.pow(y / len, 2) * 0.008 + Math.abs(p.getX(i)) * 0.25); }
  g.computeVertexNormals();
  return g;
}

export function bufferFrom(positions, normals) {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(positions, 3));
  if (normals) g.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  return g;
}
