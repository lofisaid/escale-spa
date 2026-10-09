// Page cachée « validation-projet » : questionnaire de validation pour la propriétaire d'Escale Spa.
// Générée à partir du catalogue et de la configuration RÉELS du prototype.
// Aucune donnée n'est envoyée : les réponses restent dans le navigateur (localStorage)
// et sont exportées en fichiers (JSON / TXT / impression PDF).
// La page n'est PAS dans la navigation, le sitemap ni pages.json, et porte un noindex permanent.

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function validationData({ config, categories, services, packs, C }) {
  const L2 = (o) => ({ fr: o.fr, ar: o.ar });
  const kitOf = (catId) => {
    const s = services.find((x) => x.category === catId);
    return { fr: s?.kit.fr ?? [], ar: s?.kit.ar ?? [] };
  };
  const links = {};
  for (const l of ['fr', 'ar']) {
    const r = C[l].routes;
    links[l] = Object.fromEntries(Object.keys(r).map((k) => [k, `/${l}/${r[k]}`]));
  }
  return {
    brand: config.brand.name,
    categories: categories.map((c) => ({ id: c.id, title: L2(c.title), intro: L2(c.intro) })),
    services: services.map((s) => ({
      id: s.id, category: s.category, groups: !!s.groups, options: s.options,
      name: L2(s.name), summary: L2(s.summary), description: L2(s.description), includes: L2(s.includes),
    })),
    kits: Object.fromEntries(categories.map((c) => [c.id, kitOf(c.id)])),
    packs: packs.map((p) => ({
      id: p.id, duration: p.duration, name: L2(p.name), description: L2(p.description), guests: L2(p.guests), contents: p.contents,
    })),
    zones: config.zones.map((z) => ({ id: z.id, name: L2(z.name) })),
    // Toutes les valeurs ci-dessous sont des propositions du prototype, jamais des faits confirmés.
    confirmedPrices: Object.values(config.prices).filter((v) => v != null).length,
    maxGuests: config.maxGuests,
    links,
    pageCount: 13,
  };
}

export function validationPage({ data, ASSETS, logoSvg, siteUrl }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="fr" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Validation du projet — Escale Spa</title>
<meta name="description" content="Questionnaire de validation du prototype Escale Spa. Page non listée, non indexée.">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#FBF7F1">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script>document.documentElement.classList.add('js')</script>
<link rel="stylesheet" href="${ASSETS.css}">
<link rel="stylesheet" href="${ASSETS.validationCss}">
<script type="module" src="${ASSETS.validationJs}"></script>
</head>
<body class="page-validation">
<a class="skip" href="#vp-main" data-i18n="skip">Aller au questionnaire</a>
<header class="vp-header">
  <div class="vp-wrap vp-header-in">
    <span class="logo" lang="fr" dir="ltr">${logoSvg}<span class="logo-word">Escale Spa</span></span>
    <div class="vp-tools">
      <div class="vp-lang" role="group" aria-label="Langue / اللغة">
        <button type="button" class="vp-lang-btn" data-lang="fr" lang="fr">Français</button>
        <button type="button" class="vp-lang-btn" data-lang="ar" lang="ar">العربية</button>
      </div>
    </div>
  </div>
</header>
<main id="vp-main" class="vp-wrap vp-main" tabindex="-1">
  <noscript>
    <div class="vp-noscript">
      <p><strong>Ce questionnaire a besoin de JavaScript.</strong> Activez-le dans votre navigateur ou ouvrez cette page avec un autre navigateur.</p>
      <p dir="rtl" lang="ar"><strong>يحتاج هذا الاستبيان إلى تفعيل JavaScript.</strong> فعّلوه في المتصفح أو افتحوا الصفحة بمتصفح آخر.</p>
    </div>
  </noscript>
  <div id="vp-app" aria-live="off"></div>
</main>
<footer class="vp-footer"><div class="vp-wrap">
  <p id="vp-footnote"></p>
</div></footer>
<div class="vp-live sr-only" id="vp-live" role="status" aria-live="polite"></div>
<script type="application/json" id="vp-data">${json}</script>
<!-- ${esc(siteUrl)} : aucune mesure d'audience, aucun envoi de données sur cette page -->
</body>
</html>`;
}
