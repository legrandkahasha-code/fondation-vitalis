-- AlterTable
ALTER TABLE "landing_page_settings" ADD COLUMN IF NOT EXISTS "hero_cta_texte" VARCHAR(100) DEFAULT 'Postuler pour la Session 2026';
ALTER TABLE "landing_page_settings" ADD COLUMN IF NOT EXISTS "hero_cta_lien" VARCHAR(255) DEFAULT '#formations';
ALTER TABLE "landing_page_settings" ADD COLUMN IF NOT EXISTS "hero_cta_secondaire_texte" VARCHAR(100) DEFAULT 'Télécharger la Brochure (PDF)';
ALTER TABLE "landing_page_settings" ADD COLUMN IF NOT EXISTS "hero_cta_secondaire_lien" VARCHAR(255) DEFAULT 'action:brochure';
ALTER TABLE "landing_page_settings" ADD COLUMN IF NOT EXISTS "hero_reassurance1" VARCHAR(150) DEFAULT 'Certificat officiel infalsifiable (QR Code)';
ALTER TABLE "landing_page_settings" ADD COLUMN IF NOT EXISTS "hero_reassurance2" VARCHAR(150) DEFAULT 'Ateliers pratiques & Équipements réels';
ALTER TABLE "landing_page_settings" ADD COLUMN IF NOT EXISTS "hero_reassurance3" VARCHAR(150) DEFAULT 'Immersion professionnelle active';
