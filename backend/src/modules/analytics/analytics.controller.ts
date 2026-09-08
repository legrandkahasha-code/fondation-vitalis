import { Controller, Get, Param, Req, UseGuards, ParseUUIDPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EtablissementGuard } from '../../common/guards/etablissement.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, EtablissementGuard, RolesGuard)
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get('global')
  @Roles(Role.ADMIN_CENTRE)
  getGlobal() {
    return this.service.getGlobalKpi();
  }

  @Get('global/detailed')
  @Roles(Role.ADMIN_CENTRE)
  getGlobalDetailed() {
    return this.service.getGlobalDetailed();
  }

  @Get('global/export')
  @Roles(Role.ADMIN_CENTRE)
  async exportGlobal(@Req() req: any, @Res() res: Response) {
    const csv = await this.service.exportGlobalCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="global_kpi.csv"');
    res.send(csv);
  }

  @Get('etablissement/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.PERSONNEL_ADMINISTRATIF)
  getEtablissement(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.getEtablissementKpi(id, req.user);
  }

  @Get('etablissement/:id/dashboard-details')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.PERSONNEL_ADMINISTRATIF)
  getEtablissementDashboardDetails(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.getEtablissementDashboardDetails(id, req.user);
  }


  @Get('etablissement/:id/export')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.PERSONNEL_ADMINISTRATIF)
  async exportEtablissement(@Param('id', ParseUUIDPipe) id: string, @Req() req: any, @Res() res: Response) {
    const csv = await this.service.exportEtablissementCsv(id, req.user);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="etablissement_${id}_kpi.csv"`);
    res.send(csv);
  }

  @Get('formation/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  getFormation(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.getFormationStats(id, req.user);
  }

  @Get('admission/global')
  @Roles(Role.ADMIN_CENTRE)
  getAdmissionGlobal() {
    return this.service.getAdmissionGlobalKpi();
  }

  @Get('admission/global/export')
  @Roles(Role.ADMIN_CENTRE)
  async exportAdmission(@Res() res: Response) {
    const csv = await this.service.exportAdmissionCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="admission_reseau.csv"');
    res.send(csv);
  }
}
