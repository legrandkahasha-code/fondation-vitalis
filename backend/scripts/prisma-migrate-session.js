/**
 * Prisma migrate via Supabase session pooler (5432).
 * Transaction pooler (6543) hangs on DDL.
 */
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function toSessionUrl(url) {
  if (!url) return url;
  return url.replace(/pooler\.supabase\.com:6543/g, 'pooler.supabase.com:5432');
}

const db = toSessionUrl(process.env.DIRECT_URL || process.env.DATABASE_URL);
if (!db) {
  console.error('DATABASE_URL / DIRECT_URL manquant dans backend/.env');
  process.exit(1);
}

process.env.DATABASE_URL = db;
process.env.DIRECT_URL = db;

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/prisma-migrate-session.js migrate deploy');
  process.exit(1);
}

console.log('Prisma via pooler session (port 5432).');
const child = spawn('npx', ['prisma', ...args], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
  env: process.env,
});
child.on('exit', (code) => process.exit(code ?? 1));
