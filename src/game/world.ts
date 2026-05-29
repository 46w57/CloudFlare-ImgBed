import { Region, MapData, MapLayer, SpawnPoint, MapTransition, Particle } from './types';
import { getTile } from './sprites';
import { Camera, Renderer } from './engine';

const TILE_KEYS: Record<number, string[]> = {
  [Region.Forest]: [
    'forest_grass1', 'forest_grass2', 'forest_grass3', 'forest_dirt',
    'forest_tree_trunk', 'forest_tree_top', 'forest_water', 'forest_stone',
    'forest_bridge', 'forest_bush', 'forest_grass3',
  ],
  [Region.Desert]: [
    'desert_sand1', 'desert_sand2', 'desert_sandstone', 'desert_ruins_floor',
    'desert_cactus', 'desert_dead_bush', 'desert_oasis_water', 'desert_sand1',
    'desert_sandstone', 'desert_sand2',
  ],
  [Region.Snow]: [
    'snow_ground1', 'snow_ground2', 'snow_ice', 'snow_frozen_water',
    'snow_pine_tree', 'snow_rock', 'snow_ice_crystal', 'snow_ground1',
    'snow_ground2', 'snow_rock',
  ],
  [Region.Ruins]: [
    'ruins_broken_stone', 'ruins_crystal_floor', 'ruins_void_pool', 'ruins_metal_debris',
    'ruins_energy_conduit', 'ruins_broken_pillar', 'ruins_void_pool', 'ruins_broken_stone',
    'ruins_crystal_floor', 'ruins_energy_conduit',
  ],
  [Region.HolyCity]: [
    'holy_marble', 'holy_gold_trim', 'holy_water', 'holy_stained_glass',
    'holy_angel_base', 'holy_floating_platform', 'holy_marble', 'holy_gold_trim',
    'holy_stained_glass', 'holy_water',
  ],
};

function create2DArray<T>(width: number, height: number, defaultValue: T): T[][] {
  const result: T[][] = [];
  for (let y = 0; y < height; y++) {
    result[y] = [];
    for (let x = 0; x < width; x++) {
      result[y][x] = defaultValue;
    }
  }
  return result;
}

function hash2d(x: number, y: number, seed: number = 0): number {
  let h = seed + x * 374761393 + y * 668265263;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

function fillRectData(data: number[][], rx: number, ry: number, rw: number, rh: number, value: number): void {
  for (let dy = 0; dy < rh; dy++) {
    for (let dx = 0; dx < rw; dx++) {
      const px = rx + dx;
      const py = ry + dy;
      if (px >= 0 && px < data[0].length && py >= 0 && py < data.length) {
        data[py][px] = value;
      }
    }
  }
}

function drawLineOnMap(data: number[][], x1: number, y1: number, x2: number, y2: number, value: number, thickness: number = 1): void {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;
  let cx = x1, cy = y1;
  const half = Math.floor(thickness / 2);
  while (true) {
    for (let ty = -half; ty <= half; ty++) {
      for (let tx = -half; tx <= half; tx++) {
        const px = cx + tx;
        const py = cy + ty;
        if (px >= 0 && px < data[0].length && py >= 0 && py < data.length) {
          data[py][px] = value;
        }
      }
    }
    if (cx === x2 && cy === y2) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }
}

function placeCluster(data: number[][], cx: number, cy: number, radius: number, value: number, density: number, seed: number): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        const px = cx + dx;
        const py = cy + dy;
        if (px >= 0 && px < data[0].length && py >= 0 && py < data.length) {
          if (hash2d(px, py, seed) < density) {
            data[py][px] = value;
          }
        }
      }
    }
  }
}

function drawRectOutline(data: number[][], rx: number, ry: number, rw: number, rh: number, value: number): void {
  for (let dx = 0; dx < rw; dx++) {
    if (rx + dx >= 0 && rx + dx < data[0].length) {
      if (ry >= 0 && ry < data.length) data[ry][rx + dx] = value;
      if (ry + rh - 1 >= 0 && ry + rh - 1 < data.length) data[ry + rh - 1][rx + dx] = value;
    }
  }
  for (let dy = 0; dy < rh; dy++) {
    if (ry + dy >= 0 && ry + dy < data.length) {
      if (rx >= 0 && rx < data[0].length) data[ry + dy][rx] = value;
      if (rx + rw - 1 >= 0 && rx + rw - 1 < data[0].length) data[ry + dy][rx + rw - 1] = value;
    }
  }
}

function generateCollisions(
  ground: number[][],
  deco: number[][],
  width: number,
  height: number,
  solidGround: Set<number>,
  solidDeco: Set<number>,
  voidSolid: boolean = false
): boolean[][] {
  const collisions = create2DArray<boolean>(width, height, false);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const g = ground[y][x];
      const d = deco[y][x];
      if (voidSolid && g === -1) {
        collisions[y][x] = true;
      } else if (solidGround.has(g)) {
        collisions[y][x] = true;
      } else if (d !== -1 && solidDeco.has(d)) {
        collisions[y][x] = true;
      }
    }
  }
  return collisions;
}

function clearArea(ground: number[][], deco: number[][], collisions: boolean[][], rx: number, ry: number, rw: number, rh: number, groundTile: number = -1): void {
  for (let dy = 0; dy < rh; dy++) {
    for (let dx = 0; dx < rw; dx++) {
      const px = rx + dx;
      const py = ry + dy;
      if (px >= 0 && px < ground[0].length && py >= 0 && py < ground.length) {
        deco[py][px] = -1;
        collisions[py][px] = false;
        if (groundTile >= 0) ground[py][px] = groundTile;
      }
    }
  }
}

function clearTileFromCollision(ground: number[][], deco: number[][], collisions: boolean[][], tileId: number): void {
  for (let y = 0; y < ground.length; y++) {
    for (let x = 0; x < ground[0].length; x++) {
      if (ground[y][x] === tileId) {
        deco[y][x] = -1;
        collisions[y][x] = false;
      }
    }
  }
}

function ensureWalkable(collisions: boolean[][], points: Array<{ x: number; y: number }>): void {
  for (const p of points) {
    collisions[p.y][p.x] = false;
  }
}

