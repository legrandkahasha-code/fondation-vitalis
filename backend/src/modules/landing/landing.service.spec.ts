import { Test, TestingModule } from '@nestjs/testing';
import { LandingService } from './landing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('LandingService', () => {
  let service: LandingService;

  const mockPrismaService = {
    landingPageSettings: {
      findFirst: jest.fn().mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        heroTitre: 'Vitalis Center, la formation professionnelle',
        heroSousTitre: 'Description',
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
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'form-1',
          titre: 'Formation Sécurité Informatique',
          description: 'Description',
          _count: { modules: 4 },
        },
      ]),
    },
  };

  const mockNotificationsService = {
    emit: jest.fn(),
    stream: jest.fn(),
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
});
