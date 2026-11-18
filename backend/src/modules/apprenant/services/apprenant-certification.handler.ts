import {
  Injectable,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { PedagogieGradingService } from '../../pedagogie/services/pedagogie-grading.service';
import { CertificationService } from '../../certification/certification.service';
import { CursusAjourneEvent } from '../../../common/events/app.events';

export interface EligibiliteCertificatResult {
  eligible: boolean;
  completionRate: number;
  moyenneGenerale: number;
  evaluationsCompletes: boolean;
  modulesManquants: Array<{ id: string; titre: string; coefficient: number }>;
  raison?: string;
  certificatExistant?: any;
  rattrapageEligible?: boolean;
  rattrapagesEnCours?: any[];
}

@Injectable()
export class ApprenantCertificationHandler {
  private readonly logger = new Logger(ApprenantCertificationHandler.name);

  constructor(
    private prisma: PrismaService,
    private gradingService: PedagogieGradingService,
    private certificationService: CertificationService,
    @Optional() private eventEmitter?: EventEmitter2,
  ) {}

  /**
   * Vérification rigoureuse de l'éligibilité au Certificat selon la Règle BR-03 :
   * 1. 100% des cours obligatoires complétés.
   * 2. Moyenne générale pondérée >= 10.00 / 20.
   * 3. EXHAUSTIVITÉ : Tous les modules obligatoires doivent avoir au moins une note (aucune matière sautée).
   */
  async checkEligibilite(
    formationId: string,
    userId: string,
    completionRate: number,
  ): Promise<EligibiliteCertificatResult> {
    const existingCert = await this.prisma.certificat.findFirst({
      where: { utilisateurId: userId, formationId },
    });
    if (existingCert) {
      return {
        eligible: false,
        completionRate,
        moyenneGenerale: Number(existingCert.moyenneGenerale),
        evaluationsCompletes: true,
        modulesManquants: [],
        raison: 'Un certificat officiel a déjà été émis pour cette formation.',
        certificatExistant: existingCert,
      };
    }

    const auditEvaluations = await this.gradingService.auditCompletudeEvaluations(
      formationId,
      userId,
    );

    const moyenne = auditEvaluations.moyennePonderee;
    const evaluationsCompletes = auditEvaluations.estComplet;
    const modulesManquants = auditEvaluations.modulesManquants;

    if (completionRate < 100) {
      return {
        eligible: false,
        completionRate,
        moyenneGenerale: moyenne,
        evaluationsCompletes,
        modulesManquants,
        raison: `Taux de complétion des cours insuffisant (${completionRate}%). Requis : 100%.`,
      };
    }

    if (!evaluationsCompletes) {
      const nomsManquants = modulesManquants.map((m) => `"${m.titre}"`).join(', ');
      return {
        eligible: false,
        completionRate,
        moyenneGenerale: moyenne,
        evaluationsCompletes: false,
        modulesManquants,
        raison: `Évaluations incomplètes : des modules obligatoires n'ont pas encore été notés (${nomsManquants}).`,
      };
    }

    if (moyenne < 10.0) {
      const rattrapages = await this.prisma.inscriptionRattrapage.findMany({
        where: {
          apprenantId: userId,
          session: { formationId },
        },
        include: {
          session: { include: { module: { select: { id: true, titre: true } } } },
        },
      });

      if (this.eventEmitter) {
        this.eventEmitter.emit(
          'cursus.ajourne',
          new CursusAjourneEvent(
            formationId,
            userId,
            moyenne,
            modulesManquants.map((m) => ({ id: m.id, titre: m.titre, note: null })),
          ),
        );
      }

      const hasPendingRattrapage = rattrapages.some((r) => r.statut !== 'NOTE_SAISIE');
      const raison = hasPendingRattrapage
        ? `Moyenne générale pondérée insuffisante (${moyenne}/20). Une session de rattrapage est planifiée ou en cours.`
        : `Moyenne générale pondérée insuffisante (${moyenne}/20). Requis : >= 10.00/20. Vous êtes éligible à une session de rattrapage.`;

      return {
        eligible: false,
        completionRate,
        moyenneGenerale: moyenne,
        evaluationsCompletes: true,
        modulesManquants: [],
        raison,
        rattrapageEligible: true,
        rattrapagesEnCours: rattrapages,
      };
    }

    return {
      eligible: true,
      completionRate: 100,
      moyenneGenerale: moyenne,
      evaluationsCompletes: true,
      modulesManquants: [],
    };
  }

  /**
   * Déclenche la génération du certificat ministériel si les conditions sont réunies.
   */
  async genererCertificat(formationId: string, user: any, completionRate: number) {
    const eligibilite = await this.checkEligibilite(formationId, user.id, completionRate);
    if (!eligibilite.eligible) {
      if (eligibilite.certificatExistant) {
        return {
          success: false,
          dejaExistant: true,
          certificat: eligibilite.certificatExistant,
          message: eligibilite.raison,
        };
      }
      throw new BadRequestException(
        eligibilite.raison ||
          "Les conditions d'obtention de la certification (Règle BR-03) ne sont pas réunies.",
      );
    }

    const baseUrl = process.env.PUBLIC_APP_URL || 'https://vitalis-center.cd';
    return this.certificationService.emettreCertificat(formationId, user.id, baseUrl);
  }
}
