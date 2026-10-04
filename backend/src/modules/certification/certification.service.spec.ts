import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CertificationService } from './certification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PedagogieService } from '../pedagogie/pedagogie.service';
import { PdfService } from '../../common/services/pdf.service';
import { StorageService } from '../../common/services/storage.service';
import { NotFoundException } from '@nestjs/common';

import { NotificationsService } from '../notifications/notifications.service';

describe('CertificationService (Business Rules)', () => {
  let service: CertificationService;

  const mockPrisma = {
    utilisateur: { findUnique: jest.fn() },
    formation: { findUnique: jest.fn() },
    certificat: { findFirst: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  const mockPedagogie = {
    getProgressByFormation: jest.fn(),
    getMoyennePonderee: jest.fn(),
  };

  const mockPdf = { generateCertificatPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')) };
  const mockStorage = { uploadFile: jest.fn().mockResolvedValue('/uploads/certificats/test.pdf') };
  const mockNotifications = { emit: jest.fn(), stream: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PedagogieService, useValue: mockPedagogie },
        { provide: PdfService, useValue: mockPdf },
        { provide: StorageService, useValue: mockStorage },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<CertificationService>(CertificationService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('emettreCertificat', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrisma.utilisateur.findUnique.mockResolvedValue(null);
      await expect(service.emettreCertificat('f1', 'u1', 'http://localhost:4200')).rejects.toThrow(NotFoundException);
    });

    it('should throw if completion rate < 100% (BR-03)', async () => {
      mockPrisma.utilisateur.findUnique.mockResolvedValue({ id: 'u1', nom: 'D', prenom: 'J', etablissement: { nom: 'E' } });
      mockPrisma.formation.findUnique.mockResolvedValue({ id: 'f1', titre: 'T', etablissement: { nom: 'E' } });
      mockPrisma.certificat.findFirst.mockResolvedValue(null);
      mockPedagogie.getProgressByFormation.mockResolvedValue({ completionRate: 80 });
      await expect(service.emettreCertificat('f1', 'u1', 'http://localhost:4200')).rejects.toThrow(/BR-03/);
    });

    it('should emit cert with CERT-YYYY-XXXXX format (BR-04)', async () => {
      mockPrisma.utilisateur.findUnique.mockResolvedValue({ id: 'u1', nom: 'D', prenom: 'J', etablissement: { nom: 'E' } });
      mockPrisma.formation.findUnique.mockResolvedValue({ id: 'f1', titre: 'T', etablissement: { nom: 'E' } });
      mockPrisma.certificat.findFirst.mockResolvedValue(null);
      mockPedagogie.getProgressByFormation.mockResolvedValue({ completionRate: 100 });
      mockPedagogie.getMoyennePonderee.mockResolvedValue(15);
      mockPrisma.certificat.create.mockImplementation(({ data }) => data);

      const res = await service.emettreCertificat('f1', 'u1', 'http://localhost:4200');
      expect(res.success).toBe(true);
      expect(res.certificat.numeroSerie).toMatch(new RegExp(`CERT-${new Date().getFullYear()}-\\d{5}`));
    });
  });
});
