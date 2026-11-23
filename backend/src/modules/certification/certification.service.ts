import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PedagogieService } from '../pedagogie/pedagogie.service';
import { PedagogieGradingService } from '../pedagogie/services/pedagogie-grading.service';
import { PdfService } from '../../common/services/pdf.service';
import { StorageService } from '../../common/services/storage.service';
import { Role } from '../../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CertificationService {
  private readonly logger = new Logger(CertificationService.name);
  private gradingServiceInstance: PedagogieGradingService;

  constructor(
    private prisma: PrismaService,
    private pedagogieService: PedagogieService,
    @Optional() private gradingService: PedagogieGradingService,
    private pdfService: PdfService,
    private storageService: StorageService,
    private config: ConfigService,
    private notifications: NotificationsService,
  ) {
    this.gradingServiceInstance =
      this.gradingService || new PedagogieGradingService(this.prisma, this.notifications);
  }

  private async generateNumeroSerie(txClient?: any): Promise<string> {
    const client = txClient || this.prisma;
    try {
      if (typeof client.$executeRawUnsafe === 'function') {
        await client.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(789123456);`);
      }
    } catch {
      // Ignoré pour les tests unitaires / environnement mock
    }
    const year = new Date().getFullYear();
    const prefix = `CERT-${year}-`;
    const lastCert = await client.certificat.findFirst({
      where: { numeroSerie: { startsWith: prefix } },
      orderBy: { numeroSerie: 'desc' },
    });
    let nextNumber = 1;
    if (lastCert) {
      const parsed = parseInt(lastCert.numeroSerie.replace(prefix, ''), 10);
      if (!isNaN(parsed)) {
        nextNumber = parsed + 1;
      }
    }
    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }

  async emettreCertificat(formationId: string, utilisateurId: string, baseUrl: string) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      include: { etablissement: true },
    });
    if (!utilisateur) throw new NotFoundException('Utilisateur introuvable.');

    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
      include: { etablissement: true },
    });
    if (!formation) throw new NotFoundException('Formation introuvable.');

    const existingCert = await this.prisma.certificat.findFirst({
      where: { utilisateurId, formationId },
    });
    if (existingCert) {
      return { success: false, message: 'Un certificat a déjà été émis.', certificat: existingCert };
    }

    const progress = await this.pedagogieService.getProgressByFormation(formationId, utilisateurId);
    if (progress.completionRate < 100) {
      throw new BadRequestException(
        `BR-03 : Complétion insuffisante (${progress.completionRate}%). Requis : 100%.`,
      );
    }

    // BR-03 STRICT : Vérification incontournable que TOUS les modules obligatoires ont été évalués
    const audit = await this.gradingServiceInstance.auditCompletudeEvaluations(formationId, utilisateurId);
    if (!audit.estComplet) {
      const manquants = audit.modulesManquants.map((m) => `"${m.titre}"`).join(', ');
      throw new BadRequestException(
        `BR-03 : Des modules obligatoires ne possèdent aucune note d'évaluation (${manquants}). Complétion et certification strictement interdites.`,
      );
    }
    const moyenne = audit.moyennePonderee;

    if (moyenne < 10) {
      throw new BadRequestException(`BR-03 : Moyenne insuffisante (${moyenne}/20). Requis : >= 10/20.`);
    }

    const runInTx = typeof this.prisma.$transaction === 'function'
      ? (cb: (tx: any) => Promise<any>) => this.prisma.$transaction(cb, { maxWait: 10000, timeout: 30000 })
      : (cb: (tx: any) => Promise<any>) => cb(this.prisma);

    const { certificat, numeroSerie, urlPdfS3, verifyUrl } = await runInTx(async (tx) => {
      const numSerie = await this.generateNumeroSerie(tx);
      const hashVerification = createHash('sha256')
        .update(`${utilisateurId}-${formationId}-${numSerie}-${Date.now()}`)
        .digest('hex');

      const verifyUrl = `${baseUrl}/certificats/verifier/${numSerie}`;
      const pdfBuffer = await this.pdfService.generateCertificatPdf({
        numeroSerie: numSerie,
        apprenantNom: utilisateur.nom,
        apprenantPrenom: utilisateur.prenom,
        formationTitre: formation.titre,
        etablissementNom: formation.etablissement?.nom || 'Centre Vitalis',
        moyenne,
        dateEmission: new Date(),
        verifyUrl,
      });

      const urlPdfS3 = await this.storageService.uploadFile(
        pdfBuffer,
        `${numSerie}.pdf`,
        'application/pdf',
        'certificats',
      );

      const created = await tx.certificat.create({
        data: {
          numeroSerie: numSerie,
          utilisateurId,
          formationId,
          moyenneGenerale: moyenne,
          hashVerification,
          urlPdfS3,
        },
      });

      return { certificat: created, numeroSerie: numSerie, urlPdfS3, verifyUrl };
    });

    await this.prisma.auditLog.create({
      data: {
        auteurId: utilisateurId,
        action: 'EMISSION_CERTIFICAT',
        ipAdresse: '0.0.0.0',
        tableCible: 'certificats',
        details: { certificat: numeroSerie, formation: formation.titre, moyenne },
      },
    });

    // ─── Push temps réel : notifier l'apprenant de l'émission de son certificat ───
    this.notifications.emit({
      type: 'CERTIFICAT_EMIS',
      recipientUserId: utilisateurId,
      title: '🎓 Certificat officiel émis !',
      message: `Félicitations ! Votre certificat « ${formation.titre} » (N° ${numeroSerie}) est disponible au téléchargement.`,
      data: {
        certificatId: certificat.id,
        numeroSerie,
        formationId,
        formationTitre: formation.titre,
        urlPdfS3,
        moyenne,
        verifyUrl,
      },
    });

    return {
      success: true,
      message: `Certificat émis : ${numeroSerie}`,
      certificat,
      verifyUrl,
      details: { completionRate: progress.completionRate, moyenne },
    };
  }

  async getCertificatsUtilisateur(utilisateurId: string) {
    return this.prisma.certificat.findMany({
      where: { utilisateurId },
      include: {
        formation: {
          select: {
            id: true,
            titre: true,
            description: true,
            etablissement: { select: { nom: true, codeAntenne: true } },
          },
        },
      },
      orderBy: { dateEmission: 'desc' },
    });
  }

  async verifyCertificat(numeroSerie: string) {
    const cleanNum = (numeroSerie || '').trim();
    const cert = await this.prisma.certificat.findFirst({
      where: {
        numeroSerie: {
          equals: cleanNum,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        numeroSerie: true,
        dateEmission: true,
        moyenneGenerale: true,
        hashVerification: true,
        utilisateur: { select: { nom: true, prenom: true } },
        formation: { select: { titre: true, etablissement: { select: { nom: true } } } },
      },
    });
    if (!cert) throw new NotFoundException('Certificat introuvable.');
    return { success: true, valide: true, certificat: cert };
  }

  async getPdfUrl(numeroSerie: string, user: any) {
    const cleanNum = (numeroSerie || '').trim();
    const cert = await this.prisma.certificat.findFirst({
      where: {
        numeroSerie: {
          equals: cleanNum,
          mode: 'insensitive',
        },
      },
    });
    if (!cert) throw new NotFoundException('Certificat introuvable.');
    if (user.role === Role.APPRENANT && cert.utilisateurId !== user.id) {
      throw new ForbiddenException('Accès interdit.');
    }
    return { url: cert.urlPdfS3, numeroSerie: cert.numeroSerie };
  }
}
