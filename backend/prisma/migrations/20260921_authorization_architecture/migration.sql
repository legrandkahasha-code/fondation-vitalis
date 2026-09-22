-- Aligné sur le mapping Prisma (snake_case) et la fondation 20260822.

-- =============================================================
-- Niveau 2.1 : Apprenant.filiere_principale_id
-- =============================================================
ALTER TABLE "apprenants"
  ADD COLUMN IF NOT EXISTS "filiere_principale_id" UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apprenants' AND column_name = 'filierePrincipaleId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apprenants' AND column_name = 'filiere_principale_id'
  ) THEN
    ALTER TABLE "apprenants" RENAME COLUMN "filierePrincipaleId" TO "filiere_principale_id";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'apprenants_filiere_principale_id_fkey'
  ) THEN
    ALTER TABLE "apprenants"
      ADD CONSTRAINT "apprenants_filiere_principale_id_fkey"
      FOREIGN KEY ("filiere_principale_id") REFERENCES "filieres"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_apprenants_filiere_principale"
  ON "apprenants"("filiere_principale_id");

WITH classement AS (
  SELECT
    a.id AS apprenant_id,
    s.filiere_id,
    ROW_NUMBER() OVER (
      PARTITION BY a.id
      ORDER BY CASE c.statut::text
        WHEN 'INSCRITE'    THEN 1
        WHEN 'CONFIRMEE'   THEN 2
        WHEN 'ADMISE'      THEN 3
        WHEN 'LISTE_ATTENTE' THEN 4
        WHEN 'EN_EVALUATION' THEN 5
        WHEN 'SOUMISE'     THEN 6
        ELSE 99
      END, c.updated_at DESC
    ) AS rn
  FROM "apprenants" a
  JOIN "candidatures" c ON c.apprenant_id = a.id
  JOIN "sessions_admission" s ON s.id = c.session_id
  WHERE c.statut::text IN (
    'BROUILLON', 'SOUMISE', 'EN_EVALUATION', 'LISTE_ATTENTE',
    'ADMISE', 'CONFIRMEE', 'INSCRITE'
  )
)
UPDATE "apprenants" a
SET filiere_principale_id = c.filiere_id
FROM classement c
WHERE a.id = c.apprenant_id
  AND a.filiere_principale_id IS NULL
  AND c.rn = 1;

-- =============================================================
-- Niveau 3.2 : apprenant_filiere_intentions
-- =============================================================
CREATE TABLE IF NOT EXISTS "apprenant_filiere_intentions" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "apprenant_id" UUID NOT NULL,
  "filiere_id" UUID NOT NULL,
  "statut" VARCHAR(50) NOT NULL DEFAULT 'ENVISAGEE',
  "ordre_pref" INTEGER NOT NULL DEFAULT 1,
  "commentaire" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "apprenant_filiere_intentions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "apprenant_filiere_intentions_apprenant_id_fkey"
    FOREIGN KEY ("apprenant_id") REFERENCES "apprenants"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "apprenant_filiere_intentions_filiere_id_fkey"
    FOREIGN KEY ("filiere_id") REFERENCES "filieres"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "unique_apprenant_filiere_intention"
    UNIQUE ("apprenant_id", "filiere_id")
);

CREATE INDEX IF NOT EXISTS "idx_intentions_apprenant"
  ON "apprenant_filiere_intentions"("apprenant_id");
CREATE INDEX IF NOT EXISTS "idx_intentions_filiere"
  ON "apprenant_filiere_intentions"("filiere_id");

INSERT INTO "apprenant_filiere_intentions" ("apprenant_id", "filiere_id", "statut", "ordre_pref", "commentaire")
SELECT
  c.apprenant_id,
  s.filiere_id,
  CASE
    WHEN c.statut::text = 'INSCRITE'   THEN 'INSCRIT'
    WHEN c.statut::text = 'CONFIRMEE'  THEN 'INSCRIT'
    WHEN c.statut::text = 'ADMISE'     THEN 'ADMIS'
    WHEN c.statut::text = 'LISTE_ATTENTE' THEN 'ENVISAGEE'
    WHEN c.statut::text = 'EN_EVALUATION' THEN 'VOEU'
    WHEN c.statut::text = 'SOUMISE'    THEN 'VOEU'
    ELSE 'ENVISAGEE'
  END,
  ROW_NUMBER() OVER (
    PARTITION BY c.apprenant_id
    ORDER BY c.updated_at DESC
  ),
  'Backfill candidature'
