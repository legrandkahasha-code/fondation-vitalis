import { NextFunction, Request, Response } from 'express';

export function swaggerProtect(req: Request, res: Response, next: NextFunction) {
  // En production, interdire formellement l'accès à Swagger sauf token secret explicite
  const isProd = process.env.NODE_ENV === 'production';
  const swaggerToken = process.env.SWAGGER_TOKEN;

  if (isProd && !swaggerToken) {
    res.status(403).json({ statusCode: 403, message: 'Documentation API non accessible en environnement de production.' });
    return;
  }

  if (!swaggerToken) return next();

  const provided = req.headers['x-swagger-token'] || req.query['swagger_token'];
  if (!provided || provided !== swaggerToken) {
    res.status(403).json({ statusCode: 403, message: 'Accès restreint. Jeton x-swagger-token valide obligatoire.' });
    return;
  }
  next();
}
