import { SpriteData, SpriteFrame, SpriteAnimation } from './types';

class PixelCanvas {
  w: number;
  h: number;
  px: number[][];

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = [];
    for (let y = 0; y < h; y++) {
      this.px[y] = new Array(w).fill(0);
    }
  }

  set(x: number, y: number, c: number): void {
    if (x >= 0 && x < this.w && y >= 0 && y < this.h) {
      this.px[y][x] = c;
    }
  }

  get(x: number, y: number): number {
    if (x >= 0 && x < this.w && y >= 0 && y < this.h) return this.px[y][x];
    return -1;
  }

  rect(x: number, y: number, w: number, h: number, c: number): void {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        this.set(x + dx, y + dy, c);
  }

  rectOutline(x: number, y: number, w: number, h: number, c: number): void {
    for (let dx = 0; dx < w; dx++) { this.set(x + dx, y, c); this.set(x + dx, y + h - 1, c); }
    for (let dy = 0; dy < h; dy++) { this.set(x, y + dy, c); this.set(x + w - 1, y + dy, c); }
  }

  circle(cx: number, cy: number, r: number, c: number): void {
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++)
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) this.set(x, y, c);
  }

  circleOutline(cx: number, cy: number, r: number, c: number): void {
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++) {
        const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d <= r * r && d > (r - 1) * (r - 1)) this.set(x, y, c);
      }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: number): void {
    for (let y = cy - ry; y <= cy + ry; y++)
      for (let x = cx - rx; x <= cx + rx; x++)
        if (rx > 0 && ry > 0 && ((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry) <= 1)
          this.set(x, y, c);
  }

  line(x1: number, y1: number, x2: number, y2: number, c: number): void {
    const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
    let err = dx - dy, x = x1, y = y1;
    while (true) {
      this.set(x, y, c);
      if (x === x2 && y === y2) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }

  outline(oc: number): void {
    const edges: [number, number][] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.px[y][x] !== 0) {
          const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
          for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < this.w && ny >= 0 && ny < this.h && this.px[ny][nx] === 0) {
              edges.push([nx, ny]);
            }
          }
        }
      }
    }
    for (const [x, y] of edges) {
      if (this.px[y][x] === 0) this.px[y][x] = oc;
    }
  }

  shadeRegion(x: number, y: number, w: number, h: number, offset: number): void {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++) {
        const px = x + dx, py = y + dy;
        if (px >= 0 && px < this.w && py >= 0 && py < this.h) {
          const v = this.px[py][px];
          if (v > 0) this.px[py][px] = v + offset;
        }
      }
  }

  dither(x: number, y: number, w: number, h: number, c1: number, c2: number): void {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++) {
        const px = x + dx, py = y + dy;
        if (px >= 0 && px < this.w && py >= 0 && py < this.h) {
          if ((dx + dy) % 2 === 0) this.set(px, py, c1);
          else this.set(px, py, c2);
        }
      }
  }

  replaceColor(oldC: number, newC: number): void {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (this.px[y][x] === oldC) this.px[y][x] = newC;
  }

  clone(): PixelCanvas {
    const c = new PixelCanvas(this.w, this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        c.px[y][x] = this.px[y][x];
    return c;
  }

  mirrorH(): PixelCanvas {
    const c = new PixelCanvas(this.w, this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        c.px[y][this.w - 1 - x] = this.px[y][x];
    return c;
  }

  shiftDown(amount: number): PixelCanvas {
    const c = new PixelCanvas(this.w, this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (y - amount >= 0 && y - amount < this.h) c.px[y][x] = this.px[y - amount][x];
    return c;
  }

  shiftRight(amount: number): PixelCanvas {
    const c = new PixelCanvas(this.w, this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (x - amount >= 0 && x - amount < this.w) c.px[y][x] = this.px[y][x - amount];
    return c;
  }

  overlay(other: PixelCanvas, ox: number, oy: number): void {
    for (let y = 0; y < other.h; y++)
      for (let x = 0; x < other.w; x++) {
        const v = other.px[y][x];
        if (v !== 0) this.set(ox + x, oy + y, v);
      }
  }

  toFrame(): SpriteFrame {
    return {
      data: this.px.map(row => [...row]),
      width: this.w,
      height: this.h,
    };
  }
}

function makeAnim(name: string, frames: SpriteFrame[], frameDuration: number, loop: boolean): SpriteAnimation {
  return { name, frames, frameDuration, loop };
}

function shiftFrame(frame: SpriteFrame, dx: number, dy: number): SpriteFrame {
  const c = new PixelCanvas(frame.width, frame.height);
  for (let y = 0; y < frame.height; y++)
    for (let x = 0; x < frame.width; x++) {
      const v = frame.data[y][x];
      if (v !== 0) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < frame.width && ny >= 0 && ny < frame.height) {
          c.px[ny][nx] = v;
        }
      }
    }
  return c.toFrame();
}

function mirrorFrame(frame: SpriteFrame): SpriteFrame {
  const c = new PixelCanvas(frame.width, frame.height);
  for (let y = 0; y < frame.height; y++)
    for (let x = 0; x < frame.width; x++)
      c.px[y][frame.width - 1 - x] = frame.data[y][x];
  return c.toFrame();
}

function swapColorsFrame(frame: SpriteFrame, swaps: Record<number, number>): SpriteFrame {
  const c = new PixelCanvas(frame.width, frame.height);
  for (let y = 0; y < frame.height; y++)
    for (let x = 0; x < frame.width; x++) {
      const v = frame.data[y][x];
      c.px[y][x] = swaps[v] !== undefined ? swaps[v] : v;
    }
  return c.toFrame();
}

function flashFrame(frame: SpriteFrame, flashColor: number): SpriteFrame {
  const c = new PixelCanvas(frame.width, frame.height);
  for (let y = 0; y < frame.height; y++)
    for (let x = 0; x < frame.width; x++) {
      c.px[y][x] = frame.data[y][x] !== 0 ? flashColor : 0;
    }
  return c.toFrame();
}

// ============================================================
// PALETTES
// ============================================================

const PLAYER_PALETTE = [
  '',
  '#1a1a2e',
  '#0f1a2e',
  '#1a3a5c',
  '#2a5a8c',
  '#3a7aac',
  '#7a7a8a',
  '#a0a0b0',
  '#d0d0e0',
  '#b07840',
  '#d4975a',
  '#f0c080',
  '#3a1f0a',
  '#5a3520',
  '#7a5030',
  '#2a2a2a',
  '#4a4a4a',
  '#6080a0',
  '#90b0d0',
  '#c0e0ff',
  '#5a3010',
  '#0a0a1e',
  '#0a1020',
  '#3a2a1a',
  '#c0a040',
  '#4a2060',
  '#8040c0',
  '#c080ff',
  '#ff6060',
  '#ffcc40',
];

const SLIME_PALETTE = [
  '',
  '#0a1a0a',
  '#1a3a1a',
  '#2a6a2a',
  '#3a9a3a',
  '#5aba5a',
  '#80da80',
  '#b0ffb0',
  '#ffff80',
  '#1a1a1a',
  '#303030',
  '#e0e0e0',
  '#fffffe',
];

const WOLF_PALETTE = [
  '',
  '#1a1a1a',
  '#3a3a3a',
  '#5a5a5a',
  '#7a7a7a',
  '#9a9a9a',
  '#c0c0c0',
  '#e0e0e0',
  '#d0d0d0',
  '#cc2020',
  '#ff4040',
  '#2a2a2a',
  '#ffffff',
  '#1a0a0a',
  '#3a1a1a',
];

const TREE_SPIRIT_PALETTE = [
  '',
  '#1a0f0a',
  '#3a2010',
  '#5a3a20',
  '#7a5a30',
  '#2a5a1a',
  '#4a8a2a',
  '#6aba4a',
  '#8ada6a',
  '#b0ff90',
  '#ffff60',
  '#c0a040',
  '#1a1a0a',
];

const SCORPION_PALETTE = [
  '',
  '#1a1008',
  '#3a2810',
  '#5a4020',
  '#7a5830',
  '#9a7040',
  '#c09060',
  '#e0b080',
  '#cc2020',
  '#ff4040',
  '#2a1010',
  '#1a0808',
  '#e0d0b0',
];

const MUMMY_PALETTE = [
  '',
  '#1a1a10',
  '#3a3a28',
  '#5a5a40',
  '#7a7a58',
  '#9a9a70',
  '#babaa0',
  '#dadac0',
  '#e0e0d0',
  '#40ff40',
  '#80ff80',
  '#1a1a08',
  '#2a2a10',
  '#c0ffc0',
];

const ICE_ELEMENTAL_PALETTE = [
  '',
  '#0a1a2a',
  '#1a3a5a',
  '#2a5a8a',
  '#4a8aba',
  '#6aaada',
  '#8acafa',
  '#aaeaff',
  '#d0f0ff',
  '#ffffff',
  '#80e0ff',
  '#40c0ff',
  '#1a0a2a',
];

const VOID_CREATURE_PALETTE = [
  '',
  '#0a0a1a',
  '#1a0a2a',
  '#2a1a4a',
  '#4a2a6a',
  '#6a3a8a',
  '#8a4aaa',
  '#aa5aca',
  '#ca7aea',
  '#ea9aff',
  '#ff80ff',
  '#0a0a0a',
  '#1a1a2a',
  '#ff60ff',
];

const HOLY_KNIGHT_PALETTE = [
  '',
  '#1a1a0a',
  '#3a3a1a',
  '#c0a020',
  '#e0c040',
  '#ffe060',
  '#fff090',
  '#ffffc0',
  '#d0d0e0',
  '#f0f0ff',
  '#2a2a5a',
  '#4a4a8a',
  '#6a6aba',
  '#1a1a2e',
  '#3a3a4e',
  '#ffffff',
];

const ANCIENT_TREE_PALETTE = [
  '',
  '#0a0804',
  '#1a1008',
  '#2a1810',
  '#3a2818',
  '#4a3820',
  '#5a4828',
  '#6a5830',
  '#2a6a1a',
  '#4a8a2a',
  '#6aaa3a',
  '#8aca5a',
  '#aaff70',
  '#ffdd40',
  '#ffff80',
  '#1a1a08',
];

const SCORPION_KING_PALETTE = [
  '',
  '#1a0808',
  '#2a1010',
  '#4a1818',
  '#6a2020',
  '#8a2828',
  '#aa3838',
  '#cc5050',
  '#c0a020',
  '#e0c040',
  '#ffe060',
  '#9a7040',
  '#3a2810',
  '#ffcc40',
  '#1a1008',
];

const ICE_DRAGON_PALETTE = [
  '',
  '#0a1020',
  '#1a2040',
  '#2a3060',
  '#3a4080',
  '#4a60a0',
  '#6a80c0',
  '#8aa0d0',
  '#aac0e0',
  '#cce0f0',
  '#e0f0ff',
  '#ffffff',
  '#c0c0d0',
  '#8080a0',
  '#d0e0ff',
];

const VOID_DEVOURER_PALETTE = [
  '',
  '#050510',
  '#0a0a20',
  '#1a1040',
  '#2a1860',
  '#3a2080',
  '#4a30a0',
  '#6a40c0',
  '#8a50e0',
  '#aa60ff',
  '#cc80ff',
  '#ff80ff',
  '#0a0a0a',
  '#1a1a1a',
  '#ff40ff',
];

const FALLEN_SAINT_PALETTE = [
  '',
  '#0a0a10',
  '#1a1a20',
  '#2a2a30',
  '#4a3a20',
  '#6a5030',
  '#8a6840',
  '#aa8050',
  '#cca060',
  '#eec080',
  '#ffe0a0',
  '#ffffff',
  '#d0d0e0',
  '#808090',
  '#1a1a2e',
  '#404060',
  '#ffffc0',
];

const NPC_EILEEN_PALETTE = [
  '',
  '#1a1a2e',
  '#1a4a2a',
  '#2a6a3a',
  '#3a8a4a',
  '#5aaa6a',
  '#7aca8a',
  '#b07840',
  '#d4975a',
  '#f0c080',
  '#3a1f0a',
  '#5a3520',
  '#7a5030',
  '#2a2a1a',
  '#4a4a3a',
  '#1a0a0a',
];

const NPC_GREGOR_PALETTE = [
  '',
  '#1a1a2e',
  '#5a3a20',
  '#7a5a30',
  '#9a7a40',
  '#ba9a50',
  '#b07840',
  '#d4975a',
  '#f0c080',
  '#3a3a3a',
  '#5a5a5a',
  '#7a7a7a',
  '#2a1a0a',
  '#4a3020',
  '#1a0a0a',
  '#c0a040',
];

const NPC_KASHIM_PALETTE = [
  '',
  '#1a1a2e',
  '#c0a060',
  '#e0c080',
  '#ffe0a0',
  '#5a4020',
  '#7a5830',
  '#9a7040',
  '#b07840',
  '#d4975a',
  '#f0c080',
  '#3a2810',
  '#2a1a0a',
  '#1a0a0a',
  '#ffffff',
  '#40c0c0',
];

const NPC_VERA_PALETTE = [
  '',
  '#1a1a2e',
  '#c0c0d0',
  '#d0d0e0',
  '#e0e0f0',
  '#f0f0ff',
  '#ffffff',
  '#2a4a6a',
  '#4a7aaa',
  '#6aaada',
  '#b07840',
  '#d4975a',
  '#f0c080',
  '#8080c0',
  '#a0a0e0',
  '#1a1a3a',
];

const NPC_NOAH_PALETTE = [
  '',
  '#1a1a2e',
  '#3a3a4a',
  '#5a5a6a',
  '#7a7a8a',
  '#9a9aaa',
  '#b07840',
  '#d4975a',
  '#f0c080',
  '#c0a020',
  '#e0c040',
  '#3a2a1a',
  '#5a4a3a',
  '#1a0a0a',
  '#4a8aba',
  '#ff6040',
];

const NPC_GUARD_PALETTE = [
  '',
  '#1a1a2e',
  '#c0a020',
  '#e0c040',
  '#ffe060',
  '#fff090',
  '#d0d0e0',
  '#f0f0ff',
  '#b07840',
  '#d4975a',
  '#f0c080',
  '#3a3a4a',
  '#5a5a6a',
  '#2a2a1a',
  '#1a0a0a',
  '#4a4a8a',
];

const FOREST_TILE_PALETTE = [
  '',
  '#2a5a1a',
  '#3a7a2a',
  '#4a9a3a',
  '#5aba4a',
  '#6ada5a',
  '#8afa7a',
  '#3a5a2a',
  '#2a4a1a',
  '#5a3a10',
  '#7a5a20',
  '#3a8aaa',
  '#5aaaca',
  '#7aacea',
  '#6a6a6a',
  '#8a8a8a',
  '#ff8080',
  '#ffff80',
  '#ff80ff',
  '#80ff80',
];

const DESERT_TILE_PALETTE = [
  '',
  '#c0a060',
  '#d0b070',
  '#e0c080',
  '#f0d090',
  '#ffe0a0',
  '#9a8050',
  '#7a6030',
  '#5a4020',
  '#aa9060',
  '#3a8aaa',
  '#5aaaca',
  '#7aacea',
  '#4a7a3a',
  '#6a9a5a',
  '#8aba7a',
  '#6a5a40',
];

const SNOW_TILE_PALETTE = [
  '',
  '#c0c8d0',
  '#d0d8e0',
  '#e0e8f0',
  '#f0f4f8',
  '#ffffff',
  '#a0b0c0',
  '#8090a0',
  '#6080a0',
  '#4a6a8a',
  '#8acafa',
  '#aadaea',
  '#2a5a3a',
  '#3a7a4a',
  '#5a9a6a',
  '#7aba8a',
  '#b0d0e0',
];

const RUINS_TILE_PALETTE = [
  '',
  '#3a3a4a',
  '#4a4a5a',
  '#5a5a6a',
  '#6a6a7a',
  '#7a7a8a',
  '#2a2a3a',
  '#1a1a2a',
  '#4a2a6a',
  '#6a3a8a',
  '#8a4aaa',
  '#aa5aca',
  '#ca7aea',
  '#3a3a3a',
  '#5a5a5a',
  '#8080a0',
  '#1a0a2a',
];

const HOLY_TILE_PALETTE = [
  '',
  '#d0d0e0',
  '#e0e0f0',
  '#f0f0ff',
  '#ffffff',
  '#c0a020',
  '#e0c040',
  '#ffe060',
  '#fff090',
  '#4a4a8a',
  '#6a6aba',
  '#8a8ada',
  '#b0b0ea',
  '#aaaacc',
  '#8888aa',
  '#ffffc0',
  '#e0e0ff',
];

const ITEM_PALETTE = [
  '',
  '#1a1a2e',
  '#cc2020',
  '#ff4040',
  '#ff6060',
  '#ff8080',
  '#ffaaaa',
  '#2040cc',
  '#4060ff',
  '#6080ff',
  '#80a0ff',
  '#a0c0ff',
  '#808080',
  '#a0a0a0',
  '#c0c0c0',
  '#e0e0e0',
  '#c0a020',
  '#e0c040',
  '#ffe060',
  '#5a3010',
  '#7a5030',
  '#9a7050',
  '#b09070',
  '#d0b090',
  '#ffffff',
  '#40c0c0',
  '#80e0e0',
  '#ff80ff',
  '#80ff80',
];

const EFFECT_PALETTE = [
  '',
  '#ffffff',
  '#ffffc0',
  '#ffff80',
  '#ffe040',
  '#ffcc00',
  '#ff8080',
  '#ff4040',
  '#cc2020',
  '#80c0ff',
  '#4080ff',
  '#2040cc',
  '#80ff80',
  '#40cc40',
  '#20aa20',
  '#c080ff',
  '#8040ff',
  '#6020cc',
  '#ffe0a0',
  '#ffcc60',
  '#fffff0',
];

// ============================================================
// PLAYER SPRITE
// ============================================================

function drawPlayerBase(c: PixelCanvas, legPhase: number, cloakSway: number, swordAngle: number, bodyBob: number): void {
  const O = 1, CD = 2, CM = 3, CL = 4, CH = 5, AD = 6, AM = 7, AH = 8;
  const SD = 9, SM = 10, SH = 11, HD = 12, HM = 13, HL = 14;
  const BD = 15, BM = 16, BD2 = 17, BM2 = 18, BH = 19;
  const HI = 20, EY = 21, CI = 22, BE = 23, BU = 24;

  const by = 2 + bodyBob;

  // Cloak back layer
  c.ellipse(16, 17 + by, 7 + cloakSway, 10, CM);
  c.ellipse(15, 16 + by, 5, 8, CL);
  c.ellipse(14, 15 + by, 3, 5, CH);
  c.ellipse(18, 18 + by, 5, 8, CD);
  c.ellipse(19, 19 + by, 3, 5, CI);

  // Cloak fold details
  c.line(13, 12 + by, 12, 24 + by, CD);
  c.line(19, 12 + by, 20, 24 + by, CD);
  c.set(14, 14 + by, CL);
  c.set(14, 16 + by, CL);
  c.set(14, 18 + by, CL);
  c.set(18, 15 + by, CD);
  c.set(18, 17 + by, CD);
  c.set(18, 19 + by, CD);

  // Legs
  const leftLegX = 13;
  const rightLegX = 17;
  const leftLegOff = Math.round(Math.sin(legPhase) * 2);
  const rightLegOff = Math.round(Math.sin(legPhase + Math.PI) * 2);

  c.rect(leftLegX, 22 + by, 3, 5 + leftLegOff, CM);
  c.rect(rightLegX, 22 + by, 3, 5 + rightLegOff, CM);
  c.set(leftLegX, 22 + by, CL);
  c.set(rightLegX, 22 + by, CL);
  c.set(leftLegX + 2, 22 + by + 3 + leftLegOff, CD);
  c.set(rightLegX + 2, 22 + by + 3 + rightLegOff, CD);

  // Boots
  c.rect(leftLegX - 1, 26 + by + leftLegOff, 4, 3, BD);
  c.rect(rightLegX - 1, 26 + by + rightLegOff, 4, 3, BD);
  c.set(leftLegX - 1, 26 + by + leftLegOff, BM);
  c.set(rightLegX - 1, 26 + by + rightLegOff, BM);
  c.set(leftLegX, 26 + by + leftLegOff, BM);
  c.set(rightLegX, 26 + by + rightLegOff, BM);

  // Body / Armor
  c.rect(11, 11 + by, 10, 8, AM);
  c.rect(12, 11 + by, 8, 2, AH);
  c.set(12, 11 + by, AH);
  c.set(13, 11 + by, AH);
  c.set(14, 11 + by, AH);
  c.rect(11, 17 + by, 10, 2, AD);
  c.rect(17, 12 + by, 4, 6, AD);
  c.rect(11, 12 + by, 3, 5, AH);

  // Armor plate details
  c.line(13, 12 + by, 13, 17 + by, AD);
  c.line(17, 12 + by, 17, 17 + by, AD);
  c.set(14, 13 + by, AH);
  c.set(15, 13 + by, AH);
  c.set(14, 15 + by, AM);
  c.set(15, 15 + by, AM);

  // Belt
  c.rect(11, 18 + by, 10, 2, BE);
  c.set(15, 18 + by, BU);
  c.set(16, 18 + by, BU);

  // Shoulders / pauldrons
  c.ellipse(10, 11 + by, 3, 2, AM);
  c.ellipse(22, 11 + by, 3, 2, AM);
  c.set(9, 10 + by, AH);
  c.set(10, 10 + by, AH);
  c.set(22, 10 + by, AH);
  c.set(23, 10 + by, AH);
  c.set(9, 12 + by, AD);
  c.set(23, 12 + by, AD);

  // Head
  c.ellipse(16, 7 + by, 4, 4, SM);
  c.ellipse(15, 6 + by, 3, 3, SH);
  c.ellipse(17, 8 + by, 3, 3, SD);

  // Hair
  c.ellipse(16, 5 + by, 5, 3, HM);
  c.ellipse(15, 4 + by, 3, 2, HL);
  c.ellipse(17, 5 + by, 4, 2, HD);
  c.rect(11, 5 + by, 2, 3, HM);
  c.rect(19, 5 + by, 2, 3, HD);
  c.set(12, 5 + by, HL);
  c.set(12, 6 + by, HM);
  c.set(19, 6 + by, HD);

  // Hair detail strands
  c.set(13, 4 + by, HL);
  c.set(14, 3 + by, HM);
  c.set(15, 3 + by, HL);
  c.set(16, 3 + by, HM);
  c.set(17, 4 + by, HD);
  c.set(18, 4 + by, HD);

  // Face
  c.set(14, 7 + by, EY);
  c.set(17, 7 + by, EY);
  c.set(14, 8 + by, SM);
  c.set(15, 8 + by, SH);
  c.set(16, 8 + by, SM);
  c.set(17, 8 + by, SD);
  c.set(15, 9 + by, SM);
  c.set(16, 9 + by, SD);

  // Sword
  const swordBaseX = 23;
  const swordBaseY = 12 + by;
  if (swordAngle === 0) {
    c.rect(swordBaseX, swordBaseY - 6, 2, 8, BM2);
    c.set(swordBaseX, swordBaseY - 6, BH);
    c.set(swordBaseX, swordBaseY - 5, BH);
    c.rect(swordBaseX + 2, swordBaseY - 4, 1, 5, BD2);
    c.rect(swordBaseX - 1, swordBaseY + 2, 4, 2, HI);
    c.set(swordBaseX, swordBaseY + 2, BU);
  } else if (swordAngle === 1) {
    c.rect(swordBaseX + 2, swordBaseY - 8, 2, 8, BM2);
    c.set(swordBaseX + 2, swordBaseY - 8, BH);
    c.set(swordBaseX + 2, swordBaseY - 7, BH);
    c.rect(swordBaseX + 3, swordBaseY - 6, 1, 5, BD2);
    c.rect(swordBaseX, swordBaseY, 4, 2, HI);
    c.set(swordBaseX + 1, swordBaseY, BU);
  } else if (swordAngle === 2) {
    for (let i = 0; i < 8; i++) {
      c.set(swordBaseX + i, swordBaseY + 2 - i, BM2);
      c.set(swordBaseX + i, swordBaseY + 3 - i, BD2);
    }
    c.set(swordBaseX, swordBaseY + 2, BH);
    c.set(swordBaseX + 1, swordBaseY + 1, BH);
    c.rect(swordBaseX - 1, swordBaseY + 3, 4, 2, HI);
  } else {
    c.rect(swordBaseX - 2, swordBaseY + 2, 8, 2, BM2);
    c.set(swordBaseX - 2, swordBaseY + 2, BH);
    c.set(swordBaseX - 1, swordBaseY + 2, BH);
    c.rect(swordBaseX + 4, swordBaseY, 1, 5, BD2);
    c.rect(swordBaseX + 2, swordBaseY + 4, 4, 2, HI);
  }

  c.outline(O);
}

function createPlayerSprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(32, 32);
    drawPlayerBase(c, 0, 0, 0, i % 2 === 0 ? 0 : -1);
    idle.push(c.toFrame());
  }

  const walkDown: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(32, 32);
    drawPlayerBase(c, i * Math.PI / 2, Math.sin(i * Math.PI / 2), 0, i % 2 === 0 ? 0 : -1);
    walkDown.push(c.toFrame());
  }

  const walkUp: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(32, 32);
    drawPlayerBase(c, i * Math.PI / 2, -Math.sin(i * Math.PI / 2), 0, i % 2 === 0 ? 0 : -1);
    walkUp.push(c.toFrame());
  }

  const walkLeft: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(32, 32);
    drawPlayerBase(c, i * Math.PI / 2, -1, 0, i % 2 === 0 ? 0 : -1);
    walkLeft.push(c.toFrame());
  }

  const walkRight: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(32, 32);
    drawPlayerBase(c, i * Math.PI / 2, 1, 0, i % 2 === 0 ? 0 : -1);
    walkRight.push(c.toFrame());
  }

  const attack: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(32, 32);
    drawPlayerBase(c, 0, 0, i, 0);
    attack.push(c.toFrame());
  }

  const dash: SpriteFrame[] = [];
  {
    const c1 = new PixelCanvas(32, 32);
    drawPlayerBase(c1, 0, 2, 0, 0);
    dash.push(c1.toFrame());
    const c2 = new PixelCanvas(32, 32);
    drawPlayerBase(c2, 0, -2, 0, 0);
    dash.push(c2.toFrame());
  }

  const hurt: SpriteFrame[] = [];
  {
    const c1 = new PixelCanvas(32, 32);
    drawPlayerBase(c1, 0, 0, 0, 0);
    hurt.push(c1.toFrame());
    const baseFrame = hurt[0];
    hurt.push(flashFrame(baseFrame, 28));
  }

  const skillCast: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(32, 32);
    drawPlayerBase(c, 0, 0, 0, 0);
    const glowR = 3 + i * 2;
    const glowC = 25 + (i % 2);
    c.circle(16, 10, glowR, glowC);
    if (i >= 2) c.circle(16, 10, glowR - 2, 27);
    skillCast.push(c.toFrame());
  }

  return {
    id: 'player',
    palette: PLAYER_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 200, true),
      walk_down: makeAnim('walk_down', walkDown, 120, true),
      walk_up: makeAnim('walk_up', walkUp, 120, true),
      walk_left: makeAnim('walk_left', walkLeft, 120, true),
      walk_right: makeAnim('walk_right', walkRight, 120, true),
      attack: makeAnim('attack', attack, 80, false),
      dash: makeAnim('dash', dash, 60, false),
      hurt: makeAnim('hurt', hurt, 100, false),
      skill_cast: makeAnim('skill_cast', skillCast, 100, false),
    },
  };
}

