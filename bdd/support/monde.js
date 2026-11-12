// « Monde » Cucumber (World) : un objet NEUF par scénario, partagé par ses étapes.
// Il porte la page du navigateur et quelques actions de bas niveau ; les étapes
// (bdd/steps) parlent métier et s'appuient sur lui.
import { setWorldConstructor, World } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

export const DELAI_MAX_MS = 10_000;

export class MondeTodo extends World {
  /** @type {import('@playwright/test').Page} */ page;
  /** @type {import('@playwright/test').BrowserContext} */ contexte;
  url;

  /** Raccourci : élément repéré par son attribut data-testid. */
  t(id) {
    return this.page.getByTestId(id);
  }

  /**
   * Exécute une action de l'utilisateur, puis attend que l'application ait fini son
   * rendu (data-rendu sur <body> change). Jamais de pause fixe : une pause est trop
   * longue ou parfois trop courte, donc lente ou instable (séance 9).
   */
  async agir(action) {
    const avant = await this.page.locator('body').getAttribute('data-rendu');
    await action();
    await this.page.waitForFunction((v) => document.body.dataset.rendu !== v, avant, { timeout: DELAI_MAX_MS });
  }

  async ouvrir() {
    await this.page.goto(this.url);
    await expect(this.page.locator('body')).toHaveAttribute('data-pret', 'true', { timeout: DELAI_MAX_MS });
  }

  /** Sélectionne un projet dans la barre latérale (sans effet s'il est déjà affiché). */
  async afficherProjet(nom) {
    if ((await this.t('projet-courant').textContent()) === nom) return;
    const bouton = this.t('projet').filter({ has: this.page.getByTestId('nom').getByText(nom, { exact: true }) }).getByRole('button');
    await this.agir(() => bouton.click());
    await expect(this.t('projet-courant')).toHaveText(nom);
  }

  /** Ligne d'une tâche du projet affiché, repérée par son titre exact. */
  ligneTache(titre) {
    return this.t('tache').filter({ has: this.page.getByTestId('titre').getByText(titre, { exact: true }) });
  }

  async titresAffiches() {
    return this.t('liste-taches').getByTestId('titre').allTextContents();
  }
}

setWorldConstructor(MondeTodo);
