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

  set(x: number, y: number, c: number) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix >= 0 && ix < this.w && iy >= 0 && iy < this.h) {
      this.px[iy][ix] = c;
    }
  }

  get(x: number, y: number) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    return ix >= 0 && ix < this.w && iy >= 0 && iy < this.h ? this.px[iy][ix] : -1;
  }

  rect(x: number, y: number, w: number, h: number, c: number) {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++) this.set(x + dx, y + dy, c);
  }

  rectOutline(x: number, y: number, w: number, h: number, c: number) {
    for (let dx = 0; dx < w; dx++) { this.set(x + dx, y, c); this.set(x + dx, y + h - 1, c); }
    for (let dy = 0; dy < h; dy++) { this.set(x, y + dy, c); this.set(x + w - 1, y + dy, c); }
  }

  circle(cx: number, cy: number, r: number, c: number) {
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++)
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) this.set(x, y, c);
  }

  circleOutline(cx: number, cy: number, r: number, c: number) {
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++) {
        const d = (x - cx) ** 2 + (y - cy) ** 2;
        if (d <= r * r && d > (r - 1) * (r - 1)) this.set(x, y, c);
      }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: number) {
    for (let y = cy - ry; y <= cy + ry; y++)
      for (let x = cx - rx; x <= cx + rx; x++)
        if (rx > 0 && ry > 0 && ((x - cx) ** 2) / (rx * rx) + ((y - cy) ** 2) / (ry * ry) <= 1)
          this.set(x, y, c);
  }

  line(x1: number, y1: number, x2: number, y2: number, c: number) {
    let dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1), sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1, err = dx - dy, x = x1, y = y1;
    while (true) {
      this.set(x, y, c);
      if (x === x2 && y === y2) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }

  outline(oc: number) {
    const e: number[][] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (this.px[y][x] !== 0)
          for (const [a, b] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]) {
            const n = x + a, m = y + b;
            if (n >= 0 && n < this.w && m >= 0 && m < this.h && this.px[m][n] === 0) e.push([n, m]);
          }
    for (const [ex, ey] of e) if (this.px[ey][ex] === 0) this.px[ey][ex] = oc;
  }

  dither(x: number, y: number, w: number, h: number, c1: number, c2: number) {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++) {
        const p = x + dx, q = y + dy;
        if (p >= 0 && p < this.w && q >= 0 && q < this.h) this.set(p, q, (dx + dy) % 2 === 0 ? c1 : c2);
      }
  }

  replaceColor(oC: number, nC: number) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.px[y][x] === oC) this.px[y][x] = nC;
  }

  addNoise(x: number, y: number, w: number, h: number, c: number, prob: number) {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (Math.random() < prob) this.set(x + dx, y + dy, c);
  }

  shadeRegion(x: number, y: number, w: number, h: number, amount: number) {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) { const v = this.get(x + dx, y + dy); if (v > 0) this.set(x + dx, y + dy, Math.max(1, v + amount)); }
  }

  toFrame(): SpriteFrame {
    const data: number[][] = [];
    for (let y = 0; y < this.h; y++) data[y] = [...this.px[y]];
    return { width: this.w, height: this.h, data };
  }
}

function makeAnim(n: string, f: SpriteFrame[], fd: number, l: boolean) { return { name: n, frames: f, frameDuration: fd, loop: l }; }
function shiftFrame(f: SpriteFrame, dx: number, dy: number) {
  const c = new PixelCanvas(f.width, f.height);
  for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) { const v = f.data[y][x]; if (v !== 0) { const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < f.width && ny >= 0 && ny < f.height) c.px[ny][nx] = v; } }
  return c.toFrame();
}
function mirrorFrame(f: SpriteFrame) { const c = new PixelCanvas(f.width, f.height); for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) c.px[y][f.width - 1 - x] = f.data[y][x]; return c.toFrame(); }
function swapColorsFrame(f: SpriteFrame, s: number[]) { const c = new PixelCanvas(f.width, f.height); for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) c.px[y][x] = s[f.data[y][x]] !== undefined ? s[f.data[y][x]] : f.data[y][x]; return c.toFrame(); }
function flashFrame(f: SpriteFrame, fc: number) { const c = new PixelCanvas(f.width, f.height); for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) c.px[y][x] = f.data[y][x] !== 0 ? fc : 0; return c.toFrame(); }

// ===== CONSTANTS & PALETTES =====
const O = 1;

const PP = ["","#0a0a15","#1a1a3e","#2a2a5e","#3a3a7e","#4a4a8e","#5a5a9e","#6a6aae","#555555","#777777","#999999","#bbbbbb","#dddddd","#c4946a","#d4a47a","#e4b49a","#f4c4aa","#3a2a1a","#5a4a3a","#7a6a5a","#9a8a7a","#2a2a2a","#4a4a4a","#6a6a6a","#c0a040","#e0c060","#8040c0","#c080ff","#ff6060","#ffcc40"];

const SP = ["","#0a0a0a","#0a1a0a","#1a3a1a","#2a5a2a","#3a7a3a","#4a9a4a","#5aba5a","#7ada7a","#9afa9a","#b0ffb0","#ffff80","#ffffc0","#ffffff","#1a1a1a","#303030"];

const WP = ["","#0a0a0a","#1a1a1a","#2a2a2a","#3a3a3a","#4a4a4a","#5a5a5a","#6a6a6a","#7a7a7a","#8a8a8a","#9a9a9a","#bababa","#cacaca","#e0e0e0","#cc2020","#ff4040","#ffffff"];

const TP = ["","#0a0a0a","#1a0f0a","#2a180e","#3a2012","#4a2a16","#5a341a","#6a3e1e","#1a2a0a","#2a4a12","#3a6a1a","#4a8a22","#5aaa2a","#7aca42","#9aea62","#b0ff80","#ffee40","#ffff70","#c0a030","#1a1a08","#ffffff"];

const SCP = ["","#0a0a0a","#1a1008","#2a1810","#3a2018","#4a2820","#5a3028","#6a3830","#7a4038","#8a4840","#9a5048","#aa5850","#ba6058","#cc2020","#ff4040","#e0d0b0","#fff8e0","#ffffff"];

const MP = ["","#0a0a0a","#1a1a10","#2a2a18","#3a3a20","#4a4a28","#5a5a30","#6a6a38","#7a7a40","#8a8a48","#9a8a50","#babaa0","#dadac0","#eae8d8","#40ff40","#80ff80","#c0ffc0","#1a1a08","#2a2a10","#ffffff"];

const IP = ["","#0a0a0a","#0a1020","#0a1a2a","#1a2a3a","#1a3a4a","#2a4a5a","#3a6a7a","#4a8a9a","#6acada","#8aeaff","#aaffff","#d0f8ff","#ffffff","#80e0ff","#40c0ff","#c0e8ff"];

const VP = ["","#050508","#0a0a10","#0e0e18","#121220","#1a1830","#22203a","#2a2844","#32304e","#3a3858","#4a4070","#5a4888","#6a50a0","#7a58b8","#8a60d0","#9a68e8","#aa70ff","#ba88ff","#caa0ff","#eab8ff","#ffaaff","#ff80ff","#ff40ff","#cc20cc","#ffffff"];

const HKP = ["","#1a1a0a","#2a2a12","#3a3a1a","#8a7a10","#a09018","#c0a020","#d0b030","#e0c040","#f0d050","#ffe060","#fff080","#ffffa0","#ffffc0","#d0d0e0","#e0e8f0","#f0f0ff","#2a2a5a","#4a4a8a","#6a6aba","#8888bb","#ffffff"];

const ATP = ["","#0a0804","#0e0c06","#121008","#16140a","#1a180c","#1e1c0e","#222010","#2a2416","#3a2a1a","#4a3820","#5a4828","#6a5830","#1a4a0a","#2a6a12","#3a8a1a","#4aaa22","#5aca2a","#6aea3a","#8aff50","#aaff70","#ddcc30","#ffdd50","#ffee80","#ffffff"];

const SKP = ["","#1a0808","#1e0c0c","#221010","#261414","#2a1818","#3a2020","#4a2828","#5a3030","#6a3838","#7a4040","#8a4848","#9a5050","#aa5858","#ba6060","#cc6868","#c0a020","#e0c040","#ffd060","#ffe080","#fff0a0","#9a6840","#3a2810","#ffcc40","#ffffff","#cc2020","#ff4040"];

const IDP = ["","#0a1018","#0e1820","#122028","#162830","#1a3038","#1e3840","#2a4048","#3a5058","#4a6068","#5a7078","#6a8088","#7a9098","#8aa0a8","#aab0c0","#cacede","#ddeeff","#e8f4ff","#f0f8ff","#ffffff","#8098b0","#c0d0e0","#d0e0f0","#4080a0","#60a0c0","#a0d0ff"];

const VDP = ["","#050508","#0a0a10","#0e0e18","#121220","#1a1830","#22203a","#2a2844","#32304e","#3a3858","#4a4070","#5a4888","#6a50a0","#7a58b8","#8a60d0","#9a68e8","#aa70ff","#ba88ff","#caa0ff","#eab8ff","#ffaaff","#ff80ff","#ff40ff","#0a0a0a","#1a1a2a","#ffffff","#cc40ff"];

const FSP = ["","#0a0a10","#121218","#1a1a22","#22222c","#2a2a34","#3a3a44","#4a3a30","#5a4a3a","#6a5a44","#7a6a4e","#8a7a58","#9a8a62","#bcaa76","#ccb480","#dec28a","#f0daa0","#fff0b8","#ffffff","#d0d0e0","#e0e0f0","#808098","#1a1a2e","#404068","#ffffc0","#ff8080","#ff4040"];

const FP = ["","","#a01818","#c02828","#e03838","#ff4848","#ff6868","#ff8888","#ffa8a8","#1828a0","#2838c0","#3850e0","#4868ff","#6088ff","#88a8ff","#a8c0ff","#686888","#888888","#a0a0a0","#b8b8b8","#d0d0d0","#e8e8e8","#a08818","#c0a020","#e0c040","#ffd050","#ffe070","#583818","#785028","#986838","#b88048","#d09858","#e8b068","#ffffff","#30c0c0","#60e0e0","#90f0f0","#c0ffff","#c040c0","#e060e0","#ffa0ff","#ffcff0","#40c040","#60e060","#80ff80","#a0ffa0","#c0ffc0","#ff8830","#ffa840","#ffc860","#ffe080","#fffaf0","#fffff8"];

function extendPalette(base: string[], targetSize: number): string[] {
  const result = [...base];
  while (result.length <= targetSize) {
    const t = (result.length - 1) / Math.max(targetSize - base.length + 1, 1);
    const i = Math.floor(t * (base.length - 2)) + 1;
    const j = Math.min(i + 1, base.length - 1);
    const c1 = base[i] || '#000000';
    const c2 = base[j] || '#ffffff';
    result.push(lerpColor(c1, c2, (t * (base.length - 2)) % 1));
  }
  return result;
}

function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b_ = Math.round(ab + (bb - ab) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b_).toString(16).slice(1);
}

const SPE = extendPalette(SP, 70);
const WPE = extendPalette(WP, 62);
const TPE = extendPalette(TP, 46);
const SCPE = extendPalette(SCP, 57);
const MPE = extendPalette(MP, 112);
const IPE = extendPalette(IP, 98);
const VPE = extendPalette(VP, 220);
const HKPE = extendPalette(HKP, 216);

const TREE_P = ["", "#0a0a0a", "#0a1a0a", "#1a3a1a", "#2a5a2a", "#3a7a3a", "#4a9a4a", "#5aba5a", "#7ada7a", "#9afa9a", "#b0ffb0", "#ffff80", "#ffffc0", "#ffffff", "#1a1a1a", "#303030", "#3a2012", "#4a2e18", "#5a3a1e", "#6a4a28", "#7a5834", "#8a6842", "#9a7850", "#aa8860", "#3a180e", "#4a2416", "#5a301e", "#6a3c26", "#7a4830", "#8a563c"];

// ===== FOREST TILES (32x32) =====

function grass1() {
  const c = new PixelCanvas(32, 32);
  for (let y = 0; y < 32; y++) {
    const t = y / 32;
    const baseCol = t < 0.25 ? 7 : t < 0.5 ? 6 : t < 0.75 ? 5 : 4;
    for (let x = 0; x < 32; x++) c.set(x, y, baseCol);
  }
  const blades = [[2,28,3,23,6],[4,27,5,22,7],[6,29,7,24,5],[8,26,9,21,6],[10,28,11,23,4],
    [12,25,13,20,7],[14,27,15,22,5],[16,26,17,21,6],[18,28,19,23,4],[20,25,21,20,7],
    [22,27,23,22,5],[24,26,25,21,6],[1,18,2,14,5],[3,17,4,13,7],[5,19,6,15,4],
    [7,16,8,12,6],[10,18,11,14,5],[13,17,14,13,7],[16,19,17,15,4],[19,16,20,12,6],
    [22,18,23,14,5],[25,17,26,13,7],[2,8,3,4,6],[5,9,6,5,5],[8,7,9,3,7],
    [11,9,12,5,4],[14,8,15,4,6],[17,10,18,6,5],[20,7,21,3,7],[23,9,24,5,4],
    [26,8,27,4,6],[29,10,30,6,5],[1,2,2,0,7],[4,3,5,1,5],[7,1,8,0,6],
    [11,3,12,1,4],[15,2,16,0,7],[19,3,20,1,5],[23,1,24,0,6],[27,3,28,1,4],
    [30,2,31,0,5],[3,30,4,27,6],[9,30,10,27,5],[15,29,16,26,7],[21,30,22,27,4],
    [27,29,28,26,6]];
  for (const [x1,y1,x2,y2,col] of blades) c.line(x1,y1,x2,y2,col);
  const blades2 = [[3,27,4,25,5],[6,26,7,24,6],[9,28,10,26,4],[12,25,13,23,7],
    [15,27,16,25,5],[18,26,19,24,6],[21,28,22,26,4],[24,25,25,23,7],
    [2,16,3,14,5],[5,15,6,13,6],[8,17,9,15,4],[11,14,12,12,7],[14,16,15,14,5],
    [17,15,18,13,6],[20,17,21,15,4],[23,14,24,12,7],[3,7,4,5,5],[7,8,8,6,6],
    [11,6,12,4,4],[15,8,16,6,7],[19,7,20,5,5],[23,9,24,7,6]];
  for (const [x1,y1,x2,y2,col] of blades2) c.line(x1,y1,x2,y2,col);
  c.set(5,4,11); c.set(6,3,12); c.set(20,6,11); c.set(21,5,12);
  c.set(10,15,11); c.set(11,14,12); c.set(26,10,11); c.set(27,9,12);
  c.set(3,20,12); c.set(4,19,11); c.set(17,25,12); c.set(18,24,11);
  c.set(2,9,10); c.set(3,8,10); c.set(7,5,10); c.set(8,4,10);
  c.set(14,3,10); c.set(15,2,10); c.set(22,4,10); c.set(23,3,10);
  c.set(1,14,10); c.set(2,13,10); c.set(11,8,10); c.set(12,7,10);
  c.set(19,14,10); c.set(20,13,10); c.set(28,6,10); c.set(29,5,10);
  c.set(4,25,14); c.set(9,22,14); c.set(15,28,14); c.set(22,20,14);
  c.set(6,12,15); c.set(13,16,15); c.set(25,15,15); c.set(30,24,15);
  for (let y = 29; y < 32; y++) for (let x = 0; x < 32; x++) if (c.get(x,y)>=4&&c.get(x,y)<=7) c.set(x,y,c.get(x,y)+1);
  c.addNoise(0,0,32,32,8,0.10);
  c.outline(O); return c.toFrame();
}

function grass2() {
  const c = new PixelCanvas(32, 32);
  for (let y = 0; y < 32; y++) {
    const t = y / 32;
    const baseCol = t < 0.3 ? 7 : t < 0.55 ? 6 : t < 0.8 ? 5 : 4;
    for (let x = 0; x < 32; x++) c.set(x, y, baseCol);
  }
  const blades = [[3,27,4,22,6],[6,28,7,23,5],[9,26,10,21,7],[12,27,13,22,4],
    [15,25,16,20,6],[18,28,19,23,5],[21,26,22,21,7],[24,27,25,22,4],
    [1,16,2,12,5],[4,17,5,13,6],[7,15,8,11,7],[10,16,11,12,4],
    [14,17,15,13,5],[17,15,18,11,6],[20,16,21,12,7],[24,17,25,13,4],
    [2,7,3,3,5],[5,8,6,4,6],[9,6,10,2,7],[13,8,14,4,5],[17,7,18,3,6],
    [21,9,22,5,4],[25,6,26,2,7],[28,8,29,4,5],[1,1,2,0,6],
    [5,2,6,0,5],[10,1,11,0,7],[16,2,17,0,4],[22,1,23,0,6],[28,2,29,0,5],
    [4,30,5,27,6],[11,30,12,27,5],[18,29,19,26,7],[25,30,26,27,4]];
  for (const [x1,y1,x2,y2,col] of blades) c.line(x1,y1,x2,y2,col);
  const blades2 = [[5,26,6,24,5],[8,27,9,25,6],[11,25,12,23,7],[14,26,15,24,4],
    [17,27,18,25,5],[20,25,21,23,6],[23,26,24,24,7],[2,15,3,13,5],
    [6,14,7,12,6],[10,16,11,14,4],[13,15,14,13,7],[16,14,17,12,5],
    [20,16,21,14,6],[24,15,25,13,4],[3,6,4,4,5],[8,7,9,5,6],
    [12,5,13,3,7],[16,7,17,5,4],[20,6,21,4,5],[25,8,26,6,6],
    [6,2,7,0,5],[14,1,15,0,7],[24,2,25,0,4]];
  for (const [x1,y1,x2,y2,col] of blades2) c.line(x1,y1,x2,y2,col);
  c.set(8,4,11); c.set(9,3,12); c.set(23,5,11); c.set(24,4,12);
  c.set(4,13,11); c.set(5,12,12); c.set(15,14,11); c.set(16,13,12);
  c.set(28,9,11); c.set(29,8,12); c.set(12,22,11); c.set(13,21,12);
  c.set(1,6,10); c.set(2,5,10); c.set(9,2,10); c.set(10,1,10);
  c.set(17,4,10); c.set(18,3,10); c.set(26,5,10); c.set(27,4,10);
  c.set(3,12,10); c.set(4,11,10); c.set(14,7,10); c.set(15,6,10);
  c.set(22,12,10); c.set(23,11,10); c.set(30,7,10); c.set(0,8,10);
  c.set(5,24,14); c.set(12,26,14); c.set(20,23,14); c.set(27,25,14);
  c.set(8,18,15); c.set(18,19,15); c.set(2,21,15); c.set(24,18,15);
  for (let y = 29; y < 32; y++) for (let x = 0; x < 32; x++) if (c.get(x,y)>=4&&c.get(x,y)<=7) c.set(x,y,c.get(x,y)+1);
  c.addNoise(0,0,32,32,8,0.10);
  c.outline(O); return c.toFrame();
}

