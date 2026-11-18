import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Role } from '../../../common/enums/role.enum';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class PedagogieSyncService {
  private readonly logger = new Logger(PedagogieSyncService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Déploie une formation-mère vers plusieurs établissements satellites.
   */
  async deployerFormationVersEtablissements(
    formationId: string,
    cibleEtablissementIds: string[],
    user: any,
  ) {
    if (user.role !== Role.ADMIN_CENTRE) {
      throw new ForbiddenException(
        "Seul l'Administrateur Central peut déployer une formation vers plusieurs établissements.",
      );
    }

    if (
      !cibleEtablissementIds ||
      !Array.isArray(cibleEtablissementIds) ||
      cibleEtablissementIds.length === 0
    ) {
      throw new BadRequestException('Veuillez sélectionner au moins un établissement cible.');
    }

    const source = await this.prisma.formation.findUnique({
      where: { id: formationId },
      include: {
        modules: {
          include: {
            cours: true,
            evaluations: true,
            quiz: {
              include: {
                questions: true,
              },
            },
            devoirs: true,
          },
        },
      },
    });

    if (!source) throw new NotFoundException('Formation source introuvable.');

    const deployes: string[] = [];

    for (const etabId of cibleEtablissementIds) {
      if (etabId === source.etablissementId) continue;

      const etab = await this.prisma.etablissement.findUnique({ where: { id: etabId } });
      if (!etab) continue;

      const codeSuffix = etab.codeAntenne
        ? etab.codeAntenne.replace(/[^A-Z0-9]/gi, '').toUpperCase()
        : Math.floor(100 + Math.random() * 900);
      const codeClone = `${source.code || 'FORM'}-${codeSuffix}`;

      const nouvelleFormation = await this.prisma.formation.create({
        data: {
          titre: source.titre,
          code: codeClone,
          description: source.description,
          duree: source.duree,
          categorie: source.categorie,
          debouches: source.debouches,
          prerequis: source.prerequis,
          objectifs: source.objectifs,
          publieSurLanding: source.publieSurLanding,
          aLaUne: false,
          badgeTexte: source.badgeTexte,
          ordre: source.ordre,
          actif: true,
          fraisInscription: source.fraisInscription,
          syllabusUrl: source.syllabusUrl,
          syllabusNomFichier: source.syllabusNomFichier,
          imageUrl: source.imageUrl,
          etablissementId: etab.id,
          formationReferentielId: source.formationReferentielId,
        },
      });

      for (const mod of source.modules) {
        const nouveauModule = await this.prisma.module.create({
          data: {
            formationId: nouvelleFormation.id,
            titre: mod.titre,
            ordre: mod.ordre,
            coefficient: mod.coefficient,
          },
        });

        for (const cours of mod.cours) {
          await this.prisma.cours.create({
            data: {
              moduleId: nouveauModule.id,
              titre: cours.titre,
              contenu: cours.contenu,
              fileUrl: cours.fileUrl,
              dureeMinutes: cours.dureeMinutes,
            },
          });
        }

        for (const ev of mod.evaluations) {
          await this.prisma.evaluation.create({
            data: {
              moduleId: nouveauModule.id,
              titre: ev.titre,
              noteMaximale: ev.noteMaximale,
            },
          });
        }

        for (const qz of mod.quiz || []) {
          const nouveauQuiz = await this.prisma.quiz.create({
            data: {
              moduleId: nouveauModule.id,
              titre: qz.titre,
              dureeMinutes: qz.dureeMinutes,
            },
          });
          if (qz.questions && qz.questions.length > 0) {
            await this.prisma.questionQuiz.createMany({
              data: qz.questions.map((q) => ({
                quizId: nouveauQuiz.id,
                enonce: q.enonce,
                ordre: q.ordre,
                options: (q.options === null ? Prisma.JsonNull : q.options) as Prisma.InputJsonValue,
              })),
            });
          }
        }

        for (const dv of mod.devoirs || []) {
          await this.prisma.devoir.create({
            data: {
              moduleId: nouveauModule.id,
              titre: dv.titre,
              consignes: dv.consignes,
              dateLimite: dv.dateLimite,
              criteresEvaluation: (dv.criteresEvaluation as any) ?? undefined,
            },
          });
        }
      }

      this.notifications.emit({
        type: 'FORMATION_UPDATE',
        recipientEtablissementId: etab.id,
        title: 'Formation Nationale Déployée',
        message: `La formation "${nouvelleFormation.titre}" a été déployée dans votre établissement par l'Administration Centrale.`,
        data: { formationId: nouvelleFormation.id, etablissementId: etab.id },
      });

      deployes.push(etab.nom);
    }

    return {
      success: true,
      message: `Formation déployée avec succès dans ${deployes.length} établissement(s) : ${deployes.join(', ')}.`,
      nbEtablissements: deployes.length,
    };
  }

  /**
   * Synchronise les métadonnées et contenus d'une formation source vers ses clones satellites.
   */
  async synchroniserFormationSourceVersClones(sourceFormationId: string) {
    const source = await this.prisma.formation.findUnique({
      where: { id: sourceFormationId },
    });
    if (!source || !source.formationReferentielId) return { synchronises: 0 };

    const clones = await this.prisma.formation.findMany({
      where: {
        formationReferentielId: source.formationReferentielId,
        id: { not: source.id },
      },
    });

    for (const clone of clones) {
      await this.prisma.formation.update({
        where: { id: clone.id },
        data: {
          titre: source.titre,
          description: source.description,
          duree: source.duree,
          categorie: source.categorie,
          debouches: source.debouches,
          prerequis: source.prerequis,
          objectifs: source.objectifs,
          fraisInscription: source.fraisInscription,
          syllabusUrl: source.syllabusUrl,
          syllabusNomFichier: source.syllabusNomFichier,
          imageUrl: source.imageUrl,
        },
      });
    }

    this.logger.log(
      `[SYNCHRO-RESEAU] ${clones.length} formations clones synchronisées depuis la source ${source.id}.`,
    );
    return { synchronises: clones.length };
  }
}
