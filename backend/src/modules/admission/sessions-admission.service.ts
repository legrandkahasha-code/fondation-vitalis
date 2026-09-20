import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Role } from '../../common/enums/role.enum';
import {
  CreateSessionAdmissionDto,
  UpdateSessionStatutDto,
  UpdatePartageSessionDto,
  UpdateSessionAdmissionDto,
} from './dto/admission.dto';
import { statut_session_admission } from '@prisma/client';

/** Sélection enrichie commune à toutes les requêtes */
const SESSION_INCLUDE = {
  filiere: true,
  niveau: true,
  formation: { select: { id: true, titre: true } },
  etablissement: { select: { id: true, nom: true, codeAntenne: true, pays: true, typeEtablissement: true } },
  _count: { select: { candidatures: true } },
} as const;

@Injectable()
export class SessionsAdmissionService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Vérifie que l'utilisateur peut gérer la session */
  private canManage(user: any, etablissementId: string) {
    if (user.role === Role.ADMIN_CENTRE) return;
    if (user.etablissementId === etablissementId) return;
    throw new ForbiddenException('BR-02 : Accès interdit à cette session.');
  }

  /** Vérifie qu'une session est accessible à un utilisateur (propriétaire OU partagée avec son établissement) */
  private isAccessible(session: { etablissementId: string; etablissementsPartages: string[] }, user: any): boolean {
    if (user.role === Role.ADMIN_CENTRE) return true;
    if (session.etablissementId === user.etablissementId) return true;
    if (session.etablissementsPartages?.includes(user.etablissementId)) return true;
    return false;
  }

  // ─── PUBLIC : sessions ouvertes filtrées par établissement de l'apprenant ──────

  /**
   * Retourne les sessions publiques OUVERTE.
   * Si `etablissementId` est fourni (apprenant connecté), on filtre :
   *   – les sessions de cet établissement
   *   – les sessions partagées avec cet établissement
   * Sinon on retourne toutes les sessions ouvertes.
   */
  async listPublic(etablissementId?: string) {
    const now = new Date();
    const all = await this.prisma.sessionAdmission.findMany({
      where: {
        statut: statut_session_admission.OUVERTE,
        dateOuverture: { lte: now },
        dateFermeture: { gte: now },
        etablissement: { statut: 'ACTIF' },
      },
      include: {
        filiere: true,
        niveau: true,
        etablissement: { select: { id: true, nom: true, codeAntenne: true, pays: true, typeEtablissement: true } },
        _count: { select: { candidatures: true } },
      },
      orderBy: { dateFermeture: 'asc' },
    });

    // Si un établissement est précisé, filtrer
    if (etablissementId) {
      return all.filter(
        (s) =>
          s.etablissementId === etablissementId ||
          s.etablissementsPartages.includes(etablissementId),
      );
    }
    return all;
  }

  // ─── ADMINISTRATION : liste selon rôle ──────────────────────────────────────

  async list(user: any) {
    let sessions = await this.prisma.sessionAdmission.findMany({
      include: SESSION_INCLUDE,
      orderBy: { dateOuverture: 'desc' },
    });

    if (user.role !== Role.ADMIN_CENTRE) {
      // Admin Étab voit ses sessions + celles partagées avec lui
      sessions = sessions.filter((s) =>
        s.etablissementId === user.etablissementId ||
        s.etablissementsPartages.includes(user.etablissementId),
      );
    }
    return sessions;
  }

  async findOne(id: string, user?: any) {
    const session = await this.prisma.sessionAdmission.findUnique({
      where: { id },
      include: {
        ...SESSION_INCLUDE,
        etablissement: { select: { id: true, nom: true, codeAntenne: true, pays: true, reglementLocal: true, typeEtablissement: true } },
      },
    });
    if (!session) throw new NotFoundException('Session d\'admission introuvable.');
    if (user && user.role !== Role.APPRENANT) this.canManage(user, session.etablissementId);
    return session;
  }

  // ─── CRÉATION ────────────────────────────────────────────────────────────────

  async create(dto: CreateSessionAdmissionDto, user: any) {
    if (
      user.role !== Role.ADMIN_CENTRE &&
      user.role !== Role.ADMIN_ETABLISSEMENT &&
      user.role !== Role.PERSONNEL_ADMINISTRATIF
    ) {
      throw new ForbiddenException('Création de session non autorisée.');
    }

    let etablissementId = dto.etablissementId || user.etablissementId;
    if (!etablissementId && user.role === Role.ADMIN_CENTRE) {
      const defaultEtab = await this.prisma.etablissement.findFirst({
        where: { statut: 'ACTIF' },
        orderBy: { typeEtablissement: 'asc' },
      });
      etablissementId = defaultEtab?.id;
    }

    if (!etablissementId) {
      throw new BadRequestException('Veuillez sélectionner un établissement pour cette session.');
    }

    const etab = await this.prisma.etablissement.findUnique({ where: { id: etablissementId } });
    if (!etab) throw new NotFoundException('Établissement introuvable.');
    const autonomie = (etab.parametresAutonomie as { peutCreerSessions?: boolean } | null) ?? {};
    if (user.role !== Role.ADMIN_CENTRE && autonomie.peutCreerSessions === false) {
      throw new ForbiddenException('Ce satellite n\'est pas habilité à créer des sessions.');
    }

    if (new Date(dto.dateFermeture) <= new Date(dto.dateOuverture)) {
      throw new BadRequestException('La date de fermeture doit être postérieure à l\'ouverture.');
    }

    // Valider les établissements partagés (s'ils sont fournis)
    const partages = (dto.etablissementsPartages || []).filter((id) => id && id !== etablissementId);

    return this.prisma.sessionAdmission.create({
      data: {
        etablissementId,
        filiereId: dto.filiereId,
        niveauId: dto.niveauId,
        formationId: dto.formationId,
        libelle: dto.libelle,
        description: dto.description,
        piecesRequises: dto.piecesRequises ?? [],
        modeSelection: dto.modeSelection,
        capacite: dto.capacite ?? 30,
        dateOuverture: new Date(dto.dateOuverture),
        dateFermeture: new Date(dto.dateFermeture),
        dateDebutFormation: new Date(dto.dateDebutFormation),
        delaiConfirmationJours: dto.delaiConfirmationJours,
        etablissementsPartages: partages,
      },
      include: SESSION_INCLUDE,
    });
  }

  // ─── MISE À JOUR DU STATUT ────────────────────────────────────────────────────

  async updateStatut(id: string, dto: UpdateSessionStatutDto, user: any) {
    const session = await this.findOne(id, user);

    const updated = await this.prisma.sessionAdmission.update({
      where: { id: session.id },
      data: { statut: dto.statut },
      include: SESSION_INCLUDE,
    });

    // Notification SSE quand la session passe à OUVERTE
    if (dto.statut === statut_session_admission.OUVERTE) {
      const etabsCibles = [session.etablissementId, ...session.etablissementsPartages];
      for (const etabId of etabsCibles) {
        try {
          this.notifications.emit({
            type: 'SESSION_OUVERTE',
            recipientEtablissementId: etabId,
            sessionId: id,
            sessionLibelle: session.libelle,
            etablissementId: session.etablissementId,
            message: `📢 Nouvelle session d'admission ouverte : "${session.libelle}". Consultez dès maintenant les conditions d'admission.`,
            timestamp: new Date().toISOString(),
          });
        } catch (_) {/* silent */}
      }
    }

    return updated;
  }

  // ─── MISE À JOUR GÉNÉRALE (description, pièces, partage) ─────────────────────

  async update(id: string, dto: UpdateSessionAdmissionDto, user: any) {
    const session = await this.findOne(id, user);
    // Seul l'Admin Central ou le propriétaire peut modifier
    this.canManage(user, session.etablissementId);

    const partages = dto.etablissementsPartages
      ? dto.etablissementsPartages.filter((eid) => eid && eid !== session.etablissementId)
      : undefined;

    return this.prisma.sessionAdmission.update({
      where: { id },
      data: {
        ...(dto.libelle !== undefined && { libelle: dto.libelle }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.piecesRequises !== undefined && { piecesRequises: dto.piecesRequises }),
        ...(dto.capacite !== undefined && { capacite: dto.capacite }),
        ...(partages !== undefined && { etablissementsPartages: partages }),
      },
      include: SESSION_INCLUDE,
    });
  }

  // ─── PARTAGE AVEC ÉTABLISSEMENTS ─────────────────────────────────────────────

  async partager(id: string, dto: UpdatePartageSessionDto, user: any) {
    if (user.role !== Role.ADMIN_CENTRE) {
      throw new ForbiddenException('Seul l\'Admin Central peut partager une session avec d\'autres établissements.');
    }
    const session = await this.findOne(id, user);

    // Valider que les établissements existent
    const etabIds = (dto.etablissementIds || []).filter((eid) => eid && eid !== session.etablissementId);
    if (etabIds.length > 0) {
      const count = await this.prisma.etablissement.count({ where: { id: { in: etabIds } } });
      if (count !== etabIds.length) {
        throw new BadRequestException('Certains établissements sélectionnés sont introuvables.');
      }
    }

    const updated = await this.prisma.sessionAdmission.update({
      where: { id },
      data: { etablissementsPartages: etabIds },
      include: SESSION_INCLUDE,
    });

    // Notifier les établissements nouvellement ajoutés si session OUVERTE
    if (session.statut === statut_session_admission.OUVERTE) {
      const anciens = session.etablissementsPartages || [];
      const nouveaux = etabIds.filter((eid) => !anciens.includes(eid));
      for (const etabId of nouveaux) {
        try {
          this.notifications.emit({
            type: 'SESSION_PARTAGEE',
            recipientEtablissementId: etabId,
            sessionId: id,
            sessionLibelle: session.libelle,
            message: `📢 Une session d'admission vous a été partagée : "${session.libelle}". Vos apprenants peuvent maintenant postuler.`,
            timestamp: new Date().toISOString(),
          });
        } catch (_) {/* silent */}
      }
    }

    return updated;
  }

  // ─── STATISTIQUES ─────────────────────────────────────────────────────────────

  async stats(id: string, user: any) {
    const session = await this.findOne(id, user);
    const grouped = await this.prisma.candidature.groupBy({
      by: ['statut'],
      where: { sessionId: id },
      _count: true,
    });
    const placesPrises = await this.prisma.candidature.count({
      where: { sessionId: id, statut: { in: ['ADMISE', 'CONFIRMEE', 'INSCRITE'] } },
    });
    return {
      sessionId: id,
      capacite: session.capacite,
      placesPrises,
      placesRestantes: Math.max(0, session.capacite - placesPrises),
      parStatut: Object.fromEntries(grouped.map((g) => [g.statut, g._count])),
    };
  }
}
