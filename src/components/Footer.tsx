import { Github, Twitter, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="font-orbitron text-xl font-bold gradient-text mb-2">
              AI Model Compass
            </h3>
            <p className="text-sm text-slate-500">
              数据来源于公开基准测试与厂商发布信息，持续更新中
            </p>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="#"
              className="text-slate-500 hover:text-cyan-400 transition-colors"
              onClick={e => e.preventDefault()}
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="text-slate-500 hover:text-cyan-400 transition-colors"
              onClick={e => e.preventDefault()}
            >
              <Twitter className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="text-slate-500 hover:text-cyan-400 transition-colors"
              onClick={e => e.preventDefault()}
            >
              <Globe className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-slate-600">
            2026 AI Model Compass. 本页面仅供技术参考，数据可能随时间变化。
          </p>
        </div>
      </div>
    </footer>
  );
}
