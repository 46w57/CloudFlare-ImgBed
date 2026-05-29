import { useGameStore } from '../store/gameStore'

const rarityColor: Record<string, string> = {
  common: '#c0c0c0',
  uncommon: '#40c040',
  rare: '#4080e0',
  epic: '#a040e0',
  legendary: '#e0a020',
}

export default function HUD() {
  const stats = useGameStore(s => s.playerStats)
  const skills = useGameStore(s => s.skills)
  const region = useGameStore(s => s.region)

  const hpPct = stats.maxHp > 0 ? (stats.hp / stats.maxHp) * 100 : 0
  const mpPct = stats.maxMp > 0 ? (stats.mp / stats.maxMp) * 100 : 0
  const expPct = stats.expToNext > 0 ? (stats.exp / stats.expToNext) * 100 : 0

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '800px', height: '600px', pointerEvents: 'none', fontFamily: "'Press Start 2P', monospace" }}>
      <div style={{ position: 'absolute', top: 8, left: 8, width: 210, padding: 8, background: 'rgba(10,10,30,0.75)', border: '2px solid #6B4C9A', borderRadius: 4 }}>
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#fff', marginBottom: 2 }}>
            <span>HP</span>
            <span>{stats.hp}/{stats.maxHp}</span>
          </div>
          <div style={{ width: '100%', height: 10, background: '#1a1a2e', border: '1px solid #333' }}>
            <div style={{ width: `${hpPct}%`, height: '100%', background: '#E04040', transition: 'width 0.3s' }} />
          </div>
        </div>

        <div style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#fff', marginBottom: 2 }}>
            <span>MP</span>
            <span>{stats.mp}/{stats.maxMp}</span>
          </div>
          <div style={{ width: '100%', height: 10, background: '#1a1a2e', border: '1px solid #333' }}>
            <div style={{ width: `${mpPct}%`, height: '100%', background: '#4080E0', transition: 'width 0.3s' }} />
          </div>
        </div>

        <div style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#E0C040', marginBottom: 2 }}>
            <span>Lv.{stats.level}</span>
            <span>{stats.exp}/{stats.expToNext}</span>
          </div>
          <div style={{ width: '100%', height: 6, background: '#1a1a2e', border: '1px solid #333' }}>
            <div style={{ width: `${expPct}%`, height: '100%', background: '#E0C040', transition: 'width 0.3s' }} />
          </div>
        </div>

        <div style={{ fontSize: 8, color: '#E0C040', marginTop: 4 }}>
          金币: {stats.gold}
        </div>
      </div>

      <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: '#fff', textShadow: '1px 1px 2px #000' }}>{region.name}</div>
        <div style={{ fontSize: 8, color: '#aaa', textShadow: '1px 1px 2px #000' }}>{region.timeName}</div>
      </div>

      <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: 4 }}>
        {skills.map((skill, i) => {
          const unlocked = stats.level >= skill.unlockLevel
          const onCooldown = skill.currentCooldown > 0
          const cdPct = skill.cooldown > 0 ? (skill.currentCooldown / skill.cooldown) * 100 : 0

          return (
            <div
              key={skill.skillId}
              style={{
                width: 48,
                height: 48,
                background: !unlocked ? '#1a1a2e' : onCooldown ? '#2a2a3e' : '#2a4a6e',
                border: `2px solid ${!unlocked ? '#333' : onCooldown ? '#555' : '#6B4C9A'}`,
                borderRadius: 4,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {onCooldown && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: `${cdPct}%`,
                  background: 'rgba(0,0,0,0.6)',
                  transition: 'height 0.1s',
                }} />
              )}
              <div style={{ position: 'absolute', top: 2, left: 3, fontSize: 7, color: '#fff', zIndex: 1 }}>{i + 1}</div>
              <div style={{ fontSize: 7, color: !unlocked ? '#555' : '#fff', zIndex: 1, textAlign: 'center', lineHeight: 1.2 }}>
                {skill.name.substring(0, 2)}
              </div>
              {skill.mpCost > 0 && unlocked && (
                <div style={{ fontSize: 6, color: '#4080E0', zIndex: 1, marginTop: 1 }}>{skill.mpCost}</div>
              )}
              {!unlocked && (
                <div style={{ fontSize: 6, color: '#666', zIndex: 1 }}>Lv.{skill.unlockLevel}</div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 7, color: '#888', textAlign: 'right', lineHeight: 1.6 }}>
        <div>WASD 移动</div>
        <div>空格 攻击</div>
        <div>Shift 闪避</div>
        <div>E 互动</div>
        <div>I 背包</div>
        <div>P 暂停</div>
      </div>
    </div>
  )
}
