import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { Role } from '../../common/enums/role.enum';
import { PedagogieService } from '../pedagogie/pedagogie.service';
import { CertificationService } from '../certification/certification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { IdentityService } from '../admission/identity.service';
import { CandidatureService } from '../admission/candidature.service';
import { ApprenantCache } from './apprenant-cache';
import {
  AuthorizationService,
  ResourceAction,
  EnrollmentScope,
} from '../../common/services/authorization.service';

@Injectable()
export class ApprenantService {
  private readonly logger = new Logger(ApprenantService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private pedagogieService: PedagogieService,
    private certificationService: CertificationService,
    private notifications: NotificationsService,
    private identityService: IdentityService,
    private candidatureService: CandidatureService,
    private authz: AuthorizationService,
  ) {}

  /**
   * Helper pour gérer le cache mémoire ultra-rapide (< 1ms)
   */
  private getFromCache<T>(key: string): T | null {
    return ApprenantCache.get<T>(key);
  }

  private setCache<T>(key: string, data: T, ttlMs?: number): T {
    return ApprenantCache.set<T>(key, data, ttlMs);
  }

  public invalidateUserCache(userId: string) {
    ApprenantCache.invalidateParUtilisateur(userId);
  }

  /**
   * Vérifie que l'utilisateur a le rôle APPRENANT
   */
  private assertApprenant(user: any) {
    if (user.role !== Role.APPRENANT) {
      throw new ForbiddenException('Accès réservé exclusivement aux apprenants.');
    }
  }

  /**
   * Garantit qu'un profil Apprenant existe pour cet utilisateur avec son matricule officiel
   * (SÉCURISÉ : select explicites pour fonctionner même si colonnes migration 20260921 pas appliquées)
   */
  public async ensureApprenantProfile(user: any) {
    if (this.identityService) {
      try {
        return await this.identityService.ensureProfileFromUser(user);
      } catch {
        // IdentityService a échoué → fallback en requêtes minimales ci-dessous
      }
    }
    const APPRENANT_MIN_SELECT = {
      id: true, createdAt: true, matricule: true, nom: true, prenom: true,
      email: true, telephone: true, dateNaissance: true, numeroIdentite: true,
      paysOrigine: true, utilisateurId: true, etablissementOrigineId: true, updatedAt: true,
    } as const;
    let existing: any = null;
    try {
      existing = await this.prisma.apprenant.findFirst({
        where: { OR: [{ utilisateurId: user.id }, { email: user.email }] },
        select: APPRENANT_MIN_SELECT,
      });
    } catch {
      try {
        existing = await this.prisma.apprenant.findFirst({
          where: { OR: [{ utilisateurId: user.id }, { email: user.email }] },
          select: { id: true, nom: true, prenom: true, email: true, utilisateurId: true, matricule: true },
        });
      } catch {
        existing = null;
      }
    }
    if (existing) {
      if (!existing.utilisateurId) {
        try {
          return await this.prisma.apprenant.update({
            where: { id: existing.id },
            data: { utilisateurId: user.id },
            select: APPRENANT_MIN_SELECT,
          });
        } catch {
          return existing;
        }
      }
      return existing;
    }
    const count = await this.prisma.apprenant.count();
    const matricule = `VIT-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
    try {
      return await this.prisma.apprenant.create({
        data: {
          matricule,
          nom: user.nom || 'Apprenant',
          prenom: user.prenom || '',
          email: user.email,
          utilisateurId: user.id,
          etablissementOrigineId: user.etablissementId,
        },
        select: APPRENANT_MIN_SELECT,
      });
    } catch (createErr: any) {
      const fallback = await this.prisma.apprenant.findFirst({
        where: { OR: [{ utilisateurId: user.id }, { email: user.email }] },
        select: { id: true, nom: true, prenom: true, email: true, utilisateurId: true, matricule: true },
      });
      if (fallback) return fallback;
      throw createErr;
    }
  }

  private async getEnrolledFormationIds(user: any): Promise<string[]> {
    const STATUTS_CANDIDATURE_LECTURE = [
      'SOUMISE',
      'EN_EVALUATION',
      'ADMISE',
      'LISTE_ATTENTE',
      'CONFIRMEE',
      'INSCRITE',
    ] as const;
    const profile = await this.ensureApprenantProfile(user);
    if (!profile) return [];

    const ids = new Set<string>();

    const inscriptions = await this.prisma.inscription.findMany({
      where: {
        apprenantId: profile.id,
        statut: { in: ['ACTIVE', 'RESERVEE', 'TERMINEE'] },
      },
      select: { formationId: true, formation: { select: { etablissementId: true } } },
    });
    for (const i of inscriptions) {
      ids.add(i.formationId);
    }

    const certifs = await this.prisma.certificat.findMany({
      where: { utilisateurId: user.id },
      select: { formationId: true },
    });
    for (const c of certifs) ids.add(c.formationId);

    const candidaturesActives = await this.prisma.candidature.findMany({
      where: {
        apprenantId: profile.id,
        statut: { in: STATUTS_CANDIDATURE_LECTURE as unknown as any[] },
      },
      select: {
        id: true,
        sessionId: true,
        session: {
          select: {
            id: true,
            formationId: true,
            filiereId: true,
            niveauId: true,
            etablissementId: true,
            etablissementsPartages: true,
          },
        },
      },
    });

    for (const cand of candidaturesActives) {
      if (!cand.session) continue;
      const granted = await this.authz.grantPedagogicalAccessFromCandidature(
        profile.id,
        cand.session,
        cand.id,
      );
      for (const fId of granted) ids.add(fId);
      if (cand.session.formationId) ids.add(cand.session.formationId);
    }

    if (ids.size === 0) return [];

    const formationsOk = await this.prisma.formation.findMany({
      where: {
        id: { in: Array.from(ids) },
        ...(user.etablissementId ? { etablissementId: user.etablissementId } : {}),
      },
      select: { id: true },
    });
    const etabIds = new Set(formationsOk.map((f) => f.id));
    if (etabIds.size > 0) return Array.from(etabIds);

    return Array.from(ids);
  }

  private async formationFilterForUser(user: any): Promise<any> {
    const ids = await this.getEnrolledFormationIds(user);
    if (ids.length > 0) {
      return {
        id: { in: ids },
        etablissementId: user.etablissementId,
      };
    }
    // Si l'apprenant n'est inscrit à aucune formation, ne pas exposer arbitrairement le catalogue
    // complet comme des formations déjà affectées
    return { id: { in: ['00000000-0000-0000-0000-000000000000'] } };
  }

  private async assertFormationAccess(
    formationId: string,
    user: any,
    preloadedFormation?: any,
    action: ResourceAction = ResourceAction.READ,
    scope: EnrollmentScope = EnrollmentScope.CANDIDATURE_OU_INSCRIPTION,
  ): Promise<{ inscription?: any; candidature?: any; sessionId?: string }> {
    const accessKey = `access:${formationId}:${user.id}:${action}`;
    const cached = this.getFromCache<{ inscription?: any; candidature?: any; sessionId?: string }>(accessKey);
    if (cached) return cached;

    const result = await this.authz.canAccessFormation(user, formationId, action, scope, preloadedFormation);
    const payload = {
      inscription: result.inscription,
      candidature: result.candidature,
      sessionId: result.sessionId,
    };
    this.setCache(accessKey, payload, 300_000);
    return payload;
  }

  /**
   * Dashboard Apprenant : agrégat KPIs, formations actives, prochaine échéance (Optimisé Batch Query + RAM Cache)
   */
  async getDashboard(user: any) {
    this.assertApprenant(user);
    const cacheKey = `dashboard:${user.id}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();
    const formationFilter = await this.formationFilterForUser(user);

    // 1. Exécution en parallèle des requêtes principales indépendantes
    // NOTE : select + include EXPLICITES partout. Aucun SELECT * implicite sur
    // Module/Cours/Quiz/Devoir car ils possèdent une colonne "visibilite" qui n'existe
    // potentiellement pas en DB si migration 20260921 pas appliquée.
    const [formations, devoirsSoumis, prochaineSeance, nbQuizPasses, nbCertificats] =
      await Promise.all([
        this.prisma.formation.findMany({
          where: formationFilter,
          select: {
            id: true, titre: true, description: true, actif: true, etablissementId: true,
            modules: {
              select: {
                id: true, titre: true, ordre: true, coefficient: true, formationId: true,
                cours: { select: { id: true } },
              },
            },
            certificats: {
              where: { utilisateurId: user.id },
              select: { id: true },
            },
          },
        }),
        this.prisma.soumissionDevoir.findMany({
          where: { apprenantId: user.id },
          select: { devoirId: true },
        }),
        this.prisma.seanceFormation.findFirst({
          where: {
            dateHeureDebut: { gte: now },
            module: { formation: formationFilter },
          },
          select: {
            id: true, moduleId: true, titreActivite: true, typeSession: true,
            dateHeureDebut: true, dateHeureFin: true, salleOuLien: true,
            module: {
              select: {
                id: true, titre: true,
                formation: { select: { id: true, titre: true } },
              },
            },
            formateur: { select: { nom: true, prenom: true } },
          },
          orderBy: { dateHeureDebut: 'asc' },
        }),
        this.prisma.tentativeQuiz.count({
          where: { apprenantId: user.id },
        }),
        this.prisma.certificat.count({
          where: { utilisateurId: user.id },
        }),
      ]);

    // 2. Extraire tous les coursIds et moduleIds de toutes les formations
    const moduleIds = formations.flatMap((f) => f.modules.map((m) => m.id));
    const coursIds = formations.flatMap((f) => f.modules.flatMap((m) => (m as any).cours.map((c: any) => c.id)));
    const devoirsSoumisIds = devoirsSoumis.map((s) => s.devoirId);
    const totalCours = coursIds.length;

    // 3. Charger progressions et prochain devoir en 1 seule étape parallèle ultra-rapide (index direct moduleId)
    const [completedProgress, prochainDevoir] = await Promise.all([
      coursIds.length > 0
        ? this.prisma.userProgress.findMany({
            where: {
              utilisateurId: user.id,
              coursId: { in: coursIds },
              complete: true,
            },
            select: { coursId: true },
          })
        : [],
      moduleIds.length > 0
        ? this.prisma.devoir.findFirst({
            where: {
              moduleId: { in: moduleIds },
              id: { notIn: devoirsSoumisIds },
              dateLimite: { gte: now },
            },
            select: {
              id: true, moduleId: true, titre: true, consignes: true, dateLimite: true,
              module: {
                select: {
                  id: true,
                  formation: { select: { id: true, titre: true } },
                },
              },
            },
            orderBy: { dateLimite: 'asc' },
          })
        : null,
    ]);

    const completedSet = new Set(completedProgress.map((p) => p.coursId));
    const completionGlobale =
      totalCours > 0 ? Math.round((completedSet.size / totalCours) * 100) : 0;

    // 5. Calcul des progressions par formation en mémoire (0ms CPU)
    const formationsResume = formations.map((f) => {
      const fCoursIds = f.modules.flatMap((m) => (m as any).cours.map((c: any) => c.id));
      const fTotal = fCoursIds.length;
      const fCompleted = fCoursIds.filter((id: string) => completedSet.has(id)).length;
      const fPourcentage = fTotal > 0 ? Math.round((fCompleted / fTotal) * 100) : 0;
      const certif = (f as any).certificats[0] || null;

      return {
        id: f.id,
        titre: f.titre,
        description: f.description,
        nbModules: f.modules.length,
        totalCours: fTotal,
        coursCompletes: fCompleted,
        pourcentage: fPourcentage,
        certifie: !!certif,
        certificatId: certif?.id ?? null,
      };
    });

    // Recherche d'un quiz non passé si aucun devoir ni séance urgente
    let prochaineEcheanceResult: any = null;
    if (prochainDevoir) {
      prochaineEcheanceResult = {
        type: 'devoir',
        id: prochainDevoir.id,
        titre: prochainDevoir.titre,
        formationTitre: (prochainDevoir as any).module.formation.titre,
        dateLimite: prochainDevoir.dateLimite,
      };
    } else if (prochaineSeance) {
      prochaineEcheanceResult = {
        type: 'seance',
        id: prochaineSeance.id,
        titre: prochaineSeance.titreActivite,
        formationTitre: (prochaineSeance as any).module.formation.titre,
        dateLimite: prochaineSeance.dateHeureDebut,
      };
    } else if (moduleIds.length > 0) {
      const prochainQuiz = await this.prisma.quiz.findFirst({
        where: {
          moduleId: { in: moduleIds },
          tentatives: { none: { apprenantId: user.id } },
        },
        select: {
          id: true, moduleId: true, titre: true,
          module: {
            select: {
              id: true,
              formation: { select: { id: true, titre: true } },
            },
          },
        },
      });
      if (prochainQuiz) {
        prochaineEcheanceResult = {
          type: 'quiz',
          id: prochainQuiz.id,
          titre: prochainQuiz.titre,
          formationTitre: (prochainQuiz as any).module.formation.titre,
          dateLimite: null,
        };
      }
    }

    const result = {
      completionGlobale,
      formationsActives: formationsResume,
      nbFormations: formations.length,
      nbQuizPasses,
      nbDevoirsDeposes: devoirsSoumis.length,
      nbCertificats,
      prochaineEcheance: prochaineEcheanceResult,
    };
    return this.setCache(cacheKey, result);
  }

