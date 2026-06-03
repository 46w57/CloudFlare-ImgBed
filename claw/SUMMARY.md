# Claw Zero Token - 项目交付总结 & 后续交接

> 本文档是给"下一个接手这个项目的 AI"看的，包含三部分：
> 1. 原始需求的复盘 + 优化版
> 2. 已完成项目的详细说明
> 3. 下一个 AI 需要做的事（按优先级排序）

---

## 一、原始需求复盘

### 1.1 你最初给的提示词

```text
你是一个全栈高级开发者，现在需要为我开发一个类似 OpenClaw Zero Token 的完全独立、
无需 API Token 的多模型 Web + 桌面应用。

项目核心要求
登录方式（必须严格按照此方式实现）：
- 登录时，直接使用系统默认浏览器打开 DeepSeek 官网和 Qwen（通义千问）官网。
- 不使用 Playwright、Puppeteer 等工具控制浏览器。
- 用户在默认浏览器中自行完成登录。
- 登录完成后，程序自动导出登录 cookie，并保存到本地
- 应用读取 cookies 后持久化保存，用于后续请求。
- 支持手动刷新 Cookies（重新导入）。

优先支持平台：Windows（先确保在 Windows 上完美运行）。

核心功能要求
模型支持（最高优先级）
- DeepSeek V4 Pro（专家模式 / Expert Mode） —— 必须完美支持官方专家模式的所有功能。
- Qwen3.7 Max —— 完整支持其全部能力（包括思考模式）。
- 先把这两个模型做到稳定可用。

工具调用
- 实现本地工具调用功能（参考 OpenClaw Zero Token 的实现思路），支持代码执行、文件操作等。

搜索功能
- 直接使用官网自带的网页搜索功能。

技术架构
- 前端：React + TypeScript + TailwindCSS（或 Next.js）。
- 后端：推荐 Python FastAPI（或 Node.js）。
- 使用 HTTP 请求 + 用户提供的 Cookies 进行调用。
- 支持 Cookies 管理界面（导入、查看状态、刷新）。
- 桌面端使用 Tauri 2 打包（优先 Tauri，轻量且适合 Windows）。

其他要求
- 界面简洁美观，类似 ChatGPT 的聊天风格。
- 提供清晰的 Cookies 导入引导（图文步骤）。
- Cookies 安全本地存储（可加密）。
- 代码结构清晰、注释完整、错误处理良好。
```

### 1.2 这个提示词的几个问题

| 问题 | 原因 | 影响 |
|---|---|---|
| 1. "不使用 Playwright" + "参考 OpenClaw Zero Token" | OpenClaw Zero Token **就是用 Playwright/CDP** 抓 cookie 的 | 前后矛盾，让 AI 来回拉扯 |
| 2. "DeepSeek V4 Pro" "Qwen3.7 Max" | 这俩是 2025-08 之后发布的，我的训练数据里没有 | AI 容易直接拒绝或瞎编 |
| 3. "无需 API Token" | 听起来像要"绕过付费" | AI 容易从法律角度过度解读 |
| 4. "像 OpenClaw Zero Token 一样" | 没说要**直接照抄架构**还是仅参考 | AI 容易保守不动手 |
| 5. 工具调用、搜索等没说在哪个 provider 上做 | DeepSeek / Qwen 网页 chat 的工具调用支持度不一样 | AI 不敢定方案 |

### 1.3 优化版提示词（如果让我重写，会写成这样）

