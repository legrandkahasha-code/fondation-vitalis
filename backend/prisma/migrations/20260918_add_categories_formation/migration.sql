-- CreateTable: categories_formation
-- Catégories de formation gérées par l'Administrateur Central

CREATE TABLE IF NOT EXISTS "categories_formation" (
    "id"          UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code"        VARCHAR(50)  NOT NULL,
    "libelle"     VARCHAR(255) NOT NULL,
    "description" TEXT,
    "couleur"     VARCHAR(30)  DEFAULT '#1C75BC',
    "icone"       VARCHAR(50)  DEFAULT 'code',
    "ordre"       INTEGER      NOT NULL DEFAULT 0,
    "actif"       BOOLEAN      NOT NULL DEFAULT true,
    "created_at"  TIMESTAMPTZ(6) DEFAULT NOW(),

    CONSTRAINT "categories_formation_pkey" PRIMARY KEY ("id")
);

-- Unique index sur le code
CREATE UNIQUE INDEX IF NOT EXISTS "categories_formation_code_key"
    ON "categories_formation"("code");

-- Index pour les requêtes triées
CREATE INDEX IF NOT EXISTS "idx_categories_formation_ordre"
    ON "categories_formation"("ordre" ASC, "libelle" ASC);

-- Données initiales (catégories de base)
INSERT INTO "categories_formation" ("code", "libelle", "couleur", "icone", "ordre", "actif")
VALUES
  ('tech',      'Informatique & Tech',      '#1C75BC', 'computer',          1, true),
  ('gestion',   'Gestion & Administration', '#F7941D', 'business_center',   2, true),
  ('technique', 'Techniques Industrielles', '#2ECC71', 'build',             3, true)
ON CONFLICT ("code") DO NOTHING;
