// Mise en place commune aux tests pairwise et aux oracles (partie « Arrange »).
import { TodoService } from '../../src/service.js';
import { DepotMemoire } from './depot-memoire.js';
import { horlogeReglable, idsSequentiels } from './fixtures.js';

export const T0 = '2026-11-10T09:00:00.000Z';
export const T1 = '2026-11-12T18:30:00.000Z';

/** Service neuf avec deux projets : « Mémoire Master 2 » (visé) et « Maison » (l'autre). */
export async function contexteDeuxProjets(depot = new DepotMemoire()) {
  const horloge = horlogeReglable(T0);
  const service = new TodoService(depot, { horloge, genererId: idsSequentiels() });
  const projet = await service.ajouterProjet('Mémoire Master 2');
  const autre = await service.ajouterProjet('Maison');
  return { service, horloge, depot, projet, autre };
}

/** Ajoute des tâches dans un projet, en terminant celles marquées terminee: true. */
export async function peupler(service, projetId, taches) {
  const creees = [];
  for (const { titre, terminee, echeance = null } of taches) {
    let t = await service.ajouterTache(projetId, { titre, echeance });
    if (terminee) t = await service.basculerTerminee(t.id);
    creees.push(t);
  }
  return creees;
}

/** Photographie complète et ordonnée de l'état observable (pour vérifier « rien n'a changé »). */
export async function etat(service) {
  const projets = await service.listerProjets();
  return Promise.all(projets.map(async (p) => ({ projet: p, taches: await service.listerTaches(p.id) })));
}

/** Liste de tâches d'un projet, dans l'ordre demandé par le facteur « ordre ». */
export function composer(nbAFaire, nbTerminees, ordre, prefixe = 'Tâche') {
  const aFaire = Array.from({ length: nbAFaire }, (_, i) => ({ titre: `${prefixe} à faire ${i + 1}`, terminee: false }));
  const finies = Array.from({ length: nbTerminees }, (_, i) => ({ titre: `${prefixe} terminée ${i + 1}`, terminee: true }));
  if (ordre === 'O1') return [...aFaire, ...finies];
  if (ordre === 'O2') return [...finies, ...aFaire];
  const alternees = [];
  for (let i = 0; i < Math.max(nbAFaire, nbTerminees); i++) {
    if (i < nbAFaire) alternees.push(aFaire[i]);
    if (i < nbTerminees) alternees.push(finies[i]);
  }
  return alternees;
}
