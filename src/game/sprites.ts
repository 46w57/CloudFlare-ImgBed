export interface SpriteFrame {
  data: number[][];
  width: number;
  height: number;
}

const TILE_SIZE = 32;
const O = 1;

class PixelCanvas {
  data: number[][];
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = [];
    for (let y = 0; y < height; y++) {
      this.data[y] = [];
      for (let x = 0; x < width; x++) {
        this.data[y][x] = 0;
      }
    }
  }

  set(x: number, y: number, colorIndex: number) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix >= 0 && ix < this.width && iy >= 0 && iy < this.height) {
      this.data[iy][ix] = colorIndex;
    }
  }

  get(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix >= 0 && ix < this.width && iy >= 0 && iy < this.height) {
      return this.data[iy][ix];
    }
    return 0;
  }

  rect(x: number, y: number, w: number, h: number, colorIndex: number) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.set(x + dx, y + dy, colorIndex);
      }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, colorIndex: number) {
    for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
      for (let r = 0; r <= 1; r += 0.1) {
        const px = cx + Math.cos(angle) * rx * r;
        const py = cy + Math.sin(angle) * ry * r;
        this.set(px, py, colorIndex);
      }
    }
    this.floodFill(Math.floor(cx), Math.floor(cy), colorIndex);
  }

  circle(cx: number, cy: number, r: number, colorIndex: number) {
    this.ellipse(cx, cy, r, r, colorIndex);
  }

  line(x0: number, y0: number, x1: number, y1: number, colorIndex: number) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let cx = x0;
    let cy = y0;
    while (true) {
      this.set(cx, cy, colorIndex);
      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; cx += sx; }
      if (e2 < dx) { err += dx; cy += sy; }
    }
  }

  outline(colorIndex: number) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.data[y][x] !== 0) continue;
        const hasNeighbor =
          (x > 0 && this.data[y][x - 1] !== 0) ||
          (x < this.width - 1 && this.data[y][x + 1] !== 0) ||
          (y > 0 && this.data[y - 1][x] !== 0) ||
          (y < this.height - 1 && this.data[y + 1][x] !== 0);
        if (hasNeighbor) {
          this.data[y][x] = colorIndex;
        }
      }
    }
  }

  dither(x: number, y: number, w: number, h: number, c1: number, c2: number) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if ((dx + dy) % 2 === 0) {
          this.set(x + dx, y + dy, c1);
        } else {
          this.set(x + dx, y + dy, c2);
        }
      }
    }
  }

  addNoise(probability: number, colorIndices: number[]) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.data[y][x] !== 0 && Math.random() < probability) {
          this.data[y][x] = colorIndices[Math.floor(Math.random() * colorIndices.length)];
        }
      }
    }
  }

  shadeRegion(x: number, y: number, w: number, h: number, shift: number) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const px = Math.floor(x + dx);
        const py = Math.floor(y + dy);
        if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
          const val = this.data[py][px];
          if (val !== 0) {
            this.data[py][px] = Math.max(1, val + shift);
          }
        }
      }
    }
  }

  floodFill(startX: number, startY: number, colorIndex: number) {
    const targetColor = this.data[startY][startX];
    if (targetColor === colorIndex) return;
    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
      if (this.data[y][x] !== targetColor) continue;
      this.data[y][x] = colorIndex;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }

  frame(): SpriteFrame {
    return {
      data: this.data.map(row => [...row]),
      width: this.width,
      height: this.height,
    };
  }
}

// ==================== PALETTES ====================
// Design principle: MUTED, EARTHY, LOW-SATURATION
// Reference: Stardew Valley, Eastward - warm cozy tones
// NO fluorescent/neon colors. Everything is desaturated toward warm grays.

// Grass Palette (SP) - Olive/forest greens, NOT neon green
// 0=transparent, 1-5=greens(dark to light), 6=accent yellow-brown, 7=bare spot
export const SP = [
  '#000000', // 0: transparent
  '#2e3c20', // 1: darkest (shadow/deep)
  '#3a4a28', // 2: dark (base-dark)
  '#465834', // 3: mid-dark (main shadow)
  '#526440', // 4: mid (base green)
  '#5e704c', // 5: light (highlight)
  '#8a7a48', // 6: accent (dead grass / flower hint)
  '#424f30', // 7: bare patch (trampled area)
];

// Dirt/Brown Palette (TP) - Warm gray-browns
export const TP = [
  '#000000', // 0
  '#3e3220', // 1: darkest shadow
  '#4a3e28', // 2: dark brown
  '#564a30', // 3: mid-dark (base shadow)
  '#625638', // 4: mid (base dirt)
  '#6e6240', // 5: mid-light
  '#7a6e48', // 6: light
  '#867a50', // 7: highlight
];

// Water Palette (WP) - Muted steel blue
export const WP = [
  '#000000','#1e3040','#264050','#2e5060','#366070',
  '#3e7080','#468090','#4e90a0','#56a0b0','#5eb0c0',
  '#66c0d0','#7ad0e0','#8ee0f0','#a2f0ff','#baffff','#ccefff'
];

// Sand Palette (SCP) - Warm desert tan
export const SCP = [
  '#000000','#6a5a40','#766650','#827260','#8e7e70',
  '#9a8a80','#a69690','#b2a2a0','#beaeb0','#cabec0',
  '#d6cec8','#e2ded8','#eeeae4','#faf6f0','#fff8f0','#ffffff'
];

// Snow Palette (MP) - Cool gray-white with slight blue tint
export const MP = [
  '#000000','#a8b0b8','#b8c0c8','#c8d0d8','#d8e0e8',
  '#e0e8f0','#e8f0f8','#f0f4f8','#f4f8fc','#f8fcfe',
  '#fcffff','#ffffff','#d0dce8','#c0cce0','#b0c0d8','#ffffff'
];

// Ice Palette (IP) - Pale ice blue-gray
export const IP = [
  '#000000','#8098a8','#88a2b2','#90acb8','#98b6c2',
  '#a0c0cc','#a8cad6','#b0d4e0','#b8deea','#c0e8f4',
  '#c8f2fe','#d0faff','#daffff','#e4ffff','#ecffff','#ffffff'
];

// Void Palette (VP) - Deep purple-gray
export const VP = [
  '#000000','#18141e','#201c28','#282430','#302c38',
  '#383440','#403c48','#484450','#504c58','#585460','#ffffff'
];

// Holy Palette (HKP) - Warm cream/gold
export const HKP = [
  '#000000','#b8a878','#c4b488','#d0c098','#dccca8',
  '#e8d8b8','#f0e4c0','#f4ecc8','#f8f4d0','#fcf8d8','#fffce0'
];

// Player Palette (PP) - Muted tones
export const PP = [
  '#000000','#2a2230','#3a3040','#4a4050','#5a5060',
  '#6a6070','#7a7080','#8a8090','#9a90a0','#aaaab0','#ffffff'
];

// Tree Palette (TREE_P) - Forest green canopy + warm brown trunk
export const TREE_P = [
  '#000000',       // 0:  transparent
  '#243018',       // 1:  canopy darkest shadow
  '#2e3c20',       // 2:  canopy dark
  '#384828',       // 3:  canopy mid-dark (base shadow)
  '#425430',       // 4:  canopy mid (base)
  '#4c6038',       // 5:  canopy mid-light
  '#566c40',       // 6:  canopy light
  '#607848',       // 7:  canopy highlight
  '#3a2a18',       // 8:  trunk darkest
  '#463420',       // 9:  trunk dark
  '#524228',       // 10: trunk mid-dark
  '#5e4e30',       // 11: trunk base
  '#6a5a38',       // 12: trunk mid-light
  '#766640',       // 13: trunk light
  '#827248',       // 14: trunk highlight
];

// ==================== TILE REGISTRY ====================