// ============================================================
// ENEMY SPRITES
// ============================================================

function drawSlime(c: PixelCanvas, frame: number, squish: number): void {
  const O = 1, BD = 2, BM = 3, BL = 4, BH = 5, BS = 6, SH = 7, HL = 8, EY = 9, PD = 10, PL = 11, WH = 12;

  const baseY = 14 + squish;
  const heightMod = -squish;
  const widthMod = squish;

  c.ellipse(16, baseY, 9 + widthMod, 7 + heightMod, BM);
  c.ellipse(15, baseY - 1, 7 + widthMod, 5 + heightMod, BL);
  c.ellipse(14, baseY - 2, 4 + widthMod, 3 + heightMod, BH);
  c.ellipse(18, baseY + 2, 6 + widthMod, 4 + heightMod, BD);
  c.ellipse(19, baseY + 3, 4 + widthMod, 2 + heightMod, BS);

  // Drip edges
  c.set(8, baseY + 5 + heightMod, BM);
  c.set(7, baseY + 6 + heightMod, BD);
  c.set(24, baseY + 5 + heightMod, BM);
  c.set(25, baseY + 6 + heightMod, BD);
  c.set(12, baseY + 6 + heightMod, BM);
  c.set(12, baseY + 7 + heightMod, BD);
  c.set(20, baseY + 6 + heightMod, BM);
  c.set(20, baseY + 7 + heightMod, BD);

  // Shine spots
  c.set(12, baseY - 3 + heightMod, SH);
  c.set(13, baseY - 4 + heightMod, WH);
  c.set(13, baseY - 3 + heightMod, SH);
  c.set(14, baseY - 3 + heightMod, HL);

  // Eyes
  c.set(13, baseY - 1 + heightMod, EY);
  c.set(14, baseY - 1 + heightMod, WH);
  c.set(18, baseY - 1 + heightMod, EY);
  c.set(19, baseY - 1 + heightMod, WH);

  // Pupil detail
  c.set(14, baseY + heightMod, PD);
  c.set(19, baseY + heightMod, PD);

  // Mouth
  c.set(15, baseY + 1 + heightMod, BD);
  c.set(16, baseY + 2 + heightMod, BD);
  c.set(17, baseY + 1 + heightMod, BD);

  // Body texture dithering
  c.dither(10, baseY + 1 + heightMod, 4, 3, BM, BL);
  c.dither(18, baseY + 1 + heightMod, 4, 3, BM, BD);

  c.outline(O);
}

function createSlimeSprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  const squishSeq = [0, -2, 1];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawSlime(c, i, squishSeq[i]);
    idle.push(c.toFrame());
  }

  const attack: SpriteFrame[] = [];
  const attackSquish = [-3, 2, -1];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawSlime(c, i, attackSquish[i]);
    if (i === 1) {
      c.rect(6, 12, 4, 3, 4);
      c.set(6, 12, 5);
      c.set(7, 11, 5);
    }
    attack.push(c.toFrame());
  }

  const hurt: SpriteFrame[] = [];
  {
    const c1 = new PixelCanvas(32, 32);
    drawSlime(c1, 0, 1);
    hurt.push(c1.toFrame());
    hurt.push(flashFrame(hurt[0], 8));
  }

  const death: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawSlime(c, 0, i * 3);
    death.push(c.toFrame());
  }

  return {
    id: 'slime',
    palette: SLIME_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 250, true),
      attack: makeAnim('attack', attack, 120, false),
      hurt: makeAnim('hurt', hurt, 100, false),
      death: makeAnim('death', death, 200, false),
    },
  };
}

