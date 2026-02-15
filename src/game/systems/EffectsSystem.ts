import Phaser from "phaser";
import type { WeaponFxProfile } from "../data/weapons";

export class EffectsSystem {
  private scene: Phaser.Scene;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private embers!: Phaser.GameObjects.Particles.ParticleEmitter;
  private glow!: Phaser.GameObjects.Particles.ParticleEmitter;
  private trail!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  init(): void {
    const s = this.scene;

    this.sparks = s.add.particles(0, 0, "spark", {
      speed: { min: 80, max: 320 },
      lifespan: { min: 120, max: 340 },
      scale: { start: 1.4, end: 0 },
      quantity: 7,
      blendMode: "ADD"
    });
    this.sparks.stop();

    this.embers = s.add.particles(0, 0, "ember", {
      speed: { min: 50, max: 220 },
      lifespan: { min: 140, max: 360 },
      scale: { start: 1.1, end: 0 },
      quantity: 6,
      blendMode: "ADD"
    });
    this.embers.stop();

    this.glow = s.add.particles(0, 0, "glow", {
      speed: { min: 10, max: 70 },
      lifespan: { min: 180, max: 420 },
      scale: { start: 1.1, end: 0 },
      quantity: 2,
      blendMode: "ADD"
    });
    this.glow.stop();

    this.trail = s.add.particles(0, 0, "spark", {
      speed: { min: 1, max: 20 },
      lifespan: { min: 90, max: 170 },
      scale: { start: 0.9, end: 0 },
      quantity: 1,
      frequency: -1,
      blendMode: "ADD"
    });
    this.trail.stop();
  }

  muzzleFlash(x: number, y: number, profile: WeaponFxProfile): void {
    this.glow.emitParticleAt(x, y, 2);
    if (profile === "rocket") this.embers.emitParticleAt(x, y, 5);
  }

  impact(x: number, y: number, hostile = false): void {
    if (hostile) {
      this.embers.emitParticleAt(x, y, 8);
    } else {
      this.sparks.emitParticleAt(x, y, 10);
    }
  }

  explosion(x: number, y: number, size = 1, hostile = false): void {
    const count = Math.floor(20 * size);
    this.glow.emitParticleAt(x, y, Math.max(2, Math.floor(4 * size)));
    this.sparks.emitParticleAt(x, y, Math.max(10, count));
    this.embers.emitParticleAt(x, y, hostile ? count : Math.max(4, Math.floor(count * 0.6)));
    this.scene.cameras.main.shake(90, 0.006 + size * 0.002);
  }

  hazardPulse(x: number, y: number): void {
    this.glow.emitParticleAt(x, y, 3);
  }

  roomEntry(x: number, y: number): void {
    this.glow.emitParticleAt(x, y, 6);
  }

  bulletTrail(x: number, y: number, _profile: WeaponFxProfile): void {
    this.trail.emitParticleAt(x, y, 1);
  }
}
