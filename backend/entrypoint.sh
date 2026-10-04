#!/bin/sh
set -e

echo "=== Démarrage de Vitalis Center API ==="
exec node dist/src/main.js
