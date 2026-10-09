# Escale Spa — prototype de site

Prototype de présentation pour « Escale Spa », beauté & bien-être à domicile à Marrakech
(nom précédent : Belle à Dom). Domaine envisagé : https://escalespa.com — achat et connexion non confirmés.
Site **statique** en trois langues (FR / EN / AR avec RTL), 13 pages par langue, scène 3D chargée à la demande.
**Version de présentation : non indexée, aucun envoi de données, aucun paiement.**

## Lancer l'aperçu local

Prérequis : Node.js 20+ (testé avec Node 22).

```bash
npm install          # une seule fois
npm run build        # génère dist/
npm run preview      # http://localhost:4173/fr/
```

Le dossier `dist/` est autonome : n'importe quel serveur statique fonctionne
(ex. `python3 -m http.server -d dist 4173`). Ouvrir les fichiers en `file://` ne fonctionne pas
(chemins absolus et modules JavaScript).

## Où modifier quoi

| Besoin | Fichier |
|---|---|
| Numéro WhatsApp, téléphone, e-mail, Instagram, horaires, zones, frais de déplacement, **tarifs**, mode prototype, mesure d'audience | `config/site.config.mjs` |
| Ajouter / supprimer une prestation, un pack ou une famille de soins | `config/catalogue.mjs` (+ clé de prix dans `site.config.mjs`) |
| Textes des pages | `content/fr.mjs`, `content/en.mjs`, `content/ar.mjs` |
| Styles | `src/css/main.css` |
| Interactions (menu, filtres, réservation, galerie, chargement 3D) | `src/js/main.js` |
| Scène 3D actuelle (accueil, chargée à la demande) | `src/js/scene.js` |
| Nouvelle scène 3D « Massage » (en validation, non intégrée) | `src/js/scenes/` — rendus : `node scripts/render-scene.mjs massage` |
| Vidéo du Hero (dérivés) | `src/video/` — original intact : `assets-src/EscaleSpa_Hero_Desktop.mp4` |
| Logos | `src/brand/` (voir `src/brand/README.md`) |
| Illustrations | `src/img/` (`npm run stills` régénère les rendus 3D fixes) |

Toute valeur `null` dans la configuration s'affiche « à confirmer ». Après chaque modification : `npm run build`.

**Activer WhatsApp** : renseigner `contact.whatsapp: '2126XXXXXXXX'` (format international, sans « + »).
Le bouton « Envoyer sur WhatsApp » remplace alors automatiquement l'état indisponible.

## Mise en ligne sur Hostinger (le moment venu)

1. Dans `config/site.config.mjs` : `prototype: false` (retire « Version de présentation », `noindex`, ouvre `robots.txt`), vérifier `siteUrl`.
2. `npm run build`.
3. Envoyer **le contenu** de `dist/` (y compris le fichier caché `.htaccess`) dans `public_html/` via le gestionnaire de fichiers ou FTP.
4. Aucun serveur Node n'est nécessaire en production.

`.htaccess` fournit : page 404, cache longue durée des ressources versionnées, en-têtes de sécurité, compression.

## Vidéo du Hero

Original fourni : `assets-src/EscaleSpa_Hero_Desktop.mp4` (H.264 **4:4:4**, illisible sur Safari/iOS et beaucoup de
téléphones). Dérivés livrés (H.264 yuv420p, sans audio, `faststart`) :

```bash
ffmpeg -i assets-src/EscaleSpa_Hero_Desktop.mp4 -an -c:v libx264 -preset slow -crf 27 -profile:v high -level 4.0 -pix_fmt yuv420p -movflags +faststart -tune film src/video/hero-1600.mp4
ffmpeg -i assets-src/EscaleSpa_Hero_Desktop.mp4 -an -vf scale=960:-2:flags=lanczos -c:v libx264 -preset slow -crf 27 -profile:v main -level 3.1 -pix_fmt yuv420p -movflags +faststart -tune film src/video/hero-960.mp4
```

Affiches : première image du film (`assets-src/hero-frame-0.png`) en WebP 1600 et 960 px.
Une WebM VP9 n'apportait que ~4 % de gain : non retenue. `tests/fixtures/*.webm` sert **uniquement aux tests**
(le Chromium de test ne lit pas H.264) et n'est pas déployé.

## Vérifications

```bash
npm test             # suite Playwright + axe-core → reports/test-report.md
npm run lighthouse   # audits Lighthouse → reports/lighthouse/summary.md
node tests/perf-3d.mjs      # mesures de l'expérience 3D → reports/perf-3d.json
node tests/screens.mjs /fr/ --w 390,768,1440 --full   # captures (serveur d'aperçu lancé)
```

## Structure

```
config/        configuration centrale + catalogue des prestations
content/       textes FR / EN / AR
src/css, src/js, src/img, src/static
scripts/       build.mjs (générateur), serve.mjs (aperçu), render-stills.mjs (rendus 3D fixes)
tests/         tests automatisés, Lighthouse, captures
dist/          site compilé à déployer
```

## Dépendances (développement uniquement)

three 0.186 (MIT), esbuild, sharp, subset-font, polices Fontsource (Fraunces, Figtree, Amiri,
IBM Plex Sans Arabic — licence SIL OFL), Playwright, axe-core, Lighthouse.
Aucune dépendance n'est chargée depuis un CDN : tout est servi depuis le site.
