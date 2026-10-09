// Générateur statique Escale Spa.
// Produit le dossier dist/ (à déployer tel quel dans public_html sur Hostinger).
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import sharp from 'sharp';
import subsetFont from 'subset-font';

import config from '../config/site.config.mjs';
import { categories, services, packs } from '../config/catalogue.mjs';
import fr from '../content/fr.mjs';
import en from '../content/en.mjs';
import ar from '../content/ar.mjs';
import { validationData, validationPage } from './validation-page.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.resolve(ROOT, process.env.BD_DIST || 'dist');
// BD_PROTOTYPE=0 : génère la version « mise en ligne » (indexable) pour vérification
if (process.env.BD_PROTOTYPE) config.prototype = process.env.BD_PROTOTYPE !== '0';
const SRC = path.join(ROOT, 'src');
// Typographie française : espaces insécables avant : ; ? ! et à l'intérieur des guillemets
function frenchSpaces(v) {
  if (typeof v === 'string') return v.replace(/ ([:;?!»])/g, '\u202F$1').replace(/« /g, '«\u202F').replace(/(\d) (h|min|MAD|m)\b/g, '$1\u00A0$2');
  if (Array.isArray(v)) return v.map(frenchSpaces);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'routes' ? x : frenchSpaces(x)]));
  return v;
}
// Arabe : isoler le nom latin « Escale Spa » pour un rendu bidirectionnel correct
function isolateBrand(v) {
  if (typeof v === 'string') return v.replace(/Escale Spa/g, '\u2068Escale Spa\u2069');
  if (Array.isArray(v)) return v.map(isolateBrand);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'routes' ? x : isolateBrand(x)]));
  return v;
}
const C = { fr: frenchSpaces(fr), en, ar: isolateBrand(ar) };
(function fixFr(o) { // applique la même règle aux textes français du catalogue et de la configuration
  if (!o || typeof o !== 'object') return;
  for (const [k, v] of Object.entries(o)) { if (k === 'fr') o[k] = frenchSpaces(v); else fixFr(v); }
})([categories, services, packs, config.zones, config.brand]);
const LANGS = config.languages;
const warnings = [];

// ————————————————————————————————— helpers
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const hash = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);
const url = (lang, key, hashPart = '') => `/${lang}/${C[lang].routes[key]}${hashPart}`;
const abs = (p) => config.siteUrl.replace(/\/$/, '') + p;
const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
const svcById = Object.fromEntries(services.map((s) => [s.id, s]));
const numFmt = (lang, n) => new Intl.NumberFormat(lang === 'ar' ? 'ar-MA' : lang, { useGrouping: true }).format(n);

function price(lang, key) {
  const v = config.prices[key];
  if (!(key in config.prices)) warnings.push(`Clé de prix manquante dans site.config.mjs : ${key}`);
  if (v == null) return `<span class="tbc">${esc(C[lang].ui.priceTbc)}</span>`;
  return `${numFmt(lang, v)} ${esc(config.currency[lang])}`;
}
const durationLabel = (lang, m) => (m ? `${numFmt(lang, m)} ${C[lang].ui.min}` : `<span class="tbc">${esc(C[lang].ui.durationTbc)}</span>`);

// ————————————————————————————————— icons (inline SVG, decorative)
const icon = {
  arrow: '<svg class="i i-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  menu: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 8h16M4 16h16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  close: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  clock: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  people: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="9" cy="9" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="16.5" cy="10" r="2.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M14.5 15c2.6-.6 5 .6 6 3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  message: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 18.5 4 21l3.2-1.4A8.5 8.5 0 1 0 5 18.5Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  copy: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="8" y="8" width="11" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  cube: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 0v0M4 7.5l8 4.5 8-4.5M12 12v9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  // Symbole Escale Spa (reconstruction vectorielle d'après le logo de référence) — couleurs via CSS
  arch: '<svg class="logo-mark" viewBox="0 0 100 124" aria-hidden="true" focusable="false"><path class="lg-a" d="M50 0C55 9 66 14 73 19C77 22 79 24 79 27H86V33H91C96 35 98 40 98 46V116L94 124H6L2 116V46C2 40 4 35 9 33H14V27H21C21 24 23 22 27 19C34 14 45 9 50 0Z"/><path class="lg-l" fill="none" stroke-width="1.6" d="M50 8C54 14 63 18 69 23C72 25 74 27 74 30V31.5H81.5V37.5H87C91 39 92.5 43 92.5 47V114.5L89.5 119H10.5L7.5 114.5V47C7.5 43 9 39 13 37.5H18.5V31.5H26V30C26 27 28 25 31 23C37 18 46 14 50 8Z"/><g class="lg-m"><path d="M13 102C24 85 40 84 51 95C60 104 72 107 87 96C76 108 61 110 50 99C41 90 27 90 13 102Z"/><path d="M46.5 96C39 80 42 62 55 50C61 45 64 40 63 35.5C66 41 64 47 58 53C47 64 45 79 50 94Z"/><path d="M47 86C40 77 29 74 20 78C27 84 38 87 47 86Z"/><path d="M53 76C59 67 70 64 78 67C73 74 62 77 53 76Z"/><circle cx="61.5" cy="27.5" r="3.6"/></g></svg>',
};

// ————————————————————————————————— images (manifest rempli par processImages)
const IMG = {};
function img(name, alt, { sizes = '100vw', eager = false, cls = '' } = {}) {
  const m = IMG[name];
  if (!m) { warnings.push(`Image manquante : ${name}`); return ''; }
  const common = `alt="${esc(alt)}" width="${m.w}" height="${m.h}"${cls ? ` class="${cls}"` : ''} ${eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}`;
  if (m.svg) return `<img src="${m.src}" ${common}>`;
  return `<img src="${m.src}" srcset="${m.srcset}" sizes="${sizes}" ${common}>`;
}

// ————————————————————————————————— layout
let ASSETS = {}; // css/js hashed paths

function header(lang, page) {
  const t = C[lang];
  const navKeys = ['services', 'packs', 'riads', 'gallery', 'about', 'contact'];
  const items = navKeys.map((k) => {
    const routeKey = k;
    const current = page.navKey === k;
    return `<li><a href="${url(lang, routeKey)}"${current ? ' aria-current="page"' : ''}>${esc(t.nav[k])}</a></li>`;
  }).join('');
  const langs = LANGS.map((l) => {
    const target = page.alt?.[l] ?? `/${l}/`;
    const cur = l === lang;
    return `<li><a href="${target}" hreflang="${l}" lang="${l}"${cur ? ' aria-current="true"' : ''}><span aria-hidden="true">${esc(C[l].short)}</span><span class="sr-only">${esc(C[l].label)}</span></a></li>`;
  }).join('');
  return `
<a class="skip" href="#contenu">${esc(t.ui.skip)}</a>
${config.prototype ? `<aside class="proto-strip" aria-label="${esc(t.ui.presentation)}"><p><strong>${esc(t.ui.presentation)}</strong><span aria-hidden="true"> · </span><span class="proto-note">${esc(t.ui.presentationNote)}</span></p></aside>` : ''}
<header class="site-header" data-header>
  <div class="wrap header-inner">
    <a class="logo" href="${url(lang, 'home')}" lang="fr" dir="ltr">${icon.arch}<span class="logo-word">Escale Spa</span><span class="sr-only" lang="${lang}"> — ${esc(t.ui.home)}</span></a>
    <nav class="main-nav" id="main-nav" aria-label="${esc(t.ui.mainNav)}" data-nav>
      <ul class="nav-list">${items}</ul>
      <ul class="lang-list" aria-label="${esc(t.ui.langSwitch)}">${langs}</ul>
      <a class="btn btn-primary nav-cta" href="${url(lang, 'booking')}"${page.navKey === 'booking' ? ' aria-current="page"' : ''}>${esc(t.nav.booking)}</a>
    </nav>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="main-nav" data-menu-btn>
      <span class="menu-open">${icon.menu}<span>${esc(t.ui.menu)}</span></span>
      <span class="menu-close">${icon.close}<span>${esc(t.ui.closeMenu)}</span></span>
    </button>
  </div>
</header>`;
}