function grass3() {
  const c = new PixelCanvas(32, 32);
  for (let y = 0; y < 32; y++) {
    const t = y / 32;
    const baseCol = t < 0.2 ? 7 : t < 0.45 ? 6 : t < 0.7 ? 5 : 4;
    for (let x = 0; x < 32; x++) c.set(x, y, baseCol);
  }
  const blades = [[4,26,5,21,7],[7,27,6,22,5],[10,25,11,20,6],[13,26,12,21,4],
    [16,24,17,19,7],[19,27,20,22,5],[22,25,23,20,6],[25,26,24,21,4],
    [28,27,29,22,5],[2,15,3,11,6],[5,16,4,12,7],[8,14,9,10,5],
    [11,15,12,11,6],[14,16,15,12,4],[17,14,18,10,7],[20,15,21,11,5],
    [24,16,25,12,6],[28,14,29,10,4],[3,6,4,2,5],[6,7,5,3,6],
    [10,5,11,1,7],[14,7,15,3,4],[18,6,19,2,5],[22,8,23,4,6],
    [26,5,27,1,7],[30,7,31,3,4],[2,1,3,0,6],[8,2,9,0,5],
    [15,1,16,0,7],[21,2,22,0,4],[27,1,28,0,6],[5,30,6,27,5],
    [12,29,13,26,7],[20,30,21,27,4],[27,29,28,26,6]];
  for (const [x1,y1,x2,y2,col] of blades) c.line(x1,y1,x2,y2,col);
  const blades2 = [[2,25,3,23,6],[6,26,7,24,5],[9,24,10,22,7],[13,25,14,23,4],
    [17,26,18,24,5],[21,24,22,22,6],[25,25,26,23,7],[1,14,2,12,5],
    [4,15,3,13,6],[7,13,8,11,7],[12,14,13,12,4],[16,13,17,11,5],
    [21,14,22,12,6],[26,13,27,11,4],[2,5,3,3,5],[7,6,8,4,6],
    [11,4,12,2,7],[16,6,17,4,4],[21,5,22,3,5],[26,7,27,5,6],
    [4,1,5,0,5],[12,2,13,0,7],[23,1,24,0,4]];
  for (const [x1,y1,x2,y2,col] of blades2) c.line(x1,y1,x2,y2,col);
  c.set(11,3,11); c.set(12,2,12); c.set(6,5,11); c.set(7,4,12);
  c.set(18,4,11); c.set(19,3,12); c.set(2,11,11); c.set(3,10,12);
  c.set(25,13,11); c.set(26,12,12); c.set(9,20,11); c.set(10,19,12);
  c.set(3,3,10); c.set(4,2,10); c.set(13,1,10); c.set(14,0,10);
  c.set(20,3,10); c.set(21,2,10); c.set(29,4,10); c.set(30,3,10);
  c.set(1,10,10); c.set(5,7,10); c.set(16,5,10); c.set(24,7,10);
  c.set(7,20,10); c.set(15,15,10); c.set(28,11,10); c.set(0,5,10);
  c.set(6,25,14); c.set(14,24,14); c.set(23,26,14); c.set(30,23,14);
  c.set(3,17,15); c.set(11,18,15); c.set(19,17,15); c.set(26,19,15);
  for (let y = 29; y < 32; y++) for (let x = 0; x < 32; x++) if (c.get(x,y)>=4&&c.get(x,y)<=7) c.set(x,y,c.get(x,y)+1);
  c.addNoise(0,0,32,32,8,0.10);
  c.outline(O); return c.toFrame();
}

function grassDirtEdge() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 16, 5);
  c.dither(0, 0, 32, 16, 5, 6);
  for (let y = 0; y < 16; y += 2) for (let x = 0; x < 32; x += 3) if (Math.random() > 0.5) c.set(x + (y % 3), y, 4);
  c.line(3, 2, 6, 6, 4); c.line(12, 1, 15, 5, 4); c.line(22, 3, 25, 7, 4); c.line(5, 10, 8, 14, 4);
  c.rect(0, 16, 32, 16, 33);
  c.dither(0, 16, 32, 16, 33, 34);
  c.addNoise(2, 18, 28, 12, 35, 0.05);
  c.line(0, 16, 31, 16, O); c.line(0, 17, 30, 17, O);
  for (let i = 0; i < 32; i += 4) { c.set(i, 16 + Math.floor(Math.random() * 3), 12); c.set(i + 1, 17 + Math.floor(Math.random() * 2), 13); }
  c.addNoise(2, 2, 28, 12, 15, 0.03); c.addNoise(2, 18, 28, 12, 36, 0.04);
  c.outline(O); return c.toFrame();
}

function dirtPath() {
  const c = new PixelCanvas(32, 32);
  for (let y = 0; y < 32; y++) {
    const t = y / 32;
    const baseCol = t < 0.33 ? 7 : t < 0.66 ? 6 : 5;
    for (let x = 0; x < 32; x++) c.set(x, y, baseCol);
  }
  c.line(3,5,10,4,4); c.line(4,6,11,5,5); c.line(18,7,27,5,4); c.line(19,8,28,6,5);
  c.line(2,14,9,12,4); c.line(3,15,10,13,5); c.line(20,13,28,11,4); c.line(21,14,29,12,5);
  c.line(4,22,12,20,4); c.line(5,23,13,21,5); c.line(17,21,26,19,4); c.line(18,22,27,20,5);
  c.line(6,28,14,27,4); c.line(7,29,15,28,5); c.line(19,28,27,26,4);
  c.line(1,8,4,9,5); c.line(25,16,30,17,5); c.line(8,2,14,3,5); c.line(22,24,30,25,5);
  c.set(5,7,4); c.set(6,8,4); c.set(23,8,4); c.set(24,9,4);
  c.set(8,16,4); c.set(9,17,4); c.set(20,18,4); c.set(21,19,4);
  c.rect(6,10,4,3,4); c.rect(22,14,3,2,4); c.rect(10,25,3,2,4); c.rect(18,8,3,2,4);
  c.ellipse(8,11,2,1,3); c.ellipse(24,15,2,1,3); c.ellipse(11,26,2,1,3);
  c.set(3,3,8); c.set(4,2,9); c.set(29,4,8); c.set(30,3,9);
  c.set(0,10,8); c.set(1,11,9); c.set(31,20,8); c.set(30,21,9);
  c.set(2,29,8); c.set(3,30,9); c.set(28,31,8); c.set(29,30,9);
  c.set(1,1,8); c.set(31,0,9); c.set(0,31,8);
  c.ellipse(7,18,3,2,4); c.ellipse(8,18,2,1,5); c.ellipse(7,18,1,1,6);
  c.ellipse(22,9,3,2,4); c.ellipse(23,9,2,1,5); c.ellipse(22,9,1,1,6);
  c.set(14,6,3); c.set(15,7,3); c.set(16,24,3); c.set(17,25,3);
  c.set(5,19,3); c.set(6,20,3); c.set(25,27,3); c.set(26,28,3);
  c.set(2,6,6); c.set(3,7,6); c.set(27,5,6); c.set(28,6,6);
  c.set(10,3,6); c.set(11,4,6); c.set(20,29,6); c.set(21,30,6);
  c.set(12,15,6); c.set(13,16,6); c.set(17,7,6); c.set(18,8,6);
  c.addNoise(2,2,28,28,4,0.06);
  c.addNoise(2,2,28,28,3,0.03);
  c.outline(O); return c.toFrame();
}

function dirtPathVar() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 33);
  c.dither(0, 0, 32, 32, 33, 34);
  c.shadeRegion(6, 6, 20, 20, 1); c.shadeRegion(10, 10, 12, 12, 1);
  c.addNoise(1, 1, 30, 30, 35, 0.04); c.addNoise(3, 3, 26, 26, 37, 0.04);
  c.line(3, 15, 10, 10, 38); c.line(15, 5, 25, 12, 38);
  c.line(6, 22, 12, 26, 36); c.line(22, 18, 28, 22, 36);
  c.set(6, 22, 37); c.set(7, 22, 37); c.set(15, 8, 37); c.set(16, 9, 37);
  c.rect(5, 18, 2, 2, 38); c.rect(22, 20, 3, 2, 38);
  c.addNoise(3, 3, 10, 10, 34, 0.07); c.addNoise(20, 20, 8, 8, 34, 0.07);
  c.outline(O); return c.toFrame();
}

function treeTrunkB() {
  const c = new PixelCanvas(32, 32);
  c.ellipse(16,26,7,6,5); c.ellipse(15,25,6,5,6); c.ellipse(16,24,5,4,5);
  c.rect(10,8,12,20,5); c.rect(11,9,10,18,6); c.rect(12,10,8,16,5);
  c.rect(13,11,6,14,6); c.rect(14,12,4,12,5);
  c.line(12,8,12,27,4); c.line(19,9,19,28,4);
  c.line(13,10,13,26,3); c.line(18,11,18,27,3);
  c.line(14,12,14,25,4); c.line(17,13,17,26,4);
  c.set(11,10,7); c.set(11,11,7); c.set(11,12,6); c.set(11,13,6);
  c.set(10,14,7); c.set(10,15,6); c.set(10,16,6); c.set(10,17,5);
  c.set(20,11,3); c.set(20,12,3); c.set(20,13,4); c.set(20,14,4);
  c.set(21,15,3); c.set(21,16,3); c.set(21,17,4); c.set(21,18,4);
  c.line(14,14,14,20,3); c.line(17,15,17,21,3);
  c.ellipse(14,18,2,1,3); c.ellipse(14,18,1,1,5);
  c.ellipse(18,22,2,1,3); c.ellipse(18,22,1,1,5);
  c.rect(8,26,16,5,4); c.rect(9,27,14,3,3);
  c.set(8,27,5); c.set(9,28,5); c.set(22,27,4); c.set(23,26,4);
  c.set(7,28,4); c.set(24,27,3); c.set(8,29,3); c.set(23,28,3);
  c.set(15,16,4); c.set(16,16,4); c.set(15,17,3); c.set(16,17,3);
  c.set(13,21,4); c.set(14,21,4); c.set(13,22,3);
  c.set(18,18,4); c.set(19,18,4); c.set(18,19,3); c.set(19,19,3);
  c.addNoise(11,10,10,16,4,0.06);
  c.outline(O); return c.toFrame();
}

function treeTrunkT() {
  const c = new PixelCanvas(32, 32);
  c.ellipse(16,10,11,9,8); c.ellipse(15,9,9,8,7); c.ellipse(14,8,7,7,7);
  c.ellipse(16,9,8,7,9); c.ellipse(15,8,6,6,8); c.ellipse(13,7,5,5,7);
  c.ellipse(18,8,5,4,7); c.ellipse(17,7,4,3,8); c.ellipse(14,6,4,3,8);
  c.ellipse(18,6,3,3,7); c.set(12,7,8); c.set(19,7,7); c.set(13,5,9);
  c.set(17,5,9); c.set(15,4,10); c.set(16,3,10); c.set(14,4,9);
  c.set(18,4,9); c.set(11,8,7); c.set(20,8,7); c.set(12,9,8);
  c.set(19,9,8); c.set(10,10,7); c.set(21,10,7); c.set(13,11,6);
  c.set(18,11,6); c.addNoise(9,3,15,12,10,0.06);
  c.rect(11,15,10,16,20); c.rect(12,16,8,14,21); c.rect(13,17,6,12,20);
  c.rect(14,18,4,10,21);
  c.line(12,16,12,30,19); c.line(19,16,19,30,19);
  c.line(13,17,13,29,18); c.line(18,17,18,29,18);
  c.line(14,18,14,28,20); c.line(17,18,17,28,20);
  c.set(11,17,22); c.set(11,18,21); c.set(11,19,21);
  c.set(20,18,18); c.set(20,19,18); c.set(20,20,19);
  c.ellipse(14,22,2,1,18); c.ellipse(14,22,1,1,21);
  c.ellipse(18,24,2,1,18); c.ellipse(18,24,1,1,21);
  c.rect(9,28,14,4,19); c.rect(10,29,12,2,18);
  c.set(9,29,20); c.set(21,28,19); c.set(8,29,19); c.set(22,28,18);
  c.ellipse(16,27,6,5,20); c.ellipse(15,26,5,4,21); c.ellipse(16,25,4,3,20);
  c.addNoise(11,16,10,14,22,0.04);
  c.outline(O); return c.toFrame();
}

function treeCanopyL() {
  const c = new PixelCanvas(32, 32);
  c.ellipse(16,17,14,13,8); c.ellipse(15,16,12,11,7); c.ellipse(14,15,10,9,7);
  c.ellipse(16,16,11,10,8); c.ellipse(15,15,9,8,9); c.ellipse(14,14,7,7,8);
  c.ellipse(17,18,10,9,8); c.ellipse(18,19,8,7,7); c.ellipse(13,18,8,7,8);
  c.ellipse(12,14,5,4,7); c.ellipse(20,14,5,4,7); c.ellipse(16,12,6,5,9);
  c.ellipse(14,20,6,5,7); c.ellipse(18,21,5,4,7); c.ellipse(16,22,4,3,7);
  c.ellipse(10,16,4,3,7); c.ellipse(22,17,4,3,7); c.ellipse(16,10,4,3,10);
  c.ellipse(11,12,3,3,8); c.ellipse(20,11,3,3,8); c.ellipse(13,9,3,2,9);
  c.ellipse(19,9,3,2,9); c.ellipse(9,18,3,3,7); c.ellipse(23,19,3,3,7);
  c.ellipse(15,23,3,2,7); c.ellipse(17,24,3,2,7); c.ellipse(8,14,2,2,8);
  c.ellipse(24,15,2,2,7); c.ellipse(16,8,3,2,10); c.ellipse(14,11,2,2,9);
  c.ellipse(18,12,2,2,8); c.set(12,10,9); c.set(19,10,9);
  c.set(10,13,8); c.set(21,13,8); c.set(9,15,7); c.set(22,16,7);
  c.set(11,17,6); c.set(20,18,6); c.set(13,20,6); c.set(18,20,6);
  c.set(15,7,10); c.set(16,6,10); c.set(14,8,10); c.set(17,7,10);
  c.set(12,9,10); c.set(19,9,10); c.set(11,11,9); c.set(20,12,9);
  c.set(9,12,9); c.set(22,14,8); c.set(8,15,8); c.set(23,17,7);
  c.set(10,17,7); c.set(21,18,7); c.set(12,19,7); c.set(19,21,7);
  c.set(14,21,7); c.set(17,22,7); c.set(15,24,5); c.set(16,25,5);
  c.set(8,13,7); c.set(23,15,7); c.set(10,10,9); c.set(21,11,8);
  c.set(13,13,8); c.set(18,14,7); c.set(14,16,7); c.set(17,17,6);
  c.addNoise(8,6,16,18,10,0.06);
  c.outline(O); return c.toFrame();
}

function treeCanopyM() {
  const c = new PixelCanvas(32, 32);
  c.ellipse(16,16,13,12,8); c.ellipse(15,15,11,10,7); c.ellipse(14,14,9,8,7);
  c.ellipse(16,15,10,9,8); c.ellipse(15,14,8,7,9); c.ellipse(16,17,9,8,8);
  c.ellipse(17,17,8,7,7); c.ellipse(14,17,7,6,7); c.ellipse(15,13,6,5,9);
  c.ellipse(17,14,5,4,8); c.ellipse(13,15,4,4,7); c.ellipse(18,15,4,4,7);
  c.ellipse(16,12,5,4,10); c.ellipse(15,18,5,4,7); c.ellipse(17,19,4,3,7);
  c.ellipse(12,13,3,3,8); c.ellipse(20,13,3,3,8); c.ellipse(14,11,3,2,9);
  c.ellipse(18,11,3,2,9); c.ellipse(11,15,3,3,7); c.ellipse(21,16,3,3,7);
  c.ellipse(16,20,3,2,7); c.ellipse(9,14,2,2,8); c.ellipse(23,14,2,2,7);
  c.ellipse(16,9,3,2,10); c.set(15,8,10); c.set(16,7,10); c.set(14,9,10);
  c.set(17,8,10); c.set(13,10,9); c.set(19,10,9); c.set(12,11,9);
  c.set(20,11,8); c.set(11,12,8); c.set(21,13,7); c.set(10,14,7);
  c.set(22,14,7); c.set(13,16,7); c.set(18,16,7); c.set(14,18,7);
  c.set(17,18,7); c.set(15,19,7); c.set(16,21,6); c.set(9,13,8);
  c.set(22,13,7); c.set(14,12,8); c.set(17,13,7); c.set(15,14,7);
  c.set(16,10,10); c.set(13,14,7); c.set(18,15,7); c.set(14,17,7);
  c.set(17,16,7); c.set(15,17,7); c.set(16,18,7);
  c.addNoise(9,7,14,15,10,0.06);
  c.outline(O); return c.toFrame();
}

function bushS() {
  const c = new PixelCanvas(32, 32);
  c.ellipse(16, 22, 10, 9, 6); c.ellipse(15, 21, 8, 7, 5); c.ellipse(17, 23, 7, 6, 4);
  c.ellipse(13, 20, 5, 4, 7); c.ellipse(19, 21, 5, 4, 6);
  c.dither(9, 15, 14, 15, 6, 5); c.dither(11, 17, 10, 10, 5, 4);
  c.set(12, 17, 8); c.set(20, 18, 8); c.set(15, 16, 9); c.set(17, 18, 9);
  c.addNoise(10, 16, 12, 10, 10, 0.05); c.set(14, 19, 11); c.set(18, 20, 11);
  c.outline(O); return c.toFrame();
}

function bushL() {
  const c = new PixelCanvas(32, 32);
  c.ellipse(16, 20, 13, 11, 6); c.ellipse(15, 19, 10, 9, 5); c.ellipse(14, 18, 7, 6, 7);
  c.ellipse(18, 22, 9, 8, 4); c.ellipse(11, 17, 6, 5, 7); c.ellipse(21, 18, 6, 5, 6);
  c.dither(6, 12, 20, 18, 6, 5); c.dither(10, 14, 16, 14, 5, 7); c.dither(12, 16, 12, 10, 5, 4);
  c.set(9, 14, 8); c.set(22, 15, 8); c.set(13, 13, 9); c.set(18, 12, 10);
  c.addNoise(8, 13, 16, 14, 10, 0.06); c.set(12, 17, 11); c.set(19, 18, 11); c.set(15, 15, 9); c.set(17, 20, 9);
  c.outline(O); return c.toFrame();
}

function waterDeep() {
  const c = new PixelCanvas(32, 32);
  for (let y = 0; y < 32; y++) {
    const t = y / 32;
    const baseCol = t < 0.3 ? 5 : t < 0.6 ? 4 : 3;
    for (let x = 0; x < 32; x++) c.set(x, y, baseCol);
  }
  c.line(3,5,12,5,7); c.line(4,6,13,6,8); c.line(18,4,28,4,7); c.line(19,5,27,5,8);
  c.line(1,11,10,11,7); c.line(2,12,11,12,8); c.line(20,10,30,10,7); c.line(21,11,29,11,8);
  c.line(4,17,14,17,7); c.line(5,18,15,18,8); c.line(17,18,27,18,7); c.line(18,19,26,19,8);
  c.line(2,23,13,23,7); c.line(3,24,14,24,8); c.line(19,24,29,24,7);
  c.line(6,28,16,28,7); c.line(21,28,30,28,7);
  c.line(8,7,15,7,9); c.line(22,8,28,8,9); c.line(5,13,14,13,9); c.line(17,14,26,14,9);
  c.line(7,20,13,20,9); c.line(18,21,25,21,9);
  c.rect(5,4,5,1,10); c.set(6,4,13); c.set(7,4,13);
  c.rect(22,3,5,1,10); c.set(23,3,13); c.set(24,3,13);
  c.rect(3,10,4,1,10); c.set(4,10,13); c.rect(24,12,4,1,10); c.set(25,12,13);
  c.rect(6,16,5,1,10); c.set(7,16,13); c.rect(20,17,5,1,10); c.set(21,17,13);
  c.ellipse(8,6,3,2,13); c.ellipse(23,5,3,2,13);
  c.ellipse(5,14,3,2,13); c.ellipse(22,15,3,2,13);
  c.ellipse(10,21,3,2,13); c.ellipse(17,25,3,2,13);
  c.set(16,6,10); c.set(17,5,10); c.set(14,12,10); c.set(15,11,10);
  c.set(8,18,10); c.set(9,17,10); c.set(22,20,10); c.set(23,19,10);
  c.addNoise(0,0,32,32,4,0.04);
  c.outline(O); return c.toFrame();
}

function waterShallow() {
  const c = new PixelCanvas(32, 32);
  for (let y = 0; y < 32; y++) {
    const t = y / 32;
    const baseCol = t < 0.35 ? 8 : t < 0.65 ? 7 : t < 0.85 ? 6 : 5;
    for (let x = 0; x < 32; x++) c.set(x, y, baseCol);
  }
  c.line(2,4,11,4,9); c.line(3,5,12,5,10); c.line(17,3,28,3,9); c.line(18,4,27,4,10);
  c.line(1,10,12,10,9); c.line(2,11,13,11,10); c.line(19,9,29,9,9); c.line(20,10,28,10,10);
  c.line(3,16,15,16,9); c.line(4,17,16,17,10); c.line(16,15,26,15,9); c.line(17,16,27,16,10);
  c.line(2,22,14,22,9); c.line(3,23,15,23,10); c.line(18,22,28,22,9); c.line(19,23,29,23,10);
  c.line(5,27,16,27,9); c.line(17,28,30,28,9);
  c.line(6,6,14,6,10); c.line(21,7,29,7,10); c.line(4,12,13,12,10); c.line(18,13,25,13,10);
  c.line(7,19,14,19,10); c.line(17,20,26,20,10);
  c.rect(4,3,6,1,10); c.set(5,3,13); c.set(6,3,13); c.set(7,3,13);
  c.rect(21,2,6,1,10); c.set(22,2,13); c.set(23,2,13); c.set(24,2,13);
  c.rect(2,9,5,1,10); c.set(3,9,13); c.rect(25,11,5,1,10); c.set(26,11,13);
  c.rect(5,15,6,1,10); c.set(6,15,13); c.rect(19,16,6,1,10); c.set(20,16,13);
  c.rect(3,22,5,1,10); c.set(4,22,13); c.rect(22,23,5,1,10); c.set(23,23,13);
  c.ellipse(7,5,4,2,13); c.ellipse(24,4,4,2,13);
  c.ellipse(4,12,4,2,13); c.ellipse(23,13,4,2,13);
  c.ellipse(9,19,4,2,13); c.ellipse(18,20,4,2,13);
  c.ellipse(6,26,3,2,13); c.ellipse(22,27,3,2,13);
  c.set(15,5,10); c.set(16,4,10); c.set(13,11,10); c.set(14,10,10);
  c.set(7,17,10); c.set(8,16,10); c.set(23,18,10); c.set(24,17,10);
  c.set(11,24,10); c.set(12,23,10); c.set(20,25,10); c.set(21,24,10);
  c.set(10,7,5); c.set(26,8,5); c.set(5,14,5); c.set(24,15,5);
  c.set(8,21,5); c.set(22,21,5); c.set(3,26,5); c.set(28,26,5);
  c.addNoise(0,0,32,32,6,0.05);
  c.outline(O); return c.toFrame();
}

