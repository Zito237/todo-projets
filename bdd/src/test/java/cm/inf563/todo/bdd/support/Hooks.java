package cm.inf563.todo.bdd.support;

import io.cucumber.java.After;
import io.cucumber.java.AfterAll;
import io.cucumber.java.Before;
import io.cucumber.java.BeforeAll;
import io.cucumber.java.Scenario;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Map;

/**
 * Hooks Cucumber, l'équivalent de @BeforeAll / @BeforeEach / @AfterEach de JUnit.
 */
public class Hooks {

    private static ServeurWeb serveur;
    private static final ThreadLocal<WebDriver> NAVIGATEUR = new ThreadLocal<>();

    /** Une fois pour toute la suite : on démarre le serveur qui sert l'application. */
    @BeforeAll
    public static void demarrerServeur() throws IOException {
        String dossier = System.getProperty("todo.web", "../web");
        serveur = ServeurWeb.demarrer(Path.of(dossier));
    }

    @AfterAll
    public static void arreterServeur() {
        if (serveur != null) {
            serveur.arreter();
        }
    }

    /**
     * Avant CHAQUE scénario : un Chrome neuf, donc un profil vierge et une IndexedDB
     * vide. Aucun scénario ne voit les données d'un autre (isolement, F.I.R.S.T.),
     * et l'ordre d'exécution des scénarios n'a aucune importance.
     */
    @Before
    public void ouvrirNavigateur() {
        ChromeOptions options = new ChromeOptions();
        if (!"false".equalsIgnoreCase(System.getProperty("headless", System.getenv("HEADLESS")))) {
            options.addArguments("--headless=new");
        }
        // Environnement fixé : langue et taille d'écran identiques sur tous les postes et en CI
        options.addArguments("--lang=fr-FR", "--window-size=1280,900", "--no-sandbox", "--disable-dev-shm-usage");
        options.setExperimentalOption("prefs", Map.of("intl.accept_languages", "fr-FR,fr"));
        NAVIGATEUR.set(new ChromeDriver(options));
    }

    @After
    public void fermerNavigateur(Scenario scenario) {
        WebDriver driver = NAVIGATEUR.get();
        NAVIGATEUR.remove();
        if (driver == null) {
            return;
        }
        try {
            if (scenario.isFailed()) {
                byte[] capture = ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES);
                scenario.attach(capture, "image/png", "écran au moment de l'échec");
            }
        } finally {
            driver.quit();
        }
    }

    public static WebDriver navigateur() {
        WebDriver driver = NAVIGATEUR.get();
        if (driver == null) {
            throw new IllegalStateException("Aucun navigateur ouvert : le hook @Before n'a pas été exécuté");
        }
        return driver;
    }

    public static String urlApplication() {
        return serveur.url();
    }
}
