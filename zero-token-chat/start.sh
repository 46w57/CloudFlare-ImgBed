#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

cleanup() {
    log_info "正在停止服务..."
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
        wait "$FRONTEND_PID" 2>/dev/null || true
    fi
    log_ok "服务已停止"
    exit 0
}
trap cleanup SIGINT SIGTERM

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Zero Token Chat - 一键启动       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# ── 检查 Python ──
log_info "检查 Python 环境..."
PYTHON_CMD=""
for cmd in python3 python; do
    if command -v "$cmd" &>/dev/null; then
        PYTHON_CMD="$cmd"
        break
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    log_error "未找到 Python，请先安装 Python 3.10+"
    exit 1
fi

PY_VERSION=$($PYTHON_CMD -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
log_ok "Python $PY_VERSION ($PYTHON_CMD)"

# ── 检查 Node.js ──
log_info "检查 Node.js 环境..."
if ! command -v node &>/dev/null; then
    log_error "未找到 Node.js，请先安装 Node.js 18+"
    exit 1
fi
NODE_VERSION=$(node -v)
log_ok "Node.js $NODE_VERSION"

# ── 安装后端依赖 ──
log_info "检查后端 Python 依赖..."
if ! $PYTHON_CMD -c "import fastapi" 2>/dev/null; then
    log_info "安装后端依赖 (首次可能需要几分钟)..."
    $PYTHON_CMD -m pip install -r server/requirements.txt 2>&1 | tail -3 || {
        log_warn "部分依赖安装失败 (rookiepy 需要 Rust 编译环境)，核心功能不受影响"
        $PYTHON_CMD -m pip install fastapi uvicorn httpx sse-starlette cryptography python-multipart 2>&1 | tail -1
    }
fi
log_ok "后端依赖就绪"

# ── 安装前端依赖 ──
log_info "检查前端 Node.js 依赖..."
if [ ! -d "node_modules" ]; then
    log_info "安装前端依赖 (首次可能需要几分钟)..."
    npm install 2>&1 | tail -3
fi
log_ok "前端依赖就绪"

# ── 创建数据目录 ──
mkdir -p ~/.zero-token-chat/sandbox

# ── 启动后端 ──
log_info "启动后端服务 (FastAPI @ http://localhost:8000)..."
cd "$SCRIPT_DIR/server"
$PYTHON_CMD start.py &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

# ── 等待后端就绪 ──
log_info "等待后端服务就绪..."
MAX_WAIT=15
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:8000/api/health >/dev/null 2>&1; then
        break
    fi
    sleep 1
    WAITED=$((WAITED + 1))
done

if [ $WAITED -ge $MAX_WAIT ]; then
    log_error "后端服务启动超时，请检查端口 8000 是否被占用"
    kill "$BACKEND_PID" 2>/dev/null || true
    exit 1
fi
log_ok "后端服务已就绪"

# ── 启动前端 ──
log_info "启动前端服务 (Vite @ http://localhost:5173)..."
cd "$SCRIPT_DIR"
npx vite --host 2>&1 &
FRONTEND_PID=$!

# ── 等待前端就绪 ──
log_info "等待前端服务就绪..."
MAX_WAIT=15
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:5173 >/dev/null 2>&1; then
        break
    fi
    sleep 1
    WAITED=$((WAITED + 1))
done

if [ $WAITED -ge $MAX_WAIT ]; then
    log_warn "前端服务启动较慢，可能仍在初始化中..."
else
    log_ok "前端服务已就绪"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   🎉 Zero Token Chat 启动成功！      ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                      ║${NC}"
echo -e "${GREEN}║   前端:  http://localhost:5173        ║${NC}"
echo -e "${GREEN}║   后端:  http://localhost:8000        ║${NC}"
echo -e "${GREEN}║   API:   http://localhost:8000/docs   ║${NC}"
echo -e "${GREEN}║                                      ║${NC}"
echo -e "${GREEN}║   按 Ctrl+C 停止所有服务             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""

wait
