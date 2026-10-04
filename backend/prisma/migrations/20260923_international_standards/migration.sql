-- Migration : 20260923_international_standards
-- Ajout des standards internationaux (Syllabus officiel, durée de cours, critères de notation, notes personnelles)

-- 1. Formations : Support du Syllabus officiel PDF
ALTER TABLE "formations" 
  ADD COLUMN IF NOT EXISTS "url_syllabus" VARCHAR(512),
  ADD COLUMN IF NOT EXISTS "syllabus_nom_fichier" VARCHAR(255);

-- 2. Cours : Estimation de durée en minutes (LMS Standard)
ALTER TABLE "cours" 
  ADD COLUMN IF NOT EXISTS "duree_minutes" INTEGER DEFAULT 15;

-- 3. Devoirs : Grille de critères d'évaluation / barème transparent
ALTER TABLE "devoirs" 
  ADD COLUMN IF NOT EXISTS "criteres_evaluation" JSONB;

-- 4. Progression Cours : Notes d'étude personnelles de l'apprenant
ALTER TABLE "progression_cours" 
  ADD COLUMN IF NOT EXISTS "notes_personnelles" TEXT;
