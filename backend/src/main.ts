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
  app.disable('x-powered-by');

  const healthPayload = () =>
    JSON.stringify({
      status: 'ok',
      service: 'Vitalis Center API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  const sendHealth = (res: any) => {
    res.status(200).type('application/json').send(healthPayload());
  };
  app.use('/health', (req, res) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      return sendHealth(res);
    }
    res.status(405).end();
  });
  app.use('/', (req, res, next) => {
    if ((req.method === 'GET' || req.method === 'HEAD') && (req.path === '/' || req.path === '')) {
      return sendHealth(res);
    }
    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"], // Sécurité ANSSI/OWASP : interdiction absolue de 'unsafe-inline' pour les scripts
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", 'https:', 'wss:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"], // Protection anti-Clickjacking totale
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
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

  const isProd = process.env.NODE_ENV === 'production';
  const rawCorsOrigin = process.env.CORS_ORIGIN || '';
  const defaultOrigins = [
    'https://vitaliseup.org',
    'https://www.vitaliseup.org',
    'https://vitalis-center.cd',
    'https://www.vitalis-center.cd',
  ];
  const allowedOrigins = Array.from(
    new Set([
      ...defaultOrigins,
      ...rawCorsOrigin
        .split(',')
        .map((o) => o.trim().replace(/\/$/, ''))
        .filter(Boolean),
    ]),
  );

  app.enableCors({
    origin: (origin, callback) => {
      // Autoriser les requêtes sans header origin (outils CLI, requêtes internes, SSR, curl)
      if (!origin) {
        return callback(null, true);
      }

      const cleanOrigin = origin.replace(/\/$/, '');

      // Mode wildcard explicite (interdit en production)
      if (!isProd && (rawCorsOrigin === '*' || allowedOrigins.includes('*'))) {
        return callback(null, true);
      }

      // Correspondance exacte dans la liste blanche (inclut https://vitaliseup.org et https://www.vitaliseup.org)
      if (allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }

      // Autoriser les domaines officiels de production et plateformes cloud (Render, Vercel, Netlify)
      const isCloudFrontend =
        cleanOrigin === 'https://vitaliseup.org' ||
        cleanOrigin === 'https://www.vitaliseup.org' ||
        /^https:\/\/[\w-]+\.vitaliseup\.org$/.test(cleanOrigin) ||
        cleanOrigin === 'https://vitalis-center.cd' ||
        cleanOrigin === 'https://www.vitalis-center.cd' ||
        /^https:\/\/[\w-]+(\.[\w-]+)*\.onrender\.com$/.test(cleanOrigin) ||
        /^https:\/\/[\w-]+(\.[\w-]+)*\.vercel\.app$/.test(cleanOrigin) ||
        /^https:\/\/[\w-]+(\.[\w-]+)*\.netlify\.app$/.test(cleanOrigin);

      if (isCloudFrontend) {
        return callback(null, true);
      }

      // Tolérance pour localhost et développement local
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin);
      if (isLocalhost) {
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
      'Cache-Control',
      'Pragma',
      'If-None-Match',
      'If-Match',
      'If-Modified-Since',
    ],
    exposedHeaders: [
      'Content-Disposition',
      'Content-Range',
      'Accept-Ranges',
      'Content-Length',
      'ETag',
    ],
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
      if (origin && (allowedOrigins.includes(origin) || origin === 'https://vitaliseup.org' || origin === 'https://www.vitaliseup.org')) {
        res.set('Access-Control-Allow-Origin', origin);
      } else {
        res.set('Access-Control-Allow-Origin', allowedOrigins[0] || 'https://vitaliseup.org');
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

    // Middleware spécifique Swagger UI pour ne pas affaiblir la CSP globale de l'API
    app.use('/api/docs', (req, res, next) => {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self';",
      );
      next();
    });

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

  const port = parseInt(process.env.PORT || process.env.RENDER_PORT || '3000', 10);
  // Toujours écouter sur 0.0.0.0 pour garantir que Render, Docker et les reverse proxies détectent le port ouvert
  const host = '0.0.0.0';
  await app.listen(port, host);
  console.log(`✅ Vitalis Center API démarré sur http://${host}:${port}/api [NODE_ENV=${process.env.NODE_ENV || 'development'}]`);
}
bootstrap();