class TileMap {
  private data: MapData;
  private tileKeyMap: string[];

  constructor(data: MapData) {
    this.data = data;
    this.tileKeyMap = TILE_KEYS[data.region] || [];
  }

  getTileAt(layerIndex: number, x: number, y: number): number {
    if (layerIndex < 0 || layerIndex >= this.data.layers.length) return -1;
    if (x < 0 || x >= this.data.width || y < 0 || y >= this.data.height) return -1;
    return this.data.layers[layerIndex].data[y][x];
  }

  isCollision(x: number, y: number): boolean {
    if (x < 0 || x >= this.data.width || y < 0 || y >= this.data.height) return true;
    return this.data.collisions[y][x];
  }

  getSpawnPoints(): SpawnPoint[] {
    return this.data.spawns;
  }

  getTransitionAt(x: number, y: number): MapTransition | null {
    for (const t of this.data.transitions) {
      if (x >= t.x && x < t.x + t.width && y >= t.y && y < t.y + t.height) {
        return t;
      }
    }
    return null;
  }

  render(renderer: Renderer, camera: Camera): void {
    const ts = this.data.tileSize;
    const startX = Math.max(0, Math.floor(camera.x / ts));
    const startY = Math.max(0, Math.floor(camera.y / ts));
    const endX = Math.min(this.data.width - 1, Math.ceil((camera.x + camera.width) / ts));
    const endY = Math.min(this.data.height - 1, Math.ceil((camera.y + camera.height) / ts));

    for (const layer of this.data.layers) {
      if (!layer.visible) continue;
      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          const tileId = layer.data[y][x];
          if (tileId < 0 || tileId >= this.tileKeyMap.length) continue;
          const wx = x * ts;
          const wy = y * ts;
          if (!camera.isVisible(wx, wy, ts, ts)) continue;
          const screen = camera.worldToScreen(wx, wy);
          const tileKey = this.tileKeyMap[tileId];
          const tileData = getTile(tileKey);
          if (tileData) {
            renderer.drawTile(tileData.pixels, screen.sx, screen.sy, tileData.palette, tileKey);
          }
        }
      }
    }
  }

  getData(): MapData {
    return this.data;
  }
}

const REGION_NAMES: Record<number, string> = {
  [Region.Forest]: '翠影森林',
  [Region.Desert]: '灼沙荒漠',
  [Region.Snow]: '霜寂雪原',
  [Region.Ruins]: '星陨废墟',
  [Region.HolyCity]: '暮光圣城',
};

class RegionManager {
  private currentRegion: Region | null = null;
  private currentMap: TileMap | null = null;
  private mapCache: Map<number, TileMap> = new Map();

  loadRegion(regionId: Region): void {
    this.currentRegion = regionId;
    if (this.mapCache.has(regionId)) {
      this.currentMap = this.mapCache.get(regionId)!;
    } else {
      const generator = regionMaps[regionId];
      if (!generator) throw new Error(`Unknown region: ${regionId}`);
      const mapData = generator();
      const tileMap = new TileMap(mapData);
      this.mapCache.set(regionId, tileMap);
      this.currentMap = tileMap;
    }
  }

  getCurrentMap(): TileMap {
    if (!this.currentMap) throw new Error('No region loaded');
    return this.currentMap;
  }

  getRegionName(): string {
    if (this.currentRegion === null) return '';
    return REGION_NAMES[this.currentRegion] || '';
  }

  getCurrentRegion(): Region | null {
    return this.currentRegion;
  }

  clearCache(): void {
    this.mapCache.clear();
  }
}

class DayNightCycle {
  timeOfDay: number = 8;
  timeSpeed: number = 0.15;

  private static TIME_STOPS = [
    { hour: 0, r: 10, g: 10, b: 40, a: 0.5 },
    { hour: 5, r: 10, g: 10, b: 40, a: 0.5 },
    { hour: 6, r: 255, g: 150, b: 80, a: 0.25 },
    { hour: 8, r: 255, g: 240, b: 200, a: 0.05 },
    { hour: 12, r: 255, g: 255, b: 230, a: 0.02 },
    { hour: 17, r: 255, g: 200, b: 100, a: 0.1 },
    { hour: 18.5, r: 200, g: 100, b: 255, a: 0.2 },
    { hour: 20, r: 10, g: 10, b: 60, a: 0.45 },
    { hour: 24, r: 10, g: 10, b: 40, a: 0.5 },
  ];

  getAmbientColor(): string {
    const stops = DayNightCycle.TIME_STOPS;
    let prev = stops[0];
    let next = stops[1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (this.timeOfDay >= stops[i].hour && this.timeOfDay < stops[i + 1].hour) {
        prev = stops[i];
        next = stops[i + 1];
        break;
      }
    }
    const range = next.hour - prev.hour;
    const t = range > 0 ? (this.timeOfDay - prev.hour) / range : 0;
    const r = Math.round(prev.r + (next.r - prev.r) * t);
    const g = Math.round(prev.g + (next.g - prev.g) * t);
    const b = Math.round(prev.b + (next.b - prev.b) * t);
    const a = prev.a + (next.a - prev.a) * t;
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }

  getTimeName(): string {
    if (this.timeOfDay >= 5 && this.timeOfDay < 7) return '黎明';
    if (this.timeOfDay >= 7 && this.timeOfDay < 17) return '白天';
    if (this.timeOfDay >= 17 && this.timeOfDay < 19) return '黄昏';
    return '夜晚';
  }

  update(dt: number): void {
    this.timeOfDay += dt * this.timeSpeed;
    if (this.timeOfDay >= 24) this.timeOfDay -= 24;
    if (this.timeOfDay < 0) this.timeOfDay += 24;
  }
}

interface WeatherParticle extends Particle {}

class WeatherSystem {
  currentWeather: 'clear' | 'rain' | 'snow' | 'sandstorm' | 'voidstorm' = 'clear';
  particles: WeatherParticle[] = [];
  private maxParticles: number = 0;
  private spawnRate: number = 0;
  private spawnTimer: number = 0;

