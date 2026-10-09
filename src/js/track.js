// Événements de mesure PRÉPARÉS — aucun envoi tant que analytics.enabled = false
// (site.config.mjs). Pour activer plus tard : brancher ici le fournisseur choisi
// (ex. window.plausible?.(name, { props }) ou window.gtag?.('event', name, props)).
// Ne jamais transmettre de données personnelles (nom, téléphone, message).
/* global __ANALYTICS_ENABLED__ */
export function track(name, props = {}) {
  const evt = { event: name, ...props, ts: Date.now() };
  (window.bdEvents = window.bdEvents || []).push(evt);
  if (!__ANALYTICS_ENABLED__) {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') console.debug('[mesure désactivée]', evt);
    return;
  }
  // Point d'intégration futur :
  // window.plausible?.(name, { props });
}
