import { Test, TestingModule } from '@nestjs/testing';
import { DevoirsService } from './devoirs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthorizationService } from '../../common/services/authorization.service';
import { Role } from '../../common/enums/role.enum';
import { BadRequestException } from '@nestjs/common';

describe('DevoirsService - Validation Fullstack & Règles Métier', () => {
  let service: DevoirsService;
  let prisma: any;
  let notifications: any;
  let authz: any;

  const mockPrisma = {
    devoir: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    soumissionDevoir: {
      update: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockStorage = {
    uploadFile: jest.fn().mockResolvedValue('https://storage.local/devoirs/copie.pdf'),
  };

  const mockNotifications = {
    emit: jest.fn(),
  };

  const mockAuthz = {
    canAccessDevoir: jest.fn().mockResolvedValue({}),
    canAccessModule: jest.fn().mockResolvedValue({ module: { id: 'mod-1' } }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevoirsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: AuthorizationService, useValue: mockAuthz },
      ],
    }).compile();

    service = module.get<DevoirsService>(DevoirsService);
    prisma = module.get(PrismaService);
    notifications = module.get(NotificationsService);
    authz = module.get(AuthorizationService);
  });

  describe('getDevoirsACorriger()', () => {
    it('doit filtrer par affectations / séances pour un rôle FORMATEUR', async () => {
      const formateurUser = {
        id: 'formateur-uuid-1',
        role: Role.FORMATEUR,
        etablissementId: 'etab-1',
      };

      prisma.devoir.findMany.mockResolvedValue([]);

      await service.getDevoirsACorriger(formateurUser);

      expect(prisma.devoir.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            module: {
              formation: { etablissementId: 'etab-1' },
              OR: [
                { affectations: { some: { formateurId: 'formateur-uuid-1' } } },
                { seances: { some: { formateurId: 'formateur-uuid-1' } } },
              ],
            },
          },
        }),
      );
    });

    it('doit permettre à un ADMIN_ETABLISSEMENT de voir tous les devoirs de son antenne', async () => {
      const adminEtabUser = {
        id: 'admin-etab-1',
        role: Role.ADMIN_ETABLISSEMENT,
        etablissementId: 'etab-1',
      };

      prisma.devoir.findMany.mockResolvedValue([]);

      await service.getDevoirsACorriger(adminEtabUser);

      expect(prisma.devoir.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            module: {
              formation: { etablissementId: 'etab-1' },
            },
          },
        }),
      );
    });

    it('doit calculer fidèlement les copies en attente même avec une note à 0', async () => {
      const adminCentreUser = {
        id: 'admin-centre-1',
        role: Role.ADMIN_CENTRE,
      };

      prisma.devoir.findMany.mockResolvedValue([
        {
          id: 'dev-1',
          titre: 'Devoir Algorithmique',
          consignes: 'Consignes',
          dateLimite: null,
          moduleId: 'mod-1',
          module: {
            titre: 'Module 1',
            formation: { id: 'form-1', titre: 'Formation Dev' },
          },
          soumissions: [
            { id: 'sub-1', note: null },
            { id: 'sub-2', note: 0 },
            { id: 'sub-3', note: 15 },
          ],
        },
      ]);

      const result = await service.getDevoirsACorriger(adminCentreUser);

      expect(result).toHaveLength(1);
      expect(result[0].nbTotalSoumissions).toBe(3);
      expect(result[0].nbEnAttente).toBe(1);
      expect(result[0].nbNotes).toBe(2);
    });
  });

  describe('noter()', () => {
    it('doit rejeter une note supérieure à 20 ou négative', async () => {
      const user = { id: 'u-1', role: Role.FORMATEUR };

      await expect(service.noter('dev-1', 'app-1', 25, '', user)).rejects.toThrow(BadRequestException);
      await expect(service.noter('dev-1', 'app-1', -1, '', user)).rejects.toThrow(BadRequestException);
    });

    it('doit enregistrer la note et émettre un événement temps réel', async () => {
      const user = { id: 'formateur-1', role: Role.FORMATEUR };

      prisma.devoir.findUnique.mockResolvedValue({
        id: 'dev-1',
        titre: 'Devoir Docker',
        module: { formation: { id: 'f-1' } },
        soumissions: [],
      });

      prisma.soumissionDevoir.update.mockResolvedValue({
        id: 'sub-1',
        devoirId: 'dev-1',
        apprenantId: 'app-1',
        note: 18,
        commentaire: 'Excellent travail',
      });

      const res = await service.noter('dev-1', 'app-1', 18, 'Excellent travail', user);

      expect(prisma.soumissionDevoir.update).toHaveBeenCalledWith({
        where: { devoirId_apprenantId: { devoirId: 'dev-1', apprenantId: 'app-1' } },
        data: { note: 18, commentaire: 'Excellent travail' },
      });

      expect(notifications.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DEVOIR_NOTE',
          recipientUserId: 'app-1',
          data: expect.objectContaining({ note: 18, devoirId: 'dev-1' }),
        }),
      );

      expect(res.note).toBe(18);
    });
  });
});
