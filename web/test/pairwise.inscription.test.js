// PAIRWISE sur la création de compte : tous les cas sont GÉNÉRÉS, aucun n'est écrit
// à la main. Quatre oracles sont appliqués à chaque cas :
//   1. référence       : succès ou champ en erreur prédits par la spécification ;
//   2. absence d'effet : un refus n'enregistre rien ;
//   3. implicite       : toute erreur est une ErreurValidation avec un message ;
//   4. aller-retour    : un compte créé permet de se connecter avec les mêmes données.
import { describe, it, expect } from 'vitest';
import { nommerCas, tailleProduitCartesien } from './pairwise/pairwise.js';
import { FACTEURS_INSCRIPTION } from './pairwise/facteurs-compte.js';
import { attenduInscription } from './oracles/reference-compte.js';
import { nouveauServiceComptes, etatComptes, CAS_INSCRIPTION, preparerEtat, saisieDe } from './doublures/contexte-compte.js';
import { ErreurValidation } from '../src/comptes.js';

describe(`créer un compte : ${CAS_INSCRIPTION.length} cas pairwise (au lieu de ${tailleProduitCartesien(FACTEURS_INSCRIPTION)})`, () => {
  it.each(CAS_INSCRIPTION.map((c) => [nommerCas(c), c]))('%s', async (_nom, c) => {
    // Arrange
    const { comptes, depot } = nouveauServiceComptes();
    await preparerEtat(comptes, c);
    const avant = await etatComptes(depot);
    const attendu = attenduInscription(c);

    // Act
    let resultat;
    let erreur = null;
    try {
      resultat = await comptes.creerCompte(saisieDe(c));
    } catch (e) {
      erreur = e;
    }

    // Assert
    if (attendu.erreur) {
      expect(erreur, 'refus attendu').toBeInstanceOf(ErreurValidation);   // oracle implicite
      expect(erreur.name).toBe('ErreurValidation');
      expect(erreur.message).not.toBe('');
      expect(erreur.champ).toBe(attendu.erreur);                           // oracle de référence
      if (attendu.message) expect(erreur.message).toBe(attendu.message);
      expect(await etatComptes(depot)).toEqual(avant);                     // aucune écriture
      return;
    }
    expect(erreur, `succès attendu, refus reçu : ${erreur?.message}`).toBeNull();
    expect(resultat).toEqual({ id: resultat.id, identifiant: attendu.compte.identifiant, creeLe: '2026-11-10T09:00:00.000Z' });
    expect(await etatComptes(depot)).toHaveLength(avant.length + 1);       // un compte de plus, un seul
    expect(avant.map((x) => x.id)).not.toContain(resultat.id);
    // aller-retour : ce qu'on vient de créer permet de se connecter
    expect(await comptes.connecter({ identifiant: c.identifiant.valeur, motDePasse: c.motDePasse.valeur })).toEqual(resultat);
  });
});
