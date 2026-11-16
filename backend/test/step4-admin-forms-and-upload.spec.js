/**
 * Tests d'intégration Étape 4 : Formulaires d'administration et téléversement sécurisé
 * Exécution stricte sur le schéma isolé de test (test_landing) avec garde-fou.
 */
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env.test'), override: true });

const { getAndValidateTestDbUrl } = require('./test-db-guard');

// Validation immédiate du garde-fou
const testDbUrl = getAndValidateTestDbUrl();
console.log('✓ Garde-fou validé : exécution ciblée sur schéma isolé test_landing.');

const JWT_SECRET = process.env.JWT_SECRET || 'secret-pour-tests-vitalis-123456';
const PORT = 3099;

const adminToken = jwt.sign(
  {
    sub: 'cdab894a-010a-4203-b153-cc1b69467d15',
    email: 'bahatilegrand@gmail.com',
    role: 'ADMIN_CENTRE',
    token_type: 'access',
  },
  JWT_SECRET,
  { expiresIn: '1h' },
);

const apprenantToken = jwt.sign(
  {
    sub: '0fc6d7fa-00a3-49eb-a4dd-69740ef4db1c',
    email: 'esthamalonda0511@gmail.com',
    role: 'APPRENANT',
    token_type: 'access',
  },
  JWT_SECRET,
  { expiresIn: '1h' },
);

const pool = new Pool({
  connectionString: testDbUrl,
  ssl: { rejectUnauthorized: false },
});