export const TileRegistry: Record<string, () => SpriteFrame> = {

  // ==================== GRASS TILES ====================
  // KEY PRINCIPLE: Sparse single-pixel dots ONLY. No lines. No patterns.
  // Each tuft = 1-3 adjacent pixels max. Total tufts per tile: 8-15.
  // This is how Stardew Valley and professional games do it.

  grass1: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);

    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 4);

    // Dark shadow specks -- RANDOM positions per call (breaks grid pattern)
    for (let i = 0; i < 14; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 3);
    }

    // Light highlight specks -- random
    for (let i = 0; i < 8; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 5);
    }

    // Grass tufts -- random positions, avoid edges
    for (let i = 0; i < 11; i++) {
      const bx = 2 + Math.floor(Math.random() * 28);
      const by = 3 + Math.floor(Math.random() * 26);
      c.set(bx, by, 2);
      if (by > 1) c.set(bx, by - 1, 5);
    }

    // Rare accent (dead grass / clover)
    if (Math.random() < 0.5) c.set(Math.floor(Math.random()*28)+2, Math.floor(Math.random()*26)+3, 6);
    if (Math.random() < 0.25) c.set(Math.floor(Math.random()*28)+2, Math.floor(Math.random()*26)+3, 6);

    // Bottom ambient occlusion
    for (let x = 0; x < TILE_SIZE; x++) {
      if (Math.random() < 0.35) c.set(x, 31, 3);
      if (Math.random() < 0.15) c.set(x, 30, 3);
    }

    c.addNoise(0.02, [3, 4, 5]);

    c.outline(O);
    return c.frame();
  },

  grass2: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);

    // Slightly lighter base than grass1 (different variant)
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 4);

    // Different dark spot positions from grass1
    // Dark spots -- random positions (different density from grass1)
    for (let i = 0; i < 12; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 3);
    }

    // Light specks -- random
    for (let i = 0; i < 9; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 5);
    }

    // Tufts -- random, slightly more than grass1 (lusher variant)
    for (let i = 0; i < 13; i++) {
      const bx = 2 + Math.floor(Math.random() * 28);
      const by = 3 + Math.floor(Math.random() * 26);
      c.set(bx, by, 2);
      if (by > 1) c.set(bx, by - 1, 5);
    }

    // More accent spots (lusher feel) -- random
    for (let i = 0; i < 3; i++) {
      c.set(Math.floor(Math.random()*28)+2, Math.floor(Math.random()*26)+3, 6);
    }

    for (let x = 0; x < TILE_SIZE; x++) {
      if (Math.random() < 0.3) c.set(x, 31, 3);
    }

    c.addNoise(0.018, [3, 4, 5]);

    c.outline(O);
    return c.frame();
  },

  grass3: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);

    // Same base tone
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 4);

    // grass3 = "worn/trampled" variant -- has a visible bare patch area
    // Bare patch in center-right area (about 8x10 pixels of darker/base-only)
    for (let y = 12; y < 24; y++) {
      for (let x = 18; x < 29; x++) {
        if (Math.random() < 0.6) c.set(x, y, 7); // bare patch color
      }
    }
    // Edge of bare patch transitions
    for (let y = 11; y < 25; y++) {
      for (let x = 17; x < 30; x++) {
        if (c.get(x, y) === 4 && Math.random() < 0.3) c.set(x, y, 3);
      }
    }

    // Fewer tufts overall (trampled grass has less growth) -- avoid bare patch
    for (let i = 0; i < 7; i++) {
      const bx = 1 + Math.floor(Math.random() * 15);
      const by = 3 + Math.floor(Math.random() * 25);
      if (by < 12 || bx < 16) {
        c.set(bx, by, 2);
        if (by > 0) c.set(bx, by - 1, 5);
      }
    }

    // Very few light spots -- random, avoid bare patch
    for (let i = 0; i < 5; i++) {
      const lx = Math.floor(Math.random() * 17);
      const ly = Math.floor(Math.random() * TILE_SIZE);
      c.set(lx, ly, 5);
    }

    // Some dark spots around bare patch edge -- random
    for (let i = 0; i < 5; i++) {
      const edgeX = 16 + Math.floor(Math.random() * 3);
      const edgeY = 12 + Math.floor(Math.random() * 13);
      c.set(edgeX, edgeY, 3);
    }

    for (let x = 0; x < TILE_SIZE; x++) {
      if (Math.random() < 0.35) c.set(x, 31, 3);
    }

    c.addNoise(0.015, [3, 4, 5]);

    c.outline(O);
    return c.frame();
  },

  // ==================== MORE GRASS VARIANTS (grass4-10) ====================
  // Each uses a DIFFERENT visual style so adjacent tiles never look identical

  grass4: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Dither-based subtle variation (no random spots, just smooth dither)
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 4);
    c.dither(0, 0, TILE_SIZE, TILE_SIZE, 4, 5);
    // Occasional slightly darker dither patches
    for (let y = 0; y < TILE_SIZE; y += 5) {
      for (let x = 0; x < TILE_SIZE; x += 7) {
        if ((x + y) % 3 === 0) c.set(x, y, 3);
      }
    }
    // Very sparse tiny highlights
    for (let i = 0; i < 5; i++) {
      c.set(Math.floor(Math.random()*30)+1, Math.floor(Math.random()*28)+2, 6);
    }
    c.outline(O);
    return c.frame();
  },

  grass5: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Darker/shadier variant -- base is darker green
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 3);
    // Sparse mid-tone areas (light filtering through canopy)
    for (let i = 0; i < 18; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 4);
    }
    // Very few bright spots
    for (let i = 0; i < 4; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 6);
    }
    // Bottom darker
    for (let x = 0; x < TILE_SIZE; x++) {
      if (Math.random() < 0.4) c.set(x, 31, 2);
    }
    c.outline(O);
    return c.frame();
  },

  grass6: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Lighter/sunlit variant
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 5);
    // Shadow patches underneath (simulating taller grass casting shadows)
    for (let i = 0; i < 16; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 3);
    }
    // More light specks
    for (let i = 0; i < 12; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 7);
    }
    // Flower accents (more than other variants)
    for (let i = 0; i < 4; i++) {
      c.set(Math.floor(Math.random()*28)+2, Math.floor(Math.random()*26)+3, 6);
    }
    c.outline(O);
    return c.frame();
  },

  grass7: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Nearly flat/minimal detail variant -- mostly uniform with tiny variation
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 4);
    // Ultra-sparse noise only
    c.addNoise(0.04, [3, 5]);
    c.addNoise(0.02, [6]);
    // Just 3-4 visible "features"
    c.set(8, 8, 3); c.set(24, 14, 5); c.set(12, 24, 3); c.set(22, 26, 5);
    c.outline(O);
    return c.frame();
  },

  grass8: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Cluster-based: small groups of 2-4 pixels instead of isolated dots
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 4);
    // Create small clusters
    for (let i = 0; i < 8; i++) {
      const cx = 3 + Math.floor(Math.random() * 26);
      const cy = 3 + Math.floor(Math.random() * 26);
      c.set(cx, cy, 3);
      if (Math.random() < 0.7) c.set(cx + 1, cy, 3);
      if (Math.random() < 0.5) c.set(cx, cy + 1, 3);
      if (Math.random() < 0.3) c.set(cx + 1, cy + 1, 2);
    }
    // A few light clusters
    for (let i = 0; i < 4; i++) {
      const cx = 3 + Math.floor(Math.random() * 26);
      const cy = 3 + Math.floor(Math.random() * 26);
      c.set(cx, cy, 6);
      if (Math.random() < 0.6) c.set(cx + 1, cy, 5);
    }
    c.outline(O);
    return c.frame();
  },

  grass9: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Edge-focused: more detail at tile edges, cleaner center
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 4);
    // Edge noise (top/bottom/left/right borders have more variation)
    for (let x = 0; x < TILE_SIZE; x++) {
      if (Math.random() < 0.25) c.set(x, 0, 3);
      if (Math.random() < 0.25) c.set(x, 31, 3);
    }
    for (let y = 0; y < TILE_SIZE; y++) {
      if (Math.random() < 0.15) c.set(0, y, 3);
      if (Math.random() < 0.15) c.set(31, y, 3);
    }
    // Center area is mostly clean with just a few specks
    for (let i = 0; i < 6; i++) {
      c.set(5 + Math.floor(Math.random() * 22), 5 + Math.floor(Math.random() * 22), Math.random() < 0.5 ? 5 : 3);
    }
    c.outline(O);
    return c.frame();
  },

  grass10: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Diagonal streak variant (subtle grass blade direction hint)
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 4);
    // Short diagonal dashes (2-3 pixels long), NOT full lines
    for (let i = 0; i < 12; i++) {
      const sx = 2 + Math.floor(Math.random() * 26);
      const sy = 2 + Math.floor(Math.random() * 26);
      c.set(sx, sy, 3);
      if (sx < 30 && sy < 30 && Math.random() < 0.7) c.set(sx + 1, sy + 1, 3);
      if (sx < 29 && sy < 29 && Math.random() < 0.3) c.set(sx + 2, sy + 2, 2);
    }
    // Counter-direction light dashes
    for (let i = 0; i < 5; i++) {
      const sx = 2 + Math.floor(Math.random() * 26);
      const sy = 2 + Math.floor(Math.random() * 26);
      c.set(sx, sy, 6);
      if (sx > 1 && sy > 1 && Math.random() < 0.6) c.set(sx - 1, sy - 1, 5);
    }
    c.outline(O);
    return c.frame();
  },

  // ==================== TREE TILES ====================
  // CRITICAL: treeTrunkT MUST show a LARGE GREEN CANOPY (80% of tile)
  // Only bottom 20% is brown trunk. No ellipse/floodFill - brute force pixel fill.

  treeTrunkT: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);

    // === CANOPY SHAPE (y=0 to y=23) -- Big organic blob, 80% of tile ===
    // Define canopy mask: for each (x,y), is this part of the canopy?
    const cx = 16, cy = 11;
    const isInCanopy = (x: number, y: number): boolean => {
      const dx = x - cx, dy = y - cy;
      // Main body: wide ellipse
      if (dx*dx/(12*12) + dy*dy/(10*10) <= 1) return true;
      // Upper-left lobe
      if ((dx+5)*(dx+5)/(7*7) + (dy-4)*(dy-4)/(6*6) <= 1) return true;
      // Upper-right lobe
      if ((dx-5)*(dx-5)/(7*7) + (dy-4)*(dy-4)/(6*6) <= 1) return true;
      // Top lobe
      if (dx*dx/(8*8) + (dy+6)*(dy+6)/(5*5) <= 1) return true;
      // Left bump
      if ((dx+8)*(dx+8)/(5*5) + (dy+1)*(dy+1)/(4*4) <= 1) return true;
      // Right bump
      if ((dx-8)*(dx-8)/(5*5) + (dy+1)*(dy+1)/(4*4) <= 1) return true;
      // Bottom bumps
      if (dx*dx/(9*9) + (dy-5)*(dy-5)/(3*3) <= 1) return true;
      return false;
    };

    // Fill base green (index 4 = #425430 mid-green)
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if (isInCanopy(x, y)) c.set(x, y, 4);
      }
    }

    // SHADING LAYER: upper-left lighter, lower-right darker
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if (!isInCanopy(x, y)) continue;
        const dx = x - cx, dy = y - cy;
        // Light source from upper-left
        const shade = dx * (-0.15) + dy * 0.08;
        if (shade > 3) c.set(x, y, 7);       // brightest highlight
        else if (shade > 1.5) c.set(x, y, 6); // light
        else if (shade > 0) c.set(x, y, 5);   // mid-light
        else if (shade < -2.5) c.set(x, y, 2); // dark shadow
        else if (shade < -1.2) c.set(x, y, 3); // shadow
      }
    }

    // Add some leaf texture -- scattered slightly darker/lighter pixels on canopy
    for (let i = 0; i < 25; i++) {
      const rx = 5 + Math.floor(Math.random() * 22);
      const ry = 2 + Math.floor(Math.random() * 18);
      if (isInCanopy(rx, ry) && c.get(rx, ry) >= 4 && c.get(rx, ry) <= 6) {
        c.set(rx, ry, c.get(rx, ry) - 1);
      }
    }

    // === TRUNK (y=20 to y=31) -- Brown, narrow at top, wider at bottom ===
    for (let y = 21; y <= 31; y++) {
      const progress = (y - 21) / 10;
      const hw = 3 + progress * 2.5;
      for (let x = 16 - Math.floor(hw); x <= 16 + Math.ceil(hw); x++) {
        c.set(x, y, 11);
      }
    }
    // Trunk highlight left side
    for (let y = 22; y <= 30; y++) {
      const progress = (y - 21) / 10;
      const hw = 3 + progress * 2.5;
      c.set(16 - Math.floor(hw), y, 13);
      if (hw > 2.5) c.set(16 - Math.floor(hw) + 1, y, 14);
    }
    // Trunk shadow right side
    for (let y = 22; y <= 30; y++) {
      const progress = (y - 21) / 10;
      const hw = 3 + progress * 2.5;
      c.set(16 + Math.ceil(hw), y, 9);
      if (hw > 2.5) c.set(16 + Math.ceil(hw) - 1, y, 10);
    }
    // Bark detail lines
    c.line(14, 23, 14, 29, 9);
    c.line(17, 24, 17, 30, 9);
    c.line(19, 26, 19, 30, 10);
    // Root flare at bottom
    c.set(12, 30, 10); c.set(13, 30, 11); c.set(12, 31, 9);
    c.set(20, 30, 10); c.set(21, 30, 11); c.set(21, 31, 9);

    // Canopy overhang shadow on trunk top
    c.set(14, 21, 8); c.set(15, 21, 8); c.set(16, 21, 9);
    c.set(17, 21, 9); c.set(18, 21, 8); c.set(19, 21, 8);

    c.outline(O);
    return c.frame();
  },

  treeTrunkB: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);

    // === COMPLETE TREE WITH CANOPY (variant B - rounder/taller shape) ===
    // This MUST show green canopy. No more bare trunks.
    const cx = 16, cy = 10;
    const isInCanopy = (x: number, y: number): boolean => {
      const dx = x - cx, dy = y - cy;
      // Taller main body
      if (dx*dx/(11*11) + dy*dy/(12*12) <= 1) return true;
      // Rounder top
      if (dx*dx/(9*9) + (dy+7)*(dy+7)/(6*6) <= 1) return true;
      // Side lobes
      if ((dx+7)*(dx+7)/(6*6) + (dy-2)*(dy-2)/(5*5) <= 1) return true;
      if ((dx-7)*(dx-7)/(6*6) + (dy-2)*(dy-2)/(5*5) <= 1) return true;
      // Lower bulge
      if (dx*dx/(8*8) + (dy-6)*(dy-6)/(4*4) <= 1) return true;
      return false;
    };

    // Fill base green
    for (let y = 0; y < 22; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if (isInCanopy(x, y)) c.set(x, y, 4);
      }
    }

    // Shading: upper-left light, lower-right dark
    for (let y = 0; y < 22; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if (!isInCanopy(x, y)) continue;
        const dx = x - cx, dy = y - cy;
        const shade = dx * (-0.14) + dy * 0.09;
        if (shade > 2.8) c.set(x, y, 7);
        else if (shade > 1.3) c.set(x, y, 6);
        else if (shade > 0) c.set(x, y, 5);
        else if (shade < -2.3) c.set(x, y, 2);
        else if (shade < -1.0) c.set(x, y, 3);
      }
    }

    // Leaf texture noise
    for (let i = 0; i < 20; i++) {
      const rx = 6 + Math.floor(Math.random() * 20);
      const ry = 1 + Math.floor(Math.random() * 17);
      if (isInCanopy(rx, ry) && c.get(rx, ry) >= 4 && c.get(rx, ry) <= 6) {
        c.set(rx, ry, c.get(rx, ry) - 1);
      }
    }

    // === TRUNK (bottom portion, y=18 to 31) ===
    for (let y = 19; y <= 31; y++) {
      const progress = (y - 19) / 12;
      const hw = 2.5 + progress * 3;
      for (let x = 16 - Math.floor(hw); x <= 16 + Math.ceil(hw); x++) {
        c.set(x, y, 11);
      }
    }

    // Trunk shading
    for (let y = 20; y <= 30; y++) {
      const progress = (y - 19) / 12;
      const hw = 2.5 + progress * 3;
      c.set(16 - Math.floor(hw), y, 13);
      if (hw > 2) c.set(16 - Math.floor(hw) + 1, y, 14);
      c.set(16 + Math.ceil(hw), y, 9);
      if (hw > 2) c.set(16 + Math.ceil(hw) - 1, y, 10);
    }

    // Bark detail
    c.line(14, 21, 14, 28, 9);
    c.line(17, 23, 17, 29, 9);
    c.line(19, 25, 19, 30, 10);

    // Root flare
    c.set(11, 29, 10); c.set(12, 29, 11); c.set(11, 30, 9);
    c.set(21, 29, 10); c.set(22, 29, 11); c.set(22, 30, 9);

    // Canopy shadow on trunk
    c.set(13, 19, 8); c.set(14, 19, 8); c.set(15, 19, 9);
    c.set(16, 19, 9); c.set(17, 19, 9); c.set(18, 19, 8); c.set(19, 19, 8);

    c.outline(O);
    return c.frame();
  },

  // ==================== DIRT PATH ====================
  // Warm gray-brown, subtle texture, no prominent horizontal strokes

  dirtPath: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);

    // Base: mid warm brown
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 4);

    // Subtle vertical-ish streaks (compacted dirt), NOT heavy horizontal lines
    // Just slightly darker single-pixel columns scattered
    for (let x = 2; x < 30; x += 3 + Math.floor(Math.random() * 3)) {
      const len = 3 + Math.floor(Math.random() * 6);
      const startY = 2 + Math.floor(Math.random() * 20);
      for (let i = 0; i < len && startY + i < 30; i++) {
        c.set(x, startY + i, 3);
        if (Math.random() < 0.3 && x + 1 < 32) c.set(x + 1, startY + i, 3);
      }
    }

    // Scattered pebble-like dots (lighter brown)
    const pebbles: [number, number][] = [
      [4,5],[14,3],[25,7],[8,14],[22,12],[3,22],[17,20],[28,18],
      [6,27],[19,26],[11,29],[26,28],
    ];
    pebbles.forEach(([x,y]) => c.set(x, y, 6));
    // Some pebbles get a brighter edge
    c.set(4, 4, 7); c.set(14, 2, 7); c.set(25, 6, 7);
    c.set(8, 13, 7); c.set(22, 11, 7);

    // Slight darkening toward bottom (depth)
    for (let x = 0; x < TILE_SIZE; x++) {
      if (Math.random() < 0.25) c.set(x, 30, 3);
      if (Math.random() < 0.12) c.set(x, 31, 2);
    }

    // Slight darkening toward edges (wear pattern)
    for (let y = 0; y < TILE_SIZE; y++) {
      if (Math.random() < 0.08) c.set(0, y, 3);
      if (Math.random() < 0.08) c.set(31, y, 3);
    }

    c.addNoise(0.02, [3, 4, 5]);
    c.outline(O);
    return c.frame();
  },

  // ==================== ROCK ====================
  // Irregular faceted stone, muted browns

  rock: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);

    const cx = 16, cy = 18;

    // Main irregular shape via overlapping ellipses
    c.ellipse(cx, cy, 10, 7, 4);
    c.ellipse(cx - 3, cy - 2, 5, 4, 4);
    c.ellipse(cx + 3, cy - 1, 6, 4, 4);
    c.ellipse(cx - 1, cy + 3, 4, 3, 4);
    c.ellipse(cx + 2, cy + 2, 4, 3, 4);

    // Break perfect ellipse silhouette
    c.set(5, 17, 0); c.set(6, 16, 0);
    c.set(26, 17, 0); c.set(27, 16, 0);
    c.set(15, 11, 0);
    c.set(9, 23, 0); c.set(23, 24, 0);
    // Protrusions
    c.set(7, 14, 4); c.set(8, 13, 4);
    c.set(24, 14, 4); c.set(25, 13, 4);
    c.set(14, 10, 4); c.set(18, 10, 4);

    // Faceted shading (light source upper-left)
    const ul: [number, number][] = [[8,13],[9,12],[10,12],[11,13],[12,14],[9,14],[10,13],[11,14]];
    ul.forEach(([x,y]) => { if (c.get(x,y) === 4) c.set(x,y,7); });

    const um: [number, number][] = [[13,12],[14,12],[15,12],[16,12],[17,13],[14,13],[15,13],[16,13],[13,14],[14,14]];
    um.forEach(([x,y]) => { if (c.get(x,y) === 4) c.set(x,y,6); });

    const lr: [number, number][] = [[19,14],[20,14],[21,14],[22,14],[20,15],[21,15],[22,16],[19,16],[20,17]];
    lr.forEach(([x,y]) => { if (c.get(x,y) === 4) c.set(x,y,2); });

    const ll: [number, number][] = [[10,17],[11,17],[12,18],[13,18],[11,19],[12,19]];
    ll.forEach(([x,y]) => { if (c.get(x,y) === 4) c.set(x,y,3); });

    // Crack lines
    c.line(18, 13, 16, 16, 2);
    c.line(16, 16, 13, 19, 2);
    c.line(10, 15, 13, 17, 3);

    // Moss accent (subtle green touch)
    c.set(10, 18, 3); c.set(11, 19, 2);

    // Contact shadow
    for (let x = 9; x <= 23; x++) c.set(x, 25, 2);

    // Specular
    c.set(9, 12, 7); c.set(10, 12, 7);

    c.outline(O);
    return c.frame();
  },

  // ==================== WATER TILES ====================

  water1: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 4);
    c.dither(0, 0, TILE_SIZE, TILE_SIZE, 4, 5);
    c.set(6, 4, 7); c.set(18, 6, 7); c.set(26, 5, 7);
    c.set(10, 15, 8); c.set(22, 17, 8); c.set(4, 22, 7);
    c.set(15, 24, 7); c.set(28, 13, 8); c.set(8, 27, 7);
    c.addNoise(0.04, [4, 5, 6, 7]);
    c.outline(O);
    return c.frame();
  },

  water2: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 5);
    c.dither(0, 0, TILE_SIZE, TILE_SIZE, 5, 6);
    c.set(4, 6, 8); c.set(14, 3, 8); c.set(24, 7, 8);
    c.set(8, 14, 9); c.set(19, 16, 9); c.set(28, 20, 8);
    c.set(3, 25, 8); c.set(13, 27, 9); c.set(21, 29, 8);
    c.addNoise(0.03, [5, 6, 7, 8]);
    c.outline(O);
    return c.frame();
  },

  deepWater: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 2);
    c.dither(0, 0, TILE_SIZE, TILE_SIZE, 2, 3);
    c.set(7, 5, 5); c.set(20, 8, 5); c.set(5, 18, 5);
    c.set(16, 22, 5); c.set(25, 14, 5);
    c.addNoise(0.03, [2, 3, 4, 5]);
    c.outline(O);
    return c.frame();
  },

  // ==================== SAND TILES ====================

  sand1: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 4);
    // Sparse grain dots (slightly darker/lighter)
    for (let i = 0; i < 16; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 3);
    }
    for (let i = 0; i < 10; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 6);
    }
    // Tiny pebble specs
    c.set(5, 8, 6); c.set(20, 14, 6); c.set(12, 23, 6);
    c.addNoise(0.02, [3, 4, 5, 6]);
    c.outline(O);
    return c.frame();
  },

  sand2: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 5);
    for (let i = 0; i < 14; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 4);
    }
    for (let i = 0; i < 8; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 7);
    }
    c.set(8, 5, 7); c.set(24, 18, 7);
    c.addNoise(0.02, [4, 5, 6, 7]);
    c.outline(O);
    return c.frame();
  },

  // ==================== SNOW TILES ====================

  snow1: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 4);
    // Sparse snow crystal sparkles
    for (let i = 0; i < 20; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 6);
    }
    for (let i = 0; i < 10; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 7);
    }
    // Slight shadow at bottom
    for (let x = 0; x < TILE_SIZE; x++) {
      if (Math.random() < 0.2) c.set(x, 31, 3);
    }
    c.addNoise(0.02, [3, 4, 5, 6]);
    c.outline(O);
    return c.frame();
  },

  snow2: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 5);
    for (let i = 0; i < 16; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 6);
    }
    for (let i = 0; i < 8; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 7);
    }
    c.addNoise(0.018, [4, 5, 6, 7]);
    c.outline(O);
    return c.frame();
  },

  // ==================== ICE TILES ====================

  ice1: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 4);
    // Subtle crack lines (thin, not heavy)
    c.line(3, 6, 10, 9, 6);
    c.line(15, 4, 24, 7, 6);
    c.line(5, 16, 14, 19, 5);
    c.line(20, 14, 29, 18, 6);
    // Bright reflection specks
    c.set(8, 8, 7); c.set(20, 6, 7); c.set(12, 17, 7);
    c.set(25, 16, 7); c.set(6, 22, 6);
    c.addNoise(0.02, [4, 5, 6]);
    c.outline(O);
    return c.frame();
  },

  ice2: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 5);
    c.line(2, 5, 9, 8, 6);
    c.line(18, 3, 28, 6, 6);
    c.line(4, 15, 13, 18, 6);
    c.line(22, 13, 30, 17, 6);
    c.set(7, 7, 7); c.set(23, 5, 7); c.set(10, 16, 7);
    c.set(26, 15, 7); c.set(5, 23, 7);
    c.addNoise(0.018, [5, 6, 7]);
    c.outline(O);
    return c.frame();
  },

  // ==================== VOID TILES ====================

  void1: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 3);
    c.dither(0, 0, TILE_SIZE, TILE_SIZE, 3, 4);
    c.set(6, 5, 6); c.set(16, 3, 6); c.set(26, 6, 6);
    c.set(10, 15, 6); c.set(22, 13, 6); c.set(4, 22, 6);
    c.set(18, 24, 6); c.set(28, 18, 6);
    c.addNoise(0.04, [2, 3, 4, 5, 6]);
    c.outline(O);
    return c.frame();
  },

  void2: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 4);
    c.dither(0, 0, TILE_SIZE, TILE_SIZE, 4, 5);
    c.set(4, 4, 7); c.set(14, 6, 7); c.set(24, 3, 7);
    c.set(8, 14, 7); c.set(18, 16, 7); c.set(28, 14, 7);
    c.set(6, 24, 7); c.set(16, 26, 7); c.set(26, 24, 7);
    c.addNoise(0.03, [3, 4, 5, 6, 7]);
    c.outline(O);
    return c.frame();
  },

  // ==================== HOLY TILES ====================

  holyGround1: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 4);
    c.dither(0, 0, TILE_SIZE, TILE_SIZE, 4, 5);
    // Subtle rune-like dot pattern (very sparse)
    for (let y = 4; y < 28; y += 5) {
      for (let x = 4; x < 28; x += 6) {
        if ((x + y) % 4 === 0) c.set(x, y, 7);
      }
    }
    // Center glow
    c.set(16, 16, 7); c.set(15, 15, 6); c.set(17, 15, 6);
    c.set(15, 17, 6); c.set(17, 17, 6);
    c.outline(O);
    return c.frame();
  },

  holyGround2: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 5);
    c.dither(0, 0, TILE_SIZE, TILE_SIZE, 5, 6);
    for (let y = 3; y < 29; y += 6) {
      for (let x = 3; x < 29; x += 7) {
        if ((x * 2 + y) % 5 === 0) c.set(x, y, 7);
      }
    }
    c.set(8, 8, 7); c.set(24, 24, 7);
    c.outline(O);
    return c.frame();
  },

  // ==================== TRANSITION TILES ====================

  grassToWater: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if (x < TILE_SIZE / 2 + Math.sin(y * 0.4) * 3) c.set(x, y, 4);
        else c.set(x, y, 4); // water side uses same palette index for WP
      }
    }
    c.outline(O);
    return c.frame();
  },

  grassToSand: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if (y < TILE_SIZE / 2) c.set(x, y, 4);
        else c.set(x, y, 4);
      }
    }
    c.outline(O);
    return c.frame();
  },

  grassToDirt: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if (y < TILE_SIZE / 2) c.set(x, y, 4);
        else c.set(x, y, 4);
      }
    }
    c.outline(O);
    return c.frame();
  },

  grassToSnow: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if (y < TILE_SIZE / 2) c.set(x, y, 4);
        else c.set(x, y, 4);
      }
    }
    c.outline(O);
    return c.frame();
  },

  // ==================== BUSH ====================

  bushL: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Small round bush, organic blob shape
    c.circle(16, 19, 8, 4);
    c.ellipse(12, 17, 5, 4, 4);
    c.ellipse(20, 17, 5, 4, 4);
    c.ellipse(16, 15, 6, 4, 4);

    // Shading: upper-left lighter
    for (let y = 12; y < 22; y++) {
      for (let x = 8; x < 18; x++) {
        if (c.get(x, y) === 4) {
          if (x < 13 && y < 18) c.set(x, y, 5);
          else if (x > 18 || y > 20) c.set(x, y, 3);
        }
      }
    }
    // Brightest highlights
    c.set(11, 15, 6); c.set(12, 14, 6); c.set(13, 15, 5);
    // Darkest shadows
    c.set(21, 19, 2); c.set(22, 20, 2); c.set(20, 21, 3);
    // Berry accents
    c.set(14, 17, 6); c.set(18, 18, 6);

    c.addNoise(0.03, [4, 5, 6]);
    c.outline(O);
    return c.frame();
  },

  // ==================== CACTUS ====================

  cactus1: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Main body
    for (let y = 8; y <= 28; y++) {
      const hw = 2.5 + Math.floor(Math.sin(y * 0.12) * 0.8);
      for (let x = 16 - hw; x <= 16 + hw; x++) {
        c.set(x, y, 4);
      }
    }
    // Left arm
    c.set(13, 14, 4); c.set(12, 14, 4); c.set(11, 14, 4);
    c.set(11, 13, 4); c.set(11, 12, 4); c.set(11, 11, 4);
    c.set(12, 11, 4); c.set(13, 11, 4); c.set(12, 10, 4);
    // Right arm
    c.set(19, 17, 4); c.set(20, 17, 4); c.set(21, 17, 4);
    c.set(21, 16, 4); c.set(21, 15, 4); c.set(21, 14, 4);
    c.set(21, 13, 4); c.set(20, 13, 4); c.set(20, 12, 4);
    // Highlight left, shadow right
    for (let y = 9; y <= 27; y++) {
      const hw = 2.5 + Math.floor(Math.sin(y * 0.12) * 0.8);
      c.set(16 - hw, y, 6);
      c.set(16 + hw, y, 3);
    }
    // Ribs
    for (let y = 10; y <= 26; y += 4) {
      c.set(14, y, 3); c.set(16, y, 3); c.set(18, y, 3);
    }
    // Flower top
    c.set(15, 7, 6); c.set(16, 6, 7); c.set(17, 7, 6);
    // Shadow ground
    for (let x = 13; x <= 19; x++) c.set(x, 29, 3);
    c.outline(O);
    return c.frame();
  },

  // ==================== DEAD BUSH ====================

  deadBush: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Thin branching twigs
    c.line(16, 29, 16, 22, 3);
    c.line(16, 22, 13, 18, 3);
    c.line(13, 18, 13, 13, 3);
    c.line(16, 22, 19, 17, 3);
    c.line(19, 17, 19, 12, 3);
    c.line(13, 16, 10, 14, 3);
    c.line(13, 13, 11, 10, 3);
    c.line(19, 15, 22, 13, 3);
    c.line(19, 12, 21, 10, 3);
    // Thicken
    const thick: [number, number][] = [
      [16,28],[16,27],[16,26],[16,25],[16,24],[16,23],
      [15,21],[14,20],[14,19],[14,18],[14,17],[14,16],[14,15],[14,14],
      [17,21],[18,20],[18,19],[18,18],[18,17],[18,16],[18,15],[18,14],
      [12,17],[11,16],[10,15],[12,14],[12,13],[11,12],
      [20,16],[21,15],[22,14],[20,13],[21,12],
      [13,12],[12,11],[14,12],[11,11],[10,12],
      [20,11],[21,10],[22,11],
    ];
    thick.forEach(([x,y]) => { if (c.get(x,y) === 0 || c.get(x,y) === 3) c.set(x,y, 4); });
    // Tip dots
    c.set(10, 14, 5); c.set(11, 10, 5); c.set(22, 13, 5); c.set(21, 10, 5);
    c.outline(O);
    return c.frame();
  },

  // ==================== PINE TREE ====================

  pineL: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Layered triangle pine
    // Bottom tier (widest)
    for (let row = 0; row < 7; row++) {
      const w = 12 - row * 2;
      for (let x = 16 - w; x <= 16 + w * 2 - w; x++) {
        c.set(x, 19 + row, 4);
      }
    }
    // Middle tier
    for (let row = 0; row < 5; row++) {
      const w = 9 - row * 2;
      for (let x = 16 - w; x <= 16 + w * 2 - w; x++) {
        c.set(x, 13 + row, 4);
      }
    }
    // Top tier
    for (let row = 0; row < 4; row++) {
      const w = 6 - row * 2;
      for (let x = 16 - w; x <= 16 + w * 2 - w; x++) {
        c.set(x, 8 + row, 4);
      }
    }
    c.set(16, 7, 4); c.set(15, 8, 5); c.set(17, 8, 5);

    // Shading: left lighter, right darker
    for (let y = 8; y < 26; y++) {
      for (let x = 4; x < 16; x++) {
        if (c.get(x, y) === 4) c.set(x, y, 5);
      }
      for (let x = 17; x < 28; x++) {
        if (c.get(x, y) === 4) c.set(x, y, 3);
      }
    }
    // Snow on upper edges
    c.set(6, 19, 6); c.set(7, 19, 6); c.set(25, 19, 6); c.set(26, 19, 6);
    c.set(9, 13, 6); c.set(23, 13, 6);
    c.set(12, 8, 6); c.set(20, 8, 6); c.set(16, 7, 6);

    // Trunk
    for (let y = 25; y <= 31; y++) {
      for (let x = 14; x <= 18; x++) c.set(x, y, 11);
    }
    c.set(14, 26, 13); c.set(14, 27, 12);
    c.set(18, 26, 9); c.set(18, 27, 10);
    c.outline(O);
    return c.frame();
  },

  // ==================== ICICLES ====================

  icicleHang: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Ledge at top
    for (let x = 3; x < 29; x++) {
      c.set(x, 3, 5); c.set(x, 4, 4);
    }
    c.set(2, 4, 5); c.set(30, 4, 5);
    // Ledge highlights
    c.set(6, 3, 7); c.set(16, 3, 7); c.set(26, 3, 7);
    // Icicles of varying length
    c.line(5, 5, 5, 16, 6); c.line(12, 5, 12, 20, 6);
    c.line(20, 5, 20, 18, 6); c.line(26, 5, 26, 14, 6);
    c.line(8, 5, 8, 11, 5); c.line(16, 5, 16, 13, 5);
    c.line(23, 5, 23, 10, 5); c.line(3, 5, 3, 8, 5);
    c.line(29, 5, 29, 7, 5);
    // Tips brightest
    c.set(5, 16, 7); c.set(12, 20, 7); c.set(20, 18, 7); c.set(26, 14, 7);
    c.outline(O);
    return c.frame();
  },

  // ==================== RUINS TILES ====================

  brokenStone1: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(5, 7, 22, 19, 4);
    // Irregular edges
    [[3,9],[3,14],[3,19],[28,8],[28,14],[28,18],[6,6],[14,6],[22,6],[7,26],[16,26],[24,26]]
      .forEach(([x,y]: number[]) => c.set(x,y,4));
    // Shading
    for (let y = 7; y < 26; y++) {
      for (let x = 5; x < 27; x++) {
        if (c.get(x,y) === 4) {
          if (x < 15 && y < 17) c.set(x,y,6);
          else if (x > 21) c.set(x,y,2);
        }
      }
    }
    // Cracks
    c.line(14, 8, 10, 15, 2); c.line(10, 15, 16, 21, 2);
    // Void specks
    c.set(12, 11, 6); c.set(22, 14, 6); c.set(16, 18, 6);
    c.set(7, 7, 5); c.outline(O);
    return c.frame();
  },

  brokenStone2: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(4, 9, 24, 16, 4);
    c.rect(7, 5, 9, 5, 4); c.rect(19, 5, 8, 4, 4);
    c.rect(3, 25, 10, 4, 4); c.rect(21, 24, 9, 5, 4);
    for (let y = 5; y < 29; y++) {
      for (let x = 3; x < 29; x++) {
        if (c.get(x,y) === 4) {
          const d = Math.sqrt((x-16)*(x-16)+(y-17)*(y-17));
          if (d < 7) c.set(x,y,6); else if (d > 12) c.set(x,y,2);
        }
      }
    }
    c.line(9, 5, 12, 12, 2); c.line(20, 5, 24, 11, 2);
    c.set(11, 10, 6); c.set(21, 13, 6); c.outline(O);
    return c.frame();
  },

  rubblePile: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.ellipse(9, 26, 5, 3, 4);
    c.ellipse(21, 27, 6, 3, 4);
    c.ellipse(15, 29, 3, 2, 4);
    c.ellipse(3, 28, 3, 2, 3);
    c.ellipse(28, 27, 3, 2, 3);
    c.set(12, 29, 3); c.set(13, 29, 3); c.set(25, 29, 3); c.set(26, 29, 3);
    for (let y = 24; y < 31; y++) {
      for (let x = 2; x < 30; x++) {
        if (c.get(x,y) === 4) { if (x < 12) c.set(x,y,6); else if (x > 22) c.set(x,y,2); }
        if (c.get(x,y) === 3) { if (x < 8) c.set(x,y,5); else c.set(x,y,2); }
      }
    }
    c.set(6, 25, 6); c.set(19, 26, 6); c.outline(O);
    return c.frame();
  },

  ancientDoorway: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(9, 5, 14, 25, 4);
    // Arch top
    [[9,5],[10,4],[11,3],[12,2],[13,1],[14,1],[15,1],[16,1],[17,1],[18,1],[19,2],[20,3],[21,4],[22,5],[23,5]]
      .forEach(([x,y]: number[]) => c.set(x,y,4));
    // Door opening (dark inside)
    for (let y = 7; y < 28; y++) {
      for (let x = 13; x < 19; x++) {
        c.set(x, y, Math.min(2, Math.floor((y-7)/8)));
      }
    }
    // Frame shading
    for (let y = 3; y < 28; y++) {
      for (let x = 9; x < 13; x++) if (c.get(x,y) === 4) c.set(x,y,6);
      for (let x = 19; x < 23; x++) if (c.get(x,y) === 4) c.set(x,y,2);
    }
    // Arch highlight
    c.set(10, 4, 7); c.set(11, 3, 7); c.set(13, 1, 7); c.set(14, 0, 7);
    c.set(15, 0, 7); c.set(16, 0, 7); c.set(17, 0, 7); c.set(18, 0, 6);
    // Base
    c.rect(7, 28, 18, 3, 3);
    c.set(8, 28, 4); c.outline(O);
    return c.frame();
  },

  crystalGlow: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Crystal cluster
    c.line(14, 27, 12, 9, 6);
    c.line(15, 27, 13, 9, 6);
    c.line(16, 27, 14, 9, 5);
    c.line(19, 27, 21, 15, 6);
    c.line(20, 27, 22, 15, 5);
    c.line(11, 28, 9, 19, 4);
    c.line(23, 28, 26, 20, 4);
    // Widen base
    for (let x = 12; x <= 20; x++) c.set(x, 27, 5);
    for (let x = 12; x <= 20; x++) c.set(x, 28, 4);
    // Facet shading
    c.set(12, 10, 7); c.set(13, 10, 6); c.set(14, 9, 6);
    c.set(20, 15, 6); c.set(21, 15, 5);
    c.set(15, 9, 5); c.set(21, 14, 4);
    // Glow aura
    [[11,8],[18,8],[9,13],[24,13],[8,18],[25,18],[13,7],[20,7]]
      .forEach(([x,y]: number[]) => c.set(x,y,6));
    // Tips
    c.set(12, 9, 7); c.set(21, 14, 7);
    c.outline(O);
    return c.frame();
  },

  // ==================== HOLY CITY TILES ====================

  angelStatueBase: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(10, 17, 12, 13, 4);
    c.rect(8, 15, 16, 3, 5);
    c.rect(7, 28, 18, 3, 3);
    for (let y = 15; y < 30; y++) {
      for (let x = 7; x < 25; x++) {
        if (c.get(x,y) === 5) { if (x < 14) c.set(x,y,7); else c.set(x,y,3); }
        if (c.get(x,y) === 4) { if (x < 14) c.set(x,y,6); else c.set(x,y,2); }
        if (c.get(x,y) === 3) { if (x < 12) c.set(x,y,5); else c.set(x,y,1); }
      }
    }
    // Gold trim
    c.set(9, 15, 7); c.set(10, 15, 7); c.set(22, 15, 7); c.set(23, 15, 7);
    c.set(10, 17, 6); c.set(21, 17, 6);
    c.outline(O);
    return c.frame();
  },

  floatingPlatform: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.ellipse(16, 17, 11, 4, 5);
    c.rect(6, 18, 20, 2, 4);
    for (let y = 12; y < 19; y++) {
      for (let x = 5; x < 27; x++) {
        if (c.get(x,y) === 5) { if (x < 14 && y < 16) c.set(x,y,7); else if (x > 18) c.set(x,y,3); }
      }
    }
    // Gold edge
    c.set(6, 14, 6); c.set(7, 13, 7); c.set(25, 14, 6); c.set(24, 13, 7);
    // Under-glow
    [[11,23],[14,24],[17,24],[20,23],[13,26],[18,26],[9,22],[23,22]]
      .forEach(([x,y]: number[]) => c.set(x,y,6));
    c.set(10, 13, 7); c.outline(O);
    return c.frame();
  },

  goldenPillar: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    for (let y = 4; y <= 28; y++) {
      for (let x = 13; x <= 19; x++) c.set(x, y, 4);
    }
    // Capital
    c.rect(11, 1, 10, 4, 5);
    c.rect(12, 0, 8, 2, 6);
    // Base
    c.rect(11, 27, 10, 4, 3);
    // Cylindrical shading
    for (let y = 5; y < 27; y++) {
      c.set(13, y, 6); c.set(14, y, 7); c.set(15, y, 7);
      c.set(16, y, 6); c.set(17, y, 5); c.set(18, y, 4); c.set(19, y, 3);
    }
    // Capital shading
    [[12,1,7],[13,1,7],[14,0,7],[15,0,7],[16,0,7],[17,0,6],[18,0,6],[19,1,5]]
      .forEach(([x,y,v]: number[]) => c.set(x,y,v));
    // Fluting grooves
    c.line(13, 5, 13, 26, 3); c.line(16, 5, 16, 26, 3); c.line(19, 5, 19, 26, 3);
    // Specular
    c.set(14, 5, 7); c.set(14, 14, 7); c.set(14, 24, 6);
    c.outline(O);
    return c.frame();
  },

  thronePlatform: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(6, 11, 20, 10, 5);
    c.rect(4, 21, 24, 3, 4);
    c.rect(2, 24, 28, 3, 3);
    c.rect(0, 27, 32, 4, 2);
    c.rect(6, 9, 20, 3, 6);
    for (let y = 11; y < 21; y++) {
      for (let x = 6; x < 26; x++) {
        if (c.get(x,y) === 5) { if (x < 15) c.set(x,y,7); else if (x > 20) c.set(x,y,3); else c.set(x,y,6); }
      }
    }
    for (let x = 4; x < 28; x++) {
      if (x < 14) { c.set(x,21,6); c.set(x,24,5); c.set(x,27,4); }
      else if (x > 20) { c.set(x,21,3); c.set(x,24,2); c.set(x,27,1); }
    }
    // Gold trim
    for (let x = 6; x < 26; x++) c.set(x, 11, Math.random() < 0.25 ? 7 : 6);
    c.set(6, 11, 7); c.set(7, 11, 7);
    // Throne impression
    [[14,13],[15,13],[16,13],[17,13],[14,14],[15,14],[16,14],[17,14]].forEach(([x,y]: number[])=>c.set(x,y,5));
    c.set(7, 12, 7); c.outline(O);
    return c.frame();
  },

  glowingRune: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 4);
    c.dither(0, 0, TILE_SIZE, TILE_SIZE, 4, 5);
    // Rune circle
    c.circle(16, 16, 10, 6);
    c.circle(16, 16, 9, 0);
    c.circle(16, 16, 6, 6);
    c.circle(16, 16, 5, 0);
    // Symbol
    c.line(16, 11, 16, 21, 7);
    c.line(16, 11, 12, 14, 7); c.line(16, 11, 20, 14, 7);
    c.line(13, 16, 19, 16, 7);
    c.line(14, 18, 18, 18, 7);
    c.line(16, 21, 13, 24, 7); c.line(16, 21, 19, 24, 7);
    c.line(12, 14, 14, 16, 6); c.line(20, 14, 18, 16, 6);
    // Glow halo
    [[5,16],[6,14],[6,18],[26,16],[25,14],[25,18],[16,4],[14,5],[18,5],[16,28],[14,27],[18,27]]
      .forEach(([x,y]: number[]) => c.set(x,y,6));
    // Core bright
    c.set(16, 11, 7); c.set(16, 21, 7); c.set(12, 14, 7);
    c.set(20, 14, 7); c.set(16, 16, 7);
    // Magic dust
    [[4,10],[28,12],[6,24],[26,22],[10,4],[22,6],[3,18],[29,18],[16,2],[16,30]]
      .forEach(([x,y]: number[]) => c.set(x,y,6));
    c.addNoise(0.015, [4, 5, 6]);
    c.outline(O);
    return c.frame();
  },
};

