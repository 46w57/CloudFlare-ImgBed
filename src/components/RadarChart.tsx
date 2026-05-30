import { useEffect, useRef, useState } from 'react';
import { models, scoreLabels } from '@/data/models';

const dimensions = ['reasoning', 'coding', 'creativity', 'math', 'multilingual', 'multimodal'] as const;

export default function RadarChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>(['claude-opus-48', 'gpt-55', 'gemini-35-flash', 'deepseek-v4-pro']);
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);

  const toggleModel = (id: string) => {
    setSelectedModels(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 60;

    ctx.clearRect(0, 0, width, height);

    const angleStep = (Math.PI * 2) / dimensions.length;

    // Draw grid
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      const r = (radius / 5) * i;
      for (let j = 0; j <= dimensions.length; j++) {
        const angle = j * angleStep - Math.PI / 2;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.05 + i * 0.02})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw axes
    dimensions.forEach((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw labels
    dimensions.forEach((dim, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const labelRadius = radius + 30;
      const x = centerX + Math.cos(angle) * labelRadius;
      const y = centerY + Math.sin(angle) * labelRadius;

      ctx.font = '12px "Noto Sans SC", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(scoreLabels[dim], x, y);
    });

    // Draw model polygons
    const activeModels = models.filter(m => selectedModels.includes(m.id));
    activeModels.forEach(model => {
      const isHovered = hoveredModel === model.id;
      ctx.beginPath();
      dimensions.forEach((dim, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const value = model.scores[dim] / 100;
        const r = radius * value;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();

      ctx.fillStyle = `${model.color}${isHovered ? '30' : '15'}`;
      ctx.fill();
      ctx.strokeStyle = model.color;
      ctx.lineWidth = isHovered ? 2.5 : 1.5;
      ctx.stroke();

      // Draw points
      dimensions.forEach((dim, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const value = model.scores[dim] / 100;
        const r = radius * value;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        ctx.beginPath();
        ctx.arc(x, y, isHovered ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = model.color;
        ctx.fill();
        ctx.strokeStyle = '#0a0a0f';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });
  }, [selectedModels, hoveredModel]);

  return (
    <section id="radar" className="relative z-10 px-4 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-orbitron text-3xl md:text-4xl font-bold mb-4">
            <span className="gradient-text">能力雷达图</span>
          </h2>
          <p className="text-slate-400">点击图例切换模型，悬停查看详细评分</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {models.map(model => (
            <button
              key={model.id}
              onClick={() => toggleModel(model.id)}
              onMouseEnter={() => setHoveredModel(model.id)}
              onMouseLeave={() => setHoveredModel(null)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                selectedModels.includes(model.id)
                  ? 'border'
                  : 'opacity-40 border border-transparent'
              }`}
              style={{
                backgroundColor: selectedModels.includes(model.id) ? `${model.color}15` : 'rgba(255,255,255,0.05)',
                borderColor: selectedModels.includes(model.id) ? `${model.color}40` : 'transparent',
                color: selectedModels.includes(model.id) ? model.color : '#94a3b8',
              }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: model.color }}
              />
              {model.name}
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-2xl mx-auto aspect-square">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ imageRendering: 'crisp-edges' }}
          />
        </div>

        {hoveredModel && (
          <div className="mt-8 glass-card rounded-xl p-6 max-w-lg mx-auto">
            {(() => {
              const model = models.find(m => m.id === hoveredModel);
              if (!model) return null;
              return (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: model.color }} />
                    <h3 className="font-orbitron text-lg font-bold" style={{ color: model.color }}>
                      {model.name}
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {dimensions.map(dim => (
                      <div key={dim} className="text-center">
                        <div className="text-xs text-slate-500 mb-1">{scoreLabels[dim]}</div>
                        <div className="font-orbitron text-lg font-bold" style={{ color: model.color }}>
                          {model.scores[dim]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </section>
  );
}
