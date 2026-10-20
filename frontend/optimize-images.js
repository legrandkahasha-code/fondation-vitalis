/**
 * Script de conversion d'images campus en WebP optimisé
 * Génère des variantes mobile (640w) et desktop (1280w)
 */
const fs = require('fs');
const path = require('path');

const CAMPUS_DIR = path.join(__dirname, 'public', 'assets', 'campus');
const IMAGES = ['lab-informatique.jpg', 'atelier-energie.jpg', 'centre-examen.jpg', 'salle-conferences.jpg'];

async function convert() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.log('Installing sharp...');
    require('child_process').execSync('npm install sharp --no-save', { stdio: 'inherit', cwd: __dirname });
    sharp = require('sharp');
  }

  for (const img of IMAGES) {
    const src = path.join(CAMPUS_DIR, img);
    if (!fs.existsSync(src)) {
      console.log(`SKIP: ${img} not found`);
      continue;
    }

    const baseName = path.basename(img, '.jpg');

    // WebP mobile (640px width, quality 72)
    await sharp(src)
      .resize(640, null, { withoutEnlargement: true })
      .webp({ quality: 72, effort: 6 })
      .toFile(path.join(CAMPUS_DIR, `${baseName}-mobile.webp`));
    console.log(`✓ ${baseName}-mobile.webp (640w)`);

    // WebP desktop (1280px width, quality 78)
    await sharp(src)
      .resize(1280, null, { withoutEnlargement: true })
      .webp({ quality: 78, effort: 6 })
      .toFile(path.join(CAMPUS_DIR, `${baseName}-desktop.webp`));
    console.log(`✓ ${baseName}-desktop.webp (1280w)`);

    // JPG mobile fallback (640px, quality 70)
    await sharp(src)
      .resize(640, null, { withoutEnlargement: true })
      .jpeg({ quality: 70, progressive: true })
      .toFile(path.join(CAMPUS_DIR, `${baseName}-mobile.jpg`));
    console.log(`✓ ${baseName}-mobile.jpg (640w fallback)`);
  }

  // Report sizes
  console.log('\n--- Tailles finales ---');
  const files = fs.readdirSync(CAMPUS_DIR);
  for (const f of files.sort()) {
    const size = fs.statSync(path.join(CAMPUS_DIR, f)).size;
    const kb = (size / 1024).toFixed(1);
    console.log(`  ${f}: ${kb} KB`);
  }
}

convert().catch(console.error);
