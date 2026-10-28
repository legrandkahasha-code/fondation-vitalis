-- AlterTable: affectations_formateurs
ALTER TABLE "affectations_formateurs"
    ADD COLUMN IF NOT EXISTS "volume_cm_heures" INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "volume_td_heures" INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "volume_tp_heures" INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "heures_effectuees" DECIMAL(6, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS "taux_horaire" DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS "devise" VARCHAR(5) DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS "date_debut" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "date_fin" TIMESTAMPTZ(6);

-- CreateEnum: statut_habilitation
DO $$ BEGIN
    CREATE TYPE "statut_habilitation" AS ENUM ('EN_ATTENTE', 'HABILITE', 'EXPIRE', 'SUSPENDU');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: statut_rattrapage
DO $$ BEGIN
    CREATE TYPE "statut_rattrapage" AS ENUM ('PROGRAMME', 'EN_COURS', 'CLOTURE', 'ANNULE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: statut_candidat_rattrapage
DO $$ BEGIN
    CREATE TYPE "statut_candidat_rattrapage" AS ENUM ('CONVOQUE', 'INSCRIT', 'ABSENT_JUSTIFIE', 'ABSENT_INJUSTIFIE', 'NOTE_SAISIE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: type_enquete
DO $$ BEGIN
    CREATE TYPE "type_enquete" AS ENUM ('A_CHAUD', 'A_FROID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: habilitations_formateurs
CREATE TABLE IF NOT EXISTS "habilitations_formateurs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "formateur_id" UUID NOT NULL,
    "etablissement_id" UUID NOT NULL,
    "discipline" VARCHAR(100) NOT NULL,
    "niveau_max" VARCHAR(50),
    "statut" "statut_habilitation" NOT NULL DEFAULT 'HABILITE',
    "date_octroi" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "date_expiration" TIMESTAMPTZ(6),
    "pieces_jointes_url" VARCHAR(512),
    "valide_par_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habilitations_formateurs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "habilitations_formateurs_formateur_id_fkey" FOREIGN KEY ("formateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "habilitations_formateurs_etablissement_id_fkey" FOREIGN KEY ("etablissement_id") REFERENCES "etablissements"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "habilitations_formateurs_valide_par_id_fkey" FOREIGN KEY ("valide_par_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "unique_formateur_discipline" ON "habilitations_formateurs"("formateur_id", "discipline");
CREATE INDEX IF NOT EXISTS "idx_habilitations_formateur" ON "habilitations_formateurs"("formateur_id");
CREATE INDEX IF NOT EXISTS "idx_habilitations_etablissement" ON "habilitations_formateurs"("etablissement_id");

-- CreateTable: sessions_rattrapage
CREATE TABLE IF NOT EXISTS "sessions_rattrapage" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "module_id" UUID NOT NULL,
    "formation_id" UUID NOT NULL,
    "etablissement_id" UUID NOT NULL,
    "date_session" TIMESTAMPTZ(6) NOT NULL,
    "salle_ou_lien" VARCHAR(255),
    "formateur_id" UUID NOT NULL,
    "statut" "statut_rattrapage" NOT NULL DEFAULT 'PROGRAMME',
    "note_plafond" DECIMAL(4, 2) DEFAULT 20.00,
    "session_numero" INTEGER NOT NULL DEFAULT 1,
    "remarques" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_rattrapage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sessions_rattrapage_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "sessions_rattrapage_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "sessions_rattrapage_etablissement_id_fkey" FOREIGN KEY ("etablissement_id") REFERENCES "etablissements"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "sessions_rattrapage_formateur_id_fkey" FOREIGN KEY ("formateur_id") REFERENCES "utilisateurs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_sessions_rattrapage_module" ON "sessions_rattrapage"("module_id");
CREATE INDEX IF NOT EXISTS "idx_sessions_rattrapage_formation" ON "sessions_rattrapage"("formation_id");
CREATE INDEX IF NOT EXISTS "idx_sessions_rattrapage_etablissement" ON "sessions_rattrapage"("etablissement_id");

-- CreateTable: inscriptions_rattrapages
CREATE TABLE IF NOT EXISTS "inscriptions_rattrapages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "session_id" UUID NOT NULL,
    "apprenant_id" UUID NOT NULL,
    "note_initiale" DECIMAL(4, 2) NOT NULL,
    "note_rattrapage" DECIMAL(4, 2),
    "note_retenue" DECIMAL(4, 2),
    "statut" "statut_candidat_rattrapage" NOT NULL DEFAULT 'CONVOQUE',
    "remarques" TEXT,
    "date_notation" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inscriptions_rattrapages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inscriptions_rattrapages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions_rattrapage"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "inscriptions_rattrapages_apprenant_id_fkey" FOREIGN KEY ("apprenant_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "unique_session_apprenant_rattrapage" ON "inscriptions_rattrapages"("session_id", "apprenant_id");
CREATE INDEX IF NOT EXISTS "idx_inscriptions_rattrapage_apprenant" ON "inscriptions_rattrapages"("apprenant_id");
CREATE INDEX IF NOT EXISTS "idx_inscriptions_rattrapage_session" ON "inscriptions_rattrapages"("session_id");

-- CreateTable: enquetes_satisfaction
CREATE TABLE IF NOT EXISTS "enquetes_satisfaction" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "formation_id" UUID NOT NULL,
    "module_id" UUID,
    "formateur_id" UUID NOT NULL,
    "apprenant_id" UUID NOT NULL,
    "type_enquete" "type_enquete" NOT NULL DEFAULT 'A_CHAUD',
    "anonyme" BOOLEAN NOT NULL DEFAULT true,
    "pedagogie_clarte" INTEGER NOT NULL,
    "maitrise_sujet" INTEGER NOT NULL,
    "disponibilite" INTEGER NOT NULL,
    "supports_cours" INTEGER NOT NULL,
    "pertinence_tps" INTEGER NOT NULL,
    "impact_emploi" INTEGER,
    "recommandation_nps" INTEGER,
    "commentaires" TEXT,
    "points_forts" TEXT,
    "axes_amelioration" TEXT,
    "score_global" DECIMAL(3, 2) NOT NULL,
    "date_soumission" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquetes_satisfaction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "enquetes_satisfaction_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "enquetes_satisfaction_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "enquetes_satisfaction_formateur_id_fkey" FOREIGN KEY ("formateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "enquetes_satisfaction_apprenant_id_fkey" FOREIGN KEY ("apprenant_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_enquetes_formateur_type" ON "enquetes_satisfaction"("formateur_id", "type_enquete");
CREATE INDEX IF NOT EXISTS "idx_enquetes_formation" ON "enquetes_satisfaction"("formation_id");
CREATE INDEX IF NOT EXISTS "idx_enquetes_apprenant" ON "enquetes_satisfaction"("apprenant_id");
