import { useGameStore } from './store/gameStore'
import { GameState } from './game/types'
import GameCanvas from './components/GameCanvas'
import HUD from './components/HUD'
import MainMenu from './components/MainMenu'
import DialogBox from './components/DialogBox'
import InventoryUI from './components/InventoryUI'
import EndingScreen from './components/EndingScreen'

export default function App() {
  const screen = useGameStore(s => s.screen)

  return (
    <div style={{
      width: 800,
      height: 600,
      margin: '0 auto',
      position: 'relative',
      overflow: 'hidden',
      background: '#000',
      imageRendering: 'pixelated',
    }}>
      <GameCanvas />

      {(screen === 'playing' || screen === 'paused' || screen === 'dialog') && <HUD />}
      {screen === 'title' && <MainMenu />}
      {screen === 'dialog' && <DialogBox />}
      {screen === 'inventory' && <InventoryUI />}
      {screen === 'paused' && <PauseOverlay />}
      {screen === 'gameover' && <GameOverOverlay />}
      {screen === 'ending' && <EndingScreen />}
    </div>
  )
}

function PauseOverlay() {
  const gameInstance = useGameStore(s => s.gameInstance)

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '800px',
      height: '600px',
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Press Start 2P', monospace",
    }}>
      <div style={{
        fontSize: 20,
        color: '#E0C040',
        textShadow: '0 0 20px rgba(224,192,64,0.5)',
        marginBottom: 24,
      }}>
        暂停
      </div>
      <button
        style={{
          padding: '10px 24px',
          fontSize: 10,
          background: '#1a1a2e',
          border: '2px solid #6B4C9A',
          color: '#c0c0d0',
          cursor: 'pointer',
          fontFamily: "'Press Start 2P', monospace",
          marginBottom: 12,
        }}
        onClick={() => {
          if (gameInstance) gameInstance.gameState = GameState.Playing
        }}
      >
        继续游戏
      </button>
      <div style={{ fontSize: 8, color: '#666', marginTop: 8 }}>
        按 P 或 ESC 继续
      </div>
    </div>
  )
}

function GameOverOverlay() {
  const respawnPlayer = useGameStore(s => s.respawnPlayer)
  const newGame = useGameStore(s => s.newGame)

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '800px',
      height: '600px',
      background: 'rgba(80,0,0,0.75)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Press Start 2P', monospace",
    }}>
      <div style={{
        fontSize: 20,
        color: '#E04040',
        textShadow: '0 0 20px rgba(224,64,64,0.5)',
        marginBottom: 24,
      }}>
        你倒下了...
      </div>
      <button
        style={{
          padding: '10px 24px',
          fontSize: 10,
          background: '#2a1a1e',
          border: '2px solid #E04040',
          color: '#E04040',
          cursor: 'pointer',
          fontFamily: "'Press Start 2P', monospace",
          marginBottom: 12,
        }}
        onClick={respawnPlayer}
      >
        原地复活
      </button>
      <button
        style={{
          padding: '10px 24px',
          fontSize: 10,
          background: '#1a1a2e',
          border: '2px solid #6B4C9A',
          color: '#c0c0d0',
          cursor: 'pointer',
          fontFamily: "'Press Start 2P', monospace",
        }}
        onClick={newGame}
      >
        重新开始
      </button>
    </div>
  )
}
