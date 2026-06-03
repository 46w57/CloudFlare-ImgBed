# Windows 安装详解

## 前置环境

| 软件 | 版本 | 用途 |
|---|---|---|
| Node.js | 18.x 或 20.x | 跑前端 / Tauri 构建工具链 |
| Python | 3.10 ~ 3.12 | 后端运行时 |
| Rust toolchain | stable | 编译 Tauri（仅构建安装包需要） |
| Visual Studio Build Tools | 2022 + C++ 桌面开发 | Tauri 编译依赖（仅构建时） |
| WebView2 Runtime | 已预装 Win10/11 | Tauri 运行时依赖 |
| Chrome / Edge | 最新版 | 用于 Playwright CDP 登录 |

> **如果只想用，不打包**：只需要 Node + Python + Chrome/Edge，**不需要 Rust**。

## 步骤一：克隆 & 装依赖

```powershell
git clone <your-repo> claw
cd claw

# 前端依赖
npm install

# Python 后端
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 装 Playwright 用的 Chromium
playwright install chromium
cd ..
```

## 步骤二：首次启动后端

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m app.main
```

后端会监听 `http://127.0.0.1:8765`，打开 Swagger UI：[http://127.0.0.1:8765/docs](http://127.0.0.1:8765/docs)

## 步骤三：启动前端

```powershell
# 另开一个终端
cd claw
npm run dev
```

浏览器打开 [http://localhost:5173](http://localhost:5173)。

## 步骤四：登录 DeepSeek / Qwen

> 这一步是 Zero Token 模式的关键：用 CDP 启一个带调试端口的 Chrome，用户手动登录后，我们抓 cookie。

### 4.1 启动 Chrome 调试模式

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m scripts.bootstrap_chrome
```

它会：
1. 找一个空闲的 user-data 目录
2. 启动 Chrome，开启调试端口 `9222`
3. 打开 DeepSeek 登录页

### 4.2 在弹出的 Chrome 里登录

- 扫码 / 输账号密码，登录 DeepSeek
- 关掉 Chrome 不行，**让它保持开**
- 然后到 [http://localhost:5173/settings](http://localhost:5173/settings) 页面，点 "立即捕获 Cookie"

后端会通过 CDP 连到这个 Chrome，把 `chat.deepseek.com` 域下的所有 cookie 抓出来，AES-256-GCM 加密后存到 `%APPDATA%\Claw\cookies.enc`。

### 4.3 同样抓 Qwen

回到 PowerShell 跑：

```powershell
python -m scripts.bootstrap_chrome --provider qwen
```

在新弹出的 Chrome 里登录 [chat.qwen.ai](https://chat.qwen.ai)，再到设置页抓 cookie。

## 步骤五：开聊

回到聊天页，**第一次发送消息时会自动检测 cookie 是否有效**，失效的话会弹窗提示重新登录。

## 步骤六（可选）：打包成 MSI

```powershell
# 需要先装 Rust
winget install Rustlang.Rustup
# 需要 Visual Studio Build Tools 2022 + "C++ 桌面开发" 工作负载

npm run tauri build
# 产物：src-tauri\target\release\bundle\msi\Claw_0.1.0_x64_en-US.msi
```

## 常见问题

**Q: 抓包后调用还是 401？**
A: cookie 过期。回到步骤 4.1 重启 Chrome 重新登录再抓。

**Q: 报 "无法连接到 Chrome 调试端口 9222"？**
A: 浏览器已经关掉了。重新跑 `python -m scripts.bootstrap_chrome`。

**Q: DeepSeek 报"该模型暂不可用"？**
A: 你账号可能没开通 V4 Pro 灰度，先在网页确认能看到"专家模式"按钮。

**Q: Tauri 编译失败？**
A: 90% 是 WebView2 没装。装 [WebView2 Evergreen Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) 即可。
