import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../enums/role.enum';

export enum ResourceAction {
  READ = 'READ',
  WRITE = 'WRITE',
  DELETE = 'DELETE',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
}

export enum EnrollmentScope {
  ETABLISSEMENT_ONLY = 'ETABLISSEMENT_ONLY',
  CANDIDATURE_OU_INSCRIPTION = 'CANDIDATURE_OU_INSCRIPTION',
  INSCRIPTION_SEULEMENT = 'INSCRIPTION_SEULEMENT',
}

const STATUTS_CANDIDATURE_LECTURE = [
  'SOUMISE',
  'EN_EVALUATION',
  'ADMISE',
  'LISTE_ATTENTE',
  'CONFIRMEE',
  'INSCRITE',
] as const;

const STATUTS_CANDIDATURE_ECRITURE = [
  'ADMISE',
  'CONFIRMEE',
  'INSCRITE',
] as const;

const STATUTS_CANDIDATURE_VISIBLES_FILIERE = [
  'BROUILLON',
  'SOUMISE',
  'EN_EVALUATION',
  'ADMISE',
  'LISTE_ATTENTE',
  'CONFIRMEE',
  'INSCRITE',
] as const;

export const VISIBILITE_VALEURS = ['PUBLIQUE', 'PRE_ADMISSION', 'INSCRITS_SEULEMENT', 'ADMIN'] as const;
export type VisibiliteRessource = (typeof VISIBILITE_VALEURS)[number];

const APPRENANT_MIN_SELECT = {
  id: true, createdAt: true, matricule: true, nom: true, prenom: true,
  email: true, telephone: true, dateNaissance: true, numeroIdentite: true,
  paysOrigine: true, utilisateurId: true, etablissementOrigineId: true, updatedAt: true,
} as const;

/**
 * Liste blanche des colonnes sélectionnées pour Module/Cours/Quiz/Devoir/Evaluation.
 * VOLONTAIREMENT EXPLICITE : permet de fonctionner même si les colonnes
 * de la migration 20260921 (visibilite, filierePrincipaleId, ApprenantFiliereIntention)
 * ne sont pas encore appliquées en base de production.
 */
const MODULE_SELECT_CORE = {
  id: true, titre: true, ordre: true, coefficient: true,
  formationId: true, createdAt: true,
} as const;

const COURS_SELECT_CORE = {
  id: true, moduleId: true, titre: true, contenu: true,
  fileUrl: true, createdAt: true,
} as const;

const QUIZ_SELECT_CORE = {
  id: true, moduleId: true, titre: true, dureeMinutes: true, createdAt: true,
} as const;

const DEVOIR_SELECT_CORE = {
  id: true, moduleId: true, titre: true, consignes: true,
  dateLimite: true, createdAt: true,
} as const;

const EVALUATION_SELECT_CORE = {
  id: true, moduleId: true, titre: true, noteMaximale: true, createdAt: true,
} as const;

const FORMATION_SELECT_CORE = {
  id: true, etablissementId: true, actif: true, formationReferentielId: true,
  titre: true, code: true, description: true, duree: true,
} as const;

