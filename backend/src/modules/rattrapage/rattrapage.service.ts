import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreerSessionRattrapageDto,
  InscrireCandidatRattrapageDto,
  SaisirNoteRattrapageDto,
  UpdateStatutSessionDto,
} from './dto/rattrapage.dto';
import {
  RattrapagePlanifieEvent,
  NoteRattrapageSaisieEvent,
  FormationTermineeEvent,
} from '../../common/events/app.events';

@Injectable()
export class RattrapageService {
  private readonly logger = new Logger(RattrapageService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    @Optional() private eventEmitter?: EventEmitter2,
  ) {}

  /**
   * Planifie une nouvelle session de rattrapage pour un module d'enseignement.
   */
  async creerSession(dto: CreerSessionRattrapageDto, user: any) {
    const mod = await this.prisma.module.findUnique({
      where: { id: dto.moduleId },
      include: { formation: true },
    });
    if (!mod) throw new NotFoundException('Module introuvable.');

    if (user.role !== Role.ADMIN_CENTRE && mod.formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Action non autorisée pour cet établissement.');
    }

    const session = await this.prisma.sessionRattrapage.create({
      data: {
        moduleId: dto.moduleId,
        formationId: dto.formationId,
        etablissementId: mod.formation.etablissementId,
        dateSession: new Date(dto.dateSession),
        salleOuLien: dto.salleOuLien ?? null,
        formateurId: dto.formateurId,
        statut: 'PROGRAMME',
        notePlafond: dto.notePlafond ?? 20.0,
        sessionNumero: dto.sessionNumero ?? 1,
        remarques: dto.remarques ?? null,
      },
      include: {
        module: { select: { id: true, titre: true } },
        formation: { select: { id: true, titre: true } },
        examinateur: { select: { id: true, nom: true, prenom: true, email: true } },
      },
    });

    if (this.eventEmitter) {
      this.eventEmitter.emit(
        'rattrapage.planifie',
        new RattrapagePlanifieEvent(
          session.id,
          dto.moduleId,
          dto.formationId,
          dto.formateurId,
          session.dateSession,
        ),
      );
    }

    return session;
  }

  /**
   * Récupère la liste des sessions de rattrapage (filtrable par formation ou module).
   */
  async getSessions(query: { formationId?: string; moduleId?: string }, user: any) {
    const where: any = {};
    if (user.role !== Role.ADMIN_CENTRE) {
      where.etablissementId = user.etablissementId;
    }
    if (query.formationId) where.formationId = query.formationId;
    if (query.moduleId) where.moduleId = query.moduleId;

    return this.prisma.sessionRattrapage.findMany({
      where,
      include: {
        module: { select: { id: true, titre: true } },
        formation: { select: { id: true, titre: true } },
        examinateur: { select: { id: true, nom: true, prenom: true } },
        _count: { select: { inscriptions: true } },
      },
      orderBy: { dateSession: 'desc' },
    });
  }

