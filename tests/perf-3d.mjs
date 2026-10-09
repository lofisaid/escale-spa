// Évaluation séparée de l'expérience 3D (après interaction).
// Mesures : poids du module, temps d'ouverture, longues tâches, mémoire JS avant/après fermeture.
// Limite : l'environnement de test n'a pas de GPU (WebGL logiciel SwiftShader) — les durées
// et cadences sont donc très pessimistes par rapport à un téléphone récent.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4197; const BASE = `http://localhost:${PORT}`;
const server = spawn(process.execPath, [path.join(ROOT, 'scripts/serve.mjs'), '--port', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const jsDir = path.join(ROOT, 'dist/assets/js');
const sceneFile = (await fs.readdir(jsDir)).find((f) => /^scene-.*\.js$/.test(f));
const mainFile = (await fs.readdir(jsDir)).find((f) => /^main-.*\.js$/.test(f));
const raw = await fs.readFile(path.join(jsDir, sceneFile));
const mainRaw = await fs.readFile(path.join(jsDir, mainFile));
const out = { sceneModule: { file: sceneFile, kb: Math.round(raw.length / 1024), gzipKb: Math.round(zlib.gzipSync(raw).length / 1024) }, mainModule: { kb: Math.round(mainRaw.length / 1024), gzipKb: Math.round(zlib.gzipSync(mainRaw).length / 1024) }, runs: [] };

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc'] });
for (const prof of [{ name: 'ordinateur 1440', vp: { width: 1440, height: 900 }, cpu: 1 }, { name: 'mobile 390 (CPU ×4)', vp: { width: 390, height: 844 }, cpu: 4, mobile: true }]) {
  const ctx = await browser.newContext({ viewport: prof.vp, isMobile: !!prof.mobile, hasTouch: !!prof.mobile, deviceScaleFactor: prof.mobile ? 2 : 1 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  if (prof.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: prof.cpu });
  await page.goto(`${BASE}/fr/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { window.__long = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ type: 'longtask', buffered: false }); });
  const heap = async () => { await page.evaluate(() => window.gc && window.gc()); const m = await cdp.send('Performance.getMetrics'); return Math.round(m.metrics.find((x) => x.name === 'JSHeapUsedSize').value / 1048576 * 10) / 10; };
  const h0 = await heap();
  await page.locator('[data-scene-section]').scrollIntoViewIfNeeded();
  const t0 = Date.now();
  await page.click('[data-scene-open]');
  await page.waitForSelector('[data-scene-close]:visible', { timeout: 120000 });
  const openMs = Date.now() - t0;
  const f0 = await page.evaluate(() => new Promise((r) => { let n = 0; const s = performance.now(); const tick = () => { n++; if (performance.now() - s < 2000) requestAnimationFrame(tick); else r(n / 2); }; requestAnimationFrame(tick); }));
  const h1 = await heap();
  const longs = await page.evaluate(() => window.__long);
  await page.click('[data-scene-close]');
  await page.waitForTimeout(500);
  const h2 = await heap();
  const canvases = await page.$$eval('canvas', (c) => c.length);
  for (let i = 0; i < 4; i++) { await page.click('[data-scene-open]'); await page.waitForSelector('[data-scene-close]:visible', { timeout: 120000 }); await page.click('[data-scene-close]'); await page.waitForTimeout(300); }
  const h3 = await heap();
  out.runs.push({ profil: prof.name, ouvertureMs: openMs, imagesParSeconde: Math.round(f0), longuesTaches: longs.length, plusLongueTacheMs: Math.round(Math.max(0, ...longs)), heapAvantMo: h0, heapOuvertMo: h1, heapApresFermetureMo: h2, heapApres5CyclesMo: h3, canvasApresFermeture: canvases });
  await ctx.close();
}
await browser.close(); server.kill();
await fs.mkdir(path.join(ROOT, 'reports'), { recursive: true });
await fs.writeFile(path.join(ROOT, 'reports/perf-3d.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
