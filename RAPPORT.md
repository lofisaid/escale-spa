# Escale Spa — compte rendu du prototype

Date : 8 octobre 2026 · Version de présentation (non indexée, rien publié, aucun achat).

## 1. Ce qui a été réalisé

**13 pages × 3 langues = 39 pages réelles accessibles par URL** (+ page 404 par langue).

| Page | FR | EN / AR |
|---|---|---|
| Accueil | `/fr/` | `/en/`, `/ar/` |
| Prestations (filtres) | `/fr/prestations/` | `/…/services/` |
| Massages bien-être | `/fr/prestations/massages-bien-etre/` | `/…/services/wellbeing-massages/` |
| Manucure, pédicure & onglerie | `/fr/prestations/manucure-pedicure-onglerie/` | `/…/services/manicure-pedicure-nails/` |
| Soins du visage | `/fr/prestations/soins-du-visage/` | `/…/services/facials/` |
| Packs & tarifs | `/fr/packs-tarifs/` | `/…/packs-prices/` |
| À propos | `/fr/a-propos/` | `/…/about/` |
| Galerie | `/fr/galerie/` | `/…/gallery/` |
| Riads, villas & événements | `/fr/riads-villas-evenements/` | `/…/riads-villas-events/` |
| Demande de réservation | `/fr/reservation/` | `/…/booking/` |
| Contact & FAQ | `/fr/contact-faq/` | `/…/contact-faq/` |
| Confidentialité (brouillon) | `/fr/confidentialite/` | `/…/privacy/` |
| Conditions de réservation (brouillon) | `/fr/conditions-reservation/` | `/…/booking-terms/` |