  /**
   * GET /apprenant/bootstrap
   * Bundle unique d'agrégation haute performance : renvoie TOUTES les données
   * de l'apprenant en 1 seule requête parallèle optimisée.
   */
  async getBootstrap(user: any) {
    this.assertApprenant(user);
    const cacheKey = `bootstrap:${user.id}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const profile = await this.ensureApprenantProfile(user);

    const [
      dashboard,
      formations,
      devoirs,
      quiz,
      seances,
      assiduite,
      certificats,
      candidatures,
      dossier,
      formationsFiliere,
    ] = await Promise.all([
      this.getDashboard(user).catch((e) => {
        this.logger.warn(`bootstrap dashboard: ${e?.message}`);
        return null;
      }),
      this.getFormations(user).catch((e) => {
        this.logger.warn(`bootstrap formations: ${e?.message}`);
        return [];
      }),
      this.getAllDevoirs(user).catch((e) => {
        this.logger.warn(`bootstrap devoirs: ${e?.message}`);
        return [];
      }),
      this.getAllQuiz(user).catch((e) => {
        this.logger.warn(`bootstrap quiz: ${e?.message}`);
        return [];
      }),
      this.getSeances(user).catch((e) => {
        this.logger.warn(`bootstrap seances: ${e?.message}`);
        return [];
      }),
      this.getAssiduite(user).catch((e) => {
        this.logger.warn(`bootstrap assiduite: ${e?.message}`);
        return { total: 0, presents: 0, retards: 0, absents: 0, justifies: 0, tauxAssiduite: 0 };
      }),
      this.getCertificats(user).catch((e) => {
        this.logger.warn(`bootstrap certificats: ${e?.message}`);
        return [];
      }),
      this.candidatureService
        ? this.candidatureService.listMine(user).catch((e) => {
            this.logger.warn(`bootstrap candidatures: ${e?.message}`);
            return [];
          })
        : Promise.resolve([]),
      this.getDossier(user).catch((e) => {
        this.logger.warn(`bootstrap dossier: ${e?.message}`);
        return { documents: [], regularisations: [] };
      }),
      this.getFormationsFiliere(user).catch((e) => {
        this.logger.warn(`bootstrap formationsFiliere: ${e?.message}`);
        return {
          filieresChoisies: [],
          hasFiliereChoisie: false,
          totalFormations: 0,
          formations: [],
        };
      }),
    ]);

    const result = {
      profile: {
        id: profile.id,
        utilisateurId: user.id,
        matricule: profile.matricule,
        nom: user.nom || profile.nom,
        prenom: user.prenom || profile.prenom,
        email: user.email || profile.email,
        telephone: profile.telephone || null,
        dateNaissance: profile.dateNaissance || null,
        etablissement: user.etablissement || null,
      },
      dashboard,
      formations,
      formationsFiliere,
      devoirs,
      quiz,
      seances,
      assiduite,
      certificats,
      candidatures,
      dossier,
    };

    return this.setCache(cacheKey, result, 60_000);
  }

  /**
   * Formations affectées / inscrites pour cet apprenant (Optimisé Batch Query + RAM Cache)
   */
  async getFormations(user: any) {
    this.assertApprenant(user);
    const cacheKey = `formations:${user.id}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const formations = await this.prisma.formation.findMany({
      where: await this.formationFilterForUser(user),
      select: {
        id: true, titre: true, description: true, createdAt: true, actif: true, etablissementId: true,
        etablissement: {
          select: { id: true, nom: true, codeAntenne: true },
        },
        modules: {
          orderBy: { ordre: 'asc' },
          select: {
            id: true, titre: true, ordre: true, coefficient: true, formationId: true, createdAt: true,
            cours: { select: { id: true } },
            quiz: { select: { id: true } },
            devoirs: { select: { id: true } },
          },
        },
        certificats: {
          where: { utilisateurId: user.id },
          select: { id: true, numeroSerie: true, dateEmission: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const allCoursIds: string[] = [];
    for (const f of formations) {
      for (const m of f.modules) {
        allCoursIds.push(...(m as any).cours.map((c: any) => c.id));
      }
    }

    const completedProgress = allCoursIds.length > 0
      ? await this.prisma.userProgress.findMany({
          where: {
            utilisateurId: user.id,
            coursId: { in: allCoursIds },
            complete: true,
          },
          select: { coursId: true },
        })
      : [];
    const completedSet = new Set(completedProgress.map((p) => p.coursId));

    const result = formations.map((f) => {
      const fCoursIds = f.modules.flatMap((m) => (m as any).cours.map((c: any) => c.id));
      const fTotal = fCoursIds.length;
      const fCompleted = fCoursIds.filter((id: string) => completedSet.has(id)).length;
      const certif = (f as any).certificats[0] || null;
      const fPourcentage = certif ? 100 : (fTotal > 0 ? Math.round((fCompleted / fTotal) * 100) : 0);
      const totalQuiz = f.modules.reduce((acc, m) => acc + ((m as any).quiz?.length || 0), 0);
      const totalDevoirs = f.modules.reduce((acc, m) => acc + ((m as any).devoirs?.length || 0), 0);

      return {
        id: f.id,
        titre: f.titre,
        description: f.description,
        createdAt: f.createdAt,
        etablissement: f.etablissement,
        nbModules: f.modules.length,
        totalCours: fTotal,
        coursCompletes: fCompleted,
        totalQuiz,
        totalDevoirs,
        pourcentage: fPourcentage,
        estCertifie: !!certif,
        certificat: certif
          ? {
              id: certif.id,
              numeroSerie: certif.numeroSerie,
              dateEmission: certif.dateEmission,
            }
          : null,
      };
    });

    return this.setCache(cacheKey, result);
  }

  /**
   * Récupère toutes les formations de l'établissement rattachées à la filière
   * choisie par l'apprenant :
   *   1. Filière principale (si renseignée sur Apprenant)
   *   2. Intentions déclarées (ApprenantFiliereIntention)
   *   3. Candidatures actives (hors REJETEE/EXPIREE/RETIREE)
   * Fallback : si 0 filière résolue, on renvoie TOUTES les formations actives de l'établissement
   * (évite écran vide pour nouveaux apprenants sans aucun vœu encore)
   */
  async getFormationsFiliere(user: any) {
    this.assertApprenant(user);
    const cacheKey = `formations_filiere:${user.id}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const profile = await this.ensureApprenantProfile(user);
    const userEtabId = user.etablissementId;

    // 1. Obtenir les filières de l'apprenant via le service d'authorisation centralisé
    //    (Politique : filierePrincipale → intentions → candidatures actives)
    const rawFilieres = await this.authz.getFilieresApprenant(user.id);
    const filieresMap = new Map<string, { id: string; libelle: string; code: string; description?: string | null }>();
    for (const f of rawFilieres) {
      filieresMap.set(f.id, {
        id: f.id,
        libelle: f.libelle,
        code: f.code,
        description: f.description,
      });
    }
    const filiereIds = Array.from(filieresMap.keys());

    // 2. Récupérer depuis les SessionsAdmission les formations explicitement rattachées
    //    à ces filières (chemin Session.formationId + Session.filiereId).
    //    Ce chemin complète le lien nullable FormationReferentiel.
    let sessionFormationIds: string[] = [];
    let niveauByFormation = new Map<string, { id: string; libelle: string; code: string } | null>();
    let filiereByFormationSession = new Map<string, { id: string; libelle: string; code: string; description?: string | null }>();

    if (filiereIds.length > 0) {
      try {
        const sessionsAvecFormation = await this.prisma.sessionAdmission.findMany({
          where: {
            filiereId: { in: filiereIds },
            ...(userEtabId
              ? {
                  OR: [
                    { etablissementId: userEtabId },
                    { etablissementsPartages: { has: userEtabId } },
                  ],
                }
              : {}),
          },
          include: { filiere: true, niveau: true },
        });
        sessionFormationIds = sessionsAvecFormation
          .map((s) => s.formationId)
          .filter((id): id is string => !!id);
        for (const s of sessionsAvecFormation) {
          if (s.formationId) {
            filiereByFormationSession.set(s.formationId, {
              id: s.filiere.id,
              libelle: s.filiere.libelle,
              code: s.filiere.code,
              description: s.filiere.description,
            });
            niveauByFormation.set(s.formationId, {
              id: s.niveau.id,
              libelle: s.niveau.libelle,
              code: s.niveau.code,
            });
          }
        }
      } catch (e: any) {
        this.logger.warn(`getFormationsFiliere sessions: ${e?.message}`);
      }
    }

    // 3. Filtre des formations :
    //    - Soit rattachées via FormationReferentiel.filiereId (chemin classique)
    //    - Soit rattachées via SessionAdmission.formationId (chemin session directe)
    //    Si aucune filière n'est détectée, on affiche TOUTES les formations actives
    //    de l'établissement pour éviter un catalogue vide au premier démarrage.
    const whereFormation: any = {
      actif: true,
    };

    if (userEtabId) {
      whereFormation.etablissementId = userEtabId;
    }

    if (filiereIds.length > 0) {
      whereFormation.OR = [
        { formationReferentiel: { filiereId: { in: filiereIds } } },
        { sessionsAdmission: { some: { filiereId: { in: filiereIds } } } },
        ...(sessionFormationIds.length > 0 ? [{ id: { in: sessionFormationIds } }] : []),
      ];
    }

    // 4. Récupérer les formations
    // NOTE : select + include EXPLICITES. Aucun SELECT * implicite pour Module
    // (colonne visibilite potentiellement absente si migration 20260921 pas appliquée en DB).
    let formations: any[] = [];
    try {
      formations = await this.prisma.formation.findMany({
      where: whereFormation,
      select: {
        id: true, etablissementId: true, actif: true, aLaUne: true, ordre: true,
        titre: true, code: true, description: true, duree: true, createdAt: true,
        formationReferentielId: true,
        etablissement: { select: { id: true, nom: true, codeAntenne: true } },
        formationReferentiel: {
          select: {
            id: true,
            libelle: true,
            description: true,
            filiereId: true,
            niveauId: true,
            filiere: { select: { id: true, libelle: true, code: true, description: true } },
            niveau: { select: { id: true, libelle: true, code: true } },
          },
        },
        modules: {
          select: {
            id: true, titre: true, ordre: true, coefficient: true,
            _count: { select: { cours: true, quiz: true, devoirs: true } },
          },
          orderBy: { ordre: 'asc' },
        },
      },
      orderBy: [{ aLaUne: 'desc' }, { ordre: 'asc' }, { titre: 'asc' }],
      });
    } catch (e: any) {
      this.logger.warn(`getFormationsFiliere query: ${e?.message}`);
      formations = [];
    }

    // 4-bis. Sécurité de fallback :
    // Si l'apprenant a bien une/plusieurs filières choisies MAIS que
    // la clause OR (referentiel + sessions) n'a raméné AUCUNE formation
    // (cas typique : formationReferentielId pas encore résolu + session.formationId null)
    // alors on revient au catalogue complet pour ne pas afficher un écran vide.
    if (filiereIds.length > 0 && formations.length === 0) {
      this.logger.warn(
        `getFormationsFiliere fallback : filieres [${filiereIds.join(',')}] ` +
        `n'ont remonté aucune formation via referentiel/session → retour catalogue complet (user ${user.id})`,
      );
      const whereFallback: any = { actif: true };
      if (userEtabId) whereFallback.etablissementId = userEtabId;
      formations = await this.prisma.formation.findMany({
        where: whereFallback,
        select: {
          id: true, etablissementId: true, actif: true, aLaUne: true, ordre: true,
          titre: true, code: true, description: true, duree: true, createdAt: true,
          formationReferentielId: true,
          etablissement: { select: { id: true, nom: true, codeAntenne: true } },
          formationReferentiel: {
            select: {
              id: true,
              libelle: true,
              description: true,
              filiereId: true,
              niveauId: true,
              filiere: { select: { id: true, libelle: true, code: true, description: true } },
              niveau: { select: { id: true, libelle: true, code: true } },
            },
          },
          modules: {
            select: {
              id: true, titre: true, ordre: true, coefficient: true,
              _count: { select: { cours: true, quiz: true, devoirs: true } },
            },
            orderBy: { ordre: 'asc' },
          },
        },
        orderBy: [{ aLaUne: 'desc' }, { ordre: 'asc' }, { titre: 'asc' }],
      });
    }

    // 5. Charger les inscriptions actives ou réservées de l'apprenant
    const mesInscriptions = await this.prisma.inscription.findMany({
      where: {
        apprenantId: profile.id,
        formationId: { in: formations.map((f) => f.id) },
      },
      select: {
        id: true,
        formationId: true,
        statut: true,
        dateDebut: true,
      },
    });

    const inscriptionMap = new Map(mesInscriptions.map((i) => [i.formationId, i]));

    // 6. Annoter le statut de chaque formation pour l'apprenant
    const result = formations.map((f) => {
      const insc = inscriptionMap.get(f.id);
      const filiereRefId = f.formationReferentiel?.filiereId;
      const filiereInfo = filiereRefId
        ? filieresMap.get(filiereRefId) ?? null
        : (filiereByFormationSession.get(f.id) ?? null);
      const niveauInfo = f.formationReferentiel?.niveau ?? niveauByFormation.get(f.id) ?? null;
      const totalCours = f.modules.reduce((acc, m) => acc + (m._count?.cours || 0), 0);
      const totalQuiz = f.modules.reduce((acc, m) => acc + (m._count?.quiz || 0), 0);
      const totalDevoirs = f.modules.reduce((acc, m) => acc + (m._count?.devoirs || 0), 0);

      return {
        id: f.id,
        titre: f.titre,
        code: f.code,
        description: f.description,
        duree: f.duree,
        categorie: f.categorie,
        debouches: f.debouches,
        prerequis: f.prerequis,
        objectifs: f.objectifs,
        fraisInscription: f.fraisInscription,
        etablissement: f.etablissement,
        filiere: f.formationReferentiel?.filiere ?? filiereInfo ?? null,
        niveau: niveauInfo,
        nbModules: f.modules.length,
        totalCours,
        totalQuiz,
        totalDevoirs,
        modulesApercu: f.modules.map((m) => ({ id: m.id, titre: m.titre })),
        estInscrit: !!insc && ['ACTIVE', 'RESERVEE', 'TERMINEE'].includes(insc.statut),
        statutInscription: insc ? insc.statut : null,
        inscriptionId: insc ? insc.id : null,
        pourcentage: null,
      };
    });

    const response = {
      filieresChoisies: Array.from(filieresMap.values()),
      hasFiliereChoisie: filiereIds.length > 0,
      totalFormations: result.length,
      formations: result,
    };

    return this.setCache(cacheKey, response, 60_000);
  }

  /**
   * Arborescence détaillée des modules / cours / quiz / devoirs d'une formation (Optimisé RAM Cache)
   */
  async getFormationModules(formationId: string, user: any) {
    this.assertApprenant(user);
    const cacheKey = `modules:${user.id}:${formationId}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
      select: {
        id: true,
        titre: true,
        description: true,
        etablissementId: true,
        actif: true,
        etablissement: { select: { id: true, nom: true, codeAntenne: true } },
        modules: {
          orderBy: { ordre: 'asc' },
          select: {
            id: true,
            titre: true,
            ordre: true,
            coefficient: true,
            cours: {
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                titre: true,
                contenu: true,
                fileUrl: true,
                createdAt: true,
              },
            },
            quiz: {
              select: {
                id: true,
                titre: true,
                dureeMinutes: true,
                tentatives: {
                  where: { apprenantId: user.id },
                  select: { id: true, score: true, datePassage: true },
                },
              },
            },
            devoirs: {
              select: {
                id: true,
                titre: true,
                consignes: true,
                dateLimite: true,
                soumissions: {
                  where: { apprenantId: user.id },
                  select: {
                    id: true,
                    fileUrl: true,
                    note: true,
                    commentaire: true,
                    dateDepot: true,
                  },
                },
              },
            },
            evaluations: {
              select: {
                id: true,
                titre: true,
                noteMaximale: true,
                notes: {
                  where: { utilisateurId: user.id },
                  select: { valeur: true, dateNotation: true },
                },
              },
            },
          },
        },
      },
    });

    if (!formation) {
      throw new NotFoundException('Formation introuvable.');
    }
    await this.assertFormationAccess(formationId, user);

    // Récupérer les progressions de cours de l'utilisateur
    const progressions = await this.prisma.userProgress.findMany({
      where: { utilisateurId: user.id },
    });
    const progMap = new Map(progressions.map((p) => [p.coursId, p]));

    // Mapper les modules avec statuts de progression
    let totalFormationCours = 0;
    let completedFormationCours = 0;

    const modulesWithStatus = formation.modules.map((m) => {
      const coursList = m.cours.map((c) => {
        const p = progMap.get(c.id);
        const complete = p?.complete ?? false;
        if (complete) completedFormationCours++;
        totalFormationCours++;

        return {
          id: c.id,
          titre: c.titre,
          hasMedia: !!c.fileUrl,
          hasText: !!c.contenu,
          complete,
          dateTerminaison: p?.dateTerminaison ?? null,
        };
      });

      const totalModuleCours = coursList.length;
      const completedModuleCours = coursList.filter((c) => c.complete).length;
      const pourcentageModule =
        totalModuleCours > 0 ? Math.round((completedModuleCours / totalModuleCours) * 100) : 100;

      let statutModule: 'non_commence' | 'en_cours' | 'termine' = 'non_commence';
      if (pourcentageModule === 100 && totalModuleCours > 0) {
        statutModule = 'termine';
      } else if (pourcentageModule > 0) {
        statutModule = 'en_cours';
      }

      const quizList = m.quiz.map((q) => {
        const tentative = q.tentatives[0] || null;
        return {
          id: q.id,
          titre: q.titre,
          dureeMinutes: q.dureeMinutes,
          passe: !!tentative,
          score: tentative ? Number(tentative.score) : null,
          datePassage: tentative?.datePassage ?? null,
        };
      });

      const devoirsList = m.devoirs.map((d) => {
        const soumission = d.soumissions[0] || null;
        return {
          id: d.id,
          titre: d.titre,
          consignes: d.consignes,
          dateLimite: d.dateLimite,
          estEnRetard: d.dateLimite ? new Date() > d.dateLimite && !soumission : false,
          soumis: !!soumission,
          note: soumission?.note ? Number(soumission.note) : null,
          commentaire: soumission?.commentaire ?? null,
          dateDepot: soumission?.dateDepot ?? null,
        };
      });

      const evaluationsList = (m.evaluations || []).map((ev) => {
        const n = ev.notes[0] || null;
        return {
          id: ev.id,
          titre: ev.titre,
          noteMaximale: Number(ev.noteMaximale || 20),
          note: n ? Number(n.valeur) : null,
          dateNotation: n?.dateNotation ?? null,
        };
      });

      return {
        id: m.id,
        titre: m.titre,
        ordre: m.ordre,
        coefficient: Number(m.coefficient ?? 1),
        statut: statutModule,
        pourcentage: pourcentageModule,
        totalCours: totalModuleCours,
        completedCours: completedModuleCours,
        cours: coursList,
        quiz: quizList,
        devoirs: devoirsList,
        evaluations: evaluationsList,
      };
    });

    const progressionGlobale =
      totalFormationCours > 0
        ? Math.round((completedFormationCours / totalFormationCours) * 100)
        : 0;

    // Certificat existant
    const certificat = await this.prisma.certificat.findFirst({
      where: { utilisateurId: user.id, formationId: formation.id },
    });

    const result = {
      formation: {
        id: formation.id,
        titre: formation.titre,
        description: formation.description,
        etablissement: formation.etablissement,
        progressionGlobale,
        certificat: certificat
          ? {
              id: certificat.id,
              numeroSerie: certificat.numeroSerie,
              dateEmission: certificat.dateEmission,
            }
          : null,
      },
      modules: modulesWithStatus,
    };

    return this.setCache(cacheKey, result);
  }

  /**
   * Vérification de l'éligibilité au Certificat selon la règle BR-03
   * Condition : 100% de cours complétés + moyenne >= 10/20
   */
  async checkEligibiliteCertificat(formationId: string, user: any) {
    this.assertApprenant(user);
    const cacheKey = `eligibilite:${user.id}:${formationId}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
    });
    if (!formation) throw new NotFoundException('Formation introuvable.');
    if (!formation) throw new NotFoundException('Formation introuvable.');
    await this.assertFormationAccess(formationId, user);

    const [existingCert, progress, moyenne] = await Promise.all([
      this.prisma.certificat.findFirst({
        where: { formationId, utilisateurId: user.id },
      }),
      this.pedagogieService.getProgressByFormation(formationId, user.id),
      this.pedagogieService.getMoyennePonderee(formationId, user.id),
    ]);

    const completionOk = progress.completionRate >= 100;
    const moyenneOk = moyenne >= 10;
    const eligible = completionOk && moyenneOk;

    let raison: string | null = null;
    if (!completionOk) {
      raison = `Progression de cours incomplète (${progress.completionRate}% / 100%).`;
    } else if (!moyenneOk) {
      raison = `Moyenne générale insuffisante (${moyenne}/20 — minimum 10/20 requis).`;
    }

    const result = {
      eligible,
      completionRate: progress.completionRate,
      moyenne,
      raison,
      dejaEmis: !!existingCert,
      certificat: existingCert
        ? {
            id: existingCert.id,
            numeroSerie: existingCert.numeroSerie,
            dateEmission: existingCert.dateEmission,
            urlPdfS3: existingCert.urlPdfS3,
          }
        : null,
    };

    return this.setCache(cacheKey, result);
  }

  /**
   * Récupère le contenu d'un cours et l'URL du média (lecture sécurisée)
   */
  async getCoursContenu(coursId: string, user: any) {
    this.assertApprenant(user);
    const cacheKey = `cours:${user.id}:${coursId}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const cours = await this.prisma.cours.findUnique({
      where: { id: coursId },
      select: {
        id: true,
        titre: true,
        contenu: true,
        fileUrl: true,
        module: {
          select: {
            id: true,
            titre: true,
            formation: { select: { id: true, titre: true, etablissementId: true } },
          },
        },
      },
    });

    if (!cours) throw new NotFoundException('Cours introuvable.');
    await this.assertFormationAccess(cours.module.formation.id, user);

    const progress = await this.prisma.userProgress.findUnique({
      where: { utilisateurId_coursId: { utilisateurId: user.id, coursId } },
    });

    const result = {
      id: cours.id,
      titre: cours.titre,
      contenu: cours.contenu,
      fileUrl: cours.fileUrl,
      module: {
        id: cours.module.id,
        titre: cours.module.titre,
      },
      formation: cours.module.formation,
      complete: progress?.complete ?? false,
      dateTerminaison: progress?.dateTerminaison ?? null,
    };

    return this.setCache(cacheKey, result);
  }

  /**
   * Marquer un cours comme terminé (déclenche recalcul de la progression et invalidation cache)
   */
  async markCoursProgression(coursId: string, user: any) {
    this.assertApprenant(user);

    const cours = await this.prisma.cours.findUnique({
      where: { id: coursId },
      select: {
        id: true,
        module: {
          select: {
            id: true,
            formationId: true,
            formation: { select: { id: true, titre: true, etablissementId: true, actif: true } },
          },
        },
      },
    });

    if (!cours) throw new NotFoundException('Cours introuvable.');
    await this.assertFormationAccess(cours.module.formation.id, user);

    const updated = await this.prisma.userProgress.upsert({
      where: { utilisateurId_coursId: { utilisateurId: user.id, coursId } },
      update: { complete: true, dateTerminaison: new Date() },
      create: { utilisateurId: user.id, coursId, complete: true, dateTerminaison: new Date() },
    });

    // Invalidation immédiate du cache utilisateur
    this.invalidateUserCache(user.id);

    // Recalcul du pourcentage de la formation
    const progress = await this.pedagogieService.getProgressByFormation(
      cours.module.formationId,
      user.id,
    );

    // Déclenchement automatique de la certification BR-03 si 100% complété et moyenne >= 10/20
    const autoCert = await this.triggerAutoCertification(cours.module.formationId, user.id);

    return {
      success: true,
      coursId,
      complete: updated.complete,
      dateTerminaison: updated.dateTerminaison,
      formationProgress: progress,
      certificatEmis: autoCert ? true : false,
    };
  }

  /**
   * Auto-délivrance ministérielle du certificat (Règle BR-03)
   * Déclenche la création du certificat, génération PDF et signature numérique SHA-256
   */
  private async triggerAutoCertification(formationId: string, utilisateurId: string) {
    try {
      const existingCert = await this.prisma.certificat.findFirst({
        where: { formationId, utilisateurId },
      });
      if (existingCert) return existingCert;

      const progress = await this.pedagogieService.getProgressByFormation(formationId, utilisateurId);
      if (progress.completionRate < 100) return null;

      const moyenne = await this.pedagogieService.getMoyennePonderee(formationId, utilisateurId);
      if (moyenne < 10) return null;

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
      const result = await this.certificationService.emettreCertificat(formationId, utilisateurId, baseUrl);
      this.logger.log(`[Auto-Certification BR-03] Certificat émis avec succès pour l'utilisateur ${utilisateurId} (Formation: ${formationId})`);
      this.invalidateUserCache(utilisateurId);
      return result;
    } catch (err: any) {
      this.logger.warn(`[Auto-Certification BR-03] Notice non-bloquante: ${err?.message}`);
      return null;
    }
  }

