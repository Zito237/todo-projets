import { describe, it, expect, beforeEach } from 'vitest';
import { TodoService, ErreurValidation } from '../src/service.js';
import { DepotMemoire } from './doublures/depot-memoire.js';
import { horlogeFixe, idsSequentiels } from './doublures/fixtures.js';

describe("Suppression d'un projet", () => {
  let service;
  let maison;
  let memoire;

  beforeEach(async () => {
    // Arrange commun : deux projets, pour vérifier que l'autre n'est jamais touché
    service = new TodoService(new DepotMemoire(), { horloge: horlogeFixe(), genererId: idsSequentiels() });
    maison = await service.ajouterProjet('Maison');
    memoire = await service.ajouterProjet('Mémoire Master 2');
  });

  it('retire le projet de la liste', async () => {
    await service.supprimerProjet(maison.id);

    expect(await service.listerProjets()).toEqual([memoire]);
  });

  it('supprime aussi les tâches du projet (pas de tâche orpheline)', async () => {
    const aFaire = await service.ajouterTache(maison.id, { titre: 'Arroser les plantes' });
    const terminee = await service.basculerTerminee((await service.ajouterTache(maison.id, { titre: 'Ranger' })).id);

    await service.supprimerProjet(maison.id);

    await expect(service.modifierTache(aFaire.id, { titre: 'Autre' })).rejects.toThrow('Tâche introuvable');
    await expect(service.basculerTerminee(terminee.id)).rejects.toThrow('Tâche introuvable');
  });

  it("ne touche ni aux autres projets ni à leurs tâches", async () => {
    await service.ajouterTache(maison.id, { titre: 'Arroser les plantes' });
    const gardee = await service.ajouterTache(memoire.id, { titre: 'Rédiger le chapitre 2' });

    await service.supprimerProjet(maison.id);

    expect(await service.listerTaches(memoire.id)).toEqual([gardee]);
    expect(await service.statistiques(memoire.id)).toMatchObject({ total: 1, aFaire: 1 });
  });

  it('refuse de supprimer un projet inexistant, sans rien changer', async () => {
    const erreur = await service.supprimerProjet('inconnu').catch((e) => e);

    expect(erreur).toBeInstanceOf(ErreurValidation);
    expect(erreur.message).toBe('Projet introuvable');
    expect(erreur.champ).toBe('projet');
    expect(await service.listerProjets()).toEqual([maison, memoire]);
  });

  it('refuse de supprimer deux fois le même projet', async () => {
    await service.supprimerProjet(maison.id);

    await expect(service.supprimerProjet(maison.id)).rejects.toThrow('Projet introuvable');
  });

  it('refuse ensuite toute opération sur le projet supprimé', async () => {
    await service.supprimerProjet(maison.id);

    await expect(service.ajouterTache(maison.id, { titre: 'Trop tard' })).rejects.toThrow('Projet introuvable');
    await expect(service.statistiques(maison.id)).rejects.toThrow('Projet introuvable');
  });

  it('libère le nom : on peut recréer un projet du même nom, vide', async () => {
    await service.ajouterTache(maison.id, { titre: 'Arroser les plantes' });
    await service.supprimerProjet(maison.id);

    const nouveau = await service.ajouterProjet('Maison');

    expect(nouveau.id).not.toBe(maison.id);
    expect(await service.listerTaches(nouveau.id)).toEqual([]);
  });
});