function footer(lang) {
  const t = C[lang];
  const link = (k, label) => `<li><a href="${url(lang, k)}">${esc(label)}</a></li>`;
  return `
<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="footer-brand">
      <a class="logo logo-light" href="${url(lang, 'home')}" lang="fr" dir="ltr">${icon.arch}<span class="logo-word">Escale Spa</span></a>
      <p>${esc(t.ui.footerAbout)}</p>
      <p class="footer-small">${esc(t.ui.notMedical)}</p>
    </div>
    <nav aria-label="${esc(t.ui.footerNav)}">
      <h2 class="footer-h">${esc(t.nav.services)}</h2>
      <ul>
        ${categories.map((c) => link(c.id, c.title[lang])).join('')}
        ${link('packs', t.nav.packs)}
      </ul>
    </nav>
    <nav aria-label="Escale Spa">
      <h2 class="footer-h">Escale Spa</h2>
      <ul>${link('about', t.nav.about)}${link('riads', t.nav.riads)}${link('gallery', t.nav.gallery)}${link('contact', t.nav.contact)}${link('booking', t.nav.booking)}</ul>
    </nav>
    <nav aria-label="${esc(t.ui.legal)}">
      <h2 class="footer-h">${esc(t.ui.legal)}</h2>
      <ul>${link('privacy', t.pages.privacy.h1)}${link('terms', t.pages.terms.h1)}</ul>
      <p class="footer-small">${esc(t.ui.contactSoon)}</p>
    </nav>
  </div>
  <div class="wrap footer-bottom">
    <p>© ${new Date().getFullYear()} Escale Spa</p>
    ${config.prototype ? `<p class="proto-badge">${esc(t.ui.presentation)}</p>` : ''}
  </div>
</footer>`;
}

function crumbs(lang, trail) {
  const t = C[lang];
  const all = [[t.ui.home, url(lang, 'home')], ...trail];
  return `<nav class="crumbs" aria-label="${esc(t.ui.breadcrumb)}"><ol>${all.map(([label, href], i) => i === all.length - 1
    ? `<li><span aria-current="page">${esc(label)}</span></li>`
    : `<li><a href="${href}">${esc(label)}</a></li>`).join('')}</ol></nav>`;
}

function layout(lang, page) {
  const t = C[lang];
  const canonical = abs(page.path);
  const alternates = LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${abs(page.alt[l])}">`).join('')
    + `<link rel="alternate" hreflang="x-default" href="${abs(page.alt[LANGS[0]])}">`;
  const fontPreload = lang === 'ar'
    ? `<link rel="preload" href="${ASSETS.fonts['plex-ar-400']}" as="font" type="font/woff2" crossorigin><link rel="preload" href="${ASSETS.fonts['amiri-ar-700']}" as="font" type="font/woff2" crossorigin>`
    : `<link rel="preload" href="${ASSETS.fonts['fraunces']}" as="font" type="font/woff2" crossorigin><link rel="preload" href="${ASSETS.fonts['figtree']}" as="font" type="font/woff2" crossorigin>`;
  const data = page.data ? `<script type="application/json" id="bd-data">${JSON.stringify(page.data).replace(/</g, '\\u003c')}</script>` : '';
  return `<!doctype html>
<html lang="${lang}" dir="${t.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
${config.prototype ? '<meta name="robots" content="noindex, nofollow">' : ''}
<link rel="canonical" href="${canonical}">
${alternates}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Escale Spa">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${t.ogLocale}">
<meta property="og:image" content="${abs(ASSETS.ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#FBF7F1">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
${fontPreload}
${page.preloadImg ?? ''}
<script>document.documentElement.classList.add('js')</script>
<link rel="stylesheet" href="${ASSETS.css}">
<script type="module" src="${ASSETS.js}"></script>
</head>
<body class="page-${page.key}${lang === 'ar' ? ' is-rtl' : ''}">
${header(lang, page)}
<main id="contenu" tabindex="-1">
${page.body}
</main>
${footer(lang)}
${data}
</body>
</html>`;
}

// ————————————————————————————————— composants
function zonesLine(lang) {
  const t = C[lang];
  const names = config.zones.map((z) => z.name[lang]).join(' · ');
  const fees = config.zones.every((z) => z.fee == null)
    ? `<span class="tbc">${esc(t.ui.tbc)}</span>`
    : config.zones.map((z) => `${z.name[lang]} : ${z.fee == null ? t.ui.tbc : `${z.fee} ${config.currency[lang]}`}`).join(', ');
  return `<p>${esc(t.ui.zonesProposed)} ${esc(names)}.</p><p>${esc(t.ui.travelFee)} : ${fees}</p>`;
}

function serviceCard(lang, s, { headingLevel = 3, showCat = true } = {}) {
  const t = C[lang];
  const cat = catById[s.category];
  const durs = s.options;
  const H = `h${headingLevel}`;
  return `<article class="svc-card" data-svc data-cat="${s.category}" data-min="${Math.min(...durs)}" data-max="${Math.max(...durs)}" data-groups="${s.groups ? '1' : '0'}">
  ${showCat ? `<p class="kicker">${esc(cat.title[lang])}</p>` : ''}
  <${H} class="svc-card-title"><a href="${url(lang, s.category, `#${s.id}`)}">${esc(s.name[lang])}</a></${H}>
  <p>${esc(s.summary[lang])}</p>
  <ul class="meta">
    <li>${icon.clock}<span>${durs.map((d) => durationLabel(lang, d)).join(' / ')}</span></li>
    ${s.groups ? `<li>${icon.people}<span>${esc(t.ui.groups)}</span></li>` : ''}
  </ul>
  <p class="svc-card-price">${durs.map((d) => price(lang, `${s.id}-${d}`)).filter((v, i, a) => a.indexOf(v) === i).join(' · ')}</p>
  <div class="svc-card-actions">
    <a class="link-arrow" href="${url(lang, s.category, `#${s.id}`)}">${esc(t.ui.seeDetails)}<span class="sr-only"> : ${esc(s.name[lang])}</span>${icon.arrow}</a>
    <a class="btn btn-ghost btn-sm" href="${url(lang, 'booking')}?prestation=${s.id}">${esc(t.ui.bookShort)}<span class="sr-only"> : ${esc(s.name[lang])}</span></a>
  </div>
</article>`;
}

function serviceFiche(lang, s, i) {
  const t = C[lang];
  const list = (arr) => `<ul class="ticks">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return `<article class="fiche" id="${s.id}" aria-labelledby="${s.id}-t">
  <div class="fiche-head">
    <p class="fiche-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</p>
    <div>
      <h2 class="fiche-title" id="${s.id}-t">${esc(s.name[lang])}</h2>
      <p class="fiche-desc">${esc(s.description[lang])}</p>
      ${s.groups ? `<p class="pill">${icon.people}${esc(t.ui.groups)}</p>` : ''}
    </div>
  </div>
  <div class="fiche-body">
    <table class="opt-table">
      <caption class="sr-only">${esc(t.ui.duration)} / ${esc(t.ui.price)} — ${esc(s.name[lang])}</caption>
      <thead><tr><th scope="col">${esc(t.ui.duration)}</th><th scope="col">${esc(t.ui.price)}</th><th scope="col"><span class="sr-only">${esc(t.ui.bookShort)}</span></th></tr></thead>
      <tbody>${s.options.map((d) => `<tr><td>${durationLabel(lang, d)} <span class="tbc tbc-soft">${esc(t.ui.tbc)}</span></td><td>${price(lang, `${s.id}-${d}`)}</td><td><a class="btn btn-primary btn-sm" href="${url(lang, 'booking')}?prestation=${s.id}&amp;duree=${d}">${esc(t.ui.book)}<span class="sr-only"> : ${esc(s.name[lang])}, ${numFmt(lang, d)} ${esc(t.ui.min)}</span></a></td></tr>`).join('')}</tbody>
    </table>
    <div class="fiche-cols">
      <div class="fiche-col"><h3 id="${s.id}-inc">${esc(t.ui.includes)}</h3>${list(s.includes[lang])}</div>
      <div class="fiche-col"><h3 id="${s.id}-kit">${esc(t.ui.kit)}</h3>${list(s.kit[lang])}</div>
      <div class="fiche-col"><h3 id="${s.id}-prep">${esc(t.ui.prep)}</h3>${list(s.prep[lang])}</div>
      <div class="fiche-col"><h3 id="${s.id}-zones">${esc(t.ui.zones)}</h3>${zonesLine(lang)}</div>
    </div>
  </div>
</article>`;
}

