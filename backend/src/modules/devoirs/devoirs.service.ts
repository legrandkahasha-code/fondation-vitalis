import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { Role } from '../../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AuthorizationService,
  ResourceAction,
  EnrollmentScope,
} from '../../common/services/authorization.service';

@Injectable()
export class DevoirsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private notifications: NotificationsService,
    private authz: AuthorizationService,
  ) {}

  private async assertModuleAccess(moduleId: string, user: any) {
    const scope = user.role === Role.APPRENANT
      ? EnrollmentScope.CANDIDATURE_OU_INSCRIPTION
      : EnrollmentScope.ETABLISSEMENT_ONLY;
    const { module: mod } = await this.authz.canAccessModule(user, moduleId, ResourceAction.READ, scope);
    return mod;
  }

  async create(moduleId: string, data: { titre: string; consignes?: string; dateLimite?: string; criteresEvaluation?: any }, user: any) {
    await this.assertModuleAccess(moduleId, user);
    return this.prisma.devoir.create({
      data: {
        moduleId,
        titre: data.titre,
        consignes: data.consignes,
        dateLimite: data.dateLimite ? new Date(data.dateLimite) : undefined,
        criteresEvaluation: data.criteresEvaluation ?? undefined,
      },
    });
  }

  async findByModule(moduleId: string, user: any) {
    await this.assertModuleAccess(moduleId, user);
    const base = await this.prisma.devoir.findMany({
      where: { moduleId },
      include: { _count: { select: { soumissions: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (user.role === Role.APPRENANT) {
      for (const d of base) {
        await this.authz.canAccessDevoir(user, d.id, ResourceAction.READ);
      }
    }
    return base;
  }

  async findOne(id: string, user: any) {
    const { } = await this.authz.canAccessDevoir(user, id, ResourceAction.READ);
    const devoir = await this.prisma.devoir.findUnique({
      where: { id },
      include: {
        module: { include: { formation: true } },
        soumissions: {
          include: { apprenant: { select: { id: true, nom: true, prenom: true, email: true } } },
        },
      },
    });
    if (!devoir) throw new NotFoundException('Devoir introuvable.');

    if (user.role === Role.APPRENANT) {
      return {
        ...devoir,
        soumissions: devoir.soumissions.filter((s) => s.apprenantId === user.id),
      };
    }

    return devoir;
  }

  async submit(devoirId: string, file: Express.Multer.File, user: any) {
    if (user.role !== Role.APPRENANT) throw new ForbiddenException('Réservé aux apprenants.');
    const { } = await this.authz.canAccessDevoir(user, devoirId, ResourceAction.WRITE);
    const devoir = await this.findOne(devoirId, user);
    if (devoir.dateLimite && new Date() > devoir.dateLimite) {
      throw new BadRequestException('La date limite de dépôt est dépassée.');
    }
    const fileUrl = await this.storage.uploadFile(file.buffer, file.originalname, file.mimetype, 'devoirs');
    const soumission = await this.prisma.soumissionDevoir.upsert({
      where: { devoirId_apprenantId: { devoirId, apprenantId: user.id } },
      update: { fileUrl, dateDepot: new Date() },
      create: { devoirId, apprenantId: user.id, fileUrl },
    });

    const etabId = devoir.module?.formation?.etablissementId;
    this.notifications.emit({
      type: 'DEVOIR_SUBMIT',
      recipientEtablissementId: etabId,
      title: 'Nouvelle copie déposée',
      message: `Une nouvelle copie a été déposée pour « ${devoir.titre} ».`,
      data: { devoirId, apprenantId: user.id },
    });

    return soumission;
  }

  async getDevoirsACorriger(user: any) {
    const formationWhere: any = {};
    if (user.role !== Role.ADMIN_CENTRE && user.etablissementId) {
      formationWhere.etablissementId = user.etablissementId;
    }

    const moduleWhere: any = {
      formation: formationWhere,
    };

    if (user.role === Role.FORMATEUR) {
      // Cloisonnement : Un formateur ne visualise et ne note que les devoirs
      // des modules qui lui sont attribués (affectation officielle ou séances de cours)
      moduleWhere.OR = [
        { affectations: { some: { formateurId: user.id } } },
        { seances: { some: { formateurId: user.id } } },
      ];
    }

    const devoirs = await this.prisma.devoir.findMany({
      where: {
        module: moduleWhere,
      },
      include: {
        module: {
          select: {
            id: true,
            titre: true,
            formation: {
              select: { id: true, titre: true, etablissementId: true },
            },
          },
        },
        soumissions: {
          include: {
            apprenant: {
              select: { id: true, nom: true, prenom: true, email: true },
            },
          },
          orderBy: { dateDepot: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return devoirs.map((d) => ({
      id: d.id,
      titre: d.titre,
      consignes: d.consignes,
      dateLimite: d.dateLimite,
      moduleId: d.moduleId,
      moduleTitre: d.module.titre,
      formationId: d.module.formation.id,
      formationTitre: d.module.formation.titre,
      nbTotalSoumissions: d.soumissions.length,
      nbEnAttente: d.soumissions.filter((s) => s.note === null || s.note === undefined).length,
      nbNotes: d.soumissions.filter((s) => s.note !== null && s.note !== undefined).length,
      soumissions: d.soumissions,
    }));
  }

  async noter(devoirId: string, apprenantId: string, note: number, commentaire: string, user: any) {
    const numNote = Number(note);
    if (isNaN(numNote) || numNote < 0 || numNote > 20) {
      throw new BadRequestException('La note doit être une valeur numérique comprise entre 0 et 20.');
    }

    const { } = await this.authz.canAccessDevoir(user, devoirId, ResourceAction.UPDATE);
    const devoir = await this.findOne(devoirId, user);

    const soumission = await this.prisma.soumissionDevoir.update({
      where: { devoirId_apprenantId: { devoirId, apprenantId } },
      data: { note: numNote, commentaire: commentaire ?? '' },
    });

    // ─── Push temps réel : notifier l'apprenant et l'établissement que le devoir a été noté ───
    this.notifications.emit({
      type: 'DEVOIR_NOTE',
      recipientUserId: apprenantId,
      recipientEtablissementId: devoir.module?.formation?.etablissementId,
      title: 'Devoir noté !',
      message: `Votre devoir « ${devoir.titre} » a été noté : ${numNote}/20.${commentaire ? ' ' + commentaire : ''}`,
      data: { devoirId, devoirTitre: devoir.titre, note: numNote, commentaire, soumissionId: soumission.id },
    });

    return soumission;
  }

  async mesSoumissions(userId: string) {
    return this.prisma.soumissionDevoir.findMany({
      where: { apprenantId: userId },
      include: { devoir: { include: { module: { include: { formation: { select: { titre: true } } } } } } },
      orderBy: { dateDepot: 'desc' },
    });
  }

  async update(id: string, data: { titre?: string; consignes?: string; dateLimite?: string; criteresEvaluation?: any }, user: any) {
    const { } = await this.authz.canAccessDevoir(user, id, ResourceAction.UPDATE);
    return this.prisma.devoir.update({
      where: { id },
      data: {
        titre: data.titre,
        consignes: data.consignes,
        dateLimite: data.dateLimite ? new Date(data.dateLimite) : undefined,
        criteresEvaluation: data.criteresEvaluation !== undefined ? data.criteresEvaluation : undefined,
      },
    });
  }

  async delete(id: string, user: any) {
    const { } = await this.authz.canAccessDevoir(user, id, ResourceAction.DELETE);
    return this.prisma.devoir.delete({ where: { id } });
  }
}
