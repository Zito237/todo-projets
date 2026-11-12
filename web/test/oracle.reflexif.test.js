// ORACLE RÉFLEXIF : appliquer une opération qui ne devrait rien changer, ou
// l'appliquer puis son inverse, doit ramener exactement au point de départ.
// Aucun résultat attendu n'est écrit : on compare le système à LUI-MÊME.
// Les données viennent des cas pairwise VALIDES de l'ajout.
import { describe, it, expect } from 'vitest';
import { genererPairwise, nommerCas } from './pairwise/pairwise.js';
import { FACTEURS_AJOUT } from './pairwise/facteurs.js';
import { attenduAjout } from './oracles/reference.js';
import { contexteDeuxProjets, peupler, etat, T1 } from './doublures/contexte.js';
import { validerTitreTache, validerEcheance } from '../src/regles.js';

const VALIDES = genererPairwise(FACTEURS_AJOUT).filter((c) => !attenduAjout(c).erreur);
const nommes = VALIDES.map((c) => [nommerCas(c), c]);

async function preparer(c) {
  const ctx = await contexteDeuxProjets();
  await peupler(ctx.service, ctx.projet.id, c.contenu.taches);
  const tache = await ctx.service.ajouterTache(ctx.projet.id, { titre: c.titre.valeur, echeance: c.echeance.valeur });
  return { ...ctx, tache };
}

describe(`oracle réflexif sur ${VALIDES.length} cas pairwise valides`, () => {
  it.each(nommes)('R1 modifier avec ses propres valeurs ne change que modifieLe — %s', async (_n, c) => {
    const { service, horloge, tache } = await preparer(c);
    horloge.regler(T1);
    const apres = await service.modifierTache(tache.id, {
      titre: tache.titre, echeance: tache.echeance, projetId: tache.projetId,
    });
    expect(apres).toEqual({ ...tache, modifieLe: T1 });
  });

  it.each(nommes)('R2 cocher puis décocher = état de départ (involution) — %s', async (_n, c) => {
    const { service, tache } = await preparer(c);
    const avant = await etat(service);
    await service.basculerTerminee(tache.id);
    await service.basculerTerminee(tache.id);
    // modifieLe a avancé avec l'horloge ? non : l'horloge est fixe pendant ce test
    expect(await etat(service)).toEqual(avant);
  });

  it.each(nommes)('R3 la validation est idempotente : valider(valider(x)) = valider(x) — %s', (_n, c) => {
    const titre = validerTitreTache(c.titre.valeur);
    expect(validerTitreTache(titre)).toBe(titre);
    const echeance = validerEcheance(c.echeance.valeur);
    expect(validerEcheance(echeance)).toBe(echeance);
  });
});