function packCard(lang, p, H = 'h3') {
  const t = C[lang];
  return `<article class="pack-card">
  <p class="kicker">${esc(t.ui.pack)}</p>
  <${H} class="pack-title">${esc(p.name[lang])}</${H}>
  <p>${esc(p.description[lang])}</p>
  <dl class="pack-dl">
    <div><dt>${esc(t.ui.contents)}</dt><dd>${p.contents.map((id) => esc(svcById[id].name[lang])).join(' + ')}</dd></div>
    <div><dt>${esc(t.ui.guests)}</dt><dd>${esc(p.guests[lang])}</dd></div>
    <div><dt>${esc(t.ui.duration)}</dt><dd>${durationLabel(lang, p.duration)}${p.duration ? ` <span class="tbc tbc-soft">${esc(t.ui.tbc)}</span>` : ''}</dd></div>
    <div><dt>${esc(t.ui.price)}</dt><dd>${price(lang, p.id)}</dd></div>
  </dl>
  <a class="btn btn-primary btn-sm" href="${url(lang, 'booking')}?prestation=${p.id}">${esc(t.ui.book)}<span class="sr-only"> : ${esc(p.name[lang])}</span></a>
</article>`;
}

const catImage = { massages: 'scene-massage', ongles: 'scene-nails', visage: 'scene-face' };
// Films des services (fournis) : id de média par famille
const catFilm = { massages: { id: 'massage', dur: 8, pos: '38% 50%' }, ongles: { id: 'manicure', dur: 8, pos: '52% 50%' }, visage: { id: 'facial', dur: 2.25, pos: '50% 50%' } };
function posterImg(id, alt, { sizes = '100vw', eager = false, cls = '', pos } = {}) {
  const a = ASSETS.video;
  return `<img class="${cls}" src="${a[`${id}-poster-960`]}" srcset="${a[`${id}-poster-960`]} 960w, ${a[`${id}-poster-1600`]} 1600w" sizes="${sizes}" width="1600" height="900" alt="${esc(alt)}"${pos ? ` style="object-position:${pos}"` : ''} ${eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}>`;
}
function serviceFilm(lang, cat) {
  const t = C[lang]; const f = catFilm[cat.id]; const v = t.film; const a = ASSETS.video;
  const mb = (n) => new Intl.NumberFormat(lang === 'ar' ? 'ar-MA' : lang, { maximumFractionDigits: 1 }).format(n);
  const label = fmt(v.alt, { title: cat.title[lang] });
  // Lecture automatique (muette, en boucle) quand le film devient visible ; une seule source attribuée par JS.
  return `<figure class="film" data-film data-src-sm="${a[`${f.id}-960`]}" data-src-lg="${a[`${f.id}-1600`]}" data-film-id="${f.id}">
  <div class="film-frame">
    ${posterImg(f.id, label, { sizes: '(min-width: 1180px) 1100px, 92vw', eager: true, cls: 'film-poster' })}
    <video class="film-video" muted playsinline loop autoplay preload="none" width="1600" height="900" tabindex="-1" aria-label="${esc(label)}" disablepictureinpicture disableremoteplayback></video>
    <button type="button" class="film-toggle" data-film-toggle hidden aria-pressed="true" aria-label="${esc(v.play)}" data-label-pause="${esc(v.pause)}" data-label-resume="${esc(v.resume)}" data-label-play="${esc(v.play)}">
      <svg class="i i-pause" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
      <svg class="i i-play" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>
      <span class="film-toggle-label" aria-hidden="true">${esc(v.play)}</span>
    </button>
  </div>
  <noscript><p class="film-noscript"><a href="${a[`${f.id}-1600`]}">${esc(v.direct)}</a> (MP4, ${mb(ASSETS.videoSize[`${f.id}-1600`] / 1e6)} ${lang === 'ar' ? 'م.ب' : lang === 'en' ? 'MB' : 'Mo'})</p></noscript>
</figure>`;
}

function pageHead(lang, h1, intro, trail, extra = '') {
  return `<section class="page-head"><div class="wrap">${crumbs(lang, trail)}<h1>${h1}</h1>${intro ? `<p class="lead">${intro}</p>` : ''}${extra}</div></section>`;
}

// ————————————————————————————————— pages
function pHome(lang) {
  const t = C[lang]; const p = t.pages.home;
  const univers = categories.map((c, i) => `<article class="univers-card">
    <div class="univers-media">${posterImg(catFilm[c.id].id, '', { sizes: '(min-width: 1024px) 30vw, (min-width: 700px) 45vw, 90vw', pos: catFilm[c.id].pos })}</div>
    <p class="univers-num" aria-hidden="true">0${i + 1}</p>
    <h3><a href="${url(lang, c.id)}" class="stretched">${esc(c.title[lang])}</a></h3>
    <p>${esc(c.intro[lang])}</p>
    <span class="link-arrow" aria-hidden="true">${esc(t.ui.seeDetails)}${icon.arrow}</span>
  </article>`).join('');
  const how = p.how.map(([h, x], i) => `<li><span class="step-n" aria-hidden="true">${i + 1}</span><h3>${esc(h)}</h3><p>${esc(x)}</p></li>`).join('');
  return `
<section class="hero-v" aria-labelledby="hero-t">
  <div class="hero-media" data-hero data-src-sm="${ASSETS.video['hero-960']}" data-src-lg="${ASSETS.video['hero-1600']}">
    <img class="hero-poster" src="${ASSETS.video['hero-poster-1600']}" srcset="${ASSETS.video['hero-poster-960']} 960w, ${ASSETS.video['hero-poster-1600']} 1600w" sizes="100vw" width="1600" height="900" alt="" fetchpriority="high" decoding="async">
    <video class="hero-video" muted playsinline loop preload="none" width="1600" height="900" aria-hidden="true" tabindex="-1" disablepictureinpicture disableremoteplayback></video>
    <div class="hero-shade" aria-hidden="true"></div>
    <button type="button" class="hero-toggle" data-hero-toggle hidden aria-label="${esc(p.videoPause)}" data-label-pause="${esc(p.videoPause)}" data-label-play="${esc(p.videoPlay)}">
      <svg class="i i-pause" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
      <svg class="i i-play" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>
    </button>
  </div>
  <div class="hero-copy">
    <div class="hero-copy-inner">
      <p class="kicker">${esc(p.heroKicker)}</p>
      <h1 class="hero-title" id="hero-t">${p.heroTitle}</h1>
      <p class="hero-lead">${esc(p.heroText)}</p>
      <div class="btn-row">
        <a class="btn btn-primary hero-cta" href="${url(lang, 'booking')}">${esc(t.ui.bookCta)}</a>
        <a class="btn btn-ghost hero-cta2" href="${url(lang, 'services')}">${esc(p.heroCta2)}</a>
      </div>
    </div>
  </div>
</section>
<section class="statement"><div class="wrap"><p>${p.statement}</p></div></section>
<section class="section" aria-labelledby="univers-t">
  <div class="wrap">
    <div class="section-head"><h2 id="univers-t">${esc(p.universTitle)}</h2><p class="note">${esc(p.universNote)}</p></div>
    <div class="univers-grid">${univers}</div>
  </div>
</section>
<section class="section section-alt" aria-labelledby="how-t">
  <div class="wrap">
    <h2 id="how-t">${esc(p.howTitle)}</h2>
    <ol class="steps">${how}</ol>
  </div>
</section>
${sceneSection(lang)}
<section class="section" aria-labelledby="riads-t">
  <div class="wrap split">
    <div class="split-media">${img('illus-riad', '', { sizes: '(min-width: 900px) 45vw, 92vw' })}</div>
    <div class="split-text">
      <h2 id="riads-t">${esc(p.riadsTitle)}</h2>
      <p>${esc(p.riadsText)}</p>
      <a class="link-arrow" href="${url(lang, 'riads')}">${esc(p.riadsCta)}${icon.arrow}</a>
    </div>
  </div>
</section>
<section class="section section-alt" aria-labelledby="packs-t">
  <div class="wrap">
    <div class="section-head"><h2 id="packs-t">${esc(p.packsTitle)}</h2><a class="link-arrow" href="${url(lang, 'packs')}">${esc(p.packsCta)}${icon.arrow}</a></div>
    <div class="pack-grid">${packs.slice(0, 3).map((pk) => packCard(lang, pk)).join('')}</div>
  </div>
</section>
<section class="section" aria-labelledby="zones-t">
  <div class="wrap zones">
    <div><h2 id="zones-t">${esc(p.zonesTitle)}</h2><p>${esc(p.zonesText)}</p></div>
    <ul class="zone-list">${config.zones.map((z) => `<li>${esc(z.name[lang])}</li>`).join('')}</ul>
  </div>
</section>
${ctaBand(lang)}`;
}

function ctaBand(lang) {
  const t = C[lang]; const p = t.pages.home;
  return `<section class="cta-band"><div class="wrap cta-inner"><h2>${esc(p.ctaTitle)}</h2><p>${esc(p.ctaText)}</p><a class="btn btn-light" href="${url(lang, 'booking')}">${esc(t.ui.bookCta)}</a></div></section>`;
}

