package cm.inf563.todo.bdd.support;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

/**
 * Sert le dossier web/ en HTTP pendant les tests, avec le serveur intégré au JDK
 * (aucune dépendance). IndexedDB et les modules JavaScript exigent une vraie origine
 * http:// : ouvrir index.html en file:// ne fonctionnerait pas.
 *
 * Port 0 = le système choisit un port libre : pas de conflit sur la machine de CI.
 */
public final class ServeurWeb {

    private static final Map<String, String> TYPES = Map.of(
            "html", "text/html; charset=utf-8",
            "js", "text/javascript; charset=utf-8",
            "css", "text/css; charset=utf-8");

    private final HttpServer serveur;
    private final Path racine;

    private ServeurWeb(Path racine) throws IOException {
        this.racine = racine.toAbsolutePath().normalize();
        this.serveur = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        this.serveur.createContext("/", this::repondre);
    }

    public static ServeurWeb demarrer(Path racine) throws IOException {
        if (!Files.isRegularFile(racine.resolve("index.html"))) {
            throw new IllegalStateException("index.html introuvable dans " + racine.toAbsolutePath());
        }
        ServeurWeb s = new ServeurWeb(racine);
        s.serveur.start();
        return s;
    }

    public String url() {
        return "http://127.0.0.1:" + serveur.getAddress().getPort() + "/";
    }

    public void arreter() {
        serveur.stop(0);
    }

    private void repondre(HttpExchange echange) throws IOException {
        String chemin = echange.getRequestURI().getPath();
        if (chemin.endsWith("/")) {
            chemin += "index.html";
        }
        Path fichier = racine.resolve(chemin.substring(1)).normalize();
        // Refuse de sortir du dossier web/ (chemins du type /../../etc/passwd)
        if (!fichier.startsWith(racine) || !Files.isRegularFile(fichier)) {
            echange.sendResponseHeaders(404, -1);
            echange.close();
            return;
        }
        String nom = fichier.getFileName().toString();
        String extension = nom.substring(nom.lastIndexOf('.') + 1);
        byte[] contenu = Files.readAllBytes(fichier);
        echange.getResponseHeaders().set("Content-Type", TYPES.getOrDefault(extension, "application/octet-stream"));
        echange.sendResponseHeaders(200, contenu.length);
        try (OutputStream corps = echange.getResponseBody()) {
            corps.write(contenu);
        }
    }
}