  setWeather(type: 'clear' | 'rain' | 'snow' | 'sandstorm' | 'voidstorm'): void {
    this.currentWeather = type;
    this.particles = [];
    this.spawnTimer = 0;
    switch (type) {
      case 'clear':
        this.maxParticles = 0;
        this.spawnRate = 0;
        break;
      case 'rain':
        this.maxParticles = 200;
        this.spawnRate = 80;
        break;
      case 'snow':
        this.maxParticles = 120;
        this.spawnRate = 25;
        break;
      case 'sandstorm':
        this.maxParticles = 250;
        this.spawnRate = 100;
        break;
      case 'voidstorm':
        this.maxParticles = 160;
        this.spawnRate = 40;
        break;
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
    if (this.maxParticles > 0) {
      this.spawnTimer += dt;
      const interval = 1 / this.spawnRate;
      while (this.spawnTimer >= interval && this.particles.length < this.maxParticles) {
        this.spawnTimer -= interval;
        this.spawnParticle();
      }
    }
  }

  private spawnParticle(): void {
    const cam = this.getCameraBounds();
    let p: WeatherParticle;
    switch (this.currentWeather) {
      case 'rain':
        p = {
          x: cam.x + Math.random() * cam.w,
          y: cam.y - 10,
          vx: -30 + Math.random() * 10,
          vy: 350 + Math.random() * 150,
          life: 0.8 + Math.random() * 0.6,
          maxLife: 1.4,
          color: '#a0c8ff',
          size: 1 + Math.random(),
          gravity: false,
        };
        break;
      case 'snow':
        p = {
          x: cam.x + Math.random() * cam.w,
          y: cam.y - 5,
          vx: -20 + Math.random() * 40,
          vy: 30 + Math.random() * 40,
          life: 4 + Math.random() * 5,
          maxLife: 9,
          color: '#ffffff',
          size: 2 + Math.random() * 2,
          gravity: false,
        };
        break;
      case 'sandstorm':
        p = {
          x: cam.x - 10,
          y: cam.y + Math.random() * cam.h,
          vx: 250 + Math.random() * 200,
          vy: -30 + Math.random() * 60,
          life: 1.5 + Math.random() * 2,
          maxLife: 3.5,
          color: '#c4a473',
          size: 1 + Math.random() * 2,
          gravity: false,
        };
        break;
      case 'voidstorm':
        p = {
          x: cam.x + Math.random() * cam.w,
          y: cam.y + Math.random() * cam.h,
          vx: -80 + Math.random() * 160,
          vy: -80 + Math.random() * 160,
          life: 2 + Math.random() * 3,
          maxLife: 5,
          color: Math.random() > 0.5 ? '#a040e0' : '#6020a0',
          size: 2 + Math.random() * 3,
          gravity: false,
        };
        break;
      default:
        return;
    }
    this.particles.push(p);
  }

  private cameraRef: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w: 800, h: 600 };

  setCameraBounds(x: number, y: number, w: number, h: number): void {
    this.cameraRef.x = x;
    this.cameraRef.y = y;
    this.cameraRef.w = w;
    this.cameraRef.h = h;
  }

  private getCameraBounds(): { x: number; y: number; w: number; h: number } {
    return this.cameraRef;
  }

  render(renderer: Renderer, camera: Camera): void {
    for (const p of this.particles) {
      const screen = camera.worldToScreen(p.x, p.y);
      const alpha = Math.min(1, p.life / (p.maxLife * 0.3));
      if (this.currentWeather === 'rain') {
        const endScreen = camera.worldToScreen(p.x + p.vx * 0.02, p.y + p.vy * 0.02);
        renderer.drawLine(screen.sx, screen.sy, endScreen.sx, endScreen.sy, p.color, p.size);
      } else {
        renderer.drawCircle(screen.sx, screen.sy, p.size * alpha, p.color);
      }
    }
  }
}

