#!/bin/bash
# InboxTriage - Iniciar (Ubuntu/Linux/macOS)
set -e

if [ ! -f tokens.json ]; then
  echo ""
  echo "Primera vez: se abrira el navegador para autorizar tu Gmail."
  echo "IMPORTANTE: tu correo debe estar en la lista de usuarios de prueba (ver LEEME.txt)."
  npm run gmail:auth
  npm run gmail:labels
fi

echo "Clasificando tus correos no leidos con el modelo local..."
node src/triage/batch.js --inbox --limit 15

echo "Abriendo el panel en http://localhost:8000 ..."
(xdg-open "http://localhost:8000" >/dev/null 2>&1 || open "http://localhost:8000" >/dev/null 2>&1 || true) &
npm run dashboard:api
