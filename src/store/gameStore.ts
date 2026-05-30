import { create } from 'zustand';
import { GameState } from '../game/types';
import type { Region, QuestDef, SaveData } from '../game/types';

interface GameStore {
  gameState: GameState;
  setGameState: (state: GameState) => void;

  playerHp: number; playerMaxHp: number;
  playerMp: number; playerMaxMp: number;
  playerLevel: number; playerExp: number; playerExpToLevel: number;
  playerGold: number;
  playerName: string;
  regionName: string;
  region: Region | null;

  syncFromEngine: (engineRef: any) => void;

  dialogueLines: Array<{ speaker: string; text: string }>;
  dialogueChoices: Array<{ text: string; nextKey: string }> | null;
  currentDialogueIndex: number;
  showDialogue: (lines: Array<{ speaker: string; text: string }>, choices?: Array<{ text: string; nextKey: string }>) => void;
  hideDialogue: () => void;
  advanceDialogue: () => void;
  selectChoice: (index: number) => void;

  currentQuest: QuestDef | null;
  showQuestComplete: boolean;
  setCurrentQuest: (quest: QuestDef | null) => void;

  inventoryOpen: boolean;
  inventoryItems: Array<{ id: string; name: string; icon: string; count: number; description: string; type: string }>;
  equipment: { weapon: string; armor: string; accessory: string | null };
  toggleInventory: () => void;

  endingType: 'good' | 'bad' | null;
  showEnding: (type: 'good' | 'bad') => void;

  saveSlots: (SaveData | null)[];
  selectedSlot: number;
  setSelectedSlot: (slot: number) => void;
  loadGame: (slot: number) => void;
  startGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: GameState.Title,
  setGameState: (s) => set({ gameState: s }),

  playerHp: 100, playerMaxHp: 100,
  playerMp: 50, playerMaxMp: 50,
  playerLevel: 1, playerExp: 0, playerExpToLevel: 100,
  playerGold: 0,
  playerName: '星渊',
  regionName: '',
  region: null,

  syncFromEngine: (engine) => {
    if (!engine) return;
    const p = engine.player;
    const rm = engine.regionManager?.getCurrentRegion();
    const rn = engine.regionManager?.getCurrentMap()?.data?.name || '';
    set({
      playerHp: p.hp, playerMaxHp: p.maxHp,
      playerMp: p.mp, playerMaxMp: p.maxMp,
      playerLevel: p.level, playerExp: p.exp, playerExpToLevel: p.expToLevel,
      playerGold: p.gold,
      regionName: rn,
      region: rm ?? null,
      gameState: engine.state,
    });
  },

  dialogueLines: [],
  dialogueChoices: null,
  currentDialogueIndex: 0,

  showDialogue: (lines, choices) => set({
    dialogueLines: lines,
    dialogueChoices: choices || null,
    currentDialogueIndex: 0,
  }),

  hideDialogue: () => set({
    dialogueLines: [],
    dialogueChoices: null,
    currentDialogueIndex: 0,
  }),

  advanceDialogue: () => {
    const { dialogueLines, currentDialogueIndex, dialogueChoices } = get();
    if (dialogueChoices && dialogueChoices.length > 0) return;
    if (currentDialogueIndex < dialogueLines.length - 1) {
      set({ currentDialogueIndex: currentDialogueIndex + 1 });
    } else {
      get().hideDialogue();
    }
  },

  selectChoice: (idx) => {
    const choices = get().dialogueChoices;
    if (choices && idx >= 0 && idx < choices.length) {
      console.log('Selected choice:', choices[idx].text, '→', choices[idx].nextKey);
      get().hideDialogue();
    }
  },

  currentQuest: null,
  showQuestComplete: false,
  setCurrentQuest: (q) => set({ currentQuest: q }),

  inventoryOpen: false,
  inventoryItems: [
    { id: 'health_potion', name: '生命药水', icon: '🧪', count: 5, description: '恢复50点生命值', type: 'consumable' },
    { id: 'mana_potion', name: '魔力药水', icon: '💎', count: 3, description: '恢复30点魔力值', type: 'consumable' },
    { id: 'iron_sword', name: '铁剑', icon: '🗡️', count: 1, description: '基础武器，攻击+10', type: 'equipment' },
    { id: 'gold_coins', name: '金币袋', icon: '💰', count: 128, description: '通用的货币', type: 'quest' },
    { id: 'old_key', name: '锈蚀钥匙', icon: '🔑', count: 1, description: '古老的钥匙，似乎能打开某扇门', type: 'key' },
    { id: 'stardust', name: '星尘', icon: '✨', count: 7, description: '从陨落星辰上收集的粉末', type: 'quest' },
    { id: 'relic_fragment', name: '遗物碎片', icon: '🔮', count: 2, description: '上古文明的残片', type: 'quest' },
  ],
  equipment: { weapon: 'iron_sword', armor: 'cloth_armor', accessory: null },
  toggleInventory: () => set((s) => ({ inventoryOpen: !s.inventoryOpen })),

  endingType: null,
  showEnding: (type) => set({ endingType: type, gameState: GameState.Ending }),

  saveSlots: [null, null, null],
  selectedSlot: 0,
  setSelectedSlot: (slot) => set({ selectedSlot: slot }),

  loadGame: (slot) => {
    const { saveSlots } = get();
    const data = saveSlots[slot];
    if (data) {
      set({
        playerName: data.playerName,
        playerLevel: data.level,
        playerHp: data.hp,
        playerMp: data.mp,
        playerGold: data.gold,
        regionName: String(data.region),
        equipment: data.equipment,
        gameState: GameState.Playing,
      });
    }
  },

  startGame: () => {
    set({
      gameState: GameState.Playing,
      playerHp: 100, playerMaxHp: 100,
      playerMp: 50, playerMaxMp: 50,
      playerLevel: 1, playerExp: 0, playerExpToLevel: 100,
      playerGold: 50,
      playerName: '星渊',
      regionName: '星落村',
    });
  },
}));
