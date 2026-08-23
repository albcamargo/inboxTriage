# InboxTriage - Iniciar (Windows)
$ErrorActionPreference = "Stop"

if (-not (Test-Path tokens.json)) {
  Write-Host ""
  Write-Host "Primera vez: se abrira el navegador para autorizar tu Gmail." -ForegroundColor Cyan
  Write-Host "IMPORTANTE: tu correo debe estar en la lista de usuarios de prueba (ver LEEME.txt)." -ForegroundColor Yellow
  npm run gmail:auth
  npm run gmail:labels
}

Write-Host "Clasificando tus correos no leidos con el modelo local..."
node src/triage/batch.js --inbox --limit 15 --nuevos

Write-Host "Abriendo el panel en http://localhost:8642 ..."
Start-Process "http://localhost:8642"
npm run dashboard:api
