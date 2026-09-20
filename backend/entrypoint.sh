#!/bin/sh
set -e
echo "=== Exécution migrations Prisma ==="
npx prisma migrate deploy
echo "=== Migrations terminées avec succès ==="
echo "Démarrage API NestJS..."
exec node dist/src/main.js
