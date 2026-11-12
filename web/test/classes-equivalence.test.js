// CLASSES D'ÉQUIVALENCE (séance 4) : un cas par classe, les autres entrées étant
// prises dans une classe VALIDE. Ainsi, quand un cas échoue, on sait quelle classe
// est en cause (une seule entrée « anormale » à la fois).
// Le résultat attendu vient de l'oracle de référence (la spécification).
import { describe, it, expect } from 'vitest';
import { TITRES, ECHEANCES, PROJETS } from './pairwise/facteurs.js';
import { attenduAjout } from './oracles/reference.js';
import { contexteDeuxProjets } from './doublures/contexte.js';
import { ErreurValidation } from '../src/service.js';

const TITRE_VALIDE = TITRES.find((t) => t.id === 'T1');
const ECHEANCE_VALIDE = ECHEANCES.find((e) => e.id === 'E3');
const PROJET_EXISTANT = PROJETS.find((p) => p.id === 'P1');

const cas = [
  ...TITRES.map((titre) => ({ titre, echeance: ECHEANCE_VALIDE, projet: PROJET_EXISTANT, classe: titre })),
  ...ECHEANCES.map((echeance) => ({ titre: TITRE_VALIDE, echeance, projet: PROJET_EXISTANT, classe: echeance })),
  ...PROJETS.map((projet) => ({ titre: TITRE_VALIDE, echeance: ECHEANCE_VALIDE, projet, classe: projet })),
];

describe('ajouter une tâche : une classe d’équivalence à la fois', () => {
  it.each(cas.map((c) => [`${c.classe.id} ${c.classe.libelle}`, c]))('%s', async (_nom, c) => {
    const { service, projet } = await contexteDeuxProjets();
    const projetId = c.projet.existe ? projet.id : 'projet-fantome';
    const attendu = attenduAjout(c);

    const action = service.ajouterTache(projetId, { titre: c.titre.valeur, echeance: c.echeance.valeur });

    if (attendu.erreur) {
      const erreur = await action.then(() => null, (e) => e);
      expect(erreur).toBeInstanceOf(ErreurValidation);
      expect(erreur.champ).toBe(attendu.erreur);
    } else {
      await expect(action).resolves.toMatchObject(attendu.tache);
    }
  });

  it('les classes couvrent valides et invalides pour chaque entrée', () => {
    for (const valeurs of [TITRES, ECHEANCES]) {
      expect(valeurs.some((v) => v.valide)).toBe(true);
      expect(valeurs.some((v) => !v.valide)).toBe(true);
    }
  });
});
