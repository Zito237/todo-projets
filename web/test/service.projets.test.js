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

  it.each([
    ['vide', ''],
    ['uniquement des espaces', '   '],
  ])('refuse un projet au nom %s', async (_cas, nom) => {
    await expect(service.ajouterProjet(nom)).rejects.toThrow(ErreurValidation);
  });

  it('retire les espaces autour du nom', async () => {
    const projet = await service.ajouterProjet('  Cours INF563  ');
    expect(projet.nom).toBe('Cours INF563');
  });

  it('refuse deux projets du même nom, sans tenir compte de la casse ni des espaces', async () => {
    await service.ajouterProjet('Maison');
    await expect(service.ajouterProjet(' maison ')).rejects.toThrow('Un projet porte déjà ce nom');
  });

  it('liste les projets par ordre alphabétique', async () => {
    await service.ajouterProjet('Travail');
    await service.ajouterProjet('école');
    await service.ajouterProjet('Maison');
    const noms = (await service.listerProjets()).map((p) => p.nom);
    expect(noms).toEqual(['école', 'Maison', 'Travail']);
  });
});
