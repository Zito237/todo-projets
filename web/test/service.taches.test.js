import { describe, it, expect, beforeEach } from 'vitest';
import { TodoService, ErreurValidation } from '../src/service.js';
import { DepotMemoire } from './doublures/depot-memoire.js';
import { horlogeFixe, idsSequentiels } from './doublures/fixtures.js';

const MAINTENANT = '2026-11-10T09:00:00.000Z';

describe('Tâches', () => {
  let service;
  let memoire;
  let maison;

  beforeEach(async () => {
    service = new TodoService(new DepotMemoire(), { horloge: horlogeFixe(MAINTENANT), genererId: idsSequentiels() });
    memoire = await service.ajouterProjet('Mémoire Master 2');
    maison = await service.ajouterProjet('Maison');
  });

  describe('ajouter une tâche', () => {
    it('crée une tâche non terminée, rattachée à son projet', async () => {
      const tache = await service.ajouterTache(memoire.id, { titre: 'Rédiger le chapitre 2' });

      expect(tache).toEqual({
        id: 'id-3',
        projetId: memoire.id,
        titre: 'Rédiger le chapitre 2',
        echeance: null,
        terminee: false,
        creeLe: MAINTENANT,
        modifieLe: MAINTENANT,
      });
    });

    it('ne montre une tâche que dans son propre projet', async () => {
      await service.ajouterTache(memoire.id, { titre: 'Rédiger le chapitre 2' });
      await service.ajouterTache(maison.id, { titre: 'Payer la facture ENEO' });

      const titresMemoire = (await service.listerTaches(memoire.id)).map((t) => t.titre);
      const titresMaison = (await service.listerTaches(maison.id)).map((t) => t.titre);
      expect(titresMemoire).toEqual(['Rédiger le chapitre 2']);
      expect(titresMaison).toEqual(['Payer la facture ENEO']);
    });

    it('refuse une tâche dans un projet inexistant', async () => {
      await expect(service.ajouterTache('projet-fantome', { titre: 'X' })).rejects.toThrow('Projet introuvable');
    });

    it.each([
      ['vide', ''],
      ['uniquement des espaces', '    '],
      ['absent', undefined],
    ])('refuse un titre %s', async (_cas, titre) => {
      await expect(service.ajouterTache(memoire.id, { titre })).rejects.toThrow(ErreurValidation);
    });

    // Valeurs limites (séance 4) : la longueur maximale est de 120 caractères
    it('accepte un titre de 120 caractères (borne haute)', async () => {
      const titre = 'a'.repeat(120);
      await expect(service.ajouterTache(memoire.id, { titre })).resolves.toMatchObject({ titre });
    });

    it('refuse un titre de 121 caractères (juste au-dessus de la borne)', async () => {
      await expect(service.ajouterTache(memoire.id, { titre: 'a'.repeat(121) }))
        .rejects.toThrow('Le titre ne doit pas dépasser 120 caractères');
    });

    it('accepte une échéance au format AAAA-MM-JJ', async () => {
      const tache = await service.ajouterTache(memoire.id, { titre: 'Dépôt du mémoire', echeance: '2027-06-30' });
      expect(tache.echeance).toBe('2027-06-30');
    });

    it.each(['30/06/2027', '2027-02-30', '2027-13-01', 'demain'])(
      "refuse l'échéance invalide « %s »",
      async (echeance) => {
        await expect(service.ajouterTache(memoire.id, { titre: 'X', echeance })).rejects.toThrow(ErreurValidation);
      },
    );
  });
});
