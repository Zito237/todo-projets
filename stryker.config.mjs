// Test de MUTATION (séance 5) : Stryker modifie le code de production (mutants :
// < devient <=, && devient ||, une ligne supprimée…) et relance les tests Vitest.
// Un mutant « tué » = au moins un test échoue = les tests ont vu le défaut.
// Score de mutation = mutants tués / mutants. Lancement : npm run test:mutation
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  mutate: ['web/src/regles.js', 'web/src/service.js'],
  reporters: ['clear-text', 'html', 'progress'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  thresholds: { high: 90, low: 80, break: 80 }, // sous 80 % la commande échoue
  coverageAnalysis: 'perTest',
};
