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

export const TITRE_LONGUEUR_MAX = 120;

export function validerTitreTache(titreSaisi) {
  const titre = nettoyer(titreSaisi);
  if (!titre) {
    throw new ErreurValidation('Le titre de la tâche est obligatoire', 'titre');
  }
  if (titre.length > TITRE_LONGUEUR_MAX) {
    throw new ErreurValidation(`Le titre ne doit pas dépasser ${TITRE_LONGUEUR_MAX} caractères`, 'titre');
  }
  return titre;
}

/** Échéance facultative : null, ou une date calendaire réelle au format AAAA-MM-JJ. */
export function validerEcheance(echeance) {
  if (echeance === undefined || echeance === null || echeance === '') {
    return null;
  }
  const correspondance = /^(\d{4})-(\d{2})-(\d{2})$/.exec(echeance);
  if (correspondance) {
    const [, a, m, j] = correspondance.map(Number);
    const date = new Date(Date.UTC(a, m - 1, j));
    // 2027-02-30 donnerait le 2 mars : on vérifie que la date n'a pas « débordé »
    if (date.getUTCFullYear() === a && date.getUTCMonth() === m - 1 && date.getUTCDate() === j) {
      return echeance;
    }
  }
  throw new ErreurValidation("L'échéance doit être une date valide au format AAAA-MM-JJ", 'echeance');
}
