import { Test, TestingModule } from '@nestjs/testing';
import { PedagogieService } from './pedagogie.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';

describe('PedagogieService (Business Rules)', () => {
  let service: PedagogieService;
  let prisma: PrismaService;

  const mockPrisma = {
    formation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    module: {
      create: jest.fn(),
    },
    cours: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    userProgress: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    evaluation: {
      create: jest.fn(),
    },
    note: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PedagogieService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<PedagogieService>(PedagogieService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFormation (BR-02)', () => {
    it('should throw ForbiddenException if user belongs to a different establishment than the formation (BR-02)', async () => {
      // Formation de l'établissement 1
      mockPrisma.formation.findUnique.mockResolvedValue({
        id: 'uuid-form-1',
        titre: 'NodeJS',
        etablissementId: 'uuid-etab-1',
      });

      // Utilisateur de l'établissement 2
      const user = { id: 'uuid-user-2', role: Role.FORMATEUR, etablissementId: 'uuid-etab-2' };

      await expect(service.getFormation('uuid-form-1', user)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow access if user belongs to the same establishment (BR-02)', async () => {
      const mockForm = { id: 'uuid-form-1', titre: 'NodeJS', etablissementId: 'uuid-etab-1' };
      mockPrisma.formation.findUnique.mockResolvedValue(mockForm);

      const user = { id: 'uuid-user-2', role: Role.FORMATEUR, etablissementId: 'uuid-etab-1' };

      const res = await service.getFormation('uuid-form-1', user);
      expect(res).toEqual(mockForm);
    });

    it('should allow access if user is Admin Centre regardless of establishment (BR-02)', async () => {
      const mockForm = { id: 'uuid-form-1', titre: 'NodeJS', etablissementId: 'uuid-etab-1' };
      mockPrisma.formation.findUnique.mockResolvedValue(mockForm);

      const user = { id: 'uuid-user-3', role: Role.ADMIN_CENTRE, etablissementId: 'uuid-etab-99' };

      const res = await service.getFormation('uuid-form-1', user);
      expect(res).toEqual(mockForm);
    });
  });
});
