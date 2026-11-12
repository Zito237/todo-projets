package cm.inf563.todo.bdd.steps;

import cm.inf563.todo.bdd.pages.PageTodo;
import cm.inf563.todo.bdd.support.Hooks;
import io.cucumber.java.fr.Alors;
import io.cucumber.java.fr.Quand;
import io.cucumber.java.fr.Soit;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Définitions d'étapes : une méthode par phrase type du fichier .feature.
 *
 * Rappels du cours :
 * - le mot-clé ne compte pas pour la correspondance : « Et je crée le projet … »
 *   est relié à la méthode annotée @Quand ;
 * - {string} et {int} sont des expressions Cucumber qui extraient et convertissent
 *   les paramètres de la phrase ;
 * - un tableau Gherkin d'une seule colonne est converti en List<String>.
 */
public class TodoSteps {

    private PageTodo page;

    // ===== Soit : le contexte =====

    @Soit("l'application To-Do est ouverte dans un navigateur neuf")
    public void applicationOuverte() {
        page = new PageTodo(Hooks.navigateur());
        page.ouvrir(Hooks.urlApplication());
    }

    @Soit("le projet {string} existe")
    public void leProjetExiste(String nom) {
        page.creerProjet(nom); // le projet créé devient le projet affiché
        assertEquals(nom, page.projetAffiche());
    }

    @Soit("la tâche {string} existe dans ce projet")
    public void laTacheExiste(String titre) {
        page.ajouterTache(titre, null);
        assertTrue(page.titresDesTaches().contains(titre), "La tâche n'a pas été créée : " + titre);
    }

    // ===== Quand : les actions =====

    @Quand("je crée le projet {string}")
    public void jeCreeLeProjet(String nom) {
        page.creerProjet(nom);
    }

    @Quand("j'ajoute la tâche {string}")
    public void jAjouteLaTache(String titre) {
        page.ajouterTache(titre, null);
    }

    @Quand("j'ajoute la tâche {string} avec l'échéance {string}")
    public void jAjouteLaTacheAvecEcheance(String titre, String echeanceIso) {
        page.ajouterTache(titre, echeanceIso);
    }

    @Quand("j'ajoute une tâche dont le titre fait {int} caractères")
    public void jAjouteUneTacheDeLongueur(int longueur) {
        page.ajouterTache("a".repeat(longueur), null);
    }

    @Quand("je modifie la tâche {string} en {string}")
    public void jeModifie(String ancien, String nouveau) {
        page.ouvrirEdition(ancien);
        page.saisirEdition(nouveau, null);
        page.enregistrerEdition();
    }

    @Quand("je modifie la tâche {string} en {string} avec l'échéance {string}")
    public void jeModifieAvecEcheance(String ancien, String nouveau, String echeanceIso) {
        page.ouvrirEdition(ancien);
        page.saisirEdition(nouveau, echeanceIso);
        page.enregistrerEdition();
    }

    @Quand("je commence à modifier la tâche {string} en {string}")
    public void jeCommenceAModifier(String ancien, String nouveau) {
        page.ouvrirEdition(ancien);
        page.saisirEdition(nouveau, null);
    }

    @Quand("j'annule la modification")
    public void jAnnule() {
        page.annulerEdition();
    }

    @Quand("je coche la tâche {string}")
    public void jeCoche(String titre) {
        page.cocher(titre);
    }

    @Quand("je coche la tâche {string} du projet {string}")
    public void jeCocheDansLeProjet(String titre, String projet) {
        page.selectionnerProjet(projet);
        page.cocher(titre);
    }

    @Quand("je recharge la page")
    public void jeRecharge() {
        page.recharger();
    }

    // ===== Alors : les résultats attendus =====

    @Alors("l'application indique qu'il n'y a aucun projet")
    public void aucunProjet() {
        assertTrue(page.vueAucunProjetAffichee(), "Le message « Aucun projet » n'est pas affiché");
        assertEquals(List.of(), page.nomsDesProjets());
    }

    @Alors("la liste des projets est :")
    public void laListeDesProjetsEst(List<String> attendus) {
        assertEquals(attendus, page.nomsDesProjets());
    }

    @Alors("le projet affiché est {string}")
    public void leProjetAfficheEst(String nom) {
        assertEquals(nom, page.projetAffiche());
    }

    @Alors("le projet {string} contient les tâches :")
    public void leProjetContient(String projet, List<String> titres) {
        page.selectionnerProjet(projet);
        assertEquals(titres, page.titresDesTaches());
    }

    @Alors("le projet {string} ne contient aucune tâche")
    public void leProjetNeContientAucuneTache(String projet) {
        page.selectionnerProjet(projet);
        assertEquals(List.of(), page.titresDesTaches());
    }

    @Alors("le nombre de tâches du projet {string} est {int}")
    public void leNombreDeTaches(String projet, int nombre) {
        page.selectionnerProjet(projet);
        assertEquals(nombre, page.titresDesTaches().size());
    }

    @Alors("la tâche {string} a l'échéance {string}")
    public void laTacheALEcheance(String titre, String dateAffichee) {
        assertEquals("échéance " + dateAffichee, page.echeanceDe(titre));
    }

    @Alors("la tâche {string} est terminée")
    public void laTacheEstTerminee(String titre) {
        assertTrue(page.estTerminee(titre), "La tâche n'est pas cochée : " + titre);
    }

    @Alors("le compteur indique {string}")
    public void leCompteurIndique(String texte) {
        assertEquals(texte, page.compteur());
    }

    @Alors("le message d'erreur {string} est affiché")
    public void leMessageDErreur(String message) {
        assertEquals(message, page.messageErreur());
    }
}
