import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private s3Bucket: string;
  private supabaseUrl: string | null = null;
  private supabaseKey: string | null = null;
  private supabaseBucket: string = 'vitalis-media';
  private localDir: string;

  constructor(private config: ConfigService) {
    this.s3Bucket = this.config.get('S3_BUCKET', 'vitalis-center');

    // Détection Supabase Cloud Storage
    this.supabaseUrl = (this.config.get('SUPABASE_URL') || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
    this.supabaseKey = this.config.get('SUPABASE_SECRET_KEY') || process.env.SUPABASE_SECRET_KEY || this.config.get('SUPABASE_PUBLISHABLE_KEY') || process.env.SUPABASE_PUBLISHABLE_KEY || null;
    this.supabaseBucket = this.config.get('SUPABASE_STORAGE_BUCKET') || process.env.SUPABASE_STORAGE_BUCKET || 'vitalis-media';

    // Local directory canonique (résolution robuste indépendamment du CWD)
    const baseDir = process.cwd();
    this.localDir = fs.existsSync(path.join(baseDir, 'backend', 'uploads'))
      ? path.join(baseDir, 'backend', 'uploads')
      : path.join(baseDir, 'uploads');

    if (!fs.existsSync(this.localDir)) {
      try {
        fs.mkdirSync(this.localDir, { recursive: true });
      } catch (e) {
        this.logger.warn(`Impossible de créer le dossier local ${this.localDir}: ${e}`);
      }
    }

    // Configuration S3 optionnelle
    const awsKey = this.config.get('AWS_ACCESS_KEY_ID');
    if (awsKey) {
      this.s3Client = new S3Client({
        region: this.config.get('AWS_REGION', 'eu-west-3'),
        credentials: {
          accessKeyId: awsKey,
          secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY', ''),
        },
        endpoint: this.config.get('S3_ENDPOINT'),
        forcePathStyle: true,
      });
    }

    if (this.supabaseUrl && this.supabaseKey) {
      this.logger.log(`Stockage Cloud Supabase activé sur le bucket : ${this.supabaseBucket}`);
    } else if (this.s3Client) {
      this.logger.log(`Stockage Cloud S3 activé sur le bucket : ${this.s3Bucket}`);
    } else {
      this.logger.log(`Stockage local activé : ${this.localDir}`);
    }
  }

  private sanitizeFilename(filename: string): string {
    const ext = path.extname(filename).toLowerCase().replace(/[^a-z0-9.]/g, '').slice(0, 10);
    const nameWithoutExt = path.basename(filename, ext);
    const sanitizedBase = nameWithoutExt
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(0, 60);
    return `${sanitizedBase || 'fichier'}${ext}`;
  }

  private validateBufferMagicBytes(buffer: Buffer, mimeType: string): boolean {
    if (!buffer || buffer.length === 0) return false;

    // PDF: %PDF (0x25, 0x50, 0x44, 0x46)
    if (mimeType === 'application/pdf') {
      return buffer.length >= 4 && buffer.slice(0, 4).toString() === '%PDF';
    }
    // PNG: 0x89 50 4E 47
    if (mimeType === 'image/png') {
      return buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    }
    // JPEG: 0xFF D8 FF
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    // WebP: RIFF .... WEBP
    if (mimeType === 'image/webp') {
      return buffer.length >= 12 && buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP';
    }
    // GIF: GIF87a or GIF89a
    if (mimeType === 'image/gif') {
      return buffer.length >= 4 && buffer.slice(0, 4).toString() === 'GIF8';
    }
    // MP4 / QuickTime: ftyp at offset 4
    if (mimeType === 'video/mp4' || mimeType === 'video/quicktime') {
      return buffer.length >= 8 && buffer.slice(4, 8).toString() === 'ftyp';
    }
    // DOCX (ZIP archive): PK\x03\x04
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
    }
    // DOC (OLE2): 0xD0 CF 11 E0
    if (mimeType === 'application/msword') {
      return buffer.length >= 2 && buffer[0] === 0xd0 && buffer[1] === 0xcf;
    }
    return true; // text/plain, etc.
  }

  /**
   * Téléverse un fichier sur le stockage Cloud persistant (Supabase CDN)
   * avec réplication locale et repli de secours automatique en cas d'erreur réseau.
   */
  async uploadFile(buffer: Buffer, filename: string, mimeType: string, folder = 'documents'): Promise<string> {
    if (!this.validateBufferMagicBytes(buffer, mimeType)) {
      throw new Error('Échec de la validation de sécurité : la signature binaire du fichier ne correspond pas au type MIME déclaré.');
    }

    const safeFilename = this.sanitizeFilename(filename);
    const safeFolder = folder.replace(/[^a-zA-Z0-9_\-\/]/g, '').replace(/\.\./g, '');
    const uniqueName = `${randomUUID()}-${safeFilename}`;
    const key = `${safeFolder}/${uniqueName}`;

    // 1. Sauvegarde locale de secours (pour prévisualisation rapide et cache hors-ligne)
    try {
      const localTargetDir = path.join(this.localDir, safeFolder);
      if (!fs.existsSync(localTargetDir)) fs.mkdirSync(localTargetDir, { recursive: true });
      fs.writeFileSync(path.join(localTargetDir, uniqueName), buffer);
    } catch (e) {
      this.logger.debug(`Écriture locale de secours ignorée: ${e}`);
    }

    // 2. Priorité 1 : Supabase Cloud Storage (CDN public persistant et immuable)
    if (this.supabaseUrl && this.supabaseKey) {
      try {
        const uploadEndpoint = `${this.supabaseUrl}/storage/v1/object/${this.supabaseBucket}/${key}`;
        const resp = await fetch(uploadEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.supabaseKey}`,
            apikey: this.supabaseKey,
            'Content-Type': mimeType,
            'x-upsert': 'true',
          },
          body: new Uint8Array(buffer) as any,
        });

        if (resp.ok) {
          const publicUrl = `${this.supabaseUrl}/storage/v1/object/public/${this.supabaseBucket}/${key}`;
          this.logger.log(`Fichier pérenne uploadé sur Supabase CDN: ${publicUrl}`);
          return publicUrl;
        }

        const errText = await resp.text();
        this.logger.warn(`Échec upload Supabase (${resp.status}): ${errText}. Repli vers le stockage alternatif.`);
      } catch (err: any) {
        this.logger.warn(`Erreur réseau Supabase Storage: ${err?.message}. Repli vers le stockage alternatif.`);
      }
    }

    // 3. Priorité 2 : AWS S3 si configuré
    if (this.s3Client) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.s3Bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
            ServerSideEncryption: 'AES256',
          }),
        );
        const endpoint = this.config.get('S3_PUBLIC_URL', `https://${this.s3Bucket}.s3.amazonaws.com`);
        return `${endpoint}/${key}`;
      } catch (s3Err: any) {
        this.logger.warn(`Erreur S3: ${s3Err?.message}. Repli vers le stockage local.`);
      }
    }

    // 4. Repli final : Stockage local
    return `/uploads/${safeFolder}/${uniqueName}`;
  }

  getLocalPath(relativeUrl: string): string | null {
    if (!relativeUrl || !relativeUrl.startsWith('/uploads/')) return null;
    const cleanSubpath = relativeUrl.replace(/^\/uploads\//, '');

    const candidates = [
      path.resolve(this.localDir),
      path.resolve(process.cwd(), 'backend', 'uploads'),
      path.resolve(process.cwd(), 'uploads'),
    ];

    for (const baseDir of candidates) {
      const resolved = path.resolve(baseDir, cleanSubpath);
      // Défense en profondeur contre le Path Traversal : le chemin résolu doit être strictement contenu dans baseDir
      if (resolved.startsWith(baseDir) && fs.existsSync(resolved)) {
        return resolved;
      }
    }

    const defaultResolved = path.resolve(this.localDir, cleanSubpath);
    return defaultResolved.startsWith(path.resolve(this.localDir)) ? defaultResolved : null;
  }

  resolveUrl(fileUrl: string): string {
    if (!fileUrl) return '';
    return fileUrl;
  }

  /**
   * Vérifie si une URL est une URL Supabase CDN valide pour un dossier donné (hero, campus, etc.)
   */
  isSupabaseCdnUrl(url: string, folder: string): boolean {
    if (!url || !this.supabaseUrl) return false;
    const prefix = `${this.supabaseUrl}/storage/v1/object/public/${this.supabaseBucket}/${folder}/`;
    return url.startsWith(prefix);
  }

  /**
   * Vérifie si une URL est un chemin local ou une URL Supabase CDN valide pour un préfixe donné.
   */
  isValidImageUrl(url: string, folder: 'hero' | 'campus'): boolean {
    if (!url) return false;
    return url.startsWith(`/uploads/${folder}/`) || this.isSupabaseCdnUrl(url, folder);
  }

  /**
   * Pipeline d'upload sécurisé pour les ateliers du Campus :
   * Validation signature binaire, refus strict SVG, limite 8 Mo,
   * Sharp avec limitInputPixels (50 Mpx), dimension minimale (640x480), suppression GPS/EXIF (.rotate()),
   * Génération variantes Desktop (1280x960 4:3 WebP) et Mobile (640x480 4:3 WebP) sans agrandissement artificiel.
   */
  async processAndSaveCampusPhoto(buffer: Buffer, originalname: string, declaredMimeType?: string) {
    if (!buffer || buffer.length === 0) {
      throw new Error('Fichier vide.');
    }
    if (buffer.length > 8 * 1024 * 1024) {
      throw new Error('Taille de fichier excessive : 8 Mo maximum.');
    }

    // Validation signature binaire (JPEG, PNG, WebP uniquement)
    const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isWebp = buffer.length >= 12 && buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP';

    if (!isJpeg && !isPng && !isWebp) {
      // Pas un raster reconnu → vérifier si c'est un SVG
      const startStr = buffer.slice(0, 300).toString('utf-8').toLowerCase();
      if (startStr.includes('<svg') || startStr.includes('<?xml')) {
        throw new Error('Les fichiers vectoriels SVG sont strictement interdits.');
      }
      throw new Error('Format d\'image non supporté ou fichier corrompu. Formats acceptés : JPEG, PNG, WebP.');
    }

    // Magic bytes JPEG/PNG/WebP confirmés → pas de check SVG textuel
    // (les JPEG avec métadonnées XMP contiennent <?xml, ce qui causait un faux positif)

    const sharp = require('sharp');
    const meta = await sharp(buffer, { limitInputPixels: 50_000_000 }).metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    if (width < 640 || height < 480) {
      throw new Error(`Dimension minimale insuffisante : la photo de campus doit mesurer au moins 640x480 pixels (reçu : ${width}x${height} px).`);
    }

    const id = randomUUID();
    const desktopFilename = `campus-${id}-desktop.webp`;
    const mobileFilename = `campus-${id}-mobile.webp`;

    const desktopBuffer = await sharp(buffer, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(1280, 960, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();

    const mobileBuffer = await sharp(buffer, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(640, 480, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();

    // 1. Sauvegarde locale de secours
    const campusDirs = [
      path.join(this.localDir, 'campus'),
      path.join(process.cwd(), 'uploads', 'campus'),
      path.join(process.cwd(), 'backend', 'uploads', 'campus'),
    ];
    for (const d of campusDirs) {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, desktopFilename), desktopBuffer);
      fs.writeFileSync(path.join(d, mobileFilename), mobileBuffer);
    }

    // 2. Upload vers Supabase CDN pour persistance en production
    let desktopUrl = `/uploads/campus/${desktopFilename}`;
    let mobileUrl = `/uploads/campus/${mobileFilename}`;

    if (this.supabaseUrl && this.supabaseKey) {
      try {
        const desktopKey = `campus/${desktopFilename}`;
        const mobileKey = `campus/${mobileFilename}`;

        const [desktopResp, mobileResp] = await Promise.all([
          fetch(`${this.supabaseUrl}/storage/v1/object/${this.supabaseBucket}/${desktopKey}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.supabaseKey}`,
              apikey: this.supabaseKey,
              'Content-Type': 'image/webp',
              'x-upsert': 'true',
            },
            body: new Uint8Array(desktopBuffer) as any,
          }),
          fetch(`${this.supabaseUrl}/storage/v1/object/${this.supabaseBucket}/${mobileKey}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.supabaseKey}`,
              apikey: this.supabaseKey,
              'Content-Type': 'image/webp',
              'x-upsert': 'true',
            },
            body: new Uint8Array(mobileBuffer) as any,
          }),
        ]);

        if (desktopResp.ok && mobileResp.ok) {
          desktopUrl = `${this.supabaseUrl}/storage/v1/object/public/${this.supabaseBucket}/${desktopKey}`;
          mobileUrl = `${this.supabaseUrl}/storage/v1/object/public/${this.supabaseBucket}/${mobileKey}`;
          this.logger.log(`Photos campus uploadées sur Supabase CDN: ${desktopUrl}`);
        } else {
          const errDesktop = !desktopResp.ok ? await desktopResp.text() : '';
          const errMobile = !mobileResp.ok ? await mobileResp.text() : '';
          this.logger.warn(`Échec upload campus Supabase: desktop=${desktopResp.status} ${errDesktop}, mobile=${mobileResp.status} ${errMobile}. Repli local.`);
        }
      } catch (err: any) {
        this.logger.warn(`Erreur réseau Supabase campus: ${err?.message}. Repli local.`);
      }
    }

    return {
      photoUrl: desktopUrl,
      photoUrlMobile: mobileUrl,
      desktopSize: desktopBuffer.length,
      mobileSize: mobileBuffer.length,
    };
  }

  /**
   * Pipeline d'upload sécurisé pour le Hero :
   * Validation signature binaire, refus strict SVG, limite 8 Mo,
   * Sharp avec limitInputPixels (50 Mpx), dimension minimale (1280x720), suppression GPS/EXIF (.rotate()),
   * Génération variantes Desktop (1920x1080 16:9 WebP) et Mobile (768x1024 3:4 WebP) sans agrandissement artificiel.
   */
  async processAndSaveHeroImage(buffer: Buffer, originalname: string, declaredMimeType?: string) {
    if (!buffer || buffer.length === 0) {
      throw new Error('Fichier vide.');
    }
    if (buffer.length > 8 * 1024 * 1024) {
      throw new Error('Taille de fichier excessive : 8 Mo maximum.');
    }

    const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isWebp = buffer.length >= 12 && buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP';

    if (!isJpeg && !isPng && !isWebp) {
      // Pas un raster reconnu → vérifier si c'est un SVG
      const startStr = buffer.slice(0, 300).toString('utf-8').toLowerCase();
      if (startStr.includes('<svg') || startStr.includes('<?xml')) {
        throw new Error('Les fichiers vectoriels SVG sont strictement interdits.');
      }
      throw new Error('Format d\'image non supporté ou fichier corrompu. Formats acceptés : JPEG, PNG, WebP.');
    }

    // Magic bytes JPEG/PNG/WebP confirmés → pas de check SVG textuel
    // (les JPEG avec métadonnées XMP contiennent <?xml, ce qui causait un faux positif)

    const sharp = require('sharp');
    const meta = await sharp(buffer, { limitInputPixels: 50_000_000 }).metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    if (width < 1280 || height < 720) {
      throw new Error(`Dimension minimale insuffisante : l'image hero doit mesurer au moins 1280x720 pixels (reçu : ${width}x${height} px).`);
    }

    const id = randomUUID();
    const desktopFilename = `hero-${id}-desktop.webp`;
    const mobileFilename = `hero-${id}-mobile.webp`;

    const desktopBuffer = await sharp(buffer, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(1920, 1080, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    const mobileBuffer = await sharp(buffer, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(768, 1024, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();

    // 1. Sauvegarde locale de secours
    const heroDirs = [
      path.join(this.localDir, 'hero'),
      path.join(process.cwd(), 'uploads', 'hero'),
      path.join(process.cwd(), 'backend', 'uploads', 'hero'),
    ];
    for (const d of heroDirs) {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, desktopFilename), desktopBuffer);
      fs.writeFileSync(path.join(d, mobileFilename), mobileBuffer);
    }

    // 2. Upload vers Supabase CDN pour persistance en production
    let desktopUrl = `/uploads/hero/${desktopFilename}`;
    let mobileUrl = `/uploads/hero/${mobileFilename}`;

    if (this.supabaseUrl && this.supabaseKey) {
      try {
        const desktopKey = `hero/${desktopFilename}`;
        const mobileKey = `hero/${mobileFilename}`;

        const [desktopResp, mobileResp] = await Promise.all([
          fetch(`${this.supabaseUrl}/storage/v1/object/${this.supabaseBucket}/${desktopKey}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.supabaseKey}`,
              apikey: this.supabaseKey,
              'Content-Type': 'image/webp',
              'x-upsert': 'true',
            },
            body: new Uint8Array(desktopBuffer) as any,
          }),
          fetch(`${this.supabaseUrl}/storage/v1/object/${this.supabaseBucket}/${mobileKey}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.supabaseKey}`,
              apikey: this.supabaseKey,
              'Content-Type': 'image/webp',
              'x-upsert': 'true',
            },
            body: new Uint8Array(mobileBuffer) as any,
          }),
        ]);

        if (desktopResp.ok && mobileResp.ok) {
          desktopUrl = `${this.supabaseUrl}/storage/v1/object/public/${this.supabaseBucket}/${desktopKey}`;
          mobileUrl = `${this.supabaseUrl}/storage/v1/object/public/${this.supabaseBucket}/${mobileKey}`;
          this.logger.log(`Images hero uploadées sur Supabase CDN: ${desktopUrl}`);
        } else {
          const errDesktop = !desktopResp.ok ? await desktopResp.text() : '';
          const errMobile = !mobileResp.ok ? await mobileResp.text() : '';
          this.logger.warn(`Échec upload hero Supabase: desktop=${desktopResp.status} ${errDesktop}, mobile=${mobileResp.status} ${errMobile}. Repli local.`);
        }
      } catch (err: any) {
        this.logger.warn(`Erreur réseau Supabase hero: ${err?.message}. Repli local.`);
      }
    }

    return {
      heroImage: desktopUrl,
      heroImageMobile: mobileUrl,
      desktopSize: desktopBuffer.length,
      mobileSize: mobileBuffer.length,
    };
  }

  /**
   * Supprime physiquement un fichier local d'upload lors d'un remplacement ou d'une suppression.
   */
  async deleteLocalUpload(relativeUrl: string | null | undefined): Promise<void> {
    if (!relativeUrl || typeof relativeUrl !== 'string' || !relativeUrl.startsWith('/uploads/')) return;
    if (relativeUrl.includes('..') || relativeUrl.includes('\0')) return;
    const cleanSubpath = relativeUrl.replace(/^\/uploads\//, '');
    const candidateDirs = [
      this.localDir,
      path.join(process.cwd(), 'uploads'),
      path.join(process.cwd(), 'backend', 'uploads'),
    ];
    for (const base of candidateDirs) {
      const fullPath = path.resolve(base, cleanSubpath);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
          this.logger.log(`Fichier d'upload supprimé du disque : ${fullPath}`);
        } catch (e: any) {
          this.logger.warn(`Impossible de supprimer le fichier ${fullPath} : ${e.message}`);
        }
      }
    }
  }

  /**
   * Vérifie formellement qu'un chemin de fichier commence par le préfixe autorisé,
   * ne contient aucune évasion de répertoire (..), et existe physiquement sur le disque.
   */
  async validateUploadPath(url: string | null | undefined, prefix: '/uploads/campus/' | '/uploads/hero/'): Promise<boolean> {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // Les URLs Supabase CDN sont toujours considérées comme valides (fichier persisté sur le cloud)
    const folder = prefix === '/uploads/hero/' ? 'hero' : 'campus';
    if (this.isSupabaseCdnUrl(url, folder)) {
      return true;
    }

    if (!url.startsWith(prefix)) {
      return false;
    }
    if (url.includes('..') || url.includes('\0')) {
      return false;
    }
    const relativeSubPath = url.replace(/^\/uploads\//, '');
    const candidateDirs = [
      this.localDir,
      path.join(process.cwd(), 'uploads'),
      path.join(process.cwd(), 'backend', 'uploads'),
    ];

    for (const base of candidateDirs) {
      const resolved = path.resolve(base, relativeSubPath);
      const expectedDir = path.resolve(base, prefix.replace(/^\/uploads\//, ''));
      if (resolved.startsWith(expectedDir)) {
        try {
          await fs.promises.access(resolved, fs.constants.R_OK);
          return true;
        } catch {
          // Continuer sur le candidat suivant
        }
      }
    }
    return false;
  }
}

