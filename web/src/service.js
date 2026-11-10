export class ErreurValidation extends Error {}

export class TodoService {
  constructor(depot, { horloge, genererId }) {
    this.depot = depot;
    this.horloge = horloge;
    this.genererId = genererId;
  }

  async ajouterProjet(nomSaisi) {
    const nom = (nomSaisi ?? '').trim();
    if (!nom) {
      throw new ErreurValidation('Le nom du projet est obligatoire');
    }
    const existants = await this.depot.listerProjets();
    if (existants.some((p) => p.nom.toLowerCase() === nom.toLowerCase())) {
      throw new ErreurValidation('Un projet porte déjà ce nom');
    }
    const projet = { id: this.genererId(), nom, creeLe: this.horloge().toISOString() };
    await this.depot.sauverProjet(projet);
    return projet;
  }

  async listerProjets() {
    const projets = await this.depot.listerProjets();
    return projets.sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
  }
}
