import { useGameStore } from '../store/gameStore';

export default function HUD() {
  const {
    playerHp, playerMaxHp,
    playerMp, playerMaxMp,
    playerLevel, playerExp, playerExpToLevel,
    playerGold,
    regionName,
  } = useGameStore();

  const hpPercent = Math.max(0, Math.min(100, (playerHp / playerMaxHp) * 100));
  const mpPercent = Math.max(0, Math.min(100, (playerMp / playerMaxMp) * 100));
  const expPercent = Math.max(0, Math.min(100, (playerExp / playerExpToLevel) * 100));

  const skills = [
    { name: '攻击', key: 'J', icon: '⚔️', color: '#e74c3c' },
    { name: '技能', key: 'K', icon: '✦', color: '#9b59b6' },
    { name: '物品', key: 'L', icon: '🎒', color: '#f39c12' },
    { name: '闪避', key: 'Space', icon: '💨', color: '#3498db' },
  ];

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
      {/* Top Left - Status Bars */}
      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* HP Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#e74c3c', fontSize: 10, fontFamily: "'Press Start 2P', monospace", minWidth: 24 }}>HP</span>
          <div style={{
            width: 180, height: 14, background: 'rgba(0,0,0,0.7)', borderRadius: 3,
            border: '1px solid #8b0000', overflow: 'hidden',
          }}>
            <div style={{
              width: `${hpPercent}%`, height: '100%',
              background: 'linear-gradient(90deg, #c0392b, #e74c3c)',
              transition: 'width 0.3s ease', borderRadius: 2,
            }} />
          </div>
          <span style={{ color: '#e74c3c', fontSize: 9, fontFamily: "'Press Start 2P', monospace", minWidth: 60 }}>
            {playerHp}/{playerMaxHp}
          </span>
        </div>

        {/* MP Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#3498db', fontSize: 10, fontFamily: "'Press Start 2P', monospace", minWidth: 24 }}>MP</span>
          <div style={{
            width: 180, height: 14, background: 'rgba(0,0,0,0.7)', borderRadius: 3,
            border: '1px solid #1a5276', overflow: 'hidden',
          }}>
            <div style={{
              width: `${mpPercent}%`, height: '100%',
              background: 'linear-gradient(90deg, #2980b9, #3498db)',
              transition: 'width 0.3s ease', borderRadius: 2,
            }} />
          </div>
          <span style={{ color: '#3498db', fontSize: 9, fontFamily: "'Press Start 2P', monospace", minWidth: 60 }}>
            {playerMp}/{playerMaxMp}
          </span>
        </div>

        {/* EXP Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#f1c40f', fontSize: 10, fontFamily: "'Press Start 2P', monospace", minWidth: 24 }}>EXP</span>
          <div style={{
            width: 180, height: 10, background: 'rgba(0,0,0,0.7)', borderRadius: 3,
            border: '1px solid #9a7d0a', overflow: 'hidden',
          }}>
            <div style={{
              width: `${expPercent}%`, height: '100%',
              background: 'linear-gradient(90deg, #f39c12, #f1c40f)',
              transition: 'width 0.3s ease', borderRadius: 2,
            }} />
          </div>
          <span style={{ color: '#f1c40f', fontSize: 9, fontFamily: "'Press Start 2P', monospace", minWidth: 60 }}>
            {playerExp}/{playerExpToLevel}
          </span>
        </div>

        {/* Level Badge & Gold */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <div style={{
            background: 'linear-gradient(135deg, #f39c12, #e67e22)', color: '#fff',
            padding: '3px 8px', borderRadius: 4, fontSize: 10,
            fontFamily: "'Press Start 2P', monospace", border: '1px solid #d35400',
          }}>
            Lv.{playerLevel}
          </div>
          <div style={{ color: '#ffd700', fontSize: 10, fontFamily: "'Press Start 2P', monospace", display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>💰</span> {playerGold}
          </div>
        </div>
      </div>

      {/* Top Center - Region Name */}
      {regionName && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.65)', color: '#e0e0e0', padding: '6px 16px',
          borderRadius: 4, fontSize: 11, fontFamily: "'Press Start 2P', monospace",
          border: '1px solid rgba(255,255,255,0.15)', whiteSpace: 'nowrap',
          animation: 'fadeInLine 0.5s ease',
        }}>
          📍 {regionName}
        </div>
      )}

      {/* Top Right - Minimap Placeholder */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        width: 120, height: 90, background: 'rgba(0,0,0,0.75)',
        borderRadius: 4, border: '2px solid #4a4a6a', overflow: 'hidden',
      }}>
        <div style={{
          width: '100%', height: '100%',
          background: 'radial-gradient(circle at 60% 40%, #1a2a4a 0%, #0a0a1a 70%)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', left: '55%', top: '45%',
            width: 6, height: 6, background: '#ffd700', borderRadius: '50%',
            boxShadow: '0 0 4px #ffd700',
          }} />
          <div style={{
            position: 'absolute', left: '30%', top: '25%',
            width: 4, height: 4, background: '#4ade80', borderRadius: '50%',
          }} />
          <div style={{
            position: 'absolute', left: '70%', top: '65%',
            width: 4, height: 4, background: '#ef4444', borderRadius: '50%',
          }} />
        </div>
        <div style={{
          position: 'absolute', bottom: 2, left: 0, right: 0, textAlign: 'center',
          fontSize: 7, fontFamily: "'Press Start 2P', monospace", color: '#888',
        }}>
          MINIMAP
        </div>
      </div>

      {/* Bottom Center - Skill Slots */}
      <div style={{
        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 8,
      }}>
        {skills.map((skill) => (
          <div key={skill.name} style={{
            width: 56, height: 48, background: 'rgba(0,0,0,0.72)',
            borderRadius: 6, border: `2px solid ${skill.color}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 2, cursor: 'pointer', pointerEvents: 'auto',
            transition: 'transform 0.1s, box-shadow 0.1s',
          }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.08)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 12px ${skill.color}66`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: 18 }}>{skill.icon}</span>
            <span style={{
              fontSize: 7, fontFamily: "'Press Start 2P', monospace",
              color: skill.color, lineHeight: 1,
            }}>{skill.name}</span>
            <span style={{
              fontSize: 6, fontFamily: "'Press Start 2P', monospace",
              color: '#888', position: 'absolute', bottom: 2, right: 4,
            }}>{skill.key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
