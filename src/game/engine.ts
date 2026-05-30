
export class InputManager {
  keys = new Set<string>();
  prevKeys = new Set<string>();

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  update() {
    this.prevKeys = new Set(this.keys);
  }

  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  isKeyPressed(code: string): boolean {
    return this.keys.has(code) && !this.prevKeys.has(code);
  }
}

export class Camera {
  x = 0;
  y = 0;
  width = 800;
  height = 600;
  private targetX = 0;
  private targetY = 0;
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private shakeTimer = 0;

  follow(targetX: number, targetY: number): void {
    this.targetX = targetX - this.width / 2;
    this.targetY = targetY - this.height / 2;
  }

  update(dt: number): void {
    const lerpFactor = 1 - Math.pow(1 - 0.08, dt * 60);
    this.x += (this.targetX - this.x) * lerpFactor;
    this.y += (this.targetY - this.y) * lerpFactor;

    if (this.shakeDuration > 0) {
      this.shakeTimer += dt;
      if (this.shakeTimer >= this.shakeDuration) {
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;
      }
    }
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    let offsetX = 0;
    let offsetY = 0;
    if (this.shakeIntensity > 0 && this.shakeDuration > 0) {
      offsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      offsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
    }
    return {
      x: worldX - this.x + offsetX,
      y: worldY - this.y + offsetY,
    };
  }

  startShake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = 0;
  }
}

export class Renderer {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  private tileCache = new Map<string, HTMLCanvasElement>();
  private spriteCache = new Map<string, HTMLCanvasElement>();

  constructor(ctx: CanvasRenderingContext2D, imageSmoothingEnabled = false) {
    this.ctx = ctx;
    this.width = ctx.canvas.width;
    this.height = ctx.canvas.height;
    ctx.imageSmoothingEnabled = imageSmoothingEnabled;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  drawPixelData(
    pixelData: number[][],
    x: number,
    y: number,
    palette: string[],
    cacheKey?: string,
  ): void {
    const key = cacheKey || `px_${x}_${y}`;
    let cached = this.tileCache.get(key);
    const w = pixelData[0] ? pixelData[0].length : 0;
    const h = pixelData.length;

    if (!cached) {
      const offscreen = document.createElement('canvas');
      offscreen.width = Math.max(1, w);
      offscreen.height = Math.max(1, h);
      const offCtx = offscreen.getContext('2d')!;
      const imgData = offCtx.createImageData(w, h);
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const colorIdx = (pixelData[py] && pixelData[py][px] !== undefined) ? pixelData[py][px] : 0;
          const colorStr = palette[colorIdx] || (colorIdx === 0 ? 'transparent' : '#ffffff');
          if (colorStr === 'transparent' || colorIdx === 0) continue;
          const dstIdx = (py * w + px) * 4;
          const hex = colorStr.replace('#', '');
          if (hex.length === 6) {
            imgData.data[dstIdx] = parseInt(hex.slice(0, 2), 16);
            imgData.data[dstIdx + 1] = parseInt(hex.slice(2, 4), 16);
            imgData.data[dstIdx + 2] = parseInt(hex.slice(4, 6), 16);
            imgData.data[dstIdx + 3] = 255;
          }
        }
      }
      offCtx.putImageData(imgData, 0, 0);
      cached = offscreen;
      this.tileCache.set(key, cached);
    }

