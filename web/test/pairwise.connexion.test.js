// PAIRWISE sur la connexion : cas générés, oracle de référence, absence d'effet,
// oracle implicite. Le compte visé est toujours « Awa.Ngono » / « Soleil2026 ».
import { describe, it, expect } from 'vitest';
import { nommerCas, tailleProduitCartesien } from './pairwise/pairwise.js';
import { FACTEURS_CONNEXION } from './pairwise/facteurs-compte.js';
import { attenduConnexion } from './oracles/reference-compte.js';
import { nouveauServiceComptes, peuplerComptes, etatComptes, CAS_CONNEXION } from './doublures/contexte-compte.js';
import { ErreurValidation } from '../src/comptes.js';

describe(`se connecter : ${CAS_CONNEXION.length} cas pairwise (au lieu de ${tailleProduitCartesien(FACTEURS_CONNEXION)})`, () => {
  it.each(CAS_CONNEXION.map((c) => [nommerCas(c), c]))('%s', async (_nom, c) => {
    // Arrange
    const { comptes, depot } = nouveauServiceComptes();
    const crees = await peuplerComptes(comptes, c.etat.ordre);
    const avant = await etatComptes(depot);
    const attendu = attenduConnexion(c);

    // Act
    let resultat;
    let erreur = null;
    try {
      resultat = await comptes.connecter({ identifiant: c.identifiant.valeur, motDePasse: c.motDePasse.valeur });
    } catch (e) {
      erreur = e;
    }

    // Assert
    expect(await etatComptes(depot)).toEqual(avant);                       // se connecter n'écrit jamais rien
    if (attendu.erreur) {
      expect(erreur, 'refus attendu').toBeInstanceOf(ErreurValidation);   // oracle implicite
      expect(erreur.message).not.toBe('');
      expect(erreur.champ).toBe(attendu.erreur);                           // oracle de référence
      if (attendu.message) expect(erreur.message).toBe(attendu.message);
      return;
    }
    expect(erreur, `succès attendu, refus reçu : ${erreur?.message}`).toBeNull();
    expect(resultat).toEqual(crees[attendu.compte]);                                // le bon compte, pas un autre
  });
});
