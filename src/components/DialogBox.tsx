import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

const TYPE_SPEED = 30;

export default function DialogBox() {
  const {
    dialogueLines, dialogueChoices, currentDialogueIndex,
    advanceDialogue, selectChoice,
  } = useGameStore();

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showContinueIndicator, setShowContinueIndicator] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fullTextRef = useRef('');

  const currentLine = dialogueLines[currentDialogueIndex] || null;
  const speakerName = currentLine?.speaker || '';
  const fullText = currentLine?.text || '';

  const startTyping = useCallback((text: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayedText('');
    setIsTyping(true);
    setShowContinueIndicator(false);
    fullTextRef.current = text;
    let charIdx = 0;

    intervalRef.current = setInterval(() => {
      charIdx++;
      setDisplayedText(text.slice(0, charIdx));
      if (charIdx >= text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsTyping(false);
        setShowContinueIndicator(true);
      }
    }, TYPE_SPEED);
  }, []);

  useEffect(() => {
    if (currentLine) {
      startTyping(fullText);
    } else {
      setDisplayedText('');
      setShowContinueIndicator(false);
      setIsTyping(false);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentLine, fullText, startTyping]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!dialogueLines.length) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (isTyping) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setDisplayedText(fullTextRef.current);
          setIsTyping(false);
          setShowContinueIndicator(true);
        } else {
          advanceDialogue();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogueLines.length, isTyping, advanceDialogue]);

  if (!dialogueLines.length && !dialogueChoices) return null;

  return (
    <div
      onClick={() => { if (!isTyping) advanceDialogue(); }}
      style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        background: 'rgba(26, 26, 46, 0.92)',
        border: '2px solid #4a4a6a',
        borderRadius: 8,
        padding: '16px 20px',
        zIndex: 100,
        cursor: 'pointer',
        pointerEvents: 'auto',
        backdropFilter: 'blur(4px)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Speaker Name */}
      {speakerName && (
        <div style={{
          color: '#ffd700',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 11,
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingBottom: 8,
          borderBottom: '1px solid rgba(74,74,106,0.5)',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#ffd700', boxShadow: '0 0 6px #ffd700',
            display: 'inline-block',
          }} />
          {speakerName}
        </div>
      )}

      {/* Text Content */}
      <div style={{
        color: '#e8e8f0',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 12,
        lineHeight: 1.9,
        minHeight: 48,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {displayedText}
        {isTyping && (
          <span style={{
            animation: 'blink 0.6s step-end infinite',
            color: '#ffd700',
          }}>▌</span>
        )}
      </div>

      {/* Choices */}
      {dialogueChoices && dialogueChoices.length > 0 && currentDialogueIndex >= dialogueLines.length - 1 && (
        <div style={{
          marginTop: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {dialogueChoices.map((choice, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); selectChoice(idx); }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(138,43,226,0.3)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#a855f7';
                (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(40,30,60,0.6)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#5a4a7a';
                (e.currentTarget as HTMLButtonElement).style.color = '#c8c0d8';
              }}
              style={{
                padding: '8px 16px',
                background: 'rgba(40,30,60,0.6)',
                border: '1px solid #5a4a7a',
                borderRadius: 4,
                color: '#c8c0d8',
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 10,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                pointerEvents: 'auto',
              }}
            >
              {idx + 1}. {choice.text}
            </button>
          ))}
        </div>
      )}

      {/* Continue Indicator */}
      {!isTyping && !dialogueChoices && showContinueIndicator && (
        <div style={{
          position: 'absolute',
          bottom: 12,
          right: 20,
          fontSize: 14,
          color: '#ffd700',
          animation: 'blink 0.8s step-end infinite',
          fontFamily: "'Press Start 2P', monospace",
        }}>
          ▼
        </div>
      )}

      {/* Dialogue Progress Indicator */}
      {dialogueLines.length > 1 && (
        <div style={{
          position: 'absolute',
          top: 12,
          right: 16,
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 8,
          color: 'rgba(200,190,220,0.45)',
        }}>
          {currentDialogueIndex + 1} / {dialogueLines.length}
        </div>
      )}
    </div>
  );
}