function sceneSection(lang) {
  const t = C[lang]; const p = t.pages.home; const s = t.scene;
  const buttons = categories.map((c) => `<li><a class="space-btn" href="${url(lang, c.id)}" data-space="${c.id}"><span class="space-dot" aria-hidden="true"></span>${esc(s.spaces[c.id])}</a></li>`).join('');
  return `<section class="scene-section" aria-labelledby="scene-t" data-scene-section>
  <div class="wrap scene-grid">
    <div class="scene-text">
      <p class="kicker">${esc(p.sceneKicker)}</p>
      <h2 id="scene-t">${esc(p.sceneTitle)}</h2>
      <p>${esc(p.sceneText)}</p>
      <p class="scene-choose" id="scene-choose">${esc(s.choose)}</p>
      <ul class="space-list" aria-labelledby="scene-choose">${buttons}</ul>
      <div class="scene-panel" data-scene-panel hidden tabindex="-1" role="region"></div>
    </div>
    <div class="scene-stage" data-scene-stage>
      <div class="scene-fallback" data-scene-fallback>
        ${img('scene-overview', s.label, { sizes: '(min-width: 1024px) 55vw, 92vw' })}
        <p class="scene-caption">${esc(t.ui.illustration)}</p>
      </div>
      <div class="scene-canvas-wrap" data-scene-canvas hidden></div>
      <div class="scene-controls">
        <button type="button" class="btn btn-light" data-scene-open>${icon.cube}<span>${esc(s.open)}</span></button>
        <button type="button" class="btn btn-light" data-scene-reset hidden>${esc(s.reset)}</button>
        <button type="button" class="btn btn-ghost-light" data-scene-close hidden>${icon.close}<span>${esc(s.close)}</span></button>
      </div>
      <p class="scene-status" data-scene-status role="status"></p>
    </div>
  </div>
</section>`;
}

function sceneData(lang) {
  const t = C[lang];
  return {
    scene: { ...t.scene,
      cats: Object.fromEntries(categories.map((c) => [c.id, {
        title: c.title[lang], intro: c.intro[lang], href: url(lang, c.id), book: `${url(lang, 'booking')}`,
        services: services.filter((s) => s.category === c.id).map((s) => s.name[lang]),
      }])),
      module: ASSETS.sceneJs,
    },
  };
}

function pServices(lang) {
  const t = C[lang]; const p = t.pages.services;
  const radio = (name, value, label, checked) => `<label class="chip"><input type="radio" name="${name}" value="${value}"${checked ? ' checked' : ''}><span>${esc(label)}</span></label>`;
  const filters = `<form class="filters js-only" data-filters aria-labelledby="filters-t">
    <h2 class="sr-only" id="filters-t">${esc(p.filtersLabel)}</h2>
    <fieldset><legend>${esc(p.fCategory)}</legend><div class="chips">${radio('cat', 'all', p.fAll, true)}${categories.map((c) => radio('cat', c.id, c.title[lang])).join('')}</div></fieldset>
    <fieldset><legend>${esc(p.fDuration)}</legend><div class="chips">${radio('dur', 'any', p.fAny, true)}${radio('dur', 'short', p.fShort)}${radio('dur', 'mid', p.fMid)}${radio('dur', 'long', p.fLong)}</div></fieldset>
    <div class="filters-foot">
      <label class="check"><input type="checkbox" name="groups" value="1"><span>${esc(p.fGroups)}</span></label>
      <button type="reset" class="btn btn-ghost btn-sm">${esc(p.reset)}</button>
    </div>
  </form>
  <p class="results" data-results role="status" data-tpl="${esc(p.results)}"></p>
  <p class="no-results" data-no-results hidden>${esc(p.noResults)}</p>`;
  const body = `${pageHead(lang, esc(p.h1), esc(p.intro), [[p.h1, url(lang, 'services')]])}
<section class="section section-tight"><div class="wrap">
  <p class="note note-box">${esc(p.hypothesis)}</p>
  ${filters}
  <div class="svc-grid" data-svc-grid>${services.map((s) => serviceCard(lang, s, { headingLevel: 2 })).join('')}</div>
</div></section>
<section class="section section-alt" aria-labelledby="packs-t"><div class="wrap">
  <div class="section-head"><h2 id="packs-t">${esc(t.pages.packs.packsTitle)}</h2><a class="link-arrow" href="${url(lang, 'packs')}">${esc(t.nav.packs)}${icon.arrow}</a></div>
  <div class="pack-grid pack-grid-4">${packs.map((pk) => packCard(lang, pk)).join('')}</div>
</div></section>`;
  return { title: p.title, description: p.description, body, navKey: 'services', data: { filters: { results: p.results } } };
}

function pCategory(lang, cat) {
  const t = C[lang]; const p = t.pages.category;
  const list = services.filter((s) => s.category === cat.id);
  const others = categories.filter((c) => c.id !== cat.id);
  const body = `${pageHead(lang, esc(cat.title[lang]), esc(cat.intro[lang]), [[t.pages.services.h1, url(lang, 'services')], [cat.title[lang], url(lang, cat.id)]])}
<section class="section section-tight film-section"><div class="wrap">
  ${serviceFilm(lang, cat)}
</div></section>
<section class="section section-tight"><div class="wrap cat-intro-text">
  <p class="kicker">${esc(cat.kicker[lang])}</p>
  <ul class="toc">${list.map((s) => `<li><a href="#${s.id}">${esc(s.name[lang])}</a></li>`).join('')}</ul>
  <p class="note note-box">${esc(t.pages.services.hypothesis)}</p>
</div></section>
<section class="section section-tight"><div class="wrap fiches">${list.map((s, i) => serviceFiche(lang, s, i)).join('')}</div></section>
<section class="section section-alt"><div class="wrap good">
  <h2>${esc(p.goodToKnow)}</h2><p>${p.goodToKnowText}</p>
</div></section>
<section class="section"><div class="wrap">
  <h2>${esc(p.other)}</h2>
  <ul class="other-cats">${others.map((c) => `<li><a href="${url(lang, c.id)}"><span>${esc(c.title[lang])}</span>${icon.arrow}</a></li>`).join('')}</ul>
</div></section>
${ctaBand(lang)}`;
  return { title: `${cat.title[lang]} — Escale Spa`, description: fmt(p.description, { title: cat.title[lang] }), body, navKey: 'services', preloadImg: `<link rel="preload" as="image" imagesrcset="${ASSETS.video[`${catFilm[cat.id].id}-poster-960`]} 960w, ${ASSETS.video[`${catFilm[cat.id].id}-poster-1600`]} 1600w" imagesizes="(min-width: 1180px) 1100px, 92vw" fetchpriority="high">` };
}

function pPacks(lang) {
  const t = C[lang]; const p = t.pages.packs;
  const rows = categories.map((c) => `<tbody><tr class="row-cat"><th scope="rowgroup" colspan="3">${esc(c.title[lang])}</th></tr>${services.filter((s) => s.category === c.id).flatMap((s) => s.options.map((d) => `<tr><th scope="row"><a href="${url(lang, c.id, `#${s.id}`)}">${esc(s.name[lang])}</a></th><td>${durationLabel(lang, d)}</td><td>${price(lang, `${s.id}-${d}`)}</td></tr>`)).join('')}</tbody>`).join('');
  const body = `${pageHead(lang, esc(p.h1), p.intro, [[p.h1, url(lang, 'packs')]])}
<section class="section section-tight" aria-labelledby="pk-t"><div class="wrap">
  <h2 id="pk-t">${esc(p.packsTitle)}</h2>
  <div class="pack-grid pack-grid-4">${packs.map((pk) => packCard(lang, pk)).join('')}</div>
</div></section>
<section class="section section-alt" aria-labelledby="tbl-t"><div class="wrap">
  <h2 id="tbl-t">${esc(p.tableTitle)}</h2>
  <div class="table-scroll" tabindex="0" role="region" aria-label="${esc(p.tableCaption)}">
  <table class="price-table"><caption>${esc(p.tableCaption)}</caption>
    <thead><tr><th scope="col">${esc(p.thService)}</th><th scope="col">${esc(p.thDuration)}</th><th scope="col">${esc(p.thPrice)}</th></tr></thead>
    ${rows}
  </table></div>
</div></section>
<section class="section" id="deplacement"><div class="wrap two-col">
  <div><h2>${esc(p.travelTitle)}</h2><p>${esc(p.travelText)}</p>${zonesLine(lang)}</div>
  <div><h2>${esc(p.notesTitle)}</h2><ul class="ticks">${p.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>
</div></section>
${ctaBand(lang)}`;
  return { title: p.title, description: p.description, body, navKey: 'packs' };
}

