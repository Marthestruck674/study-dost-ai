@echo off
setlocal
REM ============================================================
REM Study Dost AI backend launcher (by Sami Ahraf Nirob)
REM Activates the virtual env and runs the FastAPI server.
REM ============================================================

cd /d "%~dp0"

if not exist .venv (
    echo [ERROR] No virtual env found. Run install.bat first.
    pause
    exit /b 1
)

if not exist .env (
    echo [ERROR] No .env file. Copy .env.example to .env and add your API key.
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] Could not activate .venv. Re-run install.bat.
    pause
    exit /b 1
)

echo.
echo === Study Dost AI - backend ===
echo Listening on http://0.0.0.0:8000   (Swagger UI: /docs)
echo.
echo Tip: On first launch Windows may prompt to allow Python through
echo the firewall. Click "Allow access" for both Private and Public.
echo Press Ctrl+C in this window to stop.
echo.

python main.py

REM Pause so the window doesn't vanish on a crash or Ctrl+C.
pause
endlocal
