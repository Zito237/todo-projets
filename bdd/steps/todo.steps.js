// DÉFINITIONS D'ÉTAPES : une fonction par phrase type du fichier .feature.
//
// Rappels du cours :
//  - le mot-clé (Soit / Quand / Alors / Et) ne compte pas pour la correspondance :
//    « Et je crée le projet "X" » est relié à la même fonction que « Quand je crée… » ;
//  - {string}, {int} sont des expressions Cucumber : elles extraient et convertissent
//    les paramètres de la phrase ;
//  - Soit = Given (contexte), Quand = When (action), Alors = Then (résultat attendu).
import { Given as Soit, When as Quand, Then as Alors } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

// ---------- Contexte ----------

Soit("l'application To-Do est ouverte dans un navigateur neuf", async function () {
  await this.ouvrir();
});

// ---------- Projets ----------

Quand('je crée le projet {string}', async function (nom) {
  await this.t('nom-projet').fill(nom);
  await this.agir(() => this.t('ajouter-projet').click());
});

Soit('le projet {string} existe', async function (nom) {
  await this.t('nom-projet').fill(nom);
  await this.agir(() => this.t('ajouter-projet').click());
  await expect(this.t('projet-courant')).toHaveText(nom);
});

Alors("l'application indique qu'il n'y a aucun projet", async function () {
  await expect(this.t('vue-vide')).toBeVisible();
  await expect(this.t('projet')).toHaveCount(0);
});

Alors('la liste des projets est :', async function (tableau) {
  const attendus = tableau.raw().map(([nom]) => nom);
  await expect(this.t('liste-projets').getByTestId('nom')).toHaveText(attendus);
});

Alors('le projet affiché est {string}', async function (nom) {
  await expect(this.t('projet-courant')).toHaveText(nom);
});

Alors("le message d'erreur {string} est affiché", async function (message) {
  await expect(this.t('erreur')).toBeVisible();
  await expect(this.t('erreur')).toHaveText(message);
});

// ---------- Ajouter des tâches ----------

async function ajouterTache(monde, titre, echeance = '') {
  await monde.t('titre-tache').fill(titre);
  // Playwright remplit un <input type="date"> avec une date ISO, quelle que soit la
  // langue du navigateur : pas de saisie « 30/06/2027 » dépendante de la locale.
  await monde.t('echeance-tache').fill(echeance);
  await monde.agir(() => monde.t('ajouter-tache').click());
}

Quand("j'ajoute la tâche {string}", async function (titre) {
  await ajouterTache(this, titre);
});

Quand("j'ajoute la tâche {string} avec l'échéance {string}", async function (titre, echeance) {
  await ajouterTache(this, titre, echeance);
});

Quand("j'ajoute une tâche dont le titre fait {int} caractères", async function (longueur) {
  await ajouterTache(this, 'a'.repeat(longueur));
});

Soit('la tâche {string} existe dans ce projet', async function (titre) {
  await ajouterTache(this, titre);
  await expect(this.ligneTache(titre)).toHaveCount(1);
});

Soit('le projet {string} contient {int} tâches dont {int} terminées', async function (nom, total, terminees) {
  await this.afficherProjet(nom);
  for (let i = 1; i <= total; i++) await ajouterTache(this, `Tâche ${i}`);
  for (let i = 1; i <= terminees; i++) {
    await this.agir(() => this.ligneTache(`Tâche ${i}`).getByTestId('terminer').check());
  }
});

// ---------- Lire le contenu d'un projet ----------

Alors('le projet {string} contient les tâches :', async function (nom, tableau) {
  await this.afficherProjet(nom);
  const attendus = tableau.raw().map(([titre]) => titre);
  await expect(this.t('liste-taches').getByTestId('titre')).toHaveText(attendus);
});

Alors('le projet {string} ne contient aucune tâche', async function (nom) {
  await this.afficherProjet(nom);
  await expect(this.t('tache')).toHaveCount(0);
  await expect(this.t('aucune-tache')).toBeVisible();
});

Alors('le nombre de tâches du projet {string} est {int}', async function (nom, nombre) {
  await this.afficherProjet(nom);
  await expect(this.t('tache')).toHaveCount(nombre);
});

Alors("la tâche {string} a l'échéance {string}", async function (titre, dateFr) {
  await expect(this.ligneTache(titre).getByTestId('echeance')).toHaveText(`échéance ${dateFr}`);
});

