import { useState } from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import { models, scoreLabels } from '@/data/models';

const dimensions = [
  { key: 'reasoning', label: '推理能力', icon: TrendingUp },
  { key: 'coding', label: '编程能力', icon: Trophy },
  { key: 'creativity', label: '创意写作', icon: TrendingUp },
  { key: 'math', label: '数学能力', icon: Trophy },
  { key: 'multilingual', label: '多语言', icon: TrendingUp },
  { key: 'multimodal', label: '多模态', icon: Trophy },
] as const;

type ScoreKey = 'reasoning' | 'coding' | 'creativity' | 'math' | 'multilingual' | 'multimodal';

export default function Leaderboard() {
  const [activeDim, setActiveDim] = useState<ScoreKey>('coding');

  const sortedModels = [...models]
    .sort((a, b) => {
      const scoreA = a.scores[activeDim];
      const scoreB = b.scores[activeDim];
      return scoreB - scoreA;
    })
    .slice(0, 6);

  const maxScore = sortedModels.length > 0 ? sortedModels[0].scores[activeDim] : 100;

  return (
    <section id="leaderboard" className="relative z-10 px-4 py-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-orbitron text-3xl md:text-4xl font-bold mb-4">
            <span className="gradient-text">能力排行榜</span>
          </h2>
          <p className="text-slate-400">各维度Top模型排名对比</p>
        </div>

        {/* Dimension tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {dimensions.map(dim => {
            const Icon = dim.icon;
            return (
              <button
                key={dim.key}
                onClick={() => setActiveDim(dim.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeDim === dim.key
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:border-cyan-500/20 hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {dim.label}
              </button>
            );
          })}
        </div>

        {/* Ranking bars */}
        <div className="space-y-4">
          {sortedModels.map((model, idx) => {
            const score = model.scores[activeDim];
            const percentage = (score / maxScore) * 100;

            return (
              <div
                key={model.id}
                className="glass-card rounded-xl p-4 hover:border-white/20 transition-all duration-300 group"
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-orbitron font-bold text-lg shrink-0 ${
                      idx === 0
                        ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                        : idx === 1
                        ? 'bg-slate-400/15 text-slate-300 border border-slate-400/30'
                        : idx === 2
                        ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                        : 'bg-white/5 text-slate-500 border border-white/10'
                    }`}
                  >
                    {idx + 1}
                  </div>

                  {/* Model info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{
                          backgroundColor: model.color,
                          boxShadow: `0 0 8px ${model.color}50`,
                        }}
                      />
                      <span className="font-medium text-white truncate">{model.name}</span>
                      <span className="text-xs text-slate-500 shrink-0">{model.company}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${percentage}%`,
                          background: `linear-gradient(90deg, ${model.color}80, ${model.color})`,
                          boxShadow: `0 0 10px ${model.color}40`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <div
                      className="font-orbitron text-2xl font-bold"
                      style={{ color: model.color }}
                    >
                      {score}
                    </div>
                    <div className="text-xs text-slate-500">分</div>
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
