import { Test, TestingModule } from '@nestjs/testing';
import { LandingService } from './landing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../../common/services/storage.service';
import { BadRequestException } from '@nestjs/common';

describe('LandingService', () => {
  let service: LandingService;

  const mockPrismaService = {
    certificat: {
      count: jest.fn().mockResolvedValue(150),
    },
    filiere: {
      count: jest.fn().mockResolvedValue(12),
    },
    landingPageSettings: {
      findFirst: jest.fn().mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        heroTitre: 'Vitalis Center, la formation professionnelle',
        heroSousTitre: 'Description',
        heroImageAlt: 'Étudiants en atelier',
        heroImageDroitConfirme: true,
        statsLaureats: 1200,
        statsTauxReussite: 94,
        statsFilieres: 15,
        statsTitresVerif: 100,
      }),
      create: jest.fn(),
      update: jest.fn(),
    },
    landingPageSection: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'sec-1',
          typeSection: 'avantage',
          titre: "Diplôme Reconnu par l'État",
          ordre: 1,
          actif: true,
        },
        {
          id: 'sec-2',
          typeSection: 'faq',
          titre: 'Question 1',
          description: 'Réponse 1',
          ordre: 1,
          actif: true,
        },
      ]),
      count: jest.fn().mockResolvedValue(2),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    landingPageTemoignage: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    landingPageActualite: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    formation: {
      count: jest.fn().mockResolvedValue(18),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'form-1',
          titre: 'Formation Sécurité Informatique',
          description: 'Description',
          _count: { modules: 4 },
        },
      ]),
    },
    categorieFormation: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    landingPageFormateur: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(1),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    landingPageCampus: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(1),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    landingPagePartenaire: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(1),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockNotificationsService = {
    emit: jest.fn(),
    stream: jest.fn(),
  };

  const mockStorageService = {
    deleteLocalUpload: jest.fn().mockResolvedValue(true),
    saveLocalUpload: jest.fn(),
    isLocalUploadExists: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    service = module.get<LandingService>(LandingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return complete public landing data payload', async () => {
    const result = await service.getPublicLandingData();
    expect(result).toHaveProperty('settings');
    expect(result).toHaveProperty('sections');
    expect(result).toHaveProperty('temoignages');
    expect(result).toHaveProperty('formations');
    expect(result.sections.avantages.length).toBeGreaterThan(0);
    expect(result.sections.faq.length).toBeGreaterThan(0);
    expect(result.formations[0].titre).toBe('Formation Sécurité Informatique');
    expect(result.settings.whatsappActif).toBe(false);
  });

  it('should return settings', async () => {
    const settings = await service.getSettings();
    expect(settings.statsLaureats).toBe(1200);
  });

  it('normalise le numéro WhatsApp à l\'enregistrement', async () => {
    mockPrismaService.landingPageSettings.update.mockResolvedValue({
      contactWhatsapp: '+243843010337',
    });
    await service.updateSettings({ contactWhatsapp: '0843 010 337' });
    expect(mockPrismaService.landingPageSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ contactWhatsapp: '+243843010337' }),
      }),
    );
  });

  it('rejette un numéro WhatsApp factice', async () => {
    await expect(
      service.updateSettings({ contactWhatsapp: '+243 81 000 0000' }),
    ).rejects.toThrow('Numéro WhatsApp invalide');
  });

  it('persiste la désactivation du bouton WhatsApp', async () => {
    mockPrismaService.landingPageSettings.update.mockResolvedValue({
      whatsappActif: false,
    });
    await service.updateSettings({ whatsappActif: false });
    expect(mockPrismaService.landingPageSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ whatsappActif: false }),
      }),
    );
  });

  it('expose le widget public quand l\'admin a activé WhatsApp', async () => {
    mockPrismaService.landingPageSettings.findFirst.mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      whatsappActif: true,
      contactWhatsapp: '+243843010337',
      whatsappMessage: 'Bonjour',
    });
    const widget = await service.getWhatsappWidget();
    expect(widget.actif).toBe(true);
    expect(widget.url).toContain('wa.me/243843010337');
  });

  describe('P3.1 - Calcul des statistiques réelles', () => {
    it('retourne les compteurs réels de la base de données', async () => {
      const stats = await service.getStatsReelles();
      expect(stats.laureats).toBe(150);
      expect(stats.formationsActives).toBe(18);
      expect(stats.filieres).toBe(12);
      expect(stats.titresVerifiables).toBe(100);
      expect(stats.calculeLe).toBeDefined();
    });
  });

  describe('P1.1 - Sécurisation droit à l\'image et alt', () => {
    it('révoque heroImageDroitConfirme si heroImageAlt est vidé', async () => {
      mockPrismaService.landingPageSettings.findFirst.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        heroImage: '/uploads/hero/test.jpg',
        heroImageAlt: 'Ancien texte alternatif',
        heroImageDroitConfirme: true,
      });

      mockPrismaService.landingPageSettings.update.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        heroImageAlt: '',
        heroImageDroitConfirme: false,
      });

      await service.updateSettings({ heroImageAlt: '' });

      expect(mockPrismaService.landingPageSettings.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            heroImageDroitConfirme: false,
            heroImageDroitDate: null,
            heroImageDroitAuteur: null,
          }),
        }),
      );
    });

    it('refuse de confirmer le droit à l\'image sans alt', async () => {
      mockPrismaService.landingPageSettings.findFirst.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        heroImage: '/uploads/hero/test.jpg',
        heroImageAlt: '',
        heroImageDroitConfirme: false,
      });

      await expect(
        service.updateSettings({ heroImageDroitConfirme: true, heroImageAlt: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
