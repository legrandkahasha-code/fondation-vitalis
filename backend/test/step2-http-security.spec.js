const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET;
const PORT = 3097;

// Génération de tokens de test avec vrais utilisateurs ACTIFS de la base
const apprenantToken = jwt.sign(
  {
    sub: '0fc6d7fa-00a3-49eb-a4dd-69740ef4db1c',
    email: 'esthamalonda0511@gmail.com',
    role: 'APPRENANT',
    token_type: 'access',
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const adminToken = jwt.sign(
  {
    sub: 'cdab894a-010a-4203-b153-cc1b69467d15',
    email: 'bahatilegrand@gmail.com',
    role: 'ADMIN_CENTRE',
    token_type: 'access',
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

async function testHttpSecurity() {
  process.env.PORT = String(PORT);
  
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require('../dist/src/app.module');

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  await app.listen(PORT);
  console.log('Serveur Nest de test démarré sur le port', PORT);

  try {
    // 1. TEST SANS JETON -> 401
    console.log('\n--- 1. APPEL SANS JETON (POST /api/landing/campus/upload-photo) ---');
    const resNoToken = await fetch(`http://localhost:${PORT}/api/landing/campus/upload-photo`, {
      method: 'POST',
    });
    console.log('Status code sans jeton :', resNoToken.status, resNoToken.status === 401 ? '✓ (401 Unauthorized)' : '❌');

    // 2. TEST AVEC RÔLE NON-ADMIN (APPRENANT) -> 403
    console.log('\n--- 2. APPEL AVEC RÔLE NON-ADMIN (APPRENANT) (POST /api/landing/campus/upload-photo) ---');
    const resApprenant = await fetch(`http://localhost:${PORT}/api/landing/campus/upload-photo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apprenantToken}`,
      },
    });
    console.log('Status code avec rôle APPRENANT :', resApprenant.status, resApprenant.status === 403 ? '✓ (403 Forbidden)' : '❌');

    // 3. TEST HERO SANS JETON -> 401
    console.log('\n--- 3. APPEL HERO SANS JETON (POST /api/landing/hero/upload-image) ---');
    const resHeroNoToken = await fetch(`http://localhost:${PORT}/api/landing/hero/upload-image`, {
      method: 'POST',
    });
    console.log('Status code Hero sans jeton :', resHeroNoToken.status, resHeroNoToken.status === 401 ? '✓ (401 Unauthorized)' : '❌');

    // 4. TEST HERO AVEC RÔLE NON-ADMIN -> 403
    console.log('\n--- 4. APPEL HERO AVEC RÔLE NON-ADMIN (APPRENANT) ---');
    const resHeroApprenant = await fetch(`http://localhost:${PORT}/api/landing/hero/upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apprenantToken}`,
      },
    });
    console.log('Status code Hero avec rôle APPRENANT :', resHeroApprenant.status, resHeroApprenant.status === 403 ? '✓ (403 Forbidden)' : '❌');

    // 5. TEST AVEC RÔLE ADMIN_CENTRE (Accès autorisé)
    console.log('\n--- 5. APPEL AVEC RÔLE ADMIN_CENTRE ---');
    const resAdmin = await fetch(`http://localhost:${PORT}/api/landing/campus/upload-photo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    console.log('Status code avec rôle ADMIN_CENTRE (sans fichier) :', resAdmin.status, resAdmin.status === 400 ? '✓ (400 Bad Request - Gardes passés avec succès)' : '❌');

  } finally {
    await app.close();
    console.log('\nServeur Nest de test arrêté.');
  }
}

testHttpSecurity().catch(err => {
  console.error('Erreur test HTTP :', err);
  process.exit(1);
});
