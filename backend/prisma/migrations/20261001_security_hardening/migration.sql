-- Migration : Renforcement de la sécurité (ANSSI / OWASP / RGPD)
-- Création de la table de persistance du verrouillage de compte (Anti-Brute Force distribué)

CREATE TABLE IF NOT EXISTS "login_attempts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- Index unique sur l'email pour des vérifications instantanées
CREATE UNIQUE INDEX IF NOT EXISTS "login_attempts_email_key" ON "login_attempts"("email");
CREATE INDEX IF NOT EXISTS "idx_login_attempts_email" ON "login_attempts"("email");

-- Index sur expires_at et revoked pour l'optimisation des purges automatiques RGPD
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_expires_revoked" ON "refresh_tokens"("expires_at", "revoked");
