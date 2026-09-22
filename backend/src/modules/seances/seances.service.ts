import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Role } from '../../common/enums/role.enum';
import { CreateSeanceDto, UpdateSeanceDto, EmargementDto } from './dto/seances.dto';
import {
  AuthorizationService,
  ResourceAction,
  EnrollmentScope,
} from '../../common/services/authorization.service';

@Injectable()
export class SeancesService {
  // Cache serveur mémoire à TTL court + invalidation immédiate sur écriture
  private seancesCache = new Map<string, { data: any; expiresAt: number }>();
  private assiduiteCache = new Map<string, { data: any; expiresAt: number }>();
  private readonly CACHE_TTL = 60_000; // 60 secondes

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private authz: AuthorizationService,
  ) {}

  private invalidateCache(etablissementId?: string) {
    if (etablissementId) {
      this.seancesCache.delete(etablissementId);
      this.assiduiteCache.delete(etablissementId);
    } else {
      this.seancesCache.clear();
      this.assiduiteCache.clear();
    }
    this.seancesCache.delete('ALL');
    this.assiduiteCache.delete('ALL');
  }

  private async assertModuleAccess(moduleId: string, user: any) {
    const scope = user.role === Role.APPRENANT
      ? EnrollmentScope.CANDIDATURE_OU_INSCRIPTION
      : EnrollmentScope.ETABLISSEMENT_ONLY;
    const { module: mod } = await this.authz.canAccessModule(user, moduleId, ResourceAction.READ, scope);
    return mod;
  }

  async create(dto: CreateSeanceDto, user: any) {
    const mod = await this.assertModuleAccess(dto.moduleId, user);
    if (new Date(dto.dateHeureFin) <= new Date(dto.dateHeureDebut)) {
      throw new BadRequestException('La date de fin doit être postérieure à la date de début.');
    }
    const seance = await this.prisma.seanceFormation.create({
      data: {
        moduleId: dto.moduleId,
        coursId: dto.coursId,
        formateurId: user.id,
        titreActivite: dto.titreActivite,
        typeSession: dto.typeSession,
        dateHeureDebut: new Date(dto.dateHeureDebut),
        dateHeureFin: new Date(dto.dateHeureFin),
        salleOuLien: dto.salleOuLien,
      },
      include: { module: { include: { formation: true } }, formateur: { select: { nom: true, prenom: true } } },
    });

    const etabId = mod.formation.etablissementId;
    this.invalidateCache(etabId);

    // ─── Push Temps Réel SSE ───
    this.notifications.emit({
      type: 'SEANCE_UPDATE',
      recipientEtablissementId: etabId,
      title: 'Nouvelle séance planifiée',
      message: `Une séance "${seance.titreActivite}" a été planifiée.`,
      data: { seanceId: seance.id, action: 'CREATE', etablissementId: etabId },
    });

    return seance;
  }

  async findByModule(moduleId: string, user: any) {
    await this.assertModuleAccess(moduleId, user);
    const liste = await this.prisma.seanceFormation.findMany({
      where: { moduleId },
      include: {
        formateur: { select: { nom: true, prenom: true } },
        _count: { select: { presences: true } },
      },
      orderBy: { dateHeureDebut: 'asc' },
    });
    if (user.role === Role.APPRENANT) {
      for (const s of liste) {
        await this.authz.canAccessSeance(user, s.id, ResourceAction.READ);
      }
    }
    return liste;
  }

  async findByEtablissement(user: any) {
    const cacheKey = user.role === Role.ADMIN_CENTRE ? 'ALL' : user.etablissementId;
    const cached = this.seancesCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    const where = user.role === Role.ADMIN_CENTRE
      ? {}
      : { module: { formation: { etablissementId: user.etablissementId } } };

    const data = await this.prisma.seanceFormation.findMany({
      where,
      include: {
        module: { include: { formation: { select: { titre: true } } } },
        formateur: { select: { nom: true, prenom: true } },
        _count: { select: { presences: true } },
      },
      orderBy: { dateHeureDebut: 'desc' },
    });

    this.seancesCache.set(cacheKey, { data, expiresAt: Date.now() + this.CACHE_TTL });
    return data;
  }

  async findOne(id: string, user: any) {
    const { seance: s } = await this.authz.canAccessSeance(user, id, ResourceAction.READ);
    const seance = await this.prisma.seanceFormation.findUnique({
      where: { id },
      include: {
        module: { include: { formation: true } },
        formateur: { select: { id: true, nom: true, prenom: true } },
        presences: {
          include: { utilisateur: { select: { id: true, nom: true, prenom: true, email: true } } },
        },
      },
    });
    if (!seance) throw new NotFoundException('Séance introuvable.');
    return seance;
  }

  async update(id: string, dto: UpdateSeanceDto, user: any) {
    const { seance: s } = await this.authz.canAccessSeance(user, id, ResourceAction.UPDATE);
    const seance = await this.findOne(id, user);
    if (user.role === Role.FORMATEUR && seance.formateurId !== user.id) {
      throw new ForbiddenException('Seul le formateur assigné peut modifier cette séance.');
    }
    const updated = await this.prisma.seanceFormation.update({
      where: { id },
      data: {
        ...dto,
        dateHeureDebut: dto.dateHeureDebut ? new Date(dto.dateHeureDebut) : undefined,
        dateHeureFin: dto.dateHeureFin ? new Date(dto.dateHeureFin) : undefined,
      },
    });

    const etabId = seance.module.formation.etablissementId;
    this.invalidateCache(etabId);

    // ─── Push Temps Réel SSE ───
    this.notifications.emit({
      type: 'SEANCE_UPDATE',
      recipientEtablissementId: etabId,
      title: 'Séance modifiée',
      message: `La séance "${updated.titreActivite}" a été modifiée.`,
      data: { seanceId: updated.id, action: 'UPDATE', etablissementId: etabId },
    });

    return updated;
  }

  async remove(id: string, user: any) {
    const { } = await this.authz.canAccessSeance(user, id, ResourceAction.DELETE);
    const seance = await this.findOne(id, user);
    const etabId = seance.module.formation.etablissementId;
    const deleted = await this.prisma.seanceFormation.delete({ where: { id } });

    this.invalidateCache(etabId);

    // ─── Push Temps Réel SSE ───
    this.notifications.emit({
      type: 'SEANCE_UPDATE',
      recipientEtablissementId: etabId,
      title: 'Séance supprimée',
      message: `Une séance a été supprimée / annulée.`,
      data: { seanceId: id, action: 'DELETE', etablissementId: etabId },
    });

    return deleted;
  }

  async emargement(seanceId: string, presences: EmargementDto[], user: any, ip: string) {
    const seance = await this.findOne(seanceId, user);
    const canEmarger = [Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR, Role.PERSONNEL_ADMINISTRATIF]
      .includes(user.role as Role);
    if (!canEmarger) throw new ForbiddenException('Droits d\'émargement insuffisants.');
    if (user.role === Role.FORMATEUR && seance.formateurId !== user.id) {
      throw new ForbiddenException('Seul le formateur assigné peut effectuer l\'émargement.');
    }

    const results: Awaited<ReturnType<typeof this.prisma.presenceSeance.upsert>>[] = [];
    for (const p of presences) {
      const result = await this.prisma.presenceSeance.upsert({
        where: { seanceId_utilisateurId: { seanceId, utilisateurId: p.apprenantId } },
        update: { statut: p.statut, remarqueJustification: p.remarqueJustification },
        create: {
          seanceId,
          utilisateurId: p.apprenantId,
          statut: p.statut,
          remarqueJustification: p.remarqueJustification,
        },
      });
      results.push(result);
    }

    await this.prisma.auditLog.create({
      data: {
        auteurId: user.id,
        action: 'EMARGEMENT',
        ipAdresse: ip,
        tableCible: 'presences_seances',
        details: { seanceId, count: presences.length },
      },
    });

    const etabId = seance.module.formation.etablissementId;
    this.invalidateCache(etabId);

    // ─── Push Temps Réel SSE pour Assiduité & Séances ───
    this.notifications.emit({
      type: 'ASSIDUITE_UPDATE',
      recipientEtablissementId: etabId,
      title: 'Émargement enregistré',
      message: `L'émargement de la séance "${seance.titreActivite}" a été validé.`,
      data: { seanceId, count: presences.length, etablissementId: etabId },
    });
    this.notifications.emit({
      type: 'SEANCE_UPDATE',
      recipientEtablissementId: etabId,
      title: 'Séance émargée',
      message: `Présences mises à jour pour "${seance.titreActivite}".`,
      data: { seanceId, action: 'EMARGEMENT', etablissementId: etabId },
    });

    return { success: true, presences: results };
  }

  async getAssiduite(apprenantId: string, user: any) {
    if (user.role === Role.APPRENANT && user.id !== apprenantId) {
      throw new ForbiddenException('Accès interdit.');
    }
    const presences = await this.prisma.presenceSeance.findMany({
      where: { utilisateurId: apprenantId },
    });
    const total = presences.length;
    const present = presences.filter(p => p.statut === 'PRESENT' || p.statut === 'RETARD').length;
    const taux = total > 0 ? Math.round((present / total) * 100) : 100;
    return { total, present, absent: total - present, tauxAssiduite: taux };
  }

  async getApprenantsSeance(seanceId: string, user: any) {
    const seance = await this.findOne(seanceId, user);
    return this.prisma.utilisateur.findMany({
      where: {
        etablissementId: seance.module.formation.etablissementId,
        role: Role.APPRENANT,
        actif: true,
      },
      select: { id: true, nom: true, prenom: true, email: true },
      orderBy: { nom: 'asc' },
    });
  }

  async getAssiduiteSynthese(etablissementId: string, user: any) {
    if (user.role !== Role.ADMIN_CENTRE && user.etablissementId !== etablissementId) {
      throw new ForbiddenException('Accès interdit à cet établissement.');
    }

    const cached = this.assiduiteCache.get(etablissementId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    const apprenants = await this.prisma.utilisateur.findMany({
      where: {
        etablissementId,
        role: Role.APPRENANT,
        actif: true,
      },
      select: { id: true, nom: true, prenom: true, email: true },
      orderBy: { nom: 'asc' },
    });

    if (apprenants.length === 0) {
      this.assiduiteCache.set(etablissementId, { data: [], expiresAt: Date.now() + this.CACHE_TTL });
      return [];
    }

    const apprenantIds = apprenants.map((a) => a.id);
    const presenceGroups = await this.prisma.presenceSeance.groupBy({
      by: ['utilisateurId', 'statut'],
      where: {
        utilisateurId: { in: apprenantIds },
      },
      _count: true,
    });

    const presencesMap = new Map<string, { total: number; present: number }>();
    for (const g of presenceGroups) {
      const entry = presencesMap.get(g.utilisateurId) || { total: 0, present: 0 };
      entry.total += g._count;
      if (g.statut === 'PRESENT' || g.statut === 'RETARD') {
        entry.present += g._count;
      }
      presencesMap.set(g.utilisateurId, entry);
    }

    const data = apprenants.map((a) => {
      const stats = presencesMap.get(a.id) || { total: 0, present: 0 };
      const taux = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 100;
      return {
        apprenant: a,
        total: stats.total,
        present: stats.present,
        absent: stats.total - stats.present,
        taux,
      };
    });

    this.assiduiteCache.set(etablissementId, { data, expiresAt: Date.now() + this.CACHE_TTL });
    return data;
  }
}
