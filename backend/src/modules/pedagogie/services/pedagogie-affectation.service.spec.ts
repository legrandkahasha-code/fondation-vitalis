import { Test, TestingModule } from '@nestjs/testing';
import { PedagogieAffectationService } from './pedagogie-affectation.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { Role } from '../../../common/enums/role.enum';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';

describe('PedagogieAffectationService (Affectations Formateurs)', () => {
  let service: PedagogieAffectationService;

  const mockPrisma = {
    module: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    utilisateur: {
      findUnique: jest.fn(),
    },
    affectationFormateur: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    habilitationFormateur: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockNotifications = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PedagogieAffectationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<PedagogieAffectationService>(PedagogieAffectationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('affecterFormateur', () => {
    it('doit affecter un formateur avec succès', async () => {
      mockPrisma.module.findUnique.mockResolvedValue({
        id: 'mod-1',
        titre: 'Module Algorithmique',
        formationId: 'form-1',
        formation: { id: 'form-1', titre: 'Dev Web', etablissementId: 'etab-1' },
      });

      mockPrisma.utilisateur.findUnique.mockResolvedValue({
        id: 'formateur-1',
        role: Role.FORMATEUR,
        etablissementId: 'etab-1',
        nom: 'Bahati',
        prenom: 'Kakule',
      });

      mockPrisma.affectationFormateur.findUnique.mockResolvedValue(null);
      mockPrisma.affectationFormateur.create.mockResolvedValue({
        id: 'aff-1',
        moduleId: 'mod-1',
        formateurId: 'formateur-1',
        estCoordonnateur: true,
        heuresAllouees: 30,
      });

      const userAdmin = { id: 'admin-1', role: Role.ADMIN_ETABLISSEMENT, etablissementId: 'etab-1' };
      const res = await service.affecterFormateur('mod-1', { formateurId: 'formateur-1', estCoordonnateur: true, heuresAllouees: 30 }, userAdmin);

      expect(res.id).toBe('aff-1');
      expect(mockPrisma.affectationFormateur.create).toHaveBeenCalled();
      expect(mockNotifications.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'FORMATION_UPDATE',
          recipientUserId: 'formateur-1',
        }),
      );
    });

    it('doit refuser si le formateur appartient à un autre établissement (BR-02)', async () => {
      mockPrisma.module.findUnique.mockResolvedValue({
        id: 'mod-1',
        titre: 'Module Algorithmique',
        formation: { etablissementId: 'etab-1' },
      });

      mockPrisma.utilisateur.findUnique.mockResolvedValue({
        id: 'formateur-2',
        role: Role.FORMATEUR,
        etablissementId: 'etab-autre',
      });

      const userAdmin = { id: 'admin-1', role: Role.ADMIN_ETABLISSEMENT, etablissementId: 'etab-1' };
      await expect(
        service.affecterFormateur('mod-1', { formateurId: 'formateur-2' }, userAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('doit refuser un doublon d affectation', async () => {
      mockPrisma.module.findUnique.mockResolvedValue({
        id: 'mod-1',
        titre: 'Module Algorithmique',
        formation: { etablissementId: 'etab-1' },
      });

      mockPrisma.utilisateur.findUnique.mockResolvedValue({
        id: 'formateur-1',
        role: Role.FORMATEUR,
        etablissementId: 'etab-1',
      });

      mockPrisma.affectationFormateur.findUnique.mockResolvedValue({ id: 'aff-existant' });

      const userAdmin = { id: 'admin-1', role: Role.ADMIN_ETABLISSEMENT, etablissementId: 'etab-1' };
      await expect(
        service.affecterFormateur('mod-1', { formateurId: 'formateur-1' }, userAdmin),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getFormateursFormation', () => {
    it('doit renvoyer une liste vide sans formateurs fantômes si aucune affectation ni séance n existe', async () => {
      mockPrisma.module.findMany.mockResolvedValue([
        {
          id: 'mod-1',
          affectations: [],
          seances: [],
        },
      ]);

      const formateurs = await service.getFormateursFormation('form-1');
      expect(formateurs).toEqual([]);
    });

    it('doit agréger les formateurs affectés officiellement', async () => {
      mockPrisma.module.findMany.mockResolvedValue([
        {
          id: 'mod-1',
          affectations: [
            {
              estCoordonnateur: true,
              formateur: { id: 'formateur-1', nom: 'Bahati', prenom: 'Kakule', email: 'kb@vitalis.cd' },
            },
          ],
          seances: [],
        },
      ]);

      const formateurs = await service.getFormateursFormation('form-1');
      expect(formateurs).toHaveLength(1);
      expect(formateurs[0].email).toBe('kb@vitalis.cd');
      expect(formateurs[0].estCoordonnateur).toBe(true);
    });
  });
});
