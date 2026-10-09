# v6 — Page cachée de validation (`/validation-projet/`)

Questionnaire pour la propriétaire d'Escale Spa : expliquer le prototype et recueillir ses décisions, sans code.

## Fichiers
- `scripts/validation-page.mjs` — extrait les données **réelles** de `config/catalogue.mjs` et `config/site.config.mjs` (13 services, 3 familles, 4 packs, 8 zones, `maxGuests`) et génère la page.
- `src/js/validation.js` — questionnaire (10 étapes), sauvegarde locale, exports.
- `src/css/validation.css` — style (jetons de `main.css`, mobile d'abord, RTL par propriétés logiques, impression).
- `scripts/build.mjs` — génère `dist/validation-projet/index.html` ; règle `.htaccess` : `X-Robots-Tag: noindex` + `Cache-Control: no-store` pour cette URL.
- `scripts/deploy.mjs` — `--delete` ne supprime jamais `.well-known/` ni `validation-projet/.htaccess` / `.htpasswd` (protection créée dans hPanel).

## Comportement
- Français / arabe RTL (bascule en haut de page), langage simple.
- Aucune réponse présélectionnée ; « À décider » partout (sauf champs de remarque libre).
- Sauvegarde dans `localStorage` du navigateur (indiqué à l'écran) ; bouton « Effacer mes réponses » avec confirmation.
- Récapitulatif modifiable (« Modifier » ramène au champ), informations manquantes, points « À décider ».
- Exports : JSON, résumé `.txt` (UTF-8), impression / PDF navigateur.
- Aucun envoi : la page ne dit jamais « envoyé » ; elle demande de transmettre le fichier au responsable du projet.
- Aucune requête réseau, aucune mesure d'audience. Pas de pièce d'identité, de coordonnées bancaires, de données de santé ni d'informations sur les clientes/clients.
- Les réponses ne modifient **pas** les services publics (aucun lien entre la page et `config/`). Reporter une décision = modifier `config/` à la main.

## Accès : une URL cachée n'est pas une protection
La page n'est ni dans la navigation, ni dans `sitemap.xml`, ni dans `pages.json`, et porte `noindex` (balise + en-tête). Mais toute personne qui a le lien peut l'ouvrir. Avant d'envoyer le lien à la propriétaire :

1. hPanel → **Sites web** → escalespa.com → **Avancé → Protection de répertoire par mot de passe** (« Password protect directories »).
2. Choisir le dossier `public_html/validation-projet`, créer un utilisateur et un mot de passe **à communiquer par un autre canal** que le lien.
3. Ne pas redéployer sans `scripts/deploy.mjs` (il préserve `.htaccess` / `.htpasswd` de ce dossier).

Le dossier `validation-projet/` n'existe pas encore sur le serveur : créer la protection **après** le premier déploiement qui le contient, puis tester qu'un navigateur sans identifiants reçoit une demande de mot de passe.

## Vérifications faites
Build OK ; page absente du sitemap, de `pages.json` et de la navigation ; parcours testé dans le navigateur (mobile 375 px) : aucune case cochée au départ, décisions, « À décider », champs conditionnels, restauration après rechargement, bascule arabe RTL, exports JSON/TXT, impression, effacement. Suite `npm test --quick` : 6/7 (le test navigateur exige `npx playwright install`, non fait).
Non vérifié : audit axe de la page, lecture du `.txt` arabe dans le Bloc-notes Windows, test sur un vrai téléphone.
