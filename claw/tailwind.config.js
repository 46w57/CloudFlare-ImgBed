/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ChatGPT 风格灰度
        bg: {
          DEFAULT: '#0f0f10',
          panel: '#1a1a1c',
          subtle: '#222326',
          hover: '#2a2b2e',
        },
        line: '#2f3033',
        text: {
          primary: '#ececec',
          secondary: '#b4b4b4',
          muted: '#8e8e93',
        },
        accent: {
          DEFAULT: '#10a37f', // OpenAI 绿
          hover: '#0e906f',
        },
      },
      fontFamily: {
        sans: [
          'Söhne',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
        mono: [
          'Söhne Mono',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      animation: {
        'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
