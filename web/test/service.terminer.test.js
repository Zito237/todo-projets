import { describe, it, expect, beforeEach } from 'vitest';
import { TodoService } from '../src/service.js';
import { DepotMemoire } from './doublures/depot-memoire.js';
import { horlogeReglable, idsSequentiels } from './doublures/fixtures.js';

describe('terminer une tâche et ordre d\'affichage', () => {
  let service;
  let horloge;
  let projet;

  beforeEach(async () => {
    horloge = horlogeReglable('2026-11-10T08:00:00.000Z');
    service = new TodoService(new DepotMemoire(), { horloge, genererId: idsSequentiels() });
    projet = await service.ajouterProjet('Cours INF563');
  });

  it('marque une tâche terminée puis la rouvre', async () => {
    const tache = await service.ajouterTache(projet.id, { titre: 'Devoir BDD' });

    expect((await service.basculerTerminee(tache.id)).terminee).toBe(true);
    expect((await service.basculerTerminee(tache.id)).terminee).toBe(false);
  });

  it('refuse de terminer une tâche inexistante', async () => {
    await expect(service.basculerTerminee('tache-fantome')).rejects.toThrow('Tâche introuvable');
  });

  it('liste les tâches à faire avant les terminées, puis par ordre de création', async () => {
    const t1 = await service.ajouterTache(projet.id, { titre: 'Première' });
    horloge.regler('2026-11-10T09:00:00.000Z');
    await service.ajouterTache(projet.id, { titre: 'Deuxième' });
    horloge.regler('2026-11-10T10:00:00.000Z');
    await service.ajouterTache(projet.id, { titre: 'Troisième' });

    await service.basculerTerminee(t1.id);

    const titres = (await service.listerTaches(projet.id)).map((t) => t.titre);
    expect(titres).toEqual(['Deuxième', 'Troisième', 'Première']);
  });
});
