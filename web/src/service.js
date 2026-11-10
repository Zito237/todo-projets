import { ErreurValidation, cleDeNom, comparerNoms, validerNomProjet } from './regles.js';

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
}
