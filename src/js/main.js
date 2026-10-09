// Escale Spa — interactions principales (léger, sans dépendance).
import { track } from './track.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const DATA = (() => { try { return JSON.parse($('#bd-data')?.textContent || '{}'); } catch { return {}; } })();
const fmt = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
// Heure courante à Marrakech → { date: 'AAAA-MM-JJ', time: 'HH:MM' }
// `window.__nowOverride` (ms epoch) permet de tester un instant précis.
export function marrakechNow(ms = window.__nowOverride ?? Date.now()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ———————————————————————— en-tête & menu mobile
function initHeader() {
  const header = $('[data-header]');
  const btn = $('[data-menu-btn]');
  const nav = $('[data-nav]');
  if (!header) return;
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });
  if (!btn || !nav) return;

  const close = (focusBtn = true) => {
    btn.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    if (focusBtn) btn.focus();
  };
  const open = () => {
    const r = header.getBoundingClientRect();
    nav.style.setProperty('--nav-top', `${Math.max(0, r.bottom)}px`);
    btn.setAttribute('aria-expanded', 'true');
    nav.classList.add('is-open');
    document.body.classList.add('menu-open');
    $('a', nav)?.focus();
  };
  btn.addEventListener('click', () => (btn.getAttribute('aria-expanded') === 'true' ? close() : open()));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) close();
    // piège de focus léger dans le menu ouvert
    if (e.key === 'Tab' && nav.classList.contains('is-open')) {
      const items = [btn, ...$$('a, button', nav)];
      const i = items.indexOf(document.activeElement);
      e.preventDefault();
      items[(Math.max(i, 0) + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
    }
  });
  nav.addEventListener('click', (e) => { if (e.target.closest('a') && nav.classList.contains('is-open')) close(false); });
  matchMedia('(min-width: 1101px)').addEventListener('change', (m) => { if (m.matches) close(false); });
}

// ———————————————————————— filtres prestations
function initServiceFilters() {
  const form = $('[data-filters]');
  if (!form) return;
  const cards = $$('[data-svc]');
  const out = $('[data-results]');
  const none = $('[data-no-results]');
  const apply = () => {
    const fd = new FormData(form);
    const cat = fd.get('cat'); const dur = fd.get('dur'); const groups = fd.get('groups') === '1';
    let n = 0;
    for (const c of cards) {
      const min = +c.dataset.min; const max = +c.dataset.max;
      const okCat = cat === 'all' || c.dataset.cat === cat;
      const okDur = dur === 'any' || (dur === 'short' && min <= 45) || (dur === 'mid' && max > 45 && min <= 75) || (dur === 'long' && max > 75);
      const okG = !groups || c.dataset.groups === '1';
      const show = okCat && okDur && okG;
      c.hidden = !show; if (show) n++;
    }
    out.textContent = fmt(out.dataset.tpl, { n });
    none.hidden = n > 0;
  };
  form.addEventListener('change', apply);
  form.addEventListener('reset', () => setTimeout(apply));
  // filtre initial depuis l'URL (?univers=massages)
  const pre = new URLSearchParams(location.search).get('univers');
  if (pre) { const r = form.querySelector(`input[name="cat"][value="${CSS.escape(pre)}"]`); if (r) r.checked = true; }
  apply();
}

