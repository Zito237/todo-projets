import {
  ErreurValidation, cleDeNom, comparerNoms, validerNomProjet, validerTitreTache, validerEcheance,
} from './regles.js';

export { ErreurValidation };

export class TodoService {
  /**
   * @param depot     dépôt de persistance (DepotIndexedDB en production, fake en test)
   * @param horloge   () => Date, injectée pour des tests reproductibles
   * @param genererId () => string, injecté pour la même raison
   */
  constructor(depot, { horloge = () => new Date(), genererId = () => crypto.randomUUID() } = {}) {
    this.depot = depot;
    this.horloge = horloge;
    this.genererId = genererId;
  }

  #maintenant() {
    return this.horloge().toISOString();
  }

  async #exigerProjet(id) {
    const projet = await this.depot.trouverProjet(id);
    if (!projet) {
      throw new ErreurValidation('Projet introuvable', 'projet');
    }
    return projet;
  }

  async #exigerTache(id) {
    const tache = await this.depot.trouverTache(id);
    if (!tache) {
      throw new ErreurValidation('Tâche introuvable', 'tache');
    }
    return tache;
  }

  async ajouterProjet(nomSaisi) {
    const nom = validerNomProjet(nomSaisi);
    const existants = await this.depot.listerProjets();
    if (existants.some((p) => cleDeNom(p.nom) === cleDeNom(nom))) {
      throw new ErreurValidation('Un projet porte déjà ce nom', 'nom');
    }
    const projet = { id: this.genererId(), nom, creeLe: this.#maintenant() };
    await this.depot.sauverProjet(projet);
    return projet;
  }

  async listerProjets() {
    const projets = await this.depot.listerProjets();
    return projets.sort((a, b) => comparerNoms(a.nom, b.nom));
  }

  async ajouterTache(projetId, { titre, echeance } = {}) {
    await this.#exigerProjet(projetId);
    const maintenant = this.#maintenant();
    const tache = {
      id: this.genererId(),
      projetId,
      titre: validerTitreTache(titre),
      echeance: validerEcheance(echeance),
      terminee: false,
      creeLe: maintenant,
      modifieLe: maintenant,
    };
    await this.depot.sauverTache(tache);
    return tache;
  }

  /** Tâches du projet : à faire d'abord, terminées ensuite ; à statut égal, par date de création. */
  async listerTaches(projetId) {
    const taches = await this.depot.listerTaches(projetId);
    return taches.sort((a, b) => Number(a.terminee) - Number(b.terminee) || a.creeLe.localeCompare(b.creeLe));
  }

  async modifierTache(id, changements = {}) {
    const tache = await this.#exigerTache(id);
    const modifiee = { ...tache };
    if ('titre' in changements) {
      modifiee.titre = validerTitreTache(changements.titre);
    }
    if ('echeance' in changements) {
      modifiee.echeance = validerEcheance(changements.echeance);
    }
    if ('projetId' in changements) {
      await this.#exigerProjet(changements.projetId);
      modifiee.projetId = changements.projetId;
    }
    modifiee.modifieLe = this.#maintenant();
    await this.depot.sauverTache(modifiee);
    return modifiee;
  }

  async basculerTerminee(id) {
    const tache = await this.#exigerTache(id);
    const modifiee = { ...tache, terminee: !tache.terminee, modifieLe: this.#maintenant() };
    await this.depot.sauverTache(modifiee);
    return modifiee;
  }
}
