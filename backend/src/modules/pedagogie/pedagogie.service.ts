import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCategorieFormationDto, UpdateCategorieFormationDto } from './dto/pedagogie.dto';

function slugifyCategoryCode(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'cat';
}

@Injectable()
export class PedagogieService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // Cache serveur mémoire à TTL (3 min) + invalidation immédiate sur toute écriture
  private formationsCache = new Map<string, { data: any; expiresAt: number }>();
  private formationDetailCache = new Map<string, { data: any; expiresAt: number }>();
  private readonly CACHE_TTL = 180_000; // 3 minutes

  public invalidateFormationsCache(formationId?: string) {
    this.formationsCache.clear();
    if (formationId) {
      this.formationDetailCache.delete(formationId);
    } else {
      this.formationDetailCache.clear();
    }
  }

  // ====================================
  // FORMATIONS
  // ====================================
  async getFormations(
    user: any,
    filters?: {
      search?: string;
      filiereId?: string;
      etablissementId?: string;
      categorie?: string;
      publieSurLanding?: string;
      actif?: string;
    },
  ) {
    const cacheKey = JSON.stringify({
      role: user.role,
      userEtab: user.etablissementId,
      filters: filters || {},
    });

    const cached = this.formationsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const where: any = {};
    if (user.role !== Role.ADMIN_CENTRE) {
      where.etablissementId = user.etablissementId;
    } else if (filters?.etablissementId && filters.etablissementId !== 'ALL') {
      where.etablissementId = filters.etablissementId;
    }

    if (filters?.search && filters.search.trim()) {
      const s = filters.search.trim();
      where.OR = [
        { titre: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { debouches: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (filters?.filiereId && filters.filiereId !== 'ALL') {
      where.formationReferentiel = { filiereId: filters.filiereId };
    }

    if (filters?.categorie && filters.categorie !== 'toutes' && filters.categorie !== 'ALL') {
      where.categorie = filters.categorie;
    }

    if (filters?.publieSurLanding !== undefined && filters.publieSurLanding !== '' && filters.publieSurLanding !== 'ALL') {
      where.publieSurLanding = filters.publieSurLanding === 'true';
    }

    if (filters?.actif !== undefined && filters.actif !== '' && filters.actif !== 'ALL') {
      where.actif = filters.actif === 'true';
    }

    const data = await this.prisma.formation.findMany({
      where,
      include: {
        modules: {
          select: { id: true, titre: true, coefficient: true, ordre: true, _count: { select: { cours: true } } },
        },
        etablissement: { select: { id: true, nom: true, codeAntenne: true, typeEtablissement: true } },
        formationReferentiel: {
          include: {
            filiere: true,
            niveau: true,
          },
        },
        _count: {
          select: { modules: true, inscriptions: true, sessionsAdmission: true },
        },
      },
      orderBy: [{ aLaUne: 'desc' }, { ordre: 'asc' }, { titre: 'asc' }],
    });

    this.formationsCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + this.CACHE_TTL,
    });

    return data;
  }

  async getFormation(id: string, user: any) {
    const cacheKey = `${id}_${user.role === Role.ADMIN_CENTRE ? 'ADMIN' : user.etablissementId}`;
    const cached = this.formationDetailCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const formation = await this.prisma.formation.findUnique({
      where: { id },
      include: {
        modules: {
          include: {
            cours: {
              select: {
                id: true,
                titre: true,
                fileUrl: true,
                moduleId: true,
                contenu: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'asc' },
            },
            evaluations: true,
            quiz: true,
            devoirs: true,
          },
          orderBy: { ordre: 'asc' },
        },
        etablissement: { select: { id: true, nom: true, codeAntenne: true } },
        formationReferentiel: {
          include: {
            filiere: true,
            niveau: true,
          },
        },
        _count: {
          select: { modules: true, inscriptions: true, sessionsAdmission: true },
        },
      },
    });
    if (!formation) throw new NotFoundException('Formation introuvable.');

    // BR-02 : Souveraineté des données - un non-admin ne voit que ses formations
    if (user.role !== Role.ADMIN_CENTRE && formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Vous ne pouvez pas accéder aux formations d\'un autre établissement.');
    }

    this.formationDetailCache.set(cacheKey, {
      data: formation,
      expiresAt: Date.now() + this.CACHE_TTL,
    });

    return formation;
  }

  private async resolveFormationReferentielId(inputRefOrFiliereId?: string): Promise<string | null> {
    if (!inputRefOrFiliereId || !inputRefOrFiliereId.trim()) return null;
    const trimmedId = inputRefOrFiliereId.trim();

    // 1. Vérifier si c'est directement un ID existant de formation_referentiel
    const existingRef = await this.prisma.formationReferentiel.findUnique({
      where: { id: trimmedId },
    });
    if (existingRef) return existingRef.id;

    // 2. Vérifier si c'est un ID de filiere
    const filiere = await this.prisma.filiere.findUnique({
      where: { id: trimmedId },
    });
    if (filiere) {
      const refAssociee = await this.prisma.formationReferentiel.findFirst({
        where: { filiereId: filiere.id },
      });
      if (refAssociee) {
        return refAssociee.id;
      }
      // Créer une liaison avec le premier niveau disponible
      const premierNiveau = await this.prisma.niveau.findFirst({
        where: { actif: true },
        orderBy: { ordre: 'asc' },
      });
      if (premierNiveau) {
        const newRef = await this.prisma.formationReferentiel.create({
          data: {
            filiereId: filiere.id,
            niveauId: premierNiveau.id,
            libelle: `${filiere.libelle} — ${premierNiveau.libelle}`,
            actif: true,
          },
        });
        return newRef.id;
      }
    }

    return null;
  }

  async createFormation(data: any, user: any) {
    const etablissementId = (user.role === Role.ADMIN_CENTRE && data.etablissementId)
      ? data.etablissementId
      : user.etablissementId;

    let code = data.code?.trim();
    if (!code) {
      const cleanTitre = (data.titre || 'FORM').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      const rand = Math.floor(100 + Math.random() * 900);
      code = `FORM-${cleanTitre}-${rand}`;
    }

    const formationReferentielId = await this.resolveFormationReferentielId(
      data.formationReferentielId || data.filiereId,
    );

    const formation = await this.prisma.formation.create({
      data: {
        titre: data.titre,
        code,
        description: data.description || null,
        duree: data.duree || '40 Heures',
        categorie: data.categorie || 'tech',
        debouches: data.debouches || null,
        prerequis: data.prerequis || null,
        objectifs: data.objectifs || null,
        publieSurLanding: data.publieSurLanding !== undefined ? data.publieSurLanding : true,
        aLaUne: data.aLaUne !== undefined ? data.aLaUne : false,
        badgeTexte: data.badgeTexte || 'Session ouverte',
        ordre: Number(data.ordre) || 0,
        actif: data.actif !== undefined ? data.actif : true,
        fraisInscription: data.fraisInscription ? Number(data.fraisInscription) : null,
        etablissementId,
        formationReferentielId,
      },
      include: {
        etablissement: { select: { id: true, nom: true, codeAntenne: true } },
        formationReferentiel: { include: { filiere: true, niveau: true } },
        modules: true,
      },
    });

    this.invalidateFormationsCache(etablissementId);

    this.notifications.emit({
      type: 'FILIERE_UPDATE',
      recipientEtablissementId: etablissementId,
      title: 'Nouvelle Filière / Classe',
      message: `La filière "${formation.titre}" a été attribuée / créée pour ${formation.etablissement?.nom || 'l\'établissement'}.`,
      data: { formationId: formation.id, etablissementId },
    });

    this.notifications.emit({
      type: 'FORMATION_UPDATE',
      recipientEtablissementId: etablissementId,
      title: 'Nouvelle Formation',
      message: `La formation "${formation.titre}" a été créée.`,
      data: { formationId: formation.id, action: 'CREATE', etablissementId },
    });

    this.notifications.emit({
      type: 'LANDING_UPDATE',
      title: 'Vitrine des formations mise à jour',
      message: `Une nouvelle formation est disponible au catalogue officiel.`,
      data: { formationId: formation.id, action: 'CREATE' },
    });

    return formation;
  }

  async updateFormation(id: string, data: any, user: any) {
    const formation = await this.getFormation(id, user);
    // BR-02 : Seul l'établissement d'origine peut modifier
    if (user.role !== Role.ADMIN_CENTRE && formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Modification interdite pour un établissement tiers.');
    }

    const updateData: any = {};
    if (data.titre !== undefined) updateData.titre = data.titre;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.duree !== undefined) updateData.duree = data.duree;
    if (data.categorie !== undefined) updateData.categorie = data.categorie;
    if (data.debouches !== undefined) updateData.debouches = data.debouches;
    if (data.prerequis !== undefined) updateData.prerequis = data.prerequis;
    if (data.objectifs !== undefined) updateData.objectifs = data.objectifs;
    if (data.publieSurLanding !== undefined) updateData.publieSurLanding = data.publieSurLanding;
    if (data.aLaUne !== undefined) updateData.aLaUne = data.aLaUne;
    if (data.badgeTexte !== undefined) updateData.badgeTexte = data.badgeTexte;
    if (data.ordre !== undefined) updateData.ordre = Number(data.ordre);
    if (data.actif !== undefined) updateData.actif = data.actif;
    if (data.formationReferentielId !== undefined || data.filiereId !== undefined) {
      updateData.formationReferentielId = await this.resolveFormationReferentielId(
        data.formationReferentielId !== undefined ? data.formationReferentielId : data.filiereId,
      );
    }
    if (data.etablissementId !== undefined && user.role === Role.ADMIN_CENTRE) updateData.etablissementId = data.etablissementId;

    const updated = await this.prisma.formation.update({
      where: { id },
      data: updateData,
      include: {
        etablissement: { select: { id: true, nom: true, codeAntenne: true } },
        formationReferentiel: { include: { filiere: true, niveau: true } },
        modules: true,
      },
    });

    this.invalidateFormationsCache(formation.etablissementId);

    this.notifications.emit({
      type: 'FILIERE_UPDATE',
      recipientEtablissementId: formation.etablissementId,
      title: 'Filière mise à jour',
      message: `La filière "${updated.titre}" a été modifiée.`,
      data: { formationId: updated.id, etablissementId: formation.etablissementId },
    });

    this.notifications.emit({
      type: 'FORMATION_UPDATE',
      recipientEtablissementId: formation.etablissementId,
      title: 'Formation mise à jour',
      message: `La formation "${updated.titre}" a été modifiée.`,
      data: { formationId: updated.id, action: 'UPDATE', etablissementId: formation.etablissementId },
    });

    this.notifications.emit({
      type: 'LANDING_UPDATE',
      title: 'Vitrine des formations mise à jour',
      message: `Le catalogue des formations a été actualisé.`,
      data: { formationId: updated.id, action: 'UPDATE' },
    });

    return updated;
  }

  async deployerFormationVersEtablissements(formationId: string, cibleEtablissementIds: string[], user: any) {
    if (user.role !== Role.ADMIN_CENTRE) {
      throw new ForbiddenException('Seul l\'Administrateur Central peut déployer une formation vers plusieurs établissements.');
    }

    if (!cibleEtablissementIds || !Array.isArray(cibleEtablissementIds) || cibleEtablissementIds.length === 0) {
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

      const codeSuffix = etab.codeAntenne ? etab.codeAntenne.replace(/[^A-Z0-9]/gi, '').toUpperCase() : Math.floor(100 + Math.random() * 900);
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
                options: q.options as any,
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
            },
          });
        }
      }

      this.invalidateFormationsCache(etab.id);

      this.notifications.emit({
        type: 'FORMATION_UPDATE',
        recipientEtablissementId: etab.id,
        title: 'Formation Nationale Déployée',
        message: `La formation "${nouvelleFormation.titre}" a été déployée dans votre établissement par l'Administration Centrale.`,
        data: { formationId: nouvelleFormation.id, etablissementId: etab.id },
      });

      deployes.push(etab.nom);
    }

    this.invalidateFormationsCache();

    return {
      success: true,
      message: `Formation déployée avec succès dans ${deployes.length} établissement(s) : ${deployes.join(', ')}.`,
      nbEtablissements: deployes.length,
    };
  }

  async toggleLanding(id: string, user: any) {
    const formation = await this.getFormation(id, user);
    if (user.role !== Role.ADMIN_CENTRE && formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Action non autorisée pour cet établissement.');
    }
    const updated = await this.prisma.formation.update({
      where: { id },
      data: { publieSurLanding: !formation.publieSurLanding },
    });
    this.invalidateFormationsCache(formation.etablissementId);
    this.notifications.emit({
      type: 'FORMATION_UPDATE',
      recipientEtablissementId: formation.etablissementId,
      title: 'Statut vitrine modifié',
      message: `La formation "${updated.titre}" est désormais ${updated.publieSurLanding ? 'visible' : 'masquée'} sur la Landing Page.`,
      data: { formationId: id, publieSurLanding: updated.publieSurLanding },
    });
    this.notifications.emit({
      type: 'LANDING_UPDATE',
      title: 'Vitrine mise à jour',
      message: `Le catalogue public a été modifié.`,
      data: { formationId: id },
    });
    return updated;
  }

  async toggleUne(id: string, user: any) {
    const formation = await this.getFormation(id, user);
    if (user.role !== Role.ADMIN_CENTRE && formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Action non autorisée pour cet établissement.');
    }
    const updated = await this.prisma.formation.update({
      where: { id },
      data: { aLaUne: !formation.aLaUne },
    });
    this.invalidateFormationsCache(formation.etablissementId);
    this.notifications.emit({
      type: 'FORMATION_UPDATE',
      recipientEtablissementId: formation.etablissementId,
      title: 'Mise à la une modifiée',
      message: `La formation "${updated.titre}" est désormais ${updated.aLaUne ? 'en vedette' : 'standard'}.`,
      data: { formationId: id, aLaUne: updated.aLaUne },
    });
    this.notifications.emit({
      type: 'LANDING_UPDATE',
      title: 'Vitrine mise à jour',
      message: `Le catalogue public a été modifié.`,
      data: { formationId: id },
    });
    return updated;
  }

  // ====================================
  // MODULES
  // ====================================
  async createModule(formationId: string, data: { titre: string; coefficient?: number; ordre?: number }, user: any) {
    const formation = await this.getFormation(formationId, user); // Vérifie BR-02
    let ordre = data.ordre;
    if (ordre === undefined) {
      const maxOrdre = await this.prisma.module.aggregate({
        where: { formationId },
        _max: { ordre: true },
      });
      ordre = (maxOrdre._max.ordre ?? 0) + 1;
    }
    const mod = await this.prisma.module.create({
      data: {
        titre: data.titre,
        coefficient: data.coefficient ?? 1.0,
        ordre,
        formationId,
      },
    });

    this.invalidateFormationsCache(formationId);

    this.notifications.emit({
      type: 'FILIERE_UPDATE',
      recipientEtablissementId: formation.etablissementId,
      title: 'Nouveau Module',
      message: `Le module "${mod.titre}" a été ajouté à la classe "${formation.titre}".`,
      data: { formationId, moduleId: mod.id, etablissementId: formation.etablissementId },
    });

    return mod;
  }

  // ====================================
  // COURS
  // ====================================
  async createCours(moduleId: string, data: { titre: string; contenu?: string; fileUrl?: string }, user: any) {
    const mod = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { formation: true },
    });
    if (!mod) throw new NotFoundException('Module introuvable.');
    // BR-02
    if (user.role !== Role.ADMIN_CENTRE && mod.formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Ajout de cours interdit pour un établissement tiers.');
    }
    const cours = await this.prisma.cours.create({ data: { ...data, moduleId } });

    this.invalidateFormationsCache(mod.formationId);

    // ─── Push temps réel : notifier tous les apprenants de l'établissement ───
    this.notifications.emit({
      type: 'COURS_PUBLIE',
      recipientEtablissementId: mod.formation.etablissementId,
      title: 'Nouveau cours disponible !',
      message: `Un nouveau cours « ${data.titre} » a été publié dans le module « ${mod.titre} ».`,
      data: { coursId: cours.id, coursTitre: cours.titre, moduleId, moduleTitre: mod.titre },
    });

    return cours;
  }

  async getCours(id: string) {
    const cours = await this.prisma.cours.findUnique({
      where: { id },
      include: { module: { include: { formation: true } } },
    });
    if (!cours) throw new NotFoundException('Cours introuvable.');
    return cours;
  }

  // ====================================
  // PROGRESSION APPRENANT
  // ====================================
  async markComplete(coursId: string, userId: string) {
    return this.prisma.userProgress.upsert({
      where: { utilisateurId_coursId: { utilisateurId: userId, coursId } },
      update: { complete: true },
      create: { utilisateurId: userId, coursId, complete: true },
    });
  }

  async getProgressByFormation(formationId: string, userId: string) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
      include: {
        modules: {
          select: {
            id: true,
            coefficient: true,
            cours: { select: { id: true } },
          },
        },
      },
    });
    if (!formation) throw new NotFoundException('Formation introuvable.');

    const allCoursIds = formation.modules.flatMap(m => m.cours.map(c => c.id));
    const obligatoireCoursIds = formation.modules
      .filter(m => m.coefficient === null || Number(m.coefficient) > 0)
      .flatMap(m => m.cours.map(c => c.id));

    const progress = await this.prisma.userProgress.findMany({
      where: { utilisateurId: userId, coursId: { in: allCoursIds }, complete: true },
    });

    const completedIds = new Set(progress.map(p => p.coursId));
    const totalObligatoire = obligatoireCoursIds.length;
    const completedObligatoire = obligatoireCoursIds.filter(id => completedIds.has(id)).length;

    return {
      totalCours: allCoursIds.length,
      totalObligatoire,
      completedObligatoire,
      completionRate: totalObligatoire > 0 ? Math.round((completedObligatoire / totalObligatoire) * 100) : 0,
    };
  }

  // ====================================
  // EVALUATIONS & NOTES
  // ====================================
  async createEvaluation(moduleId: string, data: { titre: string; noteMaximale?: number }, user: any) {
    const mod = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { formation: true },
    });
    if (!mod) throw new NotFoundException('Module introuvable.');
    if (user.role !== Role.ADMIN_CENTRE && mod.formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Création d\'évaluation interdite.');
    }
    const evalCreated = await this.prisma.evaluation.create({
      data: { titre: data.titre, moduleId, noteMaximale: data.noteMaximale ?? 20 },
    });
    this.invalidateFormationsCache(mod.formationId);
    return evalCreated;
  }

  async getEvaluationsByModule(moduleId: string, user: any) {
    const mod = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { formation: true, evaluations: { include: { notes: true } } },
    });
    if (!mod) throw new NotFoundException('Module introuvable.');
    if (user.role !== Role.ADMIN_CENTRE && mod.formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit.');
    }
    return mod.evaluations;
  }

  async getApprenants(user: any) {
    const where = user.role === Role.ADMIN_CENTRE
      ? { role: Role.APPRENANT, actif: true }
      : { etablissementId: user.etablissementId, role: Role.APPRENANT, actif: true };
    return this.prisma.utilisateur.findMany({
      where,
      select: { id: true, nom: true, prenom: true, email: true, etablissementId: true },
      orderBy: { nom: 'asc' },
    });
  }

  async getCoursWithProgress(coursId: string, userId: string) {
    const cours = await this.getCours(coursId);
    const progress = await this.prisma.userProgress.findUnique({
      where: { utilisateurId_coursId: { utilisateurId: userId, coursId } },
    });
    return { ...cours, complete: progress?.complete ?? false };
  }

  async uploadCoursDocument(coursId: string, fileUrl: string, user: any) {
    const cours = await this.getCours(coursId);
    if (user.role !== Role.ADMIN_CENTRE && cours.module.formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Upload interdit.');
    }
    const updatedCours = await this.prisma.cours.update({ where: { id: coursId }, data: { fileUrl } });
    this.invalidateFormationsCache(cours.module.formationId);
    return updatedCours;
  }

  async deleteFormation(id: string, user: any) {
    const formation = await this.getFormation(id, user);
    const deleted = await this.prisma.formation.delete({ where: { id } });
    this.invalidateFormationsCache(id);
    this.notifications.emit({
      type: 'FORMATION_UPDATE',
      recipientEtablissementId: formation.etablissementId,
      title: 'Formation supprimée',
      message: `La formation a été supprimée.`,
      data: { formationId: id, action: 'DELETE', etablissementId: formation.etablissementId },
    });
    this.notifications.emit({
      type: 'LANDING_UPDATE',
      title: 'Vitrine des formations mise à jour',
      message: `Une formation a été retirée du catalogue.`,
      data: { formationId: id, action: 'DELETE' },
    });
    return deleted;
  }

  async submitNote(evaluationId: string, userId: string, valeur: number, user: any, ipAdresse: string) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: { module: { include: { formation: true } } },
    });
    if (!evaluation) throw new NotFoundException('Évaluation introuvable.');

    if (user.role !== Role.ADMIN_CENTRE && evaluation.module.formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Vous ne pouvez pas noter une évaluation d\'un autre établissement.');
    }

    const noteMax = Number(evaluation.noteMaximale || 20);
    if (valeur < 0 || valeur > noteMax) {
      throw new ForbiddenException(`La note doit être comprise entre 0 et ${noteMax}.`);
    }

    const targetStudent = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
    });
    if (!targetStudent) throw new NotFoundException('Apprenant introuvable.');

    if (user.role !== Role.ADMIN_CENTRE && targetStudent.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : L\'apprenant n\'appartient pas à votre établissement.');
    }

    // Récupérer l'ancienne note si elle existe pour l'état avant
    const oldNote = await this.prisma.note.findUnique({
      where: { evaluationId_utilisateurId: { evaluationId, utilisateurId: userId } },
    });

    const oldNoteVal = oldNote ? oldNote.valeur : null;

    const result = await this.prisma.note.upsert({
      where: { evaluationId_utilisateurId: { evaluationId, utilisateurId: userId } },
      update: { valeur },
      create: { utilisateurId: userId, evaluationId, valeur, formateurId: user.id },
    });

    this.invalidateFormationsCache(evaluation.module.formationId);

    // Journaliser dans AuditLog (Exigence de traçabilité immuable avec états avant/après)
    await this.prisma.auditLog.create({
      data: {
        auteurId: user.id,
        action: 'SAISIE_NOTE',
        details: {
          userId,
          evaluationId,
          etatAvant: oldNoteVal !== null ? `${oldNoteVal}/20` : 'Aucune',
          etatApres: `${valeur}/20`,
        },
        ipAdresse,
      },
    });

    // ─── Push temps réel : notifier l'apprenant que sa note a été publiée ───
    this.notifications.emit({
      type: 'NOTE_PUBLIEE',
      recipientUserId: userId,
      title: 'Note publiée !',
      message: `Votre note pour l'évaluation « ${evaluation.titre} » a été enregistrée : ${valeur}/${evaluation.noteMaximale || 20}.`,
      data: { evaluationId, evaluationTitre: evaluation.titre, note: valeur, noteMax: evaluation.noteMaximale || 20 },
    });

    return result;
  }

  /**
   * BR-03 : Calcule la moyenne pondérée académique d'un apprenant pour une formation.
   * Prend en compte :
   * 1. Évaluations / Contrôles continus (notes ramenées sur 20)
   * 2. Devoirs & Travaux pratiques notés (notes sur 20)
   * 3. Quiz d'évaluation (scores sur 100 ramenés sur 20)
   * Moyenne formation = Σ(moyenne_module * coefficient) / Σ(coefficient)
   */
  async getMoyennePonderee(formationId: string, userId: string): Promise<number> {
    const modules = await this.prisma.module.findMany({
      where: { formationId },
      include: {
        evaluations: {
          include: {
            notes: { where: { utilisateurId: userId } },
          },
        },
        devoirs: {
          include: {
            soumissions: {
              where: { apprenantId: userId, note: { not: null } },
              select: { note: true },
            },
          },
        },
        quiz: {
          include: {
            tentatives: {
              where: { apprenantId: userId },
              select: { score: true },
            },
          },
        },
      },
    });

    let totalPoids = 0;
    let totalPondere = 0;

    for (const mod of modules) {
      const moduleNotesSur20: number[] = [];

      // 1. Notes d'évaluations (ramenées sur 20)
      for (const ev of mod.evaluations) {
        if (ev.notes.length > 0) {
          const noteRaw = Number(ev.notes[0].valeur);
          const maxNote = Number(ev.noteMaximale) || 20;
          const noteSur20 = maxNote > 0 ? (noteRaw / maxNote) * 20 : noteRaw;
          moduleNotesSur20.push(noteSur20);
        }
      }

      // 2. Notes des devoirs rendus et corrigés
      for (const dev of mod.devoirs) {
        if (dev.soumissions.length > 0 && dev.soumissions[0].note !== null) {
          moduleNotesSur20.push(Number(dev.soumissions[0].note));
        }
      }

      // 3. Scores des quiz (pourcentage converti sur 20)
      for (const q of mod.quiz) {
        if (q.tentatives.length > 0 && q.tentatives[0].score !== null) {
          const scorePercent = Number(q.tentatives[0].score);
          const noteSur20 = (scorePercent / 100) * 20;
          moduleNotesSur20.push(noteSur20);
        }
      }

      // Calcul de la moyenne du module si au moins une note existe
      if (moduleNotesSur20.length > 0) {
        const moduleMoyenne =
          moduleNotesSur20.reduce((acc, n) => acc + n, 0) / moduleNotesSur20.length;
        const coeff = Number(mod.coefficient ?? 1);
        totalPondere += moduleMoyenne * coeff;
        totalPoids += coeff;
      }
    }

    return totalPoids > 0 ? Math.round((totalPondere / totalPoids) * 100) / 100 : 0;
  }

  // ====================================
  // UPDATE & DELETE MODULES
  // ====================================
  async updateModule(id: string, data: { titre?: string; coefficient?: number; ordre?: number }, user: any) {
    const mod = await this.prisma.module.findUnique({
      where: { id },
      include: { formation: true },
    });
    if (!mod) throw new NotFoundException('Module introuvable.');
    if (user.role !== Role.ADMIN_CENTRE && mod.formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit.');
    }
    const updated = await this.prisma.module.update({
      where: { id },
      data: {
        titre: data.titre,
        coefficient: data.coefficient !== undefined ? data.coefficient : undefined,
        ordre: data.ordre !== undefined ? data.ordre : undefined,
      },
    });
    this.invalidateFormationsCache(mod.formationId);
    return updated;
  }

  async deleteModule(id: string, user: any) {
    const mod = await this.prisma.module.findUnique({
      where: { id },
      include: { formation: true },
    });
    if (!mod) throw new NotFoundException('Module introuvable.');
    if (user.role !== Role.ADMIN_CENTRE && mod.formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit.');
    }
    const deleted = await this.prisma.module.delete({ where: { id } });
    this.invalidateFormationsCache(mod.formationId);
    return deleted;
  }

  // ====================================
  // UPDATE & DELETE COURS
  // ====================================
  async updateCours(id: string, data: { titre?: string; contenu?: string; fileUrl?: string }, user: any) {
    const cours = await this.prisma.cours.findUnique({
      where: { id },
      include: { module: { include: { formation: true } } },
    });
    if (!cours) throw new NotFoundException('Cours introuvable.');
    if (user.role !== Role.ADMIN_CENTRE && cours.module.formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit.');
    }
    const updated = await this.prisma.cours.update({
      where: { id },
      data: {
        titre: data.titre,
        contenu: data.contenu,
        fileUrl: data.fileUrl,
      },
    });
    this.invalidateFormationsCache(cours.module.formationId);
    return updated;
  }

  async deleteCours(id: string, user: any) {
    const cours = await this.prisma.cours.findUnique({
      where: { id },
      include: { module: { include: { formation: true } } },
    });
    if (!cours) throw new NotFoundException('Cours introuvable.');
    if (user.role !== Role.ADMIN_CENTRE && cours.module.formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit.');
    }
    // Nettoyer les séances associées
    await this.prisma.seanceFormation.updateMany({
      where: { coursId: id },
      data: { coursId: null },
    });
    const deleted = await this.prisma.cours.delete({ where: { id } });
    this.invalidateFormationsCache(cours.module.formationId);
    return deleted;
  }

  // ====================================
  // UPDATE & DELETE EVALUATIONS
  // ====================================
  async updateEvaluation(id: string, data: { titre?: string; noteMaximale?: number }, user: any) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id },
      include: { module: { include: { formation: true } } },
    });
    if (!evaluation) throw new NotFoundException('Évaluation introuvable.');
    if (user.role !== Role.ADMIN_CENTRE && evaluation.module.formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit.');
    }
    const updated = await this.prisma.evaluation.update({
      where: { id },
      data: {
        titre: data.titre,
        noteMaximale: data.noteMaximale !== undefined ? data.noteMaximale : undefined,
      },
    });
    this.invalidateFormationsCache(evaluation.module.formationId);
    return updated;
  }

  async deleteEvaluation(id: string, user: any) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id },
      include: { module: { include: { formation: true } } },
    });
    if (!evaluation) throw new NotFoundException('Évaluation introuvable.');
    if (user.role !== Role.ADMIN_CENTRE && evaluation.module.formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit.');
    }
    // Supprimer les notes
    await this.prisma.note.deleteMany({ where: { evaluationId: id } });
    const deleted = await this.prisma.evaluation.delete({ where: { id } });
    this.invalidateFormationsCache(evaluation.module.formationId);
    return deleted;
  }

  // ====================================
  // SUIVI TRANSVERSAL DES FILIÈRES ("CLASSES")
  // ====================================
  async getFilieresSuivi(
    user: any,
    filters?: { etablissementId?: string; statut?: string; search?: string },
  ) {
    const where: any = {};

    if (user.role === Role.ADMIN_CENTRE) {
      if (filters?.etablissementId && filters.etablissementId !== 'ALL') {
        where.etablissementId = filters.etablissementId;
      }
    } else {
      // Souveraineté stricte par établissement
      where.etablissementId = user.etablissementId;
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { titre: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { etablissement: { nom: { contains: q, mode: 'insensitive' } } },
      ];
    }

    // Récupérer les formations avec l'ensemble des relations nécessaires
    const formations = await this.prisma.formation.findMany({
      where,
      include: {
        etablissement: {
          select: { id: true, nom: true, codeAntenne: true, pays: true },
        },
        formationReferentiel: {
          include: {
            filiere: { select: { id: true, code: true, libelle: true } },
            niveau: { select: { id: true, code: true, libelle: true } },
          },
        },
        inscriptions: {
          include: {
            apprenant: {
              select: {
                id: true,
                matricule: true,
                nom: true,
                prenom: true,
                email: true,
                utilisateurId: true,
              },
            },
          },
          orderBy: { dateDebut: 'desc' },
        },
        modules: {
          orderBy: { ordre: 'asc' },
          include: {
            cours: { select: { id: true, titre: true } },
            evaluations: {
              include: {
                notes: { select: { valeur: true, utilisateurId: true } },
              },
            },
            quiz: {
              include: {
                tentatives: { select: { id: true, score: true } },
              },
            },
            devoirs: {
              include: {
                soumissions: { select: { id: true, note: true } },
              },
            },
            seances: {
              include: {
                formateur: {
                  select: { id: true, nom: true, prenom: true, email: true },
                },
              },
            },
          },
        },
        certificats: {
          select: { id: true, numeroSerie: true, moyenneGenerale: true, dateEmission: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Formateurs disponibles par établissement pour enrichissement
    const etabIds = Array.from(new Set(formations.map((f) => f.etablissementId)));
    const formateursEtab = await this.prisma.utilisateur.findMany({
      where: {
        etablissementId: { in: etabIds },
        role: Role.FORMATEUR,
        actif: true,
      },
      select: { id: true, nom: true, prenom: true, email: true, etablissementId: true },
    });

    // Cours total ids
    const allCoursIds = formations.flatMap((f) =>
      f.modules.flatMap((m) => m.cours.map((c) => c.id)),
    );

    const progressRecords = allCoursIds.length > 0
      ? await this.prisma.userProgress.findMany({
          where: {
            coursId: { in: allCoursIds },
            complete: true,
          },
          select: { coursId: true, utilisateurId: true },
        })
      : [];

    const completedUserCoursMap = new Map<string, Set<string>>();
    for (const p of progressRecords) {
      if (!completedUserCoursMap.has(p.utilisateurId)) {
        completedUserCoursMap.set(p.utilisateurId, new Set<string>());
      }
      completedUserCoursMap.get(p.utilisateurId)!.add(p.coursId);
    }

    const items = formations.map((f) => {
      const fCoursIds = f.modules.flatMap((m) => m.cours.map((c) => c.id));
      const fTotalCours = fCoursIds.length;

      // Inscriptions actives et roster
      const inscriptionsActives = f.inscriptions.filter(
        (i) => i.statut === 'ACTIVE' || i.statut === 'RESERVEE',
      );
      const effectifApprenants = f.inscriptions.length;

      // Calcul du statut de cycle de vie de la filière ("classe")
      let statut: 'EN_PREPARATION' | 'OUVERTE' | 'EN_COURS' | 'CLOTUREE' = 'OUVERTE';
      if (f.modules.length === 0) {
        statut = 'EN_PREPARATION';
      } else if (f.inscriptions.length > 0 && f.inscriptions.every((i) => i.statut === 'TERMINEE')) {
        statut = 'CLOTUREE';
      } else if (f.inscriptions.length > 0) {
        statut = 'EN_COURS';
      }

      // Formateurs assignés
      const formateursMap = new Map<string, { id: string; nom: string; prenom: string; email: string }>();
      for (const m of f.modules) {
        for (const s of m.seances) {
          if (s.formateur) {
            formateursMap.set(s.formateur.id, s.formateur);
          }
        }
      }
      // Si aucun formateur n'a encore animé de séance, proposer les formateurs rattachés à l'établissement
      if (formateursMap.size === 0) {
        const dispo = formateursEtab.filter((fe) => fe.etablissementId === f.etablissementId);
        for (const fe of dispo) {
          formateursMap.set(fe.id, { id: fe.id, nom: fe.nom, prenom: fe.prenom, email: fe.email });
        }
      }
      const formateursList = Array.from(formateursMap.values());

      // Progression moyenne des apprenants inscrits
      let avancementMoyen = 0;
      if (fTotalCours > 0 && f.inscriptions.length > 0) {
        let sommeProgression = 0;
        let apprenantsComptes = 0;
        for (const ins of f.inscriptions) {
          const uId = ins.apprenant?.utilisateurId;
          if (uId && completedUserCoursMap.has(uId)) {
            const userSet = completedUserCoursMap.get(uId)!;
            const userDone = fCoursIds.filter((cid) => userSet.has(cid)).length;
            sommeProgression += Math.round((userDone / fTotalCours) * 100);
          }
          apprenantsComptes++;
        }
        avancementMoyen = apprenantsComptes > 0 ? Math.round(sommeProgression / apprenantsComptes) : 0;
      }

      // Évaluations, notes et moyenne
      const allNotes = f.modules.flatMap((m) =>
        m.evaluations.flatMap((e) => e.notes.map((n) => Number(n.valeur))),
      );
      const allDevoirsNotes = f.modules.flatMap((m) =>
        m.devoirs.flatMap((d) =>
          d.soumissions
            .filter((s) => s.note !== null)
            .map((s) => Number(s.note)),
        ),
      );
      const combinedNotes = [...allNotes, ...allDevoirsNotes];
      const moyenneGenerale =
        combinedNotes.length > 0
          ? Math.round((combinedNotes.reduce((acc, v) => acc + v, 0) / combinedNotes.length) * 100) / 100
          : 0;

      const evaluationsCount =
        f.modules.reduce((acc, m) => acc + m.evaluations.length + m.quiz.length + m.devoirs.length, 0);

      const inscriptionsSummary = f.inscriptions.map((i) => ({
        id: i.id,
        apprenantId: i.apprenantId,
        matricule: i.apprenant?.matricule || 'N/A',
        nom: i.apprenant?.nom || '',
        prenom: i.apprenant?.prenom || '',
        email: i.apprenant?.email || '',
        statut: i.statut,
        dateDebut: i.dateDebut,
      }));

      return {
        id: f.id,
        titre: f.titre,
        description: f.description,
        createdAt: f.createdAt,
        etablissementId: f.etablissementId,
        etablissement: f.etablissement,
        formationReferentiel: f.formationReferentiel,
        statut,
        effectifApprenants,
        inscriptionsActivesCount: inscriptionsActives.length,
        inscriptions: inscriptionsSummary,
        formateurs: formateursList,
        modulesCount: f.modules.length,
        coursCount: fTotalCours,
        avancementMoyen,
        evaluationsCount,
        moyenneGenerale,
        certificatsCount: f.certificats.length,
      };
    });

    // Filtrage statut si demandé
    if (filters?.statut && filters.statut !== 'ALL') {
      return items.filter((it) => it.statut === filters.statut);
    }

    return items;
  }

  async getFiliereSuiviDetail(formationId: string, user: any) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
      include: {
        etablissement: {
          select: { id: true, nom: true, codeAntenne: true, pays: true, adresse: true },
        },
        formationReferentiel: {
          include: {
            filiere: true,
            niveau: true,
          },
        },
        inscriptions: {
          include: {
            apprenant: {
              select: {
                id: true,
                matricule: true,
                nom: true,
                prenom: true,
                email: true,
                telephone: true,
                utilisateurId: true,
              },
            },
          },
          orderBy: { dateDebut: 'desc' },
        },
        modules: {
          orderBy: { ordre: 'asc' },
          include: {
            cours: {
              select: { id: true, titre: true, createdAt: true, fileUrl: true },
              orderBy: { createdAt: 'asc' },
            },
            evaluations: {
              include: {
                notes: {
                  include: {
                    utilisateur: { select: { id: true, nom: true, prenom: true } },
                    formateur: { select: { id: true, nom: true, prenom: true } },
                  },
                },
              },
            },
            quiz: {
              include: {
                tentatives: {
                  include: {
                    apprenant: { select: { id: true, nom: true, prenom: true } },
                  },
                },
              },
            },
            devoirs: {
              include: {
                soumissions: {
                  include: {
                    apprenant: { select: { id: true, nom: true, prenom: true } },
                  },
                },
              },
            },
            seances: {
              include: {
                formateur: { select: { id: true, nom: true, prenom: true, email: true } },
              },
              orderBy: { dateHeureDebut: 'desc' },
            },
          },
        },
        certificats: {
          include: {
            utilisateur: { select: { id: true, nom: true, prenom: true, email: true } },
          },
          orderBy: { dateEmission: 'desc' },
        },
      },
    });

    if (!formation) throw new NotFoundException('Filière / Formation introuvable.');

    // BR-02 : Souveraineté
    if (user.role !== Role.ADMIN_CENTRE && formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit aux données d\'un autre établissement.');
    }

    const fCoursIds = formation.modules.flatMap((m) => m.cours.map((c) => c.id));
    const totalCours = fCoursIds.length;

    // Progression individuelle de chaque apprenant
    const progressRecords = fCoursIds.length > 0
      ? await this.prisma.userProgress.findMany({
          where: { coursId: { in: fCoursIds }, complete: true },
          select: { coursId: true, utilisateurId: true },
        })
      : [];

    const userCompletedMap = new Map<string, Set<string>>();
    for (const p of progressRecords) {
      if (!userCompletedMap.has(p.utilisateurId)) {
        userCompletedMap.set(p.utilisateurId, new Set<string>());
      }
      userCompletedMap.get(p.utilisateurId)!.add(p.coursId);
    }

    const apprenantsDetails = await Promise.all(
      formation.inscriptions.map(async (ins) => {
        const uId = ins.apprenant?.utilisateurId;
        const completedCount = uId && userCompletedMap.has(uId)
          ? fCoursIds.filter((cid) => userCompletedMap.get(uId)!.has(cid)).length
          : 0;
        const progressionPct = totalCours > 0 ? Math.round((completedCount / totalCours) * 100) : 0;

        let moyenne = 0;
        if (uId) {
          try {
            moyenne = await this.getMoyennePonderee(formationId, uId);
          } catch (e) {
            moyenne = 0;
          }
        }

        const certif = formation.certificats.find((c) => c.utilisateur?.id === uId);

        return {
          inscriptionId: ins.id,
          apprenantId: ins.apprenantId,
          matricule: ins.apprenant?.matricule || 'N/A',
          nom: ins.apprenant?.nom || '',
          prenom: ins.apprenant?.prenom || '',
          email: ins.apprenant?.email || '',
          telephone: ins.apprenant?.telephone || '',
          statut: ins.statut,
          dateDebut: ins.dateDebut,
          coursCompletes: completedCount,
          totalCours,
          progressionPct,
          moyenne,
          certificatEmis: !!certif,
          certificatNumero: certif?.numeroSerie ?? null,
        };
      }),
    );

    // Formateurs distincts
    const formateursMap = new Map<string, any>();
    for (const m of formation.modules) {
      for (const s of m.seances) {
        if (s.formateur) formateursMap.set(s.formateur.id, s.formateur);
      }
    }
    const formateurs = Array.from(formateursMap.values());

    return {
      ...formation,
      formateurs,
      apprenantsDetails,
    };
  }

  // ====================================
  // CATEGORIES DE FORMATION
  // ====================================
  async getCategories(includeInactive = false) {
    return this.prisma.categorieFormation.findMany({
      where: includeInactive ? {} : { actif: true },
      orderBy: [{ ordre: 'asc' }, { libelle: 'asc' }],
    });
  }

  async createCategorie(dto: CreateCategorieFormationDto, user: any) {
    if (user.role !== Role.ADMIN_CENTRE) {
      throw new ForbiddenException('Seul l\'Administrateur Central peut créer des catégories de formation.');
    }

    let code = (dto.code && dto.code.trim()) ? slugifyCategoryCode(dto.code) : slugifyCategoryCode(dto.libelle);

    // Vérifier l'unicité du code
    const existing = await this.prisma.categorieFormation.findUnique({ where: { code } });
    if (existing) {
      code = `${code}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const maxOrdre = await this.prisma.categorieFormation.aggregate({ _max: { ordre: true } });
    const nextOrdre = dto.ordre !== undefined ? dto.ordre : ((maxOrdre._max.ordre || 0) + 1);

    const cat = await this.prisma.categorieFormation.create({
      data: {
        code,
        libelle: dto.libelle.trim(),
        description: dto.description?.trim() || null,
        couleur: dto.couleur?.trim() || '#1C75BC',
        icone: dto.icone?.trim() || 'code',
        ordre: nextOrdre,
        actif: dto.actif !== undefined ? dto.actif : true,
      },
    });

    this.notifications.emit({
      type: 'CATEGORIE_UPDATE',
      title: 'Nouvelle Catégorie de Formation',
      message: `La catégorie "${cat.libelle}" a été ajoutée.`,
      data: { categorie: cat, action: 'CREATE' },
    });

    this.notifications.emit({
      type: 'LANDING_UPDATE',
      title: 'Catalogue des catégories mis à jour',
      message: `Une nouvelle catégorie "${cat.libelle}" est disponible au catalogue.`,
      data: { categorieId: cat.id, action: 'CREATE' },
    });

    return cat;
  }

  async updateCategorie(id: string, dto: UpdateCategorieFormationDto, user: any) {
    if (user.role !== Role.ADMIN_CENTRE) {
      throw new ForbiddenException('Seul l\'Administrateur Central peut modifier des catégories de formation.');
    }

    const existing = await this.prisma.categorieFormation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Catégorie introuvable.');
    }

    let code = existing.code;
    if (dto.code && dto.code.trim()) {
      const formattedCode = slugifyCategoryCode(dto.code);
      if (formattedCode !== existing.code) {
        const duplicate = await this.prisma.categorieFormation.findUnique({ where: { code: formattedCode } });
        if (duplicate && duplicate.id !== id) {
          throw new ConflictException(`Le code "${formattedCode}" est déjà utilisé par une autre catégorie.`);
        }
        code = formattedCode;
      }
    }

    const updated = await this.prisma.categorieFormation.update({
      where: { id },
      data: {
        code,
        libelle: dto.libelle !== undefined ? dto.libelle.trim() : existing.libelle,
        description: dto.description !== undefined ? dto.description?.trim() || null : existing.description,
        couleur: dto.couleur !== undefined ? dto.couleur?.trim() || '#1C75BC' : existing.couleur,
        icone: dto.icone !== undefined ? dto.icone?.trim() || 'code' : existing.icone,
        ordre: dto.ordre !== undefined ? dto.ordre : existing.ordre,
        actif: dto.actif !== undefined ? dto.actif : existing.actif,
      },
    });

    this.notifications.emit({
      type: 'CATEGORIE_UPDATE',
      title: 'Catégorie mise à jour',
      message: `La catégorie "${updated.libelle}" a été modifiée.`,
      data: { categorie: updated, action: 'UPDATE' },
    });

    this.notifications.emit({
      type: 'LANDING_UPDATE',
      title: 'Catalogue des catégories mis à jour',
      message: `La catégorie "${updated.libelle}" a été mise à jour.`,
      data: { categorieId: updated.id, action: 'UPDATE' },
    });

    return updated;
  }

  async deleteCategorie(id: string, user: any) {
    if (user.role !== Role.ADMIN_CENTRE) {
      throw new ForbiddenException('Seul l\'Administrateur Central peut supprimer des catégories de formation.');
    }

    const existing = await this.prisma.categorieFormation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Catégorie introuvable.');
    }

    // Vérifier si des formations utilisent cette catégorie
    const formationsCount = await this.prisma.formation.count({
      where: {
        OR: [
          { categorie: existing.code },
          { categorie: existing.libelle },
        ],
      },
    });

    if (formationsCount > 0) {
      // Désactiver au lieu de détruire pour préserver l'intégrité
      await this.prisma.categorieFormation.update({
        where: { id },
        data: { actif: false },
      });

      this.notifications.emit({
        type: 'CATEGORIE_UPDATE',
        title: 'Catégorie désactivée',
        message: `La catégorie "${existing.libelle}" a été désactivée (${formationsCount} formations associées).`,
        data: { categorieId: id, action: 'DEACTIVATE' },
      });

      return {
        success: true,
        deactivated: true,
        message: `La catégorie est rattachée à ${formationsCount} formation(s) : elle a été désactivée sans impacter l'historique existant.`,
      };
    }

    await this.prisma.categorieFormation.delete({ where: { id } });

    this.notifications.emit({
      type: 'CATEGORIE_UPDATE',
      title: 'Catégorie supprimée',
      message: `La catégorie "${existing.libelle}" a été définitivement supprimée.`,
      data: { categorieId: id, action: 'DELETE' },
    });

    this.notifications.emit({
      type: 'LANDING_UPDATE',
      title: 'Catalogue des catégories mis à jour',
      message: `La catégorie "${existing.libelle}" a été retirée du catalogue.`,
      data: { categorieId: id, action: 'DELETE' },
    });

    return { success: true, deactivated: false, message: 'Catégorie supprimée avec succès.' };
  }
}


