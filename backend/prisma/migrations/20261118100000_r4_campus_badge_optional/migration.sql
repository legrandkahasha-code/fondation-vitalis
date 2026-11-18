-- Migration R4 : suppression de la valeur par défaut du badge landing_page_campus (passage en nullable sans repli forcé)
ALTER TABLE "landing_page_campus" ALTER COLUMN "badge" DROP DEFAULT;
ALTER TABLE "landing_page_campus" ALTER COLUMN "badge" DROP NOT NULL;
