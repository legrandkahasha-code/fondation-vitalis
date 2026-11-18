import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';

/**
 * Tests de validation d'image pour processAndSaveHeroImage et processAndSaveCampusPhoto.
 * Vérifie que JPEG, PNG et WebP passent la validation,
 * que SVG est refusé, et qu'un JPEG avec métadonnées XMP (<?xml) n'est PAS faux-positif.
 */

// Génère un vrai petit JPEG 2x2 via sharp
async function makeJpeg(): Promise<Buffer> {
  const sharp = require('sharp');
  return sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 255, g: 0, b: 0 } } })
    .jpeg()
    .toBuffer();
}

async function makePng(): Promise<Buffer> {
  const sharp = require('sharp');
  return sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 0, g: 255, b: 0 } } })
    .png()
    .toBuffer();
}

async function makeWebp(): Promise<Buffer> {
  const sharp = require('sharp');
  return sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 0, g: 0, b: 255 } } })
    .webp()
    .toBuffer();
}

function makeSvg(): Buffer {
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>');
}

/** Simule un JPEG contenant des métadonnées XMP (<?xml) dans les 300 premiers octets */
async function makeJpegWithXmp(): Promise<Buffer> {
  const jpegBuf = await makeJpeg();
  // Injecte un faux segment APP1 XMP après les 2 premiers octets SOI (FF D8)
  const xmpPayload = Buffer.from('<?xml version="1.0" encoding="UTF-8"?>');
  // APP1 marker: FF E1, longueur sur 2 octets (big-endian)
  const segLen = xmpPayload.length + 2;
  const app1Header = Buffer.from([0xff, 0xe1, (segLen >> 8) & 0xff, segLen & 0xff]);
  return Buffer.concat([jpegBuf.slice(0, 2), app1Header, xmpPayload, jpegBuf.slice(2)]);
}

describe('StorageService – validation image', () => {
  let service: StorageService;

  beforeAll(() => {
    const mockConfig = {
      get: jest.fn().mockReturnValue(''),
    } as unknown as ConfigService;
    service = new StorageService(mockConfig);
  });

  // --- Tests Campus (640x480 min) ---
  // On ne teste que la validation format/signature, pas la dimension ni l'écriture disque.
  // Les petites images (2x2) échoueront sur la dimension → on attrape l'erreur attendue.

  it('campus : accepte un JPEG valide (rejet dimension attendu, pas format)', async () => {
    const buf = await makeJpeg();
    await expect(service.processAndSaveCampusPhoto(buf, 'photo.jpg'))
      .rejects.toThrow('Dimension minimale insuffisante');
  });

  it('campus : accepte un PNG valide (rejet dimension attendu, pas format)', async () => {
    const buf = await makePng();
    await expect(service.processAndSaveCampusPhoto(buf, 'photo.png'))
      .rejects.toThrow('Dimension minimale insuffisante');
  });

  it('campus : accepte un WebP valide (rejet dimension attendu, pas format)', async () => {
    const buf = await makeWebp();
    await expect(service.processAndSaveCampusPhoto(buf, 'photo.webp'))
      .rejects.toThrow('Dimension minimale insuffisante');
  });

  it('campus : refuse un SVG', async () => {
    const buf = makeSvg();
    await expect(service.processAndSaveCampusPhoto(buf, 'image.svg'))
      .rejects.toThrow('Les fichiers vectoriels SVG sont strictement interdits');
  });

  it('campus : JPEG avec XMP (<?xml) ne déclenche PAS le faux positif SVG', async () => {
    const buf = await makeJpegWithXmp();
    // Doit passer la validation format et échouer uniquement sur la dimension
    await expect(service.processAndSaveCampusPhoto(buf, 'photo-xmp.jpg'))
      .rejects.toThrow('Dimension minimale insuffisante');
  });

  // --- Tests Hero (1280x720 min) ---

  it('hero : accepte un JPEG valide (rejet dimension attendu, pas format)', async () => {
    const buf = await makeJpeg();
    await expect(service.processAndSaveHeroImage(buf, 'hero.jpg'))
      .rejects.toThrow('Dimension minimale insuffisante');
  });

  it('hero : accepte un PNG valide (rejet dimension attendu, pas format)', async () => {
    const buf = await makePng();
    await expect(service.processAndSaveHeroImage(buf, 'hero.png'))
      .rejects.toThrow('Dimension minimale insuffisante');
  });

  it('hero : accepte un WebP valide (rejet dimension attendu, pas format)', async () => {
    const buf = await makeWebp();
    await expect(service.processAndSaveHeroImage(buf, 'hero.webp'))
      .rejects.toThrow('Dimension minimale insuffisante');
  });

  it('hero : refuse un SVG', async () => {
    const buf = makeSvg();
    await expect(service.processAndSaveHeroImage(buf, 'hero.svg'))
      .rejects.toThrow('Les fichiers vectoriels SVG sont strictement interdits');
  });

  it('hero : JPEG avec XMP (<?xml) ne déclenche PAS le faux positif SVG', async () => {
    const buf = await makeJpegWithXmp();
    await expect(service.processAndSaveHeroImage(buf, 'hero-xmp.jpg'))
      .rejects.toThrow('Dimension minimale insuffisante');
  });

  // --- Tests format inconnu ---

  it('hero : refuse un fichier binaire inconnu', async () => {
    const buf = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
    await expect(service.processAndSaveHeroImage(buf, 'data.bin'))
      .rejects.toThrow('Format d\'image non supporté ou fichier corrompu');
  });

  it('campus : refuse un fichier vide', async () => {
    const buf = Buffer.alloc(0);
    await expect(service.processAndSaveCampusPhoto(buf, 'empty.jpg'))
      .rejects.toThrow('Fichier vide');
  });
});
