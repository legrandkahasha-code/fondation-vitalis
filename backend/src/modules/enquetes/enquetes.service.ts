import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { SoumettreEnqueteDto, TypeEnqueteEnum } from './dto/enquete.dto';
import { EnqueteSatisfactionSoumiseEvent } from '../../common/events/app.events';

@Injectable()
export class EnquetesService {
  private readonly logger = new Logger(EnquetesService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    @Optional() private eventEmitter?: EventEmitter2,
  ) {}

  /**
   * Enregistre une enquête de satisfaction remplie par un apprenant.
   */
  async soumettreEnquete(dto: SoumettreEnqueteDto, user: any) {
    if (user.role !== Role.APPRENANT) {
      throw new ForbiddenException('Seuls les apprenants peuvent remplir des enquêtes de satisfaction.');
    }

    const formation = await this.prisma.formation.findUnique({
      where: { id: dto.formationId },
    });
    if (!formation) throw new NotFoundException('Formation introuvable.');

    const formateur = await this.prisma.utilisateur.findUnique({
      where: { id: dto.formateurId },
    });
    if (!formateur || formateur.role !== Role.FORMATEUR) {
      throw new NotFoundException('Formateur introuvable.');
    }

    // Vérifier si une enquête du même type a déjà été soumise par cet apprenant pour ce formateur et cette formation
    const existante = await this.prisma.enqueteSatisfaction.findFirst({
      where: {
        formationId: dto.formationId,
        formateurId: dto.formateurId,
        apprenantId: user.id,
        typeEnquete: dto.typeEnquete as any,
        ...(dto.moduleId ? { moduleId: dto.moduleId } : {}),
      },
    });

    if (existante) {
      throw new ConflictException(
        `Vous avez déjà soumis une enquête ${dto.typeEnquete === TypeEnqueteEnum.A_CHAUD ? 'à chaud' : 'à froid'} pour cette formation.`,
      );
    }

    // Calcul du score moyen standardisé sur 5
    const sommeNotes =
      dto.pedagogieClarte +
      dto.maitriseSujet +
      dto.disponibilite +
      dto.supportsCours +
      dto.pertinenceTps;
    const scoreGlobal = Math.round((sommeNotes / 5) * 100) / 100;

    const enquete = await this.prisma.enqueteSatisfaction.create({
      data: {
        formationId: dto.formationId,
        moduleId: dto.moduleId ?? null,
        formateurId: dto.formateurId,
        apprenantId: user.id,
        typeEnquete: dto.typeEnquete as any,
        anonyme: dto.anonyme ?? true,
        pedagogieClarte: dto.pedagogieClarte,
        maitriseSujet: dto.maitriseSujet,
        disponibilite: dto.disponibilite,
        supportsCours: dto.supportsCours,
        pertinenceTps: dto.pertinenceTps,
        impactEmploi: dto.impactEmploi ?? null,
        recommandationNps: dto.recommandationNps ?? null,
        commentaires: dto.commentaires ?? null,
        pointsForts: dto.pointsForts ?? null,
        axesAmelioration: dto.axesAmelioration ?? null,
        scoreGlobal,
      },
      include: {
        formation: { select: { id: true, titre: true } },
      },
    });

    // Émettre sur le bus asynchrone
    if (this.eventEmitter) {
      this.eventEmitter.emit(
        'enquete.soumise',
        new EnqueteSatisfactionSoumiseEvent(
          enquete.id,
          dto.formationId,
          dto.formateurId,
          scoreGlobal,
          dto.typeEnquete,
        ),
      );
    }

    // Notifier le formateur de manière bienveillante
    this.notifications.emit({
      type: 'FORMATION_UPDATE',
      recipientUserId: dto.formateurId,
      title: 'Nouvel avis apprenant reçu',
      message: `Un avis de satisfaction a été déposé pour votre enseignement (${formation.titre}) avec une appréciation globale de ${scoreGlobal}/5.`,
      data: {
        formationId: dto.formationId,
        scoreGlobal,
      },
    });

    return {
      success: true,
      message: 'Merci ! Votre retour qualitatif a été enregistré avec succès.',
      scoreGlobal,
      enqueteId: enquete.id,
    };
  }

