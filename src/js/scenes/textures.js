// Escale Spa — textures procédurales (aucune ressource externe).
// Chaque fonction renvoie { map, normalMap, roughnessMap? } tuilables, générés sur canvas.
import { CanvasTexture, SRGBColorSpace, NoColorSpace, RepeatWrapping, LinearMipmapLinearFilter } from 'three';

// ———————————————————————— bruit tuilable (valeur + fbm)
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export function makeNoise(seed = 1) {
  const r = rng(seed); const P = new Uint8Array(512);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  const h = (x, y) => P[P[x & 255] + (y & 255)] / 255;
  const s = (t) => t * t * (3 - 2 * t);
  // bruit de valeur périodique (période px, py en cellules)
  const n = (x, y, px = 256, py = 256) => {
    const xi = Math.floor(x); const yi = Math.floor(y); const xf = x - xi; const yf = y - yi;
    const x0 = ((xi % px) + px) % px; const y0 = ((yi % py) + py) % py; const x1 = (x0 + 1) % px; const y1 = (y0 + 1) % py;
    const a = h(x0, y0); const b = h(x1, y0); const c = h(x0, y1); const d = h(x1, y1);
    const u = s(xf); const v = s(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y, oct = 4, px = 8, py = 8) => {
    let sum = 0; let amp = 0.5; let f = 1; let norm = 0;
    for (let o = 0; o < oct; o++) { sum += amp * n(x * f, y * f, px * f, py * f); norm += amp; amp *= 0.5; f *= 2; }
    return sum / norm;
  };
  return { n, fbm, r };
}

// ———————————————————————— utilitaires canvas
function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function toTex(c, srgb, repeat = [1, 1]) {
  const t = new CanvasTexture(c);
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(...repeat);
  t.minFilter = LinearMipmapLinearFilter; t.anisotropy = 8;
  return t;
}
// carte de hauteur (Float32Array) → carte de normales tuilable
function heightToNormal(H, w, h, strength = 2) {
  const c = canvas(w, h); const g = c.getContext('2d'); const img = g.createImageData(w, h); const d = img.data;
  const at = (x, y) => H[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0); return c;
}
function grayCanvas(V, w, h) {
  const c = canvas(w, h); const g = c.getContext('2d'); const img = g.createImageData(w, h); const d = img.data;
  for (let i = 0; i < w * h; i++) { const v = Math.max(0, Math.min(255, V[i] * 255)); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0); return c;
}
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const mix = (a, b, t) => a + (b - a) * t;

// ———————————————————————— tissage (coton, lin) : relief de fils croisés
export function weave({ size = 256, threads = 32, seed = 3, slub = 0.35, strength = 3, repeat = [1, 1] } = {}) {
  const { n, fbm } = makeNoise(seed);
  const H = new Float32Array(size * size);
  const tw = size / threads;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / tw; const v = y / tw;
      const cu = Math.floor(u); const cv = Math.floor(v);
      const warpUp = (cu + cv) % 2 === 0; // armure toile
      const fu = u - cu; const fv = v - cv;
      const warp = Math.sin(fu * Math.PI); const weft = Math.sin(fv * Math.PI);
      // irrégularités des fils (« slub »)
      const s1 = 1 + slub * (n(cu * 0.7, v * 0.25, threads, threads) - 0.5);
      const s2 = 1 + slub * (n(u * 0.25, cv * 0.7 + 50, threads, threads) - 0.5);
      let hgt = warpUp ? 0.55 * warp * s1 + 0.35 * weft * s2 * (1 - warp * 0.5) : 0.55 * weft * s2 + 0.35 * warp * s1 * (1 - weft * 0.5);
      hgt += 0.08 * fbm(x / size * 16, y / size * 16, 3, 16, 16);
      H[y * size + x] = hgt;
    }
  }
  return { normalMap: toTex(heightToNormal(H, size, size, strength), false, repeat) };
}

// ———————————————————————— éponge (bouclettes)
export function terry({ size = 256, seed = 9, strength = 2.2, repeat = [1, 1] } = {}) {
  const { n } = makeNoise(seed);
  const H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const a = n(x / 3, y / 3, size / 3, size / 3); const b = n(x / 7 + 30, y / 7, size / 7, size / 7);
    H[y * size + x] = Math.pow(a, 1.6) * 0.75 + b * 0.25;
  }
  return { normalMap: toTex(heightToNormal(H, size, size, strength), false, repeat) };
}

