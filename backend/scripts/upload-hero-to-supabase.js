const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'vitalis-media';

console.log('Supabase URL configured:', !!supabaseUrl, supabaseUrl);
console.log('Supabase Key configured:', !!supabaseKey);

async function upload(filePath, key) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    console.error('File not found:', fullPath);
    return null;
  }
  const buffer = fs.readFileSync(fullPath);
  const endpoint = `${supabaseUrl}/storage/v1/object/${bucket}/${key}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
      'Content-Type': 'image/webp',
      'x-upsert': 'true',
    },
    body: buffer,
  });
  console.log(key, 'Status:', res.status, res.statusText);
  if (res.ok) {
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${key}`;
    console.log('PUBLIC URL:', publicUrl);
    return publicUrl;
  } else {
    console.error(await res.text());
    return null;
  }
}

async function run() {
  const fileDesktop = path.resolve(__dirname, '../uploads/hero/hero-7c449b8c-5eda-4983-b07d-a49b6ce9efe7-desktop.webp');
  const fileMobile = path.resolve(__dirname, '../uploads/hero/hero-7c449b8c-5eda-4983-b07d-a49b6ce9efe7-mobile.webp');

  const desktopUrl = await upload(fileDesktop, 'hero/hero-7c449b8c-5eda-4983-b07d-a49b6ce9efe7-desktop.webp');
  const mobileUrl = await upload(fileMobile, 'hero/hero-7c449b8c-5eda-4983-b07d-a49b6ce9efe7-mobile.webp');

  if (!desktopUrl || !mobileUrl) {
    console.error('Upload failed!');
    process.exit(1);
  }

  console.log('Uploading complete. Updating database...');

  const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.landingPageSettings.findFirst();
    console.log('Current settings in DB:', {
      heroImage: existing?.heroImage,
      heroImageMobile: existing?.heroImageMobile,
      heroImageDroitConfirme: existing?.heroImageDroitConfirme,
      heroImageAlt: existing?.heroImageAlt,
    });

    const updated = await prisma.landingPageSettings.update({
      where: { id: existing.id },
      data: {
        heroImage: desktopUrl,
        heroImageMobile: mobileUrl,
        heroImageDroitConfirme: true,
        heroImageAlt: existing?.heroImageAlt || 'Vitalis Center - Excellence en formation professionnelle',
        heroImageDroitDate: new Date(),
        heroImageDroitAuteur: 'admin-migration-supabase',
      },
    });

    console.log('Updated settings in DB:', {
      heroImage: updated.heroImage,
      heroImageMobile: updated.heroImageMobile,
      heroImageDroitConfirme: updated.heroImageDroitConfirme,
      heroImageAlt: updated.heroImageAlt,
    });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run().catch(console.error);
