import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log('Connected to PostgreSQL database');

  const sql = `
    -- 1. Devoirs : support du versioning et de l'historique
    ALTER TABLE "soumissions_devoirs"
      ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "historique" JSONB DEFAULT '[]'::jsonb;

    -- 2. Utilisateurs : photoUrl dédiée
    ALTER TABLE "utilisateurs"
      ADD COLUMN IF NOT EXISTS "photo_url" VARCHAR(512);

    -- 3. Forum : Table questions_cours
    CREATE TABLE IF NOT EXISTS "questions_cours" (
      "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      "cours_id" UUID NOT NULL REFERENCES "cours"("id") ON DELETE CASCADE,
      "auteur_id" UUID NOT NULL REFERENCES "utilisateurs"("id") ON DELETE CASCADE,
      "question" TEXT NOT NULL,
      "votes" INTEGER NOT NULL DEFAULT 0,
      "resolu" BOOLEAN NOT NULL DEFAULT false,
      "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS "questions_cours_cours_id_idx" ON "questions_cours"("cours_id");
    CREATE INDEX IF NOT EXISTS "questions_cours_auteur_id_idx" ON "questions_cours"("auteur_id");

    -- 4. Forum : Table reponses_cours
    CREATE TABLE IF NOT EXISTS "reponses_cours" (
      "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      "question_id" UUID NOT NULL REFERENCES "questions_cours"("id") ON DELETE CASCADE,
      "auteur_id" UUID NOT NULL REFERENCES "utilisateurs"("id") ON DELETE CASCADE,
      "reponse" TEXT NOT NULL,
      "est_certifiee" BOOLEAN NOT NULL DEFAULT false,
      "votes" INTEGER NOT NULL DEFAULT 0,
      "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS "reponses_cours_question_id_idx" ON "reponses_cours"("question_id");
    CREATE INDEX IF NOT EXISTS "reponses_cours_auteur_id_idx" ON "reponses_cours"("auteur_id");
  `;

  await client.query(sql);
  console.log('Migration executed successfully in PostgreSQL!');
  await client.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
