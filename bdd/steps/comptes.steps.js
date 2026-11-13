// DÉFINITIONS D'ÉTAPES des pages « Créer un compte » et « Se connecter »
// (bdd/features/comptes.feature). Les étapes communes (message d'erreur, projets,
// rechargement) restent dans todo.steps.js.
import { Given as Soit, When as Quand, Then as Alors } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

const MOT_DE_PASSE_PAR_DEFAUT = 'Soleil2026';
const PAGES_DE_COMPTE = {
  'Se connecter': { page: 'page-connexion', lien: 'aller-connexion' },
  'Créer un compte': { page: 'page-inscription', lien: 'aller-inscription' },
};

async function ouvrirPageDeCompte(monde, titre) {
  const { page, lien } = PAGES_DE_COMPTE[titre];
  if (await monde.t(page).isVisible()) return;
  await monde.agir(() => monde.t(lien).click());
  await expect(monde.t(page)).toBeVisible();
}

async function creerCompte(monde, identifiant, motDePasse, confirmation = motDePasse) {
  await ouvrirPageDeCompte(monde, 'Créer un compte');
  await monde.t('inscription-identifiant').fill(identifiant);
  await monde.t('inscription-mot-de-passe').fill(motDePasse);
  await monde.t('inscription-confirmation').fill(confirmation);
  await monde.agir(() => monde.t('creer-compte').click());
}

async function seConnecter(monde, identifiant, motDePasse) {
  await ouvrirPageDeCompte(monde, 'Se connecter');
  await monde.t('connexion-identifiant').fill(identifiant);
  await monde.t('connexion-mot-de-passe').fill(motDePasse);
  await monde.agir(() => monde.t('se-connecter').click());
}

async function seDeconnecter(monde) {
  await monde.agir(() => monde.t('deconnexion').click());
  await expect(monde.t('page-connexion')).toBeVisible();
}

// ---------- Mise en place ----------

Soit('je suis connecté avec un nouveau compte {string}', async function (identifiant) {
  await creerCompte(this, identifiant, MOT_DE_PASSE_PAR_DEFAUT);
  await expect(this.t('utilisateur')).toHaveText(identifiant);
});

Soit('le compte {string} existe avec le mot de passe {string}', async function (identifiant, motDePasse) {
  await creerCompte(this, identifiant, motDePasse);
  await expect(this.t('utilisateur')).toHaveText(identifiant);
  await seDeconnecter(this);
});

// ---------- Actions ----------

Quand('je crée le compte {string} avec le mot de passe {string}', async function (identifiant, motDePasse) {
  await creerCompte(this, identifiant, motDePasse);
});

Quand(
  'je crée le compte {string} avec le mot de passe {string} et la confirmation {string}',
  async function (identifiant, motDePasse, confirmation) {
    await creerCompte(this, identifiant, motDePasse, confirmation);
  },
);

Quand("je crée un compte dont l'identifiant fait {int} caractères", async function (longueur) {
  await creerCompte(this, 'a'.repeat(longueur), MOT_DE_PASSE_PAR_DEFAUT);
});

Quand('je crée un compte dont le mot de passe fait {int} caractères', async function (longueur) {
  await creerCompte(this, 'awa.ngono', `${'a'.repeat(longueur - 1)}1`); // des lettres et un chiffre
});

Quand('je me connecte avec {string} et le mot de passe {string}', async function (identifiant, motDePasse) {
  await seConnecter(this, identifiant, motDePasse);
});

Quand('je me déconnecte', async function () {
  await seDeconnecter(this);
});

Quand("j'ouvre la page {string}", async function (titre) {
  await ouvrirPageDeCompte(this, titre);
});

// ---------- Résultats attendus ----------

Alors('la page {string} est affichée', async function (titre) {
  const page = this.t(PAGES_DE_COMPTE[titre].page);
  await expect(page).toBeVisible();
  await expect(page.getByRole('heading')).toHaveText(titre);
});

Alors('les projets ne sont pas visibles', async function () {
  await expect(this.t('liste-projets')).toBeHidden();
  await expect(this.t('utilisateur')).toBeHidden();
});

Alors('je suis connecté en tant que {string}', async function (identifiant) {
  await expect(this.t('utilisateur')).toBeVisible();
  await expect(this.t('utilisateur')).toHaveText(identifiant);
  await expect(this.t('page-connexion')).toBeHidden();
  await expect(this.t('page-inscription')).toBeHidden();
});

Alors('le compte est créé et la session est ouverte', async function () {
  await expect(this.t('erreur')).toBeHidden();
  await expect(this.t('utilisateur')).toBeVisible();
  await expect(this.t('vue-vide')).toBeVisible();
});

Alors('le champ du mot de passe est vide', async function () {
  await expect(this.t('connexion-mot-de-passe')).toHaveValue('');
});

// Lit TOUT ce que le navigateur conserve pour l'application : les magasins IndexedDB,
// localStorage et sessionStorage. Le mot de passe ne doit apparaître dans aucun.
Alors('le navigateur ne conserve nulle part le texte {string}', async function (texte) {
  const contenu = await this.page.evaluate(async () => {
    const enPromesse = (requete) => new Promise((resoudre, rejeter) => {
      requete.onsuccess = () => resoudre(requete.result);
      requete.onerror = () => rejeter(requete.error);
    });
    const base = await enPromesse(indexedDB.open('todo-projets'));
    const magasins = {};
    for (const nom of base.objectStoreNames) {
      magasins[nom] = await enPromesse(base.transaction(nom, 'readonly').objectStore(nom).getAll());
    }
    base.close();
    return JSON.stringify({ magasins, local: { ...localStorage }, session: { ...sessionStorage } });
  });
  expect(JSON.parse(contenu).magasins.comptes).toHaveLength(1); // on a bien lu le compte créé
  expect(contenu).not.toContain(texte);
});
