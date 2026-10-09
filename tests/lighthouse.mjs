// Audit Lighthouse du chargement initial (sans ouvrir la 3D).
// Conditions : Lighthouse 13, Chromium headless (Playwright), serveur statique local avec gzip,
// profil « mobile » par défaut (Moto G Power émulé, 4G lente simulée, CPU ×4) et profil « desktop ».
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'reports', process.env.BD_DIST ? 'lighthouse-production' : 'lighthouse');
const PORT = 4198;
const BASE = `http://localhost:${PORT}`;
await fs.mkdir(OUT, { recursive: true });
const server = spawn(process.execPath, [path.join(ROOT, 'scripts/serve.mjs'), '--port', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));

const PAGES = process.env.PAGES ? process.env.PAGES.split(',') : ['/fr/', '/fr/prestations/', '/fr/prestations/massages-bien-etre/', '/fr/packs-tarifs/', '/fr/reservation/', '/fr/galerie/', '/fr/riads-villas-evenements/', '/fr/contact-faq/', '/en/', '/ar/', '/ar/booking/'];
const RUNS = Number(process.env.RUNS || 1);
const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] });
const rows = [];
try {
  for (const formFactor of (process.env.FORM ? process.env.FORM.split(',') : ['mobile', 'desktop'])) {
    const list = formFactor === 'desktop' ? ['/fr/', '/fr/prestations/', '/fr/reservation/', '/ar/'] : PAGES;
    for (const p of list) {
      const scores = [];
      for (let i = 0; i < RUNS; i++) {
        const config = formFactor === 'desktop' ? (await import('lighthouse/core/config/desktop-config.js')).default : undefined;
        const r = await lighthouse(BASE + p, { port: chrome.port, output: 'html', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] }, config);
        const c = r.lhr.categories; const a = r.lhr.audits;
        scores.push({
          perf: Math.round(c.performance.score * 100), a11y: Math.round(c.accessibility.score * 100), bp: Math.round(c['best-practices'].score * 100), seo: Math.round(c.seo.score * 100),
          fcp: a['first-contentful-paint'].displayValue, lcp: a['largest-contentful-paint'].displayValue, tbt: a['total-blocking-time'].displayValue, cls: a['cumulative-layout-shift'].displayValue,
          bytes: Math.round(a['total-byte-weight'].numericValue / 1024),
          failing: Object.values(r.lhr.audits).filter((x) => x.score !== null && x.score < 0.9 && x.scoreDisplayMode === 'binary').map((x) => x.id),
        });
        if (i === 0) await fs.writeFile(path.join(OUT, `${formFactor}${p.replace(/\//g, '_')}.html`.replace('__', '_').replace(/_\.html$/, '.html')), r.report);
      }
      const med = (k) => scores.map((s) => s[k]).sort((x, y) => x - y)[Math.floor(scores.length / 2)];
      const row = { formFactor, page: p, perf: med('perf'), a11y: med('a11y'), bp: med('bp'), seo: med('seo'), fcp: scores[0].fcp, lcp: scores[0].lcp, tbt: scores[0].tbt, cls: scores[0].cls, kb: scores[0].bytes, failing: scores[0].failing };
      rows.push(row);
      console.log(`${formFactor.padEnd(7)} ${p.padEnd(38)} perf ${row.perf} · a11y ${row.a11y} · bp ${row.bp} · seo ${row.seo} | FCP ${row.fcp} LCP ${row.lcp} TBT ${row.tbt} CLS ${row.cls} ${row.kb} Ko ${row.failing.length ? '| ' + row.failing.join(',') : ''}`);
    }
  }
} finally {
  await chrome.kill(); server.kill();
}
const md = ['# Audit Lighthouse — chargement initial', '', `Date : ${new Date().toISOString()} · Lighthouse 13 · Chromium ${chromium.name()} headless · serveur local gzip · ${RUNS} exécution(s) par page (médiane).`, '',
  '| Profil | Page | Perf. | Access. | Bonnes pr. | SEO* | FCP | LCP | TBT | CLS | Poids |', '|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.formFactor} | ${r.page} | ${r.perf} | ${r.a11y} | ${r.bp} | ${r.seo} | ${r.fcp} | ${r.lcp} | ${r.tbt} | ${r.cls} | ${r.kb} Ko |`),
  '', '*SEO volontairement pénalisé : le prototype porte `noindex` (exigence « hors indexation »).'].join('\n');
await fs.writeFile(path.join(OUT, 'summary.md'), md);
await fs.writeFile(path.join(OUT, 'summary.json'), JSON.stringify(rows, null, 1));
