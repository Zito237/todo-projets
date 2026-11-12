// ORACLE DIFFÉRENTIEL : la même suite d'opérations est jouée sur deux implémentations
// du dépôt, le fake DepotMemoire et le vrai DepotIndexedDB (API IndexedDB fournie
// en Node par fake-indexeddb). Les états observables doivent être identiques, et une
// opération refusée doit l'être de la même façon des deux côtés.
// Les opérations viennent des cas pairwise de la modification.
import { describe, it, expect } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { genererPairwise, nommerCas } from './pairwise/pairwise.js';
import { FACTEURS_MODIFICATION } from './pairwise/facteurs.js';
import { changementsDe } from './oracles/reference.js';
import { contexteDeuxProjets, peupler, etat, T1 } from './doublures/contexte.js';
import { DepotMemoire } from './doublures/depot-memoire.js';
import { DepotIndexedDB } from '../src/depot-indexeddb.js';

const CAS = genererPairwise(FACTEURS_MODIFICATION);
let numeroBase = 0;

async function jouer(depot, c) {
  const { service, horloge, projet, autre } = await contexteDeuxProjets(depot);
  const [tache] = await peupler(service, projet.id, [
    { titre: 'Rédiger le chapitre 2', terminee: c.initiale.terminee, echeance: c.initiale.echeance },
    { titre: 'Relire la bibliographie', terminee: !c.initiale.terminee },
  ]);
  horloge.regler(T1);
  let refus = null;
  try {
    await service.modifierTache(tache.id, changementsDe(c, { projetId: projet.id, autreProjetId: autre.id }));
    await service.basculerTerminee(tache.id);
  } catch (e) {
    refus = { type: e.name, champ: e.champ, message: e.message };
  }
  const stats = await Promise.all([projet, autre].map((p) => service.statistiques(p.id)));
  return { refus, etat: await etat(service), stats };
}

describe(`oracle différentiel fake ↔ IndexedDB sur ${CAS.length} cas pairwise`, () => {
  it.each(CAS.map((c) => [nommerCas(c), c]))('%s', async (_n, c) => {
    const memoire = await jouer(new DepotMemoire(), c);
    const indexeddb = await jouer(await DepotIndexedDB.ouvrir(new IDBFactory(), `diff-${++numeroBase}`), c);
    expect(indexeddb).toEqual(memoire);
  });

  it('RÉFLEXIF : les données relues après réouverture de la base sont celles écrites', async () => {
    const fabrique = new IDBFactory();
    const premier = await DepotIndexedDB.ouvrir(fabrique, 'reouverture');
    const { service } = await contexteDeuxProjets(premier);
    for (const c of CAS) {
      const p = await service.ajouterProjet(nommerCas(c));
      await peupler(service, p.id, [{ titre: 'Tâche', terminee: c.initiale.terminee, echeance: c.initiale.echeance }]);
    }
    const ecrit = await etat(service);
    premier.fermer();

    const second = await DepotIndexedDB.ouvrir(fabrique, 'reouverture'); // comme un rechargement de page
    const { TodoService } = await import('../src/service.js');
    expect(await etat(new TodoService(second))).toEqual(ecrit);
  });
});
