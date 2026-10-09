# Escale Spa — Vidéos des services, navigation opaque (v4)

Date : 8 octobre 2026 · Prototype non indexé. Rien publié, aucun achat, aucun déploiement.
Copie de la version précédente : `archives/escale-spa-v3-20261008`. Hero vidéo de l'accueil conservé.

## 1. Modifications

**Médias fournis** (`EscaleSpa_Services_Web.zip` → conservés tels quels dans `assets-src/services/`).
- Les fichiers ont été vérifiés avant intégration : H.264 High, yuv420p, sans audio, `faststart`, 1600×900 et 960×540.
- Durées : massage 8 s, manucure 8 s, visage 2,25 s, cette dernière conservée telle quelle, sans allongement ni ajout.
- **Aucun réencodage.** Les fichiers livrés dans `dist/` sont identiques octet pour octet aux fichiers fournis ; un test le vérifie par empreinte SHA-256.

**Cartes de l'accueil** (FR/EN/AR).
- Les trois illustrations 3D sont remplacées par les affiches massage, manucure et visage.
- Le cadre arrondi est conservé, en 16:10 : léger rognage du haut et du bas seulement.
- Chaque carte porte une étiquette « Illustration IA », et la mention complète figure sous le titre de la section.

**Pages de service.**
- Lecteur pleine largeur (maximum 1100 px), en 16:9 et **sans recadrage** pendant la lecture (`object-fit: contain`).
- Avant le clic, l'affiche WebP est affichée, accompagnée d'un bouton « Lire la vidéo » et de la durée.
- **Aucun octet de vidéo n'est chargé avant le clic** (`preload="none"`, `src` attribuée au clic). Une seule version est chargée :
  - 960 px sur mobile (< 900 px), en mode économie de données ou en 2G ;
  - 1600 px sinon.
- Pas d'autoplay ni de boucle : la vidéo s'arrête à la fin.
- Commandes accessibles et traduites : pause/reprise (`aria-pressed`), « Revoir » et plein écran (bouton qui ouvre puis ferme). Le focus est placé sur la commande de pause après le lancement.
- Pause automatique hors écran et quand l'onglet est masqué, **sans reprise automatique**.
- Sans JavaScript, ou si le navigateur ne lit pas H.264 : l'affiche reste visible et le bouton est un **lien direct vers le MP4**, avec un lien supplémentaire dans `<noscript>`.
- Les dimensions sont réservées : aucun décalage de mise en page.

**Mention IA** (FR/EN/AR), sous chaque vidéo et sur l'accueil :
« Images générées par IA, à titre d'illustration : elles ne montrent ni un lieu, ni une équipe, ni une prestation réelle. »
Aucun tarif, aucune coordonnée ni aucune qualification n'a été ajouté. Les vidéos ne sont pas présentées comme de la 3D interactive.

**Navigation.**
- L'en-tête collant a désormais un fond ivoire **entièrement opaque** (avant : 96 %). Le menu mobile est opaque aussi.
- Vérifié en 3 langues × 5 largeurs : en cours de défilement, chaque point de l'en-tête appartient à l'en-tête, rien ne transparaît.

**Accueil arabe.** Le titre est désormais « لحظة جمال وراحة، في بيتك. »

**Correction annexe.** La boucle de rendu de l'ancienne scène 3D vérifie maintenant sa visibilité à chaque image. Sous forte charge, l'observateur de visibilité pouvait laisser passer une ou deux images hors écran. La scène 3D est conservée.

## 2. Tests réellement exécutés

Environnement : Linux, Chromium 141 headless (Playwright 1.56), sans GPU, serveur local avec gzip et requêtes Range.

**Suite automatisée : 144 / 144 vérifications réussies** (`reports/test-report.md`, exécution complète finale). Elle comprend :
- 39 pages × 5 largeurs (360, 390, 768, 1024, 1440) en FR/EN/AR : aucune erreur JS, aucun fichier manquant, aucun débordement horizontal ;
- liens internes et ancres vérifiés ;
- axe-core WCAG 2.1 AA ;
- clavier, réservation et horaires de Marrakech ;
- Hero vidéo de l'accueil (21 vérifications, inchangées) ;
- **films des services (41 vérifications)** :
  - pour massage (FR), manucure (EN) et visage (AR) : aucun téléchargement avant le clic, ni autoplay ni boucle ; lecture au clavier ; une seule version ; pause et reprise ; arrêt à la fin ; « Revoir » ; plein écran ; pause hors écran et onglet masqué sans reprise ; aucune erreur ;
  - cas particuliers : mobile 960 px en 16:9 non recadré, économie de données, mouvement réduit, navigateur sans H.264, sans JavaScript (lien HTTP 200) ;
  - affiches des cartes dans les 3 langues, mention IA traduite, fichiers identiques aux originaux ;
- **navigation (2 vérifications)** : en-tête opaque (3 langues × 5 largeurs) et titre arabe.

**Captures** : `reports/screens/services/` (93 fichiers) :
- pour chaque page de service : affiche en 3 langues × 5 largeurs, et vidéo en cours de lecture avec ses commandes à 390 et 1440 px ;
- cartes de l'accueil et en-tête pendant le défilement.

Le Hero est capturé dans `reports/screens/hero/`.

**Lighthouse 13**, médiane de 3 exécutions, chargement initial (`reports/lighthouse/summary.md`).

| Profil | Pages | Performance | Accessibilité | Bonnes pratiques |
|---|---|---|---|---|
| Mobile (4G lent simulé, CPU ×4) | 11 pages | 97 – 100 (page Massage : 98, LCP 2,3 s) | 100 | 100 |
| Ordinateur | 4 pages | 100 | 100 | 100 |

SEO 66–69 : c'est voulu, à cause du `noindex` du prototype.

## 3. Limites des navigateurs de test (H.264)
Le Chromium de test, comme celui de Lighthouse, est une version **sans décodeur H.264** : il ne peut pas lire les MP4 livrés.
- Pour tester la lecture, les requêtes `.mp4` ont été servies avec des **copies VP9 de test** (`tests/fixtures/`, non déployées), de même durée et de même taille.
- Les tests vérifient donc l'interface, les requêtes réseau et la logique, **pas le décodage H.264 lui-même**.
- La lecture des fichiers fournis n'a pas été vérifiée sur Safari/iOS, Chrome/Android ou Edge réels. Le format (H.264 High, yuv420p, faststart) est standard, mais un essai sur un iPhone et un Android reste nécessaire.
- Le plein écran a été testé avec l'API standard. Sur iPhone, le code utilise le plein écran natif de la vidéo (`webkitEnterFullscreen`), qui n'a pas pu être testé ici.
- Lighthouse ne télécharge aucune vidéo de service (lecture sur demande uniquement). Ses scores ne mesurent donc que l'affiche.

## 4. Lancement local
```bash
npm install && npm run build && npm run preview   # http://localhost:4173/fr/
```
Ou : décompresser `escale-spa-dist.zip` et le servir avec n'importe quel serveur statique qui gère les requêtes Range (comme Apache/Hostinger).
