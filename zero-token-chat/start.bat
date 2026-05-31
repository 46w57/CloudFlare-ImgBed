@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"

echo.
echo ========================================
echo    Zero Token Chat - Quick Start
echo ========================================
echo.

:: -- Check Python --
echo [INFO] Checking Python...
where python >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Python not found. Please install Python 3.10+
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python -c "import sys;print(str(sys.version_info.major)+'.'+str(sys.version_info.minor))"') do set PY_VERSION=%%v
echo [OK] Python !PY_VERSION!

:: -- Check Node.js --
echo [INFO] Checking Node.js...
where node >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo [OK] Node.js !NODE_VERSION!

:: -- Install backend deps --
echo [INFO] Checking backend Python dependencies...
python -c "import fastapi" >nul 2>&1
if !errorlevel! neq 0 (
    echo [INFO] Installing backend dependencies...
    pip install -r server\requirements.txt
    if !errorlevel! neq 0 (
        echo [WARN] Some deps failed, installing core deps only...
        pip install fastapi uvicorn httpx sse-starlette cryptography python-multipart
    )
)
echo [OK] Backend dependencies ready

:: -- Install frontend deps --
echo [INFO] Checking frontend Node.js dependencies...
set NEED_INSTALL=0
if not exist "node_modules\vite\bin\vite.js" set NEED_INSTALL=1
if not exist "node_modules\@rollup\rollup-win32-x64-msvc" (
    if exist "node_modules\rollup" set NEED_INSTALL=1
)
if "!NEED_INSTALL!"=="1" (
    echo [INFO] Fixing frontend dependencies...
    if exist "package-lock.json" del "package-lock.json"
    if exist "node_modules" rmdir /s /q "node_modules"
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)
echo [OK] Frontend dependencies ready

:: -- Create data dir --
if not exist "%USERPROFILE%\.zero-token-chat\sandbox" (
    mkdir "%USERPROFILE%\.zero-token-chat\sandbox"
)

:: -- Write backend launcher to TEMP (avoids CMD quoting issues with Chinese paths) --
set "BACKEND_SCRIPT=%TEMP%\zt-backend.bat"
(
echo @echo off
echo cd /d "%~dp0server"
echo python start.py
echo echo.
echo echo [INFO] Backend stopped. Press any key to close...
echo pause ^>nul
) > "%BACKEND_SCRIPT%"

:: -- Start backend in a new window --
echo [INFO] Starting backend (FastAPI @ http://localhost:8000)...
start "ZeroToken-Backend" "%BACKEND_SCRIPT%"

:: -- Wait for backend --
echo [INFO] Waiting for backend to be ready...
set WAITED=0
:wait_backend
if !WAITED! geq 20 (
    echo [ERROR] Backend startup timeout. Check if port 8000 is in use.
    echo [HINT] Look at the backend window for error details.
    pause
    exit /b 1
)
where curl >nul 2>&1
if !errorlevel! equ 0 (
    curl -s http://localhost:8000/api/health >nul 2>&1
) else (
    python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/api/health',timeout=2)" >nul 2>&1
)
if !errorlevel! equ 0 goto backend_ready
timeout /t 1 /nobreak >nul
set /a WAITED+=1
goto wait_backend
:backend_ready
echo [OK] Backend is ready

echo.
echo ========================================
echo    Starting Frontend (Vite)...
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo ----------------------------------------
echo    Press Ctrl+C to stop frontend.
echo    Close backend window separately.
echo ========================================
echo.

:: -- Start frontend in THIS window (foreground) --
:: Use node to run vite directly - avoids all PATH issues.
if exist "node_modules\vite\bin\vite.js" (
    node node_modules\vite\bin\vite.js --host
) else (
    echo [ERROR] vite not found in node_modules!
    echo [INFO] Running npm install to fix this...
    call npm install
    if exist "node_modules\vite\bin\vite.js" (
        node node_modules\vite\bin\vite.js --host
    ) else (
        echo [ERROR] npm install failed to install vite.
        echo [HINT] Try running: npm install
        pause
        exit /b 1
    )
)

:: -- If Vite exits, show message --
echo.
echo [INFO] Frontend has stopped.
echo [INFO] Remember to close the backend window too.
pause
