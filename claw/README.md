# Claw - Zero Token Multi-Model Desktop Client

> 像 OpenClaw Zero Token 一样，零 API Token 通过浏览器会话调用 DeepSeek V4 Pro / Qwen3.7 Max。

## ✨ 特性

- **零 API Token**：用你自己账号的浏览器会话访问 DeepSeek / Qwen 官网 chat，无需任何 API Key。
- **多模型**：
  - DeepSeek V4 Pro（专家模式 / Expert Mode / Think Max）
  - Qwen3.7 Max（Extended-Thinking 模式 + 原生工具调用）
- **本地工具调用**：exec、read_file、write_file、list_dir、web_search 全部本地沙箱执行。
- **桌面端**：Tauri 2 + Windows 一键安装包（MSI / NSIS）。
- **Web 端**：也能纯浏览器模式跑，FastAPI + React 完整可用。
- **Cookie 加密存储**：AES-256-GCM，Windows 上额外用 DPAPI 保护主密钥。

## 🧱 技术栈

| 层 | 技术 |
|---|---|
| 桌面壳 | Tauri 2（Rust） |
| 前端 | React 18 + TypeScript + Vite + TailwindCSS |
| 后端 | Python 3.10+ / FastAPI / Uvicorn / httpx / Playwright |
| 加密 | cryptography (AES-256-GCM) + Windows DPAPI |
| 浏览器自动化 | Playwright（CDP 协议，附参考项目 OpenClaw Zero Token） |

## 📁 目录结构

```
claw/
├── src-tauri/               # Tauri 2 桌面壳
├── src/                     # React 前端
├── backend/                 # Python FastAPI 后端
├── package.json
├── pyproject.toml           # 后端依赖
├── README.md
└── INSTALL.md               # Windows 安装详解
```

## 🚀 快速开始（Windows）

详见 [INSTALL.md](./INSTALL.md)。摘要：

```powershell
# 1. 安装前端依赖
npm install

# 2. 安装 Python 依赖
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium

# 3. 启动后端
python -m app.main

# 4. 启动前端（开发模式）
cd ..
npm run dev

# 5. 一键启动 Chrome 调试模式 + 引导登录
python -m scripts.bootstrap_chrome --open deepseek
python -m scripts.bootstrap_chrome --open qwen
```

## 🛠️ 构建 Windows 安装包

```powershell
npm run tauri build
# 产物：src-tauri/target/release/bundle/msi/*.msi
```

## ⚠️ 重要说明

本项目**不是** OpenClaw Zero Token 的官方复刻。架构借鉴其核心思想（Playwright + CDP + Cookie + OpenAI 兼容网关），但实现栈、代码全部独立。具体到 DeepSeek V4 Pro 的"专家模式"和 Qwen3.7 Max 的"思考模式"，需要：

1. 在 [deepseek.com](https://chat.deepseek.com) 网页端点 "专家模式" 按钮后，正常聊天会在请求里带 `chat_mode=expert` 之类的字段，适配器根据这个路由到对应端点。
2. 端点格式参照 [DeepSeek V4 model card](https://api-docs.deepseek.com) 和 Qwen 官方 [DashScope OpenAI 兼容协议](https://help.aliyun.com/zh/model-studio/developer-reference/use-qwen-by-calling-api)。

由于本仓库不包含私有端点的反编译结果，**首次启动后需要你参考 `backend/app/providers/` 里的占位实现，按下述步骤微调**：

1. 打开登录后的 Chrome 调试窗口
2. 在 [chat.deepseek.com](https://chat.deepseek.com) 切换到"专家模式"并发送一条消息
3. 在 Network 面板找到 `POST /api/v0/chat/completions`（或类似），把 URL 和 Headers 复制到 `backend/app/providers/deepseek.py` 的 `_build_url/_build_headers` 方法里
4. 对 Qwen 同样在 [chat.qwen.ai](https://chat.qwen.ai) 抓包

之后所有用户都能直接用，**不需要再改代码**。

## 📜 License

MIT。参考项目 [OpenClaw Zero Token](https://github.com/linuxhsj/openclaw-zero-token) 同样 MIT。
