/**
 * Module de garde-fou strict pour l'exécution des tests.
 * Interdit formellement toute exécution contre la base de données de production.
 * Vérifie l'hôte exact et interdit les hôtes de production Supabase.
 */
function getAndValidateTestDbUrl() {
  const testDbUrl = process.env.TEST_DATABASE_URL;
  const prodDbUrl = process.env.DATABASE_URL;

  if (!testDbUrl) {
    throw new Error(
      "BLOCAGE SÉCURITÉ : Aucune variable TEST_DATABASE_URL n'est définie. " +
      "Les tests doivent obligatoirement utiliser TEST_DATABASE_URL pointant vers un environnement de test dédié."
    );
  }

  let testHost = '';
  let prodHost = '';

  try {
    const testParsed = new URL(testDbUrl);
    testHost = testParsed.hostname.toLowerCase();
  } catch (e) {
    throw new Error(`BLOCAGE SÉCURITÉ : TEST_DATABASE_URL est une URL invalide : ${e.message}`);
  }

  if (prodDbUrl) {
    try {
      const prodParsed = new URL(prodDbUrl);
      prodHost = prodParsed.hostname.toLowerCase();
    } catch (e) {}
  }

  // Interdiction absolue si l'hôte de test est identique à celui de la production
  if (prodHost && testHost === prodHost) {
    throw new Error(
      `BLOCAGE SÉCURITÉ CRITIQUE : L'hôte de TEST_DATABASE_URL (${testHost}) est identique à l'hôte de production (${prodHost}) ! ` +
      "Exécution immédiatement bloquée pour protéger la base de production."
    );
  }

  // Interdiction de tout hôte de production connu
  if (testHost.includes('supabase.com') || testHost.includes('pooler.supabase.com')) {
    throw new Error(
      `BLOCAGE SÉCURITÉ : L'hôte cible (${testHost}) appartient à l'infrastructure cloud de production. ` +
      "Les tests doivent tourner sur un hôte local dédié (ex: localhost, 127.0.0.1) ou un projet de test séparé déclaré."
    );
  }

  // Hôtes autorisés pour les tests locaux
  const allowedTestHosts = ['localhost', '127.0.0.1', '::1', 'postgres-test', 'db-test'];
  const customAllowedHost = process.env.ALLOWED_TEST_DB_HOST;
  if (customAllowedHost) {
    allowedTestHosts.push(customAllowedHost.toLowerCase());
  }

  if (!allowedTestHosts.includes(testHost)) {
    throw new Error(
      `BLOCAGE SÉCURITÉ : L'hôte de test « ${testHost} » n'est pas dans la liste blanche autorisée [${allowedTestHosts.join(', ')}].`
    );
  }

  return testDbUrl;
}

module.exports = { getAndValidateTestDbUrl };
