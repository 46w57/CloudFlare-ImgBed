const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GRAVITY = 0.6;
const GROUND_Y = 520;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const gameState = {
    isRunning: false,
    winner: null
};

const keys = {};

class Mech {
    constructor(x, color, controls, isPlayer1) {
        this.x = x;
        this.y = GROUND_Y - 64;
        this.width = 48;
        this.height = 64;
        this.vx = 0;
        this.vy = 0;
        this.hp = 100;
        this.maxHp = 100;
        this.state = 'idle';
        this.facing = isPlayer1 ? 1 : -1;
        this.attackCooldown = 0;
        this.isDefending = false;
        this.isHurt = false;
        this.hurtTimer = 0;
        this.color = color;
        this.controls = controls;
        this.isPlayer1 = isPlayer1;
        this.animFrame = 0;
        this.animTimer = 0;
        this.attackHitbox = null;
        this.onGround = true;
    }

    update(opponent) {
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.hurtTimer > 0) {
            this.hurtTimer--;
            if (this.hurtTimer === 0) this.isHurt = false;
        }

        this.vy += GRAVITY;

        let moving = false;
        this.isDefending = false;

        if (!this.isHurt && this.state !== 'attack') {
            if (keys[this.controls.left]) {
                this.vx = -5;
                this.facing = -1;
                moving = true;
            } else if (keys[this.controls.right]) {
                this.vx = 5;
                this.facing = 1;
                moving = true;
            } else {
                this.vx = 0;
            }

            if (keys[this.controls.jump] && this.onGround) {
                this.vy = -14;
                this.onGround = false;
            }

            if (keys[this.controls.defend]) {
                this.isDefending = true;
                this.state = 'defend';
                this.vx = 0;
            } else if (keys[this.controls.attack] && this.attackCooldown === 0) {
                this.state = 'attack';
                this.attackCooldown = 30;
                this.performAttack(opponent);
            } else if (!this.isDefending) {
                this.state = moving ? 'walk' : 'idle';
            }
        }

        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > CANVAS_WIDTH) this.x = CANVAS_WIDTH - this.width;

        if (this.y >= GROUND_Y - this.height) {
            this.y = GROUND_Y - this.height;
            this.vy = 0;
            this.onGround = true;
        }

        this.animTimer++;
        if (this.animTimer >= 8) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }

        if (this.state === 'attack' && this.attackCooldown <= 20) {
            this.state = 'idle';
            this.attackHitbox = null;
        }
    }

    performAttack(opponent) {
        const attackWidth = 40;
        const attackX = this.facing === 1 ? this.x + this.width : this.x - attackWidth;
        
        this.attackHitbox = {
            x: attackX,
            y: this.y + 10,
            width: attackWidth,
            height: 40
        };

        if (this.checkCollision(this.attackHitbox, opponent)) {
            let damage = 15;
            if (opponent.isDefending) {
                damage = 5;
            }
            opponent.takeDamage(damage);
        }
    }

    takeDamage(damage) {
        this.hp -= damage;
        this.isHurt = true;
        this.hurtTimer = 15;
        this.state = 'hurt';
        this.vx = -this.facing * 8;

        if (this.hp <= 0) {
            this.hp = 0;
            gameState.winner = this.isPlayer1 ? '玩家2' : '玩家1';
            endGame();
        }
    }

    checkCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    draw() {
        ctx.save();
        
        if (this.isHurt && Math.floor(this.hurtTimer / 3) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        const centerX = this.x + this.width / 2;
        
        if (this.facing === -1) {
            ctx.translate(centerX * 2, 0);
            ctx.scale(-1, 1);
        }

        const drawX = this.x;
        const drawY = this.y;
        const bounce = this.state === 'walk' ? Math.sin(this.animFrame * Math.PI / 2) * 2 : 0;

        this.drawBody(drawX, drawY + bounce);
        this.drawHead(drawX, drawY + bounce);
        this.drawArms(drawX, drawY + bounce);
        this.drawLegs(drawX, drawY + bounce);

        if (this.isDefending) {
            this.drawShield(drawX, drawY + bounce);
        }

        if (this.state === 'attack' && this.attackHitbox) {
            this.drawAttackEffect();
        }

        ctx.restore();
    }

    drawBody(x, y) {
        ctx.fillStyle = this.color;
        ctx.fillRect(x + 8, y + 16, 32, 32);
        
        ctx.fillStyle = this.darkenColor(this.color, 30);
        ctx.fillRect(x + 10, y + 18, 6, 28);
        
        ctx.fillStyle = this.lightenColor(this.color, 30);
        ctx.fillRect(x + 32, y + 18, 6, 28);
        
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(x + 20, y + 28, 8, 8);
    }

    drawHead(x, y) {
        ctx.fillStyle = this.color;
        ctx.fillRect(x + 12, y, 24, 20);
        
        ctx.fillStyle = this.darkenColor(this.color, 20);
        ctx.fillRect(x + 14, y + 2, 20, 4);
        
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(x + 16, y + 8, 6, 6);
        ctx.fillRect(x + 26, y + 8, 6, 6);
        
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(x + 22, y - 8, 4, 10);
        ctx.fillRect(x + 20, y - 10, 8, 4);
    }

    drawArms(x, y) {
        const armSwing = this.state === 'walk' ? Math.sin(this.animFrame * Math.PI / 2) * 6 : 0;
        
        if (this.state === 'attack') {
            ctx.fillStyle = this.color;
            ctx.fillRect(x + 36, y + 18, 24, 12);
            ctx.fillStyle = this.lightenColor(this.color, 20);
            ctx.fillRect(x + 52, y + 16, 8, 16);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(x, y + 18 + armSwing, 12, 24);
            ctx.fillRect(x + 36, y + 18 - armSwing, 12, 24);
        }
    }

    drawLegs(x, y) {
        const legOffset = this.state === 'walk' ? Math.sin(this.animFrame * Math.PI / 2) * 4 : 0;
        
        ctx.fillStyle = this.darkenColor(this.color, 20);
        ctx.fillRect(x + 12, y + 48 + legOffset, 10, 16);
        ctx.fillRect(x + 26, y + 48 - legOffset, 10, 16);
        
        ctx.fillStyle = '#333';
        ctx.fillRect(x + 10, y + 58 + legOffset, 14, 6);
        ctx.fillRect(x + 24, y + 58 - legOffset, 14, 6);
    }

    drawShield(x, y) {
        ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.fillRect(x - 4, y + 10, 56, 44);
        
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 4, y + 10, 56, 44);
    }

    drawAttackEffect() {
        if (this.attackHitbox) {
            ctx.fillStyle = 'rgba(255, 100, 0, 0.6)';
            ctx.fillRect(
                this.attackHitbox.x, 
                this.attackHitbox.y, 
                this.attackHitbox.width, 
                this.attackHitbox.height
            );
        }
    }

    darkenColor(color, amount) {
        const num = parseInt(color.slice(1), 16);
        const r = Math.max(0, (num >> 16) - amount);
        const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
        const b = Math.max(0, (num & 0x0000FF) - amount);
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    }

    lightenColor(color, amount) {
        const num = parseInt(color.slice(1), 16);
        const r = Math.min(255, (num >> 16) + amount);
        const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
        const b = Math.min(255, (num & 0x0000FF) + amount);
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    }
}