function generateForestMap(): MapData {
  const W = 80, H = 60, TS = 32;

  const ground = create2DArray<number>(W, H, 0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const h = hash2d(x, y, 1);
      if (h < 0.28) ground[y][x] = 1;
      else if (h < 0.33) ground[y][x] = 2;
      else ground[y][x] = 0;
    }
  }

  drawLineOnMap(ground, 40, 57, 40, 38, 3, 3);
  drawLineOnMap(ground, 40, 38, 40, 30, 3, 3);
  drawLineOnMap(ground, 40, 30, 40, 15, 3, 3);
  drawLineOnMap(ground, 40, 15, 40, 8, 3, 2);
  drawLineOnMap(ground, 40, 35, 22, 35, 3, 2);
  drawLineOnMap(ground, 40, 35, 58, 35, 3, 2);
  drawLineOnMap(ground, 40, 45, 55, 45, 3, 2);
  drawLineOnMap(ground, 40, 20, 55, 20, 3, 2);
  drawLineOnMap(ground, 22, 35, 22, 45, 3, 2);
  drawLineOnMap(ground, 55, 20, 55, 35, 3, 2);
  drawLineOnMap(ground, 30, 50, 40, 50, 3, 2);
  drawLineOnMap(ground, 40, 50, 50, 50, 3, 2);

  fillRectData(ground, 0, 27, 37, 3, 6);
  fillRectData(ground, 43, 27, 37, 3, 6);
  fillRectData(ground, 37, 27, 6, 3, 8);

  fillRectData(ground, 33, 33, 15, 5, 3);

  fillRectData(ground, 32, 5, 17, 10, 0);
  for (let y = 5; y < 15; y++) {
    for (let x = 32; x < 49; x++) {
      if (hash2d(x, y, 100) < 0.15) ground[y][x] = 2;
    }
  }

  fillRectData(ground, 34, 50, 13, 7, 0);
  for (let y = 50; y < 57; y++) {
    for (let x = 34; x < 47; x++) {
      if (hash2d(x, y, 200) < 0.2) ground[y][x] = 2;
    }
  }

  const deco = create2DArray<number>(W, H, -1);

  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < W; x++) {
      deco[y][x] = 5;
    }
  }
  for (let y = 57; y < H; y++) {
    for (let x = 0; x < W; x++) {
      deco[y][x] = 5;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < 4; x++) {
      deco[y][x] = 5;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 77; x < W; x++) {
      deco[y][x] = 5;
    }
  }

  for (let y = 4; y < 57; y++) {
    for (let x = 58; x < 77; x++) {
      if (hash2d(x, y, 300) < 0.55) {
        deco[y][x] = 5;
      }
    }
  }

  for (let y = 4; y < 57; y++) {
    for (let x = 4; x < 58; x++) {
      const h = hash2d(x, y, 400);
      if (h < 0.1) {
        deco[y][x] = 5;
      } else if (h < 0.14) {
        deco[y][x] = 9;
      } else if (h < 0.18) {
        deco[y][x] = 10;
      } else if (h < 0.2) {
        deco[y][x] = 7;
      }
    }
  }

  placeCluster(deco, 32, 5, 3, 5, 0.7, 500);
  placeCluster(deco, 48, 5, 3, 5, 0.7, 501);
  placeCluster(deco, 32, 14, 2, 5, 0.6, 502);
  placeCluster(deco, 48, 14, 2, 5, 0.6, 503);

  for (let x = 0; x < 37; x++) {
    if (hash2d(x, 26, 600) < 0.4) deco[26][x] = 7;
    if (hash2d(x, 30, 601) < 0.4) deco[30][x] = 7;
  }
  for (let x = 43; x < W; x++) {
    if (hash2d(x, 26, 602) < 0.4) deco[26][x] = 7;
    if (hash2d(x, 30, 603) < 0.4) deco[30][x] = 7;
  }

  const solidGround = new Set([6]);
  const solidDeco = new Set([4, 5, 7]);
  const collisions = generateCollisions(ground, deco, W, H, solidGround, solidDeco);

  for (let y = 27; y < 30; y++) {
    for (let x = 37; x < 43; x++) {
      collisions[y][x] = false;
    }
  }

  clearArea(ground, deco, collisions, 33, 33, 15, 5, 3);
  clearArea(ground, deco, collisions, 35, 7, 11, 5, 0);
  clearArea(ground, deco, collisions, 35, 51, 11, 5, 0);
  clearTileFromCollision(ground, deco, collisions, 3);

  const spawns: SpawnPoint[] = [
    { entityId: 'slime', x: 30, y: 45, type: 'enemy', respawn: true },
    { entityId: 'slime', x: 50, y: 42, type: 'enemy', respawn: true },
    { entityId: 'slime', x: 25, y: 22, type: 'enemy', respawn: true },
    { entityId: 'slime', x: 52, y: 18, type: 'enemy', respawn: true },
    { entityId: 'slime', x: 28, y: 38, type: 'enemy', respawn: true },
    { entityId: 'wolf', x: 62, y: 22, type: 'enemy', respawn: true },
    { entityId: 'wolf', x: 68, y: 32, type: 'enemy', respawn: true },
    { entityId: 'wolf', x: 72, y: 18, type: 'enemy', respawn: true },
    { entityId: 'wolf', x: 65, y: 45, type: 'enemy', respawn: true },
    { entityId: 'tree_spirit', x: 35, y: 9, type: 'enemy', respawn: true, condition: 'boss_active' },
    { entityId: 'tree_spirit', x: 46, y: 11, type: 'enemy', respawn: true, condition: 'boss_active' },
    { entityId: 'eileen', x: 38, y: 35, type: 'npc', respawn: false },
    { entityId: 'gregor', x: 43, y: 36, type: 'npc', respawn: false },
    { entityId: 'ancient_tree_spirit', x: 40, y: 9, type: 'boss', respawn: false },
    { entityId: 'chest_forest_1', x: 15, y: 48, type: 'chest', respawn: false },
    { entityId: 'chest_forest_2', x: 62, y: 28, type: 'chest', respawn: false },
    { entityId: 'chest_forest_3', x: 48, y: 11, type: 'chest', respawn: false },
  ];

  const transitions: MapTransition[] = [
    {
      x: 76, y: 27, width: 3, height: 5,
      targetRegion: Region.Desert, targetX: 5, targetY: 30,
    },
  ];

  ensureWalkable(collisions, spawns);
  ensureWalkable(collisions, transitions.map(t => ({ x: t.x, y: t.y })));

  return {
    id: 'forest',
    name: '翠影森林',
    region: Region.Forest,
    width: W,
    height: H,
    tileSize: TS,
    layers: [
      { name: 'ground', data: ground, visible: true },
      { name: 'decoration', data: deco, visible: true },
    ],
    collisions,
    spawns,
    transitions,
    ambientColor: 'rgba(100,180,80,0.1)',
    musicTrack: 'forest_ambient',
  };
}