  /**
   * Récupère un quiz sans les bonnes réponses (Sécurité anti-triche côté client)
   */
  async getQuiz(quizId: string, user: any) {
    this.assertApprenant(user);
    const cacheKey = `quiz:${quizId}:${user.id}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        titre: true,
        dureeMinutes: true,
        moduleId: true,
        module: {
          select: {
            id: true,
            formation: { select: { id: true, titre: true, etablissementId: true, actif: true } },
          },
        },
        questions: { orderBy: { ordre: 'asc' }, select: { id: true, enonce: true, ordre: true, options: true } },
        tentatives: {
          where: { apprenantId: user.id },
          select: { id: true, score: true, datePassage: true, reponses: true },
        },
      },
    });

    if (!quiz) throw new NotFoundException('Quiz introuvable.');
    await this.assertFormationAccess(quiz.module.formation.id, user, quiz.module.formation);

    const tentative = quiz.tentatives[0] || null;

    // Masquer les champs `correct` des options envoyées au frontend
    const sanitizedQuestions = quiz.questions.map((q) => {
      const optionsRaw = Array.isArray(q.options) ? q.options : [];
      return {
        id: q.id,
        enonce: q.enonce,
        ordre: q.ordre,
        options: optionsRaw.map((opt: any) => ({
          text: opt.text ?? opt.texte ?? '',
        })),
      };
    });

    const result = {
      id: quiz.id,
      titre: quiz.titre,
      dureeMinutes: quiz.dureeMinutes,
      moduleId: quiz.moduleId,
      formationTitre: quiz.module.formation.titre,
      totalQuestions: sanitizedQuestions.length,
      questions: sanitizedQuestions,
      tentative: tentative
        ? {
            id: tentative.id,
            score: Number(tentative.score),
            datePassage: tentative.datePassage,
            dejaPasse: true,
          }
        : null,
    };

    return this.setCache(cacheKey, result, 60_000);
  }

  /**
   * Soumettre un quiz et calcul de score exclusivement côté serveur
   */
  async submitQuiz(
    quizId: string,
    reponses: { questionId: string; selectedIndex: number }[],
    user: any,
  ) {
    this.assertApprenant(user);

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        module: {
          select: {
            formationId: true,
            formation: { select: { id: true, titre: true, etablissementId: true, actif: true } },
          },
        },
        questions: { orderBy: { ordre: 'asc' }, select: { id: true, enonce: true, ordre: true, options: true } },
      },
    });

    if (!quiz) throw new NotFoundException('Quiz introuvable.');
    await this.assertFormationAccess(quiz.module.formation.id, user, quiz.module.formation, ResourceAction.WRITE);

    const existing = await this.prisma.tentativeQuiz.findUnique({
      where: { quizId_apprenantId: { quizId, apprenantId: user.id } },
    });
    if (existing) {
      throw new BadRequestException('Vous avez déjà soumis ce quiz. Une seule tentative est autorisée.');
    }

    // Calcul de score étanche côté serveur
    let bonnesReponses = 0;
    const totalQuestions = quiz.questions.length;

    const detailsCorrection = quiz.questions.map((q) => {
      const rep = reponses.find((r) => r.questionId === q.id);
      const opts = Array.isArray(q.options) ? (q.options as any[]) : [];
      const userSelected = rep !== undefined ? rep.selectedIndex : -1;
      const isCorrect = userSelected >= 0 && opts[userSelected]?.correct === true;

      if (isCorrect) {
        bonnesReponses++;
      }

      return {
        questionId: q.id,
        enonce: q.enonce,
        selectedIndex: userSelected,
        estCorrect: isCorrect,
      };
    });

    const score = totalQuestions > 0 ? Math.round((bonnesReponses / totalQuestions) * 10000) / 100 : 0;

    const tentative = await this.prisma.tentativeQuiz.create({
      data: {
        quizId,
        apprenantId: user.id,
        score,
        reponses: reponses as any,
      },
    });

    // Déclenchement automatique de la certification BR-03 si conditions remplies
    const autoCert = await this.triggerAutoCertification(
      quiz.module.formationId || quiz.module.formation.id,
      user.id,
    );

    // Invalider le cache pour actualiser le dashboard et les modules
    this.invalidateUserCache(user.id);

    return {
      success: true,
      tentativeId: tentative.id,
      score,
      bonnesReponses,
      totalQuestions,
      datePassage: tentative.datePassage,
      detailsCorrection,
      certificatEmis: autoCert ? true : false,
    };
  }

  /**
   * Dépôt d'un devoir par l'apprenant (upload multipart)
   */
  async deposerDevoir(devoirId: string, file: Express.Multer.File, user: any) {
    this.assertApprenant(user);

    if (!file) {
      throw new BadRequestException('Veuillez fournir un fichier pour le devoir.');
    }

    const devoir = await this.prisma.devoir.findUnique({
      where: { id: devoirId },
      select: {
        id: true,
        dateLimite: true,
        module: {
          select: {
            formation: { select: { id: true, titre: true, etablissementId: true, actif: true } },
          },
        },
      },
    });

    if (!devoir) throw new NotFoundException('Devoir introuvable.');
    await this.assertFormationAccess(devoir.module.formation.id, user, undefined, ResourceAction.WRITE);

    if (devoir.dateLimite && new Date() > devoir.dateLimite) {
      throw new BadRequestException('La date limite pour déposer ce devoir est dépassée.');
    }

    const fileUrl = await this.storage.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      'devoirs',
    );

    const soumission = await this.prisma.soumissionDevoir.upsert({
      where: { devoirId_apprenantId: { devoirId, apprenantId: user.id } },
      update: {
        fileUrl,
        dateDepot: new Date(),
      },
      create: {
        devoirId,
        apprenantId: user.id,
        fileUrl,
      },
    });

    // Invalider le cache
    this.invalidateUserCache(user.id);

    return {
      success: true,
      soumissionId: soumission.id,
      devoirId,
      fileUrl: soumission.fileUrl,
      dateDepot: soumission.dateDepot,
    };
  }

  /**
   * Liste des certificats obtenus par l'apprenant (Optimisé RAM Cache)
   */
  async getCertificats(user: any) {
    this.assertApprenant(user);
    const cacheKey = `certificats:${user.id}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const certificats = await this.prisma.certificat.findMany({
      where: { utilisateurId: user.id },
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

    const result = certificats.map((c) => ({
      id: c.id,
      numeroSerie: c.numeroSerie,
      hashVerification: c.hashVerification,
      moyenneGenerale: Number(c.moyenneGenerale),
      dateEmission: c.dateEmission,
      urlPdfS3: c.urlPdfS3,
      formation: c.formation,
    }));

    return this.setCache(cacheKey, result);
  }

  /**
   * GET /apprenant/devoirs — Agrégat optimisé : TOUS les devoirs en UNE SEULE requête SQL
   * Remplace les N+1 boucles séquentielles du frontend (x10+ plus rapide)
   */
  async getAllDevoirs(user: any) {
    this.assertApprenant(user);
    const cacheKey = `devoirs:${user.id}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const enrolledIds = await this.getEnrolledFormationIds(user);
    if (enrolledIds.length === 0) {
      return this.setCache(cacheKey, [], 60_000);
    }
    const formationWhere = { id: { in: enrolledIds }, etablissementId: user.etablissementId };

    const devoirs = await this.prisma.devoir.findMany({
      where: {
        module: {
          formation: formationWhere,
        },
      },
      select: {
        id: true,
        titre: true,
        consignes: true,
        dateLimite: true,
        module: {
          select: {
            id: true,
            titre: true,
            formation: {
              select: { id: true, titre: true },
            },
          },
        },
        soumissions: {
          where: { apprenantId: user.id },
          select: {
            id: true,
            fileUrl: true,
            note: true,
            commentaire: true,
            dateDepot: true,
          },
        },
      },
      orderBy: [{ dateLimite: 'asc' }],
    });

    const result = devoirs.map((d) => {
      const soumission = d.soumissions[0] || null;
      return {
        id: d.id,
        titre: d.titre,
        consignes: d.consignes,
        dateLimite: d.dateLimite,
        moduleTitre: d.module.titre,
        formationId: d.module.formation.id,
        formationTitre: d.module.formation.titre,
        soumission: soumission
          ? {
              id: soumission.id,
              fileUrl: soumission.fileUrl,
              note: soumission.note !== null ? Number(soumission.note) : null,
              commentaire: soumission.commentaire,
              dateDepot: soumission.dateDepot,
            }
          : null,
      };
    });

    return this.setCache(cacheKey, result, 60_000);
  }

  /**
   * Agrégat optimisé : tous les quiz de l'apprenant en une seule requête SQL
   */
  async getAllQuiz(user: any) {
    this.assertApprenant(user);
    const cacheKey = `quiz_all:${user.id}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const enrolledIds = await this.getEnrolledFormationIds(user);
    if (enrolledIds.length === 0) {
      return this.setCache(cacheKey, [], 60_000);
    }
    const formationWhere = { id: { in: enrolledIds }, etablissementId: user.etablissementId };

    const quizList = await this.prisma.quiz.findMany({
      where: {
        module: {
          formation: formationWhere,
        },
      },
      select: {
        id: true,
        titre: true,
        dureeMinutes: true,
        module: {
          select: {
            id: true,
            titre: true,
            formation: {
              select: { id: true, titre: true },
            },
          },
        },
        questions: { select: { id: true } },
        tentatives: {
          where: { apprenantId: user.id },
          select: {
            id: true,
            score: true,
            datePassage: true,
          },
        },
      },
      orderBy: [{ titre: 'asc' }],
    });

    const result = quizList.map((q) => {
      const tentative = q.tentatives[0] || null;
      return {
        id: q.id,
        titre: q.titre,
        dureeMinutes: q.dureeMinutes,
        nbQuestions: q.questions.length,
        moduleId: q.module.id,
        moduleTitre: q.module.titre,
        formationId: q.module.formation.id,
        formationTitre: q.module.formation.titre,
        tentative: tentative
          ? {
              id: tentative.id,
              score: Number(tentative.score),
              datePassage: tentative.datePassage,
            }
          : null,
      };
    });

    return this.setCache(cacheKey, result, 60_000);
  }

  /**
   * Télécharger / récupérer le PDF d'un certificat avec données complètes
   * Accepte soit l'ID UUID du certificat, soit son numéro de série officiel
   */
  async getCertificatPdf(certificatIdOrNum: string, user: any) {
    this.assertApprenant(user);

    const clean = (certificatIdOrNum || '').trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);

    const certificat = await this.prisma.certificat.findFirst({
      where: isUuid
        ? { id: clean }
        : { numeroSerie: { equals: clean, mode: 'insensitive' } },
      include: {
        utilisateur: { select: { id: true, nom: true, prenom: true, email: true } },
        formation: {
          select: {
            id: true,
            titre: true,
            etablissement: { select: { id: true, nom: true, codeAntenne: true } },
          },
        },
      },
    });

    if (!certificat) throw new NotFoundException('Certificat introuvable.');
    if (certificat.utilisateurId !== user.id) {
      throw new ForbiddenException('Accès non autorisé à ce certificat.');
    }

    return certificat;
  }

  /**
   * Séances / Emploi du temps de l'apprenant pour ses formations inscrites
   */
  async getSeances(user: any) {
    this.assertApprenant(user);
    const enrolledIds = await this.getEnrolledFormationIds(user);
    if (enrolledIds.length === 0) return [];

    const seances = await this.prisma.seanceFormation.findMany({
      where: {
        module: {
          formationId: { in: enrolledIds },
        },
      },
      include: {
        module: {
          select: {
            id: true,
            titre: true,
            formation: { select: { id: true, titre: true } },
          },
        },
        formateur: { select: { nom: true, prenom: true, email: true } },
        presences: {
          where: { utilisateurId: user.id },
          select: { statut: true, remarqueJustification: true, misAJourA: true },
        },
      },
      orderBy: { dateHeureDebut: 'asc' },
    });

    return seances.map((s) => ({
      id: s.id,
      titreActivite: s.titreActivite,
      typeSession: s.typeSession,
      dateHeureDebut: s.dateHeureDebut,
      dateHeureFin: s.dateHeureFin,
      salleOuLien: s.salleOuLien,
      moduleTitre: s.module.titre,
      formationId: s.module.formation.id,
      formationTitre: s.module.formation.titre,
      formateurNom: s.formateur ? `${s.formateur.prenom} ${s.formateur.nom}` : 'Non assigné',
      presence: s.presences[0] || null,
    }));
  }

  /**
   * Assiduité globale et statistiques de présence de l'apprenant
   */
  async getAssiduite(user: any) {
    this.assertApprenant(user);
    const presences = await this.prisma.presenceSeance.findMany({
      where: { utilisateurId: user.id },
    });
    const total = presences.length;
    const presents = presences.filter((p) => p.statut === 'PRESENT').length;
    const retards = presences.filter((p) => p.statut === 'RETARD').length;
    const absents = presences.filter((p) => p.statut === 'ABSENT').length;
    const justifies = presences.filter((p) => p.statut === 'JUSTIFIE').length;

    const assidu = presents + retards + justifies;
    const taux = total > 0 ? Math.round((assidu / total) * 100) : 100;

    return {
      total,
      presents,
      retards,
      absents,
      justifies,
      tauxAssiduite: taux,
    };
  }

  /**
   * Relevé de notes officiel complet pour une formation donnée
   */
  async getReleveNotes(formationId: string, user: any) {
    this.assertApprenant(user);
    await this.assertFormationAccess(formationId, user);

    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
      include: {
        etablissement: { select: { nom: true, codeAntenne: true } },
        modules: {
          orderBy: { ordre: 'asc' },
          include: {
            evaluations: {
              include: {
                notes: { where: { utilisateurId: user.id } },
              },
            },
            devoirs: {
              include: {
                soumissions: {
                  where: { apprenantId: user.id },
                  select: { note: true, commentaire: true, dateDepot: true },
                },
              },
            },
            quiz: {
              include: {
                tentatives: {
                  where: { apprenantId: user.id },
                  select: { score: true, datePassage: true },
                },
              },
            },
          },
        },
      },
    });
    if (!formation) throw new NotFoundException('Formation introuvable.');

