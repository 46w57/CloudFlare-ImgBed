import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { models } from '@/data/models';

export default function Timeline() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sortedModels = [...models].sort((a, b) =>
    new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
  );

  const scrollContainer = (direction: 'left' | 'right') => {
    const container = document.getElementById('timeline-scroll');
    if (container) {
      const scrollAmount = 300;
      container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const earliest = new Date(sortedModels[0].releaseDate);
  const latest = new Date(sortedModels[sortedModels.length - 1].releaseDate);
  const totalDays = (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24);

  return (
    <section id="timeline" className="relative z-10 px-4 py-20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-orbitron text-3xl md:text-4xl font-bold mb-4">
            <span className="gradient-text">发布 timeline</span>
          </h2>
          <p className="text-slate-400">2025-2026年AI模型发布历史时间轴</p>
        </div>

        <div className="relative">
          {/* Scroll buttons */}
          <button
            onClick={() => scrollContainer('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => scrollContainer('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          {/* Timeline container */}
          <div
            id="timeline-scroll"
            className="overflow-x-auto pb-8 px-12 hide-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="relative min-w-[800px]" style={{ height: '200px' }}>
              {/* Timeline line */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-cyan-500/30" />

              {/* Model nodes */}
              {sortedModels.map((model, idx) => {
                const date = new Date(model.releaseDate);
                const daysFromStart = (date.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24);
                const position = (daysFromStart / totalDays) * 100;
                const isHovered = hoveredId === model.id;
                const isTop = idx % 2 === 0;

                return (
                  <div
                    key={model.id}
                    className="absolute transform -translate-x-1/2 cursor-pointer"
                    style={{
                      left: `${position}%`,
                      top: isTop ? '20px' : 'auto',
                      bottom: isTop ? 'auto' : '20px',
                    }}
                    onMouseEnter={() => setHoveredId(model.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Card */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 w-48 glass-card rounded-lg p-3 transition-all duration-300"
                      style={{
                        top: isTop ? '100%' : 'auto',
                        bottom: isTop ? 'auto' : '100%',
                        marginTop: isTop ? '12px' : '0',
                        marginBottom: isTop ? '0' : '12px',
                        opacity: isHovered ? 1 : 0,
                        transform: `translateX(-50%) ${isHovered ? 'scale(1)' : 'scale(0.9)'}`,
                        pointerEvents: isHovered ? 'auto' : 'none',
                        borderColor: `${model.color}40`,
                      }}
                    >
                      <div className="font-orbitron text-sm font-bold mb-1" style={{ color: model.color }}>
                        {model.name}
                      </div>
                      <div className="text-xs text-slate-400 mb-1">{model.company}</div>
                      <div className="text-xs text-slate-500">{model.highlights[0]}</div>
                    </div>

                    {/* Node */}
                    <div
                      className="relative w-4 h-4 rounded-full border-2 transition-all duration-300"
                      style={{
                        backgroundColor: isHovered ? model.color : '#0a0a0f',
                        borderColor: model.color,
                        boxShadow: isHovered ? `0 0 15px ${model.color}60` : 'none',
                        transform: isHovered ? 'scale(1.5)' : 'scale(1)',
                      }}
                    />

                    {/* Label */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 text-xs whitespace-nowrap transition-all duration-300"
                      style={{
                        top: isTop ? '-24px' : 'auto',
                        bottom: isTop ? 'auto' : '-24px',
                        color: isHovered ? model.color : '#94a3b8',
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {model.releaseDate}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
