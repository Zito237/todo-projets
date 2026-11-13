// Dépôt de production : persistance dans l'IndexedDB du navigateur.
// La fabrique IndexedDB est INJECTÉE (window.indexedDB dans l'application,
// fake-indexeddb dans les tests Node) : c'est ce qui rend la classe testable.

// Version 2 : ajout du magasin « comptes ». Les magasins de la version 1 sont conservés.
export const VERSION_BASE = 2;
const PROJETS = 'projets';
const TACHES = 'taches';
const COMPTES = 'comptes';
const INDEX_PAR_PROJET = 'parProjet';

/** Transforme une IDBRequest (API à callbacks) en Promise. */
function enPromesse(requete) {
  return new Promise((resoudre, rejeter) => {
    requete.onsuccess = () => resoudre(requete.result);
    requete.onerror = () => rejeter(requete.error);
  });
}

export class DepotIndexedDB {
  #base;

  constructor(base) {
    this.#base = base;
    // Si une version plus récente de l'application s'ouvre ailleurs, on lui laisse la place
    base.onversionchange = () => base.close();
  }

  static async ouvrir(fabrique = globalThis.indexedDB, nomBase = 'todo-projets') {
    if (!fabrique) {
      throw new Error("IndexedDB n'est pas disponible dans ce navigateur");
    }
    const requete = fabrique.open(nomBase, VERSION_BASE);
    requete.onupgradeneeded = () => {
      // Création du schéma à la première ouverture (ou lors d'un changement de VERSION_BASE)
      const base = requete.result;
      if (!base.objectStoreNames.contains(PROJETS)) {
        base.createObjectStore(PROJETS, { keyPath: 'id' });
      }
      if (!base.objectStoreNames.contains(TACHES)) {
        const taches = base.createObjectStore(TACHES, { keyPath: 'id' });
        taches.createIndex(INDEX_PAR_PROJET, 'projetId', { unique: false });
      }
      if (!base.objectStoreNames.contains(COMPTES)) {
        base.createObjectStore(COMPTES, { keyPath: 'id' });
      }
    };
    const ouverture = enPromesse(requete);
    const bloquee = new Promise((_, rejeter) => {
      // Un autre onglet garde ouverte une ancienne version de la base : la mise à jour ne peut pas se faire
      requete.onblocked = () => rejeter(new Error(
        "une ancienne version de l'application est ouverte dans un autre onglet ; fermez-le puis rechargez la page",
      ));
    });
    return new DepotIndexedDB(await Promise.race([ouverture, bloquee]));
  }

  fermer() {
    this.#base.close();
  }

  // ----- comptes -----

  sauverCompte(compte) {
    return this.#ecrire(COMPTES, compte);
  }

  async trouverCompte(id) {
    return (await this.#lire(COMPTES, (store) => store.get(id))) ?? null;
  }

  listerComptes() {
    return this.#lire(COMPTES, (store) => store.getAll());
  }

  // ----- projets -----

  sauverProjet(projet) {
    return this.#ecrire(PROJETS, projet);
  }

  async trouverProjet(id) {
    return (await this.#lire(PROJETS, (store) => store.get(id))) ?? null;
  }

  listerProjets() {
    return this.#lire(PROJETS, (store) => store.getAll());
  }

  /**
   * Supprime le projet ET ses tâches dans UNE SEULE transaction : soit tout est
   * supprimé, soit rien (pas de tâche orpheline si l'onglet se ferme au milieu).
   * Sans effet si l'id est inconnu.
   */
  supprimerProjet(id) {
    return new Promise((resoudre, rejeter) => {
      const transaction = this.#base.transaction([PROJETS, TACHES], 'readwrite');
      transaction.objectStore(PROJETS).delete(id);
      const taches = transaction.objectStore(TACHES);
      const cles = taches.index(INDEX_PAR_PROJET).getAllKeys(id);
      cles.onsuccess = () => cles.result.forEach((cle) => taches.delete(cle));
      transaction.oncomplete = () => resoudre();
      transaction.onerror = () => rejeter(transaction.error);
      transaction.onabort = () => rejeter(transaction.error);
    });
  }

  // ----- tâches -----

  sauverTache(tache) {
    return this.#ecrire(TACHES, tache);
  }

  async trouverTache(id) {
    return (await this.#lire(TACHES, (store) => store.get(id))) ?? null;
  }

  listerTaches(projetId) {
    return this.#lire(TACHES, (store) => store.index(INDEX_PAR_PROJET).getAll(projetId));
  }

  // ----- mécanique des transactions -----

  #lire(nomStore, operation) {
    const store = this.#base.transaction(nomStore, 'readonly').objectStore(nomStore);
    return enPromesse(operation(store)); // IndexedDB renvoie déjà des copies (clonage structuré)
  }

  #ecrire(nomStore, valeur) {
    return new Promise((resoudre, rejeter) => {
      const transaction = this.#base.transaction(nomStore, 'readwrite');
      transaction.objectStore(nomStore).put(structuredClone(valeur)); // put = insertion OU mise à jour
      // On attend la fin de la TRANSACTION (données écrites), pas seulement de la requête
      transaction.oncomplete = () => resoudre();
      transaction.onerror = () => rejeter(transaction.error);
      transaction.onabort = () => rejeter(transaction.error);
    });
  }
}
