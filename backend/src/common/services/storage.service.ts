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
    if (!relativeUrl.startsWith('/uploads/')) return null;
    const cleanSubpath = relativeUrl.replace(/^\/uploads\//, '');

    // Vérifie d'abord dans this.localDir
    const primaryPath = path.join(this.localDir, cleanSubpath);
    if (fs.existsSync(primaryPath)) return primaryPath;

    // Vérifie dans backend/uploads
    const backendPath = path.join(process.cwd(), 'backend', 'uploads', cleanSubpath);
    if (fs.existsSync(backendPath)) return backendPath;

    // Vérifie dans uploads à la racine
    const rootPath = path.join(process.cwd(), 'uploads', cleanSubpath);
    if (fs.existsSync(rootPath)) return rootPath;

    return primaryPath;
  }
}

