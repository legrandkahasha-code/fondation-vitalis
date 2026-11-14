/**
 * Test de vérification de purge EXIF et GPS (Étape 2 - Point 9)
 * Crée un JPEG enrichi de coordonnées GPS et métadonnées constructeur/auteur via piexifjs,
 * le passe dans les pipelines Sharp Campus et Hero (desktop + mobile),
 * et prouve par lecture binaire et décodage EXIF qu'aucune balise ne subsiste.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const piexif = require('piexifjs');
const { StorageService } = require('../dist/src/common/services/storage.service');

async function testExifGpsPurge() {
  console.log('=== TEST PURGE EXIF ET GPS (POINT 9) ===\n');

  // 1. Génération d'une image JPEG de base 1920x1080
  const rawJpegBuffer = await sharp({
    create: {
      width: 1920,
      height: 1080,
      channels: 3,
      background: { r: 7, g: 21, b: 39 }, // --navy
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer();

  // 2. Injection de métadonnées EXIF et GPS précises (Kinshasa, RDC : -4.325, 15.322)
  const zeroth = {};
  zeroth[piexif.ImageIFD.Make] = 'Canon';
  zeroth[piexif.ImageIFD.Model] = 'Canon EOS R5';
  zeroth[piexif.ImageIFD.Artist] = 'Photographe Vitalis';
  zeroth[piexif.ImageIFD.Software] = 'Adobe Photoshop CC';

  const gps = {};
  gps[piexif.GPSIFD.GPSLatitudeRef] = 'S';
  gps[piexif.GPSIFD.GPSLatitude] = [[4, 1], [19, 1], [30, 1]]; // 4°19'30" S
  gps[piexif.GPSIFD.GPSLongitudeRef] = 'E';
  gps[piexif.GPSIFD.GPSLongitude] = [[15, 1], [19, 1], [19, 1]]; // 15°19'19" E
  gps[piexif.GPSIFD.GPSAltitude] = [300, 1];

  const exifObj = { '0th': zeroth, Exif: {}, GPS: gps };
  const exifBytes = piexif.dump(exifObj);
  const jpegDataUri = 'data:image/jpeg;base64,' + rawJpegBuffer.toString('base64');
  const jpegWithExifDataUri = piexif.insert(exifBytes, jpegDataUri);
  const inputBufferWithExif = Buffer.from(jpegWithExifDataUri.split(',')[1], 'base64');

  // Inspection AVANT
  console.log('--- 1. MÉTADONNÉES AVANT TRAITEMENT SHARP ---');
  const parsedBefore = piexif.load(inputBufferWithExif.toString('binary'));
  console.log('Appareil photo (Make)      :', parsedBefore['0th'][piexif.ImageIFD.Make]);
  console.log('Modèle (Model)             :', parsedBefore['0th'][piexif.ImageIFD.Model]);
  console.log('Auteur (Artist)            :', parsedBefore['0th'][piexif.ImageIFD.Artist]);
  console.log('Logiciel (Software)        :', parsedBefore['0th'][piexif.ImageIFD.Software]);
  console.log('GPS Latitude Ref           :', parsedBefore['GPS'][piexif.GPSIFD.GPSLatitudeRef]);
  console.log('GPS Latitude Degrés        :', parsedBefore['GPS'][piexif.GPSIFD.GPSLatitude]);
  console.log('GPS Longitude Ref          :', parsedBefore['GPS'][piexif.GPSIFD.GPSLongitudeRef]);
  console.log('GPS Longitude Degrés       :', parsedBefore['GPS'][piexif.GPSIFD.GPSLongitude]);

  const metaSharpBefore = await sharp(inputBufferWithExif).metadata();
  console.log('Présence EXIF détectée par Sharp avant :', !!metaSharpBefore.exif);

  // Instanciation de StorageService
  const storage = new StorageService({ get: () => null });

  // 3. Exécution pipeline Campus
  const campusResult = await storage.processAndSaveCampusPhoto(inputBufferWithExif, 'test-exif.jpg', 'image/jpeg');
  // 4. Exécution pipeline Hero
  const heroResult = await storage.processAndSaveHeroImage(inputBufferWithExif, 'test-exif.jpg', 'image/jpeg');

  const variants = [
    { name: 'Campus Desktop', url: campusResult.photoUrl },
    { name: 'Campus Mobile', url: campusResult.photoUrlMobile },
    { name: 'Hero Desktop', url: heroResult.heroImage },
    { name: 'Hero Mobile', url: heroResult.heroImageMobile },
  ];

  console.log('\n--- 2. MÉTADONNÉES APRÈS TRAITEMENT SUR LES 4 VARIANTES WEBP ---');
  for (const v of variants) {
    const fullPath = storage.getLocalPath(v.url);
    const buf = fs.readFileSync(fullPath);
    const meta = await sharp(buf).metadata();

    const strBuf = buf.toString('binary');
    const hasGpsMarkers = strBuf.includes('GPS') || strBuf.includes('Canon') || strBuf.includes('EOS R5') || strBuf.includes('Photographe Vitalis');

    console.log(`Variante [${v.name}] (${path.basename(v.url)}) :`);
    console.log(`  - Format                    : ${meta.format} (${meta.width}x${meta.height})`);
    console.log(`  - Bloc EXIF présent         : ${!!meta.exif} (doit être false)`);
    console.log(`  - Traces textuelles GPS/Appareil : ${hasGpsMarkers ? '❌ DÉTECTÉES' : '✓ AUCUNE TRACE'}`);

    if (meta.exif || hasGpsMarkers) {
      throw new Error(`Échec de purge sur la variante ${v.name}`);
    }

    // Nettoyage immédiat du fichier de test
    await storage.deleteLocalUpload(v.url);
  }

  console.log('\n✓ SUCCÈS TOTAL : Les 4 variantes ont été purgées à 100% de toute donnée EXIF, GPS et appareil.');
}

testExifGpsPurge()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erreur test EXIF GPS :', err);
    process.exit(1);
  });
