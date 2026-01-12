
import { 
  GameState, 
  Settings, 
  Entity, 
  Bullet, 
  Enemy, 
  PowerUp, 
  Particle,
  ControlMode,
  Difficulty
} from '../types';
import { 
  COLORS, 
  CANVAS_VIRTUAL_WIDTH, 
  CANVAS_VIRTUAL_HEIGHT,
  PLAYER_SPEED,
  PLAYER_DAMPING,
  PLAYER_FIRE_RATE
} from '../constants';

const SIGIL_IMG_URL = 'https://i.ibb.co.com/XkCCS678/Picsart-26-01-12-16-48-17-683.png';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private settings: Settings;
  private sigilImg: HTMLImageElement;
  
  private player: Entity & { shield: number, maxShield: number, fireRate: number, lastShot: number, weaponType: number, invuln: number } = {
    id: 'player',
    x: CANVAS_VIRTUAL_WIDTH / 2,
    y: CANVAS_VIRTUAL_HEIGHT * 0.85,
    vx: 0,
    vy: 0,
    width: 36,
    height: 36,
    active: true,
    health: 3,
    maxHealth: 3,
    shield: 0,
    maxShield: 100,
    fireRate: PLAYER_FIRE_RATE,
    lastShot: 0,
    weaponType: 1,
    invuln: 0
  };

  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private powerUps: PowerUp[] = [];
  private particles: Particle[] = [];
  private stars: {x: number, y: number, s: number}[] = [];

  public score = 0;
  public bestScore = 0;
  public gameState: GameState = GameState.START;
  private lastTime = performance.now();
  private accumulator = 0;
  private readonly dt = 1000 / 60;
  private spawnTimer = 0;
  private shakeTime = 0;
  
  private bossActive = false;
  private lastBossScore = 0;
  private bossCooldown = 12000; 
  private bossSpawnThreshold = 5000;

  public joystick = { active: false, x: 0, y: 0, targetX: 0, targetY: 0 };
  public keyboard = { up: false, down: false, left: false, right: false, space: false };
  public shooting = false;

  constructor(canvas: HTMLCanvasElement, settings: Settings, bestScore: number) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.settings = settings;
    this.bestScore = bestScore;
    this.sigilImg = new Image();
    this.sigilImg.src = SIGIL_IMG_URL;
    this.initStars();
  }

  private initStars() {
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * CANVAS_VIRTUAL_WIDTH,
        y: Math.random() * CANVAS_VIRTUAL_HEIGHT,
        s: Math.random() * 2 + 0.5
      });
    }
  }

  public update(time: number) {
    const delta = time - this.lastTime;
    this.lastTime = time;
    if (delta > 100) return;
    this.accumulator += delta;
    while (this.accumulator >= this.dt) {
      this.step();
      this.accumulator -= this.dt;
    }
    this.draw();
  }

  private step() {
    if (this.gameState !== GameState.PLAYING) return;
    this.updatePlayer();
    this.updateBullets();
    this.updateEnemies();
    this.updatePowerUps();
    this.updateParticles();
    this.updateBackground();
    this.handleCollisions();
    this.spawnLogic();
    if (this.shakeTime > 0) this.shakeTime -= this.dt;
    if (this.player.invuln > 0) this.player.invuln -= this.dt;
    this.score += 1;
  }

  private updatePlayer() {
    if (this.settings.controlMode === ControlMode.DRAG && this.joystick.active) {
      const dx = this.joystick.targetX - this.player.x;
      const dy = this.joystick.targetY - this.player.y;
      this.player.vx = dx * 0.4;
      this.player.vy = dy * 0.4;
    } else {
      let inputX = this.joystick.active ? this.joystick.x : 0;
      let inputY = this.joystick.active ? this.joystick.y : 0;
      if (this.keyboard.left) inputX -= 1;
      if (this.keyboard.right) inputX += 1;
      if (this.keyboard.up) inputY -= 1;
      if (this.keyboard.down) inputY += 1;
      
      if (inputX !== 0 && inputY !== 0 && !this.joystick.active) {
        const mag = Math.sqrt(inputX * inputX + inputY * inputY);
        inputX /= mag;
        inputY /= mag;
      }
      this.player.vx += inputX * PLAYER_SPEED * 2.1;
      this.player.vy += inputY * PLAYER_SPEED * 2.1;
      this.player.vx *= PLAYER_DAMPING;
      this.player.vy *= PLAYER_DAMPING;
    }

    this.player.x += this.player.vx;
    this.player.y += this.player.vy;
    this.player.x = Math.max(20, Math.min(CANVAS_VIRTUAL_WIDTH - 20, this.player.x));
    this.player.y = Math.max(50, Math.min(CANVAS_VIRTUAL_HEIGHT - 50, this.player.y));
    
    const now = performance.now();
    const canShoot = this.settings.controlMode === ControlMode.DRAG ? true : (this.shooting || this.keyboard.space);
    if (canShoot && now - this.player.lastShot > this.player.fireRate) {
      this.firePlayerWeapon();
      this.player.lastShot = now;
    }
  }

  private updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      if (b.y < -100 || b.y > CANVAS_VIRTUAL_HEIGHT + 100 || b.x < -100 || b.x > CANVAS_VIRTUAL_WIDTH + 100) {
        this.bullets.splice(i, 1);
      }
    }
  }

  private updatePowerUps() {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.y += p.vy;
      if (p.y > CANVAS_VIRTUAL_HEIGHT + 100) {
        this.powerUps.splice(i, 1);
      }
    }
  }

  private firePlayerWeapon() {
    const damage = 10;
    const speed = -17;
    if (this.player.weaponType === 1) {
      this.spawnBullet(this.player.x, this.player.y - 20, 0, speed, 'player', damage);
    } else if (this.player.weaponType === 2) {
      this.spawnBullet(this.player.x - 14, this.player.y - 20, 0, speed, 'player', damage);
      this.spawnBullet(this.player.x + 14, this.player.y - 20, 0, speed, 'player', damage);
    } else {
      this.spawnBullet(this.player.x, this.player.y - 22, 0, speed, 'player', damage);
      this.spawnBullet(this.player.x - 22, this.player.y - 15, -2.8, speed, 'player', damage);
      this.spawnBullet(this.player.x + 22, this.player.y - 15, 2.8, speed, 'player', damage);
    }
  }

  private spawnBullet(x: number, y: number, vx: number, vy: number, owner: 'player' | 'enemy', damage: number) {
    this.bullets.push({
      id: Math.random().toString(36).substr(2, 5),
      x, y, vx, vy,
      width: owner === 'player' ? 5 : 12,
      height: owner === 'player' ? 20 : 12,
      active: true,
      owner,
      damage,
      health: 1,
      maxHealth: 1
    });
  }

  private getDifficultyModifier() {
    switch(this.settings.difficulty) {
      // Easy is now what Mid used to be
      case Difficulty.EASY: return { hp: 1.0, fire: 1.0, drop: 1.2, accel: 1.3 };
      // Mid is now 1.8x intensity (old Mid was 1.3)
      case Difficulty.MID: return { hp: 1.5, fire: 1.4, drop: 1.0, accel: 1.8 }; 
      // Hard is even more extreme
      case Difficulty.HARD: return { hp: 2.2, fire: 1.8, drop: 0.7, accel: 2.5 };
      default: return { hp: 1.0, fire: 1.0, drop: 1.0, accel: 1.3 };
    }
  }

  private spawnLogic() {
    if (this.bossActive) return;
    const diff = this.getDifficultyModifier();
    if (this.score >= this.bossSpawnThreshold && (this.score - this.lastBossScore) > (this.bossCooldown / diff.accel)) {
      this.spawnBoss();
      this.bossSpawnThreshold += (15000 / diff.accel);
      return;
    }
    this.spawnTimer += this.dt;
    const progressionFactor = Math.floor((this.score * diff.accel) / 3500);
    const scaledRate = Math.max(350, (1800 - (progressionFactor * 150)) / diff.fire);
    if (this.spawnTimer > scaledRate) {
      this.spawnTimer = 0;
      const roll = Math.random();
      let type: 'drone' | 'skimmer' | 'guardian' = 'drone';
      const scoreCheck = this.score * diff.accel;
      if (scoreCheck > 15000 && roll > 0.8) type = 'guardian';
      else if (scoreCheck > 5000 && roll > 0.7) type = 'skimmer';
      const hpScale = (1 + (scoreCheck / 35000)) * diff.hp;
      this.enemies.push({
        id: Math.random().toString(36).substr(2, 5),
        x: Math.random() * (CANVAS_VIRTUAL_WIDTH - 100) + 50,
        y: -80,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 1.0 + Math.random() * 1.5,
        width: type === 'guardian' ? 60 : 45,
        height: type === 'guardian' ? 60 : 45,
        active: true,
        type,
        health: (type === 'guardian' ? 60 : type === 'skimmer' ? 20 : 10) * hpScale,
        maxHealth: (type === 'guardian' ? 60 : type === 'skimmer' ? 20 : 10) * hpScale,
        scoreValue: type === 'guardian' ? 400 : 100,
        lastShot: performance.now() + Math.random() * 1000,
        fireRate: Math.max(600, 2800 - (progressionFactor * 250)) * (1/diff.fire)
      });
    }
  }

  private spawnBoss() {
    this.bossActive = true;
    const diff = this.getDifficultyModifier();
    const hp = (6500 + (this.score / 1.5)) * diff.hp;
    this.enemies.push({
      id: 'boss-archon',
      x: CANVAS_VIRTUAL_WIDTH / 2,
      y: -300,
      vx: 0,
      vy: 0.5,
      width: 220,
      height: 220,
      active: true,
      type: 'boss',
      health: hp,
      maxHealth: hp,
      scoreValue: 10000,
      lastShot: performance.now(),
      fireRate: 1000 * (1/diff.fire),
      phase: 1
    });
  }

  private updateEnemies() {
    const now = performance.now();
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.type === 'boss') {
        if (e.y < 180) {
          e.y += e.vy;
        } else {
          const hpPercent = e.health / e.maxHealth;
          if (hpPercent < 0.2) e.phase = 4;
          else if (hpPercent < 0.5) e.phase = 3;
          else if (hpPercent < 0.8) e.phase = 2;
          if (now - e.lastShot > e.fireRate) {
            e.lastShot = now;
            if (e.phase === 1) {
              for (let j = -2; j <= 2; j++) this.spawnBullet(e.x, e.y + 80, j * 2, 5, 'enemy', 1);
            } else if (e.phase === 2) {
              for (let j = 0; j < 14; j++) {
                const ang = (j / 14) * Math.PI * 2 + (now * 0.0006);
                this.spawnBullet(e.x, e.y, Math.cos(ang) * 5, Math.sin(ang) * 5, 'enemy', 1);
              }
              e.fireRate = 1200;
            } else if (e.phase === 3) {
               const sweep = Math.sin(now * 0.004) * 8;
               this.spawnBullet(e.x, e.y + 80, sweep, 9, 'enemy', 1);
               e.fireRate = 250;
            } else {
               for (let j = 0; j < 6; j++) this.spawnBullet(e.x, e.y, (Math.random() - 0.5) * 18, 4 + Math.random() * 9, 'enemy', 1);
               e.fireRate = 350;
            }
          }
        }
      } else {
        e.x += e.vx;
        e.y += e.vy;
        if (now - e.lastShot > e.fireRate) {
           this.spawnBullet(e.x, e.y + 20, 0, 6, 'enemy', 1);
           e.lastShot = now;
        }
      }
      if (e.y > CANVAS_VIRTUAL_HEIGHT + 400) this.enemies.splice(i, 1);
    }
  }

  private handleCollisions() {
    const diff = this.getDifficultyModifier();
    for (let i = 0; i < this.bullets.length; i++) {
      const b = this.bullets[i];
      if (!b.active) continue;
      if (b.owner === 'player') {
        for (let j = 0; j < this.enemies.length; j++) {
          const e = this.enemies[j];
          if (e.active && this.checkCollision(b, e)) {
            b.active = false;
            e.health -= b.damage;
            this.spawnExplosion(b.x, b.y, 1, COLORS.WHITE);
            const hitDropThreshold = 0.993 / diff.drop; 
            if (e.type === 'boss' && Math.random() > hitDropThreshold) {
              this.spawnPowerUp(e.x + (Math.random()-0.5)*150, e.y + 80);
            }
            if (e.health <= 0) {
              e.active = false;
              this.score += e.scoreValue;
              this.spawnExplosion(e.x, e.y, e.type === 'boss' ? 120 : 12, COLORS.NEON_GREEN);
              if (e.type === 'boss') {
                this.bossActive = false;
                this.lastBossScore = this.score;
                this.applyPowerUp('repair');
                for (let k = 0; k < 2; k++) this.spawnPowerUp(e.x + (k-0.5)*80, e.y);
              }
              const baseDrop = 0.07 * diff.drop;
              if (Math.random() < baseDrop) this.spawnPowerUp(e.x, e.y);
            }
            break;
          }
        }
      } else {
        if (this.player.invuln <= 0 && this.checkCollision(b, this.player)) {
          b.active = false;
          this.hitPlayer();
        }
      }
    }
    for (const e of this.enemies) {
      if (e.active && this.player.invuln <= 0 && this.checkCollision(this.player, e)) {
        if (e.type !== 'boss') e.active = false;
        this.hitPlayer();
      }
    }
    for (const p of this.powerUps) {
      if (p.active && this.checkCollision(this.player, p)) {
        p.active = false;
        this.applyPowerUp(p.type);
      }
    }
    this.enemies = this.enemies.filter(e => e.active);
    this.bullets = this.bullets.filter(b => b.active);
    this.powerUps = this.powerUps.filter(p => p.active);
  }

  private hitPlayer() {
    if (this.player.shield > 0) {
      this.player.shield -= 35;
      if (this.player.shield < 0) this.player.shield = 0;
    } else {
      this.player.health -= 1;
      this.player.invuln = 2000;
      this.shakeTime = 400;
    }
    if (this.player.health <= 0) this.gameState = GameState.GAMEOVER;
  }

  private applyPowerUp(type: string) {
    if (type === 'double') this.player.weaponType = 2;
    if (type === 'triple') this.player.weaponType = 3;
    if (type === 'shield') this.player.shield = 100;
    if (type === 'rate') this.player.fireRate = Math.max(60, this.player.fireRate - 20);
    if (type === 'repair') this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
  }

  private checkCollision(a: any, b: any) {
    const distX = Math.abs(a.x - b.x);
    const distY = Math.abs(a.y - b.y);
    const hitW = (a.width + b.width) * 0.38;
    const hitH = (a.height + b.height) * 0.38;
    return distX < hitW && distY < hitH;
  }

  private spawnExplosion(x: number, y: number, count: number, color: string) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        id: Math.random().toString(),
        x, y,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14,
        width: 3, height: 3,
        active: true,
        health: 1, maxHealth: 1,
        life: 1, maxLife: 1,
        color,
        size: Math.random() * 6 + 1
      });
    }
  }

  private spawnPowerUp(x: number, y: number) {
    const types: any[] = ['double', 'triple', 'shield', 'rate', 'repair'];
    const type = types[Math.floor(Math.random() * types.length)];
    this.powerUps.push({
      id: Math.random().toString(),
      x, y, vx: 0, vy: 1.5,
      width: 36, height: 36,
      active: true,
      health: 1, maxHealth: 1,
      type
    });
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  private updateBackground() {
    for (const s of this.stars) {
      s.y += s.s * 0.45;
      if (s.y > CANVAS_VIRTUAL_HEIGHT) {
        s.y = -10;
        s.x = Math.random() * CANVAS_VIRTUAL_WIDTH;
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const scale = this.canvas.width / CANVAS_VIRTUAL_WIDTH;
    ctx.save();
    ctx.scale(scale, scale);
    if (this.shakeTime > 0 && this.settings.screenShake) {
      ctx.translate((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15);
    }
    ctx.fillStyle = COLORS.WHITE;
    for (const s of this.stars) ctx.fillRect(s.x, s.y, s.s, s.s);
    for (const p of this.powerUps) this.drawPowerUp(ctx, p);
    for (const e of this.enemies) this.drawEnemy(ctx, e);
    for (const b of this.bullets) {
      ctx.fillStyle = b.owner === 'player' ? COLORS.WHITE : COLORS.NEON_GREEN;
      if (b.owner === 'player') ctx.fillRect(b.x - b.width/2, b.y - b.height/2, b.width, b.height);
      else {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.width/2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (this.player.invuln <= 0 || Math.floor(performance.now() / 120) % 2 === 0) this.drawPlayer(ctx);
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
    ctx.globalAlpha = 1.0;
    const boss = this.enemies.find(e => e.type === 'boss');
    if (boss) this.drawBossBar(ctx, boss);
    ctx.restore();
  }

  private drawBossBar(ctx: CanvasRenderingContext2D, boss: Enemy) {
    const barW = 340;
    const barX = (CANVAS_VIRTUAL_WIDTH - barW) / 2;
    const barY = 55;
    const healthP = Math.max(0, boss.health / boss.maxHealth);
    ctx.strokeStyle = COLORS.WHITE;
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, 16);
    ctx.fillStyle = COLORS.NEON_GREEN;
    ctx.fillRect(barX + 3, barY + 3, (barW - 6) * healthP, 10);
    ctx.fillStyle = COLORS.WHITE;
    ctx.font = 'bold 14px Cinzel Decorative';
    ctx.textAlign = 'center';
    ctx.fillText('VOID ARCHON - RITE CORE', CANVAS_VIRTUAL_WIDTH / 2, barY - 10);
  }

  private drawPowerUp(ctx: CanvasRenderingContext2D, p: PowerUp) {
    const glow = Math.sin(performance.now() * 0.01) * 8;
    ctx.strokeStyle = COLORS.NEON_GREEN;
    ctx.shadowBlur = 10 + glow;
    ctx.shadowColor = COLORS.NEON_GREEN;
    ctx.fillStyle = COLORS.BLACK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(p.x - 18, p.y - 18, 36, 36);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.NEON_GREEN;
    ctx.font = 'bold 18px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(p.type[0].toUpperCase(), p.x, p.y + 8);
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.shield > 0) {
      ctx.strokeStyle = COLORS.NEON_GREEN;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 42, performance.now() * 0.012, performance.now() * 0.012 + Math.PI * 1.7);
      ctx.stroke();
    }
    ctx.fillStyle = COLORS.BLACK;
    ctx.strokeStyle = COLORS.NEON_GREEN;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(24, 20);
    ctx.lineTo(0, 10);
    ctx.lineTo(-24, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.strokeStyle = COLORS.NEON_GREEN;
    ctx.fillStyle = COLORS.BLACK;
    ctx.lineWidth = 2.5;
    if (e.type === 'boss') {
      const angle = performance.now() * 0.001;
      const scale = 1 + Math.sin(performance.now() * 0.002) * 0.08;
      ctx.scale(scale, scale);
      ctx.rotate(angle);
      for(let i=0; i<3; i++) {
        ctx.rotate(Math.PI/1.5);
        ctx.strokeRect(-80, -80, 160, 160);
      }
      ctx.rotate(-angle * 1.5);
      if (this.sigilImg.complete) {
        ctx.drawImage(this.sigilImg, -60, -60, 120, 120);
      }
      ctx.beginPath();
      ctx.arc(0, 0, 65, 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.type === 'guardian') {
      const r = performance.now() * 0.002;
      ctx.rotate(r);
      ctx.beginPath();
      ctx.moveTo(0, 30);
      ctx.lineTo(-25, -20);
      ctx.lineTo(0, -10);
      ctx.lineTo(25, -20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.rotate(-r * 2);
      ctx.beginPath();
      ctx.arc(0, -5, 12, 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.type === 'skimmer') {
      ctx.beginPath();
      ctx.moveTo(0, 25);
      ctx.lineTo(-30, -15);
      ctx.lineTo(-10, -25);
      ctx.lineTo(10, -25);
      ctx.lineTo(30, -15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, 20);
      ctx.lineTo(-20, -15);
      ctx.lineTo(20, -15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  public getHUDData() {
    return {
      score: Math.floor(this.score / 10),
      bestScore: Math.floor(this.bestScore / 10),
      lives: this.player.health,
      shield: this.player.shield
    };
  }

  public restart() {
    this.score = 0;
    this.player.health = 3;
    this.player.shield = 0;
    this.player.x = CANVAS_VIRTUAL_WIDTH / 2;
    this.player.y = CANVAS_VIRTUAL_HEIGHT * 0.85;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.weaponType = 1;
    this.player.fireRate = PLAYER_FIRE_RATE;
    this.enemies = [];
    this.bullets = [];
    this.powerUps = [];
    this.bossActive = false;
    this.lastBossScore = 0;
    this.bossSpawnThreshold = 5000;
    this.gameState = GameState.PLAYING;
    this.lastTime = performance.now();
  }
}
