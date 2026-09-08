import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getGlobalKpi() {
    const [etablissements, utilisateurs, formations, certificats, seances] = await Promise.all([
      this.prisma.etablissement.count(),
      this.prisma.utilisateur.groupBy({ by: ['role'], _count: true }),
      this.prisma.formation.count(),
      this.prisma.certificat.count(),
      this.prisma.seanceFormation.count(),
    ]);

    const apprenants = utilisateurs.find(u => u.role === 'APPRENANT')?._count ?? 0;
    const formateurs = utilisateurs.find(u => u.role === 'FORMATEUR')?._count ?? 0;

    return {
      etablissements,
      apprenants,
      formateurs,
      formations,
      certificatsEmis: certificats,
      seancesPlanifiees: seances,
    };
  }

  private static globalDetailedCache: { data: any; expiry: number } | null = null;
  private static readonly DETAILED_CACHE_TTL_MS = 120_000; // 2 minutes (instantané, invalidé sur mutation)

  static clearCache() {
    AnalyticsService.globalDetailedCache = null;
  }

  /**
   * Cockpit exécutif détaillé — optimisé sans requêtes redondantes,
   * avec calcul groupé en base et cache mémoire pour affichage instantané (0-5ms).
   */
  async getGlobalDetailed() {
    const now = Date.now();
    if (AnalyticsService.globalDetailedCache && now < AnalyticsService.globalDetailedCache.expiry) {
      return AnalyticsService.globalDetailedCache.data;
    }

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Exécution groupée en parallèle des requêtes strictement nécessaires (sans requêtes redondantes)
    const [
      countsGlobal,
      parEtablissement,
      userRoleCounts,
      formationCerts,
      admissionStats,
      recentUsers,
      topFormations,
    ] = await Promise.all([
      Promise.all([
        this.prisma.formation.count(),
        this.prisma.certificat.count(),
        this.prisma.seanceFormation.count(),
      ]),
      this.prisma.etablissement.findMany({
        select: {
          id: true,
          nom: true,
          codeAntenne: true,
          pays: true,
          statut: true,
          _count: { select: { utilisateurs: true, formations: true } },
        },
        orderBy: { nom: 'asc' },
      }),
      this.prisma.utilisateur.groupBy({
        by: ['etablissementId', 'role'],
        _count: true,
      }),
      this.prisma.formation.findMany({
        select: {
          etablissementId: true,
          _count: { select: { certificats: true } },
        },
      }),
      this.prisma.candidature.groupBy({
        by: ['statut'],
        _count: true,
      }),
      this.prisma.utilisateur.findMany({
        where: {
          role: 'APPRENANT',
          createdAt: { gte: twelveMonthsAgo },
        },
        select: { createdAt: true },
      }),
      this.prisma.formation.findMany({
        select: {
          id: true,
          titre: true,
          etablissement: { select: { nom: true } },
          _count: { select: { modules: true, certificats: true } },
        },
        orderBy: { certificats: { _count: 'desc' } },
        take: 10,
      }),
    ]);

    const [totalFormations, totalCertificats, totalSeances] = countsGlobal;
    let totalApprenants = 0;
    let totalFormateurs = 0;
    for (const r of userRoleCounts) {
      if (r.role === 'APPRENANT') totalApprenants += r._count;
      else if (r.role === 'FORMATEUR') totalFormateurs += r._count;
    }

    const kpi = {
      etablissements: parEtablissement.length,
      apprenants: totalApprenants,
      formateurs: totalFormateurs,
      formations: totalFormations,
      certificatsEmis: totalCertificats,
      seancesPlanifiees: totalSeances,
    };

    // ── Indexation en mémoire des effectifs par établissement ──
    const countsByEtab = new Map<string, { apprenants: number; formateurs: number }>();
    for (const row of userRoleCounts) {
      if (!row.etablissementId) continue;
      const entry = countsByEtab.get(row.etablissementId) || { apprenants: 0, formateurs: 0 };
      if (row.role === 'APPRENANT') entry.apprenants += row._count;
      else if (row.role === 'FORMATEUR') entry.formateurs += row._count;
      countsByEtab.set(row.etablissementId, entry);
    }

    // ── Indexation des certificats par établissement ──
    const certsByEtab = new Map<string, number>();
    for (const f of formationCerts) {
      certsByEtab.set(
        f.etablissementId,
        (certsByEtab.get(f.etablissementId) || 0) + f._count.certificats,
      );
    }

    // ── Construction des détails d'antenne en O(1) ──
    const etablissementsDetails = parEtablissement.map((e) => {
      const uc = countsByEtab.get(e.id) || { apprenants: 0, formateurs: 0 };
      return {
        id: e.id,
        nom: e.nom,
        codeAntenne: e.codeAntenne,
        pays: e.pays,
        statut: e.statut,
        apprenants: uc.apprenants,
        formateurs: uc.formateurs,
        formations: e._count.formations,
        certificats: certsByEtab.get(e.id) || 0,
        totalUtilisateurs: e._count.utilisateurs,
      };
    });

    // ── Statistiques d'admission par statut ──
    const admissionParStatut = Object.fromEntries(
      admissionStats.map((g) => [g.statut, g._count]),
    );

    // ── Tendances mensuelles ──
    const tendancesMensuelles: Record<string, number> = {};
    for (const u of recentUsers) {
      if (!u.createdAt) continue;
      const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, '0')}`;
      tendancesMensuelles[key] = (tendancesMensuelles[key] || 0) + 1;
    }

    const result = {
      kpi,
      etablissements: etablissementsDetails,
      admissionParStatut,
      tendancesMensuelles,
      topFormations: topFormations.map((f) => ({
        id: f.id,
        titre: f.titre,
        etablissement: f.etablissement.nom,
        modules: f._count.modules,
        certificats: f._count.certificats,
      })),
    };

    // Stockage dans le cache mémoire rapide
    AnalyticsService.globalDetailedCache = {
      data: result,
      expiry: now + AnalyticsService.DETAILED_CACHE_TTL_MS,
    };

    return result;
  }

  async exportGlobalCsv() {
    const data = await this.getGlobalKpi();
    const rows = [
      ['metric', 'value'],
      ['etablissements', String(data.etablissements)],
      ['apprenants', String(data.apprenants)],
      ['formateurs', String(data.formateurs)],
      ['formations', String(data.formations)],
      ['certificatsEmis', String(data.certificatsEmis)],
      ['seancesPlanifiees', String(data.seancesPlanifiees)],
    ];
    return rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  async getEtablissementKpi(etablissementId: string, user: any) {
    if (user.role !== Role.ADMIN_CENTRE && user.etablissementId !== etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit.');
    }

    const [utilisateurs, formations, certificats, presences, progressRecords, notes] = await Promise.all([
      this.prisma.utilisateur.groupBy({
        by: ['role'],
        where: { etablissementId },
        _count: true,
      }),
      this.prisma.formation.count({ where: { etablissementId } }),
      this.prisma.certificat.count({
        where: { formation: { etablissementId } },
      }),
      this.prisma.presenceSeance.findMany({
        where: { utilisateur: { etablissementId } },
        select: { statut: true },
      }),
      this.prisma.userProgress.findMany({
        where: { utilisateur: { etablissementId } },
        select: { complete: true },
      }),
      this.prisma.note.findMany({
        where: { utilisateur: { etablissementId } },
        select: { valeur: true },
      }),
    ]);

    const apprenants = utilisateurs.find((u) => u.role === 'APPRENANT')?._count ?? 0;
    const totalPresences = presences.length;
    const present = presences.filter((p) => p.statut === 'PRESENT' || p.statut === 'RETARD').length;
    const tauxAssiduite = totalPresences > 0 ? Math.round((present / totalPresences) * 100) : 0;

    const totalProgress = progressRecords.length;
    const completed = progressRecords.filter((p) => p.complete).length;
    const tauxCompletion = totalProgress > 0 ? Math.round((completed / totalProgress) * 100) : 0;

    const moyenneGenerale =
      notes.length > 0
        ? Math.round((notes.reduce((s, n) => s + Number(n.valeur), 0) / notes.length) * 100) / 100
        : 0;

    return {
      etablissementId,
      apprenants,
      formations,
      certificatsEmis: certificats,
      tauxAssiduite,
      tauxCompletion,
      moyenneGenerale,
    };
  }

  async getEtablissementDashboardDetails(etablissementId: string, user: any) {
    if (user.role !== Role.ADMIN_CENTRE && user.etablissementId !== etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit.');
    }

    const kpi = await this.getEtablissementKpi(etablissementId, user);

    const formationsList = await this.prisma.formation.findMany({
      where: { etablissementId },
      include: {
        modules: {
          include: {
            cours: true,
            evaluations: {
              include: {
                notes: true,
              },
            },
          },
        },
      },
    });

    const activeApprenantsCount = await this.prisma.utilisateur.count({
      where: { etablissementId, role: 'APPRENANT', actif: true },
    });

    // 1. Récupérer tous les coursIds de l'établissement
    const allCoursIdsTotal = formationsList.flatMap((f) =>
      f.modules.flatMap((m) => m.cours.map((c) => c.id))
    );

    // 2. Requêtes globales uniques en parallèle pour tous les certificats et progressions
    const [certificatsGroup, progressRecords] = await Promise.all([
      this.prisma.certificat.groupBy({
        by: ['formationId'],
        where: { formation: { etablissementId } },
        _count: true,
      }),
      allCoursIdsTotal.length > 0
        ? this.prisma.userProgress.findMany({
            where: {
              coursId: { in: allCoursIdsTotal },
              utilisateur: { etablissementId },
              complete: true,
            },
            select: { coursId: true },
          })
        : [],
    ]);

    const certifCountMap = new Map(certificatsGroup.map((c) => [c.formationId, c._count]));
    const progressCountMap = new Map<string, number>();
    for (const p of progressRecords) {
      progressCountMap.set(p.coursId, (progressCountMap.get(p.coursId) || 0) + 1);
    }

    // 3. Calcul instantané en mémoire
    const formationsStats = formationsList.map((f) => {
      const allCoursIds = f.modules.flatMap((m) => m.cours.map((c) => c.id));
      const allNotes = f.modules.flatMap((m) =>
        m.evaluations.flatMap((e) => e.notes.map((n) => Number(n.valeur)))
      );

      const average =
        allNotes.length > 0
          ? Math.round((allNotes.reduce((s, v) => s + v, 0) / allNotes.length) * 100) / 100
          : 0;

      let completionRate = 0;
      if (allCoursIds.length > 0 && activeApprenantsCount > 0) {
        let fProgressSum = 0;
        for (const cid of allCoursIds) {
          fProgressSum += progressCountMap.get(cid) || 0;
        }
        completionRate = Math.round(
          (fProgressSum / (allCoursIds.length * activeApprenantsCount)) * 100
        );
      }

      const certificatesCount = certifCountMap.get(f.id) || 0;

      return {
        id: f.id,
        titre: f.titre,
        description: f.description,
        modulesCount: f.modules.length,
        coursCount: allCoursIds.length,
        apprenantsCount: activeApprenantsCount,
        tauxCompletion: completionRate,
        moyenneGenerale: average,
        certificatsEmis: certificatesCount,
      };
    });

    const upcomingSessions = await this.prisma.seanceFormation.findMany({
      where: {
        module: { formation: { etablissementId } },
        dateHeureDebut: { gte: new Date() },
      },
      orderBy: { dateHeureDebut: 'asc' },
      take: 5,
      include: {
        formateur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
          },
        },
        module: {
          select: {
            id: true,
            titre: true,
            formation: {
              select: {
                id: true,
                titre: true,
              },
            },
          },
        },
      },
    });

    const recentNotes = await this.prisma.note.findMany({
      where: {
        utilisateur: { etablissementId },
      },
      orderBy: { dateNotation: 'desc' },
      take: 5,
      include: {
        utilisateur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
          },
        },
        evaluation: {
          select: {
            id: true,
            titre: true,
            module: {
              select: {
                id: true,
                titre: true,
              },
            },
          },
        },
      },
    });

    const recentCertificates = await this.prisma.certificat.findMany({
      where: {
        formation: { etablissementId },
      },
      orderBy: { dateEmission: 'desc' },
      take: 5,
      include: {
        utilisateur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
          },
        },
        formation: {
          select: {
            id: true,
            titre: true,
          },
        },
      },
    });

    const recentUsers = await this.prisma.utilisateur.findMany({
      where: { etablissementId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        actif: true,
        createdAt: true,
      },
    });

    return {
      kpi,
      formations: formationsStats,
      upcomingSessions,
      recentNotes,
      recentCertificates,
      recentUsers,
    };
  }


  async getFormationStats(formationId: string, user: any) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
      include: {
        modules: {
          include: {
            cours: true,
            evaluations: { include: { notes: true } },
          },
        },
      },
    });
    if (!formation) return null;
    if (user.role !== Role.ADMIN_CENTRE && formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit.');
    }

    const allCoursIds = formation.modules.flatMap(m => m.cours.map(c => c.id));
    const apprenants = await this.prisma.utilisateur.count({
      where: { etablissementId: formation.etablissementId, role: 'APPRENANT', actif: true },
    });

    const progress = await this.prisma.userProgress.findMany({
      where: { coursId: { in: allCoursIds }, complete: true },
    });

    const allNotes = formation.modules.flatMap(m =>
      m.evaluations.flatMap(e => e.notes.map(n => Number(n.valeur))),
    );
    const moyenne = allNotes.length > 0
      ? Math.round(allNotes.reduce((s, v) => s + v, 0) / allNotes.length * 100) / 100
      : 0;

    const certificats = await this.prisma.certificat.count({ where: { formationId } });

    return {
      formationId,
      titre: formation.titre,
      modules: formation.modules.length,
      cours: allCoursIds.length,
      apprenants,
      tauxCompletion: allCoursIds.length > 0 && apprenants > 0
        ? Math.round((progress.length / (allCoursIds.length * apprenants)) * 100)
        : 0,
      moyenneGenerale: moyenne,
      certificatsEmis: certificats,
    };
  }

  async exportEtablissementCsv(etablissementId: string, user: any) {
    const data = await this.getEtablissementKpi(etablissementId, user);
    const rows = [
      ['metric', 'value'],
      ['etablissementId', data.etablissementId],
      ['apprenants', String(data.apprenants)],
      ['formations', String(data.formations)],
      ['certificatsEmis', String(data.certificatsEmis)],
      ['tauxAssiduite', String(data.tauxAssiduite)],
      ['tauxCompletion', String(data.tauxCompletion)],
      ['moyenneGenerale', String(data.moyenneGenerale)],
    ];
    return rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  async getAdmissionGlobalKpi() {
    const grouped = await this.prisma.candidature.groupBy({ by: ['statut'], _count: true });
    const sessions = await this.prisma.sessionAdmission.count();
    const apprenants = await this.prisma.apprenant.count();
    return {
      apprenantsReseau: apprenants,
      sessionsAdmission: sessions,
      parStatut: Object.fromEntries(grouped.map((g) => [g.statut, g._count])),
    };
  }

  async exportAdmissionCsv() {
    const rows = await this.prisma.candidature.findMany({
      include: {
        session: {
          include: {
            filiere: true,
            niveau: true,
            etablissement: { select: { nom: true, codeAntenne: true, pays: true } },
          },
        },
      },
    });
    const counts = new Map<string, number>();
    for (const c of rows) {
      const key = [
        c.session.etablissement.nom,
        c.session.etablissement.pays || '',
        c.session.filiere.libelle,
        c.session.niveau.libelle,
        c.session.libelle,
      ].join('|');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const csvRows = [
      ['satellite', 'pays', 'filiere', 'niveau', 'session', 'candidatures'],
      ...[...counts.entries()].map(([k, n]) => [...k.split('|'), String(n)]),
    ];
    return csvRows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  }
}
