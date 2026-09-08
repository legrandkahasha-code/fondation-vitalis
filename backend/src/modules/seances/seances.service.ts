import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { CreateSeanceDto, UpdateSeanceDto, EmargementDto } from './dto/seances.dto';

@Injectable()
export class SeancesService {
  constructor(private prisma: PrismaService) {}

  private async assertModuleAccess(moduleId: string, user: any) {
    const mod = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { formation: true },
    });
    if (!mod) throw new NotFoundException('Module introuvable.');
    if (user.role !== Role.ADMIN_CENTRE && mod.formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit à ce module.');
    }
    return mod;
  }

  async create(dto: CreateSeanceDto, user: any) {
    await this.assertModuleAccess(dto.moduleId, user);
    if (new Date(dto.dateHeureFin) <= new Date(dto.dateHeureDebut)) {
      throw new BadRequestException('La date de fin doit être postérieure à la date de début.');
    }
    return this.prisma.seanceFormation.create({
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
      include: { module: true, formateur: { select: { nom: true, prenom: true } } },
    });
  }

  async findByModule(moduleId: string, user: any) {
    await this.assertModuleAccess(moduleId, user);
    return this.prisma.seanceFormation.findMany({
      where: { moduleId },
      include: {
        formateur: { select: { nom: true, prenom: true } },
        _count: { select: { presences: true } },
      },
      orderBy: { dateHeureDebut: 'asc' },
    });
  }

  async findByEtablissement(user: any) {
    const where = user.role === Role.ADMIN_CENTRE
      ? {}
      : { module: { formation: { etablissementId: user.etablissementId } } };

    return this.prisma.seanceFormation.findMany({
      where,
      include: {
        module: { include: { formation: { select: { titre: true } } } },
        formateur: { select: { nom: true, prenom: true } },
        _count: { select: { presences: true } },
      },
      orderBy: { dateHeureDebut: 'desc' },
    });
  }

  async findOne(id: string, user: any) {
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
    if (user.role !== Role.ADMIN_CENTRE &&
        seance.module.formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit.');
    }
    return seance;
  }

  async update(id: string, dto: UpdateSeanceDto, user: any) {
    const seance = await this.findOne(id, user);
    if (user.role === Role.FORMATEUR && seance.formateurId !== user.id) {
      throw new ForbiddenException('Seul le formateur assigné peut modifier cette séance.');
    }
    return this.prisma.seanceFormation.update({
      where: { id },
      data: {
        ...dto,
        dateHeureDebut: dto.dateHeureDebut ? new Date(dto.dateHeureDebut) : undefined,
        dateHeureFin: dto.dateHeureFin ? new Date(dto.dateHeureFin) : undefined,
      },
    });
  }

  async remove(id: string, user: any) {
    await this.findOne(id, user);
    return this.prisma.seanceFormation.delete({ where: { id } });
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

    return apprenants.map((a) => {
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
  }
}
