export enum Direction { Up, Down, Left, Right }

export enum GameState { Title, Playing, Paused, Dialog, Inventory, GameOver, Cutscene }

export enum Region { Forest, Desert, Snow, Ruins, HolyCity }

export interface Vector2 { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

export interface SpriteFrame {
  data: number[][];
  width: number;
  height: number;
}

export interface SpriteAnimation {
  name: string;
  frames: SpriteFrame[];
  frameDuration: number;
  loop: boolean;
}

export interface SpriteData {
  id: string;
  palette: string[];
  animations: Record<string, SpriteAnimation>;
}

export interface Entity {
  id: string;
  type: 'player' | 'enemy' | 'npc' | 'boss' | 'projectile' | 'particle';
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  direction: Direction;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  spriteId: string;
  currentAnimation: string;
  animationFrame: number;
  animationTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  active: boolean;
}

export interface Player extends Entity {
  type: 'player';
  level: number;
  exp: number;
  expToNext: number;
  gold: number;
  skills: SkillSlot[];
  equipment: EquipmentSlots;
  inventory: InventoryItem[];
  storyFlags: Record<string, boolean>;
  questProgress: QuestProgress[];
  dashCooldown: number;
  attackCooldown: number;
  skillCooldowns: number[];
}

export interface Enemy extends Entity {
  type: 'enemy' | 'boss';
  enemyId: string;
  name: string;
  exp: number;
  goldDrop: number;
  drops: DropItem[];
  ai: AIType;
  aggroRange: number;
  attackRange: number;
  attackCooldown: number;
  attackTimer: number;
  skills: EnemySkill[];
  phase?: number;
}

export interface NPC extends Entity {
  type: 'npc';
  npcId: string;
  name: string;
  dialogueId: string;
  shopItems?: string[];
}

export interface Projectile extends Entity {
  type: 'projectile';
  damage: number;
  lifetime: number;
  owner: string;
  spriteOverride?: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  gravity: boolean;
}

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  mpCost: number;
  damage: number;
  cooldown: number;
  range: number;
  type: 'melee' | 'ranged' | 'aoe' | 'buff' | 'heal';
  spriteEffect: string;
  unlockLevel: number;
}

export interface SkillSlot {
  skillId: string;
  currentCooldown: number;
}

export interface EnemySkill {
  id: string;
  name: string;
  damage: number;
  cooldown: number;
  range: number;
  type: 'melee' | 'ranged' | 'aoe';
  projectileSpeed?: number;
  projectileSprite?: string;
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material' | 'key';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  stats?: Partial<Stats>;
  effect?: string;
  value: number;
  spriteId: string;
}

export interface Stats {
  attack: number;
  defense: number;
  hp: number;
  mp: number;
  speed: number;
}

export interface EquipmentSlots {
  weapon: string | null;
  armor: string | null;
  accessory: string | null;
}

export interface InventoryItem {
  itemId: string;
  quantity: number;
}

export interface DropItem {
  itemId: string;
  chance: number;
  quantityMin: number;
  quantityMax: number;
}

export interface MapTile {
  tileId: number;
  collision: boolean;
}

export interface MapLayer {
  name: string;
  data: number[][];
  visible: boolean;
}

export interface SpawnPoint {
  entityId: string;
  x: number;
  y: number;
  type: 'enemy' | 'npc' | 'boss' | 'chest';
  respawn: boolean;
  condition?: string;
}

export interface MapTransition {
  x: number;
  y: number;
  width: number;
  height: number;
  targetRegion: Region;
  targetX: number;
  targetY: number;
}

export interface MapData {
  id: string;
  name: string;
  region: Region;
  width: number;
  height: number;
  tileSize: number;
  layers: MapLayer[];
  collisions: boolean[][];
  spawns: SpawnPoint[];
  transitions: MapTransition[];
  ambientColor: string;
  musicTrack?: string;
}

export interface DialogueLine {
  id: string;
  speaker: string;
  text: string;
  choices?: DialogueChoice[];
  next?: string;
  action?: string;
  portrait?: string;
}

export interface DialogueChoice {
  text: string;
  next: string;
  condition?: string;
}

export interface QuestDef {
  id: string;
  name: string;
  description: string;
  type: 'kill' | 'collect' | 'talk' | 'explore' | 'boss';
  target: string;
  required: number;
  reward: QuestReward;
  prerequisite?: string;
}

export interface QuestProgress {
  questId: string;
  current: number;
  completed: boolean;
  turnedIn: boolean;
}

export interface QuestReward {
  exp: number;
  gold: number;
  items?: string[];
}

export interface SaveData {
  slot: number;
  timestamp: number;
  playerName: string;
  playerData: Partial<Player>;
  worldState: WorldState;
  playTime: number;
}

export interface WorldState {
  currentRegion: Region;
  playerX: number;
  playerY: number;
  defeatedBosses: string[];
  openedChests: string[];
  npcStates: Record<string, string>;
  storyFlags: Record<string, boolean>;
  questProgress: QuestProgress[];
  regionUnlocked: Record<string, boolean>;
}

export type AIType = 'idle' | 'patrol' | 'chase' | 'attack' | 'retreat' | 'boss';

export interface DamageNumber {
  x: number;
  y: number;
  value: number;
  color: string;
  timer: number;
  vy: number;
}

export interface ChestLoot {
  itemId: string;
  quantity: number;
}
