#!/usr/bin/env pwsh
# Claw 一键启动脚本（Windows PowerShell）

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

Write-Host "🦀 Claw Zero Token 启动器" -ForegroundColor Cyan
Write-Host ""

# 后端
if (-not (Test-Path "backend\.venv")) {
  Write-Host "[setup] 首次启动，创建 Python 虚拟环境..." -ForegroundColor Yellow
  Push-Location backend
  python -m venv .venv
  & .\.venv\Scripts\python.exe -m pip install --quiet --upgrade pip
  & .\.venv\Scripts\python.exe -m pip install --quiet -r requirements.txt
  & .\.venv\Scripts\python.exe -m playwright install chromium
  Pop-Location
}

Write-Host "[1/2] 启动后端 (http://127.0.0.1:8765) ..." -ForegroundColor Green
$env:PYTHONPATH = "$ScriptDir\backend"
$backend = Start-Process -FilePath "$ScriptDir\backend\.venv\Scripts\python.exe" `
  -ArgumentList "-m", "app.main", "--port", "8765" `
  -WorkingDirectory "$ScriptDir\backend" `
  -WindowStyle Hidden `
  -PassThru
Start-Sleep -Seconds 2

# 前端
if (-not (Test-Path "node_modules")) {
  Write-Host "[setup] 首次启动，安装前端依赖..." -ForegroundColor Yellow
  npm install --no-audit --no-fund
}

Write-Host "[2/2] 启动前端 (http://127.0.0.1:5173) ..." -ForegroundColor Green
$frontend = Start-Process -FilePath "npm.cmd" `
  -ArgumentList "run", "dev" `
  -WorkingDirectory $ScriptDir `
  -WindowStyle Hidden `
  -PassThru

Write-Host ""
Write-Host "✓ 后端: http://127.0.0.1:8765/docs" -ForegroundColor Green
Write-Host "✓ 前端: http://127.0.0.1:5173" -ForegroundColor Green
Write-Host ""
Write-Host "首次登录请运行:" -ForegroundColor Yellow
Write-Host "  cd backend; .\venv\Scripts\python.exe -m scripts.bootstrap_chrome --provider deepseek" -ForegroundColor White
Write-Host ""
Write-Host "关闭此窗口或按 Ctrl+C 停止" -ForegroundColor Gray

try {
  Wait-Process -Id $backend.Id, $frontend.Id -ErrorAction SilentlyContinue
} finally {
  Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
  Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
}
