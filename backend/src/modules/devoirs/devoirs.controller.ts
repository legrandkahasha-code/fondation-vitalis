import {
  Controller, Get, Post, Put, Delete, Param, Body, Req, UseGuards, UseInterceptors, UploadedFile, ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EtablissementGuard } from '../../common/guards/etablissement.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { DevoirsService } from './devoirs.service';
import { CreateDevoirDto, NoterDevoirDto, UpdateDevoirDto } from './dto/devoirs.dto';
import { uploadFileFilter, MAX_UPLOAD_FILE_SIZE } from '../../common/utils/file-upload.util';

@Controller('devoirs')
@UseGuards(JwtAuthGuard, EtablissementGuard, RolesGuard)
export class DevoirsController {
  constructor(private service: DevoirsService) {}

  @Post('module/:moduleId')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  create(@Param('moduleId', ParseUUIDPipe) moduleId: string, @Body() dto: CreateDevoirDto, @Req() req: any) {
    return this.service.create(moduleId, dto, req.user);
  }

  @Get('module/:moduleId')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR, Role.APPRENANT)
  findByModule(@Param('moduleId', ParseUUIDPipe) moduleId: string, @Req() req: any) {
    return this.service.findByModule(moduleId, req.user);
  }

  @Get('mes/soumissions')
  @Roles(Role.APPRENANT)
  mesSoumissions(@Req() req: any) {
    return this.service.mesSoumissions(req.user.id);
  }

  @Get('formateur/a-corriger')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  getDevoirsACorriger(@Req() req: any) {
    return this.service.getDevoirsACorriger(req.user);
  }

  @Get(':id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR, Role.APPRENANT)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.findOne(id, req.user);
  }

  @Post(':id/submit')
  @Roles(Role.APPRENANT)
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: uploadFileFilter,
      limits: { fileSize: MAX_UPLOAD_FILE_SIZE },
    }),
  )
  submit(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: Express.Multer.File, @Req() req: any) {
    return this.service.submit(id, file, req.user);
  }

  @Put(':id/noter/:apprenantId')
  @Roles(Role.FORMATEUR, Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  noter(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('apprenantId', ParseUUIDPipe) apprenantId: string,
    @Body() dto: NoterDevoirDto,
    @Req() req: any,
  ) {
    return this.service.noter(id, apprenantId, dto.note, dto.commentaire ?? '', req.user);
  }

  @Put(':id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDevoirDto, @Req() req: any) {
    return this.service.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.FORMATEUR)
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.delete(id, req.user);
  }
}
