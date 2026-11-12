// ORACLES MÉTAMORPHIQUES : on transforme l'entrée d'une façon dont on connaît
// l'effet sur la sortie, et on vérifie la RELATION entre les deux exécutions.
// Les compositions de projet viennent du pairwise (facteurs aFaire, terminees, k, ordre).
import { describe, it, expect } from 'vitest';
import { genererPairwise, nommerCas } from './pairwise/pairwise.js';
import { FACTEURS_COMPOSITION } from './pairwise/facteurs.js';
import { contexteDeuxProjets, peupler, composer } from './doublures/contexte.js';

const CAS = genererPairwise(FACTEURS_COMPOSITION);
const nommes = CAS.map((c) => [nommerCas(c), c]);
const titresTries = (taches) => taches.map((t) => t.titre).sort();
const somme = (a, b) => ({ total: a.total + b.total, aFaire: a.aFaire + b.aFaire, terminees: a.terminees + b.terminees });

describe(`oracles métamorphiques sur ${CAS.length} cas pairwise`, () => {
  it.each(nommes)('MR1 permuter l’ordre de saisie ne change ni l’ensemble des tâches ni les stats — %s', async (_n, c) => {
    const { service } = await contexteDeuxProjets();
    const executions = [];
    for (const ordre of ['O1', 'O2', 'O3']) {
      const p = await service.ajouterProjet(`Ordre ${ordre}`);
      await peupler(service, p.id, composer(c.aFaire.n, c.terminees.n, ordre));
      executions.push({ titres: titresTries(await service.listerTaches(p.id)), stats: await service.statistiques(p.id) });
    }
    expect(executions[1]).toEqual(executions[0]);
    expect(executions[2]).toEqual(executions[0]);
  });

  it.each(nommes)('MR2 déplacer une tâche vers un autre projet conserve le total (invariant de conservation) — %s', async (_n, c) => {
    const { service, projet, autre } = await contexteDeuxProjets();
    const taches = await peupler(service, projet.id, composer(c.aFaire.n, c.terminees.n, c.ordre.id));
    await peupler(service, autre.id, composer(1, 1, 'O1', 'Maison'));
    if (taches.length === 0) return; // rien à déplacer : relation sans objet
    const deplacee = taches[(c.k.k - 1) % taches.length]; // choix déterministe guidé par le cas
    const [a0, b0] = [await service.statistiques(projet.id), await service.statistiques(autre.id)];

    await service.modifierTache(deplacee.id, { projetId: autre.id });

    const [a1, b1] = [await service.statistiques(projet.id), await service.statistiques(autre.id)];
    expect(a1.total).toBe(a0.total - 1);
    expect(b1.total).toBe(b0.total + 1);
    expect(somme(a1, b1)).toEqual(somme(a0, b0));            // rien ne se crée, rien ne se perd
    const champ = deplacee.terminee ? 'terminees' : 'aFaire';   // le statut voyage avec la tâche
    expect(b1[champ]).toBe(b0[champ] + 1);
  });

  it.each(nommes)('MR3 partition : stats(P ∪ Q) = stats(P) + stats(Q) — %s', async (_n, c) => {
    const { service, projet, autre } = await contexteDeuxProjets();
    const p = composer(c.aFaire.n, c.terminees.n, c.ordre.id, 'P');
    const q = composer(c.terminees.n, c.k.k, c.ordre.id, 'Q'); // une seconde composition, dérivée du même cas
    await peupler(service, projet.id, p);
    await peupler(service, autre.id, q);
    const union = await service.ajouterProjet('Union');
    await peupler(service, union.id, [...p, ...q]);

    const attendu = somme(await service.statistiques(projet.id), await service.statistiques(autre.id));
    const { total, aFaire, terminees } = await service.statistiques(union.id);
    expect({ total, aFaire, terminees }).toEqual(attendu);
  });

  it.each(nommes)('MR4 renommer toutes les tâches ne change pas les statistiques — %s', async (_n, c) => {
    const { service, projet } = await contexteDeuxProjets();
    const taches = await peupler(service, projet.id, composer(c.aFaire.n, c.terminees.n, c.ordre.id));
    const avant = await service.statistiques(projet.id);
    for (const t of taches) await service.modifierTache(t.id, { titre: `${t.titre} (renommée)` });
    expect(await service.statistiques(projet.id)).toEqual(avant);
  });

  it.each(nommes)('MR5 tout cocher puis tout décocher redonne les mêmes stats ; tout cocher donne 100 % — %s', async (_n, c) => {
    const { service, projet } = await contexteDeuxProjets();
    const taches = await peupler(service, projet.id, composer(c.aFaire.n, c.terminees.n, c.ordre.id));
    const avant = await service.statistiques(projet.id);
    const aCocher = taches.filter((t) => !t.terminee);
    for (const t of aCocher) await service.basculerTerminee(t.id);
    const toutes = await service.statistiques(projet.id);
    expect(toutes.aFaire).toBe(0);
    expect(toutes.progression).toBe(taches.length ? 100 : 0);
    for (const t of aCocher) await service.basculerTerminee(t.id);
    expect(await service.statistiques(projet.id)).toEqual(avant);
  });
});