// ———————————————————————— similicuir (grain fin) + rugosité
export function leatherette({ size = 256, seed = 5, strength = 1.2, repeat = [1, 1] } = {}) {
  const { n, fbm } = makeNoise(seed);
  const H = new Float32Array(size * size); const R = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const c = n(x / 4, y / 4, size / 4, size / 4); const c2 = n(x / 2.2 + 9, y / 2.2, Math.round(size / 2.2), Math.round(size / 2.2));
    const v = Math.abs(c - 0.5) * 1.4 + c2 * 0.3;
    H[y * size + x] = v;
    R[y * size + x] = 0.5 + 0.12 * fbm(x / size * 6, y / size * 6, 3, 6, 6) - v * 0.08;
  }
  return { normalMap: toTex(heightToNormal(H, size, size, strength), false, repeat), roughnessMap: toTex(grayCanvas(R, size, size), false, repeat) };
}

// ———————————————————————— enduit à la chaux
export function plaster({ size = 512, seed = 11, color = '#EADBCB', repeat = [1, 1] } = {}) {
  const { fbm } = makeNoise(seed);
  const C = canvas(size); const g = C.getContext('2d'); const img = g.createImageData(size, size); const d = img.data;
  const H = new Float32Array(size * size); const base = hex(color);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const lo = fbm(x / size * 4, y / size * 4, 5, 4, 4); const hi = fbm(x / size * 32, y / size * 32, 2, 32, 32);
    const v = lo * 0.8 + hi * 0.2; H[y * size + x] = v;
    const k = (v - 0.5) * 22; const i = (y * size + x) * 4;
    d[i] = base[0] + k; d[i + 1] = base[1] + k * 0.95; d[i + 2] = base[2] + k * 0.85; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return { map: toTex(C, true, repeat), normalMap: toTex(heightToNormal(H, size, size, 1.6), false, repeat) };
}

// ———————————————————————— grain de bois (chêne) : bandes ondulées + pores
function oakGrainCanvas(w, h, seed, tone = 0) {
  const { n, fbm, r } = makeNoise(seed);
  const C = canvas(w, h); const g = C.getContext('2d'); const img = g.createImageData(w, h); const d = img.data;
  const light = hex('#D2B08C'); const dark = hex('#A9835E');
  const H = new Float32Array(w * h);
  const off = r() * 100;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const warp = fbm(x / w * 3 + off, y / h * 0.8, 4, 64, 64) * 9;
    const ring = 0.5 + 0.5 * Math.sin((y / h * 26 + warp) * Math.PI);
    const fine = n(x / 1.5, y / 0.8 + off * 7, 4096, 4096);
    const t = Math.pow(ring, 2.6) * 0.42 + fine * 0.14 + fbm(x / w * 2, y / h * 6, 3, 64, 64) * 0.22 + tone;
    const i = (y * w + x) * 4;
    d[i] = mix(light[0], dark[0], t); d[i + 1] = mix(light[1], dark[1], t); d[i + 2] = mix(light[2], dark[2], t); d[i + 3] = 255;
    H[y * w + x] = 1 - t * 0.4 - (fine > 0.82 ? 0.25 : 0);
  }
  g.putImageData(img, 0, 0);
  return { C, H };
}
export function oak({ w = 512, h = 128, seed = 21, repeat = [1, 1], tone = 0 } = {}) {
  const { C, H } = oakGrainCanvas(w, h, seed, tone);
  return { map: toTex(C, true, repeat), normalMap: toTex(heightToNormal(H, w, h, 1.2), false, repeat) };
}