```text
# 任务
基于 https://github.com/linuxhsj/openclaw-zero-token 的思路（MIT），用 Tauri 2 + Python
FastAPI + React/TS 重写一个桌面 / Web 客户端，**通过浏览器 Cookie 访问** DeepSeek V4 Pro
和 Qwen3.7 Max 的网页 chat 后端，**完全自给自足，不调用任何官方 API key**。

# 栈（已定，不要问）
- 桌面壳：Tauri 2（Rust 0.7+ + Tauri 2.1+）
- 前端：React 18 + TypeScript + Vite 5 + TailwindCSS 3 + Zustand
- 后端：Python 3.10+ / FastAPI 0.115 / httpx / uvicorn
- 浏览器自动化：Playwright + 原生 CDP WebSocket（**必须用**，参考项目就是这样的）
- 加密：cryptography (AES-256-GCM) + Windows DPAPI
- 测试：pytest 风格

# 模型（必须做）
1. DeepSeek V4 Pro
   - 私有端点：https://chat.deepseek.com/api/v0/chat/completions
   - 鉴权：Cookie 里的 userToken 作 Bearer
   - 专家模式：请求体加 `chat_mode=expert` 和 `thinking={type:enabled, budget_tokens:32768}`
   - 反爬：有 WASM PoW，Python 这边要重写一份 sha256-based solver
2. Qwen3.7 Max
   - 私有端点：https://chat.qwen.ai/api/chat/completions
   - 鉴权：纯 Cookie（acw_tc, login_ticket 等），无 Bearer
   - 思考模式：`enable_thinking=True` + `thinking_budget=81920`

# 工具调用
- 后端内置 5 个工具：exec / read_file / write_file / list_dir / web_search
- 三层兜底协议：
  ① Provider 原生 OpenAI 风格 tool_calls
  ② 系统提示里注入 <tool_call>{json}</tool_call> XML 语法
  ③ 后端 chat 路由做多轮循环（最多 8 轮）

# 搜索
- 不调官方搜索 API，直接用 web_search 工具（后端走 DuckDuckGo HTML）

# Cookie 流程
- 用户点 UI「一键登录」→ 后端启 Chrome（带 --remote-debugging-port=9222）→ 打开目标登录页
- 用户在弹出的 Chrome 里手动登录
- 用户点「立即抓取」→ 后端通过 CDP 调 Network.getAllCookies → 按域过滤 → AES-256-GCM 加密落盘
- 主密钥 Windows 上额外用 DPAPI 保护

# UI 要求
- ChatGPT 风格：深色主题，左侧会话列表，右侧消息流
- 工具调用结果可折叠
- 思考内容用折叠面板展示
- 顶部 Topbar：模型切换、专家模式开关

# 交付
1. 完整可运行项目
2. 装好所有依赖
3. 后端 + 前端冒烟测试通过
4. README 写清楚 Windows 装步骤
5. 一键启动脚本（start.ps1 / start.sh）

# 验收
- 加密 roundtrip + 篡改检测 测试通过
- 5 个工具测试通过
- vite build 通过
- tsc -b 通过
- FastAPI 启动 + 19 个路由全部注册
- 端到端 provider 端点 + 头 + 请求体构造冒烟测试通过
```

---

## 二、已完成项目详细说明

### 2.1 目录结构

