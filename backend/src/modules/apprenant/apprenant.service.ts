import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { Role } from '../../common/enums/role.enum';
import { PedagogieService } from '../pedagogie/pedagogie.service';
import { CertificationService } from '../certification/certification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { IdentityService } from '../admission/identity.service';
import { CandidatureService } from '../admission/candidature.service';

@Injectable()
export class ApprenantService {
  private readonly logger = new Logger(ApprenantService.name);
  private static readonly cache = new Map<string, { data: any; expiry: number }>();
  private static readonly DEFAULT_TTL_MS = 60 * 1000; // 60s TTL

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private pedagogieService: PedagogieService,
    private certificationService: CertificationService,
    private notifications: NotificationsService,
    private identityService: IdentityService,
    private candidatureService: CandidatureService,
  ) {}

  /**
   * Helper pour gérer le cache mémoire ultra-rapide (< 1ms)
   */
  private getFromCache<T>(key: string): T | null {
    const entry = ApprenantService.cache.get(key);
    if (entry && entry.expiry > Date.now()) {
      return entry.data as T;
    }
    ApprenantService.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T, ttlMs = ApprenantService.DEFAULT_TTL_MS): T {
    ApprenantService.cache.set(key, { data, expiry: Date.now() + ttlMs });
    return data;
  }

  public invalidateUserCache(userId: string) {
    for (const key of ApprenantService.cache.keys()) {
      if (key.includes(userId)) {
        ApprenantService.cache.delete(key);
      }
    }
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
   */
  public async ensureApprenantProfile(user: any) {
    if (this.identityService) {
      return this.identityService.ensureProfileFromUser(user);
    }
    const existing = await this.prisma.apprenant.findFirst({
      where: { OR: [{ utilisateurId: user.id }, { email: user.email }] },
    });
    if (existing) {
      if (!existing.utilisateurId) {
        return this.prisma.apprenant.update({
          where: { id: existing.id },
          data: { utilisateurId: user.id },
        });
      }
      return existing;
    }
    const count = await this.prisma.apprenant.count();
    const matricule = `VIT-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
    return this.prisma.apprenant.create({
      data: {
        matricule,
        nom: user.nom || 'Apprenant',
        prenom: user.prenom || '',
        email: user.email,
        utilisateurId: user.id,
        etablissementOrigineId: user.etablissementId,
      },
    });
  }

  private async getEnrolledFormationIds(user: any): Promise<string[]> {
    const profile = await this.ensureApprenantProfile(user);
    if (!profile) return [];
    const inscriptions = await this.prisma.inscription.findMany({
      where: {
        apprenantId: profile.id,
        statut: { in: ['ACTIVE', 'RESERVEE', 'TERMINEE'] },
        formation: { etablissementId: user.etablissementId },
      },
      select: { formationId: true },
    });
    const certifs = await this.prisma.certificat.findMany({
      where: {
        utilisateurId: user.id,
        formation: { etablissementId: user.etablissementId },
      },
      select: { formationId: true },
    });
    return Array.from(new Set([
      ...inscriptions.map((i) => i.formationId),
      ...certifs.map((c) => c.formationId),
    ]));
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

  private async assertFormationAccess(formationId: string, user: any, preloadedFormation?: any) {
    const accessKey = `access:${formationId}:${user.id}`;
    if (this.getFromCache(accessKey)) return;

    // 1. Isolation multi-tenant stricte : l'apprenant ne peut pas accéder aux formations d'un autre établissement
    const formation = preloadedFormation || await this.prisma.formation.findUnique({
      where: { id: formationId },
      select: { id: true, etablissementId: true },
    });
    if (!formation) {
      throw new NotFoundException('Formation introuvable.');
    }

    if (user.etablissementId && formation.etablissementId && formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit à une formation hors de votre établissement.');
    }

    // 2. Chemin rapide : inscription active déjà existante (1 seule requête SQL ultra-rapide)
    const existingInscription = await this.prisma.inscription.findFirst({
      where: {
        formationId,
        apprenant: { utilisateurId: user.id },
        statut: { in: ['ACTIVE', 'RESERVEE', 'TERMINEE'] },
      },
      select: { id: true },
    });
    if (existingInscription) {
      this.setCache(accessKey, true, 300_000);
      return;
    }

    // 3. Chemin rapide : certificat officiel déjà obtenu
    const cert = await this.prisma.certificat.findFirst({
      where: { formationId, utilisateurId: user.id },
      select: { id: true },
    });
    if (cert) {
      this.setCache(accessKey, true, 300_000);
      return;
    }

    // 4. Vérifier si l'apprenant dispose d'une candidature formellement admise ou confirmée
    const profile = await this.prisma.apprenant.findUnique({ where: { utilisateurId: user.id } });
    if (profile) {
      const candidatureValidee = await this.prisma.candidature.findFirst({
        where: {
          apprenantId: profile.id,
          session: { formationId },
          statut: { in: ['CONFIRMEE', 'INSCRITE', 'ADMISE'] },
        },
        select: { id: true, sessionId: true },
      });

      if (candidatureValidee) {
        try {
          await this.prisma.inscription.upsert({
            where: {
              apprenantId_formationId: {
                apprenantId: profile.id,
                formationId,
              },
            },
            update: { statut: 'ACTIVE' },
            create: {
              apprenantId: profile.id,
              formationId,
              candidatureId: candidatureValidee.id,
              sessionId: candidatureValidee.sessionId,
              statut: 'ACTIVE',
            },
          });
          this.invalidateUserCache(user.id);
          this.setCache(accessKey, true, 300_000);
          return;
        } catch (err) {
          this.setCache(accessKey, true, 300_000);
          return;
        }
      }
    }

    throw new ForbiddenException(
      "Accès non autorisé : vous devez être officiellement inscrit ou admis à cette formation pour accéder à son contenu pédagogique. Veuillez soumettre ou confirmer votre candidature via l'espace Candidatures.",
    );
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
    const [formations, devoirsSoumis, prochaineSeance, nbQuizPasses, nbCertificats] =
      await Promise.all([
        this.prisma.formation.findMany({
          where: formationFilter,
          include: {
            modules: {
              include: {
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
          include: {
            module: { include: { formation: { select: { titre: true } } } },
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
    const coursIds = formations.flatMap((f) => f.modules.flatMap((m) => m.cours.map((c) => c.id)));
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
            include: {
              module: {
                include: { formation: { select: { id: true, titre: true } } },
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
      const fCoursIds = f.modules.flatMap((m) => m.cours.map((c) => c.id));
      const fTotal = fCoursIds.length;
      const fCompleted = fCoursIds.filter((id) => completedSet.has(id)).length;
      const fPourcentage = fTotal > 0 ? Math.round((fCompleted / fTotal) * 100) : 0;
      const certif = f.certificats[0] || null;

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
        formationTitre: prochainDevoir.module.formation.titre,
        dateLimite: prochainDevoir.dateLimite,
      };
    } else if (prochaineSeance) {
      prochaineEcheanceResult = {
        type: 'seance',
        id: prochaineSeance.id,
        titre: prochaineSeance.titreActivite,
        formationTitre: prochaineSeance.module.formation.titre,
        dateLimite: prochaineSeance.dateHeureDebut,
      };
    } else if (moduleIds.length > 0) {
      const prochainQuiz = await this.prisma.quiz.findFirst({
        where: {
          moduleId: { in: moduleIds },
          tentatives: { none: { apprenantId: user.id } },
        },
        include: {
          module: { include: { formation: { select: { titre: true } } } },
        },
      });
      if (prochainQuiz) {
        prochaineEcheanceResult = {
          type: 'quiz',
          id: prochainQuiz.id,
          titre: prochainQuiz.titre,
          formationTitre: prochainQuiz.module.formation.titre,
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
      this.getDashboard(user),
      this.getFormations(user),
      this.getAllDevoirs(user),
      this.getAllQuiz(user),
      this.getSeances(user),
      this.getAssiduite(user),
      this.getCertificats(user),
      this.candidatureService ? this.candidatureService.listMine(user) : [],
      this.getDossier(user),
      this.getFormationsFiliere(user),
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
      include: {
        etablissement: {
          select: { id: true, nom: true, codeAntenne: true },
        },
        modules: {
          orderBy: { ordre: 'asc' },
          include: {
            cours: { select: { id: true } },
            quiz: { select: { id: true } },
            devoirs: { select: { id: true } },
          },
        },
        certificats: {
          where: { utilisateurId: user.id },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const allCoursIds: string[] = [];
    for (const f of formations) {
      for (const m of f.modules) {
        allCoursIds.push(...m.cours.map((c) => c.id));
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
      const fCoursIds = f.modules.flatMap((m) => m.cours.map((c) => c.id));
      const fTotal = fCoursIds.length;
      const fCompleted = fCoursIds.filter((id) => completedSet.has(id)).length;
      const certif = f.certificats[0] || null;
      const fPourcentage = certif ? 100 : (fTotal > 0 ? Math.round((fCompleted / fTotal) * 100) : 0);
      const totalQuiz = f.modules.reduce((acc, m) => acc + (m.quiz?.length || 0), 0);
      const totalDevoirs = f.modules.reduce((acc, m) => acc + (m.devoirs?.length || 0), 0);

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
   * choisie par l'apprenant lors de sa candidature
   */
  async getFormationsFiliere(user: any) {
    this.assertApprenant(user);
    const cacheKey = `formations_filiere:${user.id}`;
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const profile = await this.ensureApprenantProfile(user);
    const userEtabId = user.etablissementId;

    // 1. Détecter les filières choisies par l'apprenant via ses candidatures
    const candidatures = await this.prisma.candidature.findMany({
      where: { apprenantId: profile.id },
      include: {
        session: {
          include: {
            filiere: true,
            niveau: true,
            etablissement: { select: { id: true, nom: true, codeAntenne: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const filieresMap = new Map<string, { id: string; libelle: string; code: string; description?: string | null }>();
    for (const c of candidatures) {
      if (c.session?.filiere) {
        filieresMap.set(c.session.filiere.id, {
          id: c.session.filiere.id,
          libelle: c.session.filiere.libelle,
          code: c.session.filiere.code,
          description: c.session.filiere.description,
        });
      }
    }

    const filiereIds = Array.from(filieresMap.keys());

    // 2. Filtre des formations de l'établissement
    const whereFormation: any = {
      actif: true,
    };

    if (userEtabId) {
      whereFormation.etablissementId = userEtabId;
    }

    if (filiereIds.length > 0) {
      whereFormation.formationReferentiel = {
        filiereId: { in: filiereIds },
      };
    }

    // 3. Récupérer les formations
    const formations = await this.prisma.formation.findMany({
      where: whereFormation,
      include: {
        etablissement: { select: { id: true, nom: true, codeAntenne: true } },
        formationReferentiel: {
          include: {
            filiere: true,
            niveau: true,
          },
        },
        modules: {
          select: {
            id: true,
            titre: true,
            ordre: true,
            _count: { select: { cours: true, quiz: true, devoirs: true } },
          },
          orderBy: { ordre: 'asc' },
        },
      },
      orderBy: [{ aLaUne: 'desc' }, { ordre: 'asc' }, { titre: 'asc' }],
    });

    // 4. Charger les inscriptions actives ou réservées de l'apprenant
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

    // 5. Annoter le statut de chaque formation pour l'apprenant
    const result = formations.map((f) => {
      const insc = inscriptionMap.get(f.id);
      const filiereId = f.formationReferentiel?.filiereId;
      const filiereInfo = filiereId ? filieresMap.get(filiereId) : null;
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
        filiere: f.formationReferentiel?.filiere || filiereInfo || null,
        niveau: f.formationReferentiel?.niveau || null,
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
      include: {
        etablissement: { select: { id: true, nom: true, codeAntenne: true } },
        modules: {
          orderBy: { ordre: 'asc' },
          include: {
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
              include: {
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
      include: {
        module: {
          include: {
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
      include: { module: { select: { id: true, formationId: true, formation: true } } },
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
      include: {
        module: { include: { formation: true } },
        questions: { orderBy: { ordre: 'asc' } },
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
      include: {
        questions: { orderBy: { ordre: 'asc' } },
        module: { include: { formation: true } },
      },
    });

    if (!quiz) throw new NotFoundException('Quiz introuvable.');
    await this.assertFormationAccess(quiz.module.formation.id, user, quiz.module.formation);

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
    const autoCert = await this.triggerAutoCertification(quiz.module.formationId, user.id);

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
      include: { module: { include: { formation: true } } },
    });

    if (!devoir) throw new NotFoundException('Devoir introuvable.');
    await this.assertFormationAccess(devoir.module.formation.id, user);

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
      include: {
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
      include: {
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
