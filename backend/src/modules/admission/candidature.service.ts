import {
  Injectable, ForbiddenException, NotFoundException, BadRequestException, ConflictException, OnModuleInit, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { IdentityService } from './identity.service';
import { Role } from '../../common/enums/role.enum';
import { CreateCandidatureDto, DecisionCandidatureDto } from './dto/admission.dto';
import {
  statut_candidature,
  statut_session_admission,
  statut_inscription,
  politique_candidature_concurrente,
  type_piece_candidature,
  Prisma,
} from '@prisma/client';

const TRANSITIONS: Record<statut_candidature, statut_candidature[]> = {
  BROUILLON: [statut_candidature.SOUMISE, statut_candidature.RETIREE],
  SOUMISE: [statut_candidature.EN_EVALUATION, statut_candidature.RETIREE],
  EN_EVALUATION: [
    statut_candidature.ADMISE,
    statut_candidature.LISTE_ATTENTE,
    statut_candidature.REJETEE,
    statut_candidature.RETIREE,
  ],
  ADMISE: [statut_candidature.CONFIRMEE, statut_candidature.EXPIREE, statut_candidature.RETIREE],
  LISTE_ATTENTE: [statut_candidature.ADMISE, statut_candidature.REJETEE, statut_candidature.RETIREE],
  CONFIRMEE: [statut_candidature.INSCRITE, statut_candidature.RETIREE],
  INSCRITE: [],
  REJETEE: [],
  RETIREE: [],
  EXPIREE: [],
};

const ACTIFS: statut_candidature[] = [
  statut_candidature.SOUMISE,
  statut_candidature.EN_EVALUATION,
  statut_candidature.ADMISE,
  statut_candidature.LISTE_ATTENTE,
  statut_candidature.CONFIRMEE,
];

@Injectable()
export class CandidatureService implements OnModuleInit {
  private readonly logger = new Logger(CandidatureService.name);

  constructor(
    private prisma: PrismaService,
    private identity: IdentityService,
    private storage: StorageService,
    private notifications: NotificationsService,
  ) {}

  onModuleInit() {
    setInterval(() => {
      this.processExpirations().catch((e) => this.logger.warn(e?.message));
      this.processInscriptions().catch((e) => this.logger.warn(e?.message));
    }, 60 * 60 * 1000);
  }

  private async requireProfile(user: any) {
    const profile = await this.identity.ensureProfileFromUser(user);
    return profile;
  }

  private assertTransition(from: statut_candidature, to: statut_candidature) {
    if (!TRANSITIONS[from]?.includes(to)) {
      throw new BadRequestException(`Transition ${from} → ${to} non autorisée.`);
    }
  }

  private async getReseauParams() {
    return this.prisma.parametresReseau.findFirst();
  }

  async listMine(user: any) {
    const profile = await this.requireProfile(user);
    const list = await this.prisma.candidature.findMany({
      where: { apprenantId: profile.id },
      include: {
        session: {
          include: {
            filiere: true,
            niveau: true,
            etablissement: { select: { id: true, nom: true, codeAntenne: true, pays: true } },
          },
        },
        pieces: true,
        historique: { orderBy: { timestamp: 'desc' }, take: 10 },
      },
      orderBy: { createdAt: 'desc' },
    });

    return list.map((c) => ({
      ...c,
      historique: c.historique?.map((h) => ({
        ...h,
        id: h.id ? h.id.toString() : undefined,
      })),
    }));
  }

  async findOne(id: string, user: any) {
    const c = await this.prisma.candidature.findUnique({
      where: { id },
      include: {
        session: {
          include: {
            filiere: true,
            niveau: true,
            etablissement: true,
            formation: { select: { id: true, titre: true } },
          },
        },
        pieces: true,
        historique: { orderBy: { timestamp: 'desc' }, take: 50 },
        apprenant: true,
      },
    });
    if (!c) throw new NotFoundException('Candidature introuvable.');
    await this.assertReadAccess(c, user);
    return {
      ...c,
      historique: c.historique?.map((h) => ({
        ...h,
        id: h.id ? h.id.toString() : undefined,
      })),
    };
  }

  private async assertReadAccess(c: { apprenant: { utilisateurId: string | null }; session: { etablissementId: string } }, user: any) {
    if (user.role === Role.ADMIN_CENTRE) return;
    if (user.role === Role.APPRENANT && c.apprenant.utilisateurId === user.id) return;
    if (
      (user.role === Role.ADMIN_ETABLISSEMENT || user.role === Role.PERSONNEL_ADMINISTRATIF) &&
      user.etablissementId === c.session.etablissementId
    ) {
      return;
    }
    throw new ForbiddenException('BR-02 : Accès interdit à cette candidature.');
  }

  async createDraft(dto: CreateCandidatureDto, user: any) {
    const profile = await this.requireProfile(user);
    const session = await this.prisma.sessionAdmission.findUnique({
      where: { id: dto.sessionId },
      include: { filiere: true, niveau: true, etablissement: true },
    });
    if (!session) throw new NotFoundException('Session introuvable.');
    if (session.statut !== statut_session_admission.OUVERTE) {
      throw new BadRequestException('Cette session n’accepte plus de candidatures.');
    }

    const duplicate = await this.prisma.candidature.findFirst({
      where: {
        apprenantId: profile.id,
        session: {
          etablissementId: session.etablissementId,
          filiereId: session.filiereId,
          niveauId: session.niveauId,
        },
        statut: { notIn: [statut_candidature.RETIREE, statut_candidature.REJETEE, statut_candidature.EXPIREE] },
      },
    });
    if (duplicate) {
      throw new ConflictException('BR-05 : Une candidature existe déjà pour cette filière, ce niveau et ce satellite.');
    }

    const params = await this.getReseauParams();
    const maxVoeux = params?.maxVoeuxParApprenant ?? 5;
    const voeuxActifs = await this.prisma.candidature.count({
      where: { apprenantId: profile.id, statut: { in: ACTIFS } },
    });
    if (voeuxActifs >= maxVoeux) {
      throw new ForbiddenException(`BR-06 : Plafond de ${maxVoeux} vœux atteint.`);
    }

    await this.assertEligibiliteNiveau(profile.id, session.niveauId, session.filiereId);
    const conflit = await this.assertConcurrentPolicy(profile.id);

    try {
      const created = await this.prisma.candidature.create({
        data: {
          apprenantId: profile.id,
          sessionId: session.id,
          statut: statut_candidature.BROUILLON,
          conflitCalendrier: conflit,
        },
        include: { session: { include: { filiere: true, niveau: true, etablissement: true } }, apprenant: true },
      });

      // Émission temps réel réseau (visible par l'Admin Central et l'Établissement)
      try {
        this.notifications.emit({
          type: 'ADMISSION_NEW_CANDIDATURE',
          recipientEtablissementId: session.etablissementId,
          candidatureId: created.id,
          apprenant: {
            id: profile.id,
            nom: profile.nom,
            prenom: profile.prenom,
            email: profile.email,
          },
          sessionId: session.id,
          sessionLibelle: session.libelle,
          etablissementId: session.etablissementId,
          statut: 'BROUILLON',
          message: `Nouveau vœu d'admission déposé par ${profile.prenom} ${profile.nom} sur la session "${session.libelle}".`,
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        this.logger.warn(`SSE emit failed: ${err?.message}`);
      }

      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('BR-05 : Candidature déjà enregistrée pour cette session.');
      }
      throw e;
    }
  }

  private async assertEligibiliteNiveau(apprenantId: string, niveauId: string, filiereId: string) {
    const prereqs = await this.prisma.prerequisNiveau.findMany({ where: { niveauCibleId: niveauId } });
    for (const p of prereqs) {
      const ok = await this.prisma.validationNiveau.findUnique({
        where: { apprenantId_niveauId_filiereId: { apprenantId, niveauId: p.niveauRequisId, filiereId } },
      });
      if (!ok) {
        throw new ForbiddenException('BR-08 : Le niveau précédent n’est pas validé pour cette filière.');
      }
    }
  }

  private async assertConcurrentPolicy(apprenantId: string): Promise<boolean> {
    const actives = await this.prisma.inscription.count({
      where: { apprenantId, statut: statut_inscription.ACTIVE },
    });
    if (actives === 0) return false;
    const params = await this.getReseauParams();
    const politique = params?.politiqueCandidatureConcurrente ?? politique_candidature_concurrente.MISE_EN_RESERVE;
    if (politique === politique_candidature_concurrente.BLOCAGE_STRICT) {
      throw new ForbiddenException('BR-09 : Candidature refusée tant qu’une session est en cours.');
    }
    return politique === politique_candidature_concurrente.AUTORISATION_ALERTE
      || politique === politique_candidature_concurrente.MISE_EN_RESERVE;
  }

  async submit(id: string, user: any) {
    const c = await this.findOne(id, user);
    if (user.role !== Role.APPRENANT) throw new ForbiddenException('Seule l’apprenant peut soumettre son dossier.');
    this.assertTransition(c.statut, statut_candidature.SOUMISE);

    // Vérification obligatoire : au moins une pièce justificative doit être téléversée
    if (!c.pieces || c.pieces.length === 0) {
      throw new BadRequestException(
        'Dossier incomplet : Vous devez joindre au moins une pièce justificative (pièce d’identité, diplôme, etc.) avant de pouvoir soumettre votre candidature.'
      );
    }

    const reglement = (c.session.etablissement.reglementLocal as { piecesObligatoires?: string[] } | null) ?? {};
    const required = reglement.piecesObligatoires ?? [];
    if (required.length) {
      const types = new Set(c.pieces.map((p) => p.type));
      const missing = required.filter((t) => !types.has(t as type_piece_candidature));
      if (missing.length) {
        throw new BadRequestException(`BR-11 : Pièces obligatoires manquantes pour cet établissement : ${missing.join(', ')}`);
      }
    }

    return this.applyTransition(c.id, c.statut, statut_candidature.SOUMISE, user.id, 'Soumission du dossier', {
      dateSoumission: new Date(),
    });
  }

  async confirm(id: string, user: any) {
    const c = await this.findOne(id, user);
    if (user.role !== Role.APPRENANT) throw new ForbiddenException();
    this.assertTransition(c.statut, statut_candidature.CONFIRMEE);
    if (c.dateExpiration && c.dateExpiration < new Date()) {
      throw new BadRequestException('Délai de confirmation dépassé.');
    }

    const result = await this.prisma.candidature.update({
      where: { id: c.id },
      data: { statut: statut_candidature.CONFIRMEE, dateConfirmation: new Date() },
    });

    try {
      await this.prisma.historiqueCandidature.create({
        data: {
          candidatureId: c.id,
          statutAvant: c.statut,
          statutApres: statut_candidature.CONFIRMEE,
          auteurId: user.id,
          commentaire: 'Confirmation de la place',
        },
      });
    } catch {}

    try {
      await this.prisma.candidature.updateMany({
        where: {
          apprenantId: c.apprenantId,
          id: { not: c.id },
          statut: { in: ACTIFS },
        },
        data: { statut: statut_candidature.RETIREE },
      });
    } catch {}

    try {
      this.notifications.emit({
        type: 'ADMISSION_CONFIRMED',
        recipientEtablissementId: c.session?.etablissementId,
        candidatureId: c.id,
        apprenantId: c.apprenantId,
        apprenant: {
          id: c.apprenant?.id,
          nom: c.apprenant?.nom,
          prenom: c.apprenant?.prenom,
          email: c.apprenant?.email,
        },
        sessionId: c.sessionId,
        sessionLibelle: c.session?.libelle,
        etablissementId: c.session?.etablissementId,
        statut: statut_candidature.CONFIRMEE,
        message: `Place confirmée par ${c.apprenant?.prenom || 'un candidat'} ${c.apprenant?.nom || ''} sur la session "${c.session?.libelle || ''}".`,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return result;
  }

  async withdraw(id: string, user: any) {
    const c = await this.findOne(id, user);
    this.assertTransition(c.statut, statut_candidature.RETIREE);
    return this.applyTransition(c.id, c.statut, statut_candidature.RETIREE, user.id, 'Retrait volontaire');
  }

  async ouvrirEvaluation(id: string, user: any) {
    const c = await this.findOne(id, user);
    this.assertStaff(user, c.session.etablissementId);
    this.assertTransition(c.statut, statut_candidature.EN_EVALUATION);
    return this.applyTransition(c.id, c.statut, statut_candidature.EN_EVALUATION, user.id, 'Ouverture du traitement');
  }

  async decide(id: string, dto: DecisionCandidatureDto, user: any) {
    const c = await this.findOne(id, user);
    this.assertStaff(user, c.session.etablissementId);
    const target =
      dto.decision === 'ADMIS'
        ? statut_candidature.ADMISE
        : dto.decision === 'LISTE_ATTENTE'
          ? statut_candidature.LISTE_ATTENTE
          : statut_candidature.REJETEE;
    this.assertTransition(c.statut, target);
    if (target === statut_candidature.REJETEE && !dto.motifRejet) {
      throw new BadRequestException('Motif de rejet obligatoire.');
    }

    const params = await this.getReseauParams();
    const delai = c.session.delaiConfirmationJours ?? params?.delaiConfirmationDefautJours ?? 7;
    const extra: Prisma.CandidatureUpdateInput = {
      dateDecision: new Date(),
      scoreEvaluation: dto.scoreEvaluation,
      motifRejet: dto.motifRejet,
      commentaireGestionnaire: dto.commentaireGestionnaire,
    };
    if (target === statut_candidature.ADMISE) {
      extra.dateExpiration = new Date(Date.now() + delai * 24 * 60 * 60 * 1000);
    }
    if (target === statut_candidature.LISTE_ATTENTE) {
      const last = await this.prisma.candidature.aggregate({
        where: { sessionId: c.sessionId, statut: statut_candidature.LISTE_ATTENTE },
        _max: { rangListeAttente: true },
      });
      extra.rangListeAttente = (last._max.rangListeAttente ?? 0) + 1;
    }
    const transitionMsg = dto.commentaireGestionnaire
      ? `Décision ${dto.decision} : ${dto.commentaireGestionnaire}`
      : dto.motifRejet
        ? `Décision ${dto.decision} - Motif : ${dto.motifRejet}`
        : `Décision ${dto.decision}`;
    return this.applyTransition(c.id, c.statut, target, user.id, transitionMsg, extra);
  }

  async promouvoir(id: string, user: any) {
    const c = await this.findOne(id, user);
    this.assertStaff(user, c.session.etablissementId);
    this.assertTransition(c.statut, statut_candidature.ADMISE);
    const params = await this.getReseauParams();
    const delai = c.session.delaiConfirmationJours ?? params?.delaiConfirmationDefautJours ?? 7;
    return this.applyTransition(c.id, c.statut, statut_candidature.ADMISE, user.id, 'Promotion liste d’attente', {
      dateExpiration: new Date(Date.now() + delai * 24 * 60 * 60 * 1000),
      dateDecision: new Date(),
    });
  }

  async listAll(user: any, query?: { sessionId?: string; etablissementId?: string; statut?: statut_candidature; search?: string }) {
    const where: Prisma.CandidatureWhereInput = {};

    if (user.role !== Role.ADMIN_CENTRE) {
      where.session = { etablissementId: user.etablissementId };
    } else if (query?.etablissementId) {
      where.session = { etablissementId: query.etablissementId };
    }

    if (query?.sessionId) {
      where.sessionId = query.sessionId;
    }

    if (query?.statut) {
      where.statut = query.statut;
    }

    if (query?.search) {
      const q = query.search.trim();
      where.OR = [
        { apprenant: { nom: { contains: q, mode: 'insensitive' } } },
        { apprenant: { prenom: { contains: q, mode: 'insensitive' } } },
        { apprenant: { email: { contains: q, mode: 'insensitive' } } },
        { apprenant: { matricule: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const candidatures = await this.prisma.candidature.findMany({
      where,
      include: {
        apprenant: true,
        session: {
          include: {
            filiere: true,
            niveau: true,
            etablissement: { select: { id: true, nom: true, codeAntenne: true, pays: true } },
          },
        },
        pieces: true,
        historique: { orderBy: { timestamp: 'desc' }, take: 10 },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return candidatures.map((c) => ({
      ...c,
      historique: c.historique?.map((h) => ({
        ...h,
        id: h.id ? h.id.toString() : undefined,
      })),
    }));
  }

  async listBySession(sessionId: string, user: any) {
    const session = await this.prisma.sessionAdmission.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session introuvable.');
    this.assertStaff(user, session.etablissementId);
    const candidatures = await this.prisma.candidature.findMany({
      where: { sessionId },
      include: {
        apprenant: true,
        session: {
          include: {
            filiere: true,
            niveau: true,
            etablissement: { select: { id: true, nom: true, codeAntenne: true, pays: true } },
          },
        },
        pieces: true,
        historique: { orderBy: { timestamp: 'desc' }, take: 10 },
      },
      orderBy: [{ statut: 'asc' }, { dateSoumission: 'asc' }],
    });

    return candidatures.map((c) => ({
      ...c,
      historique: c.historique?.map((h) => ({
        ...h,
        id: h.id ? h.id.toString() : undefined,
      })),
    }));
  }

  async uploadPiece(id: string, type: type_piece_candidature, file: Express.Multer.File, user: any) {
    const c = await this.findOne(id, user);
    if (user.role !== Role.APPRENANT) throw new ForbiddenException();
    if (c.statut !== statut_candidature.BROUILLON) {
      throw new BadRequestException('Pièces modifiables uniquement en brouillon.');
    }
    if (!file) throw new BadRequestException('Fichier requis.');
    const url = await this.storage.uploadFile(file.buffer, file.originalname, file.mimetype, 'candidatures');
    return this.prisma.pieceCandidature.create({
      data: { candidatureId: c.id, type, fileUrl: url, nomFichier: file.originalname },
    });
  }

  async deletePiece(candidatureId: string, pieceId: string, user: any) {
    const c = await this.findOne(candidatureId, user);
    if (user.role !== Role.APPRENANT) throw new ForbiddenException();
    if (c.statut !== statut_candidature.BROUILLON) {
      throw new BadRequestException('Les pièces ne peuvent être supprimées qu’en statut brouillon.');
    }
    const piece = await this.prisma.pieceCandidature.findFirst({
      where: { id: pieceId, candidatureId },
    });
    if (!piece) throw new NotFoundException('Pièce introuvable.');
    await this.prisma.pieceCandidature.delete({ where: { id: pieceId } });
    return { success: true, message: 'Pièce supprimée avec succès.' };
  }

  async processExpirations() {
    const expired = await this.prisma.candidature.findMany({
      where: { statut: statut_candidature.ADMISE, dateExpiration: { lt: new Date() } },
    });
    for (const c of expired) {
      await this.applyTransition(c.id, c.statut, statut_candidature.EXPIREE, null, 'Expiration automatique');
      const next = await this.prisma.candidature.findFirst({
        where: { sessionId: c.sessionId, statut: statut_candidature.LISTE_ATTENTE },
        orderBy: { rangListeAttente: 'asc' },
      });
      if (next) {
        const params = await this.getReseauParams();
        const delai = params?.delaiConfirmationDefautJours ?? 7;
        await this.applyTransition(next.id, next.statut, statut_candidature.ADMISE, null, 'Promotion auto liste d’attente', {
          dateExpiration: new Date(Date.now() + delai * 24 * 60 * 60 * 1000),
          dateDecision: new Date(),
        });
      }
    }
    return { expired: expired.length };
  }

  async processInscriptions() {
    const now = new Date();
    const toInscribe = await this.prisma.candidature.findMany({
      where: { statut: statut_candidature.CONFIRMEE, session: { dateDebutFormation: { lte: now } } },
      include: { session: true },
    });
    for (const c of toInscribe) {
      if (!c.session.formationId) continue;
      const params = await this.getReseauParams();
      const hasActive = await this.prisma.inscription.count({
        where: { apprenantId: c.apprenantId, statut: statut_inscription.ACTIVE },
      });
      const statutInsc =
        hasActive && params?.politiqueCandidatureConcurrente === politique_candidature_concurrente.MISE_EN_RESERVE
          ? statut_inscription.RESERVEE
          : statut_inscription.ACTIVE;

      await this.prisma.candidature.update({
        where: { id: c.id },
        data: { statut: statut_candidature.INSCRITE },
      });
      try {
        await this.prisma.historiqueCandidature.create({
          data: {
            candidatureId: c.id,
            statutAvant: statut_candidature.CONFIRMEE,
            statutApres: statut_candidature.INSCRITE,
            commentaire: 'Inscription automatique au démarrage de session',
          },
        });
      } catch {}
      await this.prisma.inscription.upsert({
        where: { apprenantId_formationId: { apprenantId: c.apprenantId, formationId: c.session.formationId! } },
        update: { statut: statutInsc, candidatureId: c.id, sessionId: c.sessionId },
        create: {
          apprenantId: c.apprenantId,
          formationId: c.session.formationId!,
          candidatureId: c.id,
          sessionId: c.sessionId,
          statut: statutInsc,
        },
      });

      try {
        this.notifications.emit({
          type: 'ADMISSION_INSCRIBED',
          recipientEtablissementId: c.session?.etablissementId,
          candidatureId: c.id,
          apprenantId: c.apprenantId,
          sessionId: c.sessionId,
          etablissementId: c.session?.etablissementId,
          statut: statut_candidature.INSCRITE,
        });
      } catch {}
    }
    return { inscribed: toInscribe.length };
  }

  private assertStaff(user: any, etablissementId: string) {
    if (user.role === Role.ADMIN_CENTRE) return;
    if (
      (user.role === Role.ADMIN_ETABLISSEMENT || user.role === Role.PERSONNEL_ADMINISTRATIF) &&
      user.etablissementId === etablissementId
    ) {
      return;
    }
    throw new ForbiddenException('BR-02 : Accès interdit.');
  }

  private async applyTransition(
    id: string,
    from: statut_candidature,
    to: statut_candidature,
    auteurId: string | null,
    commentaire: string,
    extra: Prisma.CandidatureUpdateInput = {},
  ) {
    const updated = await this.prisma.candidature.update({
      where: { id },
      data: { statut: to, ...extra },
      include: {
        apprenant: { select: { id: true, nom: true, prenom: true, email: true } },
        session: { select: { id: true, libelle: true, etablissementId: true } },
      },
    });

    try {
      await this.prisma.historiqueCandidature.create({
        data: { candidatureId: id, statutAvant: from, statutApres: to, auteurId, commentaire },
      });
    } catch (e: any) {
      this.logger.warn(`Historique non persisté : ${e?.message}`);
    }

    try {
      this.notifications.emit({
        type: 'ADMISSION_STATUS_CHANGE',
        recipientEtablissementId: updated.session?.etablissementId,
        recipientUserId: updated.apprenantId,
        candidatureId: id,
        statutAvant: from,
        statutApres: to,
        apprenantId: updated.apprenantId,
        apprenant: updated.apprenant,
        sessionId: updated.sessionId,
        sessionLibelle: updated.session?.libelle,
        etablissementId: updated.session?.etablissementId,
        message: `${commentaire} (${from} → ${to}) pour ${updated.apprenant?.prenom || ''} ${updated.apprenant?.nom || ''} sur la session "${updated.session?.libelle || ''}".`,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return updated;
  }
}