function drawWolf(c: PixelCanvas, frame: number, legPhase: number, pounce: number): void {
  const O = 1, FD = 2, FM = 3, FL = 4, FH = 5, BL = 6, WH = 7, EY = 8, ER = 9, CL = 10, CD = 11, NM = 12, TG = 13;

  const by = 4 + pounce;

  // Body
  c.ellipse(16, 16 + by, 10, 5, FM);
  c.ellipse(15, 15 + by, 8, 4, FL);
  c.ellipse(14, 14 + by, 5, 2, FH);
  c.ellipse(19, 17 + by, 7, 3, FD);

  // Belly
  c.ellipse(16, 18 + by, 7, 2, BL);

  // Fur texture
  for (let i = 0; i < 6; i++) {
    c.set(10 + i * 2, 13 + by, FL);
    c.set(11 + i * 2, 14 + by, FM);
  }
  c.dither(8, 15 + by, 5, 3, FM, FD);
  c.dither(19, 15 + by, 5, 3, FM, FD);

  // Head
  c.ellipse(7, 14 + by, 5, 4, FM);
  c.ellipse(6, 13 + by, 4, 3, FL);
  c.ellipse(8, 15 + by, 4, 3, FD);

  // Snout
  c.rect(2, 14 + by, 4, 2, FL);
  c.set(2, 14 + by, WH);
  c.set(3, 13 + by, FM);

  // Nose
  c.set(2, 14 + by, NM);

  // Eyes
  c.set(5, 13 + by, ER);
  c.set(6, 13 + by, EY);

  // Ears
  c.set(5, 10 + by, FM);
  c.set(6, 10 + by, FD);
  c.set(7, 9 + by, FM);
  c.set(8, 10 + by, FD);
  c.set(5, 11 + by, FL);
  c.set(7, 11 + by, FL);

  // Fangs
  c.set(3, 16 + by, WH);
  c.set(4, 16 + by, WH);

  // Legs
  const legOffsets = [
    Math.round(Math.sin(legPhase) * 2),
    Math.round(Math.sin(legPhase + Math.PI) * 2),
    Math.round(Math.sin(legPhase + Math.PI) * 2),
    Math.round(Math.sin(legPhase) * 2),
  ];
  const legXs = [9, 12, 19, 22];
  for (let i = 0; i < 4; i++) {
    c.rect(legXs[i], 20 + by, 2, 4 + legOffsets[i], FM);
    c.set(legXs[i], 20 + by, FL);
    c.rect(legXs[i] - 1, 23 + by + legOffsets[i], 3, 2, CL);
    c.set(legXs[i] - 1, 23 + by + legOffsets[i], CD);
  }

  // Tail
  c.set(26, 13 + by, FM);
  c.set(27, 12 + by, FL);
  c.set(28, 11 + by, FH);
  c.set(27, 11 + by, FM);
  c.set(28, 10 + by, TG);
  c.set(27, 10 + by, FL);

  c.outline(O);
}

function createWolfSprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawWolf(c, i, 0, 0);
    idle.push(c.toFrame());
  }

  const walk: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(32, 32);
    drawWolf(c, i, i * Math.PI / 2, 0);
    walk.push(c.toFrame());
  }

  const attack: SpriteFrame[] = [];
  const pounceY = [-2, -4, 2];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawWolf(c, i, 0, pounceY[i]);
    attack.push(c.toFrame());
  }

  const hurt: SpriteFrame[] = [];
  {
    const c1 = new PixelCanvas(32, 32);
    drawWolf(c1, 0, 0, 0);
    hurt.push(c1.toFrame());
    hurt.push(flashFrame(hurt[0], 9));
  }

  const death: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    const dc = new PixelCanvas(32, 32);
    drawWolf(dc, 0, 0, 0);
    const shifted = shiftFrame(dc.toFrame(), 0, i * 3);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++)
        c.px[y][x] = shifted.data[y][x];
    death.push(c.toFrame());
  }

  return {
    id: 'wolf',
    palette: WOLF_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 200, true),
      walk: makeAnim('walk', walk, 120, true),
      attack: makeAnim('attack', attack, 100, false),
      hurt: makeAnim('hurt', hurt, 100, false),
      death: makeAnim('death', death, 200, false),
    },
  };
}

function drawTreeSpirit(c: PixelCanvas, frame: number, sway: number): void {
  const O = 1, BKD = 2, BKM = 3, BKLT = 4, BKHL = 5, LFD = 6, LFM = 7, LFL = 8, LFHL = 9, EY = 10, GL = 11, BKLN = 12;

  const sx = sway;

  // Trunk / body
  c.rect(12 + sx, 10, 8, 16, BKM);
  c.rect(13 + sx, 10, 6, 14, BKLT);
  c.rect(14 + sx, 10, 3, 12, BKHL);
  c.rect(18 + sx, 12, 2, 12, BKD);

  // Bark texture
  c.line(13 + sx, 12, 13 + sx, 24, BKD);
  c.line(17 + sx, 11, 17 + sx, 23, BKD);
  c.set(14 + sx, 14, BKLN);
  c.set(15 + sx, 18, BKLN);
  c.set(16 + sx, 15, BKLN);
  c.set(14 + sx, 20, BKLN);
  c.set(16 + sx, 22, BKLN);

  // Roots / legs
  c.rect(10 + sx, 24, 4, 4, BKM);
  c.rect(18 + sx, 24, 4, 4, BKM);
  c.rect(11 + sx, 24, 2, 3, BKLT);
  c.rect(19 + sx, 24, 2, 3, BKLT);
  c.set(10 + sx, 27, BKD);
  c.set(21 + sx, 27, BKD);

  // Canopy / leaves
  c.ellipse(16 + sx, 6, 9, 6, LFM);
  c.ellipse(15 + sx, 5, 7, 5, LFL);
  c.ellipse(14 + sx, 4, 4, 3, LFHL);
  c.ellipse(19 + sx, 7, 6, 4, LFD);

  // Leaf detail
  c.set(10 + sx, 4, LFM);
  c.set(11 + sx, 3, LFL);
  c.set(12 + sx, 2, LFHL);
  c.set(20 + sx, 3, LFM);
  c.set(21 + sx, 4, LFD);
  c.set(22 + sx, 5, LFD);
  c.set(9 + sx, 6, LFD);
  c.set(23 + sx, 7, LFD);

  // Branches / arms
  c.line(8 + sx, 14, 5 + sx, 10, BKM);
  c.line(5 + sx, 10, 3 + sx, 8, BKM);
  c.set(3 + sx, 7, LFM);
  c.set(2 + sx, 7, LFL);
  c.set(4 + sx, 9, LFM);

  c.line(24 + sx, 14, 27 + sx, 10, BKM);
  c.line(27 + sx, 10, 29 + sx, 8, BKM);
  c.set(29 + sx, 7, LFM);
  c.set(28 + sx, 9, LFM);

  // Eyes (glowing)
  c.set(14 + sx, 14, GL);
  c.set(15 + sx, 14, EY);
  c.set(17 + sx, 14, GL);
  c.set(18 + sx, 14, EY);

  // Mouth
  c.set(15 + sx, 17, BKD);
  c.set(16 + sx, 17, BKD);
  c.set(17 + sx, 17, BKD);

  c.outline(O);
}

function createTreeSpiritSprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  const swaySeq = [0, 1, -1];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawTreeSpirit(c, i, swaySeq[i]);
    idle.push(c.toFrame());
  }

  const attack: SpriteFrame[] = [];
  const armSwing = [0, -3, 3];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawTreeSpirit(c, i, 0);
    if (i === 1) {
      c.line(3, 7, 1, 12, 3);
      c.set(1, 13, 3);
      c.set(0, 12, 2);
    }
    if (i === 2) {
      c.line(29, 7, 30, 12, 3);
      c.set(30, 13, 3);
      c.set(31, 12, 2);
    }
    attack.push(c.toFrame());
  }

  const hurt: SpriteFrame[] = [];
  {
    const c1 = new PixelCanvas(32, 32);
    drawTreeSpirit(c1, 0, 0);
    hurt.push(c1.toFrame());
    hurt.push(flashFrame(hurt[0], 9));
  }

  const death: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawTreeSpirit(c, 0, 0);
    const shifted = shiftFrame(c.toFrame(), 0, i * 2);
    const c2 = new PixelCanvas(32, 32);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++)
        c2.px[y][x] = shifted.data[y][x];
    death.push(c2.toFrame());
  }

  return {
    id: 'tree_spirit',
    palette: TREE_SPIRIT_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 300, true),
      attack: makeAnim('attack', attack, 150, false),
      hurt: makeAnim('hurt', hurt, 100, false),
      death: makeAnim('death', death, 250, false),
    },
  };
}

function drawScorpion(c: PixelCanvas, frame: number, legPhase: number, stingAngle: number): void {
  const O = 1, BD = 2, BM = 3, BL = 4, BH = 5, PD = 6, PM = 7, PL = 8, SD = 9, SM = 10, EY = 11, SK = 12, HL = 13;

  // Body segments
  c.ellipse(16, 18, 6, 4, BM);
  c.ellipse(16, 14, 5, 3, BM);
  c.ellipse(16, 11, 4, 3, BL);
  c.ellipse(15, 10, 2, 2, BH);

  // Shading
  c.ellipse(18, 19, 4, 2, BD);
  c.ellipse(18, 15, 3, 2, BD);
  c.ellipse(17, 12, 2, 1, BD);

  // Texture
  c.dither(11, 17, 4, 3, BM, BL);
  c.dither(18, 13, 3, 2, BM, BD);

  // Head
  c.ellipse(16, 8, 4, 2, BM);
  c.ellipse(15, 7, 3, 2, BL);
  c.set(14, 7, BH);

  // Eyes
  c.set(13, 7, EY);
  c.set(18, 7, EY);

  // Pincers
  c.ellipse(8, 8, 3, 2, PM);
  c.ellipse(7, 7, 2, 1, PL);
  c.set(6, 7, PD);
  c.ellipse(24, 8, 3, 2, PM);
  c.ellipse(25, 7, 2, 1, PL);
  c.set(26, 7, PD);

  // Pincer detail
  c.set(7, 9, PD);
  c.set(25, 9, PD);
  c.line(10, 8, 12, 9, PM);
  c.line(22, 8, 20, 9, PM);

  // Legs
  for (let i = 0; i < 4; i++) {
    const lo = Math.round(Math.sin(legPhase + i * 0.8) * 1);
    const lx = 11 + i * 3;
    c.line(lx, 20, lx - 2, 24 + lo, BM);
    c.set(lx - 2, 24 + lo, BD);
    c.line(lx + 1, 20, lx + 3, 24 - lo, BM);
    c.set(lx + 3, 24 - lo, BD);
  }

  // Tail
  if (stingAngle === 0) {
    c.line(16, 7, 16, 3, SM);
    c.line(16, 3, 18, 1, SM);
    c.set(18, 0, SK);
    c.set(19, 0, SD);
    c.set(16, 5, BL);
    c.set(17, 2, BL);
  } else if (stingAngle === 1) {
    c.line(16, 7, 14, 3, SM);
    c.line(14, 3, 12, 1, SM);
    c.set(12, 0, SK);
    c.set(11, 0, SD);
    c.set(15, 5, BL);
    c.set(13, 2, BL);
  } else {
    c.line(16, 7, 16, 4, SM);
    c.line(16, 4, 16, 1, SM);
    c.set(16, 0, SK);
    c.set(15, 0, SD);
    c.set(16, 3, BL);
    c.set(16, 2, BL);
  }

  c.outline(O);
}

function createScorpionSprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawScorpion(c, i, 0, 0);
    idle.push(c.toFrame());
  }

  const walk: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(32, 32);
    drawScorpion(c, i, i * Math.PI / 2, 0);
    walk.push(c.toFrame());
  }

  const attack: SpriteFrame[] = [];
  const stingAngles = [0, 1, 2];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawScorpion(c, i, 0, stingAngles[i]);
    attack.push(c.toFrame());
  }

  const hurt: SpriteFrame[] = [];
  {
    const c1 = new PixelCanvas(32, 32);
    drawScorpion(c1, 0, 0, 0);
    hurt.push(c1.toFrame());
    hurt.push(flashFrame(hurt[0], 8));
  }

  const death: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawScorpion(c, 0, 0, 0);
    const shifted = shiftFrame(c.toFrame(), 0, i * 2);
    const c2 = new PixelCanvas(32, 32);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++)
        c2.px[y][x] = shifted.data[y][x];
    death.push(c2.toFrame());
  }

  return {
    id: 'scorpion',
    palette: SCORPION_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 250, true),
      walk: makeAnim('walk', walk, 120, true),
      attack: makeAnim('attack', attack, 120, false),
      hurt: makeAnim('hurt', hurt, 100, false),
      death: makeAnim('death', death, 200, false),
    },
  };
}

function drawMummy(c: PixelCanvas, frame: number, walkOff: number, armRaise: number): void {
  const O = 1, BD = 2, BM = 3, BL = 4, BH = 5, DD = 6, DM = 7, DL = 8, EY = 9, EGL = 10, BG = 11, BGD = 12;

  const by = 2 + walkOff;

  // Body wrapped in bandages
  c.rect(12, 10 + by, 8, 14, BM);
  c.rect(13, 10 + by, 6, 12, BL);
  c.rect(14, 10 + by, 3, 10, BH);

  // Bandage wrap lines
  for (let y = 10 + by; y < 24 + by; y += 2) {
    c.line(12, y, 19, y, BD);
    c.set(13, y + 1, DL);
    c.set(16, y, DL);
  }
  c.line(14, 10 + by, 14, 23 + by, DL);
  c.line(17, 11 + by, 17, 22 + by, BD);

  // Dusty overlay
  c.dither(12, 16 + by, 8, 6, BM, DD);
  c.dither(13, 12 + by, 6, 4, BL, DM);

  // Head
  c.ellipse(16, 7 + by, 4, 4, BM);
  c.ellipse(15, 6 + by, 3, 3, BL);
  c.ellipse(17, 8 + by, 3, 2, BD);

  // Head bandages
  c.line(12, 6 + by, 19, 6 + by, BD);
  c.line(13, 8 + by, 18, 8 + by, BD);
  c.set(14, 5 + by, DL);
  c.set(17, 5 + by, BD);

  // Eyes (glowing green)
  c.set(14, 7 + by, EGL);
  c.set(15, 7 + by, EY);
  c.set(17, 7 + by, EGL);
  c.set(18, 7 + by, EY);

  // Arms
  if (armRaise === 0) {
    c.rect(9, 12 + by, 3, 8, BM);
    c.rect(20, 12 + by, 3, 8, BM);
    c.set(9, 12 + by, BL);
    c.set(20, 12 + by, BL);
    c.dither(9, 14 + by, 3, 4, BM, BD);
    c.dither(20, 14 + by, 3, 4, BM, BD);
  } else {
    c.rect(9, 6 + by, 3, 8, BM);
    c.rect(20, 6 + by, 3, 8, BM);
    c.set(9, 6 + by, BL);
    c.set(20, 6 + by, BL);
    c.set(10, 5 + by, BH);
    c.set(21, 5 + by, BH);
  }

  // Legs
  c.rect(13, 24 + by, 3, 4, BM);
  c.rect(17, 24 + by, 3, 4, BM);
  c.set(13, 24 + by, BL);
  c.set(17, 24 + by, BL);
  c.dither(13, 25 + by, 3, 2, BM, BD);
  c.dither(17, 25 + by, 3, 2, BM, BD);

  // Feet
  c.rect(12, 27 + by, 4, 2, BGD);
  c.rect(17, 27 + by, 4, 2, BGD);
  c.set(12, 27 + by, BG);
  c.set(17, 27 + by, BG);

  c.outline(O);
}

function createMummySprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawMummy(c, i, 0, 0);
    idle.push(c.toFrame());
  }

  const walk: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawMummy(c, i, (i % 2 === 0 ? 0 : -1), 0);
    walk.push(c.toFrame());
  }

  const attack: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawMummy(c, i, 0, i === 1 ? 1 : 0);
    attack.push(c.toFrame());
  }

  const hurt: SpriteFrame[] = [];
  {
    const c1 = new PixelCanvas(32, 32);
    drawMummy(c1, 0, 0, 0);
    hurt.push(c1.toFrame());
    hurt.push(flashFrame(hurt[0], 10));
  }

  const death: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawMummy(c, 0, 0, 0);
    const shifted = shiftFrame(c.toFrame(), 0, i * 3);
    const c2 = new PixelCanvas(32, 32);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++)
        c2.px[y][x] = shifted.data[y][x];
    death.push(c2.toFrame());
  }

  return {
    id: 'mummy',
    palette: MUMMY_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 250, true),
      walk: makeAnim('walk', walk, 180, true),
      attack: makeAnim('attack', attack, 120, false),
      hurt: makeAnim('hurt', hurt, 100, false),
      death: makeAnim('death', death, 200, false),
    },
  };
}

function drawIceElemental(c: PixelCanvas, frame: number, pulse: number): void {
  const O = 1, ID = 2, IM = 3, IL = 4, IH = 5, WH = 6, GL = 7, GLH = 8, GLD = 9, SP = 10, SPH = 11, CY = 12;

  const by = 4;
  const pr = pulse;

  // Main body (crystalline)
  c.ellipse(16, 16 + by, 8 + pr, 9 + pr, IM);
  c.ellipse(15, 15 + by, 6 + pr, 7 + pr, IL);
  c.ellipse(14, 14 + by, 4 + pr, 4 + pr, IH);
  c.ellipse(18, 18 + by, 5 + pr, 6 + pr, ID);

  // Crystal spikes
  c.set(8, 10 + by, IL);
  c.set(7, 9 + by, IH);
  c.set(6, 8 + by, WH);
  c.set(24, 10 + by, IL);
  c.set(25, 9 + by, ID);
  c.set(26, 8 + by, IM);
  c.set(12, 6 + by, IH);
  c.set(11, 5 + by, WH);
  c.set(20, 6 + by, IL);
  c.set(21, 5 + by, ID);

  // Crystal facets
  c.line(12, 12 + by, 16, 8 + by, IL);
  c.line(16, 8 + by, 20, 12 + by, IL);
  c.line(20, 12 + by, 16, 22 + by, ID);
  c.line(12, 12 + by, 16, 22 + by, ID);

  // Inner glow
  c.ellipse(16, 16 + by, 3, 3, GL);
  c.ellipse(15, 15 + by, 2, 2, GLH);
  c.set(16, 14 + by, WH);

  // Frost particles
  c.set(9 + frame, 14 + by, SP);
  c.set(22 - frame, 13 + by, SPH);
  c.set(13, 22 + by - frame, SP);
  c.set(19, 23 + by - frame, SPH);

  // Dithering for icy texture
  c.dither(10, 14 + by, 4, 4, IM, IL);
  c.dither(18, 16 + by, 4, 4, IM, ID);

  // Eyes
  c.set(14, 15 + by, CY);
  c.set(17, 15 + by, CY);
  c.set(14, 14 + by, WH);
  c.set(17, 14 + by, WH);

  c.outline(O);
}

function createIceElementalSprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  const pulseSeq = [0, 1, -1];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawIceElemental(c, i, pulseSeq[i]);
    idle.push(c.toFrame());
  }

  const attack: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawIceElemental(c, i, i + 1);
    if (i >= 1) {
      c.circle(16, 4, 2 + i, 7);
      c.set(16, 3, 6);
    }
    attack.push(c.toFrame());
  }

  const hurt: SpriteFrame[] = [];
  {
    const c1 = new PixelCanvas(32, 32);
    drawIceElemental(c1, 0, 0);
    hurt.push(c1.toFrame());
    hurt.push(flashFrame(hurt[0], 9));
  }

  const death: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawIceElemental(c, 0, -i);
    death.push(c.toFrame());
  }

  return {
    id: 'ice_elemental',
    palette: ICE_ELEMENTAL_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 250, true),
      attack: makeAnim('attack', attack, 120, false),
      hurt: makeAnim('hurt', hurt, 100, false),
      death: makeAnim('death', death, 200, false),
    },
  };
}

function drawVoidCreature(c: PixelCanvas, frame: number, distort: number): void {
  const O = 1, VD = 2, VM = 3, VL = 4, VH = 5, NG = 6, NGH = 7, BK = 8, EY = 9, GL = 10, GLH = 11, PT = 12, PTH = 13;

  const by = 4;
  const dx = distort;

  // Main body (amorphous dark shape)
  c.ellipse(16 + dx, 16 + by, 8, 9, VM);
  c.ellipse(15 + dx, 15 + by, 6, 7, VL);
  c.ellipse(14 + dx, 14 + by, 3, 4, VH);
  c.ellipse(18 + dx, 18 + by, 5, 6, VD);

  // Void tendrils
  c.line(8 + dx, 14 + by, 5, 10, VM);
  c.line(5, 10, 3, 8, VD);
  c.set(3, 7, VL);
  c.line(24 + dx, 14 + by, 27, 10, VM);
  c.line(27, 10, 29, 8, VD);
  c.set(29, 7, VL);

  c.line(10 + dx, 22 + by, 7, 26, VM);
  c.set(6, 27, VD);
  c.line(22 + dx, 22 + by, 25, 26, VM);
  c.set(26, 27, VD);

  // Neon glow veins
  c.line(13 + dx, 12 + by, 14 + dx, 18 + by, NG);
  c.line(18 + dx, 12 + by, 17 + dx, 18 + by, NG);
  c.set(14 + dx, 14 + by, NGH);
  c.set(17 + dx, 14 + by, NGH);
  c.set(15 + dx, 16 + by, NG);
  c.set(16 + dx, 16 + by, NGH);

  // Eyes (neon purple)
  c.set(13 + dx, 14 + by, GLH);
  c.set(14 + dx, 14 + by, EY);
  c.set(17 + dx, 14 + by, GLH);
  c.set(18 + dx, 14 + by, EY);

  // Void particles
  c.set(9 + frame, 12 + by, PT);
  c.set(22 - frame, 11 + by, PTH);
  c.set(11, 24 + by - frame, PT);
  c.set(20, 25 + by - frame, PTH);

  // Dark core
  c.ellipse(16 + dx, 16 + by, 2, 2, BK);

  // Dithering for void texture
  c.dither(10 + dx, 14 + by, 4, 4, VM, VD);
  c.dither(18 + dx, 16 + by, 4, 4, VM, VD);

  c.outline(O);
}

function createVoidCreatureSprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  const distortSeq = [0, 1, -1];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawVoidCreature(c, i, distortSeq[i]);
    idle.push(c.toFrame());
  }

  const attack: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawVoidCreature(c, i, i * 2 - 2);
    if (i >= 1) {
      c.circle(16, 6, 2 + i, 6);
      c.circle(16, 6, 1, 7);
    }
    attack.push(c.toFrame());
  }

  const hurt: SpriteFrame[] = [];
  {
    const c1 = new PixelCanvas(32, 32);
    drawVoidCreature(c1, 0, 0);
    hurt.push(c1.toFrame());
    hurt.push(flashFrame(hurt[0], 11));
  }

  const death: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawVoidCreature(c, 0, 0);
    const shifted = shiftFrame(c.toFrame(), 0, i * 2);
    const c2 = new PixelCanvas(32, 32);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++)
        c2.px[y][x] = shifted.data[y][x];
    death.push(c2.toFrame());
  }

  return {
    id: 'void_creature',
    palette: VOID_CREATURE_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 250, true),
      attack: makeAnim('attack', attack, 120, false),
      hurt: makeAnim('hurt', hurt, 100, false),
      death: makeAnim('death', death, 200, false),
    },
  };
}

function drawHolyKnight(c: PixelCanvas, frame: number, legPhase: number, swordFrame: number): void {
  const O = 1, GD = 2, GM = 3, GL = 4, GH = 5, CP = 6, CPL = 7, AD = 8, AM = 9, AH = 10, BL = 11, BM = 12;
  const SD = 13, SM = 14, SH = 15, EY = 16, WH = 17;

  const by = 2;

  // Cape (white, flowing behind)
  c.ellipse(16, 18 + by, 8, 10, CP);
  c.ellipse(15, 17 + by, 6, 8, CPL);
  c.ellipse(18, 19 + by, 5, 7, AD);

  // Cape fold details
  c.line(13, 12 + by, 12, 26 + by, AD);
  c.line(19, 12 + by, 20, 26 + by, AD);
  c.set(14, 16 + by, CPL);
  c.set(14, 20 + by, CPL);
  c.set(18, 18 + by, AD);

  // Body / Gold armor
  c.rect(11, 11 + by, 10, 8, GM);
  c.rect(12, 11 + by, 8, 2, GH);
  c.set(12, 11 + by, GH);
  c.set(13, 11 + by, GH);
  c.set(14, 11 + by, GH);
  c.rect(11, 17 + by, 10, 2, GD);
  c.rect(17, 12 + by, 4, 6, GD);
  c.rect(11, 12 + by, 3, 5, GL);

  // Armor plate details
  c.line(13, 12 + by, 13, 17 + by, GD);
  c.line(17, 12 + by, 17, 17 + by, GD);
  c.set(14, 13 + by, GH);
  c.set(15, 13 + by, GH);
  c.set(14, 15 + by, GL);
  c.set(15, 15 + by, GL);

  // Blue accent lines
  c.line(11, 11 + by, 20, 11 + by, BL);
  c.line(11, 18 + by, 20, 18 + by, BL);
  c.set(12, 12 + by, BM);
  c.set(19, 12 + by, BM);

  // Shoulders
  c.ellipse(10, 11 + by, 3, 2, GM);
  c.ellipse(22, 11 + by, 3, 2, GM);
  c.set(9, 10 + by, GH);
  c.set(10, 10 + by, GH);
  c.set(22, 10 + by, GH);
  c.set(23, 10 + by, GH);

  // Head
  c.ellipse(16, 7 + by, 4, 4, SM);
  c.ellipse(15, 6 + by, 3, 3, SH);
  c.ellipse(17, 8 + by, 3, 3, SD);

  // Helmet
  c.ellipse(16, 5 + by, 5, 3, GM);
  c.ellipse(15, 4 + by, 3, 2, GH);
  c.rect(11, 5 + by, 2, 3, GM);
  c.rect(19, 5 + by, 2, 3, GD);
  c.set(12, 5 + by, GH);
  c.set(19, 6 + by, GD);

  // Helmet crest (blue)
  c.set(15, 3 + by, BL);
  c.set(16, 3 + by, BM);
  c.set(17, 3 + by, BL);

  // Face
  c.set(14, 7 + by, EY);
  c.set(17, 7 + by, EY);
  c.set(15, 8 + by, SH);
  c.set(16, 8 + by, SD);

  // Stern expression
  c.set(14, 8 + by, SD);
  c.set(17, 8 + by, SD);

  // Legs
  const leftLegX = 13;
  const rightLegX = 17;
  const leftLegOff = Math.round(Math.sin(legPhase) * 2);
  const rightLegOff = Math.round(Math.sin(legPhase + Math.PI) * 2);

  c.rect(leftLegX, 22 + by, 3, 4 + leftLegOff, GM);
  c.rect(rightLegX, 22 + by, 3, 4 + rightLegOff, GM);
  c.set(leftLegX, 22 + by, GL);
  c.set(rightLegX, 22 + by, GL);

  // Boots (gold-trimmed)
  c.rect(leftLegX - 1, 25 + by + leftLegOff, 4, 3, GD);
  c.rect(rightLegX - 1, 25 + by + rightLegOff, 4, 3, GD);
  c.set(leftLegX - 1, 25 + by + leftLegOff, GM);
  c.set(rightLegX - 1, 25 + by + rightLegOff, GM);
  c.set(leftLegX, 25 + by + leftLegOff, GL);
  c.set(rightLegX, 25 + by + rightLegOff, GL);

  // Sword
  if (swordFrame === 0) {
    c.rect(23, 8 + by, 2, 10, SM);
    c.set(23, 8 + by, SH);
    c.set(23, 9 + by, SH);
    c.rect(24, 10 + by, 1, 6, SD);
    c.rect(22, 17 + by, 4, 2, GD);
    c.set(23, 17 + by, GH);
  } else if (swordFrame === 1) {
    c.rect(25, 6 + by, 2, 10, SM);
    c.set(25, 6 + by, SH);
    c.rect(26, 8 + by, 1, 6, SD);
    c.rect(24, 15 + by, 4, 2, GD);
  } else {
    for (let i = 0; i < 8; i++) {
      c.set(23 + i, 12 + by - i, SM);
      c.set(23 + i, 13 + by - i, SD);
    }
    c.set(23, 12 + by, SH);
    c.set(24, 11 + by, SH);
    c.rect(22, 13 + by, 4, 2, GD);
  }

  c.outline(O);
}

function createHolyKnightSprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawHolyKnight(c, i, 0, 0);
    idle.push(c.toFrame());
  }

  const walk: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(32, 32);
    drawHolyKnight(c, i, i * Math.PI / 2, 0);
    walk.push(c.toFrame());
  }

  const attack: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawHolyKnight(c, i, 0, i);
    attack.push(c.toFrame());
  }

  const hurt: SpriteFrame[] = [];
  {
    const c1 = new PixelCanvas(32, 32);
    drawHolyKnight(c1, 0, 0, 0);
    hurt.push(c1.toFrame());
    hurt.push(flashFrame(hurt[0], 15));
  }

  const death: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawHolyKnight(c, 0, 0, 0);
    const shifted = shiftFrame(c.toFrame(), 0, i * 3);
    const c2 = new PixelCanvas(32, 32);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++)
        c2.px[y][x] = shifted.data[y][x];
    death.push(c2.toFrame());
  }

  return {
    id: 'holy_knight',
    palette: HOLY_KNIGHT_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 200, true),
      walk: makeAnim('walk', walk, 120, true),
      attack: makeAnim('attack', attack, 100, false),
      hurt: makeAnim('hurt', hurt, 100, false),
      death: makeAnim('death', death, 200, false),
    },
  };
}

// ============================================================
// BOSS SPRITES (48x48)
// ============================================================