    this.ctx.drawImage(cached, Math.floor(x), Math.floor(y));
  }

  drawTile(
    image: HTMLImageElement,
    srcX: number,
    srcY: number,
    srcW: number,
    srcH: number,
    dstX: number,
    dstY: number,
    dstW: number,
    dstH: number,
  ): void {
    const cacheKey = `${image.src}_${srcX}_${srcY}_${srcW}_${srcH}`;
    let cached = this.tileCache.get(cacheKey);

    if (!cached || cached.width !== dstW || cached.height !== dstH) {
      const offscreen = document.createElement('canvas');
      offscreen.width = Math.max(1, Math.floor(dstW));
      offscreen.height = Math.max(1, Math.floor(dstH));
      const offCtx = offscreen.getContext('2d')!;
      offCtx.drawImage(
        image,
        Math.floor(srcX),
        Math.floor(srcY),
        srcW,
        srcH,
        0,
        0,
        Math.floor(dstW),
        Math.floor(dstH),
      );
      cached = offscreen;
      this.tileCache.set(cacheKey, cached);
    }

    this.ctx.drawImage(cached, Math.floor(dstX), Math.floor(dstY));
  }

  drawSprite(
    image: HTMLImageElement,
    srcX: number,
    srcY: number,
    srcW: number,
    srcH: number,
    dstX: number,
    dstY: number,
    dstW: number,
    dstH: number,
    flipX = false,
  ): void {
    const safeDstX = Math.floor(dstX);
    const safeDstY = Math.floor(dstY);
    const safeDstW = Math.max(1, Math.floor(dstW));
    const safeDstH = Math.max(1, Math.floor(dstH));

    if (flipX) {
      this.ctx.save();
      this.ctx.translate(safeDstX + safeDstW, safeDstY);
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(image, srcX, srcY, srcW, srcH, 0, 0, safeDstW, safeDstH);
      this.ctx.restore();
    } else {
      this.ctx.drawImage(image, srcX, srcY, srcW, srcH, safeDstX, safeDstY, safeDstW, safeDstH);
    }
  }

  drawRect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  }

  drawText(text: string, x: number, y: number, color = '#fff', font = '16px monospace'): void {
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.fillText(text, Math.floor(x), Math.floor(y));
  }

  getTexture(key: string): HTMLCanvasElement | undefined {
    return this.spriteCache.get(key);
  }
}

export class Physics {
  static checkCollision(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
  ): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  static resolveCollision(
    entity: { x: number; y: number; width: number; height: number; vx?: number; vy?: number },
    tiles: Array<{ x: number; y: number; width: number; height: number }>,
    tileSize: number,
    mapW: number,
    mapH: number,
  ): void {
    const ex = entity.x;
    const ey = entity.y;
    const ew = entity.width;
    const eh = entity.height;

    for (const tile of tiles) {
      if (!Physics.checkCollision(entity, tile)) continue;

      const overlapLeft = (ex + ew) - tile.x;
      const overlapRight = (tile.x + tile.width) - ex;
      const overlapTop = (ey + eh) - tile.y;
      const overlapBottom = (tile.y + tile.height) - ey;

      const minOverlapX = Math.min(overlapLeft, overlapRight);
      const minOverlapY = Math.min(overlapTop, overlapBottom);

      if (minOverlapX < minOverlapY) {
        if (overlapLeft < overlapRight) {
          entity.x -= overlapLeft;
        } else {
          entity.x += overlapRight;
        }
        if (entity.vx !== undefined) entity.vx = 0;
      } else {
        if (overlapTop < overlapBottom) {
          entity.y -= overlapTop;
        } else {
          entity.y += overlapBottom;
        }
        if (entity.vy !== undefined) entity.vy = 0;
      }
    }

    if (entity.x < 0) {
      entity.x = 0;
      if (entity.vx !== undefined) entity.vx = 0;
    }
    if (entity.x + ew > mapW * tileSize) {
      entity.x = mapW * tileSize - ew;
      if (entity.vx !== undefined) entity.vx = 0;
    }
    if (entity.y < 0) {
      entity.y = 0;
      if (entity.vy !== undefined) entity.vy = 0;
    }
    if (entity.y + eh > mapH * tileSize) {
      entity.y = mapH * tileSize - eh;
      if (entity.vy !== undefined) entity.vy = 0;
    }
  }
}

export class GameLoop {
  callback!: (dt: number) => void;
  running = false;
  lastTime = 0;
  accumulator = 0;
  fixedDt = 1 / 60;
  maxSteps = 5;
  private animFrameId: number | null = null;

  start(callback: (dt: number) => void): void {
    this.callback = callback;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.animFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  stop(): void {
    this.running = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  loop(time: number): void {
    if (!this.running) return;

    const rawDt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    const dt = Math.min(rawDt, 0.25);
    this.accumulator += dt;

    let steps = 0;
    while (this.accumulator >= this.fixedDt && steps < this.maxSteps) {
      this.callback(this.fixedDt);
      this.accumulator -= this.fixedDt;
      steps++;
    }

    this.animFrameId = requestAnimationFrame((t) => this.loop(t));
  }
}
