import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Req, Query, UseGuards, UseInterceptors, UploadedFile, ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EtablissementGuard } from '../../common/guards/etablissement.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { PedagogieService } from './pedagogie.service';
import { uploadFileFilter, MAX_UPLOAD_FILE_SIZE } from '../../common/utils/file-upload.util';
import { StorageService } from '../../common/services/storage.service';
import {
  CreateFormationDto,
  UpdateFormationDto,
  CreateModuleDto,
  CreateCoursDto,
  CreateEvaluationDto,
  SubmitNoteDto,
  CreateCategorieFormationDto,
  UpdateCategorieFormationDto,
} from './dto/pedagogie.dto';
import {
  UpdateModuleDto,
  UpdateCoursDto,
  UpdateEvaluationDto,
} from './dto/pedagogie-update.dto';


@Controller('pedagogie')
@UseGuards(JwtAuthGuard, EtablissementGuard, RolesGuard)
export class PedagogieController {
  constructor(
    private service: PedagogieService,
    private storage: StorageService,
  ) {}

  @Get('filieres-suivi')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR, Role.PERSONNEL_ADMINISTRATIF)
  getFilieresSuivi(
    @Req() req: any,
    @Query('etablissementId') etablissementId?: string,
    @Query('statut') statut?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getFilieresSuivi(req.user, { etablissementId, statut, search });
  }

  @Get('filieres-suivi/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR, Role.PERSONNEL_ADMINISTRATIF)
  getFiliereSuiviDetail(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.getFiliereSuiviDetail(id, req.user);
  }

  @Get('formations')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR, Role.APPRENANT, Role.PERSONNEL_ADMINISTRATIF)
  getFormations(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('filiereId') filiereId?: string,
    @Query('etablissementId') etablissementId?: string,
    @Query('categorie') categorie?: string,
    @Query('publieSurLanding') publieSurLanding?: string,
    @Query('actif') actif?: string,
  ) {
    return this.service.getFormations(req.user, { search, filiereId, etablissementId, categorie, publieSurLanding, actif });
  }

  @Get('formations/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR, Role.APPRENANT, Role.PERSONNEL_ADMINISTRATIF)
  getFormation(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.getFormation(id, req.user);
  }

  @Post('formations')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  createFormation(@Body() dto: CreateFormationDto, @Req() req: any) {
    return this.service.createFormation(dto, req.user);
  }

  @Put('formations/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  updateFormation(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFormationDto, @Req() req: any) {
    return this.service.updateFormation(id, dto, req.user);
  }

  @Patch('formations/:id/toggle-landing')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  toggleLanding(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.toggleLanding(id, req.user);
  }

  @Patch('formations/:id/toggle-une')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  toggleUne(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.toggleUne(id, req.user);
  }

  @Post('formations/:id/deployer')
  @Roles(Role.ADMIN_CENTRE)
  deployerFormation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('etablissementIds') etablissementIds: string[],
    @Req() req: any,
  ) {
    return this.service.deployerFormationVersEtablissements(id, etablissementIds, req.user);
  }

  @Delete('formations/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  deleteFormation(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.deleteFormation(id, req.user);
  }

  @Post('formations/:formationId/modules')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  createModule(
    @Param('formationId', ParseUUIDPipe) formationId: string,
    @Body() dto: CreateModuleDto,
    @Req() req: any,
  ) {
    return this.service.createModule(formationId, dto, req.user);
  }

  @Post('modules/:moduleId/cours')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  createCours(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: CreateCoursDto,
    @Req() req: any,
  ) {
    return this.service.createCours(moduleId, dto, req.user);
  }

  @Get('cours/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR, Role.APPRENANT)
  getCours(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    if (req.user.role === Role.APPRENANT) {
      return this.service.getCoursWithProgress(id, req.user.id);
    }
    return this.service.getCours(id);
  }

  @Post('cours/:coursId/complete')
  @Roles(Role.APPRENANT)
  markComplete(@Param('coursId', ParseUUIDPipe) coursId: string, @Req() req: any) {
    return this.service.markComplete(coursId, req.user.id);
  }

  @Post('cours/:coursId/upload')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: uploadFileFilter,
      limits: { fileSize: MAX_UPLOAD_FILE_SIZE },
    }),
  )
  async uploadCours(
    @Param('coursId', ParseUUIDPipe) coursId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const url = await this.storage.uploadFile(file.buffer, file.originalname, file.mimetype, 'cours');
    return this.service.uploadCoursDocument(coursId, url, req.user);
  }

  @Get('formations/:formationId/progress')
  @Roles(Role.APPRENANT, Role.FORMATEUR, Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  getProgress(@Param('formationId', ParseUUIDPipe) formationId: string, @Req() req: any) {
    const userId = req.user.role === Role.APPRENANT ? req.user.id : String(req.query.apprenantId ?? req.user.id);
    return this.service.getProgressByFormation(formationId, userId);
  }

  @Get('apprenants')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR, Role.PERSONNEL_ADMINISTRATIF)
  getApprenants(@Req() req: any) {
    return this.service.getApprenants(req.user);
  }

  @Post('modules/:moduleId/evaluations')
  @Roles(Role.FORMATEUR, Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  createEvaluation(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: CreateEvaluationDto,
    @Req() req: any,
  ) {
    return this.service.createEvaluation(moduleId, dto, req.user);
  }

  @Get('modules/:moduleId/evaluations')
  @Roles(Role.FORMATEUR, Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  getEvaluations(@Param('moduleId', ParseUUIDPipe) moduleId: string, @Req() req: any) {
    return this.service.getEvaluationsByModule(moduleId, req.user);
  }

  @Post('evaluations/:evaluationId/notes')
  @Roles(Role.FORMATEUR, Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  submitNote(
    @Param('evaluationId', ParseUUIDPipe) evaluationId: string,
    @Body() dto: SubmitNoteDto,
    @Req() req: any,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
    return this.service.submitNote(evaluationId, dto.utilisateurId, dto.valeur, req.user, ip);
  }

  // ====================================
  // UPDATE & DELETE MODULES
  // ====================================
  @Put('modules/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  updateModule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateModuleDto, @Req() req: any) {
    return this.service.updateModule(id, dto, req.user);
  }

  @Delete('modules/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  deleteModule(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.deleteModule(id, req.user);
  }

  // ====================================
  // UPDATE & DELETE COURS
  // ====================================
  @Put('cours/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  updateCours(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCoursDto, @Req() req: any) {
    return this.service.updateCours(id, dto, req.user);
  }

  @Delete('cours/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  deleteCours(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.deleteCours(id, req.user);
  }

  // ====================================
  // UPDATE & DELETE EVALUATIONS
  // ====================================
  @Put('evaluations/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  updateEvaluation(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEvaluationDto, @Req() req: any) {
    return this.service.updateEvaluation(id, dto, req.user);
  }

  @Delete('evaluations/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  deleteEvaluation(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.deleteEvaluation(id, req.user);
  }

  // ====================================
  // CATEGORIES DE FORMATION
  // ====================================
  @Get('categories')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR, Role.APPRENANT, Role.PERSONNEL_ADMINISTRATIF)
  getCategories(@Query('includeInactive') includeInactive?: string) {
    return this.service.getCategories(includeInactive === 'true');
  }

  @Post('categories')
  @Roles(Role.ADMIN_CENTRE)
  createCategorie(@Body() dto: CreateCategorieFormationDto, @Req() req: any) {
    return this.service.createCategorie(dto, req.user);
  }

  @Put('categories/:id')
  @Roles(Role.ADMIN_CENTRE)
  updateCategorie(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategorieFormationDto, @Req() req: any) {
    return this.service.updateCategorie(id, dto, req.user);
  }

  @Delete('categories/:id')
  @Roles(Role.ADMIN_CENTRE)
  deleteCategorie(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.deleteCategorie(id, req.user);
  }
}

