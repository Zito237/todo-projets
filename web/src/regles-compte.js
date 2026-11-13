// Règles pures des pages « Créer un compte » et « Se connecter » (sans dépôt, sans navigateur).
import { ErreurValidation, nettoyer } from './regles.js';

export const IDENTIFIANT_LONGUEUR_MIN = 3;
export const IDENTIFIANT_LONGUEUR_MAX = 30;
export const MOT_DE_PASSE_LONGUEUR_MIN = 8;
export const MOT_DE_PASSE_LONGUEUR_MAX = 64;

/** Clé de comparaison des identifiants : casse et espaces autour ignorés. */
export function cleIdentifiant(identifiant) {
  return nettoyer(identifiant).toLowerCase();
}

/** Identifiant : 3 à 30 caractères parmi les lettres sans accent, les chiffres, « . », « - » et « _ ». */
export function validerIdentifiant(saisi) {
  const identifiant = nettoyer(saisi);
  if (!identifiant) {
    throw new ErreurValidation("L'identifiant est obligatoire", 'identifiant');
  }
  if (identifiant.length < IDENTIFIANT_LONGUEUR_MIN || identifiant.length > IDENTIFIANT_LONGUEUR_MAX) {
    throw new ErreurValidation(
      `L'identifiant doit faire entre ${IDENTIFIANT_LONGUEUR_MIN} et ${IDENTIFIANT_LONGUEUR_MAX} caractères`, 'identifiant',
    );
  }
  if (!/^[A-Za-z0-9._-]+$/.test(identifiant)) {
    throw new ErreurValidation(
      "L'identifiant ne peut contenir que des lettres sans accent, des chiffres, le point, le tiret et le tiret bas", 'identifiant',
    );
  }
  return identifiant;
}

/** Vrai si le mot de passe n'a pas été saisi. Il n'est jamais nettoyé : un espace est un caractère. */
export function motDePasseAbsent(motDePasse) {
  return motDePasse === undefined || motDePasse === null || motDePasse === '';
}

/** Mot de passe : 8 à 64 caractères, avec au moins une lettre et un chiffre. Rendu tel quel. */
export function validerMotDePasse(motDePasse) {
  if (motDePasseAbsent(motDePasse)) {
    throw new ErreurValidation('Le mot de passe est obligatoire', 'motDePasse');
  }
  if (motDePasse.length < MOT_DE_PASSE_LONGUEUR_MIN || motDePasse.length > MOT_DE_PASSE_LONGUEUR_MAX) {
    throw new ErreurValidation(
      `Le mot de passe doit faire entre ${MOT_DE_PASSE_LONGUEUR_MIN} et ${MOT_DE_PASSE_LONGUEUR_MAX} caractères`, 'motDePasse',
    );
  }
  if (!/\p{L}/u.test(motDePasse) || !/\d/.test(motDePasse)) {
    throw new ErreurValidation('Le mot de passe doit contenir au moins une lettre et un chiffre', 'motDePasse');
  }
  return motDePasse;
}

export function validerConfirmation(motDePasse, confirmation) {
  if (confirmation !== motDePasse) {
    throw new ErreurValidation('Les deux mots de passe ne sont pas identiques', 'confirmation');
  }
}
