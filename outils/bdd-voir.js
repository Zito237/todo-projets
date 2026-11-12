// npm run test:bdd:voir : lance les scénarios en MONTRANT le navigateur.
// (Équivaut à HEADLESS=false, mais fonctionne aussi sous Windows.)
import { spawnSync } from 'node:child_process';

const { status } = spawnSync('npx', ['cucumber-js', ...process.argv.slice(2)], {
  stdio: 'inherit', shell: true, env: { ...process.env, HEADLESS: 'false' },
});
process.exit(status ?? 1);
