import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateFiliereDto,
  CreateNiveauDto,
  CreateFormationReferentielDto,
  CreatePrerequisDto,
} from './dto/admission.dto';

@Injectable()
export class ReferentielService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  listFilieres(actifsOnly = false) {
    return this.prisma.filiere.findMany({
      where: actifsOnly ? { actif: true } : undefined,
      orderBy: { ordre: 'asc' },
      include: {
        formationsReferentiel: {
          include: {
            niveau: true,
            _count: { select: { formations: true } },
          },
        },
        _count: {
          select: {
            formationsReferentiel: true,
            sessionsAdmission: true,
          },
        },
      },
    });
  }

  async createFiliere(dto: CreateFiliereDto) {
    const filiere = await this.prisma.filiere.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        libelle: dto.libelle.trim(),
        description: dto.description?.trim() || null,
        ordre: dto.ordre !== undefined ? Number(dto.ordre) : 0,
        actif: true,
      },
    });

    // Auto-création d'une entrée dans formations_referentiel pour compatibilité immédiate avec les formations
    const premierNiveau = await this.prisma.niveau.findFirst({
      where: { actif: true },
      orderBy: { ordre: 'asc' },
    });

    if (premierNiveau) {
      await this.prisma.formationReferentiel.upsert({
        where: {
          filiereId_niveauId: {
            filiereId: filiere.id,
            niveauId: premierNiveau.id,
          },
        },
        update: {},
        create: {
          filiereId: filiere.id,
          niveauId: premierNiveau.id,
          libelle: `${filiere.libelle} — ${premierNiveau.libelle}`,
          description: filiere.description,
          actif: true,
        },
      });
    }

    this.notifications.emit({
      type: 'FILIERE_UPDATE',
      title: 'Référentiel Filière créé',
      message: `La filière "${filiere.libelle}" (${filiere.code}) a été ajoutée au référentiel national.`,
      data: { filiereId: filiere.id, action: 'CREATE' },
    });

    return filiere;
  }

  async updateFiliere(id: string, dto: Partial<CreateFiliereDto> & { actif?: boolean }) {
    const data: any = {};
    if (dto.code !== undefined) data.code = dto.code.trim().toUpperCase();
    if (dto.libelle !== undefined) data.libelle = dto.libelle.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.ordre !== undefined) data.ordre = Number(dto.ordre);
    if (dto.actif !== undefined) data.actif = Boolean(dto.actif);

    const filiere = await this.prisma.filiere.update({
      where: { id },
      data,
    });

    this.notifications.emit({
      type: 'FILIERE_UPDATE',
      title: 'Référentiel Filière mis à jour',
      message: `La filière "${filiere.libelle}" (${filiere.code}) a été mise à jour.`,
      data: { filiereId: filiere.id, action: 'UPDATE' },
    });

    return filiere;
  }

  async deleteFiliere(id: string) {
    const filiere = await this.prisma.filiere.findUnique({
      where: { id },
      include: {
        formationsReferentiel: {
          include: {
            formations: { select: { id: true } },
          },
        },
        sessionsAdmission: { select: { id: true } },
      },
    });

    if (!filiere) throw new NotFoundException('Filière introuvable.');

    const totalFormations = filiere.formationsReferentiel.reduce(
      (acc, ref) => acc + (ref.formations?.length || 0),
      0,
    );
    const totalSessions = filiere.sessionsAdmission.length;

    if (totalFormations > 0 || totalSessions > 0) {
      const updated = await this.prisma.filiere.update({
        where: { id },
        data: { actif: false },
      });

      this.notifications.emit({
        type: 'FILIERE_UPDATE',
        title: 'Filière désactivée',
        message: `La filière "${updated.libelle}" a été désactivée (utilisée par ${totalFormations} classe(s)).`,
        data: { filiereId: id, action: 'DEACTIVATE' },
      });

      return {
        message: `La filière est rattachée à ${totalFormations} classe(s) ou sessions. Elle a été désactivée pour préserver l'intégrité.`,
        deactivated: true,
      };
    }

    await this.prisma.formationReferentiel.deleteMany({
      where: { filiereId: id },
    });

    await this.prisma.filiere.delete({ where: { id } });

    this.notifications.emit({
      type: 'FILIERE_UPDATE',
      title: 'Filière supprimée',
      message: `La filière "${filiere.libelle}" a été retirée du référentiel national.`,
      data: { filiereId: id, action: 'DELETE' },
    });

    return { message: 'Filière supprimée avec succès du référentiel.', deleted: true };
  }

  listNiveaux(actifsOnly = false) {
    return this.prisma.niveau.findMany({
      where: actifsOnly ? { actif: true } : undefined,
      orderBy: { ordre: 'asc' },
      include: { prerequis: { include: { niveauRequis: true } } },
    });
  }

  createNiveau(dto: CreateNiveauDto) {
    return this.prisma.niveau.create({ data: dto });
  }

  listFormationsReferentiel() {
    return this.prisma.formationReferentiel.findMany({
      include: { filiere: true, niveau: true },
      orderBy: { libelle: 'asc' },
    });
  }

  createFormationReferentiel(dto: CreateFormationReferentielDto) {
    return this.prisma.formationReferentiel.create({ data: dto });
  }

  async createPrerequis(dto: CreatePrerequisDto) {
    const cible = await this.prisma.niveau.findUnique({ where: { id: dto.niveauCibleId } });
    const requis = await this.prisma.niveau.findUnique({ where: { id: dto.niveauRequisId } });
    if (!cible || !requis) throw new NotFoundException('Niveau introuvable.');
    return this.prisma.prerequisNiveau.create({ data: dto });
  }
}
