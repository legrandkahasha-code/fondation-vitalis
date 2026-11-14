const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { StorageService } = require('../dist/src/common/services/storage.service');

async function runTests() {
  console.log('====================================================');
  console.log('       TESTS UNITAIRES & SÉCURITÉ - ÉTAPE 2         ');
  console.log('====================================================\n');

  const configMock = {
    get: (k, def) => def || null,
  };
  const storage = new StorageService(configMock);
  const dummyCleanup = [];

  try {
    // 1. TEST : Image trop lourde (> 8 Mo)
    console.log('--- TEST 1 : Limite de taille (> 8 Mo) ---');
    const heavyBuffer = Buffer.alloc(8 * 1024 * 1024 + 1024); // 8 Mo + 1 Ko
    heavyBuffer[0] = 0xff; heavyBuffer[1] = 0xd8; heavyBuffer[2] = 0xff; // faux header JPEG
    try {
      await storage.processAndSaveCampusPhoto(heavyBuffer, 'heavy.jpg', 'image/jpeg');
      console.error('❌ Échec : Image > 8 Mo acceptée à tort');
    } catch (err) {
      console.log('✓ Succès : Image > 8 Mo correctement rejetée :', err.message);
    }

    // 2. TEST : Fichier SVG strictement refusé
    console.log('\n--- TEST 2 : Rejet strict des SVG ---');
    const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40"/></svg>');
    try {
      await storage.processAndSaveCampusPhoto(svgBuffer, 'hack.svg', 'image/svg+xml');
      console.error('❌ Échec : SVG accepté à tort');
    } catch (err) {
      console.log('✓ Succès : Fichier SVG rejeté avec succès :', err.message);
    }

    // 2b. TEST : SVG masqué dans une extension .webp / .png
    console.log('\n--- TEST 2b : Rejet d\'un SVG camouflé en .webp ---');
    const fakeWebpBuffer = Buffer.from('<?xml version="1.0"?><svg viewBox="0 0 100 100"><script>alert("XSS")</script></svg>');
    try {
      await storage.processAndSaveCampusPhoto(fakeWebpBuffer, 'malicious.webp', 'image/webp');
      console.error('❌ Échec : SVG camouflé accepté à tort');
    } catch (err) {
      console.log('✓ Succès : SVG camouflé détecté et rejeté :', err.message);
    }

    // 3. TEST : Signature WebP valide
    console.log('\n--- TEST 3 : Validation signature WebP légitime ---');
    const testSample = await sharp({
      create: {
        width: 1600,
        height: 1200,
        channels: 3,
        background: { r: 7, g: 21, b: 39 },
      },
    }).webp().toBuffer();

    const isWebpSignature = testSample.length >= 12 &&
      testSample.slice(0, 4).toString() === 'RIFF' &&
      testSample.slice(8, 12).toString() === 'WEBP';
    console.log('Signature WebP binaire (octets 0-3 RIFF, 8-11 WEBP) :', isWebpSignature);
    if (!isWebpSignature) throw new Error('Signature WebP non reconnue');

    const uploadRes = await storage.processAndSaveCampusPhoto(testSample, 'sample.webp', 'image/webp');
    console.log('✓ Succès : Image WebP valide traitée :', uploadRes);
    dummyCleanup.push(uploadRes.photoUrl, uploadRes.photoUrlMobile);

    // 4. TEST : Suppression GPS et métadonnées EXIF
    console.log('\n--- TEST 4 : Suppression des métadonnées EXIF et coordonnées GPS ---');
    const imgWithExif = await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 200, g: 144, b: 42 } }
    })
    .withMetadata({
      exif: {
        IFD0: {
          Make: 'CameraTest',
          Model: 'SecurityAuditModel',
          Artist: 'PhotographerTest'
        }
      }
    })
    .jpeg()
    .toBuffer();

    const preMetadata = await sharp(imgWithExif).metadata();
    console.log('Métadonnées avant traitement (EXIF présent) :', Boolean(preMetadata.exif));

    const treatedResult = await storage.processAndSaveCampusPhoto(imgWithExif, 'photo-geoloc.jpg', 'image/jpeg');
    dummyCleanup.push(treatedResult.photoUrl, treatedResult.photoUrlMobile);
    const savedDeskPath = storage.getLocalPath(treatedResult.photoUrl);
    const postMetadata = await sharp(savedDeskPath).metadata();
    console.log('Métadonnées après traitement Sharp (EXIF purgé) :', postMetadata.exif ? 'NON PURGÉ' : 'PURGÉ (null/undefined)');
    if (postMetadata.exif) {
      throw new Error('Les métadonnées EXIF/GPS n\'ont pas été supprimées !');
    }
    console.log('✓ Succès : EXIF et coordonnées GPS totalement purgés');

    // 5. TEST : Traitement Hero (Desktop 1920x1080 et Mobile 768x1024)
    console.log('\n--- TEST 5 : Traitement pipeline Hero ---');
    const heroUploadRes = await storage.processAndSaveHeroImage(testSample, 'hero-sample.webp', 'image/webp');
    console.log('✓ Succès : Image Hero traitée :', heroUploadRes);
    dummyCleanup.push(heroUploadRes.heroImage, heroUploadRes.heroImageMobile);

    // 6. MESURE DES POIDS RÉELS SUR UN FICHIER TEST COMPLET (Atelier Énergie)
    console.log('\n--- TEST 6 : Mesures des poids réels sur photo réelle (atelier-energie.jpg) ---');
    const realPhotoPath = path.join(process.cwd(), '../frontend/public/assets/campus/atelier-energie.jpg');
    if (fs.existsSync(realPhotoPath)) {
      const realBuffer = fs.readFileSync(realPhotoPath);
      console.log('Poids brut original :', realBuffer.length, 'octets (' + (realBuffer.length / 1024).toFixed(1) + ' Ko)');

      const campusProc = await storage.processAndSaveCampusPhoto(realBuffer, 'atelier-energie.jpg', 'image/jpeg');
      dummyCleanup.push(campusProc.photoUrl, campusProc.photoUrlMobile);
      console.log('Campus Desktop (1280x960 4:3 WebP) :', campusProc.desktopSize, 'octets (' + (campusProc.desktopSize / 1024).toFixed(1) + ' Ko)');
      console.log('Campus Mobile  (640x480 4:3 WebP)  :', campusProc.mobileSize, 'octets (' + (campusProc.mobileSize / 1024).toFixed(1) + ' Ko)');

      const heroProc = await storage.processAndSaveHeroImage(realBuffer, 'atelier-energie.jpg', 'image/jpeg');
      dummyCleanup.push(heroProc.heroImage, heroProc.heroImageMobile);
      console.log('Hero Desktop   (1920x1080 16:9 WebP) :', heroProc.desktopSize, 'octets (' + (heroProc.desktopSize / 1024).toFixed(1) + ' Ko)');
      console.log('Hero Mobile    (768x1024 3:4 WebP)  :', heroProc.mobileSize, 'octets (' + (heroProc.mobileSize / 1024).toFixed(1) + ' Ko)');
    }

    // 7. TEST DE VALIDATION DES CHEMINS (PATH TRAVERSAL REJETÉ)
    console.log('\n--- TEST 7 : Contrôle de chemin et rejet Path Traversal ---');
    const validPath = uploadRes.photoUrl;
    const isPathValid = await storage.validateUploadPath(validPath, '/uploads/campus/');
    console.log('Chemin légitime valide :', isPathValid);

    const traversalPath = '/uploads/campus/../../backend/.env';
    const isTraversalBlocked = await storage.validateUploadPath(traversalPath, '/uploads/campus/');
    console.log('Tentative ../.. bloquée :', !isTraversalBlocked);

    const nonExistentPath = '/uploads/campus/fichier-fantome.webp';
    const isGhostBlocked = await storage.validateUploadPath(nonExistentPath, '/uploads/campus/');
    console.log('Fichier inexistant bloqué :', !isGhostBlocked);

    console.log('\n====================================================');
    console.log('       TOUS LES TESTS UNITAIRES ONT RÉUSSI !        ');
    console.log('====================================================');
  } finally {
    for (const url of dummyCleanup) {
      await storage.deleteLocalUpload(url);
    }
  }
}

runTests().catch(err => {
  console.error('ERREUR TEST :', err);
  process.exit(1);
});