function generateDesertMap(): MapData {
  const W = 80, H = 60, TS = 32;

  const ground = create2DArray<number>(W, H, 0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const h = hash2d(x, y, 10);
      if (h < 0.35) ground[y][x] = 1;
      else ground[y][x] = 0;
    }
  }

  fillRectData(ground, 50, 5, 25, 22, 3);
  for (let y = 5; y < 27; y++) {
    for (let x = 50; x < 75; x++) {
      if (hash2d(x, y, 11) < 0.3) ground[y][x] = 2;
    }
  }

  fillRectData(ground, 35, 28, 12, 7, 6);
  fillRectData(ground, 37, 30, 8, 3, 6);

  fillRectData(ground, 60, 10, 14, 12, 3);
  drawRectOutline(ground, 59, 9, 16, 14, 8);
  fillRectData(ground, 62, 12, 4, 3, 3);
  fillRectData(ground, 68, 12, 4, 3, 3);
  fillRectData(ground, 62, 16, 10, 3, 3);

  fillRectData(ground, 64, 13, 3, 3, 3);
  drawRectOutline(ground, 63, 12, 5, 5, 8);

  const quicksandPositions = [
    { x: 20, y: 15 }, { x: 45, y: 40 }, { x: 15, y: 35 },
    { x: 55, y: 45 }, { x: 30, y: 50 }, { x: 40, y: 18 },
  ];
  for (const qp of quicksandPositions) {
    fillRectData(ground, qp.x, qp.y, 4, 4, 7);
  }

  drawLineOnMap(ground, 5, 30, 35, 30, 3, 2);
  drawLineOnMap(ground, 35, 30, 35, 28, 3, 2);
  drawLineOnMap(ground, 47, 30, 50, 30, 3, 2);
  drawLineOnMap(ground, 50, 30, 50, 20, 3, 2);
  drawLineOnMap(ground, 50, 20, 59, 20, 3, 2);
  drawLineOnMap(ground, 40, 35, 40, 50, 3, 2);
  drawLineOnMap(ground, 40, 50, 35, 55, 3, 2);

  const deco = create2DArray<number>(W, H, -1);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x < 3 || x >= 77 || y < 3 || y >= 57) {
        deco[y][x] = 9;
      }
    }
  }

  const dunePositions = [
    { x: 10, y: 10, r: 4 }, { x: 25, y: 8, r: 3 }, { x: 45, y: 12, r: 3 },
    { x: 15, y: 25, r: 5 }, { x: 30, y: 40, r: 4 }, { x: 48, y: 48, r: 3 },
    { x: 20, y: 50, r: 4 }, { x: 60, y: 38, r: 3 }, { x: 70, y: 45, r: 4 },
    { x: 10, y: 45, r: 3 }, { x: 38, y: 10, r: 3 },
  ];
  for (const dp of dunePositions) {
    placeCluster(deco, dp.x, dp.y, dp.r, 9, 0.65, 700 + dp.x);
  }

  for (let y = 3; y < 57; y++) {
    for (let x = 3; x < 77; x++) {
      if (ground[y][x] === 0 || ground[y][x] === 1) {
        const h = hash2d(x, y, 12);
        if (h < 0.04) deco[y][x] = 4;
        else if (h < 0.07) deco[y][x] = 5;
      }
    }
  }

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const px = 37 + dx;
      const py = 27 + dy;
      if (px >= 0 && px < W && py >= 0 && py < H) {
        deco[py][px] = -1;
      }
    }
  }

  const solidGround = new Set([6, 7]);
  const solidDeco = new Set([4, 8, 9]);
  const collisions = generateCollisions(ground, deco, W, H, solidGround, solidDeco);

  clearArea(ground, deco, collisions, 36, 29, 10, 6, -1);
  clearTileFromCollision(ground, deco, collisions, 3);
  for (const qp of quicksandPositions) {
    for (let dy = 0; dy < 4; dy++) {
      for (let dx = 0; dx < 4; dx++) {
        const px = qp.x + dx;
        const py = qp.y + dy;
        if (px >= 0 && px < W && py >= 0 && py < H) {
          collisions[py][px] = true;
        }
      }
    }
  }

  const spawns: SpawnPoint[] = [
    { entityId: 'scorpion', x: 20, y: 20, type: 'enemy', respawn: true },
    { entityId: 'scorpion', x: 45, y: 35, type: 'enemy', respawn: true },
    { entityId: 'scorpion', x: 15, y: 40, type: 'enemy', respawn: true },
    { entityId: 'scorpion', x: 55, y: 50, type: 'enemy', respawn: true },
    { entityId: 'scorpion', x: 30, y: 15, type: 'enemy', respawn: true },
    { entityId: 'mummy', x: 63, y: 14, type: 'enemy', respawn: true },
    { entityId: 'mummy', x: 70, y: 17, type: 'enemy', respawn: true },
    { entityId: 'mummy', x: 66, y: 18, type: 'enemy', respawn: true },
    { entityId: 'kashim', x: 40, y: 32, type: 'npc', respawn: false },
    { entityId: 'scorpion_king', x: 65, y: 14, type: 'boss', respawn: false },
    { entityId: 'chest_desert_1', x: 64, y: 13, type: 'chest', respawn: false },
    { entityId: 'chest_desert_2', x: 71, y: 16, type: 'chest', respawn: false },
    { entityId: 'chest_desert_3', x: 63, y: 19, type: 'chest', respawn: false },
    { entityId: 'chest_desert_4', x: 72, y: 11, type: 'chest', respawn: false },
  ];

  const transitions: MapTransition[] = [
    {
      x: 0, y: 28, width: 3, height: 5,
      targetRegion: Region.Forest, targetX: 74, targetY: 29,
    },
    {
      x: 35, y: 0, width: 5, height: 3,
      targetRegion: Region.Snow, targetX: 40, targetY: 55,
    },
  ];

  ensureWalkable(collisions, spawns);
  ensureWalkable(collisions, transitions.map(t => ({ x: t.x + 1, y: t.y + 1 })));

  return {
    id: 'desert',
    name: '灼沙荒漠',
    region: Region.Desert,
    width: W,
    height: H,
    tileSize: TS,
    layers: [
      { name: 'ground', data: ground, visible: true },
      { name: 'decoration', data: deco, visible: true },
    ],
    collisions,
    spawns,
    transitions,
    ambientColor: 'rgba(200,160,80,0.15)',
    musicTrack: 'desert_ambient',
  };
}

