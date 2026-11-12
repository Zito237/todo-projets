// Configuration de Cucumber-js : npm run test:bdd
// Les fichiers .feature sont écrits en Gherkin français (# language: fr en tête).
export default {
  paths: ['bdd/features/**/*.feature'],
  import: ['bdd/support/**/*.js', 'bdd/steps/**/*.js'],
  format: [
    'progress-bar',
    'summary',
    'html:reports/cucumber/rapport.html',
    'json:reports/cucumber/rapport.json',
  ],
  formatOptions: { snippetInterface: 'async-await' },
  strict: true, // une étape non définie ou en attente fait échouer la commande
};
