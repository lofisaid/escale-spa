// Mesure de l'accueil AVEC lecture réelle de la vidéo (complément de Lighthouse, dont le Chromium
// ne décode pas H.264). Les .mp4 sont servis avec les copies VP9 de test (un peu plus lourdes).
// Profils : « mobile » 412×823, réseau 4G lent simulé (1,6 Mb/s, RTT 150 ms), CPU ×4 ;
//           « ordinateur » 1440×900, 10 Mb/s, RTT 40 ms, CPU ×1.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4196; const BASE = `http://localhost:${PORT}`;
const server = spawn(process.execPath, [path.join(ROOT, 'scripts/serve.mjs'), '--port', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const profiles = [
  { name: 'mobile', vp: { width: 412, height: 823 }, dpr: 2.625, mobile: true, down: 1.6e6 / 8, up: 0.75e6 / 8, rtt: 150, cpu: 4 },
  { name: 'ordinateur', vp: { width: 1440, height: 900 }, dpr: 1, mobile: false, down: 10e6 / 8, up: 5e6 / 8, rtt: 40, cpu: 1 },
];
const browser = await chromium.launch();
const out = [];
for (const pr of profiles) for (const lang of ['fr', 'ar']) {
  const ctx = await browser.newContext({ viewport: pr.vp, deviceScaleFactor: pr.dpr, isMobile: pr.mobile, hasTouch: pr.mobile });
  await ctx.addInitScript(() => {
    window.__heroForcePlayable = true; window.__m = { lcp: 0, cls: 0, long: 0, tbt: 0 };
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { window.__m.lcp = e.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__m.cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { window.__m.long++; window.__m.tbt += Math.max(0, e.duration - 50); })).observe({ type: 'longtask', buffered: true });
  });
  await ctx.route(/\/assets\/video\/hero-(960|1600)-[a-f0-9]+\.mp4$/, async (rt) => {
    const w = /hero-(960|1600)/.exec(rt.request().url())[1];
    rt.fulfill({ status: 200, contentType: 'video/webm', body: await fs.readFile(path.join(ROOT, `tests/fixtures/hero-${w}.webm`)) });
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: pr.rtt, downloadThroughput: pr.down, uploadThroughput: pr.up });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: pr.cpu });
  const bytes = { video: 0, autres: 0 };
  cdp.on('Network.loadingFinished', (e) => { bytes.__last = e; });
  const sizes = new Map();
  cdp.on('Network.responseReceived', (e) => sizes.set(e.requestId, e.response.url));
  cdp.on('Network.loadingFinished', (e) => { const u = sizes.get(e.requestId) || ''; if (/\.mp4/.test(u)) bytes.video += e.encodedDataLength; else bytes.autres += e.encodedDataLength; });
  const t0 = Date.now();
  await page.goto(`${BASE}/${lang}/`, { waitUntil: 'load' });
  const loadMs = Date.now() - t0;
  const fcp = await page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0);
  let playingAt = null;
  try { await page.waitForFunction(() => window.__hero && !window.__hero.video.paused && window.__hero.video.currentTime > 0.2, null, { timeout: 90000, polling: 100 }); playingAt = Date.now() - t0; } catch { /* lecture non démarrée */ }
  await page.waitForTimeout(6000);
  const m = await page.evaluate(() => { const q = window.__hero.video.getVideoPlaybackQuality?.() || {}; return { ...window.__m, dropped: q.droppedVideoFrames, total: q.totalVideoFrames, src: window.__hero.video.currentSrc.split('/').pop() }; });
  const r = { profil: pr.name, lang, fcpMs: Math.round(fcp), lcpMs: Math.round(m.lcp), cls: +m.cls.toFixed(3), tbtApproxMs: Math.round(m.tbt), loadMs, videoPlayingMs: playingAt, videoKo: Math.round(bytes.video / 1024), autresKo: Math.round(bytes.autres / 1024), imagesVideoAffichees: m.total, imagesPerdues: m.dropped, source: m.src };
  out.push(r); console.log(JSON.stringify(r));
  await ctx.close();
}
await browser.close(); server.kill();
await fs.mkdir(path.join(ROOT, 'reports'), { recursive: true });
await fs.writeFile(path.join(ROOT, 'reports/perf-hero.json'), JSON.stringify(out, null, 1));
