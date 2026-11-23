-- ==============================================================================
-- Script de création de rôle local de développement (Modèle sécurisé)
-- ATTENTION : Ne jamais utiliser de mots de passe en clair par défaut.
-- Définir la variable POSTGRES_PASSWORD dans votre environnement local avant exécution.
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vitalis') THEN
    -- Utiliser un mot de passe sécurisé à remplacer lors de l'initialisation locale
    CREATE ROLE vitalis WITH LOGIN PASSWORD 'CHANGER_PAR_UN_MOT_DE_PASSE_SECURISE';
  END IF;
END $$;

ALTER ROLE vitalis WITH CREATEDB;
CREATE DATABASE vitalis_center OWNER vitalis;