// ==================== SPRITE REGISTRY ====================

export const SpriteRegistry: Record<string, () => SpriteFrame> = {

  playerDown: (): SpriteFrame => {
    const c = new PixelCanvas(16, 24);
    // Hair
    c.set(5, 0, 4); c.set(6, 0, 4); c.set(7, 0, 4); c.set(8, 0, 4); c.set(9, 0, 4);
    c.set(4, 1, 4); c.set(5, 1, 4); c.set(6, 1, 4); c.set(7, 1, 4); c.set(8, 1, 4); c.set(9, 1, 4); c.set(10, 1, 4);
    c.set(4, 2, 4); c.set(5, 2, 4); c.set(6, 2, 4); c.set(7, 2, 4); c.set(8, 2, 4); c.set(9, 2, 4); c.set(10, 2, 4);
    c.set(5, 3, 4); c.set(6, 3, 4); c.set(7, 3, 4); c.set(8, 3, 4); c.set(9, 3, 4);
    // Face
    c.set(5, 4, 8); c.set(6, 4, 8); c.set(7, 4, 8); c.set(8, 4, 8); c.set(9, 4, 8); c.set(10, 4, 8);
    c.set(5, 5, 8); c.set(6, 5, 8); c.set(7, 5, 8); c.set(8, 5, 8); c.set(9, 5, 8); c.set(10, 5, 8);
    // Eyes
    c.set(6, 5, 1); c.set(7, 5, 1);
    c.set(9, 5, 1); c.set(10, 5, 1);
    c.set(6, 5, 10); c.set(9, 5, 10);
    // Mouth
    c.set(7, 7, 1); c.set(8, 7, 1);
    // Neck
    c.set(6, 8, 8); c.set(7, 8, 8); c.set(8, 8, 8); c.set(9, 8, 8);
    // Body/Tunic
    c.set(4, 9, 6); c.set(5, 9, 6); c.set(6, 9, 6); c.set(7, 9, 6); c.set(8, 9, 6); c.set(9, 9, 6); c.set(10, 9, 6); c.set(11, 9, 6);
    c.set(3, 10, 6); c.set(4, 10, 6); c.set(5, 10, 6); c.set(6, 10, 6); c.set(7, 10, 6); c.set(8, 10, 6); c.set(9, 10, 6); c.set(10, 10, 6); c.set(11, 10, 6); c.set(12, 10, 6);
    c.set(3, 11, 6); c.set(4, 11, 6); c.set(5, 11, 6); c.set(6, 11, 6); c.set(7, 11, 6); c.set(8, 11, 6); c.set(9, 11, 6); c.set(10, 11, 6); c.set(11, 11, 6); c.set(12, 11, 6);
    c.set(4, 12, 6); c.set(5, 12, 6); c.set(6, 12, 6); c.set(7, 12, 6); c.set(8, 12, 6); c.set(9, 12, 6); c.set(10, 12, 6); c.set(11, 12, 6);
    c.set(4, 13, 6); c.set(5, 13, 6); c.set(6, 13, 6); c.set(7, 13, 6); c.set(8, 13, 6); c.set(9, 13, 6); c.set(10, 13, 6); c.set(11, 13, 6);
    // Arms
    c.set(2, 10, 6); c.set(2, 11, 6); c.set(2, 12, 6); c.set(2, 13, 6);
    c.set(13, 10, 6); c.set(13, 11, 6); c.set(13, 12, 6); c.set(13, 13, 6);
    // Hands
    c.set(2, 14, 8); c.set(13, 14, 8);
    // Pants
    c.set(5, 14, 5); c.set(6, 14, 5); c.set(7, 14, 5); c.set(8, 14, 5); c.set(9, 14, 5); c.set(10, 14, 5);
    c.set(5, 15, 5); c.set(6, 15, 5); c.set(7, 15, 5); c.set(8, 15, 5); c.set(9, 15, 5); c.set(10, 15, 5);
    c.set(5, 16, 5); c.set(6, 16, 5); c.set(7, 16, 5); c.set(8, 16, 5); c.set(9, 16, 5); c.set(10, 16, 5);
    c.set(5, 17, 5); c.set(6, 17, 5); c.set(7, 17, 5); c.set(8, 17, 5); c.set(9, 17, 5); c.set(10, 17, 5);
    c.set(5, 18, 5); c.set(6, 18, 5); c.set(7, 18, 5); c.set(8, 18, 5); c.set(9, 18, 5); c.set(10, 18, 5);
    // Feet
    c.set(5, 19, 4); c.set(6, 19, 4); c.set(7, 19, 4); c.set(8, 19, 4);
    c.set(9, 19, 4); c.set(10, 19, 4); c.set(11, 19, 4);
    c.set(5, 20, 4); c.set(6, 20, 4); c.set(7, 20, 4); c.set(8, 20, 4);
    c.set(9, 20, 4); c.set(10, 20, 4); c.set(11, 20, 4);
    c.outline(O);
    return c.frame();
  },

  playerUp: (): SpriteFrame => {
    const c = new PixelCanvas(16, 24);
    c.set(5, 0, 4); c.set(6, 0, 4); c.set(7, 0, 4); c.set(8, 0, 4); c.set(9, 0, 4);
    c.set(4, 1, 4); c.set(5, 1, 4); c.set(6, 1, 4); c.set(7, 1, 4); c.set(8, 1, 4); c.set(9, 1, 4); c.set(10, 1, 4);
    c.set(4, 2, 4); c.set(5, 2, 4); c.set(6, 2, 4); c.set(7, 2, 4); c.set(8, 2, 4); c.set(9, 2, 4); c.set(10, 2, 4);
    c.set(5, 3, 4); c.set(6, 3, 4); c.set(7, 3, 4); c.set(8, 3, 4); c.set(9, 3, 4);
    c.set(5, 4, 8); c.set(6, 4, 8); c.set(7, 4, 8); c.set(8, 4, 8); c.set(9, 4, 8); c.set(10, 4, 8);
    c.set(5, 5, 8); c.set(6, 5, 8); c.set(7, 5, 8); c.set(8, 5, 8); c.set(9, 5, 8); c.set(10, 5, 8);
    c.set(5, 6, 8); c.set(6, 6, 8); c.set(7, 6, 8); c.set(8, 6, 8); c.set(9, 6, 8); c.set(10, 6, 8);
    c.set(5, 7, 8); c.set(6, 7, 8); c.set(7, 7, 8); c.set(8, 7, 8); c.set(9, 7, 8); c.set(10, 7, 8);
    c.set(6, 8, 8); c.set(7, 8, 8); c.set(8, 8, 8); c.set(9, 8, 8);
    c.set(4, 9, 6); c.set(5, 9, 6); c.set(6, 9, 6); c.set(7, 9, 6); c.set(8, 9, 6); c.set(9, 9, 6); c.set(10, 9, 6); c.set(11, 9, 6);
    c.set(3, 10, 6); c.set(4, 10, 6); c.set(5, 10, 6); c.set(6, 10, 6); c.set(7, 10, 6); c.set(8, 10, 6); c.set(9, 10, 6); c.set(10, 10, 6); c.set(11, 10, 6); c.set(12, 10, 6);
    c.set(3, 11, 6); c.set(4, 11, 6); c.set(5, 11, 6); c.set(6, 11, 6); c.set(7, 11, 6); c.set(8, 11, 6); c.set(9, 11, 6); c.set(10, 11, 6); c.set(11, 11, 6); c.set(12, 11, 6);
    c.set(4, 12, 6); c.set(5, 12, 6); c.set(6, 12, 6); c.set(7, 12, 6); c.set(8, 12, 6); c.set(9, 12, 6); c.set(10, 12, 6); c.set(11, 12, 6);
    c.set(4, 13, 6); c.set(5, 13, 6); c.set(6, 13, 6); c.set(7, 13, 6); c.set(8, 13, 6); c.set(9, 13, 6); c.set(10, 13, 6); c.set(11, 13, 6);
    c.set(2, 10, 6); c.set(2, 11, 6); c.set(2, 12, 6); c.set(2, 13, 6);
    c.set(13, 10, 6); c.set(13, 11, 6); c.set(13, 12, 6); c.set(13, 13, 6);
    c.set(2, 14, 8); c.set(13, 14, 8);
    c.set(5, 14, 5); c.set(6, 14, 5); c.set(7, 14, 5); c.set(8, 14, 5); c.set(9, 14, 5); c.set(10, 14, 5);
    c.set(5, 15, 5); c.set(6, 15, 5); c.set(7, 15, 5); c.set(8, 15, 5); c.set(9, 15, 5); c.set(10, 15, 5);
    c.set(5, 16, 5); c.set(6, 16, 5); c.set(7, 16, 5); c.set(8, 16, 5); c.set(9, 16, 5); c.set(10, 16, 5);
    c.set(5, 17, 5); c.set(6, 17, 5); c.set(7, 17, 5); c.set(8, 17, 5); c.set(9, 17, 5); c.set(10, 17, 5);
    c.set(5, 18, 5); c.set(6, 18, 5); c.set(7, 18, 5); c.set(8, 18, 5); c.set(9, 18, 5); c.set(10, 18, 5);
    c.set(5, 19, 4); c.set(6, 19, 4); c.set(7, 19, 4); c.set(8, 19, 4);
    c.set(9, 19, 4); c.set(10, 19, 4); c.set(11, 19, 4);
    c.set(5, 20, 4); c.set(6, 20, 4); c.set(7, 20, 4); c.set(8, 20, 4);
    c.set(9, 20, 4); c.set(10, 20, 4); c.set(11, 20, 4);
    c.outline(O);
    return c.frame();
  },

  playerLeft: (): SpriteFrame => {
    const c = new PixelCanvas(16, 24);
    c.set(3, 0, 4); c.set(4, 0, 4); c.set(5, 0, 4); c.set(6, 0, 4); c.set(7, 0, 4); c.set(8, 0, 4);
    c.set(2, 1, 4); c.set(3, 1, 4); c.set(4, 1, 4); c.set(5, 1, 4); c.set(6, 1, 4); c.set(7, 1, 4); c.set(8, 1, 4); c.set(9, 1, 4);
    c.set(2, 2, 4); c.set(3, 2, 4); c.set(4, 2, 4); c.set(5, 2, 4); c.set(6, 2, 4); c.set(7, 2, 4); c.set(8, 2, 4); c.set(9, 2, 4);
    c.set(3, 3, 4); c.set(4, 3, 4); c.set(5, 3, 4); c.set(6, 3, 4); c.set(7, 3, 4); c.set(8, 3, 4);
    c.set(2, 4, 8); c.set(3, 4, 8); c.set(4, 4, 8); c.set(5, 4, 8); c.set(6, 4, 8); c.set(7, 4, 8);
    c.set(2, 5, 8); c.set(3, 5, 8); c.set(4, 5, 8); c.set(5, 5, 8); c.set(6, 5, 8); c.set(7, 5, 8);
    c.set(3, 5, 1); c.set(3, 5, 10);
    c.set(3, 7, 1);
    c.set(4, 8, 8); c.set(5, 8, 8); c.set(6, 8, 8); c.set(7, 8, 8);
    c.set(3, 9, 6); c.set(4, 9, 6); c.set(5, 9, 6); c.set(6, 9, 6); c.set(7, 9, 6);
    c.set(2, 9, 6); c.set(2, 10, 6); c.set(2, 11, 6); c.set(2, 12, 6); c.set(2, 13, 6);
    c.set(3, 10, 6); c.set(4, 10, 6); c.set(5, 10, 6); c.set(6, 10, 6); c.set(7, 10, 6);
    c.set(3, 11, 6); c.set(4, 11, 6); c.set(5, 11, 6); c.set(6, 11, 6); c.set(7, 11, 6);
    c.set(3, 12, 6); c.set(4, 12, 6); c.set(5, 12, 6); c.set(6, 12, 6); c.set(7, 12, 6);
    c.set(3, 13, 6); c.set(4, 13, 6); c.set(5, 13, 6); c.set(6, 13, 6); c.set(7, 13, 6);
    c.set(1, 10, 6); c.set(1, 11, 6); c.set(1, 12, 6); c.set(1, 13, 6);
    c.set(12, 10, 6); c.set(12, 11, 6); c.set(12, 12, 6); c.set(12, 13, 6);
    c.set(1, 14, 8); c.set(12, 14, 8);
    c.set(4, 14, 5); c.set(5, 14, 5); c.set(6, 14, 5); c.set(7, 14, 5); c.set(8, 14, 5); c.set(9, 14, 5);
    c.set(4, 15, 5); c.set(5, 15, 5); c.set(6, 15, 5); c.set(7, 15, 5); c.set(8, 15, 5); c.set(9, 15, 5);
    c.set(4, 16, 5); c.set(5, 16, 5); c.set(6, 16, 5); c.set(7, 16, 5); c.set(8, 16, 5); c.set(9, 16, 5);
    c.set(4, 17, 5); c.set(5, 17, 5); c.set(6, 17, 5); c.set(7, 17, 5); c.set(8, 17, 5); c.set(9, 17, 5);
    c.set(4, 18, 5); c.set(5, 18, 5); c.set(6, 18, 5); c.set(7, 18, 5); c.set(8, 18, 5); c.set(9, 18, 5);
    c.set(4, 19, 4); c.set(5, 19, 4); c.set(6, 19, 4); c.set(7, 19, 4); c.set(8, 19, 4);
    c.set(9, 19, 4); c.set(10, 19, 4);
    c.set(4, 20, 4); c.set(5, 20, 4); c.set(6, 20, 4); c.set(7, 20, 4); c.set(8, 20, 4);
    c.set(9, 20, 4); c.set(10, 20, 4); c.set(11, 20, 4);
    c.outline(O);
    return c.frame();
  },

  playerRight: (): SpriteFrame => {
    const c = new PixelCanvas(16, 24);
    c.set(7, 0, 4); c.set(8, 0, 4); c.set(9, 0, 4); c.set(10, 0, 4); c.set(11, 0, 4); c.set(12, 0, 4);
    c.set(6, 1, 4); c.set(7, 1, 4); c.set(8, 1, 4); c.set(9, 1, 4); c.set(10, 1, 4); c.set(11, 1, 4); c.set(12, 1, 4); c.set(13, 1, 4);
    c.set(6, 2, 4); c.set(7, 2, 4); c.set(8, 2, 4); c.set(9, 2, 4); c.set(10, 2, 4); c.set(11, 2, 4); c.set(12, 2, 4); c.set(13, 2, 4);
    c.set(7, 3, 4); c.set(8, 3, 4); c.set(9, 3, 4); c.set(10, 3, 4); c.set(11, 3, 4); c.set(12, 3, 4);
    c.set(9, 4, 8); c.set(10, 4, 8); c.set(11, 4, 8); c.set(12, 4, 8); c.set(13, 4, 8);
    c.set(9, 5, 8); c.set(10, 5, 8); c.set(11, 5, 8); c.set(12, 5, 8); c.set(13, 5, 8);
    c.set(12, 5, 1); c.set(12, 5, 10);
    c.set(12, 7, 1);
    c.set(8, 8, 8); c.set(9, 8, 8); c.set(10, 8, 8); c.set(11, 8, 8);
    c.set(9, 9, 6); c.set(10, 9, 6); c.set(11, 9, 6); c.set(12, 9, 6);
    c.set(8, 10, 6); c.set(9, 10, 6); c.set(10, 10, 6); c.set(11, 10, 6); c.set(12, 10, 6); c.set(13, 10, 6);
    c.set(9, 11, 6); c.set(10, 11, 6); c.set(11, 11, 6); c.set(12, 11, 6); c.set(13, 11, 6);
    c.set(9, 12, 6); c.set(10, 12, 6); c.set(11, 12, 6); c.set(12, 12, 6); c.set(13, 12, 6);
    c.set(9, 13, 6); c.set(10, 13, 6); c.set(11, 13, 6); c.set(12, 13, 6); c.set(13, 13, 6);
    c.set(3, 10, 6); c.set(4, 10, 6); c.set(5, 10, 6); c.set(6, 10, 6); c.set(7, 10, 6);
    c.set(3, 11, 6); c.set(4, 11, 6); c.set(5, 11, 6); c.set(6, 11, 6); c.set(7, 11, 6);
    c.set(3, 12, 6); c.set(4, 12, 6); c.set(5, 12, 6); c.set(6, 12, 6); c.set(7, 12, 6);
    c.set(3, 13, 6); c.set(4, 13, 6); c.set(5, 13, 6); c.set(6, 13, 6); c.set(7, 13, 6);
    c.set(3, 14, 8); c.set(13, 14, 8);
    c.set(5, 14, 5); c.set(6, 14, 5); c.set(7, 14, 5); c.set(8, 14, 5); c.set(9, 14, 5); c.set(10, 14, 5); c.set(11, 14, 5);
    c.set(5, 15, 5); c.set(6, 15, 5); c.set(7, 15, 5); c.set(8, 15, 5); c.set(9, 15, 5); c.set(10, 15, 5); c.set(11, 15, 5);
    c.set(5, 16, 5); c.set(6, 16, 5); c.set(7, 16, 5); c.set(8, 16, 5); c.set(9, 16, 5); c.set(10, 16, 5); c.set(11, 16, 5);
    c.set(5, 17, 5); c.set(6, 17, 5); c.set(7, 17, 5); c.set(8, 17, 5); c.set(9, 17, 5); c.set(10, 17, 5); c.set(11, 17, 5);
    c.set(5, 18, 5); c.set(6, 18, 5); c.set(7, 18, 5); c.set(8, 18, 5); c.set(9, 18, 5); c.set(10, 18, 5); c.set(11, 18, 5);
    c.set(6, 19, 4); c.set(7, 19, 4); c.set(8, 19, 4); c.set(9, 19, 4); c.set(10, 19, 4); c.set(11, 19, 4); c.set(12, 19, 4);
    c.set(6, 20, 4); c.set(7, 20, 4); c.set(8, 20, 4); c.set(9, 20, 4); c.set(10, 20, 4); c.set(11, 20, 4); c.set(12, 20, 4);
    c.outline(O);
    return c.frame();
  },
};

