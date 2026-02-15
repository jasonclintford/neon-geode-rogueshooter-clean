import Phaser from "phaser";
import { ensureGeneratedTextures } from "../assets/generated";
import { EnemyById } from "../data/enemies";
import { UpgradeById } from "../data/upgrades";
import { WeaponById, type WeaponFxProfile } from "../data/weapons";
import { Bullet } from "../entities/Bullet";
import { Player } from "../entities/Player";
import {
  type DecorationPlan,
  generateRoomLayout,
  type HazardPlan,
  type RoomLayout,
  type RoomTheme
} from "../proc/roomGen";
import { EffectsSystem } from "../systems/EffectsSystem";
import { loadBestDepth, loadBestScore, saveBestDepth, saveBestScore } from "../systems/Storage";
import { Tuning } from "../tuning";
import {
  DefaultRunModifiers,
  roomKey,
  type RoomCoord,
  type RunState
} from "../types";
import { RngStream } from "../utils/rng";

type DoorDir = "n" | "s" | "w" | "e";
type PickupType = "weapon" | "ammo" | "health" | "shrine" | "portal";

type HazardRuntime = {
  plan: HazardPlan;
  sprite: Phaser.GameObjects.Sprite;
  nextPulseAt: number;
};

const ROOM_MARGIN = 22;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private pickups!: Phaser.Physics.Arcade.StaticGroup;

  private effects!: EffectsSystem;
  private run!: RunState;
  private roomLayout!: RoomLayout;
  private roomCleared = false;
  private fireDown = false;
  private lastShotAt = -9999;
  private reloadUntil = -1;
  private invulnUntil = -9999;
  private transitionCooldownUntil = -9999;
  private pausedByUser = false;
  private stuckSince = -1;
  private restartArmed = false;

  private aiEvent: Phaser.Time.TimerEvent | null = null;
  private backdrop: Phaser.GameObjects.Graphics | null = null;
  private backdropOrbs: Phaser.GameObjects.Arc[] = [];
  private roomDecor: Phaser.GameObjects.Sprite[] = [];
  private playerAura!: Phaser.GameObjects.Arc;
  private hazards: HazardRuntime[] = [];
  private doorLocks: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super("Game");
  }

  create(): void {
    ensureGeneratedTextures(this);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBounds(0, 0, Tuning.room.width, Tuning.room.height);
    this.cameras.main.setZoom(1);
    this.physics.world.setBounds(0, 0, Tuning.room.width, Tuning.room.height);

    this.effects = new EffectsSystem(this);
    this.effects.init();

    this.bullets = this.physics.add.group({ classType: Bullet, maxSize: 420 });
    this.enemyBullets = this.physics.add.group({ classType: Bullet, maxSize: 340 });
    this.enemies = this.physics.add.group({ maxSize: 140 });
    this.obstacles = this.physics.add.staticGroup();
    this.pickups = this.physics.add.staticGroup();

    this.player = new Player(this, Tuning.room.width * 0.5, Tuning.room.height * 0.5);
    this.playerAura = this.add.circle(this.player.sprite.x, this.player.sprite.y, 26, 0x44efff, 0.18)
      .setDepth(4.8)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: this.playerAura,
      alpha: { from: 0.1, to: 0.32 },
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut"
    });
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(260, 150);

    this.run = {
      runSeed: this.makeSeed(),
      depth: 0,
      score: 0,
      bestScore: loadBestScore(),
      bestDepth: loadBestDepth(),
      room: { x: 0, y: 0 },
      visited: new Set<string>(),
      weaponId: "pistol",
      ammo: WeaponById["pistol"].ammoMax,
      health: Tuning.player.maxHealth,
      maxHealth: Tuning.player.maxHealth,
      enemyRemaining: 0,
      streak: 0,
      multiplier: 1,
      kills: 0,
      roomsCleared: 0,
      upgrades: [],
      modifiers: { ...DefaultRunModifiers },
      roomTheme: "azurite",
      portalRooms: new Map<string, { x: number; y: number; active: boolean }>(),
      paused: false,
      gameOver: false
    };
    this.run.visited.add(roomKey(this.run.room));

    this.bindInput();
    this.setupCollisions();
    this.setupEnemyAiLoop();
    this.loadRoom(this.run.room, 0);
    this.events.emit("run:update", this.run);
  }

  update(time: number): void {
    if (this.run.gameOver || this.pausedByUser) return;

    this.ensurePlayerBodyResponsive();
    this.player.update(time);
    this.playerAura.setPosition(this.player.sprite.x, this.player.sprite.y);
    this.tryResolveStuckPlayer(time);
    this.aimPlayer();
    this.handleReload(time);

    if (this.fireDown) this.tryShoot(time);

    if (!this.roomCleared && this.run.enemyRemaining === 0) {
      this.onRoomCleared();
    }
    this.stepPostUpdate(time);
  }

  renderGameToText(): string {
    const player = this.player.sprite;
    const payload = {
      mode: this.run.gameOver ? "gameover" : this.pausedByUser ? "paused" : "playing",
      coordSystem: "origin=(0,0) top-left, +x right, +y down",
      seed: this.run.runSeed,
      room: this.run.room,
      depth: this.run.depth,
      event: this.roomLayout?.event ?? null,
      theme: this.run.roomTheme,
      roomCleared: this.roomCleared,
      enemyRemaining: this.run.enemyRemaining,
      camera: {
        x: round(this.cameras.main.scrollX),
        y: round(this.cameras.main.scrollY)
      },
      portal: this.currentPortalForState(),
      player: {
        x: round(player.x),
        y: round(player.y),
        hp: this.run.health,
        maxHp: this.run.maxHealth,
        weapon: this.run.weaponId,
        ammo: this.run.ammo,
        rotation: round(player.rotation)
      },
      score: this.run.score,
      multiplier: this.run.multiplier,
      streak: this.run.streak,
      enemies: this.enemies.getChildren().filter(obj => {
        const e = obj as Phaser.Physics.Arcade.Sprite;
        return e.active;
      }).map(obj => {
        const e = obj as Phaser.Physics.Arcade.Sprite;
        return {
          id: e.getData("enemyId"),
          x: round(e.x),
          y: round(e.y),
          hp: e.getData("hp"),
          elite: !!e.getData("elite")
        };
      }),
      pickups: this.pickups.getChildren().map(obj => {
        const p = obj as Phaser.GameObjects.Sprite;
        return {
          type: p.getData("pickupType"),
          x: round(p.x),
          y: round(p.y)
        };
      })
    };

    return JSON.stringify(payload);
  }

  // Phaser runs real-time simulation, this hook exists for browser automation clients.
  advanceTime(_ms: number): void {
    // Intentionally left as a lightweight hook.
  }

  getRunState(): RunState {
    return this.run;
  }

  private bindInput(): void {
    const kb = this.input.keyboard!;
    kb.addCapture([
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.SPACE
    ]);

    const canvas = this.game.canvas as HTMLCanvasElement;
    canvas.setAttribute("tabindex", "0");
    canvas.style.outline = "none";
    canvas.focus();

    this.input.on("pointerdown", () => {
      if (this.run.gameOver) return;
      this.fireDown = true;
      canvas.focus();
    });
    this.input.on("pointerup", () => {
      this.fireDown = false;
    });

    this.input.keyboard!.on("keydown-E", () => {
      if (!this.run.gameOver && !this.pausedByUser) this.tryPickup();
    });
    this.input.keyboard!.on("keydown-R", () => {
      if (!this.run.gameOver && !this.pausedByUser) this.tryStartReload(this.time.now);
    });
    this.input.keyboard!.on("keydown-ESC", () => this.togglePause());
    this.input.keyboard!.on("keydown-F", () => this.toggleFullscreen());
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player.sprite, this.obstacles);
    this.physics.add.collider(this.enemies, this.obstacles);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.bullets, this.obstacles, (b, _o) => {
      this.handleBulletObstacleHit(b as Bullet);
    });
    this.physics.add.collider(this.enemyBullets, this.obstacles, (b, _o) => {
      this.handleEnemyBulletHitObstacle(b as Bullet);
    });

    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => {
      const bullet = b as Bullet;
      if (!bullet.active || !bullet.fromPlayer) return;
      this.hitEnemy(bullet, e as Phaser.Physics.Arcade.Sprite);
    });

    this.physics.add.overlap(this.enemyBullets, this.player.sprite, (b, _p) => {
      const bullet = b as Bullet;
      if (!bullet.active || bullet.fromPlayer) return;
      this.hitPlayerByBullet(bullet);
    });

    this.physics.add.overlap(this.player.sprite, this.enemies, (_p, e) => {
      const now = this.time.now;
      if (now < this.invulnUntil) return;
      this.invulnUntil = now + Tuning.player.iFramesMs;

      const enemy = e as Phaser.Physics.Arcade.Sprite;
      const id = (enemy.getData("enemyId") as string) ?? "mite";
      const def = EnemyById[id];
      const eliteMul = enemy.getData("elite") ? 1.5 : 1;
      this.damagePlayer(Math.max(1, Math.floor(def.contactDamage * eliteMul)), enemy.x, enemy.y);
      this.effects.impact(enemy.x, enemy.y, true);
      this.cameras.main.shake(100, 0.008);
    });
  }

  private setupEnemyAiLoop(): void {
    if (this.aiEvent) this.aiEvent.remove(false);
    this.aiEvent = this.time.addEvent({
      delay: 70,
      loop: true,
      callback: () => this.tickEnemyAi()
    });
  }

  private tickEnemyAi(): void {
    if (this.pausedByUser || this.run.gameOver) return;
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;
    const now = this.time.now;

    this.enemies.children.each(obj => {
      const enemy = obj as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return true;

      const id = (enemy.getData("enemyId") as string) ?? "mite";
      const def = EnemyById[id];
      const body = enemy.body as Phaser.Physics.Arcade.Body;
      if (!body) return true;

      const elite = Boolean(enemy.getData("elite"));
      const speed = def.speed * (elite ? 1.12 : 1);
      const toPlayer = new Phaser.Math.Vector2(px - enemy.x, py - enemy.y);
      const dist = Math.max(1, toPlayer.length());

      if (def.ai === "chaser") {
        const dir = toPlayer.normalize();
        body.setVelocity(dir.x * speed, dir.y * speed);
      } else if (def.ai === "strafer") {
        const tangent = new Phaser.Math.Vector2(-toPlayer.y, toPlayer.x).normalize();
        const close = toPlayer.clone().normalize().scale(0.4);
        const move = tangent.scale(0.85).add(close).normalize();
        if (dist < 140) body.setVelocity(-move.x * speed, -move.y * speed);
        else body.setVelocity(move.x * speed, move.y * speed);
      } else if (def.ai === "sniper") {
        if (dist > 360) {
          const dir = toPlayer.normalize();
          body.setVelocity(dir.x * speed, dir.y * speed);
        } else if (dist < 200) {
          const dir = toPlayer.normalize().scale(-1);
          body.setVelocity(dir.x * speed, dir.y * speed);
        } else {
          const tangent = new Phaser.Math.Vector2(-toPlayer.y, toPlayer.x).normalize();
          body.setVelocity(tangent.x * speed * 0.8, tangent.y * speed * 0.8);
        }
      } else if (def.ai === "turret") {
        body.setVelocity(0, 0);
      } else if (def.ai === "charger") {
        const chargeUntil = Number(enemy.getData("chargeUntil") ?? 0);
        if (now < chargeUntil) return true;

        const nextChargeAt = Number(enemy.getData("nextChargeAt") ?? 0);
        if (now >= nextChargeAt) {
          const dir = toPlayer.normalize();
          body.setVelocity(dir.x * speed * 3.2, dir.y * speed * 3.2);
          enemy.setData("chargeUntil", now + 280);
          enemy.setData("nextChargeAt", now + 1650);
        } else {
          const dir = toPlayer.normalize();
          body.setVelocity(dir.x * speed * 0.8, dir.y * speed * 0.8);
        }
      } else if (def.ai === "bomber") {
        const tangent = new Phaser.Math.Vector2(-toPlayer.y, toPlayer.x).normalize();
        const close = toPlayer.clone().normalize().scale(0.28);
        const move = tangent.scale(0.72).add(close).normalize();
        body.setVelocity(move.x * speed, move.y * speed);
      }

      this.enemyTryShoot(enemy, def, now, toPlayer);
      return true;
    });
  }

  private enemyTryShoot(
    enemy: Phaser.Physics.Arcade.Sprite,
    def: typeof EnemyById[string],
    now: number,
    toPlayer: Phaser.Math.Vector2
  ): void {
    if (!def.fireRateMs || !def.projectileDamage || !def.projectileSpeed) return;

    const lastShotAt = Number(enemy.getData("lastShotAt") ?? -99999);
    const elite = Boolean(enemy.getData("elite"));
    const effectiveRate = def.fireRateMs * (elite ? 0.85 : 1);
    if (now - lastShotAt < effectiveRate) return;

    enemy.setData("lastShotAt", now);
    const burst = def.burst ?? 1;
    const spread = def.projectileSpreadDeg ?? 6;
    const baseAngle = Math.atan2(toPlayer.y, toPlayer.x);

    for (let i = 0; i < burst; i++) {
      const offset = burst <= 1 ? 0 : ((i / (burst - 1)) * 2 - 1) * spread;
      const angle = baseAngle + Phaser.Math.DegToRad(offset + Phaser.Math.FloatBetween(-2, 2));
      const bullet = this.enemyBullets.get(enemy.x, enemy.y, "enemy_bullet") as Bullet | null;
      if (!bullet) return;

      this.activateBullet({
        bullet,
        x: enemy.x,
        y: enemy.y,
        angle,
        fromPlayer: false,
        speed: def.projectileSpeed,
        damage: def.projectileDamage + (elite ? 1 : 0),
        ttlMs: 1800,
        pierce: 0,
        explosionRadius: def.ai === "bomber" ? 34 : 0,
        fxProfile: "rocket",
        texture: "enemy_bullet",
        tint: 0xff9f56
      });
    }
  }

  private handleReload(now: number): void {
    if (this.reloadUntil < 0 || now < this.reloadUntil) return;
    this.reloadUntil = -1;
    const def = WeaponById[this.run.weaponId];
    this.run.ammo = def.ammoMax;
    this.events.emit("run:update", this.run);
  }

  private tryShoot(now: number): void {
    const def = WeaponById[this.run.weaponId];
    const fireRate = Math.max(25, def.fireRateMs * this.run.modifiers.fireRateMult);
    const ammoPerShot = def.ammoPerShot ?? 1;

    if (this.reloadUntil > now) return;
    if (now - this.lastShotAt < fireRate) return;
    if (this.run.ammo < ammoPerShot) {
      this.tryStartReload(now);
      return;
    }

    this.lastShotAt = now;
    this.run.ammo -= ammoPerShot;

    const angle = this.player.sprite.rotation;
    const muzzleOffset = Math.max(16, this.player.sprite.displayWidth * 0.42);
    const originX = this.player.sprite.x + Math.cos(angle) * muzzleOffset;
    const originY = this.player.sprite.y + Math.sin(angle) * muzzleOffset;

    for (let i = 0; i < def.pellets; i++) {
      const spread = def.spreadDeg * this.run.modifiers.spreadMult;
      const a = angle + Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-spread, spread));

      const bullet = this.bullets.get(originX, originY, "bullet") as Bullet | null;
      if (!bullet) break;

      const crit = Math.random() < this.run.modifiers.critChance;
      const damage = Math.floor(
        def.damage *
        this.run.modifiers.damageMult *
        (crit ? this.run.modifiers.critDamageMult : 1)
      );

      this.activateBullet({
        bullet,
        x: originX,
        y: originY,
        angle: a,
        fromPlayer: true,
        speed: def.projectileSpeed * this.run.modifiers.projectileSpeedMult,
        damage,
        ttlMs: def.ttlMs ?? Tuning.bullets.ttlMs,
        pierce: def.pierce + this.run.modifiers.pierceBonus,
        explosionRadius: def.explosionRadius ?? 0,
        fxProfile: def.fxProfile,
        texture: "bullet",
        tint: this.weaponTint(def.fxProfile)
      });
    }

    this.effects.muzzleFlash(originX, originY, def.fxProfile);
    this.cameras.main.shake(54, def.shotKick + this.run.multiplier * 0.0003);
    this.events.emit("run:update", this.run);

    if (this.run.ammo <= 0) this.tryStartReload(now);
  }

  private tryStartReload(now: number): void {
    if (this.reloadUntil > now) return;
    const def = WeaponById[this.run.weaponId];
    if (this.run.ammo >= def.ammoMax) return;
    this.reloadUntil = now + def.reloadMs;
    this.events.emit("run:update", this.run);
    this.events.emit("run:message", `Reloading ${def.name}...`);
  }

  private activateBullet(args: {
    bullet: Bullet;
    x: number;
    y: number;
    angle: number;
    fromPlayer: boolean;
    speed: number;
    damage: number;
    ttlMs: number;
    pierce: number;
    explosionRadius: number;
    fxProfile: WeaponFxProfile;
    texture: string;
    tint: number;
  }): void {
    const {
      bullet,
      x,
      y,
      angle,
      fromPlayer,
      speed,
      damage,
      ttlMs,
      pierce,
      explosionRadius,
      fxProfile,
      texture,
      tint
    } = args;

    bullet.setTexture(texture);
    bullet.setActive(true).setVisible(true);
    bullet.setPosition(x, y);
    bullet.setRotation(angle);
    bullet.setTint(tint);
    bullet.setScale(explosionRadius > 0 ? 1.25 : 1);

    if (!bullet.body) this.physics.add.existing(bullet);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(x, y);
    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    bullet.fromPlayer = fromPlayer;
    bullet.hostile = !fromPlayer;
    bullet.damage = damage;
    bullet.ttlAt = this.time.now + ttlMs;
    bullet.pierceLeft = pierce;
    bullet.explosionRadius = explosionRadius;
    bullet.fxProfile = fxProfile;
  }

  private hitEnemy(bullet: Bullet, enemy: Phaser.Physics.Arcade.Sprite): void {
    if (!enemy.active) return;

    const hp = Number(enemy.getData("hp") ?? 10);
    const newHp = hp - bullet.damage;
    enemy.setData("hp", newHp);

    this.effects.impact(bullet.x, bullet.y, false);
    this.cameras.main.shake(45, Tuning.bullets.hitShake + (bullet.explosionRadius > 0 ? 0.003 : 0));

    if (bullet.explosionRadius > 0) {
      this.explodeBullet(bullet.x, bullet.y, bullet.explosionRadius, true);
      bullet.disableBody(true, true);
    } else if (bullet.pierceLeft > 0) {
      bullet.pierceLeft -= 1;
    } else {
      bullet.disableBody(true, true);
    }

    if (newHp <= 0) this.killEnemy(enemy);
  }

  private explodeBullet(x: number, y: number, radius: number, fromPlayer: boolean): void {
    const radiusSq = radius * radius;
    this.effects.explosion(x, y, 1 + radius / 80, !fromPlayer);

    if (fromPlayer) {
      this.enemies.children.each(obj => {
        const enemy = obj as Phaser.Physics.Arcade.Sprite;
        if (!enemy.active) return true;
        const dx = enemy.x - x;
        const dy = enemy.y - y;
        if (dx * dx + dy * dy > radiusSq) return true;
        const damage = Math.max(8, Math.floor(22 * this.run.modifiers.damageMult));
        const hp = Number(enemy.getData("hp") ?? 10) - damage;
        enemy.setData("hp", hp);
        if (hp <= 0) this.killEnemy(enemy);
        return true;
      });
    } else {
      const dx = this.player.sprite.x - x;
      const dy = this.player.sprite.y - y;
      if (dx * dx + dy * dy <= radiusSq) {
        this.damagePlayer(1, x, y);
      }
    }
  }

  private hitPlayerByBullet(bullet: Bullet): void {
    const now = this.time.now;
    if (now < this.invulnUntil) {
      bullet.disableBody(true, true);
      return;
    }
    this.invulnUntil = now + Tuning.player.iFramesMs * 0.72;

    this.damagePlayer(Math.max(1, bullet.damage), bullet.x, bullet.y);
    this.effects.impact(bullet.x, bullet.y, true);
    if (bullet.explosionRadius > 0) {
      this.explodeBullet(bullet.x, bullet.y, bullet.explosionRadius, false);
    }
    bullet.disableBody(true, true);
  }

  private killEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    if (!enemy.active) return;

    const id = (enemy.getData("enemyId") as string) ?? "mite";
    const def = EnemyById[id];
    const elite = Boolean(enemy.getData("elite"));

    enemy.disableBody(true, true);
    this.effects.explosion(enemy.x, enemy.y, elite ? 1.35 : 0.9, false);

    this.run.kills += 1;
    this.run.streak += 1;
    this.run.multiplier = 1 + Math.min(4, Math.floor(this.run.streak / 8));

    const baseScore = def.scoreValue + Math.floor(this.run.depth * 2.2);
    const scoreGain = Math.floor(baseScore * this.run.multiplier * (elite ? 1.55 : 1));
    this.run.score += scoreGain;

    if (this.run.modifiers.lifeOnKill > 0 && Math.random() < this.run.modifiers.lifeOnKill) {
      this.run.health = Math.min(this.run.maxHealth, this.run.health + 1);
    }

    if (this.run.score > this.run.bestScore) {
      this.run.bestScore = this.run.score;
      saveBestScore(this.run.bestScore);
    }

    this.syncEnemyRemaining();
    this.events.emit("run:update", this.run);
  }

  private damagePlayer(amount: number, sourceX?: number, sourceY?: number): void {
    const safeAmount = Number.isFinite(amount) ? amount : 1;
    if (!Number.isFinite(this.run.health)) this.run.health = this.run.maxHealth;
    this.run.health = Math.max(0, this.run.health - safeAmount);
    this.run.streak = 0;
    this.run.multiplier = 1;
    this.applyPlayerHitReaction(sourceX, sourceY);
    this.events.emit("run:update", this.run);
    if (this.run.health <= 0) this.gameOver();
  }

  private gameOver(): void {
    this.run.gameOver = true;
    this.fireDown = false;
    this.pausedByUser = false;
    this.run.paused = false;
    this.physics.world.pause();
    this.scene.get("UI").events.emit("ui:gameover", this.run);
    this.armRestartInput();
  }

  private armRestartInput(): void {
    if (this.restartArmed) return;
    this.restartArmed = true;
    const uiScene = this.scene.get("UI") as Phaser.Scene;

    const restart = () => {
      if (!this.restartArmed) return;
      this.restartArmed = false;
      this.input.off("pointerdown", restart, this);
      this.input.keyboard?.off("keydown-ENTER", restart as any, this);
      uiScene.input?.off("pointerdown", restart, this);
      uiScene.input?.keyboard?.off("keydown-ENTER", restart as any, this);
      this.scene.stop("UI");
      this.scene.restart();
      this.scene.start("UI");
    };

    this.input.once("pointerdown", restart, this);
    this.input.keyboard?.once("keydown-ENTER", restart as any, this);
    uiScene.input?.once("pointerdown", restart, this);
    uiScene.input?.keyboard?.once("keydown-ENTER", restart as any, this);
  }

  private clearRoomObjects(): void {
    this.obstacles.clear(true, true);
    this.pickups.clear(true, true);
    this.enemies.clear(true, true);

    for (const h of this.hazards) h.sprite.destroy();
    this.hazards = [];

    for (const d of this.roomDecor) d.destroy();
    this.roomDecor = [];

    for (const lock of this.doorLocks) lock.destroy();
    this.doorLocks = [];

    this.bullets.children.each(obj => {
      const b = obj as Bullet;
      if (b.active) b.disableBody(true, true);
      return true;
    });
    this.enemyBullets.children.each(obj => {
      const b = obj as Bullet;
      if (b.active) b.disableBody(true, true);
      return true;
    });
  }

  private loadRoom(coord: RoomCoord, depthDelta: number): void {
    this.clearRoomObjects();

    this.run.room = coord;
    this.run.depth = Math.max(0, this.run.depth + depthDelta);
    this.run.visited.add(roomKey(coord));
    if (this.run.depth > this.run.bestDepth) {
      this.run.bestDepth = this.run.depth;
      saveBestDepth(this.run.bestDepth);
    }
    this.roomCleared = false;
    this.stuckSince = -1;

    this.roomLayout = generateRoomLayout(this.run.runSeed, coord, this.run.depth, this.run.upgrades);
    this.run.roomTheme = this.roomLayout.theme;

    this.drawRoomBackdrop(this.roomLayout.theme, this.roomLayout.event, this.roomLayout.seed);
    this.spawnDecorations(this.roomLayout.decorations);
    this.spawnObstacles(this.roomLayout);
    this.spawnHazards(this.roomLayout);
    this.spawnEnemies(this.roomLayout);
    this.spawnPickups(this.roomLayout);
    this.syncEnemyRemaining();
    this.createDoorLocks();

    this.effects.roomEntry(Tuning.room.width * 0.5, Tuning.room.height * 0.5);
    this.cameras.main.flash(120, 12, 12, 36);

    if (this.run.enemyRemaining === 0) this.onRoomCleared();
    this.events.emit("run:update", this.run);
    this.events.emit("room:changed", this.run);
  }

  private spawnDecorations(decorations: readonly DecorationPlan[]): void {
    const out: Phaser.GameObjects.Sprite[] = [];
    for (const d of decorations) {
      const key = this.decorationTextureFor(d.kind);
      const sprite = this.add.sprite(d.x, d.y, key)
        .setDepth(1.2)
        .setScale(d.scale)
        .setAlpha(d.alpha)
        .setRotation(d.rotation);

      if (d.kind === "rune") {
        sprite.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: sprite,
          alpha: { from: Math.max(0.22, d.alpha - 0.2), to: Math.min(0.95, d.alpha + 0.08) },
          duration: Phaser.Math.Between(1300, 2600),
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut"
        });
      } else if (d.kind === "crystalTall" || d.kind === "crystalSmall") {
        this.tweens.add({
          targets: sprite,
          y: sprite.y - Phaser.Math.Between(4, 10),
          duration: Phaser.Math.Between(1800, 3200),
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut"
        });
      }

      out.push(sprite);
    }
    this.roomDecor = out;
  }

  private spawnObstacles(layout: RoomLayout): void {
    const themeColor = this.themePalette(layout.theme).obstacleFill;
    const stroke = this.themePalette(layout.theme).obstacleStroke;
    const shapeRng = new RngStream(layout.seed ^ 0x4f1230aa);
    for (const o of layout.obstacles) {
      const cx = o.x + o.w * 0.5;
      const cy = o.y + o.h * 0.5;
      const collider = this.add.rectangle(cx, cy, o.w, o.h, 0x000000, 0);
      collider.setDepth(1.8);
      this.obstacles.add(collider);
      this.physics.add.existing(collider, true);

      const style = shapeRng.next();
      if (style < 0.34) {
        const rect = this.add.rectangle(cx, cy, o.w, o.h, themeColor, 0.9);
        rect.setStrokeStyle(2, stroke, 0.75);
        rect.setDepth(2);
      } else if (style < 0.67) {
        const size = Math.min(o.w, o.h);
        const orb = this.add.sprite(cx, cy, "obstacle_orb")
          .setDisplaySize(size, size)
          .setDepth(2)
          .setAlpha(0.92);
        orb.setTint(themeColor);
        this.tweens.add({
          targets: orb,
          alpha: { from: 0.66, to: 0.98 },
          duration: shapeRng.int(1100, 2600),
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut"
        });
      } else {
        const key = style < 0.84 ? "obstacle_diamond" : "obstacle_hex";
        const poly = this.add.sprite(cx, cy, key)
          .setDisplaySize(o.w, o.h)
          .setDepth(2)
          .setAlpha(0.93);
        poly.setTint(themeColor);
        poly.setRotation(shapeRng.float(-0.3, 0.3));
      }
    }
  }

  private spawnHazards(layout: RoomLayout): void {
    const now = this.time.now;
    this.hazards = layout.hazards.map(hazard => {
      const key = hazard.kind === "pulse" ? "hazard_pulse" : "hazard_ember";
      const sprite = this.add.sprite(hazard.x, hazard.y, key).setDepth(2.5).setAlpha(0.72);
      return {
        plan: hazard,
        sprite,
        nextPulseAt: now + hazard.phaseMs
      };
    });
  }

  private spawnEnemies(layout: RoomLayout): void {
    for (const e of layout.enemyPlan) {
      const def = EnemyById[e.id];
      const sprite = this.physics.add.sprite(e.x, e.y, def.textureKey);
      sprite.setDepth(4);
      sprite.setCollideWorldBounds(true);
      sprite.setData("enemyId", e.id);
      sprite.setData("elite", e.elite);
      sprite.setData("lastShotAt", this.time.now - Phaser.Math.Between(120, 680));
      sprite.setData("nextChargeAt", this.time.now + Phaser.Math.Between(900, 2000));
      sprite.setData("chargeUntil", -1);

      const hp = Math.floor(def.maxHp * (e.elite ? 1.65 : 1) * (1 + this.run.depth * 0.03));
      sprite.setData("hp", hp);

      if (e.elite) {
        sprite.setScale(1.18);
        sprite.setTint(0xffd182);
      }

      this.applyEnemyVisualStyle(sprite, e.id, e.elite);
      this.enemies.add(sprite);
    }
  }

  private applyEnemyVisualStyle(
    sprite: Phaser.Physics.Arcade.Sprite,
    enemyId: string,
    elite: boolean
  ): void {
    const baseScale = elite ? 1.18 : 1;
    if (enemyId === "wisp" || enemyId === "oracle") {
      sprite.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: sprite,
        alpha: { from: 0.55, to: 1 },
        duration: 680,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut"
      });
    } else if (enemyId === "sentry" || enemyId === "sentinel") {
      this.tweens.add({
        targets: sprite,
        angle: { from: -4, to: 4 },
        duration: 820,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut"
      });
    } else if (enemyId === "charger" || enemyId === "brute") {
      this.tweens.add({
        targets: sprite,
        scaleX: { from: baseScale * 0.95, to: baseScale * 1.07 },
        scaleY: { from: baseScale * 1.05, to: baseScale * 0.93 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut"
      });
    } else {
      this.tweens.add({
        targets: sprite,
        y: sprite.y - 6,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut"
      });
    }
  }

  private spawnPickups(layout: RoomLayout): void {
    if (layout.weaponDrop) {
      const p = this.physics.add.staticSprite(layout.weaponDrop.x, layout.weaponDrop.y, "pickup_weapon");
      p.setDepth(3);
      p.setData("pickupType", "weapon");
      p.setData("weaponId", layout.weaponDrop.id);
      this.pickups.add(p);
    }

    if (layout.ammoDrop) {
      const p = this.physics.add.staticSprite(layout.ammoDrop.x, layout.ammoDrop.y, "pickup_ammo");
      p.setDepth(3);
      p.setData("pickupType", "ammo");
      p.setData("amount", layout.ammoDrop.amount);
      this.pickups.add(p);
    }

    if (layout.healthDrop) {
      const p = this.physics.add.staticSprite(layout.healthDrop.x, layout.healthDrop.y, "pickup_health");
      p.setDepth(3);
      p.setData("pickupType", "health");
      p.setData("amount", layout.healthDrop.amount);
      this.pickups.add(p);
    }

    if (layout.shrine) {
      const p = this.physics.add.staticSprite(layout.shrine.x, layout.shrine.y, "pickup_shrine");
      p.setDepth(3.1);
      p.setData("pickupType", "shrine");
      p.setData("upgradeId", layout.shrine.upgradeId);
      this.pickups.add(p);
    }

    if (layout.portal) {
      const key = roomKey(this.run.room);
      const existing = this.run.portalRooms.get(key);
      const active = existing?.active ?? false;
      const p = this.physics.add.staticSprite(layout.portal.x, layout.portal.y, "portal_gate");
      p.setDepth(3.2);
      p.setData("pickupType", "portal");
      p.setData("active", active);
      p.setData("targetX", layout.portal.target.x);
      p.setData("targetY", layout.portal.target.y);
      p.setAlpha(active ? 1 : 0.45);
      this.pickups.add(p);

      if (active) {
        this.tweens.add({
          targets: p,
          scale: { from: 0.9, to: 1.12 },
          yoyo: true,
          repeat: -1,
          duration: 700,
          ease: "Sine.InOut"
        });
      }

      this.run.portalRooms.set(key, {
        x: layout.portal.x,
        y: layout.portal.y,
        active
      });
    }
  }

  private createDoorLocks(): void {
    const top = this.add.sprite(Tuning.room.width * 0.5, ROOM_MARGIN, "door_lock").setDepth(8);
    const bottom = this.add.sprite(Tuning.room.width * 0.5, Tuning.room.height - ROOM_MARGIN, "door_lock").setDepth(8);
    const left = this.add.sprite(ROOM_MARGIN, Tuning.room.height * 0.5, "door_lock").setDepth(8).setAngle(90);
    const right = this.add.sprite(Tuning.room.width - ROOM_MARGIN, Tuning.room.height * 0.5, "door_lock").setDepth(8).setAngle(90);
    this.doorLocks = [top, bottom, left, right];
  }

  private onRoomCleared(): void {
    if (this.roomCleared) return;
    this.roomCleared = true;
    this.run.roomsCleared += 1;
    this.run.score += 25 + Math.floor(this.run.depth * 3.5);
    this.syncEnemyRemaining();
    for (const lock of this.doorLocks) lock.setVisible(false);
    this.pickups.children.each(obj => {
      const p = obj as Phaser.GameObjects.Sprite;
      if (p.getData("pickupType") !== "portal") return true;
      p.setData("active", true);
      p.setAlpha(1);
      const info = this.run.portalRooms.get(roomKey(this.run.room));
      if (info) info.active = true;
      this.tweens.add({
        targets: p,
        scale: { from: 0.9, to: 1.12 },
        yoyo: true,
        repeat: -1,
        duration: 700,
        ease: "Sine.InOut"
      });
      return true;
    });
    this.effects.explosion(this.player.sprite.x, this.player.sprite.y, 0.7, false);
    this.events.emit("room:cleared", this.run);
    this.events.emit("run:update", this.run);
  }

  private tryPickup(): void {
    const player = this.player.sprite;
    const near = this.pickups.getChildren().find(obj => {
      const p = obj as Phaser.GameObjects.Sprite;
      const dx = p.x - player.x;
      const dy = p.y - player.y;
      return dx * dx + dy * dy < 60 * 60;
    }) as Phaser.GameObjects.Sprite | undefined;
    if (!near) return;

    const type = near.getData("pickupType") as PickupType;
    if (type === "weapon") {
      const weaponId = near.getData("weaponId") as string;
      this.run.weaponId = weaponId;
      this.run.ammo = WeaponById[weaponId].ammoMax;
      this.effects.explosion(near.x, near.y, 0.95, false);
      this.events.emit("run:message", `Equipped ${WeaponById[weaponId].name}`);
    } else if (type === "ammo") {
      const amount = Math.floor(Number(near.getData("amount") ?? 20) * this.run.modifiers.ammoPickupMult);
      this.run.ammo = Math.min(this.run.ammo + amount, WeaponById[this.run.weaponId].ammoMax);
      this.effects.impact(near.x, near.y, false);
    } else if (type === "health") {
      const amount = Number(near.getData("amount") ?? 1);
      this.run.health = Math.min(this.run.maxHealth, this.run.health + amount);
      this.effects.impact(near.x, near.y, false);
    } else if (type === "shrine") {
      const upgradeId = near.getData("upgradeId") as string;
      this.applyUpgrade(upgradeId);
      this.effects.explosion(near.x, near.y, 1.1, false);
    } else if (type === "portal") {
      const active = Boolean(near.getData("active"));
      if (!active) {
        this.events.emit("run:message", "Portal dormant. Clear enemies first.");
        return;
      }
      const targetX = Number(near.getData("targetX") ?? this.run.room.x);
      const targetY = Number(near.getData("targetY") ?? this.run.room.y);
      this.run.portalRooms.delete(roomKey(this.run.room));
      near.destroy();
      this.player.sprite.setPosition(Tuning.room.width * 0.5, Tuning.room.height * 0.5);
      this.transitionCooldownUntil = this.time.now + 520;
      this.events.emit("run:message", `Portal jump -> ${targetX}, ${targetY}`);
      this.loadRoom({ x: targetX, y: targetY }, 2);
      return;
    }

    near.destroy();
    this.events.emit("run:update", this.run);
  }

  private applyUpgrade(upgradeId: string): void {
    if (this.run.upgrades.includes(upgradeId)) {
      this.events.emit("run:message", "Shrine dormant: upgrade already owned.");
      return;
    }

    const upgrade = UpgradeById[upgradeId];
    if (!upgrade) return;

    this.run.upgrades.push(upgradeId);
    this.run.modifiers = upgrade.apply(this.run.modifiers);

    if (upgrade.bonusMaxHealth) {
      this.run.maxHealth += upgrade.bonusMaxHealth;
      this.run.health = Math.min(this.run.maxHealth, this.run.health + upgrade.bonusMaxHealth);
    }
    if (upgrade.bonusHeal) {
      this.run.health = Math.min(this.run.maxHealth, this.run.health + upgrade.bonusHeal);
    }

    this.events.emit("run:message", `Shrine boon: ${upgrade.name}`);
  }

  private syncEnemyRemaining(): void {
    this.run.enemyRemaining = this.enemies.countActive(true);
  }

  private currentPortalForState(): { x: number; y: number; active: boolean } | null {
    const key = roomKey(this.run.room);
    const p = this.run.portalRooms.get(key);
    if (!p) return null;
    return { x: p.x, y: p.y, active: p.active };
  }

  private ensurePlayerBodyResponsive(): void {
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;

    if (!body.enable) body.enable = true;
    if (!body.moves) body.moves = true;
    this.ensurePlayerVisualState();

    const worldPaused = Boolean((this.physics.world as any).isPaused);
    if (worldPaused && !this.pausedByUser && !this.run.gameOver) {
      this.physics.world.resume();
    }
  }

  private ensurePlayerVisualState(): void {
    const sp = this.player.sprite;
    if (sp.texture?.key !== "player") {
      if (!this.textures.exists("player")) ensureGeneratedTextures(this);
      sp.setTexture("player");
    }
    if (!sp.active) sp.setActive(true);
    if (!sp.visible) sp.setVisible(true);
    if (!Number.isFinite(sp.alpha) || sp.alpha < 0.95) sp.setAlpha(1);
    const invalidScale = !Number.isFinite(sp.scaleX) || !Number.isFinite(sp.scaleY);
    if (invalidScale || Math.abs(sp.scaleX) < 1.2 || Math.abs(sp.scaleY) < 1.2) sp.setScale(1.25);
    if (sp.displayWidth < 16 || sp.displayHeight < 10) sp.setScale(1.25);
    if (sp.originX !== 0.5 || sp.originY !== 0.5) sp.setOrigin(0.5, 0.5);
    if (!Number.isFinite(sp.rotation)) sp.setRotation(0);
    if (sp.depth !== 5) sp.setDepth(5);
    if (sp.blendMode !== Phaser.BlendModes.NORMAL) sp.setBlendMode(Phaser.BlendModes.NORMAL);
    if (sp.mask) sp.clearMask(false);
    sp.clearTint();
  }

  private applyPlayerHitReaction(sourceX?: number, sourceY?: number): void {
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;

    this.ensurePlayerBodyResponsive();
    this.ensurePlayerVisualState();
    const sx = Number.isFinite(sourceX) ? Number(sourceX) : this.player.sprite.x - 1;
    const sy = Number.isFinite(sourceY) ? Number(sourceY) : this.player.sprite.y;
    const away = new Phaser.Math.Vector2(this.player.sprite.x - sx, this.player.sprite.y - sy);
    if (away.lengthSq() < 0.001) away.set(1, 0);
    away.normalize();

    body.setVelocity(away.x * 320, away.y * 320);
    body.setAcceleration(0, 0);
    this.nudgePlayerOutOfObstacle();
  }

  private nudgePlayerOutOfObstacle(): void {
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;

    for (const obj of this.obstacles.getChildren()) {
      const r = obj as Phaser.GameObjects.Rectangle;
      const left = r.x - r.width * 0.5;
      const right = r.x + r.width * 0.5;
      const top = r.y - r.height * 0.5;
      const bottom = r.y + r.height * 0.5;
      if (px < left || px > right || py < top || py > bottom) continue;

      const dLeft = Math.abs(px - left);
      const dRight = Math.abs(right - px);
      const dTop = Math.abs(py - top);
      const dBottom = Math.abs(bottom - py);
      const min = Math.min(dLeft, dRight, dTop, dBottom);

      if (min === dLeft) this.player.sprite.x = left - 12;
      else if (min === dRight) this.player.sprite.x = right + 12;
      else if (min === dTop) this.player.sprite.y = top - 12;
      else this.player.sprite.y = bottom + 12;

      const body = this.player.sprite.body as Phaser.Physics.Arcade.Body | undefined;
      if (body) body.reset(this.player.sprite.x, this.player.sprite.y);
      return;
    }
  }

  private tryResolveStuckPlayer(now: number): void {
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    if (!this.player.isTryingToMove()) {
      this.stuckSince = -1;
      return;
    }

    if (body.speed > 18) {
      this.stuckSince = -1;
      return;
    }

    if (this.stuckSince < 0) {
      this.stuckSince = now;
      return;
    }

    if (now - this.stuckSince < 640) return;

    const safe = this.findNearbySafePoint(this.player.sprite.x, this.player.sprite.y);
    if (safe) {
      this.player.sprite.setPosition(safe.x, safe.y);
      body.reset(safe.x, safe.y);
      this.events.emit("run:message", "Unstuck assist");
    }
    this.stuckSince = -1;
  }

  private findNearbySafePoint(x: number, y: number): { x: number; y: number } | null {
    const candidates = 18;
    for (let radius = 18; radius <= 220; radius += 22) {
      for (let i = 0; i < candidates; i++) {
        const a = (i / candidates) * Math.PI * 2;
        const px = Phaser.Math.Clamp(x + Math.cos(a) * radius, 40, Tuning.room.width - 40);
        const py = Phaser.Math.Clamp(y + Math.sin(a) * radius, 40, Tuning.room.height - 40);
        if (!this.pointBlockedByObstacle(px, py)) return { x: px, y: py };
      }
    }
    return null;
  }

  private pointBlockedByObstacle(x: number, y: number): boolean {
    for (const obj of this.obstacles.getChildren()) {
      const r = obj as Phaser.GameObjects.Rectangle;
      const left = r.x - r.width * 0.5 - 12;
      const right = r.x + r.width * 0.5 + 12;
      const top = r.y - r.height * 0.5 - 12;
      const bottom = r.y + r.height * 0.5 + 12;
      if (x >= left && x <= right && y >= top && y <= bottom) return true;
    }
    return false;
  }

  private stepPostUpdate(now: number): void {
    this.updateBullets(now);
    this.updateHazards(now);
    this.edgeTransitionCheck(now);
  }

  private updateBullets(now: number): void {
    this.bullets.children.each(obj => {
      const b = obj as Bullet;
      if (!b.active) return true;

      this.effects.bulletTrail(b.x, b.y, b.fxProfile);

      if (now > b.ttlAt) {
        if (b.explosionRadius > 0) this.explodeBullet(b.x, b.y, b.explosionRadius, b.fromPlayer);
        b.disableBody(true, true);
      }
      return true;
    });

    this.enemyBullets.children.each(obj => {
      const b = obj as Bullet;
      if (!b.active) return true;
      if (now > b.ttlAt) {
        b.disableBody(true, true);
      }
      return true;
    });
  }

  private updateHazards(now: number): void {
    if (this.pausedByUser || this.run.gameOver) return;

    for (const hazard of this.hazards) {
      if (now < hazard.nextPulseAt) continue;
      hazard.nextPulseAt = now + hazard.plan.periodMs;

      hazard.sprite.setScale(1.25);
      this.tweens.add({
        targets: hazard.sprite,
        scale: 1,
        duration: 240,
        ease: "Quad.Out"
      });

      this.effects.hazardPulse(hazard.plan.x, hazard.plan.y);
      this.applyHazardPulseDamage(hazard.plan);
    }
  }

  private applyHazardPulseDamage(hazard: HazardPlan): void {
    const radiusSq = hazard.radius * hazard.radius;
    const px = this.player.sprite.x - hazard.x;
    const py = this.player.sprite.y - hazard.y;
    if (px * px + py * py <= radiusSq) {
      const now = this.time.now;
      if (now >= this.invulnUntil) {
        this.invulnUntil = now + Tuning.player.iFramesMs * 0.56;
        this.damagePlayer(hazard.damage, hazard.x, hazard.y);
      }
    }

    this.enemies.children.each(obj => {
      const enemy = obj as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return true;
      const dx = enemy.x - hazard.x;
      const dy = enemy.y - hazard.y;
      if (dx * dx + dy * dy > radiusSq) return true;
      const hp = Number(enemy.getData("hp") ?? 1) - hazard.damage;
      enemy.setData("hp", hp);
      if (hp <= 0) this.killEnemy(enemy);
      return true;
    });
  }

  private edgeTransitionCheck(now: number): void {
    if (!this.roomCleared || now < this.transitionCooldownUntil || this.pausedByUser || this.run.gameOver) return;

    const p = this.player.sprite;
    let dir: DoorDir | null = null;
    if (p.x < ROOM_MARGIN) dir = "w";
    else if (p.x > Tuning.room.width - ROOM_MARGIN) dir = "e";
    else if (p.y < ROOM_MARGIN) dir = "n";
    else if (p.y > Tuning.room.height - ROOM_MARGIN) dir = "s";
    if (!dir) return;

    const next = { ...this.run.room };
    if (dir === "w") next.x -= 1;
    if (dir === "e") next.x += 1;
    if (dir === "n") next.y -= 1;
    if (dir === "s") next.y += 1;

    if (dir === "w") p.x = Tuning.room.width - ROOM_MARGIN - 7;
    if (dir === "e") p.x = ROOM_MARGIN + 7;
    if (dir === "n") p.y = Tuning.room.height - ROOM_MARGIN - 7;
    if (dir === "s") p.y = ROOM_MARGIN + 7;

    this.transitionCooldownUntil = now + 420;
    this.loadRoom(next, 1);
  }

  private handleBulletObstacleHit(bullet: Bullet): void {
    if (!bullet.active) return;
    if (bullet.explosionRadius > 0) this.explodeBullet(bullet.x, bullet.y, bullet.explosionRadius, bullet.fromPlayer);
    bullet.disableBody(true, true);
  }

  private handleEnemyBulletHitObstacle(bullet: Bullet): void {
    if (!bullet.active) return;
    if (bullet.explosionRadius > 0) this.explodeBullet(bullet.x, bullet.y, bullet.explosionRadius, false);
    bullet.disableBody(true, true);
  }

  private togglePause(): void {
    if (this.run.gameOver) return;
    this.pausedByUser = !this.pausedByUser;
    this.run.paused = this.pausedByUser;
    this.fireDown = false;
    if (this.pausedByUser) {
      this.physics.world.pause();
    } else {
      this.physics.world.resume();
    }
    this.events.emit("run:pause", this.pausedByUser);
    this.events.emit("run:update", this.run);
  }

  private toggleFullscreen(): void {
    if (!this.scale.isFullscreen) {
      void this.scale.startFullscreen();
    } else {
      this.scale.stopFullscreen();
    }
  }

  private aimPlayer(): void {
    const pointer = this.input.activePointer;
    const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
    const dx = worldPoint.x - this.player.sprite.x;
    const dy = worldPoint.y - this.player.sprite.y;
    this.player.sprite.setRotation(Math.atan2(dy, dx));
  }

  private makeSeed(): number {
    const seed = (Math.random() * 0xffffffff) >>> 0;
    console.info("[RunSeed]", seed);
    return seed;
  }

  private drawRoomBackdrop(theme: RoomTheme, event: string, seed: number): void {
    if (this.backdrop) this.backdrop.destroy();
    for (const orb of this.backdropOrbs) orb.destroy();
    this.backdropOrbs = [];

    const palette = this.themePalette(theme);
    const rng = new RngStream(seed ^ 0xa19f17e1);
    const g = this.add.graphics().setDepth(-50);

    g.fillStyle(palette.base, 1);
    g.fillRect(0, 0, Tuning.room.width, Tuning.room.height);

    for (let i = 0; i < 28; i++) {
      const alpha = rng.float(0.05, 0.13);
      g.fillStyle(palette.caveGlow, alpha);
      g.fillCircle(
        rng.int(40, Tuning.room.width - 40),
        rng.int(40, Tuning.room.height - 40),
        rng.int(90, 260)
      );
    }

    for (let i = 0; i < 18; i++) {
      g.lineStyle(2, palette.rune, rng.float(0.14, 0.34));
      const x = rng.int(90, Tuning.room.width - 90);
      const y = rng.int(90, Tuning.room.height - 90);
      g.strokeCircle(x, y, rng.int(24, 100));
    }

    for (let i = 0; i < 320; i++) {
      g.fillStyle(palette.rune, rng.float(0.05, 0.14));
      g.fillRect(rng.int(0, Tuning.room.width), rng.int(0, Tuning.room.height), 2, 2);
    }

    for (let i = 0; i < 44; i++) {
      const x = rng.int(36, Tuning.room.width - 36);
      const y = rng.int(36, Tuning.room.height - 36);
      const len = rng.int(24, 96);
      const angle = rng.float(0, Math.PI * 2);
      g.lineStyle(1, palette.border, rng.float(0.08, 0.2));
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      g.strokePath();
    }

    g.lineStyle(4, palette.border, 0.72);
    g.strokeRect(10, 10, Tuning.room.width - 20, Tuning.room.height - 20);

    if (event === "bosslet") {
      g.lineStyle(4, 0xff8e43, 0.75);
      g.strokeRect(18, 18, Tuning.room.width - 36, Tuning.room.height - 36);
    }

    for (let i = 0; i < 12; i++) {
      const orb = this.add.circle(
        rng.int(100, Tuning.room.width - 100),
        rng.int(100, Tuning.room.height - 100),
        rng.int(26, 72),
        palette.orb,
        rng.float(0.08, 0.24)
      ).setDepth(-45);
      this.tweens.add({
        targets: orb,
        alpha: { from: 0.08, to: 0.28 },
        duration: rng.int(1200, 3000),
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut"
      });
      this.backdropOrbs.push(orb);
    }

    this.backdrop = g;
  }

  private themePalette(theme: RoomTheme): {
    base: number;
    border: number;
    obstacleFill: number;
    obstacleStroke: number;
    caveGlow: number;
    rune: number;
    orb: number;
  } {
    if (theme === "magmatic") {
      return {
        base: 0x120a18,
        border: 0xff8b46,
        obstacleFill: 0x2e1733,
        obstacleStroke: 0xff9b4f,
        caveGlow: 0xff6d3f,
        rune: 0xffc18d,
        orb: 0xff874d
      };
    }
    if (theme === "violet") {
      return {
        base: 0x080b2a,
        border: 0x9d5cff,
        obstacleFill: 0x191a4b,
        obstacleStroke: 0x42edff,
        caveGlow: 0x9756ff,
        rune: 0x4be9ff,
        orb: 0xc673ff
      };
    }
    if (theme === "teal") {
      return {
        base: 0x071f28,
        border: 0x2defff,
        obstacleFill: 0x133344,
        obstacleStroke: 0xff9e58,
        caveGlow: 0x26dbff,
        rune: 0x97fff2,
        orb: 0x2febff
      };
    }
    return {
      base: 0x090a28,
      border: 0x2ceaff,
      obstacleFill: 0x111736,
      obstacleStroke: 0x7d5dff,
      caveGlow: 0x2847a8,
      rune: 0x41e9ff,
      orb: 0x66acff
    };
  }

  private decorationTextureFor(kind: DecorationPlan["kind"]): string {
    if (kind === "crystalSmall") return "decor_crystal_small";
    if (kind === "crystalTall") return "decor_crystal_tall";
    if (kind === "pillar") return "decor_pillar";
    if (kind === "rune") return "decor_rune";
    return "decor_spike";
  }

  private weaponTint(profile: WeaponFxProfile): number {
    if (profile === "shotgun") return 0xffc56a;
    if (profile === "rifle") return 0x42efff;
    if (profile === "laser") return 0xf18cff;
    if (profile === "rocket") return 0xffa048;
    if (profile === "rail") return 0xe9feff;
    if (profile === "plasma") return 0x72edff;
    if (profile === "smg") return 0xff8ad8;
    return 0xffffff;
  }
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
