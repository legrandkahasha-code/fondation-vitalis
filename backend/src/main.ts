import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { join } from 'path';

// Charger l'environnement dès le démarrage
dotenv.config({ path: join(process.cwd(), '.env') });
dotenv.config({ path: join(process.cwd(), 'backend', '.env') });

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { swaggerProtect } from './common/middleware/swagger-protect.middleware';
import { AppModule } from './app.module';

// Polyfill pour sérialiser les BigInt en JSON sans erreur
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Trop de requêtes. Réessayez dans quelques instants.',
    }),
  );

  app.setGlobalPrefix('api');

  const rawCorsOrigin = process.env.CORS_ORIGIN || '';
  const allowedOrigins = rawCorsOrigin
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Autoriser les requêtes sans header origin (outils CLI, requêtes internes, SSR, curl)
      if (!origin) {
        return callback(null, true);
      }

      const cleanOrigin = origin.replace(/\/$/, '');

      // Mode wildcard explicite ou liste vide en mode dev/cloud
      if (rawCorsOrigin === '*' || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      // Correspondance exacte dans la liste blanche
      if (allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }

      // Tolérance pour localhost, 127.0.0.1, sous-domaines cloud courants (Render, Vercel, Netlify)
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin);
      const isRender = /^https:\/\/[\w-]+(\.[\w-]+)*\.onrender\.com$/.test(cleanOrigin);
      const isVercel = /^https:\/\/[\w-]+(\.[\w-]+)*\.vercel\.app$/.test(cleanOrigin);
      const isNetlify = /^https:\/\/[\w-]+(\.[\w-]+)*\.netlify\.app$/.test(cleanOrigin);

      if (isLocalhost || isRender || isVercel || isNetlify) {
        return callback(null, true);
      }

      // Rejet propre sans lever d'exception 500
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'x-tenant-id',
      'x-swagger-token',
      'Range',
    ],
    exposedHeaders: ['Content-Disposition', 'Content-Range', 'Accept-Ranges', 'Content-Length'],
    credentials: true,
    maxAge: 86400, // 24h cache preflight
  });

  // Rate limiter strict pour l'authentification (Protection Brute-Force ANSSI)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // max 15 requêtes par fenêtre pour éviter le brute-force
    standardHeaders: true,
    legacyHeaders: false,
    message: { statusCode: 429, message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
  });
  app.use('/api/utilisateurs/login', authLimiter);
  app.use('/api/utilisateurs/register', authLimiter);
  app.use('/api/utilisateurs/enroler', authLimiter);

  // Rate limiter pour le formulaire de contact public
  const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { statusCode: 429, message: 'Trop de messages envoyés. Réessayez plus tard.' },
  });
  app.use('/api/landing/contact', contactLimiter);

  const candidateUploads = [
    join(process.cwd(), 'backend', 'uploads'),
    join(process.cwd(), 'uploads'),
  ];
  const uploadsDir = candidateUploads.find((dir) => fs.existsSync(dir)) || candidateUploads[0];
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
    index: false,
    setHeaders: (res, path, stat) => {
      const origin = (res.req as any)?.headers?.origin;
      if (origin && allowedOrigins.includes(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
      } else {
        res.set('Access-Control-Allow-Origin', allowedOrigins[0] || 'http://localhost:4200');
      }
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
      res.set('Accept-Ranges', 'bytes');
    },
  });

  const swaggerEnabled = process.env.SWAGGER_ENABLED === 'true';
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Vitalis Center EUP API')
      .setDescription('API REST — Système Multi-Tenant de Digitalisation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    // Optional protection for Swagger UI: require header `x-swagger-token` equal to SWAGGER_TOKEN
    try {
      app.use('/api/docs', swaggerProtect);
    } catch (e) {
      // fallback to dynamic import if needed in some environments
      app.use('/api/docs', (req, res, next) => swaggerProtect(req, res, next));
    }
    SwaggerModule.setup('api/docs', app, document);
    console.log(`Swagger — http://localhost:${process.env.PORT || 3000}/api/docs`);
  } else {
    console.log('Swagger est désactivé. Activez SWAGGER_ENABLED=true pour l’utiliser.');
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Vitalis Center API démarré sur http://0.0.0.0:${port}/api`);
}
bootstrap();