  /**
   * Enquêtes en attente pour l'apprenant connecté (formations terminées non encore évaluées).
   */
  async getEnquetesEnAttente(user: any) {
    // Récupérer les formations où l'apprenant est inscrit
    const formationsInscrites = await this.prisma.inscription.findMany({
      where: {
        apprenant: { utilisateurId: user.id },
      },
      include: {
        formation: {
          include: {
            modules: {
              include: {
                affectations: {
                  include: {
                    formateur: {
                      select: { id: true, nom: true, prenom: true, photoUrl: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const enquetesDejaRemplies = await this.prisma.enqueteSatisfaction.findMany({
      where: { apprenantId: user.id },
      select: { formationId: true, formateurId: true, typeEnquete: true },
    });

    const rempliesSet = new Set(
      enquetesDejaRemplies.map((e) => `${e.formationId}_${e.formateurId}_${e.typeEnquete}`),
    );

    const aEvaluer: Array<{
      formationId: string;
      formationTitre: string;
      formateur: { id: string; nom: string; prenom: string; photoUrl: string | null };
      typeEnquete: TypeEnqueteEnum;
    }> = [];

    for (const ins of formationsInscrites) {
      if (!ins.formation) continue;
      for (const m of ins.formation.modules || []) {
        for (const aff of m.affectations || []) {
          if (!aff.formateur) continue;
          const keyChaud = `${ins.formationId}_${aff.formateur.id}_A_CHAUD`;
          if (!rempliesSet.has(keyChaud)) {
            aEvaluer.push({
              formationId: ins.formationId,
              formationTitre: ins.formation.titre,
              formateur: aff.formateur,
              typeEnquete: TypeEnqueteEnum.A_CHAUD,
            });
            rempliesSet.add(keyChaud); // Ne proposer qu'une fois par formateur
          }
        }
      }
    }

    return aEvaluer;
  }

  /**
   * Statistiques et baromètre qualité d'un formateur (Score moyen, NPS, Répartition).
   */
  async getStatistiquesFormateur(formateurId: string, user: any) {
    const formateur = await this.prisma.utilisateur.findUnique({
      where: { id: formateurId },
    });
    if (!formateur) throw new NotFoundException('Formateur introuvable.');

    if (
      user.role !== Role.ADMIN_CENTRE &&
      user.role !== Role.ADMIN_ETABLISSEMENT &&
      user.id !== formateurId
    ) {
      throw new ForbiddenException('Accès non autorisé aux statistiques de ce formateur.');
    }

    const enquetes = await this.prisma.enqueteSatisfaction.findMany({
      where: { formateurId },
      include: {
        formation: { select: { id: true, titre: true } },
      },
      orderBy: { dateSoumission: 'desc' },
    });

    if (enquetes.length === 0) {
      return {
        formateur: { id: formateur.id, nom: formateur.nom, prenom: formateur.prenom },
        totalEnquetes: 0,
        scoreMoyenGlobal: null,
        details: null,
        npsMoyen: null,
        avisRecents: [],
      };
    }

    const total = enquetes.length;
    const moyenne = (fn: (e: any) => number) =>
      Math.round((enquetes.reduce((acc, e) => acc + fn(e), 0) / total) * 100) / 100;

    const npsVals = enquetes.filter((e) => e.recommandationNps !== null).map((e) => e.recommandationNps as number);
    const npsMoyen =
      npsVals.length > 0
        ? Math.round((npsVals.reduce((acc, v) => acc + v, 0) / npsVals.length) * 10) / 10
        : null;

    return {
      formateur: { id: formateur.id, nom: formateur.nom, prenom: formateur.prenom },
      totalEnquetes: total,
      scoreMoyenGlobal: moyenne((e) => Number(e.scoreGlobal)),
      details: {
        clartePedagogique: moyenne((e) => e.pedagogieClarte),
        maitriseSujet: moyenne((e) => e.maitriseSujet),
        disponibilite: moyenne((e) => e.disponibilite),
        supportsDeCours: moyenne((e) => e.supportsCours),
        pertinenceTps: moyenne((e) => e.pertinenceTps),
      },
      npsMoyen,
      avisRecents: enquetes.slice(0, 10).map((e) => ({
        id: e.id,
        scoreGlobal: Number(e.scoreGlobal),
        typeEnquete: e.typeEnquete,
        formation: e.formation.titre,
        commentaires: e.commentaires,
        pointsForts: e.pointsForts,
        axesAmelioration: e.axesAmelioration,
        dateSoumission: e.dateSoumission,
      })),
    };
  }

  /**
   * Baromètre qualité pour une formation spécifique.
   */
  async getStatistiquesFormation(formationId: string, user: any) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
    });
    if (!formation) throw new NotFoundException('Formation introuvable.');

    const enquetes = await this.prisma.enqueteSatisfaction.findMany({
      where: { formationId },
      include: {
        formateur: { select: { id: true, nom: true, prenom: true } },
      },
    });

    const total = enquetes.length;
    if (total === 0) {
      return {
        formationId,
        formationTitre: formation.titre,
        totalEnquetes: 0,
        scoreMoyenGlobal: null,
      };
    }

    const scoreMoyenGlobal =
      Math.round((enquetes.reduce((acc, e) => acc + Number(e.scoreGlobal), 0) / total) * 100) / 100;

    return {
      formationId,
      formationTitre: formation.titre,
      totalEnquetes: total,
      scoreMoyenGlobal,
      repartitionParFormateur: enquetes.reduce((acc: any, e) => {
        const nom = `${e.formateur.prenom} ${e.formateur.nom}`;
        acc[nom] = acc[nom] || { count: 0, totalScore: 0 };
        acc[nom].count++;
        acc[nom].totalScore += Number(e.scoreGlobal);
        acc[nom].moyenne = Math.round((acc[nom].totalScore / acc[nom].count) * 100) / 100;
        return acc;
      }, {}),
    };
  }
}
