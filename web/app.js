// Couche d'interface : relie le DOM au TodoService. Elle ne contient AUCUNE règle
// métier (elles sont dans src/ et testées en TDD) ; elle est couverte par les
// scénarios BDD qui pilotent le vrai navigateur.
import { TodoService, ErreurValidation } from './src/service.js';
import { DepotIndexedDB } from './src/depot-indexeddb.js';
import { ServiceComptes } from './src/comptes.js';
import { creerHacheur } from './src/hachage.js';

const $ = (selecteur) => document.querySelector(selecteur);

const ui = {
  erreur: $('#erreur'),
  session: $('#session'),
  utilisateur: $('#utilisateur'),
  deconnexion: $('#deconnexion'),
  vueAuth: $('#vue-auth'),
  vueApp: $('#vue-app'),
  pageConnexion: $('#page-connexion'),
  pageInscription: $('#page-inscription'),
  formConnexion: $('#form-connexion'),
  connexionIdentifiant: $('#connexion-identifiant'),
  connexionMotDePasse: $('#connexion-mot-de-passe'),
  formInscription: $('#form-inscription'),
  inscriptionIdentifiant: $('#inscription-identifiant'),
  inscriptionMotDePasse: $('#inscription-mot-de-passe'),
  inscriptionConfirmation: $('#inscription-confirmation'),
  allerInscription: $('#aller-inscription'),
  allerConnexion: $('#aller-connexion'),
  listeProjets: $('#liste-projets'),
  formProjet: $('#form-projet'),
  nomProjet: $('#nom-projet'),
  vueVide: $('#vue-vide'),
  vueProjet: $('#vue-projet'),
  projetCourant: $('#projet-courant'),
  compteur: $('#compteur'),
  progression: $('#progression'),
  supprimerProjet: $('#supprimer-projet'),
  formTache: $('#form-tache'),
  titreTache: $('#titre-tache'),
  echeanceTache: $('#echeance-tache'),
  listeTaches: $('#liste-taches'),
  aucuneTache: $('#aucune-tache'),
};

let depot;
let comptes;            // ServiceComptes : création de compte et connexion
let compte = null;      // compte connecté, ou null
let pageCompte = 'connexion'; // page affichée quand personne n'est connecté
let service;            // TodoService du compte connecté
let projetCourantId = null;
let tacheEnEditionId = null;
let nbRendus = 0;

/** « 2027-06-30 » -> « 30/06/2027 », sans passer par Date (pas de piège de fuseau horaire). */
function dateFr(iso) {
  const [a, m, j] = iso.split('-');
  return `${j}/${m}/${a}`;
}

function afficherErreur(message) {
  ui.erreur.textContent = message;
  ui.erreur.hidden = false;
}

function effacerErreur() {
  ui.erreur.textContent = '';
  ui.erreur.hidden = true;
}

/** Exécute une action utilisateur : affiche les erreurs de validation, rafraîchit l'écran sinon. */
async function agir(action) {
  try {
    await action();
    effacerErreur();
  } catch (e) {
    if (e instanceof ErreurValidation) {
      afficherErreur(e.message);
    } else {
      console.error(e);
      afficherErreur('Une erreur inattendue est survenue.');
    }
  }
  await afficher();
}

// ----- rendu -----

async function afficher() {
  ui.vueAuth.hidden = Boolean(compte);
  ui.vueApp.hidden = !compte;
  ui.session.hidden = !compte;
  if (compte) {
    ui.utilisateur.textContent = compte.identifiant;
    await afficherApplication();
  } else {
    ui.pageConnexion.hidden = pageCompte !== 'connexion';
    ui.pageInscription.hidden = pageCompte !== 'inscription';
  }
  // Repère pour les tests BDD : incrémenté à la fin de chaque rendu. Le test attend
  // qu'il change au lieu de faire une pause fixe (attente sur condition, séance 9).
  document.body.dataset.rendu = String(++nbRendus);
}

async function afficherApplication() {
  const projets = await service.listerProjets();
  if (!projets.some((p) => p.id === projetCourantId)) {
    projetCourantId = projets[0]?.id ?? null;
  }
  await afficherProjets(projets);
  await afficherTaches(projets.find((p) => p.id === projetCourantId));
}