// ==================== TILE PALETTE MAPPING ====================

export const TilePalettes: Record<string, string[]> = {
  grass1: SP, grass2: SP, grass3: SP,
  grass4: SP, grass5: SP, grass6: SP,
  grass7: SP, grass8: SP, grass9: SP, grass10: SP,
  treeTrunkT: TREE_P, treeTrunkB: TREE_P,
  dirtPath: TP,
  rock: TP,
  water1: WP, water2: WP, deepWater: WP,
  sand1: SCP, sand2: SCP,
  snow1: MP, snow2: MP,
  ice1: IP, ice2: IP,
  void1: VP, void2: VP,
  holyGround1: HKP, holyGround2: HKP,
  grassToWater: SP, grassToSand: SP, grassToDirt: SP, grassToSnow: SP,
  bushL: SP,
  cactus1: SCP,
  deadBush: SCP,
  pineL: TREE_P,
  icicleHang: IP,
  brokenStone1: VP, brokenStone2: VP,
  rubblePile: VP,
  ancientDoorway: VP,
  crystalGlow: VP,
  angelStatueBase: HKP,
  floatingPlatform: HKP,
  goldenPillar: HKP,
  thronePlatform: HKP,
  glowingRune: HKP,
};

// ==================== HELPERS ====================

export function getTile(id: string): SpriteFrame {
  if (TileRegistry[id]) return TileRegistry[id]();
  console.warn(`Tile "${id}" not found, returning fallback`);
  return TileRegistry.grass1();
}

export function getSprite(id: string): SpriteFrame {
  if (SpriteRegistry[id]) return SpriteRegistry[id]();
  console.warn(`Sprite "${id}" not found, returning fallback`);
  return SpriteRegistry.playerDown();
}
