# Security Checklist for Vitalis Centeur

This repository follows a secure API-first architecture: frontend communicates only through backend APIs, and the backend accesses the database through Prisma.

## General API Security Rules

- [x] Frontend must call only `environment.apiUrl` endpoints.
- [x] No direct database imports or direct DB access inside `frontend/src`.
- [x] Backend exposes routes through controllers only.
- [x] Backend uses Prisma as the only DB access layer.
- [x] Global API prefix is set to `/api` in `backend/src/main.ts`.
- [x] Global validation pipe is enabled in backend:
  - `whitelist: true`
  - `forbidNonWhitelisted: true`
  - `transform: true`

## Request Validation

- [x] Use DTOs for all request bodies.
- [x] Use `class-validator` decorators on DTO properties.
- [x] Use `ParseUUIDPipe` for all UUID route parameters.
- [x] Reject unknown body properties at the API boundary.

## Authentication and Authorization

- [x] Protect sensitive endpoints with `JwtAuthGuard`.
- [x] Use `RolesGuard` + `@Roles(...)` for role-based authorization.
- [x] Use `EtablissementGuard` for multi-tenant / institution scoping.
- [x] Enforce ownership checks inside services where needed.

## Backend Business Rules

- [x] Do not allow frontend to send sensitive fields like `role` during registration.
- [x] Backend assigns `Role.APPRENANT` for public registration.
- [x] Backend verifies establishment ownership for requests scoped by `etablissementId`.
- [x] Backend does not trust client-provided role or active-state fields.
- [x] Critical actions are logged in audit trails where applicable.

## Frontend Guidelines

- [x] Use API service classes under `frontend/src/app/core/services/`.
- [x] Do not import or reference backend DB modules from frontend code.
- [x] Use only the backend API as the data source.

## Modules Audited

The following modules have been verified as following the secure pattern:

- `utilisateurs` (Authentification, JWT, RBAC, Verrouillage persistant, RGPD)
- `etablissements` (Multi-tenant isolation)
- `pedagogie` (Contrôle d'accès & intégrité)
- `quiz` & `devoirs` (Validation des soumissions)
- `certification` (Génération sécurisée PDF & séries uniques)
- `analytics` (Agrégations et métriques de performance)
- `notifications` (SSE sécurisé)

## Post-Audit Hardening & Compliance (100% Resolved)

- [x] **Zero Hardcoded Secrets**: `docker-compose.yml` uses strictly environment variable interpolation. Provided `.env.docker.example` template with security guidelines.
- [x] **Strict JWT Strategy**: Removed URL query parameter extraction (`fromUrlQueryParameter('token')`). Throws fatal error on startup if `JWT_SECRET` is unset or empty.
- [x] **Distributed Account Lockout (ANSSI)**: Lockout state persisted in PostgreSQL (`login_attempts` table via Prisma model) to resist restarts, scale-outs and clustering.
- [x] **Strict Content-Security-Policy (CSP)**: Removed `'unsafe-inline'` from scriptSrc in Helmet. Scoped CSP isolation for Swagger documentation.
- [x] **Frontend Reverse Proxy Hardening**: Nginx configured with `Strict-Transport-Security` (31536000s, preload), `X-Frame-Options: DENY`, `Permissions-Policy`, strict CSP and HTTPS redirection.
- [x] **GDPR Compliance (RGPD)**:
  - Article 17 (Right to Erasure / Anonymization): `POST /api/utilisateurs/me/anonymize` and admin endpoint with full PII pseudonymization, token revocation and audit logging.
  - Article 20 (Right to Data Portability): `GET /api/utilisateurs/me/export` delivering a complete, machine-readable structured user profile.
- [x] **Automated Data Purge**: Automatic background cleanup (every 6 hours) purging expired/revoked refresh tokens and stale login attempts.
- [x] **Disaster Recovery & Automated Backups (PRA / PCA)**:
  - Cross-platform script `backend/scripts/backup-db.js` with SHA-256 checksums and 14-day automatic rotation.
  - Daily automated GitHub Actions backup workflow `.github/workflows/db-backup.yml` at 02:00 UTC with 30-day artifact retention.
  - Comprehensive Disaster Recovery Plan documented in `docs/DISASTER_RECOVERY_PLAN.md` (RPO < 24h, RTO < 2h).
- [x] **Continuous Integration & Security Pipeline (CI/CD)**: Full `.github/workflows/ci.yml` checking linting, typechecking, 45 unit tests, npm security audit and production builds on every push/PR.

