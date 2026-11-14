@echo off
title AgroTwin AI - Backend
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Creando entorno virtual de Python...
  py -m venv .venv
  if errorlevel 1 (
    python -m venv .venv
  )
)
call ".venv\Scripts\activate.bat"
echo Instalando o verificando dependencias del backend...
python -m pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 (
  echo.
  echo ERROR: No se pudieron instalar las dependencias.
  pause
  exit /b 1
)
echo.
echo Backend disponible en http://127.0.0.1:8000
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
pause
