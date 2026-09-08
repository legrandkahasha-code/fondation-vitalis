import {
  Controller, Post, Get, Put, Delete, Body, Param, Req, HttpCode, HttpStatus,
  UseGuards, ForbiddenException, ParseUUIDPipe, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EtablissementGuard } from '../../common/guards/etablissement.guard';
import { UtilisateursService } from './utilisateurs.service';
import {
  RegisterDto, LoginDto, RefreshTokenDto, SetActifDto, ChangePasswordDto, UpdateProfileDto,
  AdminUpdateUserDto, CreerDemandeRegularisationDto, DecisionRegularisationDto,
} from './dto/utilisateurs.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { uploadFileFilter, MAX_UPLOAD_FILE_SIZE } from '../../common/utils/file-upload.util';

@Controller('utilisateurs')
export class UtilisateursController {
  constructor(private utilisateursService: UtilisateursService) {}

  @Post('enroler')
  @UseGuards(JwtAuthGuard, RolesGuard, EtablissementGuard)
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.PERSONNEL_ADMINISTRATIF)
  async enroler(@Body() dto: RegisterDto, @Req() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
    if (req.user.role !== Role.ADMIN_CENTRE) {
      dto.etablissementId = req.user.etablissementId;
    }
    return this.utilisateursService.register(dto, ip, req.user.id);
  }

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard, EtablissementGuard)
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.PERSONNEL_ADMINISTRATIF)
  async register(@Body() dto: RegisterDto, @Req() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
    if (req.user.role !== Role.ADMIN_CENTRE) {
      dto.etablissementId = req.user.etablissementId;
    }
    return this.utilisateursService.register(dto, ip, req.user.id);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
    return this.utilisateursService.login(dto, ip);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.utilisateursService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: RefreshTokenDto) {
    return this.utilisateursService.revokeRefreshToken(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    return this.utilisateursService.validateUser(req.user.id);
  }

  @Get('me/demandes-regularisation')
  @UseGuards(JwtAuthGuard)
  async getMesDemandesRegularisation(@Req() req: any) {
    return this.utilisateursService.getMesDemandesRegularisation(req.user.id);
  }

  @Post('me/soumettre-document/:demandeId')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { fileFilter: uploadFileFilter, limits: { fileSize: MAX_UPLOAD_FILE_SIZE } }))
  async soumettreDocument(
    @Param('demandeId', ParseUUIDPipe) demandeId: string,
    @Body('titre') titre: string,
    @Body('typeDocument') typeDocument: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.utilisateursService.soumettreDocumentRegularisation(
      req.user.id, demandeId, file, titre || 'Document', typeDocument || 'AUTRE',
    );
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Body() dto: UpdateProfileDto, @Req() req: any) {
    const ip = req.ip || '0.0.0.0';
    return this.utilisateursService.updateProfile(req.user.id, dto, ip);
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: any) {
    const ip = req.ip || '0.0.0.0';
    return this.utilisateursService.changePassword(req.user.id, dto, ip);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_CENTRE)
  findAll() {
    return this.utilisateursService.findAll();
  }

  @Get('etablissement/:etablissementId')
  @UseGuards(JwtAuthGuard, EtablissementGuard, RolesGuard)
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.PERSONNEL_ADMINISTRATIF)
  findByEtablissement(@Param('etablissementId', ParseUUIDPipe) etablissementId: string, @Req() req: any) {
    if (req.user.role !== Role.ADMIN_CENTRE && req.user.etablissementId !== etablissementId) {
      throw new ForbiddenException('BR-02 : Accès interdit.');
    }
    return this.utilisateursService.findByEtablissement(etablissementId);
  }

  @Put(':id/activer')
  @UseGuards(JwtAuthGuard, EtablissementGuard, RolesGuard)
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  async setActif(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetActifDto, @Req() req: any) {
    const ip = req.ip || '0.0.0.0';
    return this.utilisateursService.setActif(id, dto.actif, req.user.id, ip);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_CENTRE)
  async adminUpdateUser(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AdminUpdateUserDto, @Req() req: any) {
    const ip = req.ip || '0.0.0.0';
    return this.utilisateursService.adminUpdateUser(id, dto, req.user.id, ip);
  }

  @Get(':id/dossier')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  async getDossier(@Param('id', ParseUUIDPipe) id: string) {
    return this.utilisateursService.getDossierUtilisateur(id);
  }

  // ─── Documents Dossier ───────────────────────────────────────────────────────

  @Get(':id/documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  async getDocuments(@Param('id', ParseUUIDPipe) id: string) {
    return this.utilisateursService.getDocumentsDossier(id);
  }

  @Post(':id/documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  @UseInterceptors(FileInterceptor('file', { fileFilter: uploadFileFilter, limits: { fileSize: MAX_UPLOAD_FILE_SIZE } }))
  async ajouterDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('titre') titre: string,
    @Body('typeDocument') typeDocument: string,
    @Body('commentaire') commentaire: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const ip = req.ip || '0.0.0.0';
    return this.utilisateursService.adminAjouterDocumentDossier(
      id, file, titre, typeDocument, commentaire, req.user.id, ip,
    );
  }

  @Delete(':id/documents/:docId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  async supprimerDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Req() req: any,
  ) {
    return this.utilisateursService.adminSupprimerDocumentDossier(docId, req.user.id);
  }

  // ─── Demandes de Régularisation ──────────────────────────────────────────────

  @Get(':id/regularisations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  async getRegularisations(@Param('id', ParseUUIDPipe) id: string) {
    return this.utilisateursService.getDemandesRegularisation(id);
  }

  @Post(':id/regularisations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  async creerRegularisation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreerDemandeRegularisationDto,
    @Req() req: any,
  ) {
    const ip = req.ip || '0.0.0.0';
    return this.utilisateursService.creerDemandeRegularisation(id, dto, req.user.id, ip);
  }

  @Post('regularisations/:demandeId/decision')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  async decisionRegularisation(
    @Param('demandeId', ParseUUIDPipe) demandeId: string,
    @Body() dto: DecisionRegularisationDto,
    @Req() req: any,
  ) {
    const ip = req.ip || '0.0.0.0';
    return this.utilisateursService.prendreDecisionRegularisation(demandeId, dto, req.user.id, ip);
  }

  @Post(':id/reinitialiser-acces')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_CENTRE)
  async reinitialiserAcces(@Param('id', ParseUUIDPipe) id: string, @Body('motDePasse') motDePasse: string, @Req() req: any) {
    const ip = req.ip || '0.0.0.0';
    return this.utilisateursService.adminResetPassword(id, motDePasse, req.user.id, ip);
  }

  @Post(':id/deverrouiller')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_CENTRE)
  async deverrouiller(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const ip = req.ip || '0.0.0.0';
    return this.utilisateursService.adminUnlockAccount(id, req.user.id, ip);
  }
}