function pAbout(lang) {
  const t = C[lang]; const p = t.pages.about;
  const body = `${pageHead(lang, esc(p.h1), '', [[p.h1, url(lang, 'about')]])}
<section class="section section-tight"><div class="wrap about-lead">
  <p class="big-quote">${esc(p.lead)}</p>
</div></section>
<section class="section"><div class="wrap split">
  <div class="split-media">${img('illus-argan', '', { sizes: '(min-width: 900px) 45vw, 92vw' })}</div>
  <div class="split-text"><h2>${esc(p.whyTitle)}</h2><p>${esc(p.why)}</p></div>
</div></section>
<section class="section section-alt" aria-labelledby="commit-t"><div class="wrap">
  <div class="section-head"><h2 id="commit-t">${esc(p.commitTitle)}</h2><p class="note">${esc(p.commitNote)}</p></div>
  <ul class="commit-grid">${p.commits.map(([h, x]) => `<li><h3>${esc(h)}</h3><p>${esc(x)}</p></li>`).join('')}</ul>
</div></section>
<section class="section" aria-labelledby="pro-t"><div class="wrap placeholder-block">
  <div class="placeholder-portrait" aria-hidden="true">${icon.arch}</div>
  <div><h2 id="pro-t">${esc(p.proTitle)} <span class="tbc">${esc(t.ui.tbc)}</span></h2><p>${esc(p.proText)}</p></div>
</div></section>
${ctaBand(lang)}`;
  return { title: p.title, description: p.description, body, navKey: 'about' };
}

const GALLERY = [
  { id: 'scene-overview', cat: 'ambiance', wide: true },
  { id: 'scene-massage', cat: 'massages' },
  { id: 'illus-nails', cat: 'ongles' },
  { id: 'scene-face', cat: 'visage', tall: true },
  { id: 'illus-argan', cat: 'massages' },
  { id: 'scene-nails', cat: 'ongles' },
  { id: 'illus-face', cat: 'visage' },
  { id: 'illus-riad', cat: 'ambiance', wide: true },
];

function pGallery(lang) {
  const t = C[lang]; const p = t.pages.gallery;
  const radio = (v, label, checked) => `<label class="chip"><input type="radio" name="g" value="${v}"${checked ? ' checked' : ''}><span>${esc(label)}</span></label>`;
  const items = GALLERY.map((g, i) => `<li class="g-item${g.wide ? ' g-wide' : ''}${g.tall ? ' g-tall' : ''}" data-g-cat="${g.cat}">
    <figure>
      <button type="button" class="g-open" data-g-index="${i}" aria-label="${esc(p.open)} : ${esc(p.items[g.id])}" disabled>
        ${img(g.id, p.items[g.id], { sizes: g.wide ? '(min-width: 900px) 66vw, 92vw' : '(min-width: 900px) 33vw, (min-width:600px) 46vw, 92vw' })}
      </button>
      <figcaption>${esc(p.items[g.id])} <span class="g-tag">${esc(t.ui.illustration)}</span></figcaption>
    </figure>
  </li>`).join('');
  const body = `${pageHead(lang, esc(p.h1), esc(p.intro), [[p.h1, url(lang, 'gallery')]])}
<section class="section section-tight"><div class="wrap">
  <form class="filters filters-inline js-only" data-g-filters><fieldset><legend>${esc(p.filter)}</legend><div class="chips">
    ${radio('all', p.all, true)}${categories.map((c) => radio(c.id, c.title[lang])).join('')}${radio('ambiance', p.ambiance)}
  </div></fieldset></form>
  <ul class="gallery" data-gallery>${items}</ul>
</div></section>
<dialog class="lightbox" data-lightbox aria-label="${esc(p.h1)}">
  <div class="lb-inner">
    <img alt="" data-lb-img>
    <p class="lb-caption"><span data-lb-cap></span> <span class="lb-count" data-lb-count></span></p>
    <div class="lb-nav">
      <button type="button" class="btn btn-ghost-light btn-sm" data-lb-prev>${esc(p.prev)}</button>
      <button type="button" class="btn btn-ghost-light btn-sm" data-lb-next>${esc(p.next)}</button>
      <button type="button" class="btn btn-light btn-sm" data-lb-close>${icon.close}<span>${esc(p.close)}</span></button>
    </div>
  </div>
</dialog>`;
  const data = { gallery: { count: p.count, items: GALLERY.map((g) => ({ src: IMG[g.id].large, cap: p.items[g.id], w: IMG[g.id].w, h: IMG[g.id].h })) } };
  return { title: p.title, description: p.description, body, navKey: 'gallery', data };
}

function field({ id, label, type = 'text', hint, required = true, attrs = '', control }) {
  const hintId = hint ? `${id}-hint` : '';
  const describedby = [hintId, `${id}-err`].filter(Boolean).join(' ');
  const ctl = control ?? `<input id="${id}" name="${id}" type="${type}" ${required ? 'required aria-required="true"' : ''} aria-describedby="${describedby}" ${attrs}>`;
  return `<div class="field" data-field="${id}">
  <label for="${id}">${esc(label)}${required ? '' : ''}</label>
  ${hint ? `<p class="hint" id="${hintId}">${esc(hint)}</p>` : ''}
  ${ctl}
  <p class="err" id="${id}-err" data-err-for="${id}" hidden></p>
</div>`;
}

function pRiads(lang) {
  const t = C[lang]; const p = t.pages.riads; const f = p.pf;
  const body = `${pageHead(lang, esc(p.h1), esc(p.lead), [[p.h1, url(lang, 'riads')]])}
<section class="section section-tight"><div class="wrap">
  <ul class="block-grid">${p.blocks.map(([h, x], i) => `<li><p class="univers-num" aria-hidden="true">0${i + 1}</p><h2>${esc(h)}</h2><p>${esc(x)}</p></li>`).join('')}</ul>
</div></section>
<section class="section section-alt"><div class="wrap split">
  <div class="split-media">${img('illus-riad', '', { sizes: '(min-width: 900px) 45vw, 92vw' })}</div>
  <div class="split-text">
    <h2>${esc(p.howTitle)}</h2>
    <ol class="num-list">${p.how.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
    <a class="btn btn-primary" href="${url(lang, 'booking')}?prestation=pack-evenement">${esc(p.ctaBook)}</a>
  </div>
</div></section>
<section class="section" aria-labelledby="partner-t"><div class="wrap form-wrap">
  <div class="form-intro"><h2 id="partner-t">${esc(p.partnerTitle)}</h2><p>${p.partnerText}</p></div>
  <form class="form card" data-partner-form novalidate>
    <div class="err-summary" data-err-summary tabindex="-1" hidden><p><strong>${esc(t.pages.booking.errors.title)}</strong></p><ul></ul></div>
    <div class="grid-2">
      ${field({ id: 'pf-venue', label: f.venue, attrs: 'autocomplete="organization" maxlength="120"' })}
      ${field({ id: 'pf-type', label: f.type, control: `<select id="pf-type" name="pf-type" required aria-required="true" aria-describedby="pf-type-err"><option value=""></option>${f.types.map((x) => `<option>${esc(x)}</option>`).join('')}</select>` })}
      ${field({ id: 'pf-name', label: f.name, attrs: 'autocomplete="name" maxlength="80"' })}
      ${field({ id: 'pf-role', label: f.role, required: false, attrs: 'autocomplete="organization-title" maxlength="80"' })}
      ${field({ id: 'pf-contact', label: f.contact, attrs: 'maxlength="120"' })}
      ${field({ id: 'pf-area', label: f.area, required: false, attrs: 'maxlength="80"' })}
    </div>
    ${field({ id: 'pf-message', label: f.message, hint: f.messageHint, required: false, control: `<textarea id="pf-message" name="pf-message" rows="4" maxlength="800" aria-describedby="pf-message-hint"></textarea>` })}
    <button class="btn btn-primary" type="submit">${esc(f.submit)}</button>
    <div class="preview" data-preview hidden tabindex="-1">
      <label for="pf-preview">${esc(t.pages.booking.messageLabel)}</label>
      <textarea id="pf-preview" readonly rows="8" data-preview-text></textarea>
      <div class="btn-row"><button type="button" class="btn btn-ghost" data-copy>${icon.copy}<span>${esc(t.pages.booking.copy)}</span></button></div>
      <p class="copy-status" data-copy-status role="status"></p>
      <p class="note">${esc(t.pages.booking.prototypeNote)}</p>
    </div>
  </form>
</div></section>`;
  return { title: p.title, description: p.description, body, navKey: 'riads', data: { partner: { errors: t.pages.booking.errors, copy: t.pages.booking, labels: f, intro: lang === 'fr' ? 'Bonjour Escale Spa, je souhaite présenter notre établissement :' : lang === 'en' ? 'Hello Escale Spa, I would like to introduce our property:' : 'مرحباً Escale Spa، أودّ تقديم مؤسستنا:' } } };
}

