import { getTile, TilePalettes } from './sprites';
import { Camera } from './engine';
import type { Particle } from './types';
import { MapData, Region } from './types';

export const TILE_SIZE = 32;
export const O = 1;

const TILE_KEYS: Record<number, string[]> = {
  [Region.Forest]: ['grass1','grass2','grass3','dirtPath','treeTrunkB','treeTrunkT','deepWater','rock','dirtPath','bushL','grass3'],
  [Region.Desert]: ['sand1','sand2','dirtPath','sand1','cactus1','deadBush','deepWater','sand1','dirtPath','sand2'],
  [Region.Snow]: ['snow1','snow2','ice1','water1','pineL','rock','icicleHang','snow1','snow2','rock'],
  [Region.Ruins]: ['void1','void2','void1','void1','brokenStone1','brokenStone2','rubblePile','ancientDoorway','void2','crystalGlow'],
  [Region.HolyCity]: ['holyGround1','holyGround2','water1','holyGround1','angelStatueBase','floatingPlatform','holyGround1','goldenPillar','thronePlatform','glowingRune'],
};

class TileKeyMap {
  private _map: Map<number, string> = new Map();
  constructor(keys: string[]) {
    keys.forEach((k, i) => {
      if (i > 0) this._map.set(i, k);
    });
  }
  get(index: number): string {
    return this._map.get(index) || 'grass1';
  }
}

export class TileMap {
  data: MapData;
  tileKeyMap: TileKeyMap;

  constructor(data: MapData) {
    this.data = data;
    this.tileKeyMap = new TileKeyMap(TILE_KEYS[data.region] || TILE_KEYS[Region.Forest]);
  }

  render(renderer: { drawTile: (tilePixels: number[][], x: number, y: number, palette: string[], cacheKey?: string) => void }, camera: Camera): void {
    const layers = this.data.layers;
    for (let li = 0; li < layers.length; li++) {
      const layer = layers[li];
      if (!layer.visible) continue;
      const layerData = layer.data;
      for (let y = 0; y < this.data.height; y++) {
        for (let x = 0; x < this.data.width; x++) {
          const tileVal = layerData[y][x];
          if (tileVal === 0) continue;
          const key = this.tileKeyMap.get(tileVal);
          const tile = getTile(key);
          const screenPos = camera.worldToScreen(x * TILE_SIZE, y * TILE_SIZE);
          if (screenPos.x > -TILE_SIZE && screenPos.x < camera.width + TILE_SIZE &&
              screenPos.y > -TILE_SIZE && screenPos.y < camera.height + TILE_SIZE) {
            renderer.drawTile(tile.data, screenPos.x, screenPos.y, TilePalettes[key] || TilePalettes['grass1'], key);
          }
        }
      }
    }
  }

  getTileAt(layerIndex: number, x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.data.width || y >= this.data.height) return -1;
    if (layerIndex < 0 || layerIndex >= this.data.layers.length) return -1;
    return this.data.layers[layerIndex].data[y][x];
  }

  isCollision(x: number, y: number): boolean {
    const tx = Math.floor(x / TILE_SIZE);
    const ty = Math.floor(y / TILE_SIZE);
    if (tx < 0 || ty < 0 || tx >= this.data.width || ty >= this.data.height) return true;
    return this.data.collisions[ty] !== undefined && this.data.collisions[ty][tx] === true;
  }

  getSpawnPoints(): Array<{ x: number; y: number; type: string }> {
    return this.data.spawns;
  }
}

export class RegionManager {
  currentRegion: Region = Region.Forest;
  currentMap: TileMap | null = null;
  mapCache: Map<number, TileMap> = new Map();

  loadRegion(regionId: Region): TileMap {
    if (this.mapCache.has(regionId)) {
      this.currentRegion = regionId;
      this.currentMap = this.mapCache.get(regionId)!;
      return this.currentMap;
    }
    const genFn = regionMaps[regionId];
    if (!genFn) throw new Error(`No generator for region ${regionId}`);
    const mapData = genFn(80, 60, TILE_SIZE);
    const map = new TileMap(mapData);
    this.mapCache.set(regionId, map);
    this.currentRegion = regionId;
    this.currentMap = map;
    return map;
  }

  getCurrentMap(): TileMap | null {
    return this.currentMap;
  }

  getCurrentRegion(): Region {
    return this.currentRegion;
  }
}

