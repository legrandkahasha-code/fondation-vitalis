import { Test, TestingModule } from '@nestjs/testing';
import { ApprenantService } from './apprenant.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { PedagogieService } from '../pedagogie/pedagogie.service';
import { CertificationService } from '../certification/certification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Role } from '../../common/enums/role.enum';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ApprenantService (Performance & BR-03)', () => {
  let service: ApprenantService;
  let prisma: PrismaService;
  let pedagogieService: PedagogieService;

  const mockPrisma = {
    formation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    soumissionDevoir: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    seanceFormation: {
      findFirst: jest.fn(),
    },
    tentativeQuiz: {
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    certificat: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    userProgress: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    devoir: {
      findFirst: jest.fn(),
    },
    apprenant: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    inscription: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    candidature: {
      findFirst: jest.fn(),
    },
    cours: {
      findUnique: jest.fn(),
    },
    quiz: {
      findUnique: jest.fn(),
    },
    documentDossier: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    demandeRegularisation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockStorageService = {
    uploadFile: jest.fn(),
    resolveUrl: jest.fn((u) => u),
  };

  const mockPedagogieService = {
    getProgressByFormation: jest.fn(),
    getMoyennePonderee: jest.fn(),
  };

  const mockCertificationService = {
    genererCertificat: jest.fn(),
  };

  const mockNotificationsService = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprenantService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorageService },
        { provide: PedagogieService, useValue: mockPedagogieService },
        { provide: CertificationService, useValue: mockCertificationService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<ApprenantService>(ApprenantService);
    prisma = module.get<PrismaService>(PrismaService);
    pedagogieService = module.get<PedagogieService>(PedagogieService);
    service.invalidateUserCache('u-apprenant-1');
  });

  afterEach(() => {
    service.invalidateUserCache('u-apprenant-1');
    jest.clearAllMocks();
  });

  describe('assertApprenant', () => {
    it('should throw ForbiddenException if user is not APPRENANT', async () => {
      const nonApprenant = { id: 'u-1', role: Role.FORMATEUR, etablissementId: 'e-1' };
      await expect(service.getDashboard(nonApprenant)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getDashboard (Optimized Single Batch Query)', () => {
    it('should compute aggregated metrics and in-memory progress correctly', async () => {
      const user = { id: 'u-apprenant-1', role: Role.APPRENANT, etablissementId: 'e-1' };

      mockPrisma.formation.findMany.mockResolvedValue([
        {
          id: 'f-1',
          titre: 'Développement Web',
          description: 'Formation Web',
          modules: [
            {
              id: 'm-1',
              cours: [{ id: 'c-1' }, { id: 'c-2' }],
            },
          ],
          certificats: [],
        },
      ]);
      mockPrisma.soumissionDevoir.findMany.mockResolvedValue([]);
      mockPrisma.seanceFormation.findFirst.mockResolvedValue(null);
      mockPrisma.tentativeQuiz.count.mockResolvedValue(3);
      mockPrisma.certificat.count.mockResolvedValue(0);
      mockPrisma.userProgress.findMany.mockResolvedValue([{ coursId: 'c-1' }]);
      mockPrisma.devoir.findFirst.mockResolvedValue(null);

      const dashboard = await service.getDashboard(user);

      expect(dashboard.completionGlobale).toBe(50); // 1 cours complété sur 2 = 50%
      expect(dashboard.nbFormations).toBe(1);
      expect(dashboard.nbQuizPasses).toBe(3);
      expect(dashboard.formationsActives[0].pourcentage).toBe(50);
      expect(dashboard.formationsActives[0].coursCompletes).toBe(1);
      expect(dashboard.formationsActives[0].totalCours).toBe(2);
    });
  });

  describe('checkEligibiliteCertificat (BR-03)', () => {
    beforeEach(() => {
      mockPrisma.inscription.findFirst.mockResolvedValue({ id: 'ins-1' });
    });

    it('should reject eligibility if courses are not 100% completed', async () => {
      const user = { id: 'u-apprenant-1', role: Role.APPRENANT, etablissementId: 'e-1' };
      mockPrisma.formation.findUnique.mockResolvedValue({ id: 'f-1', etablissementId: 'e-1' });
      mockPrisma.certificat.findFirst.mockResolvedValue(null);
      mockPedagogieService.getProgressByFormation.mockResolvedValue({ completionRate: 80 });
      mockPedagogieService.getMoyennePonderee.mockResolvedValue(14);

      const result = await service.checkEligibiliteCertificat('f-1', user);

      expect(result.eligible).toBe(false);
      expect(result.raison).toContain('incomplète');
    });

    it('should reject eligibility if weighted average is < 10/20', async () => {
      const user = { id: 'u-apprenant-1', role: Role.APPRENANT, etablissementId: 'e-1' };
      mockPrisma.formation.findUnique.mockResolvedValue({ id: 'f-1', etablissementId: 'e-1' });
      mockPrisma.certificat.findFirst.mockResolvedValue(null);
      mockPedagogieService.getProgressByFormation.mockResolvedValue({ completionRate: 100 });
      mockPedagogieService.getMoyennePonderee.mockResolvedValue(9.5);

      const result = await service.checkEligibiliteCertificat('f-1', user);

      expect(result.eligible).toBe(false);
      expect(result.raison).toContain('insuffisante');
    });

    it('should grant eligibility when 100% completed and average >= 10/20', async () => {
      const user = { id: 'u-apprenant-1', role: Role.APPRENANT, etablissementId: 'e-1' };
      mockPrisma.formation.findUnique.mockResolvedValue({ id: 'f-1', etablissementId: 'e-1' });
      mockPrisma.certificat.findFirst.mockResolvedValue(null);
      mockPedagogieService.getProgressByFormation.mockResolvedValue({ completionRate: 100 });
      mockPedagogieService.getMoyennePonderee.mockResolvedValue(15.5);

      const result = await service.checkEligibiliteCertificat('f-1', user);

      expect(result.eligible).toBe(true);
      expect(result.raison).toBeNull();
    });
  });

  describe('repondreRegularisation', () => {
    it('should throw NotFoundException if demande does not exist', async () => {
      const user = { id: 'u-apprenant-1', role: Role.APPRENANT };
      mockPrisma.demandeRegularisation.findUnique.mockResolvedValue(null);

      await expect(
        service.repondreRegularisation('reg-1', undefined, 'Mon commentaire', user),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if demande belongs to another user', async () => {
      const user = { id: 'u-apprenant-1', role: Role.APPRENANT };
      mockPrisma.demandeRegularisation.findUnique.mockResolvedValue({
        id: 'reg-1',
        utilisateurId: 'other-user',
      });

      await expect(
        service.repondreRegularisation('reg-1', undefined, 'Mon commentaire', user),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should upload file and mark regularisation as SOUMIS', async () => {
      const user = { id: 'u-apprenant-1', role: Role.APPRENANT, nom: 'Diallo', prenom: 'Amadou' };
      mockPrisma.demandeRegularisation.findUnique.mockResolvedValue({
        id: 'reg-1',
        utilisateurId: 'u-apprenant-1',
        auteurId: 'agent-1',
        motif: 'Carte d identite manquante',
      });
      mockStorageService.uploadFile.mockResolvedValue('dossiers/doc-123.pdf');
      mockPrisma.documentDossier.create.mockResolvedValue({
        id: 'doc-1',
        fileUrl: 'dossiers/doc-123.pdf',
      });
      mockPrisma.demandeRegularisation.update.mockResolvedValue({
        id: 'reg-1',
        statut: 'SOUMIS',
      });

      const mockFile: any = {
        buffer: Buffer.from('%PDF-test'),
        originalname: 'cni.pdf',
        mimetype: 'application/pdf',
      };

      const res = await service.repondreRegularisation('reg-1', mockFile, 'Voici ma CNI', user);

      expect(mockStorageService.uploadFile).toHaveBeenCalled();
      expect(mockPrisma.documentDossier.create).toHaveBeenCalled();
      expect(mockPrisma.demandeRegularisation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'reg-1' },
          data: expect.objectContaining({ statut: 'SOUMIS' }),
        }),
      );
      expect(mockNotificationsService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REGULARISATION_REPONDUE',
          recipientUserId: 'agent-1',
        }),
      );
      expect(res.demande.statut).toBe('SOUMIS');
    });
  });
});