function rock() {
  const c = new PixelCanvas(32, 32);
  c.ellipse(16,18,11,9,5); c.ellipse(15,17,9,7,4); c.ellipse(17,19,8,6,6);
  c.ellipse(14,16,6,5,4); c.ellipse(18,17,6,5,5); c.ellipse(16,15,5,4,6);
  c.ellipse(13,18,4,3,4); c.ellipse(19,19,4,3,5); c.ellipse(15,20,4,3,4);
  c.ellipse(17,21,3,2,5); c.set(12,16,4); c.set(20,17,5); c.set(14,14,6);
  c.set(18,15,5); c.set(13,19,4); c.set(18,20,5); c.set(16,22,4);
  c.line(11,14,13,10,3); c.line(20,13,23,16,3);
  c.line(10,17,12,22,3); c.line(19,18,24,23,3);
  c.line(14,12,16,9,3); c.line(17,14,19,11,4);
  c.set(12,12,6); c.set(13,11,7); c.set(11,13,6);
  c.set(14,13,7); c.set(15,12,6); c.set(16,11,7);
  c.set(18,12,6); c.set(19,13,5); c.set(20,12,6);
  c.set(13,16,6); c.set(14,15,7); c.set(17,16,5); c.set(18,15,6);
  c.set(12,19,3); c.set(20,20,3); c.set(15,21,3); c.set(17,22,3);
  c.set(11,16,3); c.set(21,17,3); c.set(14,21,3); c.set(19,21,3);
  c.set(8,15,8); c.set(9,14,9); c.set(8,16,10); c.set(23,18,8);
  c.set(24,17,9); c.set(10,20,8); c.set(11,21,9);
  c.addNoise(10,12,12,12,4,0.06);
  c.outline(O); return c.toFrame();
}

function log() {
  const c = new PixelCanvas(32, 32);
  c.rect(2, 14, 28, 5, 41); c.rect(4, 13, 24, 7, 42); c.rect(5, 14, 22, 5, 43);
  c.dither(4, 13, 24, 7, 41, 42);
  c.ellipse(4, 15, 3, 3, 43); c.ellipse(27, 16, 3, 3, 43); c.ellipse(4, 15, 2, 2, 44); c.ellipse(27, 16, 2, 2, 44);
  c.line(6, 14, 6, 18, 44); c.line(24, 14, 24, 18, 44); c.line(8, 13, 8, 19, 45); c.line(22, 13, 22, 19, 45);
  c.set(5, 15, 45); c.set(25, 16, 45); c.line(10, 14, 10, 18, 44); c.line(20, 14, 20, 18, 44);
  c.set(3, 15, 42); c.set(28, 16, 42);
  c.outline(O); return c.toFrame();
}

function flowersR() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 5); c.dither(0, 0, 32, 32, 5, 6);
  for (let y = 0; y < 32; y += 4) for (let x = 0; x < 32; x += 5) if (Math.random() > 0.5) c.set(x + (y % 3), y, 4);
  c.ellipse(8, 20, 3, 3, 59); c.ellipse(7, 19, 2, 2, 60); c.ellipse(8, 20, 1, 1, 61);
  c.ellipse(22, 18, 3, 3, 59); c.ellipse(21, 17, 2, 2, 60); c.ellipse(22, 18, 1, 1, 61);
  c.ellipse(15, 24, 2, 2, 59); c.ellipse(15, 24, 1, 1, 60);
  c.set(8, 19, 61); c.set(22, 17, 61); c.set(15, 23, 61);
  c.line(8, 22, 8, 26, 11); c.line(22, 20, 22, 25, 11); c.line(15, 26, 15, 29, 11);
  c.outline(O); return c.toFrame();
}

function flowersY() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 5); c.dither(0, 0, 32, 32, 5, 6);
  for (let y = 1; y < 32; y += 4) for (let x = 1; x < 32; x += 5) if (Math.random() > 0.5) c.set(x + (y % 3), y, 4);
  c.ellipse(10, 18, 3, 3, 57); c.ellipse(9, 17, 2, 2, 58); c.ellipse(10, 18, 1, 1, 61);
  c.ellipse(20, 22, 3, 3, 57); c.ellipse(19, 21, 2, 2, 58); c.ellipse(20, 22, 1, 1, 61);
  c.ellipse(14, 14, 2, 2, 57); c.ellipse(14, 14, 1, 1, 58);
  c.set(10, 17, 61); c.set(20, 21, 61); c.set(14, 13, 61);
  c.line(10, 20, 10, 25, 11); c.line(20, 23, 20, 27, 11); c.line(14, 16, 14, 19, 11);
  c.outline(O); return c.toFrame();
}

function flowersW() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 5); c.dither(0, 0, 32, 32, 5, 6);
  for (let y = 2; y < 32; y += 4) for (let x = 2; x < 32; x += 5) if (Math.random() > 0.5) c.set(x + (y % 3), y, 4);
  c.ellipse(12, 19, 3, 3, 62); c.ellipse(11, 18, 2, 2, 63); c.ellipse(12, 19, 1, 1, 63);
  c.ellipse(18, 16, 3, 3, 62); c.ellipse(17, 15, 2, 2, 63); c.ellipse(18, 16, 1, 1, 62);
  c.ellipse(8, 23, 2, 2, 62); c.ellipse(8, 23, 1, 1, 63);
  c.set(12, 18, 63); c.set(18, 15, 63); c.set(8, 22, 63);
  c.line(12, 21, 12, 26, 11); c.line(18, 17, 18, 22, 11); c.line(8, 24, 8, 28, 11);
  c.outline(O); return c.toFrame();
}

function mushroom() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 5); c.dither(0, 0, 32, 32, 5, 6);
  for (let y = 0; y < 32; y += 4) for (let x = 0; x < 32; x += 5) if (Math.random() > 0.45) c.set(x + (y % 3), y, 4);
  c.ellipse(12, 20, 6, 5, 65); c.ellipse(11, 19, 4, 4, 66); c.ellipse(10, 18, 3, 3, 67); c.ellipse(13, 21, 5, 4, 64);
  c.rect(10, 24, 4, 5, 67); c.rect(11, 25, 2, 4, 68);
  c.set(9, 18, 68); c.set(14, 17, 68); c.set(10, 17, 69); c.set(13, 16, 69);
  c.set(11, 19, 39); c.set(12, 19, 39); c.set(11, 23, 39); c.set(12, 23, 39);
  c.outline(O); return c.toFrame();
}

// ===== DESERT TILES =====

function sand1() {
  const c = new PixelCanvas(32, 32);
  for (let y = 0; y < 32; y++) {
    const t = y / 32;
    const baseCol = t < 0.3 ? 12 : t < 0.6 ? 11 : t < 0.85 ? 10 : 9;
    for (let x = 0; x < 32; x++) c.set(x, y, baseCol);
  }
  c.line(2,3,11,2,10); c.line(3,4,12,3,11); c.line(18,4,28,3,10); c.line(19,5,27,4,11);
  c.line(1,9,10,8,10); c.line(2,10,11,9,11); c.line(20,10,30,9,10); c.line(21,11,29,10,11);
  c.line(3,15,13,14,10); c.line(4,16,14,15,11); c.line(17,16,27,15,10); c.line(18,17,26,16,11);
  c.line(2,21,12,20,10); c.line(3,22,13,21,11); c.line(19,22,29,21,10); c.line(20,23,28,22,11);
  c.line(4,27,14,26,10); c.line(5,28,15,27,11); c.line(17,28,27,27,10);
  c.line(6,6,8,5,11); c.line(23,7,25,6,11); c.line(8,13,10,12,11); c.line(22,14,24,13,11);
  c.line(5,19,7,18,11); c.line(25,20,27,19,11); c.line(7,25,9,24,11); c.line(23,26,25,25,11);
  c.set(4,3,15); c.set(5,2,16); c.set(22,5,15); c.set(23,4,16);
  c.set(3,11,15); c.set(4,10,16); c.set(25,12,15); c.set(26,11,16);
  c.set(6,18,15); c.set(7,17,16); c.set(20,19,15); c.set(21,18,16);
  c.set(5,25,15); c.set(6,24,16); c.set(24,26,15); c.set(25,25,16);
  c.set(1,5,15); c.set(30,7,15); c.set(2,14,15); c.set(28,17,15);
  c.set(8,7,15); c.set(19,8,15); c.set(12,18,15); c.set(17,21,15);
  c.set(9,1,16); c.set(22,2,16); c.set(4,13,16); c.set(26,15,16);
  c.set(14,5,15); c.set(15,4,16); c.set(10,24,15); c.set(20,25,15);
  c.ellipse(7,8,2,1,16); c.ellipse(24,11,2,1,16); c.ellipse(13,17,2,1,16);
  c.ellipse(8,23,2,1,16); c.ellipse(21,27,2,1,16);
  c.set(11,6,17); c.set(26,8,17); c.set(6,13,17); c.set(23,16,17);
  c.addNoise(1,1,30,30,10,0.08);
  c.outline(O); return c.toFrame();
}

function sand2() {
  const c = new PixelCanvas(32, 32);
  for (let y = 0; y < 32; y++) {
    const t = y / 32;
    const baseCol = t < 0.35 ? 12 : t < 0.65 ? 11 : t < 0.88 ? 10 : 9;
    for (let x = 0; x < 32; x++) c.set(x, y, baseCol);
  }
  c.line(3,2,13,1,10); c.line(4,3,12,2,11); c.line(17,3,27,2,10); c.line(18,4,26,3,11);
  c.line(1,7,11,6,10); c.line(2,8,12,7,11); c.line(19,8,29,7,10); c.line(20,9,28,8,11);
  c.line(4,13,14,12,10); c.line(5,14,15,13,11); c.line(16,14,26,13,10); c.line(17,15,27,14,11);
  c.line(2,19,12,18,10); c.line(3,20,13,19,11); c.line(18,20,28,19,10); c.line(19,21,29,20,11);
  c.line(5,25,15,24,10); c.line(6,26,16,25,11); c.line(16,26,26,25,10);
  c.line(7,5,9,4,11); c.line(22,6,24,5,11); c.line(6,11,8,10,11); c.line(24,12,26,11,11);
  c.line(4,17,6,16,11); c.line(23,18,25,17,11); c.line(8,23,10,22,11); c.line(22,24,24,23,11);
  c.set(5,2,15); c.set(6,1,16); c.set(20,4,15); c.set(21,3,16);
  c.set(2,9,15); c.set(3,8,16); c.set(26,10,15); c.set(27,9,16);
  c.set(7,16,15); c.set(8,15,16); c.set(19,17,15); c.set(20,16,16);
  c.set(4,23,15); c.set(5,22,16); c.set(23,24,15); c.set(24,23,16);
  c.set(0,4,15); c.set(29,6,15); c.set(3,13,15); c.set(27,15,15);
  c.set(9,6,15); c.set(18,7,15); c.set(13,19,15); c.set(16,22,15);
  c.set(10,0,16); c.set(23,1,16); c.set(5,12,16); c.set(25,14,16);
  c.set(15,4,15); c.set(16,3,16); c.set(11,22,15); c.set(21,23,15);
  c.ellipse(6,7,2,1,16); c.ellipse(25,10,2,1,16); c.ellipse(12,16,2,1,16);
  c.ellipse(7,22,2,1,16); c.ellipse(20,26,2,1,16);
  c.set(10,5,17); c.set(27,7,17); c.set(5,12,17); c.set(24,15,17);
  c.addNoise(1,1,30,30,10,0.08);
  c.outline(O); return c.toFrame();
}

function sand3() {
  const c = new PixelCanvas(32, 32);
  for (let y = 0; y < 32; y++) {
    const t = y / 32;
    const baseCol = t < 0.28 ? 12 : t < 0.55 ? 11 : t < 0.82 ? 10 : 9;
    for (let x = 0; x < 32; x++) c.set(x, y, baseCol);
  }
  c.line(1,4,12,3,10); c.line(2,5,11,4,11); c.line(19,5,30,4,10); c.line(20,6,29,5,11);
  c.line(3,10,14,9,10); c.line(4,11,15,10,11); c.line(16,11,28,10,10); c.line(17,12,29,11,11);
  c.line(2,16,13,15,10); c.line(3,17,14,16,11); c.line(18,17,27,16,10); c.line(19,18,28,17,11);
  c.line(4,23,14,22,10); c.line(5,24,15,23,11); c.line(17,23,26,22,10); c.line(18,24,27,23,11);
  c.line(6,28,16,27,10); c.line(7,29,17,28,11);
  c.line(8,6,10,5,11); c.line(21,7,23,6,11); c.line(7,13,9,12,11); c.line(23,14,25,13,11);
  c.line(5,19,7,18,11); c.line(22,20,24,19,11); c.line(9,25,11,24,11); c.line(20,26,22,25,11);
  c.set(3,3,15); c.set(4,2,16); c.set(22,5,15); c.set(23,4,16);
  c.set(1,11,15); c.set(2,10,16); c.set(27,12,15); c.set(28,11,16);
  c.set(6,18,15); c.set(7,17,16); c.set(18,19,15); c.set(19,18,16);
  c.set(5,25,15); c.set(6,24,16); c.set(22,26,15); c.set(23,25,16);
  c.set(0,6,15); c.set(31,8,15); c.set(2,14,15); c.set(29,16,15);
  c.set(10,7,15); c.set(17,8,15); c.set(11,20,15); c.set(18,23,15);
  c.set(8,2,16); c.set(24,3,16); c.set(3,13,16); c.set(27,15,16);
  c.set(13,5,15); c.set(14,4,16); c.set(9,23,15); c.set(19,24,15);
  c.ellipse(5,8,2,1,16); c.ellipse(26,11,2,1,16); c.ellipse(11,17,2,1,16);
  c.ellipse(6,24,2,1,16); c.ellipse(21,27,2,1,16);
  c.set(9,6,17); c.set(28,8,17); c.set(4,13,17); c.set(25,16,17);
  c.addNoise(1,1,30,30,10,0.08);
  c.outline(O); return c.toFrame();
}

function sandstonePath() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 45); c.dither(0, 0, 32, 32, 45, 46); c.shadeRegion(4, 4, 24, 24, 1);
  c.rectOutline(0, 0, 32, 32, 47); c.addNoise(2, 2, 28, 28, 48, 0.04);
  c.line(5, 5, 12, 10, 47); c.line(20, 15, 28, 20, 47); c.line(8, 22, 16, 26, 47);
  c.set(8, 14, 48); c.set(22, 8, 48); c.set(12, 18, 48); c.set(25, 24, 48);
  c.addNoise(4, 4, 10, 10, 47, 0.06); c.addNoise(18, 18, 10, 10, 47, 0.06);
  c.outline(O); return c.toFrame();
}

function cactus1() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 39); c.dither(0, 0, 32, 32, 39, 40);
  c.rect(13, 6, 6, 24, 51); c.rect(14, 7, 4, 22, 52); c.rect(15, 8, 2, 20, 53);
  c.rect(8, 14, 4, 8, 51); c.rect(9, 15, 2, 6, 52); c.rect(20, 16, 4, 6, 51); c.rect(21, 17, 2, 4, 52);
  c.rect(11, 4, 10, 4, 54); c.rect(12, 5, 8, 2, 53);
  c.set(14, 3, 55); c.set(17, 4, 54); c.set(15, 2, 56); c.set(16, 2, 56);
  c.line(14, 8, 14, 28, 52); c.line(17, 8, 17, 28, 52); c.line(9, 16, 9, 21, 52); c.line(22, 18, 22, 21, 52);
  c.set(10, 15, 54); c.set(21, 17, 54); c.addNoise(14, 8, 4, 20, 53, 0.15);
  c.outline(O); return c.toFrame();
}

function cactus2() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 39); c.dither(0, 0, 32, 32, 39, 40);
  c.rect(14, 4, 4, 26, 51); c.rect(15, 5, 2, 24, 52); c.rect(15, 6, 2, 22, 53);
  c.rect(10, 12, 3, 10, 51); c.rect(11, 13, 1, 8, 52); c.rect(19, 14, 3, 8, 51); c.rect(20, 15, 1, 6, 52);
  c.rect(12, 2, 8, 4, 54); c.rect(13, 3, 6, 2, 53);
  c.set(15, 1, 55); c.set(16, 2, 54);
  c.line(15, 6, 15, 29, 52); c.line(16, 6, 16, 29, 52); c.line(11, 14, 11, 21, 52); c.line(21, 16, 21, 20, 52);
  c.set(11, 13, 54); c.set(20, 15, 54); c.addNoise(15, 6, 2, 23, 53, 0.15);
  c.outline(O); return c.toFrame();
}

function deadTree() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 39); c.dither(0, 0, 32, 32, 39, 40);
  c.rect(15, 4, 2, 26, 49); c.rect(14, 5, 4, 24, 50); c.rect(15, 6, 2, 22, 51);
  c.line(16, 8, 8, 16, 50); c.line(16, 10, 5, 20, 50); c.line(16, 12, 24, 14, 50); c.line(16, 6, 22, 10, 50); c.line(16, 8, 26, 12, 50);
  c.set(8, 15, 49); c.set(23, 13, 49); c.set(6, 16, 51); c.set(25, 14, 51); c.set(4, 17, 49); c.set(27, 13, 49);
  c.line(15, 6, 15, 28, 50); c.line(16, 6, 16, 28, 50);
  c.outline(O); return c.toFrame();
}

function deadBush() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 39); c.dither(0, 0, 32, 32, 39, 40);
  c.ellipse(16, 20, 10, 6, 51); c.ellipse(15, 19, 8, 4, 52); c.ellipse(14, 18, 6, 3, 53);
  c.dither(10, 16, 12, 10, 51, 52);
  c.set(12, 18, 53); c.set(20, 19, 53); c.set(14, 17, 54); c.set(18, 18, 54);
  c.set(11, 19, 52); c.set(21, 20, 52); c.line(11, 19, 13, 22, 52); c.line(19, 20, 21, 23, 52);
  c.outline(O); return c.toFrame();
}

function oasisWater() {
  const c = new PixelCanvas(32, 32);
  c.ellipse(16, 16, 12, 10, 29); c.ellipse(15, 15, 10, 8, 30); c.ellipse(14, 14, 7, 6, 28);
  c.dither(6, 8, 20, 18, 29, 30); c.shadeRegion(8, 14, 16, 10, 2);
  c.set(8, 10, 60); c.set(22, 12, 61); c.set(12, 18, 60); c.set(18, 20, 61);
  c.rect(10, 10, 4, 1, 30); c.rect(17, 13, 3, 1, 30);
  c.rect(0, 0, 32, 32, 39); c.dither(0, 0, 32, 32, 39, 40);
  c.outline(O); return c.toFrame();
}

function ruinsFloor() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 70); c.dither(0, 0, 32, 32, 70, 71); c.shadeRegion(4, 4, 24, 24, 1);
  c.rectOutline(0, 0, 32, 32, 72); c.addNoise(2, 2, 28, 28, 73, 0.04);
  c.line(0, 0, 32, 32, 74); c.line(8, 0, 8, 32, 74); c.line(24, 0, 24, 32, 74);
  c.set(5, 5, 75); c.set(20, 12, 75); c.set(10, 25, 75); c.set(26, 6, 75); c.set(14, 16, 76); c.set(4, 18, 76);
  c.addNoise(4, 4, 10, 10, 73, 0.06); c.addNoise(18, 18, 10, 10, 73, 0.06);
  c.outline(O); return c.toFrame();
}