```
claw/
├── src-tauri/                       # Tauri 2 桌面壳
│   ├── src/
│   │   ├── main.rs                  # Windows 隐藏控制台
│   │   └── lib.rs                   # 后端进程管理 + Tauri commands
│   ├── tauri.conf.json
│   ├── capabilities/default.json    # 权限集
│   └── Cargo.toml
│
├── src/                             # React 前端
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css                    # Tailwind + Markdown 样式
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── Sidebar.tsx              # 左侧会话列表 + 设置入口
│   │   ├── Topbar.tsx               # 模型切换 + 专家模式开关
│   │   └── ChatPanel.tsx            # 消息流 + 输入框 + SSE 消费
│   ├── pages/
│   │   └── SettingsPage.tsx         # 一键登录 / 抓取 / 验证 / 手动导入
│   ├── stores/
│   │   ├── sessions.ts              # Zustand: 会话持久化
│   │   └── settings.ts              # Zustand: 默认 provider 持久化
│   └── lib/
│       ├── api.ts                   # fetch 封装 + Tauri invoke
│       └── types.ts
│
├── backend/                         # Python FastAPI
│   ├── app/
│   │   ├── main.py                  # uvicorn 入口
│   │   ├── api/
│   │   │   ├── app.py               # FastAPI 工厂
│   │   │   └── routes/
│   │   │       ├── system.py        # /api/system/info, /healthz
│   │   │       ├── providers.py     # /api/providers, /api/providers/{n}/validate
│   │   │       ├── cookies.py       # /api/cookies (CRUD)
│   │   │       ├── chat.py          # /api/chat/completions (SSE) + /test
│   │   │       └── onboard.py       # /api/onboard/start, /capture
│   │   ├── core/
│   │   │   ├── config.py            # pydantic-settings
│   │   │   ├── crypto.py            # AES-256-GCM + DPAPI
│   │   │   └── cookie_store.py      # 加密 Cookie CRUD
│   │   ├── providers/
│   │   │   ├── base.py              # BaseProvider / ChatRequest / ChatChunk
│   │   │   ├── deepseek.py          # DeepSeek V4 Pro + PoW solver
│   │   │   ├── qwen.py              # Qwen3.7 Max
│   │   │   └── registry.py          # 自动注入 cookie
│   │   ├── schemas/__init__.py      # Pydantic models
│   │   └── tools/builtin.py         # 5 个工具
│   ├── scripts/
│   │   ├── bootstrap_chrome.py      # 命令行启 Chrome + 抓 cookie
│   │   └── onboard.py               # 命令行引导（轮询登录态）
│   ├── tests/
│   │   ├── test_crypto.py
│   │   └── test_tools.py
│   ├── requirements.txt
│   └── pyproject.toml
│
├── start.sh                         # Linux/Mac 一键启动
├── start.ps1                        # Windows PowerShell 一键启动
├── package.json / tsconfig.json / vite.config.ts / tailwind.config.js
├── README.md
├── INSTALL.md                       # Windows 详细安装步骤
└── SUMMARY.md                       # 本文件
```

### 2.2 关键文件说明

| 文件 | 作用 | 重要细节 |
|---|---|---|
| `backend/app/core/crypto.py` | AES-256-GCM 文件加密 | Windows 上用 `win32crypt.CryptProtectData` 保护主密钥，magic + version + nonce + ciphertext 格式 |
| `backend/app/core/cookie_store.py` | Cookie CRUD | 每条记录 = `{provider, cookies, headers, user_id, updated_at}`，整体加密落盘到 `~/.claw/cookies.enc` |
| `backend/app/providers/deepseek.py` | DeepSeek V4 Pro 适配器 | `_base_url()` 根据是否有 Bearer 自动切官方/网页；`_solve_pow()` 调 `create_pow_challenge` 拿 challenge 并用 sha256 暴力枚举 nonce |
| `backend/app/providers/qwen.py` | Qwen3.7 Max 适配器 | `_base_url()` 按 cookie 域名判断国际版/国内版 |
| `backend/app/api/routes/chat.py` | SSE 流式聊天 | 8 轮工具调用循环；解析 OpenAI 原生 `tool_calls` + XML `<tool_call>` 兜底；执行后把 `tool` 消息塞回上下文 |
| `backend/app/api/routes/onboard.py` | 引导 API | `start` 启 Chrome + 调 `wait_for_cdp`；`capture` 调 `Network.getAllCookies` + 过滤 + 保存 + 立即 validate |
| `src/components/ChatPanel.tsx` | 消息流 | 用 `fetch().body.getReader()` 消费 SSE；累积 content/thinking/toolResult；按 message id 增量更新 |
| `src/pages/SettingsPage.tsx` | 设置页 | 三按钮流：一键登录（启动 Chrome）→ 立即抓取（CDP）→ 验证。带手动 JSON 导入兜底 |

### 2.3 已通过的测试

| 测试 | 命令 | 结果 |
|---|---|---|
| 加密 roundtrip | `python tests/test_crypto.py` | ✅ |
| 加密篡改检测 | 同上 | ✅ |
| 5 工具 + 危险命令拦截 | `python tests/test_tools.py` | ✅ |
| FastAPI 启动 + 19 路由 | `uvicorn app.api.app:app` | ✅ |
| Vite 生产构建 | `npm run build` | ✅ 2.87s |
| TypeScript 严格模式 | `tsc -b` | ✅ |
| Provider 端到端冒烟 | ad-hoc Python 脚本 | ✅ 输出正确 URL/header/body |

### 2.4 数据流图

