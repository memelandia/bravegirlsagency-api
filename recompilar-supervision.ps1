# Script para recompilar y actualizar el sistema de supervisión

Write-Host "🚀 Iniciando recompilación del sistema de supervisión..." -ForegroundColor Cyan

# 1. Navegar al proyecto
Set-Location "c:\Users\franc\OneDrive\Desktop\bravegirlsagencyweb - copia\bravegirls-supervisor-sheet (3)"

# 2. Instalar dependencias (si no están)
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

# 3. Compilar proyecto
Write-Host "⚙️ Compilando proyecto React..." -ForegroundColor Yellow
npm run build

# 4. Limpiar carpeta de destino
$destino = "c:\Users\franc\OneDrive\Desktop\bravegirlsagencyweb - copia\supervision"
if (Test-Path $destino) {
    Write-Host "🧹 Limpiando carpeta anterior..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $destino
}

# 5. Copiar archivos compilados
Write-Host "📋 Copiando archivos compilados..." -ForegroundColor Yellow
Copy-Item -Recurse "dist" $destino

# 6. Mostrar resumen
Write-Host ""
Write-Host "✅ ¡Compilación completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Archivos listos en:" -ForegroundColor Cyan
Write-Host "   $destino" -ForegroundColor White
Write-Host ""
Write-Host "📤 Próximo paso:" -ForegroundColor Yellow
Write-Host "   1. Conectar a Hostinger vía FTP" -ForegroundColor White
Write-Host "   2. Subir carpeta 'supervision/' a public_html/" -ForegroundColor White
Write-Host "   3. Acceder a: https://bravegirlsagency.com/supervision/" -ForegroundColor White
Write-Host ""
Write-Host "📖 Ver instrucciones completas en:" -ForegroundColor Cyan
Write-Host "   INSTRUCCIONES-SUPERVISION.md" -ForegroundColor White
Write-Host ""
