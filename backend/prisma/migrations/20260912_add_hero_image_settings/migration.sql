-- AlterTable
ALTER TABLE "landing_page_settings" ADD COLUMN IF NOT EXISTS "hero_image" TEXT;
ALTER TABLE "landing_page_settings" ADD COLUMN IF NOT EXISTS "hero_badge1_texte" VARCHAR(100) DEFAULT '94% Insertion Professionnelle';
ALTER TABLE "landing_page_settings" ADD COLUMN IF NOT EXISTS "hero_badge2_texte" VARCHAR(100) DEFAULT 'Agrément Officiel RDC';
ALTER TABLE "landing_page_settings" ADD COLUMN IF NOT EXISTS "hero_badge3_texte" VARCHAR(100) DEFAULT 'Certificats Infalsifiables';
