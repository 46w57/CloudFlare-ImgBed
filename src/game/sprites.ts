export interface SpriteFrame {
  data: number[][];
  width: number;
  height: number;
}

const TILE_SIZE = 32;
const O = 1; // outline color index constant

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

// Grass/Green Palette (SP) - 15 colors for rich grass rendering
export const SP = [
  '#000000', // 0: transparent
  '#1a3a1a', // 1: darkest shadow green
  '#244224', // 2: deep shadow green
  '#2d5a2d', // 3: shadow green
  '#357235', // 4: dark green
  '#3d8a3d', // 5: mid-dark green
  '#459e45', // 6: mid green (base)
  '#52b252', // 7: mid-light green
  '#5fc65f', // 8: light green
  '#70da70', // 9: highlight green
  '#85ee85', // 10: bright highlight green
  '#9fff7f', // 11: brightest green/yellow-green
  '#bfff8f', // 12: flower yellow-green
  '#ffee77', // 13: flower yellow
  '#ffffff', // 14: pure white (specular)
];

// Dirt/Brown Palette (TP)
export const TP = [
  '#000000', // 0: transparent
  '#2a1810', // 1: deepest brown shadow
  '#3d2418', // 2: dark brown shadow
  '#4a2c1a', // 3: dark brown
  '#5c3820', // 4: mid-dark brown
  '#6e4428', // 5: mid brown (base)
  '#805030', // 6: mid-light brown
  '#926038', // 7: light brown
  '#a47040', // 8: highlight brown
  '#b88550', // 9: bright highlight brown
  '#cc9960', // 10: warm light brown
  '#ddaa70', // 11: pale warm brown
  '#eebb80', // 12: very light brown
  '#ffeecc', // 13: near-white warm
  '#ffffff', // 14: white specular
];

// Water Palette (WP)
export const WP = [
  '#000000', '#0a2040','#102850','#163060','#1c4075',
  '#225088','#28609b','#3070ae','#3880c1','#4090d4',
  '#48a0e7','#50b0ff','#70c4ff','#90d8ff','#b0ecff','#ffffff'
];

// Sand Palette (SCP)
export const SCP = [
  '#000000','#3d3528','#4a4030','#5c4c38','#6e5840',
  '#806448','#927050','#a47c58','#b48860','#c49468',
  '#d4a070','#e4ac78','#f0b884','#f8c490','#fff8e0','#ffffff'
];

// Snow Palette (MP)
export const MP = [
  '#000000','#a0a8b0','#b0b8c0','#c0c8d0','#d0d8e0',
  '#e0e8f0','#eef0f4','#f4f6f8','#f8fafc','#fafcff',
  '#fcfeff','#ffffff','#e8f0ff','#d0e0f8','#c0d4f0','#ffffff'
];

// Ice Palette (IP)
export const IP = [
  '#000000','#183858','#204868','#285878','#306888',
  '#387898','#4088a8','#4898b8','#50a8c8','#58b8d8',
  '#60c8e8','#68d8f8','#78e4ff','#88f0ff','#98fcff','#ffffff'
];

// Void Palette (VP)
export const VP = [
  '#000000','#0a0510','#12081a','#1a0b24','#220e2e',
  '#2a1138','#321442','#3a174c','#421a56','#4a1d60',
  '#52206a','#5a2374','#663080','#774090','#8850a0','#ffffff'
];

// Holy Palette (HKP)
export const HKP = [
  '#000000','#fff8e0','#ffeec0','#ffe8a0','#ffe280',
  '#ffdc60','#ffd640','#ffd020','#ffca00','#e8b400',
  '#d09e00','#b88800','#a07200','#885c00','#705000','#ffffff'
];

// Player Palette (PP)
export const PP = [
  '#000000','#1a1520','#2a2030','#3a3040','#4a4050',
  '#5a5060','#6a6070','#7a7080','#8a8090','#9a90a0',
  '#aab0b0','#bac0c0','#cad0d0','#dae0e0','#eaf0f0','#ffffff'
];

// Extended Palettes (more shades for smoother gradients)
export const SPE = [
  '#000000','#142814','#1a321a','#203c20','#264626',
  '#2c502c','#325a32','#386438','#3e6e3e','#447844',
  '#4a824a','#508c50','#569656','#5ca05c','#62ac62',
  '#68b668','#6ec06e','#74ca74','#7ad47a','#80de80',
  '#86e886','#8cf28c','#92fc92','#9eff9e','#aaffaa','#b0ffb0','#ffffff'
];

export const WPE = [
  '#000000','#081830','#102038','#182840','#203048',
  '#283850','#304058','#384860','#405068','#485870',
  '#506078','#586880','#607088','#687890','#708098',
  '#7888a0','#8090a8','#8898b0','#90a0b8','#98a8c0',
  '#a0b0c8','#a8b8d0','#b0c0d8','#b8c8e0','#c0d0e8','#c8d8f0','#ffffff'
];

export const TPE = [
  '#000000','#221408','#2e1c0e','#3a2414','#462c1a',
  '#523420','#5e3c26','#6a442c','#764c32','#825438',
  '#8e5c3e','#9a6444','#a66c4a','#b27450','#be7c56',
  '#ca845c','#d68c62','#e29468','#ee9c6e','#faa474',
  '#ffac7a','#ffb480','#ffbc86','#ffc48c','#ffcc92','#ffd498','#ffffff'
];

export const SCPE = [
  '#000000','#302a1e','#3a3428','#443e32','#4e483c',
  '#585246','#625c50','#6c665a','#767064','#807a6e',
  '#8a8478','#948e82','#9e988c','#a8a296','#b2aca0',
  '#bcb6aa','#c6c0b4','#d0cabe','#dad4c8','#e4ded2',
  '#eee8dc','#f8f2e6','#fff6ee','#fffaf2','#fffef6','#fffff8','#ffffff'
];

export const MPE = [
  '#000000','#889098','#98a0a8','#a8b0b8','#b8c0c8',
  '#c8d0d8','#d8e0e8','#e8f0f8','#f0f4f8','#f4f8fc',
  '#f8fbfe','#fafdff','#fcfeff','#fefefe','#ffffff',
  '#f0f0f4','#e8e8ec','#e0e0e4','#d8d8dc','#d0d0d0','#c8c8c4','#c0c0bc','#b8b8b4','#b0b0b0','#a8a89c','#a0a098','#ffffff'
];

export const IPE = [
  '#000000','#102848','#183058','#203868','#284078',
  '#304888','#385098','#4058a8','#4860b8','#5068c8',
  '#5870d8','#6078e8','#6880f8','#7088ff','#7890ff',
  '#8098ff','#88a0ff','#90a8ff','#98b0ff','#a0b8ff',
  '#a8c0ff','#b0c8ff','#b8d0ff','#c0d8ff','#c8e0ff','#d0e8ff','#ffffff'
];

export const VPE = [
  '#000000','#08040c','#100818','#180c24','#201030',
  '#28143c','#301848','#381c54','#402060','#48246c',
  '#502878','#582c84','#603090','#68349c','#7038a8',
  '#783cb4','#8040c0','#8844cc','#9048d8','#984ce4',
  '#a050f0','#a854fc','#b058ff','#b85cff','#c060ff','#c864ff','#ffffff'
];

export const HKPE = [
  '#000000','#f8f0d0','#fceab8','#fee4a0','#ffde88',
  '#ffd870','#ffd258','#ffcc40','#ffc628','#ffc010',
  '#ffba00','#e8a600','#d09200','#b87e00','#a06a00',
  '#885600','#704200','#582e00','#401a00','#280600',
  '#100000','#000000','#000000','#000000','#000000','#000000','#ffffff'
];

// Tree Palette (TREE_P) - Combined greens for canopy + browns for trunk
// Indices 0: transparent, 1-14: greens (canopy), 15-28: browns (trunk)
export const TREE_P = [
  '#000000',       // 0:  transparent
  '#142814',       // 1:  darkest canopy shadow
  '#1a321a',       // 2:  deep canopy shadow
  '#203c20',       // 3:  canopy shadow
  '#264626',       // 4:  dark canopy green
  '#2c502c',       // 5:  mid-dark canopy
  '#325a32',       // 6:  canopy base green
  '#386438',       // 7:  mid-light canopy
  '#3e6e3e',       // 8:  light canopy
  '#447844',       // 9:  highlight canopy
  '#4a824a',       // 10: bright canopy
  '#508c50',       // 11: brightest canopy
  '#569656',       // 12: sunlit canopy edge
  '#62ac62',       // 13: specular canopy
  '#6eb86e',       // 14: pure light canopy
  '#2a1810',       // 15: deepest trunk shadow
  '#3d2418',       // 16: dark trunk shadow
  '#4a2c1a',       // 17: dark bark
  '#5c3820',       // 18: mid-dark bark
  '#6e4428',       // 19: base bark (trunk base)
  '#805030',       // 20: mid bark
  '#926038',       // 21: light bark / knot center
  '#a47040',       // 22: highlight bark
  '#b88550',       // 23: bright bark highlight (left side)
  '#cc9960',       // 24: warm light bark
  '#ddaa70',       // 25: pale warm bark
  '#eebb80',       // 26: very light bark
  '#ffeecc',       // 27: near-white bark
  '#ffffff',       // 28: white specular
];

// ==================== TILE REGISTRY ====================

