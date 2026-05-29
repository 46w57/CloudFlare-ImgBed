import { Rect, SpriteData, SpriteFrame } from './types';

export class InputManager {
  private keysDown: Set<string> = new Set();
  private keyPressedThisFrame: Set<string> = new Set();

  constructor() {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.keysDown.has(e.code)) {
        this.keyPressedThisFrame.add(e.code);
      }
      this.keysDown.add(e.code);
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keysDown.delete(e.code);
    });
  }

  isKeyDown(key: string): boolean {
    return this.keysDown.has(key);
  }

  isKeyPressed(key: string): boolean {
    return this.keyPressedThisFrame.has(key);
  }

  clearFrameState(): void {
    this.keyPressedThisFrame.clear();
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.keysDown.has(e.code)) {
      this.keyPressedThisFrame.add(e.code);
    }
    this.keysDown.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
  };
}

export class Camera {
  x: number = 0;
  y: number = 0;
  width: number = 0;
  height: number = 0;
  targetX: number = 0;
  targetY: number = 0;
  shakeX: number = 0;
  shakeY: number = 0;
  shakeIntensity: number = 0;
  shakeDuration: number = 0;
  private shakeTimer: number = 0;
  private lerpFactor: number = 0.1;

  follow(targetX: number, targetY: number): void {
    this.targetX = targetX - this.width / 2;
    this.targetY = targetY - this.height / 2;
  }

  shake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = duration;
  }

  update(dt: number): void {
    this.x += (this.targetX - this.x) * this.lerpFactor;
    this.y += (this.targetY - this.y) * this.lerpFactor;

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const progress = this.shakeTimer / this.shakeDuration;
      const currentIntensity = this.shakeIntensity * progress;
      this.shakeX = (Math.random() * 2 - 1) * currentIntensity;
      this.shakeY = (Math.random() * 2 - 1) * currentIntensity;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  worldToScreen(wx: number, wy: number): { sx: number; sy: number } {
    return {
      sx: wx - this.x + this.shakeX,
      sy: wy - this.y + this.shakeY,
    };
  }

  isVisible(wx: number, wy: number, w: number, h: number): boolean {
    const sx = wx - this.x;
    const sy = wy - this.y;
    return sx + w >= 0 && sx <= this.width && sy + h >= 0 && sy <= this.height;
  }
}

