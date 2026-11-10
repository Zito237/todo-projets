// Règles métier pures (sans dépôt, sans navigateur) : faciles à tester et à relire.

export class ErreurValidation extends Error {
  constructor(message, champ) {
    super(message);
    this.name = 'ErreurValidation';
    this.champ = champ;
  }
}

/** Retire les espaces autour ; une valeur absente devient une chaîne vide. */
export function nettoyer(texte) {
  return (texte ?? '').trim();
}

/** Clé de comparaison des noms : casse ignorée (les accents comptent, cf. README). */
export function cleDeNom(nom) {
  return nettoyer(nom).toLowerCase();
}

export function comparerNoms(a, b) {
  return a.localeCompare(b, 'fr', { sensitivity: 'base' });
}

export function validerNomProjet(nomSaisi) {
  const nom = nettoyer(nomSaisi);
  if (!nom) {
    throw new ErreurValidation('Le nom du projet est obligatoire', 'nom');
  }
  return nom;
}
