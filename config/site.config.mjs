/**
 * Escale Spa — configuration centrale du site.
 *
 * C'est le SEUL fichier à modifier pour : numéro WhatsApp, coordonnées,
 * horaires, zones desservies, frais de déplacement, tarifs, mode prototype
 * et mesure d'audience. Après modification : `npm run build`.
 *
 * Règle : toute valeur à `null` est affichée comme « à confirmer » sur le site.
 * Ne jamais mettre ici de clé secrète : ce fichier est lisible côté client.
 */
export default {
  /** Nom et signature provisoires */
  brand: {
    name: 'Escale Spa',
    tagline: {
      fr: 'Beauté & Bien-être à domicile — Marrakech',
      en: 'Beauty & Wellbeing at home — Marrakech',
      ar: 'جمال وعناية بالرفاهية في المنزل — مراكش',
    },
  },

  /**
   * Mode prototype : ajoute « Version de présentation », `noindex`
   * et un robots.txt qui bloque l'indexation. Passer à `false` au lancement.
   */
  prototype: true,

  /** Domaine envisagé (NON acheté) — sert aux URL canoniques et au sitemap. */
  siteUrl: 'https://escalespa.com',

  /** Langues publiées. La première est la langue par défaut. */
  languages: ['fr', 'en', 'ar'],

  contact: {
    /**
     * Numéro WhatsApp au format international SANS « + » ni espaces,
     * ex. '2126XXXXXXXX'. Vide = bouton WhatsApp indisponible,
     * le site propose alors de copier le message.
     */
    whatsapp: '',
    phoneDisplay: null, // ex. '+212 6 XX XX XX XX'
    email: null, // ex. 'contact@escalespa.com'
    instagram: null, // ex. 'https://instagram.com/…'
  },

  /**
   * Horaires d'intervention. `null` = « à confirmer ».
   * Exemple : { fr: 'Du lundi au samedi, 9 h – 20 h', en: '…', ar: '…' }
   */
  hours: null,

  /**
   * Zones desservies — liste PROPOSÉE pour la présentation, à faire valider.
   * `fee` : frais de déplacement en MAD (null = à confirmer).
   */
  zones: [
    { id: 'gueliz', fee: null, name: { fr: 'Guéliz', en: 'Gueliz', ar: 'جليز' } },
    { id: 'hivernage', fee: null, name: { fr: 'Hivernage', en: 'Hivernage', ar: 'الحي الشتوي (إيفرناج)' } },
    { id: 'medina', fee: null, name: { fr: 'Médina', en: 'Medina', ar: 'المدينة القديمة' } },
    { id: 'agdal', fee: null, name: { fr: 'Agdal', en: 'Agdal', ar: 'أكدال' } },
    { id: 'palmeraie', fee: null, name: { fr: 'Palmeraie', en: 'Palmeraie', ar: 'النخيل' } },
    { id: 'targa', fee: null, name: { fr: 'Targa', en: 'Targa', ar: 'تاركة' } },
    { id: 'route-ourika', fee: null, name: { fr: "Route de l'Ourika", en: 'Ourika road', ar: 'طريق أوريكا' } },
    { id: 'route-amizmiz', fee: null, name: { fr: "Route d'Amizmiz", en: 'Amizmiz road', ar: 'طريق أمزميز' } },
  ],

  /**
   * Tarifs en MAD, par option de prestation (clé = « id-durée » ou id de pack).
   * `null` = affiché « Tarif à confirmer ». Aucun prix n'a été fourni à ce jour.
   */
  prices: {
    'massage-relaxant-60': null,
    'massage-relaxant-90': null,
    'massage-dos-nuque-30': null,
    'massage-dos-nuque-45': null,
    'rituel-argan-75': null,
    'massage-pieds-jambes-30': null,
    'massage-pieds-jambes-45': null,
    'manucure-classique-45': null,
    'manucure-semi-permanent-60': null,
    'pedicure-classique-50': null,
    'pedicure-semi-permanent-70': null,
    'pose-gel-120': null,
    'depose-30': null,
    'soin-visage-essentiel-45': null,
    'soin-visage-complet-75': null,
    'soin-visage-express-30': null,
    'pack-detente': null,
    'pack-mains-pieds': null,
    'pack-entre-amies': null,
    'pack-evenement': null,
  },

  /** Devise d'affichage des tarifs */
  currency: { code: 'MAD', fr: 'MAD', en: 'MAD', ar: 'درهم' },

  /** Nombre maximum de personnes acceptées dans le formulaire */
  maxGuests: 12,

  /**
   * Mesure d'audience — PRÉPARÉE mais désactivée.
   * Les événements (booking_request_prepared, whatsapp_click, …) sont
   * seulement journalisés dans la console de développement.
   */
  analytics: {
    enabled: false,
    provider: null, // ex. 'plausible' ou 'ga4' (aucun script chargé tant que enabled=false)
  },
};
