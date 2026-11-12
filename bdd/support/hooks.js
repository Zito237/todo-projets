// Hooks Cucumber : préparer et nettoyer autour des scénarios (équivalent de
// @BeforeAll / @BeforeEach / @AfterEach en JUnit).
import { BeforeAll, AfterAll, Before, After, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium } from '@playwright/test';
import { demarrerServeur } from '../../outils/serveur.js';

setDefaultTimeout(30_000);

let serveur;
let navigateur;

// Une seule fois pour toute la campagne : le serveur web et le navigateur (lents à démarrer).
BeforeAll(async () => {
  serveur = await demarrerServeur(0); // port libre : pas de conflit avec une appli déjà lancée
  navigateur = await chromium.launch({
    // Par défaut le Google Chrome installé sur la machine (présent sur les runners GitHub).
    // PW_CHANNEL=chromium utilise le Chromium de Playwright (npx playwright install chromium).
    channel: process.env.PW_CHANNEL || 'chrome',
    headless: process.env.HEADLESS !== 'false',
  });
});

AfterAll(async () => {
  await navigateur?.close();
  await serveur?.arreter();
});

// Pour CHAQUE scénario : un contexte de navigation neuf = profil vierge, donc une
// IndexedDB vide. Aucun scénario ne dépend d'un autre (qualité I de F.I.R.S.T.).
// Environnement fixé (langue, fuseau, taille d'écran) : sinon les dates et les
// textes peuvent changer d'une machine à l'autre (tests instables, séance 9).
Before(async function () {
  this.contexte = await navigateur.newContext({
    locale: 'fr-FR',
    timezoneId: 'Africa/Douala',
    viewport: { width: 1280, height: 900 },
  });
  this.page = await this.contexte.newPage();
  this.erreursConsole = [];
  this.page.on('pageerror', (e) => this.erreursConsole.push(e.message));
  this.url = serveur.url;
});

After(async function ({ result }) {
  if (result?.status === Status.FAILED && this.page) {
    // Capture jointe au rapport HTML : on voit l'écran au moment de l'échec
    this.attach(await this.page.screenshot({ fullPage: true }), 'image/png');
  }
  await this.contexte?.close();
  if (this.erreursConsole?.length) {
    // Oracle implicite : aucune erreur JavaScript non rattrapée pendant le scénario
    throw new Error(`Erreurs JavaScript dans la page : ${this.erreursConsole.join(' | ')}`);
  }
});
