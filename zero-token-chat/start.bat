@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"

set "PROJECT_DIR=%~dp0"
set "SERVER_DIR=%~dp0server"

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
    call npm install
)
echo [OK] Frontend dependencies ready

:: -- Create data dir --
if not exist "%USERPROFILE%\.zero-token-chat\sandbox" (
    mkdir "%USERPROFILE%\.zero-token-chat\sandbox"
)

:: -- Write helper scripts to avoid CMD quoting issues with Chinese paths --
echo cd /d "!SERVER_DIR!" > "%TEMP%\zt-backend.bat"
echo python start.py >> "%TEMP%\zt-backend.bat"

echo cd /d "!PROJECT_DIR!" > "%TEMP%\zt-frontend.bat"
echo call npx vite --host >> "%TEMP%\zt-frontend.bat"

:: -- Start backend --
echo [INFO] Starting backend (FastAPI @ http://localhost:8000)...
start "ZeroToken-Backend" cmd /c "%TEMP%\zt-backend.bat"

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

:: -- Start frontend --
echo [INFO] Starting frontend (Vite @ http://localhost:5173)...
echo [INFO] If frontend fails, check the Vite window for errors.
start "ZeroToken-Frontend" cmd /c "%TEMP%\zt-frontend.bat"

:: -- Wait for frontend --
echo [INFO] Waiting for frontend to be ready...
set WAITED=0
set FRONTEND_READY=0
:wait_frontend
if !WAITED! geq 30 (
    echo.
    echo [WARN] Frontend not ready after 30 seconds.
    echo [HINT] Check the "ZeroToken-Frontend" window for errors.
    echo [HINT] Common fixes:
    echo   1. Close other apps using port 5173
    echo   2. Run "npm install" manually in the project folder
    echo   3. Try "npx vite" manually to see the error
    echo.
    goto frontend_done
)
where curl >nul 2>&1
if !errorlevel! equ 0 (
    curl -s http://localhost:5173 >nul 2>&1
) else (
    python -c "import urllib.request;urllib.request.urlopen('http://localhost:5173',timeout=2)" >nul 2>&1
)
if !errorlevel! equ 0 (
    set FRONTEND_READY=1
    goto frontend_ready
)
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
if "!FRONTEND_READY!"=="1" (
    echo    Frontend: http://localhost:5173
) else (
    echo    Frontend: NOT READY - check Vite window
)
echo    Backend:  http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo ----------------------------------------
echo    Close this window to stop all services
echo ========================================
echo.

:: -- Open browser only if frontend is ready --
if "!FRONTEND_READY!"=="1" (
    echo [INFO] Opening browser...
    start http://localhost:5173
) else (
    echo [INFO] Frontend not ready, not opening browser.
    echo [INFO] Once Vite is running, open http://localhost:5173 manually.
)

echo.
echo Press Ctrl+C or close this window to stop all services...
pause
