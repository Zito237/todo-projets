export class ErreurValidation extends Error {}

export class TodoService {
  constructor(depot, { horloge, genererId }) {
    this.depot = depot;
    this.horloge = horloge;
    this.genererId = genererId;
  }

  async ajouterProjet(nom) {
    if (!nom) {
      throw new ErreurValidation('Le nom du projet est obligatoire');
    }
    const projet = { id: this.genererId(), nom, creeLe: this.horloge().toISOString() };
    await this.depot.sauverProjet(projet);
    return projet;
  }

  async listerProjets() {
    return this.depot.listerProjets();
  }
}
