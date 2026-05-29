import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'

const goodEnding = {
  title: '封印虚空',
  subtitle: '光明终将驱散黑暗',
  lines: [
    '你举起了星陨之刃，将虚空之门永远封印。',
    '裂隙缓缓闭合，黑暗的潮涌逐渐退去。',
    '暮光之境再次迎来了真正的黎明。',
    '星辰重新在天空中闪耀，大地恢复了生机。',
    '人们将你的故事传颂千年——',
    '那位封印虚空的勇者，暮光之境的守护者。',
  ],
}

const badEnding = {
  title: '虚空降临',
  subtitle: '黑暗吞噬了一切',
  lines: [
    '你释放了虚空之力，无尽的黑暗涌出。',
    '裂隙撕裂了天空，虚空吞噬了暮光之境。',
    '曾经的大地化为虚无，星辰陨落殆尽。',
    '你获得了无上的力量，却失去了一切。',
    '在永恒的虚空中，只有你一人独存。',
    '这就是...你选择的世界吗？',
  ],
}

const credits = [
  '暮光之境：陨星回响',
  '',
  '开发团队',
  '',
  '游戏设计 — 暮光工作室',
  '程序开发 — 暮光工作室',
  '像素美术 — 暮光工作室',
  '音乐音效 — 暮光工作室',
  '',
  '感谢你的游玩',
  '',
  'THE END',
]

export default function EndingScreen() {
  const endingType = useGameStore(s => s.endingType)
  const [phase, setPhase] = useState<'ending' | 'credits'>('ending')
  const [lineIdx, setLineIdx] = useState(0)
  const [fadeAlpha, setFadeAlpha] = useState(0)

  const ending = endingType === 'good' ? goodEnding : badEnding
  const isGood = endingType === 'good'

  useEffect(() => {
    setPhase('ending')
    setLineIdx(0)
    setFadeAlpha(0)
  }, [endingType])

  useEffect(() => {
    if (phase === 'ending') {
      const id = setTimeout(() => setFadeAlpha(1), 500)
      return () => clearTimeout(id)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'ending') return
    if (lineIdx < ending.lines.length) {
      const id = setTimeout(() => setLineIdx(prev => prev + 1), 2500)
      return () => clearTimeout(id)
    } else {
      const id = setTimeout(() => {
        setPhase('credits')
        setFadeAlpha(0)
      }, 3000)
      return () => clearTimeout(id)
    }
  }, [phase, lineIdx, ending.lines.length])

  useEffect(() => {
    if (phase === 'credits') {
      const id = setTimeout(() => setFadeAlpha(1), 500)
      return () => clearTimeout(id)
    }
  }, [phase])

  if (!endingType) return null

  const bgColor = isGood
    ? 'linear-gradient(180deg, #0a1a3e 0%, #1a2a5e 40%, #3a4a7e 100%)'
    : 'linear-gradient(180deg, #1a0a0a 0%, #2a0a1a 40%, #3a0a2a 100%)'

  const titleColor = isGood ? '#E0C040' : '#E04040'
  const textColor = isGood ? '#c0d0f0' : '#d0a0b0'

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '800px',
      height: '600px',
      background: bgColor,
      fontFamily: "'Press Start 2P', monospace",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: fadeAlpha,
      transition: 'opacity 1.5s',
    }}>
      {phase === 'ending' && (
        <>
          <div style={{
            fontSize: 20,
            color: titleColor,
            textShadow: `0 0 20px ${titleColor}80, 0 0 40px ${titleColor}40`,
            marginBottom: 8,
            animation: 'titleGlow 3s ease-in-out infinite',
          }}>
            {ending.title}
          </div>
          <div style={{
            fontSize: 10,
            color: textColor,
            marginBottom: 32,
            opacity: 0.7,
          }}>
            {ending.subtitle}
          </div>
          <div style={{
            maxWidth: 500,
            textAlign: 'center',
          }}>
            {ending.lines.slice(0, lineIdx).map((line, i) => (
              <div
                key={i}
                style={{
                  fontSize: 9,
                  color: textColor,
                  lineHeight: 2,
                  opacity: Math.min(1, (lineIdx - i) * 0.3 + 0.4),
                  animation: 'fadeInLine 1s ease-out',
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </>
      )}

      {phase === 'credits' && (
        <div style={{
          textAlign: 'center',
          animation: 'scrollCredits 20s linear forwards',
        }}>
          {credits.map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: line === 'THE END' ? 16 : line.includes('—') ? 8 : 10,
                color: line === 'THE END' ? '#E0C040' : line.includes('—') ? '#888' : line === '' ? 'transparent' : '#c0c0d0',
                lineHeight: 2.5,
                textShadow: line === 'THE END' ? '0 0 20px rgba(224,192,64,0.5)' : 'none',
              }}
            >
              {line || '\u00A0'}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
