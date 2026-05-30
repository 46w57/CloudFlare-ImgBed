export enum Direction { Up, Down, Left, Right }

export enum GameState {
  Title = 'title',
  Playing = 'playing',
  Paused = 'paused',
  Dialog = 'dialog',
  Inventory = 'inventory',
  GameOver = 'gameover',
  Ending = 'ending',
}

export enum Region { Forest, Desert, Snow, Ruins, HolyCity }

export interface Entity {
  id: string;
  x: number; y: number;
  width: number; height: number;
  vx: number; vy: number;
  speed: number;
  direction: Direction;
  spriteId: string;
  currentAnim: string;
  frameIndex: number;
  animTimer: number;
  flipX: boolean;
  active: boolean;
  hp: number;
  maxHp: number;
}

export interface Player extends Entity {
  mp: number; maxMp: number;
  exp: number; expToLevel: number;
  level: number;
  gold: number;
  attack: number; defense: number;
  invincible: boolean;
  invincibleTimer: number;
  state: 'idle' | 'walk' | 'attack' | 'hurt' | 'dash' | 'skill';
  stateTimer: number;
  comboCount: number;
  facing: Direction;
}

export interface Enemy extends Entity {
  enemyType: string;
  aiState: 'idle' | 'chase' | 'attack' | 'hurt' | 'dead' | 'windup';
  aiTimer: number;
  aggroRange: number;
  attackRange: number;
  damage: number;
  expReward: number;
  goldReward: number;
  dropTable: string[];
  isBoss?: boolean;
}

export interface NPC extends Entity {
  npcId: string;
  name: string;
  dialogKey: string;
  questKey: string | null;
  hasQuest: boolean;
  questCompleted: boolean;
  walking: boolean;
  walkTimer: number;
  walkDir: Direction;
}

export interface Projectile {
  id: string;
  x: number; y: number;
  vx: number; vy: number;
  width: number; height: number;
  damage: number;
  ownerId: string;
  lifetime: number;
  spriteId: string;
  active: boolean;
  hitEntities: Set<string>;
}

export interface SpriteFrame { data: number[][]; width: number; height: number; }

export interface SpriteData {
  id: string;
  palette: string[];
  width: number;
  height: number;
  animations: Record<string, { frames: SpriteFrame[]; speed: number }>;
}

export interface MapData {
  id: string;
  name: string;
  region: Region;
  width: number;
  height: number;
  tileSize: number;
  layers: Array<{ name: string; data: number[][]; visible: boolean }>;
  collisions: boolean[][];
  spawns: Array<{ x: number; y: number; type: string }>;
  transitions: Array<{
    x: number; y: number; width: number; height: number;
    targetRegion: Region; targetX: number; targetY: number;
  }>;
  ambientColor: string;
  musicTrack: string;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  choices?: Array<{ text: string; nextKey: string | null; action?: string; questKey?: string; item?: string }>;
  nextKey?: string | null;
  action?: string;
  questKey?: string;
  item?: string;
  count?: number;
  targetRegion?: Region | null;
  targetX?: number;
  targetY?: number;
}

export interface QuestDef {
  key: string;
  name: string;
  description: string;
  giverNpc: string;
  target?: string;
  requiredCount?: number;
  rewardGold?: number;
  rewardExp?: number;
  completed: boolean;
  currentCount: number;
  accepted: boolean;
}

export interface SaveData {
  playerName: string;
  playerX: number;
  playerY: number;
  region: Region;
  hp: number;
  mp: number;
  maxHp: number;
  maxMp: number;
  level: number;
  exp: number;
  expToLevel: number;
  gold: number;
  quests: Record<string, boolean>;
  inventory: Array<{ id: string; count: number }>;
  equipment: { weapon: string; armor: string; accessory: string };
  playTime: number;
  bossDefeated: string[];
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: string;
  type: 'rain' | 'snow' | 'sand' | 'damage' | 'heal' | 'sparkle' | 'leaf';
}
