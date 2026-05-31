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
if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies...
    npm install
)
echo [OK] Frontend dependencies ready

:: -- Create data dir --
if not exist "%USERPROFILE%\.zero-token-chat\sandbox" (
    mkdir "%USERPROFILE%\.zero-token-chat\sandbox"
)

:: -- Start backend --
echo [INFO] Starting backend (FastAPI @ http://localhost:8000)...
start "ZeroToken-Backend" /min cmd /c "cd /d %~dp0server && python start.py"

:: -- Wait for backend --
echo [INFO] Waiting for backend to be ready...
set WAITED=0
:wait_backend
if !WAITED! geq 20 (
    echo [ERROR] Backend startup timeout. Check if port 8000 is in use.
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

:: -- Start frontend --
echo [INFO] Starting frontend (Vite @ http://localhost:5173)...
start "ZeroToken-Frontend" /min cmd /c "cd /d %~dp0 && npx vite --host"

:: -- Wait for frontend --
echo [INFO] Waiting for frontend to be ready...
set WAITED=0
:wait_frontend
if !WAITED! geq 20 (
    echo [WARN] Frontend startup is slow, it may still be initializing...
    goto frontend_done
)
where curl >nul 2>&1
if !errorlevel! equ 0 (
    curl -s http://localhost:5173 >nul 2>&1
) else (
    python -c "import urllib.request;urllib.request.urlopen('http://localhost:5173',timeout=2)" >nul 2>&1
)
if !errorlevel! equ 0 goto frontend_ready
timeout /t 1 /nobreak >nul
set /a WAITED+=1
goto wait_frontend
:frontend_ready
echo [OK] Frontend is ready
:frontend_done

echo.
echo ========================================
echo    Zero Token Chat Started!
echo ----------------------------------------
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo ----------------------------------------
echo    Close this window to stop all services
echo ========================================
echo.

:: -- Open browser --
start http://localhost:5173

echo Press Ctrl+C or close this window to stop all services...
pause
