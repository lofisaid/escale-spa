# Escale Spa — Hero vidéo et logo (v3)

Date : 8 octobre 2026 · Prototype non indexé (`noindex`, `robots.txt` bloquant). Rien publié, aucun achat.
Copies des versions précédentes : `archives/belle-a-dom-v1-20261008`, `archives/escale-spa-v2-20261008`.

## 1. Modifications

**Identité.** « Belle à Dom » remplacé par « Escale Spa » dans les sources, la configuration, les trois langues, les titres,
les métadonnées, les formulaires, le message WhatsApp et le pied de page. Domaine envisagé : https://escalespa.com
(achat et connexion non confirmés). Signature conservée : « Beauté & Bien-être à domicile — Marrakech ».
Contrôle automatique : aucune occurrence de l'ancien nom dans les 39 pages générées.

**Logo.**
- Le fichier joint n'est pas sur fond blanc : c'est une image floue avec halo sur fond noir.
- Le symbole a donc été **redessiné à la main en SVG** : arc à épaulements, double filet, feuille, vague et petit soleil. C'est une interprétation fidèle de la forme, pas une reproduction exacte.
- Aucun PNG n'est inclus dans les SVG.
- Le nom « Escale Spa » est composé en Fraunces semi-gras, une typographie proche de la référence mais pas identique.
- Fichiers dans `src/brand/` (voir `src/brand/README.md`) :
  - symbole, en version normale et version claire pour fonds sombres ;
  - logo horizontal, en version normale et version claire ;
  - PNG transparents rendus avec la vraie police ;
  - favicon (SVG, ICO, apple-touch) tiré du symbole.
- Dans l'en-tête, le symbole mesure 37 px (32 px sur mobile). L'en-tête garde la même hauteur.

**Hero vidéo (accueil, FR/EN/AR).**
- **Fichier source :** H.264 *High 4:4:4* (yuv444p), illisible sur Safari/iOS et beaucoup de téléphones. Il est conservé tel quel dans `assets-src/`.
- **Dérivés livrés :** H.264 yuv420p, sans audio, `faststart`. Les transitions et le raccord de boucle sont conservés, sans fondu ajouté.
  - `hero-1600.mp4` : 2,3 Mo, CRF 27, SSIM 0,986 par rapport à l'original ; les étiquettes restent nettes.
  - `hero-960.mp4` : 1,2 Mo.
  - Une version WebM VP9 ne gagnait que 4 % : non retenue.
- **Affiche :** première image du film, en WebP 1600 px (166 Ko) et 960 px (83 Ko), servie par `srcset`. C'est l'image LCP.
- **Plans vérifiés avant placement du texte.**
  - Plan 1 (0–6,8 s) : salle, table au centre, produits en bas à droite.
  - Plan 2 (≈ 7–12,5 s) : produits « Escale Spa » au centre droit.
  - Le texte est donc placé **à gauche, dans les trois langues**. En arabe, le bloc est aligné à droite à l'intérieur, mais reste à gauche de l'image, sans quoi il couvrirait les produits.
- **Voile de contraste :** dégradé à gauche uniquement, nul au-delà de 70 % de la largeur ; les produits restent intacts.
  - Mesuré sur les 51 images du film, sans tenir compte de l'ombre portée du texte :
    - titre ≥ 5,0:1 (cible 3:1) ;
    - sous-titre ≥ 5,7:1 (cible 4,5:1) ;
    - surtitre ≥ 4,85:1 (cible 4,5:1).
- **Mobile et tablette (< 1100 px).**
  - Un recadrage vertical perdrait soit la table (plan 1), soit les produits (plan 2).
  - La vidéo reste donc en bloc horizontal 16:9, **non recadré**, et le texte passe en dessous.
  - Le bouton de pause est placé en haut à droite, pour ne pas masquer les produits.
- **Comportement.**
  - Lecture silencieuse, automatique, en boucle, `playsinline`.
  - **Une seule source** est attribuée (960 ou 1600 px selon la largeur), et seulement **après le chargement de la page**.
  - Bouton « Mettre en pause la vidéo / Reprendre la vidéo », traduit dans les trois langues, avec `aria-pressed`.
  - Pause automatique hors écran et quand l'onglet est masqué. Une pause choisie par l'utilisateur est respectée.
  - Si le mouvement réduit est demandé, en mode économie de données ou sur un réseau 2G : affiche seule, rien n'est téléchargé, la lecture reste possible sur demande.
  - Si le navigateur ne lit pas H.264 ou si la lecture automatique est refusée : l'affiche reste visible.
  - Sans JavaScript : l'affiche, le texte et les boutons fonctionnent.
  - La hauteur du Hero est réservée : aucun décalage de mise en page.

