@echo off
setlocal ENABLEDELAYEDEXPANSION
REM Cambiar al directorio de este script
pushd "%~dp0"

REM Crear venv si no existe
if not exist ".venv" (
  echo Creando entorno virtual Python (.venv)...
  python -m venv .venv
)

REM Activar venv
call .venv\Scripts\activate

REM Instalar dependencias
pip install -r requirements.txt

REM Instalar navegadores de Playwright (idempotente)
python -m playwright install

REM Iniciar FastAPI en puerto 8000
uvicorn main:app --host 0.0.0.0 --port 8000

popd
endlocal
