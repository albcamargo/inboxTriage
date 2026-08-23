# InboxTriage - Cambiar de cuenta de Gmail (o salir de la actual)
# Apaga el panel si esta corriendo, cierra la sesion guardada y vuelve a
# iniciar: el navegador abre la pantalla de Google para elegir otra cuenta.
# Los "intereses" (contexto.json) se conservan.
$ErrorActionPreference = "SilentlyContinue"
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "=== InboxTriage - Cambiar de cuenta ===" -ForegroundColor Cyan

foreach ($puerto in 8642, 8000) {
  foreach ($con in @(Get-NetTCPConnection -LocalPort $puerto -State Listen -ErrorAction SilentlyContinue)) {
    $proc = Get-Process -Id $con.OwningProcess -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -eq "node") { Stop-Process -Id $proc.Id -Force }
  }
}
Start-Sleep -Milliseconds 800

Remove-Item tokens.json, triage.log -Force -ErrorAction SilentlyContinue
Write-Host "Sesion cerrada. Se abrira Google para elegir la cuenta nueva." -ForegroundColor Green
Write-Host "(recuerda: la cuenta debe estar en la lista de usuarios de prueba)"
Start-Sleep -Seconds 2

if (Test-Path "InboxTriage.cmd") {
  # Instalacion de Windows: relanzar la app completa
  Start-Process -FilePath (Join-Path $PSScriptRoot "InboxTriage.cmd") -WorkingDirectory $PSScriptRoot
} else {
  # Flujo del zip: volver a iniciar en esta misma ventana
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "iniciar.ps1")
}
