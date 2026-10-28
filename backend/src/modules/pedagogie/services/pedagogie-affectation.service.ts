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
import { PrismaService } from '../../../prisma/prisma.service';
import { Role } from '../../../common/enums/role.enum';
import {
  AffecterFormateurDto,
  UpdateAffectationFormateurDto,
  CreerHabilitationDto,
  UpdateHabilitationDto,
  StatutHabilitationEnum,
} from '../dto/affectation-formateur.dto';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  AffectationFormateurCreeeEvent,
  HabilitationAccordeeEvent,
} from '../../../common/events/app.events';

@Injectable()
export class PedagogieAffectationService {
  private readonly logger = new Logger(PedagogieAffectationService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    @Optional() private eventEmitter?: EventEmitter2,
  ) { }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. GESTION DES HABILITATIONS DISCIPLINAIRES PAR MATIÈRE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Enregistre ou accorde une habilitation formelle à un formateur pour une discipline.
   */
  async creerHabilitation(dto: CreerHabilitationDto, user: any) {
    const formateur = await this.prisma.utilisateur.findUnique({
      where: { id: dto.formateurId },
    });
    if (!formateur || formateur.role !== Role.FORMATEUR) {
      throw new NotFoundException('Utilisateur introuvable ou non détenteur du rôle FORMATEUR.');
    }

    if (user.role !== Role.ADMIN_CENTRE && formateur.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Action non autorisée pour cet établissement.');
    }

    const existant = await this.prisma.habilitationFormateur.findUnique({
      where: {
        formateurId_discipline: {
          formateurId: dto.formateurId,
          discipline: dto.discipline.trim(),
        },
      },
    });

    if (existant) {
      throw new ConflictException(`Une habilitation existe déjà pour ce formateur dans la discipline "${dto.discipline}".`);
    }

    const habilitation = await this.prisma.habilitationFormateur.create({
      data: {
        formateurId: dto.formateurId,
        etablissementId: formateur.etablissementId,
        discipline: dto.discipline.trim(),
        niveauMax: dto.niveauMax ?? null,
        statut: 'HABILITE',
        dateExpiration: dto.dateExpiration ? new Date(dto.dateExpiration) : null,
        piecesJointesUrl: dto.piecesJointesUrl ?? null,
        valideParId: user.id,
      },
      include: {
        formateur: {
          select: { id: true, nom: true, prenom: true, email: true },
        },
      },
    });

    if (this.eventEmitter) {
      this.eventEmitter.emit(
        'habilitation.accordee',
        new HabilitationAccordeeEvent(habilitation.id, dto.formateurId, dto.discipline),
      );
    }

    return habilitation;
  }

  /**
   * Liste les habilitations d'un formateur donné.
   */
  async getHabilitationsFormateur(formateurId: string, user: any) {
    const formateur = await this.prisma.utilisateur.findUnique({
      where: { id: formateurId },
    });
    if (!formateur) throw new NotFoundException('Formateur introuvable.');

    if (user.role !== Role.ADMIN_CENTRE && formateur.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Accès non autorisé aux données de cet établissement.');
    }

    return this.prisma.habilitationFormateur.findMany({
      where: { formateurId },
      orderBy: { createdAt: 'desc' },
      include: {
        validePar: {
          select: { id: true, nom: true, prenom: true },
        },
      },
    });
  }

  /**
   * Met à jour le statut ou la durée d'une habilitation.
   */
  async updateHabilitation(habilitationId: string, dto: UpdateHabilitationDto, user: any) {
    const hab = await this.prisma.habilitationFormateur.findUnique({
      where: { id: habilitationId },
    });
    if (!hab) throw new NotFoundException('Habilitation introuvable.');

    if (user.role !== Role.ADMIN_CENTRE && hab.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Action non autorisée pour cet établissement.');
    }

    return this.prisma.habilitationFormateur.update({
      where: { id: habilitationId },
      data: {
        ...(dto.statut ? { statut: dto.statut } : {}),
        ...(dto.dateExpiration !== undefined ? { dateExpiration: dto.dateExpiration ? new Date(dto.dateExpiration) : null } : {}),
        ...(dto.piecesJointesUrl !== undefined ? { piecesJointesUrl: dto.piecesJointesUrl } : {}),
        ...(dto.niveauMax !== undefined ? { niveauMax: dto.niveauMax } : {}),
      },
    });
  }