function ruinsWall() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 76); c.dither(0, 0, 32, 32, 76, 77); c.rectOutline(0, 0, 32, 32, 78);
  c.line(0, 16, 32, 16, 79); c.line(16, 0, 16, 32, 79); c.addNoise(2, 2, 28, 28, 80, 0.03);
  c.set(4, 4, 81); c.set(26, 8, 81); c.set(14, 22, 81); c.set(8, 26, 82); c.set(20, 4, 81); c.set(4, 12, 81);
  c.rect(4, 4, 6, 6, 78); c.rect(22, 18, 6, 6, 78);
  c.outline(O); return c.toFrame();
}

function skullDeco() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 70); c.dither(0, 0, 32, 32, 70, 71);
  c.ellipse(16, 18, 6, 5, 76); c.ellipse(15, 17, 4, 4, 77); c.ellipse(14, 16, 3, 3, 78);
  c.set(14, 17, 78); c.set(17, 17, 78); c.rect(14, 21, 4, 3, 77); c.set(15, 22, 78); c.set(16, 22, 78); c.set(15, 23, 78);
  c.set(13, 16, 79); c.set(18, 16, 79); c.set(16, 14, 79);
  c.outline(O); return c.toFrame();
}

function boneDeco() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 70); c.dither(0, 0, 32, 32, 70, 71);
  c.line(8, 12, 24, 22, 77); c.line(10, 10, 22, 20, 78); c.ellipse(9, 11, 2, 2, 79); c.ellipse(23, 21, 2, 2, 79);
  c.ellipse(9, 11, 1, 1, 80); c.ellipse(23, 21, 1, 1, 80);
  c.line(18, 8, 12, 16, 77); c.line(20, 6, 10, 14, 78); c.ellipse(12, 8, 2, 2, 79); c.ellipse(18, 6, 2, 2, 79);
  c.outline(O); return c.toFrame();
}

// ===== SNOW TILES =====

function snow1() {
  const c = new PixelCanvas(32, 32);
  for (let y = 0; y < 32; y++) {
    const t = y / 32;
    const baseCol = t < 0.4 ? 13 : t < 0.7 ? 12 : 11;
    for (let x = 0; x < 32; x++) c.set(x, y, baseCol);
  }
  c.set(3,2,19); c.set(4,1,19); c.set(5,2,13); c.set(20,3,19); c.set(21,2,19); c.set(22,3,13);
  c.set(10,5,19); c.set(11,4,19); c.set(26,6,19); c.set(27,5,19);
  c.set(2,9,19); c.set(3,8,13); c.set(15,7,19); c.set(16,6,19); c.set(29,10,19);
  c.set(8,12,19); c.set(9,11,13); c.set(22,13,19); c.set(23,12,13);
  c.set(4,16,19); c.set(5,15,13); c.set(18,17,19); c.set(19,16,13);
  c.set(12,20,19); c.set(13,19,13); c.set(27,21,19); c.set(28,20,13);
  c.set(6,24,19); c.set(7,23,13); c.set(17,25,19); c.set(18,24,13);
  c.set(3,28,19); c.set(4,27,13); c.set(24,29,19); c.set(25,28,13);
  c.set(14,2,19); c.set(15,1,19); c.set(7,5,19); c.set(8,4,19);
  c.set(21,8,19); c.set(22,7,19); c.set(1,14,19); c.set(2,13,19);
  c.set(30,15,19); c.set(11,18,19); c.set(12,17,19); c.set(20,22,19);
  c.set(5,26,19); c.set(6,25,19); c.set(16,28,19); c.set(17,27,19);
  c.set(9,10,10); c.set(10,9,10); c.set(23,15,10); c.set(24,14,10);
  c.set(4,20,10); c.set(5,19,10); c.set(19,24,10); c.set(20,23,10);
  c.set(14,14,10); c.set(15,13,10); c.set(8,22,10); c.set(9,21,10);
  c.set(6,6,17); c.set(7,5,17); c.set(25,12,17); c.set(26,11,17);
  c.set(2,18,17); c.set(3,17,17); c.set(20,19,17); c.set(21,18,17);
  c.set(12,26,17); c.set(13,25,17); c.set(28,16,17); c.set(29,15,17);
  c.addNoise(0,0,32,32,12,0.06);
  c.outline(O); return c.toFrame();
}

function snow2() {
  const c = new PixelCanvas(32, 32);
  for (let y = 0; y < 32; y++) {
    const t = y / 32;
    const baseCol = t < 0.35 ? 13 : t < 0.65 ? 12 : 11;
    for (let x = 0; x < 32; x++) c.set(x, y, baseCol);
  }
  c.set(5,1,19); c.set(6,0,19); c.set(7,1,13); c.set(18,2,19); c.set(19,1,19); c.set(20,2,13);
  c.set(2,4,19); c.set(3,3,19); c.set(24,5,19); c.set(25,4,19);
  c.set(12,6,19); c.set(13,5,13); c.set(8,9,19); c.set(9,8,19); c.set(28,10,19);
  c.set(4,13,19); c.set(5,12,13); c.set(16,14,19); c.set(17,13,13);
  c.set(10,17,19); c.set(11,16,13); c.set(21,18,19); c.set(22,17,13);
  c.set(7,22,19); c.set(8,21,13); c.set(26,23,19); c.set(27,22,13);
  c.set(3,27,19); c.set(4,26,13); c.set(15,28,19); c.set(16,27,13);
  c.set(20,29,19); c.set(21,28,13); c.set(1,7,19); c.set(2,6,19);
  c.set(29,8,19); c.set(14,10,19); c.set(15,9,19); c.set(6,15,19);
  c.set(7,14,19); c.set(23,20,19); c.set(24,19,19); c.set(9,25,19);
  c.set(10,24,19); c.set(18,26,19); c.set(19,25,19);
  c.set(11,8,10); c.set(12,7,10); c.set(26,13,10); c.set(27,12,10);
  c.set(5,19,10); c.set(6,18,10); c.set(17,22,10); c.set(18,21,10);
  c.set(13,15,10); c.set(14,14,10); c.set(3,24,10); c.set(4,23,10);
  c.set(8,4,17); c.set(9,3,17); c.set(22,9,17); c.set(23,8,17);
  c.set(1,16,17); c.set(2,15,17); c.set(25,17,17); c.set(26,16,17);
  c.set(11,24,17); c.set(12,23,17); c.set(28,20,17); c.set(29,19,17);
  c.addNoise(0,0,32,32,12,0.06);
  c.outline(O); return c.toFrame();
}

function snow3() {
  const c = new PixelCanvas(32, 32);
  for (let y = 0; y < 32; y++) {
    const t = y / 32;
    const baseCol = t < 0.38 ? 13 : t < 0.68 ? 12 : 11;
    for (let x = 0; x < 32; x++) c.set(x, y, baseCol);
  }
  c.set(4,2,19); c.set(5,1,19); c.set(6,2,13); c.set(22,3,19); c.set(23,2,19); c.set(24,3,13);
  c.set(1,5,19); c.set(2,4,19); c.set(27,6,19); c.set(28,5,19);
  c.set(11,7,19); c.set(12,6,13); c.set(7,10,19); c.set(8,9,19); c.set(30,11,19);
  c.set(3,14,19); c.set(4,13,13); c.set(17,15,19); c.set(18,14,13);
  c.set(9,18,19); c.set(10,17,13); c.set(20,19,19); c.set(21,18,13);
  c.set(6,23,19); c.set(7,22,13); c.set(25,24,19); c.set(26,23,13);
  c.set(2,28,19); c.set(3,27,13); c.set(14,29,19); c.set(15,28,13);
  c.set(19,30,19); c.set(20,29,13); c.set(0,8,19); c.set(1,7,19);
  c.set(29,9,19); c.set(13,11,19); c.set(14,10,19); c.set(5,16,19);
  c.set(6,15,19); c.set(24,21,19); c.set(25,20,19); c.set(8,26,19);
  c.set(9,25,19); c.set(17,27,19); c.set(18,26,19);
  c.set(10,9,10); c.set(11,8,10); c.set(27,14,10); c.set(28,13,10);
  c.set(4,20,10); c.set(5,19,10); c.set(16,23,10); c.set(17,22,10);
  c.set(12,16,10); c.set(13,15,10); c.set(2,25,10); c.set(3,24,10);
  c.set(7,5,17); c.set(8,4,17); c.set(23,10,17); c.set(24,9,17);
  c.set(0,17,17); c.set(1,16,17); c.set(26,18,17); c.set(27,17,17);
  c.set(10,25,17); c.set(11,24,17); c.set(29,21,17); c.set(0,20,17);
  c.addNoise(0,0,32,32,12,0.06);
  c.outline(O); return c.toFrame();
}

function iceFlat() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 92); c.dither(0, 0, 32, 32, 92, 93); c.shadeRegion(0, 16, 32, 16, 2);
  c.set(4, 4, 94); c.set(5, 3, 95); c.set(20, 6, 94); c.set(24, 20, 95); c.set(10, 14, 94); c.set(28, 10, 95);
  c.line(2, 10, 14, 10, 96); c.line(18, 14, 28, 14, 96); c.line(6, 22, 16, 22, 96); c.line(22, 4, 30, 4, 96);
  c.rect(8, 3, 4, 1, 95); c.rect(20, 18, 3, 1, 95); c.addNoise(0, 0, 32, 32, 93, 0.02);
  c.outline(O); return c.toFrame();
}

function iceCracked() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 92); c.dither(0, 0, 32, 32, 92, 93);
  c.line(5, 5, 12, 18, 97); c.line(12, 5, 8, 20, 97); c.line(20, 10, 28, 22, 97); c.line(2, 22, 15, 28, 97);
  c.line(14, 8, 18, 16, 97); c.line(22, 4, 26, 12, 97);
  c.set(6, 12, 94); c.set(22, 15, 94); c.set(10, 10, 95); c.set(24, 18, 95); c.set(8, 14, 96); c.set(16, 20, 96);
  c.outline(O); return c.toFrame();
}

function frozenWater() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 27); c.dither(0, 0, 32, 32, 27, 28); c.shadeRegion(0, 16, 32, 16, 2);
  c.set(5, 5, 94); c.set(22, 8, 94); c.set(12, 14, 95); c.set(26, 20, 95); c.set(8, 6, 94); c.set(24, 24, 95);
  c.line(3, 10, 12, 10, 96); c.line(18, 14, 28, 14, 96); c.set(10, 18, 97); c.set(20, 20, 97);
  c.rect(6, 4, 3, 1, 95); c.rect(20, 18, 3, 1, 95);
  c.outline(O); return c.toFrame();
}

function pineS() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 82); c.dither(0, 0, 32, 32, 82, 83);
  c.rect(13, 10, 6, 20, 98); c.rect(14, 11, 4, 18, 99);
  c.ellipse(16, 8, 7, 5, 99); c.ellipse(15, 7, 5, 4, 100); c.ellipse(14, 6, 4, 3, 101);
  c.dither(11, 6, 10, 6, 99, 100);
  c.rect(14, 22, 4, 8, 101); c.rect(15, 23, 2, 7, 102);
  c.set(15, 5, 103); c.set(16, 4, 104); c.set(14, 8, 101); c.set(17, 8, 99);
  c.line(14, 12, 14, 21, 99); c.line(17, 12, 17, 21, 99); c.set(13, 14, 100); c.set(18, 14, 100);
  c.addNoise(12, 7, 8, 5, 101, 0.1);
  c.outline(O); return c.toFrame();
}

function pineL() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 82); c.dither(0, 0, 32, 32, 82, 83);
  c.rect(11, 6, 10, 24, 98); c.rect(12, 7, 8, 22, 99); c.rect(13, 8, 6, 20, 100);
  c.ellipse(16, 4, 10, 7, 99); c.ellipse(15, 3, 7, 5, 100); c.ellipse(14, 2, 5, 4, 101);
  c.dither(8, 2, 18, 10, 99, 100);
  c.rect(13, 22, 6, 8, 101); c.rect(14, 23, 4, 7, 102);
  c.set(14, 2, 103); c.set(17, 1, 104); c.set(13, 5, 101); c.set(18, 5, 99);
  c.line(12, 8, 12, 21, 99); c.line(19, 8, 19, 21, 99); c.set(11, 10, 100); c.set(20, 10, 100);
  c.addNoise(11, 3, 12, 8, 101, 0.1);
  c.outline(O); return c.toFrame();
}

function snowRock() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 82); c.dither(0, 0, 32, 32, 82, 83);
  c.ellipse(16, 18, 9, 7, 105); c.ellipse(15, 17, 7, 5, 106); c.ellipse(17, 19, 6, 4, 107);
  c.ellipse(14, 16, 5, 4, 106); c.ellipse(18, 17, 5, 4, 105);
  c.set(12, 16, 108); c.set(20, 17, 108); c.set(15, 15, 108); c.set(17, 19, 108);
  c.set(14, 18, 109); c.set(18, 18, 109); c.set(13, 20, 107); c.set(16, 21, 107);
  c.addNoise(11, 14, 10, 10, 109, 0.08);
  c.outline(O); return c.toFrame();
}

function icicleHang() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 16, 83); c.dither(0, 0, 32, 16, 83, 84);
  c.set(10, 16, 93); c.set(11, 17, 94); c.set(12, 18, 95); c.set(13, 19, 94); c.set(14, 20, 93);
  c.set(20, 16, 93); c.set(21, 17, 94); c.set(22, 18, 94); c.set(23, 19, 93);
  c.set(6, 16, 93); c.set(7, 17, 94); c.set(8, 18, 93);
  c.set(26, 16, 93); c.set(27, 17, 94); c.set(28, 18, 93);
  c.set(15, 16, 94); c.set(16, 16, 94); c.set(24, 16, 94);
  c.outline(O); return c.toFrame();
}

function snowFlower() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 82); c.dither(0, 0, 32, 32, 82, 83);
  c.ellipse(12, 20, 3, 3, 109); c.ellipse(11, 19, 2, 2, 110); c.ellipse(12, 20, 1, 1, 111);
  c.ellipse(19, 18, 3, 3, 109); c.ellipse(18, 17, 2, 2, 110); c.ellipse(19, 18, 1, 1, 111);
  c.set(12, 19, 111); c.set(19, 17, 111);
  c.line(12, 21, 12, 26, 84); c.line(19, 19, 19, 24, 84);
  c.outline(O); return c.toFrame();
}

function caveEntrance() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 82); c.dither(0, 0, 32, 32, 82, 83);
  c.ellipse(16, 22, 10, 8, 112); c.ellipse(15, 21, 8, 6, 113); c.ellipse(14, 20, 6, 5, 114);
  c.dither(9, 16, 16, 12, 112, 113);
  c.rect(8, 14, 16, 4, 114); c.dither(8, 14, 16, 4, 114, 115);
  c.set(12, 12, 116); c.set(18, 13, 116); c.set(10, 14, 115); c.set(21, 15, 115);
  c.set(14, 18, 114); c.set(17, 20, 114);
  c.outline(O); return c.toFrame();
}

// ===== RUINS TILES =====

function brokenStone1() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 117); c.dither(0, 0, 32, 32, 117, 118); c.shadeRegion(4, 4, 24, 24, 1);
  c.rectOutline(2, 2, 28, 28, 119); c.addNoise(4, 4, 24, 24, 120, 0.05);
  c.line(5, 5, 14, 12, 121); c.line(18, 8, 26, 16, 121); c.line(8, 18, 16, 26, 121);
  c.set(8, 18, 122); c.set(22, 10, 122); c.set(12, 14, 122); c.set(6, 8, 122); c.set(18, 22, 120); c.set(4, 16, 120);
  c.addNoise(5, 5, 10, 10, 120, 0.07); c.addNoise(17, 17, 10, 10, 120, 0.07);
  c.outline(O); return c.toFrame();
}

function brokenStone2() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 117); c.dither(0, 0, 32, 32, 117, 118); c.shadeRegion(6, 6, 20, 20, 1);
  c.rectOutline(4, 4, 24, 24, 119); c.addNoise(6, 6, 20, 20, 120, 0.04);
  c.line(8, 6, 16, 14, 121); c.line(6, 18, 14, 26, 121); c.line(20, 8, 28, 18, 121);
  c.set(10, 10, 122); c.set(20, 20, 122); c.set(8, 16, 122); c.set(24, 12, 122); c.set(14, 8, 120); c.set(6, 22, 120);
  c.addNoise(6, 6, 8, 8, 120, 0.06); c.addNoise(18, 18, 8, 8, 120, 0.06);
  c.outline(O); return c.toFrame();
}

function voidPool() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 123); c.dither(0, 0, 32, 32, 123, 124);
  c.ellipse(16, 16, 10, 8, 125); c.ellipse(15, 15, 7, 6, 126); c.ellipse(14, 14, 5, 5, 127);
  c.dither(10, 10, 12, 10, 125, 126); c.shadeRegion(11, 11, 10, 8, 1);
  c.set(13, 13, 127); c.set(18, 14, 127); c.set(15, 12, 128); c.set(16, 17, 128);
  c.set(14, 15, 129); c.set(17, 13, 129); c.set(12, 12, 130); c.set(19, 16, 130);
  c.circle(16, 15, 3, 128); c.circle(16, 15, 1, 129); c.addNoise(10, 10, 12, 10, 126, 0.1);
  c.outline(O); return c.toFrame();
}

function crystalGlow() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 117); c.dither(0, 0, 32, 32, 117, 118);
  c.ellipse(16, 16, 5, 8, 129); c.ellipse(15, 15, 3, 6, 130); c.ellipse(14, 14, 2, 4, 131);
  c.set(14, 14, 131); c.set(17, 15, 131); c.set(15, 13, 132); c.set(16, 17, 132);
  c.set(14, 16, 133); c.set(17, 14, 133); c.set(15, 15, 134); c.set(16, 16, 134);
  c.set(16, 14, 131); c.set(15, 16, 131);
  c.line(14, 12, 14, 20, 132); c.line(18, 12, 18, 20, 132); c.line(16, 10, 16, 22, 130);
  c.addNoise(13, 11, 6, 10, 131, 0.15);
  c.outline(O); return c.toFrame();
}

function metalGrate() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 134); c.dither(0, 0, 32, 32, 134, 135);
  for (let i = 0; i < 32; i += 4) c.line(i, 0, i, 32, 136);
  for (let i = 0; i < 32; i += 8) c.line(0, i, 32, i, 136);
  c.rectOutline(0, 0, 32, 32, 137); c.addNoise(1, 1, 30, 30, 135, 0.03);
  c.outline(O); return c.toFrame();
}

function energyConduit() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 117); c.dither(0, 0, 32, 32, 117, 118);
  c.rect(12, 4, 8, 24, 138); c.rect(13, 5, 6, 22, 139); c.rect(14, 6, 4, 20, 140);
  c.set(14, 6, 141); c.set(15, 6, 141); c.set(14, 25, 141); c.set(15, 25, 141);
  c.set(13, 10, 141); c.set(16, 10, 141); c.set(13, 20, 141); c.set(16, 20, 141);
  c.set(13, 14, 142); c.set(16, 14, 142);
  c.line(13, 8, 13, 22, 140); c.line(16, 8, 16, 22, 140); c.addNoise(13, 6, 6, 20, 140, 0.08);
  c.outline(O); return c.toFrame();
}

function brokenPillar() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 117); c.dither(0, 0, 32, 32, 117, 118);
  c.rect(12, 4, 8, 26, 142); c.dither(12, 4, 8, 26, 142, 143); c.rect(13, 5, 6, 24, 143);
  c.rect(11, 8, 10, 4, 144); c.rect(11, 22, 10, 4, 144); c.rect(12, 9, 8, 2, 145); c.rect(12, 23, 8, 2, 145);
  c.ellipse(16, 4, 5, 3, 145); c.ellipse(15, 3, 4, 2, 146);
  c.set(14, 3, 146); c.set(17, 3, 145); c.set(14, 27, 143); c.set(17, 27, 142);
  c.line(13, 10, 13, 22, 144); c.line(18, 10, 18, 22, 144);
  c.outline(O); return c.toFrame();
}

function rubblePile() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 117); c.dither(0, 0, 32, 32, 117, 118);
  c.ellipse(10, 22, 6, 4, 147); c.ellipse(9, 21, 4, 3, 148); c.ellipse(22, 20, 5, 3, 147); c.ellipse(21, 19, 3, 2, 148);
  c.ellipse(16, 24, 4, 3, 148); c.ellipse(8, 18, 3, 2, 147); c.ellipse(25, 16, 3, 2, 148);
  c.set(9, 21, 149); c.set(23, 19, 149); c.set(15, 23, 149); c.set(8, 17, 149); c.set(25, 15, 149); c.set(17, 25, 149);
  c.set(11, 20, 148); c.set(20, 19, 148);
  c.outline(O); return c.toFrame();
}

