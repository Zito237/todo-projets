// FAKE (Meszaros) : vraie implémentation du dépôt, simplifiée, fondée sur des Map.
// Même contrat que DepotIndexedDB, mais en mémoire : les tests unitaires restent
// rapides et reproductibles (F et R de F.I.R.S.T.), sans navigateur.
export class DepotMemoire {
  #projets = new Map();
  #taches = new Map();
  #comptes = new Map();

  async sauverCompte(compte) { this.#comptes.set(compte.id, { ...compte }); }
  async trouverCompte(id) { const c = this.#comptes.get(id); return c ? { ...c } : null; }
  async listerComptes() { return [...this.#comptes.values()].map((c) => ({ ...c })); }

  async sauverProjet(projet) { this.#projets.set(projet.id, { ...projet }); }
  async trouverProjet(id) { const p = this.#projets.get(id); return p ? { ...p } : null; }
  async listerProjets() { return [...this.#projets.values()].map((p) => ({ ...p })); }

  /** Supprime le projet ET ses tâches (aucune tâche orpheline) ; sans effet si l'id est inconnu. */
  async supprimerProjet(id) {
    this.#projets.delete(id);
    for (const [idTache, tache] of this.#taches) {
      if (tache.projetId === id) this.#taches.delete(idTache);
    }
  }

  async sauverTache(tache) { this.#taches.set(tache.id, { ...tache }); }
  async trouverTache(id) { const t = this.#taches.get(id); return t ? { ...t } : null; }
  async listerTaches(projetId) {
    return [...this.#taches.values()].filter((t) => t.projetId === projetId).map((t) => ({ ...t }));
  }
}
