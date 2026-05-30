import { useEffect, useRef, useState } from 'react';
import { Brain, Zap, Globe, Code } from 'lucide-react';

function AnimatedCounter({ target, suffix = '', duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

export default function HeroSection() {
  const [titleVisible, setTitleVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTitleVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const titleChars = '2025-2026 AI模型全景'.split('');

  const stats = [
    { icon: Brain, value: 12, suffix: '+', label: '前沿模型' },
    { icon: Zap, value: 6, suffix: '', label: '能力维度' },
    { icon: Globe, value: 8, suffix: '', label: '覆盖厂商' },
    { icon: Code, value: 5, suffix: '', label: '编程基准' },
  ];

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      <div className="relative z-10 text-center max-w-5xl mx-auto">
        <div className="mb-6">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase bg-white/5 border border-cyan-500/30 text-cyan-400">
            实时更新 · 2026年5月
          </span>
        </div>

        <h1 className="font-orbitron text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-tight">
          {titleChars.map((char, i) => (
            <span
              key={i}
              className="inline-block transition-all duration-500"
              style={{
                opacity: titleVisible ? 1 : 0,
                transform: titleVisible ? 'translateY(0)' : 'translateY(20px)',
                transitionDelay: `${i * 50}ms`,
                color: char === ' ' ? 'transparent' : i < 4 ? '#00f0ff' : '#e2e8f0',
                textShadow: i < 4 ? '0 0 20px rgba(0,240,255,0.5)' : 'none',
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </h1>

        <p
          className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 transition-all duration-1000"
          style={{
            opacity: titleVisible ? 1 : 0,
            transform: titleVisible ? 'translateY(0)' : 'translateY(20px)',
            transitionDelay: '600ms',
          }}
        >
          深度对比全球最新发布的大语言模型，覆盖推理、编程、多模态等核心能力维度
        </p>

        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
          style={{
            opacity: titleVisible ? 1 : 0,
            transform: titleVisible ? 'translateY(0)' : 'translateY(20px)',
            transitionDelay: '800ms',
            transition: 'all 0.8s ease-out',
          }}
        >
          {stats.map((stat, i) => (
            <div
              key={i}
              className="glass-card rounded-xl p-5 hover:border-cyan-500/30 transition-all duration-300 hover:-translate-y-1"
            >
              <stat.icon className="w-6 h-6 text-cyan-400 mx-auto mb-3" />
              <div className="font-orbitron text-2xl md:text-3xl font-bold text-white mb-1">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-cyan-500/30 flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-cyan-400 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}
