package cm.inf563.todo.bdd.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * Page Object de l'application To-Do.
 *
 * Les étapes Gherkin parlent métier ; cette classe sait OÙ cliquer. Les éléments
 * sont repérés par des attributs data-testid, stables même si le style ou les
 * textes de l'interface changent.
 */
public class PageTodo {

    private static final Duration DELAI_MAX = Duration.ofSeconds(10);

    private final WebDriver driver;
    private final WebDriverWait attente;

    public PageTodo(WebDriver driver) {
        this.driver = driver;
        this.attente = new WebDriverWait(driver, DELAI_MAX);
    }

    private static By testId(String id) {
        return By.cssSelector("[data-testid='" + id + "']");
    }

    // ----- navigation -----

    public void ouvrir(String url) {
        driver.get(url);
        attendreChargement();
    }

    public void recharger() {
        driver.navigate().refresh();
        attendreChargement();
    }

    private void attendreChargement() {
        // L'application pose data-pret="true" sur <body> une fois IndexedDB ouverte et l'écran affiché
        attente.until(d -> "true".equals(d.findElement(By.tagName("body")).getAttribute("data-pret")));
    }

    /**
     * Exécute une action puis attend que l'application ait fini de redessiner l'écran
     * (compteur data-rendu sur body). Attente sur condition, jamais Thread.sleep.
     */
    private void puisAttendreRendu(Runnable action) {
        String avant = numeroRendu();
        action.run();
        attente.until(d -> !numeroRendu().equals(avant));
    }

    private String numeroRendu() {
        String n = driver.findElement(By.tagName("body")).getAttribute("data-rendu");
        return n == null ? "" : n;
    }

    // ----- projets -----

    public void creerProjet(String nom) {
        saisir(driver.findElement(testId("nom-projet")), nom);
        puisAttendreRendu(() -> driver.findElement(testId("ajouter-projet")).click());
    }

    public List<String> nomsDesProjets() {
        return driver.findElements(By.cssSelector("[data-testid='projet'] [data-testid='nom']"))
                .stream().map(WebElement::getText).toList();
    }

    public void selectionnerProjet(String nom) {
        if (nom.equals(projetAffiche())) {
            return;
        }
        WebElement bouton = driver.findElements(By.cssSelector("[data-testid='projet'] button")).stream()
                .filter(b -> b.findElement(testId("nom")).getText().equals(nom))
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException("Projet absent de la liste : " + nom));
        puisAttendreRendu(bouton::click);
    }

    public String projetAffiche() {
        WebElement titre = driver.findElement(testId("projet-courant"));
        return titre.isDisplayed() ? titre.getText() : "";
    }

    public boolean vueAucunProjetAffichee() {
        return driver.findElement(testId("vue-vide")).isDisplayed();
    }

    // ----- tâches -----

    public void ajouterTache(String titre, String echeanceIso) {
        saisir(driver.findElement(testId("titre-tache")), titre);
        saisirDate(driver.findElement(testId("echeance-tache")), echeanceIso);
        puisAttendreRendu(() -> driver.findElement(testId("ajouter-tache")).click());
    }

    public List<String> titresDesTaches() {
        return driver.findElements(By.cssSelector("[data-testid='tache'] [data-testid='titre']"))
                .stream().map(WebElement::getText).toList();
    }

    public String echeanceDe(String titre) {
        return ligne(titre).findElement(testId("echeance")).getText();
    }

    public boolean estTerminee(String titre) {
        return ligne(titre).findElement(testId("terminer")).isSelected();
    }

    public void cocher(String titre) {
        WebElement caseACocher = ligne(titre).findElement(testId("terminer"));
        puisAttendreRendu(caseACocher::click);
    }

    public void ouvrirEdition(String titre) {
        WebElement bouton = ligne(titre).findElement(testId("modifier"));
        puisAttendreRendu(bouton::click);
    }

    public void saisirEdition(String nouveauTitre, String echeanceIso) {
        saisir(driver.findElement(testId("edition-titre")), nouveauTitre);
        if (echeanceIso != null) {
            saisirDate(driver.findElement(testId("edition-echeance")), echeanceIso);
        }
    }

    public void enregistrerEdition() {
        puisAttendreRendu(() -> driver.findElement(testId("enregistrer")).click());
    }

    public void annulerEdition() {
        puisAttendreRendu(() -> driver.findElement(testId("annuler")).click());
    }

    public String compteur() {
        return driver.findElement(testId("compteur")).getText();
    }

    public String messageErreur() {
        WebElement erreur = driver.findElement(testId("erreur"));
        return erreur.isDisplayed() ? erreur.getText() : "";
    }

    // ----- détails techniques -----

    private WebElement ligne(String titre) {
        return driver.findElements(testId("tache")).stream()
                .filter(li -> !li.findElements(testId("titre")).isEmpty())
                .filter(li -> li.findElement(testId("titre")).getText().equals(titre))
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException("Tâche absente : " + titre + " ; tâches affichées : " + titresDesTaches()));
    }

    private static void saisir(WebElement champ, String texte) {
        champ.clear();
        if (!texte.isEmpty()) {
            champ.sendKeys(texte);
        }
    }

    /**
     * Un champ <input type="date"> se tape différemment selon la langue du navigateur
     * (jj/mm/aaaa en français, mm/dd/yyyy en anglais) : source classique de test
     * instable. On fixe donc directement sa valeur ISO, puis on signale le changement.
     */
    private void saisirDate(WebElement champ, String iso) {
        ((JavascriptExecutor) driver).executeScript(
                "arguments[0].value = arguments[1];"
                        + "arguments[0].dispatchEvent(new Event('input', {bubbles: true}));"
                        + "arguments[0].dispatchEvent(new Event('change', {bubbles: true}));",
                champ, iso == null ? "" : iso);
    }
}
