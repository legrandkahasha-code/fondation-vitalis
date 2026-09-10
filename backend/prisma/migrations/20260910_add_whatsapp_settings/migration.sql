-- AlterTable
ALTER TABLE "landing_page_settings" ADD COLUMN IF NOT EXISTS "contact_whatsapp" VARCHAR(50) DEFAULT '+243843010337';
ALTER TABLE "landing_page_settings" ADD COLUMN IF NOT EXISTS "whatsapp_message" TEXT DEFAULT 'Bonjour Vitalis Center EUP, je souhaite obtenir des informations sur vos formations professionnelles certifiées.';
ALTER TABLE "landing_page_settings" ADD COLUMN IF NOT EXISTS "whatsapp_actif" BOOLEAN DEFAULT true;
