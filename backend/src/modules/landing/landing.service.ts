import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'crypto';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  UpdateLandingSettingsDto,
  CreateLandingSectionDto,
  UpdateLandingSectionDto,
  CreateLandingTemoignageDto,
  UpdateLandingTemoignageDto,
  CreateLandingActualiteDto,
  UpdateLandingActualiteDto,
  CreateLandingFormateurDto,
  UpdateLandingFormateurDto,
  CreateLandingCampusDto,
  UpdateLandingCampusDto,
  CreateLandingPartenaireDto,
  UpdateLandingPartenaireDto,
  NewsletterSubscribeDto,
  ContactMessageDto,
} from './dto/landing.dto';
import { DEFAULT_WHATSAPP_MESSAGE, toWhatsappE164, buildWhatsappUrlLenient, isWhatsappEnabled } from '../../common/utils/whatsapp.util';

interface CachedLandingEntry {
  data: any;
  etag: string;
  expiry: number;
}

@Injectable()
export class LandingService {
  private static cachedLandingData: CachedLandingEntry | null = null;
  private static readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  private get db(): any {
    return this.prisma;
  }

  public static invalidateCache() {
    LandingService.cachedLandingData = null;
  }

  public invalidateLandingCache() {
    LandingService.invalidateCache();
  }

  public getCachedLandingEtag(): string | null {
    return LandingService.cachedLandingData?.etag || null;
  }

  /** Flux public : les visiteurs reçoivent l'activation/désactivation sans recharger la page. */
  streamPublicUpdates(): Observable<MessageEvent> {
    return this.notificationsService.stream().pipe(
      filter(
        (payload) =>
          payload.type === 'LANDING_UPDATE' ||
          payload.type === 'FORMATION_UPDATE' ||
          payload.type === 'ACTUALITE_UPDATE' ||
          payload.type === 'HEARTBEAT',
      ),
      map((payload) => ({ data: payload }) as unknown as MessageEvent),
    );
  }

