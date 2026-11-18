import { Test, TestingModule } from '@nestjs/testing';
import { RattrapageService } from './rattrapage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Role } from '../../common/enums/role.enum';
import { ConflictException } from '@nestjs/common';

describe('RattrapageService (Sessions de Rattrapage & Compensation)', () => {
  let service: RattrapageService;

  const mockPrisma = {
    module: {
      findUnique: jest.fn(),
    },
    sessionRattrapage: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    inscriptionRattrapage: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    note: {
      upsert: jest.fn(),
    },
  };

  const mockNotifications = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RattrapageService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<RattrapageService>(RattrapageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('creerSession', () => {
    it('doit créer une session de rattrapage avec succès', async () => {
      mockPrisma.module.findUnique.mockResolvedValue({
        id: 'mod-1',
        formationId: 'form-1',
        formation: { id: 'form-1', etablissementId: 'etab-1' },
      });

      mockPrisma.sessionRattrapage.create.mockResolvedValue({
        id: 'session-1',
        moduleId: 'mod-1',
        formationId: 'form-1',
        etablissementId: 'etab-1',
        notePlafond: 20.0,
      });

      const res = await service.creerSession(
        {
          moduleId: 'mod-1',
          formationId: 'form-1',
          dateSession: '2026-11-01T10:00:00Z',
          formateurId: 'formateur-1',
        },
        { role: Role.ADMIN_CENTRE, id: 'admin-1', etablissementId: 'etab-1' },
      );

      expect(res.id).toBe('session-1');
      expect(mockPrisma.sessionRattrapage.create).toHaveBeenCalled();
    });
  });

  describe('saisirNote (Arbitrage Max(N_init, N_ratt))', () => {
    it('doit retenir la meilleure note plafonnée à notePlafond', async () => {
      mockPrisma.inscriptionRattrapage.findUnique.mockResolvedValue({
        id: 'inscr-1',
        apprenantId: 'app-1',
        noteInitiale: 7.5,
        session: {
          id: 'sess-1',
          moduleId: 'mod-1',
          formationId: 'form-1',
          etablissementId: 'etab-1',
          formateurId: 'formateur-1',
          notePlafond: 12.0, // Plafond ministériel
          module: {
            evaluations: [{ id: 'eval-1' }],
          },
        },
        apprenant: { id: 'app-1', nom: 'Mukendi', prenom: 'Grace' },
      });

      mockPrisma.inscriptionRattrapage.update.mockResolvedValue({
        id: 'inscr-1',
        noteInitiale: 7.5,
        noteRattrapage: 15.0,
        noteRetenue: 12.0, // Plafonné à 12
        statut: 'NOTE_SAISIE',
      });

      const res = await service.saisirNote(
        'inscr-1',
        { noteRattrapage: 15.0 },
        { role: Role.ADMIN_CENTRE, id: 'admin-1', etablissementId: 'etab-1' },
      );

      expect(mockPrisma.inscriptionRattrapage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            noteRattrapage: 15.0,
            noteRetenue: 12.0, // Plafond respecté
          }),
        }),
      );
      expect(mockNotifications.emit).toHaveBeenCalled();
      expect(res.noteRetenue).toBe(12.0);
    });

    it('doit conserver la note initiale si la note de rattrapage est inférieure', async () => {
      mockPrisma.inscriptionRattrapage.findUnique.mockResolvedValue({
        id: 'inscr-2',
        apprenantId: 'app-1',
        noteInitiale: 8.5,
        session: {
          id: 'sess-1',
          moduleId: 'mod-1',
          formationId: 'form-1',
          etablissementId: 'etab-1',
          formateurId: 'formateur-1',
          notePlafond: 20.0,
          module: { evaluations: [{ id: 'eval-1' }] },
        },
        apprenant: { id: 'app-1', nom: 'Mukendi', prenom: 'Grace' },
      });

      mockPrisma.inscriptionRattrapage.update.mockResolvedValue({
        id: 'inscr-2',
        noteInitiale: 8.5,
        noteRattrapage: 6.0,
        noteRetenue: 8.5, // Note initiale conservée
        statut: 'NOTE_SAISIE',
      });

      await service.saisirNote(
        'inscr-2',
        { noteRattrapage: 6.0 },
        { role: Role.ADMIN_CENTRE, id: 'admin-1', etablissementId: 'etab-1' },
      );

      expect(mockPrisma.inscriptionRattrapage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            noteRetenue: 8.5, // Max(8.5, 6.0)
          }),
        }),
      );
    });
  });
});
