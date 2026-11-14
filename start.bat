@echo off
title AgroTwin AI - Launcher
cd /d "%~dp0"
echo ==========================================
echo          AGROTWIN AI - INICIO
echo ==========================================
echo.
if not exist "backend\start_backend.bat" (
  echo No se encuentra backend\start_backend.bat
  pause
  exit /b 1
)
if not exist "frontend\start_frontend.bat" (
  echo No se encuentra frontend\start_frontend.bat
  pause
  exit /b 1
)
start "AgroTwin AI - Backend" cmd /k ""%~dp0backend\start_backend.bat""
start "AgroTwin AI - Frontend" cmd /k ""%~dp0frontend\start_frontend.bat""
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:5173"
echo.
echo Se iniciaron backend y frontend en ventanas separadas.
echo Si el navegador no abre, visita http://127.0.0.1:5173
echo.
pause
