/**
 * Tests des règles de publication, sécurité des données et projection publique (Étape 2 - Point 11 & 4)
 */
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET;
const PORT = 3098;

// Jetons de test signés avec de VRAIS utilisateurs de la base
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
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function runPublicationTests() {
  console.log('=== TESTS RÈGLES DE PUBLICATION ET PROJECTION PUBLIQUE (POINT 11 & 4) ===\n');

  process.env.PORT = String(PORT);
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require('../dist/src/app.module');
  const { StorageService } = require('../dist/src/common/services/storage.service');

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  await app.listen(PORT);
  console.log(`Serveur Nest de test démarré sur http://localhost:${PORT}`);

  const storage = app.get(StorageService);
  const dummyFiles = [];

  // Création de 2 fichiers locaux réels pour les tests de publication
  const campusUploadDir = path.join(process.cwd(), 'uploads', 'campus');
  if (!fs.existsSync(campusUploadDir)) fs.mkdirSync(campusUploadDir, { recursive: true });
  const testDesktopFile = path.join(campusUploadDir, 'campus-test-desktop.webp');
  const testMobileFile = path.join(campusUploadDir, 'campus-test-mobile.webp');
  fs.writeFileSync(testDesktopFile, Buffer.from('RIFF....WEBPVP8 '));
  fs.writeFileSync(testMobileFile, Buffer.from('RIFF....WEBPVP8 '));
  dummyFiles.push('/uploads/campus/campus-test-desktop.webp', '/uploads/campus/campus-test-mobile.webp');

  const testOldDesktopFile = path.join(campusUploadDir, 'campus-old-desktop.webp');
  const testOldMobileFile = path.join(campusUploadDir, 'campus-old-mobile.webp');
  fs.writeFileSync(testOldDesktopFile, Buffer.from('RIFF....WEBPVP8 '));
  fs.writeFileSync(testOldMobileFile, Buffer.from('RIFF....WEBPVP8 '));
  dummyFiles.push('/uploads/campus/campus-old-desktop.webp', '/uploads/campus/campus-old-mobile.webp');

  const insertedIds = [];

  try {
    // -------------------------------------------------------------
    // POINT 4 : VÉRIFICATION DU GET /api/landing/public AVEC BROUILLON ET PUBLIÉ
    // -------------------------------------------------------------
    console.log('\n--- POINT 4 : VÉRIFICATION DU FILTRE PUBLIC (BROUILLON vs PUBLIÉ) ---');

    // Invalidation préalable du cache RAM
    const { LandingService } = require('../dist/src/modules/landing/landing.service');
    LandingService.invalidateCache();

    // 1. Insertion directe en base d'un atelier en BROUILLON
    const resBrouillonDb = await pool.query(`
      INSERT INTO landing_page_campus (titre, description, photo_url, photo_url_mobile, photo_alt, badge, equipements, ordre, actif, afficher_landing, afficher_mobile, statut, droit_image_confirme, droit_image_auteur, droit_image_date)
      VALUES ('Atelier Test Brouillon', 'Description brouillon', '/uploads/campus/campus-test-desktop.webp', '/uploads/campus/campus-test-mobile.webp', 'Alt brouillon', 'Badge B', 'Equip B', 99, true, true, true, 'BROUILLON', false, 'admin@test.fr', NOW())
      RETURNING id;
    `);
    const idBrouillon = resBrouillonDb.rows[0].id;
    insertedIds.push(idBrouillon);

    // 2. Insertion directe en base d'un atelier en PUBLIÉ
    const resPublieDb = await pool.query(`
      INSERT INTO landing_page_campus (titre, description, photo_url, photo_url_mobile, photo_alt, badge, equipements, ordre, actif, afficher_landing, afficher_mobile, statut, droit_image_confirme, droit_image_auteur, droit_image_date)
      VALUES ('Atelier Test Publié', 'Description publiée officielle', '/uploads/campus/campus-test-desktop.webp', '/uploads/campus/campus-test-mobile.webp', 'Salle de cours pratique équipée', 'Badge P', 'Equip P', 1, true, true, true, 'PUBLIE', true, 'secret_author_should_not_leak@test.fr', NOW())
      RETURNING id;
    `);
    const idPublie = resPublieDb.rows[0].id;
    insertedIds.push(idPublie);

    // 3. Appel de la route publique GET /api/landing/public
    LandingService.invalidateCache();
    const resPublic = await fetch(`http://localhost:${PORT}/api/landing/public`);
    const jsonPublic = await resPublic.json();

    console.log('Status code GET /api/landing/public :', resPublic.status);
    console.log('Nombre total d\'ateliers dans la réponse publique :', jsonPublic.campus?.length);
    console.log('JSON BRUT retourné pour data.campus :');
    console.log(JSON.stringify(jsonPublic.campus, null, 2));

    const contientBrouillon = jsonPublic.campus?.some((c) => c.id === idBrouillon || c.titre.includes('Brouillon'));
    console.log('L\'atelier BROUILLON apparaît-il dans la réponse ? :', contientBrouillon ? '❌ OUI (ERREUR)' : '✓ NON (Parfaitement filtré)');

    const premierItem = jsonPublic.campus?.find((c) => c.id === idPublie);
    if (premierItem) {
      console.log('Champs exposés sur l\'atelier publié :', Object.keys(premierItem));
      const hasAuteur = 'droitImageAuteur' in premierItem || 'droit_image_auteur' in premierItem;
      const hasDate = 'droitImageDate' in premierItem || 'droit_image_date' in premierItem;
      const hasStatut = 'statut' in premierItem;
      console.log('Fuite droitImageAuteur  :', hasAuteur ? '❌ FUITE' : '✓ AUCUNE FUITE');
      console.log('Fuite droitImageDate    :', hasDate ? '❌ FUITE' : '✓ AUCUNE FUITE');
      console.log('Fuite statut interne    :', hasStatut ? '❌ FUITE' : '✓ AUCUNE FUITE');
    }

    // -------------------------------------------------------------
    // POINT 11 : RÈGLES DE PUBLICATION STRICTES VIA L'API
    // -------------------------------------------------------------
    console.log('\n--- POINT 11 : RÈGLES DE PUBLICATION STRICTES VIA L\'API ---');

    // 1. PUBLIE sans confirmation de droit à l'image -> 400
    console.log('\n1. Test PUBLIE sans droit à l\'image :');
    const resNoDroit = await fetch(`http://localhost:${PORT}/api/landing/campus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        titre: 'Atelier Sans Droit',
        description: 'Description valide',
        equipements: 'Equipements valides',
        photoUrl: '/uploads/campus/campus-test-desktop.webp',
        photoUrlMobile: '/uploads/campus/campus-test-mobile.webp',
        photoAlt: 'Description alternative valide',
        statut: 'PUBLIE',
        droitImageConfirme: false,
      }),
    });
    console.log('Status code sans droit à l\'image :', resNoDroit.status, resNoDroit.status === 400 ? '✓ (400 Bad Request)' : '❌');
    const errNoDroit = await resNoDroit.json();
    console.log('Message d\'erreur                 :', errNoDroit.message);

    // 2. Photo URL externe (ex. https://unsplash.com) -> 400
    console.log('\n2. Test photoUrl externe (https://...) :');
    const resExterne = await fetch(`http://localhost:${PORT}/api/landing/campus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        titre: 'Atelier Externe',
        description: 'Description valide',
        equipements: 'Equipements valides',
        photoUrl: 'https://images.unsplash.com/photo-test',
        photoUrlMobile: 'https://images.unsplash.com/photo-test',
        photoAlt: 'Description valide',
        statut: 'PUBLIE',
        droitImageConfirme: true,
      }),
    });
    console.log('Status code photo externe :', resExterne.status, resExterne.status === 400 ? '✓ (400 Bad Request)' : '❌');
    const errExterne = await resExterne.json();
    console.log('Message d\'erreur          :', errExterne.message);

    // 3. Chemin avec traversée (..) -> 400
    console.log('\n3. Test chemin avec traversée (..) :');
    const resPathTrav = await fetch(`http://localhost:${PORT}/api/landing/campus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        titre: 'Atelier Traversée',
        description: 'Description valide',
        equipements: 'Equipements valides',
        photoUrl: '/uploads/campus/../../etc/passwd',
        photoUrlMobile: '/uploads/campus/test-mobile.webp',
        photoAlt: 'Description valide',
        statut: 'BROUILLON',
      }),
    });
    console.log('Status code traversée (..) :', resPathTrav.status, resPathTrav.status === 400 ? '✓ (400 Bad Request)' : '❌');
    const errPathTrav = await resPathTrav.json();
    console.log('Message d\'erreur           :', errPathTrav.message);

    // 4. photoAlt temporaire "[MIGRATION]..." pour publication -> 400
    console.log('\n4. Test photoAlt avec [MIGRATION] :');
    const resMigrationAlt = await fetch(`http://localhost:${PORT}/api/landing/campus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        titre: 'Atelier Alt Migration',
        description: 'Description valide',
        equipements: 'Equipements valides',
        photoUrl: '/uploads/campus/campus-test-desktop.webp',
        photoUrlMobile: '/uploads/campus/campus-test-mobile.webp',
        photoAlt: '[MIGRATION] Description d\'accessibilité requise',
        statut: 'PUBLIE',
        droitImageConfirme: true,
      }),
    });
    console.log('Status code alt migration :', resMigrationAlt.status, resMigrationAlt.status === 400 ? '✓ (400 Bad Request)' : '❌');
    const errMigrationAlt = await resMigrationAlt.json();
    console.log('Message d\'erreur          :', errMigrationAlt.message);

    // 5. Remplacement d'image -> réinitialisation du droit à false et suppression physique des anciens fichiers
    console.log('\n5. Test remplacement d\'image (reset droit à false + suppression physique) :');
    // Créer d'abord un atelier avec l'ancienne image
    const resCreateOld = await fetch(`http://localhost:${PORT}/api/landing/campus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        titre: 'Atelier Remplacement',
        description: 'Description initiale',
        equipements: 'Equipements initiaux',
        photoUrl: '/uploads/campus/campus-old-desktop.webp',
        photoUrlMobile: '/uploads/campus/campus-old-mobile.webp',
        photoAlt: 'Photo initiale',
        statut: 'BROUILLON',
        droitImageConfirme: true,
      }),
    });
    const createdItem = await resCreateOld.json();
    insertedIds.push(createdItem.id);

    console.log('Fichier ancien présent avant remplacement sur disque :', fs.existsSync(testOldDesktopFile) ? '✓ OUI' : '❌ NON');

    // Mettre à jour avec la nouvelle photo
    const resUpdatePhoto = await fetch(`http://localhost:${PORT}/api/landing/campus/${createdItem.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        photoUrl: '/uploads/campus/campus-test-desktop.webp',
        photoUrlMobile: '/uploads/campus/campus-test-mobile.webp',
      }),
    });
    const updatedItem = await resUpdatePhoto.json();
    console.log('Droit à l\'image après changement de photo :', updatedItem.droitImageConfirme, updatedItem.droitImageConfirme === false ? '✓ (Réinitialisé à false)' : '❌');
    console.log('Ancien fichier desktop supprimé du disque :', !fs.existsSync(testOldDesktopFile) ? '✓ OUI (Suppression physique confirmée)' : '❌ NON');

    // 6. Sécurité de l'auteur et de la date (écrasement/rejet des valeurs forgées par le client)
    console.log('\n6. Test forge auteur et date dans payload :');
    const resForge = await fetch(`http://localhost:${PORT}/api/landing/campus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        titre: 'Atelier Anti-Forge',
        description: 'Description valide',
        equipements: 'Equipements valides',
        photoUrl: '/uploads/campus/campus-test-desktop.webp',
        photoUrlMobile: '/uploads/campus/campus-test-mobile.webp',
        photoAlt: 'Photo valide',
        droitImageConfirme: true,
        droitImageAuteur: 'hacker@malicious.com',
        droitImageDate: '1970-01-01T00:00:00.000Z',
      }),
    });
    console.log('Tentative injection auteur par le client (statut) :', resForge.status, resForge.status === 400 ? '✓ (400 Bad Request - Propriétés non-autorisées strictement rejetées)' : '❌');

    // Création légitime avec confirmation du droit -> auteur pris automatiquement du token JWT
    const resLegit = await fetch(`http://localhost:${PORT}/api/landing/campus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        titre: 'Atelier Auteur Automatique',
        description: 'Description valide',
        equipements: 'Equipements valides',
        photoUrl: '/uploads/campus/campus-test-desktop.webp',
        photoUrlMobile: '/uploads/campus/campus-test-mobile.webp',
        photoAlt: 'Photo valide',
        droitImageConfirme: true,
      }),
    });
    const legitItem = await resLegit.json();
    if (legitItem.id) insertedIds.push(legitItem.id);
    console.log('Auteur automatiquement extrait du jeton JWT       :', legitItem.droitImageAuteur, legitItem.droitImageAuteur === 'bahatilegrand@gmail.com' ? '✓ (bahatilegrand@gmail.com validé)' : '❌');

    // 7. Test injection <script> dans titre et description -> 400
    console.log('\n7. Test injection <script> :');
    const resXss = await fetch(`http://localhost:${PORT}/api/landing/campus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        titre: 'Atelier <script>alert("XSS")</script>',
        description: 'Description <script src="malicious.js"></script>',
        equipements: 'Equipements normaux',
      }),
    });
    console.log('Status code injection <script> :', resXss.status, resXss.status === 400 ? '✓ (400 Bad Request)' : '❌');
    const errXss = await resXss.json();
    console.log('Message d\'erreur              :', errXss.message);

    // 8. Contrôle des accès sans jeton et avec rôle non-admin
    console.log('\n8. Contrôle des accès sans jeton (401) et APPRENANT (403) :');
    const resNoAuth = await fetch(`http://localhost:${PORT}/api/landing/campus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: 'Atelier Anonyme' }),
    });
    console.log('POST /campus sans jeton   :', resNoAuth.status, resNoAuth.status === 401 ? '✓ (401 Unauthorized)' : '❌');

    const resForbidden = await fetch(`http://localhost:${PORT}/api/landing/campus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apprenantToken}` },
      body: JSON.stringify({ titre: 'Atelier Apprenant' }),
    });
    console.log('POST /campus APPRENANT    :', resForbidden.status, resForbidden.status === 403 ? '✓ (403 Forbidden)' : '❌');

  } finally {
    // Nettoyage rigoureux de la base de données
    if (insertedIds.length > 0) {
      await pool.query('DELETE FROM landing_page_campus WHERE id = ANY($1::uuid[]);', [insertedIds]);
      console.log(`\nNettoyage DB : ${insertedIds.length} enregistrements de test supprimés.`);
    }
    // Nettoyage des fichiers temporaires restants
    for (const f of dummyFiles) {
      await storage.deleteLocalUpload(f);
    }
    await pool.end();
    await app.close();
    console.log('Serveur de test arrêté.');
  }
}

runPublicationTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erreur test publication :', err);
    process.exit(1);
  });