**Inchangé.** Pages, contenus, langues, parcours de réservation et correction des horaires (heure de Marrakech).
La scène 3D actuelle reste chargée **à la demande**. La nouvelle scène « Massage » est en attente de validation et n'est pas intégrée.

## 2. Tests (résultats réels)

Environnement : Linux, Chromium 141 headless (Playwright 1.56), **sans GPU**, serveur local avec gzip et requêtes Range.

- **Suite automatisée : 101 / 101** (`reports/test-report.md`).
  - 39 pages × 5 largeurs (360, 390, 768, 1024, 1440) : aucune erreur JS, aucun fichier manquant, aucun débordement.
  - 219 liens internes vérifiés.
  - axe-core WCAG 2.1 AA : 0 violation.
  - Hero : 21 vérifications (codec, faststart, lecture, pause/reprise au clavier, boucle, hors écran, onglet masqué, source unique, mobile, mouvement réduit, économie de données, navigateur sans H.264, sans JS, placement du texte dans les 3 langues).
  - Réservation et horaires de Marrakech.
- **Captures** : `reports/screens/hero/` (2 plans × 3 langues × 5 largeurs) et `reports/screens/` (autres pages).

**Limite importante des mesures.** Le Chromium de test, comme celui de Lighthouse, est une version libre **sans décodeur H.264**.
- Pour les tests de lecture, les `.mp4` ont été servis avec une copie VP9 de test (`tests/fixtures/`, non déployée).
- Lighthouse, lui, ne télécharge pas la vidéo, car le site détecte l'absence du codec. Son score ne mesure donc que le chargement initial (affiche comprise). La vidéo n'a pas été désactivée pour améliorer le score.
- Une mesure complémentaire **avec lecture réelle** est donnée ci-dessous.

**Lighthouse 13, médiane de 3 exécutions (chargement initial).**

| Profil | Pages | Performance | Accessibilité | Bonnes pratiques |
|---|---|---|---|---|
| Mobile (4G lent simulé, CPU ×4) | 11 pages FR/EN/AR | 96 – 100 (accueil : 98 FR/EN, 96 AR) | 100 | 100 |
| Ordinateur | 4 pages | 100 | 100 | 100 |

LCP de l'accueil mobile : 2,4 s (2,7 s en arabe) ; CLS ≤ 0,002 ; TBT 0 ms.
SEO 66–69 : c'est voulu, à cause du `noindex` (sans ce blocage, le score était de 100 lors de la mesure précédente).

**Mesure avec la vidéo en lecture** (`reports/perf-hero.json`, copie VP9 un peu plus lourde que les MP4 livrés).

| Profil | LCP | CLS | Début de lecture | Vidéo téléchargée | Images perdues |
|---|---|---|---|---|---|
| Mobile 412 px, 1,6 Mb/s, RTT 150 ms, CPU ×4 | 2,6 s (FR) / 2,9 s (AR) | 0 / 0,002 | 3,4–3,5 s | 1,4 Mo | 2–3 / 155 |
| Ordinateur 1440 px, 10 Mb/s | 0,4 s | 0 | 1,1 s | 2,6 Mo | 1–3 / 154 |

Avec la vidéo en lecture, les tâches longues totalisent 0,4–0,6 s sur le profil mobile. Elles viennent du décodage VP9 *logiciel* de la copie de test ; sur un téléphone, le décodage H.264 est matériel. Ce point reste à confirmer sur appareil réel.

## 3. Limites restantes
- Lecture H.264 non vérifiée sur Safari, iOS ou Android réels (environnement sans ces navigateurs). Le format (H.264 High/Main, yuv420p, level ≤ 4.0) est standard ; il faut tout de même le tester sur un iPhone et un Android.
- La qualité de la vidéo mobile (960 px) est suffisante à 390 px mais légèrement moins nette sur grande tablette en portrait.
- Le logo a été redessiné à partir d'une référence floue. Un fichier source net (SVG/AI ou PNG haute définition sur fond blanc) permettrait d'ajuster les tracés.
- Le domaine, les coordonnées, les tarifs et les horaires restent à confirmer (aucune valeur n'a été inventée).

## 4. Lancement local
```bash
npm install
npm run build
npm run preview        # http://localhost:4173/fr/
```
Le dossier `dist/` peut aussi être servi par n'importe quel serveur statique (prévoir le support des requêtes Range pour la vidéo, ce qu'Apache/Hostinger fait par défaut).
