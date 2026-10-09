// Génère les illustrations fixes (src/img/scene-*.png) à partir de la scène 3D.
// Usage : npm run stills  (nécessite Playwright + Chromium, WebGL logiciel accepté)
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'bd-stills-'));
await esbuild.build({ entryPoints: [path.join(ROOT, 'src/js/scene.js')], bundle: true, format: 'esm', outfile: path.join(tmp, 'scene.js'), logLevel: 'warning' });
await fs.writeFile(path.join(tmp, 'index.html'), `<!doctype html><html><body style="margin:0;background:#000">
<div id="c" style="width:var(--w);height:var(--h);position:relative"></div>
<script type="module">
import { createScene } from './scene.js';
const q = new URLSearchParams(location.search);
const el = document.getElementById('c');
el.style.setProperty('--w', q.get('w') + 'px'); el.style.setProperty('--h', q.get('h') + 'px');
window.ready = createScene(el, { still: true, view: q.get('view'), pixelRatio: 1, reducedMotion: true }).then(() => new Promise(r => setTimeout(r, 400)));
</script></body></html>`);

const server = http.createServer(async (req, res) => {
  const p = path.join(tmp, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  try { const b = await fs.readFile(p); res.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(b); } catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const shots = [
  ['scene-overview', 'overview', 1600, 1200],
  ['scene-massage', 'massages', 1200, 1440],
  ['scene-nails', 'ongles', 1200, 1440],
  ['scene-face', 'visage', 1200, 1440],
];
for (const [name, view, w, h] of shots) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`  [${name}] ${m.type()}: ${m.text()}`); });
  await page.goto(`http://127.0.0.1:${port}/index.html?view=${view}&w=${w}&h=${h}`);
  await page.waitForFunction(() => window.ready).catch(() => {});
  await page.evaluate(() => window.ready);
  await page.locator('canvas').screenshot({ path: path.join(ROOT, 'src/img', `${name}.png`) });
  console.log('✔', name);
  await page.close();
}
await browser.close();
server.close();
