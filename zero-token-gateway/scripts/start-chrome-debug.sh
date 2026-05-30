#!/bin/bash
CHROME_DEBUG_PORT="${1:-9222}"
USER_DATA_DIR="$HOME/.zero-token-gateway/chrome-profile"

mkdir -p "$USER_DATA_DIR"

if command -v google-chrome &> /dev/null; then
    CHROME_CMD="google-chrome"
elif command -v google-chrome-stable &> /dev/null; then
    CHROME_CMD="google-chrome-stable"
elif command -v chromium &> /dev/null; then
    CHROME_CMD="chromium"
elif command -v chromium-browser &> /dev/null; then
    CHROME_CMD="chromium-browser"
elif [ -d "/Applications/Google Chrome.app" ]; then
    CHROME_CMD="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
else
    echo "Error: Chrome/Chromium not found"
    exit 1
fi

echo "Starting Chrome in debug mode on port $CHROME_DEBUG_PORT..."
echo "User data directory: $USER_DATA_DIR"
echo ""
echo "Please log into the following AI platforms in the browser:"
echo "  - DeepSeek:     https://chat.deepseek.com"
echo "  - Qwen (Intl):  https://qwenlm.ai"
echo "  - Qwen (CN):    https://tongyi.aliyun.com/qianwen"
echo "  - Kimi:         https://kimi.moonshot.cn"
echo "  - Claude:       https://claude.ai"
echo "  - ChatGPT:      https://chatgpt.com"
echo "  - Gemini:       https://gemini.google.com"
echo "  - Grok:         https://grok.x.ai"
echo "  - GLM:          https://chatglm.cn"
echo "  - Doubao:       https://www.doubao.com"
echo "  - Xiaomi MiMo:  https://mimo.xiaomi.com"
echo ""

"$CHROME_CMD" \
    --remote-debugging-port="$CHROME_DEBUG_PORT" \
    --user-data-dir="$USER_DATA_DIR" \
    --no-first-run \
    --no-default-browser-check \
    "https://chat.deepseek.com" \
    "https://qwenlm.ai" \
    "https://claude.ai" \
    "https://chatgpt.com" &
echo "Chrome started. Keep this terminal open."
echo "After logging in, run: npm run onboard"
