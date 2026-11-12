// Lancé par `npm install` (script "prepare") : dit à Git d'utiliser le dossier
// .githooks versionné avec le projet. Ainsi chaque membre de l'équipe a le même
// hook pre-push sans manipulation manuelle.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (process.env.CI) {
  console.log('CI : hooks Git non installés (inutiles sur le serveur)');
} else if (!existsSync('.git')) {
  console.log("Pas de dépôt Git ici : hooks non installés (faire `git init` puis `npm install`)");
} else {
  execSync('git config core.hooksPath .githooks');
  console.log('Hooks Git installés : les tests seront lancés à chaque git push');
}
