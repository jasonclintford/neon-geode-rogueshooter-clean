import Phaser from "phaser";
import type { WeaponFxProfile } from "../data/weapons";

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  damage = 1;
  ttlAt = 0;
  fromPlayer = true;
  pierceLeft = 0;
  explosionRadius = 0;
  fxProfile: WeaponFxProfile = "pistol";
  hostile = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "bullet");
  }
}
