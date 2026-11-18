/**
 * Tests réels via HTTP sur les routes d'upload (Étape 2 - Point 10 & 6)
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET;
const PORT = 3099;

// Token admin signé dynamiquement avec un admin ACTIF de la base
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

async function runUploadTests() {
  console.log('=== TESTS HTTP VALIDATION D\'UPLOAD (POINT 10 & 6) ===\n');

  process.env.PORT = String(PORT);
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require('../dist/src/app.module');
  const { StorageService } = require('../dist/src/common/services/storage.service');

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  await app.listen(PORT);
  console.log(`Serveur Nest de test démarré sur http://localhost:${PORT}`);

  const storage = app.get(StorageService);
  const createdFilesToCleanup = [];

  try {
    // -------------------------------------------------------------
    // (a) SVG renommé en .jpg -> Attendu : 400
    // -------------------------------------------------------------
    console.log('\n--- (a) TEST SVG RENOMMÉ EN .JPG ---');
    const fakeJpgSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40"/></svg>');
    const formA = new FormData();
    formA.append('file', new Blob([fakeJpgSvg], { type: 'image/jpeg' }), 'malicious.jpg');

    const resA = await fetch(`http://localhost:${PORT}/api/landing/campus/upload-photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formA,
    });
    console.log('Status code SVG renommé .jpg :', resA.status, resA.status === 400 ? '✓ (400 Bad Request)' : '❌');
    const jsonA = await resA.json();
    console.log('Message d\'erreur reçu          :', jsonA.message);

    // -------------------------------------------------------------
    // (b) Faux WebP (RIFF + WAVE audio) -> Attendu : 400
    // -------------------------------------------------------------
    console.log('\n--- (b) TEST FAUX WEBP (RIFF/WAVE) ---');
    const fakeWebpWave = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([0x24, 0x00, 0x00, 0x00]),
      Buffer.from('WAVEfmt '),
    ]);
    const formB = new FormData();
    formB.append('file', new Blob([fakeWebpWave], { type: 'image/webp' }), 'fake.webp');

    const resB = await fetch(`http://localhost:${PORT}/api/landing/campus/upload-photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formB,
    });
    console.log('Status code faux WebP (RIFF/WAVE) :', resB.status, resB.status === 400 ? '✓ (400 Bad Request)' : '❌');
    const jsonB = await resB.json();
    console.log('Message d\'erreur reçu              :', jsonB.message);

    // -------------------------------------------------------------
    // (c) Fichier de plus de 8 Mo -> Attendu : refus (400 ou Multer limit)
    // -------------------------------------------------------------
    console.log('\n--- (c) TEST FICHIER > 8 MO ---');
    const bigBuffer = Buffer.alloc(8.5 * 1024 * 1024); // 8.5 Mo
    const formC = new FormData();
    formC.append('file', new Blob([bigBuffer], { type: 'image/jpeg' }), 'too-big.jpg');

    const resC = await fetch(`http://localhost:${PORT}/api/landing/campus/upload-photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formC,
    });
    console.log('Status code fichier 8.5 Mo :', resC.status, (resC.status === 400 || resC.status === 413) ? '✓ (Refus taille excessive)' : '❌');

    // -------------------------------------------------------------
    // (d) Image > 50 Mpx -> Attendu : 400 (limitInputPixels)
    // -------------------------------------------------------------
    console.log('\n--- (d) TEST IMAGE > 50 MPX (LIMIT INPUT PIXELS) ---');
    // Création d'une image JPEG de 8000x7000 = 56 Mpx (taille compressée modeste)
    const bigPixelJpeg = await sharp({
      create: {
        width: 8000,
        height: 7000,
        channels: 3,
        background: { r: 10, g: 10, b: 10 },
      },
    })
      .jpeg({ quality: 20 })
      .toBuffer();

    const formD = new FormData();
    formD.append('file', new Blob([bigPixelJpeg], { type: 'image/jpeg' }), '56mpx.jpg');

    const resD = await fetch(`http://localhost:${PORT}/api/landing/campus/upload-photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formD,
    });
    console.log('Status code image 56 Mpx :', resD.status, resD.status === 400 ? '✓ (400 Bad Request - limitInputPixels respecté)' : '❌');
    const jsonD = await resD.json();
    console.log('Message d\'erreur reçu     :', jsonD.message);

    // -------------------------------------------------------------
    // (e) Image trop petite pour le hero (< 1280x720) -> Attendu : 400
    // -------------------------------------------------------------
    console.log('\n--- (e) TEST IMAGE TROP PETITE POUR LE HERO (< 1280x720) ---');
    const smallHeroJpeg = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 7, g: 21, b: 39 },
      },
    })
      .jpeg({ quality: 80 })
      .toBuffer();

    const formE = new FormData();
    formE.append('file', new Blob([smallHeroJpeg], { type: 'image/jpeg' }), 'small-hero.jpg');

    const resE = await fetch(`http://localhost:${PORT}/api/landing/hero/upload-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formE,
    });
    console.log('Status code image hero 800x600 :', resE.status, resE.status === 400 ? '✓ (400 Bad Request - Dimension minimale refusée)' : '❌');
    const jsonE = await resE.json();
    console.log('Message d\'erreur reçu          :', jsonE.message);

    // -------------------------------------------------------------
    // (f) PNG valide -> Attendu : 2 fichiers créés, nom généré, /uploads/campus/...
    // -------------------------------------------------------------
    console.log('\n--- (f) TEST PNG VALIDE (SUCCÈS D\'UPLOAD CAMPUS) ---');
    const validPng = await sharp({
      create: {
        width: 1280,
        height: 960,
        channels: 4,
        background: { r: 200, g: 144, b: 42, alpha: 1 }, // --or
      },
    })
      .png()
      .toBuffer();

    const formF = new FormData();
    formF.append('file', new Blob([validPng], { type: 'image/png' }), 'atelier-valid.png');

    const resF = await fetch(`http://localhost:${PORT}/api/landing/campus/upload-photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formF,
    });
    console.log('Status code PNG valide :', resF.status, (resF.status === 200 || resF.status === 201) ? '✓ (Succès)' : '❌');
    const jsonF = await resF.json();
    console.log('Réponse JSON reçue     :', jsonF);

    if (jsonF.photoUrl) createdFilesToCleanup.push(jsonF.photoUrl);
    if (jsonF.photoUrlMobile) createdFilesToCleanup.push(jsonF.photoUrlMobile);

    const desktopExists = fs.existsSync(storage.getLocalPath(jsonF.photoUrl));
    const mobileExists = fs.existsSync(storage.getLocalPath(jsonF.photoUrlMobile));
    console.log('Fichier desktop créé sur disque :', desktopExists ? '✓ OUI' : '❌ NON');
    console.log('Fichier mobile créé sur disque  :', mobileExists ? '✓ OUI' : '❌ NON');
    console.log('Nom généré avec UUID            :', !jsonF.photoUrl.includes('atelier-valid') ? '✓ OUI' : '❌ NON');

    // -------------------------------------------------------------
    // Point 6 : Preuve que l'upload d'actualités fonctionne toujours
    // -------------------------------------------------------------
    console.log('\n--- POINT 6 : PREUVE UPLOAD ACTUALITÉ VIA STORAGE SERVICE ---');
    const actualiteImg = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 39, g: 107, b: 68 }, // --vert
      },
    })
      .jpeg()
      .toBuffer();

    const actualiteUrl = await storage.uploadFile(actualiteImg, 'communique.jpg', 'image/jpeg', 'actualites/images');
    console.log('URL générée pour l\'actualité :', actualiteUrl);
    const actualiteFileExists = fs.existsSync(storage.getLocalPath(actualiteUrl));
    console.log('Fichier actualité sur le disque  :', actualiteFileExists ? '✓ PRÉSENT (Fonctionne à 100% comme avant)' : '❌ NON');
    if (actualiteUrl) createdFilesToCleanup.push(actualiteUrl);

  } finally {
    // Nettoyage de tous les fichiers créés
    for (const url of createdFilesToCleanup) {
      await storage.deleteLocalUpload(url);
    }
    await app.close();
    console.log('\nServeur de test arrêté et fichiers temporaires nettoyés.');
  }
}

runUploadTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erreur test upload HTTP :', err);
    process.exit(1);
  });
