import {
  Direction,
  GameState,
  Region,
  Vector2,
  Rect,
  SpriteData,
  SpriteFrame,
  SpriteAnimation,
  Entity,
  Player,
  Enemy,
  NPC,
  Projectile,
  Particle,
  SkillDef,
  SkillSlot,
  EnemySkill,
  ItemDef,
  Stats,
  EquipmentSlots,
  InventoryItem,
  DropItem,
  MapTile,
  MapLayer,
  SpawnPoint,
  MapTransition,
  MapData,
  DialogueLine,
  DialogueChoice,
  QuestDef,
  QuestProgress,
  QuestReward,
  SaveData,
  WorldState,
  AIType,
  DamageNumber,
  ChestLoot,
} from './types';

import { InputManager, Camera, Renderer, Physics, GameLoop } from './engine';
import { SpriteRegistry, TileRegistry, getSprite, getTile } from './sprites';
import { TileMap, RegionManager, DayNightCycle, WeatherSystem, regionMaps } from './world';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_BASE_SPEED = 120;
const PLAYER_WIDTH = 20;
const PLAYER_HEIGHT = 28;
const TILE_SIZE = 32;
const INVINCIBLE_DURATION = 1.0;
const DASH_COOLDOWN = 1.0;
const DASH_SPEED = 400;
const DASH_DURATION = 0.15;
const ATTACK_COOLDOWN = 0.5;
const ATTACK_RANGE = 36;
const ENEMY_DEACTIVATE_RANGE = 400;
const MINIMAP_WIDTH = 120;
const MINIMAP_HEIGHT = 90;
const DEATH_GOLD_PENALTY = 0.1;
const KNOCKBACK_FORCE = 150;
const KNOCKBACK_DURATION = 0.2;
const DIALOGUE_RANGE = 48;
const BOSS_PHASE2_MELEE_SKILL: EnemySkill = {
  id: 'boss_slam',
  name: '猛击',
  damage: 1.5,
  cooldown: 3,
  range: 60,
  type: 'melee',
};
const BOSS_PHASE2_RANGED_SKILL: EnemySkill = {
  id: 'boss_barrage',
  name: '弹幕',
  damage: 1.0,
  cooldown: 4,
  range: 200,
  type: 'ranged',
  projectileSpeed: 200,
  projectileSprite: 'void_particle',
};
const BOSS_PHASE2_AOE_SKILL: EnemySkill = {
  id: 'boss_aoe',
  name: '范围攻击',
  damage: 1.2,
  cooldown: 5,
  range: 80,
  type: 'aoe',
};

