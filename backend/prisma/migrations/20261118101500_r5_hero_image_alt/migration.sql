-- Migration R5 : ajout de la colonne hero_image_alt pour le texte alternatif administrable
ALTER TABLE "landing_page_settings" ADD COLUMN IF NOT EXISTS "hero_image_alt" TEXT;
