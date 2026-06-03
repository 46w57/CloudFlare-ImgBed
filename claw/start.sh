#!/usr/bin/env bash
# Claw 一键启动脚本
# 同时启动 Python 后端 + Vite 前端开发服务器。
# 在 Windows 上用 Git Bash 或 WSL 运行；或分别用 install.md 里的 PowerShell 命令。

set -e
cd "$(dirname "$0")"

echo "🦀 Claw Zero Token 启动器"
echo ""

# 后端
if [ ! -d "backend/.venv" ]; then
  echo "[setup] 首次启动，创建 Python 虚拟环境..."
  cd backend
  python3 -m venv .venv
  .venv/bin/pip install --quiet --upgrade pip
  .venv/bin/pip install --quiet -r requirements.txt
  echo "[setup] 装 Playwright Chromium..."
  .venv/bin/playwright install chromium || true
  cd ..
fi

echo "[1/2] 启动后端 (http://127.0.0.1:8765) ..."
PYTHONPATH=backend backend/.venv/bin/python -m app.main --port 8765 &
BACKEND_PID=$!
sleep 2

# 前端
if [ ! -d "node_modules" ]; then
  echo "[setup] 首次启动，安装前端依赖..."
  npm install --no-audit --no-fund
fi

echo "[2/2] 启动前端 (http://127.0.0.1:5173) ..."
npm run dev &
FRONTEND_PID=$!

trap 'echo ""; echo "停止中..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT TERM

echo ""
echo "✓ 后端: http://127.0.0.1:8765/docs"
echo "✓ 前端: http://127.0.0.1:5173"
echo ""
echo "首次登录请运行:  cd backend && .venv/bin/python -m scripts.bootstrap_chrome --provider deepseek"
echo "按 Ctrl+C 停止"
wait