**Identité** — logotype typographique provisoire « Belle *à* Dom » avec un arc (motif des portes de Marrakech, repris dans les cadres d'images) ; palette ivoire, rose poudré, brun profond, touches champagne ; Fraunces (titres) + Figtree (texte) ; Amiri + IBM Plex Sans Arabic en arabe.

**Fonctions** — menu mobile (piège de focus, Échap), sélecteur de langue vers la page équivalente, filtres de prestations (univers, durée, groupes), fiches complètes (description, durée, tarif, contenu, matériel apporté, préparation, zones et déplacement, bouton de demande), parcours de réservation en 6 étapes avec validation et récapitulatif, prévisualisation + copie du message WhatsApp, formulaire partenaires (riads/villas/hôtels), galerie filtrable avec visionneuse au clavier, FAQ, mention « Version de présentation ».

**Scène 3D** (Three.js 0.186, tout est local) — salon aux murs en enduit, sol en bejmat posé en chevrons, fenêtre en arc par laquelle entre la lumière ; table de massage, poste de manucure, fauteuil de soins du visage. Chargée seulement au clic, 3 points interactifs (vrais boutons) + 3 boutons HTML équivalents, fiche accessible, caméra limitée (rotation ±22°, pas de panoramique, zoom borné), rendu suspendu hors écran, résolution et ombres réduites sur mobile, ressources libérées à la fermeture, illustration de remplacement sans WebGL, aucun mouvement automatique si « réduire les animations » est activé.

## 2. Résultats réels des tests

Environnement : Linux, Chromium 141 headless (Playwright 1.56), **sans GPU** (WebGL logiciel SwiftShader), serveur statique local avec gzip.

### Suite automatisée — `reports/test-report.md` : **75 / 75 vérifications réussies**
- 39 pages × 5 largeurs (360, 390, 768, 1024, 1440 px) = **195 chargements** : 0 erreur JS, 0 avertissement console, 0 fichier manquant, 0 débordement horizontal, toutes les images chargées.
- **219 liens internes** (dont ancres) résolus ; sélecteur de langue vérifié.
- **axe-core** (WCAG 2.1 A/AA + bonnes pratiques) sur 39 pages × 2 largeurs : 0 violation (contrastes inclus).
- Clavier : lien d'évitement, focus visible 3 px, menu mobile, FAQ, visionneuse, boutons indisponibles expliqués.
- Réservation : pré-remplissage, erreurs claires (prestation, date passée, heure, quartier, lieu, personnes, nom, téléphone, consentement), récapitulatif, phrase « Votre rendez-vous sera confirmé après vérification des disponibilités. », jamais « réservation confirmée », copie du message, aucun envoi réseau, événement de mesure sans données personnelles.
- 3D : non chargée au démarrage ; fiche ouverte depuis un point ; rendu suspendu hors écran (0 image/s) ; fermeture → canvas retiré, plus de boucle, focus rendu ; 4 réouvertures sans erreur ; mode mouvement réduit (rendu à la demande, pas de travelling) ; navigateur sans WebGL (message, illustration, fiches accessibles) ; site lisible sans JavaScript.

### Lighthouse 13 — chargement initial (`reports/lighthouse/`), médiane de 3 exécutions

| Profil | Pages | Performance | Accessibilité | Bonnes pratiques |
|---|---|---|---|---|
| Mobile (Moto G Power émulé, 4G lente simulée, CPU ×4) | 11 pages principales FR/EN/AR | **99 – 100** | **100** | **100** |
| Ordinateur | 4 pages | **100** | **100** | **100** |

LCP mobile 1,4 – 2,0 s, TBT 0 ms, CLS ≤ 0,002. Poids de l'accueil : 233 Ko (FR), 283 Ko (AR).
SEO 66 – 69 : **voulu**, seul l'audit « page indexable » échoue à cause du `noindex` exigé. Contrôle sur une compilation « mise en ligne » (`prototype: false`) : **SEO 100**.

### Expérience 3D, évaluée séparément (`reports/perf-3d.json`)
- Module 3D : 602 Ko (156 Ko compressé), téléchargé uniquement au clic. Script principal : 14 Ko (5 Ko compressé).
- Ouverture : 1,3 s (ordinateur) / 1,8 s (mobile, CPU ×4) **en rendu logiciel**.
- Mémoire JS : 5,6 Mo scène ouverte → 4,6 Mo après fermeture, stable après 5 cycles (pas de fuite détectée).
- Cadence mesurée : 4 images/s — **non représentatif** : la machine de test n'a pas de GPU. À mesurer sur un vrai téléphone.

### Revue visuelle
Captures mobile / tablette / ordinateur dans `reports/screens/`. Défauts corrigés pendant la revue : boutons de la scène visibles alors que masqués, ponctuation française orpheline (espaces insécables automatiques), nom latin mal placé dans le texte arabe (isolation bidi), contrôles 3D trop encombrants sur mobile, étiquettes coupées au bord de la scène, sauts de mise en page (CLS) sur le formulaire et les filtres, polices arabes trop lourdes (réduites de 97 + 41 + 44 Ko à 40 + 14 + 15 Ko par sous-ensemble automatique).

## 3. Limites restantes
- Fluidité 3D non mesurée sur matériel réel (pas de GPU ici) ; à tester sur un iPhone et un Android milieu de gamme.
- Les captures et audits viennent de Chromium uniquement ; Safari et Firefox non testés automatiquement.
- Tests d'accessibilité automatiques (axe) : un essai avec un lecteur d'écran réel (VoiceOver, TalkBack) reste recommandé.
- La traduction arabe (fustha, adresse au pluriel neutre) et anglaise mérite une relecture par un locuteur natif.
- Images : illustrations provisoires (rendus 3D et dessins vectoriels originaux), à remplacer par de vraies photos.
- Pages légales : brouillons à faire valider (loi 09-08 / CNDP).
- Aucune photo de concurrentes, aucun avis, diplôme, chiffre ou récompense ; aucune donnée structurée.

## 4. Éléments non confirmés (tous modifiables dans `config/`)
| Élément | Où | État actuel |
|---|---|---|
| 13 prestations, 3 familles, 4 packs (noms, contenus, durées) | `config/catalogue.mjs` | Hypothèses de présentation |
| Tous les tarifs (20 clés) | `site.config.mjs › prices` | « Tarif à confirmer » |
| Zones (8 quartiers) et frais de déplacement | `site.config.mjs › zones` | Proposition, « à confirmer » |
| Horaires | `site.config.mjs › hours` | « à confirmer » |
| WhatsApp, téléphone, e-mail, Instagram | `site.config.mjs › contact` | Absents, état expliqué |
| Nombre maximum de personnes (12) | `site.config.mjs › maxGuests` | Valeur provisoire |
| Engagements (hygiène, ponctualité, discrétion, transparence) | `content/*.mjs › about` | Marqués « proposés » |
| Présentation de la professionnelle | `content/*.mjs › about` | Emplacement vide signalé |
| Politique de confidentialité, conditions de réservation | `content/*.mjs` | Brouillons, passages `[à compléter]` |
| Nom « Escale Spa », domaine escalespa.com | `site.config.mjs` | Provisoires, domaine non acheté |

## 5. Questions à poser à la professionnelle avant publication
1. Liste exacte des soins proposés, durées et prix ; packs souhaités.
2. Matériel réellement apporté (table, lampe UV/LED, produits, marques) ; besoins sur place.
3. Quartiers desservis, frais de déplacement, distance maximale.
4. Jours et horaires ; délai minimum pour réserver ; nombre de personnes possible par jour.
5. Travaille-t-elle seule ou en équipe ? Accepte-t-elle les hommes ? Les mineurs ?
6. Formations et diplômes vérifiables à afficher ; texte de présentation ; photo (si elle le souhaite).
7. Numéro WhatsApp officiel, e-mail, Instagram.
8. Conditions d'annulation, retard, moyens de paiement, acompte éventuel.
9. Photos de ses réalisations avec accord écrit des personnes visibles.
10. Validation du nom, de la signature, de la palette et du domaine avant achat.
11. Partenariats existants avec des riads, villas ou hôtels.
12. Identité légale (statut, responsable du traitement des données) pour les pages légales.

## 6. Provenance des images
- `scene-*.webp` : rendus de la scène 3D du site (`npm run stills`), créés pour ce prototype.
- `illus-*.svg` : illustrations vectorielles originales créées pour ce prototype.
- Aucune image téléchargée, aucune banque d'images, aucune photo de tiers.
- Polices : licence SIL Open Font License (Fontsource). Three.js : licence MIT (`*.LEGAL.txt`).