function drawAncientTreeSpirit(c: PixelCanvas, frame: number, sway: number, attackType: number): void {
  const O = 1, BKD = 2, BKM = 3, BKLT = 4, BKHL = 5, LFD = 6, LFM = 7, LFL = 8, LFHL = 9;
  const GL = 10, GLH = 11, GLD = 12, BKLN = 13, RTD = 14, RTM = 15, VND = 16, VNM = 17;

  const sx = sway;

  // Massive trunk
  c.rect(16 + sx, 14, 16, 24, BKM);
  c.rect(18 + sx, 14, 12, 22, BKLT);
  c.rect(20 + sx, 14, 6, 18, BKHL);
  c.rect(28 + sx, 16, 4, 20, BKD);

  // Bark texture
  for (let y = 14; y < 36; y += 3) {
    c.line(17 + sx, y, 17 + sx, y + 2, BKD);
    c.line(27 + sx, y + 1, 27 + sx, y + 3, BKD);
  }
  c.set(20 + sx, 18, BKLN);
  c.set(22 + sx, 22, BKLN);
  c.set(24 + sx, 26, BKLN);
  c.set(21 + sx, 30, BKLN);
  c.set(23 + sx, 34, BKLN);

  // Roots
  c.rect(12 + sx, 36, 6, 6, BKM);
  c.rect(30 + sx, 36, 6, 6, BKM);
  c.rect(14 + sx, 36, 3, 5, BKLT);
  c.rect(32 + sx, 36, 3, 5, BKLT);
  c.rect(10 + sx, 38, 4, 4, RTD);
  c.rect(34 + sx, 38, 4, 4, RTD);
  c.set(10 + sx, 41, RTM);
  c.set(37 + sx, 41, RTM);

  // Extra root tendrils
  c.line(10 + sx, 40, 7 + sx, 44, RTM);
  c.line(36 + sx, 40, 40 + sx, 44, RTM);
  c.set(7 + sx, 44, RTD);
  c.set(40 + sx, 44, RTD);

  // Canopy
  c.ellipse(24 + sx, 8, 16, 10, LFM);
  c.ellipse(23 + sx, 7, 13, 8, LFL);
  c.ellipse(22 + sx, 6, 8, 5, LFHL);
  c.ellipse(28 + sx, 10, 10, 6, LFD);

  // Leaf clusters
  c.ellipse(12 + sx, 6, 5, 4, LFM);
  c.ellipse(36 + sx, 6, 5, 4, LFD);
  c.set(10 + sx, 4, LFL);
  c.set(38 + sx, 4, LFD);
  c.set(14 + sx, 3, LFHL);
  c.set(34 + sx, 3, LFM);

  // Branches / arms
  c.line(10 + sx, 20, 4 + sx, 14, BKM);
  c.line(4 + sx, 14, 2, 10, BKM);
  c.ellipse(2, 8, 3, 3, LFM);
  c.set(1, 7, LFL);
  c.set(0, 6, LFHL);

  c.line(38 + sx, 20, 44 + sx, 14, BKM);
  c.line(44 + sx, 14, 46, 10, BKM);
  c.ellipse(46, 8, 3, 3, LFM);
  c.set(47, 7, LFD);

  // Attack animations
  if (attackType === 1) {
    c.line(4 + sx, 40, 2, 46, RTM);
    c.set(2, 47, RTD);
    c.line(34 + sx, 40, 36, 46, RTM);
    c.set(36, 47, RTD);
    c.ellipse(2, 46, 3, 2, RTM);
    c.ellipse(36, 46, 3, 2, RTM);
  } else if (attackType === 2) {
    c.line(2, 8, -2, 20, VNM);
    c.line(-2, 20, 0, 30, VND);
    c.set(0, 30, VNM);
    c.line(46, 8, 50, 20, VNM);
    c.line(50, 20, 48, 30, VND);
    c.set(48, 30, VNM);
  }

  // Glowing core
  c.ellipse(24 + sx, 24, 4, 4, GL);
  c.ellipse(24 + sx, 24, 2, 2, GLH);
  c.set(24 + sx, 23, GLD);

  // Eyes
  c.set(20 + sx, 18, GLH);
  c.set(21 + sx, 18, GL);
  c.set(26 + sx, 18, GLH);
  c.set(27 + sx, 18, GL);

  // Mouth
  c.rect(21 + sx, 22, 6, 2, BKD);
  c.set(22 + sx, 22, BKLN);
  c.set(25 + sx, 22, BKLN);

  c.outline(O);
}

function createAncientTreeSpiritSprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  const swaySeq = [0, 1, -1, 0];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawAncientTreeSpirit(c, i, swaySeq[i], 0);
    idle.push(c.toFrame());
  }

  const attack1: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawAncientTreeSpirit(c, i, 0, i >= 2 ? 1 : 0);
    attack1.push(c.toFrame());
  }

  const attack2: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawAncientTreeSpirit(c, i, 0, i >= 2 ? 2 : 0);
    attack2.push(c.toFrame());
  }

  const hurt: SpriteFrame[] = [];
  {
    const c1 = new PixelCanvas(48, 48);
    drawAncientTreeSpirit(c1, 0, 0, 0);
    hurt.push(c1.toFrame());
    hurt.push(flashFrame(hurt[0], 9));
  }

  const death: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawAncientTreeSpirit(c, 0, 0, 0);
    const shifted = shiftFrame(c.toFrame(), 0, i * 2);
    const c2 = new PixelCanvas(48, 48);
    for (let y = 0; y < 48; y++)
      for (let x = 0; x < 48; x++)
        c2.px[y][x] = shifted.data[y][x];
    death.push(c2.toFrame());
  }

  return {
    id: 'ancient_tree_spirit',
    palette: ANCIENT_TREE_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 250, true),
      attack1: makeAnim('attack1', attack1, 150, false),
      attack2: makeAnim('attack2', attack2, 150, false),
      hurt: makeAnim('hurt', hurt, 100, false),
      death: makeAnim('death', death, 250, false),
    },
  };
}

function drawScorpionKing(c: PixelCanvas, frame: number, attackType: number): void {
  const O = 1, BD = 2, BM = 3, BL = 4, BH = 5, GD = 6, GM = 7, GL = 8, PD = 9, PM = 10, PL = 11;
  const SD = 12, SM = 13, EY = 14, SK = 15, CR = 16;

  // Large body
  c.ellipse(24, 28, 12, 7, BM);
  c.ellipse(23, 27, 10, 5, BL);
  c.ellipse(22, 26, 6, 3, BH);
  c.ellipse(28, 30, 8, 4, BD);

  // Body segments
  c.ellipse(24, 22, 10, 5, BM);
  c.ellipse(24, 17, 8, 4, BL);
  c.ellipse(24, 13, 6, 4, BM);

  // Gold trim on segments
  c.circleOutline(24, 28, 10, GD);
  c.circleOutline(24, 22, 8, GD);
  c.set(16, 28, GL);
  c.set(15, 22, GL);
  c.set(18, 17, GL);

  // Texture
  c.dither(16, 26, 6, 4, BM, BL);
  c.dither(26, 28, 6, 4, BM, BD);

  // Head
  c.ellipse(24, 10, 6, 4, BM);
  c.ellipse(23, 9, 5, 3, BL);
  c.set(21, 8, BH);

  // Crown
  c.rect(20, 5, 8, 3, GM);
  c.set(20, 5, GL);
  c.set(21, 4, GM);
  c.set(23, 3, GL);
  c.set(24, 3, CR);
  c.set(25, 3, GL);
  c.set(27, 4, GM);
  c.set(27, 5, GL);

  // Eyes
  c.set(21, 10, CR);
  c.set(22, 10, EY);
  c.set(26, 10, CR);
  c.set(27, 10, EY);

  // Pincers (large, gold-trimmed)
  c.ellipse(10, 12, 5, 3, PM);
  c.ellipse(9, 11, 3, 2, PL);
  c.set(7, 11, PD);
  c.set(8, 13, PD);
  c.circleOutline(10, 12, 4, GD);
  c.set(7, 12, GL);

  c.ellipse(38, 12, 5, 3, PM);
  c.ellipse(39, 11, 3, 2, PL);
  c.set(41, 11, PD);
  c.set(40, 13, PD);
  c.circleOutline(38, 12, 4, GD);
  c.set(41, 12, GL);

  // Legs
  for (let i = 0; i < 5; i++) {
    const lo = Math.round(Math.sin(frame + i * 0.6) * 1);
    const lx = 15 + i * 4;
    c.line(lx, 32, lx - 3, 38 + lo, BM);
    c.set(lx - 3, 38 + lo, BD);
    c.line(lx + 1, 32, lx + 4, 38 - lo, BM);
    c.set(lx + 4, 38 - lo, BD);
  }

  // Tail
  c.line(24, 8, 24, 4, SM);
  c.line(24, 4, 28, 2, SM);
  c.line(28, 2, 32, 1, SM);
  c.set(32, 0, SK);
  c.set(33, 0, SD);
  c.set(24, 6, BL);
  c.set(26, 3, BL);
  c.set(30, 1, BL);

  // Attack animations
  if (attackType === 1) {
    c.line(32, 1, 36, 10, SM);
    c.set(36, 10, SK);
    c.set(37, 10, SD);
  } else if (attackType === 2) {
    c.line(7, 12, 3, 18, PM);
    c.set(3, 18, PD);
    c.set(2, 18, PL);
    c.line(41, 12, 45, 18, PM);
    c.set(45, 18, PD);
    c.set(46, 18, PL);
  }

  c.outline(O);
}

function createScorpionKingSprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawScorpionKing(c, i, 0);
    idle.push(c.toFrame());
  }

  const attack1: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawScorpionKing(c, i, i >= 2 ? 1 : 0);
    attack1.push(c.toFrame());
  }

  const attack2: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawScorpionKing(c, i, i >= 2 ? 2 : 0);
    attack2.push(c.toFrame());
  }

  const hurt: SpriteFrame[] = [];
  {
    const c1 = new PixelCanvas(48, 48);
    drawScorpionKing(c1, 0, 0);
    hurt.push(c1.toFrame());
    hurt.push(flashFrame(hurt[0], 9));
  }

  const death: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawScorpionKing(c, 0, 0);
    const shifted = shiftFrame(c.toFrame(), 0, i * 2);
    const c2 = new PixelCanvas(48, 48);
    for (let y = 0; y < 48; y++)
      for (let x = 0; x < 48; x++)
        c2.px[y][x] = shifted.data[y][x];
    death.push(c2.toFrame());
  }

  return {
    id: 'scorpion_king',
    palette: SCORPION_KING_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 250, true),
      attack1: makeAnim('attack1', attack1, 150, false),
      attack2: makeAnim('attack2', attack2, 150, false),
      hurt: makeAnim('hurt', hurt, 100, false),
      death: makeAnim('death', death, 250, false),
    },
  };
}

function drawIceDragon(c: PixelCanvas, frame: number, attackType: number): void {
  const O = 1, ID = 2, IM = 3, IL = 4, IH = 5, WH = 6, SVD = 7, SVM = 8, SVL = 9;
  const GL = 10, GLH = 11, EY = 12, CL = 13, SP = 14, SPH = 15, WN = 16, WNH = 17;

  // Body
  c.ellipse(24, 26, 14, 8, IM);
  c.ellipse(23, 25, 11, 6, IL);
  c.ellipse(22, 24, 7, 4, IH);
  c.ellipse(28, 28, 10, 5, ID);

  // Belly scales
  c.ellipse(24, 30, 8, 3, SVD);
  c.ellipse(23, 29, 6, 2, SVM);
  c.ellipse(22, 28, 3, 1, SVL);

  // Scale texture
  for (let i = 0; i < 5; i++) {
    c.set(14 + i * 4, 24, IL);
    c.set(15 + i * 4, 25, IM);
  }
  c.dither(14, 26, 8, 4, IM, IL);
  c.dither(26, 28, 8, 4, IM, ID);

  // Neck
  c.ellipse(12, 18, 5, 6, IM);
  c.ellipse(11, 17, 4, 4, IL);
  c.ellipse(13, 20, 3, 3, ID);

  // Head
  c.ellipse(8, 12, 6, 5, IM);
  c.ellipse(7, 11, 5, 4, IL);
  c.ellipse(9, 13, 4, 3, ID);

  // Snout
  c.rect(2, 12, 5, 3, IL);
  c.set(2, 12, IH);
  c.set(1, 13, WH);

  // Horns
  c.line(6, 8, 4, 4, IM);
  c.set(4, 3, IH);
  c.set(3, 4, WH);
  c.line(10, 8, 12, 4, IM);
  c.set(12, 3, ID);
  c.set(13, 4, IM);

  // Eyes
  c.set(6, 11, GLH);
  c.set(7, 11, EY);
  c.set(9, 11, GLH);
  c.set(10, 11, EY);

  // Ice breath
  c.set(3, 13, CL);
  c.set(2, 14, SP);

  // Wings
  c.line(20, 20, 14, 8, WN);
  c.line(14, 8, 8, 6, WN);
  c.line(8, 6, 6, 10, WN);
  c.line(6, 10, 10, 16, WN);
  c.line(10, 16, 16, 20, WN);
  c.line(20, 20, 28, 8, WN);
  c.line(28, 8, 36, 6, WN);
  c.line(36, 6, 38, 12, WN);
  c.line(38, 12, 32, 18, WN);
  c.line(32, 18, 28, 22, WN);

  // Wing membrane
  for (let y = 8; y < 18; y++) {
    for (let x = 6; x < 18; x++) {
      if (c.get(x, y) === 0 && x < 18 && y < 18) {
        const dist = Math.abs(x - 12) + Math.abs(y - 13);
        if (dist < 7) c.set(x, y, WNH);
      }
    }
  }
  for (let y = 8; y < 18; y++) {
    for (let x = 28; x < 40; x++) {
      if (c.get(x, y) === 0 && x < 40 && y < 18) {
        const dist = Math.abs(x - 34) + Math.abs(y - 13);
        if (dist < 7) c.set(x, y, WN);
      }
    }
  }

  // Wing highlight
  c.set(10, 9, WNH);
  c.set(11, 10, WNH);
  c.set(32, 9, WN);
  c.set(33, 10, WN);

  // Tail
  c.line(36, 26, 42, 28, IM);
  c.line(42, 28, 44, 32, IM);
  c.line(44, 32, 42, 36, IM);
  c.set(42, 36, ID);
  c.set(43, 35, IL);
  c.set(41, 37, SP);

  // Tail spikes
  c.set(40, 29, SP);
  c.set(43, 31, SPH);
  c.set(41, 35, SP);

  // Legs
  c.rect(16, 32, 3, 6, IM);
  c.rect(28, 32, 3, 6, IM);
  c.set(16, 32, IL);
  c.set(28, 32, IL);
  c.rect(15, 37, 4, 2, CL);
  c.rect(27, 37, 4, 2, CL);
  c.set(15, 37, IH);
  c.set(27, 37, IH);

  // Attack
  if (attackType === 1) {
    for (let i = 0; i < 6; i++) {
      c.set(1 - i, 13 + i, SP);
      c.set(0 - i, 14 + i, SPH);
    }
    c.set(-4, 19, GL);
    c.set(-3, 20, GLH);
  } else if (attackType === 2) {
    c.line(42, 36, 46, 40, IM);
    c.set(46, 40, ID);
    c.line(44, 32, 46, 36, IM);
    c.set(46, 36, SP);
  }

  c.outline(O);
}

function createIceDragonSprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawIceDragon(c, i, 0);
    idle.push(c.toFrame());
  }

  const attack1: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawIceDragon(c, i, i >= 2 ? 1 : 0);
    attack1.push(c.toFrame());
  }

  const attack2: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawIceDragon(c, i, i >= 2 ? 2 : 0);
    attack2.push(c.toFrame());
  }

  const hurt: SpriteFrame[] = [];
  {
    const c1 = new PixelCanvas(48, 48);
    drawIceDragon(c1, 0, 0);
    hurt.push(c1.toFrame());
    hurt.push(flashFrame(hurt[0], 9));
  }

  const death: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawIceDragon(c, 0, 0);
    const shifted = shiftFrame(c.toFrame(), 0, i * 3);
    const c2 = new PixelCanvas(48, 48);
    for (let y = 0; y < 48; y++)
      for (let x = 0; x < 48; x++)
        c2.px[y][x] = shifted.data[y][x];
    death.push(c2.toFrame());
  }

  return {
    id: 'ice_dragon',
    palette: ICE_DRAGON_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 250, true),
      attack1: makeAnim('attack1', attack1, 150, false),
      attack2: makeAnim('attack2', attack2, 150, false),
      hurt: makeAnim('hurt', hurt, 100, false),
      death: makeAnim('death', death, 250, false),
    },
  };
}