async function afficherProjets(projets) {
  ui.listeProjets.replaceChildren(...await Promise.all(projets.map(async (projet) => {
    const aFaire = (await service.listerTaches(projet.id)).filter((t) => !t.terminee).length;
    const li = document.createElement('li');
    li.dataset.testid = 'projet';
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.setAttribute('aria-current', String(projet.id === projetCourantId));
    const nom = document.createElement('span');
    nom.dataset.testid = 'nom';
    nom.textContent = projet.nom;
    const nb = document.createElement('span');
    nb.className = 'nb';
    nb.textContent = aFaire;
    bouton.append(nom, nb);
    bouton.addEventListener('click', () => {
      projetCourantId = projet.id;
      tacheEnEditionId = null;
      effacerErreur();
      afficher();
    });
    li.append(bouton);
    return li;
  })));
}

async function afficherTaches(projet) {
  ui.vueVide.hidden = Boolean(projet);
  ui.vueProjet.hidden = !projet;
  if (!projet) {
    return;
  }
  const taches = await service.listerTaches(projet.id);
  const stats = await service.statistiques(projet.id);
  const projets = await service.listerProjets();
  ui.projetCourant.textContent = projet.nom;
  ui.compteur.textContent = `${stats.aFaire} à faire sur ${stats.total}`;
  ui.progression.textContent = `${stats.progression} % terminé`;
  ui.aucuneTache.hidden = taches.length > 0;
  ui.listeTaches.replaceChildren(...taches.map((t) => (t.id === tacheEnEditionId ? ligneEdition(t, projets) : ligneTache(t))));
}

function ligneTache(tache) {
  const li = document.createElement('li');
  li.dataset.testid = 'tache';
  li.dataset.id = tache.id;
  li.classList.toggle('terminee', tache.terminee);

  const case_ = document.createElement('input');
  case_.type = 'checkbox';
  case_.checked = tache.terminee;
  case_.dataset.testid = 'terminer';
  case_.setAttribute('aria-label', `Marquer « ${tache.titre} » comme terminée`);
  case_.addEventListener('change', () => agir(() => service.basculerTerminee(tache.id)));

  const titre = document.createElement('span');
  titre.className = 'titre';
  titre.dataset.testid = 'titre';
  titre.textContent = tache.titre;

  const echeance = document.createElement('span');
  echeance.className = 'echeance';
  echeance.dataset.testid = 'echeance';
  echeance.textContent = tache.echeance ? `échéance ${dateFr(tache.echeance)}` : '';

  const modifier = document.createElement('button');
  modifier.type = 'button';
  modifier.className = 'secondaire';
  modifier.dataset.testid = 'modifier';
  modifier.textContent = 'Modifier';
  modifier.addEventListener('click', () => {
    tacheEnEditionId = tache.id;
    effacerErreur();
    afficher();
  });

  li.append(case_, titre, echeance, modifier);
  return li;
}

function ligneEdition(tache, projets) {
  const li = document.createElement('li');
  li.dataset.testid = 'tache';
  li.dataset.id = tache.id;

  const form = document.createElement('form');
  form.noValidate = true;
  const titre = document.createElement('input');
  titre.value = tache.titre;
  titre.dataset.testid = 'edition-titre';
  titre.setAttribute('aria-label', 'Nouveau titre');
  const echeance = document.createElement('input');
  echeance.type = 'date';
  echeance.value = tache.echeance ?? '';
  echeance.dataset.testid = 'edition-echeance';
  echeance.setAttribute('aria-label', 'Nouvelle échéance');
  // Modifier une tâche permet aussi de la déplacer dans un autre projet
  const projet = document.createElement('select');
  projet.dataset.testid = 'edition-projet';
  projet.setAttribute('aria-label', 'Projet de la tâche');
  for (const p of projets) {
    const option = new Option(p.nom, p.id, false, p.id === tache.projetId);
    projet.append(option);
  }
  const enregistrer = document.createElement('button');
  enregistrer.type = 'submit';
  enregistrer.dataset.testid = 'enregistrer';
  enregistrer.textContent = 'Enregistrer';
  const annuler = document.createElement('button');
  annuler.type = 'button';
  annuler.className = 'secondaire';
  annuler.dataset.testid = 'annuler';
  annuler.textContent = 'Annuler';

  form.addEventListener('submit', (evt) => {
    evt.preventDefault();
    agir(async () => {
      await service.modifierTache(tache.id, { titre: titre.value, echeance: echeance.value || null, projetId: projet.value });
      tacheEnEditionId = null; // on ne quitte l'édition que si l'enregistrement a réussi
    });
  });
  annuler.addEventListener('click', () => {
    tacheEnEditionId = null;
    effacerErreur();
    afficher();
  });

  form.append(titre, echeance, projet, enregistrer, annuler);
  li.append(form);
  queueMicrotask(() => titre.focus());
  return li;
}

