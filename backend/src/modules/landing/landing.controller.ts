import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
  Header,
  Sse,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { StorageService } from '../../common/services/storage.service';
import { LandingService } from './landing.service';
import {
  UpdateLandingSettingsDto,
  CreateLandingSectionDto,
  UpdateLandingSectionDto,
  CreateLandingTemoignageDto,
  UpdateLandingTemoignageDto,
  CreateLandingActualiteDto,
  UpdateLandingActualiteDto,
  ContactMessageDto,
} from './dto/landing.dto';

// Types MIME acceptés pour les médias d'actualités
const ACTUALITE_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

const MAX_MEDIA_SIZE = 100 * 1024 * 1024; // 100 MB

function actualiteMediaFilter(
  _req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!ACTUALITE_MEDIA_MIME_TYPES.includes(file.mimetype)) {
    return callback(
      new Error('Type de fichier non supporté. Formats acceptés : JPG, PNG, WebP, GIF, MP4, WebM, MOV.'),
      false,
    );
  }
  callback(null, true);
}

@Controller('landing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LandingController {
  constructor(
    private service: LandingService,
    private storage: StorageService,
  ) {}

  // --- PUBLIC ENDPOINTS ---
  @Get('public')
  @Public()
  @Header('Cache-Control', 'public, no-cache, must-revalidate')
  async getPublicLandingData(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const data = await this.service.getPublicLandingData();
    const etag = data?._etag || this.service.getCachedLandingEtag();
    if (etag) {
      res.setHeader('ETag', etag);
      const ifNoneMatch = req?.headers?.['if-none-match'];
      if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === `W/${etag}`)) {
        res.status(HttpStatus.NOT_MODIFIED);
        return;
      }
    }
    return data;
  }

  @Get('public/whatsapp')
  @Public()
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  getWhatsappWidget() {
    return this.service.getWhatsappWidget();
  }

  @Get('public/events')
  @Public()
  @Sse()
  streamPublicLanding() {
    return this.service.streamPublicUpdates();
  }

  @Post('contact')
  @Public()
  submitContact(@Body() dto: ContactMessageDto) {
    return this.service.submitContact(dto);
  }

  @Get('contacts')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT, Role.PERSONNEL_ADMINISTRATIF)
  getContactMessages() {
    return this.service.getContactMessages();
  }

  @Delete('contacts/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  deleteContactMessage(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteContactMessage(id);
  }

  // --- ADMIN SETTINGS ---
  @Get('settings')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  getSettings() {
    return this.service.getSettings();
  }

  @Put('settings')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  updateSettings(@Body() dto: UpdateLandingSettingsDto) {
    return this.service.updateSettings(dto);
  }

  // --- ADMIN SECTIONS ---
  @Get('sections')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  getSections(@Query('type') typeSection?: string) {
    return this.service.getSections(typeSection);
  }

  @Post('sections')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  createSection(@Body() dto: CreateLandingSectionDto) {
    return this.service.createSection(dto);
  }

  @Put('sections/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  updateSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLandingSectionDto,
  ) {
    return this.service.updateSection(id, dto);
  }

  @Delete('sections/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  deleteSection(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteSection(id);
  }

  // --- ADMIN ACTUALITÉS & ÉVÉNEMENTS DU CENTRE ---
  @Get('actualites')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  getActualites() {
    return this.service.getActualites();
  }

  @Post('actualites')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  createActualite(@Body() dto: CreateLandingActualiteDto) {
    return this.service.createActualite(dto);
  }

  @Put('actualites/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  updateActualite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLandingActualiteDto,
  ) {
    return this.service.updateActualite(id, dto);
  }

  @Delete('actualites/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  deleteActualite(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteActualite(id);
  }

  /**
   * Upload d'un média (image ou vidéo) pour une actualité.
   * Retourne l'URL publique du fichier téléversé.
   */
  @Post('actualites/upload-media')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: actualiteMediaFilter,
      limits: { fileSize: MAX_MEDIA_SIZE },
    }),
  )
  async uploadActualiteMedia(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }

    const isVideo = file.mimetype.startsWith('video/');
    const folder = isVideo ? 'actualites/videos' : 'actualites/images';
    const url = await this.storage.uploadFile(file.buffer, file.originalname, file.mimetype, folder);

    return {
      url,
      type: isVideo ? 'video' : 'image',
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  // --- ADMIN TEMOIGNAGES ---
  @Get('temoignages')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  getTemoignages() {
    return this.service.getTemoignages();
  }

  @Post('temoignages')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  createTemoignage(@Body() dto: CreateLandingTemoignageDto) {
    return this.service.createTemoignage(dto);
  }

  @Put('temoignages/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  updateTemoignage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLandingTemoignageDto,
  ) {
    return this.service.updateTemoignage(id, dto);
  }

  @Delete('temoignages/:id')
  @Roles(Role.ADMIN_CENTRE, Role.ADMIN_ETABLISSEMENT)
  deleteTemoignage(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteTemoignage(id);
  }
}
