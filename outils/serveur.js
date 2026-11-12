// Petit serveur statique pour l'application.
//   npm run serve          -> http://localhost:8080
//   import { demarrerServeur } : utilisé par les scénarios BDD (port libre choisi par le système)
// IndexedDB et les modules ES exigent une origine http(s) : ouvrir index.html en file:// ne suffit pas.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = fileURLToPath(new URL('../web/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

/** Démarre le serveur ; port 0 = un port libre. Renvoie { url, arreter }. */
export function demarrerServeur(port = 0) {
  const serveur = createServer(async (req, res) => {
    const chemin = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    const fichier = join(racine, chemin.endsWith('/') ? `${chemin}index.html` : chemin);
    try {
      const contenu = await readFile(fichier);
      res.writeHead(200, { 'Content-Type': types[extname(fichier)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(contenu);
    } catch {
      res.writeHead(404).end('Introuvable');
    }
  });
  return new Promise((resoudre) => {
    serveur.listen(port, '127.0.0.1', () => resoudre({
      url: `http://127.0.0.1:${serveur.address().port}/`,
      arreter: () => new Promise((fin) => serveur.close(fin)),
    }));
  });
}

// Lancé directement (node outils/serveur.js) : serveur sur le port 8080
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { url } = await demarrerServeur(Number(process.env.PORT || 8080));
  console.log(`Application To-Do : ${url}`);
}