  /**
   * Détails complets d'une session de rattrapage avec ses candidats inscrits.
   */
  async getSessionById(id: string, user: any) {
    const session = await this.prisma.sessionRattrapage.findUnique({
      where: { id },
      include: {
        module: { select: { id: true, titre: true, coefficient: true } },
        formation: { select: { id: true, titre: true } },
        examinateur: { select: { id: true, nom: true, prenom: true, email: true } },
        inscriptions: {
          include: {
            apprenant: {
              select: { id: true, nom: true, prenom: true, email: true, photoUrl: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!session) throw new NotFoundException('Session de rattrapage introuvable.');

    if (user.role !== Role.ADMIN_CENTRE && session.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit aux données de cet établissement.');
    }

    return session;
  }

  /**
   * Inscription individuelle d'un apprenant ajourné à la session.
   */
  async inscrireCandidat(sessionId: string, dto: InscrireCandidatRattrapageDto, user: any) {
    const session = await this.prisma.sessionRattrapage.findUnique({
      where: { id: sessionId },
      include: { module: true, formation: true },
    });
    if (!session) throw new NotFoundException('Session introuvable.');

    if (user.role !== Role.ADMIN_CENTRE && session.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Action non autorisée pour cet établissement.');
    }

    const existant = await this.prisma.inscriptionRattrapage.findUnique({
      where: {
        sessionId_apprenantId: {
          sessionId,
          apprenantId: dto.apprenantId,
        },
      },
    });
    if (existant) {
      throw new ConflictException('Cet apprenant est déjà convoqué ou inscrit à cette session.');
    }

    const inscription = await this.prisma.inscriptionRattrapage.create({
      data: {
        sessionId,
        apprenantId: dto.apprenantId,
        noteInitiale: dto.noteInitiale,
        statut: 'CONVOQUE',
        remarques: dto.remarques ?? null,
      },
      include: {
        apprenant: {
          select: { id: true, nom: true, prenom: true, email: true },
        },
      },
    });

    this.notifications.emit({
      type: 'FORMATION_UPDATE',
      recipientUserId: dto.apprenantId,
      title: 'Convocation en Session de Rattrapage',
      message: `Vous êtes convoqué(e) au rattrapage du module "${session.module.titre}" le ${session.dateSession.toLocaleDateString('fr-FR')}.`,
      data: {
        sessionId,
        moduleId: session.moduleId,
        formationId: session.formationId,
        action: 'CONVOCATION_RATTRAPAGE',
      },
    });

    return inscription;
  }

  /**
   * Détection et inscription automatique de tous les apprenants ajournés ($M < 10/20$).
   */
  async autoInscrireAjournes(sessionId: string, user: any) {
    const session = await this.prisma.sessionRattrapage.findUnique({
      where: { id: sessionId },
      include: {
        module: {
          include: {
            evaluations: {
              include: {
                notes: true,
              },
            },
          },
        },
        formation: true,
      },
    });
    if (!session) throw new NotFoundException('Session introuvable.');

    if (user.role !== Role.ADMIN_CENTRE && session.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Action non autorisée pour cet établissement.');
    }

    // Calculer les apprenants ayant une moyenne inférieure à 10 sur ce module
    const notesParApprenant = new Map<string, number[]>();
    for (const ev of session.module.evaluations) {
      for (const n of ev.notes) {
        const arr = notesParApprenant.get(n.utilisateurId) || [];
        arr.push(Number(n.valeur));
        notesParApprenant.set(n.utilisateurId, arr);
      }
    }

    const ajournes: Array<{ apprenantId: string; moyenne: number }> = [];
    for (const [apprenantId, notes] of notesParApprenant.entries()) {
      if (notes.length > 0) {
        const moyenne = notes.reduce((acc, v) => acc + v, 0) / notes.length;
        if (moyenne < 10.0) {
          ajournes.push({ apprenantId, moyenne: Math.round(moyenne * 100) / 100 });
        }
      }
    }

    let inscritsCount = 0;
    for (const aj of ajournes) {
      const existe = await this.prisma.inscriptionRattrapage.findUnique({
        where: {
          sessionId_apprenantId: {
            sessionId,
            apprenantId: aj.apprenantId,
          },
        },
      });

      if (!existe) {
        await this.prisma.inscriptionRattrapage.create({
          data: {
            sessionId,
            apprenantId: aj.apprenantId,
            noteInitiale: aj.moyenne,
            statut: 'CONVOQUE',
            remarques: `Ajourné(e) avec moyenne initiale de ${aj.moyenne}/20`,
          },
        });

        this.notifications.emit({
          type: 'FORMATION_UPDATE',
          recipientUserId: aj.apprenantId,
          title: 'Convocation automatique en Rattrapage',
          message: `Votre moyenne au module "${session.module.titre}" (${aj.moyenne}/20) requiert une session de rattrapage.`,
          data: {
            sessionId,
            moduleId: session.moduleId,
            formationId: session.formationId,
          },
        });

        inscritsCount++;
      }
    }

    return {
      message: `${inscritsCount} apprenant(s) ajourné(s) inscrit(s) automatiquement en rattrapage.`,
      inscritsCount,
      totalAjournes: ajournes.length,
    };
  }

  /**
   * Saisie de la note de rattrapage et calcul de la note retenue :
   * NoteRetenue = min(NotePlafond, max(NoteInitiale, NoteRattrapage))
   */
  async saisirNote(inscriptionId: string, dto: SaisirNoteRattrapageDto, user: any) {
    const inscription = await this.prisma.inscriptionRattrapage.findUnique({
      where: { id: inscriptionId },
      include: {
        session: {
          include: {
            module: { include: { evaluations: true } },
            formation: true,
          },
        },
        apprenant: true,
      },
    });
    if (!inscription) throw new NotFoundException('Inscription au rattrapage introuvable.');

    if (
      user.role !== Role.ADMIN_CENTRE &&
      inscription.session.etablissementId !== user.etablissementId &&
      inscription.session.formateurId !== user.id
    ) {
      throw new ForbiddenException('Action non autorisée pour cette session.');
    }

    const noteInit = Number(inscription.noteInitiale);
    const noteRatt = Number(dto.noteRattrapage);
    const plafond = Number(inscription.session.notePlafond ?? 20.0);

    // Règle d'arbitrage de la note finale
    const noteRetenue = Math.min(plafond, Math.max(noteInit, noteRatt));

    const updated = await this.prisma.inscriptionRattrapage.update({
      where: { id: inscriptionId },
      data: {
        noteRattrapage: noteRatt,
        noteRetenue,
        statut: dto.statut ?? 'NOTE_SAISIE',
        remarques: dto.remarques ?? inscription.remarques,
        dateNotation: new Date(),
      },
    });

    // Mettre à jour la note correspondante dans la table `notes` pour l'évaluation du module
    const firstEval = inscription.session.module.evaluations[0];
    if (firstEval && noteRetenue > noteInit) {
      await this.prisma.note.upsert({
        where: {
          evaluationId_utilisateurId: {
            evaluationId: firstEval.id,
            utilisateurId: inscription.apprenantId,
          },
        },
        update: {
          valeur: noteRetenue,
          dateNotation: new Date(),
        },
        create: {
          evaluationId: firstEval.id,
          utilisateurId: inscription.apprenantId,
          formateurId: inscription.session.formateurId,
          valeur: noteRetenue,
        },
      });
    }

    // Notification à l'apprenant
    this.notifications.emit({
      type: 'NOTE_PUBLIEE',
      recipientUserId: inscription.apprenantId,
      title: 'Résultat du Rattrapage publié',
      message: `Votre note de rattrapage (${noteRatt}/20) a été saisie. Note finale retenue : ${noteRetenue}/20.`,
      data: {
        moduleId: inscription.session.moduleId,
        noteRetenue,
        action: 'RESULTAT_RATTRAPAGE',
      },
    });

    if (this.eventEmitter) {
      this.eventEmitter.emit(
        'rattrapage.note_saisie',
        new NoteRattrapageSaisieEvent(
          inscription.id,
          inscription.apprenantId,
          inscription.session.moduleId,
          inscription.session.formationId,
          noteInit,
          noteRatt,
          noteRetenue,
          noteRetenue,
        ),
      );
    }

    return updated;
  }

  /**
   * Liste des sessions de rattrapage de l'apprenant connecté.
   */
  async getMesRattrapages(user: any) {
    return this.prisma.inscriptionRattrapage.findMany({
      where: { apprenantId: user.id },
      include: {
        session: {
          include: {
            module: { select: { id: true, titre: true } },
            formation: { select: { id: true, titre: true } },
            examinateur: { select: { id: true, nom: true, prenom: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
