// Dépôt de production : persistance dans l'IndexedDB du navigateur.
// La fabrique IndexedDB est INJECTÉE (window.indexedDB dans l'application,
// fake-indexeddb dans les tests Node) : c'est ce qui rend la classe testable.

export const VERSION_BASE = 1;
const PROJETS = 'projets';
const TACHES = 'taches';
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
    };
    return new DepotIndexedDB(await enPromesse(requete));
  }

  fermer() {
    this.#base.close();
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
