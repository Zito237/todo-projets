// ORACLE DE RÉFÉRENCE des comptes : prédit le résultat attendu d'un cas à partir de
// la SPÉCIFICATION (encodée dans facteurs-compte.js), sans appeler le code testé.
//
// Priorité des refus (lacune de spécification, choix à faire valider) :
//   - inscription : identifiant, puis mot de passe, puis confirmation (ordre des champs
//     du formulaire), et seulement ensuite « identifiant déjà utilisé » ;
//   - connexion   : identifiant vide, puis mot de passe vide, puis « identifiant ou mot
//     de passe incorrect » SANS dire lequel des deux est faux (non-divulgation).

/** RA d'une inscription : { erreur: champ } ou { compte: { identifiant } }. */
export function attenduInscription({ identifiant, motDePasse, confirmation, etat }) {
  if (!identifiant.valide) return { erreur: 'identifiant' };
  if (!motDePasse.valide) return { erreur: 'motDePasse' };
  if (!confirmation.identique) return { erreur: 'confirmation' };
  if (etat.pris) return { erreur: 'identifiant', message: 'Cet identifiant est déjà utilisé' };
  return { compte: { identifiant: identifiant.attendu } };
}

/**
 * RA d'une connexion : { erreur: champ } ou { compte: 'vise' | 'autre' }.
 * Le couple « identifiant de l'autre compte » + « mot de passe de l'autre compte » est une
 * connexion VALIDE, au compte de l'autre. La première version de cet oracle l'oubliait :
 * c'est le pairwise qui a produit ce cas et montré l'erreur de l'oracle, pas du code.
 */
export function attenduConnexion({ identifiant, motDePasse }) {
  if (identifiant.statut === 'vide') return { erreur: 'identifiant' };
  if (motDePasse.statut === 'vide') return { erreur: 'motDePasse' };
  if (identifiant.statut === 'vise' && motDePasse.statut === 'correct') return { compte: 'vise' };
  if (identifiant.statut === 'autre' && motDePasse.deLAutre) return { compte: 'autre' };
  return { erreur: 'connexion', message: 'Identifiant ou mot de passe incorrect' };
}
