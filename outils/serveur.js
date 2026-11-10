// Petit serveur statique pour ouvrir l'application : npm run serve -> http://localhost:8080
// IndexedDB et les modules ES exigent une origine http(s) : ouvrir index.html en file:// ne suffit pas.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const racine = new URL('../web/', import.meta.url).pathname;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const port = Number(process.env.PORT || 8080);

createServer(async (req, res) => {
  const chemin = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const fichier = join(racine, chemin.endsWith('/') ? chemin + 'index.html' : chemin);
  try {
    const contenu = await readFile(fichier);
    res.writeHead(200, { 'Content-Type': types[extname(fichier)] || 'application/octet-stream' });
    res.end(contenu);
  } catch {
    res.writeHead(404).end('Introuvable');
  }
}).listen(port, () => console.log(`Application To-Do : http://localhost:${port}`));