    const moyenneGenerale = await this.pedagogieService.getMoyennePonderee(formationId, user.id);
    const progress = await this.pedagogieService.getProgressByFormation(formationId, user.id);

    const modulesDetails = formation.modules.map((m) => {
      const epreuves: Array<{
        type: 'evaluation' | 'devoir' | 'quiz';
        titre: string;
        noteSur20: number | null;
        date: Date | null;
      }> = [];

      for (const ev of m.evaluations) {
        const n = ev.notes[0];
        const max = Number(ev.noteMaximale) || 20;
        epreuves.push({
          type: 'evaluation',
          titre: ev.titre,
          noteSur20: n ? (Number(n.valeur) / max) * 20 : null,
          date: n?.dateNotation ?? null,
        });
      }

      for (const dev of m.devoirs) {
        const s = dev.soumissions[0];
        epreuves.push({
          type: 'devoir',
          titre: dev.titre,
          noteSur20: s && s.note !== null ? Number(s.note) : null,
          date: s?.dateDepot ?? null,
        });
      }

      for (const q of m.quiz) {
        const t = q.tentatives[0];
        epreuves.push({
          type: 'quiz',
          titre: q.titre,
          noteSur20: t && t.score !== null ? (Number(t.score) / 100) * 20 : null,
          date: t?.datePassage ?? null,
        });
      }

      const notesValides = epreuves.map((e) => e.noteSur20).filter((n): n is number => n !== null);
      const moyenneModule =
        notesValides.length > 0
          ? Math.round((notesValides.reduce((acc, v) => acc + v, 0) / notesValides.length) * 100) / 100
          : null;

      return {
        id: m.id,
        titre: m.titre,
        ordre: m.ordre,
        coefficient: Number(m.coefficient ?? 1),
        moyenneModule,
        epreuves,
      };
    });

