@echo off
setlocal
REM ============================================================
REM Study Dost AI backend installer (by Sami Ahraf Nirob)
REM Creates a virtual env and installs dependencies.
REM Run this ONCE on a fresh RDP. After that, use start.bat.
REM ============================================================

cd /d "%~dp0"

echo.
echo === Study Dost AI - backend installer ===
echo.

REM --- Locate Python. Prefer `python` on PATH, fall back to the `py` launcher.
set PYEXE=
where python >nul 2>nul && set PYEXE=python
if not defined PYEXE (
    where py >nul 2>nul && set PYEXE=py -3
)
if not defined PYEXE (
    echo [ERROR] Neither `python` nor `py` was found on PATH.
    echo Install Python 3.10+ from https://www.python.org/downloads/
    echo and tick "Add Python to PATH" during installation.
    pause
    exit /b 1
)
echo Using Python: %PYEXE%
%PYEXE% --version

if exist .venv (
    echo Found existing virtual env .venv - reusing it.
) else (
    echo Creating virtual env in .venv ...
    %PYEXE% -m venv .venv
    if errorlevel 1 (
        echo [ERROR] Could not create virtual env.
        pause
        exit /b 1
    )
)

echo Activating virtual env...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] Could not activate .venv.
    pause
    exit /b 1
)

echo Upgrading pip...
python -m pip install --upgrade pip
if errorlevel 1 (
    echo [WARN] pip self-upgrade failed. Continuing with the existing pip.
)

echo Installing requirements...
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] pip install failed. Check your internet and requirements.txt.
    pause
    exit /b 1
)

if not exist .env (
    echo.
    echo === IMPORTANT ===
    echo No .env file found. Copying .env.example to .env now.
    echo You MUST edit .env and set your FEATHERLESS_API_KEY before running start.bat.
    copy .env.example .env >nul
)

echo.
echo ============================================================
echo  Install complete.
echo  Next steps:
echo    1. Open .env in notepad and paste your FEATHERLESS_API_KEY.
echo    2. Run start.bat to launch the server on http://0.0.0.0:8000
echo.
echo  First-launch tip: Windows may pop up a firewall prompt the
echo  first time Python listens on port 8000. Click "Allow access".
echo ============================================================
echo.
pause
endlocal
