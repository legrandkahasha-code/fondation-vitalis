import { Injectable, UnauthorizedException, ConflictException, ForbiddenException, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto, ChangePasswordDto, UpdateProfileDto, AdminUpdateUserDto, CreerDemandeRegularisationDto, DecisionRegularisationDto } from './dto/utilisateurs.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { IdentityService } from '../admission/identity.service';
import { Role } from '../../common/enums/role.enum';
import { addDays } from 'date-fns';
import { AnalyticsService } from '../analytics/analytics.service';
import { StorageService } from '../../common/services/storage.service';

@Injectable()
export class UtilisateursService {
  private readonly logger = new Logger(UtilisateursService.name);
  private static failedAttempts = new Map<string, { count: number; lockedUntil?: Date }>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
    private identity: IdentityService,
    private storage: StorageService,
  ) {}

  async register(dto: RegisterDto, ipAdresse: string = '0.0.0.0', auteurId?: string) {
    // BR-01 : Vérifier que l'établissement existe et est actif
    const etablissement = await this.prisma.etablissement.findUnique({
      where: { id: dto.etablissementId },
    });

    if (!etablissement) {
      throw new ForbiddenException(
        'BR-01 : L\'établissement de rattachement est introuvable.',
      );
    }

    // Vérifier unicité email
    const existingUser = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà.');
    }

    // Hacher le mot de passe (bcrypt, 12 rounds)
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.utilisateur.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        password: hashedPassword,
        nom: dto.nom.trim(),
        prenom: dto.prenom.trim(),
        role: dto.role || Role.APPRENANT,
        etablissementId: dto.etablissementId,
      },
    });

    UtilisateursService.clearFindAllCache();

    // Journaliser dans AuditLog
    try {
      await this.prisma.auditLog.create({
        data: {
          auteurId: auteurId || user.id,
          action: 'ENROLEMENT_APPRENANT',
          tableCible: 'utilisateurs',
          details: { message: `Enrôlement officiel de ${user.prenom} ${user.nom}`, role: user.role, etablissementId: user.etablissementId },
          ipAdresse,
        },
      });
    } catch (e: any) {
      this.logger.warn(`Could not persist register audit log: ${e?.message || e}`);
    }

    try {
      await this.identity.ensureProfileFromUser({
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        etablissementId: user.etablissementId,
      });
    } catch (e: any) {
      this.logger.warn(`Profil apprenant non créé à l'inscription : ${e?.message || e}`);
    }

    // Emit notification (real-time) to subscribers
    try {
      this.notificationsService.emit({ type: 'auth', event: 'register', user: { id: user.id, nom: user.nom, prenom: user.prenom }, message: 'Inscription réussie.' });
      this.notificationsService.emit({
        type: 'UTILISATEUR_ENROLE',
        title: 'Nouvel utilisateur enrôlé',
        message: `${user.prenom} ${user.nom} (${user.role}) a été enrôlé sur le réseau.`,
        data: { userId: user.id, role: user.role, nom: user.nom, prenom: user.prenom, etablissementId: user.etablissementId },
      });
    } catch {
      // Non-fatal — continue
    }

    const { password, ...result } = user;
    return {
      success: true,
      message: 'Inscription réussie.',
      utilisateur: result,
    };
  }

  async login(dto: LoginDto, ipAdresse: string = '0.0.0.0') {
    const emailNorm = dto.email.toLowerCase().trim();
    const attempts = UtilisateursService.failedAttempts.get(emailNorm);
    const now = new Date();

    // Vérification du verrouillage temporaire (Règle ANSSI)
    if (attempts?.lockedUntil && attempts.lockedUntil > now) {
      const minutesRemaining = Math.ceil((attempts.lockedUntil.getTime() - now.getTime()) / 60000);
      throw new ForbiddenException(
        `Compte temporairement verrouillé pour des raisons de sécurité suite à 5 tentatives infructueuses. Veuillez réessayer dans ${minutesRemaining} minute(s). (Norme ANSSI)`,
      );
    }

    const user = await this.prisma.utilisateur.findUnique({
      where: { email: emailNorm },
      include: { etablissement: true },
    });

    const isPasswordValid = user ? await bcrypt.compare(dto.password, user.password) : false;

    if (!user || !isPasswordValid) {
      const curCount = (attempts?.count || 0) + 1;
      let lockedUntil: Date | undefined;
      if (curCount >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Verrouillage 15 minutes
      }
      UtilisateursService.failedAttempts.set(emailNorm, { count: curCount, lockedUntil });

      // Journalisation de sécurité dans AuditLog
      try {
        await this.prisma.auditLog.create({
          data: {
            auteurId: user?.id ?? undefined,
            action: curCount >= 5 ? 'COMPTE_VERROUILLE' : 'ECHEC_CONNEXION',
            tableCible: 'utilisateurs',
            details: { email: emailNorm, tentative: curCount, verrouille: !!lockedUntil },
            ipAdresse,
          },
        });
      } catch (e: any) {
        this.logger.warn(`Could not persist failure audit log: ${e?.message || e}`);
      }

      if (curCount >= 5) {
        throw new ForbiddenException(
          'Compte temporairement verrouillé suite à 5 tentatives infructueuses. Veuillez réessayer dans 15 minutes. (Norme ANSSI)',
        );
      }

      throw new UnauthorizedException('Identifiants incorrects.');
    }

    // Réinitialisation du compteur après succès
    UtilisateursService.failedAttempts.delete(emailNorm);

    // Vérifier si le compte utilisateur est actif
    if (!user.actif) {
      throw new ForbiddenException(
        'Votre compte utilisateur a été désactivé par un administrateur.',
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      etablissementId: user.etablissementId,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Persist refresh token for revocation capability
    const expiresAt = addDays(new Date(), 7);
    try {
      await (this.prisma as any).refreshToken.create({
        data: {
          token: refreshToken,
          utilisateurId: user.id,
          expiresAt,
        },
      });
    } catch (e: any) {
      this.logger.warn(`Could not persist refresh token: ${e?.message || e}`);
    }

    // Journaliser la connexion
    try {
      await this.prisma.auditLog.create({
        data: {
          auteurId: user.id,
          action: 'CONNEXION',
          tableCible: 'utilisateurs',
          details: { message: `Connexion de ${user.prenom} ${user.nom}` },
          ipAdresse,
        },
      });
    } catch (e: any) {
      this.logger.warn(`Could not persist audit log: ${e?.message || e}`);
    }

    // Emit notification (real-time) to subscribers
    try {
      this.notificationsService.emit({ type: 'auth', event: 'login', user: { id: user.id, nom: user.nom, prenom: user.prenom }, message: 'Connexion réussie.' });
    } catch {
      // Non-fatal
    }

    const { password, ...result } = user;
    return {
      success: true,
      accessToken,
      refreshToken,
      utilisateur: result,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      // Verify refresh token exists and is not revoked
      const stored = await (this.prisma as any).refreshToken.findUnique({ where: { token: refreshToken } });
      if (!stored || stored.revoked) throw new UnauthorizedException('Refresh token invalide ou révoqué.');

      const user = await this.validateUser(payload.sub);
      const newPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        etablissementId: user.etablissementId,
      };
      // Optionally rotate refresh token: revoke old and create new one
      await (this.prisma as any).refreshToken.update({ where: { token: refreshToken }, data: { revoked: true } });
      const newRefresh = this.jwtService.sign(newPayload, { expiresIn: '7d' });
      const newExpiresAt = addDays(new Date(), 7);
      await (this.prisma as any).refreshToken.create({ data: { token: newRefresh, utilisateurId: user.id, expiresAt: newExpiresAt } });
      return {
        success: true,
        accessToken: this.jwtService.sign(newPayload, { expiresIn: '15m' }),
        refreshToken: newRefresh,
      };
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré.');
    }
  }

  async revokeRefreshToken(refreshToken: string) {
    const stored = await (this.prisma as any).refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored) return { success: true };
    await (this.prisma as any).refreshToken.update({ where: { token: refreshToken }, data: { revoked: true } });
    return { success: true };
  }

  private static readonly userCache = new Map<string, { user: any; expiry: number }>();
  private static readonly USER_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  public invalidateUserValidateCache(userId?: string) {
    if (userId) {
      UtilisateursService.userCache.delete(userId);
    } else {
      UtilisateursService.userCache.clear();
    }
  }

  async validateUser(userId: string) {
    const cached = UtilisateursService.userCache.get(userId);
    if (cached && cached.expiry > Date.now()) {
      return cached.user;
    }

    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      include: { etablissement: true },
    });
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable.');
    }
    if (!user.actif) {
      throw new UnauthorizedException('Compte utilisateur désactivé.');
    }
    const { password, ...result } = user;
    UtilisateursService.userCache.set(userId, {
      user: result,
      expiry: Date.now() + UtilisateursService.USER_CACHE_TTL,
    });
    return result;
  }

  private static findAllCache: { data: any; expiry: number } | null = null;
  private static readonly FIND_ALL_CACHE_TTL_MS = 120_000; // 2 minutes

  static clearFindAllCache() {
    UtilisateursService.findAllCache = null;
    AnalyticsService.clearCache();
  }

  async findAll() {
    const now = Date.now();
    if (UtilisateursService.findAllCache && now < UtilisateursService.findAllCache.expiry) {
      return UtilisateursService.findAllCache.data;
    }
    const users = await this.prisma.utilisateur.findMany({
      select: {
        id: true, email: true, nom: true, prenom: true, role: true,
        etablissementId: true, actif: true, createdAt: true,
        etablissement: { select: { nom: true } },
      },
      orderBy: [{ etablissementId: 'asc' }, { nom: 'asc' }],
    });
    UtilisateursService.findAllCache = { data: users, expiry: now + UtilisateursService.FIND_ALL_CACHE_TTL_MS };
    return users;
  }

  async findByEtablissement(etablissementId: string) {
    return this.prisma.utilisateur.findMany({
      where: { etablissementId },
      select: {
        id: true, email: true, nom: true, prenom: true, role: true, actif: true, createdAt: true,
        etablissement: { select: { nom: true } },
      },
      orderBy: { nom: 'asc' },
    });
  }

  async setActif(userId: string, actif: boolean, auteurId: string, ipAdresse: string) {
    // Vérifier si l'utilisateur existe
    const targetUser = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
    });
    if (!targetUser) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    // Mettre à jour le statut actif
    await this.prisma.utilisateur.update({
      where: { id: userId },
      data: { actif },
    });

    this.invalidateUserValidateCache(userId);
    UtilisateursService.clearFindAllCache();

    // Journaliser dans AuditLog
    await this.prisma.auditLog.create({
      data: {
        auteurId,
        action: actif ? 'ACTIVATION_UTILISATEUR' : 'DESACTIVATION_UTILISATEUR',
        details: { userId, action: actif ? 'activation' : 'désactivation' },
        ipAdresse,
      },
    });

    // Émettre notification temps réel
    try {
      this.notificationsService.emit({
        type: 'UTILISATEUR_UPDATE',
        title: 'Statut utilisateur mis à jour',
        message: `L'utilisateur a été ${actif ? 'activé' : 'suspendu'}.`,
        data: { userId, actif },
      });
    } catch {}

    return { success: true, message: `Utilisateur ${actif ? 'activé' : 'désactivé'}.` };
  }

  /**
   * Changement sécurisé de mot de passe par l'utilisateur connecté
   */
  async changePassword(userId: string, dto: ChangePasswordDto, ipAdresse: string) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    // Vérifier l'ancien mot de passe
    const passwordValid = await bcrypt.compare(dto.ancienMotDePasse, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('L\'ancien mot de passe est incorrect.');
    }

    // Hacher le nouveau mot de passe (12 rounds)
    const newHashedPassword = await bcrypt.hash(dto.nouveauMotDePasse, 12);

    await this.prisma.utilisateur.update({
      where: { id: userId },
      data: { password: newHashedPassword },
    });

    this.invalidateUserValidateCache(userId);

    // Journaliser dans AuditLog
    try {
      await this.prisma.auditLog.create({
        data: {
          auteurId: userId,
          action: 'CHANGEMENT_MOT_DE_PASSE',
          details: { userId, message: 'Mot de passe modifié avec succès' },
          ipAdresse,
        },
      });
    } catch {}

    return { success: true, message: 'Mot de passe mis à jour avec succès.' };
  }

  /**
   * Mise à jour des informations de profil
   */
  async updateProfile(userId: string, dto: UpdateProfileDto, ipAdresse: string) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    const updated = await this.prisma.utilisateur.update({
      where: { id: userId },
      data: {
        nom: dto.nom.trim(),
        prenom: dto.prenom.trim(),
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        actif: true,
        etablissementId: true,
        etablissement: {
          select: { id: true, nom: true, codeAntenne: true },
        },
      },
    });

    this.invalidateUserValidateCache(userId);

    try {
      await this.prisma.auditLog.create({
        data: {
          auteurId: userId,
          action: 'MODIFICATION_PROFIL',
          details: { userId, nom: dto.nom, prenom: dto.prenom },
          ipAdresse,
        },
      });
    } catch {}

    return { success: true, message: 'Profil mis à jour.', utilisateur: updated };
  }

  /**
   * Modification d'un utilisateur par l'Administration Centrale
   */
  async adminUpdateUser(id: string, dto: AdminUpdateUserDto, auteurId: string, ipAdresse: string) {
    UtilisateursService.clearFindAllCache();
    const user = await this.prisma.utilisateur.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    if (dto.etablissementId) {
      const etablissement = await this.prisma.etablissement.findUnique({
        where: { id: dto.etablissementId },
      });
      if (!etablissement) {
        throw new NotFoundException('Établissement introuvable.');
      }
    }

    const updated = await this.prisma.utilisateur.update({
      where: { id },
      data: {
        nom: dto.nom !== undefined ? dto.nom.trim() : undefined,
        prenom: dto.prenom !== undefined ? dto.prenom.trim() : undefined,
        role: dto.role ?? undefined,
        etablissementId: dto.etablissementId ?? undefined,
      },
      include: {
        etablissement: {
          select: { id: true, nom: true, codeAntenne: true },
        },
      },
    });

    this.invalidateUserValidateCache(id);

    try {
      await this.prisma.auditLog.create({
        data: {
          auteurId,
          action: 'MODIFICATION_UTILISATEUR_ADMIN',
          details: { cibleId: id, modifications: { ...dto } } as any,
          ipAdresse,
        },
      });
    } catch {}

    UtilisateursService.clearFindAllCache();

    // Émettre notification temps réel
    try {
      this.notificationsService.emit({
        type: 'UTILISATEUR_UPDATE',
        title: 'Habilitations modifiées',
        message: `Les habilitations de ${updated.prenom} ${updated.nom} ont été mises à jour.`,
        data: { userId: id, role: updated.role, etablissementId: updated.etablissementId },
      });
    } catch {}

    return updated;
  }

  /**
   * Récupère le dossier complet d'un utilisateur selon son profil :
   * - Apprenant : profil, matricule, candidatures, pièces justificatives, inscriptions, certificats
   * - Personnel Technique / Formateur : modules dispensés, séances, notes
   * - Personnel Administratif : établissement rattaché, habilitations, logs d'audit
   */
  async getDossierUtilisateur(id: string) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id },
      include: {
        etablissement: {
          select: { id: true, nom: true, codeAntenne: true, pays: true, statut: true },
        },
        apprenantProfile: {
          include: {
            candidatures: {
              include: {
                session: {
                  select: { id: true, libelle: true, filiere: { select: { libelle: true } }, niveau: { select: { libelle: true } } },
                },
                pieces: {
                  select: { id: true, type: true, nomFichier: true, fileUrl: true, valide: true, uploadedAt: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
            inscriptions: {
              include: {
                formation: { select: { id: true, titre: true } },
                session: { select: { id: true, libelle: true } },
              },
              orderBy: { dateDebut: 'desc' },
            },
            validationsNiveau: {
              include: {
                niveau: { select: { libelle: true } },
                filiere: { select: { libelle: true } },
              },
            },
          },
        },
        certificats: {
          include: {
            formation: { select: { id: true, titre: true } },
          },
          orderBy: { dateEmission: 'desc' },
        },
        seances: {
          include: {
            module: { select: { id: true, titre: true } },
          },
          orderBy: { dateHeureDebut: 'desc' },
          take: 15,
        },
        notesFormateur: {
          include: {
            evaluation: { select: { id: true, titre: true } },
            utilisateur: { select: { id: true, nom: true, prenom: true } },
          },
          orderBy: { dateNotation: 'desc' },
          take: 15,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Dossier utilisateur introuvable.');
    }

    const { password, ...safeUser } = user;

    // Statut de sécurité ANSSI
    const emailNorm = user.email.toLowerCase().trim();
    const attempts = UtilisateursService.failedAttempts.get(emailNorm);
    const estVerrouille = !!(attempts?.lockedUntil && attempts.lockedUntil > new Date());

    return {
      ...safeUser,
      securite: {
        estVerrouille,
        tentativesEchouees: attempts?.count || 0,
        verrouilleJusquA: attempts?.lockedUntil || null,
      },
    };
  }

  /**
   * Réinitialisation administrative du mot de passe
   */
  async adminResetPassword(userId: string, nouveauMotDePasse?: string, auteurId?: string, ipAdresse: string = '0.0.0.0') {
    const user = await this.prisma.utilisateur.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    const passwordToSet = nouveauMotDePasse && nouveauMotDePasse.length >= 8 ? nouveauMotDePasse : 'Vitalis2026!';
    const hashedPassword = await bcrypt.hash(passwordToSet, 12);

    await this.prisma.utilisateur.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Déverrouiller le compte si verrouillé
    const emailNorm = user.email.toLowerCase().trim();
    UtilisateursService.failedAttempts.delete(emailNorm);
    this.invalidateUserValidateCache(userId);

    try {
      await this.prisma.auditLog.create({
        data: {
          auteurId,
          action: 'REINITIALISATION_MOT_DE_PASSE_ADMIN',
          tableCible: 'utilisateurs',
          details: { userId, email: user.email },
          ipAdresse,
        },
      });
    } catch {}

    try {
      this.notificationsService.emit({
        type: 'UTILISATEUR_UPDATE',
        title: 'Accès réinitialisé',
        message: `Le mot de passe de ${user.prenom} ${user.nom} a été réinitialisé.`,
        data: { userId, reinitialise: true },
      });
    } catch {}

    return {
      success: true,
      message: `Mot de passe réinitialisé avec succès. Nouveau mot de passe temporaire : ${passwordToSet}`,
      motDePasseTemporaire: passwordToSet,
    };
  }

  /**
   * Déverrouillage administratif immédiat d'un compte utilisateur (Norme ANSSI)
   */
  async adminUnlockAccount(userId: string, auteurId?: string, ipAdresse: string = '0.0.0.0') {
    const user = await this.prisma.utilisateur.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    const emailNorm = user.email.toLowerCase().trim();
    UtilisateursService.failedAttempts.delete(emailNorm);

    try {
      await this.prisma.auditLog.create({
        data: {
          auteurId,
          action: 'DEVERROUILLAGE_COMPTE_ADMIN',
          tableCible: 'utilisateurs',
          details: { userId, email: user.email },
          ipAdresse,
        },
      });
    } catch {}

    try {
      this.notificationsService.emit({
        type: 'UTILISATEUR_UPDATE',
        title: 'Compte déverrouillé',
        message: `Le compte de ${user.prenom} ${user.nom} a été déverrouillé.`,
        data: { userId, estVerrouille: false },
      });
    } catch {}

    return {
      success: true,
      message: `Le compte ${user.email} a été déverrouillé avec succès.`,
    };
  }

  // =====================================================================
  // GESTION DES DOCUMENTS DOSSIER
  // =====================================================================

  /**
   * Lister les documents du dossier d'un utilisateur
   */
  async getDocumentsDossier(userId: string) {
    const user = await this.prisma.utilisateur.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    return this.prisma.documentDossier.findMany({
      where: { utilisateurId: userId },
      include: { ajoutePar: { select: { id: true, nom: true, prenom: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Ajouter un document dans le dossier d'un utilisateur (par l'admin)
   */
  async adminAjouterDocumentDossier(
    userId: string,
    file: Express.Multer.File,
    titre: string,
    typeDocument: string,
    commentaire: string | undefined,
    auteurId: string,
    ipAdresse: string = '0.0.0.0',
  ) {
    if (!file) throw new BadRequestException('Aucun fichier fourni.');
    const user = await this.prisma.utilisateur.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    const fileUrl = await this.storage.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      `dossiers/${userId}`,
    );

    const doc = await this.prisma.documentDossier.create({
      data: {
        utilisateurId: userId,
        titre,
        typeDocument,
        fileUrl,
        nomFichier: file.originalname,
        statut: 'VALIDE',
        commentaire,
        ajouteParId: auteurId,
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          auteurId,
          action: 'AJOUT_DOCUMENT_DOSSIER',
          tableCible: 'documents_dossier',
          details: { userId, docId: doc.id, titre, typeDocument },
          ipAdresse,
        },
      });
    } catch {}

    // Notifier l'utilisateur
    this.notificationsService.emit({
      type: 'DOSSIER_DOCUMENT_AJOUTE',
      recipientUserId: userId,
      title: 'Document ajouté à votre dossier',
      message: `Un document « ${titre} » a été ajouté à votre dossier personnel.`,
      data: { docId: doc.id, titre, typeDocument },
    });

    return { success: true, document: doc };
  }

  /**
   * Supprimer un document du dossier
   */
  async adminSupprimerDocumentDossier(docId: string, auteurId: string) {
    const doc = await this.prisma.documentDossier.findUnique({ where: { id: docId } });
    if (!doc) throw new NotFoundException('Document introuvable.');
    await this.prisma.documentDossier.delete({ where: { id: docId } });

    // Notifier suppression temps réel
    try {
      this.notificationsService.emit({
        type: 'DOSSIER_DOCUMENT_SUPPRIME',
        recipientUserId: doc.utilisateurId,
        title: 'Document supprimé du dossier',
        message: `Le document « ${doc.titre} » a été retiré du dossier.`,
        data: { userId: doc.utilisateurId, docId, titre: doc.titre },
      });
    } catch {}

    return { success: true, message: 'Document supprimé avec succès.' };
  }

  // =====================================================================
  // GESTION DES DEMANDES DE RÉGULARISATION
  // =====================================================================

  /**
   * Créer une demande de régularisation (admin → utilisateur)
   */
  async creerDemandeRegularisation(
    userId: string,
    dto: CreerDemandeRegularisationDto,
    auteurId: string,
    ipAdresse: string = '0.0.0.0',
  ) {
    const user = await this.prisma.utilisateur.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    const dateLimite = new Date(dto.dateLimite);
    if (isNaN(dateLimite.getTime())) {
      throw new BadRequestException('Date limite invalide.');
    }

    const demande = await this.prisma.demandeRegularisation.create({
      data: {
        utilisateurId: userId,
        auteurId,
        motif: dto.motif,
        description: dto.description,
        piecesDemandees: dto.piecesDemandees || [],
        dateLimite,
        statut: 'EN_ATTENTE',
      },
      include: {
        auteur: { select: { id: true, nom: true, prenom: true } },
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          auteurId,
          action: 'DEMANDE_REGULARISATION_CREEE',
          tableCible: 'demandes_regularisation',
          details: { userId, demandeId: demande.id, motif: dto.motif },
          ipAdresse,
        },
      });
    } catch {}

    // Notifier l'utilisateur concerné
    this.notificationsService.emit({
      type: 'DEMANDE_REGULARISATION',
      recipientUserId: userId,
      title: '⚠️ Régularisation de dossier requise',
      message: `L'administration vous demande de régulariser votre dossier avant le ${dateLimite.toLocaleDateString('fr-FR')}. Motif : ${dto.motif}`,
      data: { demandeId: demande.id, motif: dto.motif, dateLimite: dateLimite.toISOString() },
    });

    return { success: true, demande };
  }


  /**
   * Lister les demandes de régularisation d'un utilisateur
   */
  async getDemandesRegularisation(userId: string) {
    const user = await this.prisma.utilisateur.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    return this.prisma.demandeRegularisation.findMany({
      where: { utilisateurId: userId },
      include: { auteur: { select: { id: true, nom: true, prenom: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Valider / clôturer / rejeter une demande de régularisation (admin)
   */
  async prendreDecisionRegularisation(
    demandeId: string,
    dto: DecisionRegularisationDto,
    auteurId: string,
    ipAdresse: string = '0.0.0.0',
  ) {
    const demande = await this.prisma.demandeRegularisation.findUnique({
      where: { id: demandeId },
    });
    if (!demande) throw new NotFoundException('Demande de régularisation introuvable.');

    const updated = await this.prisma.demandeRegularisation.update({
      where: { id: demandeId },
      data: {
        statut: dto.statut,
        decisionDate: new Date(),
        decisionCommentaire: dto.commentaire,
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          auteurId,
          action: 'DECISION_REGULARISATION',
          tableCible: 'demandes_regularisation',
          details: { demandeId, statut: dto.statut, commentaire: dto.commentaire },
          ipAdresse,
        },
      });
    } catch {}

    // Notifier l'utilisateur
    const msg =
      dto.statut === 'REGULARISE'
        ? 'Votre dossier a été validé et déclaré conforme.'
        : dto.statut === 'REJETE'
        ? 'Votre demande de régularisation a été rejetée. Veuillez contacter l\'administration.'
        : 'La demande de régularisation a été clôturée.';
    this.notificationsService.emit({
      type: 'REGULARISATION_DECISION',
      recipientUserId: demande.utilisateurId,
      title: 'Décision sur votre dossier',
      message: msg,
      data: { demandeId, statut: dto.statut },
    });

    return { success: true, demande: updated };
  }

  /**
   * Obtenir les demandes de régularisation actives (EN_ATTENTE) pour l'utilisateur connecté
   */
  async getMesDemandesRegularisation(userId: string) {
    return this.prisma.demandeRegularisation.findMany({
      where: { utilisateurId: userId, statut: 'EN_ATTENTE' },
      include: { auteur: { select: { id: true, nom: true, prenom: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Soumettre un document en réponse à une demande de régularisation (utilisateur)
   */
  async soumettreDocumentRegularisation(
    userId: string,
    demandeId: string,
    file: Express.Multer.File,
    titre: string,
    typeDocument: string,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier fourni.');
    const demande = await this.prisma.demandeRegularisation.findUnique({ where: { id: demandeId } });
    if (!demande) throw new NotFoundException('Demande introuvable.');
    if (demande.utilisateurId !== userId) throw new ForbiddenException('Accès refusé.');
    if (demande.statut !== 'EN_ATTENTE') throw new BadRequestException('Cette demande n\'est plus en attente.');

    const fileUrl = await this.storage.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      `dossiers/${userId}/regularisation`,
    );

    const doc = await this.prisma.documentDossier.create({
      data: {
        utilisateurId: userId,
        titre,
        typeDocument,
        fileUrl,
        nomFichier: file.originalname,
        statut: 'EN_ATTENTE_VALIDATION',
        commentaire: `Soumis en réponse à la demande de régularisation #${demandeId}`,
        ajouteParId: userId,
      },
    });

    // Mettre à jour le statut de la demande de régularisation en "DOCUMENTS_FOURNIS"
    try {
      await this.prisma.demandeRegularisation.update({
        where: { id: demandeId },
        data: { statut: 'DOCUMENTS_FOURNIS' },
      });
    } catch {}

    // Notifier en temps réel les administrateurs
    try {
      this.notificationsService.emit({
        type: 'DOCUMENT_REGULARISATION_SOUMIS',
        title: 'Pièce justificative transmise',
        message: `L'utilisateur a transmis une pièce « ${titre} » en réponse à la demande de régularisation.`,
        data: { userId, demandeId, docId: doc.id, titre, document: doc },
      });
    } catch {}

    return { success: true, document: doc, message: 'Document soumis avec succès, en attente de validation.' };
  }
}



