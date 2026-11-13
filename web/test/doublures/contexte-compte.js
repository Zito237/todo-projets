// Mise en place commune aux tests des comptes (partie « Arrange »).
import { ServiceComptes } from '../../src/comptes.js';
import { DepotMemoire } from './depot-memoire.js';
import { horlogeFixe, idsSequentiels } from './fixtures.js';
import { genererPairwise } from '../pairwise/pairwise.js';
import { COMPTE_VISE, AUTRE_COMPTE, FACTEURS_INSCRIPTION, FACTEURS_CONNEXION } from '../pairwise/facteurs-compte.js';

// Cas pairwise partagés par les tests pairwise et par les oracles : générés une fois.
export const CAS_INSCRIPTION = genererPairwise(FACTEURS_INSCRIPTION);
export const CAS_CONNEXION = genererPairwise(FACTEURS_CONNEXION);

/**
 * FAKE du hacheur de mots de passe. Le vrai (PBKDF2, 100 000 tours) est volontairement
 * lent : c'est sa raison d'être. Ici le calcul est immédiat et déterministe, pour que
 * les tests unitaires restent rapides (F de F.I.R.S.T.). Le test de contrat de
 * hachage.test.js vérifie que le fake et le vrai respectent les mêmes propriétés.
 */
export function hacheurFactice() {
  let n = 0;
  return {
    genererSel: () => `sel-${++n}`,
    hacher: async (motDePasse, sel) => `empreinte(${sel}|${motDePasse})`,
  };
}

/** Service de comptes neuf : dépôt en mémoire, horloge fixe, identifiants c-1, c-2… */
export function nouveauServiceComptes(depot = new DepotMemoire()) {
  const comptes = new ServiceComptes(depot, {
    horloge: horlogeFixe(), genererId: idsSequentiels('c'), hacheur: hacheurFactice(),
  });
  return { comptes, depot };
}

/** Raccourci : inscription avec une confirmation identique. */
export function inscrire(comptes, identifiant, motDePasse) {
  return comptes.creerCompte({ identifiant, motDePasse, confirmation: motDePasse });
}

const PERSONNES = {
  vise: COMPTE_VISE,
  autre: AUTRE_COMPTE,
  tiers1: { identifiant: 'chantal', motDePasse: 'Etoile2028' },
  tiers2: { identifiant: 'daouda', motDePasse: 'Soleil2026' }, // même mot de passe que le compte visé
};

/** Crée les comptes dans l'ordre demandé (« vise », « autre », « tiers1 », « tiers2 »). */
export async function peuplerComptes(comptes, ordre) {
  const crees = {};
  for (const qui of ordre) {
    crees[qui] = await inscrire(comptes, PERSONNES[qui].identifiant, PERSONNES[qui].motDePasse);
  }
  return crees;
}

/** Photographie de tout ce qui est enregistré (pour vérifier « rien n'a changé »). */
export async function etatComptes(depot) {
  const comptes = await depot.listerComptes();
  return comptes.sort((a, b) => a.id.localeCompare(b.id));
}

/** Met la base dans l'état demandé par un cas d'inscription (comptes déjà présents). */
export async function preparerEtat(comptes, c) {
  for (let i = 1; i <= c.etat.autres; i++) {
    await inscrire(comptes, `zoe.autre${i}`, 'Autre2026x');
  }
  if (c.etat.pris && c.identifiant.valide) {
    await inscrire(comptes, c.etat.ecriture(c.identifiant.attendu), 'DejaLa2026');
  }
}

/** Ce que l'utilisateur saisit dans le formulaire d'inscription pour un cas donné. */
export function saisieDe(c) {
  return {
    identifiant: c.identifiant.valeur,
    motDePasse: c.motDePasse.valeur,
    confirmation: c.confirmation.de(c.motDePasse.valeur),
  };
}