  /**
   * Retourne toutes les données de la landing page pour les visiteurs publics en 1 seul appel (< 1ms avec RAM Cache)
   */
  async getPublicLandingData() {
    if (LandingService.cachedLandingData && LandingService.cachedLandingData.expiry > Date.now()) {
      return LandingService.cachedLandingData.data;
    }

    // 1. Récupérer ou initialiser les paramètres
    let settings = await this.db.landingPageSettings.findFirst();
    if (!settings) {
      settings = await this.seedDefaultSettings();
    }

    // 2. Récupérer les sections actives classées par ordre
    let sections = await this.db.landingPageSection.findMany({
      where: { actif: true },
      orderBy: { ordre: 'asc' },
    });

    // 3. Si aucune section n'existe en base, initialiser les sections par défaut
    if (sections.length === 0) {
      const countSections = await this.db.landingPageSection.count();
      if (countSections === 0) {
        await this.seedDefaultSections();
        sections = await this.db.landingPageSection.findMany({
          where: { actif: true },
          orderBy: { ordre: 'asc' },
        });
      }
    }

    const allSections = sections;

    // Grouper les sections par type
    const avantages = allSections.filter((s: any) => s.typeSection === 'avantage');
    const pedagogie = allSections.filter((s: any) => s.typeSection === 'pedagogie');
    const admission = allSections.filter((s: any) => s.typeSection === 'admission');
    const secteurs = allSections.filter((s: any) => s.typeSection === 'secteur');
    const faq = allSections.filter((s: any) => s.typeSection === 'faq');

    // 4. Récupérer les actualités actives
    let actualites = await this.db.landingPageActualite.findMany({
      where: { actif: true },
      orderBy: [{ aLaUne: 'desc' }, { ordre: 'asc' }, { datePublication: 'desc' }],
    });

    if (actualites.length === 0) {
      const countActualites = await this.db.landingPageActualite.count();
      if (countActualites === 0) {
        await this.seedDefaultActualites();
        actualites = await this.db.landingPageActualite.findMany({
          where: { actif: true },
          orderBy: [{ aLaUne: 'desc' }, { ordre: 'asc' }, { datePublication: 'desc' }],
        });
      }
    }

    // 5. Récupérer les témoignages actifs
    let temoignages = await this.db.landingPageTemoignage.findMany({
      where: { actif: true },
      orderBy: { ordre: 'asc' },
    });

    if (temoignages.length === 0) {
      const countTem = await this.db.landingPageTemoignage.count();
      if (countTem === 0) {
        await this.seedDefaultTemoignages();
        temoignages = await this.db.landingPageTemoignage.findMany({
          where: { actif: true },
          orderBy: { ordre: 'asc' },
        });
      }
    }

    // 6. Récupérer les Formateurs d'élite actifs
    let formateurs = await this.db.landingPageFormateur.findMany({
      where: { actif: true },
      orderBy: { ordre: 'asc' },
    });

    if (formateurs.length === 0) {
      const countFormateurs = await this.db.landingPageFormateur.count();
      if (countFormateurs === 0) {
        await this.seedDefaultFormateurs();
        formateurs = await this.db.landingPageFormateur.findMany({
          where: { actif: true },
          orderBy: { ordre: 'asc' },
        });
      }
    }

    // 7. Récupérer les Espaces Campus / Ateliers actifs
    let campus = await this.db.landingPageCampus.findMany({
      where: { actif: true },
      orderBy: { ordre: 'asc' },
    });

    if (campus.length === 0) {
      const countCampus = await this.db.landingPageCampus.count();
      if (countCampus === 0) {
        await this.seedDefaultCampus();
        campus = await this.db.landingPageCampus.findMany({
          where: { actif: true },
          orderBy: { ordre: 'asc' },
        });
      }
    }

    // 8. Récupérer les Logos Partenaires actifs
    let partenaires = await this.db.landingPagePartenaire.findMany({
      where: { actif: true },
      orderBy: { ordre: 'asc' },
    });

    if (partenaires.length === 0) {
      const countPartenaires = await this.db.landingPagePartenaire.count();
      if (countPartenaires === 0) {
        await this.seedDefaultPartenaires();
        partenaires = await this.db.landingPagePartenaire.findMany({
          where: { actif: true },
          orderBy: { ordre: 'asc' },
        });
      }
    }

    // 9. Récupérer les catégories de formations officielles actives
    const categories = await this.prisma.categorieFormation.findMany({
      where: { actif: true },
      orderBy: [{ ordre: 'asc' }, { libelle: 'asc' }],
    });

    // 10. Récupérer les formations publiées de la base de données avec filière et niveau
    const formationsDb = await this.prisma.formation.findMany({
      where: {
        actif: true,
        publieSurLanding: true,
      },
      include: {
        _count: {
          select: { modules: true },
        },
        formationReferentiel: {
          include: {
            filiere: true,
            niveau: true,
          },
        },
      },
      orderBy: [
        { aLaUne: 'desc' },
        { ordre: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 50,
    });

    const result = {
      settings: {
        ...settings,
        whatsappActif: isWhatsappEnabled(settings?.whatsappActif),
      },
      sections: {
        avantages,
        pedagogie,
        admission,
        secteurs,
        faq,
      },
      temoignages,
      actualites,
      formateurs,
      campus,
      partenaires,
      categories,
      formations: formationsDb.map((f: any) => {
        const ref = f.formationReferentiel;
        const filiere = ref?.filiere;
        const niveau = ref?.niveau;

        // Catégorisation avec priorité à la catégorie explicite
        let categorieCode: string = f.categorie || 'tech';
        let filiereNom = filiere?.libelle || '';
        const fCode = (filiere?.code || '').toUpperCase();
        const fLib = filiereNom.toLowerCase();
        const titreLower = (f.titre || '').toLowerCase();

        if (!f.categorie) {
          if (
            fCode.includes('GEST') ||
            fCode.includes('MGT') ||
            fLib.includes('gestion') ||
            fLib.includes('management') ||
            fLib.includes('finance') ||
            titreLower.includes('gestion') ||
            titreLower.includes('marché') ||
            titreLower.includes('compta') ||
            titreLower.includes('management')
          ) {
            categorieCode = 'gestion';
          } else if (
            fCode.includes('TECH') ||
            fCode.includes('ELEC') ||
            fCode.includes('BTP') ||
            fLib.includes('technique') ||
            fLib.includes('électric') ||
            titreLower.includes('électric') ||
            titreLower.includes('btp') ||
            titreLower.includes('énergie') ||
            titreLower.includes('mécanique')
          ) {
            categorieCode = 'technique';
          }
        }

        const debouchesDefaut = categorieCode === 'gestion'
          ? 'Manager, Gestionnaire de projets, Auditeur, Responsable Administratif'
          : categorieCode === 'technique'
          ? 'Technicien Supérieur, Superviseur Technique, Installateur Spécialisé'
          : 'Développeur d\'Applications, Spécialiste Systèmes & Réseaux, Consultant IT';

        return {
          id: f.id,
          titre: f.titre,
          code: f.code,
          description: f.description || '',
          duree: f.duree || '40 Heures',
          debouches: f.debouches || debouchesDefaut,
          prerequis: f.prerequis || (niveau?.libelle ? `Niveau ${niveau.libelle} ou expérience équivalente` : 'Niveau secondaire ou test de positionnement'),
          badgeTexte: f.badgeTexte || (f.aLaUne ? '⭐ Formation Vedette' : 'Session ouverte'),
          aLaUne: Boolean(f.aLaUne),
          modulesCount: f._count?.modules || 0,
          filiereId: filiere?.id || null,
          filiereCode: filiere?.code || null,
          filiereNom: filiere?.libelle || null,
          niveauCode: niveau?.code || null,
          niveauNom: niveau?.libelle || null,
          categorieOfficielle: categorieCode,
          imageUrl: f.imageUrl || null,
          syllabusUrl: f.syllabusUrl || null,
          createdAt: f.createdAt,
        };
      }),
    };

    // Calculer le hash ETag pour validation HTTP conditionnelle
    const serialized = JSON.stringify(result);
    const etag = `"${createHash('md5').update(serialized).digest('hex')}"`;
    const payloadWithEtag = { ...result, _etag: etag };

    LandingService.cachedLandingData = {
      data: payloadWithEtag,
      etag,
      expiry: Date.now() + LandingService.TTL_MS,
    };

    return payloadWithEtag;
  }

  // --- CATALOGUE PUBLIC FORMATIONS ---
  async getPublicFilieres() {
    return this.prisma.filiere.findMany({
      where: { actif: true },
      select: {
        id: true,
        libelle: true,
        code: true,
        description: true,
      },
      orderBy: [{ ordre: 'asc' }, { libelle: 'asc' }],
    });
  }

  async getPublicNiveaux() {
    return this.prisma.niveau.findMany({
      where: { actif: true },
      select: {
        id: true,
        libelle: true,
        code: true,
      },
      orderBy: [{ ordre: 'asc' }, { libelle: 'asc' }],
    });
  }

  async getPublicFormationsCatalogue(params: {
    search?: string;
    filiereId?: string;
    niveauId?: string;
    etablissementId?: string;
    page?: number;
    take?: number;
  }) {
    const { search, filiereId, niveauId, etablissementId, page = 1, take = 20 } = params;
    const realTake = Math.min(Math.max(1, Number(take) || 20), 100);
    const realPage = Math.max(1, Number(page) || 1);
    const skip = (realPage - 1) * realTake;

    const where: any = {
      actif: true,
      publieSurLanding: true,
    };

    if (etablissementId) {
      where.etablissementId = etablissementId;
    }

    const andClauses: any[] = [];

    if (search) {
      andClauses.push({
        OR: [
          { titre: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (filiereId) {
      const sessionsWithFiliere = await this.prisma.sessionAdmission.findMany({
        where: { filiereId },
        select: { formationId: true },
      });
      const sessionFormationIds = sessionsWithFiliere
        .map((s: any) => s.formationId)
        .filter((x: any) => typeof x === 'string');

      andClauses.push({
        OR: [
          { formationReferentiel: { filiereId } },
          { id: { in: sessionFormationIds } },
        ],
      });
    }

    if (niveauId) {
      const sessionsWithNiveau = await this.prisma.sessionAdmission.findMany({
        where: { niveauId },
        select: { formationId: true },
      });
      const sessionFormationIdsNiv = sessionsWithNiveau
        .map((s: any) => s.formationId)
        .filter((x: any) => typeof x === 'string');

      andClauses.push({
        OR: [
          { formationReferentiel: { niveauId } },
          { id: { in: sessionFormationIdsNiv } },
        ],
      });
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const [items, total] = await Promise.all([
      this.prisma.formation.findMany({
        where,
        skip,
        take: realTake,
        orderBy: [
          { aLaUne: 'desc' },
          { ordre: 'asc' },
          { createdAt: 'desc' },
        ],
        include: {
          _count: { select: { modules: true } },
          formationReferentiel: {
            include: {
              filiere: true,
              niveau: true,
            },
          },
        },
      }),
      this.prisma.formation.count({ where }),
    ]);

    const formations = items.map((f: any) => {
      const ref = f.formationReferentiel;
      const filiere = ref?.filiere;
      const niveau = ref?.niveau;

      let categorieCode: string = f.categorie || 'tech';
      const fCode = (filiere?.code || '').toUpperCase();
      const fLib = (filiere?.libelle || '').toLowerCase();
      const titreLower = (f.titre || '').toLowerCase();

      if (!f.categorie) {
        if (
          fCode.includes('GEST') || fCode.includes('MGT') ||
          fLib.includes('gestion') || fLib.includes('management') || fLib.includes('finance') ||
          titreLower.includes('gestion') || titreLower.includes('marché') ||
          titreLower.includes('compta') || titreLower.includes('management')
        ) {
          categorieCode = 'gestion';
        } else if (
          fCode.includes('TECH') || fCode.includes('ELEC') || fCode.includes('BTP') ||
          fLib.includes('technique') || fLib.includes('électric') ||
          titreLower.includes('électric') || titreLower.includes('btp') ||
          titreLower.includes('énergie') || titreLower.includes('mécanique')
        ) {
          categorieCode = 'technique';
        }
      }

      return {
        id: f.id,
        titre: f.titre,
        code: f.code,
        description: f.description || '',
        duree: f.duree || '40 Heures',
        debouches: f.debouches || '',
        prerequis: f.prerequis || '',
        aLaUne: Boolean(f.aLaUne),
        modulesCount: f._count?.modules || 0,
        visibilite: f.visibilite || 'INSCRITS_SEULEMENT',
        filiereId: filiere?.id || null,
        filiereCode: filiere?.code || null,
        filiereNom: filiere?.libelle || null,
        niveauId: niveau?.id || null,
        niveauCode: niveau?.code || null,
        niveauNom: niveau?.libelle || null,
        categorieOfficielle: categorieCode,
        imageUrl: f.imageUrl || null,
        syllabusUrl: f.syllabusUrl || null,
        createdAt: f.createdAt,
      };
    });

    return {
      items: formations,
      total,
      page: realPage,
      take: realTake,
      pages: Math.ceil(total / realTake),
    };
  }

  // --- SETTINGS ---
  async getSettings() {
    let settings = await this.db.landingPageSettings.findFirst();
    if (!settings) {
      settings = await this.seedDefaultSettings();
    }
    return settings;
  }

  async getWhatsappWidget() {
    const settings = await this.getSettings();
    const actif = isWhatsappEnabled(settings?.whatsappActif);
    const url =
      buildWhatsappUrlLenient(settings?.contactWhatsapp, settings?.whatsappMessage) ||
      buildWhatsappUrlLenient(settings?.contactTelephone, settings?.whatsappMessage);
    return { actif, url: url || '', numero: settings?.contactWhatsapp || null };
  }

  async updateSettings(dto: UpdateLandingSettingsDto | any) {
    const existing = await this.getSettings();
    const { id, createdAt, updatedAt, ...cleanData } = dto || {};
    
    if (cleanData.statsLaureats !== undefined) cleanData.statsLaureats = Number(cleanData.statsLaureats);
    if (cleanData.statsTauxReussite !== undefined) cleanData.statsTauxReussite = Number(cleanData.statsTauxReussite);
    if (cleanData.statsFilieres !== undefined) cleanData.statsFilieres = Number(cleanData.statsFilieres);
    if (cleanData.statsTitresVerif !== undefined) cleanData.statsTitresVerif = Number(cleanData.statsTitresVerif);
    if (cleanData.whatsappActif !== undefined) {
      cleanData.whatsappActif = cleanData.whatsappActif === true || cleanData.whatsappActif === 'true';
    }

    if (cleanData.videoActif !== undefined) {
      cleanData.videoActif = cleanData.videoActif === true || cleanData.videoActif === 'true';
    }

    if (cleanData.videoPresentationUrl !== undefined) {
      const videoUrl = String(cleanData.videoPresentationUrl ?? '').trim();
      // Ne PAS convertir les vidéos locales téléversées — elles doivent rester en chemin natif
      if (videoUrl && !videoUrl.startsWith('/uploads/') && !videoUrl.includes('/vitalis-media/')) {
        cleanData.videoPresentationUrl = this.formatVideoEmbedUrl(videoUrl);
      } else {
        cleanData.videoPresentationUrl = videoUrl || null;
      }
    }

    if (cleanData.whatsappMessage !== undefined) {
      const message = String(cleanData.whatsappMessage ?? '').trim();
      cleanData.whatsappMessage = message || DEFAULT_WHATSAPP_MESSAGE;
    }

    if (cleanData.contactWhatsapp !== undefined) {
      const raw = String(cleanData.contactWhatsapp ?? '').trim();
      if (!raw) {
        cleanData.contactWhatsapp = null;
      } else {
        const e164 = toWhatsappE164(raw);
        if (!e164) {
          throw new BadRequestException(
            'Numéro WhatsApp invalide. Saisissez un numéro RDC au format international (ex. +243 843 010 337).',
          );
        }
        cleanData.contactWhatsapp = e164;
      }
    }

    const updated = await this.db.landingPageSettings.update({
      where: { id: existing.id },
      data: cleanData,
    });

    this.invalidateLandingCache();
    try {
      this.notificationsService.emit({
        type: 'LANDING_UPDATE',
        message: 'Paramètres de la page d\'accueil mis à jour',
        data: { whatsappActif: updated.whatsappActif },
      });
    } catch {
      /* le flux SSE n'est pas bloquant */
    }

    return updated;
  }

  // --- SECTIONS ---
  async getSections(typeSection?: string) {
    return this.db.landingPageSection.findMany({
      where: typeSection ? { typeSection } : undefined,
      orderBy: { ordre: 'asc' },
    });
  }

  async createSection(dto: CreateLandingSectionDto | any) {
    this.invalidateLandingCache();
    const { id, createdAt, updatedAt, ...cleanData } = dto || {};
    return this.db.landingPageSection.create({
      data: {
        typeSection: cleanData.typeSection,
        titre: cleanData.titre,
        sousTitre: cleanData.sousTitre || null,
        description: cleanData.description || null,
        categorie: cleanData.categorie || null,
        ordre: cleanData.ordre !== undefined ? Number(cleanData.ordre) : 0,
        couleur: cleanData.couleur || null,
        icone: cleanData.icone || null,
        actif: cleanData.actif !== undefined ? Boolean(cleanData.actif) : true,
      },
    });
  }

  async updateSection(id: string, dto: UpdateLandingSectionDto | any) {
    this.invalidateLandingCache();
    const section = await this.db.landingPageSection.findUnique({ where: { id } });
    if (!section) throw new NotFoundException('Section introuvable.');

    const { id: _, createdAt, updatedAt, ...cleanData } = dto || {};
    if (cleanData.ordre !== undefined) cleanData.ordre = Number(cleanData.ordre);
    if (cleanData.actif !== undefined) cleanData.actif = Boolean(cleanData.actif);

    return this.db.landingPageSection.update({
      where: { id },
      data: cleanData,
    });
  }

  async deleteSection(id: string) {
    this.invalidateLandingCache();
    const section = await this.db.landingPageSection.findUnique({ where: { id } });
    if (!section) throw new NotFoundException('Section introuvable.');

    return this.db.landingPageSection.delete({ where: { id } });
  }

  // --- ACTUALITÉS & ÉVÉNEMENTS DU CENTRE VITALIS ---
  async getActualites() {
    return this.db.landingPageActualite.findMany({
      orderBy: [{ aLaUne: 'desc' }, { ordre: 'asc' }, { datePublication: 'desc' }],
    });
  }

  async createActualite(dto: CreateLandingActualiteDto | any) {
    this.invalidateLandingCache();
    const { id, createdAt, updatedAt, ...cleanData } = dto || {};
    const created = await this.db.landingPageActualite.create({
      data: {
        titre: cleanData.titre,
        chapeau: cleanData.chapeau || null,
        contenu: cleanData.contenu || null,
        categorie: cleanData.categorie || 'VIE_DU_CENTRE',
        imageUrl: cleanData.imageUrl || null,
        videoUrl: cleanData.videoUrl || null,
        badgeCouleur: cleanData.badgeCouleur || '#1C75BC',
        datePublication: cleanData.datePublication ? new Date(cleanData.datePublication) : new Date(),
        auteur: cleanData.auteur || 'Direction de la Communication',
        aLaUne: cleanData.aLaUne !== undefined ? Boolean(cleanData.aLaUne) : false,
        ordre: cleanData.ordre !== undefined ? Number(cleanData.ordre) : 0,
        actif: cleanData.actif !== undefined ? Boolean(cleanData.actif) : true,
      },
    });

    try {
      this.notificationsService.emit({
        type: 'ACTUALITE_UPDATE',
        message: `Nouvelle actualité publiée : ${created.titre}`,
        data: created,
      });
    } catch (e) {}

    return created;
  }

  async updateActualite(id: string, dto: UpdateLandingActualiteDto | any) {
    this.invalidateLandingCache();
    const actualite = await this.db.landingPageActualite.findUnique({ where: { id } });
    if (!actualite) throw new NotFoundException('Actualité introuvable.');

    const { id: _, createdAt, updatedAt, ...cleanData } = dto || {};
    if (cleanData.ordre !== undefined) cleanData.ordre = Number(cleanData.ordre);
    if (cleanData.actif !== undefined) cleanData.actif = Boolean(cleanData.actif);
    if (cleanData.aLaUne !== undefined) cleanData.aLaUne = Boolean(cleanData.aLaUne);
    if (cleanData.datePublication) cleanData.datePublication = new Date(cleanData.datePublication);

    const updated = await this.db.landingPageActualite.update({
      where: { id },
      data: cleanData,
    });

    try {
      this.notificationsService.emit({
        type: 'ACTUALITE_UPDATE',
        message: `Actualité mise à jour : ${updated.titre}`,
        data: updated,
      });
    } catch (e) {}

    return updated;
  }

  async deleteActualite(id: string) {
    this.invalidateLandingCache();
    const actualite = await this.db.landingPageActualite.findUnique({ where: { id } });
    if (!actualite) throw new NotFoundException('Actualité introuvable.');

    const res = await this.db.landingPageActualite.delete({ where: { id } });

    try {
      this.notificationsService.emit({
        type: 'ACTUALITE_UPDATE',
        message: `Actualité supprimée : ${actualite.titre}`,
      });
    } catch (e) {}

    return res;
  }

  // --- TÉMOIGNAGES ---
  async getTemoignages() {
    return this.db.landingPageTemoignage.findMany({
      orderBy: { ordre: 'asc' },
    });
  }

  async createTemoignage(dto: CreateLandingTemoignageDto | any) {
    this.invalidateLandingCache();
    const { id, createdAt, updatedAt, ...cleanData } = dto || {};
    return this.db.landingPageTemoignage.create({
      data: {
        nom: cleanData.nom || cleanData.nomPrenom || 'Diplômé Vitalis',
        initiales: cleanData.initiales || '',
        role: cleanData.role || cleanData.fonction || 'Lauréat certifié',
        fonction: cleanData.fonction || cleanData.role || null,
        entreprise: cleanData.entreprise || null,
        photoUrl: cleanData.photoUrl || cleanData.photo || null,
        note: cleanData.note !== undefined ? Number(cleanData.note) : 5,
        promotion: cleanData.promotion || null,
        citation: cleanData.citation || cleanData.texte || '',
        couleur: cleanData.couleur || '#1C75BC',
        ordre: cleanData.ordre !== undefined ? Number(cleanData.ordre) : 0,
        actif: cleanData.actif !== undefined ? Boolean(cleanData.actif) : true,
      },
    });
  }

  async updateTemoignage(id: string, dto: UpdateLandingTemoignageDto | any) {
    this.invalidateLandingCache();
    const temoignage = await this.db.landingPageTemoignage.findUnique({ where: { id } });
    if (!temoignage) throw new NotFoundException('Témoignage introuvable.');

    const { id: _, createdAt, updatedAt, ...cleanData } = dto || {};
    if (cleanData.ordre !== undefined) cleanData.ordre = Number(cleanData.ordre);
    if (cleanData.actif !== undefined) cleanData.actif = Boolean(cleanData.actif);
    if (cleanData.note !== undefined) cleanData.note = Number(cleanData.note);
    if (cleanData.photo && !cleanData.photoUrl) cleanData.photoUrl = cleanData.photo;
    if (cleanData.texte && !cleanData.citation) cleanData.citation = cleanData.texte;

    return this.db.landingPageTemoignage.update({
      where: { id },
      data: cleanData,
    });
  }

  async deleteTemoignage(id: string) {
    this.invalidateLandingCache();
    const temoignage = await this.db.landingPageTemoignage.findUnique({ where: { id } });
    if (!temoignage) throw new NotFoundException('Témoignage introuvable.');

    return this.db.landingPageTemoignage.delete({ where: { id } });
  }

  // --- FORMATEURS D'ÉLITE ---
  async getFormateurs() {
    return this.db.landingPageFormateur.findMany({
      orderBy: { ordre: 'asc' },
    });
  }

  async createFormateur(dto: CreateLandingFormateurDto | any) {
    this.invalidateLandingCache();
    const { id, createdAt, updatedAt, ...cleanData } = dto || {};
    return this.db.landingPageFormateur.create({
      data: {
        nom: cleanData.nom,
        titre: cleanData.titre,
        specialite: cleanData.specialite,
        experience: cleanData.experience,
        photoUrl: cleanData.photoUrl || cleanData.photo || null,
        linkedin: cleanData.linkedin || null,
        ordre: cleanData.ordre !== undefined ? Number(cleanData.ordre) : 0,
        actif: cleanData.actif !== undefined ? Boolean(cleanData.actif) : true,
      },
    });
  }

  async updateFormateur(id: string, dto: UpdateLandingFormateurDto | any) {
    this.invalidateLandingCache();
    const formateur = await this.db.landingPageFormateur.findUnique({ where: { id } });
    if (!formateur) throw new NotFoundException('Formateur introuvable.');

    const { id: _, createdAt, updatedAt, ...cleanData } = dto || {};
    if (cleanData.ordre !== undefined) cleanData.ordre = Number(cleanData.ordre);
    if (cleanData.actif !== undefined) cleanData.actif = Boolean(cleanData.actif);
    if (cleanData.photo && !cleanData.photoUrl) cleanData.photoUrl = cleanData.photo;

    return this.db.landingPageFormateur.update({
      where: { id },
      data: cleanData,
    });
  }

  async deleteFormateur(id: string) {
    this.invalidateLandingCache();
    const formateur = await this.db.landingPageFormateur.findUnique({ where: { id } });
    if (!formateur) throw new NotFoundException('Formateur introuvable.');

    return this.db.landingPageFormateur.delete({ where: { id } });
  }

  // --- ESPACES CAMPUS & ATELIERS TECHNIQUES ---
  async getCampus() {
    return this.db.landingPageCampus.findMany({
      orderBy: { ordre: 'asc' },
    });
  }

  async createCampus(dto: CreateLandingCampusDto | any) {
    this.invalidateLandingCache();
    const { id, createdAt, updatedAt, ...cleanData } = dto || {};
    return this.db.landingPageCampus.create({
      data: {
        titre: cleanData.titre,
        description: cleanData.description,
        photoUrl: cleanData.photoUrl || cleanData.photo || null,
        badge: cleanData.badge || null,
        equipements: cleanData.equipements,
        ordre: cleanData.ordre !== undefined ? Number(cleanData.ordre) : 0,
        actif: cleanData.actif !== undefined ? Boolean(cleanData.actif) : true,
      },
    });
  }

  async updateCampus(id: string, dto: UpdateLandingCampusDto | any) {
    this.invalidateLandingCache();
    const campus = await this.db.landingPageCampus.findUnique({ where: { id } });
    if (!campus) throw new NotFoundException('Espace campus introuvable.');

    const { id: _, createdAt, updatedAt, ...cleanData } = dto || {};
    if (cleanData.ordre !== undefined) cleanData.ordre = Number(cleanData.ordre);
    if (cleanData.actif !== undefined) cleanData.actif = Boolean(cleanData.actif);
    if (cleanData.photo && !cleanData.photoUrl) cleanData.photoUrl = cleanData.photo;

    return this.db.landingPageCampus.update({
      where: { id },
      data: cleanData,
    });
  }

  async deleteCampus(id: string) {
    this.invalidateLandingCache();
    const campus = await this.db.landingPageCampus.findUnique({ where: { id } });
    if (!campus) throw new NotFoundException('Espace campus introuvable.');

    return this.db.landingPageCampus.delete({ where: { id } });
  }

  // --- LOGOS PARTENAIRES ---
  async getPartenaires() {
    return this.db.landingPagePartenaire.findMany({
      orderBy: { ordre: 'asc' },
    });
  }

  async createPartenaire(dto: CreateLandingPartenaireDto | any) {
    this.invalidateLandingCache();
    const { id, createdAt, updatedAt, ...cleanData } = dto || {};
    return this.db.landingPagePartenaire.create({
      data: {
        nom: cleanData.nom,
        logoUrl: cleanData.logoUrl || cleanData.logo,
        secteur: cleanData.secteur || null,
        siteWeb: cleanData.siteWeb || null,
        ordre: cleanData.ordre !== undefined ? Number(cleanData.ordre) : 0,
        actif: cleanData.actif !== undefined ? Boolean(cleanData.actif) : true,
      },
    });
  }

  async updatePartenaire(id: string, dto: UpdateLandingPartenaireDto | any) {
    this.invalidateLandingCache();
    const partenaire = await this.db.landingPagePartenaire.findUnique({ where: { id } });
    if (!partenaire) throw new NotFoundException('Partenaire introuvable.');

    const { id: _, createdAt, updatedAt, ...cleanData } = dto || {};
    if (cleanData.ordre !== undefined) cleanData.ordre = Number(cleanData.ordre);
    if (cleanData.actif !== undefined) cleanData.actif = Boolean(cleanData.actif);
    if (cleanData.logo && !cleanData.logoUrl) cleanData.logoUrl = cleanData.logo;

    return this.db.landingPagePartenaire.update({
      where: { id },
      data: cleanData,
    });
  }

  async deletePartenaire(id: string) {
    this.invalidateLandingCache();
    const partenaire = await this.db.landingPagePartenaire.findUnique({ where: { id } });
    if (!partenaire) throw new NotFoundException('Partenaire introuvable.');

    return this.db.landingPagePartenaire.delete({ where: { id } });
  }

  // --- NEWSLETTER / ALERTES ADMISSION ---
  async subscribeNewsletter(dto: NewsletterSubscribeDto) {
    const email = (dto.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Adresse email invalide.');
    }

    const existing = await this.db.landingNewsletterAbonne.findUnique({
      where: { email },
    });

    if (existing) {
      if (!existing.actif) {
        await this.db.landingNewsletterAbonne.update({
          where: { id: existing.id },
          data: { actif: true },
        });
      }
      return {
        success: true,
        message: 'Vous êtes déjà inscrit aux alertes officielles d\'admission Vitalis Center.',
      };
    }

    const abonne = await this.db.landingNewsletterAbonne.create({
      data: { email, actif: true },
    });

    try {
      this.notificationsService.emit({
        type: 'NEWSLETTER_SUBSCRIBE',
        message: `Nouvel abonné aux alertes de session : ${email}`,
        data: abonne,
      });
    } catch {}

    return {
      success: true,
      message: 'Inscription confirmée ! Vous recevrez nos alertes officielles d\'ouverture des sessions.',
      data: { id: abonne.id },
    };
  }

  async getNewsletterAbonnes() {
    return this.db.landingNewsletterAbonne.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteNewsletterAbonne(id: string) {
    const existing = await this.db.landingNewsletterAbonne.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Abonné introuvable.');

    return this.db.landingNewsletterAbonne.delete({ where: { id } });
  }

  // --- CONTACT MESSAGE ---
  async submitContact(dto: ContactMessageDto) {
    // Protection anti-bot Honeypot invisible (OWASP recommendation)
    if (dto.honeypot && dto.honeypot.trim() !== '') {
      return {
        success: true,
        message: 'Votre demande d\'orientation a été enregistrée avec succès. Notre équipe prendra contact avec vous.',
        data: { id: 'bot-filtered' },
      };
    }

    const saved = await this.db.contactMessage.create({
      data: {
        nom: dto.nom?.trim(),
        telephone: dto.telephone?.trim(),
        filiere: dto.filiere?.trim() || null,
        message: dto.message?.trim() || null,
        email: dto.email?.trim() || null,
      },
    });

    try {
      this.notificationsService.emit({
        type: 'DEMANDE_ORIENTATION',
        message: `Nouvelle demande d'orientation de ${saved.nom} (${saved.telephone}) - Filière : ${saved.filiere || 'Générale'}`,
        data: saved,
      });
    } catch {
      // Non-fatal
    }

    return {
      success: true,
      message: 'Votre demande d\'orientation a été enregistrée avec succès. Notre équipe prendra contact avec vous.',
      data: { id: saved.id },
    };
  }

  async getContactMessages() {
    return this.db.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteContactMessage(id: string) {
    const existing = await this.db.contactMessage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Demande d\'orientation introuvable.');
    return this.db.contactMessage.delete({ where: { id } });
  }

  // --- SEEDERS DES VALEURS INITIALES ---
  private async seedDefaultSettings() {
    return this.db.landingPageSettings.create({
      data: {
        heroTitre: 'Vitalis Center, la formation professionnelle reconnue par l\'État',
        heroSousTitre:
          'Vitalis Center EUP forme les professionnels, cadres et jeunes talents aux métiers d\'avenir sous la tutelle du Ministère de la Formation Professionnelle. Validation par compétences pratiques, encadrement expert et délivrance de certificats officiels infalsifiables.',
        heroNumeroAgrement: 'N°CFP 00095/MIN-FP/DG-FP/KMG/JPU/2026',
        heroImage: null,
        heroBadge1Texte: '94% Insertion Professionnelle',
        heroBadge2Texte: 'Agrément Officiel RDC',
        heroBadge3Texte: 'Certificats Infalsifiables',
        topbarTexte: 'République Démocratique du Congo · Ministère de la Formation Professionnelle',
        statsLaureats: 1200,
        statsTauxReussite: 94,
        statsFilieres: 15,
        statsTitresVerif: 100,
        ctaTitre: 'Prêt à développer des compétences certifiées ?',
        ctaSousTitre: 'Les inscriptions pour la session 2026 sont actuellement ouvertes.',
        formationsSurMesureTitre: 'Formations intra-entreprise & sur mesure',
        formationsSurMesureDescription: 'Nous concevons des programmes spécialisés pour les ministères et entreprises publiques et privées.',
        verifTitre: 'Vérifier l\'Authenticité d\'un Certificat',
        verifSousTitre: 'Entrez le numéro de série officiel délivré par Vitalis Center pour vérifier son authenticité en temps réel auprès du registre officiel.',
        verifExempleNumero: 'CERT-2026-00001',
        contactAdresse: 'Kinshasa, République Démocratique du Congo',
        contactEmail: 'contact@vitalis-center.cd',
        contactHoraires: 'Lundi – Vendredi : 08h00 – 16h30 | Samedi : 08h30 – 12h30',
        contactTelephone: '+243 ...',
        contactWhatsapp: '+243843010337',
        whatsappMessage: DEFAULT_WHATSAPP_MESSAGE,
        whatsappActif: true,
        videoActif: true,
        videoSousTitre: 'Vidéo Institutionnelle',
        videoTitre: 'Découvrez Vitalis Center en Action',
        videoDescription: 'Visionnez la présentation officielle de notre établissement d\'utilité publique : témoignages de formateurs, immersion en atelier et parcours des diplômés.',
        videoBoutonPrincipal: 'Lancer la présentation (3 min)',
        videoBoutonSecondaire: 'Prendre rendez-vous sur place',
        videoBoutonSecondaireUrl: '#contact',
        videoPresentationUrl: 'https://www.youtube-nocookie.com/embed/9No-FiEInLA?rel=0',
        videoPosterUrl: 'assets/actualites/actu-lms-deploiement.jpg',
        videoBadgeHaut: 'VITALIS CENTER EUP',
        videoBadgeBas: 'INNOVATION NATIONALE',
        videoTitreOverlay: 'Déploiement National du Système Numérique & Registre Sécurisé',
        videoSousTitreOverlay: 'Centre de Formation Professionnelle Agréé · Kinshasa, RDC',
        videoLegende: 'Reportage Ministère de la Formation Professionnelle',
        videoDuree: '03:15',
        socialLinkedin: 'https://linkedin.com',
        socialFacebook: 'https://facebook.com',
        socialYoutube: 'https://youtube.com',
        mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3978.8!2d15.3!3d-4.3!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNMKwMTgnMDAuMCJTIDE1wrAxOCcwMC4wIkU!5e0!3m2!1sfr!2scd!4v1',
        liveActivityTexte: 'Session d\'admission 2026 en cours · 15 filières d\'excellence ouvertes',
        footerDescription: 'Vitalis Center EUP (Établissement d\'Utilité Publique) · Centre de formation professionnelle et technique agréé par le Ministère de la Formation Professionnelle de la RDC.',
        footerTutelleTexte: 'Supervision institutionnelle et contrôle de conformité des attestations et certifications nationales.',
        footerCopyright: '© 2026 Vitalis Center EUP. Tous droits réservés.',
        footerBarreTexte: 'Vitalis Center (EUP — Établissement d\'Utilité Publique) · Système de gestion et certification de la formation professionnelle · Édition 2026',
      },
    });
  }

  /**
   * Convertit intelligemment les liens YouTube et Vimeo en URL intégrables (embed)
   */
  public formatVideoEmbedUrl(rawUrl: string | null | undefined): string | null {
    if (!rawUrl) return null;
    const url = String(rawUrl).trim();
    if (!url) return null;

    // Déjà une URL embed
    if (url.includes('youtube-nocookie.com/embed/') || url.includes('youtube.com/embed/') || url.includes('player.vimeo.com/video/')) {
      return url;
    }

    // Format YouTube watch?v=ID
    const ytWatchMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytWatchMatch && ytWatchMatch[1]) {
      return `https://www.youtube-nocookie.com/embed/${ytWatchMatch[1]}?rel=0`;
    }

    // Format Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/);
    if (vimeoMatch && vimeoMatch[3]) {
      return `https://player.vimeo.com/video/${vimeoMatch[3]}`;
    }

    return url;
  }

  private async seedDefaultSections() {
    const defaultSections: CreateLandingSectionDto[] = [
      // Avantages
      {
        typeSection: 'avantage',
        titre: 'Diplôme Reconnu par l\'État',
        sousTitre: 'Agrément National',
        description: 'Formations validées par le Ministère de la Formation Professionnelle pour une insertion professionnelle garantie.',
        ordre: 1,
        couleur: '#1C75BC',
      },
      {
        typeSection: 'avantage',
        titre: 'Formateurs Experts de Terrain',
        sousTitre: 'Corps Pédagogique',
        description: 'Des professionnels chevronnés transmettant un savoir-faire immédiatement applicable en entreprise.',
        ordre: 2,
        couleur: '#F0791E',
      },
      {
        typeSection: 'avantage',
        titre: 'Espace Numérique Dédié',
        sousTitre: 'Digitalisation',
        description: 'Accès aux supports de cours, quiz d\'évaluation, devoirs et suivi continu de votre progression.',
        ordre: 3,
        couleur: '#276B44',
      },
      {
        typeSection: 'avantage',
        titre: 'Certificats Infalsifiables',
        sousTitre: 'Anti-Fraude',
        description: 'Nomenclature séquentielle inaltérable et QR code de vérification publique immédiate.',
        ordre: 4,
        couleur: '#ED1C24',
      },

      // Pédagogie
      {
        typeSection: 'pedagogie',
        titre: 'Pratique & Ateliers Concrets',
        sousTitre: 'Standard TVET',
        description: 'Exercices en situation réelle, laboratoires techniques et travaux dirigés supervisés par des formateurs certifiés.',
        ordre: 1,
        couleur: '#1C75BC',
        icone: '70 %',
      },
      {
        typeSection: 'pedagogie',
        titre: 'Évaluation Continue & Rigueur',
        sousTitre: 'Régulation État',
        description: 'Validation progressive de chaque compétence clé pour assurer une maîtrise parfaite avant la certification d\'État.',
        ordre: 2,
        couleur: '#F0791E',
        icone: '100 %',
      },
      {
        typeSection: 'pedagogie',
        titre: 'Plateforme Digitale Hybride',
        sousTitre: 'Accès Cloud',
        description: 'Accès permanent aux ressources de cours, évaluations d\'entraînement et échanges continus avec les enseignants.',
        ordre: 3,
        couleur: '#276B44',
        icone: '24h / 7j',
      },

      // Admission
      {
        typeSection: 'admission',
        titre: 'Choix de la Filière',
        sousTitre: '01',
        description: 'Sélectionnez le cursus certifiant aligné avec vos ambitions professionnelles.',
        ordre: 1,
        couleur: '#1C75BC',
      },
      {
        typeSection: 'admission',
        titre: 'Dossier en Ligne',
        sousTitre: '02',
        description: 'Remplissez le formulaire d\'inscription et soumettez vos pièces justificatives.',
        ordre: 2,
        couleur: '#F0791E',
      },
      {
        typeSection: 'admission',
        titre: 'Validation & Entretien',
        sousTitre: '03',
        description: 'Confirmation d\'éligibilité par le secrétariat et validation du calendrier.',
        ordre: 3,
        couleur: '#276B44',
      },
      {
        typeSection: 'admission',
        titre: 'Formation & Titre',
        sousTitre: '04',
        description: 'Suivi des modules, validation pratique et délivrance du certificat d\'État.',
        ordre: 4,
        couleur: '#124F80',
      },

      // Secteurs
      {
        typeSection: 'secteur',
        titre: 'Administration Publique & Ministères',
        ordre: 1,
        icone: '🏢',
      },
      {
        typeSection: 'secteur',
        titre: 'Télécommunications & Sociétés Tech',
        ordre: 2,
        icone: '🌐',
      },
      {
        typeSection: 'secteur',
        titre: 'Énergie, BTP & Infrastructures',
        ordre: 3,
        icone: '⚡',
      },
      {
        typeSection: 'secteur',
        titre: 'Banques, Microfinance & Assurances',
        ordre: 4,
        icone: '💼',
      },
      {
        typeSection: 'secteur',
        titre: 'Sécurité & Audit des Systèmes d\'Information',
        ordre: 5,
        icone: '🛡️',
      },
      {
        typeSection: 'secteur',
        titre: 'Agro-industrie & Logistique Urbaine',
        ordre: 6,
        icone: '🌱',
      },

      // FAQ avec catégories
      {
        typeSection: 'faq',
        titre: 'Les formations de Vitalis Center sont-elles reconnues par l\'État congolais ?',
        description:
          'Oui, sans équivoque. Vitalis Center est un Établissement d\'Utilité Publique agréé par le Ministère de la Formation Professionnelle sous le numéro officiel CFP 00095/MIN-FP/DG-FP/KMG/JPU/2026. Tous nos certificats confèrent une reconnaissance institutionnelle immédiate et légale.',
        categorie: 'CERTIFICATS',
        ordre: 1,
      },
      {
        typeSection: 'faq',
        titre: 'Quel est le mode d\'évaluation pour obtenir la certification ?',
        description:
          'Nous appliquons rigoureusement l\'Approche par Compétences (APC) préconisée par les normes nationales et internationales. Chaque apprenant est évalué sur des projets réels, des études de cas et des ateliers pratiques garantissant sa maîtrise technique avant l\'émission du certificat.',
        categorie: 'PEDAGOGIE',
        ordre: 2,
      },
      {
        typeSection: 'faq',
        titre: 'Comment vérifier l\'authenticité d\'un certificat délivré ?',
        description:
          'Chaque certificat comporte un numéro de série unique inaltérable et un QR code officiel. Tout employeur ou institution peut vérifier la validité d\'un titre en quelques secondes sur notre plateforme publique de vérification en ligne.',
        categorie: 'CERTIFICATS',
        ordre: 3,
      },
      {
        typeSection: 'faq',
        titre: 'Des sessions en cours du soir ou en ligne sont-elles disponibles ?',
        description:
          'Absolument. Nous proposons des créneaux flexibles : sessions intensives en journée, cours du soir pour professionnels en poste, et parcours hybrides combinant e-learning et ateliers présentiels.',
        categorie: 'ADMISSIONS',
        ordre: 4,
      },
      {
        typeSection: 'faq',
        titre: 'Vitalis Center propose-t-il des formations sur mesure pour entreprises ?',
        description:
          'Oui. Notre pôle Formations Sur Mesure accompagne les ministères, régies financières, ONGs et entreprises privées dans la conception de plans de renforcement de capacités adaptés à leurs enjeux spécifiques.',
        categorie: 'ENTREPRISES',
        ordre: 5,
      },
      {
        typeSection: 'faq',
        titre: 'Quels sont les prérequis pour candidater à une session certifiante ?',
        description:
          'L\'accès est ouvert aux titulaires d\'un diplôme d\'État (secondaire) ou à toute personne justifiant d\'une expérience professionnelle équivalente, validée par un test de positionnement technique gratuit.',
        categorie: 'ADMISSIONS',
        ordre: 6,
      },
      {
        typeSection: 'faq',
        titre: 'Des stages pratiques en entreprise sont-ils organisés ?',
        description:
          'Oui. Grâce à nos conventions-cadres avec des employeurs majeurs en RDC (banques, télécoms, régies publiques, mines), les apprenants bénéficient de stages d\'immersion professionnelle encadrés menant directement à l\'embauche.',
        categorie: 'ENTREPRISES',
        ordre: 7,
      },
    ];

    for (const sec of defaultSections) {
      await this.createSection(sec);
    }
  }

  private async seedDefaultTemoignages() {
    const defaultTemoignages = [
      {
        nom: 'Grace Mutombo Kabongo',
        initiales: 'GM',
        role: 'Responsable Informatique',
        fonction: 'Responsable Informatique',
        entreprise: 'Rawbank S.A.',
        promotion: 'Promotion 2024 — Développement Web & Systèmes',
        citation:
          "Grâce à Vitalis Center, j'ai obtenu les compétences concrètes qui m'ont ouvert les portes de Rawbank. Les ateliers pratiques m'ont permis de résoudre de vrais problèmes dès le premier jour en entreprise. C'est une formation qui forme vraiment.",
        note: 5,
        photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop',
        couleur: '#1C75BC',
        ordre: 1,
      },
      {
        nom: 'Christian Luzolo Makiese',
        initiales: 'CL',
        role: 'Chef Comptable',
        fonction: 'Chef Comptable',
        entreprise: 'Gécamines — Direction Financière',
        promotion: 'Promotion 2023 — Gestion Comptable & Audit',
        citation:
          "La rigueur de la méthode APC de Vitalis m'a appris à aller au-delà des théories. Mes formateurs avaient une vraie expérience de terrain. Aujourd'hui je manage une équipe de 7 comptables. Le certificat officiel a été décisif pour ma promotion interne.",
        note: 5,
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
        couleur: '#F0791E',
        ordre: 2,
      },
      {
        nom: 'Esperance Nzinga Mfumu',
        initiales: 'EN',
        role: 'Technicienne Réseaux',
        fonction: 'Technicienne Réseaux',
        entreprise: 'Vodacom Congo',
        promotion: 'Promotion 2025 — Réseaux & Cybersécurité',
        citation:
          "En tant que femme dans un secteur technique, Vitalis Center m'a donné la confiance et les compétences pour réussir. Les labs réseau sont identiques à ceux qu'on retrouve en entreprise. Je recommande cette formation à toutes les jeunes femmes.",
        note: 5,
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
        couleur: '#276B44',
        ordre: 3,
      },
    ];

    for (const t of defaultTemoignages) {
      await this.createTemoignage(t);
    }
  }

  private async seedDefaultFormateurs() {
    const defaultFormateurs = [
      {
        nom: 'Prof. Jean-Baptiste Mbemba',
        titre: 'Expert Réseaux & Cybersécurité',
        specialite: 'Cisco CCNA · Sécurité Systèmes · Cloud AWS',
        experience: '14 ans · Ex-Vodacom Congo',
        photoUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=600&auto=format&fit=crop',
        linkedin: 'https://linkedin.com',
        ordre: 1,
      },
      {
        nom: 'Mme Fatou Diallo-Kasongo',
        titre: "Experte Gestion & Finance d'Entreprise",
        specialite: 'Comptabilité OHADA · Audit · Contrôle de Gestion',
        experience: '11 ans · Ex-Trust Merchant Bank',
        photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop',
        linkedin: 'https://linkedin.com',
        ordre: 2,
      },
      {
        nom: 'Ing. Patrick Tshimanga',
        titre: 'Formateur Génie Électrique & BTP',
        specialite: 'Installations industrielles · Énergie solaire · Maintenance',
        experience: '9 ans · Ex-SNEL / Projets BEI',
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
        linkedin: 'https://linkedin.com',
        ordre: 3,
      },
    ];

    for (const f of defaultFormateurs) {
      await this.createFormateur(f);
    }
  }

  private async seedDefaultCampus() {
    const defaultCampus = [
      {
        titre: 'Laboratoire Systèmes & Développement Cloud',
        description: 'Équipé de serveurs dédiés, postes haute performance et environnement d\'intégration continue pour l\'apprentissage pratique du code et de l\'administration réseau.',
        photoUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1200&auto=format&fit=crop',
        badge: 'Tech & Télécoms',
        equipements: '35 postes connectés · Racks Cisco · Fibre dédiée',
        ordre: 1,
      },
      {
        titre: 'Atelier Électrotechnique & Énergie Solaire',
        description: 'Bancs d\'essais réels, onduleurs industriels, simulateurs de réseau et kits photovoltaïques aux normes de sécurité électrique.',
        photoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=1200&auto=format&fit=crop',
        badge: 'Génie & Énergie',
        equipements: 'Bancs Schneider Electric · Panneaux solaires · Outillage pro',
        ordre: 2,
      },
      {
        titre: 'Espace Collaboratif & Études de Cas',
        description: 'Salles modulaires dédiées au management agile, simulations d\'entreprises, analyse financière et revues de projets d\'affaires.',
        photoUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200&auto=format&fit=crop',
        badge: 'Management',
        equipements: 'Vidéoprojection HD · Tableaux interactifs · Coworking',
        ordre: 3,
      },
      {
        titre: 'Centre d\'Examen Agréé & Registre Officiel',
        description: 'Postes sécurisés pour les évaluations formelles, commissions de délibération et délivrance certifiée des attestations sous supervision ministérielle.',
        photoUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop',
        badge: 'Accréditation',
        equipements: 'Postes d\'évaluation isolés · Supervision APC · Registre',
        ordre: 4,
      },
    ];

    for (const c of defaultCampus) {
      await this.createCampus(c);
    }
  }

  private async seedDefaultPartenaires() {
    const defaultPartenaires = [
      { nom: 'Rawbank', logoUrl: 'https://rawbank.com/logo.png', secteur: 'Finance', ordre: 1 },
      { nom: 'Vodacom Congo', logoUrl: 'https://vodacom.cd/logo.png', secteur: 'Télécom', ordre: 2 },
      { nom: 'Gécamines', logoUrl: 'https://gecamines.cd/logo.png', secteur: 'Mines', ordre: 3 },
      { nom: 'SNEL', logoUrl: 'https://snel.cd/logo.png', secteur: 'Énergie', ordre: 4 },
      { nom: 'Trust Merchant Bank', logoUrl: 'https://tmb.cd/logo.png', secteur: 'Finance', ordre: 5 },
      { nom: 'Airtel Congo', logoUrl: 'https://airtel.cd/logo.png', secteur: 'Télécom', ordre: 6 },
      { nom: 'REGIDESO', logoUrl: 'https://regideso.cd/logo.png', secteur: 'Service public', ordre: 7 },
    ];

    for (const p of defaultPartenaires) {
      await this.createPartenaire(p);
    }
  }

  private async seedDefaultActualites() {
    const defaultActualites: CreateLandingActualiteDto[] = [
      {
        titre: 'Déploiement National du Système Numérique Vitalis & Registre des Certifications Sécurisées',
        chapeau: 'Vitalis Center EUP officialise la mise en service de sa plateforme LMS et de certification sécurisée avec vérification par QR code et numéro de série infalsifiable.',
        contenu: 'Sous la tutelle du Ministère de la Formation Professionnelle, Vitalis Center franchit une étape historique dans la modernisation des dispositifs d\'apprentissage. La plateforme permet désormais un suivi individualisé des compétences, une évaluation rigoureuse par approche APC, et une authentification publique instantanée des attestations délivrées.',
        categorie: 'INNOVATION',
        badgeCouleur: '#1C75BC',
        imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1200&auto=format&fit=crop',
        auteur: 'Direction Générale & Innovation',
        aLaUne: true,
        ordre: 1,
      },
      {
        titre: 'Lancement Officiel de la Campagne d\'Orientation et d\'Admission — Session 2026',
        chapeau: 'Les inscriptions sont officiellement ouvertes pour les 15 filières d\'excellence professionnelle réparties dans l\'ensemble du réseau national.',
        contenu: 'Les candidats, cadres et professionnels en reconversion peuvent dès maintenant formuler leurs vœux d\'orientation. Les directions pédagogiques de chaque antenne assurent des entretiens d\'admission personnalisés afin d\'orienter chaque profil vers la filière la plus adaptée à ses ambitions.',
        categorie: 'ADMISSIONS',
        badgeCouleur: '#F0791E',
        imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200&auto=format&fit=crop',
        auteur: 'Secrétariat Général aux Admissions',
        aLaUne: false,
        ordre: 2,
      },
      {
        titre: 'Accords Stratégiques avec les Entreprises Publiques et Privées pour l\'Insertion Immédiate',
        chapeau: 'Signature d\'accords-cadres pour garantir des stages pratiques en entreprise et l\'embauche directe des lauréats certifiés.',
        contenu: 'Dans le cadre de sa mission d\'utilité publique, Vitalis Center a consolidé des partenariats avec les fédérations d\'entreprises et les régies publiques. Ces conventions garantissent des immersions sur le terrain dès le deuxième semestre de formation et des opportunités d\'embauche directe pour les meilleurs apprenants.',
        categorie: 'PARTENARIAT',
        badgeCouleur: '#276B44',
        imageUrl: 'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?q=80&w=1200&auto=format&fit=crop',
        auteur: 'Direction des Relations Extérieures',
        aLaUne: false,
        ordre: 3,
      },
      {
        titre: 'Atelier National sur l\'Approche Pédagogique par Compétences (APC) et Harmonisation Métiers',
        chapeau: 'Formation intensive des formateurs et inspecteurs pédagogiques pour l\'application des référentiels internationaux.',
        contenu: 'Durant 5 jours, l\'ensemble du corps enseignant et des directeurs de filière ont participé au séminaire d\'harmonisation des maquettes de cours et des critères d\'évaluation. Cette standardisation garantit un niveau d\'excellence homogène dans toutes les antennes satellites du pays.',
        categorie: 'PEDAGOGIE',
        badgeCouleur: '#124F80',
        imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1200&auto=format&fit=crop',
        auteur: 'Inspection Pédagogique Nationale',
        aLaUne: false,
        ordre: 4,
      },
    ];

    for (const act of defaultActualites) {
      await this.createActualite(act);
    }
  }
}
