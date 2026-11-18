-- CreateTable: affectations_formateurs
CREATE TABLE IF NOT EXISTS "affectations_formateurs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "module_id" UUID NOT NULL,
    "formateur_id" UUID NOT NULL,
    "est_coordonnateur" BOOLEAN NOT NULL DEFAULT false,
    "heures_allouees" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affectations_formateurs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "affectations_formateurs_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "affectations_formateurs_formateur_id_fkey" FOREIGN KEY ("formateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "unique_affectation_module_formateur" ON "affectations_formateurs"("module_id", "formateur_id");
CREATE INDEX IF NOT EXISTS "idx_affectations_formateur" ON "affectations_formateurs"("formateur_id");
CREATE INDEX IF NOT EXISTS "idx_affectations_module" ON "affectations_formateurs"("module_id");
