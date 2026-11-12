// PAIRWISE sur la modification d'une tâche : chaque champ (titre, échéance, projet)
// est soit absent de la demande, soit pris dans une classe valide ou invalide, et la
// tâche de départ varie (à faire / terminée, avec ou sans échéance).
import { describe, it, expect } from 'vitest';
import { genererPairwise, nommerCas, tailleProduitCartesien } from './pairwise/pairwise.js';
import { FACTEURS_MODIFICATION } from './pairwise/facteurs.js';
import { attenduModification, changementsDe } from './oracles/reference.js';
import { contexteDeuxProjets, peupler, etat, T0, T1 } from './doublures/contexte.js';
import { ErreurValidation } from '../src/service.js';

const CAS = genererPairwise(FACTEURS_MODIFICATION);

describe(`modifier une tâche : ${CAS.length} cas pairwise (au lieu de ${tailleProduitCartesien(FACTEURS_MODIFICATION)})`, () => {
  it.each(CAS.map((c) => [nommerCas(c), c]))('%s', async (_nom, c) => {
    const { service, horloge, projet, autre } = await contexteDeuxProjets();
    const [tache] = await peupler(service, projet.id, [
      { titre: 'Rédiger le chapitre 2', terminee: c.initiale.terminee, echeance: c.initiale.echeance },
    ]);
    const avant = await etat(service);
    horloge.regler(T1);
    const attendu = attenduModification(c, tache, { autreProjetId: autre.id });

    let resultat;
    let erreur = null;
    try {
      resultat = await service.modifierTache(tache.id, changementsDe(c, { projetId: projet.id, autreProjetId: autre.id }));
    } catch (e) {
      erreur = e;
    }

    if (attendu.erreur) {
      expect(erreur, 'refus attendu').toBeInstanceOf(ErreurValidation);
      expect(erreur.champ).toBe(attendu.erreur);
      expect(await etat(service)).toEqual(avant); // la tâche n'a pas bougé
      return;
    }
    expect(erreur, `succès attendu, refus reçu : ${erreur?.message}`).toBeNull();
    expect(resultat).toEqual({ ...attendu.tache, id: tache.id, creeLe: T0, modifieLe: T1 });
    // la tâche est dans son (éventuellement nouveau) projet, et seulement là
    expect(await service.listerTaches(attendu.tache.projetId)).toContainEqual(resultat);
    const ailleurs = attendu.tache.projetId === projet.id ? autre.id : projet.id;
    expect((await service.listerTaches(ailleurs)).map((t) => t.id)).not.toContain(tache.id);
  });
});
