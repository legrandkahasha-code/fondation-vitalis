import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EtablissementGuard } from '../../common/guards/etablissement.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RattrapageService } from './rattrapage.service';
import {
  CreerSessionRattrapageDto,
  InscrireCandidatRattrapageDto,
  SaisirNoteRattrapageDto,
} from './dto/rattrapage.dto';

@Controller('rattrapages')
@UseGuards(JwtAuthGuard, EtablissementGuard, RolesGuard)
export class RattrapageController {
  constructor(private readonly rattrapageService: RattrapageService) {}

  @Post('sessions')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  creerSession(@Body() dto: CreerSessionRattrapageDto, @Req() req: any) {
    return this.rattrapageService.creerSession(dto, req.user);
  }

  @Get('sessions')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR, Role.PERSONNEL_ADMINISTRATIF)
  getSessions(
    @Query('formationId') formationId?: string,
    @Query('moduleId') moduleId?: string,
    @Req() req?: any,
  ) {
    return this.rattrapageService.getSessions({ formationId, moduleId }, req.user);
  }

  @Get('mes-rattrapages')
  @Roles(Role.APPRENANT)
  getMesRattrapages(@Req() req: any) {
    return this.rattrapageService.getMesRattrapages(req.user);
  }

  @Get('sessions/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR, Role.PERSONNEL_ADMINISTRATIF)
  getSessionById(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.rattrapageService.getSessionById(id, req.user);
  }

  @Post('sessions/:id/candidats')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  inscrireCandidat(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Body() dto: InscrireCandidatRattrapageDto,
    @Req() req: any,
  ) {
    return this.rattrapageService.inscrireCandidat(sessionId, dto, req.user);
  }

  @Post('sessions/:id/auto-inscrire')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  autoInscrireAjournes(@Param('id', ParseUUIDPipe) sessionId: string, @Req() req: any) {
    return this.rattrapageService.autoInscrireAjournes(sessionId, req.user);
  }

  @Patch('inscriptions/:id/note')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  saisirNote(
    @Param('id', ParseUUIDPipe) inscriptionId: string,
    @Body() dto: SaisirNoteRattrapageDto,
    @Req() req: any,
  ) {
    return this.rattrapageService.saisirNote(inscriptionId, dto, req.user);
  }
}