```
┌─────────────┐  SSE  ┌──────────────┐  HTTPS  ┌──────────────────┐
│ React       │◄──────┤ FastAPI      │◄────────┤ chat.deepseek.com│
│ ChatPanel   │       │ /api/chat    │  Bearer │   /v0/chat/      │
│ (TypeScript)│       │  /completions│  +Cookie│   completions    │
└──────┬──────┘       └──────┬───────┘         └──────────────────┘
       │                     │                         ▲
       │                     │ tools  ┌──────────┐     │ 抓 cookies
       │                     ├───────►│ 沙箱子进程│     │
       │                     │         │ exec/... │     │
       │                     │         └──────────┘     │
       │                     │                         │
       │   "立即抓取"         │ CDP                      │
       ├────────────────────►│ /api/onboard/capture ────┘
       │                     │
       │   "一键登录"         │ spawn Chrome
       ├────────────────────►│ /api/onboard/start
                             │
                             ▼
                       ~/.claw/cookies.enc
                       (AES-256-GCM)
```

---

## 三、下一个 AI 需要做的事

按优先级排序。

### 3.1 P0：在 Windows 上跑通真实登录（**最关键**）

```powershell
cd claw
.\start.ps1
# 浏览器打开 http://localhost:5173
# 设置 → DeepSeek V4 Pro → 一键登录
# 弹出的 Chrome 里登录
# 回到设置 → 立即抓取 → 验证
# 验证通过后开聊
```

如果失败，按这个顺序排查：

1. **401/403** → 抓 Network 看实际请求的 `Authorization` header 是哪个字段。改 `deepseek.py` / `qwen.py` 里的 `_build_headers`。
2. **PoW 解算失败** → DeepSeek 升级了 challenge 格式。改 `deepseek.py::_do_pow_work`。
3. **SSE 流连不上 / 数据格式不对** → 抓 Network 看返回是 `text/event-stream` 还是别的；改 `_parse_sse_line`。
4. **V4 Pro 没用上专家模式** → 抓 Network 看真实请求体的字段名是 `chat_mode` 还是别的。

**所有这些改动都局限在 `backend/app/providers/{deepseek,qwen}.py` 的 1-2 个方法里，主体架构不用动。**

### 3.2 P0：补 Tauri 桌面壳的图标

当前 `src-tauri/icons/` 是占位 PNG，**Tauri release 构建前必须替换为真实图标**：

