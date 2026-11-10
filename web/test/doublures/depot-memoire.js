// FAKE (Meszaros) : vraie implémentation du dépôt, simplifiée, fondée sur des Map.
// Même contrat que DepotIndexedDB, mais en mémoire : les tests unitaires restent
// rapides et reproductibles (F et R de F.I.R.S.T.), sans navigateur.
export class DepotMemoire {
  #projets = new Map();
  #taches = new Map();

  async sauverProjet(projet) { this.#projets.set(projet.id, { ...projet }); }
  async trouverProjet(id) { const p = this.#projets.get(id); return p ? { ...p } : null; }
  async listerProjets() { return [...this.#projets.values()].map((p) => ({ ...p })); }

  async sauverTache(tache) { this.#taches.set(tache.id, { ...tache }); }
  async trouverTache(id) { const t = this.#taches.get(id); return t ? { ...t } : null; }
  async listerTaches(projetId) {
    return [...this.#taches.values()].filter((t) => t.projetId === projetId).map((t) => ({ ...t }));
  }
}
