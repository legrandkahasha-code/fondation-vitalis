import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import {
  AuthorizationService,
  ResourceAction,
  EnrollmentScope,
} from '../../common/services/authorization.service';

@Injectable()
export class QuizService {
  constructor(
    private prisma: PrismaService,
    private authz: AuthorizationService,
  ) {}

  private async assertModuleAccess(moduleId: string, user: any) {
    const scope = user.role === Role.APPRENANT
      ? EnrollmentScope.CANDIDATURE_OU_INSCRIPTION
      : EnrollmentScope.ETABLISSEMENT_ONLY;
    const { module: mod } = await this.authz.canAccessModule(user, moduleId, ResourceAction.READ, scope);
    return mod;
  }

  async create(moduleId: string, data: { titre: string; dureeMinutes?: number; questions: { enonce: string; options: { text: string; correct: boolean }[] }[] }, user: any) {
    await this.assertModuleAccess(moduleId, user);
    const quiz = await this.prisma.quiz.create({
      data: {
        moduleId,
        titre: data.titre,
        dureeMinutes: data.dureeMinutes,
        questions: {
          create: data.questions.map((q, i) => ({
            enonce: q.enonce,
            ordre: i + 1,
            options: q.options,
          })),
        },
      },
      include: { questions: true },
    });
    return quiz;
  }

  async findByModule(moduleId: string, user: any) {
    await this.assertModuleAccess(moduleId, user);
    const base = await this.prisma.quiz.findMany({
      where: { moduleId },
      include: { _count: { select: { questions: true, tentatives: true } } },
    });
    if (user.role === Role.APPRENANT) {
      for (const q of base) {
        await this.authz.canAccessQuiz(user, q.id, ResourceAction.READ);
      }
    }
    return base;
  }

  async findOne(id: string, user: any, forApprenant = false) {
    const { quiz } = await this.authz.canAccessQuiz(user, id, ResourceAction.READ);
    const full = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        module: { include: { formation: true } },
        questions: { orderBy: { ordre: 'asc' } },
      },
    });
    if (!full) throw new NotFoundException('Quiz introuvable.');
    if (forApprenant || user.role === Role.APPRENANT) {
      return {
        ...full,
        questions: full.questions.map(q => ({
          id: q.id,
          enonce: q.enonce,
          ordre: q.ordre,
          options: (q.options as any[]).map(o => ({ text: o.text })),
        })),
      };
    }
    return full;
  }

  async submit(quizId: string, reponses: { questionId: string; selectedIndex: number }[], user: any) {
    if (user.role !== Role.APPRENANT) throw new ForbiddenException('Réservé aux apprenants.');
    const { quiz } = await this.authz.canAccessQuiz(user, quizId, ResourceAction.WRITE);
    const full = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true, module: { include: { formation: true } } },
    });
    if (!full) throw new NotFoundException('Quiz introuvable.');

    const existing = await this.prisma.tentativeQuiz.findUnique({
      where: { quizId_apprenantId: { quizId, apprenantId: user.id } },
    });
    if (existing) throw new BadRequestException('Vous avez déjà passé ce quiz.');

    let correct = 0;
    const total = full.questions.length;
    for (const q of full.questions) {
      const rep = reponses.find(r => r.questionId === q.id);
      const opts = q.options as { text: string; correct: boolean }[];
      if (rep && opts[rep.selectedIndex]?.correct) correct++;
    }
    const score = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;

    return this.prisma.tentativeQuiz.create({
      data: {
        quizId,
        apprenantId: user.id,
        score,
        reponses: reponses as any,
      },
    });
  }

  async getMesTentatives(userId: string) {
    return this.prisma.tentativeQuiz.findMany({
      where: { apprenantId: userId },
      include: { quiz: { include: { module: { include: { formation: { select: { titre: true } } } } } } },
      orderBy: { datePassage: 'desc' },
    });
  }

  async update(id: string, data: { titre?: string; dureeMinutes?: number }, user: any) {
    const { } = await this.authz.canAccessQuiz(user, id, ResourceAction.UPDATE);
    return this.prisma.quiz.update({
      where: { id },
      data: {
        titre: data.titre,
        dureeMinutes: data.dureeMinutes,
      },
    });
  }

  async delete(id: string, user: any) {
    const { } = await this.authz.canAccessQuiz(user, id, ResourceAction.DELETE);
    return this.prisma.quiz.delete({ where: { id } });
  }
}
