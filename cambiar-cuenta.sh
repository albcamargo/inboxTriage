#!/bin/bash
# InboxTriage - Cambiar de cuenta de Gmail (o salir de la actual)
# Apaga el panel si esta corriendo, cierra la sesion guardada y vuelve a
# iniciar: el navegador abre la pantalla de Google para elegir otra cuenta.
# Los "intereses" (contexto.json) se conservan.
cd "$(dirname "$0")"

pkill -f "src/server/api.js" 2>/dev/null && sleep 1

rm -f tokens.json triage.log
echo "Sesion cerrada. Se abrira Google para elegir la cuenta nueva."
echo "(recuerda: la cuenta debe estar en la lista de usuarios de prueba)"
exec bash iniciar.sh