function ancientDoorway() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 150); c.dither(0, 0, 32, 32, 150, 151);
  c.rect(10, 6, 12, 24, 152); c.rect(11, 7, 10, 22, 153); c.rect(12, 8, 8, 20, 154);
  c.ellipse(16, 18, 4, 5, 154); c.ellipse(15, 17, 3, 4, 155);
  c.set(14, 17, 156); c.set(17, 17, 156); c.set(14, 20, 156); c.set(17, 20, 156);
  c.rect(12, 8, 3, 16, 156); c.rect(17, 8, 3, 16, 156); c.set(11, 8, 155); c.set(20, 8, 155); c.set(11, 23, 155); c.set(20, 23, 155);
  c.rect(9, 5, 14, 3, 157); c.rect(9, 28, 14, 3, 157);
  c.outline(O); return c.toFrame();
}

function voidCrystalCluster() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 117); c.dither(0, 0, 32, 32, 117, 118);
  c.ellipse(12, 18, 4, 6, 129); c.ellipse(11, 17, 3, 5, 130); c.ellipse(12, 18, 2, 4, 131);
  c.ellipse(20, 16, 3, 5, 129); c.ellipse(19, 15, 2, 4, 130); c.ellipse(16, 22, 3, 4, 129); c.ellipse(15, 21, 2, 3, 130);
  c.ellipse(8, 20, 2, 3, 130);
  c.set(11, 17, 131); c.set(19, 15, 131); c.set(15, 21, 131); c.set(12, 19, 132); c.set(21, 17, 132); c.set(8, 19, 132); c.set(16, 23, 132); c.set(11, 16, 132);
  c.addNoise(11, 15, 12, 12, 131, 0.1);
  c.outline(O); return c.toFrame();
}

function crackedFloor() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 117); c.dither(0, 0, 32, 32, 117, 118);
  c.line(2, 8, 14, 20, 157); c.line(14, 8, 8, 22, 157); c.line(18, 4, 28, 16, 157); c.line(6, 18, 20, 28, 157);
  c.line(10, 12, 16, 14, 158); c.line(22, 20, 26, 24, 158);
  c.set(8, 14, 158); c.set(16, 10, 158); c.set(22, 20, 158); c.set(12, 24, 158);
  c.set(4, 12, 159); c.set(24, 14, 159); c.set(14, 18, 159); c.set(8, 22, 159);
  c.outline(O); return c.toFrame();
}

// ===== HOLY CITY TILES =====

function marbleWhite() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 159); c.dither(0, 0, 32, 32, 159, 160); c.shadeRegion(0, 16, 32, 16, 1);
  c.addNoise(1, 1, 30, 30, 161, 0.02);
  c.line(0, 0, 32, 32, 162); c.line(16, 0, 16, 32, 162); c.line(8, 0, 8, 32, 162); c.line(24, 0, 24, 32, 162);
  c.set(4, 4, 163); c.set(24, 12, 163); c.set(8, 20, 163); c.set(28, 4, 163);
  c.set(12, 8, 164); c.set(20, 24, 164);
  c.addNoise(2, 2, 12, 12, 161, 0.03); c.addNoise(18, 18, 10, 10, 161, 0.03);
  c.outline(O); return c.toFrame();
}

function marbleGold() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 159); c.dither(0, 0, 32, 32, 159, 160);
  c.rectOutline(4, 4, 24, 24, 164); c.rectOutline(6, 6, 20, 20, 165); c.rectOutline(8, 8, 16, 16, 166);
  for (let i = 4; i < 28; i += 6) { c.line(i, 4, i, 28, 166); c.line(4, i, 28, i, 166); }
  c.set(16, 16, 167); c.set(15, 15, 168); c.set(16, 15, 169); c.set(15, 16, 169);
  c.set(12, 12, 166); c.set(20, 20, 166); c.set(10, 10, 165); c.set(22, 22, 165);
  c.addNoise(5, 5, 22, 22, 166, 0.02);
  c.outline(O); return c.toFrame();
}

function holyWaterPool() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 167); c.dither(0, 0, 32, 32, 167, 168);
  c.ellipse(16, 16, 10, 8, 169); c.ellipse(15, 15, 8, 6, 170); c.ellipse(14, 14, 6, 5, 171);
  c.dither(8, 10, 16, 14, 169, 170); c.shadeRegion(10, 14, 12, 8, 2);
  c.set(8, 10, 171); c.set(22, 12, 172); c.set(12, 18, 171); c.set(18, 20, 172);
  c.rect(10, 11, 4, 1, 170); c.rect(17, 14, 3, 1, 170);
  c.set(16, 14, 173); c.set(15, 13, 173);
  c.outline(O); return c.toFrame();
}

function stainedGlass() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 173); c.rectOutline(2, 2, 28, 28, 174);
  c.rect(4, 4, 10, 10, 175); c.rect(6, 6, 6, 6, 176); c.rect(18, 4, 10, 10, 177); c.rect(20, 6, 6, 6, 178);
  c.rect(4, 18, 10, 10, 179); c.rect(6, 20, 6, 6, 180); c.rect(18, 18, 10, 10, 181); c.rect(20, 20, 6, 6, 182);
  c.rect(12, 12, 8, 8, 183); c.rect(13, 13, 6, 6, 184);
  c.set(9, 9, 185); c.set(23, 9, 186); c.set(9, 23, 187); c.set(23, 23, 188); c.set(16, 16, 189);
  c.set(8, 8, 176); c.set(22, 8, 178); c.set(8, 22, 180); c.set(22, 22, 182);
  c.outline(O); return c.toFrame();
}

function angelStatueBase() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 159); c.dither(0, 0, 32, 32, 159, 160);
  c.ellipse(16, 20, 6, 8, 185); c.ellipse(15, 19, 4, 6, 186); c.ellipse(14, 18, 3, 5, 187);
  c.ellipse(16, 14, 4, 4, 185); c.ellipse(15, 13, 3, 3, 186);
  c.set(15, 12, 187); c.set(16, 12, 187); c.set(14, 19, 188); c.set(17, 19, 188); c.set(14, 21, 189); c.set(17, 21, 189);
  c.rect(14, 26, 4, 4, 189); c.rect(15, 27, 2, 2, 190);
  c.set(15, 14, 186); c.set(16, 14, 186); c.set(15, 15, 187); c.set(16, 15, 187);
  c.outline(O); return c.toFrame();
}

function floatingPlatform() {
  const c = new PixelCanvas(32, 32);
  c.rect(4, 20, 24, 8, 190); c.rect(5, 21, 22, 6, 191); c.rect(6, 22, 20, 4, 192);
  c.ellipse(16, 18, 10, 3, 193); c.ellipse(15, 17, 8, 2, 194);
  c.set(10, 18, 195); c.set(22, 18, 195); c.set(12, 17, 196); c.set(20, 17, 196);
  c.set(8, 21, 192); c.set(23, 21, 192); c.set(6, 22, 193); c.set(25, 22, 193);
  c.set(16, 18, 195); c.set(15, 17, 196);
  c.outline(O); return c.toFrame();
}

function lightBeamFloor() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 196); c.dither(0, 0, 32, 32, 196, 197);
  c.rect(10, 10, 12, 12, 198); c.dither(10, 10, 12, 12, 198, 199); c.rect(11, 11, 10, 10, 199);
  c.set(14, 14, 200); c.set(15, 14, 200); c.set(14, 17, 200); c.set(15, 17, 200);
  c.set(13, 13, 201); c.set(16, 13, 201); c.set(13, 18, 201); c.set(16, 18, 201);
  c.set(14, 15, 200); c.set(15, 16, 200);
  c.addNoise(11, 11, 10, 10, 200, 0.1);
  c.outline(O); return c.toFrame();
}

function goldenPillar() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 159); c.dither(0, 0, 32, 32, 159, 160);
  c.rect(12, 2, 8, 28, 202); c.dither(12, 2, 8, 28, 202, 203); c.rect(13, 3, 6, 26, 203);
  c.rect(10, 6, 12, 4, 204); c.rect(10, 22, 12, 4, 204); c.rect(11, 7, 10, 2, 205); c.rect(11, 23, 10, 2, 205);
  c.ellipse(16, 2, 5, 3, 205); c.ellipse(15, 1, 4, 2, 206);
  c.set(14, 1, 206); c.set(17, 1, 205); c.set(13, 6, 206); c.set(18, 6, 206); c.set(13, 26, 204); c.set(18, 26, 204);
  c.line(13, 8, 13, 22, 204); c.line(18, 8, 18, 22, 204);
  c.outline(O); return c.toFrame();
}

function thronePlatform() {
  const c = new PixelCanvas(32, 32);
  c.rect(2, 20, 28, 10, 207); c.rect(3, 21, 26, 8, 208); c.rect(4, 22, 24, 6, 209);
  c.rect(8, 16, 16, 6, 210); c.rect(9, 17, 14, 4, 211);
  c.ellipse(16, 14, 6, 4, 212); c.ellipse(15, 13, 4, 3, 213);
  c.set(14, 13, 214); c.set(17, 13, 214);
  c.set(5, 21, 209); c.set(26, 21, 209); c.set(9, 17, 211); c.set(22, 17, 211);
  c.set(12, 15, 213); c.set(20, 15, 213); c.set(16, 14, 214); c.set(15, 13, 215);
  c.outline(O); return c.toFrame();
}

function voidRiftTile() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 123); c.dither(0, 0, 32, 32, 123, 124);
  c.ellipse(16, 16, 8, 6, 125); c.ellipse(15, 15, 5, 4, 126); c.ellipse(14, 14, 4, 3, 127);
  c.dither(11, 11, 10, 8, 125, 126); c.shadeRegion(12, 12, 8, 6, 1);
  c.set(13, 13, 127); c.set(18, 14, 127); c.set(14, 12, 128); c.set(16, 16, 128);
  c.set(15, 14, 129); c.set(17, 13, 129);
  c.circle(16, 14, 2, 128); c.circle(16, 14, 1, 129); c.addNoise(11, 11, 10, 8, 126, 0.1);
  c.outline(O); return c.toFrame();
}

function glowingRune() {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 0, 32, 32, 214); c.dither(0, 0, 32, 32, 214, 215);
  c.circle(16, 16, 6, 216); c.circle(16, 16, 4, 217); c.circle(16, 16, 2, 218);
  c.set(14, 14, 218); c.set(17, 15, 218); c.set(15, 17, 218); c.set(16, 14, 219);
  c.set(14, 15, 219); c.set(17, 17, 219); c.set(15, 15, 218); c.set(16, 16, 218);
  c.set(16, 15, 219); c.set(15, 16, 219);
  c.addNoise(12, 12, 8, 8, 217, 0.12);
  c.outline(O); return c.toFrame();
}

// ===== PLAYER SPRITE (48x64) =====

function drawPlayerBase(c:PixelCanvas, legPhase:number, cloakSway:number, swordAngle:number, bodyBob:number, facing:string){
  const O=1,CD=2,CM=3,CL=4,CH=5,AD=6,AM=7,AH=8,AL=9,SD=10,SM=11,SH=12,SL=13,BD=14,BM=15,BH=16,HI=17,EY=18,BE=20,BU=21;
  const by=4+bodyBob,cx=24;
  if(facing==="down"||facing==="up"){
    const cw=10+Math.abs(cloakSway);
    c.ellipse(cx,22+by,cw,14,CM);c.ellipse(cx-1,21+by,cw-1,12,CL);c.ellipse(cx-2,19+by,cw-3,9,CH);
    c.ellipse(cx+2+cloakSway,23+by,7,11,CD);
    c.line(cx-7+cloakSway*0.5,14+by,cx-8+cloakSway*0.5,34+by,CD);
    c.line(cx+7+cloakSway*0.5,14+by,cx+8+cloakSway*0.5,34+by,CD);
    for(let i=0;i<6;i++){c.set(Math.round(cx-6+cloakSway*0.3),16+by+i*3,CL);c.set(Math.round(cx+5+cloakSway*0.3),17+by+i*3,CD);}
    const lx=cx-5,rx=cx+3,lo=Math.round(Math.sin(legPhase)*3),ro=Math.round(Math.sin(legPhase+Math.PI)*3);
    c.rect(lx,32+by,4,7+Math.max(0,lo),CM);c.rect(rx,32+by,4,7+Math.max(0,ro),CM);
    c.set(lx,32+by,CL);c.set(rx,32+by,CL);c.set(lx+3,32+by+3+Math.max(0,lo),CD);c.set(rx+3,32+by+3+Math.max(0,ro),CD);
    c.rect(lx-1,37+by+lo,5,4,BD);c.set(lx-1,37+by+lo,BM);c.set(lx,37+by+lo,BH);
    c.rect(rx-1,37+by+ro,5,4,BD);c.set(rx-1,37+by+ro,BM);c.set(rx,37+by+ro,BH);
    c.rect(cx-8,17+by,16,11,AM);c.rect(cx-7,17+by,14,3,AH);
    for(let i=-7;i<=7;i++)c.set(cx+i,17+by,AH);
    c.rect(cx-8,26+by,16,2,AD);c.rect(cx+4,18+by,5,8,AD);c.rect(cx-7,18+by,4,7,AL);
    c.line(cx-4,18+by,cx-4,26+by,AD);c.line(cx+4,18+by,cx+4,26+by,AD);
    for(let i=0;i<3;i++){c.set(cx-3+i,19+by,AH);c.set(cx-3+i,23+by,AM);}
    c.rect(cx-8,27+by,16,2,BE);c.set(cx-1,27+by,BU);c.set(cx,27+by,BU);c.set(cx+1,27+by,BU);
    c.ellipse(cx-9,17+by,4,3,AM);c.ellipse(cx+9,17+by,4,3,AM);
    c.set(cx-11,16+by,AH);c.set(cx-10,16+by,AH);c.set(cx+10,16+by,AH);c.set(cx+11,16+by,AH);
    c.set(cx-11,19+by,AD);c.set(cx+11,19+by,AD);
    if(facing==="down"){
      c.ellipse(cx,11+by,7,7,SM);c.ellipse(cx-1,10+by,6,6,SH);c.ellipse(cx+1,12+by,5,5,SD);
      c.ellipse(cx,8+by,8,5,BM);c.ellipse(cx-1,7+by,6,4,CL);c.ellipse(cx+1,9+by,6,4,CH);
      c.rect(cx-7,8+by,4,5,BM);c.rect(cx+3,8+by,4,5,CH);
      c.set(cx-7,8+by,CL);c.set(cx-7,9+by,BM);c.set(cx-7,10+by,CH);c.set(cx-7,11+by,CH);
      c.set(cx+6,8+by,CH);c.set(cx+6,9+by,CH);c.set(cx+6,10+by,CH);c.set(cx+6,11+by,CL);
      c.set(cx-4,6+by,CL);c.set(cx-3,5+by,CM);c.set(cx-2,4+by,CL);c.set(cx-1,4+by,CM);
      c.set(cx,4+by,CM);c.set(cx+1,4+by,CH);c.set(cx+2,4+by,CH);c.set(cx+3,5+by,CH);c.set(cx+4,6+by,CH);
      c.set(cx-3,11+by,EY);c.set(cx-2,11+by,EY);c.set(cx+2,11+by,EY);c.set(cx+3,11+by,EY);
      c.set(cx-2,12+by,SL);c.set(cx-1,12+by,SL);c.set(cx+1,12+by,SL);c.set(cx+2,12+by,SL);
      c.set(cx-2,13+by,SM);c.set(cx-1,13+by,SH);c.set(cx,13+by,SM);c.set(cx+1,13+by,SD);
      c.set(cx+2,13+by,SD);c.set(cx-1,14+by,SM);c.set(cx,14+by,SD);c.set(cx+1,14+by,SD);
      c.set(cx,15+by,EY);c.set(cx,15+by,EY);
    } else {
      c.ellipse(cx,11+by,7,6,SM);c.ellipse(cx-1,10+by,6,5,SH);c.ellipse(cx+1,12+by,5,4,SD);
      c.ellipse(cx,8+by,8,4,BM);c.ellipse(cx-1,7+by,6,3,CL);c.rect(cx-7,8+by,4,4,BM);c.rect(cx+3,8+by,4,4,BM);
      c.set(cx-7,8+by,CL);c.set(cx+6,8+by,CL);
      c.set(cx-4,6+by,CL);c.set(cx-3,5+by,CM);c.set(cx-2,4+by,CL);c.set(cx,4+by,CM);c.set(cx+1,4+by,CL);c.set(cx+2,5+by,CL);
      c.set(cx-3,12+by,SM);c.set(cx-2,12+by,SH);c.set(cx,12+by,SM);c.set(cx+1,12+by,SH);c.set(cx+2,12+by,SD);
    }
    const sx=cx+12,sy=18+by;
    if(swordAngle===0){c.rect(sx,sy-8,2,10,BM);c.set(sx,sy-8,BH);c.set(sx,sy-7,BH);c.set(sx,sy-6,BH);c.rect(sx+2,sy-6,1,7,BD);c.rect(sx-1,sy+2,5,2,HI);c.set(sx,sy+2,BU);}
    else if(swordAngle===1){c.rect(sx+2,sy-10,2,10,BM);c.set(sx+2,sy-10,BH);c.rect(sx+3,sy-8,1,7,BD);c.rect(sx,sy-2,5,2,HI);c.set(sx+1,sy-2,BU);}
    else if(swordAngle===2){for(let i=0;i<10;i++){c.set(sx+i,sy+2-Math.round(i*0.8),BM);c.set(sx+i,sy+3-Math.round(i*0.8),BD);}c.set(sx,sy+2,BH);c.set(sx+1,sy+1,BH);c.rect(sx-1,sy+4,5,2,HI);}
    else{c.rect(sx-3,sy+2,10,2,BM);c.set(sx-3,sy+2,BH);c.set(sx-2,sy+2,BH);c.set(sx-1,sy+2,BH);c.rect(sx+5,sy,1,6,BD);c.rect(sx+2,sy+4,5,2,HI);}
    c.rect(cx-7+cloakSway*0.3,19+by,3,9,CM);c.set(cx-7+cloakSway*0.3,19+by,CL);
    c.rect(cx+4+cloakSway*0.3,19+by,3,9,CM);c.set(cx+4+cloakSway*0.3,19+by,CL);
    c.set(cx-6+cloakSway*0.3,26+by,SM);c.set(cx+6+cloakSway*0.3,26+by,SM);
  } else {
    const sc=facing==="left"?cx-2:cx+2,sd=facing==="left"?-1:1;
    c.ellipse(sc,22+by,8,13,CM);c.ellipse(sc-sd,21+by,7,11,CL);c.ellipse(sc-sd*2,19+by,5,8,CH);c.ellipse(sc+sd*2,24+by,6,10,CD);
    c.line(sc-5*sd,14+by,sc-6*sd,33+by,CD);
    for(let i=0;i<5;i++)c.set(Math.round(sc-4*sd),16+by+i*3,CL);
    const lx=sc-sd,lo=Math.round(Math.sin(legPhase)*3);
    c.rect(lx,32+by,4,7+Math.max(0,lo),CM);c.set(lx,32+by,CL);c.set(lx+3,32+by+3+Math.max(0,lo),CD);
    c.rect(lx-1,37+by+lo,5,4,BD);c.set(lx-1,37+by+lo,BM);c.set(lx,37+by+lo,BH);c.set(lx+1,38+by+lo,BM);
    c.rect(sc-7,17+by,12,10,AM);c.rect(sc-6,17+by,10,3,AH);c.rect(sc-7,25+by,12,2,AD);
    c.rect(sc+2,18+by,4,7,AD);c.rect(sc-6,18+by,3,6,AL);c.line(sc-3,18+by,sc-3,25+by,AD);
    c.set(sc-2,19+by,AH);c.set(sc-1,19+by,AH);c.set(sc-2,23+by,AM);
    c.rect(sc-7,26+by,12,2,BE);c.set(sc,26+by,BU);c.set(sc+1,26+by,BU);
    c.ellipse(sc-8,17+by,3,2,AM);c.ellipse(sc+6,17+by,3,2,AM);
    c.set(sc-9,16+by,AH);c.set(sc+7,16+by,AH);c.set(sc-9,18+by,AD);
    const hc=sc-sd;
    c.ellipse(hc,11+by,6,6,SM);c.ellipse(hc-sd,10+by,5,5,SH);c.ellipse(hc+sd,12+by,4,4,SD);
    c.ellipse(hc,7+by,7,4,BM);c.ellipse(hc-sd,6+by,5,3,CL);c.ellipse(hc+sd,8+by,5,3,CH);
    c.rect(hc-4*sd,7+by,3,4,BM);c.set(hc-4*sd,7+by,CL);c.set(hc+2*sd,7+by,CH);
    c.set(hc-sd*2,5+by,CL);c.set(hc-sd,4+by,CM);c.set(hc,4+by,CL);c.set(hc+sd,5+by,CH);c.set(hc+sd*2,6+by,CH);
    const ex=hc+sd;
    c.set(ex,10+by,EY);c.set(ex+sd,10+by,SL);c.set(ex,12+by,SM);c.set(ex-sd,12+by,SH);c.set(ex,13+by,SD);
    const ax=sc-5*sd;
    c.rect(ax,18+by,3,8,CM);c.set(ax,18+by,CL);c.set(ax,25+by,SM);
    const wsx=sc+8*sd,wsy=18+by;
    if(swordAngle===0){c.rect(wsx,wsy-7,2,9,BM);c.set(wsx,wsy-7,BH);c.set(wsx,wsy-6,BH);c.rect(wsx+2,wsy-5,1,6,BD);c.rect(wsx-1,wsy+2,5,2,HI);}
    else if(swordAngle===2){for(let i=0;i<9;i++){c.set(wsx+i*sd,wsy+1-Math.round(i*0.7),BM);c.set(wsx+i*sd,wsy+2-Math.round(i*0.7),BD);}c.rect(wsx-sd*2,wsy+3,5,2,HI);}
  }
  c.outline(O);
}

