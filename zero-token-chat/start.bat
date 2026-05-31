@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════╗
echo ║     Zero Token Chat - 一键启动       ║
echo ╚══════════════════════════════════════╝
echo.

:: ── 检查 Python ──
echo [INFO] 检查 Python 环境...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 未找到 Python，请先安装 Python 3.10+
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"') do set PY_VERSION=%%v
echo [OK] Python %PY_VERSION%

:: ── 检查 Node.js ──
echo [INFO] 检查 Node.js 环境...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 未找到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo [OK] Node.js %NODE_VERSION%

:: ── 安装后端依赖 ──
echo [INFO] 检查后端 Python 依赖...
python -c "import fastapi" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] 安装后端依赖...
    pip install -r server\requirements.txt
    if %errorlevel% neq 0 (
        echo [WARN] 部分依赖安装失败，尝试安装核心依赖...
        pip install fastapi uvicorn httpx sse-starlette cryptography python-multipart
    )
)
echo [OK] 后端依赖就绪

:: ── 安装前端依赖 ──
echo [INFO] 检查前端 Node.js 依赖...
if not exist "node_modules" (
    echo [INFO] 安装前端依赖...
    npm install
)
echo [OK] 前端依赖就绪

:: ── 创建数据目录 ──
if not exist "%USERPROFILE%\.zero-token-chat\sandbox" (
    mkdir "%USERPROFILE%\.zero-token-chat\sandbox"
)

:: ── 启动后端 ──
echo [INFO] 启动后端服务 (FastAPI @ http://localhost:8000)...
start "Zero-Token-Backend" /min cmd /c "cd /d %~dp0\server && python start.py"

:: ── 等待后端就绪 ──
echo [INFO] 等待后端服务就绪...
set WAITED=0
:wait_backend
if %WAITED% geq 15 (
    echo [ERROR] 后端服务启动超时，请检查端口 8000 是否被占用
    pause
    exit /b 1
)
curl -s http://localhost:8000/api/health >nul 2>&1
if %errorlevel% equ 0 goto backend_ready
timeout /t 1 /nobreak >nul
set /a WAITED+=1
goto wait_backend
:backend_ready
echo [OK] 后端服务已就绪

:: ── 启动前端 ──
echo [INFO] 启动前端服务 (Vite @ http://localhost:5173)...
start "Zero-Token-Frontend" /min cmd /c "cd /d %~dp0 && npx vite --host"

:: ── 等待前端就绪 ──
echo [INFO] 等待前端服务就绪...
set WAITED=0
:wait_frontend
if %WAITED% geq 15 (
    echo [WARN] 前端服务启动较慢，可能仍在初始化中...
    goto frontend_done
)
curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% equ 0 goto frontend_ready
timeout /t 1 /nobreak >nul
set /a WAITED+=1
goto wait_frontend
:frontend_ready
echo [OK] 前端服务已就绪
:frontend_done

echo.
echo ╔══════════════════════════════════════╗
echo ║   🎉 Zero Token Chat 启动成功！      ║
echo ╠══════════════════════════════════════╣
echo ║                                      ║
echo ║   前端:  http://localhost:5173        ║
echo ║   后端:  http://localhost:8000        ║
echo ║   API:   http://localhost:8000/docs   ║
echo ║                                      ║
echo ║   关闭此窗口将停止所有服务            ║
echo ╚══════════════════════════════════════╝
echo.

:: ── 自动打开浏览器 ──
start http://localhost:5173

echo 按 Ctrl+C 或关闭此窗口停止所有服务...
pause
