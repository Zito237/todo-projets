// Couche d'interface : relie le DOM au TodoService. Elle ne contient AUCUNE règle
// métier (elles sont dans src/ et testées en TDD) ; elle est couverte par les
// scénarios BDD qui pilotent le vrai navigateur.
import { TodoService, ErreurValidation } from './src/service.js';
import { DepotIndexedDB } from './src/depot-indexeddb.js';

const $ = (selecteur) => document.querySelector(selecteur);

const ui = {
  erreur: $('#erreur'),
  listeProjets: $('#liste-projets'),
  formProjet: $('#form-projet'),
  nomProjet: $('#nom-projet'),
  vueVide: $('#vue-vide'),
  vueProjet: $('#vue-projet'),
  projetCourant: $('#projet-courant'),
  compteur: $('#compteur'),
  formTache: $('#form-tache'),
  titreTache: $('#titre-tache'),
  echeanceTache: $('#echeance-tache'),
  listeTaches: $('#liste-taches'),
  aucuneTache: $('#aucune-tache'),
};

let service;
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
  const projets = await service.listerProjets();
  if (!projets.some((p) => p.id === projetCourantId)) {
    projetCourantId = projets[0]?.id ?? null;
  }
  await afficherProjets(projets);
  await afficherTaches(projets.find((p) => p.id === projetCourantId));
  // Repère pour les tests BDD : incrémenté à la fin de chaque rendu. Le test attend
  // qu'il change au lieu de faire Thread.sleep (attente sur condition, séance 9).
  document.body.dataset.rendu = String(++nbRendus);
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
  const aFaire = taches.filter((t) => !t.terminee).length;
  ui.projetCourant.textContent = projet.nom;
  ui.compteur.textContent = `${aFaire} à faire sur ${taches.length}`;
  ui.aucuneTache.hidden = taches.length > 0;
  ui.listeTaches.replaceChildren(...taches.map((t) => (t.id === tacheEnEditionId ? ligneEdition(t) : ligneTache(t))));
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

function ligneEdition(tache) {
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
      await service.modifierTache(tache.id, { titre: titre.value, echeance: echeance.value || null });
      tacheEnEditionId = null; // on ne quitte l'édition que si l'enregistrement a réussi
    });
  });
  annuler.addEventListener('click', () => {
    tacheEnEditionId = null;
    effacerErreur();
    afficher();
  });

  form.append(titre, echeance, enregistrer, annuler);
  li.append(form);
  queueMicrotask(() => titre.focus());
  return li;
}

// ----- formulaires -----

ui.formProjet.addEventListener('submit', (evt) => {
  evt.preventDefault();
  agir(async () => {
    const projet = await service.ajouterProjet(ui.nomProjet.value);
    projetCourantId = projet.id;
    ui.nomProjet.value = '';
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
    service = new TodoService(await DepotIndexedDB.ouvrir(window.indexedDB));
    await afficher();
    document.body.dataset.pret = 'true'; // repère pour les tests BDD : l'appli a fini de charger
  } catch (e) {
    console.error(e);
    afficherErreur(`Impossible d'ouvrir la base locale : ${e.message}`);
  }
}

demarrer();
