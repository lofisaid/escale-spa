# Escale Spa — lecture automatique des films de service, retrait des mentions IA (v5)

Date : 9 octobre 2026 · Prototype non indexé. Rien publié, aucun déploiement. Copie précédente : `archives/escale-spa-v4-20261009`.

## Modifications
- **Films des services** (massage, manucure, visage), FR/EN/AR :
  - lecture automatique dès que le film devient visible : `autoplay`, `muted`, `playsinline`, `loop` ;
  - gros bouton de démarrage superposé supprimé ;
  - bouton discret pause/reprise en bas à droite, accessible au clavier, libellés traduits, `aria-pressed` ;
  - pause hors écran et onglet masqué, puis reprise automatique au retour, sauf si l'utilisateur a mis en pause ;
  - une seule version chargée, au moment où le film devient visible : 960 px sur mobile (< 900 px), en économie de données ou en 2G ; 1600 px sinon ;
  - mouvement réduit ou économie de données : affiche seule, rien n'est téléchargé, et le bouton s'élargit en « Lire la vidéo » pour une lecture volontaire ;
  - autoplay bloqué par le navigateur : même bouton « Lire la vidéo » ;
  - sans JavaScript : affiche et lien direct vers le MP4 ;
  - **fichiers vidéo non modifiés, non réencodés** (empreintes SHA-256 identiques aux originaux).
- **Mentions IA supprimées** dans les 3 langues : badges « Illustration IA » des cartes, légendes sous les films, phrase ajoutée sous « Trois univers de soins ». Aucune autre mention visible ne les remplace.
  - Le texte alternatif des films est neutre : « Vidéo : Massages bien-être à domicile ».
  - Aucun texte ne présente ces visuels comme des photos de la professionnelle, d'un établissement ou de prestations réalisées.
- **Inchangé** : Hero, design, traductions, réservation, scène 3D.
  - Les étiquettes « Illustration provisoire » de la galerie et de la scène 3D sont conservées. Elles concernent les rendus 3D du prototype, pas les médias IA.

## Tests réellement exécutés — 148 / 148 (`reports/test-report.md`)
Environnement : Chromium 141 headless (Playwright 1.56), sans GPU, serveur local.
- 39 pages × 5 largeurs (360, 390, 768, 1024, 1440) en 3 langues : aucune erreur JS, aucun fichier manquant, aucun débordement.
- Liens internes vérifiés ; axe-core WCAG 2.1 AA : 0 violation ; clavier, réservation, horaires de Marrakech, Hero.
- **Films (45 vérifications)**, pour massage FR, manucure EN et visage AR :
  - rien n'est téléchargé avant que le film soit visible ;
  - pas de gros bouton ;
  - lecture automatique muette, en boucle, inline ;
  - une seule version ;
  - boucle effective ;
  - pause et reprise au clavier ;
  - pause hors écran et reprise au retour ;
  - pause et reprise selon l'onglet ;
  - pause utilisateur respectée ;
  - aucune erreur.
- **Films, cas particuliers** : mobile en 960 px et cadre 16:9 non recadré ; mouvement réduit ; économie de données ; autoplay bloqué ; navigateur sans H.264 ; sans JS ; affiches des cartes ; aucune mention IA dans les 39 pages.
- Captures : `reports/screens/services/` (films en lecture, 3 langues × 5 largeurs, cartes, en-tête).

## Limites
- Le Chromium de test ne décode pas H.264. La lecture a donc été testée avec des copies VP9 de même durée (`tests/fixtures/`, non déployées) : les tests portent sur la logique, les requêtes et l'interface, pas sur le décodage des MP4.
- Le blocage de l'autoplay a été simulé (attribut ignoré, `play()` refusé sans geste). Le comportement réel de Safari/iOS (mode économie d'énergie, par exemple) reste à vérifier sur iPhone et Android.

## Lancement local
`npm install && npm run build && npm run preview` → http://localhost:4173/fr/
