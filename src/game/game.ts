import {
  Direction, GameState, Region,
  Player, Enemy, NPC,
  Projectile, SpriteFrame,
  DialogueLine, QuestDef, SaveData, Particle,
} from './types';
import { InputManager, Camera, Renderer, Physics, GameLoop } from './engine';
import { RegionManager, DayNightCycle, WeatherSystem } from './world';
import { getSprite, PP } from './sprites';
import { dialogues, quests, endings } from './story';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const TILE_SIZE = 32;
const PLAYER_WIDTH = 24;
const PLAYER_HEIGHT = 44;
const PLAYER_BASE_SPEED = 130;
const DASH_SPEED = 260;
const DASH_DURATION = 0.12;
const DASH_COOLDOWN = 0.5;

const ENEMY_TYPES: Record<string, { hp: number; speed: number; damage: number; aggroRange: number; attackRange: number; expReward: number; goldReward: number; spriteId: string }> = {
  slime: { hp: 20, speed: 40, damage: 5, aggroRange: 120, attackRange: 28, expReward: 10, goldReward: 5, spriteId: 'playerDown' },
  wolf: { hp: 45, speed: 70, damage: 10, aggroRange: 160, attackRange: 32, expReward: 25, goldReward: 12, spriteId: 'playerDown' },
  scorpion: { hp: 60, speed: 50, damage: 15, aggroRange: 140, attackRange: 36, expReward: 35, goldReward: 18, spriteId: 'playerDown' },
  shadow: { hp: 35, speed: 85, damage: 12, aggroRange: 180, attackRange: 30, expReward: 40, goldReward: 22, spriteId: 'playerDown' },
  ice_imp: { hp: 55, speed: 45, damage: 14, aggroRange: 150, attackRange: 34, expReward: 38, goldReward: 20, spriteId: 'playerDown' },
  void_wraith: { hp: 80, speed: 60, damage: 20, aggroRange: 200, attackRange: 38, expReward: 60, goldReward: 35, spriteId: 'playerDown' },
  holy_knight: { hp: 100, speed: 55, damage: 22, aggroRange: 170, attackRange: 36, expReward: 70, goldReward: 40, spriteId: 'playerDown' },
};

const BOSS_TYPES: Record<string, { hp: number; speed: number; damage: number; phases: number; spriteId: string }> = {
  ancient_tree_spirit: { hp: 500, speed: 30, damage: 25, phases: 2, spriteId: 'playerDown' },
  scorpion_king: { hp: 800, speed: 45, damage: 35, phases: 3, spriteId: 'playerDown' },
  ice_dragon: { hp: 1200, speed: 35, damage: 45, phases: 3, spriteId: 'playerDown' },
  void_devourer: { hp: 2000, speed: 25, damage: 60, phases: 4, spriteId: 'playerDown' },
  fallen_saint: { hp: 1500, speed: 50, damage: 50, phases: 4, spriteId: 'playerDown' },
};

interface DamageNumber {
  x: number;
  y: number;
  text: string;
  life: number;
  timer: number;
  vx: number;
  vy: number;
}

interface Effect {
  type: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  frame: number;
}

interface TitleStar {
  x: number;
  y: number;
  size: number;
  speed: number;
}

function createDefaultPlayer(): Player {
  return {
    id: 'player',
    x: 160,
    y: 960,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    vx: 0,
    vy: 0,
    speed: PLAYER_BASE_SPEED,
    direction: Direction.Down,
    spriteId: 'playerDown',
    currentAnim: 'idle_down',
    frameIndex: 0,
    animTimer: 0,
    flipX: false,
    active: true,
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    exp: 0,
    expToLevel: 100,
    level: 1,
    gold: 0,
    attack: 15,
    defense: 5,
    invincible: false,
    invincibleTimer: 0,
    state: 'idle',
    stateTimer: 0,
    comboCount: 0,
    facing: Direction.Down,
  };
}