function pBooking(lang) {
  const t = C[lang]; const p = t.pages.booking; const e = p.errors;
  const svcOptions = categories.map((c) => `<optgroup label="${esc(c.title[lang])}">${services.filter((s) => s.category === c.id).map((s) => `<option value="${s.id}" data-durations="${s.options.join(',')}">${esc(s.name[lang])}</option>`).join('')}</optgroup>`).join('')
    + `<optgroup label="${esc(p.packsGroup)}">${packs.map((pk) => `<option value="${pk.id}" data-durations="${pk.duration ?? ''}">${esc(pk.name[lang])}</option>`).join('')}</optgroup>`;
  const steps = p.steps.map((s, i) => `<li data-step-ind="${i}"${i === 0 ? ' class="is-current"' : ''}><span class="si-n" aria-hidden="true">${i + 1}</span><span class="si-l">${esc(s)}</span></li>`).join('');
  const venues = Object.entries(p.venues).map(([k, v]) => `<label class="choice"><input type="radio" name="venue" value="${k}" required><span>${esc(v)}</span></label>`).join('');
  const stepNav = (i, last = false) => `<div class="step-nav">${i > 0 ? `<button type="button" class="btn btn-ghost" data-prev>${esc(p.back)}</button>` : '<span></span>'}<button type="${last ? 'submit' : 'button'}" class="btn btn-primary" ${last ? '' : 'data-next'}>${esc(last ? p.review : p.next)}</button></div>`;
  const fs_ = (i, inner) => `<fieldset class="step${i === 0 ? ' is-active' : ''}" data-step="${i}" aria-labelledby="step-${i}-t"><legend id="step-${i}-t"><span class="step-of">${esc(fmt(p.stepOf, { i: i + 1, n: 6 }))}</span> ${esc(p.steps[i])}</legend>${inner}${stepNav(i, i === 4)}</fieldset>`;
  const body = `${pageHead(lang, esc(p.h1), esc(p.intro), [[p.h1, url(lang, 'booking')]])}
<section class="section section-tight"><div class="wrap booking-wrap">
  <ol class="step-ind" data-step-ind-list aria-hidden="true">${steps}</ol>
  <noscript><p class="note-box">${esc(p.noscript)}</p></noscript>
  <form class="form card booking-form" data-booking novalidate>
    <div class="err-summary" data-err-summary tabindex="-1" hidden><p><strong>${esc(e.title)}</strong></p><ul></ul></div>
    ${fs_(0, `${field({ id: 'service', label: p.service, control: `<select id="service" name="service" required aria-required="true" aria-describedby="service-err"><option value="">${esc(p.servicePlaceholder)}</option>${svcOptions}</select>` })}
      ${field({ id: 'duration', label: p.duration, required: false, control: `<select id="duration" name="duration" aria-describedby="duration-err"></select>` })}`)}
    ${fs_(1, `<p class="hint">${esc(p.dateHint)}</p><div class="grid-2">${field({ id: 'date', label: p.date, type: 'date' })}${field({ id: 'time', label: p.time, type: 'time', attrs: 'step="900"' })}</div>`)}
    ${fs_(2, `${field({ id: 'area', label: p.area, control: `<select id="area" name="area" required aria-required="true" aria-describedby="area-err"><option value="">${esc(p.areaPlaceholder)}</option>${config.zones.map((z) => `<option value="${z.id}">${esc(z.name[lang])}</option>`).join('')}<option value="other">${esc(p.otherZone)}</option></select>` })}
      <div data-area-other hidden>${field({ id: 'areaOther', label: p.areaOther, attrs: 'maxlength="100" autocomplete="address-level3"' })}</div>
      <div class="field" data-field="venue"><fieldset class="choices" aria-describedby="venue-err"><legend>${esc(p.venue)}</legend><div class="choice-row">${venues}</div></fieldset><p class="hint" data-hotel-note hidden>${esc(p.hotelNote)}</p><p class="err" id="venue-err" data-err-for="venue" hidden></p></div>`)}
    ${fs_(3, field({ id: 'guests', label: p.guests, type: 'number', hint: p.guestsHint, attrs: `min="1" max="${config.maxGuests}" value="1" inputmode="numeric"` }))}
    ${fs_(4, `<div class="grid-2">${field({ id: 'name', label: p.name, attrs: 'autocomplete="name" maxlength="80"' })}${field({ id: 'phone', label: p.phone, type: 'tel', hint: p.phoneHint, attrs: 'autocomplete="tel" maxlength="20" dir="ltr"' })}</div>
      ${field({ id: 'note', label: p.note, hint: p.noteHint, required: false, control: `<textarea id="note" name="note" rows="3" maxlength="400" aria-describedby="note-hint"></textarea>` })}
      <div class="field" data-field="consent"><label class="check"><input type="checkbox" id="consent" name="consent" required aria-describedby="consent-err"><span>${fmt(p.consent, { privacy: url(lang, 'privacy') })}</span></label><p class="err" id="consent-err" data-err-for="consent" hidden></p></div>`)}
    <section class="step summary" data-step="5" aria-labelledby="sum-t" tabindex="-1">
      <h2 id="sum-t"><span class="step-of">${esc(fmt(p.stepOf, { i: 6, n: 6 }))}</span> ${esc(p.summaryTitle)}</h2>
      <dl class="sum-dl" data-summary></dl>
      <p class="pending"><strong>${esc(p.pending)}</strong></p>
      <label for="wa-preview">${esc(p.messageLabel)}</label>
      <textarea id="wa-preview" readonly rows="10" data-preview-text></textarea>
      <div class="btn-row">
        <button type="button" class="btn btn-primary" data-copy>${icon.copy}<span>${esc(p.copy)}</span></button>
        <a class="btn btn-ghost" data-wa href="#" hidden>${icon.message}<span>${esc(p.whatsapp)}</span></a>
        <button type="button" class="btn btn-ghost" data-wa-off aria-disabled="true" aria-describedby="wa-off-note">${icon.message}<span>${esc(p.whatsapp)}</span></button>
      </div>
      <p class="note" id="wa-off-note" data-wa-off-note>${esc(p.whatsappOff)}</p>
      <p class="copy-status" data-copy-status role="status"></p>
      <p class="note">${esc(p.prototypeNote)}</p>
      <div class="step-nav"><button type="button" class="btn btn-ghost" data-edit>${esc(p.edit)}</button></div>
    </section>
  </form>
</div></section>`;
  const data = { booking: {
    errors: e, msg: p.msg, copied: p.copied, copyFail: p.copyFail, min: t.ui.min, durationTbc: t.ui.durationTbc,
    labels: { service: p.service, duration: p.duration, date: p.date, time: p.time, area: p.area, venue: p.venue, guests: p.guests, name: p.name, phone: p.phone, note: p.note },
    venues: p.venues, whatsapp: config.contact.whatsapp, maxGuests: config.maxGuests, lang,
  } };
  return { title: p.title, description: p.description, body, navKey: 'booking', data };
}

