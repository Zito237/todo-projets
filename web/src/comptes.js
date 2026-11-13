// Comptes d'utilisateur : création de compte et connexion.
// Comme TodoService, tout ce qui varie est INJECTÉ : le dépôt, l'horloge, le
// générateur d'identifiants et le hacheur de mots de passe (lent en production,
// immédiat dans les tests unitaires).
import { ErreurValidation } from './regles.js';
import {
  cleIdentifiant, validerIdentifiant, validerMotDePasse, validerConfirmation, motDePasseAbsent,
} from './regles-compte.js';

export { ErreurValidation };

/** Partie publique d'un compte : jamais le sel ni l'empreinte du mot de passe. */
function publier({ id, identifiant, creeLe }) {
  return { id, identifiant, creeLe };
}

export class ServiceComptes {
  /**
   * @param depot     dépôt de persistance (DepotIndexedDB en production, fake en test)
   * @param horloge   () => Date
   * @param genererId () => string
   * @param hacheur   { genererSel(): string, hacher(motDePasse, sel): Promise<string> }
   */
  constructor(depot, { horloge = () => new Date(), genererId = () => crypto.randomUUID(), hacheur }) {
    this.depot = depot;
    this.horloge = horloge;
    this.genererId = genererId;
    this.hacheur = hacheur;
  }

  async #trouverParIdentifiant(identifiant) {
    const cle = cleIdentifiant(identifiant);
    const comptes = await this.depot.listerComptes();
    return comptes.find((c) => cleIdentifiant(c.identifiant) === cle) ?? null;
  }

  /** Crée un compte. Le mot de passe n'est jamais enregistré : seulement son empreinte salée. */
  async creerCompte({ identifiant: identifiantSaisi, motDePasse: motDePasseSaisi, confirmation } = {}) {
    const identifiant = validerIdentifiant(identifiantSaisi);
    const motDePasse = validerMotDePasse(motDePasseSaisi);
    validerConfirmation(motDePasse, confirmation);
    if (await this.#trouverParIdentifiant(identifiant)) {
      throw new ErreurValidation('Cet identifiant est déjà utilisé', 'identifiant');
    }
    const sel = this.hacheur.genererSel();
    const compte = {
      id: this.genererId(),
      identifiant,
      sel,
      empreinte: await this.hacheur.hacher(motDePasse, sel),
      creeLe: this.horloge().toISOString(),
    };
    await this.depot.sauverCompte(compte);
    return publier(compte);
  }

  /**
   * Vérifie un identifiant et un mot de passe. Un identifiant inconnu et un mauvais mot
   * de passe donnent le MÊME refus : on ne révèle pas quels identifiants existent.
   */
  async connecter({ identifiant, motDePasse } = {}) {
    if (!cleIdentifiant(identifiant)) {
      throw new ErreurValidation("L'identifiant est obligatoire", 'identifiant');
    }
    if (motDePasseAbsent(motDePasse)) {
      throw new ErreurValidation('Le mot de passe est obligatoire', 'motDePasse');
    }
    const compte = await this.#trouverParIdentifiant(identifiant);
    if (!compte || (await this.hacheur.hacher(motDePasse, compte.sel)) !== compte.empreinte) {
      throw new ErreurValidation('Identifiant ou mot de passe incorrect', 'connexion');
    }
    return publier(compte);
  }

  /** Compte d'une session déjà ouverte (rechargement de la page) ; null s'il n'existe plus. */
  async trouverCompte(id) {
    const compte = await this.depot.trouverCompte(id);
    return compte ? publier(compte) : null;
  }
}
