import { describe, it, expect, beforeEach } from 'vitest';
import { TodoService, ErreurValidation } from '../src/service.js';
import { DepotMemoire } from './doublures/depot-memoire.js';
import { horlogeFixe, idsSequentiels } from './doublures/fixtures.js';

describe('Projets', () => {
  let service;

  beforeEach(() => {
    // Arrange commun : un service neuf par test (isolement)
    service = new TodoService(new DepotMemoire(), { horloge: horlogeFixe(), genererId: idsSequentiels('p') });
  });

  it('crée un projet avec un nom', async () => {
    const projet = await service.ajouterProjet('Mémoire Master 2');

    expect(projet).toEqual({ id: 'p-1', nom: 'Mémoire Master 2', creeLe: '2026-11-10T09:00:00.000Z' });
    expect(await service.listerProjets()).toEqual([projet]);
  });

  it('refuse un projet sans nom', async () => {
    await expect(service.ajouterProjet('')).rejects.toThrow(ErreurValidation);
  });
});
