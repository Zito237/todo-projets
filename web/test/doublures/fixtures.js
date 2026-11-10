// Horloge et générateur d'identifiants INJECTÉS : les tests ne dépendent ni de
// l'heure d'exécution ni du hasard (cause n°1 et n°2 des tests instables, séance 9).
export function horlogeFixe(iso = '2026-11-10T09:00:00.000Z') {
  return () => new Date(iso);
}

export function idsSequentiels(prefixe = 'id') {
  let n = 0;
  return () => `${prefixe}-${++n}`;
}

/** Horloge qu'on peut avancer pendant le test (pour vérifier modifieLe). */
export function horlogeReglable(iso = '2026-11-10T09:00:00.000Z') {
  let courant = new Date(iso);
  const horloge = () => new Date(courant);
  horloge.regler = (nouvelIso) => { courant = new Date(nouvelIso); };
  return horloge;
}
