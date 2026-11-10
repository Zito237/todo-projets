package cm.inf563.todo.bdd;

import org.junit.platform.suite.api.ConfigurationParameter;
import org.junit.platform.suite.api.IncludeEngines;
import org.junit.platform.suite.api.SelectClasspathResource;
import org.junit.platform.suite.api.Suite;

import static io.cucumber.junit.platform.engine.Constants.GLUE_PROPERTY_NAME;
import static io.cucumber.junit.platform.engine.Constants.PLUGIN_PROPERTY_NAME;

/**
 * Lanceur des scénarios BDD. Le suffixe « IT » range ce test dans le niveau
 * « intégration / bout en bout » : il est exécuté par Failsafe pendant
 * « mvn verify », pas par Surefire (convention de nommage, séance 9).
 */
@Suite
@IncludeEngines("cucumber")
@SelectClasspathResource("features")
@ConfigurationParameter(key = GLUE_PROPERTY_NAME, value = "cm.inf563.todo.bdd")
@ConfigurationParameter(key = PLUGIN_PROPERTY_NAME,
        value = "pretty, html:target/cucumber-rapport.html, json:target/cucumber.json")
public class TodoBddIT {
}