// ———————————————————————— galerie
function initGallery() {
  const list = $('[data-gallery]');
  if (!list || !DATA.gallery) return;
  const items = DATA.gallery.items;
  const dlg = $('[data-lightbox]');
  const im = $('[data-lb-img]'); const cap = $('[data-lb-cap]'); const cnt = $('[data-lb-count]');
  let idx = 0; let opener = null;
  const visible = () => $$('.g-item', list).filter((li) => !li.hidden).map((li) => +$('.g-open', li).dataset.gIndex);
  const show = (i) => {
    idx = i; const it = items[i];
    im.src = it.src; im.alt = it.cap; im.width = it.w; im.height = it.h;
    cap.textContent = it.cap;
    const vis = visible();
    cnt.textContent = fmt(DATA.gallery.count, { i: vis.indexOf(i) + 1, n: vis.length });
  };
  const step = (d) => { const vis = visible(); const p = vis.indexOf(idx); show(vis[(p + d + vis.length) % vis.length]); };
  $$('.g-open', list).forEach((b) => {
    b.disabled = false;
    b.addEventListener('click', () => {
      opener = b; show(+b.dataset.gIndex);
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      $('[data-lb-close]', dlg).focus();
    });
  });
  $('[data-lb-prev]', dlg).addEventListener('click', () => step(-1));
  $('[data-lb-next]', dlg).addEventListener('click', () => step(1));
  $('[data-lb-close]', dlg).addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => opener?.focus());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => {
    const rtl = document.dir === 'rtl';
    if (e.key === 'ArrowRight') step(rtl ? -1 : 1);
    if (e.key === 'ArrowLeft') step(rtl ? 1 : -1);
  });
  const f = $('[data-g-filters]');
  if (f) {
    f.addEventListener('change', () => {
      const v = new FormData(f).get('g');
      $$('.g-item', list).forEach((li) => { li.hidden = v !== 'all' && li.dataset.gCat !== v; });
    });
  }
}

// ———————————————————————— copie dans le presse-papiers
async function copyText(textarea, statusEl, msgs) {
  const text = textarea.value;
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
    else {
      textarea.focus(); textarea.select();
      if (!document.execCommand('copy')) throw new Error('copy');
    }
    statusEl.textContent = msgs.copied;
  } catch {
    textarea.focus(); textarea.select();
    statusEl.textContent = msgs.copyFail;
  }
}

// ———————————————————————— validation commune
function setError(form, id, msg) {
  const el = form.querySelector(`#${id}`) || form.querySelector(`[data-field="${id}"] fieldset`);
  const err = form.querySelector(`[data-err-for="${id}"]`);
  if (el) el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if (err) { err.textContent = msg || ''; err.hidden = !msg; }
}
function showSummary(form, errors) {
  const box = $('[data-err-summary]', form);
  const ul = $('ul', box);
  ul.innerHTML = '';
  errors.forEach(([id, msg]) => {
    const li = document.createElement('li'); const a = document.createElement('a');
    a.href = `#${id}`; a.textContent = msg;
    a.addEventListener('click', (e) => { e.preventDefault(); (form.querySelector(`#${id}`) || form.querySelector(`[data-field="${id}"] input`))?.focus(); });
    li.append(a); ul.append(li);
  });
  box.hidden = errors.length === 0;
  if (errors.length) box.focus();
}
const PHONE_RE = /^(?:(?:\+|00)212|0)[5-7]\d{8}$|^(?:\+|00)[1-9]\d{7,14}$/;
const cleanPhone = (v) => v.replace(/[\s.\-()]/g, '');