export class Renderer {
  ctx: CanvasRenderingContext2D;
  scale: number = 1;
  private canvas: HTMLCanvasElement;
  private tileCache: Map<string, HTMLCanvasElement> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.autoScale();
  }

  private autoScale(): void {
    const dpr = window.devicePixelRatio || 1;
    this.scale = Math.max(1, Math.floor(dpr));
  }

  clear(color?: string): void {
    if (color) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private spriteCache: Map<string, HTMLCanvasElement> = new Map();

  drawSprite(spriteData: SpriteData, frame: SpriteFrame, x: number, y: number, flipX: boolean = false): void {
    const spriteId = spriteData.id || '';
    const frameIdx = spriteData.animations ? Object.values(spriteData.animations).findIndex(a => a.frames.includes(frame)) : -1;
    const cacheKey = `${spriteId}_${frameIdx}_${flipX}`;
    let cached = this.spriteCache.get(cacheKey);

    if (!cached) {
      const offscreen = document.createElement('canvas');
      offscreen.width = frame.width;
      offscreen.height = frame.height;
      const octx = offscreen.getContext('2d');
      if (!octx) return;
      octx.imageSmoothingEnabled = false;

      if (flipX) {
        octx.translate(frame.width, 0);
        octx.scale(-1, 1);
      }

      for (let row = 0; row < frame.height; row++) {
        const rowData = frame.data[row];
        if (!rowData) continue;
        for (let col = 0; col < frame.width; col++) {
          const srcCol = flipX ? frame.width - 1 - col : col;
          const colorIndex = rowData[srcCol];
          if (colorIndex === 0 || !colorIndex) continue;
          const color = spriteData.palette[colorIndex];
          if (!color) continue;
          octx.fillStyle = color;
          octx.fillRect(col, row, 1, 1);
        }
      }

      cached = offscreen;
      if (cacheKey && frameIdx >= 0) this.spriteCache.set(cacheKey, cached);
    }

    const s = this.scale;
    this.ctx.drawImage(cached, Math.floor(x * s), Math.floor(y * s), cached.width * s, cached.height * s);
  }

  drawTile(tilePixels: number[][], x: number, y: number, palette: string[], cacheKey?: string): void {
    const key = cacheKey || '';
    let cached = key ? this.tileCache.get(key) : undefined;
    if (!cached) {
      const h = tilePixels.length;
      const w = h > 0 ? tilePixels[0].length : 0;
      if (w <= 0 || h <= 0) return;
      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      const octx = offscreen.getContext('2d');
      if (!octx) return;
      octx.imageSmoothingEnabled = false;
      for (let row = 0; row < h; row++) {
        const rowData = tilePixels[row];
        if (!rowData) continue;
        for (let col = 0; col < w; col++) {
          const colorIndex = rowData[col];
          if (colorIndex === 0 || !colorIndex) continue;
          const color = palette[colorIndex];
          if (!color) continue;
          octx.fillStyle = color;
          octx.fillRect(col, row, 1, 1);
        }
      }
      cached = offscreen;
      if (key) this.tileCache.set(key, cached);
    }
    const s = this.scale;
    this.ctx.drawImage(cached, Math.floor(x * s), Math.floor(y * s), cached.width * s, cached.height * s);
  }

  drawRect(x: number, y: number, w: number, h: number, color: string, fill: boolean = true): void {
    const s = this.scale;
    if (fill) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(Math.floor(x * s), Math.floor(y * s), w * s, h * s);
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.strokeRect(Math.floor(x * s), Math.floor(y * s), w * s, h * s);
    }
  }

  drawText(text: string, x: number, y: number, color: string, size: number = 8, font: string = 'monospace'): void {
    const s = this.scale;
    this.ctx.fillStyle = color;
    this.ctx.font = `${size * s}px ${font}`;
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(text, Math.floor(x * s), Math.floor(y * s));
  }

  setScale(scale: number): void {
    this.scale = Math.max(1, Math.floor(scale));
  }

  drawCircle(x: number, y: number, r: number, color: string): void {
    const s = this.scale;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(Math.floor(x * s), Math.floor(y * s), r * s, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawLine(x1: number, y1: number, x2: number, y2: number, color: string, width: number = 1): void {
    const s = this.scale;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width * s;
    this.ctx.beginPath();
    this.ctx.moveTo(Math.floor(x1 * s), Math.floor(y1 * s));
    this.ctx.lineTo(Math.floor(x2 * s), Math.floor(y2 * s));
    this.ctx.stroke();
  }
}

export class Physics {
  static rectIntersect(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  static pointInRect(px: number, py: number, rect: Rect): boolean {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
  }

  static resolveCollision(
    entity: { x: number; y: number; width: number; height: number; vx: number; vy: number },
    collisions: boolean[][],
    mapWidth: number,
    tileSize: number
  ): void {
    const ex = entity.x;
    const ey = entity.y;
    const ew = entity.width;
    const eh = entity.height;

    const left = Math.floor(ex / tileSize);
    const right = Math.floor((ex + ew - 0.01) / tileSize);
    const top = Math.floor(ey / tileSize);
    const bottom = Math.floor((ey + eh - 0.01) / tileSize);

    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (ty < 0 || ty >= collisions.length || tx < 0 || tx >= mapWidth) {
          continue;
        }
        if (!collisions[ty][tx]) continue;

        const tileRect: Rect = {
          x: tx * tileSize,
          y: ty * tileSize,
          w: tileSize,
          h: tileSize,
        };

        const entityRect: Rect = {
          x: entity.x,
          y: entity.y,
          w: ew,
          h: eh,
        };

        if (!Physics.rectIntersect(entityRect, tileRect)) continue;

        const overlapLeft = entity.x + ew - tileRect.x;
        const overlapRight = tileRect.x + tileRect.w - entity.x;
        const overlapTop = entity.y + eh - tileRect.y;
        const overlapBottom = tileRect.y + tileRect.h - entity.y;

        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapX < minOverlapY) {
          if (overlapLeft < overlapRight) {
            entity.x = tileRect.x - ew;
          } else {
            entity.x = tileRect.x + tileRect.w;
          }
          entity.vx = 0;
        } else {
          if (overlapTop < overlapBottom) {
            entity.y = tileRect.y - eh;
          } else {
            entity.y = tileRect.y + tileRect.h;
          }
          entity.vy = 0;
        }
      }
    }
  }
}

export class GameLoop {
  private fixedDeltaTime: number = 1 / 60;
  private accumulator: number = 0;
  private lastTime: number = 0;
  private animationFrameId: number = 0;
  private _isRunning: boolean = false;
  private _fps: number = 0;
  private frameCount: number = 0;
  private fpsTimer: number = 0;
  private onUpdate: (dt: number) => void;
  private onRender: () => void;

  get isRunning(): boolean {
    return this._isRunning;
  }

  get fps(): number {
    return this._fps;
  }

  constructor(onUpdate: (dt: number) => void, onRender: () => void) {
    this.onUpdate = onUpdate;
    this.onRender = onRender;
  }

  start(): void {
    if (this._isRunning) return;
    this._isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.frameCount = 0;
    this.fpsTimer = 0;
    this.loop(this.lastTime);
  }

  stop(): void {
    this._isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  private loop = (currentTime: number): void => {
    if (!this._isRunning) return;

    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.fpsTimer += deltaTime;
    this.frameCount++;
    if (this.fpsTimer >= 1) {
      this._fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer -= 1;
    }

    this.accumulator += Math.min(deltaTime, 0.25);

    while (this.accumulator >= this.fixedDeltaTime) {
      this.onUpdate(this.fixedDeltaTime);
      this.accumulator -= this.fixedDeltaTime;
    }

    this.onRender();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}
