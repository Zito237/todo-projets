// Horloge et générateur d'identifiants INJECTÉS : les tests ne dépendent ni de
// l'heure d'exécution ni du hasard (cause n°1 et n°2 des tests instables, séance 9).
export function horlogeFixe(iso = '2026-11-10T09:00:00.000Z') {
  return () => new Date(iso);
}

export function idsSequentiels(prefixe = 'id') {
  let n = 0;
  return () => `${prefixe}-${++n}`;
}