// ———————————————————————— formulaire de réservation
function initBooking() {
  const form = $('[data-booking]');
  if (!form || !DATA.booking) return;
  const B = DATA.booking; const E = B.errors;
  form.classList.add('js-ready');
  const steps = $$('[data-step]', form);
  const inds = $$('[data-step-ind]');
  let cur = 0;

  const svc = $('#service', form); const dur = $('#duration', form);
  const date = $('#date', form); const time = $('#time', form);
  const area = $('#area', form); const areaOther = $('#areaOther', form); const areaOtherWrap = $('[data-area-other]', form);
  const guests = $('#guests', form);
  const name = $('#name', form); const phone = $('#phone', form); const note = $('#note', form); const consent = $('#consent', form);

  // Dates et heures évaluées à l'heure de Marrakech (Africa/Casablanca), quel que soit
  // le fuseau de l'appareil du visiteur. date.min = aujourd'hui à Marrakech, max = +6 mois.
  const setBounds = () => {
    const now = marrakechNow();
    date.min = now.date;
    const [y, m, d] = now.date.split('-').map(Number);
    const max = new Date(Date.UTC(y, m - 1 + 6, d));
    date.max = max.toISOString().slice(0, 10);
  };
  setBounds();

  const fillDurations = () => {
    const opt = svc.selectedOptions[0];
    const list = (opt?.dataset.durations || '').split(',').filter(Boolean);
    dur.innerHTML = '';
    if (!list.length) { dur.append(new Option(B.durationTbc, '')); dur.disabled = true; return; }
    dur.disabled = list.length === 1;
    list.forEach((m) => dur.append(new Option(`${new Intl.NumberFormat(B.lang === 'ar' ? 'ar-MA' : B.lang).format(+m)} ${B.min}`, m)));
  };
  // pré-remplissage depuis l'URL (?prestation=…&duree=…)
  const qs = new URLSearchParams(location.search);
  if (qs.get('prestation') && svc.querySelector(`option[value="${CSS.escape(qs.get('prestation'))}"]`)) svc.value = qs.get('prestation');
  fillDurations();
  if (qs.get('duree') && dur.querySelector(`option[value="${CSS.escape(qs.get('duree'))}"]`)) dur.value = qs.get('duree');
  svc.addEventListener('change', () => { fillDurations(); setError(form, 'service', ''); });

  area.addEventListener('change', () => { areaOtherWrap.hidden = area.value !== 'other'; });
  form.addEventListener('change', (e) => {
    if (e.target.name === 'venue') $('[data-hotel-note]', form).hidden = e.target.value !== 'hotel';
  });

  const validators = [
    () => (svc.value ? [] : [['service', E.service]]),
    () => {
      const errs = [];
      if (!date.value) errs.push(['date', E.date]);
      else if (date.value < date.min) errs.push(['date', E.date]);
      else if (date.value > date.max) errs.push(['date', E.dateFar]);
      if (!time.value) errs.push(['time', E.time]);
      else if (date.value && !errs.length) {
        setBounds(); // recalcule au moment de la validation (page restée ouverte)
        const now = marrakechNow();
        if (date.value < now.date) errs.push(['date', E.date]);
        else if (date.value === now.date && time.value <= now.time) errs.push(['time', E.timePast]);
      }
      return errs;
    },
    () => {
      const errs = [];
      if (!area.value) errs.push(['area', E.area]);
      else if (area.value === 'other' && areaOther.value.trim().length < 2) errs.push(['areaOther', E.areaOther]);
      if (!form.querySelector('input[name="venue"]:checked')) errs.push(['venue', E.venue]);
      return errs;
    },
    () => {
      const n = Number(guests.value);
      return Number.isInteger(n) && n >= 1 && n <= B.maxGuests ? [] : [['guests', fmt(E.guests, { max: B.maxGuests })]];
    },
    () => {
      const errs = [];
      if (name.value.trim().length < 2) errs.push(['name', E.name]);
      if (!PHONE_RE.test(cleanPhone(phone.value))) errs.push(['phone', E.phone]);
      if (!consent.checked) errs.push(['consent', E.consent]);
      return errs;
    },
  ];
  const stepFields = [['service'], ['date', 'time'], ['area', 'areaOther', 'venue'], ['guests'], ['name', 'phone', 'consent']];

  const validate = (i) => {
    stepFields[i].forEach((id) => setError(form, id, ''));
    const errs = validators[i]();
    errs.forEach(([id, m]) => setError(form, id, m));
    showSummary(form, errs);
    return errs.length === 0;
  };
  // validation à la sortie d'un champ déjà en erreur
  form.addEventListener('input', (e) => {
    const id = e.target.id || e.target.name;
    if (e.target.getAttribute('aria-invalid') === 'true' || (e.target.name === 'venue')) {
      const i = stepFields.findIndex((f) => f.includes(id));
      if (i >= 0) { const errs = validators[i]().filter(([k]) => k === id); setError(form, id, errs[0]?.[1] || ''); }
    }
  });

  const go = (i, focus = true) => {
    cur = i;
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    inds.forEach((li, k) => { li.classList.toggle('is-current', k === i); li.classList.toggle('is-done', k < i); });
    $('[data-err-summary]', form).hidden = true;
    if (focus) {
      const target = i === 5 ? steps[5] : steps[i].querySelector('legend');
      const first = i === 5 ? steps[5] : steps[i].querySelector('input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea');
      form.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
      (first || target)?.focus({ preventScroll: true });
    }
  };
  document.documentElement.classList.add('js');
  go(0, false);

  form.addEventListener('click', (e) => {
    if (e.target.closest('[data-next]')) { if (validate(cur)) go(cur + 1); }
    if (e.target.closest('[data-prev]')) go(cur - 1);
    if (e.target.closest('[data-edit]')) go(0);
  });
  form.addEventListener('keydown', (e) => {
    // Entrée dans un champ simple = « Continuer »
    if (e.key === 'Enter' && e.target.matches('input:not([type=checkbox]):not([type=radio])') && cur < 4) { e.preventDefault(); if (validate(cur)) go(cur + 1); }
  });

  const zoneLabel = () => (area.value === 'other' ? areaOther.value.trim() : area.selectedOptions[0]?.textContent || '');
  const dateLabel = () => {
    try { return new Intl.DateTimeFormat(B.lang === 'ar' ? 'ar-MA' : B.lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date.value}T12:00:00`)); } catch { return date.value; }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // valide toutes les étapes ; revient à la première en erreur
    for (let i = 0; i < 5; i++) { if (!validate(i)) { go(i); validate(i); return; } }
    const venue = form.querySelector('input[name="venue"]:checked').value;
    const rows = [
      [B.labels.service, svc.selectedOptions[0].textContent],
      [B.labels.duration, dur.value ? dur.selectedOptions[0].textContent : B.durationTbc],
      [B.labels.date, dateLabel()], [B.labels.time, time.value],
      [B.labels.area, zoneLabel()], [B.labels.venue, B.venues[venue]],
      [B.labels.guests, guests.value], [B.labels.name, name.value.trim()], [B.labels.phone, phone.value.trim()],
    ];
    if (note.value.trim()) rows.push([B.labels.note, note.value.trim()]);
    const dl = $('[data-summary]', form); dl.innerHTML = '';
    rows.forEach(([k, v]) => { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; dl.append(dt, dd); });
    const M = B.msg;
    const msgRows = [
      [M.service, rows[0][1]], [M.duration, rows[1][1]], [M.date, rows[2][1]], [M.time, rows[3][1]],
      [M.area, rows[4][1]], [M.venue, rows[5][1]], [M.guests, rows[6][1]], [M.name, rows[7][1]], [M.phone, rows[8][1]],
    ];
    if (note.value.trim()) msgRows.push([M.note, note.value.trim()]);
    const text = `${M.intro}\n\n${msgRows.map(([k, v]) => `• ${k} : ${v}`).join('\n')}\n\n${M.outro}`;
    const ta = $('#wa-preview', form); ta.value = text;
    const wa = $('[data-wa]', form); const waOff = $('[data-wa-off]', form); const waNote = $('[data-wa-off-note]', form);
    if (B.whatsapp) {
      wa.href = `https://wa.me/${B.whatsapp}?text=${encodeURIComponent(text)}`;
      wa.hidden = false; waOff.hidden = true; waNote.hidden = true;
      wa.onclick = () => track('whatsapp_click', { source: 'booking', service: svc.value });
    }
    $('[data-copy-status]', form).textContent = '';
    track('booking_request_prepared', { service: svc.value, guests: Number(guests.value), venue });
    go(5);
  });

  $('[data-copy]', form).addEventListener('click', () => {
    copyText($('#wa-preview', form), $('[data-copy-status]', form), B);
    track('booking_message_copied', { service: svc.value });
  });
  $('[data-wa-off]', form).addEventListener('click', () => { $('[data-wa-off-note]', form).focus?.(); $('[data-copy-status]', form).textContent = ''; });
}

