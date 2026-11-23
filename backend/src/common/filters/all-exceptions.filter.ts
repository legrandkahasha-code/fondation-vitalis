import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtre global d'exception (Norme OWASP & ANSSI) :
 * Empêche toute fuite de schéma de base de données, requêtes Prisma, contraintes SQL
 * ou traces d'appels internes (stack traces) vers les clients HTTP en environnement de production.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const isProd = process.env.NODE_ENV === 'production';

    let errorResponse: any;

    if (isHttp) {
      const res = exception.getResponse();
      errorResponse = typeof res === 'object' ? res : { message: res };
    } else {
      const err = exception as any;
      this.logger.error(
        `[${request.method}] ${request.url} - Erreur interne: ${err?.message || err}`,
        err?.stack,
      );

      errorResponse = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: isProd
          ? 'Une erreur interne est survenue. Veuillez réessayer ultérieurement.'
          : err?.message || 'Erreur interne du serveur',
        timestamp: new Date().toISOString(),
      };
    }

    if (!response.headersSent) {
      response.status(status).json(errorResponse);
    }
  }
}
