// Captures pour la revue visuelle : node tests/screens.mjs [chemin…] [--w 390,1440] [--full]
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const wi = args.indexOf('--w');
const widths = wi > -1 ? args[wi + 1].split(',').map(Number) : [390, 768, 1440];
const full = args.includes('--full');
const paths = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--w');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.OUT || 'reports/screens';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
for (const p of paths.length ? paths : ['/fr/']) {
  for (const w of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: w < 700 ? 844 : w < 1100 ? 1024 : 900 }, deviceScaleFactor: 1 });
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // déclenche le chargement des images différées
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); });
    await page.waitForTimeout(300);
    const name = `${p.replace(/\//g, '_').replace(/^_|_$/g, '') || 'root'}-${w}.png`;
    await page.screenshot({ path: path.join(OUT, name), fullPage: full });
    console.log(name);
    await page.close();
  }
}
await browser.close();
