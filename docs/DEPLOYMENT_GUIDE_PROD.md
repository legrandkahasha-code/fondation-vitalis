# 🚀 Guide de Déploiement en Production — Vitalis Center EUP

Ce guide résume la procédure pas-à-pas pour déployer Vitalis Center en production (sur **Render**, **Docker / VPS**, ou tout autre hébergeur cloud).

---

## 🏗️ 1. Architecture de Déploiement

```mermaid
graph TD
    Client["Utilisateurs Web / Navigateurs"] -->|"HTTPS"| Front["Frontend Angular SPA (Static / Nginx)"]
    Client -->|"Requêtes API & SSE (/api)"| Back["Backend NestJS (Node 22)"]
    Back -->|"Prisma ORM"| Postgres[("PostgreSQL 16 / Supabase / Render DB")]
```

---

## ☁️ 2. Déploiement sur Render (Recommandé en mode Cloud)

Le projet contient un fichier [render.yaml](file:///d:/Vitalis%20centeur/render.yaml) (Blueprint) à la racine qui configure automatiquement les 3 services.

### Option A : Déploiement Automatique (Render Blueprint)
1. Rendez-vous sur votre tableau de bord [Render](https://dashboard.render.com).
2. Cliquez sur **New +** > **Blueprint**.
3. Connectez votre dépôt GitHub `vitalis-center`.
4. Render va automatiquement détecter `render.yaml` et créer :
   - **`cfpvitalis-db`** : Base de données PostgreSQL managée.
   - **`cfpvitalis-backend`** : Web Service NestJS connecté à la BDD avec migration automatique.
   - **`cfpvitalis-frontend`** : Static Site Angular avec redirection SPA.

---

### Option B : Déploiement Manuel sur Render

Si vous créez les services manuellement sur Render :

#### 1. Base de données PostgreSQL (`cfpvitalis-db`)
- **Type :** PostgreSQL
- Notez l'URL de connexion interne (`Internal Database URL`) ou externe.

#### 2. Backend Web Service (`cfpvitalis-backend`)
- **Root Directory :** `backend`
- **Runtime :** `Node`
- **Build Command :**
  ```bash
  npm install && npx prisma generate && npm run build
  ```
- **Start Command :**
  ```bash
  npm run start:prod
  ```
- **Health Check Path :** `/api/health`
- **Variables d'environnement :**
  - `NODE_ENV` = `production`
  - `PORT` = `3000` (Render attribue son propre port automatiquement)
  - `DATABASE_URL` = `<Votre URL PostgreSQL Render ou Supabase>`
  - `DIRECT_URL` = `<Votre URL PostgreSQL>`
  - `JWT_SECRET` = `<Chaîne aléatoire de 64 caractères>`
  - `CORS_ORIGIN` = `*` (ou l'URL de votre frontend `https://votre-frontend.onrender.com`)
  - `STORAGE_MODE` = `local` (ou `s3`)

#### 3. Frontend Static Site (`cfpvitalis-frontend`)
- **Root Directory :** `frontend`
- **Build Command :**
  ```bash
  npm install && npm run build
  ```
- **Publish Directory :** `dist/frontend/browser`
- **Redirection SPA (Rewrite Rule) :**
  - Source: `/*`
  - Destination: `/index.html`
- **Lien avec l'API Backend :**
  Vérifiez que [environment.prod.ts](file:///d:/Vitalis%20centeur/frontend/src/environments/environment.prod.ts) contient l'URL de votre backend :
  ```typescript
  export const environment = {
    production: true,
    apiUrl: 'https://<votre-nom-de-backend>.onrender.com/api',
  };
  ```

---

## ⚙️ 3. Déploiement avec Docker Compose (Serveur Dédié / VPS)

### A. Cloner le projet et préparer l'environnement
```bash
git clone <url-du-depot> vitalis-center
cd vitalis-center
```

### B. Créer le fichier `.env` de production
```bash
cp backend/.env.example backend/.env
```
Éditez `backend/.env` avec vos identifiants :
```env
NODE_ENV=production
DATABASE_URL="postgresql://vitalis:VOTRE_MOT_DE_PASSE@postgres:5432/vitalis_center"
JWT_SECRET="GENEREZ_UNE_CLE_FORTE_64_CHARS"
CORS_ORIGIN="https://vitalis-center.cd,https://www.vitalis-center.cd"
SWAGGER_ENABLED=false
STORAGE_MODE=local
```

### C. Démarrer les conteneurs
```bash
docker compose up -d --build
```

### D. Appliquer les migrations de base de données
```bash
docker compose exec backend npx prisma migrate deploy
```

---

## 🔍 4. Vérification Post-Déploiement (Smoke Tests)

1. **Test Santé API :** Ouvrez `https://<votre-backend>.onrender.com/api/health` dans votre navigateur.
   - Doit renvoyer : `{"status":"ok","service":"Vitalis Center API",...}`
2. **Accès Frontend :** Ouvrez `https://<votre-frontend>.onrender.com`.
3. **Formulaire de Contact :** Envoyer un message test depuis la landing page.
4. **Connexion :** Se connecter sur `/login`.
5. **Rechargement de page (F5) :** Naviguer sur `/login` ou `/verifier` et rafraîchir la page (vérifie la redirection SPA 200).
