// ORACLE PAR HOMOTHÉTIE : l'analogue de g(k·a, k·b, k·c) = g(a, b, c) pour l'équation.
// Si l'on multiplie par k le contenu d'un projet (chaque tâche répétée k fois),
//   - les compteurs total, à faire et terminées sont multipliés par k ;
//   - la progression (un rapport) ne change pas.
// Aucun résultat attendu n'est nécessaire : on compare stats(k·P) à stats(P).
// Les compositions de projet et les facteurs k viennent du pairwise.
import { describe, it, expect } from 'vitest';
import { genererPairwise, nommerCas } from './pairwise/pairwise.js';
import { FACTEURS_COMPOSITION } from './pairwise/facteurs.js';
import { attenduStatistiques } from './oracles/reference.js';
import { contexteDeuxProjets, peupler, composer } from './doublures/contexte.js';
import { TodoService } from '../src/service.js';

const CAS = genererPairwise(FACTEURS_COMPOSITION);
const nommes = CAS.map((c) => [nommerCas(c), c]);

/** Répète chaque tâche k fois, en gardant l'ordre. */
const multiplier = (taches, k) => taches.flatMap((t) => Array.from({ length: k }, (_, i) => ({ ...t, titre: `${t.titre} #${i + 1}` })));

/** Écarts à la relation d'homothétie (liste vide = relation respectée). */
async function violationsHomothetie(service, c) {
  const p = await service.ajouterProjet('P');
  const kp = await service.ajouterProjet('k·P');
  const taches = composer(c.aFaire.n, c.terminees.n, c.ordre.id);
  await peupler(service, p.id, taches);
  await peupler(service, kp.id, multiplier(taches, c.k.k));
  const s = await service.statistiques(p.id);
  const ks = await service.statistiques(kp.id);
  const k = c.k.k;
  const v = [];
  for (const champ of ['total', 'aFaire', 'terminees']) {
    if (ks[champ] !== k * s[champ]) v.push(`${champ} : ${ks[champ]} ≠ ${k} × ${s[champ]}`);
  }
  if (ks.progression !== s.progression) v.push(`progression : ${ks.progression} ≠ ${s.progression}`);
  return { violations: v, s };
}

describe(`oracle par homothétie sur ${CAS.length} cas pairwise`, () => {
  it.each(nommes)('stats(k·P) = k·stats(P), progression inchangée — %s', async (_n, c) => {
    const { service } = await contexteDeuxProjets();
    const { violations } = await violationsHomothetie(service, c);
    expect(violations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Deux mutants pour juger l'oracle, comme le cas (1, 1e8, 1) de l'équation.
// ---------------------------------------------------------------------------

/** Mutant 1 : progression calculée sur les tâches À FAIRE au lieu des terminées. */
class MutantProgressionInversee extends TodoService {
  async statistiques(projetId) {
    const s = await super.statistiques(projetId);
    return { ...s, progression: s.total === 0 ? 0 : Math.round((100 * s.aFaire) / s.total) };
  }
}

/** Mutant 2 : les statistiques ne lisent que les 10 premières tâches (bogue de « pagination »). */
class MutantDixPremieres extends TodoService {
  async statistiques(projetId) {
    const taches = (await this.depot.listerTaches(projetId)).slice(0, 10);
    const terminees = taches.filter((t) => t.terminee).length;
    const total = taches.length;
    return { total, aFaire: total - terminees, terminees, progression: total ? Math.round((100 * terminees) / total) : 0 };
  }
}

async function bilan(Classe) {
  let vusParHomothetie = 0;
  let vusParReference = 0;
  for (const c of CAS) {
    const { service: base } = await contexteDeuxProjets();
    const service = Object.setPrototypeOf(base, Classe.prototype); // même dépôt, même horloge, code muté
    const { violations, s } = await violationsHomothetie(service, c);
    if (violations.length) vusParHomothetie++;
    const attendu = attenduStatistiques(c.aFaire.n, c.terminees.n);
    if (JSON.stringify(s) !== JSON.stringify(attendu)) vusParReference++;
  }
  return { vusParHomothetie, vusParReference };
}

describe('pouvoir de détection de l’oracle par homothétie', () => {
  it('CAS NON INTÉRESSANT : la progression inversée respecte l’homothétie, l’oracle ne voit rien', async () => {
    const { vusParHomothetie, vusParReference } = await bilan(MutantProgressionInversee);
    // L'erreur est elle-même homothétique : (k·aFaire)/(k·total) = aFaire/total.
    expect(vusParHomothetie).toBe(0);
    // L'oracle de référence, lui, la voit dès qu'il y a des tâches à faire ≠ terminées.
    expect(vusParReference).toBeGreaterThan(0);
  });

  it('CAS INTÉRESSANT : la limite aux 10 premières tâches casse l’homothétie, l’oracle la voit', async () => {
    const { vusParHomothetie } = await bilan(MutantDixPremieres);
    expect(vusParHomothetie).toBeGreaterThan(0);
  });
});