function createPlayerSprite(){
  const idle:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(48,64);drawPlayerBase(c,0,Math.sin(i*0.8)*1.5,0,i%2===0?0:-1,"down");idle.push(c.toFrame());}
  const wd:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(48,64);drawPlayerBase(c,i*(Math.PI/2),Math.sin(i*(Math.PI/2))*2,0,i%2===0?0:-1,"down");wd.push(c.toFrame());}
  const wu:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(48,64);drawPlayerBase(c,i*(Math.PI/2),-Math.sin(i*(Math.PI/2))*2,0,i%2===0?0:-1,"up");wu.push(c.toFrame());}
  const wl:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(48,64);drawPlayerBase(c,i*(Math.PI/2),-2,0,i%2===0?0:-1,"left");wl.push(c.toFrame());}
  const wr:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(48,64);drawPlayerBase(c,i*(Math.PI/2),2,0,i%2===0?0:-1,"right");wr.push(c.toFrame());}
  const ad:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(48,64);drawPlayerBase(c,0,i<2?i*2:(3-i)*2,i,i<2?-i*2:-(3-i)*2,"down");ad.push(c.toFrame());}
  const au:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(48,64);drawPlayerBase(c,0,0,i,i<2?-i*3:-(3-i)*3,"up");au.push(c.toFrame());}
  const as_:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(48,64);drawPlayerBase(c,0,i<2?i*2:(3-i)*2,i,i<2?-i:-(3-i),"right");as_.push(c.toFrame());}
  const ds:SpriteFrame[]=[];
  {const c1=new PixelCanvas(48,64);drawPlayerBase(c1,0,4,0,0,"down");for(let i=0;i<3;i++){c1.set(2+i*2,28+i,29);c1.set(2+i*2,29+i,29);}ds.push(c1.toFrame());
   const c2=new PixelCanvas(48,64);drawPlayerBase(c2,0,-3,0,0,"down");for(let i=0;i<3;i++){c2.set(40-i*2,28+i,29);c2.set(40-i*2,29+i,29);}ds.push(c2.toFrame());
   const c3=new PixelCanvas(48,64);drawPlayerBase(c3,0,0,0,-2,"down");ds.push(c3.toFrame());}
  const ht:SpriteFrame[]=[];
  {const c1=new PixelCanvas(48,64);drawPlayerBase(c1,0,0,0,0,"down");ht.push(c1.toFrame());ht.push(flashFrame(ht[0],28));}
  const sc:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(48,64);drawPlayerBase(c,0,0,0,0,"down");
    const gr=4+i*3;c.circle(24,14,gr,26);c.circle(24,14,gr-2,27);
    if(i>=2){c.circle(24,14,gr-4,28);c.set(24,12,29);c.set(23,13,29);c.set(25,13,29);}sc.push(c.toFrame());}
  return{id:"player",palette:PP,animations:{idle:makeAnim("idle",idle,200,true),walk_down:makeAnim("walk_down",wd,120,true),walk_up:makeAnim("walk_up",wu,120,true),walk_left:makeAnim("walk_left",wl,120,true),walk_right:makeAnim("walk_right",wr,120,true),attack_down:makeAnim("attack_down",ad,80,false),attack_up:makeAnim("attack_up",au,80,false),attack_side:makeAnim("attack_side",as_,80,false),dash:makeAnim("dash",ds,60,false),hurt:makeAnim("hurt",ht,100,false),skill_cast:makeAnim("skill_cast",sc,100,false)}};
}

// ===== ENEMY SPRITES (40x56) =====

function drawSlime(c:PixelCanvas,frame:number,squish:number){
  const O=1,BD=2,BM=3,BL=4,BH=5,BS=6,SH=7,HL=8,EY=9,PD=10,PL=11,WH=12;
  const by=28+squish,hm=-squish*0.6,wm=squish*0.4,cx=20;
  c.ellipse(cx,by,12+wm,10+hm,BM);c.ellipse(cx-1,by-1,10+wm,8+hm,BL);c.ellipse(cx-2,by-2,7+wm,5+hm,BH);c.ellipse(cx+2,by+2,9+wm,6+hm,BD);
  c.set(cx-10-wm,by+5+hm,BM);c.set(cx-11-wm,by+6+hm,BD);c.set(cx+10+wm,by+5+hm,BM);c.set(cx+11+wm,by+6+hm,BD);
  c.set(cx-6+wm,by+7+hm,BM);c.set(cx-6+wm,by+8+hm,BD);c.set(cx+5-wm,by+7+hm,BM);c.set(cx+5-wm,by+8+hm,BD);
  c.set(cx-2,by+8+hm,BM);c.set(cx-2,by+9+hm,BD);c.set(cx+2,by+8+hm,BM);c.set(cx+2,by+9+hm,BD);
  c.set(cx-4,by-4+hm,SH);c.set(cx-3,by-5+hm,WH);c.set(cx-3,by-4+hm,SH);c.set(cx-2,by-4+hm,HL);c.set(cx-1,by-4+hm,HL);
  c.set(cx-4,by-1+hm,EY);c.set(cx-3,by-1+hm,WH);c.set(cx+3,by-1+hm,EY);c.set(cx+4,by-1+hm,WH);
  c.set(cx-3,by+1+hm,PD);c.set(cx+4,by+1+hm,PD);
  c.set(cx-2,by+3+hm,BD);c.set(cx-1,by+4+hm,BD);c.set(cx,by+4+hm,BD);c.set(cx+1,by+3+hm,BD);c.set(cx+2,by+3+hm,BD);
  c.dither(cx-6,by+1+hm,5,4,BM,BL);c.dither(cx+2,by+1+hm,5,4,BM,BD);
  c.outline(O);
}

function createSlimeSprite(){
  const idle:SpriteFrame[]=[],sq=[0,-3,2,0];
  for(let i=0;i<4;i++){const c=new PixelCanvas(40,56);drawSlime(c,i,sq[i]);idle.push(c.toFrame());}
  const attack:SpriteFrame[]=[],asq=[-4,3,-1,0];
  for(let i=0;i<4;i++){const c=new PixelCanvas(40,56);drawSlime(c,i,asq[i]);if(i===1){c.rect(6,22,6,4,4);c.set(6,22,5);c.set(7,21,5);c.set(8,20,5);c.set(6,23,2);}attack.push(c.toFrame());}
  const ht:SpriteFrame[]=[];{const c1=new PixelCanvas(40,56);drawSlime(c1,0,0);ht.push(c1.toFrame());ht.push(flashFrame(ht[0],28));}
  return{id:"slime",palette:SKP,animations:{idle:makeAnim("idle",idle,200,true),attack:makeAnim("attack",attack,80,false),hurt:makeAnim("hurt",ht,100,false)}};
}

function drawWolf(c:PixelCanvas,frame:number){
  const O=1,BD=2,BM=3,BL=4,BH=5,EY=6,NR=7,WH=8,PD=9,PL=10;
  const cx=20,cy=28,bob=Math.sin(frame*0.8)*2;
  c.ellipse(cx-2,18+bob,8,7,BM);c.ellipse(cx-3,17+bob,6,5,BL);c.ellipse(cx+3,19+bob,6,5,BD);
  c.set(cx-9+bob/2,16+bob,BL);c.set(cx-10+bob/2,17+bob,BM);
  c.line(cx-6+bob/2,14+bob,cx-12+bob/2,8+bob,BM);c.line(cx-5+bob/2,13+bob,cx-11+bob/2,7+bob,BL);
  c.line(cx-4+bob/2,12+bob,cx-10+bob/2,6+bob,BH);c.line(cx-3+bob/2,11+bob,cx-9+bob/2,5+bob,BH);
  c.set(cx-12+bob/2,7+bob,BH);c.set(cx-11+bob/2,6+bob,BH);c.set(cx-10+bob/2,5+bob,BL);
  c.set(cx-8+bob/2,8+bob,NR);c.set(cx-7+bob/2,7+bob,EY);c.set(cx-6+bob/2,8+bob,WH);
  c.set(cx-5+bob/2,9+bob,PD);c.set(cx-4+bob/2,10+bob,PL);
  c.rect(cx-3,24+bob,10,6,BM);c.rect(cx-2,25+bob,8,4,BL);c.rect(cx-1,26+bob,6,2,BD);
  c.set(cx-4,23+bob,BL);c.set(cx+6,23+bob,BD);
  c.line(cx-1,27+bob,cx-3,34+bob,BL);c.line(cx+1,27+bob,cx-1,34+bob,BD);
  c.set(cx-3,33+bob,BM);c.set(cx-2,34+bob,BH);c.set(cx-1,34+bob,BH);
  c.set(cx+1,33+bob,BM);c.set(cx,34+bob,BH);c.set(cx+1,34+bob,BD);
  c.line(cx-8,30+bob,cx-4,32+bob,BM);c.line(cx+4,30+bob,cx,32+bob,BD);
  c.set(cx-8,29+bob,BL);c.set(cx+4,29+bob,BD);
  if(frame%2===0){c.set(cx-7+bob/2,15+bob,BH);c.set(cx-6+bob/2,14+bob,BH);}
  else{c.set(cx-4+bob/2,16+bob,BH);}
  c.outline(O);
}

function createWolfSprite(){
  const idle:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(40,56);drawWolf(c,i);idle.push(c.toFrame());}
  const attack:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(40,56);drawWolf(c,i);if(i===1){c.line(8,20,2,14,3);c.set(2,14,5);}if(i===2){c.line(6,22,-2,16,3);}attack.push(c.toFrame());}
  const ht:SpriteFrame[]=[];{const c1=new PixelCanvas(40,56);drawWolf(c1,0);ht.push(c1.toFrame());ht.push(flashFrame(ht[0],28));}
  return{id:"wolf",palette:SKP,animations:{idle:makeAnim("idle",idle,150,true),attack:makeAnim("attack",attack,70,false),hurt:makeAnim("hurt",ht,100,false)}};
}

function drawScorpion(c:PixelCanvas,frame:number){
  const O=1,BD=2,BM=3,BL=4,BH=5,AC=6,AL=7,EY=8,ST=9;
  const cx=20,cy=26,legOff=Math.sin(frame*0.9)*2;
  c.ellipse(cx,22,10,7,BM);c.ellipse(cx-1,21,8,5,BL);c.ellipse(cx+1,23,7,5,BD);
  c.ellipse(cx-2,16,6,4,BM);c.ellipse(cx-3,15,4,3,BL);c.set(cx-7,14,BL);c.set(cx-6,13,BM);
  c.set(cx-5,15,EY);c.set(cx-4,15,ST);c.set(cx-3,16,EY);
  c.ellipse(cx+4,17,4,3,AC);c.ellipse(cx+5,18,3,2,AL);
  for(let i=0;i<4;i++){
    const la=i*4-6,lo=i===0||i===2?legOff:-legOff;
    c.line(cx+la,28,cx+la-3,34+lo,BL);c.line(cx+la+1,28,cx+la-2,34+lo,BD);
    c.set(cx+la-3,34+lo,BM);c.set(cx+la-3,35+lo,BH);
    c.set(cx+la-2,34+lo,i<2?BM:BH);c.set(cx+la-2,35+lo,BD);
  }
  c.line(cx-6,28,cx-10,34-legOff,BL);c.line(cx-5,28,cx-9,34-legOff,BD);
  c.set(cx-10,34-legOff,BM);c.set(cx-10,35-legOff,BH);
  c.ellipse(cx+8,26,6,3,BM);c.ellipse(cx+9,27,4,2,BD);
  c.line(cx+10,28,cx+14,32+Math.abs(legOff),BL);c.line(cx+11,28,cx+15,32+Math.abs(legOff),BD);
  c.set(cx+14,32+Math.abs(legOff),BM);c.set(cx+14,33+Math.abs(legOff),BH);
  c.set(cx-2,20,BH);c.set(cx+2,22,BH);c.set(cx-1,24,BH);c.set(cx+1,25,BD);
  c.outline(O);
}

function createScorpionSprite(){
  const idle:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(40,56);drawScorpion(c,i);idle.push(c.toFrame());}
  const attack:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(40,56);drawScorpion(c,i);if(i>=1){c.line(28,18,36,10,6);}attack.push(c.toFrame());}
  const ht:SpriteFrame[]=[];{const c1=new PixelCanvas(40,56);drawScorpion(c1,0);ht.push(c1.toFrame());ht.push(flashFrame(ht[0],28));}
  return{id:"scorpion",palette:SKP,animations:{idle:makeAnim("idle",idle,150,true),attack:makeAnim("attack",attack,70,false),hurt:makeAnim("hurt",ht,100,false)}};
}

function drawMummy(c:PixelCanvas,frame:number){
  const O=1,BD=2,BM=3,BL=4,BH=5,EY=6,WR=7,WH=8,SD=9;
  const cx=20,by=4+Math.sin(frame*0.7)*2;
  c.rect(cx-6,16+by,12,18,BM);c.rect(cx-5,17+by,10,16,BL);c.rect(cx-4,18+by,8,14,BD);
  c.ellipse(cx,10+by,6,5,BM);c.ellipse(cx-1,9+by,5,4,BL);c.set(cx-6,9+by,BL);c.set(cx+5,9+by,BL);
  c.set(cx-2,8+by,WR);c.set(cx-1,7+by,WR);c.set(cx,7+by,WR);c.set(cx+1,8+by,WR);
  c.set(cx-2,11+by,EY);c.set(cx+2,11+by,EY);c.set(cx-1,13+by,SD);c.set(cx+1,13+by,SD);c.set(cx,14+by,SD);
  c.line(cx-5,18+by,cx-5,30+by,BL);c.line(cx+4,18+by,cx+4,30+by,BD);
  for(let i=0;i<5;i++){c.set(cx-6+i*3,20+by+i*2,WR);c.set(cx-5+i*3,21+by+i*2,WH);}
  c.rect(cx-5,32+by,4,6,BM);c.set(cx-5,32+by,BL);c.set(cx-2,36+by,BH);
  c.rect(cx+1,32+by,4,6,BM);c.set(cx+4,32+by,BD);c.set(cx+3,36+by,BH);
  c.rect(cx-7,18+by,3,10,BL);c.set(cx-7,18+by,BM);c.set(cx-7,27+by,BD);
  c.rect(cx+4,18+by,3,10,BD);c.set(cx+6,18+by,BD);c.set(cx+6,27+by,BH);
  c.outline(O);
}

function createMummySprite(){
  const idle:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(40,56);drawMummy(c,i);idle.push(c.toFrame());}
  const attack:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(40,56);drawMummy(c,i);if(i===1){c.rect(2,20,8,4,4);c.set(2,20,5);c.set(3,19,5);}attack.push(c.toFrame());}
  const ht:SpriteFrame[]=[];{const c1=new PixelCanvas(40,56);drawMummy(c1,0);ht.push(c1.toFrame());ht.push(flashFrame(ht[0],28));}
  return{id:"mummy",palette:SKP,animations:{idle:makeAnim("idle",idle,180,true),attack:makeAnim("attack",attack,80,false),hurt:makeAnim("hurt",ht,100,false)}};
}

function drawIceElemental(c:PixelCanvas,frame:number){
  const O=1,BK=2,DB=3,MID=4,LIT=5,HI=6,CR=7,EY=8;
  const cx=20,cy=28,wobble=Math.sin(frame*1.2)*2;
  c.ellipse(cx,20+wobble,9,11,MID);c.ellipse(cx-1,19+wobble,7,9,LIT);c.ellipse(cx+1,21+wobble,6,8,DB);
  c.ellipse(cx-2,10+wobble,5,6,LIT);c.ellipse(cx-1,9+wobble,4,5,HI);c.ellipse(cx+1,11+wobble,3,4,DB);
  c.set(cx-3,8+wobble,CR);c.set(cx+2,10+wobble,CR);c.set(cx-2,14+wobble,CR);
  c.set(cx-2,11+wobble,HI);c.set(cx+1,10+wobble,HI);c.set(cx,12+wobble,MID);
  c.set(cx-1,16+wobble,EY?EY:6);c.set(cx+1,16+wobble,6);c.set(cx,18+wobble,DB);
  c.ellipse(cx,30+wobble,7,5,MID);c.ellipse(cx-1,29+wobble,5,4,LIT);c.ellipse(cx+1,31+wobble,4,3,DB);
  c.line(cx-4,24+wobble,cx-6,34+wobble,LIT);c.line(cx+3,24+wobble,cx+5,34+wobble,DB);
  c.line(cx-1,24+wobble,cx-2,35+wobble,MID);c.line(cx+1,24+wobble,cx+2,34+wobble,DB);
  c.set(cx-6,34+wobble,MID);c.set(cx-6,35+wobble,LIT);c.set(cx+5,34+wobble,DB);c.set(cx+5,35+wobble,BK);
  c.addNoise(cx-8,8+wobble,16,30,CR,0.06);
  c.outline(O);
}

function createIceElementalSprite(){
  const idle:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(40,56);drawIceElemental(c,i);idle.push(c.toFrame());}
  const attack:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(40,56);drawIceElemental(c,i);if(i>=1){c.ellipse(8,16,4,3,7);c.ellipse(7,15,2,2,6);}attack.push(c.toFrame());}
  const ht:SpriteFrame[]=[];{const c1=new PixelCanvas(40,56);drawIceElemental(c1,0);ht.push(c1.toFrame());ht.push(flashFrame(ht[0],28));}
  return{id:"ice_elemental",palette:IDP,animations:{idle:makeAnim("idle",idle,160,true),attack:makeAnim("attack",attack,80,false),hurt:makeAnim("hurt",ht,100,false)}};
}

function drawVoidCreature(c:PixelCanvas,frame:number){
  const O=1,DK=2,MD=3,LT=4,HI=5,COR=6,EYE=7;
  const cx=20,cy=28,pulse=Math.sin(frame*0.9)*2;
  c.ellipse(cx,20+pulse,10,12,MD);c.ellipse(cx-1,19+pulse,8,10,LT);c.ellipse(cx+1,21+pulse,7,9,DK);
  c.ellipse(cx-2,8+pulse,6,7,LT);c.ellipse(cx-1,7+pulse,4,5,HI);c.ellipse(cx+2,10+pulse,3,4,DK);
  c.set(cx-3,6+pulse,COR);c.set(cx+3,8+pulse,COR);c.set(cx-1,5+pulse,HI);
  c.set(cx-2,10+pulse,EYE);c.set(cx+1,11+pulse,EYE);c.set(cx,13+pulse,DK);
  c.ellipse(cx,32+pulse,8,6,MD);c.ellipse(cx-1,31+pulse,6,4,LT);c.ellipse(cx+1,33+pulse,4,3,DK);
  c.line(cx-5,26+pulse,cx-8,38+pulse,LT);c.line(cx+4,26+pulse,cx+7,38+pulse,DK);
  c.line(cx-1,26+pulse,cx-3,40+pulse,MD);c.line(cx+2,26+pulse,cx+5,38+pulse,DK);
  c.set(cx-8,38+pulse,MD);c.set(cx+7,38+pulse,DK);c.set(cx-3,40+pulse,LT);
  for(let i=0;i<3;i++){c.set(cx-8+i*2,30+pulse+i*2,COR);c.set(cx+4+i*2,28+pulse+i*2,COR);}
  c.outline(O);
}

