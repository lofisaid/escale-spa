// Captures des pages de service (affiche + lecture avec commandes), de l'accueil (cartes, en-tête
// pendant le défilement) dans les 3 langues. Les .mp4 sont servis par les copies VP9 de test.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = path.join(ROOT, 'reports/screens/services'); await fs.mkdir(OUT, { recursive: true });
const pages = { fr: ['prestations/massages-bien-etre', 'prestations/manucure-pedicure-onglerie', 'prestations/soins-du-visage'], en: ['services/wellbeing-massages', 'services/manicure-pedicure-nails', 'services/facials'], ar: ['services/wellbeing-massages', 'services/manicure-pedicure-nails', 'services/facials'] };
const ids = ['massage', 'manicure', 'facial'];
const widths = [360, 390, 768, 1024, 1440];
const browser = await chromium.launch();
for (const lang of Object.keys(pages)) for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 844 : w < 1100 ? 1024 : 900 } });
  await ctx.addInitScript(() => { window.__filmForcePlayable = true; window.__heroForcePlayable = true; });
  await ctx.route(/\/assets\/video\/(massage|manicure|facial|hero)-(960|1600)-[a-f0-9]+\.mp4$/, async (rt) => {
    const [, n, s] = /(massage|manicure|facial|hero)-(960|1600)/.exec(rt.request().url());
    rt.fulfill({ status: 200, contentType: 'video/webm', body: await fs.readFile(path.join(ROOT, `tests/fixtures/${n}-${s}.webm`)) });
  });
  const page = await ctx.newPage();
  for (const [k, slug] of pages[lang].entries()) {
    await page.goto(`${BASE}/${lang}/${slug}/`, { waitUntil: 'networkidle' });
    const fig = page.locator('[data-film]');
    await fig.scrollIntoViewIfNeeded();
    // lecture automatique à l'apparition : capture pendant la lecture
    await page.waitForFunction(() => document.querySelector('[data-film] video').currentTime > 1.0, null, { timeout: 15000 }).catch(() => {});
    await page.screenshot({ path: path.join(OUT, `${ids[k]}-${lang}-${w}-lecture.png`), fullPage: false });
  }
  // accueil : cartes + en-tête au-dessus du contenu défilé
  await page.goto(`${BASE}/${lang}/`, { waitUntil: 'networkidle' });
  await page.locator('.univers-grid').scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `accueil-cartes-${lang}-${w}.png`) });
  await page.evaluate(() => scrollTo({ top: document.querySelector('.hero-v').offsetTop + 120, behavior: 'instant' })); await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `entete-defilement-${lang}-${w}.png`), clip: { x: 0, y: 0, width: w, height: 260 } });
  console.log('ok', lang, w);
  await ctx.close();
}
await browser.close();
