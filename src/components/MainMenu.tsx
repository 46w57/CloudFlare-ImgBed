import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';

const STARS_COUNT = 60;

export default function MainMenu() {
  const startGame = useGameStore((s) => s.startGame);
  const loadGame = useGameStore((s) => s.loadGame);
  const saveSlots = useGameStore((s) => s.saveSlots);

  const stars = useMemo(() => {
    return Array.from({ length: STARS_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 4,
      duration: Math.random() * 3 + 2,
      opacity: Math.random() * 0.7 + 0.3,
    }));
  }, []);

  const menuItems = [
    { label: '开始游戏', action: () => startGame(), hasSave: true },
    { label: `读取存档 1 ${saveSlots[0] ? '✓' : ''}`, action: () => loadGame(0), hasSave: !!saveSlots[0] },
    { label: `读取存档 2 ${saveSlots[1] ? '✓' : ''}`, action: () => loadGame(1), hasSave: !!saveSlots[1] },
    { label: `读取存档 3 ${saveSlots[2] ? '✓' : ''}`, action: () => loadGame(2), hasSave: !!saveSlots[2] },
  ];

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(135deg, #0a0a1e 0%, #1a0a2e 30%, #0d1b3e 60%, #1a0a2e 100%)',
      position: 'relative', overflow: 'hidden', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Animated Star Field */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {stars.map((star) => (
          <span
            key={star.id}
            style={{
              position: 'absolute',
              left: `${star.left}%`,
              top: `${star.top}%`,
              fontSize: `${star.size * 5}px`,
              color: '#fff',
              opacity: star.opacity,
              animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
              lineHeight: 1,
            }}
          >
            ★
          </span>
        ))}
      </div>

      {/* Ambient glow orbs */}
      <div style={{
        position: 'absolute', top: '15%', left: '10%',
        width: 200, height: 200, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(138,43,226,0.12) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '20%', right: '5%',
        width: 250, height: 250, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,165,0,0.08) 0%, transparent 70%)',
        filter: 'blur(50px)',
      }} />

      {/* Title */}
      <div style={{ zIndex: 1, textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{
          fontSize: 42, fontFamily: "'Press Start 2P', monospace",
          color: '#ffd700',
          textShadow: '0 0 10px #ffd700, 0 0 20px #ffa500, 0 0 30px #ff6b00, 0 0 40px rgba(255,107,0,0.5)',
          animation: 'titleGlow 3s ease-in-out infinite',
          marginBottom: 8, letterSpacing: 4, lineHeight: 1.3,
        }}>
          暮光之境
        </h1>
        <p style={{
          fontSize: 16, fontFamily: "'Press Start 2P', monospace",
          color: 'rgba(200,180,220,0.8)',
          letterSpacing: 6, animation: 'fadeInLine 2s ease 0.5s both',
        }}>
          陨星回响
        </p>
        <div style={{
          marginTop: 16, width: 300, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.4), transparent)',
        }} />
      </div>

      {/* Menu Buttons */}
      <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {menuItems.map((item, idx) => (
          <button
            key={idx}
            onClick={item.action}
            disabled={!item.hasSave && idx > 0}
            style={{
              width: 260, padding: '14px 24px',
              background: item.hasSave || idx === 0
                ? 'rgba(20,10,40,0.85)'
                : 'rgba(10,10,20,0.5)',
              border: item.hasSave || idx === 0
                ? '2px solid rgba(138,43,226,0.6)'
                : '2px solid rgba(80,80,100,0.3)',
              borderRadius: 6,
              color: item.hasSave || idx === 0 ? '#e8e0f0' : '#555',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 13, cursor: item.hasSave || idx === 0 ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              textAlign: 'left', paddingLeft: 28,
              animation: `slideIn 0.4s ease ${idx * 0.12}s both`,
              pointerEvents: 'auto',
            }}
            onMouseEnter={(e) => {
              if (item.hasSave || idx === 0) {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(138,43,226,0.25)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#a855f7';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(168,85,247,0.3), inset 0 0 20px rgba(168,85,247,0.05)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateX(8px)';
                (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '';
              (e.currentTarget as HTMLButtonElement).style.borderColor = item.hasSave || idx === 0
                ? 'rgba(138,43,226,0.6)' : 'rgba(80,80,100,0.3)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateX(0)';
              (e.currentTarget as HTMLButtonElement).style.color = item.hasSave || idx === 0 ? '#e8e0f0' : '#555';
            }}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Control Hints */}
      <div style={{
        position: 'absolute', bottom: 20, left: 0, right: 0,
        textAlign: 'center', zIndex: 1,
        fontFamily: "'Press Start 2P', monospace", fontSize: 9,
        color: 'rgba(180,170,200,0.55)', letterSpacing: 1,
        display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
      }}>
        <span>WASD 移动 / 空格 交互 / E 对话 / I 背包</span>
        <span>ESC 返回 / J 攻击 / K 技能 / L 物品</span>
      </div>

      {/* Version info */}
      <div style={{
        position: 'absolute', bottom: 8, right: 12,
        fontFamily: "'Press Start 2P', monospace", fontSize: 7,
        color: 'rgba(120,110,150,0.4)', zIndex: 1,
      }}>
        v0.1.0-alpha
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
