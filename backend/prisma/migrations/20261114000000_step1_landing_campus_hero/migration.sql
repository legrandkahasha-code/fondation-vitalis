-- Migration Étape 1 : Refonte Landing Hero & Campus
-- Ajout des colonnes pour le respect du droit à l'image, formats mobiles et paramétrage dynamique

-- 1. Table landing_page_settings
ALTER TABLE "landing_page_settings" 
  ADD COLUMN IF NOT EXISTS "campus_eyebrow" TEXT,
  ADD COLUMN IF NOT EXISTS "campus_titre" TEXT,
  ADD COLUMN IF NOT EXISTS "campus_sous_titre" TEXT,
  ADD COLUMN IF NOT EXISTS "hero_image_mobile" TEXT,
  ADD COLUMN IF NOT EXISTS "hero_image_droit_confirme" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hero_image_droit_date" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "hero_image_droit_auteur" TEXT;

-- 2. Table landing_page_campus
ALTER TABLE "landing_page_campus" 
  ADD COLUMN IF NOT EXISTS "photo_url_mobile" TEXT,
  ADD COLUMN IF NOT EXISTS "photo_alt" TEXT,
  ADD COLUMN IF NOT EXISTS "droit_image_confirme" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "droit_image_date" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "droit_image_auteur" TEXT,
  ADD COLUMN IF NOT EXISTS "afficher_mobile" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "statut" VARCHAR NOT NULL DEFAULT 'BROUILLON',
  ADD COLUMN IF NOT EXISTS "afficher_landing" BOOLEAN NOT NULL DEFAULT true;