// ———————————————————————— formulaire partenaires
function initPartner() {
  const form = $('[data-partner-form]');
  if (!form || !DATA.partner) return;
  const P = DATA.partner; const E = P.errors;
  const req = [['pf-venue', E.required], ['pf-type', E.required], ['pf-name', E.name], ['pf-contact', E.required]];
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const errs = [];
    req.forEach(([id, msg]) => {
      const v = form.querySelector(`#${id}`).value.trim();
      const bad = id === 'pf-name' ? v.length < 2 : id === 'pf-contact' ? !(PHONE_RE.test(cleanPhone(v)) || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) : !v;
      setError(form, id, bad ? msg : '');
      if (bad) errs.push([id, msg]);
    });
    showSummary(form, errs);
    if (errs.length) return;
    const L = P.labels;
    const val = (id) => form.querySelector(`#${id}`).value.trim();
    const lines = [[L.venue, val('pf-venue')], [L.type, val('pf-type')], [L.name, val('pf-name')], [L.role, val('pf-role')], [L.contact, val('pf-contact')], [L.area, val('pf-area')], [L.message, val('pf-message')]]
      .filter(([, v]) => v).map(([k, v]) => `• ${k.replace(/\s*\(.+\)$/, '')} : ${v}`);
    const pv = $('[data-preview]', form);
    $('[data-preview-text]', form).value = `${P.intro}\n\n${lines.join('\n')}`;
    pv.hidden = false; pv.focus();
    track('partner_request_prepared', { type: val('pf-type') });
  });
  $('[data-copy]', form).addEventListener('click', () => copyText($('[data-preview-text]', form), $('[data-copy-status]', form), P.copy));
  form.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true' && e.target.value.trim()) setError(form, e.target.id, ''); });
}