  /**
   * Supprime une habilitation.
   */
  async supprimerHabilitation(habilitationId: string, user: any) {
    const hab = await this.prisma.habilitationFormateur.findUnique({
      where: { id: habilitationId },
    });
    if (!hab) throw new NotFoundException('Habilitation introuvable.');

    if (user.role !== Role.ADMIN_CENTRE && hab.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Action non autorisée pour cet établissement.');
    }

    return this.prisma.habilitationFormateur.delete({
      where: { id: habilitationId },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. AFFECTATIONS FORMATEUR-MODULE & CHARGES HORAIRES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Assigne formellement un formateur à un module avec spécification formelle
   * des charges horaires (CM, TD, TP) et contrôle d'habilitation par matière.
   */
  async affecterFormateur(moduleId: string, dto: AffecterFormateurDto, user: any) {
    const mod = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { formation: true },
    });
    if (!mod) throw new NotFoundException('Module introuvable.');

    if (user.role !== Role.ADMIN_CENTRE && mod.formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Action non autorisée pour cet établissement.');
    }

    // Vérifier que l'utilisateur cible est bien un FORMATEUR
    const formateur = await this.prisma.utilisateur.findUnique({
      where: { id: dto.formateurId },
    });
    if (!formateur || formateur.role !== Role.FORMATEUR) {
      throw new NotFoundException('Le compte sélectionné n\'existe pas ou ne possède pas le rôle FORMATEUR.');
    }

    if (user.role !== Role.ADMIN_CENTRE && formateur.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Le formateur appartient à un autre établissement.');
    }

    // Contrôle d'habilitation : s'il existe une habilitation suspendue ou expirée pour ce formateur
    const habInvalide = this.prisma.habilitationFormateur
      ? await this.prisma.habilitationFormateur.findFirst({
        where: {
          formateurId: dto.formateurId,
          discipline: { contains: mod.titre, mode: 'insensitive' },
          statut: { in: ['SUSPENDU', 'EXPIRE'] },
        },
      })
      : null;
    if (habInvalide) {
      throw new BadRequestException(
        `RG-AFF-01 : Le formateur a une habilitation suspendue ou expirée pour la discipline (${habInvalide.statut}).`,
      );
    }

    const existant = await this.prisma.affectationFormateur.findUnique({
      where: {
        moduleId_formateurId: {
          moduleId,
          formateurId: dto.formateurId,
        },
      },
    });

    if (existant) {
      throw new ConflictException('Ce formateur est déjà affecté à ce module.');
    }

    const volumeCm = dto.volumeCmHeures ?? 0;
    const volumeTd = dto.volumeTdHeures ?? 0;
    const volumeTp = dto.volumeTpHeures ?? 0;
    const totalAlloue = dto.heuresAllouees ?? (volumeCm + volumeTd + volumeTp || null);

    const affectation = await this.prisma.affectationFormateur.create({
      data: {
        moduleId,
        formateurId: dto.formateurId,
        estCoordonnateur: dto.estCoordonnateur ?? false,
        heuresAllouees: totalAlloue,
        volumeCmHeures: volumeCm,
        volumeTdHeures: volumeTd,
        volumeTpHeures: volumeTp,
        tauxHoraire: dto.tauxHoraire ?? null,
        devise: dto.devise ?? 'USD',
        dateDebut: dto.dateDebut ? new Date(dto.dateDebut) : null,
        dateFin: dto.dateFin ? new Date(dto.dateFin) : null,
      },
      include: {
        formateur: {
          select: { id: true, nom: true, prenom: true, email: true, photoUrl: true },
        },
        module: {
          select: { id: true, titre: true, formationId: true },
        },
      },
    });

    this.notifications.emit({
      type: 'FORMATION_UPDATE',
      recipientUserId: formateur.id,
      title: 'Nouvelle affectation d\'enseignement',
      message: `Vous avez été affecté(e) au module "${mod.titre}" (Charge: ${totalAlloue ?? 'N/A'}h).`,
      data: {
        moduleId,
        formationId: mod.formationId,
        action: 'AFFECTATION_FORMATEUR',
      },
    });

    if (this.eventEmitter) {
      this.eventEmitter.emit(
        'affectation.creee',
        new AffectationFormateurCreeeEvent(
          affectation.id,
          moduleId,
          dto.formateurId,
          volumeCm,
          volumeTd,
          volumeTp,
        ),
      );
    }

    return affectation;
  }

  /**
   * Met à jour les charges horaires ou le rôle d'un formateur affecté.
   */
  async updateAffectation(moduleId: string, formateurId: string, dto: UpdateAffectationFormateurDto, user: any) {
    const mod = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { formation: true },
    });
    if (!mod) throw new NotFoundException('Module introuvable.');

    if (user.role !== Role.ADMIN_CENTRE && mod.formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Action non autorisée pour cet établissement.');
    }