export const TileRegistry: Record<string, () => SpriteFrame> = {

  // ==================== GRASS TILES (PROFESSIONAL REWRITE) ====================

  grass1: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);

    // Base fill with mid-green
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 6);

    // === GRASS TUFTS — vertical blocks of color, NOT scattered pixels ===
    // Each tuft is 2-4 vertical/near-vertical pixels forming blade shapes
    // Format: [startX, startY, endX, endY, topColor, bodyColor, baseColor]

    // Upper-left cluster — tufts leaning slightly right
    c.line(2, 3, 2, 6, 10); c.line(2, 6, 2, 8, 5);   // tuft 1: straight-ish
    c.line(3, 2, 3, 5, 11); c.line(3, 5, 3, 7, 6);   // tuft 2: tall bright
    c.line(4, 4, 5, 7, 9);  c.line(4, 7, 5, 9, 5);   // tuft 3: leaning right
    c.line(1, 7, 1, 10, 8); c.line(1, 10, 1, 12, 4); // tuft 4: short lower-left
    c.line(5, 6, 5, 8, 8);  c.line(5, 8, 5, 10, 5);  // tuft 5: small

    // Upper-center cluster — mixed angles
    c.line(8, 1, 8, 4, 10); c.line(8, 4, 8, 6, 6);   // tuft 6: tall straight
    c.line(9, 3, 9, 6, 9);  c.line(9, 6, 9, 8, 5);   // tuft 7
    c.line(7, 5, 7, 8, 8);  c.line(7, 8, 7, 10, 5);  // tuft 8: leaning left
    c.line(10, 2, 10, 5, 11); c.line(10, 5, 10, 7, 6);// tuft 9: bright tall
    c.line(11, 5, 12, 8, 9); c.line(11, 8, 12, 10, 5);// tuft 10: leaning right

    // Upper-right cluster
    c.line(14, 3, 14, 6, 10); c.line(14, 6, 14, 8, 5); // tuft 11
    c.line(15, 1, 15, 4, 11); c.line(15, 4, 15, 7, 6); // tuft 12: bright
    c.line(16, 4, 17, 7, 8);  c.line(16, 7, 17, 9, 5); // tuft 13: leaning right
    c.line(13, 6, 13, 9, 8);  c.line(13, 9, 13, 11, 4);// tuft 14
    c.line(17, 6, 17, 8, 9);  c.line(17, 8, 17, 10, 5);// tuft 15

    // Middle-left area
    c.line(2, 14, 3, 17, 8);  c.line(2, 17, 3, 19, 5); // tuft 16
    c.line(4, 13, 4, 16, 9);  c.line(4, 16, 4, 18, 5); // tuft 17
    c.line(5, 16, 5, 18, 7);  c.line(5, 18, 5, 20, 4); // tuft 18
    c.line(0, 16, 0, 18, 7);  c.line(0, 18, 0, 20, 4); // tuft 19: edge
    c.line(6, 14, 6, 16, 8);  c.line(6, 16, 6, 18, 5); // tuft 20

    // Center area
    c.line(9, 12, 9, 15, 9);  c.line(9, 15, 9, 17, 5); // tuft 21
    c.line(11, 13, 11, 16, 8); c.line(11, 16, 11, 18, 5);// tuft 22
    c.line(13, 11, 13, 14, 9); c.line(13, 14, 13, 16, 5);// tuft 23
    c.line(8, 16, 8, 18, 7);  c.line(8, 18, 8, 20, 4); // tuft 24
    c.line(14, 14, 14, 17, 8); c.line(14, 17, 14, 19, 5);// tuft 25

    // Right area
    c.line(18, 12, 18, 15, 9); c.line(18, 15, 18, 17, 5);// tuft 26
    c.line(20, 13, 20, 16, 8); c.line(20, 16, 20, 18, 5);// tuft 27
    c.line(22, 14, 22, 17, 9); c.line(22, 17, 22, 19, 5);// tuft 28
    c.line(19, 16, 19, 18, 7); c.line(19, 18, 19, 20, 4);// tuft 29
    c.line(24, 15, 24, 18, 8); c.line(24, 18, 24, 20, 5);// tuft 30
    c.line(26, 16, 26, 19, 7); c.line(26, 19, 26, 21, 4);// tuft 31

    // Lower area — shorter tufts near ground
    c.line(3, 23, 3, 25, 7);  c.line(3, 25, 3, 27, 4); // tuft 32
    c.line(7, 22, 7, 24, 8);  c.line(7, 24, 7, 26, 5); // tuft 33
    c.line(12, 23, 12, 25, 7); c.line(12, 25, 12, 27, 4);// tuft 34
    c.line(17, 22, 17, 24, 8); c.line(17, 24, 17, 26, 5);// tuft 35
    c.line(23, 23, 23, 25, 7); c.line(23, 25, 23, 27, 4);// tuft 36
    c.line(28, 24, 28, 26, 7); c.line(28, 26, 28, 28, 4);// tuft 37
    c.line(30, 25, 30, 27, 6); c.line(30, 27, 30, 29, 4);// tuft 38: right edge

    // Far right sparse tufts
    c.line(27, 10, 27, 13, 8); c.line(27, 13, 27, 15, 5);// tuft 39
    c.line(29, 12, 29, 15, 7); c.line(29, 15, 29, 17, 4);// tuft 40
    c.line(31, 8, 31, 11, 8);  c.line(31, 11, 31, 13, 5);// tuft 41: far edge

    // Tiny flowers (yellow accent pixels)
    c.set(4, 3, 13); c.set(15, 2, 13); c.set(22, 5, 12);
    c.set(8, 15, 13); c.set(25, 16, 12); c.set(1, 13, 13);

    // Pebble specs (subtle gray-green tones within palette context)
    c.set(6, 9, 4); c.set(18, 10, 4); c.set(28, 19, 4);
    c.set(11, 21, 3); c.set(21, 22, 3); c.set(0, 22, 3);

    // Top-left highlight scatter (light source from upper-left)
    c.set(1, 1, 12); c.set(2, 0, 11); c.set(4, 1, 12);
    c.set(6, 2, 11); c.set(8, 0, 12); c.set(9, 1, 11);
    c.set(3, 2, 10); c.set(7, 3, 10); c.set(11, 1, 11);
    c.set(0, 3, 10); c.set(5, 0, 11);

    // Bottom rows darker (ambient occlusion toward ground)
    c.shadeRegion(0, 28, TILE_SIZE, 4, -1);
    c.shadeRegion(0, 29, TILE_SIZE, 3, -1);

    // Sparse noise for organic feel (very subtle, 4% probability)
    c.addNoise(0.04, [5, 6, 7, 8]);

    // Outline LAST
    c.outline(O);

    return c.frame();
  },

  grass2: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);

    // Base fill — slightly lighter base than grass1 (lusher feel)
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 7);

    // grass2: DENSER/LUSHER variation — more tufts, shifted positions
    // Tuft positions shifted ~4-6 pixels from grass1 pattern

    // Upper-left dense cluster
    c.line(3, 2, 3, 5, 11); c.line(3, 5, 3, 8, 6);
    c.line(4, 1, 4, 4, 10); c.line(4, 4, 4, 7, 6);
    c.line(5, 3, 5, 6, 9);  c.line(5, 6, 5, 9, 5);
    c.line(1, 4, 1, 7, 9);  c.line(1, 7, 1, 10, 5);
    c.line(2, 5, 2, 8, 8);  c.line(2, 8, 2, 11, 5);
    c.line(6, 5, 6, 8, 8);  c.line(6, 8, 6, 10, 5);
    c.line(0, 6, 0, 9, 8);  c.line(0, 9, 0, 12, 4);

    // Upper-center (denser than grass1)
    c.line(9, 0, 9, 3, 11); c.line(9, 3, 9, 6, 7);
    c.line(10, 2, 10, 5, 10); c.line(10, 5, 10, 8, 6);
    c.line(11, 1, 11, 4, 9);  c.line(11, 4, 11, 7, 6);
    c.line(8, 3, 8, 6, 9);   c.line(8, 6, 8, 9, 5);
    c.line(12, 3, 12, 6, 9);  c.line(12, 6, 12, 9, 5);
    c.line(13, 4, 13, 7, 8);  c.line(13, 7, 13, 10, 5);

    // Upper-right cluster
    c.line(16, 1, 16, 4, 11); c.line(16, 4, 16, 7, 6);
    c.line(17, 2, 17, 5, 10); c.line(17, 5, 17, 8, 6);
    c.line(18, 3, 18, 6, 9);  c.line(18, 6, 18, 9, 5);
    c.line(15, 4, 15, 7, 8);  c.line(15, 7, 15, 10, 5);
    c.line(19, 5, 19, 8, 8);  c.line(19, 8, 19, 11, 5);
    c.line(14, 6, 14, 9, 8);  c.line(14, 9, 14, 12, 4);

    // Middle-left (dense)
    c.line(2, 13, 2, 16, 9);  c.line(2, 16, 2, 19, 5);
    c.line(3, 12, 3, 15, 10); c.line(3, 15, 3, 18, 5);
    c.line(4, 14, 4, 17, 8);  c.line(4, 17, 4, 20, 5);
    c.line(5, 15, 5, 18, 8);  c.line(5, 18, 5, 21, 4);
    c.line(1, 14, 1, 17, 8);  c.line(1, 17, 1, 20, 4);
    c.line(6, 13, 6, 16, 8);  c.line(6, 16, 6, 19, 5);
    c.line(0, 15, 0, 18, 7);  c.line(0, 18, 0, 21, 4);

    // Center (dense)
    c.line(8, 11, 8, 14, 9);  c.line(8, 14, 8, 17, 5);
    c.line(9, 12, 9, 15, 10); c.line(9, 15, 9, 18, 5);
    c.line(10, 13, 10, 16, 8); c.line(10, 16, 10, 19, 5);
    c.line(11, 11, 11, 14, 9); c.line(11, 14, 11, 17, 5);
    c.line(12, 12, 12, 15, 8); c.line(12, 15, 12, 18, 5);
    c.line(13, 13, 13, 16, 8); c.line(13, 16, 13, 19, 5);
    c.line(7, 14, 7, 17, 7);  c.line(7, 17, 7, 20, 4);

    // Right area
    c.line(20, 11, 20, 14, 9); c.line(20, 14, 20, 17, 5);
    c.line(21, 12, 21, 15, 8); c.line(21, 15, 21, 18, 5);
    c.line(22, 13, 22, 16, 9); c.line(22, 16, 22, 19, 5);
    c.line(23, 14, 23, 17, 8); c.line(23, 17, 23, 20, 4);
    c.line(24, 13, 24, 16, 8); c.line(24, 16, 24, 19, 5);
    c.line(25, 14, 25, 17, 8); c.line(25, 17, 25, 20, 4);
    c.line(26, 15, 26, 18, 7); c.line(26, 18, 26, 21, 4);

    // Lower area
    c.line(3, 22, 3, 25, 8);  c.line(3, 25, 3, 27, 4);
    c.line(6, 21, 6, 24, 8);  c.line(6, 24, 6, 26, 5);
    c.line(9, 22, 9, 25, 7);  c.line(9, 25, 9, 27, 4);
    c.line(14, 21, 14, 24, 8); c.line(14, 24, 14, 26, 5);
    c.line(19, 22, 19, 25, 7); c.line(19, 25, 19, 27, 4);
    c.line(24, 22, 24, 25, 7); c.line(24, 25, 24, 27, 4);
    c.line(29, 23, 29, 26, 6); c.line(29, 26, 29, 28, 4);
    c.line(31, 24, 31, 27, 6); c.line(31, 27, 31, 29, 4);

    // Far edges
    c.line(28, 10, 28, 13, 8); c.line(28, 13, 28, 16, 5);
    c.line(30, 11, 30, 14, 7); c.line(30, 14, 30, 17, 4);
    c.line(0, 23, 0, 26, 6);  c.line(0, 26, 0, 28, 4);

    // Flowers — different positions from grass1
    c.set(6, 1, 13); c.set(17, 0, 13); c.set(25, 4, 12);
    c.set(2, 14, 13); c.set(20, 15, 12); c.set(11, 22, 13);

    // Pebble specs
    c.set(4, 10, 4); c.set(15, 11, 4); c.set(27, 18, 4);
    c.set(8, 20, 3); c.set(22, 21, 3); c.set(1, 24, 3);

    // Top-left highlights
    c.set(0, 0, 12); c.set(1, 1, 11); c.set(3, 0, 12);
    c.set(5, 1, 11); c.set(7, 2, 10); c.set(10, 0, 11);
    c.set(2, 2, 10); c.set(6, 0, 11); c.set(11, 1, 10);
    c.set(8, 1, 11); c.set(4, 2, 10);

    // Bottom ambient occlusion
    c.shadeRegion(0, 28, TILE_SIZE, 4, -1);
    c.shadeRegion(0, 29, TILE_SIZE, 3, -1);

    // Slightly less noise since it's already denser
    c.addNoise(0.03, [5, 6, 7, 8]);

    c.outline(O);
    return c.frame();
  },

  grass3: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);

    // Base fill — standard mid-green
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 6);

    // grass3: SPARSER variation — fewer tufts, some bare patches visible
    // Positions different from both grass1 and grass2

    // Scattered upper tufts (sparser distribution)
    c.line(2, 2, 2, 5, 10); c.line(2, 5, 2, 8, 5);
    c.line(5, 1, 5, 4, 11); c.line(5, 4, 5, 7, 6);
    c.line(9, 3, 9, 6, 10); c.line(9, 6, 9, 9, 5);
    c.line(14, 2, 14, 5, 11); c.line(14, 5, 14, 8, 6);
    c.line(19, 4, 19, 7, 9);  c.line(19, 7, 19, 10, 5);
    c.line(25, 3, 25, 6, 10); c.line(25, 6, 25, 9, 5);
    c.line(29, 5, 29, 8, 9);  c.line(29, 8, 29, 11, 5);

    // Mid-upper sparse
    c.line(3, 9, 3, 12, 8);  c.line(3, 12, 3, 15, 5);
    c.line(7, 8, 7, 11, 9);  c.line(7, 11, 7, 14, 5);
    c.line(12, 7, 12, 10, 9); c.line(12, 10, 12, 13, 5);
    c.line(17, 8, 17, 11, 8); c.line(17, 11, 17, 14, 5);
    c.line(22, 9, 22, 12, 8); c.line(22, 12, 22, 15, 5);
    c.line(27, 10, 27, 13, 8); c.line(27, 13, 27, 16, 5);

    // Middle area (noticeable bare patches between groups)
    c.line(1, 15, 1, 18, 7);  c.line(1, 18, 1, 21, 4);
    c.line(6, 14, 6, 17, 8);  c.line(6, 17, 6, 20, 5);
    c.line(11, 13, 11, 16, 8); c.line(11, 16, 11, 19, 5);
    c.line(16, 14, 16, 17, 7); c.line(16, 17, 16, 20, 4);
    c.line(21, 15, 21, 18, 7); c.line(21, 18, 21, 21, 4);
    c.line(26, 16, 26, 19, 7); c.line(26, 19, 26, 22, 4);

    // Lower sparse
    c.line(4, 23, 4, 26, 7);  c.line(4, 26, 4, 28, 4);
    c.line(10, 22, 10, 25, 7); c.line(10, 25, 10, 27, 4);
    c.line(18, 23, 18, 26, 7); c.line(18, 26, 18, 28, 4);
    c.line(24, 24, 24, 27, 6); c.line(24, 27, 24, 29, 4);
    c.line(30, 25, 30, 28, 6); c.line(30, 28, 30, 30, 4);

    // Bare patch indicators — slightly darker base showing through in areas
    c.set(8, 17, 5); c.set(9, 18, 5); c.set(13, 20, 5);
    c.set(14, 17, 5); c.set(23, 20, 5); c.set(0, 11, 5);

    // Fewer flowers (sparser look)
    c.set(5, 0, 13); c.set(20, 3, 12); c.set(28, 14, 13);

    // Fewer pebbles
    c.set(8, 11, 4); c.set(19, 12, 4); c.set(0, 20, 3);

    // Highlights (slightly fewer for sparser look)
    c.set(0, 1, 11); c.set(1, 0, 12); c.set(4, 0, 11);
    c.set(8, 1, 11); c.set(13, 2, 10); c.set(22, 1, 11);
    c.set(3, 1, 10); c.set(15, 2, 10);

    // Bottom darker
    c.shadeRegion(0, 28, TILE_SIZE, 4, -1);
    c.shadeRegion(0, 29, TILE_SIZE, 3, -1);

    // Minimal noise for sparser appearance
    c.addNoise(0.025, [5, 6, 7]);

    c.outline(O);
    return c.frame();
  },

  // ==================== TREE TILES (PROFESSIONAL REWRITE) ====================

  treeTrunkT: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);

    // ===== CANOPY PORTION (upper ~60%) =====
    // Organic irregular blob shape using overlapping ellipses
    // NOT a perfect circle/ellipse!

    // Main canopy body — large irregular shape centered upper area
    // Build up with multiple overlapping circles for organic bumpy shape
    c.circle(16, 9, 11, 6);   // main body: mid-dark green base
    c.circle(12, 7, 7, 5);    // upper-left lobe
    c.circle(21, 7, 7, 5);    // upper-right lobe
    c.circle(16, 5, 8, 4);    // top-center lobe
    c.circle(9, 11, 5, 4);    // lower-left protrusion
    c.circle(23, 11, 5, 4);   // lower-right protrusion
    c.circle(16, 13, 6, 3);   // bottom bump
    c.circle(7, 8, 4, 3);     // left-side bump
    c.circle(25, 8, 4, 3);    // right-side bump
    c.circle(14, 3, 5, 3);    // top-left leaf cluster
    c.circle(19, 3, 5, 3);    // top-right leaf cluster

    // 4-LAYER SHADING: light (upper-left) → dark (lower-right)
    // Layer 1: Brightest highlight — upper-left quadrant only, sparse
    c.set(8, 4, 12); c.set(9, 3, 12); c.set(10, 3, 12);
    c.set(11, 4, 11); c.set(12, 4, 12); c.set(9, 5, 11);
    c.set(7, 5, 11); c.set(8, 5, 12); c.set(10, 5, 11);
    c.set(13, 5, 10); c.set(11, 3, 11); c.set(14, 4, 10);

    // Layer 2: Mid-light — most of upper half and left side
    for (let y = 2; y < 11; y++) {
      for (let x = 5; x < 18; x++) {
        if (c.get(x, y) >= 6 && c.get(x, y) <= 8) {
          // Distance-based shading: closer to upper-left = lighter
          const dist = Math.sqrt((x - 8) * (x - 8) + (y - 4) * (y - 4));
          if (dist < 6) c.set(x, y, 9);
          else if (dist < 10) c.set(x, y, 8);
        }
      }
    }
    // Left side band
    for (let y = 5; y < 14; y++) {
      for (let x = 5; x < 10; x++) {
        if (c.get(x, y) >= 6 && c.get(x, y) <= 8) c.set(x, y, 8);
      }
    }

    // Layer 3: Mid-dark — lower-right and bottom edge
    for (let y = 8; y < 17; y++) {
      for (let x = 15; x < 28; x++) {
        if (c.get(x, y) >= 6 && c.get(x, y) <= 9) {
          const dist = Math.sqrt((x - 23) * (x - 23) + (y - 12) * (y - 12));
          if (dist < 8) c.set(x, y, 6);
          else if (dist < 12) c.set(x, y, 7);
        }
      }
    }
    // Bottom edge darkening
    for (let y = 12; y < 17; y++) {
      for (let x = 8; x < 25; x++) {
        if (c.get(x, y) >= 6 && c.get(x, y) <= 8) {
          if (y > 14) c.set(x, y, 5);
          else c.set(x, y, 6);
        }
      }
    }

    // Layer 4: Darkest — underside and rightmost edge, very sparse
    c.set(24, 12, 3); c.set(25, 11, 3); c.set(26, 10, 4);
    c.set(23, 14, 3); c.set(24, 13, 3); c.set(22, 15, 4);
    c.set(20, 15, 4); c.set(25, 13, 4); c.set(15, 15, 4);
    c.set(9, 14, 4); c.set(8, 13, 4); c.set(7, 12, 4);

    // Leaf cluster protrusions around edges (small bumps)
    c.set(5, 7, 7); c.set(5, 8, 5);   // left bump
    c.set(26, 7, 7); c.set(26, 8, 5);  // right bump
    c.set(12, 2, 9); c.set(13, 1, 8);  // top-left tip
    c.set(19, 2, 9); c.set(18, 1, 8);  // top-right tip
    c.set(6, 10, 6); c.set(7, 11, 5);  // lower-left edge
    c.set(25, 10, 6); c.set(24, 11, 5); // lower-right edge
    c.set(15, 0, 9); c.set(16, 0, 8);  // top center
    c.set(10, 14, 5); c.set(21, 14, 5); // bottom corners

    // Sparse canopy noise (probability 0.05)
    c.addNoise(0.05, [7, 8, 9, 10]);

    // ===== TRUNK PORTION (lower ~40%) =====
    // Trunk positioned under canopy, widening toward ground

    // Main trunk body — wider at bottom (root flare)
    const trunkTop = 16;  // where trunk starts below canopy
    const trunkBottom = 31;

    // Trunk shape: ~9px wide at top, ~12px at bottom
    for (let y = trunkTop; y <= trunkBottom; y++) {
      const progress = (y - trunkTop) / (trunkBottom - trunkTop);
      const halfWidth = 4.5 + progress * 1.5; // 4.5 → 6
      const centerX = 16;
      const xStart = Math.floor(centerX - halfWidth);
      const xEnd = Math.ceil(centerX + halfWidth);
      for (let x = xStart; x <= xEnd; x++) {
        c.set(x, y, 19); // base bark color
      }
    }

    // Left edge highlight (lighter, warm tone) — 2px wide
    for (let y = trunkTop + 1; y <= trunkBottom - 1; y++) {
      const progress = (y - trunkTop) / (trunkBottom - trunkTop);
      const halfWidth = 4.5 + progress * 1.5;
      const centerX = 16;
      const xStart = Math.floor(centerX - halfWidth);
      c.set(xStart, y, 23); // highlight
      c.set(xStart + 1, y, 24); // secondary highlight
    }

    // Right edge shadow (darker) — 2px wide
    for (let y = trunkTop + 1; y <= trunkBottom - 1; y++) {
      const progress = (y - trunkTop) / (trunkBottom - trunkTop);
      const halfWidth = 4.5 + progress * 1.5;
      const centerX = 16;
      const xEnd = Math.ceil(centerX + halfWidth);
      c.set(xEnd, y, 17); // shadow
      c.set(xEnd - 1, y, 18); // secondary shadow
    }

    // Vertical bark grooves (1px wide, varying lengths)
    // Left-of-center grooves
    c.line(13, 17, 13, 23, 17);
    c.line(14, 19, 14, 26, 17);
    c.line(15, 18, 15, 24, 18);
    // Right-of-center grooves
    c.line(17, 18, 17, 25, 17);
    c.line(18, 20, 18, 28, 17);
    c.line(19, 22, 19, 29, 18);

    // Knot marks (oval shapes)
    // Knot 1: left side, upper trunk area
    c.set(13, 20, 17); c.set(14, 20, 17); c.set(14, 21, 21);
    c.set(13, 21, 21); c.set(13, 22, 17); c.set(14, 22, 17);
    // Knot 2: right side, middle trunk
    c.set(18, 25, 17); c.set(19, 25, 17); c.set(19, 26, 21);
    c.set(18, 26, 21); c.set(18, 27, 17); c.set(19, 27, 17);

    // Canopy overhang shadow on trunk (where canopy overlaps and shades trunk)
    c.set(12, 16, 16); c.set(13, 16, 16); c.set(14, 16, 17);
    c.set(15, 16, 17); c.set(16, 16, 17); c.set(17, 16, 17);
    c.set(18, 16, 16); c.set(19, 16, 16); c.set(20, 16, 17);

    // Root flare at bottom (extend slightly wider)
    c.set(10, 30, 18); c.set(11, 30, 19); c.set(10, 31, 17);
    c.set(21, 30, 18); c.set(22, 30, 19); c.set(22, 31, 17);

    // Ground contact shadow (dark band at very bottom)
    c.set(11, 31, 16); c.set(12, 31, 16); c.set(13, 31, 17);
    c.set(14, 31, 17); c.set(15, 31, 17); c.set(16, 31, 17);
    c.set(17, 31, 17); c.set(18, 31, 17); c.set(19, 31, 16);
    c.set(20, 31, 16); c.set(21, 31, 17);

    c.outline(O);
    return c.frame();
  },

  treeTrunkB: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);

    // Full-height trunk (no canopy) — more bark detail
    // Tapers slightly toward top, pronounced root flare at bottom

    const trunkTop = 2;   // starts near top
    const trunkBottom = 31;

    // Main trunk body with taper
    for (let y = trunkTop; y <= trunkBottom; y++) {
      const progress = (y - trunkTop) / (trunkBottom - trunkTop);
      // Taper: narrower at top (~7px), wider at bottom (~13px)
      const halfWidth = 3.5 + progress * 3;
      const centerX = 16;
      const xStart = Math.floor(centerX - halfWidth);
      const xEnd = Math.ceil(centerX + halfWidth);
      for (let x = xStart; x <= xEnd; x++) {
        c.set(x, y, 19);
      }
    }

    // Left edge highlight (warm light from upper-left)
    for (let y = trunkTop + 1; y <= trunkBottom - 2; y++) {
      const progress = (y - trunkTop) / (trunkBottom - trunkTop);
      const halfWidth = 3.5 + progress * 3;
      const centerX = 16;
      const xStart = Math.floor(centerX - halfWidth);
      c.set(xStart, y, 23);
      if (halfWidth > 4) c.set(xStart + 1, y, 24);
    }

    // Right edge shadow
    for (let y = trunkTop + 1; y <= trunkBottom - 2; y++) {
      const progress = (y - trunkTop) / (trunkBottom - trunkTop);
      const halfWidth = 3.5 + progress * 3;
      const centerX = 16;
      const xEnd = Math.ceil(centerX + halfWidth);
      c.set(xEnd, y, 17);
      if (halfWidth > 4) c.set(xEnd - 1, y, 18);
    }

    // More bark grooves than treeTrunkT (full trunk needs more detail)
    // Left side grooves
    c.line(12, 4, 12, 12, 17);
    c.line(13, 6, 13, 18, 17);
    c.line(14, 8, 14, 22, 18);
    c.line(13, 20, 13, 28, 17);
    // Center-left groove
    c.line(15, 5, 15, 15, 17);
    c.line(15, 17, 15, 26, 18);
    // Center-right grooves
    c.line(17, 5, 17, 16, 17);
    c.line(17, 18, 17, 27, 17);
    c.line(18, 7, 18, 20, 17);
    c.line(18, 22, 18, 29, 18);
    // Right side grooves
    c.line(19, 9, 19, 24, 17);
    c.line(20, 12, 20, 26, 18);

    // Knot marks (more knots on exposed trunk)
    // Knot 1: upper-left
    c.set(12, 10, 17); c.set(13, 10, 17); c.set(13, 11, 21);
    c.set(12, 11, 21); c.set(12, 12, 17); c.set(13, 12, 17);
    // Knot 2: upper-right
    c.set(19, 14, 17); c.set(20, 14, 17); c.set(20, 15, 21);
    c.set(19, 15, 21); c.set(19, 16, 17); c.set(20, 16, 17);
    // Knot 3: lower-left
    c.set(13, 23, 17); c.set(14, 23, 17); c.set(14, 24, 21);
    c.set(13, 24, 21); c.set(13, 25, 17); c.set(14, 25, 17);
    // Knot 4: lower-center
    c.set(16, 20, 17); c.set(17, 20, 17); c.set(17, 21, 21);
    c.set(16, 21, 21); c.set(16, 22, 17); c.set(17, 22, 17);

    // Pronounced root flare at bottom
    c.set(9, 29, 18);  c.set(10, 29, 19);  c.set(9, 30, 17);
    c.set(8, 30, 17);  c.set(9, 31, 16);
    c.set(22, 29, 18); c.set(23, 29, 19); c.set(23, 30, 17);
    c.set(24, 30, 17); c.set(23, 31, 16);

    // Root lines extending diagonally into ground
    c.line(8, 30, 6, 31, 17);
    c.line(24, 30, 26, 31, 17);

    // Ground contact shadow
    for (let x = 9; x <= 23; x++) {
      c.set(x, 31, 16);
    }
    c.set(10, 31, 17); c.set(11, 31, 17); c.set(12, 31, 16);
    c.set(19, 31, 16); c.set(20, 31, 17); c.set(21, 31, 17);

    // Top edge slight taper highlight
    c.set(13, 2, 24); c.set(14, 2, 23); c.set(15, 2, 24);
    c.set(17, 2, 24); c.set(18, 2, 23); c.set(19, 2, 22);

    // Subtle trunk noise for bark texture
    c.addNoise(0.03, [18, 20, 22]);

    c.outline(O);
    return c.frame();
  },

  // ==================== DIRT PATH (PROFESSIONAL REWRITE) ====================

  dirtPath: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);

    // Base: warm brown gradient (lighter at top, darker toward bottom-center)
    for (let y = 0; y < TILE_SIZE; y++) {
      const rowDarken = Math.floor(y / 8); // gradual darkening toward bottom
      for (let x = 0; x < TILE_SIZE; x++) {
        // Center column slightly darker (wear pattern)
        const centerDist = Math.abs(x - 16) / 16;
        const centerDarken = centerDist < 0.4 ? 1 : 0;
        const baseIdx = 5 + rowDarken + centerDarken;
        c.set(x, y, Math.min(14, baseIdx));
      }
    }

    // Texture: horizontal/near-horizontal compacted dirt strokes
    // These simulate the pressed-down texture of walked-on dirt
    const strokes: [number, number, number, number][] = [
      [2, 3, 5, 1], [8, 2, 6, 1], [17, 3, 5, 1], [24, 4, 4, 1],
      [1, 6, 4, 1], [7, 5, 7, 1], [15, 6, 5, 1], [22, 5, 6, 1],
      [3, 8, 5, 2], [10, 7, 6, 2], [18, 8, 5, 2], [25, 7, 5, 2],
      [0, 10, 3, 2], [5, 9, 8, 2], [14, 10, 6, 2], [21, 9, 7, 2], [28, 10, 3, 2],
      [2, 12, 4, 3], [9, 11, 7, 3], [16, 12, 5, 3], [23, 11, 6, 3], [29, 12, 2, 3],
      [4, 14, 5, 3], [11, 13, 6, 3], [19, 14, 5, 3], [26, 13, 5, 3],
      [1, 16, 4, 4], [8, 15, 7, 4], [15, 16, 6, 4], [22, 15, 6, 4], [29, 16, 2, 4],
      [3, 18, 5, 4], [10, 17, 8, 4], [18, 18, 5, 4], [25, 17, 5, 4],
      [2, 20, 4, 5], [9, 19, 7, 5], [16, 20, 6, 5], [23, 19, 6, 5], [29, 20, 2, 5],
      [5, 22, 6, 5], [12, 21, 6, 5], [20, 22, 5, 5], [26, 21, 4, 5],
      [3, 24, 5, 5], [11, 23, 7, 5], [17, 24, 6, 5], [24, 23, 5, 5],
      [4, 26, 5, 6], [13, 25, 6, 6], [21, 26, 5, 6], [28, 25, 3, 6],
      [6, 28, 6, 6], [14, 27, 6, 6], [19, 28, 5, 6], [25, 27, 4, 6],
    ];
    strokes.forEach(([sx, sy, len, darken]) => {
      for (let i = 0; i < len; i++) {
        const px = sx + i;
        if (px < TILE_SIZE) {
          c.set(px, sy, Math.min(14, 5 + darken + Math.floor(sy / 6)));
        }
      }
    });

    // Scattered pebble dots (lighter brown/gray tones)
    const pebbles: [number, number][] = [
      [3, 4], [12, 3], [22, 5], [28, 7],
      [5, 11], [15, 12], [25, 10], [1, 14],
      [8, 16], [19, 17], [27, 15], [4, 20],
      [11, 22], [23, 21], [30, 18], [6, 26],
      [14, 27], [24, 26], [2, 29], [18, 29],
    ];
    pebbles.forEach(([px, py]) => {
      c.set(px, py, 8 + Math.floor(Math.random() * 3)); // lighter pebble tone
    });

    // Footprint-shaped darker ovals (wear patterns from walking)
    // Footprint 1: left of center
    c.set(9, 19, 3); c.set(10, 19, 3); c.set(11, 19, 3); c.set(12, 19, 4);
    c.set(9, 20, 3); c.set(10, 20, 2); c.set(11, 20, 2); c.set(12, 20, 3);
    c.set(9, 21, 4); c.set(10, 21, 3); c.set(11, 21, 3); c.set(12, 21, 4);
    // Footprint 2: right of center
    c.set(19, 20, 3); c.set(20, 20, 3); c.set(21, 20, 3); c.set(22, 20, 4);
    c.set(19, 21, 3); c.set(20, 21, 2); c.set(21, 21, 2); c.set(22, 21, 3);
    c.set(19, 22, 4); c.set(20, 22, 3); c.set(21, 22, 3); c.set(22, 22, 4);
    // Footprint 3: smaller, upper area
    c.set(14, 12, 4); c.set(15, 12, 3); c.set(16, 12, 3); c.set(17, 12, 4);
    c.set(14, 13, 3); c.set(15, 13, 3); c.set(16, 13, 3); c.set(17, 13, 4);

    // Irregular edges — rough border with some variation
    // Left edge irregularity
    c.set(0, 5, 4); c.set(0, 12, 4); c.set(0, 18, 4); c.set(0, 25, 4);
    c.set(1, 2, 5); c.set(1, 8, 5); c.set(1, 15, 5); c.set(1, 22, 5); c.set(1, 28, 5);
    // Right edge irregularity
    c.set(31, 4, 4); c.set(31, 11, 4); c.set(31, 17, 4); c.set(31, 24, 4);
    c.set(30, 2, 5); c.set(30, 9, 5); c.set(30, 16, 5); c.set(30, 23, 5); c.set(30, 29, 5);

    // Highlight: sparse bright pixels in upper area (light source)
    c.set(2, 1, 10); c.set(7, 0, 11); c.set(13, 1, 10);
    c.set(20, 0, 11); c.set(26, 2, 10); c.set(4, 2, 9);
    c.set(10, 1, 9); c.set(17, 2, 9); c.set(24, 1, 9);

    // Bottom edge ambient occlusion (darker along bottom)
    c.shadeRegion(0, 29, TILE_SIZE, 3, 1);

    // Sparse noise for organic dirt feel
    c.addNoise(0.03, [4, 5, 6, 7]);

    c.outline(O);
    return c.frame();
  },

  // ==================== ROCK (PROFESSIONAL REWRITE) ====================

  rock: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);

    // Rock shape: IRREGULAR using overlapping ellipses of different sizes
    // Creates angular/faceted look, not a perfect circle
    const cx = 16, cy = 18;

    // Main body — large off-center ellipse (slightly flattened)
    c.ellipse(cx, cy, 11, 8, 19); // base shape with mid-brown

    // Facet-building overlapping ellipses for angular appearance
    c.ellipse(cx - 4, cy - 3, 6, 5, 19);  // upper-left facet region
    c.ellipse(cx + 3, cy - 2, 7, 5, 19);  // upper-right facet region
    c.ellipse(cx - 2, cy + 3, 5, 4, 19);  // lower-left facet
    c.ellipse(cx + 4, cy + 2, 6, 4, 19);  // lower-right facet
    c.ellipse(cx, cy - 1, 4, 6, 19);      // center vertical facet

    // Irregular edge modifications — break perfect ellipse silhouette
    // Cut away some areas for natural rock feel
    c.set(5, 16, 0); c.set(6, 15, 0);   // left indent
    c.set(26, 17, 0); c.set(27, 16, 0);  // right indent
    c.set(15, 10, 0); c.set(16, 10, 0);  // top flat spot
    c.set(10, 24, 0);                     // bottom-left indent
    c.set(23, 25, 0);                     // bottom-right indent
    // Add protrusions
    c.set(7, 13, 19); c.set(8, 12, 19);  // left bump
    c.set(24, 13, 19); c.set(25, 14, 19);// right bump
    c.set(14, 9, 19); c.set(17, 9, 19);  // top bumps
    c.set(9, 23, 19); c.set(22, 24, 19); // bottom bumps

    // 3D FACETED SHADING — each "face" gets a different shade
    // Light source: upper-left by convention

    // Facet 1: Upper-left (brightest highlight facet)
    const ulFacet: [number, number][] = [
      [8, 12], [9, 11], [10, 11], [11, 11], [12, 12],
      [9, 12], [10, 12], [11, 12], [12, 13], [13, 13],
      [8, 13], [9, 13], [10, 13], [11, 14], [12, 14],
      [9, 14], [10, 14], [11, 15],
    ];
    ulFacet.forEach(([x, y]) => { if (c.get(x, y) !== 0) c.set(x, y, 22); });

    // Facet 2: Upper-mid (mid-light)
    const umFacet: [number, number][] = [
      [13, 11], [14, 11], [15, 11], [16, 11], [17, 12],
      [14, 12], [15, 12], [16, 12], [17, 13], [18, 13],
      [13, 12], [14, 13], [15, 13], [16, 13], [17, 14],
      [15, 14], [16, 14],
    ];
    umFacet.forEach(([x, y]) => { if (c.get(x, y) !== 0) c.set(x, y, 20); });

    // Facet 3: Upper-right (mid-tone)
    const urFacet: [number, number][] = [
      [18, 11], [19, 12], [20, 12], [21, 13], [22, 13],
      [19, 13], [20, 13], [21, 14], [22, 14], [23, 14],
      [18, 13], [19, 14], [20, 14], [21, 15],
    ];
    urFacet.forEach(([x, y]) => { if (c.get(x, y) !== 0) c.set(x, y, 19); });

    // Facet 4: Left side (mid)
    const lFacet: [number, number][] = [
      [6, 14], [7, 14], [8, 15], [9, 15], [10, 15],
      [7, 15], [8, 16], [9, 16], [10, 16], [11, 16],
      [8, 17], [9, 17], [10, 17],
    ];
    lFacet.forEach(([x, y]) => { if (c.get(x, y) !== 0) c.set(x, y, 20); });

    // Facet 5: Center (base tone)
    const ctFacet: [number, number][] = [
      [12, 15], [13, 15], [14, 15], [15, 15], [16, 15],
      [13, 16], [14, 16], [15, 16], [16, 16], [17, 16],
      [12, 16], [13, 17], [14, 17], [15, 17], [16, 17],
      [14, 18], [15, 18],
    ];
    ctFacet.forEach(([x, y]) => { if (c.get(x, y) !== 0) c.set(x, y, 18); });

    // Facet 6: Lower-left (mid-dark)
    const llFacet: [number, number][] = [
      [10, 18], [11, 18], [12, 18], [13, 19], [14, 19],
      [11, 19], [12, 19], [13, 20],
    ];
    llFacet.forEach(([x, y]) => { if (c.get(x, y) !== 0) c.set(x, y, 17); });

    // Facet 7: Lower-right (shadow — darkest facet)
    const lrFacet: [number, number][] = [
      [17, 17], [18, 17], [19, 17], [20, 17], [21, 17],
      [18, 18], [19, 18], [20, 18], [21, 19], [22, 19],
      [19, 19], [20, 19], [21, 20], [22, 20],
    ];
    lrFacet.forEach(([x, y]) => { if (c.get(x, y) !== 0) c.set(x, y, 16); });

    // Prominent crack lines (1px, angular paths, dark color)
    // Crack 1: from upper-right facet down through center
    c.line(20, 13, 18, 15, 16);
    c.line(18, 15, 16, 17, 16);
    c.line(16, 17, 14, 19, 17);
    // Crack 2: from left side angling down-right
    c.line(8, 15, 10, 18, 16);
    c.line(10, 18, 13, 20, 17);
    // Crack 3: small branch crack on upper surface
    c.line(15, 12, 17, 14, 17);

    // Contrasting patch: moss on lower-left facet (green touch)
    c.set(10, 19, 4); c.set(11, 19, 4); c.set(11, 20, 3);
    c.set(12, 20, 4); c.set(10, 20, 3);

    // Contact shadow at base (1-2px dark band where rock meets ground)
    c.set(9, 25, 16); c.set(10, 25, 16); c.set(11, 25, 16);
    c.set(12, 25, 16); c.set(13, 25, 16); c.set(14, 25, 17);
    c.set(15, 25, 17); c.set(16, 25, 17); c.set(17, 25, 16);
    c.set(18, 25, 16); c.set(19, 25, 16); c.set(20, 25, 16);
    c.set(21, 25, 16);

    // Specular highlight on upper-left facet (brightest point)
    c.set(9, 11, 24); c.set(10, 11, 23); c.set(11, 12, 23);

    // Subtle rock face noise
    c.addNoise(0.02, [18, 19, 20]);

    c.outline(O);
    return c.frame();
  },

  // ==================== WATER TILES ====================

  water1: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 5);
    c.dither(0, 0, TILE_SIZE, TILE_SIZE, 5, 6);
    c.set(5, 3, 8); c.set(14, 7, 8); c.set(24, 4, 8);
    c.set(8, 15, 9); c.set(20, 18, 9); c.set(3, 22, 8);
    c.set(17, 25, 8); c.set(28, 12, 9); c.set(10, 28, 8);
    c.addNoise(0.06, [4, 5, 6, 7]);
    c.outline(O);
    return c.frame();
  },

  water2: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 6);
    c.dither(0, 0, TILE_SIZE, TILE_SIZE, 6, 7);
    c.set(3, 5, 9); c.set(12, 2, 9); c.set(22, 8, 9);
    c.set(7, 14, 10); c.set(18, 16, 10); c.set(27, 20, 9);
    c.set(2, 25, 9); c.set(15, 27, 10); c.set(21, 29, 9);
    c.addNoise(0.05, [5, 6, 7, 8]);
    c.outline(O);
    return c.frame();
  },

  deepWater: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 3);
    c.dither(0, 0, TILE_SIZE, TILE_SIZE, 3, 4);
    c.set(8, 6, 6); c.set(19, 10, 6); c.set(4, 18, 6);
    c.set(14, 22, 6); c.set(26, 14, 6);
    c.addNoise(0.04, [2, 3, 4, 5]);
    c.outline(O);
    return c.frame();
  },

  // ==================== SAND TILES ====================

  sand1: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 5);
    c.dither(0, 0, TILE_SIZE, TILE_SIZE, 5, 6);
    for (let i = 0; i < 20; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 7);
    }
    for (let i = 0; i < 8; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 4);
    }
    c.outline(O);
    return c.frame();
  },

  sand2: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 6);
    c.dither(0, 0, TILE_SIZE, TILE_SIZE, 6, 7);
    for (let i = 0; i < 18; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 8);
    }
    for (let i = 0; i < 10; i++) {
      c.set(Math.floor(Math.random() * TILE_SIZE), Math.floor(Math.random() * TILE_SIZE), 5);
    }
    c.outline(O);
    return c.frame();
  },

  // ==================== SNOW TILES ====================

  snow1: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 6);
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(Math.random() * TILE_SIZE);
      const y = Math.floor(Math.random() * TILE_SIZE);
      c.set(x, y, 8 + Math.floor(Math.random() * 4));
    }
    c.shadeRegion(0, 28, TILE_SIZE, 4, -1);
    c.addNoise(0.03, [5, 6, 7, 8]);
    c.outline(O);
    return c.frame();
  },

  snow2: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 7);
    for (let i = 0; i < 25; i++) {
      const x = Math.floor(Math.random() * TILE_SIZE);
      const y = Math.floor(Math.random() * TILE_SIZE);
      c.set(x, y, 9 + Math.floor(Math.random() * 3));
    }
    c.shadeRegion(0, 28, TILE_SIZE, 4, -1);
    c.addNoise(0.025, [6, 7, 8, 9]);
    c.outline(O);
    return c.frame();
  },

  // ==================== ICE TILES ====================

  ice1: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 5);
    c.line(2, 5, 12, 8, 8);
    c.line(14, 3, 25, 6, 8);
    c.line(5, 15, 18, 18, 9);
    c.line(20, 12, 30, 16, 8);
    c.line(0, 22, 15, 25, 9);
    c.line(18, 22, 31, 28, 8);
    c.set(8, 7, 11); c.set(20, 5, 11); c.set(12, 17, 12);
    c.set(25, 15, 11); c.set(8, 24, 12);
    c.addNoise(0.03, [4, 5, 6, 7]);
    c.outline(O);
    return c.frame();
  },

  ice2: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 6);
    c.line(0, 4, 10, 7, 9);
    c.line(16, 2, 28, 5, 9);
    c.line(3, 14, 16, 17, 10);
    c.line(22, 10, 31, 14, 9);
    c.line(2, 24, 14, 27, 10);
    c.line(20, 23, 30, 29, 9);
    c.set(6, 6, 12); c.set(22, 4, 12); c.set(10, 16, 12);
    c.set(26, 13, 12); c.set(8, 26, 12);
    c.addNoise(0.025, [5, 6, 7, 8]);
    c.outline(O);
    return c.frame();
  },

  // ==================== VOID TILES ====================

  void1: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 3);
    c.dither(0, 0, TILE_SIZE, TILE_SIZE, 3, 4);
    c.set(5, 5, 7); c.set(15, 3, 7); c.set(25, 6, 7);
    c.set(8, 15, 8); c.set(20, 12, 8); c.set(3, 22, 7);
    c.set(18, 25, 8); c.set(28, 18, 7);
    c.addNoise(0.05, [2, 3, 4, 5, 6]);
    c.outline(O);
    return c.frame();
  },

  void2: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 4);
    c.dither(0, 0, TILE_SIZE, TILE_SIZE, 4, 5);
    c.set(3, 4, 8); c.set(13, 6, 8); c.set(23, 3, 8);
    c.set(7, 14, 9); c.set(17, 16, 9); c.set(27, 14, 8);
    c.set(5, 24, 8); c.set(15, 26, 9); c.set(24, 24, 8);
    c.addNoise(0.04, [3, 4, 5, 6, 7]);
    c.outline(O);
    return c.frame();
  },

  // ==================== HOLY TILES ====================

  holyGround1: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 5);
    c.dither(0, 0, TILE_SIZE, TILE_SIZE, 5, 6);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if ((x + y) % 5 === 0) c.set(x, y, 8);
      }
    }
    c.set(16, 16, 14); c.set(15, 15, 12); c.set(17, 15, 12);
    c.set(15, 17, 12); c.set(17, 17, 12);
    c.outline(O);
    return c.frame();
  },

  holyGround2: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 6);
    c.dither(0, 0, TILE_SIZE, TILE_SIZE, 6, 7);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if ((x * 3 + y * 7) % 7 === 0) c.set(x, y, 9);
      }
    }
    c.set(8, 8, 13); c.set(24, 24, 13);
    c.set(7, 7, 11); c.set(25, 25, 11);
    c.outline(O);
    return c.frame();
  },

  // ==================== TRANSITION / EDGE TILES ====================

  grassToWater: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if (x < TILE_SIZE / 2) c.set(x, y, 6);
        else c.set(x, y, 5);
      }
    }
    for (let y = 0; y < TILE_SIZE; y++) {
      const boundary = TILE_SIZE / 2 + Math.sin(y * 0.5) * 3;
      for (let x = 0; x < TILE_SIZE; x++) {
        if (Math.abs(x - boundary) < 2) c.set(x, y, 4);
      }
    }
    c.outline(O);
    return c.frame();
  },

  grassToSand: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if (y < TILE_SIZE / 2) c.set(x, y, 6);
        else c.set(x, y, 5);
      }
    }
    c.outline(O);
    return c.frame();
  },

  grassToDirt: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if (y < TILE_SIZE / 2) c.set(x, y, 6);
        else c.set(x, y, 5);
      }
    }
    c.outline(O);
    return c.frame();
  },

  grassToSnow: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if (y < TILE_SIZE / 2) c.set(x, y, 6);
        else c.set(x, y, 6);
      }
    }
    c.outline(O);
    return c.frame();
  },

  // ==================== BUSH (Forest decoration) ====================

  bushL: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);

    // Organic round-ish bush shape using overlapping circles
    c.circle(16, 17, 10, 6);  // main body
    c.circle(11, 14, 6, 5);   // left lobe
    c.circle(21, 14, 6, 5);   // right lobe
    c.circle(16, 11, 7, 4);   // top lobe
    c.circle(13, 20, 5, 3);   // bottom-left
    c.circle(19, 20, 5, 3);   // bottom-right

    // 4-layer shading: light source upper-left
    // Layer 1: Brightest highlight — sparse, upper-left area
    c.set(9, 11, 12); c.set(10, 10, 12); c.set(11, 10, 11);
    c.set(10, 11, 11); c.set(12, 9, 11); c.set(13, 9, 10);
    c.set(8, 12, 11); c.set(9, 12, 10);

    // Layer 2: Mid-light — upper half, left side
    for (let y = 8; y < 17; y++) {
      for (let x = 6; x < 18; x++) {
        if (c.get(x, y) >= 6 && c.get(x, y) <= 8) {
          const dist = Math.sqrt((x - 10) * (x - 10) + (y - 11) * (y - 11));
          if (dist < 7) c.set(x, y, 9);
          else if (dist < 11) c.set(x, y, 8);
        }
      }
    }

    // Layer 3: Mid-dark — lower-right
    for (let y = 14; y < 24; y++) {
      for (let x = 14; x < 26; x++) {
        if (c.get(x, y) >= 6 && c.get(x, y) <= 9) {
          const dist = Math.sqrt((x - 21) * (x - 21) + (y - 18) * (y - 18));
          if (dist < 7) c.set(x, y, 6);
          else if (dist < 10) c.set(x, y, 7);
        }
      }
    }

    // Layer 4: Darkest shadow — bottom edge, right edge
    c.set(23, 18, 4); c.set(24, 17, 4); c.set(22, 20, 3);
    c.set(21, 21, 4); c.set(18, 23, 4); c.set(17, 22, 4);
    c.set(12, 23, 4); c.set(11, 22, 4); c.set(24, 19, 3);

    // Small berries/flowers accent (red/dark pink using darker green indices as contrast)
    c.set(14, 13, 13); c.set(17, 14, 13); c.set(12, 16, 12);

    // Leaf tufts around edges for organic feel
    c.set(6, 14, 7); c.set(6, 15, 5); c.set(25, 14, 7); c.set(25, 15, 5);
    c.set(15, 6, 8); c.set(16, 6, 6); c.set(14, 7, 7); c.set(17, 7, 7);

    c.addNoise(0.04, [7, 8, 9]);
    c.outline(O);
    return c.frame();
  },

  // ==================== CACTUS (Desert decoration) ====================

  cactus1: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);

    // Main body — tall vertical with arms (saguaro-style)
    // Center trunk
    for (let y = 6; y <= 28; y++) {
      const halfWidth = 3 + Math.floor(Math.sin(y * 0.15) * 0.8);
      const cx = 16;
      for (let x = cx - halfWidth; x <= cx + halfWidth; x++) {
        c.set(x, y, 5);
      }
    }

    // Left arm (branches left then up)
    c.set(13, 12, 5); c.set(12, 12, 5); c.set(11, 12, 5);
    c.set(11, 11, 5); c.set(11, 10, 5); c.set(11, 9, 5);
    c.set(11, 8, 5); c.set(12, 8, 5); c.set(13, 8, 5);
    c.set(12, 7, 5); c.set(12, 6, 5);

    // Right arm (branches right then up)
    c.set(19, 16, 5); c.set(20, 16, 5); c.set(21, 16, 5);
    c.set(21, 15, 5); c.set(21, 14, 5); c.set(21, 13, 5);
    c.set(21, 12, 5); c.set(20, 12, 5); c.set(19, 12, 5);
    c.set(20, 11, 5); c.set(20, 10, 5);

    // Highlight on left side of each segment (light from upper-left)
    // Trunk highlight
    for (let y = 7; y <= 27; y++) {
      const hw = 3 + Math.floor(Math.sin(y * 0.15) * 0.8);
      c.set(16 - hw, y, 7);
      if (hw > 2) c.set(15 - hw, y, 6);
    }

    // Arm highlights
    c.set(11, 11, 7); c.set(11, 10, 7); c.set(11, 9, 7); c.set(11, 8, 6);
    c.set(12, 7, 7); c.set(20, 15, 7); c.set(21, 14, 7); c.set(21, 13, 7);
    c.set(21, 12, 6); c.set(20, 11, 7);

    // Shadow on right side
    for (let y = 7; y <= 27; y++) {
      const hw = 3 + Math.floor(Math.sin(y * 0.15) * 0.8);
      c.set(16 + hw, y, 4);
      if (hw > 2) c.set(17 + hw, y, 3);
    }

    // Rib lines (vertical cactus ribs — subtle dark lines)
    for (let y = 8; y <= 26; y += 3) {
      c.set(14, y, 4); c.set(16, y, 4); c.set(18, y, 4);
    }

    // Spines (small dots along edges)
    for (let y = 8; y <= 26; y += 2) {
      const hw = 3 + Math.floor(Math.sin(y * 0.15) * 0.8);
      if (y % 4 === 0) { c.set(14 - hw, y, 8); c.set(18 + hw, y, 8); }
    }

    // Flower on top (pink/red accent)
    c.set(15, 5, 8); c.set(16, 4, 9); c.set(17, 5, 8);
    c.set(16, 5, 10); c.set(15, 4, 9); c.set(17, 4, 9);

    // Ground shadow
    c.set(13, 29, 3); c.set(14, 29, 3); c.set(15, 29, 3);
    c.set(16, 29, 3); c.set(17, 29, 3); c.set(18, 29, 3); c.set(19, 29, 3);

    c.outline(O);
    return c.frame();
  },

  // ==================== DEAD BUSH (Desert decoration) ====================

  deadBush: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);

    // Base fill transparent (only draw the bush itself)

    // Dead twig structure — thin branching lines, brown/gray-green tones
    // Main stem (from ground up)
    c.line(16, 28, 16, 20, 4);
    c.line(16, 20, 14, 15, 4);
    c.line(14, 15, 14, 10, 4);
    c.line(16, 20, 18, 14, 4);
    c.line(18, 14, 17, 9, 4);
    c.line(16, 20, 16, 13, 4);

    // Branches (thinner, more chaotic)
    c.line(14, 15, 11, 13, 3);
    c.line(11, 13, 9, 14, 3);
    c.line(14, 10, 11, 7, 3);
    c.line(14, 10, 16, 8, 3);
    c.line(18, 14, 21, 12, 3);
    c.line(21, 12, 23, 14, 3);
    c.line(17, 9, 15, 6, 3);
    c.line(17, 9, 19, 7, 3);
    c.line(16, 13, 14, 11, 3);
    c.line(14, 11, 12, 13, 3);

    // Secondary tiny twigs
    c.line(9, 14, 7, 15, 3);
    c.line(11, 7, 9, 5, 3);
    c.line(23, 14, 25, 13, 3);
    c.line(19, 7, 21, 5, 3);
    c.line(15, 6, 13, 4, 3);
    c.line(12, 13, 10, 12, 3);

    // Make twigs thicker (2px wide for visibility)
    const thickenPts: [number, number][] = [
      [16,27],[16,26],[16,25],[16,24],[16,23],[16,22],[16,21],
      [15,19],[14,18],[14,17],[14,16],[14,14],[14,13],[14,12],[14,11],
      [17,19],[18,18],[18,17],[18,15],[18,13],[17,12],[17,10],[17,8],
      [13,14],[12,13],[10,14],[10,15],
      [13,10],[13,9],[12,8],[11,7],[15,8],[16,8],
      [20,13],[20,12],[22,13],[22,14],[24,14],
      [18,8],[19,7],[20,6],[16,6],[15,5],[14,5],
      [15,12],[14,11],[13,12],[12,13],[11,12],
    ];
    thickenPts.forEach(([x, y]) => {
      if (c.get(x, y) === 0 || c.get(x, y) === 3) c.set(x, y, 4);
    });

    // Dried leaf clusters (small dots at branch ends)
    c.set(7, 15, 5); c.set(9, 5, 5); c.set(13, 4, 5);
    c.set(25, 13, 5); c.set(21, 5, 5); c.set(10, 12, 5);

    c.outline(O);
    return c.frame();
  },

  // ==================== PINE TREE (Snow region tree) ====================

  pineL: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);

    // Pine tree: layered triangular canopy + visible trunk below
    // Using TREE_P palette: greens (1-14) for needles, browns (15-28) for trunk

    // Canopy layer 1 (bottom/widest tier)
    for (let row = 0; row < 6; row++) {
      const width = 13 - row * 2;
      const startX = 16 - width;
      const y = 20 + row;
      for (let x = startX; x <= startX + width * 2; x++) {
        c.set(x, y, 6);
      }
    }

    // Canopy layer 2 (middle tier)
    for (let row = 0; row < 5; row++) {
      const width = 10 - row * 2;
      const startX = 16 - width;
      const y = 14 + row;
      for (let x = startX; x <= startX + width * 2; x++) {
        c.set(x, y, 6);
      }
    }

    // Canopy layer 3 (top tier)
    for (let row = 0; row < 4; row++) {
      const width = 7 - row * 2;
      const startX = 16 - width;
      const y = 9 + row;
      for (let x = startX; x <= startX + width * 2; x++) {
        c.set(x, y, 6);
      }
    }

    // Top point
    c.set(16, 8, 6); c.set(16, 7, 7); c.set(15, 9, 7); c.set(17, 9, 7);

    // Shading: light from upper-left
    // Left side of each tier gets lighter, right side darker
    // Bottom tier shading
    for (let row = 0; row < 6; row++) {
      const width = 13 - row * 2;
      const startX = 16 - width;
      const y = 20 + row;
      for (let i = 0; i < Math.floor(width * 0.4); i++) {
        if (c.get(startX + i, y) === 6) c.set(startX + i, y, 8);
      }
      for (let i = Math.ceil(width * 0.7); i <= width * 2; i++) {
        if (c.get(startX + i, y) === 6) c.set(startX + i, y, 5);
      }
    }
    // Middle tier shading
    for (let row = 0; row < 5; row++) {
      const width = 10 - row * 2;
      const startX = 16 - width;
      const y = 14 + row;
      for (let i = 0; i < Math.floor(width * 0.4); i++) {
        if (c.get(startX + i, y) === 6) c.set(startX + i, y, 8);
      }
      for (let i = Math.ceil(width * 0.65); i <= width * 2; i++) {
        if (c.get(startX + i, y) === 6) c.set(startX + i, y, 5);
      }
    }
    // Top tier shading
    for (let row = 0; row < 4; row++) {
      const width = 7 - row * 2;
      const startX = 16 - width;
      const y = 9 + row;
      for (let i = 0; i < Math.floor(width * 0.35); i++) {
        if (c.get(startX + i, y) === 6) c.set(startX + i, y, 9);
      }
      for (let i = Math.ceil(width * 0.6); i <= width * 2; i++) {
        if (c.get(startX + i, y) === 6) c.set(startX + i, y, 5);
      }
    }

    // Snow caps on branches (white/light on upper edges of each tier)
    // Bottom tier snow
    c.set(5, 20, 11); c.set(6, 20, 11); c.set(7, 21, 10); c.set(8, 21, 10);
    c.set(25, 20, 11); c.set(26, 20, 11); c.set(24, 21, 10); c.set(23, 21, 10);
    // Middle tier snow
    c.set(8, 14, 11); c.set(9, 14, 11); c.set(10, 15, 10);
    c.set(23, 14, 11); c.set(24, 14, 11); c.set(22, 15, 10);
    // Top tier snow
    c.set(11, 9, 11); c.set(12, 9, 10); c.set(20, 9, 11); c.set(21, 9, 10);
    c.set(15, 7, 11); c.set(16, 7, 11); c.set(17, 7, 11);

    // Trunk (brown, visible below lowest tier)
    for (let y = 25; y <= 31; y++) {
      const hw = 2;
      for (let x = 16 - hw; x <= 16 + hw; x++) {
        c.set(x, y, 19);
      }
    }
    // Trunk highlight/shadow
    c.set(14, 26, 23); c.set(14, 27, 22); c.set(14, 28, 21);
    c.set(18, 26, 17); c.set(18, 27, 17); c.set(18, 28, 18);

    // Snow on ground around base
    c.set(11, 30, 11); c.set(12, 30, 10); c.set(20, 30, 10); c.set(21, 30, 11);

    c.outline(O);
    return c.frame();
  },

  // ==================== ICICLES (Snow decoration) ====================

  icicleHang: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);

    // Ice/snow ledge at top (horizontal bar)
    for (let x = 2; x < 30; x++) {
      c.set(x, 3, 7);
      c.set(x, 4, 6);
    }
    // Ledge irregularity
    c.set(1, 3, 7); c.set(1, 4, 6); c.set(30, 3, 7); c.set(30, 4, 6);
    c.set(0, 4, 5); c.set(31, 4, 5);

    // Ledge highlight (top edge bright)
    for (let x = 3; x < 29; x += 3) {
      c.set(x, 3, 10);
    }
    c.set(5, 3, 11); c.set(15, 3, 12); c.set(25, 3, 11);

    // Icicles hanging down at various lengths
    // Long icicles
    c.line(5, 5, 5, 18, 8);
    c.line(6, 5, 6, 14, 7);
    c.line(12, 5, 12, 22, 8);
    c.line(13, 5, 13, 16, 7);
    c.line(20, 5, 20, 20, 8);
    c.line(21, 5, 21, 15, 7);
    c.line(26, 5, 26, 16, 8);
    c.line(27, 5, 27, 12, 7);

    // Medium icicles
    c.line(8, 5, 8, 11, 7);
    c.line(17, 5, 17, 13, 7);
    c.line(24, 5, 24, 10, 7);

    // Short icicles
    c.line(3, 5, 3, 8, 6);
    c.line(10, 5, 10, 9, 6);
    c.line(15, 5, 15, 10, 6);
    c.line(23, 5, 23, 8, 6);
    c.line(29, 5, 29, 7, 6);

    // Icicle tips (brightest point at the tip)
    c.set(5, 18, 12); c.set(12, 22, 12); c.set(20, 20, 12); c.set(26, 16, 12);
    c.set(6, 14, 11); c.set(13, 16, 11); c.set(21, 15, 11); c.set(27, 12, 11);

    // Shadow side of icicles (right-facing pixels darker)
    c.set(6, 5, 6); c.set(13, 5, 6); c.set(21, 5, 6); c.set(27, 5, 6);
    for (let y = 6; y < 18; y++) { if (c.get(6, y) !== 0 && c.get(6, y) > 5) c.set(6, y, c.get(6, y) - 1); }
    for (let y = 6; y < 16; y++) { if (c.get(13, y) !== 0 && c.get(13, y) > 5) c.set(13, y, c.get(13, y) - 1); }
    for (let y = 6; y < 20; y++) { if (c.get(21, y) !== 0 && c.get(21, y) > 5) c.set(21, y, c.get(21, y) - 1); }
    for (let y = 6; y < 16; y++) { if (c.get(27, y) !== 0 && c.get(27, y) > 5) c.set(27, y, c.get(27, y) - 1); }

    c.outline(O);
    return c.frame();
  },

  // ==================== RUINS TILES ====================

  brokenStone1: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Cracked stone slab with void/purple tint
    c.rect(4, 6, 24, 20, 5);
    // Irregular edges
    c.set(3, 8, 5); c.set(3, 12, 5); c.set(3, 16, 5); c.set(3, 20, 5);
    c.set(28, 7, 5); c.set(28, 11, 5); c.set(28, 15, 5); c.set(28, 19, 5);
    c.set(5, 5, 5); c.set(10, 5, 5); c.set(18, 5, 5); c.set(24, 5, 5);
    c.set(6, 26, 5); c.set(14, 26, 5); c.set(22, 26, 5);
    // Faceted shading
    for (let y = 6; y < 26; y++) {
      for (let x = 4; x < 28; x++) {
        if (c.get(x, y) === 5) {
          if (x < 14 && y < 16) c.set(x, y, 7);
          else if (x > 20 && y > 16) c.set(x, y, 3);
          else if (x > 18) c.set(x, y, 4);
        }
      }
    }
    // Crack lines
    c.line(14, 7, 10, 14, 2); c.line(10, 14, 16, 20, 2);
    c.line(16, 20, 22, 24, 2); c.line(8, 10, 6, 18, 3);
    // Chipped corners
    c.set(4, 6, 0); c.set(5, 6, 0); c.set(27, 6, 0); c.set(28, 6, 0);
    c.set(4, 25, 0); c.set(5, 25, 0); c.set(27, 25, 0);
    // Void crystal specks
    c.set(12, 10, 9); c.set(22, 14, 8); c.set(16, 18, 9);
    c.set(9, 20, 8); c.set(24, 10, 9);
    // Edge highlight
    c.set(6, 7, 8); c.set(7, 7, 8); c.set(8, 6, 8);
    c.outline(O);
    return c.frame();
  },

  brokenStone2: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Different break pattern — more fragmented
    c.rect(3, 8, 26, 16, 5);
    // Fragmented pieces
    c.rect(6, 4, 8, 5, 5);
    c.rect(18, 3, 7, 4, 5);
    c.rect(2, 25, 10, 4, 5);
    c.rect(20, 24, 9, 5, 5);
    // Shading
    for (let y = 4; y < 29; y++) {
      for (let x = 2; x < 29; x++) {
        if (c.get(x, y) === 5) {
          const dist = Math.sqrt((x - 14) * (x - 14) + (y - 16) * (y - 16));
          if (dist < 8) c.set(x, y, 7);
          else if (dist > 14) c.set(x, y, 3);
        }
      }
    }
    // Heavy cracks
    c.line(8, 4, 12, 12, 2); c.line(12, 12, 8, 22, 2);
    c.line(20, 3, 24, 10, 2); c.line(24, 10, 20, 18, 2);
    c.line(4, 26, 10, 20, 2); c.line(22, 24, 26, 18, 2);
    // Void glow specks
    c.set(10, 10, 9); c.set(20, 14, 8); c.set(14, 20, 9);
    c.set(6, 14, 8); c.set(24, 8, 9); c.set(16, 6, 8);
    c.outline(O);
    return c.frame();
  },

  rubblePile: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Pile of broken stone fragments at bottom of tile
    // Individual rocks of varying sizes
    // Rock 1 (large, left)
    c.ellipse(8, 25, 6, 4, 5);
    // Rock 2 (large, center-right)
    c.ellipse(20, 26, 7, 3, 5);
    // Rock 3 (medium, center)
    c.ellipse(15, 28, 4, 2, 5);
    // Rock 4 (small, far left)
    c.ellipse(3, 28, 3, 2, 4);
    // Rock 5 (small, far right)
    c.ellipse(28, 27, 3, 2, 4);
    // Rock 6 (tiny fragments)
    c.set(12, 29, 4); c.set(13, 29, 4); c.set(25, 29, 4); c.set(26, 29, 4);
    c.set(6, 29, 3); c.set(23, 28, 3);
    // Shading on each rock
    for (let y = 21; y < 30; y++) {
      for (let x = 0; x < 32; x++) {
        if (c.get(x, y) === 5) {
          if (x < 12) c.set(x, y, 7);
          else if (x > 22) c.set(x, y, 3);
        }
        if (c.get(x, y) === 4) {
          if (x < 8) c.set(x, y, 6);
          else c.set(x, y, 3);
        }
      }
    }
    // Highlights
    c.set(5, 23, 8); c.set(6, 23, 8); c.set(17, 24, 8);
    c.set(18, 24, 8); c.set(3, 27, 6); c.set(27, 26, 6);
    // Void specks
    c.set(9, 25, 8); c.set(21, 26, 8); c.set(14, 28, 7);
    c.outline(O);
    return c.frame();
  },

  ancientDoorway: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Stone arch doorway frame
    // Arch shape
    c.rect(8, 4, 16, 24, 5);
    // Rounded arch top
    c.set(8, 4, 5); c.set(9, 3, 5); c.set(10, 2, 5);
    c.set(11, 1, 5); c.set(12, 1, 5); c.set(13, 0, 5);
    c.set(14, 0, 5); c.set(15, 0, 5); c.set(16, 0, 5);
    c.set(17, 0, 5); c.set(18, 0, 5); c.set(19, 1, 5);
    c.set(20, 1, 5); c.set(21, 2, 5); c.set(22, 3, 5);
    c.set(23, 4, 5);
    // Door opening (dark inside)
    c.rect(12, 6, 8, 22, 0);
    // Inner darkness gradient
    for (let y = 6; y < 28; y++) {
      for (let x = 12; x < 20; x++) {
        const depth = Math.min(3, Math.floor((y - 6) / 7));
        c.set(x, y, depth);
      }
    }
    // Stone frame shading (light from left)
    for (let y = 2; y < 28; y++) {
      for (let x = 8; x < 12; x++) {
        if (c.get(x, y) === 5) c.set(x, y, 7);
      }
      for (let x = 20; x < 24; x++) {
        if (c.get(x, y) === 5) c.set(x, y, 3);
      }
    }
    // Arch highlight
    c.set(9, 3, 8); c.set(10, 2, 8); c.set(11, 1, 7);
    c.set(13, 0, 8); c.set(14, 0, 9); c.set(15, 0, 9);
    c.set(16, 0, 9); c.set(17, 0, 8); c.set(18, 0, 7);
    // Door frame inner edge
    c.set(12, 6, 6); c.set(12, 7, 6); c.set(12, 8, 5);
    c.set(19, 6, 4); c.set(19, 7, 4); c.set(19, 8, 4);
    // Void runes carved into frame
    c.set(10, 12, 8); c.set(10, 13, 8); c.set(21, 14, 8); c.set(21, 15, 8);
    c.set(10, 20, 7); c.set(21, 10, 7);
    // Base/steps
    c.rect(6, 28, 20, 3, 4);
    c.set(6, 28, 5); c.set(7, 28, 6); c.set(8, 28, 7);
    c.outline(O);
    return c.frame();
  },

  crystalGlow: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Glowing void crystal cluster
    // Main crystal (tall, diagonal)
    c.line(14, 26, 12, 8, 7);
    c.line(15, 26, 13, 8, 7);
    c.line(16, 26, 14, 8, 6);
    // Crystal 2 (shorter, right)
    c.line(18, 26, 20, 14, 7);
    c.line(19, 26, 21, 14, 6);
    // Crystal 3 (small, left)
    c.line(10, 28, 8, 18, 6);
    // Crystal 4 (tiny, right)
    c.line(22, 27, 24, 20, 6);
    // Widen base
    c.set(13, 27, 7); c.set(14, 27, 7); c.set(15, 27, 7); c.set(16, 27, 7);
    c.set(17, 27, 7); c.set(18, 27, 7); c.set(19, 27, 7);
    c.set(12, 28, 5); c.set(13, 28, 6); c.set(14, 28, 6); c.set(15, 28, 6);
    c.set(16, 28, 6); c.set(17, 28, 6); c.set(18, 28, 6); c.set(19, 28, 6); c.set(20, 28, 5);
    // Facet shading (light from upper-left)
    c.set(12, 9, 10); c.set(13, 9, 9); c.set(14, 9, 8);
    c.set(12, 10, 9); c.set(13, 10, 8); c.set(11, 11, 9);
    c.set(20, 15, 9); c.set(21, 15, 8); c.set(20, 16, 8);
    // Shadow facets (right side)
    c.set(15, 9, 4); c.set(16, 9, 3); c.set(14, 10, 5);
    c.set(22, 15, 4); c.set(21, 16, 4);
    // Glow aura around crystals (sparse bright pixels)
    c.set(11, 7, 9); c.set(17, 7, 9); c.set(10, 12, 8);
    c.set(22, 13, 8); c.set(7, 17, 8); c.set(25, 19, 8);
    c.set(13, 6, 8); c.set(19, 12, 8);
    // Bright tips
    c.set(12, 8, 12); c.set(13, 8, 11); c.set(20, 14, 11);
    c.set(21, 14, 10); c.set(8, 18, 10);
    // Ground glow reflection
    c.set(10, 29, 8); c.set(14, 29, 9); c.set(18, 29, 8);
    c.set(22, 28, 8); c.set(12, 30, 7); c.set(17, 30, 7);
    c.outline(O);
    return c.frame();
  },

  // ==================== HOLY CITY TILES ====================

  angelStatueBase: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Statue pedestal/base made of white/gold marble
    // Main pedestal block
    c.rect(10, 16, 12, 14, 5);
    // Top decorative cap (wider)
    c.rect(8, 14, 16, 3, 6);
    // Base step (wider at bottom)
    c.rect(7, 28, 18, 3, 4);
    // Shading: light from upper-left
    for (let y = 14; y < 30; y++) {
      for (let x = 7; x < 25; x++) {
        if (c.get(x, y) === 6) {
          if (x < 14) c.set(x, y, 9);
          else if (x > 20) c.set(x, y, 4);
        }
        if (c.get(x, y) === 5) {
          if (x < 15) c.set(x, y, 8);
          else if (x > 19) c.set(x, y, 3);
        }
        if (c.get(x, y) === 4) {
          if (x < 14) c.set(x, y, 6);
          else c.set(x, y, 2);
        }
      }
    }
    // Gold trim on edges
    c.set(8, 14, 11); c.set(9, 14, 12); c.set(10, 14, 11);
    c.set(22, 14, 11); c.set(23, 14, 12);
    c.set(10, 16, 10); c.set(10, 17, 10); c.set(10, 18, 9);
    c.set(21, 16, 9); c.set(21, 17, 9);
    // Carved detail lines (vertical grooves)
    c.line(14, 17, 14, 27, 4);
    c.line(18, 17, 18, 27, 4);
    // Angel feet on top (subtle suggestion)
    c.set(12, 14, 7); c.set(13, 14, 7); c.set(14, 14, 7);
    c.set(17, 14, 7); c.set(18, 14, 7); c.set(19, 14, 7);
    // Specular highlights
    c.set(9, 15, 13); c.set(11, 15, 12);
    c.set(8, 28, 8); c.set(9, 28, 7);
    c.outline(O);
    return c.frame();
  },

  floatingPlatform: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Floating stone platform (hovering, with glow underneath)
    // Main platform surface
    c.ellipse(16, 16, 12, 5, 5);
    // Platform thickness (visible on sides)
    c.rect(6, 17, 20, 3, 4);
    // Underside
    for (let x = 7; x < 25; x++) {
      const dip = Math.floor(Math.sin((x - 7) * 0.4) * 2);
      c.set(x, 20 + dip, 3);
    }
    // Surface shading (light from above-left)
    for (let y = 11; y < 18; y++) {
      for (let x = 4; x < 28; x++) {
        if (c.get(x, y) === 5) {
          if (x < 14 && y < 15) c.set(x, y, 9);
          else if (x > 18 || y > 16) c.set(x, y, 3);
        }
      }
    }
    // Golden edge trim
    c.set(6, 14, 10); c.set(7, 13, 11); c.set(8, 12, 11);
    c.set(25, 14, 10); c.set(24, 13, 11); c.set(23, 12, 11);
    c.set(5, 15, 9); c.set(26, 15, 9);
    // Magic glow beneath platform (floating effect)
    c.set(10, 23, 8); c.set(11, 24, 8); c.set(12, 24, 7);
    c.set(14, 25, 8); c.set(15, 26, 9); c.set(16, 26, 9);
    c.set(17, 25, 8); c.set(19, 24, 8); c.set(20, 24, 7);
    c.set(21, 23, 8);
    // Glow particles (sparse)
    c.set(8, 22, 7); c.set(13, 27, 8); c.set(18, 27, 8); c.set(23, 22, 7);
    // Surface rune markings
    c.set(13, 15, 11); c.set(14, 14, 12); c.set(15, 15, 11);
    c.set(17, 15, 11); c.set(18, 14, 11);
    // Highlight specular
    c.set(9, 13, 12); c.set(10, 12, 13);
    c.outline(O);
    return c.frame();
  },

  goldenPillar: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Tall ornate golden pillar/column
    // Main shaft
    for (let y = 4; y <= 28; y++) {
      const hw = 3;
      for (let x = 16 - hw; x <= 16 + hw; x++) {
        c.set(x, y, 5);
      }
    }
    // Capital (top decoration)
    c.rect(11, 1, 10, 4, 6);
    c.rect(12, 0, 8, 2, 7);
    // Base (bottom)
    c.rect(11, 27, 10, 4, 4);
    c.rect(12, 29, 8, 2, 3);
    // Shaft fluting (vertical grooves)
    c.line(13, 5, 13, 26, 4);
    c.line(16, 5, 16, 26, 4);
    c.line(19, 5, 19, 26, 4);
    // Shading: cylindrical, light from left
    for (let y = 5; y < 27; y++) {
      c.set(13, y, 8); c.set(14, y, 9);
      c.set(15, y, 10); c.set(16, y, 9);
      c.set(17, y, 7); c.set(18, y, 5); c.set(19, y, 4);
    }
    // Capital shading
    c.set(12, 1, 10); c.set(13, 1, 11); c.set(14, 1, 12);
    c.set(15, 1, 11); c.set(16, 1, 10); c.set(17, 1, 9);
    c.set(18, 1, 8); c.set(19, 1, 7);
    c.set(13, 0, 11); c.set(14, 0, 12); c.set(15, 0, 12);
    c.set(16, 0, 12); c.set(17, 0, 11); c.set(18, 0, 10);
    // Base shading
    c.set(12, 27, 7); c.set(13, 27, 8); c.set(14, 27, 9);
    c.set(18, 27, 4); c.set(19, 27, 3);
    // Gold specular highlights
    c.set(14, 5, 13); c.set(14, 15, 13); c.set(14, 25, 12);
    c.set(13, 10, 12); c.set(15, 8, 11);
    c.outline(O);
    return c.frame();
  },

  thronePlatform: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Elevated throne dais/platform with steps
    // Top platform surface
    c.rect(6, 10, 20, 10, 5);
    // Steps (3 tiers going down)
    c.rect(4, 20, 24, 3, 4);
    c.rect(2, 23, 28, 3, 3);
    c.rect(0, 26, 32, 5, 2);
    // Back of platform (raised edge)
    c.rect(6, 8, 20, 3, 6);
    // Surface shading (light from upper-left)
    for (let y = 10; y < 20; y++) {
      for (let x = 6; x < 26; x++) {
        if (c.get(x, y) === 5) {
          if (x < 15) c.set(x, y, 9);
          else if (x > 20) c.set(x, y, 3);
          else c.set(x, y, 7);
        }
      }
    }
    // Step shading
    for (let x = 4; x < 28; x++) {
      if (x < 14) { c.set(x, 20, 7); c.set(x, 23, 6); c.set(x, 26, 5); }
      else if (x > 20) { c.set(x, 20, 3); c.set(x, 23, 2); c.set(x, 26, 1); }
    }
    // Back railing/edge
    c.set(6, 8, 10); c.set(7, 8, 11); c.set(8, 8, 12);
    c.set(23, 8, 10); c.set(24, 8, 11);
    // Gold trim on platform edge
    for (let x = 6; x < 26; x++) {
      c.set(x, 10, Math.random() < 0.3 ? 11 : 10);
    }
    c.set(6, 10, 12); c.set(7, 10, 13); c.set(25, 10, 11);
    // Throne impression on platform (center area slightly recessed)
    c.set(14, 12, 6); c.set(15, 12, 6); c.set(16, 12, 6); c.set(17, 12, 6);
    c.set(14, 13, 7); c.set(15, 13, 7); c.set(16, 13, 7); c.set(17, 13, 7);
    // Carpet/rug on steps (red-gold accent using warm colors)
    c.set(10, 21, 11); c.set(11, 21, 12); c.set(12, 21, 11);
    c.set(18, 21, 11); c.set(19, 21, 12); c.set(20, 21, 11);
    c.set(8, 24, 10); c.set(9, 24, 11); c.set(10, 24, 10);
    c.set(20, 24, 10); c.set(21, 24, 11); c.set(22, 24, 10);
    // Pillars on back edge
    c.set(8, 5, 6); c.set(8, 6, 6); c.set(8, 7, 6);
    c.set(23, 5, 6); c.set(23, 6, 6); c.set(23, 7, 6);
    c.set(8, 5, 9); c.set(8, 6, 8); c.set(23, 5, 9); c.set(23, 6, 8);
    // Specular
    c.set(7, 11, 12); c.set(8, 11, 13);
    c.outline(O);
    return c.frame();
  },

  glowingRune: (): SpriteFrame => {
    const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
    // Ground tile with glowing magical rune symbol
    // Base floor (holy ground texture)
    c.rect(0, 0, TILE_SIZE, TILE_SIZE, 5);
    c.dither(0, 0, TILE_SIZE, TILE_SIZE, 5, 6);
    // Rune circle (outer ring)
    c.circle(16, 16, 10, 8);
    c.circle(16, 16, 9, 0); // hollow it out
    // Inner circle
    c.circle(16, 16, 6, 8);
    c.circle(16, 16, 5, 0);
    // Rune symbol inside (angular magical pattern)
    // Vertical line with branches
    c.line(16, 11, 16, 21, 10);
    // Top chevron
    c.line(16, 11, 12, 14, 10);
    c.line(16, 11, 20, 14, 10);
    // Middle horizontal bars
    c.line(13, 16, 19, 16, 10);
    c.line(14, 18, 18, 18, 10);
    // Bottom diamond
    c.line(16, 21, 13, 24, 10);
    c.line(16, 21, 19, 24, 10);
    // Diagonal accents
    c.line(12, 14, 14, 16, 9);
    c.line(20, 14, 18, 16, 9);
    // Glow effect around rune (bright halo)
    c.set(5, 16, 9); c.set(6, 14, 8); c.set(6, 18, 8);
    c.set(26, 16, 9); c.set(25, 14, 8); c.set(25, 18, 8);
    c.set(16, 4, 9); c.set(14, 5, 8); c.set(18, 5, 8);
    c.set(16, 28, 9); c.set(14, 27, 8); c.set(18, 27, 8);
    // Brightest points (core of glow)
    c.set(16, 11, 13); c.set(16, 21, 13); c.set(12, 14, 12);
    c.set(20, 14, 12); c.set(13, 16, 12); c.set(19, 16, 12);
    c.set(16, 16, 14); // center brightest
    // Scattered magic dust
    c.set(4, 10, 8); c.set(28, 12, 8); c.set(6, 24, 8);
    c.set(26, 22, 8); c.set(10, 4, 8); c.set(22, 6, 8);
    c.set(3, 18, 7); c.set(29, 18, 7); c.set(16, 2, 8);
    c.set(16, 30, 8);
    // Subtle noise on floor areas outside rune
    c.addNoise(0.02, [5, 6, 7]);
    c.outline(O);
    return c.frame();
  },
};

