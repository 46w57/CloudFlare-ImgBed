import { useEffect, useRef } from 'react'
import { Game } from '../game/game'
import { useGameStore } from '../store/gameStore'

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<Game | null>(null)
  const syncIntervalRef = useRef<number | null>(null)
  const setGameInstance = useGameStore(s => s.setGameInstance)
  const syncFromGame = useGameStore(s => s.syncFromGame)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (gameRef.current) return

    canvas.width = 800
    canvas.height = 600

    const game = new Game(canvas)
    gameRef.current = game
    setGameInstance(game)

    game.init()
    syncFromGame()

    syncIntervalRef.current = window.setInterval(() => {
      syncFromGame()
    }, 100)

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
      game.destroy()
      gameRef.current = null
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        imageRendering: 'pixelated',
        width: '800px',
        height: '600px',
      }}
    />
  )
}
