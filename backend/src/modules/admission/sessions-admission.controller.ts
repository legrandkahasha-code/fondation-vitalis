import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards, ParseUUIDPipe, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EtablissementGuard } from '../../common/guards/etablissement.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { SessionsAdmissionService } from './sessions-admission.service';
import {
  CreateSessionAdmissionDto,
  UpdateSessionStatutDto,
  UpdatePartageSessionDto,
  UpdateSessionAdmissionDto,
} from './dto/admission.dto';

@Controller('sessions-admission')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionsAdmissionController {
  constructor(private service: SessionsAdmissionService) {}

  /**
   * Sessions publiques — accessible sans auth.
   * Si l'apprenant est connecté, il peut passer son etablissementId en query
   * pour voir uniquement les sessions de son établissement + les sessions partagées.
   */
  @Get('public')
  @Public()
  listPublic(@Query('etablissementId') etablissementId?: string) {
    return this.service.listPublic(etablissementId);
  }

  /** Liste des sessions (filtrée selon le rôle) */
  @Get()
  @UseGuards(EtablissementGuard)
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.PERSONNEL_ADMINISTRATIF)
  list(@Req() req: any) {
    return this.service.list(req.user);
  }

  /** Détail d'une session */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.findOne(id, req.user);
  }

  /** Créer une nouvelle session */
  @Post()
  @UseGuards(EtablissementGuard)
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.PERSONNEL_ADMINISTRATIF)
  create(@Body() dto: CreateSessionAdmissionDto, @Req() req: any) {
    return this.service.create(dto, req.user);
  }

  /** Mettre à jour les infos de la session (description, pièces, capacité, partage) */
  @Patch(':id')
  @UseGuards(EtablissementGuard)
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.PERSONNEL_ADMINISTRATIF)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSessionAdmissionDto,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, req.user);
  }

  /** Changer le statut d'une session (BROUILLON → OUVERTE → FERMEE → ...) */
  @Patch(':id/statut')
  @UseGuards(EtablissementGuard)
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.PERSONNEL_ADMINISTRATIF)
  updateStatut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSessionStatutDto,
    @Req() req: any,
  ) {
    return this.service.updateStatut(id, dto, req.user);
  }

  /**
   * Partager une session avec une liste d'établissements.
   * Remplace la liste actuelle (idempotent).
   * Réservé à l'Admin Central.
   */
  @Patch(':id/partager')
  @UseGuards(EtablissementGuard)
  @Roles(Role.ADMIN_CENTRE)
  partager(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartageSessionDto,
    @Req() req: any,
  ) {
    return this.service.partager(id, dto, req.user);
  }

  /** Statistiques d'une session */
  @Get(':id/stats')
  @UseGuards(EtablissementGuard)
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.PERSONNEL_ADMINISTRATIF)
  stats(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.stats(id, req.user);
  }
}
