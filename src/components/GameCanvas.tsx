import { useEffect, useRef } from 'react';
import { Game } from '../game/game';
import { useGameStore } from '../store/gameStore';
import { GameState } from '../game/types';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const syncFromEngine = useGameStore((s) => s.syncFromEngine);
  const setGameState = useGameStore((s) => s.setGameState);
  const gameState = useGameStore((s) => s.gameState);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new Game();
    game.init(canvas);
    gameRef.current = game;

    const pollInterval = setInterval(() => {
      if (gameRef.current) {
        syncFromEngine(gameRef.current);
        setGameState(gameRef.current.state);
      }
    }, 100);

    return () => {
      clearInterval(pollInterval);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (gameRef.current && gameState === GameState.Playing) {
      const g = gameRef.current;
      if (g.state === GameState.Title || g.state === GameState.GameOver) {
        g.newGame();
      }
    }
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const store = useGameStore.getState();
      if (store.gameState === GameState.Playing) {
        if (e.key === 'i' || e.key === 'I') {
          store.toggleInventory();
        }
        if (e.key === 'Escape') {
          const s = useGameStore.getState();
          if (s.gameState === GameState.Playing) {
            s.setGameState(GameState.Paused);
          } else if (s.gameState === GameState.Paused) {
            s.setGameState(GameState.Playing);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{
        display: 'block',
        margin: 0,
        width: 800,
        height: 600,
        imageRendering: 'pixelated',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    />
  );
}
