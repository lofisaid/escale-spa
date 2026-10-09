# Escale Spa — fichiers de marque

| Fichier | Usage |
|---|---|
| `symbol.svg` | Symbole (arc + feuille + soleil), couleurs d'origine. Sert aussi de favicon. |
| `symbol-light.svg` | Symbole pour fonds sombres. |
| `logo-horizontal.svg` / `-light.svg` | Logo horizontal (symbole + « Escale Spa »). Le nom est un **texte** en Fraunces : sans cette police installée, une police serif de remplacement s'affiche. |
| `export/logo-horizontal*.png` | Mêmes logos en PNG transparent (4×), rendus avec la vraie police Fraunces. |
| `export/symbol*-1024.png` | Symbole en PNG transparent, 1024 px de haut. |

**Provenance.** Le logo de référence fourni (`assets-src/logo-reference.png`) est une image floue sur fond noir
(et non sur fond blanc). Le symbole a donc été **redessiné en vectoriel** (tracés SVG faits à la main) d'après
cette référence : c'est une interprétation fidèle de la forme (arc à épaulements, double filet, feuille et
petit soleil), **pas une reproduction exacte**. Aucun PNG n'est inclus dans les SVG.
La typographie « Escale Spa » utilise Fraunces semi-gras (licence SIL OFL), proche de la référence, pas identique.
Couleurs : arc #B07E4E, motif #F4E6D3, texte #5A2A14 ; version claire : arc #D9B48A, texte #F7EDE1.

Régénérer les PNG : `node scripts/export-logos.mjs`.