function createVoidCreatureSprite(){
  const idle:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(40,56);drawVoidCreature(c,i);idle.push(c.toFrame());}
  const attack:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(40,56);drawVoidCreature(c,i);if(i>=1){c.ellipse(6,14,5,4,6);c.ellipse(5,13,3,3,5);}attack.push(c.toFrame());}
  const ht:SpriteFrame[]=[];{const c1=new PixelCanvas(40,56);drawVoidCreature(c1,0);ht.push(c1.toFrame());ht.push(flashFrame(ht[0],28));}
  return{id:"void_creature",palette:VDP,animations:{idle:makeAnim("idle",idle,150,true),attack:makeAnim("attack",attack,80,false),hurt:makeAnim("hurt",ht,100,false)}};
}

function drawTreeSpiritEnemy(c:PixelCanvas,frame:number){
  const O=1,BK=2,TR=3,TM=4,TL=5,TH=6,LV=7,LM=8,LD=9,EY=10;
  const cx=20,sway=Math.sin(frame*0.7)*2;
  c.ellipse(cx,22+sway,8,10,TR);c.ellipse(cx-1,21+sway,6,8,TM);c.ellipse(cx+1,23+sway,5,7,TL);
  c.ellipse(cx,8+sway,7,6,TR);c.ellipse(cx-1,7+sway,5,5,TM);c.ellipse(cx+1,9+sway,4,4,TL);
  c.line(cx-4,12+sway,cx-8-sway,2+sway,TR);c.line(cx+3,12+sway,cx+7+sway,3+sway,TL);
  c.line(cx-3,13+sway,cx-9-sway,3+sway,TM);c.line(cx+2,13+sway,cx+6+sway,4+sway,TL);
  c.set(cx-8-sway,2+sway,LV);c.set(cx-7-sway,1+sway,LM);c.set(cx+7+sway,3+sway,LV);c.set(cx+8+sway,4+sway,LM);
  c.set(cx-2,7+sway,EY);c.set(cx+2,8+sway,EY);c.set(cx,10+sway,TH);c.set(cx-1,11+sway,TM);
  c.ellipse(cx-6,16+sway,4,3,LV);c.ellipse(cx+5,17+sway,4,3,LD);
  c.rect(cx-3,30+sway,6,8,TR);c.rect(cx-2,31+sway,4,6,TM);c.set(cx-3,36+sway,TL);c.set(cx+2,36+sway,TL);
  c.line(cx-2,32+sway,cx-4,40+sway,TM);c.line(cx+1,32+sway,cx,39+sway,TL);
  c.line(cx-6,28+sway,cx-8,36+sway,LV);c.line(cx+4,28+sway,cx+7,35+sway,LD);
  c.outline(O);
}

function createTreeSpiritEnemySprite(){
  const idle:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(40,56);drawTreeSpiritEnemy(c,i);idle.push(c.toFrame());}
  const attack:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(40,56);drawTreeSpiritEnemy(c,i);if(i>=1){c.line(12,10,2,2,7);c.line(14,11,4,3,8);}attack.push(c.toFrame());}
  const ht:SpriteFrame[]=[];{const c1=new PixelCanvas(40,56);drawTreeSpiritEnemy(c1,0);ht.push(c1.toFrame());ht.push(flashFrame(ht[0],28));}
  return{id:"tree_spirit_enemy",palette:ATP,animations:{idle:makeAnim("idle",idle,170,true),attack:makeAnim("attack",attack,80,false),hurt:makeAnim("hurt",ht,100,false)}};
}

// ===== BOSS SPRITES (72x96) =====

function drawAncientTreeSpirit(c:PixelCanvas,frame:number){
  const O=1,BK=2,TK=3,TM=4,TL=5,TH=6,LV=7,LM=8,LL=9,EY=10,CR=11,GD=12;
  const cx=36,cy=48,pulse=Math.sin(frame*0.5)*3;
  c.ellipse(cx,40+pulse,18,22,TK);c.ellipse(cx-2,38+pulse,14,18,TM);c.ellipse(cx+3,42+pulse,12,16,TL);
  c.ellipse(cx,14+pulse,14,12,TK);c.ellipse(cx-2,12+pulse,10,10,TM);c.ellipse(cx+3,16+pulse,8,8,TL);
  c.ellipse(cx-1,10+pulse,6,5,TH);c.set(cx-4,8+pulse,CR);c.set(cx+5,9+pulse,CR);
  for(let i=0;i<6;i++){
    const a=i*12-30,off=Math.sin(frame*0.6+i)*3;
    c.line(cx+a*0.4,20+pulse,cx+a-off*0.3,2+pulse+off,LV);
    c.line(cx+a*0.4+1,21+pulse,cx+a+1-off*0.3,3+pulse+off,LM);
    c.set(cx+a-off*0.3,1+pulse+off,LL);c.set(cx+a+1-off*0.3,2+pulse+off,LL);
  }
  c.set(cx-4,12+pulse,EY);c.set(cx+4,13+pulse,EY);c.set(cx-2,16+pulse,TH);c.set(cx+2,17+pulse,TM);
  c.set(cx,18+pulse,CR);c.set(cx-1,20+pulse,CR);c.set(cx+2,21+pulse,CR);
  c.ellipse(cx-12,32+pulse,8,10,LV);c.ellipse(cx+10,34+pulse,8,10,LL);
  c.ellipse(cx,58+pulse,14,12,TK);c.ellipse(cx-2,56+pulse,10,10,TM);c.ellipse(cx+3,60+pulse,8,8,TL);
  for(let i=0;i<4;i++){
    const lx=i*8-12,lo=Math.sin(frame*0.8+i*1.5)*4;
    c.line(cx+lx,68+pulse,cx+lx-3,88+pulse+lo,TM);c.line(cx+lx+1,68+pulse,cx+lx-2,88+pulse+lo,TL);
    c.set(cx+lx-3,88+pulse+lo,TK);c.set(cx+lx-3,89+pulse+lo,TH);
  }
  c.line(cx-14,52+pulse,cx-20,78+pulse,LV);c.line(cx+12,54+pulse,cx+18,80+pulse,LL);
  c.set(cx-20,78+pulse,LM);c.set(cx+18,80+pulse,LL);
  c.addNoise(cx-20,10+pulse,40,70,CR,0.04);
  if(frame%4<2){c.circle(cx,30+pulse,5,GD);c.circle(cx,30+pulse,3,11);}
  c.outline(O);
}

function createAncientTreeSpiritSprite(){
  const idle:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(72,96);drawAncientTreeSpirit(c,i);idle.push(c.toFrame());}
  const attack:SpriteFrame[]=[];
  for(let i=0;i<6;i++){const c=new PixelCanvas(72,96);drawAncientTreeSpirit(c,i);if(i>=2){for(let j=0;j<5;j++)c.line(36+j*4,40+j*2,10-j*4,10+j*2,11);}attack.push(c.toFrame());}
  const ht:SpriteFrame[]=[];{const c1=new PixelCanvas(72,96);drawAncientTreeSpirit(c1,0);ht.push(c1.toFrame());ht.push(flashFrame(ht[0],28));}
  return{id:"ancient_tree_spirit",palette:ATP,animations:{idle:makeAnim("idle",idle,200,true),attack:makeAnim("attack",attack,100,false),hurt:makeAnim("hurt",ht,120,false)}};
}

function drawScorpionKing(c:PixelCanvas,frame:number){
  const O=1,BK=2,BD=3,BM=4,BL=5,BH=6,AC=7,AL=8,EY=9,GD=10,ST=11;
  const cx=36,cy=50,off=Math.sin(frame*0.6)*2;
  c.ellipse(cx,42+off,16,12,BM);c.ellipse(cx-2,40+off,12,9,BL);c.ellipse(cx+3,44+off,10,8,BD);
  c.ellipse(cx-4,24+off,10,8,BM);c.ellipse(cx-6,22+off,7,6,BL);c.ellipse(cx+4,26+off,6,5,BD);
  c.ellipse(cx-8,16+off,6,5,BH);c.set(cx-13,14+off,BL);c.set(cx-12,13+off,BM);
  c.set(cx-9,16+off,EY);c.set(cx-6,17+off,ST);c.set(cx-3,18+off,EY);c.set(cx,17+off,ST);
  c.ellipse(cx+8,28+off,6,4,AC);c.ellipse(cx+10,30+off,4,3,AL);
  for(let i=0;i<6;i++){
    const la=i*5-12,lo=i%2===0?off:-off;
    c.line(cx+la,52+off,cx+la-5,76+lo,BL);c.line(cx+la+1,52+off,cx+la-4,76+lo,BD);
    c.set(cx+la-5,76+lo,BM);c.set(cx+la-5,77+lo,BH);
    c.ellipse(cx+la-6,78+lo,3,2,i<3?BM:BH);
  }
  c.ellipse(cx+14,44+off,8,5,BM);c.ellipse(cx+16,46+off,6,3,BD);
  for(let i=0;i<8;i++){
    const ta=i*3;
    c.line(cx+16+ta,48+off,cx+20+ta*1.5,64+off+Math.abs(ta%4-2)*3,BL);
    c.set(cx+20+ta*1.5,64+off+Math.abs(ta%4-2)*3,i%2===0?BM:BH);
  }
  c.set(cx-6,38+off,BH);c.set(cx+4,40+off,BH);c.set(cx-2,46+off,BH);c.set(cx+2,48+off,BD);
  if(frame%4<2){c.circle(cx,34+off,6,GD);c.circle(cx,34+off,4,11);c.circle(cx,34+off,2,10);}
  c.outline(O);
}

function createScorpionKingSprite(){
  const idle:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(72,96);drawScorpionKing(c,i);idle.push(c.toFrame());}
  const attack:SpriteFrame[]=[];
  for(let i=0;i<6;i++){const c=new PixelCanvas(72,96);drawScorpionKing(c,i);if(i>=2){c.line(52,30,72,10,7);}attack.push(c.toFrame());}
  const ht:SpriteFrame[]=[];{const c1=new PixelCanvas(72,96);drawScorpionKing(c1,0);ht.push(c1.toFrame());ht.push(flashFrame(ht[0],28));}
  return{id:"scorpion_king",palette:SKP,animations:{idle:makeAnim("idle",idle,180,true),attack:makeAnim("attack",attack,100,false),hurt:makeAnim("hurt",ht,120,false)}};
}

function drawIceDragon(c:PixelCanvas,frame:number){
  const O=1,BK=2,DB=3,MID=4,LIT=5,HI=6,CR=7,EY=8,WG=9;
  const cx=36,cy=50,flap=Math.sin(frame*0.7)*4;
  c.ellipse(cx,44+flap,18,14,MID);c.ellipse(cx-2,42+flap,14,11,LIT);c.ellipse(cx+3,46+flap,12,10,DB);
  c.ellipse(cx-10,20+flap,10,8,LIT);c.ellipse(cx-12,18+flap,7,6,HI);c.ellipse(cx-6,24+flap,6,5,DB);
  c.set(cx-16,16+flap,CR);c.set(cx-14,14+flap,HI);c.set(cx-4,16+flap,CR);
  c.line(cx-18,18+flap,cx-28-flap,4+flap,LIT);c.line(cx-16,20+flap,cx-26-flap,6+flap,DB);
  c.line(cx-17,19+flap,cx-30-flap,2+flap,HI);c.set(cx-30-flap,2+flap,CR);c.set(cx-29-flap,3+flap,CR);
  c.line(cx-14,22+flap,cx-22+flap*0.5,10+flap,LIT);c.line(cx-12,24+flap,cx-20+flap*0.5,12+flap,DB);
  c.set(cx-14,18+flap,EY);c.set(cx-10,19+flap,EY);c.set(cx-12,22+flap,DB);c.set(cx-8,23+flap,MID);
  c.ellipse(cx+12,28+flap,8,6,LIT);c.ellipse(cx+14,30+flap,5,4,DB);
  c.line(cx+16,32+flap,cx+24,50+flap,LIT);c.line(cx+18,34+flap,cx+26,50+flap,DB);
  c.set(cx+24,50+flap,MID);c.set(cx+24,51+flap,LIT);c.set(cx+25,50+flap,DB);
  c.ellipse(cx,62+flap,14,10,MID);c.ellipse(cx-2,60+flap,10,8,LIT);c.ellipse(cx+3,64+flap,8,6,DB);
  for(let i=0;i<4;i++){
    const lx=i*8-12,lo=i%2===0?flap:-flap;
    c.line(cx+lx,70+flap,cx+lx-4,90+lo,LIT);c.line(cx+lx+1,70+flap,cx+lx-3,90+lo,DB);
    c.set(cx+lx-4,90+lo,MID);c.set(cx+lx-4,91+lo,HI);
  }
  c.line(cx-12,54+flap,cx-18,78+flap,LIT);c.line(cx+8,56+flap,cx+14,80+flap,DB);
  c.set(cx-2,40+flap,HI);c.set(cx+4,42+flap,HI);c.set(cx,48+flap,HI);c.set(cx+2,50+flap,DB);
  c.addNoise(cx-28,2+flap,64,86,CR,0.03);
  if(frame%5<2){c.circle(cx-10,30+flap,5,WG);c.circle(cx-10,30+flap,3,7);c.circle(cx-10,30+flap,1,6);}
  c.outline(O);
}

function createIceDragonSprite(){
  const idle:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(72,96);drawIceDragon(c,i);idle.push(c.toFrame());}
  const attack:SpriteFrame[]=[];
  for(let i=0;i<6;i++){const c=new PixelCanvas(72,96);drawIceDragon(c,i);if(i>=2){c.ellipse(10,20,8,6,9);c.ellipse(8,18,5,4,7);}attack.push(c.toFrame());}
  const ht:SpriteFrame[]=[];{const c1=new PixelCanvas(72,96);drawIceDragon(c1,0);ht.push(c1.toFrame());ht.push(flashFrame(ht[0],28));}
  return{id:"ice_dragon",palette:IDP,animations:{idle:makeAnim("idle",idle,180,true),attack:makeAnim("attack",attack,100,false),hurt:makeAnim("hurt",ht,120,false)}};
}

function drawVoidDevourer(c:PixelCanvas,frame:number){
  const O=1,DK=2,MD=3,LT=4,HI=5,COR=6,EY=7,DR=8;
  const cx=36,cy=50,pulse=Math.sin(frame*0.5)*4;
  c.ellipse(cx,42+pulse,20,18,MD);c.ellipse(cx-2,40+pulse,16,14,LT);c.ellipse(cx+3,44+pulse,14,12,DK);
  c.ellipse(cx-4,16+pulse,12,10,LT);c.ellipse(cx-6,14+pulse,9,8,HI);c.ellipse(cx+3,18+pulse,8,7,DK);
  c.set(cx-10,12+pulse,COR);c.set(cx+6,14+pulse,COR);c.set(cx-2,10+pulse,HI);c.set(cx+4,12+pulse,COR);
  c.ellipse(cx-8,8+pulse,6,5,HI);c.ellipse(cx+8,10+pulse,5,4,DK);
  c.set(cx-9,6+pulse,COR);c.set(cx+9,9+pulse,COR);
  c.set(cx-6,16+pulse,EY);c.set(cx+2,17+pulse,EY);c.set(cx-2,20+pulse,DK);c.set(cx+2,22+pulse,MD);
  for(let i=0;i<4;i++){
    const ta=i*10-15;
    c.line(cx+ta*0.6,28+pulse,cx+ta*2-pulse,4+pulse+Math.abs(ta),LT);
    c.line(cx+ta*0.6+1,29+pulse,cx+ta*2-pulse+1,5+pulse+Math.abs(ta),DK);
    c.set(cx+ta*2-pulse,3+pulse+Math.abs(ta),COR);c.set(cx+ta*2-pulse+1,4+pulse+Math.abs(ta),COR);
  }
  c.ellipse(cx,66+pulse,16,12,MD);c.ellipse(cx-2,64+pulse,12,9,LT);c.ellipse(cx+3,68+pulse,10,8,DK);
  for(let i=0;i<5;i++){
    const tx=i*8-16,tlo=(i%2===0?pulse:-pulse)*1.5;
    c.line(cx+tx,76+pulse,cx+tx-5,92+tlo,LT);c.line(cx+tx+1,76+pulse,cx+tx-4,92+tlo,DK);
    c.set(cx+tx-5,92+tlo,MD);c.set(cx+tx-5,93+tlo,HI);
    c.ellipse(cx+tx-6,94+tlo,3,2,i<3?MD:DK);
  }
  c.line(cx-14,56+pulse,cx-24,82+pulse,LT);c.line(cx+10,58+pulse,cx+20,84+pulse,DK);
  c.set(cx-24,82+pulse,MD);c.set(cx+20,84+pulse,DK);
  c.addNoise(cx-20,4+pulse,56,88,COR,0.05);
  if(frame%4<2){c.circle(cx,34+pulse,8,DR);c.circle(cx,34+pulse,5,6);c.circle(cx,34+pulse,2,5);c.set(cx-2,32+pulse,HI);c.set(cx+2,36+pulse,HI);}
  c.outline(O);
}

function createVoidDevourerSprite(){
  const idle:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(72,96);drawVoidDevourer(c,i);idle.push(c.toFrame());}
  const attack:SpriteFrame[]=[];
  for(let i=0;i<6;i++){const c=new PixelCanvas(72,96);drawVoidDevourer(c,i);if(i>=2){c.ellipse(8,16,10,8,8);c.ellipse(6,14,6,5,5);}attack.push(c.toFrame());}
  const ht:SpriteFrame[]=[];{const c1=new PixelCanvas(72,96);drawVoidDevourer(c1,0);ht.push(c1.toFrame());ht.push(flashFrame(ht[0],28));}
  return{id:"void_devourer",palette:VDP,animations:{idle:makeAnim("idle",idle,180,true),attack:makeAnim("attack",attack,100,false),hurt:makeAnim("hurt",ht,120,false)}};
}

function drawFallenSaint(c:PixelCanvas,frame:number){
  const O=1,BK=2,AR=3,AM=4,AL=5,AH=6,SK=7,GM=8,WH=9,EY=10,HL=11;
  const cx=36,cy=50,bob=Math.sin(frame*0.6)*2;
  c.ellipse(cx,40+bob,14,16,AM);c.ellipse(cx-2,38+bob,11,13,AL);c.ellipse(cx+2,42+bob,10,11,AH);
  c.ellipse(cx,16+bob,10,9,GM);c.ellipse(cx-1,15+bob,8,7,WH);c.ellipse(cx+1,17+bob,6,5,SK);
  c.set(cx-6,12+bob,WH);c.set(cx+5,13+bob,SK);c.set(cx-2,10+bob,HL);c.set(cx+3,11+bob,HL);
  c.set(cx-4,14+bob,EY);c.set(cx+2,15+bob,EY);c.set(cx-1,18+bob,SK);c.set(cx+1,19+bob,AH);
  c.ellipse(cx-10,24+bob,6,5,AR);c.ellipse(cx+8,25+bob,5,4,AR);
  c.line(cx-8,30+bob,cx-12,50+bob,AL);c.line(cx+6,30+bob,cx+10,50+bob,AH);
  c.set(cx-12,48+bob,AM);c.set(cx-12,49+bob,AL);c.set(cx+10,48+bob,AH);c.set(cx+10,49+bob,SK);
  c.ellipse(cx,60+bob,12,10,AM);c.ellipse(cx-2,58+bob,9,8,AL);c.ellipse(cx+2,62+bob,7,6,AH);
  c.rect(cx-5,68+bob,4,12,AM);c.set(cx-5,68+bob,AL);c.set(cx-2,78+bob,AH);
  c.rect(cx+1,68+bob,4,12,AM);c.set(cx+4,68+bob,AH);c.set(cx+3,78+bob,SK);
  c.rect(cx-10,42+bob,4,12,AR);c.set(cx-10,42+bob,AM);c.set(cx-10,53+bob,AL);
  c.rect(cx+6,42+bob,4,12,AR);c.set(cx+9,42+bob,AH);c.set(cx+9,53+bob,SK);
  c.ellipse(cx+16,34+bob,5,4,GM);c.ellipse(cx+17,35+bob,3,2,WH);
  c.line(cx+18,38+bob,cx+24,55+bob,GM);c.set(cx+24,54+bob,WH);c.set(cx+24,55+bob,SK);
  if(frame%5<2){c.circle(cx+16,32+bob,4,11);c.circle(cx+16,32+bob,2,10);}
  c.outline(O);
}

