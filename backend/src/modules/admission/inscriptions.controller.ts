import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EtablissementGuard } from '../../common/guards/etablissement.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { InscriptionsService } from './inscriptions.service';
import { UpdateInscriptionStatutDto, InscrireApprenantDto } from './dto/admission.dto';

@Controller('inscriptions')
@UseGuards(JwtAuthGuard, EtablissementGuard, RolesGuard)
export class InscriptionsController {
  constructor(private service: InscriptionsService) {}

  @Get('mes-formations')
  @Roles(Role.APPRENANT)
  mesFormations(@Req() req: any) {
    return this.service.mesFormations(req.user);
  }

  @Get('etablissement/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.PERSONNEL_ADMINISTRATIF)
  byEtablissement(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.byEtablissement(id, req.user);
  }

  @Get('formation/:formationId')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR, Role.PERSONNEL_ADMINISTRATIF)
  byFormation(@Param('formationId', ParseUUIDPipe) formationId: string, @Req() req: any) {
    return this.service.byFormation(formationId, req.user);
  }

  @Post()
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  inscrire(@Body() dto: InscrireApprenantDto, @Req() req: any) {
    return this.service.inscrireApprenant(dto, req.user);
  }

  @Patch(':id/statut')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  updateStatut(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInscriptionStatutDto, @Req() req: any) {
    return this.service.updateStatut(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  desinscrire(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.desinscrire(id, req.user);
  }
}