function createEnemy(type: string, x: number, y: number): Enemy {
  const template = ENEMY_TYPES[type] || ENEMY_TYPES.slime;
  return {
    id: `enemy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    x,
    y,
    width: 24,
    height: 28,
    vx: 0,
    vy: 0,
    speed: template.speed,
    direction: Direction.Down,
    spriteId: template.spriteId,
    currentAnim: `idle_${type}`,
    frameIndex: 0,
    animTimer: 0,
    flipX: false,
    active: true,
    hp: template.hp,
    maxHp: template.hp,
    enemyType: type,
    aiState: 'idle',
    aiTimer: 0,
    aggroRange: template.aggroRange,
    attackRange: template.attackRange,
    damage: template.damage,
    expReward: template.expReward,
    goldReward: template.goldReward,
    dropTable: [type + '_drop'],
  };
}

// @ts-expect-error kept for future boss spawning
function _createBoss(type: string, x: number, y: number): Enemy {
  const template = BOSS_TYPES[type] || BOSS_TYPES.ancient_tree_spirit;
  return {
    id: `boss_${type}`,
    x,
    y,
    width: 48,
    height: 56,
    vx: 0,
    vy: 0,
    speed: template.speed,
    direction: Direction.Down,
    spriteId: template.spriteId,
    currentAnim: `boss_idle`,
    frameIndex: 0,
    animTimer: 0,
    flipX: false,
    active: true,
    hp: template.hp,
    maxHp: template.hp,
    enemyType: type,
    aiState: 'idle',
    aiTimer: 0,
    aggroRange: 300,
    attackRange: 56,
    damage: template.damage,
    expReward: template.hp * 2,
    goldReward: 500,
    dropTable: [type + '_core'],
  };
}

function createNPC(npcId: string, name: string, x: number, y: number, dialogKey: string, questKey: string | null): NPC {
  return {
    id: npcId,
    x,
    y,
    width: 24,
    height: 36,
    vx: 0,
    vy: 0,
    speed: 30,
    direction: Direction.Down,
    spriteId: 'playerDown',
    currentAnim: 'idle_npc',
    frameIndex: 0,
    animTimer: 0,
    flipX: false,
    active: true,
    hp: 9999,
    maxHp: 9999,
    npcId,
    name,
    dialogKey,
    questKey,
    hasQuest: questKey !== null,
    questCompleted: false,
    walking: false,
    walkTimer: 0,
    walkDir: Direction.Down,
  };
}

export class Game {
  canvas: HTMLCanvasElement | null = null;
  renderer!: Renderer;
  input!: InputManager;
  camera!: Camera;
  physics!: Physics;
  loop!: GameLoop;

  state: GameState = GameState.Title;

  player: Player = createDefaultPlayer();
  enemies: Enemy[] = [];
  npcs: NPC[] = [];
  projectiles: Projectile[] = [];
  particles: Particle[] = [];

  regionManager: RegionManager = new RegionManager();
  dayNight: DayNightCycle = new DayNightCycle();
  weather: WeatherSystem = new WeatherSystem();

  currentDialogue: DialogueLine[] = [];
  dialogueIndex: number = 0;
  activeSpeaker: string = '';
  dialogueChoices: Array<{ text: string; nextKey: string | null }> | null = null;

  currentQuest: QuestDef | null = null;
  showQuestComplete: boolean = false;
  questCompleteTimer: number = 0;

  inventory: Array<{ id: string; count: number }> = [];
  equipment: { weapon: string; armor: string; accessory: string | null } = {
    weapon: 'iron_sword',
    armor: 'cloth_armor',
    accessory: null,
  };

  saveSlots: (SaveData | null)[] = [null, null, null];
  selectedSlot: number = 0;
  transitionCooldown: number = 0;

  damageNumbers: DamageNumber[] = [];
  effects: Effect[] = [];

  bossActive: boolean = false;
  bossDefeated: Set<string> = new Set<string>();

  gameTime: number = 0;

  titleAlpha: number = 0;
  titleStars: TitleStar[] = [];

  // @ts-expect-error kept for future attack state tracking
  private _attackActive: boolean = false;
  private _attackTimer: number = 0;
  // @ts-expect-error kept for future attack animation
  private _attackFrame: number = 0;
  private _dashCooldown: number = 0;
  private _skillCooldown: number = 0;
  private _lastDirPress: Record<string, number> = {};
  // @ts-expect-error kept for future dash direction tracking
  private _dashDir: Direction | null = null;
  private _bossPhase: number = 1;
  private _bossPatternTimer: number = 0;
  private _bossPattern: number = 0;
  private _creditsScroll: number = 0;

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas.getContext('2d')!);
    this.input = new InputManager();
    this.camera = new Camera();
    this.camera.width = GAME_WIDTH;
    this.camera.height = GAME_HEIGHT;
    this.physics = new Physics();
    this.loop = new GameLoop();
    this.loop.start(this.update.bind(this));

    this.titleStars = [];
    for (let i = 0; i < 50; i++) {
      this.titleStars.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        size: 1 + Math.random() * 2.5,
        speed: 0.3 + Math.random() * 1.5,
      });
    }

    this.state = GameState.Title;
    this.setupInputListeners(canvas);

    try {
      for (let i = 0; i < 3; i++) {
        const saved = localStorage.getItem(`twilight_realm_save_${i}`);
        if (saved) {
          this.saveSlots[i] = JSON.parse(saved);
        }
      }
    } catch (_e) {
      // SSR safety — ignore localStorage errors
    }

    this.weather.setWeather('clear', 0);
  }

  private setupInputListeners(canvas: HTMLCanvasElement): void {
    const keyMap: Record<string, string> = {
      'ArrowUp': 'ArrowUp', 'ArrowDown': 'ArrowDown',
      'ArrowLeft': 'ArrowLeft', 'ArrowRight': 'ArrowRight',
      ' ': 'Space', 'e': 'KeyE', 'E': 'KeyE',
      'i': 'KeyI', 'I': 'KeyI',
      'Escape': 'Escape', 'Enter': 'Enter',
      'Shift': 'Shift', 'z': 'KeyZ', 'Z': 'KeyZ',
      'j': 'KeyJ', 'J': 'KeyJ',
      'x': 'KeyX', 'X': 'KeyX',
      'k': 'KeyK', 'K': 'KeyK',
    };

    canvas.addEventListener('keydown', (e) => {
      const mapped = keyMap[e.key];
      if (mapped) {
        e.preventDefault();
      }
    });

    canvas.addEventListener('keyup', (e) => {
      const mapped = keyMap[e.key];
      if (mapped) {
        e.preventDefault();
      }
    });
  }

  newGame(): void {
    this.player = createDefaultPlayer();
    this.enemies = [];
    this.npcs = [];
    this.projectiles = [];
    this.particles = [];
    this.damageNumbers = [];
    this.effects = [];
    this.bossDefeated.clear();
    this.bossActive = false;
    this.gameTime = 0;
    this.inventory = [];
    this.equipment = { weapon: 'iron_sword', armor: 'cloth_armor', accessory: null };

    Object.keys(quests).forEach(k => {
      quests[k].completed = false;
      quests[k].currentCount = 0;
      quests[k].accepted = k === 'true_ending' || k === 'gather_power';
    });

    this.regionManager.loadRegion(Region.Forest);
    const map = this.regionManager.getCurrentMap();
    if (map) {
      const spawns = map.getSpawnPoints();
      const playerSpawn = spawns.find(s => s.type === 'player');
      if (playerSpawn) {
        this.player.x = playerSpawn.x;
        this.player.y = playerSpawn.y;
      }
      this.spawnEntitiesFromMap(spawns);
    }

    this.camera.follow(this.player.x, this.player.y);
    this.state = GameState.Playing;
    this.dayNight.time = 0.3;
    this.weather.setWeather('clear', 0);
  }

  private spawnEntitiesFromMap(spawns: Array<{ x: number; y: number; type: string }>): void {
    this.npcs = [];
    for (const spawn of spawns) {
      switch (spawn.type) {
        case 'npc_eileen':
          this.npcs.push(createNPC('eileen', '艾琳', spawn.x, spawn.y, 'eileen_intro', 'stardust'));
          break;
        case 'npc_gregor':
          this.npcs.push(createNPC('gregor', '格雷戈尔', spawn.x, spawn.y, 'gregor_intro', 'desert_relics'));
          break;
        case 'npc_kashim':
          this.npcs.push(createNPC('kashim', '卡希姆', spawn.x, spawn.y, 'kashim_intro', 'holy_key'));
          break;
        case 'npc_vera':
          this.npcs.push(createNPC('vera', '薇拉', spawn.x, spawn.y, 'vera_intro', 'dragon_scales'));
          break;
        case 'npc_noah':
          this.npcs.push(createNPC('noah', '诺亚', spawn.x, spawn.y, 'noah_intro', 'void_research'));
          break;
        case 'npc_guard_captain':
          this.npcs.push(createNPC('guard_captain', '卫队长', spawn.x, spawn.y, 'guard_captain_intro', null));
          break;
        case 'enemy':
          this.spawnRegionalEnemy(spawn.x, spawn.y);
          break;
      }
    }
  }

  private spawnRegionalEnemy(x: number, y: number): void {
    const region = this.regionManager.getCurrentRegion();
    let type = 'slime';
    switch (region) {
      case Region.Forest:
        type = Math.random() < 0.5 ? 'slime' : 'wolf';
        break;
      case Region.Desert:
        type = Math.random() < 0.6 ? 'scorpion' : 'shadow';
        break;
      case Region.Snow:
        type = Math.random() < 0.6 ? 'ice_imp' : 'wolf';
        break;
      case Region.Ruins:
        type = Math.random() < 0.7 ? 'void_wraith' : 'shadow';
        break;
      case Region.HolyCity:
        type = Math.random() < 0.6 ? 'holy_knight' : 'void_wraith';
        break;
    }
    this.enemies.push(createEnemy(type, x, y));
  }

  private ensureMinEnemies(): void {
    const maxEnemies = 8;
    const currentRegion = this.regionManager.currentRegion;
    let minCount = 3;
    switch (currentRegion) {
      case Region.Desert: minCount = 4; break;
      case Region.Snow: minCount = 4; break;
      case Region.Ruins: minCount = 5; break;
      case Region.HolyCity: minCount = 3; break;
    }
    if (this.enemies.length >= maxEnemies) return;
    const toSpawn = Math.min(maxEnemies - this.enemies.length, Math.max(0, minCount - this.enemies.filter(e => e.active).length));
    if (toSpawn <= 0) return;
    const map = this.regionManager.getCurrentMap();
    if (!map) return;
    for (let i = 0; i < toSpawn; i++) {
      const _angle = Math.random() * Math.PI * 2;
      const dist = 250 + Math.random() * 200;
      const ex = this.player.x + Math.cos(_angle) * dist;
      const ey = this.player.y + Math.sin(_angle) * dist;
      if (!map.isCollision(ex, ey)) {
        this.spawnRegionalEnemy(ex, ey);
      }
    }
  }

  update(dt: number): void {
    switch (this.state) {
      case GameState.Title:
        this.updateTitle(dt);
        break;
      case GameState.Playing:
        this.input.update();
        this.handleInput();
        this.updatePlayer(dt);
        this.updateEntities(dt);
        this.updateProjectiles(dt);
        this.particles.forEach(p => {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
        });
        this.particles = this.particles.filter(p => p.life > 0);
        this.updateEffects(dt);
        this.updateDamageNumbers(dt);
        this.checkTransitions();
        this.camera.follow(this.player.x, this.player.y);
        this.camera.update(dt);
        this.dayNight.update(dt);
        const map = this.regionManager.getCurrentMap();
        if (map) {
          this.weather.update(dt, map.data.width * TILE_SIZE, map.data.height * TILE_SIZE);
        }
        this.ensureMinEnemies();
        this.gameTime += dt;
        break;
      case GameState.Paused:
        this.input.update();
        if (this.input.isKeyPressed('Escape') || this.input.isKeyPressed('Enter')) {
          this.state = GameState.Playing;
        }
        break;
      case GameState.Dialog:
        this.input.update();
        if (this.input.isKeyPressed('Space') || this.input.isKeyPressed('Enter') || this.input.isKeyPressed('KeyE')) {
          this.advanceDialogue();
        }
        break;
      case GameState.Inventory:
        this.input.update();
        if (this.input.isKeyPressed('KeyI') || this.input.isKeyPressed('Escape')) {
          this.state = GameState.Playing;
        }
        break;
      case GameState.GameOver:
        this.input.update();
        if (this.input.isKeyPressed('Enter') || this.input.isKeyPressed('Space')) {
          this.newGame();
        }
        break;
      case GameState.Ending:
        this._creditsScroll += dt * 30;
        break;
    }

    this.render();

    if (this.transitionCooldown > 0) {
      this.transitionCooldown -= dt;
    }
    if (this._dashCooldown > 0) this._dashCooldown -= dt;
    if (this._skillCooldown > 0) this._skillCooldown -= dt;
    if (this.showQuestComplete) {
      this.questCompleteTimer -= dt;
      if (this.questCompleteTimer <= 0) {
        this.showQuestComplete = false;
      }
    }
  }

  private updateTitle(dt: number): void {
    if (this.titleAlpha < 1) {
      this.titleAlpha = Math.min(1, this.titleAlpha + dt * 0.5);
    }
    for (const star of this.titleStars) {
      star.y -= star.speed * dt * 20;
      if (star.y < -5) {
        star.y = GAME_HEIGHT + 5;
        star.x = Math.random() * GAME_WIDTH;
      }
    }
    this.input.update();
    if (this.input.isKeyPressed('Enter') || this.input.isKeyPressed('Space')) {
      this.newGame();
    }
  }

  handleInput(): void {
    if (this.state !== GameState.Playing) return;

    let moving = false;
    let mx = 0;
    let my = 0;

    if (this.player.state !== 'dash' && this.player.state !== 'attack' && this.player.state !== 'hurt' && this.player.state !== 'skill') {
      if (this.input.isKeyDown('ArrowUp') || this.input.isKeyDown('KeyW')) {
        my = -1;
        this.player.direction = Direction.Up;
        this.player.facing = Direction.Up;
        moving = true;
      }
      if (this.input.isKeyDown('ArrowDown') || this.input.isKeyDown('KeyS')) {
        my = 1;
        this.player.direction = Direction.Down;
        this.player.facing = Direction.Down;
        moving = true;
      }
      if (this.input.isKeyDown('ArrowLeft') || this.input.isKeyDown('KeyA')) {
        mx = -1;
        this.player.direction = Direction.Left;
        this.player.facing = Direction.Left;
        moving = true;
      }
      if (this.input.isKeyDown('ArrowRight') || this.input.isKeyDown('KeyD')) {
        mx = 1;
        this.player.direction = Direction.Right;
        this.player.facing = Direction.Right;
        moving = true;
      }

      if (moving) {
        const len = Math.sqrt(mx * mx + my * my);
        if (len > 0) {
          mx /= len;
          my /= len;
        }
        this.player.vx = mx * this.player.speed;
        this.player.vy = my * this.player.speed;
        this.player.state = 'walk';

        const dirName = ['Up', 'Down', 'Left', 'Right'][this.player.facing];
        const now = Date.now();
        if (this._lastDirPress[dirName] && now - this._lastDirPress[dirName] < 300) {
          this.tryDash(this.player.facing);
        }
        this._lastDirPress[dirName] = now;
      } else {
        this.player.vx *= 0.7;
        this.player.vy *= 0.7;
        if (Math.abs(this.player.vx) < 0.5) this.player.vx = 0;
        if (Math.abs(this.player.vy) < 0.5) this.player.vy = 0;
        if (this.player.state === 'walk') this.player.state = 'idle';
      }
    }

    if (this.input.isKeyPressed('Space') || this.input.isKeyPressed('KeyE')) {
      this.tryInteraction();
    }

    if ((this.input.isKeyPressed('KeyZ') || this.input.isKeyPressed('Shift') || this.input.isKeyPressed('KeyJ')) &&
        this.player.state !== 'attack' && this.player.state !== 'dash' && this.player.state !== 'skill' && this.player.state !== 'hurt') {
      this.triggerAttack();
    }

    if (this.input.isKeyPressed('Shift') && this.player.state !== 'dash' && this.player.state !== 'attack' && this.player.state !== 'skill' && this.player.state !== 'hurt') {
      this.tryDash(this.player.facing);
    }

    if ((this.input.isKeyPressed('KeyX') || this.input.isKeyPressed('KeyK')) &&
        this.player.state !== 'attack' && this.player.state !== 'dash' && this.player.state !== 'skill' && this.player.state !== 'hurt' &&
        this._skillCooldown <= 0 && this.player.mp >= 10) {
      this.triggerSkill();
    }

    if (this.input.isKeyPressed('Escape')) {
      this.state = GameState.Paused;
    }
    if (this.input.isKeyPressed('KeyI')) {
      this.state = GameState.Inventory;
    }
  }

  private tryInteraction(): void {
    const interactDist = 48;
    for (const npc of this.npcs) {
      if (!npc.active) continue;
      const dx = (npc.x + npc.width / 2) - (this.player.x + this.player.width / 2);
      const dy = (npc.y + npc.height / 2) - (this.player.y + this.player.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < interactDist) {
        this.startDialogue(npc.npcId);
        return;
      }
    }
  }

  private triggerAttack(): void {
    this.player.state = 'attack';
    this.player.stateTimer = 0;
    this._attackActive = true;
    this._attackTimer = 0.25;
    this._attackFrame = 0;

    const facing = this.player.facing;
    const attackRange = 40;
    const attackAngle = Math.PI / 3;
    const baseAngle = [ -Math.PI / 2, Math.PI / 2, Math.PI, 0 ][facing];

    for (const enemy of this.enemies) {
      if (!enemy.active || enemy.aiState === 'dead') continue;
      const ex = enemy.x + enemy.width / 2;
      const ey = enemy.y + enemy.height / 2;
      const px = this.player.x + this.player.width / 2;
      const py = this.player.y + this.player.height / 2;
      const dx = ex - px;
      const dy = ey - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > attackRange) continue;
      // @ts-expect-error angle calculated for future attack direction refinement
      let _angle = Math.atan2(dy, dx);
      if (facing === Direction.Up) _angle = Math.atan2(dy, dx) - Math.PI / 2;
      else if (facing === Direction.Down) _angle = Math.atan2(dy, dx) + Math.PI / 2;
      else if (facing === Direction.Left) _angle = dx < 0 ? 0 : Math.PI;
      else if (facing === Direction.Right) _angle = dx >= 0 ? 0 : Math.PI;

      let actualAngle = Math.atan2(dy, dx);
      let diff = actualAngle - baseAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) <= attackAngle / 2) {
        const variance = Math.floor(Math.random() * 5) - 2;
        const totalDamage = Math.max(1, this.player.attack + variance);
        this.damageEnemy(enemy, totalDamage);
      }
    }

    this.effects.push({
      type: 'slash',
      x: this.player.x + this.player.width / 2,
      y: this.player.y + this.player.height / 2,
      life: 0.15,
      maxLife: 0.15,
      frame: 0,
    });
  }

  private tryDash(dir: Direction): void {
    if (this._dashCooldown > 0) return;
    this.player.state = 'dash';
    this.player.stateTimer = 0;
    this.player.invincible = true;
    this.player.invincibleTimer = DASH_DURATION;
    this._dashCooldown = DASH_COOLDOWN;
    this._dashDir = dir;

    const dashVel = [
      { vx: 0, vy: -DASH_SPEED },
      { vx: 0, vy: DASH_SPEED },
      { vx: -DASH_SPEED, vy: 0 },
      { vx: DASH_SPEED, vy: 0 },
    ][dir];
    this.player.vx = dashVel.vx;
    this.player.vy = dashVel.vy;

    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: this.player.x + this.player.width / 2 + (Math.random() - 0.5) * this.player.width,
        y: this.player.y + this.player.height / 2 + (Math.random() - 0.5) * this.player.height,
        vx: -dashVel.vx * 0.15 + (Math.random() - 0.5) * 30,
        vy: -dashVel.vy * 0.15 + (Math.random() - 0.5) * 30,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        size: 2 + Math.random() * 2,
        color: '#aaddff',
        type: 'sparkle',
      });
    }
  }

  private triggerSkill(): void {
    this.player.state = 'skill';
    this.player.stateTimer = 0;
    this.player.mp -= 10;
    this._skillCooldown = 2.0;

    const skillRange = 80;
    const skillDamage = Math.floor(this.player.attack * 1.8);

    for (const enemy of this.enemies) {
      if (!enemy.active || enemy.aiState === 'dead') continue;
      const ex = enemy.x + enemy.width / 2;
      const ey = enemy.y + enemy.height / 2;
      const px = this.player.x + this.player.width / 2;
      const py = this.player.y + this.player.height / 2;
      const dist = Math.sqrt((ex - px) ** 2 + (ey - py) ** 2);
      if (dist <= skillRange) {
        this.damageEnemy(enemy, skillDamage + Math.floor(Math.random() * 10));
      }
    }

    this.effects.push({
      type: 'aoe_burst',
      x: this.player.x + this.player.width / 2,
      y: this.player.y + this.player.height / 2,
      life: 0.4,
      maxLife: 0.4,
      frame: 0,
    });

    for (let i = 0; i < 16; i++) {
      const ang = (Math.PI * 2 / 16) * i;
      this.particles.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: Math.cos(ang) * (100 + Math.random() * 60),
        vy: Math.sin(ang) * (100 + Math.random() * 60),
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 3 + Math.random() * 2,
        color: '#ffdd44',
        type: 'sparkle',
      });
    }
  }

  updatePlayer(dt: number): void {
    if (this.player.state === 'dash') {
      this.player.stateTimer += dt;
      if (this.player.stateTimer >= DASH_DURATION) {
        this.player.state = 'idle';
        this.player.vx *= 0.3;
        this.player.vy *= 0.3;
        this.player.invincible = false;
      }
    }

    if (this.player.state === 'attack') {
      this.player.stateTimer += dt;
      this._attackTimer -= dt;
      if (this._attackTimer <= 0) {
        this._attackActive = false;
      }
      if (this.player.stateTimer >= 0.35) {
        this.player.state = 'idle';
        this._attackActive = false;
      }
    }

    if (this.player.state === 'skill') {
      this.player.stateTimer += dt;
      if (this.player.stateTimer >= 0.5) {
        this.player.state = 'idle';
      }
    }

    if (this.player.state === 'hurt') {
      this.player.stateTimer += dt;
      this.player.invincible = true;
      if (this.player.stateTimer >= 0.3) {
        this.player.state = 'idle';
        this.player.invincible = false;
        this.player.invincibleTimer = 0.5;
      }
    }

    if (this.player.invincibleTimer > 0) {
      this.player.invincibleTimer -= dt;
      if (this.player.invincibleTimer <= 0) {
        this.player.invincible = false;
      }
    }

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    const map = this.regionManager.getCurrentMap();
    if (map) {
      const collisionTiles: Array<{ x: number; y: number; width: number; height: number }> = [];
      for (let r = 0; r < map.data.collisions.length; r++) {
        for (let c = 0; c < map.data.collisions[r].length; c++) {
          if (map.data.collisions[r][c]) {
            collisionTiles.push({ x: c * TILE_SIZE, y: r * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE });
          }
        }
      }
      Physics.resolveCollision(
        { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height, vx: this.player.vx, vy: this.player.vy },
        collisionTiles,
        TILE_SIZE,
        map.data.width,
        map.data.height
      );
      this.player.x = Math.max(0, Math.min(this.player.x, map.data.width * TILE_SIZE - this.player.width));
      this.player.y = Math.max(0, Math.min(this.player.y, map.data.height * TILE_SIZE - this.player.height));
    }

    this.player.animTimer += dt;
    if (this.player.animTimer >= 0.12) {
      this.player.animTimer = 0;
      this.player.frameIndex = (this.player.frameIndex + 1) % 4;
    }

    if (this.player.mp < this.player.maxMp) {
      this.player.mp = Math.min(this.player.maxMp, this.player.mp + dt * 2);
    }
  }

  updateEntities(dt: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.active || enemy.aiState === 'dead') continue;

      this.updateEnemyAI(enemy, dt);

      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

      const map = this.regionManager.getCurrentMap();
      if (map) {
        const collisionTiles: Array<{ x: number; y: number; width: number; height: number }> = [];
        for (let r = 0; r < map.data.collisions.length; r++) {
          for (let c = 0; c < map.data.collisions[r].length; c++) {
            if (map.data.collisions[r][c]) {
              collisionTiles.push({ x: c * TILE_SIZE, y: r * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE });
            }
          }
        }
        Physics.resolveCollision(
          { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height, vx: enemy.vx, vy: enemy.vy },
          collisionTiles,
          TILE_SIZE,
          map.data.width,
          map.data.height
        );
      }

      enemy.animTimer += dt;
      if (enemy.animTimer >= 0.15) {
        enemy.animTimer = 0;
        enemy.frameIndex = (enemy.frameIndex + 1) % 4;
      }

      if (enemy.hp <= 0 && enemy.aiState !== ('dead' as Enemy['aiState'])) {
        enemy.aiState = 'dead';
        enemy.active = false;
        this.player.exp += enemy.expReward;
        this.player.gold += enemy.goldReward;
        this.checkLevelUp();
        this.onEnemyDeath(enemy);
      }
    }
    this.enemies = this.enemies.filter(e => e.aiState !== 'dead');

    for (const npc of this.npcs) {
      if (!npc.active) continue;

      npc.walkTimer -= dt;
      if (npc.walkTimer <= 0) {
        npc.walking = !npc.walking;
        npc.walkTimer = 2 + Math.random() * 3;
        if (npc.walking) {
          npc.walkDir = Math.floor(Math.random() * 4) as Direction;
        }
      }

      if (npc.walking) {
        const dirVec = [
          { vx: 0, vy: -1 }, { vx: 0, vy: 1 },
          { vx: -1, vy: 0 }, { vx: 1, vy: 0 },
        ][npc.walkDir];
        npc.vx = dirVec.vx * npc.speed;
        npc.vy = dirVec.vy * npc.speed;
        npc.direction = npc.walkDir;
        npc.x += npc.vx * dt;
        npc.y += npc.vy * dt;
      } else {
        npc.vx = 0;
        npc.vy = 0;
        const dx = this.player.x - npc.x;
        if (Math.abs(dx) < 100) {
          npc.direction = dx > 0 ? Direction.Right : Direction.Left;
          npc.flipX = dx < 0;
        }
      }

      npc.animTimer += dt;
      if (npc.animTimer >= 0.15) {
        npc.animTimer = 0;
        npc.frameIndex = (npc.frameIndex + 1) % 4;
      }
    }

    for (const enemy of this.enemies) {
      if (!enemy.active || enemy.aiState === 'dead' || this.player.invincible) continue;
      if (Physics.checkCollision(
        { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height },
        { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height }
      )) {
        this.damagePlayer(enemy.damage);
      }
    }
  }

  private updateEnemyAI(enemy: Enemy, dt: number): void {
    const isBoss = BOSS_TYPES[enemy.enemyType] !== undefined;
    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;
    const ex = enemy.x + enemy.width / 2;
    const ey = enemy.y + enemy.height / 2;
    const dx = px - ex;
    const dy = py - ey;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (isBoss) {
      this.updateBossAI(enemy, dt, dx, dy, dist);
      return;
    }

    enemy.aiTimer -= dt;

    switch (enemy.aiState) {
      case 'idle':
        if (dist < enemy.aggroRange) {
          enemy.aiState = 'chase';
        } else {
          if (enemy.aiTimer <= 0) {
            enemy.aiTimer = 1.5 + Math.random() * 2;
            const wanderDir = Math.floor(Math.random() * 4) as Direction;
            const wv = [
              { vx: 0, vy: -1 }, { vx: 0, vy: 1 },
              { vx: -1, vy: 0 }, { vx: 1, vy: 0 },
            ][wanderDir];
            enemy.vx = wv.vx * enemy.speed * 0.3;
            enemy.vy = wv.vy * enemy.speed * 0.3;
          }
        }
        break;

      case 'chase':
        if (dist > enemy.aggroRange * 1.5) {
          enemy.aiState = 'idle';
          enemy.vx = 0;
          enemy.vy = 0;
        } else if (dist < enemy.attackRange) {
          enemy.aiState = 'attack';
          enemy.aiTimer = 0;
          enemy.vx = 0;
          enemy.vy = 0;
        } else {
          const ndx = dx / dist;
          const ndy = dy / dist;
          enemy.vx = ndx * enemy.speed * 0.6;
          enemy.vy = ndy * enemy.speed * 0.6;
          if (ndx > 0.3) enemy.direction = Direction.Right;
          else if (ndx < -0.3) enemy.direction = Direction.Left;
          else if (ndy > 0.3) enemy.direction = Direction.Down;
          else if (ndy < -0.3) enemy.direction = Direction.Up;
        }
        break;

      case 'attack':
        if (dist > enemy.attackRange * 1.5) {
          enemy.aiState = 'chase';
        } else {
          if (enemy.aiTimer <= 0) {
            this.damagePlayer(enemy.damage);
            enemy.aiTimer = 1.2 + Math.random() * 0.8;
            enemy.aiState = 'windup';
            enemy.aiTimer = 0.5;
          }
        }
        break;

      case 'windup':
        enemy.aiTimer -= dt;
        if (enemy.aiTimer <= 0) {
          enemy.aiState = 'attack';
          enemy.aiTimer = 0.2;
        }
        break;

      case 'hurt':
        enemy.aiTimer -= dt;
        enemy.vx = -dx / dist * enemy.speed * 0.5;
        enemy.vy = -dy / dist * enemy.speed * 0.5;
        if (enemy.aiTimer <= 0) {
          enemy.aiState = 'chase';
        }
        break;
    }
  }

  private updateBossAI(boss: Enemy, dt: number, dx: number, dy: number, dist: number): void {
    const bossTemplate = BOSS_TYPES[boss.enemyType];
    if (!bossTemplate) return;

    const hpPercent = boss.hp / boss.maxHp;
    this._bossPhase = hpPercent > 0.66 ? 1 : hpPercent > 0.33 ? 2 : 3;
    if (bossTemplate.phases >= 4) {
      this._bossPhase = hpPercent > 0.5 ? 2 : hpPercent > 0.25 ? 3 : 4;
    }

    this._bossPatternTimer -= dt;
    if (this._bossPatternTimer <= 0) {
      this._bossPattern = Math.floor(Math.random() * (2 + this._bossPhase));
      this._bossPatternTimer = 2.0 - this._bossPhase * 0.3;
    }

    const ndx = dx / (dist || 1);
    const ndy = dy / (dist || 1);
    const rageSpeedMult = 1 + (1 - hpPercent) * 0.8;

    switch (this._bossPattern) {
      case 0:
        boss.vx = ndx * boss.speed * 0.5 * rageSpeedMult;
        boss.vy = ndy * boss.speed * 0.5 * rageSpeedMult;
        if (dist < 80) {
          this.damagePlayer(Math.floor(boss.damage * 0.6));
        }
        break;

      case 1:
        boss.aiTimer -= dt;
        if (boss.aiTimer <= 0) {
          const projCount = 3 + this._bossPhase;
          for (let i = 0; i < projCount; i++) {
            const ang = Math.atan2(dy, dx) + (i - (projCount - 1) / 2) * 0.25;
            this.projectiles.push({
              id: `proj_${Date.now()}_${i}`,
              x: boss.x + boss.width / 2,
              y: boss.y + boss.height / 2,
              vx: Math.cos(ang) * (120 + this._bossPhase * 30),
              vy: Math.sin(ang) * (120 + this._bossPhase * 30),
              width: 10,
              height: 10,
              damage: Math.floor(boss.damage * 0.4),
              ownerId: boss.id,
              lifetime: 3,
              spriteId: 'playerDown',
              active: true,
              hitEntities: new Set(),
            });
          }
          boss.aiTimer = 1.5 - this._bossPhase * 0.2;
        }
        boss.vx *= 0.9;
        boss.vy *= 0.9;
        break;

      case 2:
        boss.aiTimer -= dt;
        if (boss.aiTimer <= 0) {
          const chargeSpeed = boss.speed * (2.5 + this._bossPhase * 0.5);
          boss.vx = ndx * chargeSpeed;
          boss.vy = ndy * chargeSpeed;
          boss.aiTimer = 0.6;
          setTimeout(() => {
            boss.vx *= 0.1;
            boss.vy *= 0.1;
          }, 600);
        }
        break;

      case 3:
        boss.aiTimer -= dt;
        if (boss.aiTimer <= 0) {
          for (let ring = 0; ring < 2; ring++) {
            const count = 8 + this._bossPhase * 4;
            for (let i = 0; i < count; i++) {
              const ang = (Math.PI * 2 / count) * i + ring * 0.2;
              this.projectiles.push({
                id: `proj_ring_${Date.now()}_${ring}_${i}`,
                x: boss.x + boss.width / 2,
                y: boss.y + boss.height / 2,
                vx: Math.cos(ang) * (80 + this._bossPhase * 15),
                vy: Math.sin(ang) * (80 + this._bossPhase * 15),
                width: 8,
                height: 8,
                damage: Math.floor(boss.damage * 0.3),
                ownerId: boss.id,
                lifetime: 2.5,
                spriteId: 'playerDown',
                active: true,
                hitEntities: new Set(),
              });
            }
          }
          boss.aiTimer = 2.5 - this._bossPhase * 0.3;
        }
        boss.vx *= 0.85;
        boss.vy *= 0.85;
        break;

      case 4:
        boss.aiTimer -= dt;
        if (boss.aiTimer <= 0) {
          const areaRadius = 100 + this._bossPhase * 20;
          const pdist = Math.sqrt(dx * dx + dy * dy);
          if (pdist < areaRadius) {
            this.damagePlayer(Math.floor(boss.damage * 0.8));
          }
          this.effects.push({
            type: 'danger_zone',
            x: boss.x + boss.width / 2,
            y: boss.y + boss.height / 2,
            life: 1.5,
            maxLife: 1.5,
            frame: 0,
          });
          boss.aiTimer = 3.0 - this._bossPhase * 0.3;
        }
        const evadeX = -ndx * boss.speed * 0.4;
        const evadeY = -ndy * boss.speed * 0.4;
        boss.vx = evadeX + Math.sin(Date.now() * 0.003) * boss.speed * 0.3;
        boss.vy = evadeY + Math.cos(Date.now() * 0.003) * boss.speed * 0.3;
        break;
    }

    if (ndx > 0.1) boss.direction = Direction.Right;
    else if (ndx < -0.1) boss.direction = Direction.Left;
    else if (ndy > 0.1) boss.direction = Direction.Down;
    else if (ndy < -0.1) boss.direction = Direction.Up;
  }

  updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (!proj.active) continue;

      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.lifetime -= dt;

      if (proj.lifetime <= 0) {
        proj.active = false;
        continue;
      }

      if (proj.ownerId !== this.player.id &&
          Physics.checkCollision(
            { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height },
            { x: proj.x, y: proj.y, width: proj.width, height: proj.height }
          ) && !this.player.invincible) {
        this.damagePlayer(proj.damage);
        proj.active = false;
        continue;
      }

      const map = this.regionManager.getCurrentMap();
      if (map) {
        // @ts-expect-error tile coords kept for future tile-based projection collision
        const _ptileX = Math.floor(proj.x / TILE_SIZE);
        // @ts-expect-error tile coords kept for future tile-based projection collision
        const _ptileY = Math.floor(proj.y / TILE_SIZE);
        if (map.isCollision(proj.x, proj.y)) {
          proj.active = false;
        }
      }
    }
    this.projectiles = this.projectiles.filter(p => p.active);
  }

  private updateEffects(dt: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      fx.life -= dt;
      fx.frame++;
      if (fx.life <= 0) {
        this.effects.splice(i, 1);
      }
    }
  }

  private updateDamageNumbers(dt: number): void {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.x += dn.vx * dt;
      dn.y += dn.vy * dt;
      dn.timer -= dt;
      dn.vy -= 30 * dt;
      if (dn.timer <= 0) {
        this.damageNumbers.splice(i, 1);
      }
    }
  }

  private damageEnemy(enemy: Enemy, amount: number): void {
    const actualDmg = Math.max(1, amount - Math.floor(this.player.defense * 0.3));
    enemy.hp -= actualDmg;
    enemy.aiState = 'hurt';
    enemy.aiTimer = 0.25;

    this.damageNumbers.push({
      x: enemy.x + enemy.width / 2,
      y: enemy.y,
      text: String(actualDmg),
      life: 1.0,
      timer: 1.0,
      vx: (Math.random() - 0.5) * 20,
      vy: -60 - Math.random() * 30,
    });

    if (BOSS_TYPES[enemy.enemyType]) {
      this.camera.startShake(3, 0.15);
    }

    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: enemy.x + enemy.width / 2 + (Math.random() - 0.5) * enemy.width,
        y: enemy.y + enemy.height / 2 + (Math.random() - 0.5) * enemy.height,
        vx: (Math.random() - 0.5) * 80,
        vy: (Math.random() - 0.5) * 80,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        size: 2 + Math.random() * 2,
        color: '#ff4444',
        type: 'damage',
      });
    }
  }

  private damagePlayer(amount: number): void {
    if (this.player.invincible || this.player.state === 'hurt') return;
    const actualDmg = Math.max(1, amount - Math.floor(this.player.defense * 0.5));
    this.player.hp -= actualDmg;
    this.player.state = 'hurt';
    this.player.stateTimer = 0;
    this.player.invincible = true;
    this.player.invincibleTimer = 0.5;

    this.damageNumbers.push({
      x: this.player.x + this.player.width / 2,
      y: this.player.y,
      text: String(actualDmg),
      life: 1.0,
      timer: 1.0,
      vx: (Math.random() - 0.5) * 20,
      vy: -60 - Math.random() * 20,
    });

    this.camera.startShake(4, 0.2);

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.state = GameState.GameOver;
    }
  }

  private checkLevelUp(): void {
    while (this.player.exp >= this.player.expToLevel) {
      this.player.exp -= this.player.expToLevel;
      this.player.level++;
      this.player.expToLevel = Math.floor(this.player.expToLevel * 1.5);
      this.player.maxHp += 15;
      this.player.hp = this.player.maxHp;
      this.player.maxMp += 8;
      this.player.mp = this.player.maxMp;
      this.player.attack += 3;
      this.player.defense += 2;

      this.damageNumbers.push({
        x: this.player.x,
        y: this.player.y - 20,
        text: `LEVEL UP! Lv.${this.player.level}`,
        life: 2.5,
        timer: 2.5,
        vx: 0,
        vy: -40,
      });
    }
  }

  private onEnemyDeath(enemy: Enemy): void {
    if (BOSS_TYPES[enemy.enemyType]) {
      this.bossDefeated.add(enemy.enemyType);
      this.bossActive = false;
      this.camera.startShake(8, 0.5);

      const postDialogueKey = `${enemy.enemyType}_post`;
      if (dialogues[postDialogueKey]) {
        this.currentDialogue = dialogues[postDialogueKey];
        this.dialogueIndex = 0;
        this.state = GameState.Dialog;
        this.activeSpeaker = enemy.enemyType;
      }

      for (let i = 0; i < 30; i++) {
        const ang = Math.random() * Math.PI * 2;
        this.particles.push({
          x: enemy.x + enemy.width / 2,
          y: enemy.y + enemy.height / 2,
          vx: Math.cos(ang) * (50 + Math.random() * 100),
          vy: Math.sin(ang) * (50 + Math.random() * 100),
          life: 0.8 + Math.random() * 0.8,
          maxLife: 1.6,
          size: 3 + Math.random() * 3,
          color: '#ffaa00',
          type: 'sparkle',
        });
      }

      if (enemy.enemyType === 'void_devourer') {
        setTimeout(() => {
          this.state = GameState.Ending;
          this._creditsScroll = 0;
        }, 2000);
      }
    }

    const roll = Math.random();
    if (roll < 0.15) {
      this.addItemToInventory('potion_hp', 1);
    } else if (roll < 0.22) {
      this.addItemToInventory('potion_mp', 1);
    } else if (roll < 0.26) {
      this.addItemToInventory('stardust', 1);
      this.updateQuestProgress('stardust', 1);
    } else if (roll < 0.29) {
      this.addItemToInventory('desert_relic', 1);
      this.updateQuestProgress('desert_relics', 1);
    } else if (roll < 0.32) {
      this.addItemToInventory('void_sample', 1);
      this.updateQuestProgress('void_research', 1);
    }
  }

  startDialogue(npcId: string): void {
    const dialogueKey = `${npcId}_intro`;
    if (dialogues[dialogueKey]) {
      this.currentDialogue = dialogues[dialogueKey];
      this.dialogueIndex = 0;
      this.activeSpeaker = npcId;
      this.state = GameState.Dialog;
      this.processCurrentDialogueLine();
    }
  }

  advanceDialogue(): void {
    if (this.dialogueChoices) {
      return;
    }
    this.dialogueIndex++;

    if (this.dialogueIndex >= this.currentDialogue.length) {
      this.currentDialogue = [];
      this.dialogueIndex = 0;
      this.activeSpeaker = '';
      this.dialogueChoices = null;
      this.state = GameState.Playing;
      return;
    }

    this.processCurrentDialogueLine();
  }

  selectDialogueChoice(choiceIndex: number): void {
    if (!this.dialogueChoices || choiceIndex >= this.dialogueChoices.length) return;
    const choice = this.dialogueChoices[choiceIndex];
    this.dialogueChoices = null;
    if (choice.nextKey && dialogues[choice.nextKey]) {
      this.currentDialogue = dialogues[choice.nextKey];
      this.dialogueIndex = 0;
      this.processCurrentDialogueLine();
    } else {
      this.advanceDialogue();
    }
  }

  private processCurrentDialogueLine(): void {
    if (this.dialogueIndex >= this.currentDialogue.length) return;
    const line = this.currentDialogue[this.dialogueIndex];

    if (line.action) {
      this.handleDialogueAction(line.action, line);
    }

    if (line.choices && line.choices.length > 0) {
      this.dialogueChoices = line.choices;
    } else {
      this.dialogueChoices = null;
    }
  }

  handleDialogueAction(action: string, line: DialogueLine): void {
    switch (action) {
      case 'quest_accept': {
        const qk = (line as { questKey?: string }).questKey;
        if (qk && quests[qk]) {
          quests[qk].accepted = true;
          quests[qk].currentCount = 0;
          this.currentQuest = quests[qk];
        }
        break;
      }
      case 'quest_complete': {
        if (this.currentQuest) {
          this.currentQuest.completed = true;
          this.showQuestComplete = true;
          this.questCompleteTimer = 3.0;
          if ((this.currentQuest!.rewardGold ?? 0) > 0) this.player.gold += this.currentQuest!.rewardGold!;
          if ((this.currentQuest!.rewardExp ?? 0) > 0) {
            this.player.exp += this.currentQuest!.rewardExp!;
            this.checkLevelUp();
          }
        }
        break;
      }
      case 'heal':
        this.player.hp = this.player.maxHp;
        this.player.mp = this.player.maxMp;
        break;
      case 'teleport': {
        const targetRegion = (line as { targetRegion?: number }).targetRegion;
        const targetX = (line as { targetX?: number }).targetX || 0;
        const targetY = (line as { targetY?: number }).targetY || 0;
        if (targetRegion !== undefined) {
          this.regionManager.loadRegion(targetRegion);
          this.player.x = targetX;
          this.player.y = targetY;
        }
        break;
      }
      case 'give_item': {
        const itemId = (line as { item?: string })?.item || 'unknown';
        const itemCount = (line as { count?: number })?.count || 1;
        this.addItemToInventory(itemId, itemCount);
        break;
      }
      case 'buy_potion':
        if (this.player.gold >= 50) {
          this.player.gold -= 50;
          this.addItemToInventory('potion_hp', 1);
        }
        break;
    }
  }

  private addItemToInventory(itemId: string, count: number): void {
    const existing = this.inventory.find(i => i.id === itemId);
    if (existing) {
      existing.count += count;
    } else {
      this.inventory.push({ id: itemId, count });
    }
  }

  private updateQuestProgress(questKey: string, amount: number): void {
    if (quests[questKey] && quests[questKey].accepted && !quests[questKey].completed) {
      quests[questKey].currentCount = Math.min(
        quests[questKey].currentCount + amount,
        quests[questKey].requiredCount || 99
      );
      if (quests[questKey].currentCount >= (quests[questKey].requiredCount || 99)) {
        quests[questKey].completed = true;
        this.showQuestComplete = true;
        this.questCompleteTimer = 3.0;
        if ((quests[questKey]!.rewardGold ?? 0) > 0) this.player.gold += quests[questKey]!.rewardGold!;
        if ((quests[questKey]!.rewardExp ?? 0) > 0) {
          this.player.exp += quests[questKey]!.rewardExp!;
          this.checkLevelUp();
        }
      }
    }
  }

  checkTransitions(): void {
    if (this.transitionCooldown > 0) return;
    const map = this.regionManager.getCurrentMap();
    if (!map) return;

    const playerRect = {
      x: this.player.x,
      y: this.player.y,
      width: this.player.width,
      height: this.player.height,
    };

    for (const trans of map.data.transitions) {
      const transRect = { x: trans.x, y: trans.y, width: trans.width, height: trans.height };
      if (Physics.checkCollision(playerRect, transRect)) {
        this.transitionCooldown = 1.0;
        this.regionManager.loadRegion(trans.targetRegion);
        this.player.x = trans.targetX;
        this.player.y = trans.targetY;
        this.enemies = [];
        this.projectiles = [];

        const newMap = this.regionManager.getCurrentMap();
        if (newMap) {
          const spawns = newMap.getSpawnPoints();
          this.spawnEntitiesFromMap(spawns);
        }

        switch (trans.targetRegion) {
          case Region.Desert:
            this.weather.setWeather('sand', 30);
            break;
          case Region.Snow:
            this.weather.setWeather('snow', 20);
            break;
          case Region.Ruins:
            this.weather.setWeather('clear', 0);
            break;
          case Region.HolyCity:
            this.weather.setWeather('clear', 0);
            break;
          default:
            this.weather.setWeather('clear', 0);
        }
        break;
      }
    }
  }

  saveGame(slot: number): void {
    // @ts-expect-error map reference kept for future save-data expansion
    const _map = this.regionManager.getCurrentMap();
    const saveData: SaveData = {
      playerName: '星渊',
      playerX: this.player.x,
      playerY: this.player.y,
      region: this.regionManager.currentRegion,
      hp: this.player.hp,
      mp: this.player.mp,
      maxHp: this.player.maxHp,
      maxMp: this.player.maxMp,
      level: this.player.level,
      exp: this.player.exp,
      expToLevel: this.player.expToLevel,
      gold: this.player.gold,
      quests: {},
      inventory: [...this.inventory],
      equipment: { ...this.equipment, accessory: this.equipment.accessory || '' },
      playTime: this.gameTime,
      bossDefeated: [...this.bossDefeated],
    };

    Object.keys(quests).forEach(k => {
      saveData.quests[k] = quests[k].completed;
    });

    this.saveSlots[slot] = saveData;

    try {
      localStorage.setItem(`twilight_realm_save_${slot}`, JSON.stringify(saveData));
    } catch (_e) {
      // SSR safety
    }
  }

  loadGame(slot: number): void {
    const data = this.saveSlots[slot];
    if (!data) return;

    this.player.x = data.playerX;
    this.player.y = data.playerY;
    this.player.hp = data.hp;
    this.player.mp = data.mp;
    this.player.maxHp = data.maxHp;
    this.player.maxMp = data.maxMp;
    this.player.level = data.level;
    this.player.exp = data.exp;
    this.player.expToLevel = data.expToLevel;
    this.player.gold = data.gold;
    this.inventory = [...data.inventory];
    this.equipment = {
      weapon: data.equipment.weapon,
      armor: data.equipment.armor,
      accessory: data.equipment.accessory || null,
    };
    this.gameTime = data.playTime || 0;

    Object.keys(data.quests).forEach(k => {
      if (quests[k]) {
        quests[k].completed = data.quests[k];
      }
    });

    this.regionManager.loadRegion(data.region);
    this.enemies = [];
    this.projectiles = [];
    this.damageNumbers = [];
    this.effects = [];
    this.bossActive = false;

    const map = this.regionManager.getCurrentMap();
    if (map) {
      const spawns = map.getSpawnPoints();
      this.spawnEntitiesFromMap(spawns);
    }

    this.state = GameState.Playing;
  }

  render(): void {
    if (this.state === GameState.Title) { this.renderTitleScreen(); return; }
    if (this.state === GameState.GameOver) { this.renderGameOverScreen(); return; }
    if (this.state !== GameState.Playing && this.state !== GameState.Paused) return;

    const ambientColor = this.dayNight.getAmbientColor();
    this.renderer.clear();
    this.renderer.ctx.fillStyle = ambientColor;
    this.renderer.ctx.fillRect(0, 0, this.renderer.width, this.renderer.height);

    const map = this.regionManager.getCurrentMap();
    if (map) {
      map.render(this.renderer as unknown as { drawPixelData: (tilePixels: number[][], x: number, y: number, palette: string[], cacheKey?: string) => void }, this.camera);
    }

    const allEntities: Array<{ entity: Player | Enemy | NPC; sortY: number }> = [];

    allEntities.push({ entity: this.player, sortY: this.player.y + this.player.height });
    for (const enemy of this.enemies) {
      if (enemy.active) allEntities.push({ entity: enemy, sortY: enemy.y + enemy.height });
    }
    for (const npc of this.npcs) {
      if (npc.active) allEntities.push({ entity: npc, sortY: npc.y + npc.height });
    }

    allEntities.sort((a, b) => a.sortY - b.sortY);

    for (const { entity } of allEntities) {
      let spriteId = entity.spriteId;
      let frameData: SpriteFrame;

      if (entity.id === 'player') {
        const p = entity as Player;
        const dirSprites: Record<number, string> = {
          [Direction.Down]: 'playerDown',
          [Direction.Up]: 'playerUp',
          [Direction.Left]: 'playerLeft',
          [Direction.Right]: 'playerRight',
        };
        spriteId = dirSprites[p.direction] || 'playerDown';
      }

      try {
        frameData = getSprite(spriteId);
      } catch (_e) {
        frameData = getSprite('playerDown');
      }

      const screenPos = this.camera.worldToScreen(entity.x, entity.y);
      const centerX = screenPos.x + (TILE_SIZE - frameData.width) / 2 - (entity.width - frameData.width) / 2;
      const centerY = screenPos.y + entity.height - frameData.height;

      if (screenPos.x > -frameData.width * 2 && screenPos.x < GAME_WIDTH + frameData.width &&
          screenPos.y > -frameData.height * 2 && screenPos.y < GAME_HEIGHT + frameData.height) {

        if (entity.id === 'player' && (entity as Player).invincible && Math.floor(Date.now() / 80) % 2 === 0) {
          continue;
        }

        this.renderer.drawPixelData(
          frameData.data,
          centerX,
          centerY,
          PP,
          `sprite_${spriteId}`,
        );

        if (BOSS_TYPES[(entity as Enemy).enemyType]) {
          const bossEnt = entity as Enemy;
          const barWidth = 50;
          const barHeight = 4;
          const barX = screenPos.x + (entity.width - barWidth) / 2;
          const barY = screenPos.y - 10;
          this.renderer.drawRect(barX, barY, barWidth, barHeight, '#333');
          this.renderer.drawRect(barX, barY, barWidth * (bossEnt.hp / bossEnt.maxHp), barHeight, '#c44');
          this.renderer.drawText(bossEnt.enemyType.replace(/_/g, ' '), barX, barY - 6, '#ff6666', String(8));
        }
      }
    }

    this.weather.render(this.renderer, this.camera);

    for (const fx of this.effects) {
      const sp = this.camera.worldToScreen(fx.x, fx.y);
      const progress = 1 - fx.life / fx.maxLife;
      switch (fx.type) {
        case 'slash': {
          const size = 20 + progress * 30;
          this.renderer.drawRect(sp.x - size / 2, sp.y - size / 2, size, size, 'rgba(255,255,255,0.5)');
          break;
        }
        case 'aoe_burst': {
          const radius = progress * 90;
          this.renderer.drawRect(sp.x - radius, sp.y - radius, radius * 2, radius * 2, 'rgba(255,220,50,0.3)');
          break;
        }
        case 'danger_zone': {
          const dr = progress * 120;
          this.renderer.drawRect(sp.x - dr, sp.y - dr, dr * 2, dr * 2, 'rgba(150,0,50,0.25)');
          break;
        }
      }
    }

    for (const proj of this.projectiles) {
      const psp = this.camera.worldToScreen(proj.x, proj.y);
      this.renderer.drawRect(psp.x, psp.y, proj.width, proj.height, '#ff4444');
    }

    for (const particle of this.particles) {
      const psp = this.camera.worldToScreen(particle.x, particle.y);
      if (psp.x >= -5 && psp.x <= GAME_WIDTH + 5 && psp.y >= -5 && psp.y <= GAME_HEIGHT + 5) {
        const alpha = particle.life / particle.maxLife;
        const r = parseInt(particle.color.slice(1, 3), 16);
        const g = parseInt(particle.color.slice(3, 5), 16);
        const b = parseInt(particle.color.slice(5, 7), 16);
        this.renderer.drawRect(psp.x, psp.y, particle.size, particle.size, `rgba(${r},${g},${b},${alpha})`);
      }
    }

    for (const dn of this.damageNumbers) {
      const dsp = this.camera.worldToScreen(dn.x, dn.y);
      const alpha = Math.min(1, dn.timer);
      this.renderer.drawText(dn.text, dsp.x, dsp.y, `rgba(255,255,0,${alpha})`, String(14));
    }

    this.renderUI();
    this.renderMinimap();
  }

  private renderUI(): void {
    const padding = 8;
    const barWidth = 180;
    const barHeight = 12;

    this.renderer.drawRect(padding, padding, barWidth + 4, barHeight + 4, 'rgba(0,0,0,0.6)');
    this.renderer.drawRect(padding + 2, padding + 2, barWidth * (this.player.hp / this.player.maxHp), barHeight, '#c44');
    this.renderer.drawText(`HP ${this.player.hp}/${this.player.maxHp}`, padding + 4, padding + barHeight - 1, '#fff', String(9));
    this.renderer.drawRect(padding, padding + barHeight + 6, barWidth + 4, barHeight + 4, 'rgba(0,0,0,0.6)');
    this.renderer.drawRect(padding + 2, padding + barHeight + 8, barWidth * (this.player.mp / this.player.maxMp), barHeight, '#44aaff');
    this.renderer.drawText(`MP ${this.player.mp}/${this.player.maxMp}`, padding + 4, padding + barHeight * 2 + 5, '#fff', String(9));

    this.renderer.drawText(`Lv.${this.player.level}`, padding, padding + barHeight * 2 + 20, '#ffcc00', String(11));
    this.renderer.drawText(`G:${this.player.gold}`, padding + 50, padding + barHeight * 2 + 20, '#ffdd44', String(11));

    const expBarW = 100;
    this.renderer.drawRect(padding, padding + barHeight * 2 + 30, expBarW + 2, 4, 'rgba(0,0,0,0.5)');
    this.renderer.drawRect(padding + 1, padding + barHeight * 2 + 31, expBarW * (this.player.exp / this.player.expToLevel), 2, '#88cc55');

    if (this.currentQuest && this.currentQuest.accepted && !this.currentQuest.completed) {
      const qy = GAME_HEIGHT - 52;
      this.renderer.drawRect(4, qy, 240, 44, 'rgba(0,0,0,0.65)');
      this.renderer.drawText(`任务: ${this.currentQuest.name}`, 8, qy + 12, '#ffcc44', String(11));
      this.renderer.drawText(`${this.currentQuest.currentCount}/${this.currentQuest.requiredCount} - ${this.currentQuest.description.substring(0, 24)}...`, 8, qy + 28, '#aaa', String(9));
    }

    if (this.showQuestComplete) {
      const qcAlpha = Math.min(1, this.questCompleteTimer);
      this.renderer.drawText('★ 任务完成！ ★', GAME_WIDTH / 2 - 60, GAME_HEIGHT / 2 - 20, `rgba(255,220,50,${qcAlpha})`, String(18));
    }

    if (this.state === GameState.Dialog && this.currentDialogue.length > 0) {
      this.renderDialogueBox();
    }
  }

  private renderDialogueBox(): void {
    const boxX = 40;
    const boxY = GAME_HEIGHT - 160;
    const boxW = GAME_WIDTH - 80;
    const boxH = 140;

    this.renderer.drawRect(boxX, boxY, boxW, boxH, 'rgba(10,10,30,0.92)');
    this.renderer.drawRect(boxX, boxY, boxW, 2, '#8899bb');
    this.renderer.drawRect(boxX, boxY + boxH - 2, boxW, 2, '#8899bb');

    if (this.dialogueIndex < this.currentDialogue.length) {
      const line = this.currentDialogue[this.dialogueIndex];
      const speakerColor = line.speaker === 'player' ? '#88aaff' :
                           line.speaker === this.activeSpeaker ? '#ffcc44' : '#ccc';
      this.renderer.drawText(line.speaker || '???', boxX + 12, boxY + 18, speakerColor, String(13));

      const words = line.text.split('');
      const visibleChars = Math.min(words.length, Math.floor(Date.now() / 30));
      const displayText = words.slice(0, visibleChars).join('');
      this.renderer.drawText(displayText, boxX + 12, boxY + 40, '#eee', String(12));

      if (this.dialogueChoices) {
        this.dialogueChoices.forEach((choice, idx) => {
          const cy = boxY + 75 + idx * 22;
          const bgColor = idx === 0 ? 'rgba(80,120,200,0.4)' : 'transparent';
          this.renderer.drawRect(boxX + 12, cy - 14, boxW - 24, 18, bgColor);
          this.renderer.drawText(`→ ${choice.text}`, boxX + 16, cy, idx === 0 ? '#fff' : '#aaa', String(11));
        });
      } else {
        this.renderer.drawText('▼ 按空格/回车继续', boxX + boxW - 140, boxY + boxH - 14, '#888', String(9));
      }
    }
  }

  private renderMinimap(): void {
    const mapSize = 100;
    const margin = 8;
    const mmX = GAME_WIDTH - mapSize - margin;
    const mmY = margin;
    const map = this.regionManager.getCurrentMap();
    if (!map) return;

    this.renderer.drawRect(mmX - 2, mmY - 2, mapSize + 4, mapSize + 4, 'rgba(0,0,0,0.7)');
    this.renderer.drawRect(mmX, mmY, mapSize, mapSize, 'rgba(20,30,20,0.5)');

    const scaleX = mapSize / (map.data.width * TILE_SIZE);
    const scaleY = mapSize / (map.data.height * TILE_SIZE);

    const viewLeft = this.camera.x;
    const viewTop = this.camera.y;
    const vw = (GAME_WIDTH / scaleX) * scaleX;
    const vh = (GAME_HEIGHT / scaleY) * scaleY;
    this.renderer.drawRect(
      mmX + viewLeft * scaleX,
      mmY + viewTop * scaleY,
      Math.min(vw * scaleX, mapSize),
      Math.min(vh * scaleY, mapSize),
      'rgba(100,150,255,0.3)'
    );

    const px = mmX + this.player.x * scaleX;
    const py = mmY + this.player.y * scaleY;
    this.renderer.drawRect(px - 2, py - 2, 4, 4, '#fff');

    for (const npc of this.npcs) {
      if (!npc.active) continue;
      const nx = mmX + npc.x * scaleX;
      const ny = mmY + npc.y * scaleY;
      this.renderer.drawRect(nx - 1, ny - 1, 2, 2, '#44ff44');
    }

    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const ex = mmX + enemy.x * scaleX;
      const ey = mmY + enemy.y * scaleY;
      this.renderer.drawRect(ex - 1, ey - 1, 2, 2, '#ff3333');
    }
  }

  renderTitleScreen(): void {
    this.renderer.clear();
    this.renderer.ctx.fillStyle = '#0a0a1a';
    this.renderer.ctx.fillRect(0, 0, this.renderer.width, this.renderer.height);

    for (const star of this.titleStars) {
      const alpha = 0.4 + Math.sin(Date.now() * 0.003 * star.speed + star.x) * 0.4;
      const sr = parseInt(`ff`, 16);
      const sg = parseInt(`cc`, 16);
      const sb = parseInt(`ff`, 16);
      this.renderer.drawRect(star.x, star.y, star.size, star.size, `rgba(${sr},${sg},${sb},${alpha})`);
    }

    // @ts-expect-error titleAlphaHex kept for future color-based rendering
    const titleAlphaHex = Math.floor(this.titleAlpha * 255).toString(16).padStart(2, '0');
    this.renderer.drawText('暮光之境', GAME_WIDTH / 2 - 72, GAME_HEIGHT / 2 - 60, `rgba(255,220,150,${this.titleAlpha})`, String(32));
    this.renderer.drawText('陨星回响', GAME_WIDTH / 2 - 54, GAME_HEIGHT / 2 - 24, `rgba(180,180,255,${this.titleAlpha})`, String(24));

    const blinkAlpha = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
    this.renderer.drawText('按 Enter 或 Space 开始游戏', GAME_WIDTH / 2 - 100, GAME_HEIGHT / 2 + 40, `rgba(255,255,255,${blinkAlpha * this.titleAlpha})`, String(14));
    this.renderer.drawText('Twilight Realm: Echoes of the Fallen Star', GAME_WIDTH / 2 - 140, GAME_HEIGHT / 2 + 70, `rgba(150,150,180,${this.titleAlpha * 0.6})`, String(11));
  }

  renderPauseScreen(): void {
    this.render();
    this.renderer.drawRect(GAME_WIDTH / 4, GAME_HEIGHT / 4, GAME_WIDTH / 2, GAME_HEIGHT / 2, 'rgba(0,0,20,0.85)');
    this.renderer.drawText('- 游戏暂停 -', GAME_WIDTH / 2 - 50, GAME_HEIGHT / 2 - 40, '#ffcc44', String(18));
    this.renderer.drawText('按 Esc 或 Enter 继续', GAME_WIDTH / 2 - 70, GAME_HEIGHT / 2 + 10, '#aaa', String(12));
    this.renderer.drawText('R: 重试  S: 存档 (1-3)', GAME_WIDTH / 2 - 80, GAME_HEIGHT / 2 + 35, '#888', String(11));
  }

  renderInventoryScreen(): void {
    this.render();
    this.renderer.drawRect(GAME_WIDTH / 8, GAME_HEIGHT / 8, GAME_WIDTH * 0.75, GAME_HEIGHT * 0.75, 'rgba(10,10,30,0.92)');
    this.renderer.drawText('= 背包 =', GAME_WIDTH / 2 - 35, GAME_HEIGHT / 8 + 15, '#ffcc44', String(16));

    this.renderer.drawText(`武器: ${this.equipment.weapon}`, GAME_WIDTH / 8 + 20, GAME_HEIGHT / 8 + 50, '#ddd', String(12));
    this.renderer.drawText(`护甲: ${this.equipment.armor}`, GAME_WIDTH / 8 + 20, GAME_HEIGHT / 8 + 70, '#ddd', String(12));
    this.renderer.drawText(`饰品: ${this.equipment.accessory || '无'}`, GAME_WIDTH / 8 + 20, GAME_HEIGHT / 8 + 90, '#ddd', String(12));

    this.renderer.drawText('-- 物品 --', GAME_WIDTH / 8 + 20, GAME_HEIGHT / 8 + 120, '#88aaff', String(13));
    this.inventory.forEach((item, idx) => {
      const iy = GAME_HEIGHT / 8 + 145 + idx * 22;
      this.renderer.drawText(`${item.id} x${item.count}`, GAME_WIDTH / 8 + 24, iy, '#bbb', String(11));
    });

    if (this.inventory.length === 0) {
      this.renderer.drawText('(空空如也)', GAME_WIDTH / 8 + 24, GAME_HEIGHT / 8 + 148, '#555', String(11));
    }

    this.renderer.drawText('按 I 或 Esc 关闭', GAME_WIDTH / 2 - 50, GAME_HEIGHT / 8 + GAME_HEIGHT * 0.75 - 30, '#777', String(11));
  }

  renderGameOverScreen(): void {
    this.renderer.clear();
    this.renderer.ctx.fillStyle = '#1a0505';
    this.renderer.ctx.fillRect(0, 0, this.renderer.width, this.renderer.height);
    this.renderer.drawText('你倒下了...', GAME_WIDTH / 2 - 50, GAME_HEIGHT / 2 - 30, '#cc3333', String(24));
    this.renderer.drawText('但星光永不熄灭', GAME_WIDTH / 2 - 55, GAME_HEIGHT / 2 + 10, '#996666', String(16));
    const blinkAlpha = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
    this.renderer.drawText('按 Enter 或 Space 重新开始', GAME_WIDTH / 2 - 90, GAME_HEIGHT / 2 + 60, `rgba(255,255,255,${blinkAlpha})`, String(13));
  }

  renderEndingScreen(): void {
    this.renderer.clear();
    this.renderer.ctx.fillStyle = '#0a0515';
    this.renderer.ctx.fillRect(0, 0, this.renderer.width, this.renderer.height);

    const endingKey = 'good_ending';
    const ending = endings[endingKey];
    if (!ending) return;

    this.renderer.drawText(`— ${ending.title} —`, GAME_WIDTH / 2 - 70, 80 + this._creditsScroll, '#ffdd66', String(22));
    this.renderer.drawText(ending.description, GAME_WIDTH / 2 - 200, 115 + this._creditsScroll, '#bbb', String(12));

    const startY = 155 + this._creditsScroll;
    ending.epilogue.forEach((line, idx) => {
      const ly = startY + idx * 28;
      if (ly > 0 && ly < GAME_HEIGHT - 20) {
        this.renderer.drawText(line, GAME_WIDTH / 2 - 180, ly, `rgba(200,200,220,${Math.min(1, 1 - idx * 0.03)})}`, String(11));
      }
    });

    this.renderer.drawText('感谢游玩 暮光之境：陨星回响', GAME_WIDTH / 2 - 110, GAME_HEIGHT - 40, '#666', String(11));
  }
}
