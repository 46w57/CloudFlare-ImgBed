import { create } from 'zustand'
import { Game, GameData } from '../game/game'
import { GameState } from '../game/types'

type GameScreen = 'title' | 'playing' | 'paused' | 'dialog' | 'inventory' | 'gameover' | 'cutscene' | 'ending'

interface SkillInfo {
  skillId: string
  name: string
  mpCost: number
  cooldown: number
  currentCooldown: number
  unlockLevel: number
  type: string
}

interface InventoryItemInfo {
  itemId: string
  name: string
  quantity: number
  type: string
  rarity: string
  description: string
  stats?: Record<string, number>
  value: number
}

interface EquipmentInfo {
  weapon: InventoryItemInfo | null
  armor: InventoryItemInfo | null
  accessory: InventoryItemInfo | null
}

interface DialogueInfo {
  speaker: string
  text: string
  typewriterIndex: number
  choices?: { text: string; next: string }[]
}

interface RegionInfo {
  name: string
  timeName: string
}

interface PlayerStats {
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  attack: number
  defense: number
  speed: number
  level: number
  exp: number
  expToNext: number
  gold: number
}

interface GameStore {
  gameInstance: Game | null
  screen: GameScreen
  playerStats: PlayerStats
  skills: SkillInfo[]
  equipment: EquipmentInfo
  inventory: InventoryItemInfo[]
  dialogue: DialogueInfo | null
  region: RegionInfo
  endingType: 'good' | 'bad' | null

  setGameInstance: (game: Game) => void
  syncFromGame: () => void
  newGame: () => void
  loadGame: (slot: number) => boolean
  saveGame: (slot: number) => void
  advanceDialogue: (choice?: number) => void
  setScreen: (screen: GameScreen) => void
  setEndingType: (type: 'good' | 'bad') => void
  respawnPlayer: () => void
}

const mapGameState = (gs: GameState): GameScreen => {
  switch (gs) {
    case GameState.Title: return 'title'
    case GameState.Playing: return 'playing'
    case GameState.Paused: return 'paused'
    case GameState.Dialog: return 'dialog'
    case GameState.Inventory: return 'inventory'
    case GameState.GameOver: return 'gameover'
    case GameState.Cutscene: return 'cutscene'
    default: return 'title'
  }
}

const buildSkillInfo = (game: Game): SkillInfo[] => {
  const skillKeys = ['slash', 'power_strike', 'fireball', 'ice_shard']
  return skillKeys.map((skillId, i) => {
    const def = GameData.skills[skillId]
    return {
      skillId,
      name: def?.name ?? '',
      mpCost: def?.mpCost ?? 0,
      cooldown: def?.cooldown ?? 0,
      currentCooldown: game.player.skillCooldowns[i] ?? 0,
      unlockLevel: def?.unlockLevel ?? 1,
      type: def?.type ?? 'melee',
    }
  })
}

const buildEquipmentInfo = (game: Game): EquipmentInfo => {
  const eq = game.player.equipment
  const toItemInfo = (itemId: string | null): InventoryItemInfo | null => {
    if (!itemId) return null
    const def = GameData.items[itemId]
    if (!def) return null
    return {
      itemId: def.id,
      name: def.name,
      quantity: 1,
      type: def.type,
      rarity: def.rarity,
      description: def.description,
      stats: def.stats as Record<string, number> | undefined,
      value: def.value,
    }
  }
  return {
    weapon: toItemInfo(eq.weapon),
    armor: toItemInfo(eq.armor),
    accessory: toItemInfo(eq.accessory),
  }
}

const buildInventoryInfo = (game: Game): InventoryItemInfo[] => {
  return game.player.inventory.map(item => {
    const def = GameData.items[item.itemId]
    return {
      itemId: item.itemId,
      name: def?.name ?? item.itemId,
      quantity: item.quantity,
      type: def?.type ?? 'material',
      rarity: def?.rarity ?? 'common',
      description: def?.description ?? '',
      stats: def?.stats as Record<string, number> | undefined,
      value: def?.value ?? 0,
    }
  })
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameInstance: null,
  screen: 'title' as GameScreen,
  playerStats: {
    hp: 100, maxHp: 100, mp: 50, maxMp: 50,
    attack: 10, defense: 5, speed: 120,
    level: 1, exp: 0, expToNext: 100, gold: 0,
  },
  skills: [],
  equipment: { weapon: null, armor: null, accessory: null },
  inventory: [],
  dialogue: null,
  region: { name: '', timeName: '' },
  endingType: null,

  setGameInstance: (game: Game) => {
    set({ gameInstance: game })
  },

  syncFromGame: () => {
    const game = get().gameInstance
    if (!game) return

    const stats = game.getPlayerStats()
    const playerStats: PlayerStats = {
      hp: Math.ceil(game.player.hp),
      maxHp: stats.hp,
      mp: Math.ceil(game.player.mp),
      maxMp: stats.mp,
      attack: stats.attack,
      defense: stats.defense,
      speed: stats.speed,
      level: game.player.level,
      exp: game.player.exp,
      expToNext: game.player.expToNext,
      gold: game.player.gold,
    }

    const dialogue: DialogueInfo | null = game.currentDialogue
      ? {
          speaker: game.currentDialogue.speaker,
          text: game.currentDialogue.text,
          typewriterIndex: game.dialogueTypewriterIndex,
          choices: game.currentDialogue.choices ?? undefined,
        }
      : null

    const region: RegionInfo = {
      name: game.regionManager.getRegionName(),
      timeName: game.dayNight.getTimeName(),
    }

    const screen = mapGameState(game.gameState)

    const endingType = game.player.storyFlags['ending_seal'] ? 'good' as const
      : game.player.storyFlags['ending_release'] ? 'bad' as const
      : null

    set({
      screen,
      playerStats,
      skills: buildSkillInfo(game),
      equipment: buildEquipmentInfo(game),
      inventory: buildInventoryInfo(game),
      dialogue,
      region,
      endingType,
    })
  },

  newGame: () => {
    const game = get().gameInstance
    if (!game) return
    game.newGame()
    get().syncFromGame()
  },

  loadGame: (slot: number): boolean => {
    const game = get().gameInstance
    if (!game) return false
    const result = game.loadGame(slot)
    if (result) {
      get().syncFromGame()
    }
    return result
  },

  saveGame: (slot: number) => {
    const game = get().gameInstance
    if (!game) return
    game.saveGame(slot)
  },

  advanceDialogue: (choice?: number) => {
    const game = get().gameInstance
    if (!game) return
    game.advanceDialogue(choice)
    get().syncFromGame()
  },

  setScreen: (screen: GameScreen) => {
    set({ screen })
  },

  setEndingType: (type: 'good' | 'bad') => {
    set({ endingType: type })
  },

  respawnPlayer: () => {
    const game = get().gameInstance
    if (!game) return
    game.respawnPlayer()
    get().syncFromGame()
  },
}))
