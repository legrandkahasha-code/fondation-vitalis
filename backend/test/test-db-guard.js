/**
 * Module de garde-fou strict pour l'exécution des tests.
 * Interdit formellement toute exécution contre la base de données de production.
 */

function getAndValidateTestDbUrl() {
  const testDbUrl = process.env.TEST_DATABASE_URL;
  const prodDbUrl = process.env.DATABASE_URL;

  if (!testDbUrl) {
    throw new Error(
      "BLOCAGE SÉCURITÉ : Aucune variable TEST_DATABASE_URL n'est définie. " +
      "Les tests doivent obligatoirement utiliser TEST_DATABASE_URL pointant vers un schéma ou une base de test dédiée."
    );
  }

  // Si l'URL pointe vers la prod sans paramètre de schéma de test explicite
  if (prodDbUrl && testDbUrl === prodDbUrl) {
    throw new Error(
      "BLOCAGE SÉCURITÉ CRITIQUE : TEST_DATABASE_URL est strictement identique à DATABASE_URL de production ! " +
      "Exécution immédiatement avortée pour protéger les données réelles."
    );
  }

  // Vérification de la présence obligatoire du schéma isolé test_landing
  if (!testDbUrl.includes('schema=test_landing') && !testDbUrl.includes('_test')) {
    throw new Error(
      "BLOCAGE SÉCURITÉ : L'URL de test doit obligatoirement cibler le schéma isolé (?schema=test_landing) " +
      "ou une base contenant '_test'."
    );
  }

  return testDbUrl;
}

module.exports = { getAndValidateTestDbUrl };
