import { describe, it, expect, beforeEach } from 'vitest';
import { TodoService } from '../src/service.js';
import { DepotMemoire } from './doublures/depot-memoire.js';
import { horlogeFixe, idsSequentiels } from './doublures/fixtures.js';

// Statistiques d'un projet : ce que l'interface affiche dans le compteur
// « x à faire sur y ». Elles servent aussi d'observable aux oracles
// par homothétie et métamorphiques (web/test/oracles.*.test.js).
describe('Statistiques d’un projet', () => {
  let service;
  let projet;

  beforeEach(async () => {
    service = new TodoService(new DepotMemoire(), { horloge: horlogeFixe(), genererId: idsSequentiels() });
    projet = await service.ajouterProjet('Cours INF563');
  });

  it('un projet vide : 0 tâche et progression 0 % (pas de division par zéro)', async () => {
    expect(await service.statistiques(projet.id)).toEqual({ total: 0, aFaire: 0, terminees: 0, progression: 0 });
  });

  it('compte les tâches à faire et terminées', async () => {
    const a = await service.ajouterTache(projet.id, { titre: 'Devoir BDD' });
    await service.ajouterTache(projet.id, { titre: 'Réviser la séance 10' });
    await service.ajouterTache(projet.id, { titre: 'Lire la séance 11' });
    await service.basculerTerminee(a.id);

    expect(await service.statistiques(projet.id)).toEqual({ total: 3, aFaire: 2, terminees: 1, progression: 33 });
  });

  it('progression arrondie à l’entier le plus proche : 2 sur 3 donne 67 %', async () => {
    const a = await service.ajouterTache(projet.id, { titre: 'A' });
    const b = await service.ajouterTache(projet.id, { titre: 'B' });
    await service.ajouterTache(projet.id, { titre: 'C' });
    await service.basculerTerminee(a.id);
    await service.basculerTerminee(b.id);

    expect((await service.statistiques(projet.id)).progression).toBe(67);
  });

  it('toutes terminées : 100 %', async () => {
    const a = await service.ajouterTache(projet.id, { titre: 'A' });
    await service.basculerTerminee(a.id);
    expect((await service.statistiques(projet.id)).progression).toBe(100);
  });

  it('refuse un projet inexistant', async () => {
    await expect(service.statistiques('projet-fantome')).rejects.toThrow('Projet introuvable');
  });
});
