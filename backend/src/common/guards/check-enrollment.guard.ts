import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService, ResourceAction, EnrollmentScope } from '../services/authorization.service';
import { CHECK_ENROLLMENT_KEY, CheckEnrollmentOptions } from '../decorators/check-enrollment.decorator';

@Injectable()
export class CheckEnrollmentGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authz: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<CheckEnrollmentOptions | undefined>(
      CHECK_ENROLLMENT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    const paramName = options.paramName ?? (
      options.resource === 'FORMATION' ? 'id'
        : options.resource === 'MODULE' ? 'moduleId'
        : 'id'
    );

    const resourceId =
      request.params?.[paramName] ??
      request.body?.[paramName] ??
      request.query?.[paramName];

    if (!resourceId) return true;

    switch (options.resource) {
      case 'FORMATION':
        await this.authz.canAccessFormation(user, resourceId, options.action, options.scope);
        break;
      case 'MODULE':
        await this.authz.canAccessModule(user, resourceId, options.action, options.scope);
        break;
      case 'COURS':
        await this.authz.canAccessCours(user, resourceId, options.action);
        break;
      case 'QUIZ':
        await this.authz.canAccessQuiz(user, resourceId, options.action);
        break;
      case 'DEVOIR':
        await this.authz.canAccessDevoir(user, resourceId, options.action);
        break;
      case 'SEANCE':
        await this.authz.canAccessSeance(user, resourceId, options.action);
        break;
      case 'EVALUATION':
        await this.authz.canAccessEvaluation(user, resourceId, options.action);
        break;
    }

    return true;
  }
}
