# InboxTriage - Instalador (Windows)
# Uso: clic derecho -> Ejecutar con PowerShell   (o: powershell -ExecutionPolicy Bypass -File instalar.ps1)
$ErrorActionPreference = "Stop"
Write-Host ""
Write-Host "=== InboxTriage - Instalacion ===" -ForegroundColor Cyan

# 1. Node.js
try { $v = node -v } catch { $v = $null }
if (-not $v -or [int]((($v -replace "v","") -split "\.")[0]) -lt 20) {
  Write-Host "Necesitas Node.js 20 o superior. Descargalo de https://nodejs.org, instalalo y vuelve a correr este script." -ForegroundColor Yellow
  exit 1
}
Write-Host "Node $v OK"

# 2. Dependencias
Write-Host "Instalando dependencias (1-2 min)..."
npm install --no-fund --no-audit | Out-Null
Write-Host "Dependencias OK"

# 3. Configuracion
# El zip de descarga trae .env listo; si clonaste el repo, se crea desde el
# ejemplo y tendras que poner tus credenciales de Google (README paso 2).
if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host "AVISO: .env creado desde .env.example — te faltara GOOGLE_CLIENT_ID/SECRET (ver README)." -ForegroundColor Yellow
}

# 4. Eleccion de modelo
Write-Host ""
Write-Host "Elige el modelo de IA (se descarga una sola vez):"
Write-Host "  1) Rapido      - Llama 1B  (~0.8 GB)  menos preciso"
Write-Host "  2) Recomendado - Qwen3 4B  (~2.4 GB)  buen balance  [defecto]"
Write-Host "  3) Preciso     - Qwen3 8B  (~4.7 GB)  pide GPU de 8GB o CPU fuerte"
$op = Read-Host "Opcion [2]"
$modelo = switch ($op) { "1" { "llama-3.2-1b-instruct-q4" } "3" { "qwen3-8b" } default { "qwen3-4b" } }
(Get-Content .env) -replace "^QVAC_MODEL=.*", "QVAC_MODEL=$modelo" | Set-Content -Encoding utf8 .env
Write-Host "Modelo elegido: $modelo"

# 4. Descarga del modelo
Write-Host "Descargando el modelo (segun tu conexion puede tardar varios minutos)..."
node scripts/precache-model.mjs
Write-Host ""
Write-Host "=== Instalacion completa ===" -ForegroundColor Green
Write-Host "Siguiente paso:  .\iniciar.ps1"