function pContact(lang) {
  const t = C[lang]; const p = t.pages.contact;
  const val = (v, kind) => (v ? (kind === 'email' ? `<a href="mailto:${esc(v)}">${esc(v)}</a>` : kind === 'url' ? `<a href="${esc(v)}" rel="noopener">${esc(v)}</a>` : esc(v)) : `<span class="tbc">${esc(t.ui.contactSoon)}</span>`);
  const wa = config.contact.whatsapp
    ? `<a class="btn btn-primary" href="https://wa.me/${config.contact.whatsapp}" data-track="whatsapp_click" rel="noopener">${icon.message}<span>WhatsApp</span></a>`
    : `<button type="button" class="btn btn-ghost" aria-disabled="true" aria-describedby="wa-note">${icon.message}<span>WhatsApp</span></button><p class="note" id="wa-note">${esc(t.ui.whatsappUnavailable)}</p>`;
  const body = `${pageHead(lang, esc(p.h1), esc(p.lead), [[p.h1, url(lang, 'contact')]])}
<section class="section section-tight"><div class="wrap contact-grid">
  <div class="card coords">
    <h2>${esc(p.coordsTitle)}</h2>
    <dl class="coord-dl">
      <div><dt>${esc(p.phone)}</dt><dd>${val(config.contact.phoneDisplay)}</dd></div>
      <div><dt>${esc(p.email)}</dt><dd>${val(config.contact.email, 'email')}</dd></div>
      <div><dt>${esc(p.instagram)}</dt><dd>${val(config.contact.instagram, 'url')}</dd></div>
      <div><dt>${esc(t.ui.hours)}</dt><dd>${config.hours ? esc(config.hours[lang]) : `<span class="tbc">${esc(t.ui.hoursTbc)}</span>`}</dd></div>
      <div><dt>${esc(t.ui.zones)}</dt><dd>${config.zones.map((z) => esc(z.name[lang])).join(' · ')} <span class="tbc">${esc(t.ui.tbc)}</span></dd></div>
    </dl>
    <div class="btn-row">${wa}<a class="btn btn-primary" href="${url(lang, 'booking')}">${esc(t.ui.bookCta)}</a></div>
  </div>
  <div class="faq">
    <h2>${esc(p.faqTitle)}</h2>
    ${p.faq.map(([q, a], i) => `<details class="faq-item" id="faq-${i + 1}"><summary>${esc(q)}</summary><div class="faq-a"><p>${esc(a)}</p></div></details>`).join('')}
  </div>
</div></section>`;
  return { title: p.title, description: p.description, body, navKey: 'contact' };
}

function pLegal(lang, key) {
  const t = C[lang]; const p = t.pages[key];
  const body = `${pageHead(lang, esc(p.h1), '', [[p.h1, url(lang, key)]], `<p class="draft-banner" role="note">${esc(t.ui.draft)}</p>`)}
<section class="section section-tight"><div class="wrap prose">
  ${p.sections.map(([h, x]) => `<h2>${esc(h)}</h2><p>${esc(x).replace(/\[(.+?)\]/g, '<mark class="todo">[$1]</mark>')}</p>`).join('')}
</div></section>`;
  return { title: p.title, description: p.description, body, navKey: null };
}

function p404(lang) {
  const t = C[lang]; const p = t.pages.notFound;
  return { title: p.title, description: p.text, navKey: null, body: `<section class="page-head page-404"><div class="wrap"><p class="big-404" aria-hidden="true">404</p><h1>${esc(p.h1)}</h1><p class="lead">${esc(p.text)}</p><div class="btn-row"><a class="btn btn-primary" href="${url(lang, 'home')}">${esc(t.ui.home)}</a><a class="btn btn-ghost" href="${url(lang, 'services')}">${esc(t.ui.seeAll)}</a></div></div></section>` };
}

function preload(name, sizes) {
  const m = IMG[name];
  if (!m || m.svg) return '';
  return `<link rel="preload" as="image" imagesrcset="${m.srcset}" imagesizes="${sizes}" fetchpriority="high">`;
}

// ————————————————————————————————— assets
async function processImages() {
  const srcDir = path.join(SRC, 'img');
  const out = path.join(DIST, 'assets', 'img');
  await fs.mkdir(out, { recursive: true });
  for (const f of await fs.readdir(srcDir)) {
    const name = f.replace(/\.(png|jpg|svg)$/, '');
    const full = path.join(srcDir, f);
    if (f.endsWith('.svg')) {
      const buf = await fs.readFile(full);
      const m = /viewBox="0 0 (\d+) (\d+)"/.exec(buf.toString());
      const h = hash(buf);
      await fs.writeFile(path.join(out, `${name}-${h}.svg`), buf);
      IMG[name] = { svg: true, src: `/assets/img/${name}-${h}.svg`, large: `/assets/img/${name}-${h}.svg`, w: +m[1], h: +m[2] };
      continue;
    }
    if (!/\.(png|jpg)$/.test(f)) continue;
    const meta = await sharp(full).metadata();
    const widths = [480, 800, 1200, 1600].filter((w) => w <= meta.width);
    const set = [];
    for (const w of widths) {
      const buf = await sharp(full).resize({ width: w }).webp({ quality: 78, effort: 5 }).toBuffer();
      const fn = `${name}-${w}-${hash(buf)}.webp`;
      await fs.writeFile(path.join(out, fn), buf);
      set.push([w, `/assets/img/${fn}`]);
    }
    let ogName = null;
    if (name === 'scene-overview') {
      const og = await sharp(full).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();
      ogName = `${name}-og-${hash(og)}.jpg`;
      await fs.writeFile(path.join(out, ogName), og);
    }
    IMG[name] = {
      src: set.find(([w]) => w === 800)?.[1] ?? set[0][1], srcset: set.map(([w, s]) => `${s} ${w}w`).join(', '),
      large: set.at(-1)[1], og: `/assets/img/${ogName}`, w: meta.width, h: meta.height,
    };
  }
}