function drawVoidDevourer(c: PixelCanvas, frame: number, attackType: number): void {
  const O = 1, VD = 2, VM = 3, VL = 4, VH = 5, NG = 6, NGH = 7, BK = 8, EY = 9;
  const GL = 10, GLH = 11, PT = 12, PTH = 13, TD = 14, TM = 15, TL = 16;

  // Main body (massive amorphous)
  c.ellipse(24, 26, 14, 12, VM);
  c.ellipse(23, 25, 11, 9, VL);
  c.ellipse(22, 24, 7, 6, VH);
  c.ellipse(28, 28, 10, 8, VD);

  // Void core
  c.ellipse(24, 26, 5, 5, BK);
  c.ellipse(24, 26, 3, 3, GL);
  c.ellipse(24, 26, 1, 1, GLH);

  // Neon veins
  c.line(18, 20, 20, 28, NG);
  c.line(20, 28, 22, 32, NG);
  c.line(30, 20, 28, 28, NG);
  c.line(28, 28, 26, 32, NG);
  c.set(19, 24, NGH);
  c.set(29, 24, NGH);
  c.set(22, 30, NG);
  c.set(26, 30, NGH);

  // Tendrils
  c.line(10, 22, 4, 16, TM);
  c.line(4, 16, 2, 10, TD);
  c.set(2, 9, TL);
  c.line(38, 22, 44, 16, TM);
  c.line(44, 16, 46, 10, TD);
  c.set(46, 9, VL);

  c.line(12, 34, 6, 40, TM);
  c.set(6, 41, TD);
  c.line(36, 34, 42, 40, TM);
  c.set(42, 41, TD);

  // More tendrils
  c.line(14, 18, 8, 12, TM);
  c.set(8, 11, TL);
  c.line(34, 18, 40, 12, TM);
  c.set(40, 11, TD);

  // Eyes (multiple, glowing)
  c.set(18, 22, GLH);
  c.set(19, 22, EY);
  c.set(28, 22, GLH);
  c.set(29, 22, EY);
  c.set(22, 20, GL);
  c.set(26, 20, GL);
  c.set(24, 18, GLH);

  // Mouth (void maw)
  c.ellipse(24, 30, 4, 2, BK);
  c.set(22, 30, NG);
  c.set(26, 30, NG);
  c.set(23, 31, VD);
  c.set(25, 31, VD);

  // Void particles
  for (let i = 0; i < 8; i++) {
    const px = 10 + Math.floor(Math.sin(frame + i * 0.8) * 14 + 14);
    const py = 14 + Math.floor(Math.cos(frame + i * 0.6) * 12 + 12);
    c.set(px, py, i % 2 === 0 ? PT : PTH);
  }

  // Dithering
  c.dither(14, 22, 6, 6, VM, VD);
  c.dither(28, 24, 6, 6, VM, VD);

  // Attack
  if (attackType === 1) {
    c.ellipse(24, 40, 8 + frame, 4 + frame, BK);
    c.ellipse(24, 40, 6 + frame, 2 + frame, GL);
    c.circleOutline(24, 40, 8 + frame, NG);
  } else if (attackType === 2) {
    for (let i = 0; i < 6; i++) {
      c.line(10, 22 + i * 2, 2 - i, 20 + i * 3, TM);
      c.set(2 - i, 20 + i * 3, TL);
      c.line(38, 22 + i * 2, 46 + i, 20 + i * 3, TM);
      c.set(46 + i, 20 + i * 3, TD);
    }
  }

  c.outline(O);
}

function createVoidDevourerSprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawVoidDevourer(c, i, 0);
    idle.push(c.toFrame());
  }

  const attack1: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawVoidDevourer(c, i, i >= 2 ? 1 : 0);
    attack1.push(c.toFrame());
  }

  const attack2: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawVoidDevourer(c, i, i >= 2 ? 2 : 0);
    attack2.push(c.toFrame());
  }

  const hurt: SpriteFrame[] = [];
  {
    const c1 = new PixelCanvas(48, 48);
    drawVoidDevourer(c1, 0, 0);
    hurt.push(c1.toFrame());
    hurt.push(flashFrame(hurt[0], 11));
  }

  const death: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawVoidDevourer(c, 0, 0);
    const shifted = shiftFrame(c.toFrame(), 0, i * 2);
    const c2 = new PixelCanvas(48, 48);
    for (let y = 0; y < 48; y++)
      for (let x = 0; x < 48; x++)
        c2.px[y][x] = shifted.data[y][x];
    death.push(c2.toFrame());
  }

  return {
    id: 'void_devourer',
    palette: VOID_DEVOURER_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 250, true),
      attack1: makeAnim('attack1', attack1, 150, false),
      attack2: makeAnim('attack2', attack2, 150, false),
      hurt: makeAnim('hurt', hurt, 100, false),
      death: makeAnim('death', death, 250, false),
    },
  };
}

function drawFallenSaint(c: PixelCanvas, frame: number, attackType: number): void {
  const O = 1, GD = 2, GM = 3, GL = 4, GH = 5, WKD = 6, WKM = 7, WKL = 8;
  const WH = 9, AD = 10, AM = 11, AH = 12, LG = 13, EY = 14, HL = 15, CR = 16;

  const by = 2;

  // Dark wings
  c.ellipse(14, 16 + by, 10, 14, WKM);
  c.ellipse(13, 15 + by, 8, 11, WKL);
  c.ellipse(12, 14 + by, 5, 7, WKM);
  c.ellipse(34, 16 + by, 10, 14, WKD);
  c.ellipse(35, 15 + by, 8, 11, WKM);
  c.ellipse(36, 14 + by, 5, 7, WKD);

  // Wing feather details
  for (let i = 0; i < 5; i++) {
    c.line(8 + i, 20 + by + i, 4 + i, 28 + by + i, WKD);
    c.line(40 - i, 20 + by + i, 44 - i, 28 + by + i, WKD);
  }
  c.set(6, 30 + by, WKL);
  c.set(42, 30 + by, WKD);

  // Body (corrupted gold armor)
  c.rect(18, 14 + by, 12, 14, GM);
  c.rect(19, 14 + by, 10, 2, GH);
  c.rect(18, 26 + by, 12, 2, GD);
  c.rect(26, 16 + by, 4, 10, GD);
  c.rect(18, 16 + by, 3, 8, GL);

  // Corrupted patches
  c.set(20, 18 + by, AD);
  c.set(22, 20 + by, AM);
  c.set(25, 17 + by, AD);
  c.set(27, 22 + by, AM);

  // Armor details
  c.line(20, 16 + by, 20, 26 + by, GD);
  c.line(26, 16 + by, 26, 26 + by, GD);
  c.set(21, 17 + by, GH);
  c.set(22, 17 + by, GH);
  c.set(23, 19 + by, GL);
  c.set(24, 19 + by, GL);

  // Head
  c.ellipse(24, 10 + by, 5, 5, AM);
  c.ellipse(23, 9 + by, 4, 4, AH);
  c.ellipse(25, 11 + by, 3, 3, AD);

  // Corrupted halo
  c.circleOutline(24, 8 + by, 6, HL);
  c.set(18, 5 + by, LG);
  c.set(19, 4 + by, HL);
  c.set(24, 3 + by, CR);
  c.set(29, 4 + by, LG);
  c.set(30, 5 + by, HL);

  // Face
  c.set(22, 10 + by, EY);
  c.set(26, 10 + by, EY);
  c.set(22, 9 + by, LG);
  c.set(26, 9 + by, LG);
  c.set(23, 11 + by, AH);
  c.set(24, 11 + by, AD);
  c.set(25, 11 + by, AH);

  // Arms
  c.rect(14, 16 + by, 4, 10, GM);
  c.rect(30, 16 + by, 4, 10, GM);
  c.set(14, 16 + by, GL);
  c.set(30, 16 + by, GL);
  c.dither(14, 18 + by, 4, 6, GM, GD);
  c.dither(30, 18 + by, 4, 6, GM, GD);

  // Hands with light
  c.set(14, 26 + by, WH);
  c.set(15, 26 + by, LG);
  c.set(33, 26 + by, WH);
  c.set(32, 26 + by, LG);

  // Legs
  c.rect(20, 28 + by, 3, 6, GM);
  c.rect(25, 28 + by, 3, 6, GM);
  c.set(20, 28 + by, GL);
  c.set(25, 28 + by, GL);

  // Boots
  c.rect(19, 33 + by, 4, 3, GD);
  c.rect(24, 33 + by, 4, 3, GD);
  c.set(19, 33 + by, GM);
  c.set(24, 33 + by, GM);

  // Attack
  if (attackType === 1) {
    c.circle(14, 28 + by, 4 + frame, LG);
    c.circle(14, 28 + by, 2 + frame, WH);
    c.circle(33, 28 + by, 4 + frame, LG);
    c.circle(33, 28 + by, 2 + frame, WH);
  } else if (attackType === 2) {
    for (let i = 0; i < 8; i++) {
      c.set(14 - i, 26 + by - i * 2, HL);
      c.set(33 + i, 26 + by - i * 2, HL);
    }
    c.set(6, 10 + by, CR);
    c.set(41, 10 + by, CR);
  }

  c.outline(O);
}

function createFallenSaintSprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawFallenSaint(c, i, 0);
    idle.push(c.toFrame());
  }

  const attack1: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawFallenSaint(c, i, i >= 2 ? 1 : 0);
    attack1.push(c.toFrame());
  }

  const attack2: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawFallenSaint(c, i, i >= 2 ? 2 : 0);
    attack2.push(c.toFrame());
  }

  const hurt: SpriteFrame[] = [];
  {
    const c1 = new PixelCanvas(48, 48);
    drawFallenSaint(c1, 0, 0);
    hurt.push(c1.toFrame());
    hurt.push(flashFrame(hurt[0], 15));
  }

  const death: SpriteFrame[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new PixelCanvas(48, 48);
    drawFallenSaint(c, 0, 0);
    const shifted = shiftFrame(c.toFrame(), 0, i * 3);
    const c2 = new PixelCanvas(48, 48);
    for (let y = 0; y < 48; y++)
      for (let x = 0; x < 48; x++)
        c2.px[y][x] = shifted.data[y][x];
    death.push(c2.toFrame());
  }

  return {
    id: 'fallen_saint',
    palette: FALLEN_SAINT_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 250, true),
      attack1: makeAnim('attack1', attack1, 150, false),
      attack2: makeAnim('attack2', attack2, 150, false),
      hurt: makeAnim('hurt', hurt, 100, false),
      death: makeAnim('death', death, 250, false),
    },
  };
}

// ============================================================
// NPC SPRITES (32x32)
// ============================================================

function drawHumanoidNPC(c: PixelCanvas, opts: {
  hairColors: [number, number, number];
  outfitColors: [number, number, number];
  skinColors: [number, number, number];
  bootColors: [number, number];
  accessory?: (c: PixelCanvas, by: number) => void;
  faceDetail?: (c: PixelCanvas, by: number) => void;
}): void {
  const O = 1;
  const [HD, HM, HL] = opts.hairColors;
  const [OD, OM, OL] = opts.outfitColors;
  const [SD, SM, SH] = opts.skinColors;
  const [BD, BM] = opts.bootColors;
  const by = 2;

  // Body
  c.rect(12, 12 + by, 8, 10, OM);
  c.rect(13, 12 + by, 6, 2, OL);
  c.rect(12, 20 + by, 8, 2, OD);
  c.rect(17, 14 + by, 3, 6, OD);
  c.rect(12, 14 + by, 2, 5, OL);

  // Outfit detail
  c.line(14, 13 + by, 14, 20 + by, OD);
  c.set(15, 14 + by, OL);
  c.set(16, 14 + by, OL);

  // Arms
  c.rect(9, 13 + by, 3, 7, OM);
  c.rect(20, 13 + by, 3, 7, OM);
  c.set(9, 13 + by, OL);
  c.set(20, 13 + by, OL);
  c.dither(9, 15 + by, 3, 4, OM, OD);
  c.dither(20, 15 + by, 3, 4, OM, OD);

  // Hands
  c.set(10, 20 + by, SM);
  c.set(21, 20 + by, SM);

  // Head
  c.ellipse(16, 8 + by, 4, 4, SM);
  c.ellipse(15, 7 + by, 3, 3, SH);
  c.ellipse(17, 9 + by, 3, 2, SD);

  // Hair
  c.ellipse(16, 5 + by, 5, 3, HM);
  c.ellipse(15, 4 + by, 3, 2, HL);
  c.rect(11, 5 + by, 2, 3, HM);
  c.rect(19, 5 + by, 2, 3, HD);
  c.set(12, 5 + by, HL);
  c.set(13, 4 + by, HL);
  c.set(14, 3 + by, HM);

  // Face
  c.set(14, 8 + by, 21);
  c.set(17, 8 + by, 21);
  c.set(15, 9 + by, SM);
  c.set(16, 9 + by, SD);

  if (opts.faceDetail) opts.faceDetail(c, by);

  // Legs
  c.rect(13, 22 + by, 3, 4, OM);
  c.rect(17, 22 + by, 3, 4, OM);
  c.set(13, 22 + by, OL);
  c.set(17, 22 + by, OL);

  // Boots
  c.rect(12, 25 + by, 4, 2, BD);
  c.rect(17, 25 + by, 4, 2, BD);
  c.set(12, 25 + by, BM);
  c.set(17, 25 + by, BM);

  if (opts.accessory) opts.accessory(c, by);

  c.outline(O);
}

function createEileenSprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawHumanoidNPC(c, {
      hairColors: [11, 12, 13],
      outfitColors: [2, 3, 4],
      skinColors: [7, 8, 9],
      bootColors: [13, 14],
      accessory: (cv, by) => {
        cv.set(10, 20 + by, 5);
        cv.set(21, 20 + by, 5);
        cv.set(15, 12 + by, 6);
        cv.set(16, 12 + by, 6);
      },
    });
    if (i % 2 === 1) {
      const shifted = shiftFrame(c.toFrame(), 0, -1);
      const c2 = new PixelCanvas(32, 32);
      for (let y = 0; y < 32; y++)
        for (let x = 0; x < 32; x++)
          c2.px[y][x] = shifted.data[y][x];
      idle.push(c2.toFrame());
    } else {
      idle.push(c.toFrame());
    }
  }

  return {
    id: 'eileen',
    palette: NPC_EILEEN_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 300, true),
    },
  };
}

function createGregorSprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawHumanoidNPC(c, {
      hairColors: [12, 13, 13],
      outfitColors: [9, 10, 11],
      skinColors: [7, 8, 9],
      bootColors: [12, 13],
      accessory: (cv, by) => {
        cv.rect(10, 14 + by, 12, 6, 9);
        cv.rect(11, 14 + by, 10, 2, 10);
        cv.set(15, 14 + by, 15);
        cv.set(16, 14 + by, 15);
        cv.set(10, 20 + by, 10);
        cv.set(21, 20 + by, 10);
      },
      faceDetail: (cv, by) => {
        cv.set(14, 9 + by, 12);
        cv.set(17, 9 + by, 12);
      },
    });
    idle.push(c.toFrame());
  }

  return {
    id: 'gregor',
    palette: NPC_GREGOR_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 300, true),
    },
  };
}

function createKashimSprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawHumanoidNPC(c, {
      hairColors: [11, 12, 12],
      outfitColors: [5, 6, 7],
      skinColors: [8, 9, 10],
      bootColors: [11, 12],
      accessory: (cv, by) => {
        cv.ellipse(16, 4 + by, 5, 3, 2);
        cv.ellipse(15, 3 + by, 4, 2, 3);
        cv.set(14, 2 + by, 4);
        cv.set(16, 2 + by, 14);
        cv.set(18, 2 + by, 4);
        cv.set(10, 20 + by, 15);
        cv.set(21, 20 + by, 15);
      },
    });
    idle.push(c.toFrame());
  }

  return {
    id: 'kashim',
    palette: NPC_KASHIM_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 300, true),
    },
  };
}

function createVeraSprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawHumanoidNPC(c, {
      hairColors: [14, 14, 14],
      outfitColors: [1, 2, 3],
      skinColors: [11, 12, 13],
      bootColors: [14, 14],
      accessory: (cv, by) => {
        cv.rect(9, 10 + by, 2, 12, 7);
        cv.set(9, 10 + by, 8);
        cv.set(9, 9 + by, 9);
        cv.ellipse(16, 4 + by, 6, 3, 2);
        cv.ellipse(15, 3 + by, 4, 2, 3);
        cv.set(14, 2 + by, 4);
        cv.set(16, 2 + by, 15);
        cv.set(18, 2 + by, 4);
      },
    });
    idle.push(c.toFrame());
  }

  return {
    id: 'vera',
    palette: NPC_VERA_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 300, true),
    },
  };
}

function createNoahSprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawHumanoidNPC(c, {
      hairColors: [11, 12, 12],
      outfitColors: [1, 2, 3],
      skinColors: [7, 8, 9],
      bootColors: [11, 12],
      accessory: (cv, by) => {
        cv.ellipse(16, 4 + by, 4, 2, 9);
        cv.ellipse(15, 3 + by, 3, 1, 10);
        cv.set(14, 2 + by, 10);
        cv.set(18, 2 + by, 10);
        cv.rect(10, 18 + by, 2, 4, 14);
        cv.set(10, 17 + by, 10);
        cv.rect(20, 18 + by, 2, 4, 14);
        cv.set(20, 17 + by, 10);
        cv.set(15, 12 + by, 15);
        cv.set(16, 12 + by, 15);
      },
    });
    idle.push(c.toFrame());
  }

  return {
    id: 'noah',
    palette: NPC_NOAH_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 300, true),
    },
  };
}

function createGuardCaptainSprite(): SpriteData {
  const idle: SpriteFrame[] = [];
  for (let i = 0; i < 3; i++) {
    const c = new PixelCanvas(32, 32);
    drawHumanoidNPC(c, {
      hairColors: [13, 13, 13],
      outfitColors: [2, 3, 4],
      skinColors: [8, 9, 10],
      bootColors: [12, 13],
      accessory: (cv, by) => {
        cv.ellipse(16, 4 + by, 5, 2, 2);
        cv.set(15, 3 + by, 3);
        cv.set(16, 3 + by, 4);
        cv.set(17, 3 + by, 3);
        cv.rect(11, 12 + by, 10, 2, 11);
        cv.set(15, 12 + by, 12);
        cv.set(16, 12 + by, 12);
        cv.set(10, 20 + by, 2);
        cv.set(21, 20 + by, 2);
      },
      faceDetail: (cv, by) => {
        cv.set(14, 9 + by, 14);
        cv.set(17, 9 + by, 14);
      },
    });
    idle.push(c.toFrame());
  }

  return {
    id: 'guard_captain',
    palette: NPC_GUARD_PALETTE,
    animations: {
      idle: makeAnim('idle', idle, 300, true),
    },
  };
}

// ============================================================
// TILE SETS (16x16)
// ============================================================

type TileData = { pixels: number[][]; palette: string[] };

function createForestTiles(): Record<string, TileData> {
  const P = FOREST_TILE_PALETTE;
  const tiles: Record<string, TileData> = {};

  tiles.forest_grass1 = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 2);
    c.dither(0, 0, 16, 16, 2, 3);
    for (let i = 0; i < 8; i++) {
      const x = (i * 7 + 3) % 16, y = (i * 5 + 2) % 16;
      c.set(x, y, 4);
      c.set(x + 1, y, 3);
    }
    c.set(4, 3, 5); c.set(5, 3, 6);
    c.set(12, 10, 5); c.set(11, 10, 6);
    return { pixels: c.px, palette: P };
  })();

  tiles.forest_grass2 = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 3);
    c.dither(0, 0, 16, 16, 3, 2);
    for (let i = 0; i < 6; i++) {
      const x = (i * 9 + 1) % 16, y = (i * 6 + 4) % 16;
      c.set(x, y, 4);
    }
    c.set(2, 6, 16); c.set(3, 6, 17);
    c.set(9, 2, 18); c.set(10, 2, 19);
    return { pixels: c.px, palette: P };
  })();

  tiles.forest_grass3 = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 2);
    c.dither(0, 0, 16, 16, 2, 1);
    for (let i = 0; i < 10; i++) {
      const x = (i * 3 + 2) % 16, y = (i * 4 + 1) % 16;
      c.set(x, y, 4);
    }
    c.set(7, 5, 16); c.set(8, 5, 17); c.set(7, 4, 18);
    c.set(3, 12, 16); c.set(4, 12, 19); c.set(3, 11, 17);
    return { pixels: c.px, palette: P };
  })();

  tiles.forest_dirt = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 9);
    c.dither(0, 0, 16, 16, 9, 10);
    for (let i = 0; i < 5; i++) {
      c.set((i * 7 + 2) % 16, (i * 5 + 3) % 16, 8);
    }
    c.set(3, 3, 7); c.set(11, 8, 7);
    return { pixels: c.px, palette: P };
  })();

  tiles.forest_tree_trunk = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 0);
    c.rect(5, 0, 6, 16, 9);
    c.rect(6, 0, 4, 16, 10);
    c.rect(7, 0, 2, 16, 11);
    c.set(5, 3, 8); c.set(5, 7, 8); c.set(5, 12, 8);
    c.set(10, 5, 8); c.set(10, 9, 8); c.set(10, 14, 8);
    return { pixels: c.px, palette: P };
  })();

  tiles.forest_tree_top = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 0);
    c.ellipse(8, 8, 7, 7, 3);
    c.ellipse(7, 7, 5, 5, 4);
    c.ellipse(6, 6, 3, 3, 5);
    c.set(4, 4, 6); c.set(5, 5, 6);
    c.set(10, 10, 1); c.set(11, 11, 1);
    return { pixels: c.px, palette: P };
  })();

  tiles.forest_water = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 11);
    c.dither(0, 0, 16, 16, 11, 12);
    c.line(2, 4, 8, 4, 13);
    c.line(6, 10, 13, 10, 13);
    c.set(3, 4, 14); c.set(7, 10, 14);
    return { pixels: c.px, palette: P };
  })();

  tiles.forest_stone = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 2);
    c.ellipse(8, 8, 5, 4, 14);
    c.ellipse(7, 7, 4, 3, 15);
    c.set(5, 5, 15); c.set(6, 6, 15);
    c.set(10, 10, 14);
    return { pixels: c.px, palette: P };
  })();

  tiles.forest_bridge = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 11);
    c.rect(2, 0, 12, 16, 9);
    c.rect(3, 0, 10, 16, 10);
    c.rect(4, 0, 8, 16, 11);
    c.line(2, 0, 2, 15, 8);
    c.line(13, 0, 13, 15, 8);
    for (let y = 0; y < 16; y += 4) {
      c.line(4, y, 11, y, 8);
    }
    return { pixels: c.px, palette: P };
  })();

  tiles.forest_bush = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 2);
    c.ellipse(8, 10, 6, 4, 3);
    c.ellipse(7, 9, 4, 3, 4);
    c.ellipse(6, 8, 2, 2, 5);
    c.set(4, 7, 6); c.set(5, 8, 6);
    c.set(12, 9, 1);
    return { pixels: c.px, palette: P };
  })();

  return tiles;
}

function createDesertTiles(): Record<string, TileData> {
  const P = DESERT_TILE_PALETTE;
  const tiles: Record<string, TileData> = {};

  tiles.desert_sand1 = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 2);
    c.dither(0, 0, 16, 16, 2, 3);
    for (let i = 0; i < 6; i++) c.set((i * 7 + 3) % 16, (i * 5 + 2) % 16, 4);
    return { pixels: c.px, palette: P };
  })();

  tiles.desert_sand2 = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 3);
    c.dither(0, 0, 16, 16, 3, 2);
    c.line(0, 5, 16, 5, 1);
    c.line(0, 11, 16, 11, 1);
    return { pixels: c.px, palette: P };
  })();

  tiles.desert_sandstone = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 6);
    c.rect(1, 1, 14, 14, 9);
    c.rect(2, 2, 12, 12, 10);
    c.dither(2, 2, 12, 12, 10, 9);
    c.line(2, 5, 13, 5, 6);
    c.line(2, 10, 13, 10, 6);
    return { pixels: c.px, palette: P };
  })();

  tiles.desert_ruins_floor = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 6);
    c.rect(0, 0, 8, 8, 9);
    c.rect(8, 8, 8, 8, 9);
    c.line(8, 0, 8, 15, 7);
    c.line(0, 8, 15, 8, 7);
    c.set(3, 3, 10); c.set(11, 11, 10);
    return { pixels: c.px, palette: P };
  })();

  tiles.desert_cactus = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 2);
    c.rect(7, 3, 2, 10, 13);
    c.rect(6, 3, 4, 2, 14);
    c.rect(4, 5, 3, 2, 13);
    c.rect(10, 7, 3, 2, 13);
    c.set(7, 3, 14); c.set(8, 3, 14);
    c.set(4, 5, 14); c.set(12, 7, 14);
    return { pixels: c.px, palette: P };
  })();

  tiles.desert_dead_bush = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 2);
    c.set(7, 8, 15); c.set(8, 8, 15);
    c.line(7, 8, 5, 5, 15);
    c.line(8, 8, 10, 4, 15);
    c.line(7, 8, 4, 7, 15);
    c.line(8, 8, 12, 6, 15);
    c.set(5, 5, 16); c.set(10, 4, 16);
    return { pixels: c.px, palette: P };
  })();

  tiles.desert_oasis_water = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 2);
    c.ellipse(8, 8, 7, 5, 10);
    c.ellipse(7, 7, 5, 3, 11);
    c.set(5, 5, 12);
    c.line(3, 8, 7, 8, 12);
    return { pixels: c.px, palette: P };
  })();

  return tiles;
}

function createSnowTiles(): Record<string, TileData> {
  const P = SNOW_TILE_PALETTE;
  const tiles: Record<string, TileData> = {};

  tiles.snow_ground1 = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 3);
    c.dither(0, 0, 16, 16, 3, 4);
    for (let i = 0; i < 5; i++) c.set((i * 7 + 3) % 16, (i * 5 + 2) % 16, 5);
    return { pixels: c.px, palette: P };
  })();

  tiles.snow_ground2 = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 4);
    c.dither(0, 0, 16, 16, 4, 3);
    c.set(3, 3, 5); c.set(12, 8, 5); c.set(7, 13, 5);
    return { pixels: c.px, palette: P };
  })();

  tiles.snow_ice = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 9);
    c.dither(0, 0, 16, 16, 9, 10);
    c.line(2, 3, 8, 3, 11);
    c.line(8, 9, 14, 9, 11);
    c.set(4, 3, 5); c.set(10, 9, 5);
    return { pixels: c.px, palette: P };
  })();

  tiles.snow_frozen_water = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 8);
    c.dither(0, 0, 16, 16, 8, 9);
    c.ellipse(5, 5, 2, 1, 10);
    c.ellipse(11, 10, 3, 1, 10);
    return { pixels: c.px, palette: P };
  })();

  tiles.snow_pine_tree = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 3);
    c.rect(7, 12, 2, 4, 7);
    c.ellipse(8, 7, 5, 5, 12);
    c.ellipse(7, 6, 4, 4, 13);
    c.ellipse(6, 5, 2, 2, 14);
    c.set(4, 4, 15); c.set(5, 5, 4);
    return { pixels: c.px, palette: P };
  })();

  tiles.snow_rock = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 3);
    c.ellipse(8, 9, 5, 4, 6);
    c.ellipse(7, 8, 4, 3, 7);
    c.set(5, 6, 4); c.set(6, 7, 4);
    c.ellipse(8, 7, 3, 1, 5);
    return { pixels: c.px, palette: P };
  })();

  tiles.snow_ice_crystal = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 3);
    c.line(8, 2, 4, 8, 9);
    c.line(8, 2, 12, 8, 9);
    c.line(4, 8, 12, 8, 9);
    c.line(8, 2, 8, 12, 10);
    c.line(4, 8, 8, 12, 10);
    c.line(12, 8, 8, 12, 10);
    c.set(8, 2, 5); c.set(6, 5, 11); c.set(10, 5, 11);
    c.set(8, 7, 5);
    return { pixels: c.px, palette: P };
  })();

  return tiles;
}

function createRuinsTiles(): Record<string, TileData> {
  const P = RUINS_TILE_PALETTE;
  const tiles: Record<string, TileData> = {};

  tiles.ruins_broken_stone = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 2);
    c.rect(1, 1, 7, 7, 3);
    c.rect(2, 2, 5, 5, 4);
    c.rect(8, 8, 7, 7, 3);
    c.rect(9, 9, 5, 5, 4);
    c.set(3, 3, 5); c.set(10, 10, 5);
    c.set(0, 0, 1); c.set(7, 7, 1);
    return { pixels: c.px, palette: P };
  })();

  tiles.ruins_crystal_floor = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 2);
    c.rect(0, 0, 8, 8, 3);
    c.rect(8, 8, 8, 8, 3);
    c.dither(0, 0, 16, 16, 3, 8);
    c.set(2, 2, 9); c.set(10, 10, 9);
    c.set(5, 5, 10); c.set(13, 13, 10);
    return { pixels: c.px, palette: P };
  })();

  tiles.ruins_void_pool = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 2);
    c.ellipse(8, 8, 6, 5, 11);
    c.ellipse(7, 7, 4, 3, 12);
    c.set(6, 6, 10); c.set(8, 7, 9);
    c.dither(4, 6, 8, 4, 11, 12);
    return { pixels: c.px, palette: P };
  })();

  tiles.ruins_metal_debris = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 2);
    c.rect(3, 5, 10, 3, 13);
    c.rect(4, 6, 8, 1, 14);
    c.rect(5, 9, 6, 2, 13);
    c.set(4, 5, 14); c.set(6, 9, 14);
    c.set(12, 5, 15); c.set(3, 7, 15);
    return { pixels: c.px, palette: P };
  })();

  tiles.ruins_energy_conduit = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 2);
    c.rect(3, 3, 10, 10, 3);
    c.rect(4, 4, 8, 8, 4);
    c.line(4, 4, 11, 11, 9);
    c.line(11, 4, 4, 11, 9);
    c.set(7, 7, 10); c.set(8, 8, 10);
    c.set(7, 8, 9); c.set(8, 7, 9);
    return { pixels: c.px, palette: P };
  })();

  tiles.ruins_broken_pillar = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 2);
    c.rect(5, 4, 6, 12, 3);
    c.rect(6, 4, 4, 12, 4);
    c.rect(7, 4, 2, 12, 5);
    c.rect(4, 3, 8, 2, 3);
    c.set(5, 3, 4); c.set(6, 3, 5);
    c.set(5, 8, 1); c.set(10, 6, 1);
    c.set(6, 12, 1); c.set(9, 14, 1);
    return { pixels: c.px, palette: P };
  })();

  return tiles;
}

function createHolyCityTiles(): Record<string, TileData> {
  const P = HOLY_TILE_PALETTE;
  const tiles: Record<string, TileData> = {};

  tiles.holy_marble = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 2);
    c.rect(1, 1, 14, 14, 3);
    c.rect(2, 2, 12, 12, 4);
    c.dither(2, 2, 12, 12, 4, 3);
    c.set(3, 3, 5); c.set(12, 12, 5);
    return { pixels: c.px, palette: P };
  })();

  tiles.holy_gold_trim = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 2);
    c.rect(1, 1, 14, 14, 3);
    c.rectOutline(1, 1, 14, 14, 5);
    c.rectOutline(2, 2, 12, 12, 6);
    c.set(1, 1, 7); c.set(14, 1, 7);
    c.set(1, 14, 7); c.set(14, 14, 7);
    return { pixels: c.px, palette: P };
  })();

  tiles.holy_water = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 9);
    c.dither(0, 0, 16, 16, 9, 10);
    c.line(2, 4, 8, 4, 11);
    c.line(6, 10, 13, 10, 11);
    c.set(3, 4, 12); c.set(7, 10, 12);
    c.set(5, 3, 4); c.set(10, 9, 4);
    return { pixels: c.px, palette: P };
  })();

  tiles.holy_stained_glass = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 1);
    c.rect(1, 1, 14, 14, 9);
    c.line(1, 1, 14, 14, 5);
    c.line(14, 1, 1, 14, 5);
    c.rect(4, 4, 8, 8, 11);
    c.set(7, 7, 12); c.set(8, 8, 12);
    c.set(4, 4, 10); c.set(11, 4, 10);
    c.set(4, 11, 10); c.set(11, 11, 10);
    return { pixels: c.px, palette: P };
  })();

  tiles.holy_angel_base = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 2);
    c.rect(3, 10, 10, 6, 3);
    c.rect(4, 11, 8, 4, 4);
    c.rect(5, 12, 6, 2, 5);
    c.ellipse(8, 6, 3, 3, 3);
    c.set(7, 5, 4); c.set(8, 5, 5);
    c.set(6, 4, 15); c.set(10, 4, 15);
    return { pixels: c.px, palette: P };
  })();

  tiles.holy_floating_platform = (() => {
    const c = new PixelCanvas(16, 16);
    c.rect(0, 0, 16, 16, 0);
    c.rect(2, 4, 12, 4, 3);
    c.rect(3, 3, 10, 2, 4);
    c.rect(4, 2, 8, 1, 5);
    c.set(3, 3, 5); c.set(12, 3, 5);
    c.set(5, 8, 16); c.set(10, 8, 16);
    c.set(6, 9, 16); c.set(9, 9, 16);
    return { pixels: c.px, palette: P };
  })();

  return tiles;
}