const GameData = {
  skills: {
    slash: {
      id: 'slash',
      name: '基础斩击',
      description: '基本的近战攻击',
      mpCost: 0,
      damage: 1.5,
      cooldown: 0.5,
      range: 36,
      type: 'melee' as const,
      spriteEffect: 'slash',
      unlockLevel: 1,
    },
    power_strike: {
      id: 'power_strike',
      name: '强力打击',
      description: '蓄力后发出强力一击',
      mpCost: 10,
      damage: 2.5,
      cooldown: 3,
      range: 40,
      type: 'melee' as const,
      spriteEffect: 'slash',
      unlockLevel: 3,
    },
    fireball: {
      id: 'fireball',
      name: '火球术',
      description: '发射一枚火球攻击远处敌人',
      mpCost: 15,
      damage: 2.0,
      cooldown: 4,
      range: 200,
      type: 'ranged' as const,
      spriteEffect: 'fire_particle',
      unlockLevel: 5,
    },
    ice_shard: {
      id: 'ice_shard',
      name: '冰晶刺',
      description: '发射冰晶刺穿敌人',
      mpCost: 12,
      damage: 1.8,
      cooldown: 3,
      range: 180,
      type: 'ranged' as const,
      spriteEffect: 'ice_particle',
      unlockLevel: 7,
    },
    heal: {
      id: 'heal',
      name: '治愈之光',
      description: '恢复30%最大生命值',
      mpCost: 20,
      damage: 0.3,
      cooldown: 8,
      range: 0,
      type: 'heal' as const,
      spriteEffect: 'heal',
      unlockLevel: 4,
    },
    dash_strike: {
      id: 'dash_strike',
      name: '疾风突刺',
      description: '向前冲刺并攻击',
      mpCost: 8,
      damage: 2.0,
      cooldown: 2,
      range: 60,
      type: 'melee' as const,
      spriteEffect: 'slash',
      unlockLevel: 6,
    },
    thunder: {
      id: 'thunder',
      name: '雷霆一击',
      description: '召唤雷电攻击周围敌人',
      mpCost: 25,
      damage: 3.0,
      cooldown: 6,
      range: 80,
      type: 'aoe' as const,
      spriteEffect: 'magic_burst',
      unlockLevel: 10,
    },
    star_blade: {
      id: 'star_blade',
      name: '星陨之刃',
      description: '以星辰之力斩击敌人',
      mpCost: 30,
      damage: 4.0,
      cooldown: 8,
      range: 50,
      type: 'melee' as const,
      spriteEffect: 'level_up',
      unlockLevel: 15,
    },
  } as Record<string, SkillDef>,

  items: {
    health_potion: {
      id: 'health_potion',
      name: '生命药水',
      description: '恢复50点生命值',
      type: 'consumable' as const,
      rarity: 'common' as const,
      effect: 'restore_hp_50',
      value: 25,
      spriteId: 'health_potion',
    },
    mana_potion: {
      id: 'mana_potion',
      name: '魔力药水',
      description: '恢复30点魔力值',
      type: 'consumable' as const,
      rarity: 'common' as const,
      effect: 'restore_mp_30',
      value: 30,
      spriteId: 'mana_potion',
    },
    elixir: {
      id: 'elixir',
      name: '万灵药',
      description: '完全恢复生命和魔力',
      type: 'consumable' as const,
      rarity: 'rare' as const,
      effect: 'restore_full',
      value: 200,
      spriteId: 'gold_coins',
    },
    rusty_sword: {
      id: 'rusty_sword',
      name: '锈剑',
      description: '生锈的旧剑',
      type: 'weapon' as const,
      rarity: 'common' as const,
      stats: { attack: 3 },
      value: 15,
      spriteId: 'iron_sword',
    },
    iron_sword: {
      id: 'iron_sword',
      name: '铁剑',
      description: '坚固的铁制长剑',
      type: 'weapon' as const,
      rarity: 'uncommon' as const,
      stats: { attack: 7 },
      value: 50,
      spriteId: 'iron_sword',
    },
    steel_sword: {
      id: 'steel_sword',
      name: '钢剑',
      description: '锋利的钢制长剑',
      type: 'weapon' as const,
      rarity: 'rare' as const,
      stats: { attack: 12 },
      value: 120,
      spriteId: 'steel_sword',
    },
    star_blade_weapon: {
      id: 'star_blade_weapon',
      name: '星陨之刃',
      description: '蕴含星辰之力的传说之剑',
      type: 'weapon' as const,
      rarity: 'legendary' as const,
      stats: { attack: 25, speed: 3 },
      value: 500,
      spriteId: 'star_blade',
    },
    leather_armor: {
      id: 'leather_armor',
      name: '皮甲',
      description: '轻便的皮革护甲',
      type: 'armor' as const,
      rarity: 'common' as const,
      stats: { defense: 3 },
      value: 30,
      spriteId: 'leather_armor',
    },
    chain_mail: {
      id: 'chain_mail',
      name: '锁子甲',
      description: '环环相扣的铁甲',
      type: 'armor' as const,
      rarity: 'uncommon' as const,
      stats: { defense: 7 },
      value: 80,
      spriteId: 'chain_mail',
    },
    holy_plate: {
      id: 'holy_plate',
      name: '圣光板甲',
      description: '神圣力量加持的重甲',
      type: 'armor' as const,
      rarity: 'epic' as const,
      stats: { defense: 15, hp: 20 },
      value: 250,
      spriteId: 'holy_plate',
    },
    ring_of_power: {
      id: 'ring_of_power',
      name: '力量之戒',
      description: '增强攻击力的魔法戒指',
      type: 'accessory' as const,
      rarity: 'uncommon' as const,
      stats: { attack: 5 },
      value: 60,
      spriteId: 'ring',
    },
    amulet_of_life: {
      id: 'amulet_of_life',
      name: '生命护符',
      description: '增加生命值的护身符',
      type: 'accessory' as const,
      rarity: 'uncommon' as const,
      stats: { hp: 30 },
      value: 70,
      spriteId: 'amulet',
    },
    star_fragment: {
      id: 'star_fragment',
      name: '星陨碎片',
      description: '陨落星辰的碎片，全面提升能力',
      type: 'accessory' as const,
      rarity: 'legendary' as const,
      stats: { attack: 5, defense: 5, hp: 5, mp: 5, speed: 5 },
      value: 400,
      spriteId: 'star_fragment',
    },
    wood: {
      id: 'wood',
      name: '木材',
      description: '普通的木材',
      type: 'material' as const,
      rarity: 'common' as const,
      value: 5,
      spriteId: 'chest',
    },
    iron_ore: {
      id: 'iron_ore',
      name: '铁矿石',
      description: '含有铁的矿石',
      type: 'material' as const,
      rarity: 'common' as const,
      value: 10,
      spriteId: 'chest',
    },
    crystal_shard: {
      id: 'crystal_shard',
      name: '水晶碎片',
      description: '散发微光的水晶碎片',
      type: 'material' as const,
      rarity: 'uncommon' as const,
      value: 25,
      spriteId: 'star_fragment',
    },
    void_essence: {
      id: 'void_essence',
      name: '虚空精华',
      description: '来自虚空的神秘物质',
      type: 'material' as const,
      rarity: 'rare' as const,
      value: 50,
      spriteId: 'star_fragment',
    },
    forest_key: {
      id: 'forest_key',
      name: '森林之钥',
      description: '打开森林深处大门的钥匙',
      type: 'key' as const,
      rarity: 'epic' as const,
      value: 0,
      spriteId: 'chest',
    },
    desert_key: {
      id: 'desert_key',
      name: '沙漠之钥',
      description: '打开沙漠遗迹大门的钥匙',
      type: 'key' as const,
      rarity: 'epic' as const,
      value: 0,
      spriteId: 'chest',
    },
    snow_key: {
      id: 'snow_key',
      name: '雪原之钥',
      description: '打开冰龙巢穴的钥匙',
      type: 'key' as const,
      rarity: 'epic' as const,
      value: 0,
      spriteId: 'chest',
    },
    ruins_key: {
      id: 'ruins_key',
      name: '废墟之钥',
      description: '打开虚空深处大门的钥匙',
      type: 'key' as const,
      rarity: 'epic' as const,
      value: 0,
      spriteId: 'chest',
    },
  } as Record<string, ItemDef>,

  enemies: {
    slime: {
      enemyId: 'slime',
      name: '史莱姆',
      hp: 30, maxHp: 30, mp: 0, maxMp: 0,
      attack: 5, defense: 2, speed: 40,
      exp: 15, goldDrop: 5,
      spriteId: 'slime',
      aggroRange: 120, attackRange: 28,
      attackCooldown: 1.5,
      drops: [
        { itemId: 'health_potion', chance: 0.3, quantityMin: 1, quantityMax: 1 },
      ],
      skills: [],
      ai: 'idle' as AIType,
    },
    wolf: {
      enemyId: 'wolf',
      name: '灰狼',
      hp: 50, maxHp: 50, mp: 0, maxMp: 0,
      attack: 10, defense: 4, speed: 70,
      exp: 25, goldDrop: 10,
      spriteId: 'wolf',
      aggroRange: 160, attackRange: 32,
      attackCooldown: 1.2,
      drops: [
        { itemId: 'wood', chance: 0.4, quantityMin: 1, quantityMax: 2 },
        { itemId: 'health_potion', chance: 0.2, quantityMin: 1, quantityMax: 1 },
      ],
      skills: [],
      ai: 'patrol' as AIType,
    },
    tree_spirit: {
      enemyId: 'tree_spirit',
      name: '树精',
      hp: 80, maxHp: 80, mp: 0, maxMp: 0,
      attack: 15, defense: 8, speed: 30,
      exp: 40, goldDrop: 20,
      spriteId: 'tree_spirit',
      aggroRange: 140, attackRange: 36,
      attackCooldown: 2.0,
      drops: [
        { itemId: 'wood', chance: 0.5, quantityMin: 1, quantityMax: 3 },
        { itemId: 'crystal_shard', chance: 0.15, quantityMin: 1, quantityMax: 1 },
      ],
      skills: [
        { id: 'root_attack', name: '根须缠绕', damage: 1.3, cooldown: 4, range: 60, type: 'ranged' as const, projectileSpeed: 100, projectileSprite: 'holy_particle' },
      ],
      ai: 'idle' as AIType,
    },
    scorpion: {
      enemyId: 'scorpion',
      name: '沙蝎',
      hp: 60, maxHp: 60, mp: 0, maxMp: 0,
      attack: 12, defense: 6, speed: 50,
      exp: 30, goldDrop: 15,
      spriteId: 'scorpion',
      aggroRange: 130, attackRange: 30,
      attackCooldown: 1.5,
      drops: [
        { itemId: 'iron_ore', chance: 0.3, quantityMin: 1, quantityMax: 2 },
        { itemId: 'health_potion', chance: 0.25, quantityMin: 1, quantityMax: 1 },
      ],
      skills: [
        { id: 'sting', name: '毒刺', damage: 1.5, cooldown: 3, range: 40, type: 'melee' as const },
      ],
      ai: 'patrol' as AIType,
    },
    mummy: {
      enemyId: 'mummy',
      name: '木乃伊',
      hp: 90, maxHp: 90, mp: 0, maxMp: 0,
      attack: 18, defense: 10, speed: 35,
      exp: 50, goldDrop: 25,
      spriteId: 'mummy',
      aggroRange: 150, attackRange: 32,
      attackCooldown: 2.0,
      drops: [
        { itemId: 'mana_potion', chance: 0.3, quantityMin: 1, quantityMax: 1 },
        { itemId: 'iron_ore', chance: 0.4, quantityMin: 1, quantityMax: 2 },
      ],
      skills: [
        { id: 'bandage_throw', name: '绷带投掷', damage: 1.2, cooldown: 3, range: 120, type: 'ranged' as const, projectileSpeed: 150, projectileSprite: 'holy_particle' },
      ],
      ai: 'idle' as AIType,
    },
    ice_elemental: {
      enemyId: 'ice_elemental',
      name: '冰元素',
      hp: 70, maxHp: 70, mp: 0, maxMp: 0,
      attack: 16, defense: 12, speed: 45,
      exp: 45, goldDrop: 22,
      spriteId: 'ice_elemental',
      aggroRange: 160, attackRange: 100,
      attackCooldown: 2.5,
      drops: [
        { itemId: 'crystal_shard', chance: 0.35, quantityMin: 1, quantityMax: 2 },
        { itemId: 'mana_potion', chance: 0.25, quantityMin: 1, quantityMax: 1 },
      ],
      skills: [
        { id: 'ice_bolt', name: '冰弹', damage: 1.4, cooldown: 3, range: 150, type: 'ranged' as const, projectileSpeed: 180, projectileSprite: 'ice_particle' },
      ],
      ai: 'idle' as AIType,
    },
    void_creature: {
      enemyId: 'void_creature',
      name: '虚空生物',
      hp: 100, maxHp: 100, mp: 0, maxMp: 0,
      attack: 22, defense: 14, speed: 55,
      exp: 65, goldDrop: 35,
      spriteId: 'void_creature',
      aggroRange: 170, attackRange: 90,
      attackCooldown: 2.0,
      drops: [
        { itemId: 'void_essence', chance: 0.3, quantityMin: 1, quantityMax: 1 },
        { itemId: 'crystal_shard', chance: 0.25, quantityMin: 1, quantityMax: 2 },
      ],
      skills: [
        { id: 'void_bolt', name: '虚空弹', damage: 1.5, cooldown: 3, range: 160, type: 'ranged' as const, projectileSpeed: 200, projectileSprite: 'void_particle' },
        { id: 'void_claw', name: '虚空之爪', damage: 1.8, cooldown: 4, range: 40, type: 'melee' as const },
      ],
      ai: 'chase' as AIType,
    },
    holy_knight: {
      enemyId: 'holy_knight',
      name: '圣殿骑士',
      hp: 120, maxHp: 120, mp: 0, maxMp: 0,
      attack: 25, defense: 18, speed: 50,
      exp: 80, goldDrop: 45,
      spriteId: 'holy_knight',
      aggroRange: 180, attackRange: 36,
      attackCooldown: 1.8,
      drops: [
        { itemId: 'chain_mail', chance: 0.1, quantityMin: 1, quantityMax: 1 },
        { itemId: 'elixir', chance: 0.05, quantityMin: 1, quantityMax: 1 },
        { itemId: 'iron_ore', chance: 0.4, quantityMin: 1, quantityMax: 3 },
      ],
      skills: [
        { id: 'holy_slash', name: '圣光斩', damage: 2.0, cooldown: 3, range: 44, type: 'melee' as const },
        { id: 'holy_bolt', name: '圣光弹', damage: 1.3, cooldown: 4, range: 150, type: 'ranged' as const, projectileSpeed: 220, projectileSprite: 'holy_particle' },
      ],
      ai: 'chase' as AIType,
    },
  } as Record<string, typeof GameData.enemies.slime>,

  bosses: {
    ancient_tree_spirit: {
      enemyId: 'ancient_tree_spirit',
      name: '远古树精',
      hp: 500, maxHp: 500, mp: 0, maxMp: 0,
      attack: 25, defense: 15, speed: 30,
      exp: 200, goldDrop: 100,
      spriteId: 'ancient_tree_spirit',
      aggroRange: 200, attackRange: 50,
      attackCooldown: 2.5,
      drops: [
        { itemId: 'forest_key', chance: 1.0, quantityMin: 1, quantityMax: 1 },
        { itemId: 'crystal_shard', chance: 0.5, quantityMin: 2, quantityMax: 4 },
        { itemId: 'health_potion', chance: 0.8, quantityMin: 2, quantityMax: 5 },
      ],
      skills: [
        { id: 'root_slam', name: '根须猛击', damage: 1.5, cooldown: 3, range: 60, type: 'melee' as const },
        { id: 'leaf_storm', name: '落叶风暴', damage: 1.2, cooldown: 5, range: 150, type: 'ranged' as const, projectileSpeed: 120, projectileSprite: 'holy_particle' },
      ],
      ai: 'boss' as AIType,
      phaseThreshold: 0.5,
    },
    scorpion_king: {
      enemyId: 'scorpion_king',
      name: '蝎王',
      hp: 700, maxHp: 700, mp: 0, maxMp: 0,
      attack: 30, defense: 18, speed: 40,
      exp: 350, goldDrop: 150,
      spriteId: 'scorpion_king',
      aggroRange: 220, attackRange: 55,
      attackCooldown: 2.0,
      drops: [
        { itemId: 'desert_key', chance: 1.0, quantityMin: 1, quantityMax: 1 },
        { itemId: 'iron_ore', chance: 0.6, quantityMin: 3, quantityMax: 6 },
        { itemId: 'elixir', chance: 0.3, quantityMin: 1, quantityMax: 1 },
      ],
      skills: [
        { id: 'king_sting', name: '王者之刺', damage: 2.0, cooldown: 3, range: 50, type: 'melee' as const },
        { id: 'sand_barrage', name: '沙弹连射', damage: 1.0, cooldown: 4, range: 180, type: 'ranged' as const, projectileSpeed: 160, projectileSprite: 'fire_particle' },
      ],
      ai: 'boss' as AIType,
      phaseThreshold: 0.5,
    },
    ice_dragon: {
      enemyId: 'ice_dragon',
      name: '冰龙',
      hp: 900, maxHp: 900, mp: 0, maxMp: 0,
      attack: 35, defense: 22, speed: 45,
      exp: 500, goldDrop: 200,
      spriteId: 'ice_dragon',
      aggroRange: 250, attackRange: 80,
      attackCooldown: 2.5,
      drops: [
        { itemId: 'snow_key', chance: 1.0, quantityMin: 1, quantityMax: 1 },
        { itemId: 'crystal_shard', chance: 0.7, quantityMin: 3, quantityMax: 6 },
        { itemId: 'elixir', chance: 0.4, quantityMin: 1, quantityMax: 2 },
      ],
      skills: [
        { id: 'ice_breath', name: '冰霜吐息', damage: 1.8, cooldown: 4, range: 120, type: 'ranged' as const, projectileSpeed: 200, projectileSprite: 'ice_particle' },
        { id: 'tail_swipe', name: '尾击', damage: 2.0, cooldown: 3, range: 60, type: 'melee' as const },
      ],
      ai: 'boss' as AIType,
      phaseThreshold: 0.5,
    },
    void_devourer: {
      enemyId: 'void_devourer',
      name: '虚空吞噬者',
      hp: 1200, maxHp: 1200, mp: 0, maxMp: 0,
      attack: 40, defense: 25, speed: 50,
      exp: 700, goldDrop: 300,
      spriteId: 'void_devourer',
      aggroRange: 260, attackRange: 70,
      attackCooldown: 2.0,
      drops: [
        { itemId: 'ruins_key', chance: 1.0, quantityMin: 1, quantityMax: 1 },
        { itemId: 'void_essence', chance: 0.6, quantityMin: 2, quantityMax: 5 },
        { itemId: 'star_fragment', chance: 0.1, quantityMin: 1, quantityMax: 1 },
      ],
      skills: [
        { id: 'void_ray', name: '虚空射线', damage: 1.8, cooldown: 3, range: 200, type: 'ranged' as const, projectileSpeed: 250, projectileSprite: 'void_particle' },
        { id: 'devour', name: '吞噬', damage: 2.5, cooldown: 5, range: 50, type: 'melee' as const },
      ],
      ai: 'boss' as AIType,
      phaseThreshold: 0.5,
    },
    fallen_saint: {
      enemyId: 'fallen_saint',
      name: '堕圣',
      hp: 1500, maxHp: 1500, mp: 0, maxMp: 0,
      attack: 50, defense: 30, speed: 55,
      exp: 1000, goldDrop: 500,
      spriteId: 'fallen_saint',
      aggroRange: 280, attackRange: 60,
      attackCooldown: 1.8,
      drops: [
        { itemId: 'star_blade_weapon', chance: 1.0, quantityMin: 1, quantityMax: 1 },
        { itemId: 'star_fragment', chance: 0.5, quantityMin: 1, quantityMax: 2 },
        { itemId: 'elixir', chance: 0.6, quantityMin: 2, quantityMax: 5 },
      ],
      skills: [
        { id: 'holy_judgment', name: '圣光审判', damage: 2.0, cooldown: 3, range: 100, type: 'aoe' as const },
        { id: 'fallen_blade', name: '堕天之刃', damage: 2.5, cooldown: 4, range: 55, type: 'melee' as const },
        { id: 'divine_ray', name: '神罚之光', damage: 1.5, cooldown: 5, range: 220, type: 'ranged' as const, projectileSpeed: 280, projectileSprite: 'holy_particle' },
      ],
      ai: 'boss' as AIType,
      phaseThreshold: 0.4,
    },
  } as Record<string, typeof GameData.bosses.ancient_tree_spirit & { phaseThreshold: number }>,

  dialogues: {
    eileen_greeting: [
      { id: 'eileen_1', speaker: '艾琳', text: '欢迎来到翠影森林，旅行者。', next: 'eileen_2' },
      { id: 'eileen_2', speaker: '艾琳', text: '这片森林最近不太平静，远处似乎有奇怪的声音传来...', next: 'eileen_3' },
      { id: 'eileen_3', speaker: '艾琳', text: '如果你要去北方探索，请务必小心。', choices: [
        { text: '我会小心的', next: 'eileen_4a' },
        { text: '有什么值得注意的？', next: 'eileen_4b' },
      ]},
      { id: 'eileen_4a', speaker: '艾琳', text: '祝你好运，勇敢的旅行者。', action: 'set_flag:talked_eileen' },
      { id: 'eileen_4b', speaker: '艾琳', text: '北方的古树似乎觉醒了，有旅人称看到了巨大的树影在移动。', next: 'eileen_4a' },
    ],
    gregor_greeting: [
      { id: 'gregor_1', speaker: '格雷戈', text: '嘿！你看起来像个能打的。', next: 'gregor_2' },
      { id: 'gregor_2', speaker: '格雷戈', text: '我这里有些装备，也许能帮到你。', next: 'gregor_3' },
      { id: 'gregor_3', speaker: '格雷戈', text: '需要看看我的商品吗？', choices: [
        { text: '看看商品', next: 'gregor_shop' },
        { text: '不了，谢谢', next: 'gregor_bye' },
      ]},
      { id: 'gregor_shop', speaker: '格雷戈', text: '好东西不便宜，但物有所值！', action: 'open_shop:gregor' },
      { id: 'gregor_bye', speaker: '格雷戈', text: '随时欢迎你回来。', action: 'set_flag:talked_gregor' },
    ],
    kashim_greeting: [
      { id: 'kashim_1', speaker: '卡希姆', text: '沙漠不是随便能闯的地方，朋友。', next: 'kashim_2' },
      { id: 'kashim_2', speaker: '卡希姆', text: '蝎王的领地在东北方，没有足够的实力别去送死。', next: 'kashim_3' },
      { id: 'kashim_3', speaker: '卡希姆', text: '不过如果你执意要去...我有些东西可以帮你。', action: 'give_item:health_potion:3' },
    ],
    vera_greeting: [
      { id: 'vera_1', speaker: '薇拉', text: '冰原的风很冷，但更冷的是人心。', next: 'vera_2' },
      { id: 'vera_2', speaker: '薇拉', text: '冰龙栖息在北方的冰洞中，它守护着某种古老的力量。', next: 'vera_3' },
      { id: 'vera_3', speaker: '薇拉', text: '如果你能击败它，也许能找到通往废墟的路。', action: 'set_flag:talked_vera' },
    ],
    noah_greeting: [
      { id: 'noah_1', speaker: '诺亚', text: '你不该来到这里，旅行者。', next: 'noah_2' },
      { id: 'noah_2', speaker: '诺亚', text: '虚空的裂隙正在扩大，吞噬者已经苏醒。', next: 'noah_3' },
      { id: 'noah_3', speaker: '诺亚', text: '只有星陨之刃才能封印它...但那把剑在圣城之中。', next: 'noah_4' },
      { id: 'noah_4', speaker: '诺亚', text: '去圣城吧，找到那把剑，拯救这个世界。', action: 'set_flag:quest_star_blade' },
    ],
    guard_captain_greeting: [
      { id: 'guard_1', speaker: '卫兵队长', text: '圣城不欢迎陌生人。', next: 'guard_2' },
      { id: 'guard_2', speaker: '卫兵队长', text: '但如果你能证明自己的实力...', next: 'guard_3' },
      { id: 'guard_3', speaker: '卫兵队长', text: '堕圣在圣塔顶端，只有最强的勇者才敢挑战。', action: 'set_flag:talked_guard' },
    ],
  } as Record<string, DialogueLine[]>,

  quests: {
    forest_exploration: {
      id: 'forest_exploration',
      name: '森林探索',
      description: '探索翠影森林，击败远古树精',
      type: 'boss' as const,
      target: 'ancient_tree_spirit',
      required: 1,
      reward: { exp: 100, gold: 50, items: ['forest_key'] },
      prerequisite: 'talked_eileen',
    },
    desert_expedition: {
      id: 'desert_expedition',
      name: '沙漠远征',
      description: '穿越灼沙荒漠，击败蝎王',
      type: 'boss' as const,
      target: 'scorpion_king',
      required: 1,
      reward: { exp: 200, gold: 100, items: ['desert_key'] },
      prerequisite: 'forest_exploration',
    },
    snow_conquest: {
      id: 'snow_conquest',
      name: '雪原征服',
      description: '征服霜寂雪原，击败冰龙',
      type: 'boss' as const,
      target: 'ice_dragon',
      required: 1,
      reward: { exp: 350, gold: 150, items: ['snow_key'] },
      prerequisite: 'desert_expedition',
    },
    ruins_descent: {
      id: 'ruins_descent',
      name: '废墟深入',
      description: '深入星陨废墟，击败虚空吞噬者',
      type: 'boss' as const,
      target: 'void_devourer',
      required: 1,
      reward: { exp: 500, gold: 200, items: ['ruins_key'] },
      prerequisite: 'snow_conquest',
    },
    final_battle: {
      id: 'final_battle',
      name: '最终决战',
      description: '登上暮光圣塔，击败堕圣',
      type: 'boss' as const,
      target: 'fallen_saint',
      required: 1,
      reward: { exp: 1000, gold: 500, items: ['star_blade_weapon'] },
      prerequisite: 'quest_star_blade',
    },
  } as Record<string, QuestDef>,

  chestLoot: {
    chest_forest_1: [{ itemId: 'health_potion', quantity: 2 }, { itemId: 'wood', quantity: 3 }],
    chest_forest_2: [{ itemId: 'leather_armor', quantity: 1 }],
    chest_forest_3: [{ itemId: 'iron_sword', quantity: 1 }, { itemId: 'crystal_shard', quantity: 1 }],
    chest_desert_1: [{ itemId: 'mana_potion', quantity: 2 }, { itemId: 'iron_ore', quantity: 3 }],
    chest_desert_2: [{ itemId: 'chain_mail', quantity: 1 }],
    chest_desert_3: [{ itemId: 'steel_sword', quantity: 1 }],
    chest_desert_4: [{ itemId: 'elixir', quantity: 1 }],
    chest_snow_1: [{ itemId: 'crystal_shard', quantity: 3 }, { itemId: 'mana_potion', quantity: 2 }],
    chest_snow_2: [{ itemId: 'holy_plate', quantity: 1 }],
    chest_snow_3: [{ itemId: 'elixir', quantity: 1 }, { itemId: 'health_potion', quantity: 3 }],
    chest_ruins_1: [{ itemId: 'void_essence', quantity: 2 }],
    chest_ruins_2: [{ itemId: 'ring_of_power', quantity: 1 }],
    chest_ruins_3: [{ itemId: 'amulet_of_life', quantity: 1 }],
    chest_ruins_4: [{ itemId: 'elixir', quantity: 2 }],
    chest_ruins_5: [{ itemId: 'star_fragment', quantity: 1 }],
    chest_holy_1: [{ itemId: 'elixir', quantity: 3 }],
    chest_holy_2: [{ itemId: 'holy_plate', quantity: 1 }, { itemId: 'elixir', quantity: 2 }],
    chest_holy_3: [{ itemId: 'star_blade_weapon', quantity: 1 }],
  } as Record<string, ChestLoot[]>,

  regionWeather: {
    [Region.Forest]: 'rain' as const,
    [Region.Desert]: 'sandstorm' as const,
    [Region.Snow]: 'snow' as const,
    [Region.Ruins]: 'voidstorm' as const,
    [Region.HolyCity]: 'clear' as const,
  },
};

