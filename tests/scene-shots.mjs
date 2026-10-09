// Captures de la scène 3D ouverte (mobile et ordinateur), avec une fiche ouverte.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.OUT || 'reports/screens';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [w, h, lang] of [[390, 844, 'fr'], [1440, 900, 'fr'], [390, 844, 'ar']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(`${BASE}/${lang}/`, { waitUntil: 'networkidle' });
  await p.locator('[data-scene-section]').scrollIntoViewIfNeeded();
  await p.click('[data-scene-open]');
  await p.waitForSelector('[data-scene-close]:visible', { timeout: 30000 });
  await p.waitForTimeout(1500);
  await p.locator('[data-scene-stage]').screenshot({ path: `${OUT}/3d-${lang}-${w}-stage.png` });
  await p.click('.hotspot >> nth=2');
  await p.waitForTimeout(1600);
  await p.locator('[data-scene-section]').screenshot({ path: `${OUT}/3d-${lang}-${w}-panel.png` });
  console.log('ok', w, lang);
  await p.close();
}
await b.close();