Alors('le compteur indique {string}', async function (texte) {
  await expect(this.t('compteur')).toHaveText(texte);
});

Alors('la progression indique {string}', async function (texte) {
  await expect(this.t('progression')).toHaveText(texte);
});

// ---------- Modifier une tâche ----------

async function ouvrirEdition(monde, titre) {
  await monde.agir(() => monde.ligneTache(titre).getByTestId('modifier').click());
  await expect(monde.t('edition-titre')).toBeVisible();
}

async function enregistrer(monde) {
  await monde.agir(() => monde.t('enregistrer').click());
}

Quand('je modifie la tâche {string} en {string}', async function (ancien, nouveau) {
  await ouvrirEdition(this, ancien);
  await this.t('edition-titre').fill(nouveau);
  await enregistrer(this);
});

Quand("je modifie la tâche {string} en {string} avec l'échéance {string}", async function (ancien, nouveau, echeance) {
  await ouvrirEdition(this, ancien);
  await this.t('edition-titre').fill(nouveau);
  await this.t('edition-echeance').fill(echeance);
  await enregistrer(this);
});

Quand('je commence à modifier la tâche {string} en {string}', async function (ancien, nouveau) {
  await ouvrirEdition(this, ancien);
  await this.t('edition-titre').fill(nouveau);
});

Quand("j'annule la modification", async function () {
  await this.agir(() => this.t('annuler').click());
  await expect(this.t('edition-titre')).toHaveCount(0);
});

Quand('je déplace la tâche {string} vers le projet {string}', async function (titre, nomProjet) {
  await ouvrirEdition(this, titre);
  await this.t('edition-projet').selectOption({ label: nomProjet });
  await enregistrer(this);
});

// ---------- Terminer une tâche ----------

Quand('je coche la tâche {string}', async function (titre) {
  await this.agir(() => this.ligneTache(titre).getByTestId('terminer').check());
});

Soit('je coche la tâche {string} du projet {string}', async function (titre, nom) {
  await this.afficherProjet(nom);
  await this.agir(() => this.ligneTache(titre).getByTestId('terminer').check());
});

Alors('la tâche {string} est terminée', async function (titre) {
  await expect(this.ligneTache(titre)).toHaveClass(/terminee/);
  await expect(this.ligneTache(titre).getByTestId('terminer')).toBeChecked();
});

// ---------- Persistance ----------

Quand('je recharge la page', async function () {
  await this.page.reload();
  await expect(this.page.locator('body')).toHaveAttribute('data-pret', 'true');
});

Quand("je ferme l'onglet et rouvre l'application", async function () {
  // Même profil de navigateur (même IndexedDB), mais nouvel onglet : rien n'est en mémoire JavaScript
  await this.page.close();
  this.page = await this.contexte.newPage();
  await this.ouvrir();
});

// ---------- Supprimer un projet ----------

// La suppression passe par une boîte de confirmation du navigateur (confirm).
// Playwright la refuse par défaut : on y répond explicitement et on retient son texte.
// On choisit le projet AVANT de mesurer le rendu, et on attend que la boîte ait été
// traitée : sinon l'étape pourrait se terminer avant même qu'elle s'affiche.
async function demanderSuppression(monde, nom, accepter) {
  await monde.afficherProjet(nom);
  const cliquerEtRepondre = async () => {
    const boiteTraitee = new Promise((resoudre) => {
      monde.page.once('dialog', async (dialogue) => {
        monde.confirmationDemandee = dialogue.message();
        await (accepter ? dialogue.accept() : dialogue.dismiss());
        resoudre();
      });
    });
    await monde.t('supprimer-projet').click();
    await boiteTraitee;
  };
  if (accepter) {
    await monde.agir(cliquerEtRepondre); // la suppression provoque un nouveau rendu
  } else {
    await cliquerEtRepondre(); // refus : l'application ne fait rien, aucun rendu à attendre
  }
}

Quand('je supprime le projet {string} en confirmant', async function (nom) {
  await demanderSuppression(this, nom, true);
});

Quand('je supprime le projet {string} en refusant la confirmation', async function (nom) {
  await demanderSuppression(this, nom, false);
});

Alors('la confirmation demandée était {string}', async function (texte) {
  expect(this.confirmationDemandee).toBe(texte);
});