// ———————————————————————— parquet en chevrons (chêne huilé)
// Planches L = 4·l, tuile carrée périodique de côté 8·l.
export function herringbone({ size = 1024, seed = 31, repeat = [1, 1] } = {}) {
  const l = size / 8; const L = 4 * l; const gap = Math.max(1.5, size / 520);
  const C = canvas(size); const g = C.getContext('2d');
  const HC = canvas(size); const hg = HC.getContext('2d');
  const R = canvas(size); const rg = R.getContext('2d');
  g.fillStyle = '#6E5038'; g.fillRect(0, 0, size, size);
  hg.fillStyle = '#000'; hg.fillRect(0, 0, size, size);
  rg.fillStyle = '#888'; rg.fillRect(0, 0, size, size);
  const strips = []; for (let k = 0; k < 8; k++) strips.push(oakGrainCanvas(Math.round(L), Math.round(l), seed + k * 13, (k % 3) * 0.06 - 0.04).C);
  const { r } = makeNoise(seed);
  const tones = [...Array(16)].map(() => r());
  const plank = (x, y, horiz, key) => {
    const src = strips[key % 8];
    const draw = (ctx, fn) => { ctx.save(); ctx.translate(x, y); if (!horiz) { ctx.translate(l, 0); ctx.rotate(Math.PI / 2); } fn(ctx); ctx.restore(); };
    draw(g, (ctx) => { ctx.drawImage(src, gap, gap, L - gap * 2, l - gap * 2); ctx.fillStyle = `rgba(255,240,220,${tones[key] * 0.08})`; ctx.fillRect(gap, gap, L - gap * 2, l - gap * 2); });
    draw(hg, (ctx) => { ctx.fillStyle = '#fff'; ctx.fillRect(gap, gap, L - gap * 2, l - gap * 2); });
    draw(rg, (ctx) => { const v = 110 + tones[key] * 50; ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(gap, gap, L - gap * 2, l - gap * 2); });
  };
  for (let i = -12; i <= 16; i++) for (let j = -6; j <= 6; j++) {
    const ox = i * l + j * L; const oy = i * l - j * L;
    if (ox < -2 * L || ox > size + L || oy < -2 * L || oy > size + L) continue;
    const key = (((i - 4 * j) % 8) + 8) % 8;
    plank(ox, oy, true, key);
    plank(ox + L, oy + l - L, false, key + 8);
  }
  // relief : chanfreins + grain
  const { fbm } = makeNoise(seed + 1);
  const id = hg.getImageData(0, 0, size, size).data; const H = new Float32Array(size * size);
  const cd = g.getImageData(0, 0, size, size).data;
  for (let k = 0; k < size * size; k++) H[k] = id[k * 4] / 255 * 0.8 + (cd[k * 4] / 255) * 0.12;
  // assombrissement léger et non uniforme (patine)
  g.globalCompositeOperation = 'multiply';
  const img = g.getImageData(0, 0, size, size); const d = img.data;
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const v = 0.92 + 0.08 * fbm(x / size * 3, y / size * 3, 3, 3, 3); const i = (y * size + x) * 4;
    d[i] *= v; d[i + 1] *= v; d[i + 2] *= v;
  }
  g.globalCompositeOperation = 'source-over'; g.putImageData(img, 0, 0);
  return { map: toTex(C, true, repeat), normalMap: toTex(heightToNormal(H, size, size, 2.5), false, repeat), roughnessMap: toTex(R, false, repeat) };
}

// ———————————————————————— tapis de laine (velours ras, motif losanges discret)
export function woolRug({ w = 1024, h = 768, seed = 41 } = {}) {
  const { n, fbm } = makeNoise(seed);
  const C = canvas(w, h); const g = C.getContext('2d'); const img = g.createImageData(w, h); const d = img.data;
  const H = new Float32Array(w * h);
  const base = hex('#EFE4D4'); const ink = hex('#8E6A55');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const pile = n(x / 1.6, y / 1.6, 4096, 4096) * 0.6 + n(x / 4, y / 4, 4096, 4096) * 0.4;
    // losanges berbères : |dx|+|dy| = rayon, lignes irrégulières
    const cx = ((x + 64) % 128) - 64; const cy = ((y + 64) % 128) - 64;
    const dist = Math.abs(Math.abs(cx) + Math.abs(cy) - 44 + (fbm(x / 60, y / 60, 3, 64, 64) - 0.5) * 8);
    const border = Math.min(x, y, w - x, h - y);
    let line = dist < 2.4 ? 1 - dist / 2.4 : 0;
    if (border > 26 && border < 31) line = Math.max(line, 0.9);
    line *= 0.55 + 0.45 * n(x / 3 + 7, y / 3, 4096, 4096);
    const i = (y * w + x) * 4; const shade = (pile - 0.5) * 18;
    for (let k = 0; k < 3; k++) d[i + k] = mix(base[k], ink[k], line) + shade;
    d[i + 3] = 255;
    H[y * w + x] = pile * 0.9 - line * 0.15;
  }
  g.putImageData(img, 0, 0);
  return { map: toTex(C, true), normalMap: toTex(heightToNormal(H, w, h, 2.4), false) };
}