// ==================== SPRITE REGISTRY (Player Characters, etc.) ====================

export const SpriteRegistry: Record<string, () => SpriteFrame> = {

  playerDown: (): SpriteFrame => {
    const c = new PixelCanvas(16, 24);
    // Based on Celeste/Pedro Medeiros principles:
    // Clear silhouette, essential detail only, readable at small size
    // Hair: distinctive shape (index 4 = dark)
    c.set(5, 0, 4); c.set(6, 0, 4); c.set(7, 0, 4); c.set(8, 0, 4); c.set(9, 0, 4);
    c.set(4, 1, 4); c.set(5, 1, 4); c.set(6, 1, 4); c.set(7, 1, 4); c.set(8, 1, 4); c.set(9, 1, 4); c.set(10, 1, 4);
    c.set(4, 2, 4); c.set(5, 2, 4); c.set(6, 2, 4); c.set(7, 2, 4); c.set(8, 2, 4); c.set(9, 2, 4); c.set(10, 2, 4);
    c.set(5, 3, 4); c.set(6, 3, 4); c.set(7, 3, 4); c.set(8, 3, 4); c.set(9, 3, 4);
    // Face: skin tone (index 8)
    c.set(5, 4, 8); c.set(6, 4, 8); c.set(7, 4, 8); c.set(8, 4, 8); c.set(9, 4, 8); c.set(10, 4, 8);
    c.set(5, 5, 8); c.set(6, 5, 8); c.set(7, 5, 8); c.set(8, 5, 8); c.set(9, 5, 8); c.set(10, 5, 8);
    // Eyes: 2px each with 1px white highlight
    c.set(6, 5, 1); c.set(7, 5, 1);   // left eye
    c.set(9, 5, 1); c.set(10, 5, 1);   // right eye
    c.set(6, 5, 14);                    // left eye highlight
    c.set(9, 5, 14);                    // right eye highlight
    // Mouth: simple line
    c.set(7, 7, 1); c.set(8, 7, 1);
    // Neck
    c.set(6, 8, 8); c.set(7, 8, 8); c.set(8, 8, 8); c.set(9, 8, 8);
    // Body/Tunic (index 6 = blue-gray clothing)
    c.set(4, 9, 6); c.set(5, 9, 6); c.set(6, 9, 6); c.set(7, 9, 6); c.set(8, 9, 6); c.set(9, 9, 6); c.set(10, 9, 6); c.set(11, 9, 6);
    c.set(3, 10, 6); c.set(4, 10, 6); c.set(5, 10, 6); c.set(6, 10, 6); c.set(7, 10, 6); c.set(8, 10, 6); c.set(9, 10, 6); c.set(10, 10, 6); c.set(11, 10, 6); c.set(12, 10, 6);
    c.set(3, 11, 6); c.set(4, 11, 6); c.set(5, 11, 6); c.set(6, 11, 6); c.set(7, 11, 6); c.set(8, 11, 6); c.set(9, 11, 6); c.set(10, 11, 6); c.set(11, 11, 6); c.set(12, 11, 6);
    c.set(4, 12, 6); c.set(5, 12, 6); c.set(6, 12, 6); c.set(7, 12, 6); c.set(8, 12, 6); c.set(9, 12, 6); c.set(10, 12, 6); c.set(11, 12, 6);
    c.set(4, 13, 6); c.set(5, 13, 6); c.set(6, 13, 6); c.set(7, 13, 6); c.set(8, 13, 6); c.set(9, 13, 6); c.set(10, 13, 6); c.set(11, 13, 6);
    // Arms (at sides)
    c.set(2, 10, 6); c.set(2, 11, 6); c.set(2, 12, 6); c.set(2, 13, 6);
    c.set(13, 10, 6); c.set(13, 11, 6); c.set(13, 12, 6); c.set(13, 13, 6);
    // Hands
    c.set(2, 14, 8); c.set(13, 14, 8);
    // Pants/Legs (index 5 = darker for contrast)
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
    // Hair (back of head visible)
    c.set(5, 0, 4); c.set(6, 0, 4); c.set(7, 0, 4); c.set(8, 0, 4); c.set(9, 0, 4);
    c.set(4, 1, 4); c.set(5, 1, 4); c.set(6, 1, 4); c.set(7, 1, 4); c.set(8, 1, 4); c.set(9, 1, 4); c.set(10, 1, 4);
    c.set(4, 2, 4); c.set(5, 2, 4); c.set(6, 2, 4); c.set(7, 2, 4); c.set(8, 2, 4); c.set(9, 2, 4); c.set(10, 2, 4);
    c.set(5, 3, 4); c.set(6, 3, 4); c.set(7, 3, 4); c.set(8, 3, 4); c.set(9, 3, 4);
    // Head back
    c.set(5, 4, 8); c.set(6, 4, 8); c.set(7, 4, 8); c.set(8, 4, 8); c.set(9, 4, 8); c.set(10, 4, 8);
    c.set(5, 5, 8); c.set(6, 5, 8); c.set(7, 5, 8); c.set(8, 5, 8); c.set(9, 5, 8); c.set(10, 5, 8);
    c.set(5, 6, 8); c.set(6, 6, 8); c.set(7, 6, 8); c.set(8, 6, 8); c.set(9, 6, 8); c.set(10, 6, 8);
    c.set(5, 7, 8); c.set(6, 7, 8); c.set(7, 7, 8); c.set(8, 7, 8); c.set(9, 7, 8); c.set(10, 7, 8);
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

  playerLeft: (): SpriteFrame => {
    const c = new PixelCanvas(16, 24);
    // Hair (side profile facing left)
    c.set(3, 0, 4); c.set(4, 0, 4); c.set(5, 0, 4); c.set(6, 0, 4); c.set(7, 0, 4); c.set(8, 0, 4);
    c.set(2, 1, 4); c.set(3, 1, 4); c.set(4, 1, 4); c.set(5, 1, 4); c.set(6, 1, 4); c.set(7, 1, 4); c.set(8, 1, 4); c.set(9, 1, 4);
    c.set(2, 2, 4); c.set(3, 2, 4); c.set(4, 2, 4); c.set(5, 2, 4); c.set(6, 2, 4); c.set(7, 2, 4); c.set(8, 2, 4); c.set(9, 2, 4);
    c.set(3, 3, 4); c.set(4, 3, 4); c.set(5, 3, 4); c.set(6, 3, 4); c.set(7, 3, 4); c.set(8, 3, 4);
    // Face (side view)
    c.set(2, 4, 8); c.set(3, 4, 8); c.set(4, 4, 8); c.set(5, 4, 8); c.set(6, 4, 8); c.set(7, 4, 8);
    c.set(2, 5, 8); c.set(3, 5, 8); c.set(4, 5, 8); c.set(5, 5, 8); c.set(6, 5, 8); c.set(7, 5, 8);
    // Eye (side view: 1px)
    c.set(3, 5, 1); c.set(3, 5, 14);
    // Mouth
    c.set(3, 7, 1);
    // Neck
    c.set(4, 8, 8); c.set(5, 8, 8); c.set(6, 8, 8); c.set(7, 8, 8);
    // Body
    c.set(3, 9, 6); c.set(4, 9, 6); c.set(5, 9, 6); c.set(6, 9, 6); c.set(7, 9, 6); c.set(8, 9, 6); c.set(9, 9, 6); c.set(10, 9, 6);
    c.set(2, 10, 6); c.set(3, 10, 6); c.set(4, 10, 6); c.set(5, 10, 6); c.set(6, 10, 6); c.set(7, 10, 6); c.set(8, 10, 6); c.set(9, 10, 6); c.set(10, 10, 6); c.set(11, 10, 6);
    c.set(2, 11, 6); c.set(3, 11, 6); c.set(4, 11, 6); c.set(5, 11, 6); c.set(6, 11, 6); c.set(7, 11, 6); c.set(8, 11, 6); c.set(9, 11, 6); c.set(10, 11, 6); c.set(11, 11, 6);
    c.set(3, 12, 6); c.set(4, 12, 6); c.set(5, 12, 6); c.set(6, 12, 6); c.set(7, 12, 6); c.set(8, 12, 6); c.set(9, 12, 6); c.set(10, 12, 6);
    c.set(3, 13, 6); c.set(4, 13, 6); c.set(5, 13, 6); c.set(6, 13, 6); c.set(7, 13, 6); c.set(8, 13, 6); c.set(9, 13, 6); c.set(10, 13, 6);
    // Arms
    c.set(1, 10, 6); c.set(1, 11, 6); c.set(1, 12, 6); c.set(1, 13, 6);
    c.set(12, 10, 6); c.set(12, 11, 6); c.set(12, 12, 6); c.set(12, 13, 6);
    c.set(1, 14, 8); c.set(12, 14, 8);
    // Pants
    c.set(4, 14, 5); c.set(5, 14, 5); c.set(6, 14, 5); c.set(7, 14, 5); c.set(8, 14, 5); c.set(9, 14, 5);
    c.set(4, 15, 5); c.set(5, 15, 5); c.set(6, 15, 5); c.set(7, 15, 5); c.set(8, 15, 5); c.set(9, 15, 5);
    c.set(4, 16, 5); c.set(5, 16, 5); c.set(6, 16, 5); c.set(7, 16, 5); c.set(8, 16, 5); c.set(9, 16, 5);
    c.set(4, 17, 5); c.set(5, 17, 5); c.set(6, 17, 5); c.set(7, 17, 5); c.set(8, 17, 5); c.set(9, 17, 5);
    c.set(4, 18, 5); c.set(5, 18, 5); c.set(6, 18, 5); c.set(7, 18, 5); c.set(8, 18, 5); c.set(9, 18, 5);
    // Feet
    c.set(4, 19, 4); c.set(5, 19, 4); c.set(6, 19, 4); c.set(7, 19, 4);
    c.set(8, 19, 4); c.set(9, 19, 4); c.set(10, 19, 4);
    c.set(4, 20, 4); c.set(5, 20, 4); c.set(6, 20, 4); c.set(7, 20, 4);
    c.set(8, 20, 4); c.set(9, 20, 4); c.set(10, 20, 4);
    c.outline(O);
    return c.frame();
  },

  playerRight: (): SpriteFrame => {
    const c = new PixelCanvas(16, 24);
    // Mirror of playerLeft
    c.set(7, 0, 4); c.set(8, 0, 4); c.set(9, 0, 4); c.set(10, 0, 4); c.set(11, 0, 4); c.set(12, 0, 4);
    c.set(6, 1, 4); c.set(7, 1, 4); c.set(8, 1, 4); c.set(9, 1, 4); c.set(10, 1, 4); c.set(11, 1, 4); c.set(12, 1, 4); c.set(13, 1, 4);
    c.set(6, 2, 4); c.set(7, 2, 4); c.set(8, 2, 4); c.set(9, 2, 4); c.set(10, 2, 4); c.set(11, 2, 4); c.set(12, 2, 4); c.set(13, 2, 4);
    c.set(7, 3, 4); c.set(8, 3, 4); c.set(9, 3, 4); c.set(10, 3, 4); c.set(11, 3, 4); c.set(12, 3, 4);
    // Face
    c.set(9, 4, 8); c.set(10, 4, 8); c.set(11, 4, 8); c.set(12, 4, 8); c.set(13, 4, 8); c.set(14, 4, 8);
    c.set(9, 5, 8); c.set(10, 5, 8); c.set(11, 5, 8); c.set(12, 5, 8); c.set(13, 5, 8); c.set(14, 5, 8);
    // Eye
    c.set(12, 5, 1); c.set(12, 5, 14);
    // Mouth
    c.set(12, 7, 1);
    // Neck
    c.set(8, 8, 8); c.set(9, 8, 8); c.set(10, 8, 8); c.set(11, 8, 8);
    // Body
    c.set(5, 9, 6); c.set(6, 9, 6); c.set(7, 9, 6); c.set(8, 9, 6); c.set(9, 9, 6); c.set(10, 9, 6); c.set(11, 9, 6); c.set(12, 9, 6);
    c.set(4, 10, 6); c.set(5, 10, 6); c.set(6, 10, 6); c.set(7, 10, 6); c.set(8, 10, 6); c.set(9, 10, 6); c.set(10, 10, 6); c.set(11, 10, 6); c.set(12, 10, 6); c.set(13, 10, 6);
    c.set(4, 11, 6); c.set(5, 11, 6); c.set(6, 11, 6); c.set(7, 11, 6); c.set(8, 11, 6); c.set(9, 11, 6); c.set(10, 11, 6); c.set(11, 11, 6); c.set(12, 11, 6); c.set(13, 11, 6);
    c.set(5, 12, 6); c.set(6, 12, 6); c.set(7, 12, 6); c.set(8, 12, 6); c.set(9, 12, 6); c.set(10, 12, 6); c.set(11, 12, 6); c.set(12, 12, 6);
    c.set(5, 13, 6); c.set(6, 13, 6); c.set(7, 13, 6); c.set(8, 13, 6); c.set(9, 13, 6); c.set(10, 13, 6); c.set(11, 13, 6); c.set(12, 13, 6);
    // Arms
    c.set(3, 10, 6); c.set(3, 11, 6); c.set(3, 12, 6); c.set(3, 13, 6);
    c.set(14, 10, 6); c.set(14, 11, 6); c.set(14, 12, 6); c.set(14, 13, 6);
    c.set(3, 14, 8); c.set(14, 14, 8);
    // Pants
    c.set(6, 14, 5); c.set(7, 14, 5); c.set(8, 14, 5); c.set(9, 14, 5); c.set(10, 14, 5); c.set(11, 14, 5);
    c.set(6, 15, 5); c.set(7, 15, 5); c.set(8, 15, 5); c.set(9, 15, 5); c.set(10, 15, 5); c.set(11, 15, 5);
    c.set(6, 16, 5); c.set(7, 16, 5); c.set(8, 16, 5); c.set(9, 16, 5); c.set(10, 16, 5); c.set(11, 16, 5);
    c.set(6, 17, 5); c.set(7, 17, 5); c.set(8, 17, 5); c.set(9, 17, 5); c.set(10, 17, 5); c.set(11, 17, 5);
    c.set(6, 18, 5); c.set(7, 18, 5); c.set(8, 18, 5); c.set(9, 18, 5); c.set(10, 18, 5); c.set(11, 18, 5);
    // Feet
    c.set(6, 19, 4); c.set(7, 19, 4); c.set(8, 19, 4); c.set(9, 19, 4);
    c.set(10, 19, 4); c.set(11, 19, 4); c.set(12, 19, 4);
    c.set(6, 20, 4); c.set(7, 20, 4); c.set(8, 20, 4); c.set(9, 20, 4);
    c.set(10, 20, 4); c.set(11, 20, 4); c.set(12, 20, 4);
    c.outline(O);
    return c.frame();
  },
};

// ==================== TILE PALETTE MAPPING ====================

export const TilePalettes: Record<string, string[]> = {
  grass1: SP, grass2: SP, grass3: SP,
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

// ==================== HELPER FUNCTIONS ====================

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
