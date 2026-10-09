// Rendus fixes d'une scène 3D : node scripts/render-scene.mjs massage [vue…]
// Sortie : reports/3d/<scène>-<vue>.png (rendu « ordinateur » : AO, ombres, transmission).
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = process.argv[2] || 'massage';
const only = process.argv.slice(3);
const OUT = path.join(ROOT, process.env.OUT || 'reports/3d'); await fs.mkdir(OUT, { recursive: true });
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'es-scene-'));
await fs.writeFile(path.join(tmp, 'entry.js'), `import { createStage } from '${path.join(ROOT, 'src/js/scenes/core.js')}';
import def from '${path.join(ROOT, `src/js/scenes/${id}.js`)}';
window.def = def;
window.go = async (view, tier) => {
  if (new URLSearchParams(location.search).has('noao')) def.ao = false;
  const t0 = performance.now();
  const s = await createStage(document.getElementById('c'), def, { still: true, view, tier, hotspots: false, pixelRatio: 1 });
  console.warn('stage ms', Math.round(performance.now() - t0));
  s.render(); await new Promise((r) => setTimeout(r, 300)); s.render();
  return true;
};`);
await esbuild.build({ entryPoints: [path.join(tmp, 'entry.js')], bundle: true, format: 'esm', outfile: path.join(tmp, 'bundle.js'), logLevel: 'warning', absWorkingDir: ROOT, nodePaths: [path.join(ROOT, 'node_modules')] });
await fs.writeFile(path.join(tmp, 'index.html'), `<!doctype html><html><body style="margin:0;background:#000"><div id="c" style="width:100vw;height:100vh;position:relative"></div><script type="module" src="bundle.js"></script></body></html>`);
const server = http.createServer(async (req, res) => { const p = path.join(tmp, new URL(req.url, 'http://x').pathname); try { const b = await fs.readFile(p); res.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(b); } catch { res.writeHead(404); res.end(); } }).listen(0);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const sizes = { overview: [1600, 1000], side: [1600, 900], detail: [1400, 1050] };
const tier = process.env.TIER || 'high';
const page0 = await browser.newPage(); await page0.goto(`http://127.0.0.1:${server.address().port}/index.html`); await page0.waitForFunction(() => window.def);
const views = only.length ? only : await page0.evaluate(() => Object.keys(window.def.views)); await page0.close();
for (const v of views) {
  const [w, h] = sizes[v] || [1600, 1000];
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/parallel_shader/.test(m.text())) console.log(`  [${v}] ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => console.log(`  [${v}] pageerror: ${e.message}`));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?${process.env.NOAO ? 'noao&' : ''}${process.env.DBGC ? 'dbgc&' : ''}${process.env.DBG ? 'dbg' : ''}${process.env.DBG2 ? 'dbg2' : ''}`);
  await page.waitForFunction(() => window.go);
  const t0 = Date.now();
  await page.evaluate(([vv, t]) => window.go(vv, t), [v, tier]);
  await page.screenshot({ path: path.join(OUT, `${id}-${v}${tier === 'low' ? '-mobile' : ''}.png`), timeout: 180000, animations: 'disabled', caret: 'initial' });
  const cp = await page.evaluate(() => window.contactPng); if (cp) await fs.writeFile(path.join(OUT, `${id}-contact.png`), Buffer.from(cp.split(',')[1], 'base64'));
  console.log(`✔ ${id}-${v} (${Date.now() - t0} ms)`);
  await page.close();
}
await browser.close(); server.close();
