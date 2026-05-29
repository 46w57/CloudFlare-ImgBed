import { useEffect, useState, useCallback } from 'react'
import { useGameStore } from '../store/gameStore'

export default function DialogBox() {
  const dialogue = useGameStore(s => s.dialogue)
  const advanceDialogue = useGameStore(s => s.advanceDialogue)
  const [displayedText, setDisplayedText] = useState('')
  const [charIndex, setCharIndex] = useState(0)
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    if (!dialogue) {
      setDisplayedText('')
      setCharIndex(0)
      setTyping(false)
      return
    }

    if (charIndex < dialogue.text.length) {
      setTyping(true)
      const id = setTimeout(() => {
        setDisplayedText(dialogue.text.substring(0, charIndex + 1))
        setCharIndex(prev => prev + 1)
      }, 30)
      return () => clearTimeout(id)
    } else {
      setTyping(false)
      setDisplayedText(dialogue.text)
    }
  }, [dialogue, charIndex])

  useEffect(() => {
    if (!dialogue) return
    setCharIndex(dialogue.typewriterIndex)
    setDisplayedText(dialogue.text.substring(0, dialogue.typewriterIndex))
  }, [dialogue?.typewriterIndex])

  const handleClick = useCallback(() => {
    if (!dialogue) return
    if (typing || charIndex < dialogue.text.length) {
      setCharIndex(dialogue.text.length)
      setDisplayedText(dialogue.text)
      setTyping(false)
      return
    }
    advanceDialogue()
  }, [dialogue, typing, charIndex, advanceDialogue])

  const handleChoice = useCallback((idx: number) => {
    advanceDialogue(idx)
  }, [advanceDialogue])

  if (!dialogue) return null

  const allShown = charIndex >= dialogue.text.length

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '800px',
        padding: '16px 20px',
        boxSizing: 'border-box',
        background: 'rgba(10,10,30,0.9)',
        borderTop: '3px solid #6B4C9A',
        fontFamily: "'Press Start 2P', monospace",
        cursor: 'pointer',
      }}
      onClick={handleClick}
    >
      <div style={{
        fontSize: 11,
        color: '#E0C040',
        marginBottom: 8,
        textShadow: '0 0 8px rgba(224,192,64,0.4)',
      }}>
        {dialogue.speaker}
      </div>

      <div style={{
        fontSize: 10,
        color: '#e0e0f0',
        lineHeight: 1.8,
        minHeight: 40,
        whiteSpace: 'pre-wrap',
      }}>
        {displayedText}
        {typing && <span style={{ animation: 'blink 0.6s infinite' }}>▎</span>}
      </div>

      {allShown && dialogue.choices && dialogue.choices.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {dialogue.choices.map((choice, i) => (
            <div
              key={i}
              style={{
                padding: '6px 12px',
                margin: '4px 0',
                fontSize: 9,
                color: '#aaccff',
                background: 'rgba(64,128,224,0.15)',
                border: '1px solid rgba(64,128,224,0.3)',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(64,128,224,0.3)'
                ;(e.currentTarget as HTMLDivElement).style.borderColor = '#4080E0'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(64,128,224,0.15)'
                ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(64,128,224,0.3)'
              }}
              onClick={e => {
                e.stopPropagation()
                handleChoice(i)
              }}
            >
              {i + 1}. {choice.text}
            </div>
          ))}
        </div>
      )}

      {allShown && !dialogue.choices && (
        <div style={{
          marginTop: 8,
          fontSize: 8,
          color: '#555',
          textAlign: 'right',
          animation: 'blink 1s infinite',
        }}>
          ▼ 按空格继续
        </div>
      )}
    </div>
  )
}