function generateSnowMap(): MapData {
  const W = 80, H = 60, TS = 32;

  const ground = create2DArray<number>(W, H, 0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const h = hash2d(x, y, 20);
      if (h < 0.3) ground[y][x] = 1;
      else ground[y][x] = 0;
    }
  }

  fillRectData(ground, 22, 22, 36, 16, 3);
  fillRectData(ground, 25, 25, 30, 10, 2);

  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < W; x++) {
      ground[y][x] = 9;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < 5; x++) {
      ground[y][x] = 9;
    }
    for (let x = 75; x < W; x++) {
      ground[y][x] = 9;
    }
  }

  fillRectData(ground, 37, 3, 6, 4, 8);

  fillRectData(ground, 18, 38, 8, 6, 1);
  fillRectData(ground, 19, 39, 6, 4, 0);

  drawLineOnMap(ground, 40, 55, 40, 38, 1, 2);
  drawLineOnMap(ground, 40, 38, 25, 38, 1, 2);
  drawLineOnMap(ground, 40, 38, 55, 38, 1, 2);
  drawLineOnMap(ground, 55, 38, 55, 25, 1, 2);
  drawLineOnMap(ground, 25, 38, 25, 25, 1, 2);
  drawLineOnMap(ground, 25, 25, 22, 25, 1, 2);
  drawLineOnMap(ground, 55, 25, 58, 25, 1, 2);
  drawLineOnMap(ground, 40, 7, 40, 22, 1, 2);

  const deco = create2DArray<number>(W, H, -1);

  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < W; x++) {
      if (ground[y][x] === 9) deco[y][x] = 9;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < 5; x++) {
      if (ground[y][x] === 9) deco[y][x] = 9;
    }
    for (let x = 75; x < W; x++) {
      if (ground[y][x] === 9) deco[y][x] = 9;
    }
  }

  const pineClusterPositions = [
    { x: 10, y: 15, r: 5 }, { x: 15, y: 30, r: 4 }, { x: 10, y: 45, r: 5 },
    { x: 65, y: 12, r: 5 }, { x: 70, y: 30, r: 4 }, { x: 68, y: 48, r: 5 },
    { x: 30, y: 10, r: 3 }, { x: 50, y: 10, r: 3 },
    { x: 20, y: 50, r: 4 }, { x: 55, y: 50, r: 4 },
  ];
  for (const pc of pineClusterPositions) {
    placeCluster(deco, pc.x, pc.y, pc.r, 4, 0.5, 800 + pc.x);
  }

  for (let y = 5; y < 55; y++) {
    for (let x = 5; x < 75; x++) {
      if (ground[y][x] !== 9 && ground[y][x] !== 2 && ground[y][x] !== 3 && ground[y][x] !== 8) {
        const h = hash2d(x, y, 22);
        if (h < 0.03) deco[y][x] = 5;
        else if (h < 0.06) deco[y][x] = 7;
      }
    }
  }

  const iceCavePositions = [
    { x: 12, y: 8, r: 3 }, { x: 68, y: 8, r: 3 },
  ];
  for (const ic of iceCavePositions) {
    placeCluster(deco, ic.x, ic.y, ic.r, 6, 0.6, 900 + ic.x);
  }

  const solidGround = new Set<number>([9]);
  const solidDeco = new Set<number>([4, 5, 6, 9]);
  const collisions = generateCollisions(ground, deco, W, H, solidGround, solidDeco);

  clearArea(ground, deco, collisions, 37, 27, 6, 6, 2);
  clearArea(ground, deco, collisions, 19, 39, 6, 4, 0);
  clearTileFromCollision(ground, deco, collisions, 1);
  clearTileFromCollision(ground, deco, collisions, 8);

  for (let y = 3; y < 7; y++) {
    for (let x = 37; x < 43; x++) {
      collisions[y][x] = false;
      deco[y][x] = -1;
    }
  }

  const spawns: SpawnPoint[] = [
    { entityId: 'ice_elemental', x: 30, y: 28, type: 'enemy', respawn: true },
    { entityId: 'ice_elemental', x: 50, y: 28, type: 'enemy', respawn: true },
    { entityId: 'ice_elemental', x: 35, y: 32, type: 'enemy', respawn: true },
    { entityId: 'ice_elemental', x: 48, y: 32, type: 'enemy', respawn: true },
    { entityId: 'snow_wolf', x: 12, y: 18, type: 'enemy', respawn: true },
    { entityId: 'snow_wolf', x: 68, y: 15, type: 'enemy', respawn: true },
    { entityId: 'snow_wolf', x: 15, y: 42, type: 'enemy', respawn: true },
    { entityId: 'snow_wolf', x: 70, y: 45, type: 'enemy', respawn: true },
    { entityId: 'vera', x: 22, y: 41, type: 'npc', respawn: false },
    { entityId: 'ice_dragon', x: 40, y: 29, type: 'boss', respawn: false },
    { entityId: 'chest_snow_1', x: 13, y: 9, type: 'chest', respawn: false },
    { entityId: 'chest_snow_2', x: 69, y: 9, type: 'chest', respawn: false },
    { entityId: 'chest_snow_3', x: 22, y: 42, type: 'chest', respawn: false },
  ];

  const transitions: MapTransition[] = [
    {
      x: 37, y: 3, width: 6, height: 3,
      targetRegion: Region.Ruins, targetX: 40, targetY: 52,
    },
    {
      x: 37, y: 57, width: 6, height: 3,
      targetRegion: Region.Desert, targetX: 38, targetY: 3,
    },
  ];

  ensureWalkable(collisions, spawns);
  ensureWalkable(collisions, transitions.map(t => ({ x: t.x + 2, y: t.y + 1 })));

  return {
    id: 'snow',
    name: '霜寂雪原',
    region: Region.Snow,
    width: W,
    height: H,
    tileSize: TS,
    layers: [
      { name: 'ground', data: ground, visible: true },
      { name: 'decoration', data: deco, visible: true },
    ],
    collisions,
    spawns,
    transitions,
    ambientColor: 'rgba(150,180,220,0.15)',
    musicTrack: 'snow_ambient',
  };
}