// ———————————————————————— scène 3D (chargée à la demande)
function initScene() {
  const sec = $('[data-scene-section]');
  if (!sec || !DATA.scene) return;
  const S = DATA.scene;
  const panel = $('[data-scene-panel]', sec);
  const status = $('[data-scene-status]', sec);
  const openBtn = $('[data-scene-open]', sec);
  const closeBtn = $('[data-scene-close]', sec);
  const resetBtn = $('[data-scene-reset]', sec);
  const canvasWrap = $('[data-scene-canvas]', sec);
  const fallback = $('[data-scene-fallback]', sec);
  let scene = null; let lastOpener = null; let loading = false;
  const spaceBtns = $$('[data-space]', sec);

  // Fiche accessible (fonctionne avec ou sans WebGL)
  const showPanel = (id, opener) => {
    const c = S.cats[id]; if (!c) return;
    lastOpener = opener || null;
    panel.innerHTML = '';
    const h = document.createElement('h3'); h.id = 'scene-panel-t'; h.textContent = c.title;
    const p = document.createElement('p'); p.textContent = c.intro;
    const ul = document.createElement('ul'); c.services.forEach((s) => { const li = document.createElement('li'); li.textContent = s; ul.append(li); });
    const row = document.createElement('div'); row.className = 'btn-row';
    const a1 = document.createElement('a'); a1.className = 'btn btn-primary btn-sm'; a1.href = c.href; a1.textContent = S.panelCta;
    const a2 = document.createElement('a'); a2.className = 'btn btn-ghost btn-sm'; a2.href = c.book; a2.textContent = S.panelBook;
    row.append(a1, a2);
    const x = document.createElement('button'); x.type = 'button'; x.className = 'panel-close'; x.setAttribute('aria-label', S.panelClose);
    x.innerHTML = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    x.addEventListener('click', hidePanel);
    panel.append(x, h, p, ul, row);
    panel.setAttribute('aria-labelledby', 'scene-panel-t');
    panel.hidden = false;
    spaceBtns.forEach((b) => b.setAttribute('aria-expanded', String(b.dataset.space === id)));
    scene?.focusSpace(id);
    panel.focus({ preventScroll: true });
    panel.scrollIntoView({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' });
  };
  function hidePanel() {
    panel.hidden = true;
    spaceBtns.forEach((b) => b.setAttribute('aria-expanded', 'false'));
    scene?.focusSpace(null);
    (lastOpener && document.contains(lastOpener) ? lastOpener : spaceBtns[0])?.focus();
  }
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') hidePanel(); });
  spaceBtns.forEach((b) => {
    b.setAttribute('role', 'button');
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-controls', 'scene-panel');
    b.addEventListener('click', (e) => { e.preventDefault(); showPanel(b.dataset.space, b); });
    b.addEventListener('keydown', (e) => { if (e.key === ' ') { e.preventDefault(); showPanel(b.dataset.space, b); } });
  });
  panel.id = 'scene-panel';

  const hasWebGL = () => {
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch { return false; }
  };

  openBtn.addEventListener('click', async () => {
    if (loading || scene) return;
    if (!hasWebGL()) { status.textContent = S.noWebgl; openBtn.hidden = true; return; }
    loading = true; openBtn.disabled = true; status.textContent = S.loading;
    track('scene3d_open', {});
    try {
      const mod = await import(/* @vite-ignore */ S.module);
      canvasWrap.hidden = false;
      scene = await mod.createScene(canvasWrap, {
        label: S.label, hint: S.hint, spaces: S.spaces,
        reducedMotion: reduceMotion(),
        onSelect: (id, el) => showPanel(id, el),
      });
      fallback.hidden = true;
      openBtn.hidden = true; closeBtn.hidden = false; resetBtn.hidden = false;
      status.textContent = '';
      closeBtn.focus();
    } catch (err) {
      console.warn('[scene3d]', err);
      canvasWrap.hidden = true; fallback.hidden = false;
      status.textContent = S.error; openBtn.hidden = true;
    } finally { loading = false; openBtn.disabled = false; }
  });
  resetBtn.addEventListener('click', () => scene?.focusSpace(null));
  closeBtn.addEventListener('click', () => {
    scene?.dispose(); scene = null;
    canvasWrap.innerHTML = ''; canvasWrap.hidden = true; fallback.hidden = false;
    closeBtn.hidden = true; resetBtn.hidden = true; openBtn.hidden = false;
    openBtn.focus();
    track('scene3d_close', {});
  });
}

// ———————————————————————— héros vidéo
// Une seule source est attribuée (960 px ou 1600 px) : jamais deux téléchargements.
// Pas de vidéo si « réduire les animations », économiseur de données ou réseau 2G :
// l'affiche (image) reste affichée et le bouton permet de lancer la lecture volontairement.
function initHero() {
  const media = $('[data-hero]');
  if (!media) return;
  const section = media.closest('.hero-v');
  const video = $('video', media);
  const btn = $('[data-hero-toggle]', media);
  const conn = navigator.connection || {};
  const reduce = reduceMotion();
  const saveData = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
  // navigateur sans H.264 (ex. Chromium libre) : on garde l'affiche, sans rien télécharger
  if (!video.canPlayType('video/mp4; codecs="avc1.640028"') && !window.__heroForcePlayable) { btn.hidden = true; return; }
  let userPaused = reduce || saveData; // aucune lecture automatique dans ces cas
  let inView = true;
  let loaded = false;

  const setState = (playing) => {
    section.classList.toggle('is-playing', playing && !video.paused);
    btn.setAttribute('aria-pressed', String(!playing));
    btn.setAttribute('aria-label', playing ? btn.dataset.labelPause : btn.dataset.labelPlay);
  };
  const load = () => {
    if (loaded) return; loaded = true;
    video.src = matchMedia('(max-width: 899px)').matches ? media.dataset.srcSm : media.dataset.srcLg;
  };
  const play = async () => {
    load();
    try { await video.play(); setState(true); track('hero_video_play', {}); }
    catch { setState(false); } // lecture automatique refusée : l'affiche reste visible
  };
  const pause = () => { video.pause(); setState(false); };

  video.muted = true; video.defaultMuted = true; video.playsInline = true;
  video.addEventListener('playing', () => section.classList.add('is-playing'));
  video.addEventListener('error', () => { section.classList.remove('is-playing'); btn.hidden = true; });
  btn.hidden = false;
  btn.addEventListener('click', () => {
    if (video.paused) { userPaused = false; play(); } else { userPaused = true; pause(); }
  });
  // hors écran ou onglet masqué : pause automatique, reprise si l'utilisateur n'a pas mis en pause
  const sync = () => {
    const visible = inView && document.visibilityState === 'visible';
    if (!visible && !video.paused) { video.pause(); }
    else if (visible && !userPaused && video.paused) play();
  };
  // la vidéo démarre après le chargement de la page : l'affiche (LCP) et le contenu passent en premier
  let ready = document.readyState === 'complete';
  const sync0 = sync;
  const gated = () => { if (ready) sync0(); };
  if (!ready) addEventListener('load', () => { ready = true; sync0(); }, { once: true });
  new IntersectionObserver((entries) => { const e = entries[entries.length - 1]; inView = e.isIntersecting; gated(); }, { threshold: 0.15 }).observe(media);
  document.addEventListener('visibilitychange', gated);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (m) => { if (m.matches) { userPaused = true; pause(); } });
  setState(!userPaused);
  if (userPaused) setState(false);
  window.__hero = { video, get userPaused() { return userPaused; } };
}

// ———————————————————————— films des services : lecture automatique quand ils sont visibles
// Muets, en boucle, playsinline. Une seule version (960 ou 1600 px) est attribuée, au moment où
// le film devient visible. « Réduire les animations », économie de données ou réseau 2G : affiche
// seule, lecture volontaire par le bouton. Autoplay refusé : le bouton devient « Lire la vidéo ».
// Pause hors écran et onglet masqué ; une pause choisie par l'utilisateur est toujours respectée.
function initFilms() {
  const films = $$('[data-film]');
  if (!films.length) return;
  const conn = navigator.connection || {};
  const saveData = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
  films.forEach((fig) => {
    const video = $('video', fig); const btn = $('[data-film-toggle]', fig); const label = $('.film-toggle-label', btn);
    if (!video.canPlayType('video/mp4; codecs="avc1.640028"') && !window.__filmForcePlayable) {
      // navigateur sans H.264 : affiche conservée, aucun téléchargement
      video.removeAttribute('autoplay'); return;
    }
    let userPaused = false; let inView = false;
    let allowed = !(reduceMotion() || saveData); // lecture automatique autorisée ?
    if (!allowed) video.removeAttribute('autoplay');
    const waiting = (on) => fig.classList.toggle('is-waiting', on);
    const setState = () => {
      const paused = video.paused;
      btn.setAttribute('aria-pressed', String(paused));
      const l = paused ? (fig.classList.contains('is-started') ? btn.dataset.labelResume : btn.dataset.labelPlay) : btn.dataset.labelPause;
      btn.setAttribute('aria-label', l); label.textContent = l;
    };
    const load = () => {
      if (video.getAttribute('src')) return;
      const small = matchMedia('(max-width: 899px)').matches || saveData;
      video.src = small ? fig.dataset.srcSm : fig.dataset.srcLg;
    };
    const play = async () => {
      load();
      try { await video.play(); waiting(false); track('service_video_play', { id: fig.dataset.filmId }); }
      catch { if (video.paused) waiting(true); } // autoplay refusé : bouton de lecture proposé
      setState();
    };
    btn.hidden = false;
    waiting(!allowed); setState();
    video.addEventListener('playing', () => { fig.classList.add('is-started'); waiting(false); setState(); });
    video.addEventListener('pause', setState);
    btn.addEventListener('click', () => {
      if (video.paused) { userPaused = false; allowed = true; play(); } else { userPaused = true; video.pause(); }
    });
    const sync = () => {
      const visible = inView && document.visibilityState === 'visible';
      if (!visible) { if (!video.paused) video.pause(); return; }
      if (allowed && !userPaused && video.paused) play();
    };
    new IntersectionObserver((entries) => { inView = entries[entries.length - 1].isIntersecting; sync(); }, { threshold: 0.35 }).observe(fig);
    document.addEventListener('visibilitychange', sync);
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (m) => { if (m.matches) { allowed = false; userPaused = true; video.pause(); } });
  });
}

// ———————————————————————— suivi de liens WhatsApp statiques
function initTrackLinks() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-track]');
    if (a) track(a.dataset.track, { source: location.pathname });
  });
}

initHeader();
initHero();
initFilms();
initServiceFilters();
initGallery();
initBooking();
initPartner();
initScene();
initTrackLinks();
