#!/usr/bin/env node
/**
 * ==============================================================================
 * VITALIS CENTER - Script de Sauvegarde Automatisée Multi-Plateforme (PRA/PCA)
 * ==============================================================================
 * Exécution : node backend/scripts/backup-db.js
 * Compatible : Linux, Windows, macOS, Docker, GitHub Actions
 * Caractéristiques :
 *  - Format compressé PostgreSQL (.dump ou .sql)
 *  - Calcul de checksum SHA-256 pour validation d'intégrité
 *  - Rétention et rotation automatique (supprime les backups > 14 jours)
 *  - Respect des exigences RPO < 24h & RTO < 2h
 * ==============================================================================
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 1. Résolution de l'URL de connexion
let dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const directMatch = envContent.match(/DIRECT_URL\s*=\s*["']?([^"'\r\n]+)["']?/);
    const dbMatch = envContent.match(/DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/);
    dbUrl = (directMatch ? directMatch[1] : null) || (dbMatch ? dbMatch[1] : null);
  }
}

if (!dbUrl) {
  console.error('❌ ERREUR: DATABASE_URL ou DIRECT_URL non défini !');
  process.exit(1);
}

// 2. Parser la chaîne de connexion
let parsed;
try {
  parsed = new URL(dbUrl.replace(/^postgresql:/, 'http:'));
} catch (e) {
  console.error('❌ ERREUR: URL de base de données invalide:', e.message);
  process.exit(1);
}

const dbUser = decodeURIComponent(parsed.username || 'postgres');
const dbPassword = decodeURIComponent(parsed.password || '');
const dbHost = parsed.hostname;
const dbPort = parsed.port || '5432';
const dbName = parsed.pathname.replace(/^\//, '');

// 3. Dossier de destination
const backupDir = path.resolve(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_');
const outputFile = path.join(backupDir, `vitalis_${dbName}_${timestamp}.sql`);

console.log(`📦 Démarrage de la sauvegarde de la base [${dbName}] sur [${dbHost}:${dbPort}]...`);

// 4. Exécuter pg_dump
try {
  const env = { ...process.env, PGPASSWORD: dbPassword };
  // Commande pg_dump propre et portable
  const cmd = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --no-owner --no-privileges -f "${outputFile}"`;
  
  execSync(cmd, { env, stdio: 'inherit' });

  // 5. Calcul de l'empreinte SHA-256
  const fileBuffer = fs.readFileSync(outputFile);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const sizeMb = (fileBuffer.length / (1024 * 1024)).toFixed(2);

  fs.writeFileSync(`${outputFile}.sha256`, `${hash}  ${path.basename(outputFile)}\n`);

  console.log(`✅ Sauvegarde réussie : ${outputFile}`);
  console.log(`📊 Taille : ${sizeMb} MB | Checksum SHA256 : ${hash}`);

  // 6. Rotation automatique : supprimer les sauvegardes de plus de 14 jours
  const maxAgeMs = 14 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const files = fs.readdirSync(backupDir);

  let deletedCount = 0;
  for (const file of files) {
    const fullPath = path.join(backupDir, file);
    const stats = fs.statSync(fullPath);
    if (now - stats.mtimeMs > maxAgeMs) {
      fs.unlinkSync(fullPath);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    console.log(`🧹 Rotation : ${deletedCount} ancienne(s) sauvegarde(s) purgée(s) (> 14 jours).`);
  }

  process.exit(0);
} catch (error) {
  console.error(`❌ Échec de la sauvegarde : ${error.message}`);
  process.exit(1);
}