function createFallenSaintSprite(){
  const idle:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(72,96);drawFallenSaint(c,i);idle.push(c.toFrame());}
  const attack:SpriteFrame[]=[];
  for(let i=0;i<6;i++){const c=new PixelCanvas(72,96);drawFallenSaint(c,i);if(i>=2){c.line(52,36,72,20,8);c.set(70,19,9);}attack.push(c.toFrame());}
  const ht:SpriteFrame[]=[];{const c1=new PixelCanvas(72,96);drawFallenSaint(c1,0);ht.push(c1.toFrame());ht.push(flashFrame(ht[0],28));}
  return{id:"fallen_saint",palette:FSP,animations:{idle:makeAnim("idle",idle,180,true),attack:makeAnim("attack",attack,100,false),hurt:makeAnim("hurt",ht,120,false)}};
}

// ===== NPC SPRITES (40x56) =====

function drawOldManNPC(c:PixelCanvas,frame:number){
  const O=1,BK=2,HR=3,HM=4,HL=5,SK=6,WH=7,EY=8,BT=9;
  const cx=20,by=2+Math.floor(frame/2)%2;
  c.ellipse(cx,20+by,8,10,HR);c.ellipse(cx-1,19+by,6,8,HM);c.ellipse(cx+1,21+by,5,7,HL);
  c.ellipse(cx,8+by,6,5,SK);c.ellipse(cx-1,7+by,5,4,WH);c.set(cx-4,6+by,WH);c.set(cx+3,7+by,WH);
  c.set(cx-3,5+by,HR);c.set(cx-2,4+by,HM);c.set(cx+1,4+by,HL);c.set(cx+2,5+by,HL);
  c.set(cx-5,6+by,WH);c.set(cx,3+by,HL);
  c.set(cx-2,8+by,EY);c.set(cx+1,8+by,EY);c.set(cx-1,10+by,SK);c.set(cx,11+by,WH);
  c.set(cx-1,13+by,BT);c.set(cx,13+by,BT);c.set(cx+1,13+by,BT);
  c.rect(cx-5,28+by,10,12,HR);c.rect(cx-4,29+by,8,10,HM);c.rect(cx-3,30+by,6,8,HL);
  c.line(cx-4,30+by,cx-4,40+by,HM);c.line(cx+3,30+by,cx+3,40+by,HL);
  c.rect(cx-5,38+by,10,2,BT);c.set(cx-1,38+by,9);c.set(cx,38+by,9);
  c.rect(cx-4,40+by,4,6,HL);c.set(cx-4,40+by,SK);c.set(cx-1,45+by,HL);
  c.rect(cx+1,40+by,4,6,HL);c.set(cx+4,40+by,HL);c.set(cx+2,45+by,SK);
  c.rect(cx-7,30+by,3,8,HR);c.set(cx-7,30+by,HM);c.set(cx-7,37+by,HL);
  c.outline(O);
}

function createOldManNPCSprite(){
  const f:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(40,56);drawOldManNPC(c,i);f.push(c.toFrame());}
  return{id:"npc_oldman",palette:PP,animations:{idle:makeAnim("idle",f,250,true)}};
}

function drawMerchantNPC(c:PixelCanvas,frame:number){
  const O=1,BK=2,RD=3,RM=4,RL=5,SK=6,WH=7,EY=8,AP=9;
  const cx=20,by=Math.floor(frame/2)%2;
  c.ellipse(cx,20+by,8,10,RD);c.ellipse(cx-1,19+by,6,8,RM);c.ellipse(cx+1,21+by,5,7,RL);
  c.ellipse(cx,8+by,6,5,AP);c.ellipse(cx-1,7+by,5,4,WH);c.set(cx-4,6+by,WH);c.set(cx+3,7+by,WH);
  c.set(cx-3,5+by,RD);c.set(cx-2,4+by,RM);c.set(cx+1,4+by,RL);c.set(cx+2,5+by,RL);
  c.set(cx-2,8+by,EY);c.set(cx+1,8+by,EY);c.set(cx-1,10+by,SK);c.set(cx,11+by,WH);
  c.rect(cx-5,28+by,10,12,RD);c.rect(cx-4,29+by,8,10,RM);c.rect(cx-3,30+by,6,8,RL);
  c.line(cx-4,30+by,cx-4,40+by,RM);c.line(cx+3,30+by,cx+3,40+by,RL);
  c.rect(cx-5,38+by,10,2,8);c.set(cx-1,38+by,9);c.set(cx,38+by,9);
  c.rect(cx-4,40+by,4,6,RL);c.set(cx-4,40+by,SK);c.set(cx-1,45+by,RL);
  c.rect(cx+1,40+by,4,6,RL);c.set(cx+4,40+by,RL);c.set(cx+2,45+by,SK);
  c.rect(cx-7,30+by,3,8,RD);c.set(cx-7,30+by,RM);c.set(cx-7,37+by,RL);
  c.ellipse(cx+8,24+by,4,3,24);c.ellipse(cx+9,25+by,2,2,25);
  c.outline(O);
}

function createMerchantNPCSprite(){
  const f:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(40,56);drawMerchantNPC(c,i);f.push(c.toFrame());}
  return{id:"npc_merchant",palette:PP,animations:{idle:makeAnim("idle",f,220,true)}};
}

function drawGuardNPC(c:PixelCanvas,frame:number){
  const O=1,BK=2,AR=3,AM=4,AL=5,SK=6,MT=7,EY=8;
  const cx=20,by=1+Math.floor(frame/2)%2;
  c.ellipse(cx,18+by,8,9,AM);c.ellipse(cx-1,17+by,6,7,AL);c.ellipse(cx+1,19+by,5,6,AR);
  c.ellipse(cx,6+by,7,5,MT);c.ellipse(cx-1,5+by,5,4,SK);c.set(cx-4,4+by,SK);c.set(cx+3,5+by,SK);
  c.set(cx-3,3+by,AM);c.set(cx-2,2+by,AL);c.set(cx+1,2+by,AR);c.set(cx+2,3+by,AR);
  c.set(cx-2,6+by,EY);c.set(cx+1,6+by,EY);c.set(cx-1,8+by,SK);c.set(cx,9+by,MT);
  c.rect(cx-6,26+by,12,14,AR);c.rect(cx-5,27+by,10,12,AM);c.rect(cx-4,28+by,8,10,AL);
  c.line(cx-4,28+by,cx-4,38+by,AM);c.line(cx+3,28+by,cx+3,38+by,AL);
  c.rect(cx-6,36+by,12,2,7);c.set(cx-1,36+by,8);c.set(cx,36+by,8);
  c.rect(cx-5,38+by,4,8,AL);c.set(cx-5,38+by,SK);c.set(cx-1,45+by,AL);
  c.rect(cx+2,38+by,4,8,AL);c.set(cx+5,38+by,AR);c.set(cx+3,45+by,SK);
  c.line(cx-8,26+by,cx-12,20+by,AR);c.set(cx-12,20+by,AM);c.set(cx-12,21+by,AL);
  c.line(cx+8,26+by,cx+14,22+by,AR);c.set(cx+14,22+by,AL);c.set(cx+14,23+by,SK);
  c.outline(O);
}

function createGuardNPCSprite(){
  const f:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(40,56);drawGuardNPC(c,i);f.push(c.toFrame());}
  return{id:"npc_guard",palette:PP,animations:{idle:makeAnim("idle",f,200,true)}};
}

// ===== ITEM SPRITES (24x24) =====

function createHealthPotionItem(){
  const c=new PixelCanvas(24,24);
  c.ellipse(12,14,5,7,37);c.ellipse(11,13,4,6,38);c.ellipse(12,15,3,4,36);
  c.rect(10,4,4,3,38);c.rect(11,5,2,2,39);c.set(10,3,39);c.set(13,3,39);
  c.set(11,7,37);c.set(12,7,37);c.set(10,8,36);c.set(13,8,36);
  c.set(11,10,38);c.set(12,11,38);c.set(11,16,36);c.set(12,17,36);
  c.rect(10,18,4,2,37);c.set(10,18,38);c.set(13,18,38);
  c.outline(O);return{id:"item_health_potion",palette:PP,animations:{idle:makeAnim("idle",[c.toFrame()],0,false)}};
}

function createManaPotionItem(){
  const c=new PixelCanvas(24,24);
  c.ellipse(12,14,5,7,41);c.ellipse(11,13,4,6,42);c.ellipse(12,15,3,4,40);
  c.rect(10,4,4,3,42);c.rect(11,5,2,2,43);c.set(10,3,43);c.set(13,3,43);
  c.set(11,7,41);c.set(12,7,41);c.set(10,8,40);c.set(13,8,40);
  c.set(11,10,42);c.set(12,11,42);c.set(11,16,40);c.set(12,17,40);
  c.rect(10,18,4,2,41);c.set(10,18,42);c.set(13,18,42);
  c.outline(O);return{id:"item_mana_potion",palette:PP,animations:{idle:makeAnim("idle",[c.toFrame()],0,false)}};
}

function createGoldCoinItem(){
  const c=new PixelCanvas(24,24);
  c.ellipse(12,12,7,6,43);c.ellipse(11,11,5,4,44);c.ellipse(12,12,3,3,45);
  c.set(10,10,45);c.set(13,11,45);c.set(11,13,44);c.set(14,12,44);
  c.set(9,11,44);c.set(14,10,44);c.set(10,13,43);c.set(13,14,43);
  c.set(12,9,45);c.set(12,14,45);
  c.outline(O);return{id:"item_gold_coin",palette:PP,animations:{idle:makeAnim("idle",[c.toFrame()],0,false)}};
}

function createKeyItem(){
  const c=new PixelCanvas(24,24);
  c.ellipse(8,8,4,4,43);c.ellipse(7,7,3,3,44);c.ellipse(8,8,2,2,45);
  c.rect(10,7,8,2,43);c.rect(10,7,8,2,44);c.set(18,7,43);c.set(18,8,43);
  c.rect(17,9,2,3,43);c.set(17,12,43);c.set(17,11,44);
  c.rect(16,13,3,2,43);c.set(18,14,43);c.set(18,13,44);
  c.set(7,7,45);c.set(9,7,44);c.set(7,9,44);
  c.outline(O);return{id:"item_key",palette:PP,animations:{idle:makeAnim("idle",[c.toFrame()],0,false)}};
}

function createSwordItem(){
  const c=new PixelCanvas(24,24);
  c.rect(11,2,2,14,15);c.set(11,2,16);c.set(11,3,16);c.set(12,2,16);
  c.rect(10,16,4,2,14);c.rect(9,18,6,3,17);c.set(9,18,18);c.set(14,18,18);
  c.rect(10,21,4,2,17);c.set(10,21,18);c.set(13,21,18);
  c.outline(O);return{id:"item_sword",palette:PP,animations:{idle:makeAnim("idle",[c.toFrame()],0,false)}};
}

function createShieldItem(){
  const c=new PixelCanvas(24,24);
  c.ellipse(12,14,7,9,19);c.ellipse(11,13,5,7,20);c.ellipse(12,14,3,5,21);
  c.rect(11,4,2,4,20);c.rect(11,4,2,4,21);c.set(11,3,21);c.set(12,3,21);
  c.set(9,10,20);c.set(14,10,20);c.set(9,16,20);c.set(14,16,20);
  c.set(10,12,21);c.set(13,12,21);c.set(10,14,21);c.set(13,14,21);
  c.outline(O);return{id:"item_shield",palette:PP,animations:{idle:makeAnim("idle",[c.toFrame()],0,false)}};
}

// ===== EFFECT SPRITES =====

function createSlashEffect(){
  const frames:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(24,24);
    const a=-Math.PI/4+i*0.3;
    for(let j=0;j<8;j++){
      const r=4+j*2,px=12+Math.round(Math.cos(a)*r),py=12+Math.round(Math.sin(a)*r);
      if(px>=0&&px<24&&py>=0&&py<24)c.set(px,py,j<3?51:j<6?52:53);
    }c.set(12,12,54);frames.push(c.toFrame());
  }
  return{id:"effect_slash",palette:FP,animations:{play:makeAnim("play",frames,50,false)}};
}

function createHealEffect(){
  const frames:SpriteFrame[]=[];
  for(let i=0;i<6;i++){const c=new PixelCanvas(24,24);const r=3+i*3;
    c.circle(12,12,r,55);c.circle(12,12,r-1>0?r-1:1,56);c.circle(12,12,r-2>0?r-2:1,57);
    if(i>=3){c.set(10,10,57);c.set(13,13,57);c.set(10,13,56);c.set(13,10,56);}frames.push(c.toFrame());
  }
  return{id:"effect_heal",palette:FP,animations:{play:makeAnim("play",frames,70,false)}};
}

function createFireballEffect(){
  const frames:SpriteFrame[]=[];
  for(let i=0;i<5;i++){const c=new PixelCanvas(24,24);const sc=1+i*0.4;
    c.ellipse(12,12,Math.round(8*sc),Math.round(6*sc),59);c.ellipse(11,11,Math.round(6*sc),Math.round(4*sc),60);
    c.ellipse(13,13,Math.round(4*sc),Math.round(3*sc),61);c.set(10,10,62);c.set(13,11,62);
    c.addNoise(6,6,12,12,63,0.1);frames.push(c.toFrame());
  }
  return{id:"effect_fireball",palette:FP,animations:{play:makeAnim("play",frames,60,false)}};
}

function createIceSpikeEffect(){
  const frames:SpriteFrame[]=[];
  for(let i=0;i<4;i++){const c=new PixelCanvas(24,24);
    c.ellipse(12,16,5,7,92);c.ellipse(11,15,4,6,93);c.set(12,10,94);c.set(11,11,95);c.set(13,11,95);
    c.set(12,9,96);c.set(10,13,94);c.set(14,13,95);if(i>1){c.set(8,12,97);c.set(16,12,97);}
    frames.push(c.toFrame());
  }
  return{id:"effect_ice_spike",palette:IP,animations:{play:makeAnim("play",frames,60,false)}};
}

function createLevelUpEffect(){
  const frames:SpriteFrame[]=[];
  for(let i=0;i<8;i++){const c=new PixelCanvas(32,32);const r=4+i*3;
    c.circle(16,16,r,64);c.circle(16,16,r-1>0?r-1:1,65);c.circle(16,16,r-2>0?r-2:1,66);
    if(i>=2){c.circle(16,16,r-3>0?r-3:1,67);c.set(14,14,68);c.set(17,17,68);c.set(14,17,67);c.set(17,14,67);}
    if(i>=4){c.set(13,13,68);c.set(18,18,68);c.set(16,12,68);c.set(16,18,68);}
    if(i>=6){c.set(12,12,69);c.set(19,19,69);c.set(16,11,69);c.set(16,19,69);c.set(11,16,69);c.set(21,16,69);}
    frames.push(c.toFrame());
  }
  return{id:"effect_levelup",palette:FP,animations:{play:makeAnim("play",frames,80,false)}};
}

function createDamageNumberEffect(){
  const frames:SpriteFrame[]=[];
  {const c=new PixelCanvas(16,16);c.set(7,3,70);c.set(8,3,70);c.set(6,4,71);c.set(9,4,71);
   c.set(5,5,71);c.set(10,5,71);c.set(5,6,71);c.set(10,6,71);c.set(5,7,71);c.set(10,7,71);
   c.set(5,8,71);c.set(9,8,71);c.set(6,9,71);c.set(9,9,71);c.set(6,10,71);c.set(8,10,71);
   c.set(7,11,71);c.set(8,11,71);c.set(7,12,71);frames.push(c.toFrame());}
  {const c=new PixelCanvas(16,16);c.set(7,1,70);c.set(8,1,70);c.set(6,2,71);c.set(9,2,71);
   c.set(5,3,71);c.set(10,3,71);c.set(5,4,71);c.set(10,4,71);c.set(5,5,71);c.set(10,5,71);
   c.set(5,6,71);c.set(9,6,71);c.set(6,7,71);c.set(9,7,71);c.set(6,8,71);c.set(8,8,71);
   c.set(7,9,71);frames.push(c.toFrame());}
  return{id:"effect_damage_num",palette:FP,animations:{play:makeAnim("play",frames,200,false)}};
}

// ===== REGISTRIES =====

export const TileRegistry: Record<string, () => SpriteFrame> = {
  grass1, grass2, grass3, grassDirtEdge,
  dirtPath, dirtPathVar,
  treeTrunkB, treeTrunkT, treeCanopyL, treeCanopyM,
  bushS, bushL,
  waterDeep, waterShallow,
  rock, log,
  flowersR, flowersY, flowersW, mushroom,
  sand1, sand2, sand3, sandstonePath,
  cactus1, cactus2, deadTree, deadBush, oasisWater,
  ruinsFloor, ruinsWall, skullDeco, boneDeco,
  snow1, snow2, snow3,
  iceFlat, iceCracked, frozenWater,
  pineS, pineL, snowRock, icicleHang, snowFlower, caveEntrance,
  brokenStone1, brokenStone2,
  voidPool, crystalGlow, metalGrate, energyConduit,
  brokenPillar, rubblePile, ancientDoorway,
  voidCrystalCluster, crackedFloor,
  marbleWhite, marbleGold, holyWaterPool, stainedGlass,
  angelStatueBase, floatingPlatform, lightBeamFloor,
  goldenPillar, thronePlatform, voidRiftTile, glowingRune,
};

export const SpriteRegistry: Record<string, () => SpriteData> = {
  player: createPlayerSprite,
  slime: createSlimeSprite,
  wolf: createWolfSprite,
  scorpion: createScorpionSprite,
  mummy: createMummySprite,
  ice_elemental: createIceElementalSprite,
  void_creature: createVoidCreatureSprite,
  tree_spirit_enemy: createTreeSpiritEnemySprite,
  ancient_tree_spirit: createAncientTreeSpiritSprite,
  scorpion_king: createScorpionKingSprite,
  ice_dragon: createIceDragonSprite,
  void_devourer: createVoidDevourerSprite,
  fallen_saint: createFallenSaintSprite,
  npc_oldman: createOldManNPCSprite,
  npc_merchant: createMerchantNPCSprite,
  npc_guard: createGuardNPCSprite,
  item_health_potion: createHealthPotionItem,
  item_mana_potion: createManaPotionItem,
  item_gold_coin: createGoldCoinItem,
  item_key: createKeyItem,
  item_sword: createSwordItem,
  item_shield: createShieldItem,
  effect_slash: createSlashEffect,
  effect_heal: createHealEffect,
  effect_fireball: createFireballEffect,
  effect_ice_spike: createIceSpikeEffect,
  effect_levelup: createLevelUpEffect,
  effect_damage_num: createDamageNumberEffect,
};

export const TilePalettes: Record<string, string[]> = {
  grass1: SPE, grass2: SPE, grass3: SPE, grassDirtEdge: SPE,
  dirtPath: TPE, dirtPathVar: TPE,
  treeTrunkB: TREE_P, treeTrunkT: TREE_P, treeCanopyL: SPE, treeCanopyM: SPE,
  bushS: SPE, bushL: SPE,
  waterDeep: WPE, waterShallow: WPE,
  rock: TPE, log: TPE,
  flowersR: SPE, flowersY: SPE, flowersW: SPE, mushroom: SPE,
  sand1: SCPE, sand2: SCPE, sand3: SCPE, sandstonePath: SCPE,
  cactus1: SCPE, cactus2: SCPE, deadTree: SCPE, deadBush: SCPE, oasisWater: WPE,
  ruinsFloor: VPE, ruinsWall: VPE, skullDeco: VPE, boneDeco: VPE,
  snow1: MPE, snow2: MPE, snow3: MPE,
  iceFlat: IPE, iceCracked: IPE, frozenWater: IPE,
  pineS: MPE, pineL: MPE, snowRock: MPE, icicleHang: IPE, snowFlower: MPE, caveEntrance: VPE,
  brokenStone1: VPE, brokenStone2: VPE,
  voidPool: VPE, crystalGlow: VPE, metalGrate: VPE, energyConduit: VPE,
  brokenPillar: VPE, rubblePile: VPE, ancientDoorway: VPE,
  voidCrystalCluster: VPE, crackedFloor: VPE,
  marbleWhite: HKPE, marbleGold: HKPE, holyWaterPool: HKPE, stainedGlass: HKPE,
  angelStatueBase: HKPE, floatingPlatform: HKPE, lightBeamFloor: HKPE,
  goldenPillar: HKPE, thronePlatform: HKPE, voidRiftTile: VPE, glowingRune: VPE,
};

export function getTile(id: string): SpriteFrame {
  const fn = TileRegistry[id];
  return fn ? fn() : { data: [], width: 0, height: 0 };
}

export function getSprite(id: string): SpriteData {
  const fn = SpriteRegistry[id];
  return fn ? fn() : { id, palette: [], animations: {} };
}