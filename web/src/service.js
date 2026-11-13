import {
  ErreurValidation, cleDeNom, comparerNoms, validerNomProjet, validerTitreTache, validerEcheance,
} from './regles.js';

export { ErreurValidation };

export class TodoService {
  /**
   * @param depot     dépôt de persistance (DepotIndexedDB en production, fake en test)
   * @param horloge   () => Date, injectée pour des tests reproductibles
   * @param genererId () => string, injecté pour la même raison
   * @param compteId  compte connecté : le service ne voit et ne modifie que SES projets
   */
  constructor(depot, { horloge = () => new Date(), genererId = () => crypto.randomUUID(), compteId } = {}) {
    this.depot = depot;
    this.compteId = compteId;
    this.horloge = horloge;
    this.genererId = genererId;
  }

  #maintenant() {
    return this.horloge().toISOString();
  }

  async #exigerProjet(id) {
    const projet = await this.depot.trouverProjet(id);
    // Le projet d'un autre compte est traité comme inexistant : on ne révèle pas qu'il existe
    if (!projet || projet.compteId !== this.compteId) {
      throw new ErreurValidation('Projet introuvable', 'projet');
    }
    return projet;
  }

  async #exigerTache(id) {
    const tache = await this.depot.trouverTache(id);
    const projet = tache && await this.depot.trouverProjet(tache.projetId);
    if (!projet || projet.compteId !== this.compteId) {
      throw new ErreurValidation('Tâche introuvable', 'tache');
    }
    return tache;
  }

  async #mesProjets() {
    const projets = await this.depot.listerProjets();
    return projets.filter((p) => p.compteId === this.compteId);
  }

  async ajouterProjet(nomSaisi) {
    const nom = validerNomProjet(nomSaisi);
    const existants = await this.#mesProjets();
    if (existants.some((p) => cleDeNom(p.nom) === cleDeNom(nom))) {
      throw new ErreurValidation('Un projet porte déjà ce nom', 'nom');
    }
    const projet = { id: this.genererId(), nom, creeLe: this.#maintenant(), compteId: this.compteId };
    await this.depot.sauverProjet(projet);
    return projet;
  }

  async listerProjets() {
    const projets = await this.#mesProjets();
    return projets.sort((a, b) => comparerNoms(a.nom, b.nom));
  }

  /** Supprime un projet et toutes ses tâches. La confirmation est l'affaire de l'interface. */
  async supprimerProjet(id) {
    await this.#exigerProjet(id);
    await this.depot.supprimerProjet(id);
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

  /** Compteurs d'un projet ; progression = part des tâches terminées, en % arrondi (0 si aucune tâche). */
  async statistiques(projetId) {
    await this.#exigerProjet(projetId);
    const taches = await this.depot.listerTaches(projetId);
    const total = taches.length;
    const terminees = taches.filter((t) => t.terminee).length;
    return {
      total,
      aFaire: total - terminees,
      terminees,
      progression: total === 0 ? 0 : Math.round((100 * terminees) / total),
    };
  }

  async basculerTerminee(id) {
    const tache = await this.#exigerTache(id);
    const modifiee = { ...tache, terminee: !tache.terminee, modifieLe: this.#maintenant() };
    await this.depot.sauverTache(modifiee);
    return modifiee;
  }
}
