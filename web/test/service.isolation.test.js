// TDD : chaque compte ne voit et ne modifie que SES projets et SES tâches.
// Deux services partagent le même dépôt (la même base IndexedDB dans le navigateur),
// chacun ouvert pour un compte différent.
import { describe, it, expect, beforeEach } from 'vitest';
import { TodoService } from '../src/service.js';
import { DepotMemoire } from './doublures/depot-memoire.js';
import { horlogeFixe, idsSequentiels } from './doublures/fixtures.js';

describe('Isolation entre comptes', () => {
  let awa;
  let binta;
  let maisonAwa;
  let tacheAwa;

  beforeEach(async () => {
    const depot = new DepotMemoire();
    const genererId = idsSequentiels();
    awa = new TodoService(depot, { horloge: horlogeFixe(), genererId, compteId: 'c-awa' });
    binta = new TodoService(depot, { horloge: horlogeFixe(), genererId, compteId: 'c-binta' });
    maisonAwa = await awa.ajouterProjet('Maison');
    tacheAwa = await awa.ajouterTache(maisonAwa.id, { titre: 'Arroser les plantes' });
  });

  it('rattache chaque projet créé au compte connecté', async () => {
    expect(maisonAwa.compteId).toBe('c-awa');
    expect((await binta.ajouterProjet('Cours')).compteId).toBe('c-binta');
  });

  it("ne liste que les projets du compte connecté", async () => {
    const cours = await binta.ajouterProjet('Cours');

    expect(await awa.listerProjets()).toEqual([maisonAwa]);
    expect(await binta.listerProjets()).toEqual([cours]);
  });

  it("deux comptes peuvent avoir chacun un projet du même nom", async () => {
    const maisonBinta = await binta.ajouterProjet('Maison');

    expect(maisonBinta.id).not.toBe(maisonAwa.id);
    await expect(awa.ajouterProjet('maison')).rejects.toThrow('Un projet porte déjà ce nom');
  });

  it("refuse d'ajouter une tâche dans le projet d'un autre compte", async () => {
    await expect(binta.ajouterTache(maisonAwa.id, { titre: 'Intrusion' })).rejects.toThrow('Projet introuvable');

    expect(await awa.listerTaches(maisonAwa.id)).toEqual([tacheAwa]);
  });

  it("refuse de lire les statistiques ou de supprimer le projet d'un autre compte", async () => {
    await expect(binta.statistiques(maisonAwa.id)).rejects.toThrow('Projet introuvable');
    await expect(binta.supprimerProjet(maisonAwa.id)).rejects.toThrow('Projet introuvable');

    expect(await awa.listerProjets()).toEqual([maisonAwa]);
  });

  it("refuse de modifier ou de cocher la tâche d'un autre compte", async () => {
    await expect(binta.modifierTache(tacheAwa.id, { titre: 'Piratée' })).rejects.toThrow('Tâche introuvable');
    await expect(binta.basculerTerminee(tacheAwa.id)).rejects.toThrow('Tâche introuvable');

    expect(await awa.listerTaches(maisonAwa.id)).toEqual([tacheAwa]);
  });

  it("refuse de déplacer sa tâche vers le projet d'un autre compte", async () => {
    const cours = await binta.ajouterProjet('Cours');
    const tacheBinta = await binta.ajouterTache(cours.id, { titre: 'Réviser' });

    await expect(binta.modifierTache(tacheBinta.id, { projetId: maisonAwa.id })).rejects.toThrow('Projet introuvable');

    expect(await binta.listerTaches(cours.id)).toEqual([tacheBinta]);
  });

  it("supprimer son projet ne touche pas au projet de même nom d'un autre compte", async () => {
    const maisonBinta = await binta.ajouterProjet('Maison');
    const tacheBinta = await binta.ajouterTache(maisonBinta.id, { titre: 'Ranger' });

    await awa.supprimerProjet(maisonAwa.id);

    expect(await awa.listerProjets()).toEqual([]);
    expect(await binta.listerTaches(maisonBinta.id)).toEqual([tacheBinta]);
  });

  it("un projet sans compte (données d'avant les comptes) n'est visible par aucun compte", async () => {
    const depot = new DepotMemoire();
    const sansCompte = new TodoService(depot, { horloge: horlogeFixe(), genererId: idsSequentiels() });
    const ancien = await sansCompte.ajouterProjet('Ancien projet');
    const connecte = new TodoService(depot, { horloge: horlogeFixe(), genererId: idsSequentiels('x'), compteId: 'c-awa' });

    expect(await connecte.listerProjets()).toEqual([]);
    await expect(connecte.statistiques(ancien.id)).rejects.toThrow('Projet introuvable');
  });
});
