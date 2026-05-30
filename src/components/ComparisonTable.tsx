import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import { models, type AIModel, type Domain, domains } from '@/data/models';

type SortKey = 'name' | 'company' | 'releaseDate' | 'contextLength' | 'intelligenceIndex';
type SortDir = 'asc' | 'desc';

export default function ComparisonTable() {
  const [sortKey, setSortKey] = useState<SortKey>('intelligenceIndex');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterDomain, setFilterDomain] = useState<Domain | 'all'>('all');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedModels = useMemo(() => {
    let filtered = filterDomain === 'all'
      ? [...models]
      : models.filter(m => m.domains.includes(filterDomain));

    return filtered.sort((a, b) => {
      let valA: string | number | undefined;
      let valB: string | number | undefined;

      switch (sortKey) {
        case 'name':
          valA = a.name;
          valB = b.name;
          break;
        case 'company':
          valA = a.company;
          valB = b.company;
          break;
        case 'releaseDate':
          valA = a.releaseDate;
          valB = b.releaseDate;
          break;
        case 'contextLength':
          valA = parseInt(a.contextLength);
          valB = parseInt(b.contextLength);
          break;
        case 'intelligenceIndex':
          valA = a.intelligenceIndex ?? 0;
          valB = b.intelligenceIndex ?? 0;
          break;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [sortKey, sortDir, filterDomain]);

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-400" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />;
  };

  const ScoreBar = ({ value, color }: { value: number; color: string }) => (
    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  );

  return (
    <section className="relative z-10 px-4 py-20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-orbitron text-3xl md:text-4xl font-bold mb-4">
            <span className="gradient-text">模型对比</span>
          </h2>
          <p className="text-slate-400">点击表头排序，筛选领域查看专项能力</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          <button
            onClick={() => setFilterDomain('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              filterDomain === 'all'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:border-cyan-500/30'
            }`}
          >
            <Filter className="w-3.5 h-3.5 inline mr-1.5" />
            全部
          </button>
          {domains.map(d => (
            <button
              key={d.id}
              onClick={() => setFilterDomain(d.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                filterDomain === d.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:border-cyan-500/30'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                {[
                  { key: 'name' as SortKey, label: '模型', width: 'w-48' },
                  { key: 'company' as SortKey, label: '厂商', width: 'w-32' },
                  { key: 'releaseDate' as SortKey, label: '发布日期', width: 'w-28' },
                  { key: 'contextLength' as SortKey, label: '上下文', width: 'w-28' },
                  { key: 'intelligenceIndex' as SortKey, label: '智能指数', width: 'w-32' },
                ].map(col => (
                  <th
                    key={col.key}
                    className={`${col.width} px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-cyan-400 transition-colors`}
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      <SortIcon colKey={col.key} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">核心亮点</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">能力评分</th>
              </tr>
            </thead>
            <tbody>
              {sortedModels.map((model, idx) => (
                <tr
                  key={model.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: model.color, boxShadow: `0 0 8px ${model.color}40` }}
                      />
                      <div>
                        <div className="font-medium text-white">{model.name}</div>
                        <div className="text-xs text-slate-500">{model.parameters}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-300">{model.company}</td>
                  <td className="px-4 py-4 text-sm text-slate-300">{model.releaseDate}</td>
                  <td className="px-4 py-4 text-sm text-slate-300">{model.contextLength}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-orbitron text-sm font-bold" style={{ color: model.color }}>
                        {model.intelligenceIndex ?? '-'}
                      </span>
                      <ScoreBar value={(model.intelligenceIndex ?? 0) * 1.5} color={model.color} />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {model.highlights.slice(0, 2).map((h, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-xs bg-white/5 text-slate-400 border border-white/10"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1">
                      {Object.entries(model.scores).slice(0, 4).map(([key, score]) => (
                        <div
                          key={key}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{
                            backgroundColor: `${model.color}15`,
                            color: model.color,
                            border: `1px solid ${model.color}30`,
                          }}
                          title={`${key}: ${score}`}
                        >
                          {score}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