const player1 = new Mech(100, '#ff6b35', {
    left: 'a',
    right: 'd',
    jump: 'w',
    attack: 'j',
    defend: 'k'
}, true);

const player2 = new Mech(650, '#4a90d9', {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    jump: 'ArrowUp',
    attack: ',',
    defend: '.'
}, false);

function drawBackground() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = '#16213e';
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 6; j++) {
            if ((i + j) % 2 === 0) {
                ctx.fillRect(i * 80, j * 80, 80, 80);
            }
        }
    }
    
    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    
    ctx.fillStyle = '#3d3d5c';
    for (let i = 0; i < CANVAS_WIDTH; i += 40) {
        ctx.fillRect(i, GROUND_Y, 2, 80);
    }
    for (let i = GROUND_Y; i < CANVAS_HEIGHT; i += 20) {
        ctx.fillRect(0, i, CANVAS_WIDTH, 2);
    }
    
    ctx.fillStyle = '#4a4a6a';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 4);
}

function drawHealthBar(x, y, hp, maxHp, isPlayer1) {
    const barWidth = 200;
    const barHeight = 24;
    
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, barWidth, barHeight);
    
    ctx.strokeStyle = isPlayer1 ? '#ff6b35' : '#4a90d9';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, barWidth, barHeight);
    
    const healthWidth = (hp / maxHp) * (barWidth - 6);
    ctx.fillStyle = hp > 30 ? (isPlayer1 ? '#ff6b35' : '#4a90d9') : '#ff0000';
    ctx.fillRect(x + 3, y + 3, healthWidth, barHeight - 6);
    
    ctx.fillStyle = '#fff';
    ctx.font = '10px "Press Start 2P"';
    ctx.textAlign = isPlayer1 ? 'left' : 'right';
    ctx.fillText(`${hp}/${maxHp}`, isPlayer1 ? x + 10 : x + barWidth - 10, y + 17);
    
    ctx.fillStyle = isPlayer1 ? '#ff6b35' : '#4a90d9';
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText(isPlayer1 ? '玩家1' : '玩家2', isPlayer1 ? x + 10 : x + barWidth - 10, y - 8);
}

function drawUI() {
    drawHealthBar(30, 30, player1.hp, player1.maxHp, true);
    drawHealthBar(CANVAS_WIDTH - 230, 30, player2.hp, player2.maxHp, false);
}

function gameLoop() {
    if (!gameState.isRunning) return;

    player1.update(player2);
    player2.update(player1);

    drawBackground();
    player1.draw();
    player2.draw();
    drawUI();

    requestAnimationFrame(gameLoop);
}

function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    gameState.isRunning = true;
    gameState.winner = null;
    gameLoop();
}

function endGame() {
    gameState.isRunning = false;
    document.getElementById('winnerText').textContent = `${gameState.winner} 获胜！`;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

function restartGame() {
    player1.hp = 100;
    player2.hp = 100;
    player1.x = 100;
    player2.x = 650;
    player1.y = GROUND_Y - 64;
    player2.y = GROUND_Y - 64;
    player1.vx = 0;
    player2.vx = 0;
    player1.vy = 0;
    player2.vy = 0;
    player1.state = 'idle';
    player2.state = 'idle';
    player1.attackCooldown = 0;
    player2.attackCooldown = 0;
    player1.isDefending = false;
    player2.isDefending = false;
    player1.isHurt = false;
    player2.isHurt = false;
    
    document.getElementById('gameOverScreen').classList.add('hidden');
    gameState.isRunning = true;
    gameState.winner = null;
    gameLoop();
}

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

drawBackground();
player1.draw();
player2.draw();
