import { Test, TestingModule } from '@nestjs/testing';
import { PedagogieGradingService } from './pedagogie-grading.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { Role } from '../../../common/enums/role.enum';
import { ForbiddenException } from '@nestjs/common';

describe('PedagogieGradingService (Pondération & Intégrité BR-03)', () => {
  let service: PedagogieGradingService;

  const mockPrisma = {
    evaluation: {
      findUnique: jest.fn(),
    },
    utilisateur: {
      findUnique: jest.fn(),
    },
    note: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    module: {
      findMany: jest.fn(),
    },
  };

  const mockNotifications = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PedagogieGradingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<PedagogieGradingService>(PedagogieGradingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMoyennePonderee (Pénalisation des modules non évalués)', () => {
    it('doit pénaliser à 0/20 les modules obligatoires non évalués', async () => {
      // Formation avec 2 modules obligatoires (coeff 1 et coeff 1)
      // L'apprenant a 20/20 sur le module 1, mais 0 évaluation sur le module 2
      mockPrisma.module.findMany.mockResolvedValue([
        {
          id: 'mod-1',
          titre: 'Bases TypeScript',
          coefficient: 1,
          evaluations: [{ notes: [{ valeur: 20 }] }],
          devoirs: [],
          quiz: [],
        },
        {
          id: 'mod-2',
          titre: 'Architecture Système',
          coefficient: 1,
          evaluations: [{ notes: [] }], // Aucune note !
          devoirs: [],
          quiz: [],
        },
      ]);

      const moyenne = await service.getMoyennePonderee('formation-1', 'user-1');
      // Total poids = 1 + 1 = 2
      // Total pondéré = (20 * 1) + (0 * 1) = 20
      // Moyenne attendue = 20 / 2 = 10/20 (et non 20/20 !)
      expect(moyenne).toBe(10);
    });

    it('doit renvoyer 0 si aucun module obligatoire n a de note', async () => {
      mockPrisma.module.findMany.mockResolvedValue([
        {
          id: 'mod-1',
          titre: 'Bases TypeScript',
          coefficient: 1,
          evaluations: [],
          devoirs: [],
          quiz: [],
        },
      ]);

      const moyenne = await service.getMoyennePonderee('formation-1', 'user-1');
      expect(moyenne).toBe(0);
    });
  });

  describe('auditCompletudeEvaluations', () => {
    it('doit identifier les modules obligatoires manquants', async () => {
      mockPrisma.module.findMany.mockResolvedValue([
        {
          id: 'mod-1',
          titre: 'Bases TypeScript',
          coefficient: 1,
          evaluations: [{ notes: [{ valeur: 15 }] }],
          devoirs: [],
          quiz: [],
        },
        {
          id: 'mod-2',
          titre: 'Sécurité Réseau',
          coefficient: 2,
          evaluations: [],
          devoirs: [],
          quiz: [],
        },
      ]);

      const audit = await service.auditCompletudeEvaluations('formation-1', 'user-1');
      expect(audit.estComplet).toBe(false);
      expect(audit.modulesTotal).toBe(2);
      expect(audit.modulesEvalues).toBe(1);
      expect(audit.modulesManquants).toHaveLength(1);
      expect(audit.modulesManquants[0].titre).toBe('Sécurité Réseau');
    });

    it('doit valider la complétude si tous les modules obligatoires ont une note', async () => {
      mockPrisma.module.findMany.mockResolvedValue([
        {
          id: 'mod-1',
          titre: 'Bases TypeScript',
          coefficient: 1,
          evaluations: [{ notes: [{ valeur: 15 }] }],
          devoirs: [],
          quiz: [],
        },
        {
          id: 'mod-2',
          titre: 'Sécurité Réseau',
          coefficient: 2,
          evaluations: [],
          devoirs: [{ soumissions: [{ note: 14 }] }],
          quiz: [],
        },
      ]);

      const audit = await service.auditCompletudeEvaluations('formation-1', 'user-1');
      expect(audit.estComplet).toBe(true);
      expect(audit.modulesManquants).toHaveLength(0);
      expect(audit.modulesEvalues).toBe(2);
    });
  });
});