function generateRuinsMap(): MapData {
  const W = 80, H = 60, TS = 32;

  const ground = create2DArray<number>(W, H, 0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const h = hash2d(x, y, 30);
      if (h < 0.25) ground[y][x] = 7;
      else if (h < 0.4) ground[y][x] = 3;
      else ground[y][x] = 0;
    }
  }

  fillRectData(ground, 5, 5, 70, 50, 0);
  for (let y = 5; y < 55; y++) {
    for (let x = 5; x < 75; x++) {
      const h = hash2d(x, y, 31);
      if (h < 0.2) ground[y][x] = 7;
      else if (h < 0.35) ground[y][x] = 3;
      else ground[y][x] = 0;
    }
  }

  fillRectData(ground, 28, 18, 24, 18, 1);
  fillRectData(ground, 32, 22, 16, 10, 1);

  const voidPoolPositions = [
    { x: 15, y: 15, r: 3 }, { x: 60, y: 20, r: 2 },
    { x: 20, y: 40, r: 2 }, { x: 55, y: 45, r: 3 },
    { x: 35, y: 12, r: 2 }, { x: 50, y: 38, r: 2 },
    { x: 12, y: 30, r: 2 }, { x: 65, y: 35, r: 2 },
  ];
  for (const vp of voidPoolPositions) {
    placeCluster(ground, vp.x, vp.y, vp.r, 2, 0.7, 1000 + vp.x);
  }

  drawLineOnMap(ground, 10, 52, 40, 52, 4, 1);
  drawLineOnMap(ground, 40, 52, 40, 40, 4, 1);
  drawLineOnMap(ground, 40, 40, 40, 28, 4, 1);
  drawLineOnMap(ground, 40, 28, 40, 18, 4, 1);
  drawLineOnMap(ground, 28, 28, 40, 28, 4, 1);
  drawLineOnMap(ground, 40, 28, 52, 28, 4, 1);
  drawLineOnMap(ground, 20, 35, 28, 35, 4, 1);
  drawLineOnMap(ground, 52, 35, 60, 35, 4, 1);

  fillRectData(ground, 38, 26, 4, 2, 9);

  fillRectData(ground, 30, 48, 20, 7, 1);
  fillRectData(ground, 8, 52, 6, 5, 0);

  const deco = create2DArray<number>(W, H, -1);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x < 5 || x >= 75 || y < 5 || y >= 55) {
        deco[y][x] = 7;
      }
    }
  }

  drawRectOutline(deco, 27, 17, 26, 20, 5);
  drawRectOutline(deco, 31, 21, 18, 12, 5);

  deco[37][17] = 8;
  deco[43][17] = 8;
  deco[37][37] = 8;
  deco[43][37] = 8;
  deco[27][27] = 8;
  deco[52][27] = 8;

  for (let y = 5; y < 55; y++) {
    for (let x = 5; x < 75; x++) {
      if (deco[y][x] === -1 && ground[y][x] !== 2 && ground[y][x] !== 4 && ground[y][x] !== 9) {
        const h = hash2d(x, y, 32);
        if (h < 0.04) deco[y][x] = 5;
        else if (h < 0.07) deco[y][x] = 7;
      }
    }
  }

  for (const vp of voidPoolPositions) {
    placeCluster(deco, vp.x, vp.y, vp.r + 1, 6, 0.4, 1100 + vp.x);
  }

  const solidGround = new Set([2]);
  const solidDeco = new Set([5, 6, 7, 8]);
  const collisions = generateCollisions(ground, deco, W, H, solidGround, solidDeco);

  clearArea(ground, deco, collisions, 32, 23, 16, 8, 1);
  clearArea(ground, deco, collisions, 30, 49, 20, 5, 1);
  clearArea(ground, deco, collisions, 8, 53, 5, 3, 0);
  clearTileFromCollision(ground, deco, collisions, 4);
  clearTileFromCollision(ground, deco, collisions, 9);

  for (let y = 17; y < 20; y++) {
    for (let x = 36; x < 44; x++) {
      collisions[y][x] = false;
      deco[y][x] = -1;
    }
  }
  for (let y = 35; y < 38; y++) {
    for (let x = 36; x < 44; x++) {
      collisions[y][x] = false;
      deco[y][x] = -1;
    }
  }

  const spawns: SpawnPoint[] = [
    { entityId: 'void_creature', x: 20, y: 20, type: 'enemy', respawn: true },
    { entityId: 'void_creature', x: 58, y: 25, type: 'enemy', respawn: true },
    { entityId: 'void_creature', x: 15, y: 38, type: 'enemy', respawn: true },
    { entityId: 'void_creature', x: 60, y: 42, type: 'enemy', respawn: true },
    { entityId: 'mechanical_guard', x: 30, y: 30, type: 'enemy', respawn: true },
    { entityId: 'mechanical_guard', x: 50, y: 30, type: 'enemy', respawn: true },
    { entityId: 'mechanical_guard', x: 35, y: 42, type: 'enemy', respawn: true },
    { entityId: 'mechanical_guard', x: 45, y: 42, type: 'enemy', respawn: true },
    { entityId: 'noah', x: 40, y: 51, type: 'npc', respawn: false },
    { entityId: 'void_devourer', x: 40, y: 27, type: 'boss', respawn: false },
    { entityId: 'chest_ruins_1', x: 33, y: 19, type: 'chest', respawn: false },
    { entityId: 'chest_ruins_2', x: 47, y: 19, type: 'chest', respawn: false },
    { entityId: 'chest_ruins_3', x: 33, y: 35, type: 'chest', respawn: false },
    { entityId: 'chest_ruins_4', x: 47, y: 35, type: 'chest', respawn: false },
    { entityId: 'chest_ruins_5', x: 40, y: 10, type: 'chest', respawn: false },
  ];

  const transitions: MapTransition[] = [
    {
      x: 8, y: 53, width: 5, height: 3,
      targetRegion: Region.Snow, targetX: 39, targetY: 5,
    },
    {
      x: 38, y: 17, width: 4, height: 2,
      targetRegion: Region.HolyCity, targetX: 40, targetY: 55,
    },
  ];

  ensureWalkable(collisions, spawns);
  ensureWalkable(collisions, [{ x: 10, y: 54 }]);

  return {
    id: 'ruins',
    name: '星陨废墟',
    region: Region.Ruins,
    width: W,
    height: H,
    tileSize: TS,
    layers: [
      { name: 'ground', data: ground, visible: true },
      { name: 'decoration', data: deco, visible: true },
    ],
    collisions,
    spawns,
    transitions,
    ambientColor: 'rgba(120,60,180,0.2)',
    musicTrack: 'ruins_ambient',
  };
}