    const affectation = await this.prisma.affectationFormateur.findUnique({
      where: { moduleId_formateurId: { moduleId, formateurId } },
    });
    if (!affectation) throw new NotFoundException('Affectation introuvable.');

    return this.prisma.affectationFormateur.update({
      where: { moduleId_formateurId: { moduleId, formateurId } },
      data: {
        ...(dto.estCoordonnateur !== undefined ? { estCoordonnateur: dto.estCoordonnateur } : {}),
        ...(dto.heuresAllouees !== undefined ? { heuresAllouees: dto.heuresAllouees } : {}),
        ...(dto.volumeCmHeures !== undefined ? { volumeCmHeures: dto.volumeCmHeures } : {}),
        ...(dto.volumeTdHeures !== undefined ? { volumeTdHeures: dto.volumeTdHeures } : {}),
        ...(dto.volumeTpHeures !== undefined ? { volumeTpHeures: dto.volumeTpHeures } : {}),
        ...(dto.heuresEffectuees !== undefined ? { heuresEffectuees: dto.heuresEffectuees } : {}),
        ...(dto.tauxHoraire !== undefined ? { tauxHoraire: dto.tauxHoraire } : {}),
        ...(dto.devise !== undefined ? { devise: dto.devise } : {}),
        ...(dto.dateDebut !== undefined ? { dateDebut: dto.dateDebut ? new Date(dto.dateDebut) : null } : {}),
        ...(dto.dateFin !== undefined ? { dateFin: dto.dateFin ? new Date(dto.dateFin) : null } : {}),
      },
    });
  }

  /**
   * Récupère la liste des formateurs affectés à un module.
   */
  async getAffectationsModule(moduleId: string, user: any) {
    const mod = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { formation: true },
    });
    if (!mod) throw new NotFoundException('Module introuvable.');

    if (user.role !== Role.ADMIN_CENTRE && mod.formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit.');
    }

    return this.prisma.affectationFormateur.findMany({
      where: { moduleId },
      include: {
        formateur: {
          select: { id: true, nom: true, prenom: true, email: true, photoUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Retire l'affectation d'un formateur pour un module.
   */
  async supprimerAffectation(moduleId: string, formateurId: string, user: any) {
    const mod = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { formation: true },
    });
    if (!mod) throw new NotFoundException('Module introuvable.');

    if (user.role !== Role.ADMIN_CENTRE && mod.formation.etablissementId !== user.etablissementId) {
      throw new ForbiddenException('BR-02 : Action non autorisée pour cet établissement.');
    }

    const existant = await this.prisma.affectationFormateur.findUnique({
      where: {
        moduleId_formateurId: { moduleId, formateurId },
      },
    });
    if (!existant) {
      throw new NotFoundException('Affectation introuvable.');
    }

    return this.prisma.affectationFormateur.delete({
      where: {
        moduleId_formateurId: { moduleId, formateurId },
      },
    });
  }

  /**
   * Résolution rigoureuse des formateurs d'une formation :
   * 1. Priorité aux affectations formelles (table affectations_formateurs).
   * 2. Complété par les formateurs ayant dispensé des séances effectives (seances_formation).
   * 3. S'il n'y a aucune affectation ni séance, renvoie un tableau vide [] (aucune attribution fantôme).
   */
  async getFormateursFormation(formationId: string): Promise<Array<{ id: string; nom: string; prenom: string; email: string; photoUrl?: string | null; estCoordonnateur?: boolean }>> {
    const modules = await this.prisma.module.findMany({
      where: { formationId },
      include: {
        affectations: {
          include: {
            formateur: {
              select: { id: true, nom: true, prenom: true, email: true, photoUrl: true },
            },
          },
        },
        seances: {
          include: {
            formateur: {
              select: { id: true, nom: true, prenom: true, email: true, photoUrl: true },
            },
          },
        },
      },
    });

    const formateursMap = new Map<string, { id: string; nom: string; prenom: string; email: string; photoUrl?: string | null; estCoordonnateur?: boolean }>();

    // 1. Affectations officielles
    for (const mod of modules) {
      for (const aff of mod.affectations) {
        if (aff.formateur) {
          formateursMap.set(aff.formateur.id, {
            ...aff.formateur,
            estCoordonnateur: aff.estCoordonnateur,
          });
        }
      }
    }

    // 2. Séances dispensées
    for (const mod of modules) {
      for (const s of mod.seances) {
        if (s.formateur && !formateursMap.has(s.formateur.id)) {
          formateursMap.set(s.formateur.id, {
            ...s.formateur,
            estCoordonnateur: false,
          });
        }
      }
    }

    return Array.from(formateursMap.values());
  }
}