const FORMATION_INCLUDE_CORE = {
  etablissement: { select: { id: true, nom: true, codeAntenne: true } },
} as const;

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(private prisma: PrismaService) {}

  private checkEtablissement(user: any, etablissementId?: string | null, label = 'Ressource') {
    if (user.role === Role.ADMIN_CENTRE) return;
    if (!etablissementId) {
      throw new ForbiddenException(`${label} : rattachement établissement introuvable.`);
    }
    if (etablissementId !== user.etablissementId) {
      throw new ForbiddenException(
        `BR-02 : ${label} appartient à un autre établissement.`,
      );
    }
  }

  /**
   * Récupère la visibilité d'une ressource SI la colonne existe en DB,
   * sinon renvoie INSCRITS_SEULEMENT (valeur sûre par défaut, comportement historique).
   */
  private async getVisibiliteSafe(
    tableName: 'Module' | 'Cours' | 'Quiz' | 'Devoir' | 'Evaluation',
    id: string,
  ): Promise<VisibiliteRessource> {
    try {
      let raw: any = null;
      switch (tableName) {
        case 'Module':
          raw = await (this.prisma as any).$queryRawUnsafe(
            `SELECT visibilite FROM modules WHERE id = $1::uuid LIMIT 1`,
            id,
          );
          break;
        case 'Cours':
          raw = await (this.prisma as any).$queryRawUnsafe(
            `SELECT visibilite FROM cours WHERE id = $1::uuid LIMIT 1`,
            id,
          );
          break;
        case 'Quiz':
          raw = await (this.prisma as any).$queryRawUnsafe(
            `SELECT visibilite FROM quiz WHERE id = $1::uuid LIMIT 1`,
            id,
          );
          break;
        case 'Devoir':
          raw = await (this.prisma as any).$queryRawUnsafe(
            `SELECT visibilite FROM devoirs WHERE id = $1::uuid LIMIT 1`,
            id,
          );
          break;
        case 'Evaluation':
          raw = await (this.prisma as any).$queryRawUnsafe(
            `SELECT visibilite FROM evaluations WHERE id = $1::uuid LIMIT 1`,
            id,
          );
          break;
      }
      const row = Array.isArray(raw) ? raw[0] : null;
      if (row && row.visibilite && VISIBILITE_VALEURS.includes(row.visibilite)) {
        return row.visibilite;
      }
    } catch (_e) {
      // Colonne potentiellement absente (migration pas appliquée) → fallback sûr
    }
    return 'PRE_ADMISSION';
  }

  private checkVisibiliteRessource(
    user: any,
    visibilite: VisibiliteRessource,
    label: string,
    inscription?: any,
    candidature?: any,
    action: ResourceAction = ResourceAction.READ,
  ) {
    if (user.role !== Role.APPRENANT) return;

    const inscritOk = inscription && ['ACTIVE', 'RESERVEE', 'TERMINEE'].includes(inscription.statut);
    const candidatLectureOk =
      candidature && (STATUTS_CANDIDATURE_LECTURE as readonly string[]).includes(candidature.statut);
    const candidatEcritureOk =
      candidature && (STATUTS_CANDIDATURE_ECRITURE as readonly string[]).includes(candidature.statut);

    switch (visibilite) {
      case 'ADMIN':
        throw new ForbiddenException(
          `${label} : accès réservé à l'équipe pédagogique et administrative.`,
        );
      case 'INSCRITS_SEULEMENT':
        if (action === ResourceAction.WRITE || action === ResourceAction.CREATE || action === ResourceAction.UPDATE) {
          if (!inscritOk && !candidatEcritureOk && !candidatLectureOk) {
            throw new ForbiddenException(
              `${label} : dépôt réservé aux apprenants inscrits ou en cours d'admission sur cette formation.`,
            );
          }
        } else if (!inscritOk && !candidatLectureOk) {
          throw new ForbiddenException(
            `${label} : accès réservé aux apprenants inscrits ou ayant soumis une candidature sur cette session.`,
          );
        }
        break;
      case 'PRE_ADMISSION':
        if (!inscritOk && !candidatLectureOk && !candidature) {
          throw new ForbiddenException(
            `${label} : accès réservé aux candidats en cours d'admission ou inscrits.`,
          );
        }
        break;
      case 'PUBLIQUE':
      default:
        break;
    }
  }

  async resolveFormationIdsForSession(session: {
    id?: string;
    formationId?: string | null;
    filiereId: string;
    niveauId?: string | null;
    etablissementId: string;
    etablissementsPartages?: string[] | null;
  }): Promise<string[]> {
    const ids = new Set<string>();
    if (session.formationId) ids.add(session.formationId);

    const etabIds = Array.from(
      new Set(
        [session.etablissementId, ...(session.etablissementsPartages || [])].filter(
          (id): id is string => !!id,
        ),
      ),
    );

    try {
      const byRef = await this.prisma.formation.findMany({
        where: {
          actif: true,
          etablissementId: etabIds.length > 0 ? { in: etabIds } : undefined,
          formationReferentiel: {
            filiereId: session.filiereId,
            ...(session.niveauId ? { niveauId: session.niveauId } : {}),
          },
        },
        select: { id: true },
      });
      for (const f of byRef) ids.add(f.id);
    } catch (e: any) {
      this.logger.warn(`resolveFormationIdsForSession referentiel: ${e?.message}`);
    }

    if (ids.size === 0) {
      try {
        const byFiliereOnly = await this.prisma.formation.findMany({
          where: {
            actif: true,
            etablissementId: etabIds.length > 0 ? { in: etabIds } : undefined,
            formationReferentiel: { filiereId: session.filiereId },
          },
          select: { id: true },
        });
        for (const f of byFiliereOnly) ids.add(f.id);
      } catch (e: any) {
        this.logger.warn(`resolveFormationIdsForSession filiere: ${e?.message}`);
      }
    }

    if (ids.size === 0) {
      try {
        const viaSessions = await this.prisma.sessionAdmission.findMany({
          where: {
            filiereId: session.filiereId,
            formationId: { not: null },
            etablissementId: etabIds.length > 0 ? { in: etabIds } : undefined,
          },
          select: { formationId: true },
        });
        for (const s of viaSessions) {
          if (s.formationId) ids.add(s.formationId);
        }
      } catch (e: any) {
        this.logger.warn(`resolveFormationIdsForSession sessions: ${e?.message}`);
      }
    }

    return Array.from(ids);
  }

  async ensureInscription(
    apprenantId: string,
    formationId: string,
    opts?: { sessionId?: string | null; candidatureId?: string | null },
  ): Promise<{ id: string; statut: string; sessionId: string | null } | null> {
    const persist = async (withCandidatureId: boolean) => {
      const existing = await this.prisma.inscription.findUnique({
        where: { apprenantId_formationId: { apprenantId, formationId } },
        select: { id: true, statut: true, sessionId: true, candidatureId: true },
      });

      const nextStatut =
        existing && ['TERMINEE', 'ACTIVE', 'RESERVEE'].includes(existing.statut)
          ? existing.statut
          : 'ACTIVE';

      const candidatureId =
        withCandidatureId && !existing?.candidatureId
          ? opts?.candidatureId ?? null
          : existing?.candidatureId ?? undefined;

      return this.prisma.inscription.upsert({
        where: { apprenantId_formationId: { apprenantId, formationId } },
        update: {
          statut: nextStatut as any,
          sessionId: opts?.sessionId ?? existing?.sessionId ?? undefined,
          ...(candidatureId ? { candidatureId } : {}),
        },
        create: {
          apprenantId,
          formationId,
          sessionId: opts?.sessionId ?? null,
          candidatureId: withCandidatureId ? opts?.candidatureId ?? null : null,
          statut: 'ACTIVE',
        },
        select: { id: true, statut: true, sessionId: true },
      });
    };

    try {
      return await persist(true);
    } catch (e: any) {
      this.logger.warn(`ensureInscription retry without candidatureId: ${e?.message}`);
      try {
        return await persist(false);
      } catch (e2: any) {
        this.logger.warn(`ensureInscription ${apprenantId}/${formationId}: ${e2?.message}`);
        try {
          return await this.prisma.inscription.findFirst({
            where: { apprenantId, formationId },
            select: { id: true, statut: true, sessionId: true },
          });
        } catch {
          return null;
        }
      }
    }
  }

  async grantPedagogicalAccessFromCandidature(
    apprenantId: string,
    session: {
      id: string;
      formationId?: string | null;
      filiereId: string;
      niveauId?: string | null;
      etablissementId: string;
      etablissementsPartages?: string[] | null;
    },
    candidatureId: string,
  ): Promise<string[]> {
    const formationIds = await this.resolveFormationIdsForSession(session);
    const granted: string[] = [];
    for (const formationId of formationIds) {
      const insc = await this.ensureInscription(apprenantId, formationId, {
        sessionId: session.id,
        candidatureId,
      });
      if (insc) granted.push(formationId);
    }
    try {
      await this.prisma.apprenant.update({
        where: { id: apprenantId },
        data: { filierePrincipaleId: session.filiereId },
      });
    } catch (e: any) {
      this.logger.warn(`filierePrincipaleId update skipped: ${e?.message}`);
    }
    return granted;
  }

  async canAccessFormation(
    user: any,
    formationId: string,
    action: ResourceAction = ResourceAction.READ,
    scope: EnrollmentScope = EnrollmentScope.CANDIDATURE_OU_INSCRIPTION,
    preloadedFormation?: any,
  ): Promise<{ formation: any; profile?: any; inscription?: any; candidature?: any; sessionId?: string }> {
    if (!formationId) throw new NotFoundException('Formation introuvable.');

    // 1. Sécurité multi-tenant (BR-02) et chargement de la formation
    let formation = preloadedFormation;
    if (!formation) {
      formation = await this.prisma.formation.findUnique({
        where: { id: formationId },
        select: { id: true, etablissementId: true, actif: true },
      });
    }
    if (!formation) throw new NotFoundException('Formation introuvable.');
    if (!formation.actif && user.role === Role.APPRENANT) {
      throw new ForbiddenException('Cette formation n\'est plus active.');
    }
    this.checkEtablissement(user, formation.etablissementId, 'Formation');

    // 2. Rôles non-apprenants : accès direct (BR-02 déjà validé)
    if (user.role !== Role.APPRENANT) {
      return { formation };
    }

    if (scope === EnrollmentScope.ETABLISSEMENT_ONLY) {
      return { formation };
    }

    // 3. Chemin 1 : Inscription directe (ACTIVE, RESERVEE, TERMINEE)
    const inscription = await this.prisma.inscription.findFirst({
      where: {
        apprenant: { utilisateurId: user.id },
        formationId,
        statut: { in: ['ACTIVE', 'RESERVEE', 'TERMINEE'] },
      },
      select: { id: true, statut: true, sessionId: true },
    });

    if (inscription) {
      return { formation, inscription, sessionId: inscription.sessionId ?? undefined };
    }

    // 4. Chemin 2 : Candidature SOUMISE+ (lecture pédagogique immédiate après dépôt)
    const statutsCandidature = STATUTS_CANDIDATURE_LECTURE;

    if (scope === EnrollmentScope.INSCRIPTION_SEULEMENT) {
      throw new ForbiddenException(
        action === ResourceAction.READ
          ? 'Accès réservé aux apprenants inscrits à cette formation.'
          : 'Soumission interdite : vous n\'êtes pas encore inscrit(e) à cette formation. Attendez la confirmation administrative.',
      );
    }

    let profile: any = null;
    try {
      profile = await this.prisma.apprenant.findUnique({
        where: { utilisateurId: user.id },
        select: { id: true },
      });
    } catch {
      profile = null;
    }
    if (!profile) {
      try {
        profile = await this.prisma.apprenant.findFirst({
          where: { utilisateurId: user.id },
          select: { id: true },
        });
      } catch {
        profile = null;
      }
    }
    if (!profile) {
      throw new ForbiddenException('Profil apprenant introuvable.');
    }

    let filiereId: string | null = null;
    let niveauId: string | null = null;
    try {
      const ref = await this.prisma.formation.findUnique({
        where: { id: formationId },
        select: {
          formationReferentiel: { select: { filiereId: true, niveauId: true } },
        },
      });
      filiereId = ref?.formationReferentiel?.filiereId ?? null;
      niveauId = ref?.formationReferentiel?.niveauId ?? null;
    } catch {
      filiereId = null;
    }

    const candidature = await this.prisma.candidature.findFirst({
      where: {
        apprenantId: profile.id,
        statut: { in: statutsCandidature as unknown as any[] },
        OR: [
          { session: { formationId } },
          ...(filiereId
            ? [{ session: { filiereId, ...(niveauId ? { niveauId } : {}) } }]
            : []),
        ],
      },
      select: {
        id: true,
        sessionId: true,
        statut: true,
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

    if (!candidature) {
      throw new ForbiddenException(
        action === ResourceAction.READ
          ? 'Accès réservé aux apprenants inscrits ou en cours d\'admission sur cette formation.'
          : 'Soumission interdite : votre candidature doit être admise pour déposer des évaluations.',
      );
    }

    const inscriptionCree = await this.ensureInscription(profile.id, formationId, {
      sessionId: candidature.sessionId,
      candidatureId: candidature.id,
    });
    if (candidature.session) {
      await this.grantPedagogicalAccessFromCandidature(
        profile.id,
        candidature.session,
        candidature.id,
      );
    }

    return {
      formation,
      profile,
      candidature,
      inscription: inscriptionCree ?? undefined,
      sessionId: candidature.sessionId,
    };
  }

  async canAccessModule(
    user: any,
    moduleId: string,
    action: ResourceAction = ResourceAction.READ,
    scope: EnrollmentScope = EnrollmentScope.CANDIDATURE_OU_INSCRIPTION,
  ): Promise<{ module: any; formation: any; profile?: any; inscription?: any; candidature?: any }> {
    if (!moduleId) throw new NotFoundException('Module introuvable.');

    // Requête sans colonnes nouvelle migration (pas de "select: *" ni visibilité implicite)
    const mod = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        ...MODULE_SELECT_CORE,
        formation: { select: { id: true, etablissementId: true, actif: true } },
      },
    });
    if (!mod) throw new NotFoundException('Module introuvable.');

    const result = await this.canAccessFormation(
      user,
      mod.formationId,
      action,
      scope,
      mod.formation,
    );

    // Récupération sûre de la visibilité (fallback INSCRITS_SEULEMENT si colonne absente)
    let visibilite: VisibiliteRessource = 'PRE_ADMISSION';
    try {
      if ((mod as any).visibilite && VISIBILITE_VALEURS.includes((mod as any).visibilite)) {
        visibilite = (mod as any).visibilite;
      } else {
        visibilite = await this.getVisibiliteSafe('Module', moduleId);
      }
    } catch {
      visibilite = 'PRE_ADMISSION';
    }
    this.checkVisibiliteRessource(
      user,
      visibilite,
      `Module "${(mod as any).titre ?? moduleId}"`,
      result.inscription,
      result.candidature,
      action,
    );

    return {
      module: mod as any,
      formation: mod.formation as any,
      profile: result.profile,
      inscription: result.inscription,
      candidature: result.candidature,
    };
  }

  async canAccessCours(
    user: any,
    coursId: string,
    action: ResourceAction = ResourceAction.READ,
  ): Promise<{ cours: any; formation: any }> {
    const cours = await this.prisma.cours.findUnique({
      where: { id: coursId },
      select: {
        ...COURS_SELECT_CORE,
        module: {
          select: {
            ...MODULE_SELECT_CORE,
            formation: { select: { id: true, etablissementId: true, actif: true } },
          },
        },
      },
    });
    if (!cours) throw new NotFoundException('Cours introuvable.');

    const access = await this.canAccessFormation(
      user,
      cours.module.formation.id,
      action,
      undefined,
      cours.module.formation,
    );
    let visibilite: VisibiliteRessource = 'PRE_ADMISSION';
    try {
      if ((cours as any).visibilite && VISIBILITE_VALEURS.includes((cours as any).visibilite)) {
        visibilite = (cours as any).visibilite;
      } else {
        visibilite = await this.getVisibiliteSafe('Cours', coursId);
      }
    } catch {
      visibilite = 'PRE_ADMISSION';
    }
    this.checkVisibiliteRessource(
      user,
      visibilite,
      `Cours "${(cours as any).titre ?? coursId}"`,
      access.inscription,
      access.candidature,
      action,
    );
    return { cours: cours as any, formation: (cours as any).module.formation };
  }

  async canAccessQuiz(
    user: any,
    quizId: string,
    action: ResourceAction = ResourceAction.READ,
  ): Promise<{ quiz: any; formation: any }> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        ...QUIZ_SELECT_CORE,
        module: {
          select: {
            ...MODULE_SELECT_CORE,
            formation: { select: { id: true, etablissementId: true, actif: true } },
          },
        },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz introuvable.');
    const access = await this.canAccessFormation(
      user,
      quiz.module.formation.id,
      action,
      undefined,
      quiz.module.formation,
    );
    let visibilite: VisibiliteRessource = 'PRE_ADMISSION';
    try {
      if ((quiz as any).visibilite && VISIBILITE_VALEURS.includes((quiz as any).visibilite)) {
        visibilite = (quiz as any).visibilite;
      } else {
        visibilite = await this.getVisibiliteSafe('Quiz', quizId);
      }
    } catch {
      visibilite = 'PRE_ADMISSION';
    }
    this.checkVisibiliteRessource(
      user,
      visibilite,
      `Quiz "${(quiz as any).titre ?? quizId}"`,
      access.inscription,
      access.candidature,
      action,
    );
    return { quiz: quiz as any, formation: (quiz as any).module.formation };
  }

  async canAccessDevoir(
    user: any,
    devoirId: string,
    action: ResourceAction = ResourceAction.READ,
  ): Promise<{ devoir: any; formation: any }> {
    const devoir = await this.prisma.devoir.findUnique({
      where: { id: devoirId },
      select: {
        ...DEVOIR_SELECT_CORE,
        module: {
          select: {
            ...MODULE_SELECT_CORE,
            formation: { select: { id: true, etablissementId: true, actif: true } },
          },
        },
      },
    });
    if (!devoir) throw new NotFoundException('Devoir introuvable.');
    const access = await this.canAccessFormation(
      user,
      devoir.module.formation.id,
      action,
      undefined,
      devoir.module.formation,
    );
    let visibilite: VisibiliteRessource = 'PRE_ADMISSION';
    try {
      if ((devoir as any).visibilite && VISIBILITE_VALEURS.includes((devoir as any).visibilite)) {
        visibilite = (devoir as any).visibilite;
      } else {
        visibilite = await this.getVisibiliteSafe('Devoir', devoirId);
      }
    } catch {
      visibilite = 'PRE_ADMISSION';
    }
    this.checkVisibiliteRessource(
      user,
      visibilite,
      `Devoir "${(devoir as any).titre ?? devoirId}"`,
      access.inscription,
      access.candidature,
      action,
    );
    return { devoir: devoir as any, formation: (devoir as any).module.formation };
  }

  async canAccessSeance(
    user: any,
    seanceId: string,
    action: ResourceAction = ResourceAction.READ,
  ): Promise<{ seance: any; formation: any }> {
    const seance = await this.prisma.seanceFormation.findUnique({
      where: { id: seanceId },
      select: {
        id: true, moduleId: true, dateHeureDebut: true, dateHeureFin: true,
        titreActivite: true, typeSession: true, salleOuLien: true,
        formateurId: true, createdAt: true,
        module: {
          select: {
            ...MODULE_SELECT_CORE,
            formation: { select: { id: true, etablissementId: true, actif: true } },
          },
        },
      },
    });
    if (!seance) throw new NotFoundException('Séance introuvable.');
    const access = await this.canAccessFormation(
      user,
      seance.module.formation.id,
      action,
      undefined,
      seance.module.formation,
    );
    let moduleVisibilite: VisibiliteRessource = 'PRE_ADMISSION';
    try {
      moduleVisibilite = await this.getVisibiliteSafe('Module', seance.moduleId);
    } catch {
      moduleVisibilite = 'PRE_ADMISSION';
    }
    this.checkVisibiliteRessource(
      user,
      moduleVisibilite,
      `Séance "${(seance as any).titreActivite ?? seanceId}" (hérité du module)`,
      access.inscription,
      access.candidature,
      action,
    );
    return { seance: seance as any, formation: (seance as any).module.formation };
  }

  async canAccessEvaluation(
    user: any,
    evaluationId: string,
    action: ResourceAction = ResourceAction.READ,
  ): Promise<{ evaluation: any; formation: any }> {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id: evaluationId },
      select: {
        ...EVALUATION_SELECT_CORE,
        module: {
          select: {
            ...MODULE_SELECT_CORE,
            formation: { select: { id: true, etablissementId: true, actif: true } },
          },
        },
      },
    });
    if (!evaluation) throw new NotFoundException('Évaluation introuvable.');
    const access = await this.canAccessFormation(
      user,
      evaluation.module.formation.id,
      action,
      undefined,
      evaluation.module.formation,
    );
    let visibilite: VisibiliteRessource = 'PRE_ADMISSION';
    try {
      if ((evaluation as any).visibilite && VISIBILITE_VALEURS.includes((evaluation as any).visibilite)) {
        visibilite = (evaluation as any).visibilite;
      } else {
        visibilite = await this.getVisibiliteSafe('Evaluation', evaluationId);
      }
    } catch {
      visibilite = 'PRE_ADMISSION';
    }
    this.checkVisibiliteRessource(
      user,
      visibilite,
      `Évaluation "${(evaluation as any).titre ?? evaluationId}"`,
      access.inscription,
      access.candidature,
      action,
    );
    return { evaluation: evaluation as any, formation: (evaluation as any).module.formation };
  }

  async getFilieresApprenant(userId: string): Promise<Array<{ id: string; libelle: string; code: string; description?: string | null; statut: string | null }>> {
    const filieresMap = new Map<string, { id: string; libelle: string; code: string; description?: string | null; statut: string | null }>();

    // 1. Filière principale (si colonne présente en DB) — via requête SQL raw conditionnelle
    let profileId: string | null = null;
    try {
      const profileRow = await this.prisma.apprenant.findUnique({
        where: { utilisateurId: userId },
        select: { id: true },
      });
      profileId = profileRow?.id ?? null;
    } catch {
      try {
        const profileRow = await this.prisma.apprenant.findFirst({
          where: { utilisateurId: userId },
          select: { id: true },
        });
        profileId = profileRow?.id ?? null;
      } catch {
        profileId = null;
      }
    }

    // Étape 1-bis : filière principale (colonne snake_case Prisma OU camelCase migration)
    if (profileId) {
      try {
        const withFiliere = await this.prisma.apprenant.findUnique({
          where: { id: profileId },
          select: {
            filierePrincipale: {
              select: { id: true, libelle: true, code: true, description: true },
            },
          },
        });
        const fp = withFiliere?.filierePrincipale;
        if (fp?.id) {
          filieresMap.set(fp.id, {
            id: fp.id,
            libelle: fp.libelle,
            code: fp.code,
            description: fp.description ?? null,
            statut: 'PRINCIPALE',
          });
        }
      } catch {
        try {
          const raw = await (this.prisma as any).$queryRawUnsafe(
            `SELECT f.id, f.libelle, f.code, f.description
             FROM filieres f
             JOIN apprenants a ON (
               a.filiere_principale_id = f.id OR a."filierePrincipaleId" = f.id
             )
             WHERE a.id = $1::uuid
             LIMIT 1`,
            profileId,
          );
          const row = Array.isArray(raw) ? raw[0] : null;
          if (row && row.id) {
            filieresMap.set(row.id, {
              id: row.id,
              libelle: row.libelle,
              code: row.code,
              description: row.description ?? null,
              statut: 'PRINCIPALE',
            });
          }
        } catch {
          // Colonne pas encore migrée
        }
      }
    }

    // 2. Intentions déclarées (table potentiellement absente)
    if (profileId) {
      try {
        const intentions: any[] = await (this.prisma as any).apprenantFiliereIntention.findMany({
          where: { apprenantId: profileId },
          include: { filiere: true },
        });
        for (const i of intentions) {
          if (!i.filiere) continue;
          if (!filieresMap.has(i.filiereId)) {
            filieresMap.set(i.filiereId, {
              id: i.filiere.id,
              libelle: i.filiere.libelle,
              code: i.filiere.code,
              description: i.filiere.description ?? null,
              statut: i.statut ?? 'ENVISAGEE',
            });
          }
        }
      } catch (_e) {
        // Table ApprenantFiliereIntention absente (migration 3.2 pas appliquée)
      }
    }

    // 3. Candidatures (statuts visibles) — chemin toujours disponible
    if (profileId) {
      try {
        const candidatures = await this.prisma.candidature.findMany({
          where: {
            apprenantId: profileId,
            statut: { in: STATUTS_CANDIDATURE_VISIBLES_FILIERE as unknown as any[] },
          },
          select: {
            statut: true,
            session: {
              select: {
                filiereId: true,
                filiere: { select: { id: true, libelle: true, code: true, description: true } },
              },
            },
          },
        });
        for (const c of candidatures) {
          const fid = c.session.filiereId;
          if (!fid || filieresMap.has(fid) || !c.session.filiere) continue;
          filieresMap.set(fid, {
            id: c.session.filiere.id,
            libelle: c.session.filiere.libelle,
            code: c.session.filiere.code,
            description: c.session.filiere.description ?? null,
            statut: c.statut,
          });
        }
      } catch {
        // Ignore erreurs de colonnes additionnelles non migrées
      }
    }

    return Array.from(filieresMap.values());
  }
}
