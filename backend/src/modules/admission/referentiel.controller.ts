import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ReferentielService } from './referentiel.service';
import {
  CreateFiliereDto,
  CreateNiveauDto,
  CreateFormationReferentielDto,
  CreatePrerequisDto,
} from './dto/admission.dto';

@Controller('referentiel')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReferentielController {
  constructor(private service: ReferentielService) {}

  @Get('filieres')
  @Public()
  listFilieres(@Query('all') all?: string) {
    return this.service.listFilieres(all !== 'true');
  }

  @Post('filieres')
  @Roles(Role.ADMIN_CENTRE)
  createFiliere(@Body() dto: CreateFiliereDto) {
    return this.service.createFiliere(dto);
  }

  @Put('filieres/:id')
  @Roles(Role.ADMIN_CENTRE)
  updateFiliere(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateFiliereDto> & { actif?: boolean }) {
    return this.service.updateFiliere(id, dto);
  }

  @Delete('filieres/:id')
  @Roles(Role.ADMIN_CENTRE)
  deleteFiliere(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteFiliere(id);
  }

  @Get('niveaux')
  @Public()
  listNiveaux(@Query('all') all?: string) {
    return this.service.listNiveaux(all !== 'true');
  }

  @Post('niveaux')
  @Roles(Role.ADMIN_CENTRE)
  createNiveau(@Body() dto: CreateNiveauDto) {
    return this.service.createNiveau(dto);
  }

  @Get('formations')
  listFormations() {
    return this.service.listFormationsReferentiel();
  }

  @Post('formations')
  @Roles(Role.ADMIN_CENTRE)
  createFormation(@Body() dto: CreateFormationReferentielDto) {
    return this.service.createFormationReferentiel(dto);
  }

  @Post('prerequis')
  @Roles(Role.ADMIN_CENTRE)
  createPrerequis(@Body() dto: CreatePrerequisDto) {
    return this.service.createPrerequis(dto);
  }
}