async function runStep4Tests() {
  console.log('=== DÉBUT DES TESTS ÉTAPE 4 (ADMIN FORMS & UPLOAD SUR SCHEMA TEST) ===\n');

  // Synchronisation des 2 utilisateurs de test dans test_landing.utilisateurs
  try {
    await pool.query(`
      INSERT INTO test_landing.utilisateurs 
      SELECT * FROM public.utilisateurs 
      WHERE id IN ('cdab894a-010a-4203-b153-cc1b69467d15', '0fc6d7fa-00a3-49eb-a4dd-69740ef4db1c')
      ON CONFLICT DO NOTHING;
    `);
    console.log('✓ Utilisateurs de test synchronisés dans le schéma test_landing.');
  } catch (err) {
    console.warn('Avertissement sync utilisateurs :', err.message);
  }

  process.env.PORT = String(PORT);
  process.env.DATABASE_URL = testDbUrl;

  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require('../dist/src/app.module');
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  await app.listen(PORT);
  console.log(`[Test Server] NestJS démarré sur http://localhost:${PORT}`);

  const baseUrl = `http://localhost:${PORT}/api/landing`;
  let passed = 0;
  let failed = 0;
  const createdIds = [];

  function assert(desc, condition, details = '') {
    if (condition) {
      console.log(`  ✓ ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ ÉCHEC : ${desc} ${details}`);
      failed++;
    }
  }

  try {
    // 1. Test création atelier BROUILLON (succès sans photoAlt ni droitImageConfirme)
    console.log('\n--- 1. Création d\'un atelier en BROUILLON ---');
    const resBrouillon = await fetch(`${baseUrl}/campus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        titre: 'Atelier Test Brouillon Étape 4',
        description: 'Description atelier de test en mode brouillon',
        badge: 'Test & Qualité',
        equipements: 'Équipements de test v4',
        statut: 'BROUILLON',
        droitImageConfirme: false,
      }),
    });
    assert('Création brouillon autorisée sans contrainte de publication', resBrouillon.status === 201, `Status: ${resBrouillon.status}`);
    const brouillon = await resBrouillon.json();
    if (brouillon?.id) createdIds.push(brouillon.id);

    // 2. Test publication refusée si droitImageConfirme = false
    console.log('\n--- 2. Validation droitImageConfirme obligatoire pour PUBLIE ---');
    const resRefusDroit = await fetch(`${baseUrl}/campus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        titre: 'Atelier Sans Droit Image',
        description: 'Tentative de publication sans attestation',
        badge: 'Test',
        equipements: 'Matériel test',
        photoUrl: '/uploads/campus/dummy-test.webp',
        photoAlt: 'Description valide de la photo pour test',
        statut: 'PUBLIE',
        droitImageConfirme: false,
      }),
    });
    assert('Publication refusée avec 400 si droitImageConfirme = false', resRefusDroit.status === 400, `Status: ${resRefusDroit.status}`);

    // 3. Test publication refusée si photoAlt manquant ou invalide
    console.log('\n--- 3. Validation photoAlt obligatoire pour PUBLIE ---');
    const resRefusAlt1 = await fetch(`${baseUrl}/campus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        titre: 'Atelier Sans Alt',
        description: 'Tentative de publication sans photoAlt',
        badge: 'Test',
        equipements: 'Matériel test',
        photoUrl: '/uploads/campus/dummy-test.webp',
        photoAlt: '',
        statut: 'PUBLIE',
        droitImageConfirme: true,
      }),
    });
    assert('Publication refusée avec 400 si photoAlt vide', resRefusAlt1.status === 400, `Status: ${resRefusAlt1.status}`);

    const resRefusAlt2 = await fetch(`${baseUrl}/campus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        titre: 'Atelier Alt Migration',
        description: 'Tentative de publication avec alt [MIGRATION]',
        badge: 'Test',
        equipements: 'Matériel test',
        photoUrl: '/uploads/campus/dummy-test.webp',
        photoAlt: '[MIGRATION] Photo atelier par défaut',
        statut: 'PUBLIE',
        droitImageConfirme: true,
      }),
    });
    assert('Publication refusée avec 400 si photoAlt commence par [MIGRATION]', resRefusAlt2.status === 400, `Status: ${resRefusAlt2.status}`);

    // 4. Test publication valide (fichiers locaux réels créés sous uploads/campus)
    console.log('\n--- 4. Publication conforme d\'un atelier ---');
    const campusDir = path.join(process.cwd(), 'uploads', 'campus');
    if (!fs.existsSync(campusDir)) fs.mkdirSync(campusDir, { recursive: true });
    const realTestFile = path.join(campusDir, 'test-publie-sharp-step4.webp');
    const realTestMobile = path.join(campusDir, 'test-publie-sharp-step4-mobile.webp');
    fs.writeFileSync(realTestFile, Buffer.from('FAKE-WEBP-FOR-STEP4-TEST'));
    fs.writeFileSync(realTestMobile, Buffer.from('FAKE-WEBP-FOR-STEP4-MOBILE'));

    const resPublie = await fetch(`${baseUrl}/campus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        titre: 'Laboratoire Énergies Renouvelables Step4',
        description: 'Plateforme pédagogique solaire et éolienne aux normes industrielles',
        badge: 'Énergie & Climat',
        equipements: 'Simulateurs solaires, Onduleurs hybrides, Bancs de mesure',
        photoUrl: '/uploads/campus/test-publie-sharp-step4.webp',
        photoUrlMobile: '/uploads/campus/test-publie-sharp-step4-mobile.webp',
        photoAlt: 'Atelier technique équipé de bancs solaires pédagogiques et onduleurs',
        statut: 'PUBLIE',
        droitImageConfirme: true,
        afficherLanding: true,
      }),
    });
    assert('Publication réussie avec code 201', resPublie.status === 201, `Status: ${resPublie.status}`);
    const atelierPublie = await resPublie.json();
    if (atelierPublie?.id) createdIds.push(atelierPublie.id);

    // 5. Vérification que l'auteur et la date sont attribués par le serveur
    assert('droitImageAuteur attribué depuis le jeton JWT', atelierPublie.droitImageAuteur === 'bahatilegrand@gmail.com', `Auteur: ${atelierPublie.droitImageAuteur}`);
    assert('droitImageDate renseigné automatiquement', Boolean(atelierPublie.droitImageDate));

    // 6. Test Règle 10 : changement d'image réinitialise droitImageConfirme à false
    console.log('\n--- 5. Règle 10 : réinitialisation automatique du droit sur changement d\'image ---');
    const realTestFileV2 = path.join(campusDir, 'test-publie-sharp-step4-v2.webp');
    fs.writeFileSync(realTestFileV2, Buffer.from('FAKE-WEBP-FOR-STEP4-V2'));

    const resUpdateImage = await fetch(`${baseUrl}/campus/${atelierPublie.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        photoUrl: '/uploads/campus/test-publie-sharp-step4-v2.webp',
      }),
    });
    const updated = await resUpdateImage.json();
    assert('Changement d\'image repasse droitImageConfirme à false', updated.droitImageConfirme === false, `droitImageConfirme: ${updated.droitImageConfirme}`);

    if (fs.existsSync(realTestFileV2)) fs.unlinkSync(realTestFileV2);
    if (fs.existsSync(realTestMobile)) fs.unlinkSync(realTestMobile);

    // 7. Test de sécurité : accès refusé aux non-admins
    console.log('\n--- 6. Sécurité des routes (RBAC) ---');
    const resApprenant = await fetch(`${baseUrl}/campus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apprenantToken}`,
      },
      body: JSON.stringify({ titre: 'Hack', description: 'desc', equipements: 'eq' }),
    });
    assert('Refus 403 Forbidden pour rôle APPRENANT', resApprenant.status === 403, `Status: ${resApprenant.status}`);

    const resAnonyme = await fetch(`${baseUrl}/campus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: 'Hack', description: 'desc', equipements: 'eq' }),
    });
    assert('Refus 401 Unauthorized sans jeton JWT', resAnonyme.status === 401, `Status: ${resAnonyme.status}`);

    // Nettoyage du fichier temporaire de test
    if (fs.existsSync(realTestFile)) fs.unlinkSync(realTestFile);

  } catch (err) {
    console.error('Erreur non gérée pendant le test :', err);
    failed++;
  } finally {
    // Nettoyage en base de test
    if (createdIds.length > 0) {
      console.log(`\n[Nettoyage] Suppression des ${createdIds.length} enregistrements de test du schéma test_landing...`);
      for (const id of createdIds) {
        try {
          await pool.query('DELETE FROM test_landing.landing_page_campus WHERE id = $1', [id]);
        } catch (e) {}
      }
      console.log('✓ Données de test purgées avec succès du schéma test_landing.');
    }
    await pool.end();
    await app.close();
  }

  console.log(`\n=== RÉSULTATS : ${passed} passés, ${failed} échoués ===`);
  if (failed > 0) process.exit(1);
}

runStep4Tests();
