import { Test, TestingModule } from '@nestjs/testing';
import { UtilisateursService } from './utilisateurs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
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
    loginAttempt: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('mock-token'),
    verify: jest.fn(),
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

  describe('Security: Token Typology & Anti-Confusion (CWE-287 / OWASP API2:2023)', () => {
    it('should strictly reject refreshToken if token_type is not refresh', async () => {
      // Un attaquant soumet un access token sur l'endpoint de refresh
      mockJwt.verify.mockReturnValue({
        sub: 'uuid-user-1',
        email: 'test@vitalis.com',
        role: Role.APPRENANT,
        token_type: 'access',
      });

      await expect(service.refreshToken('fake-access-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should accept valid refreshToken and generate rotated tokens with explicit token_type', async () => {
      mockJwt.verify.mockReturnValue({
        sub: 'uuid-user-1',
        email: 'test@vitalis.com',
        role: Role.APPRENANT,
        token_type: 'refresh',
      });
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'uuid-token-1',
        token: 'valid-refresh-token',
        revoked: false,
      });
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.utilisateur.findUnique.mockResolvedValue({
        id: 'uuid-user-1',
        email: 'test@vitalis.com',
        role: Role.APPRENANT,
        actif: true,
      });

      const res = await service.refreshToken('valid-refresh-token');

      expect(res.success).toBe(true);
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ token_type: 'access' }),
        expect.objectContaining({ expiresIn: '15m' }),
      );
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ token_type: 'refresh' }),
        expect.objectContaining({ expiresIn: '7d' }),
      );
    });
  });
});