// ============================================================
// ITEM SPRITES (16x16)
// ============================================================

function createItemSprites(): Record<string, SpriteData> {
  const P = ITEM_PALETTE;
  const items: Record<string, SpriteData> = {};

  const mkItem = (id: string, drawFn: (c: PixelCanvas) => void): SpriteData => {
    const c = new PixelCanvas(16, 16);
    drawFn(c);
    c.outline(1);
    return {
      id,
      palette: P,
      animations: {
        idle: makeAnim('idle', [c.toFrame()], 300, true),
      },
    };
  };

  items.health_potion = mkItem('health_potion', (c) => {
    c.ellipse(8, 9, 4, 5, 2);
    c.ellipse(7, 8, 3, 4, 3);
    c.ellipse(6, 7, 2, 2, 4);
    c.rect(7, 3, 2, 3, 11);
    c.rect(6, 2, 4, 2, 12);
    c.set(6, 2, 13); c.set(7, 2, 14);
    c.set(5, 7, 5); c.set(6, 8, 5);
    c.set(6, 6, 6);
  });

  items.mana_potion = mkItem('mana_potion', (c) => {
    c.ellipse(8, 9, 4, 5, 7);
    c.ellipse(7, 8, 3, 4, 8);
    c.ellipse(6, 7, 2, 2, 9);
    c.rect(7, 3, 2, 3, 11);
    c.rect(6, 2, 4, 2, 12);
    c.set(6, 2, 13); c.set(7, 2, 14);
    c.set(5, 7, 10); c.set(6, 8, 10);
    c.set(6, 6, 11);
  });

  items.iron_sword = mkItem('iron_sword', (c) => {
    c.rect(7, 1, 2, 8, 13);
    c.set(7, 1, 14); c.set(8, 1, 14);
    c.set(7, 2, 15); c.set(8, 2, 15);
    c.rect(5, 9, 6, 2, 19);
    c.set(5, 9, 20); c.set(10, 9, 20);
    c.rect(7, 11, 2, 3, 19);
    c.set(7, 11, 20);
  });

  items.steel_sword = mkItem('steel_sword', (c) => {
    c.rect(7, 1, 2, 8, 14);
    c.set(7, 1, 15); c.set(8, 1, 15);
    c.set(7, 2, 24); c.set(8, 2, 24);
    c.set(7, 3, 15); c.set(8, 3, 15);
    c.rect(5, 9, 6, 2, 16);
    c.set(5, 9, 17); c.set(10, 9, 17);
    c.rect(7, 11, 2, 3, 19);
    c.set(7, 11, 20);
    c.set(6, 9, 18);
  });

  items.star_blade = mkItem('star_blade', (c) => {
    c.rect(7, 1, 2, 8, 14);
    c.set(7, 1, 24); c.set(8, 1, 24);
    c.set(7, 2, 15); c.set(8, 2, 15);
    c.set(7, 4, 25); c.set(8, 4, 25);
    c.set(7, 6, 25); c.set(8, 6, 25);
    c.rect(5, 9, 6, 2, 16);
    c.set(5, 9, 17); c.set(10, 9, 17);
    c.set(6, 9, 18); c.set(9, 9, 18);
    c.rect(7, 11, 2, 3, 16);
    c.set(7, 11, 17);
    c.set(7, 12, 26);
  });

  items.leather_armor = mkItem('leather_armor', (c) => {
    c.ellipse(8, 8, 5, 6, 20);
    c.ellipse(7, 7, 4, 5, 21);
    c.ellipse(6, 6, 2, 3, 22);
    c.set(5, 5, 23);
    c.rect(6, 4, 4, 2, 19);
    c.set(6, 4, 20);
    c.line(8, 4, 8, 14, 19);
    c.set(7, 8, 19); c.set(9, 8, 19);
  });

  items.chain_mail = mkItem('chain_mail', (c) => {
    c.ellipse(8, 8, 5, 6, 13);
    c.ellipse(7, 7, 4, 5, 14);
    c.ellipse(6, 6, 2, 3, 15);
    c.dither(4, 5, 8, 7, 13, 14);
    c.rect(6, 4, 4, 2, 12);
    c.set(6, 4, 13);
    c.set(5, 7, 15); c.set(9, 7, 15);
  });

  items.holy_plate = mkItem('holy_plate', (c) => {
    c.ellipse(8, 8, 5, 6, 16);
    c.ellipse(7, 7, 4, 5, 17);
    c.ellipse(6, 6, 2, 3, 18);
    c.set(5, 5, 24);
    c.rect(6, 4, 4, 2, 16);
    c.set(6, 4, 17);
    c.set(7, 4, 18);
    c.set(7, 8, 16); c.set(8, 8, 16);
    c.set(6, 7, 18); c.set(9, 7, 18);
  });

  items.ring = mkItem('ring', (c) => {
    c.ellipse(8, 8, 4, 4, 16);
    c.ellipse(8, 8, 3, 3, 17);
    c.ellipse(8, 8, 2, 2, 0);
    c.set(6, 6, 18); c.set(7, 5, 18);
    c.set(5, 7, 17);
  });

  items.amulet = mkItem('amulet', (c) => {
    c.rect(7, 2, 2, 4, 19);
    c.set(7, 2, 20); c.set(8, 2, 20);
    c.ellipse(8, 9, 4, 4, 16);
    c.ellipse(7, 8, 3, 3, 17);
    c.set(6, 7, 18); c.set(7, 7, 24);
    c.ellipse(8, 9, 2, 2, 27);
  });

  items.star_fragment = mkItem('star_fragment', (c) => {
    c.set(8, 1, 25); c.set(8, 2, 26);
    c.set(5, 4, 26); c.set(6, 5, 25);
    c.set(7, 3, 25); c.set(8, 3, 24);
    c.set(9, 3, 25); c.set(10, 4, 26);
    c.set(8, 5, 24); c.set(7, 6, 25);
    c.set(9, 6, 25); c.set(6, 7, 26);
    c.set(10, 7, 26); c.set(8, 8, 25);
    c.set(8, 9, 26); c.set(8, 10, 25);
    c.set(7, 4, 24); c.set(9, 4, 24);
    c.set(8, 6, 24);
  });

  items.gold_coins = mkItem('gold_coins', (c) => {
    c.ellipse(5, 9, 4, 3, 16);
    c.ellipse(4, 8, 3, 2, 17);
    c.set(3, 7, 18);
    c.ellipse(9, 8, 4, 3, 16);
    c.ellipse(8, 7, 3, 2, 17);
    c.set(7, 6, 18);
    c.ellipse(7, 6, 3, 2, 17);
    c.set(6, 5, 18);
  });

  items.chest = mkItem('chest', (c) => {
    c.rect(3, 6, 10, 8, 19);
    c.rect(4, 7, 8, 6, 20);
    c.rect(5, 8, 6, 4, 21);
    c.rect(3, 5, 10, 3, 20);
    c.rect(4, 6, 8, 1, 21);
    c.set(4, 5, 22); c.set(5, 5, 23);
    c.set(7, 9, 16); c.set(8, 9, 17);
    c.set(7, 8, 18);
    c.line(3, 8, 12, 8, 19);
  });

  return items;
}

// ============================================================
// EFFECT SPRITES
// ============================================================

function createEffectSprites(): Record<string, SpriteData> {
  const P = EFFECT_PALETTE;
  const effects: Record<string, SpriteData> = {};

  const mkEffect = (id: string, frames: SpriteFrame[]): SpriteData => ({
    id,
    palette: P,
    animations: {
      idle: makeAnim('idle', frames, 60, false),
    },
  });

  effects.slash = mkEffect('slash', (() => {
    const frames: SpriteFrame[] = [];
    for (let i = 0; i < 4; i++) {
      const c = new PixelCanvas(16, 16);
      const r = 2 + i * 2;
      c.line(8 - r, 8 + r, 8 + r, 8 - r, 1 + i);
      c.line(8 - r + 1, 8 + r - 1, 8 + r - 1, 8 - r + 1, 2 + i);
      if (i >= 2) c.line(8 - r + 2, 8 + r - 2, 8 + r - 2, 8 - r + 2, 3 + i);
      c.set(8 - r, 8 + r, 19);
      c.set(8 + r, 8 - r, 19);
      frames.push(c.toFrame());
    }
    return frames;
  })());

  effects.magic_burst = mkEffect('magic_burst', (() => {
    const frames: SpriteFrame[] = [];
    for (let i = 0; i < 4; i++) {
      const c = new PixelCanvas(16, 16);
      c.circle(8, 8, 1 + i * 2, 8 + i);
      c.circle(8, 8, i * 2, 9 + i);
      if (i >= 2) c.circle(8, 8, i, 19);
      c.set(8, 8, 19);
      frames.push(c.toFrame());
    }
    return frames;
  })());

  effects.heal = mkEffect('heal', (() => {
    const frames: SpriteFrame[] = [];
    for (let i = 0; i < 4; i++) {
      const c = new PixelCanvas(16, 16);
      c.set(7, 4 + i, 11); c.set(8, 4 + i, 11);
      c.set(7, 5 + i, 12); c.set(8, 5 + i, 12);
      c.set(5, 6 + i, 11); c.set(6, 6 + i, 12);
      c.set(9, 6 + i, 12); c.set(10, 6 + i, 11);
      c.set(7, 7 + i, 19); c.set(8, 7 + i, 19);
      c.set(5, 8 + i, 11); c.set(10, 8 + i, 11);
      c.set(7, 9 + i, 11); c.set(8, 9 + i, 11);
      c.set(7, 10 + i, 12); c.set(8, 10 + i, 12);
      if (i >= 2) {
        c.set(6, 5 + i, 19); c.set(9, 5 + i, 19);
        c.set(4, 7 + i, 12); c.set(11, 7 + i, 12);
      }
      frames.push(c.toFrame());
    }
    return frames;
  })());

  effects.level_up = mkEffect('level_up', (() => {
    const frames: SpriteFrame[] = [];
    for (let i = 0; i < 4; i++) {
      const c = new PixelCanvas(16, 16);
      c.circle(8, 8, 2 + i * 2, 3 + i);
      c.circle(8, 8, 1 + i * 2, 4 + i);
      c.circle(8, 8, i * 2, 19);
      c.set(8, 8 - i, 19);
      c.set(8 - i, 8, 19);
      c.set(8 + i, 8, 19);
      c.set(8, 8 + i, 19);
      frames.push(c.toFrame());
    }
    return frames;
  })());

  effects.fire_particle = mkEffect('fire_particle', (() => {
    const frames: SpriteFrame[] = [];
    for (let i = 0; i < 2; i++) {
      const c = new PixelCanvas(16, 16);
      c.ellipse(8, 10 - i, 3, 4, 5);
      c.ellipse(8, 8 - i, 2, 3, 6);
      c.set(7, 6 - i, 7); c.set(8, 5 - i, 7);
      c.set(8, 7 - i, 19);
      frames.push(c.toFrame());
    }
    return frames;
  })());

  const iceFrames: SpriteFrame[] = [];
  for (let i = 0; i < 2; i++) {
    const c = new PixelCanvas(16, 16);
    c.set(8, 6 - i, 8 + i);
    c.set(7, 7 - i, 9 + i); c.set(9, 7 - i, 9 + i);
    c.set(6, 8 - i, 10); c.set(8, 8 - i, 19); c.set(10, 8 - i, 10);
    c.set(7, 9 - i, 9 + i); c.set(9, 9 - i, 9 + i);
    c.set(8, 10 - i, 8 + i);
    iceFrames.push(c.toFrame());
  }
  effects.ice_particle = mkEffect('ice_particle', iceFrames);

  const voidFrames: SpriteFrame[] = [];
  for (let i = 0; i < 2; i++) {
    const c = new PixelCanvas(16, 16);
    c.circle(8, 8, 3 - i, 14 + i);
    c.circle(8, 8, 2 - i, 15);
    c.set(8, 8, 19);
    c.set(6, 6, 14); c.set(10, 10, 14);
    c.set(10, 6, 14); c.set(6, 10, 14);
    voidFrames.push(c.toFrame());
  }
  effects.void_particle = mkEffect('void_particle', voidFrames);

  const holyFrames: SpriteFrame[] = [];
  for (let i = 0; i < 2; i++) {
    const c = new PixelCanvas(16, 16);
    c.set(8, 4 - i, 19);
    c.set(7, 5 - i, 17); c.set(9, 5 - i, 17);
    c.set(6, 6 - i, 16); c.set(10, 6 - i, 16);
    c.set(5, 7 - i, 17); c.set(8, 7 - i, 19); c.set(11, 7 - i, 17);
    c.set(6, 8 - i, 16); c.set(10, 8 - i, 16);
    c.set(7, 9 - i, 17); c.set(9, 9 - i, 17);
    c.set(8, 10 - i, 19);
    holyFrames.push(c.toFrame());
  }
  effects.holy_particle = mkEffect('holy_particle', holyFrames);

  return effects;
}

// ============================================================
// REGISTRIES
// ============================================================

function buildSpriteRegistry(): Record<string, SpriteData> {
  const registry: Record<string, SpriteData> = {};

  const player = createPlayerSprite();
  registry[player.id] = player;

  const enemies = [
    createSlimeSprite(),
    createWolfSprite(),
    createTreeSpiritSprite(),
    createScorpionSprite(),
    createMummySprite(),
    createIceElementalSprite(),
    createVoidCreatureSprite(),
    createHolyKnightSprite(),
  ];
  for (const e of enemies) registry[e.id] = e;

  const bosses = [
    createAncientTreeSpiritSprite(),
    createScorpionKingSprite(),
    createIceDragonSprite(),
    createVoidDevourerSprite(),
    createFallenSaintSprite(),
  ];
  for (const b of bosses) registry[b.id] = b;

  const npcs = [
    createEileenSprite(),
    createGregorSprite(),
    createKashimSprite(),
    createVeraSprite(),
    createNoahSprite(),
    createGuardCaptainSprite(),
  ];
  for (const n of npcs) registry[n.id] = n;

  const items = createItemSprites();
  for (const [id, item] of Object.entries(items)) registry[id] = item;

  const effects = createEffectSprites();
  for (const [id, effect] of Object.entries(effects)) registry[id] = effect;

  return registry;
}

function buildTileRegistry(): Record<string, TileData> {
  const registry: Record<string, TileData> = {};

  const forest = createForestTiles();
  const desert = createDesertTiles();
  const snow = createSnowTiles();
  const ruins = createRuinsTiles();
  const holy = createHolyCityTiles();

  Object.assign(registry, forest, desert, snow, ruins, holy);

  return registry;
}

export const SpriteRegistry: Record<string, SpriteData> = buildSpriteRegistry();
export const TileRegistry: Record<string, TileData> = buildTileRegistry();

export function getSprite(id: string): SpriteData | undefined {
  return SpriteRegistry[id];
}

export function getTile(id: string): TileData | undefined {
  return TileRegistry[id];
}