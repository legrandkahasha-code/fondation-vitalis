import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EtablissementGuard } from '../../common/guards/etablissement.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { EnquetesService } from './enquetes.service';
import { SoumettreEnqueteDto } from './dto/enquete.dto';

@Controller('enquetes')
@UseGuards(JwtAuthGuard, EtablissementGuard, RolesGuard)
export class EnquetesController {
  constructor(private readonly enquetesService: EnquetesService) {}

  @Post('soumettre')
  @Roles(Role.APPRENANT)
  soumettreEnquete(@Body() dto: SoumettreEnqueteDto, @Req() req: any) {
    return this.enquetesService.soumettreEnquete(dto, req.user);
  }

  @Get('en-attente')
  @Roles(Role.APPRENANT)
  getEnquetesEnAttente(@Req() req: any) {
    return this.enquetesService.getEnquetesEnAttente(req.user);
  }

  @Get('formateurs/:formateurId/stats')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  getStatistiquesFormateur(
    @Param('formateurId', ParseUUIDPipe) formateurId: string,
    @Req() req: any,
  ) {
    return this.enquetesService.getStatistiquesFormateur(formateurId, req.user);
  }

  @Get('formations/:formationId/stats')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR, Role.PERSONNEL_ADMINISTRATIF)
  getStatistiquesFormation(
    @Param('formationId', ParseUUIDPipe) formationId: string,
    @Req() req: any,
  ) {
    return this.enquetesService.getStatistiquesFormation(formationId, req.user);
  }
}
