import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Role } from '../../../common/enums/role.enum';
import { NotificationsService } from '../../notifications/notifications.service';

export interface AuditCompletudeResult {
  estComplet: boolean;
  modulesTotal: number;
  modulesEvalues: number;
  modulesManquants: Array<{ id: string; titre: string; coefficient: number }>;
  moyennePonderee: number;
}

@Injectable()
export class PedagogieGradingService {
  private readonly logger = new Logger(PedagogieGradingService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Saisie officielle d'une note d'évaluation avec audit trail immuable.
   */
  async submitNote(
    evaluationId: string,
    userId: string,
    valeur: number,
    user: any,
    ipAdresse: string,
  ) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: { module: { include: { formation: true } } },
    });
    if (!evaluation) throw new NotFoundException('Évaluation introuvable.');

    if (
      user.role !== Role.ADMIN_CENTRE &&
      evaluation.module.formation.etablissementId !== user.etablissementId
    ) {
      throw new ForbiddenException(
        "BR-02 : Vous ne pouvez pas noter une évaluation d'un autre établissement.",
      );
    }

    const noteMax = Number(evaluation.noteMaximale || 20);
    if (valeur < 0 || valeur > noteMax) {
      throw new ForbiddenException(`La note doit être comprise entre 0 et ${noteMax}.`);
    }

    const targetStudent = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
    });
    if (!targetStudent) throw new NotFoundException('Apprenant introuvable.');

    if (
      user.role !== Role.ADMIN_CENTRE &&
      targetStudent.etablissementId !== user.etablissementId
    ) {
      throw new ForbiddenException("BR-02 : L'apprenant n'appartient pas à votre établissement.");
    }

    // Vérifier l'inscription effective de l'apprenant à la formation évaluée
    const isEnrolled = await this.prisma.inscription.findFirst({
      where: {
        formationId: evaluation.module.formationId,
        apprenant: { utilisateurId: userId },
        statut: { in: ['ACTIVE', 'RESERVEE', 'TERMINEE'] },
      },
    });
    if (!isEnrolled) {
      throw new BadRequestException("Cet apprenant n'est pas inscrit à la formation rattachée à cette évaluation.");
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

    // Journalisation dans table_audit (Traçabilité obligatoire OWASP & ANSSI)
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

    // Push temps réel à l'apprenant ET aux formateurs de l'établissement
    this.notifications.emit({
      type: 'NOTE_PUBLIEE',
      recipientUserId: userId,
      recipientEtablissementId: targetStudent.etablissementId,
      title: 'Note publiée !',
      message: `Votre note pour l'évaluation « ${evaluation.titre} » a été enregistrée : ${valeur}/${evaluation.noteMaximale || 20}.`,
      data: {
        evaluationId,
        evaluationTitre: evaluation.titre,
        note: valeur,
        noteMax: evaluation.noteMaximale || 20,
        formationId: evaluation.module.formationId,
        moduleId: evaluation.moduleId,
        apprenantId: userId,
      },
    });

    return result;
  }

  /**
   * Récupère la feuille de notes consolidée d'une évaluation pour l'ensemble des apprenants inscrits.
   */
  async getFeuilleNotes(evaluationId: string, user: any) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        module: {
          include: {
            formation: {
              select: { id: true, titre: true, etablissementId: true },
            },
          },
        },
        notes: {
          include: {
            formateur: {
              select: { id: true, nom: true, prenom: true },
            },
          },
        },
      },
    });

    if (!evaluation) throw new NotFoundException('Évaluation introuvable.');

    if (
      user.role !== Role.ADMIN_CENTRE &&
      evaluation.module.formation.etablissementId !== user.etablissementId
    ) {
      throw new ForbiddenException('BR-02 : Accès interdit à cette évaluation.');
    }

    // Récupérer tous les apprenants inscrits à la formation
    const apprenants = await this.prisma.utilisateur.findMany({
      where: {
        etablissementId: evaluation.module.formation.etablissementId,
        role: Role.APPRENANT,
        actif: true,
        apprenantProfile: {
          inscriptions: {
            some: {
              formationId: evaluation.module.formation.id,
              statut: { in: ['ACTIVE', 'RESERVEE', 'TERMINEE'] },
            },
          },
        },
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        photoUrl: true,
        apprenantProfile: {
          select: { matricule: true },
        },
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });

    // Mapper les apprenants avec leur note existante
    const notesMap = new Map<string, any>();
    evaluation.notes.forEach((n) => notesMap.set(n.utilisateurId, n));

    const lignes = apprenants.map((a) => {
      const noteObj = notesMap.get(a.id);
      return {
        apprenantId: a.id,
        nom: a.nom,
        prenom: a.prenom,
        email: a.email,
        matricule: a.apprenantProfile?.matricule ?? null,
        photoUrl: a.photoUrl ?? null,
        noteId: noteObj?.id ?? null,
        valeur: noteObj ? Number(noteObj.valeur) : null,
        statut: noteObj ? 'NOTE' : 'NON_NOTE',
        dateNotation: noteObj?.dateNotation ?? null,
        formateurNom: noteObj?.formateur ? `${noteObj.formateur.prenom} ${noteObj.formateur.nom}` : null,
      };
    });

    // Calculer les métriques globales en direct
    const notesSaisies = lignes.filter((l) => l.valeur !== null).map((l) => l.valeur as number);
    const totalInscrits = lignes.length;
    const totalNotes = notesSaisies.length;
    const sommeNotes = notesSaisies.reduce((acc, v) => acc + v, 0);
    const moyenneClasse = totalNotes > 0 ? Math.round((sommeNotes / totalNotes) * 100) / 100 : 0;
    const noteMin = totalNotes > 0 ? Math.min(...notesSaisies) : null;
    const noteMax = totalNotes > 0 ? Math.max(...notesSaisies) : null;
    const tauxReussite = totalNotes > 0 ? Math.round((notesSaisies.filter((v) => v >= 10).length / totalNotes) * 100) : 0;

    return {
      evaluation: {
        id: evaluation.id,
        titre: evaluation.titre,
        noteMaximale: Number(evaluation.noteMaximale || 20),
        moduleId: evaluation.moduleId,
        moduleTitre: evaluation.module.titre,
        moduleCoefficient: Number(evaluation.module.coefficient ?? 1),
        formationId: evaluation.module.formation.id,
        formationTitre: evaluation.module.formation.titre,
      },
      kpis: {
        totalInscrits,
        totalNotes,
        moyenneClasse,
        noteMin,
        noteMax,
        tauxReussite,
      },
      lignes,
    };
  }

  /**
   * Saisie par lot de notes d'une évaluation pour plusieurs apprenants avec audit log & SSE.
   */
  async submitNotesBatch(
    evaluationId: string,
    notes: Array<{ utilisateurId: string; valeur: number }>,
    user: any,
    ipAdresse: string,
  ) {
    if (!notes || notes.length === 0) {
      throw new BadRequestException('Aucune note à enregistrer.');
    }

    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: { module: { include: { formation: true } } },
    });
    if (!evaluation) throw new NotFoundException('Évaluation introuvable.');

    if (
      user.role !== Role.ADMIN_CENTRE &&
      evaluation.module.formation.etablissementId !== user.etablissementId
    ) {
      throw new ForbiddenException(
        "BR-02 : Vous ne pouvez pas noter une évaluation d'un autre établissement.",
      );
    }

    const noteMax = Number(evaluation.noteMaximale || 20);

    // Valider les bornes pour toutes les notes
    for (const item of notes) {
      if (item.valeur < 0 || item.valeur > noteMax) {
        throw new BadRequestException(
          `La note pour l'apprenant ${item.utilisateurId} doit être comprise entre 0 et ${noteMax}.`,
        );
      }
    }

    // Exécuter l'ensemble des mises à jour dans une transaction interactive Prisma atomique
    const { resultats, notificationsAEnvoyer } = await this.prisma.$transaction(
      async (tx) => {
        const batchResults: any[] = [];
        const pendingNotifications: any[] = [];

        for (const item of notes) {
          const oldNote = await tx.note.findUnique({
            where: { evaluationId_utilisateurId: { evaluationId, utilisateurId: item.utilisateurId } },
          });
          const oldNoteVal = oldNote ? oldNote.valeur : null;

          const savedNote = await tx.note.upsert({
            where: { evaluationId_utilisateurId: { evaluationId, utilisateurId: item.utilisateurId } },
            update: { valeur: item.valeur, formateurId: user.id, dateNotation: new Date() },
            create: {
              utilisateurId: item.utilisateurId,
              evaluationId,
              valeur: item.valeur,
              formateurId: user.id,
            },
          });

          // Journalisation dans table_audit
          await tx.auditLog.create({
            data: {
              auteurId: user.id,
              action: 'SAISIE_NOTE',
              details: {
                userId: item.utilisateurId,
                evaluationId,
                mode: 'BATCH',
                etatAvant: oldNoteVal !== null ? `${oldNoteVal}/20` : 'Aucune',
                etatApres: `${item.valeur}/20`,
              },
              ipAdresse,
            },
          }).catch((err) => {
            this.logger.warn(`AuditLog batch item failure: ${err?.message}`);
          });

          batchResults.push(savedNote);

          // Préparer la notification ciblée individuelle à l'apprenant
          pendingNotifications.push({
            type: 'NOTE_PUBLIEE',
            recipientUserId: item.utilisateurId,
            recipientEtablissementId: evaluation.module.formation.etablissementId,
            title: 'Note publiée !',
            message: `Votre note pour l'évaluation « ${evaluation.titre} » a été enregistrée : ${item.valeur}/${noteMax}.`,
            data: {
              evaluationId,
              evaluationTitre: evaluation.titre,
              note: item.valeur,
              noteMax,
              formationId: evaluation.module.formationId,
              moduleId: evaluation.moduleId,
              apprenantId: item.utilisateurId,
            },
          });
        }

        return { resultats: batchResults, notificationsAEnvoyer: pendingNotifications };
      },
      { maxWait: 10000, timeout: 30000 },
    );

    // Une fois la transaction validée avec succès, diffuser les notifications SSE
    for (const notif of notificationsAEnvoyer) {
      this.notifications.emit(notif);
    }

    // Émettre un événement consolidé pour l'établissement / formateurs pour rafraîchissement temps réel
    this.notifications.emit({
      type: 'NOTE_PUBLIEE',
      recipientEtablissementId: evaluation.module.formation.etablissementId,
      title: 'Notes publiées en lot',
      message: `${resultats.length} note(s) enregistrée(s) pour l'évaluation « ${evaluation.titre} ».`,
      data: {
        evaluationId,
        evaluationTitre: evaluation.titre,
        formationId: evaluation.module.formationId,
        moduleId: evaluation.moduleId,
        count: resultats.length,
        batch: true,
      },
    });

    return {
      message: `${resultats.length} note(s) enregistrée(s) avec succès.`,
      count: resultats.length,
      evaluationId,
    };
  }

  /**
   * BR-03 & INTÉGRITÉ ACADÉMIQUE : Calcule la moyenne pondérée académique globale d'une formation.
   * RÈGLE D'OR : Tout module obligatoire (coefficient > 0) doit faire partie du dénominateur (totalPoids).
   * Si un apprenant n'a passé aucune évaluation sur un module obligatoire, sa note pour ce module est
   * comptabilisée comme 0/20.
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
      const coeff = Number(mod.coefficient ?? 1);
      // Les modules avec un coefficient <= 0 sont exclus des calculs académiques
      if (coeff <= 0) continue;

      const moduleNotesSur20: number[] = [];

      // 1. Évaluations continues (ramenées sur 20)
      for (const ev of mod.evaluations) {
        if (ev.notes.length > 0) {
          const noteRaw = Number(ev.notes[0].valeur);
          const maxNote = Number(ev.noteMaximale) || 20;
          const noteSur20 = maxNote > 0 ? (noteRaw / maxNote) * 20 : noteRaw;
          moduleNotesSur20.push(noteSur20);
        }
      }

      // 2. Devoirs notés
      for (const dev of mod.devoirs) {
        if (dev.soumissions.length > 0 && dev.soumissions[0].note !== null) {
          moduleNotesSur20.push(Number(dev.soumissions[0].note));
        }
      }

      // 3. Quiz d'évaluation (score % converti sur 20)
      for (const q of mod.quiz) {
        if (q.tentatives.length > 0 && q.tentatives[0].score !== null) {
          const scorePercent = Number(q.tentatives[0].score);
          const noteSur20 = (scorePercent / 100) * 20;
          moduleNotesSur20.push(noteSur20);
        }
      }

      // Intégration du module obligatoire dans le poids global
      totalPoids += coeff;

      if (moduleNotesSur20.length > 0) {
        const moduleMoyenne =
          moduleNotesSur20.reduce((acc, n) => acc + n, 0) / moduleNotesSur20.length;
        totalPondere += moduleMoyenne * coeff;
      } else {
        // PÉNALISATION DES MODULES NON ÉVALUÉS : 0 / 20 appliqué avec son coefficient
        totalPondere += 0;
      }
    }

    return totalPoids > 0 ? Math.round((totalPondere / totalPoids) * 100) / 100 : 0;
  }

  /**
   * Audit d'exhaustivité des évaluations :
   * Vérifie que TOUS les modules obligatoires possèdent au moins une note d'évaluation.
   * Empêche qu'un certificat soit émis si des examens obligatoires sont manquants.
   */
  async auditCompletudeEvaluations(
    formationId: string,
    userId: string,
  ): Promise<AuditCompletudeResult> {
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

    const modulesObligatoires = modules.filter(
      (m) => m.coefficient === null || Number(m.coefficient) > 0,
    );

    const modulesManquants: Array<{ id: string; titre: string; coefficient: number }> = [];
    let modulesEvalues = 0;

    for (const mod of modulesObligatoires) {
      const hasNoteEval = mod.evaluations.some((e) => e.notes.length > 0);
      const hasDevoirNote = mod.devoirs.some(
        (d) => d.soumissions.length > 0 && d.soumissions[0].note !== null,
      );
      const hasQuizPasse = mod.quiz.some(
        (q) => q.tentatives.length > 0 && q.tentatives[0].score !== null,
      );

      if (hasNoteEval || hasDevoirNote || hasQuizPasse) {
        modulesEvalues++;
      } else {
        modulesManquants.push({
          id: mod.id,
          titre: mod.titre,
          coefficient: Number(mod.coefficient ?? 1),
        });
      }
    }

    const moyennePonderee = await this.getMoyennePonderee(formationId, userId);
    const estComplet = modulesManquants.length === 0;

    return {
      estComplet,
      modulesTotal: modulesObligatoires.length,
      modulesEvalues,
      modulesManquants,
      moyennePonderee,
    };
  }
}
