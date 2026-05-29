import { useEffect, useState, useCallback } from 'react'
import { useGameStore } from '../store/gameStore'

interface Star {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
}

export default function MainMenu() {
  const newGame = useGameStore(s => s.newGame)
  const loadGame = useGameStore(s => s.loadGame)
  const [stars, setStars] = useState<Star[]>([])
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)
  const [loadMsg, setLoadMsg] = useState('')

  useEffect(() => {
    const arr: Star[] = []
    for (let i = 0; i < 60; i++) {
      arr.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.5 + 0.1,
        opacity: Math.random() * 0.8 + 0.2,
      })
    }
    setStars(arr)

    const id = setInterval(() => {
      setStars(prev => prev.map(s => {
        const newY = s.y + s.speed
        const reset = newY > 600
        return {
          ...s,
          y: reset ? 0 : newY,
          x: reset ? Math.random() * 800 : s.x,
          opacity: reset ? Math.random() * 0.8 + 0.2 : s.opacity,
        }
      }))
    }, 50)

    return () => clearInterval(id)
  }, [])

  const handleNewGame = useCallback(() => {
    newGame()
  }, [newGame])

  const handleLoadGame = useCallback((slot: number) => {
    const ok = loadGame(slot)
    setLoadMsg(ok ? `存档 ${slot} 加载成功！` : `存档 ${slot} 不存在`)
    setTimeout(() => setLoadMsg(''), 2000)
  }, [loadGame])

  const btnStyle = (id: string): React.CSSProperties => ({
    display: 'block',
    width: 220,
    padding: '10px 0',
    margin: '8px auto',
    background: hoveredBtn === id ? '#3a2a5e' : '#1a1a2e',
    border: '2px solid #6B4C9A',
    color: hoveredBtn === id ? '#E0C040' : '#c0c0d0',
    fontSize: 12,
    fontFamily: "'Press Start 2P', monospace",
    cursor: 'pointer',
    textAlign: 'center' as const,
    transition: 'all 0.15s',
    imageRendering: 'pixelated' as const,
  })

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '800px',
      height: '600px',
      background: 'linear-gradient(180deg, #0a0a1e 0%, #1a0a2e 50%, #0a0a1e 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Press Start 2P', monospace",
      overflow: 'hidden',
    }}>
      {stars.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            background: '#fff',
            opacity: s.opacity,
            borderRadius: '50%',
          }}
        />
      ))}

      <div style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        marginBottom: 40,
      }}>
        <div style={{
          fontSize: 24,
          color: '#E0C040',
          textShadow: '0 0 20px rgba(224,192,64,0.5), 0 0 40px rgba(224,192,64,0.3)',
          animation: 'titleGlow 3s ease-in-out infinite',
          letterSpacing: 4,
        }}>
          暮光之境
        </div>
        <div style={{
          fontSize: 14,
          color: '#8B6CB0',
          marginTop: 8,
          textShadow: '0 0 10px rgba(139,108,176,0.5)',
          letterSpacing: 2,
        }}>
          陨星回响
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <button
          style={btnStyle('new')}
          onMouseEnter={() => setHoveredBtn('new')}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={handleNewGame}
        >
          开始游戏
        </button>
        <button
          style={btnStyle('load1')}
          onMouseEnter={() => setHoveredBtn('load1')}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={() => handleLoadGame(1)}
        >
          读取存档 1
        </button>
        <button
          style={btnStyle('load2')}
          onMouseEnter={() => setHoveredBtn('load2')}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={() => handleLoadGame(2)}
        >
          读取存档 2
        </button>
        <button
          style={btnStyle('load3')}
          onMouseEnter={() => setHoveredBtn('load3')}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={() => handleLoadGame(3)}
        >
          读取存档 3
        </button>
      </div>

      {loadMsg && (
        <div style={{
          position: 'relative',
          zIndex: 1,
          marginTop: 16,
          fontSize: 10,
          color: '#E0C040',
          textAlign: 'center',
        }}>
          {loadMsg}
        </div>
      )}

      <div style={{
        position: 'absolute',
        bottom: 20,
        fontSize: 8,
        color: '#555',
        textAlign: 'center',
        zIndex: 1,
      }}>
        WASD移动 / 空格攻击 / E互动 / I背包
      </div>
    </div>
  )
}
