import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PedagogieService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ====================================
  // FORMATIONS
  // ====================================
  async getFormations(user: any) {
    const where = user.role === Role.ADMIN_CENTRE
      ? {}
      : { etablissementId: user.etablissementId };
    return this.prisma.formation.findMany({
      where,
      include: { modules: { include: { _count: { select: { cours: true } } } }, etablissement: { select: { nom: true } } },
      orderBy: { titre: 'asc' },
    });
  }

  async getFormation(id: string, user: any) {
    const formation = await this.prisma.formation.findUnique({
      where: { id },
      include: {
        modules: { include: { cours: true } },
        etablissement: { select: { nom: true } },
      },
    });
    if (!formation) throw new NotFoundException('Formation introuvable.');

    // BR-02 : Souveraineté des données - un non-admin ne voit que ses formations
    if (user.role !== Role.ADMIN_CENTRE && formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Vous ne pouvez pas accéder aux formations d\'un autre établissement.');
    }
    return formation;
  }

  async createFormation(data: { titre: string; description?: string; formationReferentielId?: string; etablissementId?: string }, user: any) {
    const etablissementId = (user.role === Role.ADMIN_CENTRE && data.etablissementId)
      ? data.etablissementId
      : user.etablissementId;

    const formation = await this.prisma.formation.create({
      data: {
        titre: data.titre,
        description: data.description,
        etablissementId,
        formationReferentielId: data.formationReferentielId,
      },
      include: {
        etablissement: { select: { nom: true } },
      },
    });

    this.notifications.emit({
      type: 'FILIERE_UPDATE',
      recipientEtablissementId: etablissementId,
      title: 'Nouvelle Filière / Classe',
      message: `La filière "${formation.titre}" a été attribuée / créée pour ${formation.etablissement?.nom || 'l\'établissement'}.`,
      data: { formationId: formation.id, etablissementId },
    });

    return formation;
  }

  async updateFormation(id: string, data: { titre?: string; description?: string }, user: any) {
    const formation = await this.getFormation(id, user);
    // BR-02 : Seul l'établissement d'origine peut modifier
    if (user.role !== Role.ADMIN_CENTRE && formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Modification interdite pour un établissement tiers.');
    }
    const updated = await this.prisma.formation.update({ where: { id }, data });

    this.notifications.emit({
      type: 'FILIERE_UPDATE',
      recipientEtablissementId: formation.etablissementId,
      title: 'Filière mise à jour',
      message: `La filière "${updated.titre}" a été modifiée.`,
      data: { formationId: updated.id, etablissementId: formation.etablissementId },
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
    return this.prisma.evaluation.create({
      data: { titre: data.titre, moduleId, noteMaximale: data.noteMaximale ?? 20 },
    });
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
    return this.prisma.cours.update({ where: { id: coursId }, data: { fileUrl } });
  }

  async deleteFormation(id: string, user: any) {
    await this.getFormation(id, user);
    return this.prisma.formation.delete({ where: { id } });
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
   * BR-03 : Calcule la moyenne pondérée d'un apprenant pour une formation.
   * Moyenne = Σ(note * coefficient) / Σ(coefficient)
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
      },
    });

    let totalPoids = 0;
    let totalPondere = 0;

    for (const mod of modules) {
      for (const evaluation of mod.evaluations) {
        if (evaluation.notes.length > 0) {
          const note = evaluation.notes[0];
          const noteVal = Number(note.valeur);
          const coeff = Number(mod.coefficient ?? 1);
          totalPondere += noteVal * coeff;
          totalPoids += coeff;
        }
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
    return this.prisma.module.update({
      where: { id },
      data: {
        titre: data.titre,
        coefficient: data.coefficient !== undefined ? data.coefficient : undefined,
        ordre: data.ordre !== undefined ? data.ordre : undefined,
      },
    });
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
    return this.prisma.module.delete({ where: { id } });
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
    return this.prisma.cours.update({
      where: { id },
      data: {
        titre: data.titre,
        contenu: data.contenu,
        fileUrl: data.fileUrl,
      },
    });
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
    return this.prisma.cours.delete({ where: { id } });
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
    return this.prisma.evaluation.update({
      where: { id },
      data: {
        titre: data.titre,
        noteMaximale: data.noteMaximale !== undefined ? data.noteMaximale : undefined,
      },
    });
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
    return this.prisma.evaluation.delete({ where: { id } });
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
}

