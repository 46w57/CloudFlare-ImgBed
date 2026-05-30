import { useGameStore } from '../store/gameStore';

const GOOD_CREDITS = [
  '— 制作团队 —',
  '',
  '游戏设计 & 程序开发',
  '星渊工作室',
  '',
  '美术设计',
  '暮光画师',
  '',
  '音乐 & 音效',
  '陨星音律',
  '',
  '剧本创作',
  '虚空叙事者',
  '',
  '特别鸣谢',
  '所有参与测试的冒险者',
  '',
  '感谢你完成这段旅程',
  '星光之路，永不止步',
  '',
  '— THE END —',
];

const BAD_CREDITS = [
  '— 虚空记录 —',
  '',
  '冒险者的终末',
  '被虚空吞噬的灵魂',
  '',
  '世界陷入永恒的黑暗',
  '星光彻底熄灭',
  '',
  '也许在另一个时间线',
  '你能找到真正的答案',
  '',
  '...',
  '虚空之力，不可阻挡',
  '',
  '— GAME OVER —',
];

export default function EndingScreen() {
  const { endingType, gameState } = useGameStore();
  const { playerLevel, playerGold } = useGameStore();

  const isGood = endingType === 'good';
  const isGameOver = gameState === 'gameover';
  const credits = isGameOver ? BAD_CREDITS : (isGood ? GOOD_CREDITS : BAD_CREDITS);
  const title = isGameOver ? '虚空之力' : (isGood ? '星光之路' : '虚空之力');

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: isGood
        ? 'linear-gradient(180deg, #1a1207 0%, #2d1f0a 20%, #3d2a0e 40%, #2a1a05 70%, #0d0802 100%)'
        : 'linear-gradient(180deg, #0d0215 0%, #1a0525 25%, #2d0a35 50%, #1a0420 75%, #06010a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', zIndex: 500, overflow: 'hidden',
      animation: 'fadeInLine 1.5s ease',
    }}>
      {/* Background particles */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 3 + 1}px`,
            height: `${Math.random() * 3 + 1}px`,
            borderRadius: '50%',
            background: isGood ? `rgba(255,215,0,${Math.random() * 0.4 + 0.1})` : `rgba(138,43,226,${Math.random() * 0.4 + 0.1})`,
            animation: `floatParticle ${Math.random() * 6 + 4}s ease-in-out ${Math.random() * 4}s infinite`,
          }} />
        ))}
      </div>

      {/* Title */}
      <div style={{
        textAlign: 'center', marginBottom: 32, position: 'relative', zIndex: 1,
        animation: 'fadeInLine 1s ease 0.5s both',
      }}>
        <h1 style={{
          fontSize: 36, fontFamily: "'Press Start 2P', monospace",
          color: isGood ? '#ffd700' : '#8b008b',
          textShadow: isGood
            ? '0 0 15px rgba(255,215,0,0.6), 0 0 30px rgba(255,165,0,0.4), 0 0 45px rgba(255,100,0,0.2)'
            : '0 0 15px rgba(139,0,139,0.6), 0 0 30px rgba(75,0,130,0.4), 0 0 45px rgba(138,43,226,0.2)',
          letterSpacing: 3, lineHeight: 1.4,
        }}>
          {title}
        </h1>
        <div style={{
          marginTop: 12, width: 200, height: 1,
          marginInline: 'auto',
          background: isGood
            ? 'linear-gradient(90deg, transparent, rgba(255,215,0,0.5), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(138,43,226,0.5), transparent)',
        }} />
      </div>

      {/* Stats Panel */}
      <div style={{
        background: 'rgba(0,0,0,0.5)', border: `1px solid ${isGood ? 'rgba(255,215,0,0.3)' : 'rgba(138,43,226,0.3)'}`,
        borderRadius: 8, padding: '14px 24px', marginBottom: 24,
        display: 'flex', gap: 24, position: 'relative', zIndex: 1,
        animation: 'slideIn 0.6s ease 1s both',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#888',
          }}>最终等级</div>
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 18,
            color: isGood ? '#ffd700' : '#c084fc', marginTop: 4,
          }}>{playerLevel}</div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#888',
          }}>金币</div>
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 18,
            color: '#ffd700', marginTop: 4,
          }}>💰 {playerGold}</div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#888',
          }}>最终得分</div>
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 18,
            color: isGood ? '#4ade80' : '#ef4444', marginTop: 4,
          }}>{playerLevel * 150 + Math.floor(playerGold / 10)}</div>
        </div>
      </div>

      {/* Credits Scroll */}
      <div style={{
        height: 200, overflow: 'hidden', position: 'relative', zIndex: 1,
        width: 400,
      }}>
        <div style={{
          animation: 'scrollCredits 30s linear infinite',
          textAlign: 'center', whiteSpace: 'pre-line',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 10, lineHeight: 2.2,
          color: isGood ? 'rgba(230,220,190,0.85)' : 'rgba(200,180,220,0.7)',
        }}>
          {'\n\n\n\n'}
          {credits.join('\n')}
          {'\n\n\n\n\n\n'}
        </div>
      </div>

      {/* Return Button */}
      <button
        onClick={() => useGameStore.getState().setGameState(GameState.Title)}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = isGood
            ? 'rgba(255,215,0,0.25)'
            : 'rgba(138,43,226,0.25)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = isGood
            ? '#ffd700' : '#a855f7';
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.4)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = isGood
            ? 'rgba(255,215,0,0.3)' : 'rgba(138,43,226,0.3)';
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
        style={{
          marginTop: 16, padding: '12px 28px',
          background: 'rgba(0,0,0,0.4)',
          border: `1px solid ${isGood ? 'rgba(255,215,0,0.3)' : 'rgba(138,43,226,0.3)'}`,
          borderRadius: 6, color: isGood ? '#ffd700' : '#c084fc',
          fontFamily: "'Press Start 2P', monospace", fontSize: 11,
          cursor: 'pointer', pointerEvents: 'auto',
          transition: 'all 0.2s ease', position: 'relative', zIndex: 1,
          animation: 'fadeInLine 0.5s ease 1.5s both',
        }}
      >
        返回标题
      </button>

      <style>{`
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-30px) translateX(10px); opacity: 0.8; }
          50% { transform: translateY(-15px) translateX(-10px); opacity: 0.5; }
          75% { transform: translateY(-40px) translateX(5px); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

enum GameState {
  Title = 'title',
  Playing = 'playing',
  Dialog = 'dialog',
  Inventory = 'inventory',
  GameOver = 'gameover',
  Ending = 'ending',
}
