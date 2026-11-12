// PAIRWISE sur l'ajout d'une tâche : tous les cas sont GÉNÉRÉS par le pairwise,
// aucun n'est écrit à la main. Trois oracles sont appliqués à chaque cas :
//   1. référence     : le résultat (succès ou champ en erreur) est celui que prédit la spécification ;
//   2. absence d'effet : un refus ne modifie rien (pas d'écriture partielle, cf. never() de la séance 9) ;
//   3. implicite     : toute erreur est une ErreurValidation avec un message, jamais un plantage.
import { describe, it, expect } from 'vitest';
import { genererPairwise, nommerCas, tailleProduitCartesien } from './pairwise/pairwise.js';
import { FACTEURS_AJOUT } from './pairwise/facteurs.js';
import { attenduAjout } from './oracles/reference.js';
import { contexteDeuxProjets, peupler, etat, T0 } from './doublures/contexte.js';
import { ErreurValidation } from '../src/service.js';

const CAS = genererPairwise(FACTEURS_AJOUT);

describe(`ajouter une tâche : ${CAS.length} cas pairwise (au lieu de ${tailleProduitCartesien(FACTEURS_AJOUT)})`, () => {
  it.each(CAS.map((c) => [nommerCas(c), c]))('%s', async (_nom, c) => {
    // Arrange
    const { service, projet } = await contexteDeuxProjets();
    await peupler(service, projet.id, c.contenu.taches);
    const avant = await etat(service);
    const statsAvant = await service.statistiques(projet.id);
    const projetId = c.projet.existe ? projet.id : 'projet-fantome';
    const attendu = attenduAjout(c);

    // Act
    let resultat;
    let erreur = null;
    try {
      resultat = await service.ajouterTache(projetId, { titre: c.titre.valeur, echeance: c.echeance.valeur });
    } catch (e) {
      erreur = e;
    }

    // Assert
    if (attendu.erreur) {
      expect(erreur, 'refus attendu').toBeInstanceOf(ErreurValidation);   // oracle implicite
      expect(erreur.name).toBe('ErreurValidation');
      expect(erreur.message).not.toBe('');
      expect(erreur.champ).toBe(attendu.erreur);                           // oracle de référence
      expect(await etat(service)).toEqual(avant);                          // aucune écriture
      return;
    }
    expect(erreur, `succès attendu, refus reçu : ${erreur?.message}`).toBeNull();
    expect(resultat).toEqual({ ...attendu.tache, id: resultat.id, projetId, creeLe: T0, modifieLe: T0 });
    const taches = await service.listerTaches(projetId);
    expect(taches).toContainEqual(resultat);
    const stats = await service.statistiques(projetId);
    expect(stats.total).toBe(statsAvant.total + 1);
    expect(stats.aFaire).toBe(statsAvant.aFaire + 1);
    expect(stats.terminees).toBe(statsAvant.terminees);
  });
});
