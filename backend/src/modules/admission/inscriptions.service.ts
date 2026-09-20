import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IdentityService } from './identity.service';
import { Role } from '../../common/enums/role.enum';
import { UpdateInscriptionStatutDto, InscrireApprenantDto } from './dto/admission.dto';
import { statut_inscription } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InscriptionsService {
  constructor(
    private prisma: PrismaService,
    private identity: IdentityService,
    private notifications: NotificationsService,
  ) {}

  async mesFormations(user: any) {
    const profile = await this.identity.ensureProfileFromUser(user);
    return this.prisma.inscription.findMany({
      where: { apprenantId: profile.id, statut: { in: [statut_inscription.ACTIVE, statut_inscription.RESERVEE] } },
      include: { formation: { select: { id: true, titre: true, description: true, etablissementId: true } } },
      orderBy: { dateDebut: 'desc' },
    });
  }

  async byEtablissement(etablissementId: string, user: any) {
    if (user.role !== Role.ADMIN_CENTRE && user.etablissementId !== etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit.');
    }
    return this.prisma.inscription.findMany({
      where: { formation: { etablissementId } },
      include: {
        apprenant: { select: { id: true, matricule: true, nom: true, prenom: true, email: true, telephone: true } },
        formation: { select: { id: true, titre: true, code: true } },
      },
      orderBy: { dateDebut: 'desc' },
    });
  }

  async byFormation(formationId: string, user: any) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
      select: { id: true, titre: true, etablissementId: true },
    });
    if (!formation) throw new NotFoundException('Formation introuvable.');

    if (user.role !== Role.ADMIN_CENTRE && user.etablissementId !== formation.etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit à une formation hors de votre établissement.');
    }

    return this.prisma.inscription.findMany({
      where: { formationId },
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
        candidature: {
          select: {
            id: true,
            statut: true,
            session: { select: { id: true, libelle: true } },
          },
        },
      },
      orderBy: { dateDebut: 'desc' },
    });
  }

  async inscrireApprenant(dto: InscrireApprenantDto, user: any) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: dto.formationId },
      include: { etablissement: { select: { id: true, nom: true } } },
    });
    if (!formation) throw new NotFoundException('Formation introuvable.');

    if (user.role !== Role.ADMIN_CENTRE && user.etablissementId !== formation.etablissementId) {
      throw new ForbiddenException('BR-02 : Vous ne pouvez inscrire des apprenants qu\'aux formations de votre établissement.');
    }

    // Résolution de l'apprenant : soit apprenantId direct, soit via utilisateurId
    let apprenant: any = await this.prisma.apprenant.findUnique({
      where: { id: dto.apprenantId },
      include: { utilisateur: true },
    });

    if (!apprenant) {
      // Vérifier si l'identifiant passé est un utilisateurId
      const utilisateur = await this.prisma.utilisateur.findUnique({
        where: { id: dto.apprenantId },
      });
      if (utilisateur && utilisateur.role === Role.APPRENANT) {
        apprenant = await this.identity.ensureProfileFromUser(utilisateur);
      }
    }

    if (!apprenant) {
      throw new NotFoundException('Profil apprenant introuvable.');
    }

    // Vérifier l'établissement d'origine si admin etab
    if (
      user.role !== Role.ADMIN_CENTRE &&
      apprenant.etablissementOrigineId &&
      apprenant.etablissementOrigineId !== user.etablissementId
    ) {
      throw new ForbiddenException('BR-02 : Cet apprenant est rattaché à une autre antenne territoriale.');
    }

    const statut = dto.statut || statut_inscription.ACTIVE;

    const inscription = await this.prisma.inscription.upsert({
      where: {
        apprenantId_formationId: {
          apprenantId: apprenant.id,
          formationId: dto.formationId,
        },
      },
      update: {
        statut,
        sessionId: dto.sessionId || undefined,
        dateFin: null,
      },
      create: {
        apprenantId: apprenant.id,
        formationId: dto.formationId,
        sessionId: dto.sessionId || null,
        statut,
      },
      include: {
        apprenant: true,
        formation: true,
      },
    });

    this.notifications.emit({
      type: 'INSCRIPTION_CONFIRMEE',
      recipientEtablissementId: formation.etablissementId,
      title: 'Nouvelle Inscription à une Formation',
      message: `${apprenant.prenom} ${apprenant.nom} a été inscrit(e) à la formation "${formation.titre}".`,
      data: {
        formationId: formation.id,
        apprenantId: apprenant.id,
        inscriptionId: inscription.id,
      },
    });

    return inscription;
  }

  async updateStatut(id: string, dto: UpdateInscriptionStatutDto, user: any) {
    const insc = await this.prisma.inscription.findUnique({
      where: { id },
      include: { formation: true },
    });
    if (!insc) throw new NotFoundException('Inscription introuvable.');
    if (user.role !== Role.ADMIN_CENTRE && user.etablissementId !== insc.formation.etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit.');
    }
    return this.prisma.inscription.update({
      where: { id },
      data: {
        statut: dto.statut,
        dateFin: ['TERMINEE', 'ABANDONNEE', 'ANNULEE'].includes(dto.statut) ? new Date() : insc.dateFin,
      },
    });
  }

  async desinscrire(id: string, user: any) {
    const insc = await this.prisma.inscription.findUnique({
      where: { id },
      include: { formation: true, apprenant: true },
    });
    if (!insc) throw new NotFoundException('Inscription introuvable.');

    if (user.role !== Role.ADMIN_CENTRE && user.etablissementId !== insc.formation.etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit.');
    }

    await this.prisma.inscription.delete({
      where: { id },
    });

    this.notifications.emit({
      type: 'FORMATION_UPDATE',
      recipientEtablissementId: insc.formation.etablissementId,
      title: 'Désinscription effectuée',
      message: `${insc.apprenant?.prenom} ${insc.apprenant?.nom} a été retiré(e) de la formation "${insc.formation.titre}".`,
      data: { formationId: insc.formationId, inscriptionId: id },
    });

    return { success: true, message: 'Apprenant désinscrit avec succès.' };
  }
}
