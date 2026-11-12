// Test de CONTRAT : la même batterie est jouée sur le fake (DepotMemoire) et sur le
// vrai dépôt (DepotIndexedDB). Si le fake divergeait du vrai, les tests unitaires
// qui s'appuient sur lui deviendraient mensongers.
// Niveau : intégration de composants (le dépôt + l'API IndexedDB). En Node, l'API
// IndexedDB est fournie par fake-indexeddb, une implémentation conforme en mémoire.
import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { DepotIndexedDB } from '../src/depot-indexeddb.js';
import { DepotMemoire } from './doublures/depot-memoire.js';

const projet = (id, nom) => ({ id, nom, creeLe: '2026-11-10T09:00:00.000Z' });
const tache = (id, projetId, titre) => ({
  id, projetId, titre, echeance: null, terminee: false,
  creeLe: '2026-11-10T09:00:00.000Z', modifieLe: '2026-11-10T09:00:00.000Z',
});

const implementations = {
  DepotMemoire: async () => new DepotMemoire(),
  DepotIndexedDB: async () => DepotIndexedDB.ouvrir(new IDBFactory(), 'todo-test'),
};

for (const [nom, fabriquer] of Object.entries(implementations)) {
  describe(`contrat du dépôt : ${nom}`, () => {
    let depot;
    beforeEach(async () => { depot = await fabriquer(); });

    it('sauve puis retrouve un projet', async () => {
      await depot.sauverProjet(projet('p1', 'Maison'));
      expect(await depot.trouverProjet('p1')).toEqual(projet('p1', 'Maison'));
      expect(await depot.listerProjets()).toEqual([projet('p1', 'Maison')]);
    });

    it('renvoie null pour un projet ou une tâche inconnus', async () => {
      expect(await depot.trouverProjet('inconnu')).toBeNull();
      expect(await depot.trouverTache('inconnue')).toBeNull();
    });

    it('ne liste que les tâches du projet demandé', async () => {
      await depot.sauverTache(tache('t1', 'p1', 'A'));
      await depot.sauverTache(tache('t2', 'p2', 'B'));
      expect((await depot.listerTaches('p1')).map((t) => t.id)).toEqual(['t1']);
    });

    it('remplace une tâche sauvée deux fois (mise à jour, pas doublon)', async () => {
      await depot.sauverTache(tache('t1', 'p1', 'Avant'));
      await depot.sauverTache({ ...tache('t1', 'p1', 'Après'), terminee: true });
      const taches = await depot.listerTaches('p1');
      expect(taches).toHaveLength(1);
      expect(taches[0]).toMatchObject({ titre: 'Après', terminee: true });
    });

    it('supprime un projet et toutes ses tâches, sans toucher aux autres projets', async () => {
      await depot.sauverProjet(projet('p1', 'Maison'));
      await depot.sauverProjet(projet('p2', 'Mémoire'));
      await depot.sauverTache(tache('t1', 'p1', 'A'));
      await depot.sauverTache(tache('t2', 'p1', 'B'));
      await depot.sauverTache(tache('t3', 'p2', 'C'));

      await depot.supprimerProjet('p1');

      expect(await depot.trouverProjet('p1')).toBeNull();
      expect(await depot.listerProjets()).toEqual([projet('p2', 'Mémoire')]);
      expect(await depot.listerTaches('p1')).toEqual([]);
      expect(await depot.trouverTache('t1')).toBeNull();
      expect(await depot.trouverTache('t2')).toBeNull();
      expect((await depot.listerTaches('p2')).map((t) => t.id)).toEqual(['t3']);
    });

    it('supprimer un projet inconnu ne change rien', async () => {
      await depot.sauverProjet(projet('p1', 'Maison'));
      await depot.sauverTache(tache('t1', 'p1', 'A'));

      await depot.supprimerProjet('inconnu');

      expect(await depot.listerProjets()).toEqual([projet('p1', 'Maison')]);
      expect((await depot.listerTaches('p1')).map((t) => t.id)).toEqual(['t1']);
    });

    it('renvoie des copies : modifier un objet lu ne modifie pas le stockage', async () => {
      await depot.sauverTache(tache('t1', 'p1', 'Original'));
      const lue = await depot.trouverTache('t1');
      lue.titre = 'Altéré';
      expect((await depot.trouverTache('t1')).titre).toBe('Original');
    });
  });
}

describe('persistance IndexedDB', () => {
  it('retrouve les données après réouverture de la base (= rechargement de la page)', async () => {
    const fabrique = new IDBFactory();
    const premier = await DepotIndexedDB.ouvrir(fabrique, 'todo-persist');
    await premier.sauverProjet(projet('p1', 'Mémoire'));
    await premier.sauverTache(tache('t1', 'p1', 'Chapitre 1'));
    premier.fermer();

    const second = await DepotIndexedDB.ouvrir(fabrique, 'todo-persist');
    expect(await second.listerProjets()).toEqual([projet('p1', 'Mémoire')]);
    expect((await second.listerTaches('p1')).map((t) => t.titre)).toEqual(['Chapitre 1']);
  });

  it('une suppression reste effective après réouverture de la base', async () => {
    const fabrique = new IDBFactory();
    const premier = await DepotIndexedDB.ouvrir(fabrique, 'todo-suppr');
    await premier.sauverProjet(projet('p1', 'Mémoire'));
    await premier.sauverTache(tache('t1', 'p1', 'Chapitre 1'));
    await premier.supprimerProjet('p1');
    premier.fermer();

    const second = await DepotIndexedDB.ouvrir(fabrique, 'todo-suppr');
    expect(await second.listerProjets()).toEqual([]);
    expect(await second.trouverTache('t1')).toBeNull();
  });
});