export class DayNightCycle {
  time: number = 0;
  dayLength: number = 120;
  sunAngle: number = 0;

  update(dt: number): void {
    this.time += dt / this.dayLength;
    if (this.time >= 1) this.time -= 1;
    this.sunAngle = this.time * Math.PI * 2;
  }

  getAmbientColor(): string {
    const t = this.time;
    if (t < 0.2) {
      return this.lerpColor('#1a1a2e', '#ff9966', t / 0.2);
    } else if (t < 0.35) {
      return this.lerpColor('#ff9966', '#87ceeb', (t - 0.2) / 0.15);
    } else if (t < 0.65) {
      return '#87ceeb';
    } else if (t < 0.8) {
      return this.lerpColor('#87ceeb', '#ff6347', (t - 0.65) / 0.15);
    } else {
      return this.lerpColor('#ff6347', '#1a1a2e', (t - 0.8) / 0.2);
    }
  }

  isDay(): boolean {
    return this.time > 0.22 && this.time < 0.78;
  }

  private lerpColor(a: string, b: string, t: number): string {
    const ca = this.hexToRgb(a);
    const cb = this.hexToRgb(b);
    if (!ca || !cb) return a;
    const r = Math.round(ca.r + (cb.r - ca.r) * t);
    const g = Math.round(ca.g + (cb.g - ca.g) * t);
    const bl = Math.round(ca.b + (cb.b - ca.b) * t);
    return `rgb(${r},${g},${bl})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
}

export class WeatherSystem {
  particles: Particle[] = [];
  weatherType: string = 'clear';
  intensity: number = 1;
  timer: number = 0;

  setWeather(type: string, duration: number): void {
    this.weatherType = type;
    this.timer = duration;
    this.particles = [];
  }

  update(dt: number, w: number, h: number): void {
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.weatherType = 'clear';
        this.particles = [];
      }
    }
    if (this.weatherType === 'clear') return;

    const spawnRate = this.intensity * 10;
    for (let i = 0; i < spawnRate; i++) {
      if (Math.random() < 0.3) {
        let p: Particle;
        switch (this.weatherType) {
          case 'rain':
            p = {
              x: Math.random() * w,
              y: -5,
              vx: -40 - Math.random() * 30,
              vy: 300 + Math.random() * 100,
              life: 1.5 + Math.random(),
              maxLife: 1.5 + Math.random(),
              size: 1 + Math.random(),
              color: '#8899bb',
              type: 'rain'
            };
            break;
          case 'snow':
            p = {
              x: Math.random() * w,
              y: -5,
              vx: -10 + Math.random() * 20,
              vy: 30 + Math.random() * 30,
              life: 4 + Math.random() * 3,
              maxLife: 4 + Math.random() * 3,
              size: 1.5 + Math.random() * 1.5,
              color: '#ffffff',
              type: 'snow'
            };
            break;
          case 'sand':
            p = {
              x: Math.random() * w,
              y: Math.random() * h * 0.5,
              vx: -(80 + Math.random() * 60),
              vy: -5 + Math.random() * 10,
              life: 2 + Math.random() * 2,
              maxLife: 2 + Math.random() * 2,
              size: 1 + Math.random() * 2,
              color: '#d4a050',
              type: 'sand'
            };
            break;
          default:
            continue;
        }
        this.particles.push(p);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0 || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(renderer: { drawRect: (x: number, y: number, w: number, h: number, color: string) => void }, camera: Camera): void {
    for (const p of this.particles) {
      const sp = camera.worldToScreen(p.x, p.y);
      if (sp.x >= -5 && sp.x <= camera.width + 5 && sp.y >= -5 && sp.y <= camera.height + 5) {
        renderer.drawRect(sp.x, sp.y, p.size, p.size, p.color);
      }
    }
  }
}

function noiseLike(x: number, y: number, w: number, h: number, threshold: number): boolean {
  const nx = x / w * 12.9898;
  const ny = y / h * 78.233;
  const val = Math.sin(nx * 43758.5453 + ny * 23421.6312) * 43758.5453;
  return (val % 1) < threshold;
}

function ensureWalkable(collisions: boolean[][], points: Array<{ x: number; y: number }>): void {
  for (const pt of points) {
    const tx = Math.floor(pt.x / TILE_SIZE);
    const ty = Math.floor(pt.y / TILE_SIZE);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = tx + dx;
        const cy = ty + dy;
        if (cy >= 0 && cy < collisions.length && cx >= 0 && cx < collisions[cy].length) {
          collisions[cy][cx] = false;
        }
      }
    }
  }
}

function createEmptyLayers(W: number, H: number): Array<{ name: string; data: number[][]; visible: boolean }> {
  const ground: number[][] = [];
  const decoration: number[][] = [];
  for (let y = 0; y < H; y++) {
    ground[y] = [];
    decoration[y] = [];
    for (let x = 0; x < W; x++) {
      ground[y][x] = 0;
      decoration[y][x] = 0;
    }
  }
  return [
    { name: 'ground', data: ground, visible: true },
    { name: 'decoration', data: decoration, visible: true },
  ];
}

function createEmptyCollisions(W: number, H: number): boolean[][] {
  const c: boolean[][] = [];
  for (let y = 0; y < H; y++) {
    c[y] = [];
    for (let x = 0; x < W; x++) {
      c[y][x] = false;
    }
  }
  return c;
}

export function generateForestMap(W: number, H: number, TS: number): MapData {
  const layers = createEmptyLayers(W, H);
  const ground = layers[0].data;
  const deco = layers[1].data;
  const collisions = createEmptyCollisions(W, H);
  const grassTiles = [1, 2, 3];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      ground[y][x] = grassTiles[Math.floor(Math.random() * grassTiles.length)];
    }
  }

  const pathWidth = 2;
  const pathTile = 4;
  let px = 0;
  let py = Math.floor(H / 2);
  for (let step = 0; step < W + 40; step++) {
    for (let w = -pathWidth; w <= pathWidth; w++) {
      const tx = px + w;
      const ty = py + Math.floor(w * 0.3);
      if (ty >= 0 && ty < H && tx >= 0 && tx < W) {
        ground[ty][tx] = pathTile;
        collisions[ty][tx] = false;
      }
    }
    px++;
    if (Math.random() < 0.25) py += Math.random() < 0.5 ? -1 : 1;
    if (py < 3) py = 3;
    if (py > H - 4) py = H - 4;
  }

  px = Math.floor(W / 3);
  py = 0;
  for (let step = 0; step < H + 20; step++) {
    for (let w = -pathWidth; w <= pathWidth; w++) {
      const tx = px + Math.floor(w * 0.3);
      const ty = py + w;
      if (ty >= 0 && ty < H && tx >= 0 && tx < W) {
        ground[ty][tx] = pathTile;
        collisions[ty][tx] = false;
      }
    }
    py++;
    if (Math.random() < 0.2) px += Math.random() < 0.5 ? -1 : 1;
    if (px < 3) px = 3;
    if (px > W - 4) px = W - 4;
  }

  const treePositions: Array<[number, number]> = [];
  for (let i = 0; i < 80; i++) {
    const tx = 5 + Math.floor(Math.random() * (W - 10));
    const ty = 3 + Math.floor(Math.random() * (H - 6));
    if (ground[ty][tx] !== pathTile && !noiseLike(tx, ty, W, H, 0.45)) {
      treePositions.push([tx, ty]);
    }
  }

  for (const [tx, ty] of treePositions) {
    if (ty > 0 && ty < H && tx >= 0 && tx < W) {
      deco[ty][tx] = 5;
      collisions[ty][tx] = true;
      if (ty - 1 >= 0) {
        deco[ty - 1][tx] = 6;
        collisions[ty - 1][tx] = true;
      }
    }
  }

  const pondCount = 3 + Math.floor(Math.random() * 3);
  for (let p = 0; p < pondCount; p++) {
    const pcx = 8 + Math.floor(Math.random() * (W - 16));
    const pcy = 8 + Math.floor(Math.random() * (H - 16));
    const pr = 2 + Math.floor(Math.random() * 3);
    for (let dy = -pr; dy <= pr; dy++) {
      for (let dx = -pr; dx <= pr; dx++) {
        if (dx * dx + dy * dy <= pr * pr) {
          const wx = pcx + dx;
          const wy = pcy + dy;
          if (wy >= 0 && wy < H && wx >= 0 && wx < W) {
            ground[wy][wx] = 7;
            collisions[wy][wx] = true;
          }
        }
      }
    }
  }

  for (let i = 0; i < 30; i++) {
    const rx = Math.floor(Math.random() * W);
    const ry = Math.floor(Math.random() * H);
    if (ground[ry][rx] !== pathTile && collisions[ry][rx] !== true) {
      deco[ry][rx] = 8;
      collisions[ry][rx] = true;
    }
  }

  for (let i = 0; i < 20; i++) {
    const lx = Math.floor(Math.random() * W);
    const ly = Math.floor(Math.random() * H);
    if (ground[ly][lx] !== pathTile && collisions[ly][lx] !== true) {
      deco[ly][lx] = 9;
    }
  }

  for (let i = 0; i < 25; i++) {
    const bx = Math.floor(Math.random() * W);
    const by = Math.floor(Math.random() * H);
    if (ground[by][bx] !== pathTile && collisions[by][bx] !== true) {
      deco[by][bx] = 10;
    }
  }

  const spawns: Array<{ x: number; y: number; type: string }> = [
    { x: 5 * TS, y: Math.floor(H / 2) * TS, type: 'player' },
    { x: 15 * TS, y: 12 * TS, type: 'enemy' },
    { x: 35 * TS, y: 25 * TS, type: 'enemy' },
    { x: 55 * TS, y: 18 * TS, type: 'enemy' },
    { x: 25 * TS, y: 42 * TS, type: 'enemy' },
    { x: 65 * TS, y: 38 * TS, type: 'enemy' },
    { x: 10 * TS, y: 28 * TS, type: 'npc_eileen' },
  ];

  const transitions = [
    { x: (W - 2) * TS, y: 28 * TS, width: TS * 2, height: TS * 4, targetRegion: Region.Desert, targetX: 3 * TS, targetY: 29 * TS },
    { x: 33 * TS, y: 0, width: TS * 4, height: TS * 2, targetRegion: Region.Snow, targetX: 35 * TS, targetY: (H - 3) * TS },
  ];

  ensureWalkable(collisions, spawns.map(s => ({ x: s.x, y: s.y })));
  transitions.forEach(t => {
    ensureWalkable(collisions, [{ x: t.x, y: t.y }]);
  });

  return {
    id: 'forest_map',
    name: '暮光森林',
    region: Region.Forest,
    width: W,
    height: H,
    tileSize: TS,
    layers,
    collisions,
    spawns,
    transitions,
    ambientColor: 'rgba(100,180,80,0.1)',
    musicTrack: 'forest_theme',
  };
}

export function generateDesertMap(W: number, H: number, TS: number): MapData {
  const layers = createEmptyLayers(W, H);
  const ground = layers[0].data;
  const deco = layers[1].data;
  const collisions = createEmptyCollisions(W, H);
  const sandTiles = [1, 2];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      ground[y][x] = sandTiles[Math.floor(Math.random() * sandTiles.length)];
    }
  }

  for (let row = 15; row <= H - 15; row += 12) {
    for (let x = 0; x < W; x++) {
      ground[row][x] = 3;
      ground[row + 1][x] = 3;
      collisions[row][x] = false;
      collisions[row + 1][x] = false;
    }
  }

  for (let col = 15; col <= W - 15; col += 14) {
    for (let y = 0; y < H; y++) {
      ground[y][col] = 3;
      ground[y][col + 1] = 3;
      collisions[y][col] = false;
      collisions[y][col + 1] = false;
    }
  }

  for (let i = 0; i < 35; i++) {
    const cx = 5 + Math.floor(Math.random() * (W - 10));
    const cy = 3 + Math.floor(Math.random() * (H - 6));
    if (ground[cy][cx] === 3) continue;
    deco[cy][cx] = 5;
    if (Math.random() < 0.3 && cy + 1 < H) {
      deco[cy + 1][cx] = 5;
    }
    collisions[cy][cx] = true;
  }

  for (let i = 0; i < 18; i++) {
    const dx = Math.floor(Math.random() * W);
    const dy = Math.floor(Math.random() * H);
    if (ground[dy][dx] !== 3) {
      deco[dy][dx] = 6;
    }
  }

  const oasisPositions: Array<[number, number]> = [
    [18, 18],
    [55, 40],
    [38, 12],
  ];
  for (const [ox, oy] of oasisPositions) {
    const or = 3 + Math.floor(Math.random() * 2);
    for (let dy = -or; dy <= or; dy++) {
      for (let dx = -or; dx <= or; dx++) {
        if (dx * dx + dy * dy <= or * or) {
          const wx = ox + dx;
          const wy = oy + dy;
          if (wy >= 0 && wy < H && wx >= 0 && wx < W) {
            ground[wy][wx] = 7;
            collisions[wy][wx] = true;
          }
        }
      }
    }
  }

  const ruinAreas: Array<{ x: number; y: number; w: number; h: number }> = [
    { x: 28, y: 22, w: 10, h: 8 },
    { x: 52, y: 14, w: 8, h: 7 },
    { x: 12, y: 42, w: 9, h: 6 },
  ];

  for (const ruin of ruinAreas) {
    for (let dy = 0; dy < ruin.h; dy++) {
      for (let dx = 0; dx < ruin.w; dx++) {
        const rx = ruin.x + dx;
        const ry = ruin.y + dy;
        if (ry >= 0 && ry < H && rx >= 0 && rx < W) {
          const isEdge = dx === 0 || dx === ruin.w - 1 || dy === 0 || dy === ruin.h - 1;
          if (isEdge) {
            deco[ry][rx] = 4;
            collisions[ry][rx] = true;
          } else {
            ground[ry][rx] = 4;
          }
        }
      }
    }
  }

  const spawns: Array<{ x: number; y: number; type: string }> = [
    { x: 5 * TS, y: Math.floor(H / 2) * TS, type: 'player' },
    { x: 20 * TS, y: 10 * TS, type: 'enemy' },
    { x: 45 * TS, y: 30 * TS, type: 'enemy' },
    { x: 62 * TS, y: 18 * TS, type: 'enemy' },
    { x: 30 * TS, y: 48 * TS, type: 'enemy' },
    { x: 68 * TS, y: 44 * TS, type: 'enemy' },
    { x: 14 * TS, y: 26 * TS, type: 'npc_gregor' },
  ];

  const transitions = [
    { x: 0, y: 28 * TS, width: TS * 2, height: TS * 4, targetRegion: Region.Forest, targetX: (W - 4) * TS, targetY: 29 * TS },
    { x: 36 * TS, y: (H - 2) * TS, width: TS * 4, height: TS * 2, targetRegion: Region.Ruins, targetX: 38 * TS, targetY: 3 * TS },
  ];

  ensureWalkable(collisions, spawns.map(s => ({ x: s.x, y: s.y })));
  transitions.forEach(t => {
    ensureWalkable(collisions, [{ x: t.x, y: t.y }]);
  });

  return {
    id: 'desert_map',
    name: '流沙荒原',
    region: Region.Desert,
    width: W,
    height: H,
    tileSize: TS,
    layers,
    collisions,
    spawns,
    transitions,
    ambientColor: 'rgba(200,160,80,0.1)',
    musicTrack: 'desert_theme',
  };
}

export function generateSnowMap(W: number, H: number, TS: number): MapData {
  const layers = createEmptyLayers(W, H);
  const ground = layers[0].data;
  const deco = layers[1].data;
  const collisions = createEmptyCollisions(W, H);
  const snowTiles = [1, 2, 3];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      ground[y][x] = snowTiles[Math.floor(Math.random() * snowTiles.length)];
    }
  }

  for (let i = 0; i < 5; i++) {
    const ix = 5 + Math.floor(Math.random() * (W - 10));
    const iy = 3 + Math.floor(Math.random() * (H - 6));
    const iw = 4 + Math.floor(Math.random() * 6);
    const ih = 3 + Math.floor(Math.random() * 4);
    for (let dy = 0; dy < ih; dy++) {
      for (let dx = 0; dx < iw; dx++) {
        const ex = ix + dx;
        const ey = iy + dy;
        if (ey >= 0 && ey < H && ex >= 0 && ex < W) {
          ground[ey][ex] = 3;
        }
      }
    }
  }

  const lakeCenters: Array<[number, number]> = [
    [20, 35],
    [58, 18],
    [40, 48],
  ];
  for (const [lcx, lcy] of lakeCenters) {
    const lr = 3 + Math.floor(Math.random() * 3);
    for (let dy = -lr; dy <= lr; dy++) {
      for (let dx = -lr; dx <= lr; dx++) {
        if (dx * dx + dy * dy <= lr * lr) {
          const wx = lcx + dx;
          const wy = lcy + dy;
          if (wy >= 0 && wy < H && wx >= 0 && wx < W) {
            ground[wy][wx] = 4;
            collisions[wy][wx] = true;
          }
        }
      }
    }
  }

  for (let i = 0; i < 50; i++) {
    const px = 4 + Math.floor(Math.random() * (W - 8));
    const py = 3 + Math.floor(Math.random() * (H - 6));
    if (ground[py][px] > 3) continue;
    if (!noiseLike(px, py, W, H, 0.5)) {
      deco[py][px] = 5;
      collisions[py][px] = true;
      if (py - 1 >= 0) {
        deco[py - 1][px] = 5;
        collisions[py - 1][px] = true;
      }
    }
  }

  for (let i = 0; i < 20; i++) {
    const rx = Math.floor(Math.random() * W);
    const ry = Math.floor(Math.random() * H);
    if (collisions[ry][rx] !== true) {
      deco[ry][rx] = 6;
      collisions[ry][rx] = true;
    }
  }

  for (let i = 0; i < 15; i++) {
    const ix = Math.floor(Math.random() * W);
    const iy = Math.floor(Math.random() * (H * 0.4));
    if (iy < H && ix >= 0 && ix < W) {
      deco[iy][ix] = 7;
    }
  }

  const spawns: Array<{ x: number; y: number; type: string }> = [
    { x: 5 * TS, y: Math.floor(H / 2) * TS, type: 'player' },
    { x: 18 * TS, y: 14 * TS, type: 'enemy' },
    { x: 42 * TS, y: 28 * TS, type: 'enemy' },
    { x: 60 * TS, y: 20 * TS, type: 'enemy' },
    { x: 28 * TS, y: 46 * TS, type: 'enemy' },
    { x: 66 * TS, y: 40 * TS, type: 'enemy' },
    { x: 12 * TS, y: 32 * TS, type: 'npc_vera' },
  ];

  const transitions = [
    { x: 36 * TS, y: (H - 2) * TS, width: TS * 4, height: TS * 2, targetRegion: Region.HolyCity, targetX: 38 * TS, targetY: 3 * TS },
    { x: 0, y: 28 * TS, width: TS * 2, height: TS * 4, targetRegion: Region.Forest, targetX: (W - 4) * TS, targetY: 29 * TS },
  ];

  ensureWalkable(collisions, spawns.map(s => ({ x: s.x, y: s.y })));
  transitions.forEach(t => {
    ensureWalkable(collisions, [{ x: t.x, y: t.y }]);
  });

  return {
    id: 'snow_map',
    name: '永霜雪原',
    region: Region.Snow,
    width: W,
    height: H,
    tileSize: TS,
    layers,
    collisions,
    spawns,
    transitions,
    ambientColor: 'rgba(200,220,240,0.15)',
    musicTrack: 'snow_theme',
  };
}

export function generateRuinsMap(W: number, H: number, TS: number): MapData {
  const layers = createEmptyLayers(W, H);
  const ground = layers[0].data;
  const deco = layers[1].data;
  const collisions = createEmptyCollisions(W, H);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      ground[y][x] = (Math.random() < 0.5) ? 1 : 2;
    }
  }

  const voidPatches: Array<[number, number, number]> = [
    [15, 15, 4],
    [55, 10, 3],
    [35, 40, 5],
    [62, 38, 3],
    [10, 45, 3],
  ];
  for (const [vx, vy, vr] of voidPatches) {
    for (let dy = -vr; dy <= vr; dy++) {
      for (let dx = -vr; dx <= vr; dx++) {
        if (dx * dx + dy * dy <= vr * vr) {
          const wx = vx + dx;
          const wy = vy + dy;
          if (wy >= 0 && wy < H && wx >= 0 && wx < W) {
            ground[wy][wx] = 3;
            collisions[wy][wx] = true;
          }
        }
      }
    }
  }

  for (const [vx, vy, vr] of voidPatches) {
    const cr = vr + 2;
    for (let dy = -cr; dy <= cr; dy++) {
      for (let dx = -cr; dx <= cr; dx++) {
        if (dx * dx + dy * dy <= cr * cr && dx * dx + dy * dy > vr * vr) {
          const wx = vx + dx;
          const wy = vy + dy;
          if (wy >= 0 && wy < H && wx >= 0 && wx < W) {
            if (Math.random() < 0.25) {
              deco[wy][wx] = 4;
            }
          }
        }
      }
    }
  }

  for (let y = 10; y <= H - 10; y += 10) {
    for (let x = 5; x < W - 5; x++) {
      if (ground[y][x] !== 3 && Math.random() < 0.15) {
        ground[y][x] = 5;
      }
    }
  }

  for (let x = 20; x < W - 20; x += 15) {
    for (let y = 5; y < H - 5; y++) {
      if (ground[y][x] !== 3 && Math.random() < 0.12) {
        deco[y][x] = 6;
      }
    }
  }

  for (let i = 0; i < 25; i++) {
    const rx = Math.floor(Math.random() * W);
    const ry = Math.floor(Math.random() * H);
    if (collisions[ry][rx] !== true) {
      deco[ry][rx] = 7;
      collisions[ry][rx] = true;
    }
  }

  const centerX = Math.floor(W / 2);
  const centerY = Math.floor(H / 2);
  for (let dy = -2; dy <= 3; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const ax = centerX + dx;
      const ay = centerY + dy;
      if (ay >= 0 && ay < H && ax >= 0 && ax < W) {
        deco[ay][ax] = 8;
        if (dy === 3) collisions[ay][ax] = true;
      }
    }
  }

  const vcx = centerX + 10;
  const vcy = centerY - 8;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const wx = vcx + dx;
      const wy = vcy + dy;
      if (wy >= 0 && wy < H && wx >= 0 && wx < W) {
        deco[wy][wx] = 10;
        collisions[wy][wx] = true;
      }
    }
  }

  for (let i = 0; i < 18; i++) {
    const cx = Math.floor(Math.random() * W);
    const cy = Math.floor(Math.random() * H);
    if (cy >= 0 && cy < H && cx >= 0 && cx < W) {
      ground[cy][cx] = 9;
    }
  }

  const spawns: Array<{ x: number; y: number; type: string }> = [
    { x: 5 * TS, y: Math.floor(H / 2) * TS, type: 'player' },
    { x: 18 * TS, y: 18 * TS, type: 'enemy' },
    { x: 40 * TS, y: 12 * TS, type: 'enemy' },
    { x: 58 * TS, y: 32 * TS, type: 'enemy' },
    { x: 25 * TS, y: 44 * TS, type: 'enemy' },
    { x: 65 * TS, y: 20 * TS, type: 'enemy' },
    { x: centerX * TS, y: (centerY + 8) * TS, type: 'npc_noah' },
  ];

  const transitions = [
    { x: 36 * TS, y: 0, width: TS * 4, height: TS * 2, targetRegion: Region.Desert, targetX: 38 * TS, targetY: (H - 3) * TS },
    { x: (W - 2) * TS, y: 28 * TS, width: TS * 2, height: TS * 4, targetRegion: Region.Snow, targetX: 3 * TS, targetY: 29 * TS },
  ];

  ensureWalkable(collisions, spawns.map(s => ({ x: s.x, y: s.y })));
  transitions.forEach(t => {
    ensureWalkable(collisions, [{ x: t.x, y: t.y }]);
  });

  return {
    id: 'ruins_map',
    name: '虚空废墟',
    region: Region.Ruins,
    width: W,
    height: H,
    tileSize: TS,
    layers,
    collisions,
    spawns,
    transitions,
    ambientColor: 'rgba(80,40,120,0.15)',
    musicTrack: 'ruins_theme',
  };
}

export function generateHolyCityMap(W: number, H: number, TS: number): MapData {
  const layers = createEmptyLayers(W, H);
  const ground = layers[0].data;
  const deco = layers[1].data;
  const collisions = createEmptyCollisions(W, H);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      ground[y][x] = ((x + y) % 2 === 0) ? 1 : 2;
    }
  }

  const fountains: Array<[number, number]> = [
    [18, 18],
    [58, 18],
    [38, 40],
  ];
  for (const [fx, fy] of fountains) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const wx = fx + dx;
        const wy = fy + dy;
        if (wy >= 0 && wy < H && wx >= 0 && wx < W) {
          if (dx * dx + dy * dy <= 4) {
            ground[wy][wx] = 3;
            collisions[wy][wx] = true;
          }
        }
      }
    }
  }

  for (let col = 8; col < W - 8; col += 12) {
    for (let row = 5; row < H - 5; row += 10) {
      if ((col + row) % 24 < 12) {
        deco[row][col] = 4;
        deco[row + 1][col] = 4;
        collisions[row][col] = true;
        collisions[row + 1][col] = true;
      }
    }
  }

  const centerPathX = Math.floor(W / 2);
  for (let y = 2; y < H - 2; y++) {
    for (let dx = -1; dx <= 1; dx++) {
      const sx = centerPathX + dx;
      if (sx >= 0 && sx < W) {
        deco[y][sx] = 5;
        collisions[y][sx] = false;
      }
    }
  }

  for (let y = 8; y < H - 8; y += 10) {
    for (let dx = -3; dx <= 3; dx++) {
      const px = centerPathX + dx;
      if (px >= 0 && px < W && y >= 0 && y < H) {
        ground[y][px] = 6;
      }
    }
  }

  const floatingIslands: Array<[number, number, number, number]> = [
    [14, 10, 5, 3],
    [60, 8, 6, 3],
    [12, 42, 4, 3],
    [64, 44, 5, 3],
  ];
  for (const [ix, iy, iw, ih] of floatingIslands) {
    for (let dy = 0; dy < ih; dy++) {
      for (let dx = 0; dx < iw; dx++) {
        const wx = ix + dx;
        const wy = iy + dy;
        if (wy >= 0 && wy < H && wx >= 0 && wx < W) {
          deco[wy][wx] = 6;
          collisions[wy][wx] = true;
        }
      }
    }
  }

  const throneX = Math.floor(W / 2);
  const throneY = Math.floor(H / 2);
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const tx = throneX + dx;
      const ty = throneY + dy;
      if (ty >= 0 && ty < H && tx >= 0 && tx < W) {
        deco[ty][tx] = 8;
        collisions[ty][tx] = (dy === 2);
      }
    }
  }

  for (let edge = 0; edge < W; edge += 8) {
    if (Math.random() < 0.35) {
      const ey = Math.random() < 0.5 ? 1 + Math.floor(Math.random() * 3) : H - 2 - Math.floor(Math.random() * 3);
      if (ey >= 0 && ey < H) {
        ground[ey][edge] = 9;
        if (edge + 1 < W) ground[ey][edge + 1] = 9;
      }
    }
  }

  for (let i = 0; i < 12; i++) {
    const gx = 10 + Math.floor(Math.random() * (W - 20));
    const gy = 5 + Math.floor(Math.random() * (H - 10));
    if (gy >= 0 && gy < H && gx >= 0 && gx < W) {
      deco[gy][gx] = 10;
    }
  }

  const spawns: Array<{ x: number; y: number; type: string }> = [
    { x: 5 * TS, y: Math.floor(H / 2) * TS, type: 'player' },
    { x: 22 * TS, y: 14 * TS, type: 'enemy' },
    { x: 50 * TS, y: 26 * TS, type: 'enemy' },
    { x: 64 * TS, y: 16 * TS, type: 'enemy' },
    { x: 30 * TS, y: 46 * TS, type: 'enemy' },
    { x: (centerPathX - 4) * TS, y: (throneY + 6) * TS, type: 'npc_kashim' },
    { x: (centerPathX + 5) * TS, y: 14 * TS, type: 'npc_guard_captain' },
  ];

  const transitions = [
    { x: 36 * TS, y: 0, width: TS * 4, height: TS * 2, targetRegion: Region.Snow, targetX: 38 * TS, targetY: (H - 3) * TS },
    { x: 0, y: 28 * TS, width: TS * 2, height: TS * 4, targetRegion: Region.Ruins, targetX: (W - 4) * TS, targetY: 29 * TS },
  ];

  ensureWalkable(collisions, spawns.map(s => ({ x: s.x, y: s.y })));
  transitions.forEach(t => {
    ensureWalkable(collisions, [{ x: t.x, y: t.y }]);
  });

  return {
    id: 'holycity_map',
    name: '圣辉之城',
    region: Region.HolyCity,
    width: W,
    height: H,
    tileSize: TS,
    layers,
    collisions,
    spawns,
    transitions,
    ambientColor: 'rgba(255,220,150,0.1)',
    musicTrack: 'holycity_theme',
  };
}

export const regionMaps: Record<number, (w: number, h: number, ts: number) => MapData> = {
  [Region.Forest]: generateForestMap,
  [Region.Desert]: generateDesertMap,
  [Region.Snow]: generateSnowMap,
  [Region.Ruins]: generateRuinsMap,
  [Region.HolyCity]: generateHolyCityMap,
};
