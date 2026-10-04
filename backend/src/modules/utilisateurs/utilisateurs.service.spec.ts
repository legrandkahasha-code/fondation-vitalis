import { Test, TestingModule } from '@nestjs/testing';
import { UtilisateursService } from './utilisateurs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { IdentityService } from '../admission/identity.service';
import { StorageService } from '../../common/services/storage.service';

describe('UtilisateursService (Business Rules)', () => {
  let service: UtilisateursService;
  let prisma: PrismaService;

  const mockPrisma = {
    etablissement: {
      findUnique: jest.fn(),
    },
    utilisateur: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('mock-token'),
  };

  const mockNotifications = {
    emit: jest.fn(),
    stream: jest.fn(),
  };

  const mockStorage = {
    uploadFile: jest.fn().mockResolvedValue('/uploads/test.png'),
    deleteFile: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UtilisateursService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: IdentityService, useValue: { ensureProfileFromUser: jest.fn().mockResolvedValue({}) } },
        { provide: StorageService, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<UtilisateursService>(UtilisateursService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should throw ForbiddenException if establishment does not exist (BR-01)', async () => {
      mockPrisma.etablissement.findUnique.mockResolvedValue(null);

      const dto = {
        email: 'test@vitalis.com',
        password: 'password123',
        nom: 'Doe',
        prenom: 'John',
        etablissementId: 'uuid-etab-99',
      };

      await expect(service.register(dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should create user with APPRENANT role on public registration', async () => {
      mockPrisma.etablissement.findUnique.mockResolvedValue({ id: 'uuid-etab-1' });
      mockPrisma.utilisateur.findUnique.mockResolvedValue(null);
      mockPrisma.utilisateur.create.mockImplementation(async ({ data }) => ({
        ...data,
        id: 'uuid-user-1',
        createdAt: new Date(),
        actif: true,
      }));
      mockPrisma.auditLog.create.mockResolvedValue(null);

      const dto = {
        email: 'test@vitalis.com',
        password: 'password123',
        nom: 'Doe',
        prenom: 'John',
        etablissementId: 'uuid-etab-1',
      };

      const result = await service.register(dto);

      expect(mockPrisma.utilisateur.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ role: Role.APPRENANT }),
      }));
      expect(result.utilisateur.role).toBe(Role.APPRENANT);
      expect(result.success).toBe(true);
    });
  });
});
