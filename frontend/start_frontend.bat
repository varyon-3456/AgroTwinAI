@echo off
title AgroTwin AI - Frontend
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Instala Node.js LTS desde https://nodejs.org/
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Instalando dependencias del frontend...
  npm install
  if errorlevel 1 (
    echo ERROR: No se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)
echo.
echo Frontend disponible en http://127.0.0.1:5173
npm run dev -- --host 127.0.0.1
pause