let nextEntityId = 1;
function generateEntityId(): string {
  return `entity_${nextEntityId++}`;
}

class Game {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  camera: Camera;
  input: InputManager;
  gameLoop: GameLoop;
  regionManager: RegionManager;
  dayNight: DayNightCycle;
  weather: WeatherSystem;

  player!: Player;
  entities: Entity[] = [];
  projectiles: Projectile[] = [];
  particles: Particle[] = [];
  damageNumbers: DamageNumber[] = [];

  gameState: GameState = GameState.Title;
  currentDialogue: DialogueLine | null = null;
  dialogueQueue: DialogueLine[] = [];
  dialogueTypewriterIndex: number = 0;
  dialogueTypewriterTimer: number = 0;

  private transitionAlpha: number = 0;
  private transitioning: boolean = false;
  private transitionTarget: { region: Region; x: number; y: number } | null = null;
  private transitionPhase: 'out' | 'in' | 'none' = 'none';

  private playTime: number = 0;
  private lastRegionEntrance: Vector2 = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.camera = new Camera();
    this.camera.width = GAME_WIDTH;
    this.camera.height = GAME_HEIGHT;
    this.input = new InputManager();
    this.regionManager = new RegionManager();
    this.dayNight = new DayNightCycle();
    this.weather = new WeatherSystem();
    this.gameLoop = new GameLoop(
      (dt: number) => this.update(dt),
      () => this.render(),
    );
  }

  init(): void {
    this.player = this.createPlayer();
    this.regionManager.loadRegion(Region.Forest);
    this.player.x = 40 * TILE_SIZE;
    this.player.y = 50 * TILE_SIZE;
    this.lastRegionEntrance = { x: this.player.x, y: this.player.y };
    this.setWeatherForRegion(Region.Forest);
    this.gameState = GameState.Title;
    this.gameLoop.start();
  }

  newGame(): void {
    this.player = this.createPlayer();
    this.entities = [];
    this.projectiles = [];
    this.particles = [];
    this.damageNumbers = [];
    this.gameState = GameState.Playing;
    this.currentDialogue = null;
    this.dialogueQueue = [];
    this.playTime = 0;
    this.transitionAlpha = 0;
    this.transitioning = false;
    this.transitionPhase = 'none';
    this.transitionTarget = null;

    this.regionManager.clearCache();
    this.regionManager.loadRegion(Region.Forest);
    this.player.x = 40 * TILE_SIZE;
    this.player.y = 50 * TILE_SIZE;
    this.lastRegionEntrance = { x: this.player.x, y: this.player.y };

    this.setWeatherForRegion(Region.Forest);
    this.spawnEntitiesForRegion();
  }

  loadGame(slot: number): boolean {
    try {
      const raw = localStorage.getItem(`twilight_save_${slot}`);
      if (!raw) return false;
      const save: SaveData = JSON.parse(raw);
      this.newGame();

      const pd = save.playerData;
      if (pd.x !== undefined) this.player.x = pd.x;
      if (pd.y !== undefined) this.player.y = pd.y;
      if (pd.hp !== undefined) this.player.hp = pd.hp;
      if (pd.maxHp !== undefined) this.player.maxHp = pd.maxHp;
      if (pd.mp !== undefined) this.player.mp = pd.mp;
      if (pd.maxMp !== undefined) this.player.maxMp = pd.maxMp;
      if (pd.attack !== undefined) this.player.attack = pd.attack;
      if (pd.defense !== undefined) this.player.defense = pd.defense;
      if (pd.speed !== undefined) this.player.speed = pd.speed;
      if (pd.level !== undefined) this.player.level = pd.level;
      if (pd.exp !== undefined) this.player.exp = pd.exp;
      if (pd.expToNext !== undefined) this.player.expToNext = pd.expToNext;
      if (pd.gold !== undefined) this.player.gold = pd.gold;
      if (pd.skills !== undefined) this.player.skills = pd.skills;
      if (pd.equipment !== undefined) this.player.equipment = pd.equipment;
      if (pd.inventory !== undefined) this.player.inventory = pd.inventory;
      if (pd.storyFlags !== undefined) this.player.storyFlags = pd.storyFlags;
      if (pd.questProgress !== undefined) this.player.questProgress = pd.questProgress;
      if (pd.direction !== undefined) this.player.direction = pd.direction;

      const ws = save.worldState;
      this.regionManager.clearCache();
      this.regionManager.loadRegion(ws.currentRegion);
      this.player.x = ws.playerX;
      this.player.y = ws.playerY;
      this.player.storyFlags = ws.storyFlags;
      this.player.questProgress = ws.questProgress;
      this.lastRegionEntrance = { x: ws.playerX, y: ws.playerY };
      this.playTime = save.playTime;

      this.setWeatherForRegion(ws.currentRegion);
      this.spawnEntitiesForRegion();
      this.gameState = GameState.Playing;
      return true;
    } catch {
      return false;
    }
  }

  saveGame(slot: number): void {
    const ws: WorldState = {
      currentRegion: this.regionManager.getCurrentRegion() ?? Region.Forest,
      playerX: this.player.x,
      playerY: this.player.y,
      defeatedBosses: [],
      openedChests: [],
      npcStates: {},
      storyFlags: { ...this.player.storyFlags },
      questProgress: this.player.questProgress.map(q => ({ ...q })),
      regionUnlocked: {},
    };
    for (const e of this.entities) {
      if ((e.type === 'boss') && e.hp <= 0) {
        ws.defeatedBosses.push((e as Enemy).enemyId);
      }
    }
    const save: SaveData = {
      slot,
      timestamp: Date.now(),
      playerName: '旅人',
      playerData: { ...this.player },
      worldState: ws,
      playTime: this.playTime,
    };
    localStorage.setItem(`twilight_save_${slot}`, JSON.stringify(save));
  }

  update(dt: number): void {
    if (this.gameState === GameState.Title) return;
    if (this.gameState === GameState.GameOver) return;

    this.playTime += dt;
    this.input.clearFrameState();

    if (this.gameState === GameState.Paused) {
      if (this.input.isKeyPressed('KeyP') || this.input.isKeyPressed('Escape')) {
        this.gameState = GameState.Playing;
      }
      return;
    }

    if (this.gameState === GameState.Inventory) {
      if (this.input.isKeyPressed('KeyI') || this.input.isKeyPressed('Escape')) {
        this.gameState = GameState.Playing;
      }
      return;
    }

    if (this.transitionPhase !== 'none') {
      this.updateTransition(dt);
      return;
    }

    if (this.gameState === GameState.Playing) {
      this.dayNight.update(dt);
      this.weather.update(dt);
      this.updatePlayer(dt);
      this.updateEntities(dt);
      this.updateCombat(dt);
      this.updateProjectiles(dt);
      this.updateParticles(dt);
      this.updateDamageNumbers(dt);
      this.camera.follow(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
      this.camera.update(dt);
      this.weather.setCameraBounds(this.camera.x, this.camera.y, this.camera.width, this.camera.height);
      this.checkTransitions();
    }

    if (this.gameState === GameState.Dialog) {
      this.updateDialogue(dt);
    }
  }

  updatePlayer(dt: number): void {
    if (this.player.hp <= 0) return;

    if (this.player.invincible) {
      this.player.invincibleTimer -= dt;
      if (this.player.invincibleTimer <= 0) {
        this.player.invincible = false;
        this.player.invincibleTimer = 0;
      }
    }

    if (this.player.dashCooldown > 0) this.player.dashCooldown -= dt;
    if (this.player.attackCooldown > 0) this.player.attackCooldown -= dt;
    for (let i = 0; i < this.player.skillCooldowns.length; i++) {
      if (this.player.skillCooldowns[i] > 0) this.player.skillCooldowns[i] -= dt;
    }

    let dx = 0;
    let dy = 0;
    if (this.input.isKeyDown('ArrowLeft') || this.input.isKeyDown('KeyA')) dx -= 1;
    if (this.input.isKeyDown('ArrowRight') || this.input.isKeyDown('KeyD')) dx += 1;
    if (this.input.isKeyDown('ArrowUp') || this.input.isKeyDown('KeyW')) dy -= 1;
    if (this.input.isKeyDown('ArrowDown') || this.input.isKeyDown('KeyS')) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;

      if (Math.abs(dx) > Math.abs(dy)) {
        this.player.direction = dx > 0 ? Direction.Right : Direction.Left;
      } else {
        this.player.direction = dy > 0 ? Direction.Down : Direction.Up;
      }
    }

    const stats = this.getPlayerStats();
    const speed = stats.speed;
    this.player.vx = dx * speed;
    this.player.vy = dy * speed;

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    const map = this.regionManager.getCurrentMap();
    const mapData = map.getData();
    Physics.resolveCollision(this.player, mapData.collisions, mapData.width, mapData.tileSize);

    this.updatePlayerAnimation(dx, dy);

    if (this.input.isKeyPressed('Space')) {
      this.playerAttack();
    }

    for (let i = 0; i < 4; i++) {
      if (this.input.isKeyPressed(`Digit${i + 1}`)) {
        this.playerUseSkill(i);
      }
    }

    if (this.input.isKeyPressed('ShiftLeft') || this.input.isKeyPressed('ShiftRight')) {
      this.playerDash();
    }

    if (this.input.isKeyPressed('KeyE')) {
      this.tryInteract();
    }

    if (this.input.isKeyPressed('KeyP')) {
      if (this.gameState === GameState.Playing) {
        this.gameState = GameState.Paused;
      }
    }

    if (this.input.isKeyPressed('KeyI')) {
      if (this.gameState === GameState.Playing) {
        this.gameState = GameState.Inventory;
      } else if (this.gameState === GameState.Inventory) {
        this.gameState = GameState.Playing;
      }
    }
  }

  updatePlayerAnimation(dx: number, dy: number): void {
    if (this.player.attackCooldown > ATTACK_COOLDOWN * 0.5) {
      this.player.currentAnimation = 'attack';
    } else if (this.player.dashCooldown > DASH_COOLDOWN - DASH_DURATION) {
      this.player.currentAnimation = 'dash';
    } else if (this.player.invincible && this.player.invincibleTimer > INVINCIBLE_DURATION - 0.2) {
      this.player.currentAnimation = 'hurt';
    } else if (dx !== 0 || dy !== 0) {
      switch (this.player.direction) {
        case Direction.Down: this.player.currentAnimation = 'walk_down'; break;
        case Direction.Up: this.player.currentAnimation = 'walk_up'; break;
        case Direction.Left: this.player.currentAnimation = 'walk_left'; break;
        case Direction.Right: this.player.currentAnimation = 'walk_right'; break;
      }
    } else {
      this.player.currentAnimation = 'idle';
    }

    const sprite = getSprite(this.player.spriteId);
    if (sprite) {
      const anim = sprite.animations[this.player.currentAnimation];
      if (anim) {
        this.player.animationTimer += 1 / 60;
        if (this.player.animationTimer >= anim.frameDuration / 1000) {
          this.player.animationTimer = 0;
          this.player.animationFrame++;
          if (this.player.animationFrame >= anim.frames.length) {
            this.player.animationFrame = anim.loop ? 0 : anim.frames.length - 1;
          }
        }
      }
    }
  }

  updateEntities(dt: number): void {
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (!e.active) {
        this.entities.splice(i, 1);
        continue;
      }

      const distToPlayer = Math.sqrt(
        (e.x - this.player.x) ** 2 + (e.y - this.player.y) ** 2
      );

      if (e.type === 'enemy' || e.type === 'boss') {
        if (distToPlayer > ENEMY_DEACTIVATE_RANGE) continue;
        this.updateEnemy(e as Enemy, dt, distToPlayer);
      } else if (e.type === 'npc') {
        this.updateNPC(e as NPC, dt);
      }

      if (e.invincible) {
        e.invincibleTimer -= dt;
        if (e.invincibleTimer <= 0) {
          e.invincible = false;
          e.invincibleTimer = 0;
        }
      }

      const sprite = getSprite(e.spriteId);
      if (sprite) {
        const anim = sprite.animations[e.currentAnimation];
        if (anim) {
          e.animationTimer += dt;
          if (e.animationTimer >= anim.frameDuration / 1000) {
            e.animationTimer = 0;
            e.animationFrame++;
            if (e.animationFrame >= anim.frames.length) {
              e.animationFrame = anim.loop ? 0 : anim.frames.length - 1;
            }
          }
        }
      }
    }
  }

  updateEnemy(enemy: Enemy, dt: number, distToPlayer: number): void {
    if (enemy.hp <= 0) {
      this.handleEnemyDeath(enemy);
      return;
    }

    if (enemy.attackTimer > 0) enemy.attackTimer -= dt;

    const bossData = GameData.bosses[enemy.enemyId];
    if (bossData) {
      const hpRatio = enemy.hp / enemy.maxHp;
      const threshold = bossData.phaseThreshold ?? 0.5;
      if (hpRatio <= threshold && (enemy.phase ?? 1) < 2) {
        enemy.phase = 2;
        enemy.attackCooldown *= 0.7;
        enemy.speed *= 1.2;
        if (enemy.skills.length < 4) {
          enemy.skills.push(BOSS_PHASE2_MELEE_SKILL, BOSS_PHASE2_RANGED_SKILL);
        }
        this.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 20, '#ff4400', 100, 0.8, true);
        this.screenShake(5, 0.5);
      }
    }

    if (distToPlayer <= enemy.aggroRange) {
      if (enemy.ai === 'idle' || enemy.ai === 'patrol') {
        enemy.ai = 'chase';
      }
    } else {
      if (enemy.ai === 'chase') {
        enemy.ai = 'idle';
      }
    }

    switch (enemy.ai) {
      case 'idle':
        enemy.currentAnimation = 'idle';
        break;

      case 'patrol': {
        const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
        const wanderAngle = angle + (Math.random() - 0.5) * Math.PI;
        enemy.vx = Math.cos(wanderAngle) * enemy.speed * 0.3;
        enemy.vy = Math.sin(wanderAngle) * enemy.speed * 0.3;
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        const map = this.regionManager.getCurrentMap();
        Physics.resolveCollision(enemy, map.getData().collisions, map.getData().width, map.getData().tileSize);
        enemy.currentAnimation = 'walk';
        break;
      }

      case 'chase': {
        const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
        enemy.vx = Math.cos(angle) * enemy.speed;
        enemy.vy = Math.sin(angle) * enemy.speed;
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        const map = this.regionManager.getCurrentMap();
        Physics.resolveCollision(enemy, map.getData().collisions, map.getData().width, map.getData().tileSize);

        if (Math.abs(enemy.vx) > Math.abs(enemy.vy)) {
          enemy.direction = enemy.vx > 0 ? Direction.Right : Direction.Left;
        } else {
          enemy.direction = enemy.vy > 0 ? Direction.Down : Direction.Up;
        }

        if (distToPlayer <= enemy.attackRange) {
          enemy.ai = 'attack';
        } else {
          enemy.currentAnimation = 'walk';
        }
        break;
      }

      case 'attack': {
        if (enemy.attackTimer <= 0) {
          this.enemyAttack(enemy);
          enemy.attackTimer = enemy.attackCooldown;
        }
        if (distToPlayer > enemy.attackRange * 1.3) {
          enemy.ai = 'chase';
        }
        enemy.currentAnimation = 'attack';
        break;
      }

      case 'boss': {
        if (distToPlayer <= enemy.aggroRange) {
          if (distToPlayer <= enemy.attackRange) {
            if (enemy.attackTimer <= 0) {
              this.bossAttack(enemy);
              enemy.attackTimer = enemy.attackCooldown;
            }
            enemy.currentAnimation = 'attack';
          } else {
            const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
            enemy.vx = Math.cos(angle) * enemy.speed;
            enemy.vy = Math.sin(angle) * enemy.speed;
            enemy.x += enemy.vx * dt;
            enemy.y += enemy.vy * dt;
            const map = this.regionManager.getCurrentMap();
            Physics.resolveCollision(enemy, map.getData().collisions, map.getData().width, map.getData().tileSize);
            enemy.currentAnimation = 'walk';
          }
        } else {
          enemy.currentAnimation = 'idle';
        }
        break;
      }

      case 'retreat': {
        const angle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
        enemy.vx = Math.cos(angle) * enemy.speed * 0.5;
        enemy.vy = Math.sin(angle) * enemy.speed * 0.5;
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        const map = this.regionManager.getCurrentMap();
        Physics.resolveCollision(enemy, map.getData().collisions, map.getData().width, map.getData().tileSize);
        if (distToPlayer > enemy.aggroRange * 1.5) {
          enemy.ai = 'idle';
        }
        break;
      }
    }
  }

  enemyAttack(enemy: Enemy): void {
    const stats = this.getPlayerStats();
    const damage = Math.max(1, enemy.attack - stats.defense * 0.5);
    this.dealDamageToPlayer(damage);
  }

  bossAttack(enemy: Enemy): void {
    if (enemy.skills.length === 0) {
      this.enemyAttack(enemy);
      return;
    }

    const skill = enemy.skills[Math.floor(Math.random() * enemy.skills.length)];
    const stats = this.getPlayerStats();

    if (skill.type === 'melee') {
      const distToPlayer = Math.sqrt(
        (enemy.x - this.player.x) ** 2 + (enemy.y - this.player.y) ** 2
      );
      if (distToPlayer <= skill.range) {
        const damage = Math.max(1, enemy.attack * skill.damage - stats.defense * 0.5);
        this.dealDamageToPlayer(damage);
        this.screenShake(3, 0.3);
      }
    } else if (skill.type === 'ranged' && skill.projectileSpeed) {
      const angle = Math.atan2(
        this.player.y - enemy.y,
        this.player.x - enemy.x
      );
      this.spawnProjectile(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2,
        Math.cos(angle),
        Math.sin(angle),
        skill.projectileSpeed,
        enemy.attack * skill.damage,
        enemy.id,
        skill.projectileSprite,
      );
    } else if (skill.type === 'aoe') {
      const distToPlayer = Math.sqrt(
        (enemy.x - this.player.x) ** 2 + (enemy.y - this.player.y) ** 2
      );
      if (distToPlayer <= skill.range) {
        const damage = Math.max(1, enemy.attack * skill.damage - stats.defense * 0.3);
        this.dealDamageToPlayer(damage);
        this.spawnParticles(this.player.x, this.player.y, 15, '#ffcc00', 80, 0.6, false);
        this.screenShake(4, 0.4);
      }
    }
  }

  updateNPC(npc: NPC, _dt: number): void {
    npc.currentAnimation = 'idle';
  }

  updateCombat(dt: number): void {
    for (const e of this.entities) {
      if (e.type !== 'enemy' && e.type !== 'boss') continue;
      if (e.hp <= 0 || this.player.hp <= 0) continue;
      if (this.player.invincible) continue;

      const dist = Math.sqrt(
        (e.x + e.width / 2 - this.player.x - this.player.width / 2) ** 2 +
        (e.y + e.height / 2 - this.player.y - this.player.height / 2) ** 2
      );

      if (dist < (e.width + this.player.width) / 2) {
        const stats = this.getPlayerStats();
        const damage = Math.max(1, (e as Enemy).attack * 0.5 - stats.defense * 0.3);
        this.dealDamageToPlayer(damage);
      }
    }
  }

  updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.lifetime -= dt;

      const map = this.regionManager.getCurrentMap();
      const mapData = map.getData();
      const tileX = Math.floor(p.x / mapData.tileSize);
      const tileY = Math.floor(p.y / mapData.tileSize);
      if (tileX < 0 || tileX >= mapData.width || tileY < 0 || tileY >= mapData.height) {
        this.projectiles.splice(i, 1);
        continue;
      }
      if (mapData.collisions[tileY][tileX]) {
        this.spawnParticles(p.x, p.y, 5, '#ffffff', 50, 0.3, false);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.lifetime <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.owner === this.player.id) {
        for (const e of this.entities) {
          if (e.type !== 'enemy' && e.type !== 'boss') continue;
          if (e.hp <= 0) continue;
          if (Physics.rectIntersect(
            { x: p.x - 4, y: p.y - 4, w: 8, h: 8 },
            { x: e.x, y: e.y, w: e.width, h: e.height }
          )) {
            const stats = this.getPlayerStats();
            const damage = Math.max(1, p.damage - e.defense * 0.3);
            this.dealDamageToEntity(e, damage);
            this.spawnParticles(p.x, p.y, 8, '#ffcc00', 60, 0.4, false);
            this.projectiles.splice(i, 1);
            break;
          }
        }
      } else {
        if (!this.player.invincible && Physics.rectIntersect(
          { x: p.x - 4, y: p.y - 4, w: 8, h: 8 },
          { x: this.player.x, y: this.player.y, w: this.player.width, h: this.player.height }
        )) {
          const stats = this.getPlayerStats();
          const damage = Math.max(1, p.damage - stats.defense * 0.3);
          this.dealDamageToPlayer(damage);
          this.spawnParticles(p.x, p.y, 8, '#ff4444', 60, 0.4, false);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += 200 * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  updateDamageNumbers(dt: number): void {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.y += dn.vy * dt;
      dn.timer -= dt;
      if (dn.timer <= 0) {
        this.damageNumbers.splice(i, 1);
      }
    }
  }

  updateTransition(dt: number): void {
    if (this.transitionPhase === 'out') {
      this.transitionAlpha += dt * 3;
      if (this.transitionAlpha >= 1) {
        this.transitionAlpha = 1;
        if (this.transitionTarget) {
          this.regionManager.loadRegion(this.transitionTarget.region);
          this.player.x = this.transitionTarget.x * TILE_SIZE;
          this.player.y = this.transitionTarget.y * TILE_SIZE;
          this.lastRegionEntrance = { x: this.player.x, y: this.player.y };
          this.entities = [];
          this.projectiles = [];
          this.particles = [];
          this.setWeatherForRegion(this.transitionTarget.region);
          this.spawnEntitiesForRegion();
          this.transitionTarget = null;
        }
        this.transitionPhase = 'in';
      }
    } else if (this.transitionPhase === 'in') {
      this.transitionAlpha -= dt * 3;
      if (this.transitionAlpha <= 0) {
        this.transitionAlpha = 0;
        this.transitionPhase = 'none';
        this.gameState = GameState.Playing;
      }
    }
  }

  render(): void {
    this.renderer.clear('#000000');

    this.renderWorld();
    this.renderEntities();
    this.renderParticles();
    this.renderEffects();
    this.renderDayNight();
    this.renderWeather();
    this.renderMinimap();

    if (this.transitionPhase !== 'none') {
      this.renderer.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT, `rgba(0,0,0,${this.transitionAlpha})`);
    }
  }

  renderWorld(): void {
    const map = this.regionManager.getCurrentMap();
    map.render(this.renderer, this.camera);
  }

  renderEntities(): void {
    const sorted = [...this.entities].sort((a, b) => a.y - b.y);
    const allEntities: Entity[] = [this.player, ...sorted];
    for (const e of allEntities) {
      if (!this.camera.isVisible(e.x, e.y, e.width, e.height)) continue;

      if (e.invincible && Math.floor(e.invincibleTimer * 10) % 2 === 0) continue;

      const sprite = getSprite(e.spriteId);
      if (!sprite) continue;

      const anim = sprite.animations[e.currentAnimation] || sprite.animations['idle'];
      if (!anim) continue;

      const frame = anim.frames[e.animationFrame % anim.frames.length];
      const screen = this.camera.worldToScreen(e.x, e.y);
      const flipX = e.direction === Direction.Left;
      this.renderer.drawSprite(sprite, frame, screen.sx, screen.sy, flipX);

      if (e.type === 'enemy' || e.type === 'boss') {
        const enemy = e as Enemy;
        if (enemy.hp < enemy.maxHp) {
          const barWidth = enemy.width;
          const barHeight = 3;
          const barX = screen.sx;
          const barY = screen.sy - 6;
          this.renderer.drawRect(barX, barY, barWidth, barHeight, '#333333');
          const hpRatio = enemy.hp / enemy.maxHp;
          const hpColor = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffcc00' : '#ff4444';
          this.renderer.drawRect(barX, barY, barWidth * hpRatio, barHeight, hpColor);
        }

        if (e.type === 'boss') {
          const bossName = (e as Enemy).name;
          this.renderer.drawText(bossName, screen.sx, screen.sy - 14, '#ffffff', 6);
        }
      }
    }
  }

  renderParticles(): void {
    for (const p of this.particles) {
      const screen = this.camera.worldToScreen(p.x, p.y);
      const alpha = Math.min(1, p.life / (p.maxLife * 0.3));
      this.renderer.drawCircle(screen.sx, screen.sy, p.size * alpha, p.color);
    }
  }

  renderEffects(): void {
    for (const dn of this.damageNumbers) {
      const screen = this.camera.worldToScreen(dn.x, dn.y);
      const alpha = Math.min(1, dn.timer / 0.5);
      this.renderer.drawText(
        Math.round(dn.value).toString(),
        screen.sx,
        screen.sy,
        dn.color,
        8,
      );
    }

    for (const p of this.projectiles) {
      const screen = this.camera.worldToScreen(p.x, p.y);
      const spriteOverride = p.spriteOverride ? getSprite(p.spriteOverride) : null;
      if (spriteOverride) {
        const anim = spriteOverride.animations['idle'];
        if (anim && anim.frames.length > 0) {
          this.renderer.drawSprite(spriteOverride, anim.frames[0], screen.sx - 8, screen.sy - 8, false);
        }
      } else {
        this.renderer.drawCircle(screen.sx, screen.sy, 3, '#ffff00');
      }
    }
  }

  renderDayNight(): void {
    const color = this.dayNight.getAmbientColor();
    this.renderer.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT, color);
  }

  renderWeather(): void {
    this.weather.render(this.renderer, this.camera);
  }

  renderMinimap(): void {
    const mx = GAME_WIDTH - MINIMAP_WIDTH - 8;
    const my = 8;
    this.renderer.drawRect(mx - 1, my - 1, MINIMAP_WIDTH + 2, MINIMAP_HEIGHT + 2, '#000000');
    this.renderer.drawRect(mx, my, MINIMAP_WIDTH, MINIMAP_HEIGHT, '#1a1a2e');

    const map = this.regionManager.getCurrentMap();
    const mapData = map.getData();
    const scaleX = MINIMAP_WIDTH / (mapData.width * mapData.tileSize);
    const scaleY = MINIMAP_HEIGHT / (mapData.height * mapData.tileSize);

    const region = this.regionManager.getCurrentRegion();
    const tileColors = this.getRegionMinimapColors(region);

    for (let y = 0; y < mapData.height; y += 2) {
      for (let x = 0; x < mapData.width; x += 2) {
        if (!mapData.collisions[y][x]) {
          const tileId = mapData.layers[0].data[y][x];
          const color = tileColors[tileId] || '#3a3a3a';
          this.renderer.drawRect(
            mx + x * mapData.tileSize * scaleX,
            my + y * mapData.tileSize * scaleY,
            Math.max(1, mapData.tileSize * 2 * scaleX),
            Math.max(1, mapData.tileSize * 2 * scaleY),
            color,
          );
        }
      }
    }

    const playerMX = mx + (this.player.x + this.player.width / 2) * scaleX;
    const playerMY = my + (this.player.y + this.player.height / 2) * scaleY;
    this.renderer.drawCircle(playerMX, playerMY, 2, '#ffffff');

    for (const e of this.entities) {
      if (e.type === 'enemy' || e.type === 'boss') {
        const ex = mx + (e.x + e.width / 2) * scaleX;
        const ey = my + (e.y + e.height / 2) * scaleY;
        this.renderer.drawCircle(ex, ey, e.type === 'boss' ? 2 : 1, '#ff4444');
      } else if (e.type === 'npc') {
        const ex = mx + (e.x + e.width / 2) * scaleX;
        const ey = my + (e.y + e.height / 2) * scaleY;
        this.renderer.drawCircle(ex, ey, 1, '#44ff44');
      }
    }
  }

  renderHUD(): void {
    const stats = this.getPlayerStats();

    this.renderer.drawRect(8, 8, 200, 70, 'rgba(0,0,0,0.6)');

    this.renderer.drawRect(12, 12, 160, 12, '#333333');
    const hpRatio = this.player.hp / stats.hp;
    this.renderer.drawRect(12, 12, 160 * hpRatio, 12, '#ff4444');
    this.renderer.drawText(`HP: ${Math.ceil(this.player.hp)}/${stats.hp}`, 14, 13, '#ffffff', 7);

    this.renderer.drawRect(12, 28, 160, 12, '#333333');
    const mpRatio = this.player.mp / stats.mp;
    this.renderer.drawRect(12, 28, 160 * mpRatio, 12, '#4488ff');
    this.renderer.drawText(`MP: ${Math.ceil(this.player.mp)}/${stats.mp}`, 14, 29, '#ffffff', 7);

    this.renderer.drawText(`Lv.${this.player.level}`, 12, 44, '#ffcc00', 7);
    this.renderer.drawRect(50, 44, 120, 8, '#333333');
    const expRatio = this.player.exp / this.player.expToNext;
    this.renderer.drawRect(50, 44, 120 * expRatio, 8, '#44ff44');

    this.renderer.drawText(`金币: ${this.player.gold}`, 12, 56, '#ffcc00', 7);

    const skillBarY = GAME_HEIGHT - 40;
    this.renderer.drawRect(8, skillBarY - 4, 200, 36, 'rgba(0,0,0,0.6)');
    const skillKeys = ['slash', 'power_strike', 'fireball', 'ice_shard'];
    for (let i = 0; i < 4; i++) {
      const sx = 16 + i * 48;
      const skillId = skillKeys[i];
      const skill = GameData.skills[skillId];
      if (!skill) continue;
      const unlocked = this.player.level >= skill.unlockLevel;
      const onCooldown = this.player.skillCooldowns[i] > 0;
      const bg = !unlocked ? '#333333' : onCooldown ? '#555555' : '#2a5a8c';
      this.renderer.drawRect(sx, skillBarY, 40, 28, bg);
      this.renderer.drawText(`${i + 1}`, sx + 2, skillBarY + 2, '#ffffff', 6);
      this.renderer.drawText(skill.name.substring(0, 2), sx + 4, skillBarY + 14, '#ffffff', 6);
      if (onCooldown) {
        const cdRatio = this.player.skillCooldowns[i] / skill.cooldown;
        this.renderer.drawRect(sx, skillBarY, 40, 28 * cdRatio, 'rgba(0,0,0,0.5)');
      }
    }

    const regionName = this.regionManager.getRegionName();
    this.renderer.drawText(regionName, GAME_WIDTH / 2 - 40, 8, '#ffffff', 8);

    const timeName = this.dayNight.getTimeName();
    this.renderer.drawText(timeName, GAME_WIDTH / 2 - 20, 20, '#cccccc', 6);
  }

  renderDialogue(): void {
    if (!this.currentDialogue) return;

    const boxY = GAME_HEIGHT - 140;
    this.renderer.drawRect(20, boxY, GAME_WIDTH - 40, 120, 'rgba(0,0,0,0.85)');
    this.renderer.drawRect(20, boxY, GAME_WIDTH - 40, 120, '#4a4a6a', false);

    this.renderer.drawText(this.currentDialogue.speaker, 30, boxY + 8, '#ffcc00', 8);

    const displayText = this.currentDialogue.text.substring(0, this.dialogueTypewriterIndex);
    this.renderer.drawText(displayText, 30, boxY + 28, '#ffffff', 7);

    if (this.currentDialogue.choices && this.dialogueTypewriterIndex >= this.currentDialogue.text.length) {
      for (let i = 0; i < this.currentDialogue.choices.length; i++) {
        const choice = this.currentDialogue.choices[i];
        const cy = boxY + 50 + i * 18;
        this.renderer.drawText(`${i + 1}. ${choice.text}`, 40, cy, '#aaccff', 7);
      }
    }

    if (this.dialogueTypewriterIndex >= this.currentDialogue.text.length && !this.currentDialogue.choices) {
      this.renderer.drawText('▼ 按空格继续', GAME_WIDTH - 150, boxY + 100, '#888888', 6);
    }
  }

  renderPause(): void {
    this.renderer.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT, 'rgba(0,0,0,0.6)');
    this.renderer.drawText('暂停', GAME_WIDTH / 2 - 30, GAME_HEIGHT / 2 - 20, '#ffffff', 16);
    this.renderer.drawText('按 P 继续', GAME_WIDTH / 2 - 40, GAME_HEIGHT / 2 + 20, '#aaaaaa', 8);
    this.renderer.drawText('按 F5 快速保存', GAME_WIDTH / 2 - 50, GAME_HEIGHT / 2 + 40, '#aaaaaa', 7);
  }

  renderInventory(): void {
    this.renderer.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT, 'rgba(0,0,0,0.8)');
    this.renderer.drawText('背包', GAME_WIDTH / 2 - 20, 20, '#ffffff', 12);

    const stats = this.getPlayerStats();
    this.renderer.drawText(`攻击: ${stats.attack}  防御: ${stats.defense}  生命: ${stats.hp}  魔力: ${stats.mp}  速度: ${stats.speed}`, 20, 50, '#cccccc', 7);

    this.renderer.drawText('装备:', 20, 75, '#ffcc00', 8);
    const eq = this.player.equipment;
    this.renderer.drawText(`武器: ${eq.weapon ? GameData.items[eq.weapon]?.name || '无' : '无'}`, 30, 90, '#ffffff', 7);
    this.renderer.drawText(`护甲: ${eq.armor ? GameData.items[eq.armor]?.name || '无' : '无'}`, 30, 102, '#ffffff', 7);
    this.renderer.drawText(`饰品: ${eq.accessory ? GameData.items[eq.accessory]?.name || '无' : '无'}`, 30, 114, '#ffffff', 7);

    this.renderer.drawText('物品:', 20, 135, '#ffcc00', 8);
    for (let i = 0; i < this.player.inventory.length && i < 15; i++) {
      const item = this.player.inventory[i];
      const def = GameData.items[item.itemId];
      if (!def) continue;
      const row = Math.floor(i / 3);
      const col = i % 3;
      this.renderer.drawText(`${def.name} x${item.quantity}`, 30 + col * 220, 150 + row * 16, '#ffffff', 7);
    }

    this.renderer.drawText('按 I 关闭', GAME_WIDTH / 2 - 40, GAME_HEIGHT - 30, '#888888', 7);
  }

  renderGameOver(): void {
    this.renderer.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT, 'rgba(80,0,0,0.8)');
    this.renderer.drawText('你倒下了...', GAME_WIDTH / 2 - 60, GAME_HEIGHT / 2 - 30, '#ff4444', 16);
    this.renderer.drawText('按 R 重新开始', GAME_WIDTH / 2 - 60, GAME_HEIGHT / 2 + 20, '#aaaaaa', 8);
  }

  renderTitle(): void {
    this.renderer.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT, '#0a0a1e');
    this.renderer.drawText('暮光之境：陨星回响', GAME_WIDTH / 2 - 120, 150, '#c0a020', 16);
    this.renderer.drawText('按 Enter 开始游戏', GAME_WIDTH / 2 - 80, 300, '#888888', 8);
    this.renderer.drawText('按 L 读取存档', GAME_WIDTH / 2 - 60, 330, '#888888', 8);
  }

  playerAttack(): void {
    if (this.player.attackCooldown > 0) return;
    this.player.attackCooldown = ATTACK_COOLDOWN;

    const stats = this.getPlayerStats();
    let hitX = this.player.x;
    let hitY = this.player.y;
    const offset = ATTACK_RANGE;

    switch (this.player.direction) {
      case Direction.Up: hitY -= offset; break;
      case Direction.Down: hitY += offset; break;
      case Direction.Left: hitX -= offset; break;
      case Direction.Right: hitX += offset; break;
    }

    const hitbox: Rect = {
      x: hitX - 16,
      y: hitY - 16,
      w: 32,
      h: 32,
    };

    this.spawnParticles(hitX, hitY, 3, '#ffffff', 40, 0.2, false);

    for (const e of this.entities) {
      if (e.type !== 'enemy' && e.type !== 'boss') continue;
      if (e.hp <= 0) continue;

      const entityRect: Rect = { x: e.x, y: e.y, w: e.width, h: e.height };
      if (Physics.rectIntersect(hitbox, entityRect)) {
        const damage = Math.max(1, stats.attack * 1.5 - e.defense * 0.5);
        this.dealDamageToEntity(e, damage);
        this.applyKnockback(e, this.player.x, this.player.y, KNOCKBACK_FORCE);
      }
    }
  }

  playerUseSkill(slot: number): void {
    const skillKeys = ['slash', 'power_strike', 'fireball', 'ice_shard'];
    const skillId = skillKeys[slot];
    if (!skillId) return;

    const skill = GameData.skills[skillId];
    if (!skill) return;
    if (this.player.level < skill.unlockLevel) return;
    if (this.player.skillCooldowns[slot] > 0) return;
    if (this.player.mp < skill.mpCost) return;

    this.player.mp -= skill.mpCost;
    this.player.skillCooldowns[slot] = skill.cooldown;

    const stats = this.getPlayerStats();

    if (skill.type === 'melee') {
      let hitX = this.player.x;
      let hitY = this.player.y;
      switch (this.player.direction) {
        case Direction.Up: hitY -= skill.range; break;
        case Direction.Down: hitY += skill.range; break;
        case Direction.Left: hitX -= skill.range; break;
        case Direction.Right: hitX += skill.range; break;
      }

      const hitbox: Rect = { x: hitX - 20, y: hitY - 20, w: 40, h: 40 };
      this.spawnParticles(hitX, hitY, 8, '#ffcc00', 60, 0.3, false);

      for (const e of this.entities) {
        if (e.type !== 'enemy' && e.type !== 'boss') continue;
        if (e.hp <= 0) continue;
        const entityRect: Rect = { x: e.x, y: e.y, w: e.width, h: e.height };
        if (Physics.rectIntersect(hitbox, entityRect)) {
          const damage = Math.max(1, stats.attack * skill.damage - e.defense * 0.5);
          this.dealDamageToEntity(e, damage);
          this.applyKnockback(e, this.player.x, this.player.y, KNOCKBACK_FORCE * 1.5);
        }
      }

      if (skillId === 'dash_strike') {
        this.playerDash();
      }
    } else if (skill.type === 'ranged') {
      const angle = Math.atan2(
        this.player.y - this.player.y,
        this.player.x - this.player.x
      );
      let dx = 0, dy = 0;
      switch (this.player.direction) {
        case Direction.Up: dy = -1; break;
        case Direction.Down: dy = 1; break;
        case Direction.Left: dx = -1; break;
        case Direction.Right: dx = 1; break;
      }
      this.spawnProjectile(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        dx, dy, 250,
        stats.attack * skill.damage,
        this.player.id,
        skill.spriteEffect,
      );
    } else if (skill.type === 'aoe') {
      const aoeRange = skill.range;
      this.spawnParticles(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 20, '#ffcc00', 80, 0.5, false);
      this.screenShake(3, 0.3);

      for (const e of this.entities) {
        if (e.type !== 'enemy' && e.type !== 'boss') continue;
        if (e.hp <= 0) continue;
        const dist = Math.sqrt(
          (e.x + e.width / 2 - this.player.x - this.player.width / 2) ** 2 +
          (e.y + e.height / 2 - this.player.y - this.player.height / 2) ** 2
        );
        if (dist <= aoeRange) {
          const damage = Math.max(1, stats.attack * skill.damage - e.defense * 0.3);
          this.dealDamageToEntity(e, damage);
        }
      }
    } else if (skill.type === 'heal') {
      const healAmount = Math.floor(stats.hp * skill.damage);
      this.player.hp = Math.min(stats.hp, this.player.hp + healAmount);
      this.spawnParticles(this.player.x + this.player.width / 2, this.player.y, 10, '#44ff44', 40, 0.8, false);
      this.spawnDamageNumber(this.player.x, this.player.y - 10, healAmount, '#44ff44');
    }
  }

  playerDash(): void {
    if (this.player.dashCooldown > 0) return;
    this.player.dashCooldown = DASH_COOLDOWN;
    this.player.invincible = true;
    this.player.invincibleTimer = DASH_DURATION;

    let dx = 0, dy = 0;
    switch (this.player.direction) {
      case Direction.Up: dy = -1; break;
      case Direction.Down: dy = 1; break;
      case Direction.Left: dx = -1; break;
      case Direction.Right: dx = 1; break;
    }

    this.player.x += dx * DASH_SPEED * DASH_DURATION;
    this.player.y += dy * DASH_SPEED * DASH_DURATION;

    const map = this.regionManager.getCurrentMap();
    Physics.resolveCollision(this.player, map.getData().collisions, map.getData().width, map.getData().tileSize);

    this.spawnParticles(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 5, '#aaccff', 30, 0.3, false);
  }

  dealDamage(attacker: Entity, target: Entity, multiplier: number): void {
    const damage = Math.max(1, attacker.attack * multiplier - target.defense * 0.5);
    target.hp -= damage;
    if (target.hp < 0) target.hp = 0;
    this.spawnDamageNumber(target.x + target.width / 2, target.y, damage, '#ff4444');
    this.spawnParticles(target.x + target.width / 2, target.y + target.height / 2, 5, '#ff6666', 50, 0.3, false);
  }

  dealDamageToEntity(entity: Entity, damage: number): void {
    if (entity.invincible) return;
    entity.hp -= damage;
    if (entity.hp < 0) entity.hp = 0;
    entity.invincible = true;
    entity.invincibleTimer = 0.2;
    this.spawnDamageNumber(entity.x + entity.width / 2, entity.y, damage, '#ff4444');
    this.spawnParticles(entity.x + entity.width / 2, entity.y + entity.height / 2, 5, '#ff6666', 50, 0.3, false);
  }

  dealDamageToPlayer(damage: number): void {
    if (this.player.invincible) return;
    this.player.hp -= damage;
    this.player.invincible = true;
    this.player.invincibleTimer = INVINCIBLE_DURATION;
    this.spawnDamageNumber(this.player.x + this.player.width / 2, this.player.y, damage, '#ff4444');
    this.screenShake(2, 0.15);

    if (this.player.hp <= 0) {
      this.handlePlayerDeath();
    }
  }

  applyKnockback(entity: Entity, fromX: number, fromY: number, force: number): void {
    const angle = Math.atan2(entity.y - fromY, entity.x - fromX);
    entity.x += Math.cos(angle) * force * 0.1;
    entity.y += Math.sin(angle) * force * 0.1;
  }

  spawnProjectile(x: number, y: number, dx: number, dy: number, speed: number, damage: number, owner: string, sprite?: string): void {
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;
    const ndx = dx / len;
    const ndy = dy / len;
    this.projectiles.push({
      id: generateEntityId(),
      type: 'projectile',
      x, y,
      width: 8, height: 8,
      vx: ndx * speed,
      vy: ndy * speed,
      direction: Direction.Right,
      hp: 1, maxHp: 1, mp: 0, maxMp: 0,
      attack: 0, defense: 0, speed: 0,
      spriteId: sprite || 'magic_burst',
      currentAnimation: 'idle',
      animationFrame: 0,
      animationTimer: 0,
      invincible: false, invincibleTimer: 0,
      active: true,
      damage,
      lifetime: 3,
      owner,
      spriteOverride: sprite,
    });
  }

  spawnParticles(x: number, y: number, count: number, color: string, speed: number, life: number, gravity: boolean = false): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * speed;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life,
        maxLife: life,
        color,
        size: 1 + Math.random() * 2,
        gravity,
      });
    }
  }

  spawnDamageNumber(x: number, y: number, value: number, color: string): void {
    this.damageNumbers.push({
      x: x + (Math.random() - 0.5) * 10,
      y,
      value,
      color,
      timer: 1.0,
      vy: -40,
    });
  }

  spawnEntity(spawn: SpawnPoint): void {
    const map = this.regionManager.getCurrentMap();
    const mapData = map.getData();

    if (spawn.type === 'enemy') {
      const def = GameData.enemies[spawn.entityId];
      if (!def) return;
      const entity: Enemy = {
        id: generateEntityId(),
        type: 'enemy',
        x: spawn.x * TILE_SIZE,
        y: spawn.y * TILE_SIZE,
        width: 24, height: 24,
        vx: 0, vy: 0,
        direction: Direction.Down,
        hp: def.hp, maxHp: def.maxHp,
        mp: def.mp, maxMp: def.maxMp,
        attack: def.attack, defense: def.defense, speed: def.speed,
        spriteId: def.spriteId,
        currentAnimation: 'idle',
        animationFrame: 0, animationTimer: 0,
        invincible: false, invincibleTimer: 0,
        active: true,
        enemyId: def.enemyId,
        name: def.name,
        exp: def.exp,
        goldDrop: def.goldDrop,
        drops: def.drops,
        ai: def.ai,
        aggroRange: def.aggroRange,
        attackRange: def.attackRange,
        attackCooldown: def.attackCooldown,
        attackTimer: 0,
        skills: [...def.skills],
        phase: 1,
      };
      this.entities.push(entity);
    } else if (spawn.type === 'boss') {
      const def = GameData.bosses[spawn.entityId];
      if (!def) return;
      if (this.player.storyFlags[`defeated_${spawn.entityId}`]) return;
      const entity: Enemy = {
        id: generateEntityId(),
        type: 'boss',
        x: spawn.x * TILE_SIZE,
        y: spawn.y * TILE_SIZE,
        width: 40, height: 40,
        vx: 0, vy: 0,
        direction: Direction.Down,
        hp: def.hp, maxHp: def.maxHp,
        mp: def.mp, maxMp: def.maxMp,
        attack: def.attack, defense: def.defense, speed: def.speed,
        spriteId: def.spriteId,
        currentAnimation: 'idle',
        animationFrame: 0, animationTimer: 0,
        invincible: false, invincibleTimer: 0,
        active: true,
        enemyId: def.enemyId,
        name: def.name,
        exp: def.exp,
        goldDrop: def.goldDrop,
        drops: def.drops,
        ai: 'boss',
        aggroRange: def.aggroRange,
        attackRange: def.attackRange,
        attackCooldown: def.attackCooldown,
        attackTimer: 0,
        skills: [...def.skills],
        phase: 1,
      };
      this.entities.push(entity);
    } else if (spawn.type === 'npc') {
      const dialogueMap: Record<string, string> = {
        eileen: 'eileen_greeting',
        gregor: 'gregor_greeting',
        kashim: 'kashim_greeting',
        vera: 'vera_greeting',
        noah: 'noah_greeting',
        guard_captain: 'guard_captain_greeting',
      };
      const entity: NPC = {
        id: generateEntityId(),
        type: 'npc',
        x: spawn.x * TILE_SIZE,
        y: spawn.y * TILE_SIZE,
        width: 20, height: 28,
        vx: 0, vy: 0,
        direction: Direction.Down,
        hp: 1, maxHp: 1, mp: 0, maxMp: 0,
        attack: 0, defense: 0, speed: 0,
        spriteId: spawn.entityId,
        currentAnimation: 'idle',
        animationFrame: 0, animationTimer: 0,
        invincible: false, invincibleTimer: 0,
        active: true,
        npcId: spawn.entityId,
        name: spawn.entityId,
        dialogueId: dialogueMap[spawn.entityId] || '',
        shopItems: spawn.entityId === 'gregor' ? ['health_potion', 'mana_potion', 'iron_sword'] : undefined,
      };
      this.entities.push(entity);
    } else if (spawn.type === 'chest') {
      if (this.player.storyFlags[`opened_${spawn.entityId}`]) return;
      const entity: Entity = {
        id: generateEntityId(),
        type: 'npc',
        x: spawn.x * TILE_SIZE,
        y: spawn.y * TILE_SIZE,
        width: 24, height: 24,
        vx: 0, vy: 0,
        direction: Direction.Down,
        hp: 1, maxHp: 1, mp: 0, maxMp: 0,
        attack: 0, defense: 0, speed: 0,
        spriteId: 'chest',
        currentAnimation: 'idle',
        animationFrame: 0, animationTimer: 0,
        invincible: false, invincibleTimer: 0,
        active: true,
      };
      (entity as any).chestId = spawn.entityId;
      this.entities.push(entity);
    }
  }

  removeEntity(id: string): void {
    const idx = this.entities.findIndex(e => e.id === id);
    if (idx >= 0) {
      this.entities[idx].active = false;
    }
  }

  findNearestEnemy(x: number, y: number, range: number): Enemy | null {
    let nearest: Enemy | null = null;
    let nearestDist = range;
    for (const e of this.entities) {
      if (e.type !== 'enemy' && e.type !== 'boss') continue;
      if (e.hp <= 0) continue;
      const dist = Math.sqrt((e.x - x) ** 2 + (e.y - y) ** 2);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = e as Enemy;
      }
    }
    return nearest;
  }

  startDialogue(dialogueId: string): void {
    const lines = GameData.dialogues[dialogueId];
    if (!lines || lines.length === 0) return;
    this.dialogueQueue = [...lines];
    this.currentDialogue = this.dialogueQueue.shift()!;
    this.dialogueTypewriterIndex = 0;
    this.dialogueTypewriterTimer = 0;
    this.gameState = GameState.Dialog;
  }

  advanceDialogue(choice?: number): void {
    if (!this.currentDialogue) return;

    if (this.dialogueTypewriterIndex < this.currentDialogue.text.length) {
      this.dialogueTypewriterIndex = this.currentDialogue.text.length;
      return;
    }

    if (this.currentDialogue.choices && choice !== undefined) {
      const selectedChoice = this.currentDialogue.choices[choice];
      if (selectedChoice) {
        const nextLine = this.findDialogueLine(selectedChoice.next);
        if (nextLine) {
          this.currentDialogue = nextLine;
          this.dialogueTypewriterIndex = 0;
          this.dialogueTypewriterTimer = 0;
          return;
        }
      }
    }

    if (this.currentDialogue.action) {
      this.executeDialogueAction(this.currentDialogue.action);
    }

    if (this.currentDialogue.next) {
      const nextLine = this.findDialogueLine(this.currentDialogue.next);
      if (nextLine) {
        this.currentDialogue = nextLine;
        this.dialogueTypewriterIndex = 0;
        this.dialogueTypewriterTimer = 0;
        return;
      }
    }

    if (this.dialogueQueue.length > 0) {
      this.currentDialogue = this.dialogueQueue.shift()!;
      this.dialogueTypewriterIndex = 0;
      this.dialogueTypewriterTimer = 0;
    } else {
      this.currentDialogue = null;
      this.gameState = GameState.Playing;
    }
  }

  findDialogueLine(id: string): DialogueLine | null {
    for (const lines of Object.values(GameData.dialogues) as DialogueLine[][]) {
      const found = lines.find(l => l.id === id);
      if (found) return found;
    }
    return null;
  }

  executeDialogueAction(action: string): void {
    if (action.startsWith('set_flag:')) {
      const flag = action.substring('set_flag:'.length);
      this.player.storyFlags[flag] = true;
    } else if (action.startsWith('give_item:')) {
      const parts = action.substring('give_item:'.length).split(':');
      const itemId = parts[0];
      const quantity = parseInt(parts[1] || '1', 10);
      this.addItemToInventory(itemId, quantity);
    } else if (action.startsWith('open_shop:')) {
      // shop would be handled by UI
    }
  }

  updateDialogue(dt: number): void {
    if (!this.currentDialogue) return;

    if (this.dialogueTypewriterIndex < this.currentDialogue.text.length) {
      this.dialogueTypewriterTimer += dt;
      if (this.dialogueTypewriterTimer >= 0.03) {
        this.dialogueTypewriterTimer = 0;
        this.dialogueTypewriterIndex++;
      }
    }

    if (this.input.isKeyPressed('Space') || this.input.isKeyPressed('KeyE')) {
      this.advanceDialogue();
    }

    if (this.currentDialogue && this.currentDialogue.choices) {
      for (let i = 0; i < this.currentDialogue.choices.length; i++) {
        if (this.input.isKeyPressed(`Digit${i + 1}`)) {
          this.advanceDialogue(i);
        }
      }
    }
  }

  checkQuestCompletion(): void {
    for (const qp of this.player.questProgress) {
      if (qp.completed || qp.turnedIn) continue;
      const quest = GameData.quests[qp.questId];
      if (!quest) continue;

      if (quest.type === 'boss') {
        if (this.player.storyFlags[`defeated_${quest.target}`]) {
          qp.current = quest.required;
          qp.completed = true;
        }
      } else if (quest.type === 'kill') {
        if (qp.current >= quest.required) {
          qp.completed = true;
        }
      } else if (quest.type === 'collect') {
        const invItem = this.player.inventory.find(i => i.itemId === quest.target);
        if (invItem && invItem.quantity >= quest.required) {
          qp.current = invItem.quantity;
          qp.completed = true;
        }
      }
    }
  }

  triggerStoryEvent(event: string): void {
    this.player.storyFlags[event] = true;
    this.checkQuestCompletion();
  }

  transitionToRegion(region: Region, x: number, y: number): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.transitionTarget = { region, x, y };
    this.transitionPhase = 'out';
    this.transitionAlpha = 0;
  }

  checkTransitions(): void {
    const map = this.regionManager.getCurrentMap();
    const playerTileX = Math.floor((this.player.x + this.player.width / 2) / TILE_SIZE);
    const playerTileY = Math.floor((this.player.y + this.player.height / 2) / TILE_SIZE);

    const transition = map.getTransitionAt(playerTileX, playerTileY);
    if (transition) {
      this.transitionToRegion(transition.targetRegion, transition.targetX, transition.targetY);
    }
  }

  tryInteract(): void {
    const interactX = this.player.x;
    const interactY = this.player.y;
    const range = DIALOGUE_RANGE;

    for (const e of this.entities) {
      if (e.type !== 'npc') continue;
      const dist = Math.sqrt(
        (e.x + e.width / 2 - interactX - this.player.width / 2) ** 2 +
        (e.y + e.height / 2 - interactY - this.player.height / 2) ** 2
      );

      if (dist <= range) {
        const chestId = (e as any).chestId;
        if (chestId) {
          this.openChest(e, chestId);
          return;
        }

        const npc = e as NPC;
        if (npc.dialogueId) {
          this.startDialogue(npc.dialogueId);
          return;
        }
      }
    }
  }

  openChest(chestEntity: Entity, chestId: string): void {
    if (this.player.storyFlags[`opened_${chestId}`]) return;
    this.player.storyFlags[`opened_${chestId}`] = true;

    const loot = GameData.chestLoot[chestId];
    if (loot) {
      for (const item of loot) {
        this.addItemToInventory(item.itemId, item.quantity);
      }
    }

    this.spawnParticles(chestEntity.x + chestEntity.width / 2, chestEntity.y, 10, '#ffcc00', 60, 0.5, true);
    this.removeEntity(chestEntity.id);
  }

  addItemToInventory(itemId: string, quantity: number): void {
    const existing = this.player.inventory.find(i => i.itemId === itemId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.player.inventory.push({ itemId, quantity });
    }
  }

  handleEnemyDeath(enemy: Enemy): void {
    enemy.active = false;

    this.player.exp += enemy.exp;
    this.player.gold += enemy.goldDrop;

    this.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 15, '#ff8800', 80, 0.6, true);
    this.spawnDamageNumber(enemy.x + enemy.width / 2, enemy.y - 10, enemy.exp, '#44ff44');

    for (const drop of enemy.drops) {
      if (Math.random() < drop.chance) {
        const qty = drop.quantityMin + Math.floor(Math.random() * (drop.quantityMax - drop.quantityMin + 1));
        this.addItemToInventory(drop.itemId, qty);
        this.spawnDamageNumber(enemy.x + enemy.width / 2, enemy.y - 20, qty, '#ffcc00');
      }
    }

    if (enemy.type === 'boss') {
      this.player.storyFlags[`defeated_${enemy.enemyId}`] = true;
      this.screenShake(8, 1.0);
      this.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 30, '#ffcc00', 120, 1.0, true);
    }

    this.checkLevelUp();
    this.checkQuestCompletion();
  }

  handlePlayerDeath(): void {
    this.player.hp = 0;
    this.gameState = GameState.GameOver;
    const goldLost = Math.floor(this.player.gold * DEATH_GOLD_PENALTY);
    this.player.gold -= goldLost;
  }

  respawnPlayer(): void {
    const stats = this.getPlayerStats();
    this.player.hp = stats.hp;
    this.player.mp = stats.mp;
    this.player.x = this.lastRegionEntrance.x;
    this.player.y = this.lastRegionEntrance.y;
    this.player.invincible = true;
    this.player.invincibleTimer = 2.0;
    this.gameState = GameState.Playing;
  }

  checkLevelUp(): void {
    while (this.player.exp >= this.player.expToNext) {
      this.player.exp -= this.player.expToNext;
      this.player.level++;
      this.player.expToNext = this.player.level * 100;
      this.player.maxHp += 10;
      this.player.maxMp += 5;
      this.player.attack += 2;
      this.player.defense += 1;
      this.player.speed += 1;
      this.player.hp = this.player.maxHp;
      this.player.mp = this.player.maxMp;

      this.spawnParticles(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        25, '#ffcc00', 100, 1.0, false
      );
      this.screenShake(3, 0.3);
      this.spawnDamageNumber(this.player.x, this.player.y - 20, this.player.level, '#ffcc00');
    }
  }

  screenShake(intensity: number, duration: number): void {
    this.camera.shake(intensity, duration);
  }

  getPlayerStats(): Stats {
    const base: Stats = {
      attack: this.player.attack,
      defense: this.player.defense,
      hp: this.player.maxHp,
      mp: this.player.maxMp,
      speed: this.player.speed,
    };

    const eq = this.player.equipment;
    const applyItem = (itemId: string | null) => {
      if (!itemId) return;
      const item = GameData.items[itemId];
      if (!item || !item.stats) return;
      if (item.stats.attack) base.attack += item.stats.attack;
      if (item.stats.defense) base.defense += item.stats.defense;
      if (item.stats.hp) base.hp += item.stats.hp;
      if (item.stats.mp) base.mp += item.stats.mp;
      if (item.stats.speed) base.speed += item.stats.speed;
    };

    applyItem(eq.weapon);
    applyItem(eq.armor);
    applyItem(eq.accessory);

    return base;
  }

  createPlayer(): Player {
    return {
      id: 'player',
      type: 'player',
      x: 0, y: 0,
      width: PLAYER_WIDTH, height: PLAYER_HEIGHT,
      vx: 0, vy: 0,
      direction: Direction.Down,
      hp: 100, maxHp: 100,
      mp: 50, maxMp: 50,
      attack: 10, defense: 5,
      speed: PLAYER_BASE_SPEED,
      spriteId: 'player',
      currentAnimation: 'idle',
      animationFrame: 0, animationTimer: 0,
      invincible: false, invincibleTimer: 0,
      active: true,
      level: 1,
      exp: 0,
      expToNext: 100,
      gold: 0,
      skills: [
        { skillId: 'slash', currentCooldown: 0 },
        { skillId: 'power_strike', currentCooldown: 0 },
        { skillId: 'fireball', currentCooldown: 0 },
        { skillId: 'ice_shard', currentCooldown: 0 },
      ],
      equipment: { weapon: null, armor: null, accessory: null },
      inventory: [
        { itemId: 'health_potion', quantity: 3 },
        { itemId: 'mana_potion', quantity: 2 },
        { itemId: 'rusty_sword', quantity: 1 },
      ],
      storyFlags: {},
      questProgress: [],
      dashCooldown: 0,
      attackCooldown: 0,
      skillCooldowns: [0, 0, 0, 0],
    };
  }

  spawnEntitiesForRegion(): void {
    const map = this.regionManager.getCurrentMap();
    const spawns = map.getSpawnPoints();
    for (const spawn of spawns) {
      this.spawnEntity(spawn);
    }
  }

  setWeatherForRegion(region: Region): void {
    const weatherType = GameData.regionWeather[region] || 'clear';
    this.weather.setWeather(weatherType);
  }

  getRegionMinimapColors(region: Region | null): Record<number, string> {
    switch (region) {
      case Region.Forest:
        return { 0: '#2a5a1a', 1: '#3a7a2a', 2: '#4a9a3a', 3: '#5a3a10', 6: '#3a8aaa', 7: '#6a6a6a', 8: '#7a5a20' };
      case Region.Desert:
        return { 0: '#c0a060', 1: '#d0b070', 2: '#e0c080', 3: '#9a8050', 6: '#3a8aaa', 7: '#4a7a3a', 8: '#c0a020', 9: '#b09050' };
      case Region.Snow:
        return { 0: '#c0c8d0', 1: '#d0d8e0', 2: '#e0e8f0', 3: '#a0b0c0', 6: '#8acafa', 7: '#8090a0', 8: '#4a6a8a', 9: '#6080a0' };
      case Region.Ruins:
        return { 0: '#3a3a4a', 1: '#5a5a6a', 2: '#4a2a6a', 3: '#4a4a5a', 4: '#6a3a8a', 7: '#2a2a3a', 9: '#8a4aaa' };
      case Region.HolyCity:
        return { 0: '#d0d0e0', 1: '#e0e0f0', 2: '#c0a020', 3: '#8080a0', 6: '#4a4a8a', 8: '#ffe060', 9: '#6020a0' };
      default:
        return {};
    }
  }

  destroy(): void {
    this.gameLoop.stop();
    this.input.destroy();
  }
}

export { Game, GameData };
