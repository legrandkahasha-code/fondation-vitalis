import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { type_etablissement, statut_etablissement, politique_candidature_concurrente } from '@prisma/client';
import { CreateEtablissementDto, UpdateEtablissementDto } from './dto/etablissements.dto';
import { CreateSatelliteDto, UpdateAutonomieDto, UpdateEtablissementStatutDto, UpdateParametresReseauDto } from '../admission/dto/admission.dto';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class EtablissementsService {
  constructor(private prisma: PrismaService) {}

  private static allCache: { data: any; expiry: number } | null = null;
  private static publicCache: { data: any; expiry: number } | null = null;
  private static readonly CACHE_TTL_MS = 120_000; // 2 minutes

  static clearCache() {
    EtablissementsService.allCache = null;
    EtablissementsService.publicCache = null;
    AnalyticsService.clearCache();
  }

  async findAllPublic() {
    const now = Date.now();
    if (EtablissementsService.publicCache && now < EtablissementsService.publicCache.expiry) {
      return EtablissementsService.publicCache.data;
    }
    const data = await this.prisma.etablissement.findMany({
      where: { statut: statut_etablissement.ACTIF },
      select: {
        id: true,
        nom: true,
        codeAntenne: true,
        pays: true,
        typeEtablissement: true,
      },
      orderBy: { nom: 'asc' },
    });
    EtablissementsService.publicCache = { data, expiry: now + EtablissementsService.CACHE_TTL_MS };
    return data;
  }

  async findAll() {
    const now = Date.now();
    if (EtablissementsService.allCache && now < EtablissementsService.allCache.expiry) {
      return EtablissementsService.allCache.data;
    }
    const data = await this.prisma.etablissement.findMany({
      include: {
        parent: { select: { id: true, nom: true, codeAntenne: true } },
        _count: { select: { utilisateurs: true, formations: true, satellites: true } },
      },
      orderBy: { nom: 'asc' },
    });
    EtablissementsService.allCache = { data, expiry: now + EtablissementsService.CACHE_TTL_MS };
    return data;
  }

  async getReseau() {
    return this.prisma.etablissement.findMany({
      where: { typeEtablissement: type_etablissement.MERE },
      include: {
        satellites: {
          orderBy: { nom: 'asc' },
          include: { _count: { select: { utilisateurs: true, formations: true } } },
        },
        parametresReseau: true,
      },
    });
  }

  async findOne(id: string) {
    const etab = await this.prisma.etablissement.findUnique({
      where: { id },
      include: {
        utilisateurs: { select: { id: true, nom: true, prenom: true, email: true, role: true } },
        formations: { select: { id: true, titre: true } },
      },
    });
    if (!etab) throw new NotFoundException('Établissement introuvable.');
    return etab;
  }

  async create(data: CreateEtablissementDto) {
    EtablissementsService.clearCache();
    const mere = await this.prisma.etablissement.findFirst({ where: { typeEtablissement: type_etablissement.MERE } });
    const codeAntenne = data.codeAntenne || 'ANT-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const type = data.typeEtablissement || type_etablissement.SATELLITE_NATIONAL;
    return this.prisma.etablissement.create({
      data: {
        nom: data.nom,
        adresse: data.adresse,
        codeAntenne,
        typeEtablissement: type,
        parentEtablissementId: type === type_etablissement.MERE ? null : mere?.id,
        pays: data.pays,
        fuseauHoraire: data.fuseauHoraire,
        langueDefaut: data.langueDefaut,
      },
    });
  }

  async createSatellite(data: CreateSatelliteDto) {
    EtablissementsService.clearCache();
    const mere = await this.prisma.etablissement.findFirst({ where: { typeEtablissement: type_etablissement.MERE } });
    if (!mere) throw new BadRequestException('Aucun centre mère n’est défini.');
    return this.create({
      ...data,
      typeEtablissement: data.typeEtablissement || type_etablissement.SATELLITE_NATIONAL,
    });
  }

  async update(id: string, data: UpdateEtablissementDto) {
    EtablissementsService.clearCache();
    await this.findOne(id);
    return this.prisma.etablissement.update({
      where: { id },
      data,
      include: {
        parent: { select: { id: true, nom: true, codeAntenne: true } },
        _count: { select: { utilisateurs: true, formations: true, satellites: true } },
      },
    });
  }

  async updateStatut(id: string, dto: UpdateEtablissementStatutDto) {
    EtablissementsService.clearCache();
    await this.findOne(id);
    return this.prisma.etablissement.update({
      where: { id },
      data: { statut: dto.statut },
      include: {
        parent: { select: { id: true, nom: true, codeAntenne: true } },
        _count: { select: { utilisateurs: true, formations: true, satellites: true } },
      },
    });
  }

  async updateAutonomie(id: string, dto: UpdateAutonomieDto) {
    await this.findOne(id);
    return this.prisma.etablissement.update({
      where: { id },
      data: {
        parametresAutonomie: dto.parametresAutonomie as object,
        reglementLocal: dto.reglementLocal as object,
      },
    });
  }

  async getParametresReseau() {
    const mere = await this.prisma.etablissement.findFirst({ where: { typeEtablissement: type_etablissement.MERE } });
    if (!mere) throw new NotFoundException('Centre mère introuvable.');
    return this.prisma.parametresReseau.upsert({
      where: { etablissementMereId: mere.id },
      update: {},
      create: {
        etablissementMereId: mere.id,
        politiqueCandidatureConcurrente: politique_candidature_concurrente.MISE_EN_RESERVE,
      },
    });
  }

  async updateParametresReseau(dto: UpdateParametresReseauDto) {
    const current = await this.getParametresReseau();
    return this.prisma.parametresReseau.update({
      where: { id: current.id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.etablissement.delete({ where: { id } });
  }
}