FROM "candidatures" c
JOIN "sessions_admission" s ON s.id = c.session_id
WHERE c.statut::text IN (
  'SOUMISE', 'EN_EVALUATION', 'LISTE_ATTENTE',
  'ADMISE', 'CONFIRMEE', 'INSCRITE'
)
ON CONFLICT ("apprenant_id", "filiere_id") DO NOTHING;

-- =============================================================
-- Niveau 3.1 : visibilite (défaut PRE_ADMISSION = lecture dès candidature)
-- =============================================================
ALTER TABLE "modules"     ADD COLUMN IF NOT EXISTS "visibilite" TEXT NOT NULL DEFAULT 'PRE_ADMISSION';
ALTER TABLE "cours"       ADD COLUMN IF NOT EXISTS "visibilite" TEXT NOT NULL DEFAULT 'PRE_ADMISSION';
ALTER TABLE "quiz"        ADD COLUMN IF NOT EXISTS "visibilite" TEXT NOT NULL DEFAULT 'PRE_ADMISSION';
ALTER TABLE "devoirs"     ADD COLUMN IF NOT EXISTS "visibilite" TEXT NOT NULL DEFAULT 'PRE_ADMISSION';
ALTER TABLE "evaluations" ADD COLUMN IF NOT EXISTS "visibilite" TEXT NOT NULL DEFAULT 'PRE_ADMISSION';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'modules_visibilite_check') THEN
    ALTER TABLE "modules" ADD CONSTRAINT "modules_visibilite_check"
      CHECK ("visibilite" IN ('PUBLIQUE','PRE_ADMISSION','INSCRITS_SEULEMENT','ADMIN'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cours_visibilite_check') THEN
    ALTER TABLE "cours" ADD CONSTRAINT "cours_visibilite_check"
      CHECK ("visibilite" IN ('PUBLIQUE','PRE_ADMISSION','INSCRITS_SEULEMENT','ADMIN'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_visibilite_check') THEN
    ALTER TABLE "quiz" ADD CONSTRAINT "quiz_visibilite_check"
      CHECK ("visibilite" IN ('PUBLIQUE','PRE_ADMISSION','INSCRITS_SEULEMENT','ADMIN'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'devoirs_visibilite_check') THEN
    ALTER TABLE "devoirs" ADD CONSTRAINT "devoirs_visibilite_check"
      CHECK ("visibilite" IN ('PUBLIQUE','PRE_ADMISSION','INSCRITS_SEULEMENT','ADMIN'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evaluations_visibilite_check') THEN
    ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_visibilite_check"
      CHECK ("visibilite" IN ('PUBLIQUE','PRE_ADMISSION','INSCRITS_SEULEMENT','ADMIN'));
  END IF;
END $$;

-- =============================================================
-- Auto-rattachement FormationReferentiel (colonnes snake_case)
-- =============================================================
CREATE OR REPLACE FUNCTION resolve_formation_referentiel_on_session()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.formation_id IS NOT NULL AND NEW.filiere_id IS NOT NULL THEN
    UPDATE "formations" f
    SET formation_referentiel_id = (
      SELECT ref.id
      FROM "formations_referentiel" ref
      WHERE ref.filiere_id = NEW.filiere_id
        AND (NEW.niveau_id IS NULL OR ref.niveau_id = NEW.niveau_id)
      LIMIT 1
    )
    WHERE f.id = NEW.formation_id
      AND f.formation_referentiel_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_resolve_formation_referentiel ON "sessions_admission";
CREATE TRIGGER trg_resolve_formation_referentiel
AFTER INSERT OR UPDATE OF formation_id, filiere_id, niveau_id
ON "sessions_admission"
FOR EACH ROW EXECUTE FUNCTION resolve_formation_referentiel_on_session();
