// CLASSES D'ÉQUIVALENCE des pages de compte : UNE classe à la fois, les autres
// entrées restant valides. Quand un cas échoue, on sait quelle classe est en cause.
import { describe, it, expect } from 'vitest';
import {
  IDENTIFIANTS, MOTS_DE_PASSE, CONFIRMATIONS, IDENTIFIANTS_SAISIS, MOTS_DE_PASSE_SAISIS, COMPTE_VISE,
} from './pairwise/facteurs-compte.js';
import { validerIdentifiant, validerMotDePasse, validerConfirmation, cleIdentifiant } from '../src/regles-compte.js';
import { ErreurValidation } from '../src/comptes.js';
import { nouveauServiceComptes, inscrire, peuplerComptes } from './doublures/contexte-compte.js';

const nommer = (classes) => classes.map((c) => [`${c.id} ${c.libelle}`, c]);

describe("classes de l'identifiant", () => {
  it.each(nommer(IDENTIFIANTS.filter((i) => i.valide)))('valide : %s', (_nom, classe) => {
    expect(validerIdentifiant(classe.valeur)).toBe(classe.attendu);
  });

  it.each(nommer(IDENTIFIANTS.filter((i) => !i.valide)))('invalide : %s', (_nom, classe) => {
    let erreur;
    try { validerIdentifiant(classe.valeur); } catch (e) { erreur = e; }
    expect(erreur).toBeInstanceOf(ErreurValidation);
    expect(erreur.champ).toBe('identifiant');
  });

  it('la clé de comparaison ignore la casse et les espaces autour', () => {
    expect(cleIdentifiant('  Awa.NGONO ')).toBe('awa.ngono');
  });
});

describe('classes du mot de passe', () => {
  it.each(nommer(MOTS_DE_PASSE.filter((m) => m.valide)))('valide : %s', (_nom, classe) => {
    // Le mot de passe est rendu tel quel : jamais nettoyé, jamais transformé
    expect(validerMotDePasse(classe.valeur)).toBe(classe.valeur);
  });

  it.each(nommer(MOTS_DE_PASSE.filter((m) => !m.valide)))('invalide : %s', (_nom, classe) => {
    let erreur;
    try { validerMotDePasse(classe.valeur); } catch (e) { erreur = e; }
    expect(erreur).toBeInstanceOf(ErreurValidation);
    expect(erreur.champ).toBe('motDePasse');
  });

  it('une valeur null est refusée comme une valeur absente', () => {
    expect(() => validerMotDePasse(null)).toThrow('Le mot de passe est obligatoire');
  });
});

describe('classes de la confirmation', () => {
  it.each(nommer(CONFIRMATIONS))('%s', (_nom, classe) => {
    const motDePasse = 'Soleil2026';
    const verifier = () => validerConfirmation(motDePasse, classe.de(motDePasse));
    if (classe.identique) {
      expect(verifier).not.toThrow();
    } else {
      expect(verifier).toThrow('Les deux mots de passe ne sont pas identiques');
    }
  });
});

describe("inscription : une classe à la fois, le reste du formulaire valide", () => {
  it.each(nommer(IDENTIFIANTS))('identifiant %s', async (_nom, classe) => {
    const { comptes } = nouveauServiceComptes();
    const resultat = await inscrire(comptes, classe.valeur, 'Soleil2026').catch((e) => e);
    if (classe.valide) {
      expect(resultat.identifiant).toBe(classe.attendu);
    } else {
      expect(resultat.champ).toBe('identifiant');
    }
  });

  it.each(nommer(MOTS_DE_PASSE))('mot de passe %s', async (_nom, classe) => {
    const { comptes } = nouveauServiceComptes();
    const resultat = await inscrire(comptes, 'awa.ngono', classe.valeur).catch((e) => e);
    if (classe.valide) {
      expect(resultat.identifiant).toBe('awa.ngono');
    } else {
      expect(resultat.champ).toBe('motDePasse');
    }
  });
});

describe('connexion : une classe à la fois, l’autre champ correct', () => {
  it.each(nommer(IDENTIFIANTS_SAISIS))('identifiant saisi %s', async (_nom, classe) => {
    const { comptes } = nouveauServiceComptes();
    const { vise } = await peuplerComptes(comptes, ['vise', 'autre']);
    const resultat = await comptes.connecter({ identifiant: classe.valeur, motDePasse: COMPTE_VISE.motDePasse }).catch((e) => e);
    const attendu = { vise, inconnu: 'connexion', autre: 'connexion', vide: 'identifiant' }[classe.statut];
    expect(classe.statut === 'vise' ? resultat : resultat.champ).toEqual(attendu);
  });

  it.each(nommer(MOTS_DE_PASSE_SAISIS))('mot de passe saisi %s', async (_nom, classe) => {
    const { comptes } = nouveauServiceComptes();
    const { vise } = await peuplerComptes(comptes, ['vise', 'autre']);
    const resultat = await comptes.connecter({ identifiant: COMPTE_VISE.identifiant, motDePasse: classe.valeur }).catch((e) => e);
    const attendu = { correct: vise, incorrect: 'connexion', vide: 'motDePasse' }[classe.statut];
    expect(classe.statut === 'correct' ? resultat : resultat.champ).toEqual(attendu);
  });
});
