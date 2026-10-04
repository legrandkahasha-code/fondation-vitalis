# Plan de Continuité d'Activité (PCA) & Plan de Reprise d'Activité (PRA)
## Système d'Information Vitalis Center EUP

---

### 1. Objectifs & Cadre Stratégique

Le présent document définit les procédures techniques et organisationnelles garantissant la survie, la haute disponibilité et la résilience du système Vitalis Center en cas d'incident majeur ou de sinistre sur l'infrastructure d'hébergement.

| Paramètre | Définition | Objectif Garanti |
| :--- | :--- | :--- |
| **RPO (Recovery Point Objective)** | Perte maximale de données admissible | **< 24 heures** (sauvegardes nocturnes + WAL Supabase) |
| **RTO (Recovery Time Objective)** | Durée maximale d'interruption admissible | **< 2 heures** (redéploiement automatisé) |
| **MTPD (Maximum Tolerable Period of Disruption)** | Seuil critique d'interruption | **4 heures** |

---

### 2. Matrice d'Analyse des Risques & Redondance

| Composant | Fournisseur / Technologie | Risque Identifié | Solution de Résilience & Bascule |
| :--- | :--- | :--- | :--- |
| **Base de Données** | PostgreSQL (Supabase / Render) | Crash disque, corruption, ransomware | Sauvegardes automatisées quotidiennes GitHub Actions + PITR (Point-in-Time Recovery) |
| **Backend API** | NestJS (Node.js 22) | Crash container, faille applicative | Redémarrage automatique, multi-instances, health checks `/health` |
| **Frontend** | Angular SPA (Nginx) | Défaillance nœud d'hébergement | Hébergement distribué CDN / Render Static + fallback |
| **Fichiers & Médias** | Supabase Storage / S3 / Local | Perte du stockage local | Stockage objet avec réplication Cloud chiffrée |

---

### 3. Stratégie de Sauvegarde Multi-Niveaux

1. **Niveau 1 — Sauvegarde Automatisée Quotidienne (Cron GitHub Actions)**
   - Exécutée chaque nuit à **02:00 UTC** via `.github/workflows/db-backup.yml`.
   - Script Node.js portable : `backend/scripts/backup-db.js`.
   - Calcul et archivage de l'empreinte cryptographique **SHA-256**.
   - Chiffrement et rétention de 30 jours dans des artefacts sécurisés hors-site.
   - Rotation automatique des fichiers locaux (purge > 14 jours).

2. **Niveau 2 — Sauvegardes Manuelles Pré-Déploiement**
   - Toute mise en production majeure ou migration de schéma Prisma doit être précédée de :
     ```bash
     node backend/scripts/backup-db.js
     ```

3. **Niveau 3 — Rétention des Fichiers Utilisateurs**
   - Stockage sur Supabase Storage (CDN S3 compatible) garantissant une durabilité de 99.999999999% (11 9's).

---

### 4. Procédure Opérationnelle de Restauration d'Urgence (Runbook)

En cas de perte totale de la base de données ou de compromission :

#### Étape 1 : Isolation et Mise en Maintenance
Activer la page de maintenance sur le proxy Nginx ou CDN Cloudflare pour couper les écritures :
```bash
# Arrêt immédiat des instances API pour éviter les corruptions en cascade
git checkout maintenance
```

#### Étape 2 : Récupération de la dernière archive valide
Télécharger la dernière archive depuis GitHub Actions Artifacts ou le dossier `backend/backups/`.
Vérifier l'intégrité du fichier avec son empreinte SHA-256 :
```bash
sha256sum -c vitalis_vitalis_center_YYYYMMDD_HHMMSS.sql.sha256
```

#### Étape 3 : Restauration de la Base de Données
Créer une nouvelle instance PostgreSQL ou nettoyer la base compromise :
```bash
# Variables d'environnement de la cible
export PGPASSWORD="votre_mot_de_passe"
export DB_HOST="db.vitalis-center.internal"
export DB_USER="vitalis"
export DB_NAME="vitalis_center"

# Recréation de la base propre
psql -h $DB_HOST -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE $DB_NAME;"

# Restauration du dump
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f vitalis_backup.sql
```

#### Étape 4 : Exécution des Migrations et Validation
```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npm run test:e2e
```

#### Étape 5 : Réouverture du Trafic & Notification
- Redémarrer le service backend.
- Tester le endpoint `/health`.
- Désactiver la page de maintenance.
- Documenter l'incident dans le registre post-mortem.

---

### 5. Calendrier des Tests Semestriels de Reprise (Dry Run)

Pour garantir que les procédures ne deviennent pas obsolètes :
- **Février** : Test de restauration du dump sur un environnement de staging isolé.
- **Août** : Exercice de bascule DNS et simulation de défaillance fournisseur.
- Validation obligatoire du temps réel de reprise (< 120 minutes).
