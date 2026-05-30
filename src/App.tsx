import { useGameStore } from './store/gameStore';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import MainMenu from './components/MainMenu';
import DialogBox from './components/DialogBox';
import InventoryUI from './components/InventoryUI';
import EndingScreen from './components/EndingScreen';
import { GameState } from './game/types';

export default function App() {
  const { gameState } = useGameStore();
  return (
    <div style={{ width: 800, height: 600, margin: '0 auto', position: 'relative', overflow: 'hidden', background: '#000' }}>
      <GameCanvas />
      {gameState === GameState.Title && <MainMenu />}
      {gameState === GameState.Playing && <HUD />}
      {(gameState === GameState.Dialog || gameState === GameState.Playing) && <DialogBox />}
      {gameState === GameState.Inventory && <InventoryUI />}
      {(gameState === GameState.GameOver || gameState === GameState.Ending) && <EndingScreen />}
    </div>
  );
}
