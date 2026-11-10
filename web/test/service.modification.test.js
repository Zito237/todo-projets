import { describe, it, expect, beforeEach } from 'vitest';
import { TodoService, ErreurValidation } from '../src/service.js';
import { DepotMemoire } from './doublures/depot-memoire.js';
import { horlogeReglable, idsSequentiels } from './doublures/fixtures.js';

describe('modifier une tâche', () => {
  let service;
  let horloge;
  let memoire;
  let maison;
  let tache;

  beforeEach(async () => {
    horloge = horlogeReglable('2026-11-10T09:00:00.000Z');
    service = new TodoService(new DepotMemoire(), { horloge, genererId: idsSequentiels() });
    memoire = await service.ajouterProjet('Mémoire Master 2');
    maison = await service.ajouterProjet('Maison');
    tache = await service.ajouterTache(memoire.id, { titre: 'Rédiger le chapitre 2', echeance: '2026-12-01' });
    horloge.regler('2026-11-11T15:30:00.000Z'); // la modification a lieu le lendemain
  });

  it('change le titre et date la modification, sans toucher à la date de création', async () => {
    const modifiee = await service.modifierTache(tache.id, { titre: 'Rédiger le chapitre 3' });

    expect(modifiee.titre).toBe('Rédiger le chapitre 3');
    expect(modifiee.creeLe).toBe('2026-11-10T09:00:00.000Z');
    expect(modifiee.modifieLe).toBe('2026-11-11T15:30:00.000Z');
  });

  it('enregistre la modification dans le dépôt', async () => {
    await service.modifierTache(tache.id, { titre: 'Rédiger le chapitre 3' });

    const [relue] = await service.listerTaches(memoire.id);
    expect(relue.titre).toBe('Rédiger le chapitre 3');
  });

  it('laisse inchangés les champs non fournis', async () => {
    const modifiee = await service.modifierTache(tache.id, { titre: 'Nouveau titre' });
    expect(modifiee.echeance).toBe('2026-12-01');
    expect(modifiee.projetId).toBe(memoire.id);
  });

  it("modifie ou retire l'échéance", async () => {
    expect((await service.modifierTache(tache.id, { echeance: '2026-12-15' })).echeance).toBe('2026-12-15');
    expect((await service.modifierTache(tache.id, { echeance: null })).echeance).toBeNull();
  });

  it('déplace la tâche vers un autre projet', async () => {
    await service.modifierTache(tache.id, { projetId: maison.id });

    expect(await service.listerTaches(memoire.id)).toEqual([]);
    expect((await service.listerTaches(maison.id)).map((t) => t.titre)).toEqual(['Rédiger le chapitre 2']);
  });

  it('refuse de déplacer la tâche vers un projet inexistant', async () => {
    await expect(service.modifierTache(tache.id, { projetId: 'projet-fantome' })).rejects.toThrow('Projet introuvable');
  });

  it('applique les mêmes règles de titre que la création', async () => {
    await expect(service.modifierTache(tache.id, { titre: '   ' })).rejects.toThrow(ErreurValidation);
    await expect(service.modifierTache(tache.id, { titre: 'a'.repeat(121) })).rejects.toThrow(ErreurValidation);
  });

  it("n'enregistre rien si la modification est refusée", async () => {
    await expect(service.modifierTache(tache.id, { titre: '' })).rejects.toThrow();

    const [relue] = await service.listerTaches(memoire.id);
    expect(relue).toEqual(tache);
  });

  it('refuse de modifier une tâche inexistante', async () => {
    await expect(service.modifierTache('tache-fantome', { titre: 'X' })).rejects.toThrow('Tâche introuvable');
  });
});