    let mention = 'Ajourné';
    if (moyenneGenerale >= 16) mention = 'Très Bien';
    else if (moyenneGenerale >= 14) mention = 'Bien';
    else if (moyenneGenerale >= 12) mention = 'Assez Bien';
    else if (moyenneGenerale >= 10) mention = 'Passable';

    return {
      formation: {
        id: formation.id,
        titre: formation.titre,
        etablissement: formation.etablissement,
      },
      apprenant: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
      },
      completionRate: progress.completionRate,
      moyenneGenerale,
      mention,
      dateEdition: new Date(),
      modules: modulesDetails,
    };
  }

  /**
   * Dossier administratif & pièces justificatives de l'apprenant
   */
  async getDossier(user: any) {
    this.assertApprenant(user);
    const [documents, regularisations] = await Promise.all([
      this.prisma.documentDossier.findMany({
        where: { utilisateurId: user.id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.demandeRegularisation.findMany({
        where: { utilisateurId: user.id },
        include: { auteur: { select: { nom: true, prenom: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      documents: documents.map((d) => ({
        ...d,
        fileUrl: d.fileUrl ? this.storage.resolveUrl(d.fileUrl) : null,
      })),
      regularisations,
    };
  }

  /**
   * Téléversement d'un document administratif par l'apprenant
   */
  async uploadDocumentDossier(file: Express.Multer.File, typeDocument: string, titre: string, user: any) {
    this.assertApprenant(user);
    if (!file) throw new BadRequestException('Fichier obligatoire.');

    const fileUrl = await this.storage.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      'dossiers',
    );

    const doc = await this.prisma.documentDossier.create({
      data: {
        utilisateurId: user.id,
        titre: titre || file.originalname,
        typeDocument: typeDocument || 'AUTRE',
        nomFichier: file.originalname,
        fileUrl,
        statut: 'EN_ATTENTE',
        ajouteParId: user.id,
      },
    });

    return doc;
  }

  /**
   * Répondre à une demande de régularisation administrative (pièce justificative + commentaire)
   */
  async repondreRegularisation(
    regularisationId: string,
    file: Express.Multer.File | undefined,
    commentaire: string,
    user: any,
  ) {
    this.assertApprenant(user);
    const demande = await this.prisma.demandeRegularisation.findUnique({
      where: { id: regularisationId },
    });
    if (!demande) {
      throw new NotFoundException('Demande de régularisation introuvable.');
    }
    if (demande.utilisateurId !== user.id) {
      throw new ForbiddenException('Accès interdit à cette demande de régularisation.');
    }

    let documentCreated: any = null;
    if (file) {
      const fileUrl = await this.storage.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        'dossiers',
      );

      documentCreated = await this.prisma.documentDossier.create({
        data: {
          utilisateurId: user.id,
          titre: `Pièce justificative - ${demande.motif}`,
          typeDocument: 'REGULARISATION',
          nomFichier: file.originalname,
          fileUrl,
          statut: 'EN_ATTENTE',
          commentaire: commentaire || 'Transmis en réponse à la demande de régularisation',
          ajouteParId: user.id,
        },
      });
    }

    const updated = await this.prisma.demandeRegularisation.update({
      where: { id: regularisationId },
      data: {
        statut: 'SOUMIS',
        decisionCommentaire: commentaire
          ? `Réponse apprenant (${new Date().toLocaleDateString('fr-FR')}) : ${commentaire}`
          : demande.decisionCommentaire,
        updatedAt: new Date(),
      },
    });

    // Notifier l'auteur de la demande (Agent administratif ou Admin Centre)
    if (demande.auteurId) {
      this.notifications.emit({
        type: 'REGULARISATION_REPONDUE',
        recipientUserId: demande.auteurId,
        title: 'Pièce de régularisation soumise',
        message: `L'apprenant ${user.prenom || ''} ${user.nom || ''} a transmis les pièces pour la demande : « ${demande.motif} ».`,
        data: {
          demandeId: demande.id,
          apprenantId: user.id,
          documentId: documentCreated?.id,
        },
      });
    }

    return {
      demande: updated,
      document: documentCreated,
    };
  }

  /**
   * Mise à jour du profil apprenant (synchronise Utilisateur + Apprenant)
   */
  async updateProfile(user: any, dto: { nom?: string; prenom?: string; telephone?: string }) {
    this.assertApprenant(user);
    const profile = await this.ensureApprenantProfile(user);

    const userUpdate: any = {};
    if (dto.nom && dto.nom.trim()) userUpdate.nom = dto.nom.trim();
    if (dto.prenom && dto.prenom.trim()) userUpdate.prenom = dto.prenom.trim();

    if (Object.keys(userUpdate).length > 0) {
      await this.prisma.utilisateur.update({
        where: { id: user.id },
        data: userUpdate,
      });
    }

    const apprenantUpdate: any = {};
    if (dto.nom && dto.nom.trim()) apprenantUpdate.nom = dto.nom.trim();
    if (dto.prenom && dto.prenom.trim()) apprenantUpdate.prenom = dto.prenom.trim();
    if (dto.telephone !== undefined) apprenantUpdate.telephone = dto.telephone ? dto.telephone.trim() : null;

    if (Object.keys(apprenantUpdate).length > 0) {
      await this.prisma.apprenant.update({
        where: { id: profile.id },
        data: apprenantUpdate,
      });
    }

    this.invalidateUserCache(user.id);

    return {
      success: true,
      nom: dto.nom ?? user.nom,
      prenom: dto.prenom ?? user.prenom,
      telephone: dto.telephone ?? profile.telephone,
      matricule: profile.matricule,
    };
  }

  /**
   * Génération manuelle ou déclenchement du certificat pour une formation si éligible (Règle BR-03)
   */
  async genererCertificatSiEligible(formationId: string, user: any) {
    this.assertApprenant(user);
    await this.assertFormationAccess(formationId, user);
    const cert = await this.triggerAutoCertification(formationId, user.id);
    if (!cert) {
      const eligibilite = await this.checkEligibiliteCertificat(formationId, user);
      if (!eligibilite.eligible) {
        throw new BadRequestException(
          eligibilite.raison || "Les conditions d'obtention de la certification (Règle BR-03) ne sont pas encore réunies.",
        );
      }
    }
    this.invalidateUserCache(user.id);
    return { success: true, certificat: cert };
  }
}