function generateHolyCityMap(): MapData {
  const W = 80, H = 60, TS = 32;

  const ground = create2DArray<number>(W, H, -1);

  fillRectData(ground, 20, 44, 40, 10, 0);
  for (let x = 20; x < 60; x++) {
    ground[44][x] = 1;
    ground[53][x] = 1;
  }

  fillRectData(ground, 25, 30, 30, 10, 0);
  for (let x = 25; x < 55; x++) {
    ground[30][x] = 1;
    ground[39][x] = 1;
  }

  fillRectData(ground, 28, 16, 24, 10, 0);
  for (let x = 28; x < 52; x++) {
    ground[16][x] = 1;
    ground[25][x] = 1;
  }

  fillRectData(ground, 32, 5, 16, 8, 0);
  for (let x = 32; x < 48; x++) {
    ground[5][x] = 1;
    ground[12][x] = 1;
  }

  for (let x = 36; x < 44; x++) {
    ground[40][x] = 6;
    ground[41][x] = 6;
    ground[42][x] = 6;
    ground[43][x] = 6;
  }
  for (let x = 36; x < 44; x++) {
    ground[26][x] = 6;
    ground[27][x] = 6;
    ground[28][x] = 6;
    ground[29][x] = 6;
  }
  for (let x = 36; x < 44; x++) {
    ground[12][x] = 6;
    ground[13][x] = 6;
  }

  fillRectData(ground, 35, 55, 10, 4, 0);
  for (let x = 35; x < 45; x++) {
    ground[55][x] = 1;
  }

  fillRectData(ground, 34, 34, 12, 2, 2);
  fillRectData(ground, 35, 20, 10, 2, 2);

  fillRectData(ground, 38, 8, 4, 2, 8);

  const deco = create2DArray<number>(W, H, -1);

  for (let x = 20; x < 60; x++) {
    if (hash2d(x, 44, 40) < 0.3) deco[44][x] = 5;
    if (hash2d(x, 53, 41) < 0.3) deco[53][x] = 5;
  }
  for (let x = 25; x < 55; x++) {
    if (hash2d(x, 30, 42) < 0.3) deco[30][x] = 5;
    if (hash2d(x, 39, 43) < 0.3) deco[39][x] = 5;
  }
  for (let x = 28; x < 52; x++) {
    if (hash2d(x, 16, 44) < 0.3) deco[16][x] = 5;
    if (hash2d(x, 25, 45) < 0.3) deco[25][x] = 5;
  }
  for (let x = 32; x < 48; x++) {
    if (hash2d(x, 5, 46) < 0.3) deco[5][x] = 5;
    if (hash2d(x, 12, 47) < 0.3) deco[12][x] = 5;
  }

  deco[30][30] = 7;
  deco[30][49] = 7;
  deco[39][30] = 7;
  deco[39][49] = 7;

  deco[16][33] = 7;
  deco[16][47] = 7;
  deco[25][33] = 7;
  deco[25][47] = 7;

  deco[32][38] = 4;
  deco[32][42] = 4;
  deco[22][38] = 4;
  deco[22][42] = 4;

  deco[18][35] = 4;
  deco[18][44] = 4;

  deco[7][36] = 4;
  deco[7][43] = 4;

  for (let x = 30; x < 50; x++) {
    if (hash2d(x, 31, 48) < 0.15) deco[31][x] = 3;
    if (hash2d(x, 32, 49) < 0.15) deco[32][x] = 3;
  }
  for (let x = 32; x < 48; x++) {
    if (hash2d(x, 17, 50) < 0.2) deco[17][x] = 3;
    if (hash2d(x, 18, 51) < 0.2) deco[18][x] = 3;
  }

  const voidRiftPositions = [
    { x: 22, y: 48 }, { x: 56, y: 48 },
    { x: 27, y: 34 }, { x: 52, y: 34 },
    { x: 30, y: 20 }, { x: 49, y: 20 },
  ];
  for (const vr of voidRiftPositions) {
    if (vr.x >= 0 && vr.x < W && vr.y >= 0 && vr.y < H) {
      deco[vr.y][vr.x] = 9;
    }
  }

  const solidGround = new Set([2]);
  const solidDeco = new Set([4, 7, 9]);
  const collisions = generateCollisions(ground, deco, W, H, solidGround, solidDeco, true);

  for (let y = 5; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (ground[y][x] === 6) {
        collisions[y][x] = false;
      }
    }
  }

  clearArea(ground, deco, collisions, 36, 40, 8, 4, 6);
  clearArea(ground, deco, collisions, 36, 26, 8, 4, 6);
  clearArea(ground, deco, collisions, 36, 12, 8, 2, 6);
  clearArea(ground, deco, collisions, 37, 56, 6, 3, 0);

  const spawns: SpawnPoint[] = [
    { entityId: 'holy_knight', x: 30, y: 47, type: 'enemy', respawn: true },
    { entityId: 'holy_knight', x: 50, y: 47, type: 'enemy', respawn: true },
    { entityId: 'holy_knight', x: 35, y: 33, type: 'enemy', respawn: true },
    { entityId: 'holy_knight', x: 45, y: 33, type: 'enemy', respawn: true },
    { entityId: 'angel_statue_alive', x: 32, y: 38, type: 'enemy', respawn: true },
    { entityId: 'angel_statue_alive', x: 48, y: 38, type: 'enemy', respawn: true },
    { entityId: 'angel_statue_alive', x: 36, y: 22, type: 'enemy', respawn: true },
    { entityId: 'angel_statue_alive', x: 44, y: 22, type: 'enemy', respawn: true },
    { entityId: 'guard_captain', x: 40, y: 35, type: 'npc', respawn: false },
    { entityId: 'fallen_saint', x: 40, y: 8, type: 'boss', respawn: false },
    { entityId: 'chest_holy_1', x: 25, y: 47, type: 'chest', respawn: false },
    { entityId: 'chest_holy_2', x: 55, y: 47, type: 'chest', respawn: false },
    { entityId: 'chest_holy_3', x: 40, y: 10, type: 'chest', respawn: false },
  ];

  const transitions: MapTransition[] = [
    {
      x: 37, y: 57, width: 6, height: 2,
      targetRegion: Region.Ruins, targetX: 40, targetY: 19,
    },
  ];

  ensureWalkable(collisions, spawns);
  ensureWalkable(collisions, transitions.map(t => ({ x: t.x + 2, y: t.y })));

  return {
    id: 'holy_city',
    name: '暮光圣城',
    region: Region.HolyCity,
    width: W,
    height: H,
    tileSize: TS,
    layers: [
      { name: 'ground', data: ground, visible: true },
      { name: 'decoration', data: deco, visible: true },
    ],
    collisions,
    spawns,
    transitions,
    ambientColor: 'rgba(255,240,200,0.15)',
    musicTrack: 'holy_city_ambient',
  };
}

const regionMaps: Record<number, () => MapData> = {
  [Region.Forest]: generateForestMap,
  [Region.Desert]: generateDesertMap,
  [Region.Snow]: generateSnowMap,
  [Region.Ruins]: generateRuinsMap,
  [Region.HolyCity]: generateHolyCityMap,
};

export { TileMap, RegionManager, DayNightCycle, WeatherSystem, regionMaps };
