import { Controller, Post, Get, Param, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EtablissementGuard } from '../../common/guards/etablissement.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '../../common/enums/role.enum';
import { CertificationService } from './certification.service';

@Controller('certification')
export class CertificationController {
  constructor(private service: CertificationService) {}

  @Post('emettre/:formationId/:utilisateurId')
  @UseGuards(JwtAuthGuard, EtablissementGuard, RolesGuard)
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  emettreCertificat(
    @Param('formationId', ParseUUIDPipe) formationId: string,
    @Param('utilisateurId', ParseUUIDPipe) utilisateurId: string,
    @Req() req: any,
  ) {
    // Sécurité : Ne jamais faire confiance aveuglément au header client Origin en production
    const baseUrl =
      process.env.PUBLIC_APP_URL ||
      process.env.FRONTEND_URL ||
      (process.env.NODE_ENV === 'production' ? 'https://vitaliseup.org' : req?.headers?.origin || 'http://localhost:4200');
    return this.service.emettreCertificat(formationId, utilisateurId, baseUrl);
  }

  @Get('mes-certificats')
  @UseGuards(JwtAuthGuard, EtablissementGuard, RolesGuard)
  @Roles(Role.APPRENANT)
  mesCertificats(@Req() req: any) {
    return this.service.getCertificatsUtilisateur(req.user.id);
  }

  @Get('verifier/:numeroSerie')
  @Public()
  verifyCertificat(@Param('numeroSerie') numeroSerie: string) {
    return this.service.verifyCertificat(numeroSerie);
  }

  @Get('download/:numeroSerie')
  @UseGuards(JwtAuthGuard, EtablissementGuard, RolesGuard)
  @Roles(Role.APPRENANT, Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  async downloadPdf(@Param('numeroSerie') numeroSerie: string, @Req() req: any) {
    return this.service.getPdfUrl(numeroSerie, req.user);
  }
}
