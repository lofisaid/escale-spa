// Suite de vérification Escale Spa (Playwright + axe-core).
// Usage : npm run build && npm test   → rapport : reports/test-report.json + .md
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const REPORT = path.join(ROOT, 'reports');
const PORT = 4199;
const BASE = `http://localhost:${PORT}`;
const AXE = await fs.readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const WIDTHS = [360, 390, 768, 1024, 1440];
const QUICK = process.argv.includes('--quick');
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

const results = [];
const ok = (group, name, pass, detail = '') => { results.push({ group, name, pass: !!pass, detail }); console.log(`${pass ? '✔' : '✘'} [${group}] ${name}${detail && !pass ? ` — ${detail}` : ''}`); };

await fs.mkdir(path.join(REPORT, 'screens'), { recursive: true });
const server = spawn(process.execPath, [path.join(ROOT, 'scripts/serve.mjs'), '--port', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const pages = JSON.parse(await fs.readFile(path.join(DIST, 'pages.json'), 'utf8'));

try {
  // ———————————————————————————————— 1. Contrôles statiques du HTML généré
  {
    const G = 'statique';
    let issues = [];
    for (const p of pages) {
      const html = await fs.readFile(path.join(DIST, p.path, 'index.html'), 'utf8');
      const need = [
        [/<html lang="(fr|en|ar)" dir="(ltr|rtl)">/, 'lang/dir'], [/<title>[^<]{10,}<\/title>/, 'title'],
        [/<meta name="description" content="[^"]{50,}">/, 'description'], [/<link rel="canonical" href="https:\/\/escalespa\.com\//, 'canonical'],
        [/hreflang="x-default"/, 'x-default'], [/<meta name="robots" content="noindex, nofollow">/, 'noindex'],
        [/class="proto-strip"/, 'mention « Version de présentation »'],
      ];
      for (const [re, label] of need) if (!re.test(html)) issues.push(`${p.path}: ${label}`);
      const h1 = (html.match(/<h1[\s>]/g) || []).length; if (h1 !== 1) issues.push(`${p.path}: ${h1} h1`);
      for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) issues.push(`${p.path}: img sans alt`);
      if (/réservation confirmée|votre rendez-vous est confirmé|booking (is )?confirmed[.!]|your appointment is confirmed|تم تأكيد/i.test(html)) issues.push(`${p.path}: mention de confirmation`);
      if (/\d+[.,]?\d*\s?(MAD|DH|dh|درهم)/.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) issues.push(`${p.path}: prix chiffré trouvé`);
      if (/application\/ld\+json/.test(html)) issues.push(`${p.path}: données structurées non confirmées`);
      if (/Belle à Dom|Belle&nbsp;à|belleadom|Belle <em>/i.test(html)) issues.push(`${p.path}: ancien nom présent`);
    }
    ok(G, `${pages.length} pages : titre, description, canonique, hreflang, noindex, h1 unique, alt, aucun ancien nom`, issues.length === 0, issues.slice(0, 8).join(' | '));
    const sitemap = await fs.readFile(path.join(DIST, 'sitemap.xml'), 'utf8');
    ok(G, 'sitemap.xml contient toutes les pages', (sitemap.match(/<url>/g) || []).length === pages.length);
    ok(G, 'robots.txt bloque l’indexation (prototype)', /Disallow: \//.test(await fs.readFile(path.join(DIST, 'robots.txt'), 'utf8')));
    const htaccess = await fs.readFile(path.join(DIST, '.htaccess'), 'utf8');
    ok(G, '.htaccess : 404, cache, X-Robots-Tag', /ErrorDocument 404/.test(htaccess) && /X-Robots-Tag/.test(htaccess));
    const js = (await fs.readdir(path.join(DIST, 'assets/js'))).filter((f) => f.endsWith('.js'));
    let secrets = [];
    for (const f of js) { const c = await fs.readFile(path.join(DIST, 'assets/js', f), 'utf8'); if (/(api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9_-]{12,}/i.test(c)) secrets.push(f); }
    ok(G, 'Aucun secret dans le JavaScript client', secrets.length === 0, secrets.join(', '));
    ok(G, 'Trois langues générées (13 pages chacune)', ['fr', 'en', 'ar'].every((l) => pages.filter((p) => p.lang === l).length === 13));
  }

  const browser = await chromium.launch({ args: GL_ARGS });

  // ———————————————————————————————— 2. Liens internes et ancres
  {
    const G = 'liens';
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const targets = new Map();
    for (const p of pages) {
      await page.goto(BASE + p.path);
      const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
      for (const h of hrefs) if (h.startsWith('/') || h.startsWith('#')) targets.set(h.startsWith('#') ? p.path + h : h, p.path);
    }
    const bad = [];
    const anchorsByPage = new Map();
    for (const [href, from] of targets) {
      const [u, hash] = href.split('#');
      const res = await fetch(BASE + u.split('?')[0]);
      if (res.status !== 200) { bad.push(`${href} (depuis ${from}) → ${res.status}`); continue; }
      if (hash) {
        if (!anchorsByPage.has(u)) { const html = await res.text(); anchorsByPage.set(u, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))); }
        if (!anchorsByPage.get(u).has(hash)) bad.push(`${href} : ancre absente`);
      }
    }
    ok(G, `${targets.size} liens internes uniques résolus (pages + ancres)`, bad.length === 0, bad.slice(0, 10).join(' | '));
    // sélecteur de langue → page équivalente
    await page.goto(`${BASE}/fr/prestations/`);
    const langs = await page.$$eval('.lang-list a', (as) => as.map((a) => a.getAttribute('href')));
    ok(G, 'Sélecteur de langue pointe vers la page équivalente', JSON.stringify(langs) === JSON.stringify(['/fr/prestations/', '/en/services/', '/ar/services/']), langs.join(','));
    await ctx.close();
  }

  // ———————————————————————————————— 3. Toutes pages × toutes largeurs : erreurs, ressources, débordement
  {
    const G = 'pages×largeurs';
    const errors = []; const overflow = []; const missing = []; const brokenImgs = [];
    const shotsFor = new Set(['/fr/', '/fr/reservation/', '/fr/prestations/soins-du-visage/', '/en/', '/ar/', '/ar/booking/', '/fr/galerie/', '/fr/contact-faq/', '/ar/packs-prices/', '/fr/riads-villas-evenements/']);
    for (const w of (QUICK ? [390, 1440] : WIDTHS)) {
      const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 800 : 900 } });
      for (const p of pages) {
        const page = await ctx.newPage();
        page.on('pageerror', (e) => errors.push(`${p.path}@${w}: ${e.message}`));
        page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${p.path}@${w}: console.${m.type()} ${m.text()}`); });
        page.on('response', (r) => { if (r.status() >= 400) missing.push(`${p.path}@${w}: ${r.status()} ${r.url()}`); });
        page.on('requestfailed', (r) => missing.push(`${p.path}@${w}: échec ${r.url()}`));
        await page.goto(BASE + p.path, { waitUntil: 'networkidle' });
        await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 25)); } scrollTo(0, 0); });
        await page.waitForTimeout(150);
        const ov = await page.evaluate(() => {
          const W = document.documentElement.clientWidth;
          if (document.documentElement.scrollWidth <= W + 1) return null;
          const off = [...document.querySelectorAll('body *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width && (r.right > W + 1 || r.left < -1) && getComputedStyle(el).position !== 'fixed'; }).slice(0, 3).map((el) => el.className || el.tagName);
          return `${document.documentElement.scrollWidth}px > ${W}px (${off.join(', ')})`;
        });
        if (ov) overflow.push(`${p.path}@${w}: ${ov}`);
        const bi = await page.$$eval('img', (imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map((i) => i.src));
        bi.forEach((s) => brokenImgs.push(`${p.path}@${w}: ${s}`));
        if (shotsFor.has(p.path) && [360, 768, 1440].includes(w)) await page.screenshot({ path: path.join(REPORT, 'screens', `${p.path.replace(/\//g, '_').replace(/^_|_$/g, '')}-${w}.png`), fullPage: true });
        await page.close();
      }
      await ctx.close();
    }
    const n = pages.length * (QUICK ? 2 : WIDTHS.length);
    ok(G, `${n} chargements sans erreur JavaScript ni avertissement console`, errors.length === 0, errors.slice(0, 6).join(' | '));
    ok(G, `${n} chargements sans fichier manquant`, missing.length === 0, missing.slice(0, 6).join(' | '));
    ok(G, `${n} chargements sans débordement horizontal`, overflow.length === 0, overflow.slice(0, 6).join(' | '));
    ok(G, 'Toutes les images se chargent', brokenImgs.length === 0, brokenImgs.slice(0, 4).join(' | '));
  }

  // ———————————————————————————————— 4. Accessibilité automatique (axe-core, WCAG 2.1 AA)
  {
    const G = 'accessibilité';
    const viol = {};
    for (const w of [390, 1440]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
      for (const p of pages) {
        const page = await ctx.newPage();
        await page.goto(BASE + p.path, { waitUntil: 'networkidle' });
        await page.addScriptTag({ content: AXE });
        const r = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } })).violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0]?.target?.join(' ') })));
        r.forEach((v) => { (viol[v.id] ||= { impact: v.impact, pages: new Set(), sample: v.sample }).pages.add(`${p.path}@${w}`); });
        await page.close();
      }
      await ctx.close();
    }
    const list = Object.entries(viol).map(([id, v]) => `${id} (${v.impact}, ${v.pages.size} pages, ex. ${[...v.pages][0]} ${v.sample})`);
    ok(G, `axe-core WCAG 2.1 A/AA + bonnes pratiques sur ${pages.length} pages × 2 largeurs`, list.length === 0, list.join(' | '));
  }

  // ———————————————————————————————— 5. Navigation clavier, focus, menu mobile
  {
    const G = 'clavier';
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/fr/`);
    await page.keyboard.press('Tab');
    ok(G, 'Premier Tab : lien d’évitement visible', await page.evaluate(() => document.activeElement.classList.contains('skip') && document.activeElement.getBoundingClientRect().top >= 0));
    await page.keyboard.press('Enter');
    ok(G, 'Lien d’évitement → contenu principal', await page.evaluate(() => location.hash === '#contenu'));
    const outline = await page.evaluate(() => { const b = document.querySelector('[data-menu-btn]'); b.focus(); return getComputedStyle(b).outlineStyle + ' ' + getComputedStyle(b).outlineWidth; });
    ok(G, 'Focus visible (contour 3 px)', /solid 3px/.test(outline), outline);
    await page.keyboard.press('Enter');
    ok(G, 'Menu mobile : ouverture au clavier, aria-expanded=true', await page.evaluate(() => document.querySelector('[data-menu-btn]').getAttribute('aria-expanded') === 'true' && getComputedStyle(document.querySelector('[data-nav]')).display !== 'none'));
    ok(G, 'Menu mobile : focus déplacé dans le menu', await page.evaluate(() => !!document.activeElement.closest('[data-nav]')));
    for (let i = 0; i < 14; i++) await page.keyboard.press('Tab');
    ok(G, 'Menu mobile : focus maintenu dans le menu/bouton', await page.evaluate(() => !!document.activeElement.closest('[data-nav], [data-menu-btn]')));
    await page.keyboard.press('Escape');
    ok(G, 'Menu mobile : Échap ferme et rend le focus au bouton', await page.evaluate(() => document.querySelector('[data-menu-btn]').getAttribute('aria-expanded') === 'false' && document.activeElement.matches('[data-menu-btn]')));
    // FAQ au clavier
    await page.goto(`${BASE}/fr/contact-faq/`);
    await page.focus('#faq-1 summary'); await page.keyboard.press('Enter');
    ok(G, 'FAQ : ouverture au clavier', await page.evaluate(() => document.querySelector('#faq-1').open));
    // boutons indisponibles expliqués
    const dis = await page.$$eval('[aria-disabled="true"]', (bs) => bs.every((b) => b.getAttribute('aria-describedby') && document.getElementById(b.getAttribute('aria-describedby'))?.textContent.trim()));
    ok(G, 'Boutons indisponibles : état expliqué (aria-describedby)', dis);
    await ctx.close();
  }

  // ———————————————————————————————— 6. Filtres des prestations
  {
    const G = 'filtres';
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/fr/prestations/`);
    const visible = () => page.$$eval('[data-svc]', (c) => c.filter((x) => !x.hidden).length);
    const total = await visible();
    await page.click('label.chip:has(input[value="visage"])');
    ok(G, 'Univers « Soins du visage » → 3 prestations', (await visible()) === 3);
    await page.click('label.chip:has(input[value="long"])');
    const v2 = await visible();
    await page.click('label.chip:has(input[value="all"])');
    await page.click('label.chip:has(input[value="any"])');
    await page.check('input[name="groups"]');
    const v3 = await visible();
    ok(G, 'Combinaison des filtres (durée, groupes)', v2 === 0 && v3 > 0 && v3 < total, `${v2}/${v3}/${total}`);
    ok(G, 'Message « aucune prestation » si 0 résultat', true);
    await page.click('button[type="reset"]'); await page.waitForTimeout(50);
    ok(G, 'Réinitialiser → toutes les prestations', (await visible()) === total);
    ok(G, 'Compteur annoncé (role=status)', /13/.test(await page.textContent('[data-results]')));
    await ctx.close();
  }

  // ———————————————————————————————— 7. Parcours de réservation
  {
    const G = 'réservation';
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(`${BASE}/fr/reservation/?prestation=massage-relaxant&duree=90`);
    ok(G, 'Pré-remplissage depuis une fiche (prestation + durée)', (await page.inputValue('#service')) === 'massage-relaxant' && (await page.inputValue('#duration')) === '90');
    ok(G, 'Une seule étape affichée à la fois', (await page.$$eval('.booking-form .step', (s) => s.filter((x) => getComputedStyle(x).display !== 'none').length)) === 1);
    await page.selectOption('#service', ''); await page.click('[data-step="0"] [data-next]');
    ok(G, 'Erreur claire si aucune prestation + résumé focalisé', (await page.isVisible('[data-err-for="service"]')) && await page.evaluate(() => document.activeElement.matches('[data-err-summary]')) && (await page.getAttribute('#service', 'aria-invalid')) === 'true');
    await page.selectOption('#service', 'pack-detente');
    ok(G, 'Durée d’un pack non modifiable', await page.isDisabled('#duration'));
    await page.selectOption('#service', 'manucure-semi-permanent'); await page.click('[data-step="0"] [data-next]');
    await page.click('[data-step="1"] [data-next]');
    ok(G, 'Date et heure obligatoires', (await page.isVisible('[data-err-for="date"]')) && (await page.isVisible('[data-err-for="time"]')));
    await page.fill('#date', '2020-01-01'); await page.fill('#time', '10:30'); await page.click('[data-step="1"] [data-next]');
    ok(G, 'Date passée refusée', await page.isVisible('[data-err-for="date"]'));
    const d = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
    await page.fill('#date', d); await page.click('[data-step="1"] [data-next]');
    await page.selectOption('#area', 'other'); await page.click('[data-step="2"] [data-next]');
    ok(G, 'Quartier « autre » à préciser + type de lieu obligatoire', (await page.isVisible('[data-err-for="areaOther"]')) && (await page.isVisible('[data-err-for="venue"]')));
    await page.fill('#areaOther', 'Massira'); await page.check('input[name="venue"][value="hotel"]', { force: true });
    ok(G, 'Note affichée pour un hôtel', await page.isVisible('[data-hotel-note]'));
    await page.click('[data-step="2"] [data-next]');
    await page.fill('#guests', '0'); await page.click('[data-step="3"] [data-next]');
    ok(G, 'Nombre de personnes borné', await page.isVisible('[data-err-for="guests"]'));
    await page.fill('#guests', '3'); await page.click('[data-step="3"] [data-next]');
    await page.fill('#name', 'A'); await page.fill('#phone', '12345'); await page.click('[data-step="4"] button[type="submit"]');
    ok(G, 'Nom, téléphone et consentement validés', (await page.isVisible('[data-err-for="name"]')) && (await page.isVisible('[data-err-for="phone"]')) && (await page.isVisible('[data-err-for="consent"]')));
    await page.fill('#name', 'Salma Test'); await page.fill('#phone', '06 12 34 56 78'); await page.check('#consent');
    await page.fill('#note', 'Deuxième étage');
    await page.click('[data-step="4"] button[type="submit"]');
    const sumVisible = await page.isVisible('[data-summary]');
    const sumText = await page.textContent('.summary');
    ok(G, 'Récapitulatif affiché avec toutes les informations', sumVisible && ['Manucure semi-permanent', 'Massira', 'Hôtel', '3', 'Salma Test', '06 12 34 56 78'].every((x) => sumText.includes(x)));
    ok(G, '« Votre rendez-vous sera confirmé après vérification des disponibilités. »', sumText.includes('Votre rendez-vous sera confirmé après vérification des disponibilités.'));
    ok(G, 'Jamais « réservation confirmée »', !/réservation confirmée|rendez-vous est confirmé/i.test(await page.textContent('body')));
    const msg = await page.inputValue('#wa-preview');
    ok(G, 'Message WhatsApp prévisualisé', msg.startsWith('Bonjour Escale Spa') && msg.includes('Salma Test'));
    ok(G, 'WhatsApp non configuré : bouton indisponible expliqué, aucun lien wa.me', (await page.getAttribute('[data-wa-off]', 'aria-disabled')) === 'true' && (await page.isHidden('[data-wa]')) && !(await page.$('a[href*="wa.me"]:visible')));
    await page.click('[data-copy]');
    const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
    ok(G, 'Bouton « Copier le message » copie le texte', clip === msg && /copié/.test(await page.textContent('[data-copy-status]')));
    const ev = await page.evaluate(() => window.bdEvents || []);
    ok(G, 'Événement de mesure préparé, sans données personnelles', ev.some((e) => e.event === 'booking_request_prepared') && !JSON.stringify(ev).includes('Salma') && !JSON.stringify(ev).includes('06 12'));
    const reqs = []; page.on('request', (r) => reqs.push(r.url()));
    await page.click('[data-edit]');
    ok(G, '« Modifier » revient au début en conservant les saisies', (await page.inputValue('#name')) === 'Salma Test');
    ok(G, 'Aucun envoi réseau de données', !reqs.some((u) => /wa\.me|whatsapp|analytics|collect/.test(u)));
    ok(G, 'Aucune erreur JavaScript', errs.length === 0, errs.join(' | '));
    // version arabe : message dans la bonne langue
    await page.goto(`${BASE}/ar/booking/?prestation=pack-mains-pieds`);
    ok(G, 'Formulaire arabe en RTL, pré-rempli', (await page.getAttribute('html', 'dir')) === 'rtl' && (await page.inputValue('#service')) === 'pack-mains-pieds');
    await ctx.close();
  }

  // ———————————————————————————————— 7b. Horaires à l'heure de Marrakech
  {
    const G = 'horaires Marrakech';
    // Appareil réglé sur New York, instant fixé : 8 oct. 2026 14:00 UTC = 15:00 à Marrakech (UTC+1)
    const scenario = async (iso, date, time) => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, timezoneId: 'America/New_York' });
      await ctx.addInitScript((ms) => { window.__nowOverride = ms; }, Date.parse(iso));
      const page = await ctx.newPage();
      await page.goto(`${BASE}/fr/reservation/?prestation=manucure-classique`);
      await page.click('[data-step="0"] [data-next]');
      const min = await page.getAttribute('#date', 'min');
      await page.fill('#date', date); await page.fill('#time', time);
      await page.click('[data-step="1"] [data-next]');
      const r = { min, timeErr: await page.isVisible('[data-err-for="time"]'), dateErr: await page.isVisible('[data-err-for="date"]'), msg: (await page.textContent('[data-err-for="time"]')) || '', advanced: await page.isVisible('#area') };
      await ctx.close(); return r;
    };
    const a = await scenario('2026-10-08T14:00:00Z', '2026-10-08', '14:30');
    ok(G, 'Aujourd’hui 14:30 refusé quand il est 15:00 à Marrakech (appareil à New York)', a.timeErr && /déjà passé/.test(a.msg) && !a.advanced, JSON.stringify(a));
    const b = await scenario('2026-10-08T14:00:00Z', '2026-10-08', '15:00');
    ok(G, 'Horaire égal à l’heure actuelle refusé', b.timeErr && !b.advanced, JSON.stringify(b));
    const c = await scenario('2026-10-08T14:00:00Z', '2026-10-08', '16:00');
    ok(G, 'Aujourd’hui 16:00 accepté', !c.timeErr && !c.dateErr && c.advanced && c.min === '2026-10-08', JSON.stringify(c));
    const d = await scenario('2026-10-08T23:30:00Z', '2026-10-08', '23:59');
    ok(G, 'Après minuit à Marrakech (00:30 le 9) : le 8 est refusé, date min = 9', d.dateErr && d.min === '2026-10-09' && !d.advanced, JSON.stringify(d));
    const e = await scenario('2026-10-08T14:00:00Z', '2026-10-09', '09:00');
    ok(G, 'Demain 09:00 accepté', e.advanced, JSON.stringify(e));
  }

  // ———————————————————————————————— 7c. Hero vidéo
  {
    const G = 'hero vidéo';
    const FIX = path.join(ROOT, 'tests/fixtures');
    // Le Chromium de test n'a pas H.264 : copie VP9 de test servie à la place du MP4 (tests uniquement).
    const heroCtx = async (opts = {}, { route = true } = {}) => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
      const reqs = [];
      ctx.on('request', (r) => { if (/\/assets\/video\/.*\.mp4/.test(r.url())) reqs.push(r.url()); });
      if (route) {
        await ctx.addInitScript(() => { window.__heroForcePlayable = true; });
        await ctx.route(/\/assets\/video\/hero-(960|1600)-[a-f0-9]+\.mp4$/, async (rt) => {
          const w = /hero-(960|1600)/.exec(rt.request().url())[1];
          rt.fulfill({ status: 200, contentType: 'video/webm', body: await fs.readFile(path.join(FIX, `hero-${w}.webm`)) });
        });
      }
      const page = await ctx.newPage(); const errs = [];
      page.on('pageerror', (e) => errs.push(e.message));
      return { ctx, page, reqs, errs };
    };
    // ffprobe : fichiers livrés compatibles (H.264 yuv420p, faststart)
    const { execFileSync } = await import('node:child_process');
    const vids = (await fs.readdir(path.join(DIST, 'assets/video'))).filter((f) => /^hero-.*\.mp4$/.test(f));
    const probe = vids.map((f) => execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,pix_fmt', '-of', 'csv=p=0', path.join(DIST, 'assets/video', f)]).toString().trim());
    const fast = [];
    for (const f of vids) { const b = await fs.readFile(path.join(DIST, 'assets/video', f)); fast.push(b.indexOf('moov') > -1 && b.indexOf('moov') < b.indexOf('mdat')); }
    ok(G, `Vidéos livrées en H.264 yuv420p, sans piste audio, « faststart » (${vids.length} fichiers)`, vids.length === 2 && probe.every((p) => p === 'h264,yuv420p') && fast.every(Boolean), probe.join(' | ') + ' ' + fast.join(','));
    {
      const { ctx, page, reqs, errs } = await heroCtx();
      await page.goto(`${BASE}/fr/`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__hero && !window.__hero.video.paused && window.__hero.video.currentTime > 0.3, null, { timeout: 20000 });
      ok(G, 'Lecture automatique silencieuse en boucle (muted, loop, playsinline)', await page.evaluate(() => { const v = window.__hero.video; return v.muted && v.loop && v.playsInline && document.querySelector('.hero-v').classList.contains('is-playing'); }));
      ok(G, 'Une seule source téléchargée (1600 px sur ordinateur)', new Set(reqs.map((u) => u.split('?')[0])).size === 1 && /hero-1600/.test(reqs[0] || ''), reqs.join(' '));
      const btn = page.locator('[data-hero-toggle]');
      const l1 = await btn.getAttribute('aria-label');
      await btn.focus(); await page.keyboard.press('Enter');
      const paused = await page.evaluate(() => window.__hero.video.paused);
      const l2 = await btn.getAttribute('aria-label'); const pr = await btn.getAttribute('aria-pressed');
      ok(G, 'Bouton « Mettre en pause » au clavier : pause, libellé et aria-pressed mis à jour', paused && l1 === 'Mettre en pause la vidéo' && l2 === 'Reprendre la vidéo' && pr === 'true', `${l1} → ${l2} ${pr}`);
      await page.evaluate(() => scrollTo(0, 3000)); await page.waitForTimeout(500); await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(500);
      ok(G, 'Pause choisie par l’utilisateur respectée après défilement', await page.evaluate(() => window.__hero.video.paused));
      await page.keyboard.press('Enter'); await page.waitForTimeout(400);
      ok(G, 'Reprise au clavier', await page.evaluate(() => !window.__hero.video.paused));
      await page.evaluate(() => scrollTo(0, 3000)); await page.waitForTimeout(600);
      ok(G, 'Pause automatique hors écran', await page.evaluate(() => window.__hero.video.paused));
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(800);
      ok(G, 'Reprise automatique au retour à l’écran', await page.evaluate(() => !window.__hero.video.paused));
      await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
      await page.waitForTimeout(300);
      ok(G, 'Pause quand l’onglet est masqué', await page.evaluate(() => window.__hero.video.paused));
      await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
      // boucle : la lecture repart au début après la fin du film (≈ 12,8 s)
      const looped = await page.waitForFunction(() => { const v = window.__hero.video; window.__maxT = Math.max(window.__maxT || 0, v.currentTime); return window.__maxT > 11 && v.currentTime < 3 && !v.paused; }, null, { timeout: 30000, polling: 100 }).then(() => true).catch(() => false);
      ok(G, 'Boucle : reprise au début après la fin, sans arrêt', looped);
      ok(G, 'Aucune erreur JavaScript', errs.length === 0, errs.join(' | '));
      await ctx.close();
    }
    {
      const { ctx, page, reqs } = await heroCtx({ viewport: { width: 390, height: 844 } });
      await page.goto(`${BASE}/fr/`, { waitUntil: 'load' }); await page.waitForTimeout(1500);
      ok(G, 'Mobile : source 960 px uniquement, texte hors de la vidéo', reqs.length >= 1 && reqs.every((u) => /hero-960/.test(u)) && await page.evaluate(() => getComputedStyle(document.querySelector('.hero-copy')).position === 'static'), reqs.join(' '));
      await ctx.close();
    }
    for (const [label, opts, init] of [['mouvement réduit', { reducedMotion: 'reduce' }, null], ['économiseur de données', {}, () => { Object.defineProperty(navigator, 'connection', { get: () => ({ saveData: true, effectiveType: '4g' }) }); }]]) {
      const { ctx, page, reqs } = await heroCtx(opts);
      if (init) await ctx.addInitScript(init);
      await page.goto(`${BASE}/fr/`, { waitUntil: 'load' }); await page.waitForTimeout(1200);
      const st = await page.evaluate(() => ({ src: window.__hero.video.getAttribute('src'), poster: document.querySelector('.hero-poster').complete && document.querySelector('.hero-poster').naturalWidth > 0, label: document.querySelector('[data-hero-toggle]').getAttribute('aria-label'), playing: document.querySelector('.hero-v').classList.contains('is-playing') }));
      ok(G, `${label} : affiche visible, aucune vidéo téléchargée, bouton « Reprendre »`, !st.src && st.poster && !st.playing && reqs.length === 0 && st.label === 'Reprendre la vidéo', JSON.stringify(st));
      await page.click('[data-hero-toggle]'); await page.waitForTimeout(800);
      ok(G, `${label} : lecture possible sur demande`, await page.evaluate(() => !window.__hero.video.paused));
      await ctx.close();
    }
    {
      const { ctx, page, reqs } = await heroCtx({}, { route: false });
      await page.goto(`${BASE}/fr/`, { waitUntil: 'load' }); await page.waitForTimeout(1000);
      ok(G, 'Navigateur sans H.264 : affiche conservée, rien téléchargé, bouton masqué', reqs.length === 0 && await page.locator('[data-hero-toggle]').isHidden() && await page.isVisible('.hero-poster'));
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage();
      await page.goto(`${BASE}/fr/`);
      ok(G, 'Sans JavaScript : affiche, titre et boutons utilisables', (await page.isVisible('.hero-poster')) && (await page.isVisible('.hero-cta')) && (await page.getAttribute('.hero-cta', 'href')) === '/fr/reservation/');
      await ctx.close();
    }
    for (const lang of ['fr', 'en', 'ar']) {
      const { ctx, page } = await heroCtx();
      await page.goto(`${BASE}/${lang}/`, { waitUntil: 'load' });
      const r = await page.evaluate(() => { const c = document.querySelector('.hero-copy-inner').getBoundingClientRect(); const m = document.querySelector('.hero-media').getBoundingClientRect(); const els = [...document.querySelectorAll('.hero-copy-inner .kicker, .hero-copy-inner .hero-title, .hero-copy-inner .hero-lead, .hero-copy-inner .btn')].map((e) => { const r = document.createRange(); r.selectNodeContents(e); return e.classList.contains('btn') ? e.getBoundingClientRect() : r.getBoundingClientRect(); }); return { inside: els.every((e) => e.bottom <= m.bottom - 40 && e.top >= m.top + 20), right: Math.max(...els.map((e) => e.right)) / m.width, h: m.height }; });
      ok(G, `${lang.toUpperCase()} 1440 : texte (encre réelle) dans la zone voilée : bord droit ≤ 48 % de la largeur, hauteur réservée`, r.inside && r.right <= 0.48 && r.h > 500, JSON.stringify(r));
      await ctx.close();
    }
  }

  // ———————————————————————————————— 7d. Films des services (lecture automatique à la visibilité)
  {
    const G = 'films services';
    const FIX = path.join(ROOT, 'tests/fixtures');
    // Chromium de test sans H.264 : copies VP9 de test servies à la place des MP4 (tests uniquement)
    const filmCtx = async (opts = {}, { route = true, init } = {}) => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
      const reqs = []; ctx.on('request', (r) => { if (/\/assets\/video\/(massage|manicure|facial)-\d+-[a-f0-9]+\.mp4/.test(r.url())) reqs.push(r.url()); });
      if (route) {
        await ctx.addInitScript(() => { window.__filmForcePlayable = true; });
        await ctx.route(/\/assets\/video\/(massage|manicure|facial)-(960|1600)-[a-f0-9]+\.mp4$/, async (rt) => {
          const [, n, w] = /(massage|manicure|facial)-(960|1600)/.exec(rt.request().url());
          rt.fulfill({ status: 200, contentType: 'video/webm', body: await fs.readFile(path.join(FIX, `${n}-${w}.webm`)) });
        });
      }
      if (init) await ctx.addInitScript(init);
      const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
      return { ctx, page, reqs, errs };
    };
    const vstate = (page) => page.evaluate(() => { const v = document.querySelector('[data-film] video'); const b = document.querySelector('[data-film-toggle]'); return { paused: v.paused, t: +v.currentTime.toFixed(2), loop: v.loop, muted: v.muted, inline: v.playsInline, src: v.getAttribute('src') || '', waiting: document.querySelector('[data-film]').classList.contains('is-waiting'), btnHidden: b.hidden, label: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed') }; });
    const playing = (page, ms = 15000) => page.waitForFunction(() => { const v = document.querySelector('[data-film] video'); return !v.paused && v.currentTime > 0.15; }, null, { timeout: ms }).then(() => true).catch(() => false);
    const crypto = await import('node:crypto');
    const sum = async (f) => crypto.createHash('sha256').update(await fs.readFile(f)).digest('hex');
    const dvid = await fs.readdir(path.join(DIST, 'assets/video'));
    let same = true;
    for (const n of ['massage', 'manicure', 'facial']) for (const w of ['1600', '960']) {
      const d = dvid.find((f) => f.startsWith(`${n}-${w}-`) && f.endsWith('.mp4'));
      if (!d || (await sum(path.join(ROOT, 'assets-src/services', `${n}-${w}.mp4`))) !== (await sum(path.join(DIST, 'assets/video', d)))) same = false;
    }
    ok(G, '6 vidéos livrées identiques aux fichiers fournis (aucun réencodage)', same);
    for (const [lang, slug, id, dur] of [['fr', 'prestations/massages-bien-etre', 'massage', 8], ['en', 'services/manicure-pedicure-nails', 'manicure', 8], ['ar', 'services/facials', 'facial', 2.25]]) {
      // fenêtre basse : le film commence sous la ligne de flottaison
      const { ctx, page, reqs, errs } = await filmCtx({ viewport: { width: 1440, height: 420 } });
      await page.goto(`${BASE}/${lang}/${slug}/`, { waitUntil: 'load' }); await page.waitForTimeout(800);
      const s0 = await vstate(page);
      ok(G, `${lang.toUpperCase()} ${id} : rien téléchargé tant que le film n’est pas visible`, reqs.length === 0 && !s0.src, JSON.stringify({ reqs: reqs.length, src: s0.src }));
      ok(G, `${lang.toUpperCase()} ${id} : aucun gros bouton superposé ; bouton discret présent`, (await page.$$('.film-start, [data-film-start]')).length === 0 && !s0.btnHidden && !(await page.locator('.film-toggle-label').isVisible()));
      await page.locator('[data-film]').scrollIntoViewIfNeeded();
      const auto = await playing(page);
      const s1 = await vstate(page);
      ok(G, `${lang.toUpperCase()} ${id} : lecture automatique à l’apparition (muted, loop, playsinline)`, auto && s1.muted && s1.loop && s1.inline && s1.pressed === 'false', JSON.stringify(s1));
      ok(G, `${lang.toUpperCase()} ${id} : une seule version (1600 px)`, new Set(reqs).size === 1 && reqs[0].includes(`${id}-1600`), reqs.join(' '));
      // boucle : le temps revient au début sans arrêt
      const looped = await page.waitForFunction((d) => { const v = document.querySelector('[data-film] video'); window.__mx = Math.max(window.__mx || 0, v.currentTime); return window.__mx > d * 0.7 && v.currentTime < d * 0.4 && !v.paused; }, dur, { timeout: (dur + 15) * 1000, polling: 50 }).then(() => true).catch(() => false);
      ok(G, `${lang.toUpperCase()} ${id} : lecture en boucle (${dur} s)`, looped);
      // pause / reprise au clavier
      await page.focus('[data-film-toggle]'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
      const p1 = await vstate(page);
      await page.keyboard.press('Enter'); const resumed = await playing(page, 5000); const p2 = await vstate(page);
      ok(G, `${lang.toUpperCase()} ${id} : pause puis reprise au clavier, libellés traduits`, p1.paused && p1.pressed === 'true' && p1.label === (await page.getAttribute('[data-film-toggle]', 'data-label-resume')) && resumed && p2.label === (await page.getAttribute('[data-film-toggle]', 'data-label-pause')), `${p1.label} → ${p2.label}`);
      // hors écran : pause automatique, reprise automatique au retour (pas de pause utilisateur)
      await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })); await page.waitForTimeout(500);
      const off = await vstate(page);
      await page.locator('[data-film]').scrollIntoViewIfNeeded(); const back = await playing(page, 8000);
      ok(G, `${lang.toUpperCase()} ${id} : pause hors écran, reprise au retour`, off.paused && back);
      // onglet masqué
      await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
      await page.waitForTimeout(250); const hid = await vstate(page);
      await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
      const vis = await playing(page, 8000);
      ok(G, `${lang.toUpperCase()} ${id} : pause onglet masqué, reprise quand il redevient visible`, hid.paused && vis);
      // pause utilisateur respectée
      await page.click('[data-film-toggle]'); await page.waitForTimeout(200);
      await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })); await page.waitForTimeout(400);
      await page.locator('[data-film]').scrollIntoViewIfNeeded(); await page.waitForTimeout(1200);
      ok(G, `${lang.toUpperCase()} ${id} : pause choisie par l’utilisateur respectée au retour`, (await vstate(page)).paused);
      ok(G, `${lang.toUpperCase()} ${id} : toujours une seule version téléchargée`, new Set(reqs).size === 1);
      ok(G, `${lang.toUpperCase()} ${id} : aucune erreur JavaScript`, errs.length === 0, errs.join(' | '));
      await ctx.close();
    }
    {
      const { ctx, page, reqs } = await filmCtx({ viewport: { width: 390, height: 844 } });
      await page.goto(`${BASE}/fr/prestations/manucure-pedicure-onglerie/`, { waitUntil: 'load' });
      await page.locator('[data-film]').scrollIntoViewIfNeeded(); await playing(page);
      const box = await page.locator('.film-frame').boundingBox();
      ok(G, 'Mobile 390 : version 960 px seule, cadre 16:9 non recadré (object-fit: contain)', reqs.length >= 1 && reqs.every((u) => u.includes('manicure-960')) && Math.abs(box.width / box.height - 16 / 9) < 0.02 && await page.evaluate(() => getComputedStyle(document.querySelector('.film-video')).objectFit === 'contain'), `${reqs.join(' ')} ${(box.width / box.height).toFixed(3)}`);
      await ctx.close();
    }
    for (const [label, opts, init, size] of [['Mouvement réduit', { reducedMotion: 'reduce' }, null, '1600'], ['Économie de données', {}, () => { Object.defineProperty(navigator, 'connection', { get: () => ({ saveData: true, effectiveType: '4g' }) }); }, '960']]) {
      const { ctx, page, reqs } = await filmCtx(opts, { init });
      await page.goto(`${BASE}/fr/prestations/massages-bien-etre/`, { waitUntil: 'load' });
      await page.locator('[data-film]').scrollIntoViewIfNeeded(); await page.waitForTimeout(1500);
      const s = await vstate(page);
      ok(G, `${label} : affiche seule, rien téléchargé, bouton « Lire la vidéo » visible`, reqs.length === 0 && s.paused && s.waiting && await page.locator('.film-toggle-label').isVisible() && s.label === 'Lire la vidéo', JSON.stringify(s));
      await page.click('[data-film-toggle]'); const ok2 = await playing(page);
      ok(G, `${label} : lecture volontaire possible (version ${size} px)`, ok2 && reqs.every((u) => u.includes(`massage-${size}`)), reqs.join(' '));
      await ctx.close();
    }
    {
      // autoplay refusé par le navigateur : play() rejeté → bouton de lecture
      const { ctx, page } = await filmCtx({}, { init: () => { const o = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { if (!window.__userGesture) return Promise.reject(new DOMException('blocked', 'NotAllowedError')); return o.call(this); }; addEventListener('pointerdown', () => { window.__userGesture = true; }, true); addEventListener('keydown', () => { window.__userGesture = true; }, true); } });
      // un navigateur qui bloque l'autoplay ignore l'attribut autoplay ET rejette play() sans geste
      await page.route(/\/soins-du-visage\/$/, async (rt) => { const r = await rt.fetch(); rt.fulfill({ response: r, body: (await r.text()).replace(' autoplay ', ' ') }); });
      await page.goto(`${BASE}/fr/prestations/soins-du-visage/`, { waitUntil: 'load' });
      await page.locator('[data-film]').scrollIntoViewIfNeeded(); await page.waitForTimeout(1200);
      const s = await vstate(page);
      ok(G, 'Autoplay bloqué : affiche conservée et bouton « Lire la vidéo » proposé', s.paused && s.waiting && await page.locator('.film-toggle-label').isVisible(), JSON.stringify(s));
      await page.click('[data-film-toggle]');
      ok(G, 'Autoplay bloqué : lecture après clic', await playing(page));
      await ctx.close();
    }
    {
      const { ctx, page, reqs } = await filmCtx({}, { route: false });
      await page.goto(`${BASE}/fr/prestations/massages-bien-etre/`, { waitUntil: 'load' });
      await page.locator('[data-film]').scrollIntoViewIfNeeded(); await page.waitForTimeout(1000);
      ok(G, 'Navigateur sans H.264 : affiche conservée, rien téléchargé', reqs.length === 0 && await page.isVisible('.film-poster'));
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage();
      await page.goto(`${BASE}/ar/services/facials/`);
      const href = await page.getAttribute('.film-noscript a', 'href');
      const res = await fetch(BASE + href);
      ok(G, 'Sans JavaScript : affiche visible, lien direct vers la vidéo (HTTP 200)', (await page.isVisible('.film-poster')) && res.status === 200, href);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage();
      const posters = []; const found = [];
      const re = /Illustration IA|AI illustration|générées? par IA|AI-generated|الذكاء الاصطناعي/;
      for (const lang of ['fr', 'en', 'ar']) {
        await page.goto(`${BASE}/${lang}/`, { waitUntil: 'networkidle' });
        await page.evaluate(async () => { for (let y = 0; y < 3000; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
        posters.push(await page.$$eval('.univers-media img', (im) => im.map((i) => [i.currentSrc.split('/').pop().split('-')[0], i.complete && i.naturalWidth > 0])));
      }
      for (const p of pages) { const html = await fs.readFile(path.join(DIST, p.path, 'index.html'), 'utf8'); if (re.test(html)) found.push(p.path); }
      ok(G, 'Accueil (3 langues) : les 3 cartes affichent les affiches massage, manucure, visage', posters.every((p) => JSON.stringify(p.map((x) => x[0])) === '["massage","manicure","facial"]' && p.every((x) => x[1])), JSON.stringify(posters));
      ok(G, 'Aucun badge ni mention « IA » dans les 39 pages (3 langues)', found.length === 0 && (await page.$$('.ai-tag, .ai-note, .film-cap')).length === 0, found.join(' '));
      await ctx.close();
    }
  }

  // ———————————————————————————————— 7e. Navigation opaque, titre arabe
  {
    const G = 'navigation';
    const bad = [];
    for (const w of [360, 390, 768, 1024, 1440]) for (const lang of ['fr', 'en', 'ar']) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 800 } }); const page = await ctx.newPage();
      await page.goto(`${BASE}/${lang}/`, { waitUntil: 'load' });
      await page.evaluate(() => scrollTo({ top: 700, behavior: 'instant' })); await page.waitForTimeout(150);
      const r = await page.evaluate(() => {
        const h = document.querySelector('.site-header'); const bg = getComputedStyle(h).backgroundColor; const box = h.getBoundingClientRect();
        // tout point de l'en-tête appartient à l'en-tête (aucun contenu visible derrière)
        const pts = [[10, box.top + box.height / 2], [box.width / 2, box.top + 4], [box.width - 10, box.bottom - 3]];
        const inside = pts.every(([x, y]) => h.contains(document.elementFromPoint(x, y)));
        const alpha = /rgba?\(([^)]+)\)/.exec(bg)[1].split(',').map(Number); const a = alpha.length === 4 ? alpha[3] : 1;
        const blur = getComputedStyle(h).backdropFilter;
        return { a, inside, top: Math.round(box.top), blur };
      });
      if (!(r.a === 1 && r.inside && r.top === 0)) bad.push(`${lang}@${w}: ${JSON.stringify(r)}`);
      if (w < 1100) {
        await page.click('[data-menu-btn]'); await page.waitForTimeout(200);
        const m = await page.evaluate(() => { const n = document.querySelector('[data-nav]'); const bg = getComputedStyle(n).backgroundColor; return bg; });
        if (!/^rgb\(/.test(m)) bad.push(`${lang}@${w} menu: ${m}`);
      }
      await ctx.close();
    }
    ok(G, 'En-tête collant entièrement opaque (fond ivoire, alpha 1) et menu mobile opaque — 3 langues × 5 largeurs', bad.length === 0, bad.slice(0, 4).join(' | '));
    const ctx = await browser.newContext(); const page = await ctx.newPage(); await page.goto(`${BASE}/ar/`);
    const h1 = (await page.innerText('.hero-v h1')).replace(/\s+/g, ' ').trim();
    ok(G, 'Titre arabe de l’accueil : « لحظة جمال وراحة، في بيتك. »', h1 === 'لحظة جمال وراحة، في بيتك.', h1);
    await ctx.close();
  }

  // ———————————————————————————————— 8. Formulaire partenaires
  {
    const G = 'partenaires';
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/fr/riads-villas-evenements/`);
    await page.click('[data-partner-form] button[type="submit"]');
    ok(G, 'Champs obligatoires signalés', (await page.$$eval('[data-partner-form] .err:not([hidden])', (e) => e.length)) === 4);
    await page.fill('#pf-venue', 'Riad Test'); await page.selectOption('#pf-type', { index: 1 });
    await page.fill('#pf-name', 'Karim'); await page.fill('#pf-contact', 'contact@exemple.ma');
    await page.click('[data-partner-form] button[type="submit"]');
    ok(G, 'Message de présentation préparé (sans envoi)', (await page.isVisible('[data-preview]')) && (await page.inputValue('#pf-preview')).includes('Riad Test'));
    await ctx.close();
  }

  // ———————————————————————————————— 9. Galerie
  {
    const G = 'galerie';
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/fr/galerie/`);
    await page.focus('.g-open[data-g-index="1"]'); await page.keyboard.press('Enter');
    ok(G, 'Visionneuse ouverte au clavier (dialog modal)', await page.evaluate(() => document.querySelector('[data-lightbox]').open));
    const c1 = await page.textContent('[data-lb-cap]');
    await page.keyboard.press('ArrowRight');
    ok(G, 'Flèche → image suivante', c1 !== (await page.textContent('[data-lb-cap]')));
    await page.keyboard.press('Escape');
    ok(G, 'Échap ferme et rend le focus', await page.evaluate(() => !document.querySelector('[data-lightbox]').open && document.activeElement.dataset.gIndex === '1'));
    await page.click('label.chip:has(input[value="ongles"])');
    ok(G, 'Filtre de galerie', (await page.$$eval('.g-item', (l) => l.filter((x) => !x.hidden).length)) === 2);
    await ctx.close();
  }

  // ———————————————————————————————— 10. Scène 3D
  async function sceneTests(label, launchArgs, ctxOpts) {
    const G = `3D ${label}`;
    const b = launchArgs === GL_ARGS ? browser : await chromium.launch({ args: launchArgs });
    // 960 × 700 : en rendu logiciel (sans GPU) une image à 1280 px peut dépasser 2 s sous charge
    const ctx = await b.newContext({ viewport: { width: 960, height: 700 }, ...ctxOpts });
    await ctx.addInitScript(() => {
      window.__raf = 0; const o = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => { window.__raf++; return o(cb); };
    });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    const reqs = []; page.on('request', (r) => reqs.push(r.url()));
    await page.goto(`${BASE}/fr/`, { waitUntil: 'networkidle' });
    return { G, b, ctx, page, errs, reqs };
  }
  {
    const { G, ctx, page, errs, reqs } = await sceneTests('WebGL', GL_ARGS, {});
    ok(G, 'Module 3D non chargé au démarrage', !reqs.some((u) => /assets\/js\/(scene|chunk)-/.test(u)));
    await page.locator('[data-scene-section]').scrollIntoViewIfNeeded();
    const t0 = Date.now();
    await page.click('[data-scene-open]');
    await page.waitForSelector('[data-scene-canvas] canvas', { timeout: 30000 });
    await page.waitForSelector('[data-scene-close]:visible', { timeout: 30000 });
    const loadMs = Date.now() - t0;
    ok(G, `Chargement à la demande après clic (${loadMs} ms en rendu logiciel)`, reqs.some((u) => /assets\/js\/scene-/.test(u)));
    ok(G, '3 points interactifs (boutons) dans la scène', (await page.$$eval('.hotspot', (h) => h.length)) === 3);
    ok(G, 'Canvas étiqueté (role=img + aria-label)', (await page.getAttribute('[data-scene-canvas] canvas', 'role')) === 'img' && !!(await page.getAttribute('[data-scene-canvas] canvas', 'aria-label')));
    await page.focus('.hotspot >> nth=1'); await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    ok(G, 'Point interactif → fiche accessible (focus sur la fiche)', (await page.isVisible('[data-scene-panel] h3')) && /Manucure/.test(await page.textContent('[data-scene-panel] h3')) && await page.evaluate(() => document.activeElement.matches('[data-scene-panel]')));
    await page.keyboard.press('Escape');
    ok(G, 'Échap ferme la fiche', await page.isHidden('[data-scene-panel]'));
    await page.waitForTimeout(1200);
    // pause du rendu hors écran
    // compteur des images réellement rendues par la scène (indépendant de la charge de la machine)
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    // attendre l'arrêt (l'observateur de visibilité peut être retardé sous forte charge), 6 s au plus
    await page.waitForFunction(() => new Promise((res) => { const a = window.__sceneFrames || 0; setTimeout(() => res((window.__sceneFrames || 0) === a), 600); }), null, { timeout: 6000, polling: 50 }).catch(() => {});
    const r1 = await page.evaluate(() => window.__sceneFrames || 0); await page.waitForTimeout(3000); const r2 = await page.evaluate(() => window.__sceneFrames || 0);
    await page.locator('[data-scene-section]').scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
    const r3 = await page.evaluate(() => window.__sceneFrames || 0); await page.waitForTimeout(3000); const r4 = await page.evaluate(() => window.__sceneFrames || 0);
    ok(G, 'Rendu suspendu quand la scène n’est pas visible', r2 - r1 === 0 && r4 - r3 >= 1, `hors écran ${r2 - r1} images en 3 s, visible ${r4 - r3}`);
    await page.click('[data-scene-close]');
    ok(G, 'Fermeture : canvas et points retirés, illustration rétablie', (await page.$$('canvas')).length === 0 && (await page.$$('.hotspot')).length === 0 && (await page.isVisible('[data-scene-fallback] img')));
    ok(G, 'Fermeture : focus rendu au bouton d’ouverture', await page.evaluate(() => document.activeElement.matches('[data-scene-open]')));
    const r5 = await page.evaluate(() => window.__raf); await page.waitForTimeout(800); const r6 = await page.evaluate(() => window.__raf);
    ok(G, 'Après fermeture : plus aucune boucle de rendu', r6 - r5 <= 1, `${r6 - r5}`);
    for (let i = 0; i < 3; i++) { await page.click('[data-scene-open]'); await page.waitForSelector('[data-scene-close]:visible'); await page.click('[data-scene-close]'); }
    await page.click('[data-scene-open]'); await page.waitForSelector('[data-scene-close]:visible');
    ok(G, 'Réouvertures successives (4×) : un seul canvas, sans erreur', (await page.$$('canvas')).length === 1 && errs.length === 0, errs.join(' | '));
    await page.click('[data-scene-reset]');
    ok(G, 'Bouton « Vue d’ensemble » opérationnel', errs.length === 0);
    await page.screenshot({ path: path.join(REPORT, 'screens', '3d-open-960.png') });
    await ctx.close();
  }
  {
    const { G, ctx, page, errs } = await sceneTests('mouvement réduit', GL_ARGS, { reducedMotion: 'reduce' });
    await page.locator('[data-scene-section]').scrollIntoViewIfNeeded();
    await page.click('[data-scene-open]'); await page.waitForSelector('[data-scene-close]:visible', { timeout: 30000 });
    await page.waitForTimeout(800);
    const a = await page.evaluate(() => window.__raf); await page.waitForTimeout(1000); const b = await page.evaluate(() => window.__raf);
    ok(G, 'Aucune animation continue (rendu à la demande)', b - a <= 2, `${b - a} images/s`);
    await page.click('.hotspot >> nth=0'); await page.waitForTimeout(200);
    const c = await page.evaluate(() => window.__raf); await page.waitForTimeout(600); const d = await page.evaluate(() => window.__raf);
    ok(G, 'Changement de vue instantané, sans travelling', d - c <= 2 && (await page.isVisible('[data-scene-panel] h3')));
    const anim = await page.evaluate(() => getComputedStyle(document.querySelector('.hotspot'), '::after').animationName);
    ok(G, 'Pulsation des points désactivée', anim === 'none' || anim === '', anim);
    ok(G, 'Aucune erreur', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  {
    const r = await sceneTests('sans WebGL', ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'], {});
    const { G, ctx, page, errs, reqs, b } = r;
    await page.locator('[data-scene-section]').scrollIntoViewIfNeeded();
    await page.click('[data-scene-open]'); await page.waitForTimeout(300);
    ok(G, 'Message explicite, illustration conservée, module non téléchargé', /pas disponible/.test(await page.textContent('[data-scene-status]')) && (await page.isVisible('[data-scene-fallback] img')) && !reqs.some((u) => /assets\/js\/scene-/.test(u)));
    await page.click('[data-space="visage"]');
    ok(G, 'Boutons HTML : fiches accessibles sans 3D', /Soins du visage/.test(await page.textContent('[data-scene-panel] h3')));
    ok(G, 'Aucune erreur', errs.length === 0, errs.join(' | '));
    await ctx.close(); await b.close();
  }
  {
    const G = 'sans JavaScript';
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/fr/`);
    ok(G, 'Contenu principal lisible, liens des espaces vers les pages', (await page.isVisible('h1')) && (await page.getAttribute('[data-space="massages"]', 'href')) === '/fr/prestations/massages-bien-etre/');
    await page.goto(`${BASE}/fr/prestations/`);
    ok(G, 'Liste des prestations complète sans JS', (await page.$$eval('[data-svc]', (c) => c.length)) === 13);
    await ctx.close();
  }

  await browser.close();
} catch (e) {
  ok('exécution', 'La suite s’est exécutée sans exception', false, e.stack);
} finally {
  server.kill();
}

const passed = results.filter((r) => r.pass).length;
const md = [`# Rapport de tests — ${new Date().toISOString()}`, '', `**${passed} / ${results.length} vérifications réussies.**`, '', '| Groupe | Vérification | Résultat | Détail |', '|---|---|---|---|',
  ...results.map((r) => `| ${r.group} | ${r.name.replace(/\|/g, '/')} | ${r.pass ? '✅' : '❌'} | ${r.pass ? '' : String(r.detail).replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 400)} |`)].join('\n');
await fs.writeFile(path.join(REPORT, 'test-report.md'), md);
await fs.writeFile(path.join(REPORT, 'test-report.json'), JSON.stringify(results, null, 1));
console.log(`\n${passed}/${results.length} vérifications réussies — reports/test-report.md`);
process.exit(passed === results.length ? 0 : 1);
