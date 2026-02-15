import Phaser from "phaser";
import { Tuning } from "../tuning";

export class Player {
  sprite: Phaser.Physics.Arcade.Sprite;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: { w: Phaser.Input.Keyboard.Key; a: Phaser.Input.Keyboard.Key; s: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key; };
  private raw = { w: false, a: false, s: false, d: false };
  private dashKey: Phaser.Input.Keyboard.Key;
  private lastDashAt = -9999;
  private dashUntil = -9999;
  private lastMoveCheckAt = 0;
  private lastMoveX = 0;
  private lastMoveY = 0;
  private stuckMs = 0;
  private moveIntent = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, "player");
    this.sprite.setDepth(5);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDamping(true);
    this.sprite.setDrag(Tuning.player.drag);
    this.sprite.setMaxVelocity(Tuning.player.speed);
    this.sprite.setScale(1.25);

    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
    this.dashKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    kb.on("keydown-W", () => { this.raw.w = true; });
    kb.on("keyup-W", () => { this.raw.w = false; });
    kb.on("keydown-A", () => { this.raw.a = true; });
    kb.on("keyup-A", () => { this.raw.a = false; });
    kb.on("keydown-S", () => { this.raw.s = true; });
    kb.on("keyup-S", () => { this.raw.s = false; });
    kb.on("keydown-D", () => { this.raw.d = true; });
    kb.on("keyup-D", () => { this.raw.d = false; });
    scene.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.raw.w = false;
      this.raw.a = false;
      this.raw.s = false;
      this.raw.d = false;
    });
  }

  update(now: number): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;

    const up = this.cursors.up.isDown || this.wasd.w.isDown || this.raw.w;
    const down = this.cursors.down.isDown || this.wasd.s.isDown || this.raw.s;
    const left = this.cursors.left.isDown || this.wasd.a.isDown || this.raw.a;
    const right = this.cursors.right.isDown || this.wasd.d.isDown || this.raw.d;

    const ax = (right ? 1 : 0) - (left ? 1 : 0);
    const ay = (down ? 1 : 0) - (up ? 1 : 0);

    const dashReady = now - this.lastDashAt >= Tuning.player.dash.cooldownMs;
    const wantsDash = dashReady && Phaser.Input.Keyboard.JustDown(this.dashKey);

    if (wantsDash) {
      this.lastDashAt = now;
      this.dashUntil = now + Tuning.player.dash.durationMs;

      const dir = new Phaser.Math.Vector2(ax, ay);
      if (dir.lengthSq() < 0.01) dir.set(1, 0);
      dir.normalize();

      body.setVelocity(dir.x * Tuning.player.dash.speed, dir.y * Tuning.player.dash.speed);
      return;
    }

    if (now < this.dashUntil) {
      // Keep dash velocity, do not apply accel.
      return;
    }

    const v = new Phaser.Math.Vector2(ax, ay);
    if (v.lengthSq() > 0.1) v.normalize();
    this.moveIntent = v.lengthSq() > 0.1;

    this.tryUnstuck(now, v, body);

    body.setAcceleration(v.x * Tuning.player.accel, v.y * Tuning.player.accel);
    if (v.lengthSq() < 0.1) body.setAcceleration(0, 0);
  }

  private tryUnstuck(now: number, inputDir: Phaser.Math.Vector2, body: Phaser.Physics.Arcade.Body): void {
    if (inputDir.lengthSq() < 0.1) {
      this.stuckMs = 0;
      this.lastMoveCheckAt = now;
      this.lastMoveX = this.sprite.x;
      this.lastMoveY = this.sprite.y;
      return;
    }

    if (this.lastMoveCheckAt <= 0) {
      this.lastMoveCheckAt = now;
      this.lastMoveX = this.sprite.x;
      this.lastMoveY = this.sprite.y;
      return;
    }

    const elapsed = now - this.lastMoveCheckAt;
    if (elapsed < 120) return;

    const dx = this.sprite.x - this.lastMoveX;
    const dy = this.sprite.y - this.lastMoveY;
    const moved = Math.hypot(dx, dy);
    if (moved < 2.5 && body.speed < 24) this.stuckMs += elapsed;
    else this.stuckMs = 0;

    this.lastMoveCheckAt = now;
    this.lastMoveX = this.sprite.x;
    this.lastMoveY = this.sprite.y;

    if (this.stuckMs >= 340) {
      body.setVelocity(inputDir.x * Tuning.player.dash.speed * 0.55, inputDir.y * Tuning.player.dash.speed * 0.55);
      this.stuckMs = 0;
    }
  }

  isTryingToMove(): boolean {
    return this.moveIntent;
  }
}
