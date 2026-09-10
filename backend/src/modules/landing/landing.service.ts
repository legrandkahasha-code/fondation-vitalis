import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
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
  ContactMessageDto,
} from './dto/landing.dto';

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

  public invalidateLandingCache() {
    LandingService.cachedLandingData = null;
  }

  public getCachedLandingEtag(): string | null {
    return LandingService.cachedLandingData?.etag || null;
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

    // 5. Récupérer les témoignages actifs (compatibilité)
    let temoignages = await this.db.landingPageTemoignage.findMany({
      where: { actif: true },
      orderBy: { ordre: 'asc' },
    });

    // 6. Récupérer les formations réelles de la base de données avec filière et niveau
    const formationsDb = await this.prisma.formation.findMany({
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
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const result = {
      settings,
      sections: {
        avantages,
        pedagogie,
        admission,
        secteurs,
        faq,
      },
      temoignages,
      actualites,
      formations: formationsDb.map((f: any) => {
        const ref = f.formationReferentiel;
        const filiere = ref?.filiere;
        const niveau = ref?.niveau;

        // Catégorisation intelligente : priorité à la filière officielle en BDD
        let categorieCode: 'tech' | 'gestion' | 'technique' = 'tech';
        let filiereNom = filiere?.libelle || '';
        const fCode = (filiere?.code || '').toUpperCase();
        const fLib = filiereNom.toLowerCase();
        const titreLower = (f.titre || '').toLowerCase();

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

        return {
          id: f.id,
          titre: f.titre,
          description: f.description || '',
          modulesCount: f._count?.modules || 0,
          filiereId: filiere?.id || null,
          filiereCode: filiere?.code || null,
          filiereNom: filiere?.libelle || null,
          niveauCode: niveau?.code || null,
          niveauNom: niveau?.libelle || null,
          categorieOfficielle: categorieCode,
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

  // --- SETTINGS ---
  async getSettings() {
    let settings = await this.db.landingPageSettings.findFirst();
    if (!settings) {
      settings = await this.seedDefaultSettings();
    }
    return settings;
  }

  async updateSettings(dto: UpdateLandingSettingsDto | any) {
    this.invalidateLandingCache();
    const existing = await this.getSettings();
    const { id, createdAt, updatedAt, ...cleanData } = dto || {};
    
    if (cleanData.statsLaureats !== undefined) cleanData.statsLaureats = Number(cleanData.statsLaureats);
    if (cleanData.statsTauxReussite !== undefined) cleanData.statsTauxReussite = Number(cleanData.statsTauxReussite);
    if (cleanData.statsFilieres !== undefined) cleanData.statsFilieres = Number(cleanData.statsFilieres);
    if (cleanData.statsTitresVerif !== undefined) cleanData.statsTitresVerif = Number(cleanData.statsTitresVerif);

    return this.db.landingPageSettings.update({
      where: { id: existing.id },
      data: cleanData,
    });
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
        nom: cleanData.nom,
        initiales: cleanData.initiales || '',
        role: cleanData.role,
        promotion: cleanData.promotion || null,
        citation: cleanData.citation,
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
        footerDescription: 'Vitalis Center EUP (Établissement d\'Utilité Publique) · Centre de formation professionnelle et technique agréé par le Ministère de la Formation Professionnelle de la RDC.',
        footerTutelleTexte: 'Supervision institutionnelle et contrôle de conformité des attestations et certifications nationales.',
        footerCopyright: '© 2026 Vitalis Center EUP. Tous droits réservés.',
        footerBarreTexte: 'Vitalis Center (EUP — Établissement d\'Utilité Publique) · Système de gestion et certification de la formation professionnelle · Édition 2026',
      },
    });
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

      // FAQ
      {
        typeSection: 'faq',
        titre: 'Les certificats délivrés par Vitalis Center sont-ils reconnus par l\'État ?',
        description:
          'Oui, absolument. Vitalis Center est un Établissement d\'Utilité Publique (EUP) titulaire de l\'autorisation officielle d\'ouverture N° CFP 00095/MIN-FP/DG-FP/KMG/JPU/2026 délivrée par le Ministère de la Formation Professionnelle de la République Démocratique du Congo.',
        ordre: 1,
      },
      {
        typeSection: 'faq',
        titre: 'Comment un employeur peut-il vérifier l\'authenticité de mon certificat ?',
        description:
          'Chaque certificat délivré comporte un numéro d\'immatriculation séquentiel unique (ex : CERT-2026-00001) ainsi qu\'un QR code. L\'employeur peut simplement saisir le numéro sur notre portail public pour accéder à la fiche officielle de validation.',
        ordre: 2,
      },
      {
        typeSection: 'faq',
        titre: 'Quelles sont les conditions pour obtenir son certificat en fin de formation ?',
        description:
          'Pour être éligible à la certification officielle, l\'apprenant doit valider l\'ensemble des modules du cursus (100% de complétion) et obtenir une moyenne générale minimale de 10/20 aux évaluations et devoirs pratiques.',
        ordre: 3,
      },
      {
        typeSection: 'faq',
        titre: 'Les cours sont-ils dispensés en présentiel ou en ligne ?',
        description:
          'Nous proposons une formule adaptée : des sessions pratiques et ateliers en présentiel dans nos centres, combinées à un accès à notre plateforme numérique pour réviser les cours, réaliser les quiz et échanger avec les formateurs.',
        ordre: 4,
      },
      {
        typeSection: 'faq',
        titre: 'Comment s\'effectue le règlement des frais d\'inscription ?',
        description:
          'Le paiement peut être effectué directement auprès du secrétariat administratif de l\'établissement ou par les moyens de paiement validés lors de la confirmation de votre dossier.',
        ordre: 5,
      },
    ];

    for (const sec of defaultSections) {
      await this.createSection(sec);
    }
  }

  private async seedDefaultTemoignages() {
    const defaultTemoignages: CreateLandingTemoignageDto[] = [
      {
        nom: 'Emmanuel Kasongo',
        initiales: 'EK',
        role: 'Administrateur Réseaux',
        promotion: 'Promo 2025',
        citation:
          '« La formation en Sécurité Informatique m\'a permis d\'obtenir une promotion directe. L\'authenticité du certificat vérifiable en ligne a rassuré mon employeur. »',
        couleur: '#1C75BC',
        ordre: 1,
      },
      {
        nom: 'Marie-Claire Tshilombo',
        initiales: 'MT',
        role: 'Gestionnaire de Contrats',
        promotion: 'Promo 2025',
        citation:
          '« Les modules sur les Marchés Publics sont concrets et conformes à la réglementation RDC. Cela a fait toute la différence dans mes dossiers. »',
        couleur: '#F0791E',
        ordre: 2,
      },
      {
        nom: 'Jean-Paul Mukendi',
        initiales: 'JM',
        role: 'Directeur RH · Entreprise Télécom',
        promotion: undefined,
        citation:
          '« Nous recrutons régulièrement des diplômés de Vitalis Center. Le niveau de compétence pratique est immédiatement opérationnel. »',
        couleur: '#276B44',
        ordre: 3,
      },
    ];

    for (const t of defaultTemoignages) {
      await this.createTemoignage(t);
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