async function processVideo() {
  // Dérivés vidéo (H.264 yuv420p, faststart) et affiches WebP — l'original reste dans assets-src/
  const dir = path.join(SRC, 'video'); const out = path.join(DIST, 'assets', 'video');
  await fs.mkdir(out, { recursive: true }); ASSETS.video = {};
  for (const f of await fs.readdir(dir)) {
    const buf = await fs.readFile(path.join(dir, f)); const [name, ext] = [f.replace(/\.[^.]+$/, ''), path.extname(f)];
    const fn = `${name}-${hash(buf)}${ext}`; await fs.writeFile(path.join(out, fn), buf); ASSETS.video[name] = `/assets/video/${fn}`; (ASSETS.videoSize ||= {})[name] = buf.length;
  }  const og = await sharp(path.join(ROOT, 'assets-src', 'hero-frame-0.png')).resize(1200, 630, { fit: 'cover', position: 'attention' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  const ogName = `og-escale-spa-${hash(og)}.jpg`; await fs.writeFile(path.join(out, ogName), og); ASSETS.ogImage = `/assets/video/${ogName}`;
}

async function processFonts() {
  const out = path.join(DIST, 'assets', 'fonts');
  await fs.mkdir(out, { recursive: true });
  const nm = path.join(ROOT, 'node_modules');
  const files = {
    fraunces: '@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2',
    'fraunces-italic': '@fontsource-variable/fraunces/files/fraunces-latin-wght-italic.woff2',
    figtree: '@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2',
    'amiri-ar-700': '@fontsource/amiri/files/amiri-arabic-700-normal.woff2',
    'plex-ar-400': '@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-400-normal.woff2',
    'plex-ar-600': '@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-600-normal.woff2',
  };
  // Polices arabes : sous-ensemble = toutes les lettres arabes de base (U+0621–U+0652)
  // + tout caractère arabe présent dans les contenus. Recalculé à chaque compilation.
  const used = new Set([...JSON.stringify([C.ar, categories, services, packs, config])].filter((c) => /[\u0600-\u06FF]/.test(c)));
  let arChars = [...used].join('') + '\u060C\u061B\u061F\u0640\u066A\u066B\u066C\u200C\u200D\u200E\u200F\u2068\u2069 0123456789.,:;!?()«»-–—…/·%+×';
  for (let c = 0x0621; c <= 0x0652; c++) arChars += String.fromCodePoint(c);
  ASSETS.fonts = {};
  for (const [k, rel] of Object.entries(files)) {
    let buf = await fs.readFile(path.join(nm, rel));
    if (k.includes('-ar-')) buf = Buffer.from(await subsetFont(buf, arChars, { targetFormat: 'woff2' }));
    const fn = `${k}-${hash(buf)}.woff2`;
    await fs.writeFile(path.join(out, fn), buf);
    ASSETS.fonts[k] = `/assets/fonts/${fn}`;
  }
}

async function processCss() {
  let css = await fs.readFile(path.join(SRC, 'css', 'main.css'), 'utf8');
  css = css.replace(/__FONT_([a-z0-9-]+)__/g, (_, k) => ASSETS.fonts[k]);
  const r = await esbuild.transform(css, { loader: 'css', minify: true, target: ['chrome100', 'safari15', 'firefox100'] });
  const fn = `main-${hash(r.code)}.css`;
  await fs.mkdir(path.join(DIST, 'assets', 'css'), { recursive: true });
  await fs.writeFile(path.join(DIST, 'assets', 'css', fn), r.code);
  ASSETS.css = `/assets/css/${fn}`;
  // Feuille de la page cachée de validation
  const vcss = await fs.readFile(path.join(SRC, 'css', 'validation.css'), 'utf8');
  const vr = await esbuild.transform(vcss, { loader: 'css', minify: true, target: ['chrome100', 'safari15', 'firefox100'] });
  const vfn = `validation-${hash(vr.code)}.css`;
  await fs.writeFile(path.join(DIST, 'assets', 'css', vfn), vr.code);
  ASSETS.validationCss = `/assets/css/${vfn}`;
}

async function processJs() {
  const r = await esbuild.build({
    entryPoints: { main: path.join(SRC, 'js', 'main.js'), scene: path.join(SRC, 'js', 'scene.js'), validation: path.join(SRC, 'js', 'validation.js') },
    bundle: true, splitting: true, format: 'esm', minify: true, sourcemap: false,
    target: ['chrome100', 'safari15', 'firefox100'],
    outdir: path.join(DIST, 'assets', 'js'), entryNames: '[name]-[hash]', chunkNames: 'chunk-[hash]',
    metafile: true, legalComments: 'external', logLevel: 'warning',
    define: { __ANALYTICS_ENABLED__: JSON.stringify(!!config.analytics.enabled) },
  });
  for (const [out, info] of Object.entries(r.metafile.outputs)) {
    const p = '/' + path.relative(DIST, path.resolve(ROOT, out)).split(path.sep).join('/');
    if (info.entryPoint?.endsWith('main.js')) ASSETS.js = p;
    if (info.entryPoint?.endsWith('scene.js')) ASSETS.sceneJs = p;
    if (info.entryPoint?.endsWith('validation.js')) ASSETS.validationJs = p;
  }
  ASSETS.jsMeta = r.metafile;
}

async function copyStatic() {
  const dir = path.join(SRC, 'static');
  for (const f of await fs.readdir(dir)) await fs.copyFile(path.join(dir, f), path.join(DIST, f));
  // favicons dérivés du SVG
  const svg = await fs.readFile(path.join(dir, 'favicon.svg'));
  await sharp(svg, { density: 300 }).resize(180, 180).flatten({ background: '#FBF7F1' }).png().toFile(path.join(DIST, 'apple-touch-icon.png'));
  const png32 = await sharp(svg, { density: 300 }).resize(32, 32).png().toBuffer();
  await fs.writeFile(path.join(DIST, 'favicon.ico'), icoFromPng(png32, 32));
}
function icoFromPng(png, size) {
  const h = Buffer.alloc(22);
  h.writeUInt16LE(0, 0); h.writeUInt16LE(1, 2); h.writeUInt16LE(1, 4);
  h.writeUInt8(size, 6); h.writeUInt8(size, 7); h.writeUInt8(0, 8); h.writeUInt8(0, 9);
  h.writeUInt16LE(1, 10); h.writeUInt16LE(32, 12); h.writeUInt32LE(png.length, 14); h.writeUInt32LE(22, 18);
  return Buffer.concat([h, png]);
}

// ————————————————————————————————— main
async function main() {
  const t0 = Date.now();
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(DIST, { recursive: true });
  await processImages();
  await processFonts();
  await processVideo();
  await processCss();
  await processJs();
  await copyStatic();

  const pageKeys = ['home', 'services', 'massages', 'ongles', 'visage', 'packs', 'about', 'gallery', 'riads', 'booking', 'contact', 'privacy', 'terms'];
  const sitemap = [];
  const pagesList = [];
  for (const lang of LANGS) {
    for (const key of pageKeys) {
      const alt = Object.fromEntries(LANGS.map((l) => [l, url(l, key)]));
      let pg;
      if (key === 'home') pg = { title: C[lang].pages.home.title, description: C[lang].pages.home.description, body: pHome(lang), navKey: 'home', data: sceneData(lang), preloadImg: `<link rel="preload" as="image" imagesrcset="${ASSETS.video['hero-poster-960']} 960w, ${ASSETS.video['hero-poster-1600']} 1600w" imagesizes="100vw" fetchpriority="high">` };
      else if (catById[key]) pg = pCategory(lang, catById[key]);
      else pg = { services: pServices, packs: pPacks, about: pAbout, gallery: pGallery, riads: pRiads, booking: pBooking, contact: pContact, privacy: (l) => pLegal(l, 'privacy'), terms: (l) => pLegal(l, 'terms') }[key](lang);
      const html = layout(lang, { ...pg, key, path: url(lang, key), alt });
      const outFile = path.join(DIST, lang, C[lang].routes[key], 'index.html');
      await fs.mkdir(path.dirname(outFile), { recursive: true });
      await fs.writeFile(outFile, html);
      pagesList.push({ lang, key, path: url(lang, key) });
      sitemap.push({ loc: abs(url(lang, key)), alt });
    }
    // 404 par langue
    const nf = p404(lang);
    const html404 = layout(lang, { ...nf, key: '404', path: `/${lang}/404/`, alt: Object.fromEntries(LANGS.map((l) => [l, `/${l}/`])) });
    await fs.mkdir(path.join(DIST, lang, '404'), { recursive: true });
    await fs.writeFile(path.join(DIST, lang, '404', 'index.html'), html404);
    if (lang === LANGS[0]) await fs.writeFile(path.join(DIST, '404.html'), html404);
  }

  // Page cachée /validation-projet/ : hors navigation, hors sitemap, hors pages.json, noindex permanent
  const vOut = path.join(DIST, 'validation-projet');
  await fs.mkdir(vOut, { recursive: true });
  await fs.writeFile(path.join(vOut, 'index.html'), validationPage({ data: validationData({ config, categories, services, packs, C }), ASSETS, logoSvg: icon.arch, siteUrl: config.siteUrl }));

  // Racine : redirection vers la langue par défaut
  await fs.writeFile(path.join(DIST, 'index.html'), `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Escale Spa</title>${config.prototype ? '<meta name="robots" content="noindex, nofollow">' : ''}<meta http-equiv="refresh" content="0; url=/fr/"><link rel="canonical" href="${abs('/fr/')}"></head><body><p><a href="/fr/">Escale Spa — Français</a> · <a href="/en/">English</a> · <a href="/ar/" lang="ar">العربية</a></p></body></html>`);

  // sitemap (préparé pour la mise en ligne) + robots
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sitemap.map((s) => `  <url><loc>${s.loc}</loc>${LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${abs(s.alt[l])}"/>`).join('')}</url>`).join('\n')}\n</urlset>\n`;
  await fs.writeFile(path.join(DIST, 'sitemap.xml'), xml);
  await fs.writeFile(path.join(DIST, 'robots.txt'), config.prototype
    ? '# Prototype — indexation bloquée (config.prototype = true)\nUser-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`);
  // .htaccess (Hostinger / Apache)
  await fs.writeFile(path.join(DIST, '.htaccess'), htaccess());
  await fs.writeFile(path.join(DIST, 'pages.json'), JSON.stringify(pagesList, null, 1));

  const { rows, total } = await sizeReport();
  console.log(`✔ ${pagesList.length} pages générées en ${Date.now() - t0} ms — dist/ ${total}`);
  console.log(rows);
  if (warnings.length) console.warn('\n⚠ ' + [...new Set(warnings)].join('\n⚠ '));
}

function htaccess() {
  return `# Escale Spa — configuration Apache (Hostinger)
ErrorDocument 404 /404.html
Options -Indexes
DirectorySlash On
${config.prototype ? '# Prototype : ne pas indexer\n<IfModule mod_headers.c>\n  Header set X-Robots-Tag "noindex, nofollow"\n</IfModule>\n' : ''}
# Page cachée de validation : toujours non indexée et jamais mise en cache
<IfModule mod_setenvif.c>
  SetEnvIf Request_URI "^/validation-projet(/|$)" VP_HIDDEN=1
</IfModule>
<IfModule mod_headers.c>
  Header set X-Robots-Tag "noindex, nofollow, noarchive" env=VP_HIDDEN
  Header set Cache-Control "no-store" env=VP_HIDDEN
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
  <FilesMatch "\\.(css|js|woff2|webp|svg|jpg|png|mp4)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.html$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
</IfModule>
<IfModule mod_deflate.c>
  # (les vidéos MP4 sont déjà compressées : pas de DEFLATE, requêtes Range servies par Apache)
  AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml application/xml text/plain
</IfModule>
AddType font/woff2 .woff2
AddType image/webp .webp
AddType video/mp4 .mp4
`;
}

async function sizeReport() {
  let total = 0; const byExt = {};
  async function walk(d) {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else { const s = (await fs.stat(p)).size; total += s; const ext = path.extname(e.name) || e.name; byExt[ext] = (byExt[ext] || 0) + s; }
    }
  }
  await walk(DIST);
  const kb = (n) => `${(n / 1024).toFixed(0)} Ko`;
  return { total: kb(total), rows: Object.entries(byExt).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${k.padEnd(8)} ${kb(v)}`).join('\n') };
}

main().catch((e) => { console.error(e); process.exit(1); });
