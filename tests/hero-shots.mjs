// Captures du Hero sur les deux plans du film (≈3 s : salle ; ≈10 s : produits), 3 langues.
// Le Chromium de test n'a pas H.264 : les requêtes .mp4 sont servies avec une copie VP9 de test
// (tests/fixtures), uniquement ici. Usage : node tests/hero-shots.mjs [--w 1440,390]
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = path.join(ROOT, process.env.OUT || 'reports/screens/hero'); await fs.mkdir(OUT, { recursive: true });
const args = process.argv.slice(2); const wi = args.indexOf('--w');
const widths = wi > -1 ? args[wi + 1].split(',').map(Number) : [360, 390, 768, 1024, 1440];
const langs = (args.includes('--lang') ? args[args.indexOf('--lang') + 1] : 'fr,en,ar').split(',');

export async function routeVideo(ctx) {
  await ctx.addInitScript(() => { window.__heroForcePlayable = true; });
  await ctx.route(/\/assets\/video\/hero-(960|1600)-[a-f0-9]+\.mp4$/, async (route) => {
    const w = /hero-(960|1600)/.exec(route.request().url())[1];
    route.fulfill({ status: 200, contentType: 'video/webm', body: await fs.readFile(path.join(ROOT, `tests/fixtures/hero-${w}.webm`)) });
  });
}

const browser = await chromium.launch();
for (const lang of langs) for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 844 : w < 1100 ? 1024 : 900 } });
  await routeVideo(ctx);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/${lang}/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__hero && window.__hero.video.readyState >= 2, null, { timeout: 20000 });
  for (const [t, shot] of [[3, 'plan1'], [10, 'plan2']]) {
    // lecture réelle jusqu'à l'instant voulu (la copie de test n'est pas « seekable »)
    await page.waitForFunction((tt) => window.__hero.video.currentTime >= tt, t, { timeout: 30000, polling: 50 });
    await page.evaluate(() => window.__hero.video.pause());
    await page.waitForTimeout(100);
    const box = await page.locator('.hero-v').boundingBox();
    const header = await page.locator('.site-header').boundingBox();
    await page.screenshot({ path: path.join(OUT, `hero-${lang}-${w}-${shot}.png`), clip: { x: 0, y: 0, width: w, height: Math.min(box.y + box.height, 1800) } });
    void header;
    await page.evaluate(() => window.__hero.video.play());
  }
  console.log('ok', lang, w);
  await ctx.close();
}
await browser.close();