// ----- session -----

// La session retient seulement l'id du compte connecté, pour rester connecté après un
// rechargement. Le mot de passe n'est jamais gardé, ni en mémoire ni dans le navigateur.
const CLE_SESSION = 'todo-session';

function ouvrirSession(nouveauCompte) {
  compte = nouveauCompte;
  service = new TodoService(depot, { compteId: compte.id });
  projetCourantId = null;
  tacheEnEditionId = null;
  localStorage.setItem(CLE_SESSION, compte.id);
}

function fermerSession() {
  compte = null;
  service = null;
  projetCourantId = null;
  tacheEnEditionId = null;
  pageCompte = 'connexion';
  localStorage.removeItem(CLE_SESSION);
}

function viderFormulairesDeCompte() {
  ui.formConnexion.reset();
  ui.formInscription.reset();
}

function allerA(page) {
  pageCompte = page;
  viderFormulairesDeCompte();
  effacerErreur();
  afficher();
}

ui.allerInscription.addEventListener('click', () => allerA('inscription'));
ui.allerConnexion.addEventListener('click', () => allerA('connexion'));

ui.formConnexion.addEventListener('submit', (evt) => {
  evt.preventDefault();
  agir(async () => {
    try {
      ouvrirSession(await comptes.connecter({
        identifiant: ui.connexionIdentifiant.value,
        motDePasse: ui.connexionMotDePasse.value,
      }));
      viderFormulairesDeCompte();
    } finally {
      ui.connexionMotDePasse.value = ''; // un mot de passe refusé ne reste pas affiché dans le champ
    }
  });
});

ui.formInscription.addEventListener('submit', (evt) => {
  evt.preventDefault();
  agir(async () => {
    // Créer un compte connecte directement : pas de seconde saisie du mot de passe
    ouvrirSession(await comptes.creerCompte({
      identifiant: ui.inscriptionIdentifiant.value,
      motDePasse: ui.inscriptionMotDePasse.value,
      confirmation: ui.inscriptionConfirmation.value,
    }));
    viderFormulairesDeCompte();
  });
});

ui.deconnexion.addEventListener('click', () => {
  fermerSession();
  viderFormulairesDeCompte();
  effacerErreur();
  afficher();
});

// ----- formulaires -----

ui.formProjet.addEventListener('submit', (evt) => {
  evt.preventDefault();
  agir(async () => {
    const projet = await service.ajouterProjet(ui.nomProjet.value);
    projetCourantId = projet.id;
    ui.nomProjet.value = '';
  });
});

ui.supprimerProjet.addEventListener('click', async () => {
  const id = projetCourantId;
  const { total } = await service.statistiques(id);
  const quoi = total === 0 ? '' : total === 1 ? ' et sa tâche' : ` et ses ${total} tâches`;
  // Action irréversible : on demande confirmation en annonçant ce qui sera perdu
  if (!window.confirm(`Supprimer le projet « ${ui.projetCourant.textContent} »${quoi} ?`)) {
    return;
  }
  agir(async () => {
    await service.supprimerProjet(id);
    tacheEnEditionId = null;
  });
});

ui.formTache.addEventListener('submit', (evt) => {
  evt.preventDefault();
  agir(async () => {
    await service.ajouterTache(projetCourantId, {
      titre: ui.titreTache.value,
      echeance: ui.echeanceTache.value || null,
    });
    ui.titreTache.value = '';
    ui.echeanceTache.value = '';
    ui.titreTache.focus();
  });
});

// ----- démarrage -----

async function demarrer() {
  try {
    depot = await DepotIndexedDB.ouvrir(window.indexedDB);
    comptes = new ServiceComptes(depot, { hacheur: creerHacheur() });
    // Reprise de session après un rechargement, si le compte existe toujours
    const idSession = localStorage.getItem(CLE_SESSION);
    const compteDeSession = idSession ? await comptes.trouverCompte(idSession) : null;
    if (compteDeSession) {
      ouvrirSession(compteDeSession);
    } else {
      localStorage.removeItem(CLE_SESSION);
    }
    await afficher();
    document.body.dataset.pret = 'true'; // repère pour les tests BDD : l'appli a fini de charger
  } catch (e) {
    console.error(e);
    afficherErreur(`Impossible d'ouvrir la base locale : ${e.message}`);
  }
}

demarrer();
