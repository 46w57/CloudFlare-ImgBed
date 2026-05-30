import { useState } from 'react';
import { ExternalLink, Cpu, MessageSquare, Layers, Sparkles } from 'lucide-react';
import { models, type Domain } from '@/data/models';

const domainIcons: Record<Domain, typeof Cpu> = {
  text: MessageSquare,
  code: Cpu,
  image: Sparkles,
  video: Layers,
  multimodal: Layers,
  audio: Sparkles,
};

const domainLabels: Record<Domain, string> = {
  text: '文本',
  code: '代码',
  image: '图像',
  video: '视频',
  multimodal: '多模态',
  audio: '音频',
};

export default function ModelCards() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  return (
    <section className="relative z-10 px-4 py-20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-orbitron text-3xl md:text-4xl font-bold mb-4">
            <span className="gradient-text">模型详情</span>
          </h2>
          <p className="text-slate-400">悬停查看详细规格和能力评分</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model, idx) => {
            const isExpanded = expandedCard === model.id;
            return (
              <div
                key={model.id}
                className="glass-card rounded-xl overflow-hidden transition-all duration-500 hover:-translate-y-2 group"
                style={{
                  animationDelay: `${idx * 100}ms`,
                  borderColor: isExpanded ? `${model.color}40` : undefined,
                  boxShadow: isExpanded ? `0 0 30px ${model.color}20` : undefined,
                }}
                onMouseEnter={() => setExpandedCard(model.id)}
                onMouseLeave={() => setExpandedCard(null)}
              >
                {/* Top color bar */}
                <div
                  className="h-1 w-full transition-all duration-300"
                  style={{
                    backgroundColor: model.color,
                    boxShadow: `0 0 10px ${model.color}50`,
                  }}
                />

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-orbitron text-lg font-bold text-white mb-1">
                        {model.name}
                      </h3>
                      <p className="text-sm text-slate-400">{model.company}</p>
                    </div>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: `${model.color}15`,
                        border: `1px solid ${model.color}30`,
                      }}
                    >
                      <ExternalLink className="w-4 h-4" style={{ color: model.color }} />
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2.5 py-1 rounded-md text-xs bg-white/5 text-slate-400 border border-white/10">
                      {model.releaseDate}
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-xs bg-white/5 text-slate-400 border border-white/10">
                      {model.contextLength}
                    </span>
                    {model.pricing && (
                      <span className="px-2.5 py-1 rounded-md text-xs bg-white/5 text-slate-400 border border-white/10">
                        {model.pricing}
                      </span>
                    )}
                  </div>

                  {/* Domains */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {model.domains.map(domain => {
                      const Icon = domainIcons[domain];
                      return (
                        <span
                          key={domain}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${model.color}10`,
                            color: model.color,
                            border: `1px solid ${model.color}25`,
                          }}
                        >
                          <Icon className="w-3 h-3" />
                          {domainLabels[domain]}
                        </span>
                      );
                    })}
                  </div>

                  {/* Highlights */}
                  <div className="space-y-1.5 mb-4">
                    {model.highlights.map((highlight, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: model.color }}
                        />
                        {highlight}
                      </div>
                    ))}
                  </div>

                  {/* Expanded scores */}
                  <div
                    className="overflow-hidden transition-all duration-500"
                    style={{
                      maxHeight: isExpanded ? '300px' : '0',
                      opacity: isExpanded ? 1 : 0,
                    }}
                  >
                    <div className="pt-4 border-t border-white/10">
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(model.scores).map(([key, score]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 capitalize">
                              {key === 'reasoning' && '推理'}
                              {key === 'coding' && '编程'}
                              {key === 'creativity' && '创意'}
                              {key === 'math' && '数学'}
                              {key === 'multilingual' && '多语言'}
                              {key === 'multimodal' && '多模态'}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-white/5 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${score}%`,
                                    backgroundColor: model.color,
                                  }}
                                />
                              </div>
                              <span className="font-orbitron text-xs font-bold w-6 text-right" style={{ color: model.color }}>
                                {score}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