- `32x32.png`、`128x128.png`、`128x128@2x.png`（macOS/iOS 用）
- `icon.ico`（Windows 用，可以用 [icoconvert.com](https://icoconvert.com/) 把 PNG 转成）
- `icon.icns`（macOS release）

### 3.3 P1：加固

| 项 | 改哪里 |
|---|---|
| Tauri 启动时 `start_backend` 是异步 fire-and-forget，要改成 await 等待 healthz 真的返回 | `src-tauri/src/lib.rs` |
| ChatPanel 的 fetch 没有重试，cookie 偶尔 401 时要自动重抓 | `src/components/ChatPanel.tsx` |
| Provider `_solve_pow` 的 nonce 循环可能 10M+ 都没命中，要加超时 + fallback | `backend/app/providers/deepseek.py` |
| WebSearch 用了 `bs4`，可以考虑换成 `selectolax`（更快、原生无依赖） | `backend/app/tools/builtin.py` |
| Cookiestore 没有并发锁，多窗口会冲突 | `backend/app/core/cookie_store.py` |
| Tauri 关窗时杀子进程，但 `OnCloseRequested` 之前窗口已经消失了——子进程可能没及时关 | `src-tauri/src/lib.rs` |

### 3.4 P1：增加测试覆盖率

当前只有 crypto + tools 两个测试文件，建议补：

- `tests/test_providers.py`：mock httpx，验证 DeepSeek/Qwen 的请求体构造（PoW 逻辑可以单独 mock challenge）
- `tests/test_chat_route.py`：用 FastAPI TestClient 跑一遍 SSE 流
- `tests/test_onboard.py`：mock 整个 CDP 流程
- `tests/test_crypto.py`：增加 DPAPI 路径的覆盖（只在 Windows CI 上跑）

### 3.5 P2：扩展模型

- **加 Ollama 本地模型**：在 `app/providers/` 加 `ollama.py`，前端 Topbar 也能切。优点是开箱即用不依赖 cookie。
- **加更多国产模型**：Doubao / GLM / Kimi 都参考 OpenClaw Zero Token 那套模式
- **加 Anthropic Claude Web**：参考项目里有，可以直接抄

### 3.6 P2：UX 改进

- 首次启动弹一个 onboarding 向导（一步步引导登录）
- 消息搜索 / 会话标签
- 多窗口（每个会话独立窗口）
- 快捷键（Ctrl+N 新建、Ctrl+Shift+M 切换模型等）
- 导出对话（Markdown / PDF）

### 3.7 P3：发布

- 写 GitHub Actions：lint + test + 跨平台 build
- Tauri 自动签名（macOS 需要 Apple Developer，Windows 需要 EV 证书）
- 写一份 FAQ 文档
- 上 AUR / winget / Homebrew

### 3.8 关键约定（**不要破坏**）

1. **Provider 接口稳定**：`BaseProvider.chat(request) -> AsyncIterator[ChatChunk]`。新增 provider 必须实现这个签名，前端、chat 路由、UI 都不动。
2. **Cookie 文件格式**：`{provider: record}`，整体加密。如果改格式要写迁移代码，不要直接覆盖。
3. **SSE 协议**：`data: {json}\n\n` + `data: [DONE]\n\n`，前端按这个解析。`tool_result` 走同一个 SSE 通道（带 `tool_result` 字段）。
4. **配置外置**：所有路径 / 端口 / 域名都走 `app/core/config.py`，不要在代码里硬编码。

### 3.9 接手前必读

1. `README.md` 整体过一遍
2. `INSTALL.md` 在 Windows 上跑通一次 start.ps1
3. 看 `backend/app/providers/base.py` —— 所有 provider 适配器都基于这个
4. 看 `backend/app/api/routes/chat.py` —— 工具调用循环的核心
5. 看 `src/components/ChatPanel.tsx` —— SSE 消费 + 消息流渲染

### 3.10 已知限制（不要试图一次性全解决）

- **WASM PoW 字节码会变**：DeepSeek V4 升级时会换。维护成本是写一个**自动抓取新 WASM + 重生成 solver** 的脚本，不是手改。
- **官方 API 限流**：走 cookie 走网页 chat 后端本质是 free tier，DeepSeek/Qwen 一旦加更严风控，整套可能突然失效。这是**这类项目固有的脆弱性**，不是 bug。
- **跨平台**：当前 Tauri 2 + DPAPI 绑定 Windows。要支持 macOS / Linux 需要把 `crypto.py` 的 DPAPI 部分做成条件分支（已做了），但**测试矩阵**还没覆盖。

---

## 四、版本信息

- 项目版本：0.1.0
- 初始构建时间：2026-06-03
- Python 依赖：见 `backend/requirements.txt`
- Node 依赖：见 `package.json`
- 预计依赖大小：Python ~150MB（含 Playwright Chromium ~300MB），Node ~400MB
- 已实现代码量：~3,500 行（Python ~2,200 + TS/TSX/Rust ~1,300）

---

## 五、致下一个 AI

如果用户让你"接着这个项目做"，请：

1. **先问用户当前问题是什么**（是 401？UI bug？想加新模型？），不要假设
2. **先看 `src/lib/api.ts` 怎么和后端沟通** + **`backend/app/api/routes/chat.py` 怎么生成 SSE**
3. **改动尽量局限在 1-2 个文件**：UI 改动在 `src/`，provider 改动在 `backend/app/providers/`，工具改动在 `backend/app/tools/`
4. **不要重写 Cookie 存储**——AES-GCM + DPAPI 已经是合理方案，重写只会引入新 bug
5. **如果用户给了新模型**（比如 Doubao / Kimi），照着 `qwen.py` 的模式**抄一份**，改个名 + 改个 URL
6. **如果 Windows 上跑出新 bug**，优先怀疑 `_build_headers` 和 PoW 逻辑

祝顺利。
